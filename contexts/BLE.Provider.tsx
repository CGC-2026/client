import { Platform } from "react-native";
import { Device } from "react-native-ble-plx";
import { IOSBleProvider, useIOSBle } from "./BLE.iOS.Provider";

// Public API shape for UI layer
export type BLEContextType = {
  /**
   * Returns a de-duplicated list of devices found in the scan window.
   * @param serviceUUIDs The service UUIDs to scan for.
   * @returns whether the scan was successful
   */
  findDevices: (options?: {
    serviceUUIDs?: string[];
    signalCancel?: AbortSignal;
  }) => Promise<boolean>;
  /**
   * Stops an active device scan if one is in progress
   */
  stopScan: () => Promise<void>;
  /**
   * Attempts to connect to the device. Returns true on success, false otherwise.
   * @param device The device to connect to.
   * @param options Optional configuration for pairing
   * @param options.bondingServiceUUID Service UUID to use for triggering iOS bonding (optional)
   * @returns True on success, false otherwise.
   */
  pairDevice: (
    device: Device,
    options?: { bondingServiceUUID?: string },
  ) => Promise<boolean>;
  /**
   * Disconnects from the currently paired device. Returns true on success, false otherwise.
   * @returns True on success, false otherwise.
   */
  disconnectDevice: () => Promise<boolean>;
  /**
   * The list of devices found in the scan window.
   */
  devices: Device[];
  /**
   * Whether a scan is currently in progress
   */
  isScanning: boolean;
  /**
   * Currently connected device or null.
   */
  pairedDevice: Device | null;
  /**
   * Whether a connection attempt is in progress
   */
  isConnecting: boolean;
  /**
   * The ID of the device that's currently being connected to (if any)
   */
  connectingDeviceId: string | null;
  /**
   * Reads a characteristic value from the paired device
   * @param serviceUUID The service UUID
   * @param characteristicUUID The characteristic UUID
   * @returns The base64-encoded value or null if failed
   */
  readCharacteristic: (
    serviceUUID: string,
    characteristicUUID: string,
  ) => Promise<string | null>;
  /**
   * Writes data to a characteristic on the paired device
   * @param serviceUUID The service UUID
   * @param characteristicUUID The characteristic UUID
   * @param base64Data The base64-encoded data to write
   * @returns True on success, false otherwise
   */
  writeCharacteristic: (
    serviceUUID: string,
    characteristicUUID: string,
    base64Data: string,
  ) => Promise<boolean>;
  /**
   * Subscribes to notifications from a characteristic
   * @param serviceUUID The service UUID
   * @param characteristicUUID The characteristic UUID
   * @param callback Function called when data is received
   * @returns Cleanup function to unsubscribe, or null if failed
   */
  subscribeToCharacteristic: (
    serviceUUID: string,
    characteristicUUID: string,
    callback: (data: string | null) => void,
  ) => Promise<(() => void) | null>;

  /**
   * Attempt to detect an already-connected device (OS level)
   * and rebuild React Native connection state internally.
   *
   * Useful when the device is connected but `pairedDevice` is missing.
   * @returns true if we restored connection state.
   */
  recoverConnectedDeviceNow: () => Promise<boolean>;
};

export default function BLEProvider({
  children,
  reconnectUUIDs,
}: {
  children: React.ReactNode;
  reconnectUUIDs: string[];
}) {
  if (Platform.OS === "ios") {
    return (
      <IOSBleProvider reconnectUUIDs={reconnectUUIDs}>
        {children}
      </IOSBleProvider>
    );
  } else {
    return <>{children}</>;
  }
}

export const useBLE = (): BLEContextType => {
  const iosContext = useIOSBle();

  if (Platform.OS !== "ios") {
    throw new Error("BLEProvider is not supported on this platform");
  }

  return iosContext;
};
