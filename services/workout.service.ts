import {
  CreateWorkoutSessionDTO,
  CreateUserCalibrationData,
  DEFAULT_WORKOUT_CONFIGURATION,
  EndSessionDTO,
  SaveSetDTO,
  UserCalibrationData,
  WorkoutConfiguration,
  WorkoutSessionHistoryItem,
  WorkoutSession,
  WorkoutType,
} from "@/types/workout.types";
import axios, { AxiosInstance } from "axios";

function mapConfigToWorkoutConfiguration(config: Record<string, unknown>): WorkoutConfiguration {
  const get = (snake: string, camel: string): number | undefined => {
    const v = config[snake] ?? config[camel];
    return typeof v === "number" ? v : undefined;
  };
  return {
    minRepDuration: get("min_rep_duration", "minRepDuration") ?? DEFAULT_WORKOUT_CONFIGURATION.minRepDuration,
    maxRepDuration: get("max_rep_duration", "maxRepDuration") ?? DEFAULT_WORKOUT_CONFIGURATION.maxRepDuration,
    minDepthAngle: get("min_depth_angle", "minDepthAngle") ?? DEFAULT_WORKOUT_CONFIGURATION.minDepthAngle,
    smoothWindow: get("smooth_window", "smoothWindow") ?? DEFAULT_WORKOUT_CONFIGURATION.smoothWindow,
    startThreshold: get("start_threshold", "startThreshold") ?? DEFAULT_WORKOUT_CONFIGURATION.startThreshold,
    endThreshold: get("end_threshold", "endThreshold") ?? DEFAULT_WORKOUT_CONFIGURATION.endThreshold,
    minGapMs: get("min_gap_ms", "minGapMs") ?? DEFAULT_WORKOUT_CONFIGURATION.minGapMs,
  };
}

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
    try {
      const response = await this.authClient.get("/api/workouts/types");
      const items = response.data as Array<{
        id: string;
        name: string;
        description?: string;
        config?: Record<string, unknown>;
      }>;
      return items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        config: mapConfigToWorkoutConfiguration(item.config ?? {}),
      }));
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.log("[WorkoutAPI] Unauthorized fetching workout types");
      } else {
        console.log("[WorkoutAPI] Failed to fetch workout types", error);
      }
      throw error;
    }
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

  async createSession(data: CreateWorkoutSessionDTO): Promise<{ id: string } | undefined> {
    const body = {
      workout_type_id: data.workoutTypeId,
      start_time: data.startTime.toISOString(),
    };
    try {
      const response = await this.authClient.post("/api/workouts/sessions", body);
      return { id: response.data.id };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.log("[WorkoutAPI] Unauthorized creating session");
      } else {
        console.log("[WorkoutAPI] Failed to create session", error);
      }
      throw error;
    }
  }

  async saveSet(data: SaveSetDTO): Promise<void> {
    const body = {
      set_number: data.setNumber,
      start_time: data.startTime.toISOString(),
      end_time: data.endTime.toISOString(),
      reps: data.reps.map((rep, index) => ({
        rep_number: rep.repNumber > 0 ? rep.repNumber : index + 1,
        start_time: rep.startTime,
        end_time: rep.endTime,
        samples: JSON.stringify(rep.samples),
        metrics: JSON.stringify(rep.metrics),
      })),
    };
    try {
      await this.authClient.post(
        `/api/workouts/sessions/${encodeURIComponent(data.sessionId)}/sets`,
        body,
      );
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.log("[WorkoutAPI] Unauthorized saving set");
      } else {
        console.log("[WorkoutAPI] Failed to save set", error);
      }
      throw error;
    }
  }

  async endSession(data: EndSessionDTO): Promise<void> {
    const body = {
      end_time: data.endTime.toISOString(),
    };
    try {
      await this.authClient.patch(
        `/api/workouts/sessions/${encodeURIComponent(data.sessionId)}`,
        body,
      );
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.log("[WorkoutAPI] Unauthorized ending session");
      } else {
        console.log("[WorkoutAPI] Failed to end session", error);
      }
      throw error;
    }
  }

  async getSessionHistory(_userId: string, limit?: number): Promise<WorkoutSessionHistoryItem[]> {
    const params = limit != null ? { limit } : {};
    try {
      const response = await this.authClient.get("/api/workouts/sessions/history", {
        params,
      });

      const rows = (response.data ?? []) as Array<{
        id: string;
        user_id: string;
        workout_type_id: string;
        workout_type_name?: string | null;
        start_time: string;
        end_time?: string | null;
        total_sets: number;
        total_reps: number;
      }>;

      if (!Array.isArray(rows) || rows.length === 0) return [];

      return rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        workoutTypeId: row.workout_type_id,
        workoutTypeName: row.workout_type_name ?? undefined,
        startTime: new Date(row.start_time),
        endTime: row.end_time ? new Date(row.end_time) : undefined,
        totalSets: row.total_sets,
        totalReps: row.total_reps,
      }));
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.log("[WorkoutAPI] Unauthorized fetching session history");
      } else {
        console.log("[WorkoutAPI] Failed to fetch session history", error);
      }
      throw error;
    }
  }

  async getWorkoutSession(sessionId: string): Promise<WorkoutSession> {
    try {
      const detailResponse = await this.authClient.get(
        `/api/workouts/sessions/${encodeURIComponent(sessionId)}`,
      );

      const s = detailResponse.data as {
        id: string;
        user_id: string;
        workout_type_id: string;
        start_time: string;
        end_time?: string | null;
        sets: Array<{
          id: string;
          workout_session_id: string;
          set_number: number;
          start_time: string;
          end_time?: string | null;
          reps: Array<{
            rep_number?: number;
            repNumber?: number;
            start_time?: number;
            startTime?: number;
            end_time?: number;
            endTime?: number;
            samples?: unknown;
            metrics?: unknown;
          }>;
        }>;
      };

      return {
        id: s.id,
        userId: s.user_id,
        workoutTypeId: s.workout_type_id,
        startTime: new Date(s.start_time),
        endTime: s.end_time ? new Date(s.end_time) : undefined,
        sets: s.sets.map((set) => ({
          id: set.id,
          sessionId: set.workout_session_id,
          setNumber: set.set_number,
          startTime: new Date(set.start_time),
          endTime: set.end_time ? new Date(set.end_time) : undefined,
          reps: set.reps.map((rep, index) => {
            const rawMetrics = rep.metrics;
            const metricsObj =
              typeof rawMetrics === "string" ? JSON.parse(rawMetrics) : (rawMetrics ?? {});

            const rawSamples = rep.samples;
            const samplesArr =
              typeof rawSamples === "string" ? JSON.parse(rawSamples) : (rawSamples ?? []);

            return {
              repNumber:
                rep.repNumber ??
                rep.rep_number ??
                (typeof index === "number" ? index + 1 : 1),
              startTime: rep.startTime ?? rep.start_time ?? 0,
              endTime: rep.endTime ?? rep.end_time ?? 0,
              samples: samplesArr,
              metrics: metricsObj,
            };
          }),
        })),
      } as WorkoutSession;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.log("[WorkoutAPI] Unauthorized fetching workout session");
      } else {
        console.log("[WorkoutAPI] Failed to fetch workout session", error);
      }
      throw error;
    }
  }
}
