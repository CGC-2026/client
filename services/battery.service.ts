import { ble } from "@/constants/BLE";
import { BLEContextType } from "@/contexts/BLE.Provider";
import { logger } from "@/lib/logger";
import { Buffer } from "buffer";

const TAG = "Battery";

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
      logger.error(TAG, "Failed to read battery level");
      return null;
    }

    try {
      const buffer = Buffer.from(base64Data, "base64");

      if (buffer.length !== 1) {
        logger.warn(TAG, "Invalid packet size", { bytes: buffer.length, expected: 1 });
        return null;
      }

      const level = buffer.readUInt8(0);

      if (level < 0 || level > 100) {
        logger.warn(TAG, "Battery level out of range, clamping", { level });
        return Math.max(0, Math.min(100, level));
      }

      return level;
    } catch (error) {
      logger.error(TAG, "Error decoding battery level", error);
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
          logger.warn(TAG, "Received null/empty notification data");
          callback(null);
          return;
        }

        try {
          const buffer = Buffer.from(base64Data, "base64");

          if (buffer.length !== 1) {
            logger.warn(TAG, "Invalid notification packet size", { bytes: buffer.length, expected: 1 });
            callback(null);
            return;
          }

          const level = buffer.readUInt8(0);

          if (level < 0 || level > 100) {
            logger.warn(TAG, "Notification battery level out of range, clamping", { level });
          }

          callback({
            level: Math.max(0, Math.min(100, level)),
            timestamp: Date.now(),
          });
        } catch (error) {
          logger.error(TAG, "Error parsing battery notification", error);
          callback(null);
        }
      },
    );

    if (!unsubscribe) {
      logger.error(TAG, "Failed to subscribe to battery level notifications");
    }

    return unsubscribe;
  }
}
