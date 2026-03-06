import { SensorData } from "@/services/kneeDevice.service";
import { SquatCoachingService } from "@/services/squatCoaching.service";
import { WorkoutAPIService } from "@/services/workout.service";
import {
  DEFAULT_USER_CALIBRATION_DATA,
  DEFAULT_WORKOUT_CONFIGURATION,
  Rep,
  WorkoutConfiguration,
  WorkoutSet,
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
import { useAuth } from "./Auth.Provider";
import { useAuthApiClient } from "./AuthApi.Provider";
import { useKneeDevice } from "./KneeDevice.Provider";

// TODO not sure which of these are actually needed, will remove after proper UI is built
export interface WorkoutContextType {
  isSetActive: boolean;
  currentSetNumber: number;
  startSet: () => Promise<void>;
  endSet: () => Promise<void>;
  completedSets: WorkoutSet[];
  // Real-time during active set
  currentRepCount: number;
  currentReps: Rep[];
  lastRep: Rep | null;
  // TODO Configuration/ Session
  isSessionActive: boolean;
  startNewSession: (workoutId: number) => Promise<void>;
  endSession: () => Promise<void>;
  activeConfiguration: WorkoutConfiguration;
  /** TODO remove after? 
   * Cancel current set without saving and clear completed sets (e.g. for dev reset) */
  cancelSetAndClear: () => void;
}

const WorkoutContext = createContext<WorkoutContextType | null>(null);

const RE_SEGMENT_EVERY_N_SAMPLES = 5; // TODO we can raise this number to save compute

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
  const { subscribeSampleData, startStreaming, isStreaming, sampleRate } = useKneeDevice();
  const { user } = useAuth();
  const workoutAPI = useMemo(() => new WorkoutAPIService(apiClient), [apiClient]);
  const squatCoachingService = useMemo(() => new SquatCoachingService(), []);

  const [isSessionActive] = useState(false); // Stub: always false until session API is wired
  const [isSetActive, setIsSetActive] = useState(false);
  const isSetActiveRef = useRef(false);
  const [currentSetNumber, setCurrentSetNumber] = useState(0);
  const [currentSetSamples, setCurrentSetSamples] = useState<SensorData[]>([]);
  const [currentReps, setCurrentReps] = useState<Rep[]>([]);
  const [completedSets, setCompletedSets] = useState<WorkoutSet[]>([]);
  const [activeConfiguration] = useState<WorkoutConfiguration>(
    DEFAULT_WORKOUT_CONFIGURATION,
  );

  // Keep ref in sync so the subscriber closure always sees current value
  useEffect(() => {
    isSetActiveRef.current = isSetActive;
  }, [isSetActive]);

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
      DEFAULT_USER_CALIBRATION_DATA,
    );
    setCurrentReps(reps);
  }, [
    isSetActive,
    currentSetSamples,
    activeConfiguration,
    squatCoachingService,
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
    if (!isStreaming) {
      await startStreaming(sampleRate);
    }
    setIsSetActive(true);
    setCurrentSetSamples([]);
    setCurrentReps([]);
  }, [isStreaming, sampleRate, startStreaming]);

  const endSet = useCallback(async () => {
    if (!isSetActive) return;

    const calibration = (await workoutAPI.getUserCalibration()) ??
          DEFAULT_USER_CALIBRATION_DATA

    const reps = squatCoachingService.segmentSquatReps(
      currentSetSamples,
      activeConfiguration,
      calibration,
    );

    const setStartTime =
      currentSetSamples.length > 0
        ? currentSetSamples[0].timestamp
        : Date.now();
    const setEndTime =
      currentSetSamples.length > 0
        ? currentSetSamples[currentSetSamples.length - 1].timestamp
        : Date.now();

    setCompletedSets((prev) => [
      ...prev,
      {
        setNumber: currentSetNumber + 1,
        startTime: setStartTime,
        endTime: setEndTime,
        reps,
      },
    ]);
    setCurrentSetNumber((n) => n + 1);
    setIsSetActive(false);
    setCurrentSetSamples([]);
    setCurrentReps([]);
  }, [
    isSetActive,
    currentSetSamples,
    currentSetNumber,
    activeConfiguration,
    user?.id,
    workoutAPI,
    squatCoachingService,
  ]);

  const cancelSetAndClear = useCallback(() => {
    setIsSetActive(false);
    setCurrentSetSamples([]);
    setCurrentReps([]);
    setCompletedSets([]);
  }, []);

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
