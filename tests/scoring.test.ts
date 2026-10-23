import { describe, expect, it } from "vitest";
import { SA_RE_GA, noteTargetCents } from "@/lib/music/exercises";
import {
  HoldTracker,
  LOCK_MS,
  NOTE_TIMEOUT_MS,
  noteScore,
  roundScore,
  starsForScore,
  type HoldSnapshot,
} from "@/lib/music/scoring";

const FRAME_MS = 16;

/** Feeds `cents` for up to `ms` of simulated time, stopping once the note is done. */
function feed(
  tracker: HoldTracker,
  from: number,
  ms: number,
  cents: number | null,
): { t: number; snapshot: HoldSnapshot } {
  let t = from;
  let snapshot = tracker.snapshot();
  for (; t < from + ms; t += FRAME_MS) {
    snapshot = tracker.push({ t, cents });
    if (snapshot.done) break;
  }
  return { t, snapshot };
}

describe("HoldTracker", () => {
  it("locks after 1.5 s of steady in-tune singing with a near-perfect score", () => {
    const tracker = new HoldTracker(200, 0);
    let lockedAt: number | null = null;
    for (let t = FRAME_MS; t < 3000 && lockedAt === null; t += FRAME_MS) {
      if (tracker.push({ t, cents: 200 }).locked) lockedAt = t;
    }
    expect(lockedAt).not.toBeNull();
    expect(lockedAt!).toBeGreaterThanOrEqual(LOCK_MS);
    expect(lockedAt!).toBeLessThan(LOCK_MS + 2 * FRAME_MS);

    const snap = tracker.snapshot();
    expect(snap).toMatchObject({ locked: true, done: true, timedOut: false, progress: 1, heldMs: LOCK_MS });
    expect(tracker.score()).toBeGreaterThanOrEqual(98);
    expect(starsForScore(tracker.score())).toBe(3);
  });

  it("never locks when 40 cents off, and times out at 10 s", () => {
    const tracker = new HoldTracker(0, 0);
    const { snapshot } = feed(tracker, FRAME_MS, 12000, 40);
    expect(snapshot).toMatchObject({ locked: false, timedOut: true, done: true, heldMs: 0 });
    expect(tracker.score()).toBe(0);
    expect(starsForScore(0)).toBe(0);
  });

  it("pauses rather than resets when the voice drifts out and back in", () => {
    const tracker = new HoldTracker(0, 0);
    const inFirst = feed(tracker, FRAME_MS, 1000, 0);
    const heldAfterFirst = inFirst.snapshot.heldMs;
    expect(heldAfterFirst).toBeGreaterThan(900);

    const out = feed(tracker, inFirst.t, 2000, 45);
    expect(out.snapshot.heldMs).toBe(heldAfterFirst);
    expect(out.snapshot.locked).toBe(false);

    const back = feed(tracker, out.t, 1000, 0);
    expect(back.snapshot.locked).toBe(true);
    // Locks after 0.5 s more of in-tune singing (1 s + 0.5 s), not another full 1.5 s.
    expect(back.t - out.t).toBeGreaterThan(450);
    expect(back.t - out.t).toBeLessThan(600);
  });

  it("times out at 10 s and keeps what was earned", () => {
    const tracker = new HoldTracker(0, 0);
    const sung = feed(tracker, FRAME_MS, 1000, 0);
    // Silence (no valid pitch) for the rest.
    const early = feed(tracker, sung.t, 8900 - sung.t, null);
    expect(early.snapshot.timedOut).toBe(false);

    const end = feed(tracker, early.t, 1200, null);
    expect(end.snapshot).toMatchObject({ timedOut: true, locked: false, done: true });
    expect(end.snapshot.heldMs).toBeGreaterThan(900);
    expect(end.snapshot.heldMs).toBeLessThan(LOCK_MS);
    expect(tracker.score()).toBe(Math.round(100 * (end.snapshot.heldMs / LOCK_MS)));
    expect(NOTE_TIMEOUT_MS).toBe(10000);
  });

  it("ignores readings after the note is done", () => {
    const tracker = new HoldTracker(0, 0);
    feed(tracker, FRAME_MS, 2000, 0);
    const offsetsBefore = tracker.offsets.length;
    tracker.push({ t: 5000, cents: 0 });
    expect(tracker.offsets).toHaveLength(offsetsBefore);
  });

  it("credits at most one capped step for a long gap between readings", () => {
    const tracker = new HoldTracker(0, 0);
    const snap = tracker.push({ t: 5000, cents: 0 });
    expect(snap.heldMs).toBeLessThanOrEqual(100);
  });

  it("accepts readings at the edge of tolerance and rejects just beyond", () => {
    const tracker = new HoldTracker(0, 0);
    tracker.push({ t: 16, cents: 30 });
    tracker.push({ t: 32, cents: -30 });
    tracker.push({ t: 48, cents: 30.5 });
    expect(tracker.offsets).toEqual([30, -30]);
  });
});

describe("noteScore", () => {
  it("is 0 with no in-tune readings", () => {
    expect(noteScore(0, [])).toBe(0);
  });

  it("combines accuracy, stability and hold completion", () => {
    expect(noteScore(LOCK_MS, [0, 0, 0, 0])).toBe(100);
    // Constant 10 cents sharp: accuracy 80, no wobble.
    expect(noteScore(LOCK_MS, [10, 10, 10])).toBe(80);
    // +-20 cents alternating: accuracy 60, stability floored at 0.5 -> 30.
    expect(noteScore(LOCK_MS, [20, -20, 20, -20])).toBe(30);
    // Half the hold completed halves the score.
    expect(noteScore(LOCK_MS / 2, [0, 0])).toBe(50);
    // Never above the hold cap.
    expect(noteScore(LOCK_MS * 2, [0, 0])).toBe(100);
  });
});

describe("stars and round score", () => {
  it("maps score thresholds to stars", () => {
    expect(starsForScore(100)).toBe(3);
    expect(starsForScore(85)).toBe(3);
    expect(starsForScore(84)).toBe(2);
    expect(starsForScore(70)).toBe(2);
    expect(starsForScore(69)).toBe(1);
    expect(starsForScore(50)).toBe(1);
    expect(starsForScore(49)).toBe(0);
  });

  it("averages note scores", () => {
    expect(roundScore([100, 80, 60])).toBe(80);
    expect(roundScore([90, 85, 0])).toBe(58);
    expect(roundScore([])).toBe(0);
  });
});

describe("Sa Re Ga exercise", () => {
  it("asks for Sa, Re, Ga in the madhya saptak (equal temperament)", () => {
    expect(SA_RE_GA.notes.map((n) => n.code)).toEqual(["S", "R", "G"]);
    expect(SA_RE_GA.notes.map((n) => noteTargetCents(n))).toEqual([0, 200, 400]);
    expect(noteTargetCents({ code: "R", octave: 0 }, "just")).toBeCloseTo(203.91, 2);
  });
});
