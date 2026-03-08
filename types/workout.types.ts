import { SensorData } from "@/services/kneeDevice.service";

export interface UserCalibrationData {
  userId: string;
  standingYawAngle: number;
  standingPitchAngle: number;
  standingRollAngle: number;
  updatedAt: Date;
}

export type CreateUserCalibrationData = Omit<UserCalibrationData, "userId" | "updatedAt">;

export const DEFAULT_USER_CALIBRATION_DATA: UserCalibrationData = {
  userId: "",
  standingYawAngle: 0,
  standingPitchAngle: 0,
  standingRollAngle: 0,
  updatedAt: new Date()
};

export interface WorkoutType {
  id: string;
  name: string; // "Squats", "Running", etc.
  description?: string;
  configuration: WorkoutConfiguration;
}

export interface WorkoutConfiguration {
  minRepDuration: number; // Minimum rep duration in ms
  maxRepDuration: number; // Maximum rep duration in ms
  minDepthAngle: number; // Minimum angle for valid rep
  smoothWindow: number; // Smoothing window size for moving average
  startThreshold: number; // Start threshold angle in degrees
  endThreshold: number; // End threshold angle in degrees
  minGapMs: number; // Minimum gap between reps in ms
}

export const DEFAULT_WORKOUT_CONFIGURATION: WorkoutConfiguration = {
  minRepDuration: 400, // ms
  maxRepDuration: 15000, // ms
  minDepthAngle: 15, // degrees
  smoothWindow: 7,
  startThreshold: 8,
  endThreshold: 5,
  minGapMs: 200,
};

export interface Rep {
  id: number;
  startTime: number;
  endTime: number;
  samples: SensorData[];
  metrics: {
    durationMs: number;
    downMs: number;
    upMs: number;
    romDeg: number; // Range of motion: max pitch minus min pitch across the rep
    tempoRatio: number; // downMs / upMs
    pauseMs: number; // Time spent near bottom

    rollRomDeg: number;
    maxRollDeg: number;
    minRollDeg: number;

    maxPitchDeg: number;
    minPitchDeg: number;
    pitchRomDeg: number;

    maxYawDeg: number;
    minYawDeg: number;
    yawRomDeg: number;

    peakValgus: number;
    peakHipRotation: number; // max abs yaw deviation from rep start
  };
}

export interface WorkoutSet {
  setNumber: number;
  startTime: number;
  endTime: number;
  reps: Rep[];
}
