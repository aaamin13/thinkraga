"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { unlockAudioContext } from "@/lib/audio/context";
import { MicError, startMic, toMicError, type Mic } from "@/lib/audio/mic";
import { createPitchAnalyzer } from "@/lib/audio/pitch";
import { RingBuffer } from "@/lib/audio/ringBuffer";
import { PitchSmoother } from "@/lib/audio/smoothing";
import { hzToCents, nearestSwara, resolveSaHz } from "@/lib/music/swara";
import { EMPTY_LIVE, useAppStore, type DetectedPitch } from "@/lib/store";

export type StreamStatus = "idle" | "starting" | "running" | "error";

export interface PitchSample {
  /** performance.now() timestamp of the frame (ms). */
  t: number;
  hz: number | null;
  medianHz: number | null;
  smoothedHz: number | null;
}

/** Keep a little over 4 s even at a 120 Hz display refresh rate. */
const HISTORY_CAPACITY = 600;
const STORE_PUSH_INTERVAL_MS = 1000 / 15;
const FPS_WINDOW_MS = 1000;

export interface PitchStream {
  status: StreamStatus;
  error: MicError | null;
  /** Must be called directly from a tap handler. */
  start: () => Promise<void>;
  stop: () => void;
  /** Newest sample, updated every frame without re-rendering React. */
  latest: RefObject<PitchSample | null>;
  /** Recent samples (about 4 s) for the canvas. */
  history: RingBuffer<PitchSample>;
}

export function usePitchStream(): PitchStream {
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [error, setError] = useState<MicError | null>(null);
  const [history] = useState(() => new RingBuffer<PitchSample>(HISTORY_CAPACITY));
  const latest = useRef<PitchSample | null>(null);

  const statusRef = useRef<StreamStatus>("idle");
  const session = useRef(0);
  const teardown = useRef<(() => void) | null>(null);

  const updateStatus = useCallback((next: StreamStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const release = useCallback(() => {
    session.current++;
    teardown.current?.();
    teardown.current = null;
    latest.current = null;
    history.clear();
    useAppStore.getState().setLive(EMPTY_LIVE);
  }, [history]);

  const stop = useCallback(() => {
    release();
    updateStatus("idle");
  }, [release, updateStatus]);

  const start = useCallback(async () => {
    if (statusRef.current === "starting" || statusRef.current === "running") return;
    const token = ++session.current;
    updateStatus("starting");
    setError(null);

    const fail = (cause: unknown) => {
      release();
      setError(toMicError(cause));
      updateStatus("error");
    };

    try {
      // Everything before the first await runs inside the tap gesture, which iOS requires.
      const context = unlockAudioContext();
      const mic = await startMic(context, useAppStore.getState().fftSize, () =>
        fail(new MicError("ended", "The microphone stopped.")),
      );
      if (token !== session.current) {
        mic.stop();
        return;
      }
      if (context.state !== "running") await context.resume();
      if (token !== session.current) {
        mic.stop();
        return;
      }

      useAppStore.getState().setSampleRate(context.sampleRate);
      teardown.current = runDetectionLoop(mic, context, latest, history);
      updateStatus("running");
    } catch (cause) {
      if (token === session.current) fail(cause);
    }
  }, [history, release, updateStatus]);

  useEffect(() => release, [release]);

  // iOS suspends the context when the tab is backgrounded or interrupted (e.g. a phone call).
  useEffect(() => {
    if (status !== "running") return;
    const resume = () => {
      if (document.visibilityState === "visible") void unlockAudioContext();
    };
    document.addEventListener("visibilitychange", resume);
    return () => document.removeEventListener("visibilitychange", resume);
  }, [status]);

  return { status, error, start, stop, latest, history };
}

function runDetectionLoop(
  mic: Mic,
  context: AudioContext,
  latest: RefObject<PitchSample | null>,
  history: RingBuffer<PitchSample>,
): () => void {
  const { analyser } = mic;
  const sampleRate = context.sampleRate;
  const smoother = new PitchSmoother();
  let analyzer = createPitchAnalyzer(analyser, sampleRate);

  let rafId = 0;
  let lastPush = 0;
  let fpsWindowStart = 0;
  let frames = 0;
  let fps = 0;

  const tick = (now: number) => {
    rafId = requestAnimationFrame(tick);

    const { fftSize, saNoteId, fineCents } = useAppStore.getState();
    if (analyser.fftSize !== fftSize) {
      analyser.fftSize = fftSize;
      analyzer = createPitchAnalyzer(analyser, sampleRate);
    }

    const frame = analyzer.analyze();
    const smoothed = smoother.push(frame.hz);
    const sample: PitchSample = {
      t: now,
      hz: smoothed.rawHz,
      medianHz: smoothed.medianHz,
      smoothedHz: smoothed.smoothedHz,
    };
    latest.current = sample;
    history.push(sample);

    frames++;
    if (fpsWindowStart === 0) fpsWindowStart = now;
    if (now - fpsWindowStart >= FPS_WINDOW_MS) {
      fps = (frames * 1000) / (now - fpsWindowStart);
      frames = 0;
      fpsWindowStart = now;
    }

    if (now - lastPush < STORE_PUSH_INTERVAL_MS) return;
    lastPush = now;

    let pitch: DetectedPitch | null = null;
    if (smoothed.medianHz !== null) {
      const cents = hzToCents(smoothed.medianHz, resolveSaHz(saNoteId, fineCents));
      const { code, octave, offsetCents } = nearestSwara(cents, "et");
      pitch = { hz: smoothed.medianHz, cents, code, octave, offsetCents };
    }
    useAppStore.getState().setLive({
      pitch,
      rawHz: frame.rawHz,
      clarity: frame.clarity,
      rms: frame.rms,
      fps,
    });
  };
  rafId = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(rafId);
    mic.stop();
  };
}
