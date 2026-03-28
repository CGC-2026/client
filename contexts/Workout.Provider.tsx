import { useAuth } from "@/contexts/Auth.Provider";
import { logger } from "@/lib/logger";
import { SquatCoachingService } from "@/services/squatCoaching.service";
import { WorkoutAPIService } from "@/services/workout.service";
import type { SensorData } from "@/types/sensor.types";
import {
  ActiveWorkoutSet,
  CreateWorkoutSessionDTO,
  DEFAULT_USER_CALIBRATION_DATA,
  DEFAULT_WORKOUT_CONFIGURATION,
  EndSessionDTO,
  Rep,
  SaveSetDTO,
  UserCalibrationData,
  WorkoutConfiguration,
} from "@/types/workout.types";
import { useQueryClient } from "@tanstack/react-query";
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

const TAG = "Workout";

export interface WorkoutContextType {
  isSetActive: boolean;
  currentSetNumber: number;
  startSet: () => Promise<void>;
  endSet: () => Promise<void>;
  completedSets: ActiveWorkoutSet[];
  currentRepCount: number;
  currentReps: Rep[];
  lastRep: Rep | null;
  isSessionActive: boolean;
  currentSessionId: string | null;
  startNewSession: (workoutTypeId: string) => Promise<void>;
  endSession: () => Promise<void>;
  activeConfiguration: WorkoutConfiguration;
  setError: string | null;
  cancelSetAndClear: () => Promise<void>;
}

const WorkoutContext = createContext<WorkoutContextType | null>(null);

// At 120 Hz, 10 samples ≈ 83 ms — keeps the live rep count feeling immediate.
const RE_SEGMENT_EVERY_N_SAMPLES = 10;

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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const workoutAPI = useMemo(() => new WorkoutAPIService(apiClient), [apiClient]);
  const squatCoachingService = useMemo(() => new SquatCoachingService(), []);

  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
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
    if (!user?.id) {
      setUserCalibration(DEFAULT_USER_CALIBRATION_DATA);
      return;
    }
    workoutAPI.getUserCalibration().then((calibration) => {
      if (calibration) setUserCalibration(calibration);
    }).catch((error) => {
      logger.error(TAG, "Failed to load calibration on mount", error);
    });
    // workoutAPI is intentionally omitted: Clerk's getToken is not a stable
    // reference, so workoutAPI recreates on every token refresh. Since each
    // workoutAPI instance always fetches a fresh token per-request anyway,
    // any version captured here is functionally identical. Calibration only
    // needs one fetch per user session, not once per token refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Keep refs in sync so subscriber closures always see current values
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

  const startNewSession = useCallback(async (workoutTypeId: string) => {
    const dto: CreateWorkoutSessionDTO = {
      workoutTypeId,
      startTime: new Date(),
    };

    try {
      const result = await workoutAPI.createSession(dto);
      const sessionId: string = result?.id ?? `local-${Date.now()}`;
      setCurrentSessionId(sessionId);
      logger.info(TAG, "Session started", { sessionId, workoutTypeId });
    } catch {
      const localId = `local-${Date.now()}`;
      logger.warn(TAG, "Failed to create session on server, using local ID", { localId });
      setCurrentSessionId(localId);
    }

    setIsSessionActive(true);
    setCurrentSetNumber(0);
    currentSetNumberRef.current = 0;
    setCompletedSets([]);
    setCurrentReps([]);
    setCurrentSetSamples([]);
    setSetError(null);
  }, [workoutAPI]);

  const endSession = useCallback(async () => {
    if (!currentSessionId) return;

    const dto: EndSessionDTO = {
      sessionId: currentSessionId,
      endTime: new Date(),
    };

    try {
      await workoutAPI.endSession(dto);
      logger.info(TAG, "Session ended", { sessionId: currentSessionId });
    } catch (error) {
      logger.error(TAG, "Failed to end session on server", error, { sessionId: currentSessionId });
    }

    setIsSessionActive(false);
    setCurrentSessionId(null);
    setCurrentSetNumber(0);
    currentSetNumberRef.current = 0;
    setCompletedSets([]);
    setCurrentReps([]);
    setCurrentSetSamples([]);
    setSetError(null);

    // Invalidate so Activities screen reflects the new session
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: ["sessionHistory", user.id] });
    }
  }, [currentSessionId, workoutAPI, queryClient, user?.id]);

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
      logger.info(TAG, "Set started", { setNumber: currentSetNumberRef.current + 1, sessionId: currentSessionId });
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
        setSamples.length > 0 ? setSamples[0].timestamp : Date.now();
      const setEndTime =
        setSamples.length > 0 ? setSamples[setSamples.length - 1].timestamp : Date.now();
      const nextSetNumber = currentSetNumberRef.current + 1;

      currentSetNumberRef.current = nextSetNumber;
      const completedSet: ActiveWorkoutSet = {
        setNumber: nextSetNumber,
        startTime: setStartTime,
        endTime: setEndTime,
        reps,
      };

      setCompletedSets((prev) => [...prev, completedSet]);
      setCurrentSetNumber(nextSetNumber);
      setCurrentSetSamples([]);
      setCurrentReps([]);

      logger.info(TAG, "Set ended", { setNumber: nextSetNumber, repCount: reps.length, sessionId: currentSessionId });

      if (currentSessionId) {
        const dto: SaveSetDTO = {
          sessionId: currentSessionId,
          setNumber: nextSetNumber,
          startTime: new Date(setStartTime),
          endTime: new Date(setEndTime),
          reps,
        };
        workoutAPI.saveSet(dto).catch((error) => {
          logger.error(TAG, "Failed to save set to server", error, { setNumber: nextSetNumber, sessionId: currentSessionId });
        });
      }
    } finally {
      isProcessingSetRef.current = false;
    }
  }, [
    currentSetSamples,
    activeConfiguration,
    userCalibration,
    squatCoachingService,
    stopStreaming,
    currentSessionId,
    workoutAPI,
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
    currentSessionId,
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

export function useWorkoutContext(): WorkoutContextType {
  const context = useContext(WorkoutContext);

  if (!context) {
    throw new Error("useWorkoutContext must be used within a WorkoutProvider");
  }

  return context;
}
