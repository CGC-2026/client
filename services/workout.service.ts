import { CreateUserCalibrationData, UserCalibrationData, WorkoutType } from "@/types/workout.types";
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
    return [] // TODO
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
          updatedAt: new Date(response.data.last_updated)
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

  async getSessionHistory(userId: string, limit: number = 20): Promise<any[]> {
    // TODO
    return [];
  }
}
