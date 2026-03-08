import { mediansForRollPitchYaw } from "@/lib/math";
import { SensorData } from "@/services/kneeDevice.service";
import { WorkoutAPIService } from "@/services/workout.service";
import { CreateUserCalibrationData, UserCalibrationData } from "@/types/workout.types";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuthApiClient } from "./AuthApi.Provider";
import { useKneeDevice } from "./KneeDevice.Provider";

const CALIBRATION_DURATION_MS = 4000;

/**
 * Calibration context API for standing baseline and device calibration.
 */
export interface CalibrationContextType {
  /** Last loaded or saved calibration (null until fetched or first run). */
  calibration: UserCalibrationData | null;
  /** True from start of sampling until save completes or failure. */
  isCalibrating: boolean;
  /** User-facing error (e.g. no device, auth not ready, API failure). */
  error: string | null;
  /** Start streaming, collect samples for a fixed duration, then save calibration via API. */
  startCalibration: () => Promise<void>;
  /** Fetch current user calibration from API and set calibration state. */
  loadCalibration: () => Promise<void>;
  /** Clear the current error message. */
  clearError: () => void;
}

const CalibrationContext = createContext<CalibrationContextType | null>(null);

export const CalibrationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const authClient = useAuthApiClient();
  const {
    device,
    isStreaming,
    startStreaming,
    stopStreaming,
    sampleRate,
    subscribeSampleData,
  } = useKneeDevice();

  const [calibration, setCalibration] = useState<UserCalibrationData | null>(
    null,
  );
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calibrationSamplesRef = useRef<SensorData[]>([]);
  const calibrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCalibratingRef = useRef(false);

  const workoutAPI = useMemo(
    () => (authClient ? new WorkoutAPIService(authClient) : null),
    [authClient],
  );

  // Keep ref in sync so the subscriber closure always sees current value
  useEffect(() => {
    isCalibratingRef.current = isCalibrating;
  }, [isCalibrating]);

  // Buffer every sample while calibrating — runs outside the React render cycle
  useEffect(() => {
    return subscribeSampleData((data) => {
      if (!data || !isCalibratingRef.current) return;
      calibrationSamplesRef.current.push(data);
    });
  }, [subscribeSampleData]);

  const startCalibration = useCallback(async () => {
    if (!device) {
      setError("No device connected");
      return;
    }
    if (!workoutAPI) {
      setError("Auth not ready");
      return;
    }

    // Clear any existing timer from a previous run
    if (calibrationTimerRef.current) {
      clearTimeout(calibrationTimerRef.current);
      calibrationTimerRef.current = null;
    }

    // Only stop streaming if we're currently streaming (avoids BLE stop-then-start when not needed)
    if (isStreaming) {
      await stopStreaming();
    }

    isCalibratingRef.current = true;
    setIsCalibrating(true);
    setError(null);
    calibrationSamplesRef.current = [];

    const success = await startStreaming(sampleRate);
    if (!success) {
      isCalibratingRef.current = false;
      setIsCalibrating(false);
      setError("Failed to start streaming");
      return;
    }

    calibrationTimerRef.current = setTimeout(async () => {
      calibrationTimerRef.current = null;
      await stopStreaming();

      const samples = calibrationSamplesRef.current;
      calibrationSamplesRef.current = [];

      if (samples.length < 2) {
        setError("Not enough samples; stand still and try again");
        isCalibratingRef.current = false;
        setIsCalibrating(false);
        return;
      }

      const { roll, pitch, yaw } = mediansForRollPitchYaw(
        samples.map((s) => s.roll),
        samples.map((s) => s.pitch),
        samples.map((s) => s.yaw),
      );

      const calibrationData: CreateUserCalibrationData = {
        standingYawAngle: yaw,
        standingPitchAngle: pitch,
        standingRollAngle: roll,
      };

      try {
        await workoutAPI.saveCalibration(calibrationData);
        const data = await workoutAPI.getUserCalibration();
        if (data) {
          setCalibration(data);
        }
        setError(null);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        console.error("[Calibration] saveCalibration failed", {
          message: err.message,
          stack: err.stack,
          calibrationData: { ...calibrationData },
        });
        setError("Failed to save calibration");
      } finally {
        isCalibratingRef.current = false;
        setIsCalibrating(false);
      }
    }, CALIBRATION_DURATION_MS);
  }, [
    device,
    isStreaming,
    workoutAPI,
    startStreaming,
    stopStreaming,
    sampleRate,
  ]);

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
      console.error("[Calibration] loadCalibration (getUserCalibration) failed", {
        message: err.message,
        stack: err.stack,
      });
      setError("Failed to load calibration");
    }
  }, [workoutAPI]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Clear timer on unmount and stop streaming so the device does not keep streaming
  useEffect(() => {
    return () => {
      if (calibrationTimerRef.current) {
        clearTimeout(calibrationTimerRef.current);
        calibrationTimerRef.current = null;
        stopStreaming();
      }
    };
  }, [stopStreaming]);

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
