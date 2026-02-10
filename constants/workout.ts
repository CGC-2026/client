import {
  CalibrationData,
  CoachingThresholds,
  RepDetectionConfig,
} from "@/types/workout.types";

// ==================== Rep Detection Configuration ====================

export const REP_DETECTION_CONFIG: RepDetectionConfig = {
  minDepthAngle: 30, // Minimum 30° from neutral to count as rep
  minDuration: 800, // Minimum 800ms per rep
  maxDuration: 8000, // Maximum 8 seconds per rep
  velocityThreshold: 15, // 15°/s velocity threshold for transitions
  bottomHoldTime: 100, // Hold for 100ms at bottom
};

// ==================== Coaching Thresholds ====================

export const COACHING_THRESHOLDS: CoachingThresholds = {
  goodDepthMin: 75, // 75° or more from neutral = good
  okayDepthMin: 50, // 50° or more from neutral = okay
  flexToleranceGood: 10, // ±10 flex units for good
  flexToleranceOkay: 25, // ±25 flex units for okay
};

// ==================== Default Calibration ====================

/**
 * Default calibration values (fallback if user hasn't calibrated)
 */
export const DEFAULT_CALIBRATION: Omit<
  CalibrationData,
  "userId" | "lastCalibrated"
> = {
  standingAngle: 0, // Assume 0° is neutral
  standingFlex: 128, // Assume mid-range (0-255) is neutral
};

// ==================== Chart Configuration ====================

export const CHART_CONFIG = {
  rollingWindowSeconds: 10, // Show last 10 seconds
  updateFPS: 10, // Update chart at 10 FPS
  downsampleFactor: 12, // Show every 12th data point (120Hz → ~10Hz)
  maxDataPoints: 120, // Max points to keep in memory (10s * 12 samples/s)
};

// ==================== Flex-Angle Correlation ====================

/**
 * Expected flex value for a given knee angle
 * This is a simplified linear model - may need calibration per user
 *
 * @param angle Knee angle in degrees from neutral
 * @param neutralFlex Neutral flex sensor value (standing)
 * @returns Expected flex sensor value
 */
export function expectedFlexForAngle(
  angle: number,
  neutralFlex: number = DEFAULT_CALIBRATION.standingFlex,
): number {
  // Linear approximation: flex increases ~0.5 per degree
  // This should be refined based on actual sensor data
  const flexChangePerDegree = 0.5;
  return neutralFlex + angle * flexChangePerDegree;
}

/**
 * Validate if flex sensor reading matches expected value for angle
 *
 * @param angle Current knee angle
 * @param flex Current flex sensor value
 * @param calibration User calibration data
 * @returns True if flex matches expected value within tolerance
 */
export function validateFlexAngleCorrelation(
  angle: number,
  flex: number,
  calibration: CalibrationData,
  tolerance: number = COACHING_THRESHOLDS.flexToleranceGood,
): boolean {
  const expected = expectedFlexForAngle(angle, calibration.standingFlex);
  const delta = Math.abs(flex - expected);
  return delta <= tolerance;
}
