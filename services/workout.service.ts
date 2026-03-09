import { CreateUserCalibrationData, UserCalibrationData, WorkoutSession, WorkoutType } from "@/types/workout.types";
import axios, { AxiosInstance } from "axios";

/**
 * Workout API Service
 * 
 * Snake case for API levels fields
 */
export class WorkoutAPIService {
  private readonly authClient: AxiosInstance;

  constructor(authClient: AxiosInstance) {
    this.authClient = authClient;
  }

  /**
   * Get all available workout types
   *
   * Backend endpoint: GET /api/workouts/types
   */
  async getWorkoutTypes(): Promise<WorkoutType[]> {
    // TODO: replace with actual API call
    return MOCK_WORKOUT_TYPES;
  }

  /**
   * Get user's calibration data
   *
   * Backend endpoint: GET /api/users/me/calibration
   */
  async getUserCalibration(): Promise<UserCalibrationData | undefined> {
    try {
        const response = await this.authClient.get(
          "/api/users/me/calibration",
        );
        return {
          userId: response.data.user_id,
          standingYawAngle: response.data.standing_yaw_angle,
          standingPitchAngle: response.data.standing_pitch_angle,
          standingRollAngle: response.data.standing_roll_angle,
          updatedAt: new Date(response.data.updated_at),
        };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.log("[WorkoutAPI] No calibration found for user");
      } else {
        console.log(
          "[WorkoutAPI] Something went wrong getting calibration data",
        );
      }
    }
  }

  /**
   * Save user calibration data
   *
   * Backend endpoint: POST /api/users/me/calibration
   */
  async saveCalibration(calibration: CreateUserCalibrationData): Promise<void> {
    const body = {
      standing_yaw_angle: calibration.standingYawAngle,
      standing_pitch_angle: calibration.standingPitchAngle,
      standing_roll_angle: calibration.standingRollAngle,
    };
    try {
      await this.authClient.post("/api/users/me/calibration", body);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.log("[WorkoutAPI] Unauthorized saving calibration");
      } else {
        console.log("[WorkoutAPI] Failed to save calibration", error);
      }
      throw error;
    }
  }

  async createSession(data: any): Promise<any> {
    // TODO: Replace with actual API call
  }

  async saveSet(data: any): Promise<void> {
    // TODO: Replace with actual post API call
  }

  async endSession(data: any): Promise<void> {
    // TODO: Replace with actual patch API call
  }

  async getSessionHistory(userId: string, limit?: number): Promise<WorkoutSession[]> {
    // TODO: replace with actual API call
    return MOCK_SESSION_HISTORY;
  }
}

// ---------------------------------------------------------------------------
// Mock data — remove when API is implemented
// ---------------------------------------------------------------------------

const MOCK_WORKOUT_TYPES: WorkoutType[] = [
  {
    id: "wt-1",
    name: "Squats",
    description: "Track your squat form and depth with real-time knee angle analysis.",
    configuration: {
      minRepDuration: 400,
      maxRepDuration: 15000,
      minDepthAngle: 15,
      smoothWindow: 7,
      startThreshold: 8,
      endThreshold: 5,
      minGapMs: 200,
    },
  },
  {
    id: "wt-2",
    name: "Lunges",
    description: "Monitor knee alignment and valgus during forward and reverse lunge movements.",
    configuration: {
      minRepDuration: 500,
      maxRepDuration: 12000,
      minDepthAngle: 20,
      smoothWindow: 5,
      startThreshold: 10,
      endThreshold: 6,
      minGapMs: 300,
    },
  },
];

const MOCK_SESSION_HISTORY: WorkoutSession[] = [
  {
    id: "sess-1",
    workoutTypeId: "wt-1",
    userId: "user-1",
    startTime: new Date("2026-03-08T09:15:00"),
    endTime: new Date("2026-03-08T09:38:00"),
    sets: [
      {
        id: "set-1-1",
        sessionId: "sess-1",
        setNumber: 1,
        startTime: new Date("2026-03-08T09:16:00"),
        endTime: new Date("2026-03-08T09:20:00"),
        reps: [
          {
            id: 1,
            startTime: 1741422960000,
            endTime: 1741422963200,
            samples: [],
            metrics: {
              durationMs: 3200, downMs: 1600, upMs: 1600, romDeg: 92.4,
              tempoRatio: 1.0, pauseMs: 180,
              rollRomDeg: 4.2, maxRollDeg: 3.1, minRollDeg: -1.1,
              maxPitchDeg: 95.1, minPitchDeg: 2.7, pitchRomDeg: 92.4,
              maxYawDeg: 5.8, minYawDeg: -2.3, yawRomDeg: 8.1,
              peakValgus: 6.2, peakHipRotation: 4.5,
            },
          },
          {
            id: 2,
            startTime: 1741422964000,
            endTime: 1741422967100,
            samples: [],
            metrics: {
              durationMs: 3100, downMs: 1450, upMs: 1650, romDeg: 88.7,
              tempoRatio: 0.88, pauseMs: 210,
              rollRomDeg: 5.1, maxRollDeg: 4.0, minRollDeg: -1.1,
              maxPitchDeg: 91.3, minPitchDeg: 2.6, pitchRomDeg: 88.7,
              maxYawDeg: 6.1, minYawDeg: -2.6, yawRomDeg: 8.7,
              peakValgus: 7.8, peakHipRotation: 5.1,
            },
          },
          {
            id: 3,
            startTime: 1741422968000,
            endTime: 1741422971400,
            samples: [],
            metrics: {
              durationMs: 3400, downMs: 1700, upMs: 1700, romDeg: 95.0,
              tempoRatio: 1.0, pauseMs: 160,
              rollRomDeg: 3.8, maxRollDeg: 2.9, minRollDeg: -0.9,
              maxPitchDeg: 97.6, minPitchDeg: 2.6, pitchRomDeg: 95.0,
              maxYawDeg: 4.9, minYawDeg: -1.8, yawRomDeg: 6.7,
              peakValgus: 5.4, peakHipRotation: 3.8,
            },
          },
        ],
      },
      {
        id: "set-1-2",
        sessionId: "sess-1",
        setNumber: 2,
        startTime: new Date("2026-03-08T09:23:00"),
        endTime: new Date("2026-03-08T09:27:00"),
        reps: [
          {
            id: 4,
            startTime: 1741423380000,
            endTime: 1741423383500,
            samples: [],
            metrics: {
              durationMs: 3500, downMs: 1800, upMs: 1700, romDeg: 90.1,
              tempoRatio: 1.06, pauseMs: 200,
              rollRomDeg: 4.5, maxRollDeg: 3.5, minRollDeg: -1.0,
              maxPitchDeg: 92.8, minPitchDeg: 2.7, pitchRomDeg: 90.1,
              maxYawDeg: 5.5, minYawDeg: -2.0, yawRomDeg: 7.5,
              peakValgus: 6.9, peakHipRotation: 4.2,
            },
          },
          {
            id: 5,
            startTime: 1741423385000,
            endTime: 1741423388200,
            samples: [],
            metrics: {
              durationMs: 3200, downMs: 1500, upMs: 1700, romDeg: 86.3,
              tempoRatio: 0.88, pauseMs: 190,
              rollRomDeg: 6.0, maxRollDeg: 4.8, minRollDeg: -1.2,
              maxPitchDeg: 89.0, minPitchDeg: 2.7, pitchRomDeg: 86.3,
              maxYawDeg: 7.2, minYawDeg: -3.1, yawRomDeg: 10.3,
              peakValgus: 9.1, peakHipRotation: 6.3,
            },
          },
        ],
      },
    ],
  },
  {
    id: "sess-2",
    workoutTypeId: "wt-2",
    userId: "user-1",
    startTime: new Date("2026-03-06T18:00:00"),
    endTime: new Date("2026-03-06T18:22:00"),
    sets: [
      {
        id: "set-2-1",
        sessionId: "sess-2",
        setNumber: 1,
        startTime: new Date("2026-03-06T18:01:00"),
        endTime: new Date("2026-03-06T18:08:00"),
        reps: [
          {
            id: 6,
            startTime: 1741276860000,
            endTime: 1741276864000,
            samples: [],
            metrics: {
              durationMs: 4000, downMs: 2000, upMs: 2000, romDeg: 78.5,
              tempoRatio: 1.0, pauseMs: 300,
              rollRomDeg: 7.2, maxRollDeg: 5.5, minRollDeg: -1.7,
              maxPitchDeg: 81.2, minPitchDeg: 2.7, pitchRomDeg: 78.5,
              maxYawDeg: 8.3, minYawDeg: -3.4, yawRomDeg: 11.7,
              peakValgus: 10.4, peakHipRotation: 7.1,
            },
          },
        ],
      },
    ],
  },
  {
    id: "sess-3",
    workoutTypeId: "wt-1",
    userId: "user-1",
    startTime: new Date("2026-03-04T07:30:00"),
    endTime: new Date("2026-03-04T07:55:00"),
    sets: [],
  },
];
