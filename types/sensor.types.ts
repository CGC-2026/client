export interface SensorData {
  seq: number; // Sequence number (uint16)
  timestamp: number; // Milliseconds since boot (uint32)
  roll: number; // Knee flexion/extension in degrees (0 = straight, ~90-140 = squat). Non-negative after calibration.
  pitch: number; // Knee valgus/varus in degrees (positive = valgus, negative = varus). Near 0 on good form.
  yaw: number; // Tibial internal/external rotation in degrees (positive = internal). Near 0 on good form.
  flex: number; // Flex sensor value 0-255 (uint8)
  rawHex?: string; // Raw hex string for debugging
}
