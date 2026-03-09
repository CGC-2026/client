import { SquatCoachingService } from "@/services/squatCoaching.service";
import { WorkoutAPIService } from "@/services/workout.service";
import type { SensorData } from "@/types/sensor.types";
import {
  ActiveWorkoutSet,
  DEFAULT_USER_CALIBRATION_DATA,
  DEFAULT_WORKOUT_CONFIGURATION,
  Rep,
  UserCalibrationData,
  WorkoutConfiguration,
} from "@/types/workout.types";
import { AxiosInstance } from "axios";
import {
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

// TODO not sure which of these are actually needed, will remove after proper UI is built
export interface WorkoutContextType {
  isSetActive: boolean;
  currentSetNumber: number;
  startSet: () => Promise<void>;
  endSet: () => Promise<void>;
  completedSets: ActiveWorkoutSet[];
  // Real-time during active set
  currentRepCount: number;
  currentReps: Rep[];
  lastRep: Rep | null;
  // TODO Configuration/ Session
  isSessionActive: boolean;
  startNewSession: (workoutId: number) => Promise<void>;
  endSession: () => Promise<void>;
  activeConfiguration: WorkoutConfiguration;
  /** null when no error; set when startSet fails (e.g. no paired device) */
  setError: string | null;
  /** TODO remove after? 
   * Cancel current set without saving and clear completed sets (e.g. for dev reset) */
  cancelSetAndClear: () => Promise<void>;
}

const WorkoutContext = createContext<WorkoutContextType | null>(null);

const RE_SEGMENT_EVERY_N_SAMPLES = 30;

export const WorkoutProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const apiClient = useAuthApiClient();
  if (!apiClient) throw new Error("[WorkoutProvider] requires an authenticated API client.");
  return <WorkoutProviderInner apiClient={apiClient}>{children}</WorkoutProviderInner>;
};

const WorkoutProviderInner: React.FC<{ apiClient: AxiosInstance; children: React.ReactNode }> = ({
  apiClient,
  children,
}) => {
  const { subscribeSampleData, startStreaming, stopStreaming, isStreaming, sampleRate } = useKneeDevice();
  const workoutAPI = useMemo(() => new WorkoutAPIService(apiClient), [apiClient]);
  const squatCoachingService = useMemo(() => new SquatCoachingService(), []);

  const [isSessionActive] = useState(false); // Stub: always false until session API is wired
  const [isSetActive, setIsSetActive] = useState(false);
  const isSetActiveRef = useRef(false);
  const isProcessingSetRef = useRef(false);
  const [currentSetNumber, setCurrentSetNumber] = useState(0);
  const currentSetNumberRef = useRef(0);
  const [currentSetSamples, setCurrentSetSamples] = useState<SensorData[]>([]);
  const [currentReps, setCurrentReps] = useState<Rep[]>([]);
  const [completedSets, setCompletedSets] = useState<ActiveWorkoutSet[]>([]);
  const [activeConfiguration] = useState<WorkoutConfiguration>(
    DEFAULT_WORKOUT_CONFIGURATION,
  );
  const [setError, setSetError] = useState<string | null>(null);
  const [userCalibration, setUserCalibration] = useState<UserCalibrationData>(
    DEFAULT_USER_CALIBRATION_DATA,
  );

  useEffect(() => {
    workoutAPI.getUserCalibration().then((calibration) => {
      if (calibration) setUserCalibration(calibration);
    }).catch((error) => {
      console.error("[WorkoutProvider] Failed to load calibration", error);
    });
  }, [workoutAPI]);

  // Keep ref in sync so the subscriber closure always sees current value
  useEffect(() => {
    isSetActiveRef.current = isSetActive;
  }, [isSetActive]);

  useEffect(() => {
    currentSetNumberRef.current = currentSetNumber;
  }, [currentSetNumber]);

  // Buffer every sample during an active set
  useEffect(() => {
    return subscribeSampleData((data) => {
      if (!data || !isSetActiveRef.current) return;
      setCurrentSetSamples((prev) => [...prev, data]);
    });
  }, [subscribeSampleData]);

  // Real-time re-segmentation every N samples
  useEffect(() => {
    if (
      !isSetActive ||
      currentSetSamples.length < 3 ||
      currentSetSamples.length % RE_SEGMENT_EVERY_N_SAMPLES !== 0
    ) {
      return;
    }
    const reps = squatCoachingService.segmentSquatReps(
      currentSetSamples,
      activeConfiguration,
      userCalibration,
    );
    setCurrentReps(reps);
  }, [
    isSetActive,
    currentSetSamples,
    activeConfiguration,
    squatCoachingService,
    userCalibration,
  ]);

  const currentRepCount = currentReps.length;

  const lastRep = useMemo((): Rep | null => {
    if (currentReps.length > 0) {
      return currentReps[currentReps.length - 1];
    }
    if (completedSets.length > 0) {
      const lastSet = completedSets[completedSets.length - 1];
      if (lastSet.reps.length > 0) {
        return lastSet.reps[lastSet.reps.length - 1];
      }
    }
    return null;
  }, [currentReps, completedSets]);

  const startNewSession = useCallback(async (_workoutId: number) => {
    // TODO: create session via workoutAPI; set isSessionActive when implemented
  }, []);

  const endSession = useCallback(async () => {
    // TODO: end session via workoutAPI
  }, []);

  const startSet = useCallback(async () => {
    if (isSetActiveRef.current || isProcessingSetRef.current) return;

    isProcessingSetRef.current = true;
    setSetError(null);

    try {
      const ok = isStreaming || await startStreaming(sampleRate);
      if (!ok) {
        setSetError("Cannot start set: no paired device.");
        return;
      }

      setCurrentSetSamples([]);
      setCurrentReps([]);
      isSetActiveRef.current = true;
      setIsSetActive(true);
    } finally {
      isProcessingSetRef.current = false;
    }
  }, [isStreaming, sampleRate, startStreaming]);

  const endSet = useCallback(async () => {
    if (!isSetActiveRef.current || isProcessingSetRef.current) return;

    isProcessingSetRef.current = true;
    isSetActiveRef.current = false;
    setIsSetActive(false);

    const setSamples = [...currentSetSamples];

    try {
      await stopStreaming();
      const reps = squatCoachingService.segmentSquatReps(
        setSamples,
        activeConfiguration,
        userCalibration,
      );

      const setStartTime =
        setSamples.length > 0
          ? setSamples[0].timestamp
          : Date.now();
      const setEndTime =
        setSamples.length > 0
          ? setSamples[setSamples.length - 1].timestamp
          : Date.now();
      const nextSetNumber = currentSetNumberRef.current + 1;

      currentSetNumberRef.current = nextSetNumber;
      setCompletedSets((prev) => [
        ...prev,
        {
          setNumber: nextSetNumber,
          startTime: setStartTime,
          endTime: setEndTime,
          reps,
        },
      ]);
      setCurrentSetNumber(nextSetNumber);
      setCurrentSetSamples([]);
      setCurrentReps([]);
    } finally {
      isProcessingSetRef.current = false;
    }
  }, [
    currentSetSamples,
    activeConfiguration,
    userCalibration,
    squatCoachingService,
    stopStreaming,
  ]);

  const cancelSetAndClear = useCallback(async () => {
    isSetActiveRef.current = false;
    try {
      if (isStreaming) {
        await stopStreaming();
      }
    } finally {
      isProcessingSetRef.current = false;
      currentSetNumberRef.current = 0;
      setIsSetActive(false);
      setCurrentSetNumber(0);
      setCurrentSetSamples([]);
      setCurrentReps([]);
      setCompletedSets([]);
    }
  }, [isStreaming, stopStreaming]);

  const contextValue: WorkoutContextType = {
    isSessionActive,
    startNewSession,
    endSession,
    isSetActive,
    currentSetNumber,
    startSet,
    endSet,
    completedSets,
    cancelSetAndClear,
    currentRepCount,
    currentReps,
    lastRep,
    activeConfiguration,
    setError,
  };

  return (
    <WorkoutContext.Provider value={contextValue}>
      {children}
    </WorkoutContext.Provider>
  );
};

/**
 * Hook to access the workout context
 */
export function useWorkoutContext(): WorkoutContextType {
  const context = useContext(WorkoutContext);

  if (!context) {
    throw new Error("useWorkoutContext must be used within a WorkoutProvider");
  }

  return context;
}
