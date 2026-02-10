import {
  CHART_CONFIG,
  COACHING_THRESHOLDS,
  validateFlexAngleCorrelation,
} from "@/constants/workout";
import { SensorData } from "@/services/kneeDevice.service";
import {
  CalibrationData,
  CoachingScore,
  CoachingThresholds,
  CoachingZone,
  Rep,
} from "@/types/workout.types";

/**
 * Analyze form quality for a single sensor reading
 *
 * @param kneeAngle Knee angle in degrees from neutral
 * @param flexValue Flex sensor value (0-255)
 * @param calibration User calibration data
 * @param thresholds Optional custom thresholds
 * @returns Quality rating: 'good', 'okay', or 'bad'
 */
export function analyzeFormQuality(
  kneeAngle: number,
  flexValue: number,
  calibration: CalibrationData,
  thresholds: CoachingThresholds = COACHING_THRESHOLDS,
): "good" | "okay" | "bad" {
  const angleFromNeutral = Math.abs(kneeAngle - calibration.standingAngle);

  // Check if flex sensor validates the angle
  const flexMatchesGood = validateFlexAngleCorrelation(
    angleFromNeutral,
    flexValue,
    calibration,
    thresholds.flexToleranceGood,
  );

  const flexMatchesOkay = validateFlexAngleCorrelation(
    angleFromNeutral,
    flexValue,
    calibration,
    thresholds.flexToleranceOkay,
  );

  // Good: Proper depth + flex validates angle
  if (angleFromNeutral >= thresholds.goodDepthMin && flexMatchesGood) {
    return "good";
  }

  // Okay: Acceptable depth but flex mismatch, OR shallow depth with good flex
  if (
    (angleFromNeutral >= thresholds.okayDepthMin && flexMatchesOkay) ||
    (angleFromNeutral >= thresholds.okayDepthMin &&
      angleFromNeutral < thresholds.goodDepthMin)
  ) {
    return "okay";
  }

  // Bad: Too shallow OR significant flex/angle mismatch
  return "bad";
}

/**
 * Generate coaching zone from sensor data
 *
 * @param sensorData Sensor reading
 * @param calibration User calibration data
 * @returns CoachingZone for visualization
 */
export function generateCoachingZone(
  sensorData: SensorData,
  calibration: CalibrationData,
): CoachingZone {
  const quality = analyzeFormQuality(
    sensorData.pitch,
    sensorData.flex,
    calibration,
  );

  return {
    timestamp: sensorData.timestamp,
    quality,
    kneeAngle: sensorData.pitch,
    flexValue: sensorData.flex,
  };
}

/**
 * Analyze rep quality and assign rating
 *
 * @param rep Partial rep data (from rep detector)
 * @param calibration User calibration data
 * @returns Complete rep quality rating
 */
export function analyzeRepQuality(
  rep: Partial<Rep>,
  calibration: CalibrationData,
): "good" | "okay" | "bad" {
  if (!rep.peakAngle || !rep.avgFlex) {
    return "bad";
  }

  // Use peak angle and average flex to determine quality
  return analyzeFormQuality(rep.peakAngle, rep.avgFlex, calibration);
}

/**
 * Calculate coaching score for a set of reps
 *
 * @param reps Array of completed reps
 * @returns CoachingScore with statistics
 */
export function calculateCoachingScore(reps: Rep[]): CoachingScore {
  if (reps.length === 0) {
    return {
      overallQuality: "bad",
      goodReps: 0,
      okayReps: 0,
      badReps: 0,
      averageDepth: 0,
      averageDuration: 0,
    };
  }

  const goodReps = reps.filter((r) => r.quality === "good").length;
  const okayReps = reps.filter((r) => r.quality === "okay").length;
  const badReps = reps.filter((r) => r.quality === "bad").length;

  const averageDepth =
    reps.reduce((sum, r) => sum + r.peakAngle, 0) / reps.length;
  const averageDuration =
    reps.reduce((sum, r) => sum + r.duration, 0) / reps.length;

  // Determine overall quality based on percentage of good reps
  const goodRatio = goodReps / reps.length;
  let overallQuality: "good" | "okay" | "bad";

  if (goodRatio >= 0.7) {
    overallQuality = "good";
  } else if (goodRatio >= 0.4) {
    overallQuality = "okay";
  } else {
    overallQuality = "bad";
  }

  return {
    overallQuality,
    goodReps,
    okayReps,
    badReps,
    averageDepth,
    averageDuration,
  };
}

/**
 * RealTimeCoachingProcessor - Manages real-time coaching zones with downsampling
 */
export class RealTimeCoachingProcessor {
  private zones: CoachingZone[] = [];
  private sampleCounter: number = 0;
  private calibration: CalibrationData;

  constructor(calibration: CalibrationData) {
    this.calibration = calibration;
  }

  /**
   * Process sensor data and add to coaching zones (with downsampling)
   *
   * @param sensorData Sensor reading
   * @returns True if zone was added (after downsampling)
   */
  processSensorData(sensorData: SensorData): boolean {
    this.sampleCounter++;

    // Downsample: only process every Nth sample
    if (this.sampleCounter % CHART_CONFIG.downsampleFactor !== 0) {
      return false;
    }

    const zone = generateCoachingZone(sensorData, this.calibration);
    this.zones.push(zone);

    // Maintain rolling window
    if (this.zones.length > CHART_CONFIG.maxDataPoints) {
      this.zones.shift();
    }

    return true;
  }

  /**
   * Get current coaching zones for visualization
   */
  getZones(): CoachingZone[] {
    return this.zones;
  }

  /**
   * Get zones for a specific time window
   *
   * @param windowMs Time window in milliseconds
   * @returns Zones within the window
   */
  getZonesInWindow(
    windowMs: number = CHART_CONFIG.rollingWindowSeconds * 1000,
  ): CoachingZone[] {
    if (this.zones.length === 0) return [];

    const latestTimestamp = this.zones[this.zones.length - 1].timestamp;
    const cutoffTimestamp = latestTimestamp - windowMs;

    return this.zones.filter((zone) => zone.timestamp >= cutoffTimestamp);
  }

  /**
   * Get current quality (most recent zone)
   */
  getCurrentQuality(): "good" | "okay" | "bad" | null {
    if (this.zones.length === 0) return null;
    return this.zones[this.zones.length - 1].quality;
  }

  /**
   * Clear all zones (e.g., between sets)
   */
  clear(): void {
    this.zones = [];
    this.sampleCounter = 0;
  }

  /**
   * Update calibration data
   */
  updateCalibration(calibration: CalibrationData): void {
    this.calibration = calibration;
  }
}

/**
 * Create a new RealTimeCoachingProcessor instance
 */
export function createCoachingProcessor(
  calibration: CalibrationData,
): RealTimeCoachingProcessor {
  return new RealTimeCoachingProcessor(calibration);
}
