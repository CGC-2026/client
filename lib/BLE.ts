import { BleManager, Device, State } from "react-native-ble-plx";

export async function ensurePoweredOn(
  manager: BleManager,
  timeoutMs = 8000,
): Promise<void> {
  const state = await manager.state();
  if (state === State.PoweredOn) return;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      sub.remove();
      reject(new Error("Bluetooth not powered on"));
    }, timeoutMs);

    const sub = manager.onStateChange((s) => {
      if (s === State.PoweredOn) {
        clearTimeout(timeout);
        sub.remove();
        resolve();
      }
    }, true);
  });
}

export async function connectDeviceWithTimeout(
  device: Device,
  {
    requestMTU,
    timeoutMs,
    timeoutMessage,
  }: {
    requestMTU: number;
    timeoutMs: number;
    timeoutMessage?: string;
  },
): Promise<Device> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      device.connect({ requestMTU }),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(
            new Error(
              timeoutMessage ??
                `Connection timeout after ${timeoutMs / 1000} seconds`,
            ),
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
