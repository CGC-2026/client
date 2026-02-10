import { SensorData } from "@/services/kneeDevice.service";

// ==================== Workout Types ====================

/**
 * Workout type configuration from backend (admin configured)
 */
export interface WorkoutType {
  id: string;
  name: string; // "Squats", "Running", etc.
  description?: string;
  configuration: WorkoutConfiguration;
}

/**
 * Configuration for a specific workout type
 */
export interface WorkoutConfiguration {
  sampleRate: number; // Sample rate in Hz (e.g., 120)
  minRepDuration?: number; // Minimum rep duration in ms
  maxRepDuration?: number; // Maximum rep duration in ms
  minDepthAngle?: number; // Minimum angle for valid rep
}

// ==================== Calibration ====================

/**
 * User calibration data (neutral/zero position values)
 */
export interface CalibrationData {
  userId: string;
  standingAngle: number; // Neutral knee angle (standing straight)
  standingFlex: number; // Neutral flex sensor value (standing straight)
  lastCalibrated: Date;
}

// ==================== Session & Set ====================

/**
 * Workout session - one complete workout instance
 */
export interface WorkoutSession {
  id: string;
  workoutTypeId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  sets: WorkoutSet[];
}

/**
 * Individual set within a workout session
 */
export interface WorkoutSet {
  id: string;
  sessionId: string;
  setNumber: number;
  startTime: Date;
  endTime?: Date;
  reps: Rep[];
  coachingScore?: CoachingScore;
}

/**
 * Overall coaching score for a set
 */
export interface CoachingScore {
  overallQuality: "good" | "okay" | "bad";
  goodReps: number;
  okayReps: number;
  badReps: number;
  averageDepth: number; // Average peak angle
  averageDuration: number; // Average rep duration in ms
}

// ==================== Rep ====================

/**
 * Individual rep data with full sensor information
 */
export interface Rep {
  id: string;
  setId: string;
  repNumber: number;
  startTime: Date;
  endTime: Date;
  peakAngle: number; // Deepest angle reached
  avgFlex: number; // Average flex sensor value during rep
  sensorDataPoints: SensorData[]; // Full sensor data for visualization
  quality: "good" | "okay" | "bad";
  duration: number; // Duration in ms
}

// ==================== Coaching ====================

/**
 * Coaching zone for real-time visualization
 */
export interface CoachingZone {
  timestamp: number; // Unix timestamp in ms
  quality: "good" | "okay" | "bad";
  kneeAngle: number;
  flexValue: number;
}

/**
 * Coaching thresholds for quality assessment
 */
export interface CoachingThresholds {
  goodDepthMin: number; // Minimum angle from neutral for "good"
  okayDepthMin: number; // Minimum angle from neutral for "okay"
  flexToleranceGood: number; // Max flex delta for "good"
  flexToleranceOkay: number; // Max flex delta for "okay"
}

// ==================== API DTOs ====================

/**
 * DTO for creating a new workout session
 */
export interface CreateSessionDTO {
  workoutTypeId: string;
  userId: string;
  startTime: Date;
}

/**
 * DTO for saving a completed set
 */
export interface SaveSetDTO {
  sessionId: string;
  setNumber: number;
  startTime: Date;
  endTime: Date;
  reps: Rep[];
}

/**
 * DTO for updating session end time
 */
export interface EndSessionDTO {
  sessionId: string;
  endTime: Date;
}

// ==================== Rep Detection ====================

/**
 * State machine states for rep detection
 */
export enum RepDetectionState {
  STANDING = "STANDING",
  DESCENDING = "DESCENDING",
  BOTTOM = "BOTTOM",
  ASCENDING = "ASCENDING",
}

/**
 * Rep detection result
 */
export interface RepDetectionResult {
  repDetected: boolean;
  rep?: Partial<Rep>;
  state: RepDetectionState;
}

/**
 * Configuration for rep detection algorithm
 */
export interface RepDetectionConfig {
  minDepthAngle: number; // Minimum angle change to count as rep
  minDuration: number; // Minimum rep duration in ms
  maxDuration: number; // Maximum rep duration in ms
  velocityThreshold: number; // Angle velocity threshold for state transitions
  bottomHoldTime: number; // Time to hold at bottom before ascending (ms)
}
