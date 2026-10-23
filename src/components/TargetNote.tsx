"use client";

import { swaraLabel, type SwaraCode } from "@/lib/music/swara";
import { useAppStore } from "@/lib/store";

export function TargetNote({ code }: { code: SwaraCode }) {
  const script = useAppStore((s) => s.swaraScript);
  const { native, latin } = swaraLabel(code, script);
  return (
    <div className="flex flex-col items-center leading-tight">
      <span className="text-4xl font-semibold">{native}</span>
      <span className="text-lg font-medium text-saffron">{latin}</span>
    </div>
  );
}
