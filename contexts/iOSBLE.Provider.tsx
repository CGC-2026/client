import { ble } from "@/constants/BLE";
import { ensurePoweredOn } from "@/helpers/BLE";
import { useMachine } from "@xstate/react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { BleManager, Device } from "react-native-ble-plx";
import { createMachine } from "xstate";
import { BLEContextType } from "./BLE.Provider";

// Define event types
type BLEEvent = 
  | { type: "SCAN" }
  | { type: "STOP" }
  | { type: "PAIR" }
  | { type: "CONNECTED" }
  | { type: "FAIL" }
  | { type: "DISCONNECT" }
  | { type: "DISCONNECTED" };

// Create a simpler BLE state machine
const bleMachine = createMachine({
  id: 'ble',
  initial: 'idle',
  schemas: {
    events: {} as BLEEvent,
  },
  states: {
    idle: {
      on: { SCAN: 'scanning' }
    },
    scanning: {
      on: { 
        STOP: 'idle',
        PAIR: 'pairing'
      },
      after: {
        [ble.deviceScanTimeout]: 'idle'
      }
    },
    pairing: {
      on: { 
        CONNECTED: 'connected',
        FAIL: 'idle'
      }
    },
    connected: {
      on: { 
        DISCONNECT: 'idle',
        SCAN: 'disconnecting'
      }
    },
    disconnecting: {
      on: { DISCONNECTED: 'scanning' }
    }
  }
});

const BleContext = createContext<BLEContextType | null>(null);

export const IOSBleProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Create BLE manager
  const manager = new BleManager();
  const [devices, setDevices] = useState<Device[]>([]);
  const [pairedDevice, setPairedDevice] = useState<Device | null>(null);
  const [scanTimer, setScanTimer] = useState<NodeJS.Timeout | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null);
  
  // Use XState to manage scanning/connection states
  const [state, send] = useMachine<typeof bleMachine>(bleMachine);

  // Clean up when unmounting
  useEffect(() => {
    return () => {
      if (state.matches('scanning')) {
        try { manager.stopDeviceScan(); } catch (e) {}
      }
      if (scanTimer) {
        clearTimeout(scanTimer);
      }
    };
  }, [manager, scanTimer, state]);

  const findDevices = async (options?: { serviceUUIDs?: string[], signalCancel?: AbortSignal }): Promise<boolean> => {
    // If we're already scanning, stop first
    if (state.matches('scanning')) {
      try { await manager.stopDeviceScan(); } catch (e) {}
    }

    try {
      // Ensure Bluetooth is powered on
      await ensurePoweredOn(manager);
      
      // Clear existing devices list
      setDevices([]);
      
      // Move to scanning state
      send({ type: "SCAN" });
      
      // Start scan
      manager.startDeviceScan(
        options?.serviceUUIDs ?? [],
        { allowDuplicates: true },
        (error, device) => {
          if (error) {
            console.error('Scan error:', error);
            send({ type: "STOP" });
            return;
          }
          
          if (device) {
            // Add device if not already in list
            setDevices(prev => {
              if (prev.some(d => d.id === device.id)) {
                return prev;
              }
              return [...prev, device];
            });
          }
        }
      );
      
      // Handle abort signal
      if (options?.signalCancel) {
        options.signalCancel.addEventListener('abort', () => {
          stopScan();
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error in findDevices:', error);
      send({ type: "STOP" });
      return false;
    }
  };

  const stopScan = async (): Promise<void> => {
    if (state.matches('scanning')) {
      try { 
        manager.stopDeviceScan();
        send({ type: "STOP" }); 
      } catch (error) {
        console.error('Error stopping scan:', error);
      }
    }
    
    if (scanTimer) {
      clearTimeout(scanTimer);
      setScanTimer(null);
    }
  };

  const pairDevice = async (device: Device): Promise<boolean> => {
    if (state.matches('scanning')) {
      await stopScan();
    }
    
    if (pairedDevice) {
      try {
        await pairedDevice.cancelConnection();
        setPairedDevice(null);
      } catch (e) {
        console.error('Error disconnecting from device:', e);
      }
    }
    
    try {
      setIsConnecting(true);
      setConnectingDeviceId(device.id);
      send({ type: "PAIR" });
      
      await device.connect();
      setPairedDevice(device);
      send({ type: "CONNECTED" });
      return true;
    } catch (e) {
      console.error('Error pairing with device:', e);
      send({ type: "FAIL" });
      return false;
    } finally {
      setIsConnecting(false);
      setConnectingDeviceId(null);
    }
  };

  const disconnectDevice = async (): Promise<boolean> => {
    if (!pairedDevice) {
      return false;
    }
    
    try {
      send({ type: "DISCONNECT" });
      await pairedDevice.cancelConnection();
      setPairedDevice(null);
      send({ type: "DISCONNECTED" });
      return true;
    } catch (e) {
      console.error('Error disconnecting from device:', e);
      return false;
    }
  };

  // sorted and properly filtered devices by rssi
  const sortedDevices = useMemo(() => {
    return devices.sort((a, b) => {
      return (b.rssi ?? 0) - (a.rssi ?? 0);
    }).filter((device) => {
      return device.rssi !== null;
    })
    // make sure the samee device is not in the list twice
    .filter((device, index, self) =>
      index === self.findIndex((t) => t.id === device.id)
    )
    // if we are paired, remove the paired device from the list
    .filter((device) => {
      return device.id !== pairedDevice?.id;
    });
  }, [devices]);

  return (
    <BleContext.Provider
      value={{
        findDevices,
        stopScan,
        pairDevice,
        disconnectDevice,
        devices: sortedDevices,
        isScanning: state.matches('scanning'),
        pairedDevice,
        isConnecting,
        connectingDeviceId
      }}
    >
      {children}
    </BleContext.Provider>
  );
};

export const useIOSBle = (): BLEContextType => {
  const ctx = useContext(BleContext);
  if (!ctx) throw new Error("useIOSBle must be used within IOSBleProvider");
  return ctx;
};