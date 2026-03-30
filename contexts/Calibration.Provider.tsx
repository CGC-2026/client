import { logger } from "@/lib/logger";
import { UserCalibrationData } from "@/types/workout.types";
import { WorkoutAPIService } from "@/services/workout.service";

const TAG = "Calibration";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "./Auth.Provider";
import { useAuthApiClient } from "./AuthApi.Provider";
import { useKneeDevice } from "./KneeDevice.Provider";

/** Time for the firmware to complete auto-calibration after the BLE trigger. */
const FIRMWARE_CALIBRATION_MS = 1500;

/**
 * Calibration context API — triggers firmware-side IMU recalibration over BLE.
 *
 * The firmware re-zeros all angles to the user's current pose when it receives
 * reserved=0x01 on the control characteristic.  The old client-side median
 * collection is no longer needed; the firmware handles zeroing internally.
 */
export interface CalibrationContextType {
  /** Last loaded calibration from the API (historical reference). */
  calibration: UserCalibrationData | null;
  /** True while the firmware is performing calibration (~1.5 s). */
  isCalibrating: boolean;
  /** User-facing error (e.g. no device, BLE write failure). */
  error: string | null;
  /** Trigger firmware recalibration via BLE, optionally starting streaming first. */
  startCalibration: () => Promise<void>;
  /** Fetch current user calibration from API. */
  loadCalibration: () => Promise<void>;
  /** Clear the current error message. */
  clearError: () => void;
}

const CalibrationContext = createContext<CalibrationContextType | null>(null);

export const CalibrationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const authClient = useAuthApiClient();
  const {
    device,
    isStreaming,
    startStreaming,
    sampleRate,
    triggerCalibration: triggerDeviceCalibration,
  } = useKneeDevice();

  const [calibration, setCalibration] = useState<UserCalibrationData | null>(
    null,
  );
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calibrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const workoutAPI = useMemo(
    () => (authClient ? new WorkoutAPIService(authClient) : null),
    [authClient],
  );

  // Clear state on user change (sign-out / switch)
  useEffect(() => {
    if (calibrationTimerRef.current) {
      clearTimeout(calibrationTimerRef.current);
      calibrationTimerRef.current = null;
    }
    setCalibration(null);
    setIsCalibrating(false);
    setError(null);
  }, [user?.id]);

  const startCalibration = useCallback(async () => {
    if (!device) {
      setError("No device connected");
      return;
    }

    if (calibrationTimerRef.current) {
      clearTimeout(calibrationTimerRef.current);
      calibrationTimerRef.current = null;
    }

    setIsCalibrating(true);
    setError(null);

    // Ensure we are streaming so the firmware has sensor data to calibrate from
    if (!isStreaming) {
      const started = await startStreaming(sampleRate);
      if (!started) {
        setIsCalibrating(false);
        setError("Failed to start streaming");
        return;
      }
    }

    logger.info(TAG, "Triggering firmware calibration");
    const success = await triggerDeviceCalibration();
    if (!success) {
      setIsCalibrating(false);
      setError("Failed to trigger device calibration");
      return;
    }

    // Wait for the firmware to finish its ~1 s auto-calibration window
    calibrationTimerRef.current = setTimeout(() => {
      calibrationTimerRef.current = null;
      setIsCalibrating(false);
      logger.info(TAG, "Firmware calibration complete");
    }, FIRMWARE_CALIBRATION_MS);
  }, [device, isStreaming, startStreaming, sampleRate, triggerDeviceCalibration]);

  const loadCalibration = useCallback(async () => {
    if (!workoutAPI) {
      setError("Auth not ready");
      return;
    }
    setError(null);
    try {
      const data = await workoutAPI.getUserCalibration();
      if (data) {
        setCalibration(data);
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      logger.error(TAG, "Failed to load calibration", err);
      setError("Failed to load calibration");
    }
  }, [workoutAPI]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      if (calibrationTimerRef.current) {
        clearTimeout(calibrationTimerRef.current);
        calibrationTimerRef.current = null;
      }
    };
  }, []);

  const value: CalibrationContextType = {
    calibration,
    isCalibrating,
    error,
    startCalibration,
    loadCalibration,
    clearError,
  };

  return (
    <CalibrationContext.Provider value={value}>
      {children}
    </CalibrationContext.Provider>
  );
};

export function useCalibration(): CalibrationContextType {
  const context = useContext(CalibrationContext);
  if (!context) {
    throw new Error("useCalibration must be used within a CalibrationProvider");
  }
  return context;
}
