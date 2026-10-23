import type { ReactNode } from "react";

interface HoldRingProps {
  /** 0..1 */
  progress: number;
  /** Voice currently inside the tolerance band. */
  inBand: boolean;
  locked: boolean;
  children?: ReactNode;
}

const SIZE = 112;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function HoldRing({ progress, inBand, locked, children }: HoldRingProps) {
  const color = locked || inBand ? "stroke-emerald-400" : "stroke-amber-400";
  return (
    <div
      className="relative shrink-0"
      style={{ width: SIZE, height: SIZE }}
      role="progressbar"
      aria-label="Time held in tune"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
    >
      <svg width={SIZE} height={SIZE} className="-rotate-90">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-white/10" />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          className={`${color} transition-[stroke-dashoffset] duration-100`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
