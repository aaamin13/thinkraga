import { PitchDetector } from "pitchy";

export const MIN_CLARITY = 0.9;
export const SILENCE_RMS = 0.01;
export const MIN_HZ = 60;
export const MAX_HZ = 1200;

export interface PitchFrame {
  /** Accepted pitch, or null when the frame is silent, unclear or out of vocal range. */
  hz: number | null;
  /** Detector output before validation (null only when the frame was silent). */
  rawHz: number | null;
  clarity: number;
  rms: number;
}

export interface PitchAnalyzer {
  analyze(): PitchFrame;
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

  return {
    analyze() {
      analyser.getFloatTimeDomainData(buffer);
      const rms = rootMeanSquare(buffer);
      if (rms < SILENCE_RMS) return { hz: null, rawHz: null, clarity: 0, rms };

      const [rawHz, clarity] = detector.findPitch(buffer, sampleRate);
      const valid = clarity >= MIN_CLARITY && rawHz >= MIN_HZ && rawHz <= MAX_HZ;
      return { hz: valid ? rawHz : null, rawHz, clarity, rms };
    },
  };
}
