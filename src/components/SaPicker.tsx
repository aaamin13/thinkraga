"use client";

import { FINE_TUNE_RANGE_CENTS, NOTE_OPTIONS } from "@/lib/music/swara";
import { useAppStore, useSaHz } from "@/lib/store";

export function SaPicker() {
  const saNoteId = useAppStore((s) => s.saNoteId);
  const fineCents = useAppStore((s) => s.fineCents);
  const setSaNote = useAppStore((s) => s.setSaNote);
  const setFineCents = useAppStore((s) => s.setFineCents);
  const saHz = useSaHz();

  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-surface p-4" aria-labelledby="sa-heading">
      <div className="flex items-baseline justify-between">
        <h2 id="sa-heading" className="text-sm font-medium uppercase tracking-wider text-muted">
          Your Sa
        </h2>
        <span className="font-mono text-sm text-saffron" aria-live="polite">
          {saHz.toFixed(2)} Hz
        </span>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted">Tonic</span>
        <select
          value={saNoteId}
          onChange={(e) => setSaNote(e.target.value)}
          className="h-12 rounded-xl border border-white/10 bg-background px-3 text-base text-foreground"
        >
          {NOTE_OPTIONS.map((n) => (
            <option key={n.id} value={n.id}>
              {n.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="flex justify-between text-sm text-muted">
          <span>Fine tune</span>
          <span className="font-mono">
            {fineCents > 0 ? "+" : ""}
            {fineCents} cents
          </span>
        </span>
        <input
          type="range"
          min={-FINE_TUNE_RANGE_CENTS}
          max={FINE_TUNE_RANGE_CENTS}
          step={1}
          value={fineCents}
          onChange={(e) => setFineCents(Number(e.target.value))}
          className="h-12 w-full accent-saffron"
        />
      </label>
    </section>
  );
}
