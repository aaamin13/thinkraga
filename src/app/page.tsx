"use client";

import { useEffect, useState } from "react";
import { DebugPanel } from "@/components/DebugPanel";
import { PitchCanvas } from "@/components/PitchCanvas";
import { SaPicker } from "@/components/SaPicker";
import { StartGate } from "@/components/StartGate";
import { TuningMeter } from "@/components/TuningMeter";
import { usePitchStream } from "@/hooks/usePitchStream";
import { TOLERANCE } from "@/lib/music/scoring";
import { useAppStore, useSaHz } from "@/lib/store";

// Temporary until the exercise flow (step 6): show Sa as the highlighted target band.
const DEMO_TARGET = { cents: 0, toleranceCents: TOLERANCE.close };

export default function Home() {
  const hydrated = useAppStore((s) => s.hydrated);
  const stream = usePitchStream();
  const [showDebug, setShowDebug] = useState(false);
  const running = stream.status === "running";

  useEffect(() => {
    void useAppStore.persist.rehydrate();
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      {running ? (
        <div className="flex items-center justify-between">
          <SaSummary />
          <button type="button" onClick={stream.stop} className="h-10 rounded-xl bg-surface px-4 text-sm text-muted">
            Stop
          </button>
        </div>
      ) : (
        <>
          <header className="flex flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-tight">
              Think<span className="text-saffron">Raga</span>
            </h1>
            <p className="text-muted">Sing a note, see how true it is. Set your Sa to begin your riyaz.</p>
          </header>

          <div className={hydrated ? "opacity-100 transition-opacity" : "opacity-0"}>
            <SaPicker />
          </div>

          <StartGate status={stream.status} error={stream.error} onStart={() => void stream.start()} />
        </>
      )}

      {running && (
        <>
          <PitchCanvas history={stream.history} target={DEMO_TARGET} className="min-h-48 flex-1" />
          <TuningMeter />
        </>
      )}

      {showDebug && <DebugPanel />}

      <footer className="mt-auto flex flex-col items-center gap-1 text-xs text-muted">
        <p>Use headphones for best results</p>
        <button type="button" onClick={() => setShowDebug((v) => !v)} className="h-10 px-4 underline">
          {showDebug ? "Hide debug" : "Debug"}
        </button>
      </footer>
    </main>
  );
}

function SaSummary() {
  const noteId = useAppStore((s) => s.saNoteId);
  const saHz = useSaHz();
  return (
    <p className="text-sm text-muted">
      Sa <span className="font-semibold text-foreground">{noteId}</span>{" "}
      <span className="font-mono">{saHz.toFixed(1)} Hz</span>
    </p>
  );
}
