export interface SensorData {
  seq: number; // Sequence number (uint16)
  timestamp: number; // Milliseconds since boot (uint32)
  roll: number; // Roll angle in degrees (int16 / 100)
  pitch: number; // Pitch angle in degrees (int16 / 100)
  yaw: number; // Yaw angle in degrees (int16 / 100)
  flex: number; // Flex sensor value 0-255 (uint8)
  rawHex?: string; // Raw hex string for debugging
}
