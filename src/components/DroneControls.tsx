"use client";

import { unlockAudioContext } from "@/lib/audio/context";
import { FIRST_STRINGS } from "@/lib/audio/drone";
import { useAppStore } from "@/lib/store";

interface DroneControlsProps {
  /** One-row layout for the practice screen (no string picker). */
  compact?: boolean;
}

export function DroneControls({ compact = false }: DroneControlsProps) {
  const on = useAppStore((s) => s.droneOn);
  const volume = useAppStore((s) => s.droneVolume);
  const firstString = useAppStore((s) => s.droneFirstString);
  const setOn = useAppStore((s) => s.setDroneOn);
  const setVolume = useAppStore((s) => s.setDroneVolume);
  const setFirstString = useAppStore((s) => s.setDroneFirstString);

  const toggle = () => {
    // Must happen inside the tap: iOS only starts audio from a user gesture.
    if (!on) unlockAudioContext();
    setOn(!on);
  };

  const controls = (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={on}
        className={`h-12 shrink-0 rounded-xl px-4 text-sm font-semibold ${
          on ? "bg-saffron text-background" : "bg-background text-foreground"
        }`}
      >
        Tanpura {on ? "on" : "off"}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={(e) => setVolume(Number(e.target.value))}
        aria-label="Tanpura volume"
        className="h-12 min-w-0 flex-1 accent-saffron"
      />
    </div>
  );

  if (compact) return controls;

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-surface p-4" aria-labelledby="drone-heading">
      <h2 id="drone-heading" className="text-sm font-medium uppercase tracking-wider text-muted">
        Tanpura
      </h2>
      {controls}
      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted">First string</span>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="First string">
          {FIRST_STRINGS.map((first) => (
            <button
              key={first}
              type="button"
              onClick={() => setFirstString(first)}
              aria-pressed={firstString === first}
              className={`h-11 rounded-lg text-sm capitalize ${
                firstString === first ? "bg-saffron text-background" : "bg-background text-foreground"
              }`}
            >
              {first}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
