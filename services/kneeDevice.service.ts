import { ble, DEFAULT_SAMPLE_RATE } from "@/constants/BLE";
import { BLEContextType } from "@/contexts/BLE.Provider";
import { Buffer } from "buffer";

// Streaming modes for the Smart Knee device
export enum StreamingMode {
  IDLE = 0,
  STREAM = 1,
  FLASH_DUMP = 2,
}

// Parsed sensor data from the device
export interface SensorData {
  seq: number;          // Sequence number (uint16)
  timestamp: number;    // Milliseconds since boot (uint32)
  roll: number;         // Roll angle in degrees (int16 / 100)
  pitch: number;        // Pitch angle in degrees (int16 / 100)
  yaw: number;          // Yaw angle in degrees (int16 / 100)
  flex: number;         // Flex sensor value 0-255 (uint8)
  rawHex?: string;      // Raw hex string for debugging
}

// Control state for writing to the device
interface ControlState {
  stream: 0 | 1;        // 0 = stop, 1 = start
  sampleRate: number;   // Sample rate in Hz (e.g., 50)
  mode: StreamingMode;  // Operating mode
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
   * @param sampleRate Sample rate in Hz (default: 50)
   * @returns Promise<boolean> - True if command was sent successfully
   */
  async startStreaming(sampleRate: number = DEFAULT_SAMPLE_RATE): Promise<boolean> {
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
      console.error("[KneeDevice] Failed to start streaming");
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
      sampleRate: DEFAULT_SAMPLE_RATE, // Sample rate doesn't matter when stopping
      mode: StreamingMode.IDLE,
    });

    const success = await this.bleProvider.writeCharacteristic(
      ble.smartKneeServiceUUID,
      ble.controlCharacteristicUUID,
      controlData,
    );

    if (!success) {
      console.error("[KneeDevice] Failed to stop streaming");
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
      console.error("[KneeDevice] Failed to read control state");
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
      console.error("[KneeDevice] Error decoding control state:", error);
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
          console.warn("[KneeDevice] Received null/empty data");
          callback(null);
          return;
        }

        try {
          const parsed = this.parseFusedPacket(base64Data);
          callback(parsed);
        } catch (error) {
          console.error("[KneeDevice] Error parsing sensor data:", error);
          callback(null);
        }
      },
    );

    if (!unsubscribe) {
      console.error("[KneeDevice] Failed to subscribe to sensor data");
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
      console.warn(
        `[KneeDevice] Unexpected packet size: ${buffer.length} bytes (expected 14)`,
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
   * Encode a control state into a 4-byte buffer
   * @param state Control state to encode
   * @returns string - Base64-encoded control data
   */
  private encodeControlState(state: ControlState): string {
    const buffer = Buffer.alloc(4);
    buffer.writeUInt8(state.stream, 0);
    buffer.writeUInt8(state.sampleRate, 1);
    buffer.writeUInt8(state.mode, 2);
    buffer.writeUInt8(0, 3); // Reserved byte

    return buffer.toString("base64");
  }
}

