import { BleManager, State } from "react-native-ble-plx";

export async function ensurePoweredOn(manager: BleManager, timeoutMs = 8000): Promise<void> {
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