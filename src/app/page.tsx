"use client";

import { useEffect, useState } from "react";
import { DebugPanel } from "@/components/DebugPanel";
import { SaPicker } from "@/components/SaPicker";
import { StartGate } from "@/components/StartGate";
import { usePitchStream } from "@/hooks/usePitchStream";
import { swaraLabel } from "@/lib/music/swara";
import { useAppStore } from "@/lib/store";

const SAPTAK = ["mandra", "madhya", "taar"] as const;

export default function Home() {
  const hydrated = useAppStore((s) => s.hydrated);
  const stream = usePitchStream();
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    void useAppStore.persist.rehydrate();
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          Think<span className="text-saffron">Raga</span>
        </h1>
        <p className="text-muted">Sing a note, see how true it is. Set your Sa to begin your riyaz.</p>
      </header>

      <div className={hydrated ? "opacity-100 transition-opacity" : "opacity-0"}>
        <SaPicker />
      </div>

      {stream.status === "running" ? (
        <>
          <LiveReadout />
          <button type="button" onClick={stream.stop} className="h-12 rounded-2xl bg-surface text-muted">
            Stop
          </button>
        </>
      ) : (
        <StartGate status={stream.status} error={stream.error} onStart={() => void stream.start()} />
      )}

      {showDebug && <DebugPanel />}

      <footer className="mt-auto flex flex-col items-center gap-2 text-xs text-muted">
        <p>Use headphones for best results</p>
        <button type="button" onClick={() => setShowDebug((v) => !v)} className="h-10 px-4 underline">
          {showDebug ? "Hide debug" : "Debug"}
        </button>
      </footer>
    </main>
  );
}

/** Temporary readout until the tuning meter and pitch canvas arrive in step 4. */
function LiveReadout() {
  const pitch = useAppStore((s) => s.live.pitch);
  if (!pitch) {
    return <p className="py-6 text-center text-xl text-muted">Listening… sing a note</p>;
  }
  const { devanagari, latin } = swaraLabel(pitch.code);
  const offset = Math.round(pitch.offsetCents);
  return (
    <div className="flex flex-col items-center gap-1 py-4">
      <p className="text-5xl font-semibold">
        {devanagari} <span className="text-saffron">{latin}</span>
      </p>
      <p className="font-mono text-xl tabular-nums">
        {offset > 0 ? "+" : ""}
        {offset}¢ · {SAPTAK[pitch.octave + 1] ?? (pitch.octave < 0 ? "ati-mandra" : "ati-taar")}
      </p>
    </div>
  );
}
