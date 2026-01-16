import { ble } from "@/constants/BLE";
import { ensurePoweredOn } from "@/helpers/BLE";
import { useMachine } from "@xstate/react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { BleManager, Device } from "react-native-ble-plx";
import { createMachine } from "xstate";
import { BLEContextType } from "./BLE.Provider";
import { useStorage } from "./Storage.Provider";

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

export const IOSBleProvider: React.FC<{ children: React.ReactNode, reconnectUUIDs: string[] }> = ({
  children,
  reconnectUUIDs
}) => {
  // Create BLE manager as singleton using useRef
  const manager = useRef(new BleManager()).current;
  const [devices, setDevices] = useState<Device[]>([]);
  const [pairedDevice, setPairedDevice] = useState<Device | null>(null);
  const [scanTimer, setScanTimer] = useState<NodeJS.Timeout | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(
    null,
  );

  // Use XState to manage scanning/connection states
  const [state, send] = useMachine<typeof bleMachine>(bleMachine);

  // Storage for persisting last connected device ID
  const [lastDeviceId, setLastDeviceId] = useStorage(ble.lastDeviceId);

  // Recover connection state on mount and handle auto-reconnect
  useEffect(() => {
    const recoverOrReconnect = async () => {
      try {
        // Ensure Bluetooth is powered on
        await ensurePoweredOn(manager);
        // First, check if device is already connected at iOS level
        // Query all connected BLE devices (generic approach)
        const connectedDevices = await manager.connectedDevices(reconnectUUIDs);

        if (connectedDevices.length > 0) {
          const device = connectedDevices[0];
          setPairedDevice(device);
          send({ type: "CONNECTED" });
          
          // Set up disconnect listener
          device.onDisconnected((error) => {
            setPairedDevice(null);
            send({ type: "DISCONNECTED" });
          });
          
          return;
        }

        // No active connection, try auto-reconnect if we have a stored device ID
        if (lastDeviceId) {
          try {
            
            // Try to get the device by ID and connect
            const device = await manager.devices([lastDeviceId]).then(devices => devices[0]);
            
            if (device) {
              // Add timeout to prevent hanging forever
              const connectWithTimeout = Promise.race([
                device.connect({ requestMTU: ble.requestMTU }),
                new Promise<never>((_, reject) => 
                  setTimeout(() => reject(new Error("Connection timeout")), ble.connectionTimeout)
                )
              ]);
              
              const connected = await connectWithTimeout;
              await connected.discoverAllServicesAndCharacteristics();
              
              setPairedDevice(connected);
              send({ type: "CONNECTED" });
              
              // Set up disconnect listener
              connected.onDisconnected((error) => {
                setPairedDevice(null);
                send({ type: "DISCONNECTED" });
              });
            }
          } catch (reconnectError) {
            // Don't show error to user - this is expected if device is off/out of range
          }
        }
      } catch (error) {
        console.error("[BLE] Failed to recover connection state:", error);
      }
    };

    recoverOrReconnect();
  }, []); // Run once on mount

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
    };
  }, [manager, scanTimer, state]);

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
            console.error("Scan error:", error);
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
      console.error("Error in findDevices:", error);
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
        console.error("Error stopping scan:", error);
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
      const connectWithTimeout = Promise.race([
        device.connect({ requestMTU: ble.requestMTU }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("Connection timeout after 15 seconds")), ble.connectionTimeout)
        )
      ]);
      
      connectedDevice = await connectWithTimeout;

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
            (s) => s.uuid.toLowerCase() === options.bondingServiceUUID!.toLowerCase(),
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
            console.error("[BLE] Error disconnecting after bonding failure:", disconnectError);
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

      // Save device ID to storage for auto-reconnect
      await setLastDeviceId(connectedDevice.id);

      setPairedDevice(connectedDevice);
      send({ type: "CONNECTED" });
      return true;
    } catch (e: any) {
      // Check if this is a bonding mismatch error (error 200)
      const isBondingError = e?.errorCode === 200 || 
                            e?.message?.toLowerCase().includes("pairing information") ||
                            e?.message?.toLowerCase().includes("peer removed pairing");

      if (isBondingError) {
        console.error("[BLE] Bonding mismatch detected (error 200):", {
          error: e,
          message: e?.message,
          errorCode: e?.errorCode,
        });

        // Clean up any partial connection
        if (connectedDevice) {
          try {
            await connectedDevice.cancelConnection();
          } catch (disconnectError) {
            console.error("[BLE] Error disconnecting after bonding error:", disconnectError);
          }
        }

        // Show user-friendly alert explaining how to fix
        // iOS cannot automatically clear bonding keys - user must do it manually
        Alert.alert(
          "Device Pairing Issue",
          `This device was previously paired but has been reset.\n\nTo reconnect, you need to:\n\n` +
          `1. Go to iOS Settings → Bluetooth\n` +
          `2. Find "${device.name || 'the device'}" in "My Devices"\n` +
          `3. Tap the (i) icon next to it\n` +
          `4. Tap "Forget This Device"\n` +
          `5. Return to this app and try pairing again`,
          [{ text: "OK" }]
        );

        send({ type: "FAIL" });
        return false;
      }

      // Not a bonding error - log and fail
      console.error("[BLE] Error pairing with device:", {
        error: e,
        message: e?.message,
        errorCode: e?.errorCode,
        reason: e?.reason,
        iosError: e?.iosError,
        attError: e?.attError,
        deviceId: device.id,
        deviceName: device.name,
      });

      // If connection was established but something else failed, disconnect
      if (connectedDevice) {
        try {
          await connectedDevice.cancelConnection();
        } catch (disconnectError) {
          console.error("[BLE] Error disconnecting after pairing error:", disconnectError);
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
      
      return true;
    } catch (e) {
      console.error("Error disconnecting from device:", e);
      return false;
    }
  };

  // Generic BLE characteristic operations
  const readCharacteristic = async (
    serviceUUID: string,
    characteristicUUID: string,
  ): Promise<string | null> => {
    if (!pairedDevice) {
      console.error("[BLE] Cannot read characteristic: no paired device");
      return null;
    }

    try {
      const characteristic = await pairedDevice.readCharacteristicForService(
        serviceUUID,
        characteristicUUID,
      );
      return characteristic.value;
    } catch (error) {
      console.error("[BLE] Error reading characteristic:", error);
      return null;
    }
  };

  const writeCharacteristic = async (
    serviceUUID: string,
    characteristicUUID: string,
    base64Data: string,
  ): Promise<boolean> => {
    if (!pairedDevice) {
      console.error("[BLE] Cannot write characteristic: no paired device");
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
      console.error("[BLE] Error writing characteristic:", error);
      return false;
    }
  };

  const subscribeToCharacteristic = async (
    serviceUUID: string,
    characteristicUUID: string,
    callback: (data: string | null) => void,
  ): Promise<(() => void) | null> => {
    if (!pairedDevice) {
      console.error("[BLE] Cannot subscribe to characteristic: no paired device");
      return null;
    }
  
    try {
      // Now set up the monitor
      const subscription = pairedDevice.monitorCharacteristicForService(
        serviceUUID,
        characteristicUUID,
        (error, characteristic) => {
          if (error) {
            console.error("[BLE] Notification error:", error);
            callback(null);
            return;
          }
          
          callback(characteristic?.value ?? null);
        },
      );

      // Return cleanup function
      return () => {
        subscription.remove();
      };
    } catch (error) {
      console.error("[BLE] Error subscribing to characteristic:", error);
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
        // make sure the samee device is not in the list twice
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
