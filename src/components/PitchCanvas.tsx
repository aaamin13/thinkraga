"use client";

import { useEffect, useRef } from "react";
import type { PitchSample } from "@/hooks/usePitchStream";
import type { RingBuffer } from "@/lib/audio/ringBuffer";
import { hzToCents, resolveSaHz, SWARAS, swaraCents, swaraLabel } from "@/lib/music/swara";
import { useAppStore } from "@/lib/store";

export interface CanvasTarget {
  /** Absolute cents relative to Sa. */
  cents: number;
  toleranceCents: number;
}

interface PitchCanvasProps {
  history: RingBuffer<PitchSample>;
  target?: CanvasTarget | null;
  className?: string;
}

const MIN_CENTS = -200;
const MAX_CENTS = 1400;
const WINDOW_MS = 4000;
const LABEL_WIDTH = 40;
const PAD_Y = 10;
// A longer pause between samples means the voice dropped out, so the line is broken there.
const MAX_GAP_MS = 120;

const COLORS = {
  shuddha: "rgba(241, 238, 230, 0.28)",
  other: "rgba(241, 238, 230, 0.09)",
  label: "rgba(241, 238, 230, 0.7)",
  targetBand: "rgba(52, 211, 153, 0.18)",
  targetLine: "rgba(52, 211, 153, 0.9)",
  line: "#ff9933",
};

/** Octave marks: comma = mandra (lower), apostrophe = taar (upper). */
function guideLabel(code: Parameters<typeof swaraLabel>[0], octave: number): string {
  const { latin } = swaraLabel(code);
  return octave < 0 ? `${latin},` : octave > 0 ? `${latin}'` : latin;
}

export function PitchCanvas({ history, target = null, className }: PitchCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Read through a ref so a changing target doesn't restart the animation loop.
  const targetRef = useRef(target);
  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!container || !canvas || !ctx) return;

    let width = 0;
    let height = 0;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    const yOf = (cents: number) =>
      PAD_Y + (1 - (cents - MIN_CENTS) / (MAX_CENTS - MIN_CENTS)) * (height - 2 * PAD_Y);

    const draw = (now: number) => {
      ctx.clearRect(0, 0, width, height);
      const plotWidth = width - LABEL_WIDTH;
      const currentTarget = targetRef.current;

      if (currentTarget) {
        const top = yOf(currentTarget.cents + currentTarget.toleranceCents);
        const bottom = yOf(currentTarget.cents - currentTarget.toleranceCents);
        ctx.fillStyle = COLORS.targetBand;
        ctx.fillRect(LABEL_WIDTH, top, plotWidth, bottom - top);
        ctx.strokeStyle = COLORS.targetLine;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(LABEL_WIDTH, yOf(currentTarget.cents));
        ctx.lineTo(width, yOf(currentTarget.cents));
        ctx.stroke();
      }

      ctx.font = "11px var(--font-geist-sans), sans-serif";
      ctx.textBaseline = "middle";
      ctx.textAlign = "right";
      ctx.lineWidth = 1;
      for (const octave of [-1, 0, 1]) {
        for (const { code, kind } of SWARAS) {
          const cents = swaraCents(code, "et", octave);
          if (cents < MIN_CENTS || cents > MAX_CENTS) continue;
          const y = Math.round(yOf(cents)) + 0.5;
          const prominent = kind === "shuddha" || kind === "achal";
          ctx.strokeStyle = prominent ? COLORS.shuddha : COLORS.other;
          ctx.beginPath();
          ctx.moveTo(LABEL_WIDTH, y);
          ctx.lineTo(width, y);
          ctx.stroke();
          if (prominent) {
            ctx.fillStyle = COLORS.label;
            ctx.fillText(guideLabel(code, octave), LABEL_WIDTH - 6, y);
          }
        }
      }

      const { saNoteId, fineCents } = useAppStore.getState();
      const saHz = resolveSaHz(saNoteId, fineCents);
      const oldest = now - WINDOW_MS;

      ctx.strokeStyle = COLORS.line;
      ctx.fillStyle = COLORS.line;
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      let penDown = false;
      let lastT = 0;
      let headX = 0;
      let headY = 0;
      history.forEach((sample) => {
        if (sample.t < oldest) return;
        const cents = sample.smoothedHz === null ? null : hzToCents(sample.smoothedHz, saHz);
        if (cents === null || cents < MIN_CENTS || cents > MAX_CENTS) {
          penDown = false;
          return;
        }
        const x = LABEL_WIDTH + (1 - (now - sample.t) / WINDOW_MS) * plotWidth;
        const y = yOf(cents);
        if (!penDown || sample.t - lastT > MAX_GAP_MS) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        penDown = true;
        lastT = sample.t;
        headX = x;
        headY = y;
      });
      ctx.stroke();

      // Marker on the newest point, only while the voice is currently being heard.
      if (penDown && now - lastT < MAX_GAP_MS) {
        ctx.beginPath();
        ctx.arc(headX, headY, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    let rafId = requestAnimationFrame(function frame(now) {
      draw(now);
      rafId = requestAnimationFrame(frame);
    });

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [history]);

  return (
    <div ref={containerRef} className={className}>
      <canvas ref={canvasRef} className="block size-full" role="img" aria-label="Live pitch line" />
    </div>
  );
}
