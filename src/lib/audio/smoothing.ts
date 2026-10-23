const MEDIAN_WINDOW = 5;
const EMA_ALPHA = 0.35;
// After this many consecutive invalid frames the next note starts fresh instead of blending in.
const RESET_AFTER_GAP_FRAMES = 8;

export interface SmoothedPitch {
  rawHz: number | null;
  /** Median of the last 5 valid readings: removes single-frame octave glitches. Use for judging. */
  medianHz: number | null;
  /** Median followed by an EMA: steadier, but lags slightly. Use for drawing. */
  smoothedHz: number | null;
}

export class PitchSmoother {
  private recent: number[] = [];
  private ema: number | null = null;
  private gap = 0;

  push(hz: number | null): SmoothedPitch {
    if (hz === null) {
      if (++this.gap >= RESET_AFTER_GAP_FRAMES) this.reset();
      return { rawHz: null, medianHz: null, smoothedHz: null };
    }
    this.gap = 0;

    this.recent.push(hz);
    if (this.recent.length > MEDIAN_WINDOW) this.recent.shift();
    const medianHz = [...this.recent].sort((a, b) => a - b)[Math.floor(this.recent.length / 2)];

    // Averaging in log-frequency keeps the smoothing even across the range (pitch is logarithmic).
    const logHz = Math.log2(medianHz);
    this.ema = this.ema === null ? logHz : EMA_ALPHA * logHz + (1 - EMA_ALPHA) * this.ema;

    return { rawHz: hz, medianHz, smoothedHz: 2 ** this.ema };
  }

  reset(): void {
    this.recent = [];
    this.ema = null;
    this.gap = 0;
  }
}
