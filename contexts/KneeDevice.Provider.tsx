import { DEFAULT_SAMPLE_RATE } from "@/constants/BLE";
import { useBLE } from "@/contexts/BLE.Provider";
import { logger } from "@/lib/logger";
import { KneeDeviceService } from "@/services/kneeDevice.service";
import type { SensorData } from "@/types/sensor.types";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Device } from "react-native-ble-plx";

const TAG = "KneeDevice";

/** Duration of the firmware warm-up / auto-calibration window after stream start. */
const WARMUP_DURATION_MS = 1200;

export interface KneeDeviceContextType {
  /** Currently connected Smart Knee device or null */
  device: Device | null;
  /** Whether streaming is currently active */
  isStreaming: boolean;
  /** True for the first ~1s after stream start while the firmware auto-calibrates */
  isWarmingUp: boolean;
  /** Current sample rate in Hz */
  sampleRate: number;
  /** Start streaming at the specified rate */
  startStreaming: (rate?: number) => Promise<boolean>;
  /** Stop streaming */
  stopStreaming: () => Promise<boolean>;
  /** Trigger firmware IMU recalibration (re-zeros angles to current pose) */
  triggerCalibration: () => Promise<boolean>;
  /** Set the sample rate (takes effect on next start) */
  setSampleRate: (rate: number) => void;
  /** Read the current control state from device */
  readControlState: () => Promise<void>;
  /**
   * Subscribe to every sensor data packet.
   * Callbacks fire synchronously from the BLE notification handler.
   * `null` is dispatched when the device disconnects so consumers can reset
   * any state derived from sensor data (e.g. clear a displayed value).
   * Returns an unsubscribe function — call it in your effect cleanup.
   */
  subscribeSampleData: (cb: (data: SensorData | null) => void) => () => void;
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
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [sampleRate, setSampleRate] = useState(DEFAULT_SAMPLE_RATE);
  const warmupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sampleListenersRef = useRef<Set<(data: SensorData | null) => void>>(new Set());

  // Create service instance (memoized to prevent recreation)
  const kneeService = useMemo(
    () => new KneeDeviceService(ble),
    [
      ble.readCharacteristic,
      ble.writeCharacteristic,
      ble.subscribeToCharacteristic,
    ],
  );

  const notifyListeners = useCallback((data: SensorData | null) => {
    for (const cb of sampleListenersRef.current) {
      try {
        cb(data);
      } catch (e) {
        logger.error(TAG, "subscribeSampleData listener threw", e);
      }
    }
  }, []);

  // Subscribe to sensor data when device is paired
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setupSubscription = async () => {
      if (ble.pairedDevice) {
        unsubscribe = await kneeService.subscribeToSensorData((data) => {
          if (data) {
            notifyListeners(data);
          }
        });
      } else {
        setIsStreaming(false);
        notifyListeners(null);
      }
    };

    setupSubscription();

    // Cleanup subscription when device disconnects or component unmounts
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [ble.pairedDevice?.id, notifyListeners]);

  const beginWarmup = useCallback(() => {
    if (warmupTimerRef.current) clearTimeout(warmupTimerRef.current);
    setIsWarmingUp(true);
    warmupTimerRef.current = setTimeout(() => {
      warmupTimerRef.current = null;
      setIsWarmingUp(false);
    }, WARMUP_DURATION_MS);
  }, []);

  const startStreaming = useCallback(async (
    rate: number = sampleRate,
  ): Promise<boolean> => {
    if (!ble.pairedDevice) {
      logger.warn(TAG, "Cannot start streaming: no paired device");
      return false;
    }

    const success = await kneeService.startStreaming(rate);
    if (success) {
      setIsStreaming(true);
      setSampleRate(rate);
      beginWarmup();
      logger.info(TAG, "Streaming started", { sampleRate: rate });
    }
    return success;
  }, [ble.pairedDevice, kneeService, sampleRate, beginWarmup]);

  const stopStreaming = useCallback(async (): Promise<boolean> => {
    if (!ble.pairedDevice) {
      logger.warn(TAG, "Cannot stop streaming: no paired device");
      return false;
    }

    const success = await kneeService.stopStreaming();
    if (success) {
      setIsStreaming(false);
      if (warmupTimerRef.current) {
        clearTimeout(warmupTimerRef.current);
        warmupTimerRef.current = null;
      }
      setIsWarmingUp(false);
      logger.info(TAG, "Streaming stopped");
    }
    return success;
  }, [ble.pairedDevice, kneeService]);

  const triggerCalibration = useCallback(async (): Promise<boolean> => {
    if (!ble.pairedDevice) {
      logger.warn(TAG, "Cannot trigger calibration: no paired device");
      return false;
    }
    const success = await kneeService.triggerCalibration();
    if (success) {
      beginWarmup();
    }
    return success;
  }, [ble.pairedDevice, kneeService, beginWarmup]);

  const readControlState = useCallback(async (): Promise<void> => {
    const state = await kneeService.readControlState();
    if (state) {
      setIsStreaming(state.stream === 1);
      setSampleRate(state.sampleRate);
    }
  }, [kneeService]);

  const subscribeSampleData = useCallback(
    (cb: (data: SensorData | null) => void): (() => void) => {
      sampleListenersRef.current.add(cb);
      return () => sampleListenersRef.current.delete(cb);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (warmupTimerRef.current) clearTimeout(warmupTimerRef.current);
    };
  }, []);

  const contextValue: KneeDeviceContextType = {
    device: ble.pairedDevice,
    isStreaming,
    isWarmingUp,
    sampleRate,
    startStreaming,
    stopStreaming,
    triggerCalibration,
    setSampleRate,
    readControlState,
    subscribeSampleData,
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
