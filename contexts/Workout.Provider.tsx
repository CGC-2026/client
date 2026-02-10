import { useAuth } from "@/contexts/Auth.Provider";
import { useKneeDevice } from "@/contexts/KneeDevice.Provider";
import {
  analyzeRepQuality,
  createCoachingProcessor,
  RealTimeCoachingProcessor,
} from "@/helpers/coaching";
import { createRepDetector, RepDetector } from "@/helpers/repDetection";
import { workoutAPI } from "@/services/api/workout.service";
import {
  CalibrationData,
  CoachingZone,
  Rep,
  WorkoutSession,
  WorkoutSet,
  WorkoutType,
} from "@/types/workout.types";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert, AppState, AppStateStatus } from "react-native";

/**
 * Workout Context API
 */
export interface WorkoutContextType {
  // Configuration
  workoutTypes: WorkoutType[];
  selectedWorkoutType: WorkoutType | null;
  calibration: CalibrationData | null;
  isLoading: boolean;

  // Device status
  isDeviceConnected: boolean;

  // Session management
  activeSession: WorkoutSession | null;
  activeSet: WorkoutSet | null;
  isSessionActive: boolean;
  isSetActive: boolean;

  // Real-time data
  currentRep: Partial<Rep> | null;
  detectedReps: Rep[];
  realtimeCoachingZones: CoachingZone[];
  currentQuality: "good" | "okay" | "bad" | null;

  // Actions
  selectWorkoutType: (workoutTypeId: string) => void;
  startSession: (workoutTypeId: string) => Promise<void>;
  endSession: () => Promise<void>;
  startSet: () => Promise<void>;
  endSet: () => Promise<void>;

  // History
  sessionHistory: WorkoutSession[];
  refreshHistory: () => Promise<void>;
}

const WorkoutContext = createContext<WorkoutContextType | null>(null);

export const WorkoutProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const kneeDevice = useKneeDevice();
  const { user } = useAuth();

  // Configuration state
  const [workoutTypes, setWorkoutTypes] = useState<WorkoutType[]>([]);
  const [selectedWorkoutType, setSelectedWorkoutType] = useState<WorkoutType | null>(null);
  const [calibration, setCalibration] = useState<CalibrationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Session state
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [activeSet, setActiveSet] = useState<WorkoutSet | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isSetActive, setIsSetActive] = useState(false);

  // Real-time data
  const [detectedReps, setDetectedReps] = useState<Rep[]>([]);
  const [currentRep, setCurrentRep] = useState<Partial<Rep> | null>(null);
  const [realtimeCoachingZones, setRealtimeCoachingZones] = useState<CoachingZone[]>([]);
  const [currentQuality, setCurrentQuality] = useState<"good" | "okay" | "bad" | null>(null);

  // History
  const [sessionHistory, setSessionHistory] = useState<WorkoutSession[]>([]);

  // Rep detector and coaching processor instances
  const repDetectorRef = useRef<RepDetector | null>(null);
  const coachingProcessorRef = useRef<RealTimeCoachingProcessor | null>(null);
  const repCounterRef = useRef<number>(0);

  // Live Activity state
  const [liveActivityAvailable, setLiveActivityAvailable] = useState(false);
  const liveActivityIdRef = useRef<string | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const wasDeviceConnectedRef = useRef<boolean>(false);

  // Load workout types and calibration on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);

        // Load workout types
        const types = await workoutAPI.getWorkoutTypes();
        setWorkoutTypes(types);

        // Load user calibration
        if (user?.id) {
          const userCalibration = await workoutAPI.getUserCalibration(user.id);
          setCalibration(userCalibration);

          // Initialize processors with calibration
          if (userCalibration) {
            repDetectorRef.current = createRepDetector(userCalibration);
            coachingProcessorRef.current = createCoachingProcessor(userCalibration);
          }
        }

        // Load session history
        if (user?.id) {
          const history = await workoutAPI.getSessionHistory(user.id);
          setSessionHistory(history);
        }
      } catch (error) {
        console.error("[WorkoutContext] Initialization error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [user?.id]);

  // Monitor device connection and auto-pause on disconnect
  useEffect(() => {
    const isConnected = kneeDevice.device !== null;
    
    // If device disconnected during active session
    if (!isConnected && wasDeviceConnectedRef.current && isSessionActive) {
      console.warn("[WorkoutContext] Device disconnected during active session");
      
      // Stop set if active
      if (isSetActive) {
        kneeDevice.stopStreaming();
        setIsSetActive(false);
      }
      
      // Alert user
      Alert.alert(
        "Device Disconnected",
        "Your Smart Knee device has disconnected. Please reconnect to continue your workout.",
        [
          {
            text: "OK",
            onPress: () => console.log("[WorkoutContext] User acknowledged disconnect"),
          },
        ]
      );
    }
    
    wasDeviceConnectedRef.current = isConnected;
  }, [kneeDevice.device, isSessionActive, isSetActive, kneeDevice.stopStreaming]);

  // Subscribe to sensor data when set is active
  useEffect(() => {
    if (!isSetActive || !kneeDevice.sensorData || !repDetectorRef.current || !coachingProcessorRef.current) {
      return;
    }

    const sensorData = kneeDevice.sensorData;

    // Process through coaching processor
    const zoneAdded = coachingProcessorRef.current.processSensorData(sensorData);
    if (zoneAdded) {
      setRealtimeCoachingZones(coachingProcessorRef.current.getZones());
      setCurrentQuality(coachingProcessorRef.current.getCurrentQuality());
    }

    // Process through rep detector
    const result = repDetectorRef.current.processSensorData(sensorData);

    if (result.repDetected && result.rep && calibration) {
      // Rep completed!
      const repNumber = repCounterRef.current + 1;
      repCounterRef.current = repNumber;

      // Analyze rep quality
      const quality = analyzeRepQuality(result.rep, calibration);

      const completedRep: Rep = {
        id: `rep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        setId: activeSet?.id || "",
        repNumber,
        startTime: result.rep.startTime!,
        endTime: result.rep.endTime!,
        peakAngle: result.rep.peakAngle!,
        avgFlex: result.rep.avgFlex!,
        sensorDataPoints: result.rep.sensorDataPoints!,
        quality,
        duration: result.rep.duration!,
      };

      console.log(`[WorkoutContext] Rep ${repNumber} completed:`, quality);
      setDetectedReps((prev) => {
        const newReps = [...prev, completedRep];
        
        return newReps;
      });
      setCurrentRep(null);
    }
  }, [kneeDevice.sensorData, isSetActive, calibration, activeSet?.id, liveActivityAvailable, activeSession, selectedWorkoutType]);

  const selectWorkoutType = useCallback((workoutTypeId: string) => {
    const workoutType = workoutTypes.find((wt) => wt.id === workoutTypeId);
    if (workoutType) {
      setSelectedWorkoutType(workoutType);
    }
  }, [workoutTypes]);

  const startSession = useCallback(async (workoutTypeId: string) => {
    if (!user?.id) {
      console.error("[WorkoutContext] Cannot start session: no user");
      return;
    }

    // Check device connection
    if (!kneeDevice.device) {
      console.error("[WorkoutContext] Cannot start session: no device connected");
      Alert.alert(
        "Device Not Connected",
        "Please connect to your Smart Knee device before starting a workout.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      const workoutType = workoutTypes.find((wt) => wt.id === workoutTypeId);
      if (!workoutType) {
        console.error("[WorkoutContext] Workout type not found");
        return;
      }

      // Create session via API
      const session = await workoutAPI.createSession({
        workoutTypeId,
        userId: user.id,
        startTime: new Date(),
      });

      setActiveSession(session);
      setSelectedWorkoutType(workoutType);
      setIsSessionActive(true);

      console.log("[WorkoutContext] Started session:", session.id);
    } catch (error) {
      console.error("[WorkoutContext] Error starting session:", error);
    }
  }, [user?.id, workoutTypes, liveActivityAvailable, kneeDevice.device]);

  const endSession = useCallback(async () => {
    if (!activeSession) {
      console.error("[WorkoutContext] No active session to end");
      return;
    }

    try {
      // End any active set first
      if (isSetActive) {
        await endSet();
      }

      // End session via API
      await workoutAPI.endSession({
        sessionId: activeSession.id,
        endTime: new Date(),
      });

      console.log("[WorkoutContext] Ended session:", activeSession.id);

      // Refresh history
      if (user?.id) {
        const history = await workoutAPI.getSessionHistory(user.id);
        setSessionHistory(history);
      }

      // Clear session state
      setActiveSession(null);
      setIsSessionActive(false);
      setSelectedWorkoutType(null);
    } catch (error) {
      console.error("[WorkoutContext] Error ending session:", error);
    }
  }, [activeSession, isSetActive, user?.id, liveActivityAvailable]);

  const startSet = useCallback(async () => {
    if (!activeSession || !selectedWorkoutType || !calibration) {
      console.error("[WorkoutContext] Cannot start set: missing session or calibration");
      return;
    }

    try {
      // Create set
      const setNumber = activeSession.sets.length + 1;
      const newSet: WorkoutSet = {
        id: `set-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sessionId: activeSession.id,
        setNumber,
        startTime: new Date(),
        reps: [],
      };

      setActiveSet(newSet);
      setIsSetActive(true);
      setDetectedReps([]);
      repCounterRef.current = 0;

      // Reset processors
      if (repDetectorRef.current) {
        repDetectorRef.current.reset();
      }
      if (coachingProcessorRef.current) {
        coachingProcessorRef.current.clear();
      }

      // Start streaming with workout type's sample rate
      const success = await kneeDevice.startStreaming(
        selectedWorkoutType.configuration.sampleRate
      );

      if (!success) {
        console.error("[WorkoutContext] Failed to start streaming");
        setIsSetActive(false);
        setActiveSet(null);
        return;
      }

      console.log(`[WorkoutContext] Started set ${setNumber}`);
    } catch (error) {
      console.error("[WorkoutContext] Error starting set:", error);
      setIsSetActive(false);
      setActiveSet(null);
    }
  }, [activeSession, selectedWorkoutType, calibration, kneeDevice, liveActivityAvailable]);

  const endSet = useCallback(async () => {
    if (!activeSet || !activeSession) {
      console.error("[WorkoutContext] No active set to end");
      return;
    }

    try {
      // Stop streaming
      await kneeDevice.stopStreaming();

      // Complete set with collected reps
      const completedSet: WorkoutSet = {
        ...activeSet,
        endTime: new Date(),
        reps: detectedReps,
      };

      // Save set via API
      await workoutAPI.saveSet({
        sessionId: activeSession.id,
        setNumber: completedSet.setNumber,
        startTime: completedSet.startTime,
        endTime: completedSet.endTime!,
        reps: detectedReps,
      });

      console.log(`[WorkoutContext] Ended set ${completedSet.setNumber} with ${detectedReps.length} reps`);

      // Update session
      const updatedSession = {
        ...activeSession,
        sets: [...activeSession.sets, completedSet],
      };
      setActiveSession(updatedSession);

      // Clear set state
      setActiveSet(null);
      setIsSetActive(false);
      setRealtimeCoachingZones([]);
      setCurrentQuality(null);
    } catch (error) {
      console.error("[WorkoutContext] Error ending set:", error);
    }
  }, [activeSet, activeSession, detectedReps, kneeDevice, liveActivityAvailable, selectedWorkoutType]);

  const refreshHistory = useCallback(async () => {
    if (!user?.id) return;

    try {
      const history = await workoutAPI.getSessionHistory(user.id);
      setSessionHistory(history);
    } catch (error) {
      console.error("[WorkoutContext] Error refreshing history:", error);
    }
  }, [user?.id]);

  const contextValue: WorkoutContextType = {
    // Configuration
    workoutTypes,
    selectedWorkoutType,
    calibration,
    isLoading,

    // Device status
    isDeviceConnected: kneeDevice.device !== null,

    // Session management
    activeSession,
    activeSet,
    isSessionActive,
    isSetActive,

    // Real-time data
    currentRep,
    detectedReps,
    realtimeCoachingZones,
    currentQuality,

    // Actions
    selectWorkoutType,
    startSession,
    endSession,
    startSet,
    endSet,

    // History
    sessionHistory,
    refreshHistory,
  };

  return (
    <WorkoutContext.Provider value={contextValue}>
      {children}
    </WorkoutContext.Provider>
  );
};

/**
 * Hook to access the Workout context
 * @throws Error if used outside of WorkoutProvider
 */
export const useWorkout = (): WorkoutContextType => {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error("useWorkout must be used within WorkoutProvider");
  }
  return context;
};
