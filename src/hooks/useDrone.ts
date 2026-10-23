"use client";

import { useEffect, useRef } from "react";
import { getAudioContext } from "@/lib/audio/context";
import {
  getSampleDrone,
  getSynthDrone,
  prefetchTanpuraSample,
  SynthDrone,
  type Drone,
} from "@/lib/audio/drone";
import { resolveSaHz } from "@/lib/music/swara";
import { useAppStore, useSaHz } from "@/lib/store";

/** Keeps the app-wide drone in step with the store. Mount once, at the top of the page. */
export function useDrone(): void {
  const on = useAppStore((s) => s.droneOn);
  const source = useAppStore((s) => s.droneSource);
  const volume = useAppStore((s) => s.droneVolume);
  const firstString = useAppStore((s) => s.droneFirstString);
  const saHz = useSaHz();
  const active = useRef<Drone | null>(null);

  useEffect(() => {
    if (source === "sample") prefetchTanpuraSample();
  }, [source]);

  useEffect(() => {
    // The toggle's tap handler unlocks the context, so it exists whenever `on` becomes true.
    const context = getAudioContext();
    if (!on || !context) return;

    let cancelled = false;
    let drone: Drone | null = null;

    void (async () => {
      let chosen: Drone;
      if (source === "sample") {
        try {
          chosen = await getSampleDrone(context);
        } catch (error) {
          console.warn("Tanpura recording unavailable, using the synth drone.", error);
          chosen = getSynthDrone(context);
        }
      } else {
        chosen = getSynthDrone(context);
      }
      if (cancelled) return;

      const state = useAppStore.getState();
      chosen.setVolume(state.droneVolume);
      if (chosen instanceof SynthDrone) chosen.setFirstString(state.droneFirstString);
      chosen.start(resolveSaHz(state.saNoteId, state.fineCents));
      drone = chosen;
      active.current = chosen;
    })();

    return () => {
      cancelled = true;
      drone?.stop();
      active.current = null;
    };
  }, [on, source]);

  useEffect(() => active.current?.setSa(saHz), [saHz]);
  useEffect(() => active.current?.setVolume(volume), [volume]);
  useEffect(() => {
    if (active.current instanceof SynthDrone) active.current.setFirstString(firstString);
  }, [firstString]);
}
