import { DEFAULT_SAMPLE_RATE } from "@/constants/BLE";
import { useBLE } from "@/contexts/BLE.Provider";
import { KneeDeviceService, SensorData } from "@/services/kneeDevice.service";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Device } from "react-native-ble-plx";

export interface KneeDeviceContextType {
  /** Currently connected Smart Knee device or null */
  device: Device | null;
  /** Whether streaming is currently active */
  isStreaming: boolean;
  /** Latest sensor data packet or null */
  sensorData: SensorData | null;
  /** Current sample rate in Hz */
  sampleRate: number;
  /** Start streaming at the specified rate */
  startStreaming: (rate?: number) => Promise<boolean>;
  /** Stop streaming */
  stopStreaming: () => Promise<boolean>;
  /** Set the sample rate (takes effect on next start) */
  setSampleRate: (rate: number) => void;
  /** Read the current control state from device */
  readControlState: () => Promise<void>;
  /** Clear the current sensor data */
  clearSensorData: () => void;
  /** TODO this should not be exposed, only done for dev page
   * Access to the underlying service for advanced operations */
  service: KneeDeviceService;
}

const KneeDeviceContext = createContext<KneeDeviceContextType | null>(null);

export const KneeDeviceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const ble = useBLE();
  const [isStreaming, setIsStreaming] = useState(false);
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [sampleRate, setSampleRate] = useState(DEFAULT_SAMPLE_RATE);

  // Create service instance (memoized to prevent recreation)
  const kneeService = useMemo(
    () => new KneeDeviceService(ble),
    [
      ble.readCharacteristic,
      ble.writeCharacteristic,
      ble.subscribeToCharacteristic,
    ],
  );

  // Subscribe to sensor data when device is paired
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setupSubscription = async () => {
      if (ble.pairedDevice) {
        unsubscribe = await kneeService.subscribeToSensorData((data) => {
          if (data) {
            setSensorData(data);
          }
        });
      } else {
        setSensorData(null);
        setIsStreaming(false);
      }
    };

    setupSubscription();

    // Cleanup subscription when device disconnects or component unmounts
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [ble.pairedDevice?.id]);

  const startStreaming = useCallback(async (
    rate: number = sampleRate,
  ): Promise<boolean> => {
    if (!ble.pairedDevice) {
      console.error(
        "[KneeDeviceContext] Cannot start streaming: no paired device",
      );
      return false;
    }

    const success = await kneeService.startStreaming(rate);
    if (success) {
      setIsStreaming(true);
      setSampleRate(rate);
    }
    return success;
  }, [ble.pairedDevice, kneeService, sampleRate]);

  const stopStreaming = useCallback(async (): Promise<boolean> => {
    if (!ble.pairedDevice) {
      console.error(
        "[KneeDeviceContext] Cannot stop streaming: no paired device",
      );
      return false;
    }

    const success = await kneeService.stopStreaming();
    if (success) {
      setIsStreaming(false);
    }
    return success;
  }, [ble.pairedDevice, kneeService]);

  const readControlState = useCallback(async (): Promise<void> => {
    const state = await kneeService.readControlState();
    if (state) {
      setIsStreaming(state.stream === 1);
      setSampleRate(state.sampleRate);
    }
  }, [kneeService]);

  const clearSensorData = () => {
    setSensorData(null);
  };

  const contextValue: KneeDeviceContextType = {
    device: ble.pairedDevice,
    isStreaming,
    sensorData,
    sampleRate,
    startStreaming,
    stopStreaming,
    setSampleRate,
    readControlState,
    clearSensorData,
    service: kneeService,
  };

  return (
    <KneeDeviceContext.Provider value={contextValue}>
      {children}
    </KneeDeviceContext.Provider>
  );
};

/**
 * Hook to access the KneeDevice context
 * @returns KneeDeviceContextType
 * @throws Error if used outside of KneeDeviceProvider
 */
export const useKneeDevice = (): KneeDeviceContextType => {
  const context = useContext(KneeDeviceContext);
  if (!context) {
    throw new Error("useKneeDevice must be used within KneeDeviceProvider");
  }
  return context;
};
