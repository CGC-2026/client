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
