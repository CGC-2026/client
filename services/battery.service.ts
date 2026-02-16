import { ble } from "@/constants/BLE";
import { BLEContextType } from "@/contexts/BLE.Provider";
import { Buffer } from "buffer";

// Battery data with timestamp
export interface BatteryData {
  level: number; // Battery level 0-100 (percentage)
  timestamp: number; // Milliseconds since epoch
}

/**
 * BatteryService - Handler for standard Bluetooth Battery Service (BAS)
 *
 * This service handles the standard Bluetooth SIG Battery Service protocol:
 * - Reading battery level (single uint8 byte, 0-100)
 * - Subscribing to battery level notifications
 */
export class BatteryService {
  constructor(private bleProvider: BLEContextType) {}

  /**
   * Read the current battery level from the device
   * @returns Promise<number | null> - Battery level (0-100) or null if failed
   */
  async readBatteryLevel(): Promise<number | null> {
    const base64Data = await this.bleProvider.readCharacteristic(
      ble.batteryServiceUUID,
      ble.batteryLevelCharacteristicUUID,
    );

    if (!base64Data) {
      console.error("[Battery] Failed to read battery level");
      return null;
    }

    try {
      const buffer = Buffer.from(base64Data, "base64");

      // Validate packet size (should be 1 byte)
      if (buffer.length !== 1) {
        console.error(
          `[Battery] Invalid packet size: ${buffer.length} bytes (expected 1)`,
        );
        return null;
      }

      // Read uint8 value (0-100)
      const level = buffer.readUInt8(0);

      // Validate range
      if (level < 0 || level > 100) {
        console.warn(
          `[Battery] Invalid battery level: ${level}% (out of range)`,
        );
        return Math.max(0, Math.min(100, level)); // Clamp to valid range
      }

      return level;
    } catch (error) {
      console.error("[Battery] Error decoding battery level:", error);
      return null;
    }
  }

  /**
   * Subscribe to battery level notifications from the device
   * @param callback Function called when battery level updates
   * @returns Promise<(() => void) | null> - Cleanup function or null if failed
   */
  async subscribeToBatteryLevel(
    callback: (data: BatteryData | null) => void,
  ): Promise<(() => void) | null> {
    const unsubscribe = await this.bleProvider.subscribeToCharacteristic(
      ble.batteryServiceUUID,
      ble.batteryLevelCharacteristicUUID,
      (base64Data) => {
        if (!base64Data) {
          console.warn("[Battery] Received null/empty data");
          callback(null);
          return;
        }

        try {
          const buffer = Buffer.from(base64Data, "base64");

          // Validate packet size
          if (buffer.length !== 1) {
            console.error(
              `[Battery] Invalid packet size: ${buffer.length} bytes (expected 1)`,
            );
            callback(null);
            return;
          }

          // Read uint8 value (0-100)
          const level = buffer.readUInt8(0);

          // Validate range
          if (level < 0 || level > 100) {
            console.warn(
              `[Battery] Invalid battery level: ${level}% (out of range)`,
            );
          }

          // Clamp to valid range and return with timestamp
          callback({
            level: Math.max(0, Math.min(100, level)),
            timestamp: Date.now(),
          });
        } catch (error) {
          console.error("[Battery] Error parsing battery data:", error);
          callback(null);
        }
      },
    );

    if (!unsubscribe) {
      console.error("[Battery] Failed to subscribe to battery level");
    }

    return unsubscribe;
  }
}
