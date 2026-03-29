import { ble } from "@/constants/BLE";
import { connectDeviceWithTimeout, ensurePoweredOn } from "@/lib/BLE";
import { logger } from "@/lib/logger";
import { useMachine } from "@xstate/react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert } from "react-native";
import { BleManager, Device, Subscription } from "react-native-ble-plx";
import { createMachine } from "xstate";
import { BLEContextType } from "./BLE.Provider";
import { useStorage } from "./Storage.Provider";

const TAG = "BLE";

// Define event types
type BLEEvent =
  | { type: "SCAN" }
  | { type: "STOP" }
  | { type: "PAIR" }
  | { type: "CONNECTED" }
  | { type: "FAIL" }
  | { type: "DISCONNECT" }
  | { type: "DISCONNECTED" };

// Create a simpler BLE state machine
const bleMachine = createMachine({
  id: "ble",
  initial: "idle",
  schemas: {
    events: {} as BLEEvent,
  },
  states: {
    idle: {
      on: { SCAN: "scanning" },
    },
    scanning: {
      on: {
        STOP: "idle",
        PAIR: "pairing",
      },
      after: {
        [ble.deviceScanTimeout]: "idle",
      },
    },
    pairing: {
      on: {
        CONNECTED: "connected",
        FAIL: "idle",
      },
    },
    connected: {
      on: {
        DISCONNECT: "idle",
        SCAN: "disconnecting",
      },
    },
    disconnecting: {
      on: { DISCONNECTED: "scanning" },
    },
  },
});

const BleContext = createContext<BLEContextType | null>(null);

export const IOSBleProvider: React.FC<{
  children: React.ReactNode;
  reconnectUUIDs: string[];
}> = ({ children, reconnectUUIDs }) => {
  // Create BLE manager as singleton using useRef
  const manager = useRef(new BleManager()).current;
  const [devices, setDevices] = useState<Device[]>([]);
  const [pairedDevice, setPairedDevice] = useState<Device | null>(null);
  const [scanTimer, setScanTimer] = useState<NodeJS.Timeout | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(
    null,
  );
  const pairedDeviceDisconnectSubRef = useRef<Subscription | null>(null);

  // Use XState to manage scanning/connection states
  const [state, send] = useMachine<typeof bleMachine>(bleMachine);

  // Storage for persisting last connected device ID
  const [lastDeviceId, setLastDeviceId, isStorageLoading] = useStorage(
    ble.lastDeviceId,
  );

  // Recover connection state on mount and handle auto-reconnect
  useEffect(() => {
    if (isStorageLoading) return;

    let disconnectSub: Subscription | null = null;
    let connectedDisconnectSub: Subscription | null = null;
    let isMounted = true;

    const recoverOrReconnect = async () => {
      try {
        // Ensure Bluetooth is powered on
        await ensurePoweredOn(manager);
        // First, check if device is already connected at iOS level
        // Query all connected BLE devices (generic approach)
        const connectedDevices = await manager.connectedDevices(reconnectUUIDs);

        if (connectedDevices.length > 0) {
          const device = connectedDevices[0];
          try {
            const alreadyAppConnected =
              await manager.isDeviceConnected(device.id);

            const readyDevice = alreadyAppConnected
              ? device
              : await connectDeviceWithTimeout(device, {
                  requestMTU: ble.requestMTU,
                  timeoutMs: ble.connectionTimeout,
                });

            await readyDevice.discoverAllServicesAndCharacteristics();

            setPairedDevice(readyDevice);
            send({ type: "CONNECTED" });
            logger.info(TAG, "Recovered existing connected device", { deviceId: device.id, deviceName: device.name });

            const sub = readyDevice.onDisconnected(() => {
              logger.info(TAG, "Device disconnected", { deviceId: readyDevice.id, deviceName: readyDevice.name });
              setPairedDevice(null);
              send({ type: "DISCONNECTED" });
            });

            if (!isMounted) {
              sub.remove();
            } else {
              disconnectSub = sub;
            }

            return;
          } catch (recoverError) {
            logger.warn(TAG, "Failed to recover existing connected device, falling back to lastDeviceId", { deviceId: device.id });
          }
        }

        // No active connection, try auto-reconnect if we have a stored device ID
        if (lastDeviceId) {
          try {
            // Try to get the device by ID and connect
            const device = await manager
              .devices([lastDeviceId])
              .then((devices) => devices[0]);

            if (device) {
              const connected = await connectDeviceWithTimeout(device, {
                requestMTU: ble.requestMTU,
                timeoutMs: ble.connectionTimeout,
              });
              await connected.discoverAllServicesAndCharacteristics();

              setPairedDevice(connected);
              send({ type: "CONNECTED" });
              logger.info(TAG, "Auto-reconnected to last device", { deviceId: connected.id, deviceName: connected.name });

              const sub = connected.onDisconnected(() => {
                logger.info(TAG, "Device disconnected", { deviceId: connected.id, deviceName: connected.name });
                setPairedDevice(null);
                send({ type: "DISCONNECTED" });
              });

              if (!isMounted) {
                sub.remove();
              } else {
                connectedDisconnectSub = sub;
              }
            }
          } catch (reconnectError) {
            // Don't show error to user - this is expected if device is off/out of range
          }
        }
      } catch (error) {
        logger.error(TAG, "Failed to recover connection state on mount", error);
      }
    };

    recoverOrReconnect();

    return () => {
      isMounted = false;
      if (disconnectSub) {
        disconnectSub.remove();
        disconnectSub = null;
      }
      if (connectedDisconnectSub) {
        connectedDisconnectSub.remove();
        connectedDisconnectSub = null;
      }
    };
  }, [isStorageLoading, lastDeviceId, manager, reconnectUUIDs, send]); // Run when storage is ready

  // Clean up when unmounting
  useEffect(() => {
    return () => {
      if (state.matches("scanning")) {
        try {
          manager.stopDeviceScan();
        } catch (e) {}
      }
      if (scanTimer) {
        clearTimeout(scanTimer);
      }
      pairedDeviceDisconnectSubRef.current?.remove();
      pairedDeviceDisconnectSubRef.current = null;
    };
  }, [manager, scanTimer, state]);

  // Manual iOS-level recovery probe:
  // if iOS still has a connected device, rebuild RN app connection state.
  const recoverConnectedDeviceNow = async (): Promise<boolean> => {
    // If React Native already knows about a paired device, nothing to do.
    if (pairedDevice) return true;
    if (isStorageLoading) return false;

    try {
      setIsConnecting(true);
      setConnectingDeviceId(null);

      await ensurePoweredOn(manager);

      const connectedDevices = await manager.connectedDevices(reconnectUUIDs);
      if (connectedDevices.length === 0) return false;

      const device = connectedDevices[0];
      const alreadyAppConnected = await manager.isDeviceConnected(device.id);

      const readyDevice = alreadyAppConnected
        ? device
        : await connectDeviceWithTimeout(device, {
            requestMTU: ble.requestMTU,
            timeoutMs: ble.connectionTimeout,
          });

      await readyDevice.discoverAllServicesAndCharacteristics();

      setPairedDevice(readyDevice);
      await setLastDeviceId(readyDevice.id);
      send({ type: "CONNECTED" });
      logger.info(TAG, "Manual iOS recovery succeeded", { deviceId: readyDevice.id, deviceName: readyDevice.name });

      pairedDeviceDisconnectSubRef.current?.remove();
      pairedDeviceDisconnectSubRef.current = readyDevice.onDisconnected(() => {
        logger.info(TAG, "Device disconnected", { deviceId: readyDevice.id, deviceName: readyDevice.name });
        setPairedDevice(null);
        send({ type: "DISCONNECTED" });
      });

      return true;
    } catch (error) {
      const message = (error as any)?.message ?? "";
      const isExpected =
        message.includes("Operation was cancelled") ||
        message.toLowerCase().includes("not connected");
      if (!isExpected) {
        logger.error(TAG, "Manual iOS recovery failed", error);
      }
      return false;
    } finally {
      setIsConnecting(false);
      setConnectingDeviceId(null);
    }
  };

  const findDevices = async (options?: {
    serviceUUIDs?: string[];
    signalCancel?: AbortSignal;
  }): Promise<boolean> => {
    // If we're already scanning, stop first
    if (state.matches("scanning")) {
      try {
        await manager.stopDeviceScan();
      } catch (e) {}
    }

    try {
      // Ensure Bluetooth is powered on
      await ensurePoweredOn(manager);

      // Clear existing devices list
      setDevices([]);

      // Move to scanning state
      send({ type: "SCAN" });

      // Start scan
      manager.startDeviceScan(
        options?.serviceUUIDs ?? [],
        { allowDuplicates: false },
        (error, device) => {
          if (error) {
            logger.error(TAG, "Scan error", error);
            send({ type: "STOP" });
            return;
          }

          if (device) {
            // Add device if not already in list
            setDevices((prev) => {
              if (prev.some((d) => d.id === device.id)) {
                return prev;
              }
              return [...prev, device];
            });
          }
        },
      );

      // Handle abort signal
      if (options?.signalCancel) {
        options.signalCancel.addEventListener("abort", () => {
          stopScan();
        });
      }

      return true;
    } catch (error) {
      logger.error(TAG, "Error starting device scan", error);
      send({ type: "STOP" });
      return false;
    }
  };

  const stopScan = async (): Promise<void> => {
    if (state.matches("scanning")) {
      try {
        manager.stopDeviceScan();
        send({ type: "STOP" });
      } catch (error) {
        logger.error(TAG, "Error stopping scan", error);
      }
    }

    if (scanTimer) {
      clearTimeout(scanTimer);
      setScanTimer(null);
    }
  };

  const pairDevice = async (
    device: Device,
    options?: { bondingServiceUUID?: string },
  ): Promise<boolean> => {
    if (state.matches("scanning")) {
      await stopScan();
    }

    if (pairedDevice) {
      try {
        await pairedDevice.cancelConnection();
      } catch (e) {
        console.error("Error disconnecting from device:", e);
      } finally {
        setPairedDevice(null);
      }
    }

    let connectedDevice: Device | null = null;

    try {
      setIsConnecting(true);
      setConnectingDeviceId(device.id);
      send({ type: "PAIR" });

      // Connect to device with timeout to prevent hanging
      connectedDevice = await connectDeviceWithTimeout(device, {
        requestMTU: ble.requestMTU,
        timeoutMs: ble.connectionTimeout,
      });

      // Discover all services and characteristics
      // This triggers iOS bonding if any characteristic requires encryption
      await connectedDevice.discoverAllServicesAndCharacteristics();

      // Try to read from a characteristic to trigger bonding
      // iOS will automatically prompt for pairing if encryption is required
      try {
        const services = await connectedDevice.services();

        let targetService = null;

        // Use provided bondingServiceUUID if available
        if (options?.bondingServiceUUID) {
          targetService = services.find(
            (s) =>
              s.uuid.toLowerCase() ===
              options.bondingServiceUUID!.toLowerCase(),
          );
        }

        // Fallback: use first available service if no specific UUID provided
        if (!targetService && services.length > 0) {
          targetService = services[0];
        }

        if (targetService) {
          const characteristics = await targetService.characteristics();
          // Attempt to read the first readable characteristic to trigger bonding
          const readableChar = characteristics.find((c) => c.isReadable);
          if (readableChar) {
            await readableChar.read();
          }
        }
      } catch (bondingError) {
        // If user cancels bonding dialog, disconnect and fail pairing
        if (connectedDevice) {
          try {
            await connectedDevice.cancelConnection();
          } catch (disconnectError) {
            console.error(
              "[BLE] Error disconnecting after bonding failure:",
              disconnectError,
            );
          }
        }
        send({ type: "FAIL" });
        return false;
      }

      // Set up disconnect listener to handle unexpected disconnections
      connectedDevice.onDisconnected((error) => {
        setPairedDevice(null);
        send({ type: "DISCONNECTED" });
      });

      await setLastDeviceId(connectedDevice.id);

      setPairedDevice(connectedDevice);
      send({ type: "CONNECTED" });
      logger.info(TAG, "Device paired successfully", { deviceId: connectedDevice.id, deviceName: connectedDevice.name });
      return true;
    } catch (e: any) {
      const isBondingError =
        e?.errorCode === 200 ||
        e?.message?.toLowerCase().includes("pairing information") ||
        e?.message?.toLowerCase().includes("peer removed pairing");

      if (isBondingError) {
        logger.error(TAG, "Bonding mismatch detected", e, {
          message: e?.message,
          errorCode: e?.errorCode,
          deviceId: device.id,
          deviceName: device.name,
        });

        // Clean up any partial connection
        if (connectedDevice) {
          try {
            await connectedDevice.cancelConnection();
          } catch (disconnectError) {
            logger.warn(TAG, "Error disconnecting after bonding error", { disconnectError });
          }
        }

        // Show user-friendly alert explaining how to fix
        // iOS cannot automatically clear bonding keys - user must do it manually
        Alert.alert(
          "Device Pairing Issue",
          `This device was previously paired but has been reset.\n\nTo reconnect, you need to:\n\n` +
            `1. Go to iOS Settings → Bluetooth\n` +
            `2. Find "${device.name || "the device"}" in "My Devices"\n` +
            `3. Tap the (i) icon next to it\n` +
            `4. Tap "Forget This Device"\n` +
            `5. Return to this app and try pairing again`,
          [{ text: "OK" }],
        );

        send({ type: "FAIL" });
        return false;
      }

      logger.error(TAG, "Error pairing with device", e, {
        message: e?.message,
        errorCode: e?.errorCode,
        reason: e?.reason,
        deviceId: device.id,
        deviceName: device.name,
      });

      if (connectedDevice) {
        try {
          await connectedDevice.cancelConnection();
        } catch (disconnectError) {
          logger.warn(TAG, "Error disconnecting after pairing error", { disconnectError });
        }
      }
      send({ type: "FAIL" });
      return false;
    } finally {
      setIsConnecting(false);
      setConnectingDeviceId(null);
    }
  };

  const disconnectDevice = async (): Promise<boolean> => {
    if (!pairedDevice) {
      return false;
    }

    try {
      send({ type: "DISCONNECT" });
      await pairedDevice.cancelConnection();
      setPairedDevice(null);
      send({ type: "DISCONNECTED" });

      // Clear the stored device ID since we're manually disconnecting
      await setLastDeviceId(null);
      logger.info(TAG, "Device disconnected by user");

      return true;
    } catch (e) {
      logger.error(TAG, "Error disconnecting from device", e);
      return false;
    }
  };

  // Generic BLE characteristic operations
  const readCharacteristic = async (
    serviceUUID: string,
    characteristicUUID: string,
  ): Promise<string | null> => {
    if (!pairedDevice) {
      logger.warn(TAG, "Cannot read characteristic: no paired device");
      return null;
    }

    try {
      const characteristic = await pairedDevice.readCharacteristicForService(
        serviceUUID,
        characteristicUUID,
      );
      return characteristic.value;
    } catch (error) {
      logger.error(TAG, "Error reading characteristic", error, { serviceUUID, characteristicUUID });
      return null;
    }
  };

  const writeCharacteristic = async (
    serviceUUID: string,
    characteristicUUID: string,
    base64Data: string,
  ): Promise<boolean> => {
    if (!pairedDevice) {
      logger.warn(TAG, "Cannot write characteristic: no paired device");
      return false;
    }

    try {
      await pairedDevice.writeCharacteristicWithResponseForService(
        serviceUUID,
        characteristicUUID,
        base64Data,
      );
      return true;
    } catch (error) {
      logger.error(TAG, "Error writing characteristic", error, { serviceUUID, characteristicUUID });
      return false;
    }
  };

  const subscribeToCharacteristic = async (
    serviceUUID: string,
    characteristicUUID: string,
    callback: (data: string | null) => void,
  ): Promise<(() => void) | null> => {
    if (!pairedDevice) {
      logger.warn(TAG, "Cannot subscribe to characteristic: no paired device");
      return null;
    }

    try {
      const subscription = pairedDevice.monitorCharacteristicForService(
        serviceUUID,
        characteristicUUID,
        (error, characteristic) => {
          if (error) {
            logger.error(TAG, "Characteristic notification error", error, { serviceUUID, characteristicUUID });
            callback(null);
            return;
          }

          callback(characteristic?.value ?? null);
        },
      );

      return () => {
        subscription.remove();
      };
    } catch (error) {
      logger.error(TAG, "Error subscribing to characteristic", error, { serviceUUID, characteristicUUID });
      return null;
    }
  };

  // sorted and properly filtered devices by rssi
  const sortedDevices = useMemo(() => {
    return (
      devices
        .sort((a, b) => {
          return (b.rssi ?? 0) - (a.rssi ?? 0);
        })
        .filter((device) => {
          return device.rssi !== null;
        })
        // make sure the same device is not in the list twice
        .filter(
          (device, index, self) =>
            index === self.findIndex((t) => t.id === device.id),
        )
        // if we are paired, remove the paired device from the list
        .filter((device) => {
          return device.id !== pairedDevice?.id;
        })
    );
  }, [devices]);

  return (
    <BleContext.Provider
      value={{
        findDevices,
        stopScan,
        pairDevice,
        disconnectDevice,
        recoverConnectedDeviceNow,
        devices: sortedDevices,
        isScanning: state.matches("scanning"),
        pairedDevice,
        isConnecting,
        connectingDeviceId,
        readCharacteristic,
        writeCharacteristic,
        subscribeToCharacteristic,
      }}
    >
      {children}
    </BleContext.Provider>
  );
};

export const useIOSBle = (): BLEContextType => {
  const ctx = useContext(BleContext);
  if (!ctx) throw new Error("useIOSBle must be used within IOSBleProvider");
  return ctx;
};
