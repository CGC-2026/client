import { ble, DEFAULT_SAMPLE_RATE } from "@/constants/BLE";
import { BLEContextType } from "@/contexts/BLE.Provider";
import { logger } from "@/lib/logger";
import { Buffer } from "buffer";
import type { SensorData } from "@/types/sensor.types";

const TAG = "KneeDevice";

export type { SensorData };

// Streaming modes for the Smart Knee device
export enum StreamingMode {
  IDLE = 0,
  STREAM = 1,
  FLASH_DUMP = 2,
}

// Control state for writing to the device
interface ControlState {
  stream: 0 | 1; // 0 = stop, 1 = start
  sampleRate: number; // Sample rate in Hz (e.g., 50)
  mode: StreamingMode; // Operating mode
  reserved?: number; // 0x01 = trigger firmware recalibration
}

/**
 * KneeDeviceService - Device-specific protocol handler for Smart Knee
 *
 * This service handles the Smart Knee BLE protocol:
 * - Encoding/decoding control commands
 * - Parsing sensor data packets
 * - Managing streaming state
 *
 * It uses the generic BLE provider for all actual BLE operations,
 * keeping device-specific logic isolated.
 */
export class KneeDeviceService {
  constructor(private bleProvider: BLEContextType) {}

  /**
   * Start streaming sensor data from the device
   * @param sampleRate Sample rate in Hz
   * @returns Promise<boolean> - True if command was sent successfully
   */
  async startStreaming(
    sampleRate: number = DEFAULT_SAMPLE_RATE,
  ): Promise<boolean> {
    const controlData = this.encodeControlState({
      stream: 1,
      sampleRate,
      mode: StreamingMode.STREAM,
    });

    const success = await this.bleProvider.writeCharacteristic(
      ble.smartKneeServiceUUID,
      ble.controlCharacteristicUUID,
      controlData,
    );

    if (!success) {
      logger.error(TAG, "Failed to start streaming");
    }

    return success;
  }

  /**
   * Stop streaming sensor data from the device
   * @returns Promise<boolean> - True if command was sent successfully
   */
  async stopStreaming(): Promise<boolean> {
    const controlData = this.encodeControlState({
      stream: 0,
      sampleRate: DEFAULT_SAMPLE_RATE,
      mode: StreamingMode.IDLE,
    });

    const success = await this.bleProvider.writeCharacteristic(
      ble.smartKneeServiceUUID,
      ble.controlCharacteristicUUID,
      controlData,
    );

    if (!success) {
      logger.error(TAG, "Failed to stop streaming");
    }

    return success;
  }

  /**
   * Read the current control state from the device
   * @returns Promise<ControlState | null> - Current state or null if failed
   */
  async readControlState(): Promise<ControlState | null> {
    const base64Data = await this.bleProvider.readCharacteristic(
      ble.smartKneeServiceUUID,
      ble.controlCharacteristicUUID,
    );

    if (!base64Data) {
      logger.error(TAG, "Failed to read control state");
      return null;
    }

    try {
      const buffer = Buffer.from(base64Data, "base64");
      return {
        stream: buffer.readUInt8(0) as 0 | 1,
        sampleRate: buffer.readUInt8(1),
        mode: buffer.readUInt8(2) as StreamingMode,
      };
    } catch (error) {
      logger.error(TAG, "Error decoding control state", error);
      return null;
    }
  }

  /**
   * Subscribe to sensor data notifications from the device
   * @param callback Function called when new sensor data arrives
   * @returns Promise<(() => void) | null> - Cleanup function or null if failed
   */
  async subscribeToSensorData(
    callback: (data: SensorData | null) => void,
  ): Promise<(() => void) | null> {
    const unsubscribe = await this.bleProvider.subscribeToCharacteristic(
      ble.smartKneeServiceUUID,
      ble.fusedDataCharacteristicUUID,
      (base64Data) => {
        if (!base64Data) {
          logger.warn(TAG, "Received null/empty sensor data packet");
          callback(null);
          return;
        }

        try {
          const parsed = this.parseFusedPacket(base64Data);
          callback(parsed);
        } catch (error) {
          logger.error(TAG, "Error parsing sensor data packet", error);
          callback(null);
        }
      },
    );

    if (!unsubscribe) {
      logger.error(TAG, "Failed to subscribe to sensor data notifications");
    }

    return unsubscribe;
  }

  /**
   * Parse a fused data packet from the device
   * @param base64Data Base64-encoded packet data (14 bytes)
   * @returns SensorData - Parsed sensor data
   */
  private parseFusedPacket(base64Data: string): SensorData {
    const buffer = Buffer.from(base64Data, "base64");

    // Validate packet size
    if (buffer.length !== 14) {
      throw new Error(
        `[KneeDevice] parseFusedPacket: Invalid packet size: ${buffer.length} bytes (expected 14). base64: ${base64Data}`,
      );
    }

    // Parse according to protocol specification:
    // Bytes 0-1:   seq (uint16)
    // Bytes 2-5:   timestamp_ms (uint32)
    // Bytes 6-7:   roll (int16) * 100
    // Bytes 8-9:   pitch (int16) * 100
    // Bytes 10-11: yaw (int16) * 100
    // Byte 12:     flex (uint8)
    // Byte 13:     reserved (uint8)

    const seq = buffer.readUInt16LE(0);
    const timestamp = buffer.readUInt32LE(2);
    const roll = buffer.readInt16LE(6) / 100.0;
    const pitch = buffer.readInt16LE(8) / 100.0;
    const yaw = buffer.readInt16LE(10) / 100.0;
    const flex = buffer.readUInt8(12);

    // Generate hex string for debugging
    const rawHex = buffer.toString("hex");

    return {
      seq,
      timestamp,
      roll,
      pitch,
      yaw,
      flex,
      rawHex,
    };
  }

  /**
   * Trigger firmware IMU recalibration.
   * Reads the current control state and writes it back with reserved=0x01.
   * The firmware will re-zero all angles to the user's current pose over ~1s.
   */
  async triggerCalibration(): Promise<boolean> {
    const current = await this.readControlState();
    if (!current) {
      logger.error(TAG, "Cannot trigger calibration: failed to read control state");
      return false;
    }

    const controlData = this.encodeControlState({
      stream: current.stream,
      sampleRate: current.sampleRate,
      mode: current.mode,
      reserved: 0x01,
    });

    const success = await this.bleProvider.writeCharacteristic(
      ble.smartKneeServiceUUID,
      ble.controlCharacteristicUUID,
      controlData,
    );

    if (!success) {
      logger.error(TAG, "Failed to trigger calibration");
    } else {
      logger.info(TAG, "Firmware calibration triggered");
    }

    return success;
  }

  /**
   * Encode a control state into a 4-byte buffer
   * @param state Control state to encode
   * @returns string - Base64-encoded control data
   */
  private encodeControlState(state: ControlState): string {
    const buffer = Buffer.alloc(4);
    buffer.writeUInt8(state.stream, 0);
    buffer.writeUInt8(state.sampleRate, 1);
    buffer.writeUInt8(state.mode, 2);
    buffer.writeUInt8(state.reserved ?? 0, 3);

    return buffer.toString("base64");
  }
}
