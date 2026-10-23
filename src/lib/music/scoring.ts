// Pure scoring logic: no browser APIs.

/** Tolerance bands in cents (configurable). */
export const TOLERANCE = {
  perfect: 15,
  close: 30,
  wrong: 50,
} as const;

/** Time in tune needed to lock a note. */
export const LOCK_MS = 1500;
/** A note ends after this long, with whatever it earned. */
export const NOTE_TIMEOUT_MS = 10000;
// Longest gap credited to one reading, so a stalled frame loop can't award free hold time.
const MAX_STEP_MS = 100;

export interface Reading {
  /** Timestamp in ms. */
  t: number;
  /** Pitch relative to Sa, or null when no valid pitch was heard. */
  cents: number | null;
}

export interface HoldOptions {
  toleranceCents?: number;
  lockMs?: number;
  timeoutMs?: number;
}

export interface HoldSnapshot {
  heldMs: number;
  /** 0..1 progress towards locking. */
  progress: number;
  locked: boolean;
  timedOut: boolean;
  done: boolean;
}

/**
 * Tracks one note. Time spent within tolerance accumulates; drifting out pauses it rather than
 * resetting it. Ends when it has locked or when the timeout passes.
 */
export class HoldTracker {
  private heldMs = 0;
  private lastT: number;
  private locked = false;
  private timedOut = false;
  private readonly inBandOffsets: number[] = [];
  private readonly toleranceCents: number;
  private readonly lockMs: number;
  private readonly timeoutMs: number;

  constructor(
    readonly targetCents: number,
    private readonly startT: number,
    options: HoldOptions = {},
  ) {
    this.lastT = startT;
    this.toleranceCents = options.toleranceCents ?? TOLERANCE.close;
    this.lockMs = options.lockMs ?? LOCK_MS;
    this.timeoutMs = options.timeoutMs ?? NOTE_TIMEOUT_MS;
  }

  push(reading: Reading): HoldSnapshot {
    if (this.locked || this.timedOut) return this.snapshot();

    const step = Math.min(Math.max(0, reading.t - this.lastT), MAX_STEP_MS);
    this.lastT = reading.t;

    if (reading.cents !== null) {
      const offset = reading.cents - this.targetCents;
      if (Math.abs(offset) <= this.toleranceCents) {
        this.heldMs += step;
        this.inBandOffsets.push(offset);
      }
    }

    if (this.heldMs >= this.lockMs) {
      this.heldMs = this.lockMs;
      this.locked = true;
    } else if (reading.t - this.startT >= this.timeoutMs) {
      this.timedOut = true;
    }
    return this.snapshot();
  }

  snapshot(): HoldSnapshot {
    return {
      heldMs: this.heldMs,
      progress: Math.min(1, this.heldMs / this.lockMs),
      locked: this.locked,
      timedOut: this.timedOut,
      done: this.locked || this.timedOut,
    };
  }

  /** Signed offsets (cents) of the readings that were in tolerance. */
  get offsets(): readonly number[] {
    return this.inBandOffsets;
  }

  /** Score of the note as it stands. */
  score(): number {
    return noteScore(this.heldMs, this.inBandOffsets, this.lockMs);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Accuracy (how near the target on average) x stability (how little it wavered) x how much of the
 * hold was completed. Only in-tolerance readings count.
 */
export function noteScore(heldMs: number, offsets: readonly number[], lockMs = LOCK_MS): number {
  if (offsets.length === 0) return 0;

  const mean = offsets.reduce((sum, o) => sum + o, 0) / offsets.length;
  const meanAbsOffset = offsets.reduce((sum, o) => sum + Math.abs(o), 0) / offsets.length;
  const variance = offsets.reduce((sum, o) => sum + (o - mean) ** 2, 0) / offsets.length;

  const accuracy = clamp(100 * (1 - meanAbsOffset / TOLERANCE.wrong), 0, 100);
  const stability = clamp(1 - Math.sqrt(variance) / 40, 0.5, 1);
  const held = Math.min(1, heldMs / lockMs);
  return Math.round(accuracy * stability * held);
}

export function starsForScore(score: number): 0 | 1 | 2 | 3 {
  if (score >= 85) return 3;
  if (score >= 70) return 2;
  if (score >= 50) return 1;
  return 0;
}

/** Mean of the note scores, rounded. */
export function roundScore(noteScores: readonly number[]): number {
  if (noteScores.length === 0) return 0;
  return Math.round(noteScores.reduce((sum, s) => sum + s, 0) / noteScores.length);
}
