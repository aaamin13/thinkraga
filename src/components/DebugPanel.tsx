"use client";

import { FFT_SIZES, useAppStore } from "@/lib/store";

export function DebugPanel() {
  const sampleRate = useAppStore((s) => s.sampleRate);
  const fftSize = useAppStore((s) => s.fftSize);
  const setFftSize = useAppStore((s) => s.setFftSize);
  const { pitch, rawHz, clarity, rms, fps } = useAppStore((s) => s.live);

  const rows: [string, string][] = [
    ["Sample rate", sampleRate ? `${sampleRate} Hz` : "–"],
    ["Raw Hz", rawHz ? rawHz.toFixed(2) : "–"],
    ["Median Hz", pitch ? pitch.hz.toFixed(2) : "–"],
    ["Cents vs Sa", pitch ? pitch.cents.toFixed(1) : "–"],
    ["Clarity", clarity.toFixed(3)],
    ["RMS", rms.toFixed(4)],
    ["Frames/s", fps ? fps.toFixed(0) : "–"],
  ];

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-surface p-4 font-mono text-xs" aria-label="Debug">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted">{label}</dt>
            <dd className="text-right tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex items-center justify-between">
        <span className="text-muted">FFT size</span>
        <div className="flex gap-2">
          {FFT_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setFftSize(size)}
              aria-pressed={fftSize === size}
              className={`h-10 rounded-lg px-3 ${
                fftSize === size ? "bg-saffron text-background" : "bg-background text-foreground"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
