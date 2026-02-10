export const ble = {
  lastDeviceId: "ble.lastDeviceId",
  deviceScanTimeout: 10000,
  onboardingComplete: "ble.onboardingComplete",

  // Service UUID
  smartKneeServiceUUID: "e9540908-92e2-4641-bd2b-4f5a724f0f18",

  // Characteristic UUIDs
  controlCharacteristicUUID: "40365860-3000-425d-96e9-9c4335c2178c",
  fusedDataCharacteristicUUID: "3a60dad0-2b13-49ac-be1d-4628b9a19e59",

  requestMTU: 512,
  connectionTimeout: 10000,
} as const;

// Streaming configuration
export const DEFAULT_SAMPLE_RATE = 120; // Hz
export const SAMPLE_RATES = [120] as const; // Available sample rates
