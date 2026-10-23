"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { PitchSample } from "@/hooks/usePitchStream";
import { noteTargetCents, SA_RE_GA, type Exercise } from "@/lib/music/exercises";
import {
  HoldTracker,
  roundScore,
  starsForScore,
  noteScore,
  TOLERANCE,
} from "@/lib/music/scoring";
import { hzToCents, resolveSaHz, type SwaraCode } from "@/lib/music/swara";
import { useAppStore } from "@/lib/store";

export type ExercisePhase = "ready" | "note" | "between" | "results";

export interface NoteResult {
  code: SwaraCode;
  locked: boolean;
  score: number;
  stars: 0 | 1 | 2 | 3;
}

export interface ExerciseController {
  exercise: Exercise;
  phase: ExercisePhase;
  noteIndex: number;
  /** Cents of the note being asked for (during "note" and "between"). */
  targetCents: number | null;
  /** 0..1 progress towards locking the current note. */
  progress: number;
  /** True while the voice is inside the tolerance band. */
  inBand: boolean;
  results: readonly NoteResult[];
  round: { score: number; isNewBest: boolean } | null;
  start: () => void;
  reset: () => void;
}

const BETWEEN_NOTES_MS = 1200;
// A sample older than this means the pitch loop has stalled, so it is treated as silence.
const FRESH_SAMPLE_MS = 150;
const UI_UPDATE_INTERVAL_MS = 1000 / 15;

interface FlowState {
  phase: ExercisePhase;
  noteIndex: number;
  results: readonly NoteResult[];
  round: { score: number; isNewBest: boolean } | null;
}

const INITIAL: FlowState = { phase: "ready", noteIndex: 0, results: [], round: null };

/**
 * Runs an exercise on top of the live pitch: asks for each note in turn, tracks the hold, scores
 * it and finally scores the round. `active` is whether the mic is running.
 */
export function useExercise(
  latest: RefObject<PitchSample | null>,
  active: boolean,
  exercise: Exercise = SA_RE_GA,
): ExerciseController {
  const [flow, setFlow] = useState<FlowState>(INITIAL);
  const [live, setLive] = useState({ progress: 0, inBand: false });
  const tracker = useRef<HoldTracker | null>(null);
  const results = useRef<NoteResult[]>([]);
  const betweenTimer = useRef(0);

  const beginNote = useCallback(
    (index: number) => {
      tracker.current = new HoldTracker(noteTargetCents(exercise.notes[index]), performance.now());
      setLive({ progress: 0, inBand: false });
      setFlow((prev) => ({ ...prev, phase: "note", noteIndex: index }));
    },
    [exercise],
  );

  const finishNote = useCallback(
    (index: number) => {
      const current = tracker.current;
      if (!current) return;
      const snapshot = current.snapshot();
      const score = noteScore(snapshot.heldMs, current.offsets);
      results.current = [
        ...results.current,
        { code: exercise.notes[index].code, locked: snapshot.locked, score, stars: starsForScore(score) },
      ];
      tracker.current = null;
      setLive({ progress: snapshot.progress, inBand: snapshot.locked });

      if (index + 1 < exercise.notes.length) {
        setFlow((prev) => ({ ...prev, phase: "between", results: results.current }));
        betweenTimer.current = window.setTimeout(() => beginNote(index + 1), BETWEEN_NOTES_MS);
        return;
      }

      const total = roundScore(results.current.map((r) => r.score));
      const previousBest = useAppStore.getState().bestRoundScore;
      useAppStore.getState().recordRoundScore(total);
      setFlow((prev) => ({
        ...prev,
        phase: "results",
        results: results.current,
        round: { score: total, isNewBest: previousBest === null || total > previousBest },
      }));
    },
    [exercise, beginNote],
  );

  const reset = useCallback(() => {
    window.clearTimeout(betweenTimer.current);
    tracker.current = null;
    results.current = [];
    setLive({ progress: 0, inBand: false });
    setFlow(INITIAL);
  }, []);

  const start = useCallback(() => {
    window.clearTimeout(betweenTimer.current);
    results.current = [];
    setFlow({ ...INITIAL, phase: "note" });
    beginNote(0);
  }, [beginNote]);

  // Frame loop while a note is being held.
  const { phase, noteIndex } = flow;
  useEffect(() => {
    if (phase !== "note") return;
    let rafId = 0;
    let lastUiUpdate = 0;

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      const current = tracker.current;
      if (!current) return;

      const sample = latest.current;
      let cents: number | null = null;
      if (sample && sample.medianHz !== null && now - sample.t < FRESH_SAMPLE_MS) {
        const { saNoteId, fineCents } = useAppStore.getState();
        cents = hzToCents(sample.medianHz, resolveSaHz(saNoteId, fineCents));
      }

      const snapshot = current.push({ t: now, cents });
      if (snapshot.done) {
        finishNote(noteIndex);
        return;
      }
      if (now - lastUiUpdate >= UI_UPDATE_INTERVAL_MS) {
        lastUiUpdate = now;
        setLive({
          progress: snapshot.progress,
          inBand: cents !== null && Math.abs(cents - current.targetCents) <= TOLERANCE.close,
        });
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [phase, noteIndex, latest, finishNote]);

  // Stopping the mic abandons the round: reset the visible state while rendering (the pattern React
  // recommends over setState in an effect) and release the non-visible parts in an effect.
  const [wasActive, setWasActive] = useState(active);
  if (wasActive !== active) {
    setWasActive(active);
    if (!active) {
      setFlow(INITIAL);
      setLive({ progress: 0, inBand: false });
    }
  }
  useEffect(() => {
    if (active) return;
    window.clearTimeout(betweenTimer.current);
    tracker.current = null;
    results.current = [];
  }, [active]);

  useEffect(() => () => window.clearTimeout(betweenTimer.current), []);

  const targetCents = useMemo(
    () =>
      flow.phase === "note" || flow.phase === "between"
        ? noteTargetCents(exercise.notes[flow.noteIndex])
        : null,
    [flow.phase, flow.noteIndex, exercise],
  );

  return {
    exercise,
    phase: flow.phase,
    noteIndex: flow.noteIndex,
    targetCents,
    progress: live.progress,
    inBand: live.inBand,
    results: flow.results,
    round: flow.round,
    start,
    reset,
  };
}
