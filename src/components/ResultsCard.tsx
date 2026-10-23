import { Stars } from "@/components/Stars";
import type { NoteResult } from "@/hooks/useExercise";
import { swaraLabel } from "@/lib/music/swara";

interface ResultsCardProps {
  results: readonly NoteResult[];
  roundScore: number;
  isNewBest: boolean;
  bestScore: number | null;
  onRetry: () => void;
}

export function ResultsCard({ results, roundScore, isNewBest, bestScore, onRetry }: ResultsCardProps) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-surface p-5" aria-label="Round results">
      <div className="text-center">
        <p className="text-sm uppercase tracking-wider text-muted">Round score</p>
        <p className="text-6xl font-semibold text-saffron">{roundScore}</p>
        {isNewBest && <p className="text-sm font-medium text-emerald-400">New best!</p>}
      </div>

      <ul className="flex flex-col gap-2">
        {results.map((result, i) => {
          const { devanagari, latin } = swaraLabel(result.code);
          return (
            <li key={i} className="flex items-center justify-between rounded-xl bg-background px-4 py-3">
              <span className="text-lg">
                {devanagari} <span className="text-muted">{latin}</span>
              </span>
              <span className="flex items-center gap-3">
                <Stars count={result.stars} className="text-xl" />
                <span className="w-8 text-right font-mono tabular-nums">{result.score}</span>
              </span>
            </li>
          );
        })}
      </ul>

      {bestScore !== null && <p className="text-center text-sm text-muted">Best round: {bestScore}</p>}

      <button
        type="button"
        onClick={onRetry}
        className="h-14 rounded-2xl bg-saffron text-lg font-semibold text-background active:opacity-80"
      >
        Try again
      </button>
    </section>
  );
}
