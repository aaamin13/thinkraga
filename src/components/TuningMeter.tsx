"use client";

import { TOLERANCE } from "@/lib/music/scoring";
import { swaraLabel } from "@/lib/music/swara";
import { useAppStore } from "@/lib/store";

const NEEDLE_RANGE_CENTS = 50;

function tone(absOffset: number): { text: string; bg: string } {
  if (absOffset <= TOLERANCE.perfect) return { text: "text-emerald-400", bg: "bg-emerald-400" };
  if (absOffset <= TOLERANCE.close) return { text: "text-amber-400", bg: "bg-amber-400" };
  return { text: "text-zinc-500", bg: "bg-zinc-500" };
}

export function TuningMeter() {
  const pitch = useAppStore((s) => s.live.pitch);

  if (!pitch) {
    return (
      <div className="flex h-36 flex-col items-center justify-center gap-1 text-muted">
        <p className="text-4xl font-semibold">–</p>
        <p className="text-sm">Sing a note</p>
      </div>
    );
  }

  const { devanagari, latin } = swaraLabel(pitch.code);
  const offset = pitch.offsetCents;
  const rounded = Math.round(offset);
  const { text, bg } = tone(Math.abs(offset));
  const needle = 50 + (Math.max(-NEEDLE_RANGE_CENTS, Math.min(NEEDLE_RANGE_CENTS, offset)) / NEEDLE_RANGE_CENTS) * 50;

  return (
    <div className="flex h-36 flex-col items-center justify-center gap-2" aria-live="off">
      <p className={`whitespace-nowrap text-4xl font-semibold ${text}`}>
        {devanagari} <span className="text-3xl">{latin}</span>
      </p>
      <p className={`whitespace-nowrap font-mono text-lg tabular-nums ${text}`}>
        {rounded > 0 ? "+" : ""}
        {rounded}¢ {rounded > 0 ? "▲ sharp" : rounded < 0 ? "▼ flat" : "● in tune"}
      </p>
      <div className="relative h-2 w-full max-w-xs rounded-full bg-surface">
        <div
          className="absolute inset-y-0 rounded-full bg-white/10"
          style={{
            left: `${50 - (TOLERANCE.perfect / NEEDLE_RANGE_CENTS) * 50}%`,
            right: `${50 - (TOLERANCE.perfect / NEEDLE_RANGE_CENTS) * 50}%`,
          }}
        />
        <div className="absolute inset-y-[-4px] left-1/2 w-px bg-white/40" />
        <div
          className={`absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full ${bg}`}
          style={{ left: `${needle}%` }}
        />
      </div>
    </div>
  );
}
