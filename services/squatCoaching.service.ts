import {
  computeDepthAndRom,
  computePauseMs,
  movingAverage,
} from "@/lib/math";
import {
  Rep,
  UserCalibrationData,
  WorkoutConfiguration,
} from "@/types/workout.types";
import { SensorData } from "./kneeDevice.service";

export class SquatCoachingService {
  segmentSquatReps(
    samples: SensorData[],
    workoutConfiguration: WorkoutConfiguration,
    calibration: Omit<UserCalibrationData, "userId" | "lastCalibrated">,
  ): Rep[] {
    if (!samples || samples.length < 3) return [];
  
    const ordered = [...samples].sort((a, b) => a.timestamp - b.timestamp);
    const {
      minRepDuration,
      maxRepDuration,
      minDepthAngle,
      smoothWindow,
      minGapMs,
    } = workoutConfiguration;
  
    const standingAngle = calibration.standingRollAngle;
    const angleRaw = ordered.map((s) => s.roll);
    const angleSm = movingAverage(angleRaw, smoothWindow);
  
    // Convert to "depth signal" — how far from standing, always positive
    const depth = angleSm.map((a) => Math.abs(a - standingAngle));
  
    // Find all local peaks in the depth signal
    // A peak is valid if it exceeds minDepthAngle and is a local max
    // within a window of at least minRepDuration/2 ms on each side
    const peaks: number[] = [];
    for (let i = 1; i < depth.length - 1; i++) {
      if (depth[i] < minDepthAngle) continue;
      
      // Find the window around this sample based on time
      const t = ordered[i].timestamp;
      let lo = i, hi = i;
      while (lo > 0 && t - ordered[lo].timestamp < minRepDuration / 2) lo--;
      while (hi < depth.length - 1 && ordered[hi].timestamp - t < minRepDuration / 2) hi++;
  
      // Check this is the maximum in that window
      let isMax = true;
      for (let j = lo; j <= hi; j++) {
        if (depth[j] > depth[i]) { isMax = false; break; }
      }
      if (isMax) peaks.push(i);
    }
  
    // For each peak, find the rep boundaries:
    // start = last time depth crossed minDepthAngle/2 before peak
    // end = next time depth crosses minDepthAngle/2 after peak
    const ENTRY_THRESHOLD = minDepthAngle * 0.25; // 25% of min depth
    const reps: Rep[] = [];
    let repId = 0;
    let lastRepEndTime: number | null = null;
  
    for (const peakIdx of peaks) {
      // Find start: scan backwards for last crossing below entry threshold
      let startIdx = peakIdx;
      for (let i = peakIdx - 1; i >= 0; i--) {
        if (depth[i] <= ENTRY_THRESHOLD) { startIdx = i; break; }
      }
  
      // Find end: scan forwards for next crossing below entry threshold  
      let endIdx = peakIdx;
      for (let i = peakIdx + 1; i < depth.length; i++) {
        if (depth[i] <= ENTRY_THRESHOLD) { endIdx = i; break; }
      }
  
      const startT = ordered[startIdx].timestamp;
      const endT = ordered[endIdx].timestamp;
      const durationMs = endT - startT;
  
      // Gap check
      if (lastRepEndTime !== null && startT - lastRepEndTime < minGapMs) continue;
  
      // Duration check
      if (durationMs < minRepDuration || durationMs > maxRepDuration) continue;
  
      const repSamples = ordered.slice(startIdx, endIdx + 1);
      const repAngleSm = angleSm.slice(startIdx, endIdx + 1);
      const repTimestamps = repSamples.map((s) => s.timestamp);
      const repRolls = repSamples.map((s) => s.roll);
      const repPitches = repSamples.map((s) => s.pitch);
      const repYaws = repSamples.map((s) => s.yaw);
      const repRollsSm = movingAverage(repRolls, smoothWindow);
      const repPitchesSm = movingAverage(repPitches, smoothWindow);
      const repYawsSm = movingAverage(repYaws, smoothWindow);
      const maxRollDeg = Math.max(...repRollsSm);
      const minRollDeg = Math.min(...repRollsSm);
      const maxPitchDeg = Math.max(...repPitchesSm);
      const minPitchDeg = Math.min(...repPitchesSm);
      const pitchRomDeg = maxPitchDeg - minPitchDeg;
      const localPeakIdx = peakIdx - startIdx;
      const bottomLo = Math.max(0, localPeakIdx - 5);
      const bottomHi = Math.min(repPitchesSm.length - 1, localPeakIdx + 5);
      const peakValgus = Math.max(
        ...repPitchesSm.slice(bottomLo, bottomHi + 1).map(Math.abs)
      );
      const maxYawDeg = Math.max(...repYawsSm);
      const minYawDeg = Math.min(...repYawsSm);
      const yawRomDeg = maxYawDeg - minYawDeg;
      const yawAtStart = repYawsSm[0];
      const peakHipRotation = Math.max(
        ...repYawsSm.map((y) => Math.abs(y - yawAtStart))
      );
  
      const { depthDeg, romDeg } = computeDepthAndRom(repAngleSm, standingAngle);
      const pauseMs = computePauseMs(repAngleSm, repTimestamps, standingAngle, 5, 15);
  
      const bottomT = ordered[peakIdx].timestamp;
      const downMs = Math.max(0, bottomT - startT);
      const upMs = Math.max(0, endT - bottomT);
      const tempoRatio = upMs > 0 ? downMs / upMs : 0;
  
      repId += 1;
      reps.push({
        id: repId,
        startTime: startT,
        endTime: endT,
        samples: repSamples,
        metrics: {
          durationMs,
          downMs,
          upMs,
          rollRomDeg: depthDeg,
          romDeg,
          tempoRatio,
          pauseMs,
          maxRollDeg,
          minRollDeg,
          maxPitchDeg,
          minPitchDeg,
          pitchRomDeg,
          peakValgus,
          maxYawDeg,
          minYawDeg,
          yawRomDeg,
          peakHipRotation,
        },
      });
  
      lastRepEndTime = endT;
    }
  
    return reps;
  }
}
