import { DEFAULT_CALIBRATION } from "@/constants/workout";
import {
  CalibrationData,
  CreateSessionDTO,
  EndSessionDTO,
  Rep,
  SaveSetDTO,
  WorkoutSession,
  WorkoutSet,
  WorkoutType,
} from "@/types/workout.types";

/**
 * Workout API Service
 */
export class WorkoutAPIService {
  // Mock data storage (in-memory for now)
  private mockWorkoutTypes: WorkoutType[] = [
    {
      id: "workout-squat-001",
      name: "Squats",
      description: "Track your squat form and depth with real-time coaching",
      configuration: {
        sampleRate: 120, // 120 Hz for squats
        minRepDuration: 800,
        maxRepDuration: 8000,
        minDepthAngle: 30,
      },
    },
  ];

  private mockSessions: Map<string, WorkoutSession> = new Map();
  private mockCalibrations: Map<string, CalibrationData> = new Map();

  /**
   * Get all available workout types
   *
   * Backend endpoint: GET /api/workout-types
   */
  async getWorkoutTypes(): Promise<WorkoutType[]> {
    await this.simulateNetworkDelay();

    // TODO: Replace with actual API call
    // const response = await axios.get(`${API_BASE}/api/workout-types`);
    // return response.data;

    return this.mockWorkoutTypes;
  }

  /**
   * Get user's calibration data
   *
   * Backend endpoint: GET /api/users/:userId/calibration
   */
  async getUserCalibration(userId: string): Promise<CalibrationData> {
    await this.simulateNetworkDelay();

    // TODO: Replace with actual API call
    // const response = await axios.get(`${API_BASE}/api/users/${userId}/calibration`);
    // return response.data;

    // Return mock or cached calibration
    let calibration = this.mockCalibrations.get(userId);

    if (!calibration) {
      // Create default calibration for new user
      calibration = {
        userId,
        standingAngle: DEFAULT_CALIBRATION.standingAngle,
        standingFlex: DEFAULT_CALIBRATION.standingFlex,
        lastCalibrated: new Date(),
      };
      this.mockCalibrations.set(userId, calibration);
    }

    return calibration;
  }

  /**
   * Create a new workout session
   *
   * Backend endpoint: POST /api/sessions
   */
  async createSession(data: CreateSessionDTO): Promise<WorkoutSession> {
    await this.simulateNetworkDelay(300);

    // TODO: Replace with actual API call
    // const response = await axios.post(`${API_BASE}/api/sessions`, data);
    // return response.data;

    const session: WorkoutSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      workoutTypeId: data.workoutTypeId,
      userId: data.userId,
      startTime: data.startTime,
      sets: [],
    };

    this.mockSessions.set(session.id, session);
    console.log("[WorkoutAPI] Created session:", session.id);

    return session;
  }

  /**
   * Save a completed set to a session
   *
   * Backend endpoint: POST /api/sessions/:sessionId/sets
   */
  async saveSet(data: SaveSetDTO): Promise<void> {
    await this.simulateNetworkDelay(200);

    // TODO: Replace with actual API call
    // await axios.post(`${API_BASE}/api/sessions/${data.sessionId}/sets`, data);

    const session = this.mockSessions.get(data.sessionId);
    if (session) {
      const set: WorkoutSet = {
        id: `set-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sessionId: data.sessionId,
        setNumber: data.setNumber,
        startTime: data.startTime,
        endTime: data.endTime,
        reps: data.reps,
        coachingScore: this.calculateCoachingScore(data.reps),
      };

      session.sets.push(set);
      console.log(
        `[WorkoutAPI] Saved set ${set.setNumber} to session ${data.sessionId}`,
      );
    } else {
      console.error(`[WorkoutAPI] Session not found: ${data.sessionId}`);
    }
  }

  /**
   * End a workout session
   *
   * Backend endpoint: PATCH /api/sessions/:sessionId
   */
  async endSession(data: EndSessionDTO): Promise<void> {
    await this.simulateNetworkDelay(200);

    // TODO: Replace with actual API call
    // await axios.patch(`${API_BASE}/api/sessions/${data.sessionId}`, { endTime: data.endTime });

    const session = this.mockSessions.get(data.sessionId);
    if (session) {
      session.endTime = data.endTime;
      console.log("[WorkoutAPI] Ended session:", data.sessionId);
    } else {
      console.error(`[WorkoutAPI] Session not found: ${data.sessionId}`);
    }
  }

  /**
   * Get user's workout session history
   *
   * Backend endpoint: GET /api/users/:userId/sessions
   */
  async getSessionHistory(
    userId: string,
    limit: number = 20,
  ): Promise<WorkoutSession[]> {
    await this.simulateNetworkDelay();

    // TODO: Replace with actual API call
    // const response = await axios.get(`${API_BASE}/api/users/${userId}/sessions?limit=${limit}`);
    // return response.data;

    // Filter and sort sessions for this user
    const userSessions = Array.from(this.mockSessions.values())
      .filter((session) => session.userId === userId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);

    return userSessions;
  }

  /**
   * Save user calibration data
   *
   * Backend endpoint: POST /api/users/:userId/calibration
   */
  async saveCalibration(calibration: CalibrationData): Promise<void> {
    await this.simulateNetworkDelay(200);

    // TODO: Replace with actual API call
    // await axios.post(`${API_BASE}/api/users/${calibration.userId}/calibration`, calibration);

    this.mockCalibrations.set(calibration.userId, calibration);
    console.log("[WorkoutAPI] Saved calibration for user:", calibration.userId);
  }

  /**
   * Simulate network delay for realistic mock behavior
   */
  private async simulateNetworkDelay(ms: number = 250): Promise<void> {
    const delay = ms + Math.random() * 100; // Add jitter
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Calculate coaching score for a set of reps
   */
  private calculateCoachingScore(reps: Rep[]) {
    if (reps.length === 0) return undefined;

    const goodReps = reps.filter((r) => r.quality === "good").length;
    const okayReps = reps.filter((r) => r.quality === "okay").length;
    const badReps = reps.filter((r) => r.quality === "bad").length;

    const avgDepth =
      reps.reduce((sum, r) => sum + r.peakAngle, 0) / reps.length;
    const avgDuration =
      reps.reduce((sum, r) => sum + r.duration, 0) / reps.length;

    // Determine overall quality
    const goodRatio = goodReps / reps.length;
    let overallQuality: "good" | "okay" | "bad";
    if (goodRatio >= 0.7) overallQuality = "good";
    else if (goodRatio >= 0.4) overallQuality = "okay";
    else overallQuality = "bad";

    return {
      overallQuality,
      goodReps,
      okayReps,
      badReps,
      averageDepth: avgDepth,
      averageDuration: avgDuration,
    };
  }
}

// Export singleton instance
export const workoutAPI = new WorkoutAPIService();
