"use client";

import { useEffect, useState } from "react";
import { DebugPanel } from "@/components/DebugPanel";
import { DroneControls } from "@/components/DroneControls";
import { ExercisePanel } from "@/components/ExercisePanel";
import { SaPicker } from "@/components/SaPicker";
import { ScriptPicker } from "@/components/ScriptPicker";
import { StartGate } from "@/components/StartGate";
import { useDrone } from "@/hooks/useDrone";
import { useExercise } from "@/hooks/useExercise";
import { usePitchStream } from "@/hooks/usePitchStream";
import { useAppStore, useSaHz } from "@/lib/store";

export default function Home() {
  const hydrated = useAppStore((s) => s.hydrated);
  const stream = usePitchStream();
  useDrone();
  const [showDebug, setShowDebug] = useState(false);
  const running = stream.status === "running";
  const exercise = useExercise(stream.latest, running);

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

          <ScriptPicker />

          <DroneControls />

          <StartGate status={stream.status} error={stream.error} onStart={() => void stream.start()} />
        </>
      )}

      {running && (
        <>
          <DroneControls compact />
          <ExercisePanel controller={exercise} history={stream.history} />
        </>
      )}

      {showDebug && <DebugPanel />}

      <footer className="mt-auto flex items-center justify-center gap-1 text-xs text-muted">
        <p>Use headphones for best results ·</p>
        <button type="button" onClick={() => setShowDebug((v) => !v)} className="h-10 px-2 underline">
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
