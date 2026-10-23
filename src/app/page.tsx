"use client";

import { useEffect } from "react";
import { SaPicker } from "@/components/SaPicker";
import { useAppStore } from "@/lib/store";

export default function Home() {
  const hydrated = useAppStore((s) => s.hydrated);

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

      <p className="mt-auto text-center text-xs text-muted">Use headphones for best results</p>
    </main>
  );
}
