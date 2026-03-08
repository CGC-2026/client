/**
 * Computes median for each of roll, pitch, and yaw angle arrays.
 * Used to derive standing angles from calibration samples (robust to outliers and flips).
 *
 * @param rolls - Roll angles in degrees
 * @param pitches - Pitch angles in degrees
 * @param yaws - Yaw angles in degrees
 * @returns { roll, pitch, yaw } median values (empty array → 0)
 */
export function mediansForRollPitchYaw(
  rolls: number[],
  pitches: number[],
  yaws: number[],
): { roll: number; pitch: number; yaw: number } {
  return {
    roll: median(rolls),
    pitch: median(pitches),
    yaw: median(yaws),
  };
}

/**
 * Calculates the median value of an array of numbers
 *
 * Sorts the array and returns the middle value (or average of two middle
 * values for even-length arrays). More robust to outliers than mean.
 *
 * @param arr - Input array of numbers
 * @returns Median value, or 0 if array is empty
 *
 * @example
 * median([1, 3, 5, 7, 9]) // Returns 5
 * median([1, 2, 3, 4]) // Returns 2.5
 */
export function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const a = [...arr].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 === 0 ? (a[mid - 1] + a[mid]) / 2 : a[mid];
}

/**
 * Applies a centered moving average filter to smooth a time series
 *
 * Uses a symmetric window around each point to compute the average,
 * reducing noise while preserving overall trends. Useful for smoothing
 * sensor data (e.g., knee angles) before rep detection.
 *
 * @param x - Input array of numbers to smooth
 * @param window - Window size for averaging (will be floored to integer)
 * @returns Smoothed array of same length as input
 *
 * @example
 * movingAverage([1, 5, 3, 7, 2], 3) // Returns smoothed values
 */
export function movingAverage(x: number[], window: number): number[] {
  if (window <= 1) return [...x];
  const w = Math.max(1, Math.floor(window));
  const half = Math.floor(w / 2);

  const out = new Array<number>(x.length);
  for (let i = 0; i < x.length; i++) {
    const lo = Math.max(0, i - half);
    const hi = Math.min(x.length - 1, i + half);
    let sum = 0;
    let n = 0;
    for (let j = lo; j <= hi; j++) {
      sum += x[j];
      n++;
    }
    out[i] = sum / n;
  }
  return out;
}

/**
 * Computes squat depth and range of motion from angle data
 *
 * Calculates two metrics:
 * - ROM (Range of Motion): Total angular range (max - min)
 * - Depth: Maximum deviation from standing baseline angle
 *
 * @param angleSm - Smoothed angle values during the rep (e.g. roll)
 * @param standingAngle - Baseline angle when standing
 * @returns Object with depthDeg and romDeg in degrees
 *
 * @example
 * computeDepthAndRom([10, 20, 30, 20, 10], 10) // { depthDeg: 20, romDeg: 20 }
 */
export function computeDepthAndRom(
  angleSm: number[],
  standingAngle: number,
): {
  depthDeg: number;
  romDeg: number;
} {
  let minA = Infinity;
  let maxA = -Infinity;

  for (const a of angleSm) {
    if (a < minA) minA = a;
    if (a > maxA) maxA = a;
  }

  const romDeg = maxA - minA;

  // Depth is max deviation from standing baseline, regardless of sign
  const depthDeg = Math.max(
    Math.abs(maxA - standingAngle),
    Math.abs(minA - standingAngle),
  );

  return { depthDeg, romDeg };
}

/**
 * Computes time spent near the bottom of a rep (pause detection).
 *
 * Finds the bottom angle (furthest from standing). A sample is part of a pause
 * only if it is within pauseThresholdDeg of bottom AND instantaneous velocity
 * is at most velThresholdDegPerS. Returns the duration (ms) of the longest
 * contiguous segment satisfying both conditions.
 *
 * @param angleSm - Smoothed angle values during the rep (e.g. roll)
 * @param timestamps - Timestamps in ms, same length as angleSm, sorted ascending
 * @param standingAngle - Baseline angle when standing
 * @param pauseThresholdDeg - Degrees from bottom to count as "at bottom"
 * @param velThresholdDegPerS - Max absolute velocity (deg/s) to count as paused
 * @returns Time in ms of longest valid pause segment, or 0 if none
 */
export function computePauseMs(
  angleSm: number[],
  timestamps: number[],
  standingAngle: number,
  pauseThresholdDeg: number,
  velThresholdDegPerS: number,
): number {
  if (angleSm.length === 0 || angleSm.length !== timestamps.length) return 0;
  if (angleSm.length < 2) return 0;

  let minA = Infinity;
  let maxA = -Infinity;
  for (const a of angleSm) {
    if (a < minA) minA = a;
    if (a > maxA) maxA = a;
  }
  const angleAtBottom =
    Math.abs(maxA - standingAngle) >= Math.abs(minA - standingAngle)
      ? maxA
      : minA;

  // Build mask: inPause[i] true if near bottom AND (for i>=1) low velocity
  const inPause: boolean[] = new Array(angleSm.length);
  inPause[0] = false; // no velocity at index 0
  for (let i = 1; i < angleSm.length; i++) {
    const dtMs = timestamps[i] - timestamps[i - 1];
    const dtSec = dtMs / 1000;
    const vel =
      dtSec > 0
        ? (angleSm[i] - angleSm[i - 1]) / dtSec
        : Infinity;
    const nearBottom =
      Math.abs(angleSm[i] - angleAtBottom) <= pauseThresholdDeg;
    const lowVel = Math.abs(vel) <= velThresholdDegPerS;
    inPause[i] = nearBottom && lowVel;
  }

  // Longest contiguous segment where inPause is true
  let maxDurationMs = 0;
  let segmentStart: number | null = null;

  for (let i = 0; i < inPause.length; i++) {
    if (inPause[i]) {
      if (segmentStart === null) segmentStart = i;
    } else {
      if (segmentStart !== null) {
        const segmentEnd = i - 1;
        if (segmentEnd > segmentStart) {
          const durationMs = timestamps[segmentEnd] - timestamps[segmentStart];
          if (durationMs > maxDurationMs) maxDurationMs = durationMs;
        }
        segmentStart = null;
      }
    }
  }
  if (segmentStart !== null) {
    const segmentEnd = inPause.length - 1;
    if (segmentEnd > segmentStart) {
      const durationMs = timestamps[segmentEnd] - timestamps[segmentStart];
      if (durationMs > maxDurationMs) maxDurationMs = durationMs;
    }
  }

  return maxDurationMs;
}
