import { CreateUserCalibrationData, UserCalibrationData, WorkoutType } from "@/types/workout.types";
import axios, { AxiosInstance } from "axios";

/**
 * Workout API Service
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
          userId: response.data.userId,
          standingYawAngle: response.data.standingYawAngle,
          standingPitchAngle: response.data.standingPitchAngle,
          standingRollAngle: response.data.standingRollAngle,
          updatedAt: new Date(response.data.lastUpdated)
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
      standingYawAngle: calibration.standingYawAngle,
      standingPitchAngle: calibration.standingPitchAngle,
      standingRollAngle: calibration.standingRollAngle,
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
