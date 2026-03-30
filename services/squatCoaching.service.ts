import {
  computeDepthAndRom,
  computePauseMs,
  movingAverage,
} from "@/lib/math";
import {
  Rep,
  WorkoutConfiguration,
} from "@/types/workout.types";
import type { SensorData } from "@/types/sensor.types";

export class SquatCoachingService {
  /**
   * Segment sensor samples into individual squat reps.
   *
   * With the new firmware, roll (flexion) is 0 at standing and increases
   * during a squat — no client-side standing-angle offset is needed.
   */
  segmentSquatReps(
    samples: SensorData[],
    workoutConfiguration: WorkoutConfiguration,
  ): Rep[] {
    if (!samples || samples.length < 3) return [];
  
    let ordered = [...samples].sort((a, b) => a.timestamp - b.timestamp);
    const {
      minRepDuration,
      maxRepDuration,
      minDepthAngle,
      smoothWindow,
    } = workoutConfiguration;

    // Strip the firmware warm-up window: the first ~1 s of data after stream
    // start may contain uncalibrated values (e.g. ~96° standing), followed by
    // a sharp drop to near 0° once auto-calibration finishes.  Detect this by
    // finding the first sample that settles below the standing baseline
    // threshold (minDepthAngle) after starting high, and discard everything
    // before it.
    const WARMUP_BASELINE = minDepthAngle;
    if (ordered.length > 0 && ordered[0].roll > WARMUP_BASELINE) {
      let settledIdx = 0;
      for (let i = 1; i < ordered.length; i++) {
        if (ordered[i].roll <= WARMUP_BASELINE) {
          settledIdx = i;
          break;
        }
      }
      if (settledIdx > 0) {
        ordered = ordered.slice(settledIdx);
      }
    }

    if (ordered.length < 3) return [];

    const angleRaw = ordered.map((s) => s.roll);
    const angleSm = movingAverage(angleRaw, smoothWindow);
  
    // Firmware outputs roll = 0 at standing, increasing during squat (always non-negative).
    // Depth signal is simply the smoothed flexion angle.
    const depth = [...angleSm];
  
    // ── 1. Find all local peaks ──
    // A peak is valid if it exceeds minDepthAngle and is the local max
    // within a time window of minRepDuration/2 on each side.
    const rawPeaks: number[] = [];
    for (let i = 1; i < depth.length - 1; i++) {
      if (depth[i] < minDepthAngle) continue;
      const t = ordered[i].timestamp;
      let lo = i, hi = i;
      while (lo > 0 && t - ordered[lo].timestamp < minRepDuration / 2) lo--;
      while (hi < depth.length - 1 && ordered[hi].timestamp - t < minRepDuration / 2) hi++;
      let isMax = true;
      for (let j = lo; j <= hi; j++) {
        if (depth[j] > depth[i]) { isMax = false; break; }
      }
      if (isMax) rawPeaks.push(i);
    }

    // ── 2. Deduplicate peaks ──
    // a) Collapse peaks within minRepDuration ms (plateau duplicates).
    let peaks: number[] = [];
    for (const p of rawPeaks) {
      if (peaks.length === 0) { peaks.push(p); continue; }
      const prev = peaks[peaks.length - 1];
      if (ordered[p].timestamp - ordered[prev].timestamp < minRepDuration) {
        if (depth[p] > depth[prev]) peaks[peaks.length - 1] = p;
      } else {
        peaks.push(p);
      }
    }

    if (peaks.length === 0) return [];

    // b) Merge peaks whose intervening valley never drops below minDepthAngle.
    //    If the signal stays elevated between two peaks they belong to the same
    //    rep (e.g. a flat-top squat hold, or low-amplitude noise).
    let merged = true;
    while (merged) {
      merged = false;
      const next: number[] = [peaks[0]];
      for (let k = 1; k < peaks.length; k++) {
        const prev = next[next.length - 1];
        let valleyMin = Infinity;
        for (let i = prev + 1; i < peaks[k]; i++) {
          if (depth[i] < valleyMin) valleyMin = depth[i];
        }
        if (valleyMin >= minDepthAngle) {
          if (depth[peaks[k]] > depth[prev]) next[next.length - 1] = peaks[k];
          merged = true;
        } else {
          next.push(peaks[k]);
        }
      }
      peaks = next;
    }

    // ── 3. Find valley-based rep boundaries ──
    // Between each pair of consecutive peaks, find the index of the minimum
    // depth value (the valley). Use valleys as the natural split points
    // between reps.  For the first rep, scan backward from the first peak
    // to the start of the data.  For the last rep, scan forward from the
    // last peak to the end of the data.
    const valleys: number[] = [];
    for (let k = 0; k < peaks.length - 1; k++) {
      let minIdx = peaks[k] + 1;
      for (let i = peaks[k] + 1; i < peaks[k + 1]; i++) {
        if (depth[i] < depth[minIdx]) minIdx = i;
      }
      valleys.push(minIdx);
    }

    const reps: Rep[] = [];
    let repId = 0;

    for (let k = 0; k < peaks.length; k++) {
      const peakIdx = peaks[k];

      // Prominence check: the peak must rise at least minDepthAngle above
      // the higher of its two adjacent valleys.  This filters noise bumps
      // (e.g. 16° blip between real 90°+ squats).
      const leftValley = k > 0 ? depth[valleys[k - 1]] : 0;
      const rightValley = k < valleys.length ? depth[valleys[k]] : 0;
      const prominence = depth[peakIdx] - Math.max(leftValley, rightValley);
      if (prominence < minDepthAngle) continue;

      // Start boundary: valley before this peak, or scan to data start
      let startIdx: number;
      if (k > 0) {
        startIdx = valleys[k - 1];
      } else {
        startIdx = 0;
        for (let i = peakIdx - 1; i >= 0; i--) {
          if (depth[i] <= depth[startIdx]) startIdx = i;
          if (depth[i] < minDepthAngle * 0.5) { startIdx = i; break; }
        }
      }

      // End boundary: valley after this peak, or scan to data end
      let endIdx: number;
      if (k < valleys.length) {
        endIdx = valleys[k];
      } else {
        endIdx = depth.length - 1;
        for (let i = peakIdx + 1; i < depth.length; i++) {
          if (depth[i] <= depth[endIdx]) endIdx = i;
          if (depth[i] < minDepthAngle * 0.5) { endIdx = i; break; }
        }
      }

      const startT = ordered[startIdx].timestamp;
      const endT = ordered[endIdx].timestamp;
      const durationMs = endT - startT;

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
  
      const { depthDeg, romDeg } = computeDepthAndRom(repAngleSm, 0);
      const pauseMs = computePauseMs(repAngleSm, repTimestamps, 0, 5, 15);
  
      const bottomT = ordered[peakIdx].timestamp;
      const downMs = Math.max(0, bottomT - startT);
      const upMs = Math.max(0, endT - bottomT);
      const tempoRatio = upMs > 0 ? downMs / upMs : 0;
  
      repId += 1;
      reps.push({
        repNumber: repId,
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
    }
  
    return reps;
  }
}
