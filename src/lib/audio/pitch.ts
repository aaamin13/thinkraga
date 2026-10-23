import { PitchDetector } from "pitchy";

export const MIN_CLARITY = 0.9;
export const DEFAULT_SILENCE_RMS = 0.002;
// Once a sound is above the gate it stays open until the level falls to this fraction of it,
// so a sustained note hovering near the threshold doesn't flicker.
const GATE_RELEASE_RATIO = 0.6;
export const MIN_HZ = 60;
export const MAX_HZ = 1200;

export interface PitchFrame {
  /** Accepted pitch, or null when the frame is silent, unclear or out of vocal range. */
  hz: number | null;
  /** Detector output before any validation, so quiet input can still be inspected. */
  rawHz: number;
  clarity: number;
  rms: number;
  /** True when the level is under the silence gate. */
  belowGate: boolean;
}

export interface PitchAnalyzer {
  analyze(silenceRms: number): PitchFrame;
}

function rootMeanSquare(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
  return Math.sqrt(sum / buffer.length);
}

/** Wraps pitchy (McLeod Pitch Method). Create a new analyzer whenever `analyser.fftSize` changes. */
export function createPitchAnalyzer(analyser: AnalyserNode, sampleRate: number): PitchAnalyzer {
  const buffer = new Float32Array(analyser.fftSize);
  const detector = PitchDetector.forFloat32Array(analyser.fftSize);
  let gateOpen = false;

  return {
    analyze(silenceRms) {
      analyser.getFloatTimeDomainData(buffer);
      const rms = rootMeanSquare(buffer);

      const [rawHz, clarity] = detector.findPitch(buffer, sampleRate);
      gateOpen = rms >= (gateOpen ? silenceRms * GATE_RELEASE_RATIO : silenceRms);
      const valid = gateOpen && clarity >= MIN_CLARITY && rawHz >= MIN_HZ && rawHz <= MAX_HZ;
      return { hz: valid ? rawHz : null, rawHz, clarity, rms, belowGate: !gateOpen };
    },
  };
}
