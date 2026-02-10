import { REP_DETECTION_CONFIG } from "@/constants/workout";
import { SensorData } from "@/services/kneeDevice.service";
import {
  CalibrationData,
  RepDetectionConfig,
  RepDetectionResult,
  RepDetectionState,
} from "@/types/workout.types";

/**
 * RepDetector - State machine for detecting squat reps from sensor data
 *
 * Tracks knee angle changes through state transitions:
 * STANDING → DESCENDING → BOTTOM → ASCENDING → STANDING (rep complete)
 *
 * Uses both angle and flex sensor for validation
 */
export class RepDetector {
  private state: RepDetectionState = RepDetectionState.STANDING;
  private config: RepDetectionConfig;
  private calibration: CalibrationData;

  // Current rep tracking
  private repStartTime: number = 0;
  private repStartAngle: number = 0;
  private peakAngle: number = 0;
  private peakAngleTime: number = 0;
  private bottomHoldStartTime: number = 0;
  private sensorDataBuffer: SensorData[] = [];
  private flexValues: number[] = [];

  // Previous sensor reading for velocity calculation
  private prevAngle: number = 0;
  private prevTimestamp: number = 0;

  constructor(
    calibration: CalibrationData,
    config: RepDetectionConfig = REP_DETECTION_CONFIG,
  ) {
    this.calibration = calibration;
    this.config = config;
  }

  /**
   * Process incoming sensor data and detect rep completion
   *
   * @param data Sensor data from knee device
   * @returns RepDetectionResult with rep data if detected
   */
  processSensorData(data: SensorData): RepDetectionResult {
    // Calculate angle from neutral position
    const angle = Math.abs(data.pitch - this.calibration.standingAngle);

    // Calculate angular velocity (degrees per second)
    const velocity = this.calculateVelocity(angle, data.timestamp);

    // Store sensor data for rep visualization
    this.sensorDataBuffer.push(data);
    this.flexValues.push(data.flex);

    // State machine transitions
    const result = this.updateState(angle, velocity, data.timestamp, data);

    // Update previous values for next iteration
    this.prevAngle = angle;
    this.prevTimestamp = data.timestamp;

    return result;
  }

  /**
   * Reset detector state (e.g., between sets)
   */
  reset(): void {
    this.state = RepDetectionState.STANDING;
    this.repStartTime = 0;
    this.repStartAngle = 0;
    this.peakAngle = 0;
    this.peakAngleTime = 0;
    this.bottomHoldStartTime = 0;
    this.sensorDataBuffer = [];
    this.flexValues = [];
    this.prevAngle = 0;
    this.prevTimestamp = 0;
  }

  /**
   * Update calibration data
   */
  updateCalibration(calibration: CalibrationData): void {
    this.calibration = calibration;
  }

  /**
   * Get current state
   */
  getCurrentState(): RepDetectionState {
    return this.state;
  }

  // ==================== Private Methods ====================

  /**
   * Calculate angular velocity in degrees per second
   */
  private calculateVelocity(currentAngle: number, currentTime: number): number {
    if (this.prevTimestamp === 0) return 0;

    const deltaAngle = currentAngle - this.prevAngle;
    const deltaTime = (currentTime - this.prevTimestamp) / 1000; // Convert ms to seconds

    if (deltaTime === 0) return 0;

    return deltaAngle / deltaTime;
  }

  /**
   * State machine update logic
   */
  private updateState(
    angle: number,
    velocity: number,
    timestamp: number,
    sensorData: SensorData,
  ): RepDetectionResult {
    switch (this.state) {
      case RepDetectionState.STANDING:
        return this.handleStandingState(angle, velocity, timestamp);

      case RepDetectionState.DESCENDING:
        return this.handleDescendingState(angle, velocity, timestamp);

      case RepDetectionState.BOTTOM:
        return this.handleBottomState(angle, velocity, timestamp);

      case RepDetectionState.ASCENDING:
        return this.handleAscendingState(angle, velocity, timestamp);

      default:
        return {
          repDetected: false,
          state: this.state,
        };
    }
  }

  /**
   * Handle STANDING state
   * Transition to DESCENDING when angle increases with sufficient velocity
   */
  private handleStandingState(
    angle: number,
    velocity: number,
    timestamp: number,
  ): RepDetectionResult {
    // Check if starting to descend (angle increasing, positive velocity)
    if (velocity > this.config.velocityThreshold && angle > 10) {
      this.state = RepDetectionState.DESCENDING;
      this.repStartTime = timestamp;
      this.repStartAngle = angle;
      this.peakAngle = angle;
      this.sensorDataBuffer = [];
      this.flexValues = [];

      console.log("[RepDetector] Started descent");
    }

    return {
      repDetected: false,
      state: this.state,
    };
  }

  /**
   * Handle DESCENDING state
   * Transition to BOTTOM when velocity approaches zero (stopping at bottom)
   */
  private handleDescendingState(
    angle: number,
    velocity: number,
    timestamp: number,
  ): RepDetectionResult {
    // Track peak angle (deepest point)
    if (angle > this.peakAngle) {
      this.peakAngle = angle;
      this.peakAngleTime = timestamp;
    }

    // Check if reached bottom (velocity near zero, at depth)
    if (
      Math.abs(velocity) < this.config.velocityThreshold / 2 &&
      angle >= this.config.minDepthAngle
    ) {
      this.state = RepDetectionState.BOTTOM;
      this.bottomHoldStartTime = timestamp;

      console.log(
        `[RepDetector] Reached bottom: ${this.peakAngle.toFixed(1)}°`,
      );
    }
    // Check if returning early without proper depth (abort rep)
    else if (
      velocity < -this.config.velocityThreshold &&
      angle < this.config.minDepthAngle
    ) {
      console.log("[RepDetector] Aborted rep - insufficient depth");
      this.reset();
      this.state = RepDetectionState.STANDING;
    }

    return {
      repDetected: false,
      state: this.state,
    };
  }

  /**
   * Handle BOTTOM state
   * Transition to ASCENDING after brief hold at bottom
   */
  private handleBottomState(
    angle: number,
    velocity: number,
    timestamp: number,
  ): RepDetectionResult {
    // Update peak if still going deeper
    if (angle > this.peakAngle) {
      this.peakAngle = angle;
      this.peakAngleTime = timestamp;
      this.bottomHoldStartTime = timestamp; // Reset hold timer
    }

    const holdDuration = timestamp - this.bottomHoldStartTime;

    // Check if starting to ascend after minimum hold time
    if (
      holdDuration >= this.config.bottomHoldTime &&
      velocity < -this.config.velocityThreshold
    ) {
      this.state = RepDetectionState.ASCENDING;

      console.log("[RepDetector] Started ascent");
    }

    return {
      repDetected: false,
      state: this.state,
    };
  }

  /**
   * Handle ASCENDING state
   * Complete rep when returning to near-standing position
   */
  private handleAscendingState(
    angle: number,
    velocity: number,
    timestamp: number,
  ): RepDetectionResult {
    // Check if returned to standing (angle near neutral)
    if (angle < 15) {
      // Within 15° of standing
      const duration = timestamp - this.repStartTime;

      // Validate rep duration
      if (duration < this.config.minDuration) {
        console.log("[RepDetector] Rep too fast - rejected");
        this.reset();
        this.state = RepDetectionState.STANDING;
        return {
          repDetected: false,
          state: this.state,
        };
      }

      if (duration > this.config.maxDuration) {
        console.log("[RepDetector] Rep too slow - rejected");
        this.reset();
        this.state = RepDetectionState.STANDING;
        return {
          repDetected: false,
          state: this.state,
        };
      }

      // Rep completed successfully!
      const avgFlex =
        this.flexValues.reduce((sum, f) => sum + f, 0) / this.flexValues.length;

      const result: RepDetectionResult = {
        repDetected: true,
        rep: {
          startTime: new Date(this.repStartTime),
          endTime: new Date(timestamp),
          peakAngle: this.peakAngle,
          avgFlex,
          sensorDataPoints: [...this.sensorDataBuffer],
          duration,
        },
        state: RepDetectionState.STANDING,
      };

      console.log(
        `[RepDetector] Rep completed! Peak: ${this.peakAngle.toFixed(1)}°, Duration: ${duration}ms`,
      );

      // Reset for next rep
      this.reset();
      this.state = RepDetectionState.STANDING;

      return result;
    }

    return {
      repDetected: false,
      state: this.state,
    };
  }
}

/**
 * Create a new RepDetector instance
 *
 * @param calibration User calibration data
 * @param config Optional custom configuration
 * @returns RepDetector instance
 */
export function createRepDetector(
  calibration: CalibrationData,
  config?: RepDetectionConfig,
): RepDetector {
  return new RepDetector(calibration, config);
}
