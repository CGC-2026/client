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
   * @returns True on success, false otherwise.
   */
  pairDevice: (device: Device) => Promise<boolean>;
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
};

export default function BLEProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (Platform.OS === "ios") {
    return <IOSBleProvider>{children}</IOSBleProvider>;
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
