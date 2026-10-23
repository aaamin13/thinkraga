import { swaraLabel, type SwaraCode } from "@/lib/music/swara";

export function TargetNote({ code }: { code: SwaraCode }) {
  const { devanagari, latin } = swaraLabel(code);
  return (
    <div className="flex flex-col items-center leading-tight">
      <span className="text-4xl font-semibold">{devanagari}</span>
      <span className="text-lg font-medium text-saffron">{latin}</span>
    </div>
  );
}
