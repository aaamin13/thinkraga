"use client";

import { SWARA_SCRIPTS, swaraLabel, type SwaraScript } from "@/lib/music/swara";
import { useAppStore } from "@/lib/store";

const OPTIONS: Record<SwaraScript, string> = {
  devanagari: "हिन्दी / देवनागरी",
  bengali: "বাংলা",
};

const PREVIEW_CODES = ["S", "R", "G", "m", "P", "D", "N"] as const;

export function ScriptPicker() {
  const script = useAppStore((s) => s.swaraScript);
  const setScript = useAppStore((s) => s.setSwaraScript);

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-surface p-4" aria-labelledby="script-heading">
      <h2 id="script-heading" className="text-sm font-medium uppercase tracking-wider text-muted">
        Swara names
      </h2>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Swara script">
        {SWARA_SCRIPTS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScript(option)}
            aria-pressed={script === option}
            className={`h-12 rounded-xl text-base ${
              script === option ? "bg-saffron font-semibold text-background" : "bg-background text-foreground"
            }`}
          >
            {OPTIONS[option]}
          </button>
        ))}
      </div>
      <p className="text-center text-lg tracking-wide text-muted" aria-hidden="true">
        {PREVIEW_CODES.map((code) => swaraLabel(code, script).native).join("  ")}
      </p>
    </section>
  );
}
