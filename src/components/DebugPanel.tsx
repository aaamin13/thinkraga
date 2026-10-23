"use client";

import { FFT_SIZES, SILENCE_RMS_OPTIONS, useAppStore } from "@/lib/store";

export function DebugPanel() {
  const sampleRate = useAppStore((s) => s.sampleRate);
  const fftSize = useAppStore((s) => s.fftSize);
  const setFftSize = useAppStore((s) => s.setFftSize);
  const silenceRms = useAppStore((s) => s.silenceRms);
  const setSilenceRms = useAppStore((s) => s.setSilenceRms);
  const { pitch, rawHz, clarity, rms, belowGate, fps, contextState } = useAppStore((s) => s.live);

  const rows: [string, string][] = [
    ["Audio context", contextState ?? "–"],
    ["Sample rate", sampleRate ? `${sampleRate} Hz` : "–"],
    ["Raw Hz", rawHz ? rawHz.toFixed(2) : "–"],
    ["Median Hz", pitch ? pitch.hz.toFixed(2) : "–"],
    ["Cents vs Sa", pitch ? pitch.cents.toFixed(1) : "–"],
    ["Clarity", clarity.toFixed(3)],
    ["RMS (level)", `${rms.toFixed(4)}${belowGate ? " · below gate" : ""}`],
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
      <OptionRow label="FFT size" options={FFT_SIZES} value={fftSize} onChange={setFftSize} />
      <OptionRow
        label="Silence gate (RMS)"
        options={SILENCE_RMS_OPTIONS}
        value={silenceRms}
        onChange={setSilenceRms}
      />
    </section>
  );
}

interface OptionRowProps<T extends number> {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}

function OptionRow<T extends number>({ label, options, value, onChange }: OptionRowProps<T>) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted">{label}</span>
      <div className="flex gap-1">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={value === option}
            className={`h-10 rounded-lg px-2.5 ${
              value === option ? "bg-saffron text-background" : "bg-background text-foreground"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
