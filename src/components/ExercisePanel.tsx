"use client";

import { useMemo } from "react";
import { HoldRing } from "@/components/HoldRing";
import { PitchCanvas } from "@/components/PitchCanvas";
import { ResultsCard } from "@/components/ResultsCard";
import { Stars } from "@/components/Stars";
import { TargetNote } from "@/components/TargetNote";
import { TuningMeter } from "@/components/TuningMeter";
import type { ExerciseController } from "@/hooks/useExercise";
import type { PitchSample } from "@/hooks/usePitchStream";
import type { RingBuffer } from "@/lib/audio/ringBuffer";
import { TOLERANCE } from "@/lib/music/scoring";
import { swaraLabel } from "@/lib/music/swara";
import { useAppStore } from "@/lib/store";

interface ExercisePanelProps {
  controller: ExerciseController;
  history: RingBuffer<PitchSample>;
}

export function ExercisePanel({ controller, history }: ExercisePanelProps) {
  const { exercise, phase, noteIndex, targetCents, progress, inBand, results, round } = controller;
  const bestScore = useAppStore((s) => s.bestRoundScore);
  const target = useMemo(
    () => (targetCents === null ? null : { cents: targetCents, toleranceCents: TOLERANCE.close }),
    [targetCents],
  );

  if (phase === "results" && round) {
    return (
      <ResultsCard
        results={results}
        roundScore={round.score}
        isNewBest={round.isNewBest}
        bestScore={bestScore}
        onRetry={controller.start}
      />
    );
  }

  const canvas = <PitchCanvas history={history} target={target} className="min-h-44 flex-1" />;

  if (phase === "ready") {
    return (
      <>
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface p-4">
          <div className="min-w-0">
            <p className="font-semibold">{exercise.name}</p>
            <p className="text-sm text-muted">Hold each swara steady for 1.5 s.</p>
          </div>
          <button
            type="button"
            onClick={controller.start}
            className="h-12 shrink-0 rounded-xl bg-saffron px-5 font-semibold text-background active:opacity-80"
          >
            Start
          </button>
        </div>
        {canvas}
        <TuningMeter compact />
      </>
    );
  }

  const current = exercise.notes[noteIndex];
  return (
    <>
      <div className="flex items-center gap-3">
        <HoldRing progress={progress} inBand={inBand} locked={phase === "between" && results[noteIndex]?.locked === true}>
          <TargetNote code={current.code} />
        </HoldRing>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <ol className="flex gap-1.5" aria-label="Exercise progress">
            {exercise.notes.map((note, i) => {
              const result = results[i];
              const isCurrent = i === noteIndex;
              return (
                <li
                  key={i}
                  aria-current={isCurrent ? "step" : undefined}
                  className={`flex min-w-0 flex-1 flex-col items-center rounded-lg py-1 text-xs ${
                    isCurrent ? "bg-saffron/20 text-saffron" : "bg-surface text-muted"
                  }`}
                >
                  <span>{swaraLabel(note.code).latin}</span>
                  <Stars count={result?.stars ?? 0} className={result ? "" : "opacity-40"} />
                </li>
              );
            })}
          </ol>
          <TuningMeter compact />
        </div>
      </div>
      {canvas}
    </>
  );
}
