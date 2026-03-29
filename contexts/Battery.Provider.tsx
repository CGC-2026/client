import { useBLE } from "@/contexts/BLE.Provider";
import { logger } from "@/lib/logger";
import { BatteryData, BatteryService } from "@/services/battery.service";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Device } from "react-native-ble-plx";

const TAG = "Battery";

export interface BatteryContextType {
  /** Currently connected device or null */
  device: Device | null;
  /** Current battery level (0-100) or null if unknown */
  batteryLevel: number | null;
  /** Timestamp of last battery update or null */
  lastUpdate: number | null;
  /** Whether device is charging (future enhancement, always false for now) */
  isCharging: boolean;
}

const BatteryContext = createContext<BatteryContextType | null>(null);

export const BatteryProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const ble = useBLE();
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);

  // Create service instance (memoized to prevent recreation)
  const batteryService = useMemo(
    () => new BatteryService(ble),
    [
      ble.readCharacteristic,
      ble.writeCharacteristic,
      ble.subscribeToCharacteristic,
    ],
  );

  // Subscribe to battery level notifications when device is paired
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let isMounted = true;

    const setupBatteryMonitoring = async () => {
      if (ble.pairedDevice) {
        try {
          // Perform initial read
          const initialLevel = await batteryService.readBatteryLevel();
          if (isMounted && initialLevel !== null) {
            setBatteryLevel(initialLevel);
            setLastUpdate(Date.now());
          }
        } catch (error) {
          logger.error(TAG, "Error reading initial battery level", error);
        }

        try {
          unsubscribe = await batteryService.subscribeToBatteryLevel(
            (data: BatteryData | null) => {
              if (isMounted) {
                if (data) {
                  setBatteryLevel(data.level);
                  setLastUpdate(data.timestamp);
                } else {
                  // Clear on null data (error or disconnection)
                  setBatteryLevel(null);
                  setLastUpdate(null);
                }
              }
            },
          );
        } catch (error) {
          logger.error(TAG, "Error subscribing to battery notifications", error);
          if (isMounted) {
            setBatteryLevel(null);
            setLastUpdate(null);
          }
        }
      } else {
        // Clear battery data when device disconnects
        setBatteryLevel(null);
        setLastUpdate(null);
      }
    };

    setupBatteryMonitoring();

    // Cleanup subscription when device disconnects or component unmounts
    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [ble.pairedDevice?.id]);

  const contextValue: BatteryContextType = {
    device: ble.pairedDevice,
    batteryLevel,
    lastUpdate,
    isCharging: false, // TODO Not available in standard BAS
  };

  return (
    <BatteryContext.Provider value={contextValue}>
      {children}
    </BatteryContext.Provider>
  );
};

/**
 * Hook to access the Battery context
 * @returns BatteryContextType
 * @throws Error if used outside of BatteryProvider
 */
export const useBattery = (): BatteryContextType => {
  const context = useContext(BatteryContext);
  if (!context) {
    throw new Error("useBattery must be used within BatteryProvider");
  }
  return context;
};
