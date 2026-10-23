"use client";

import { useEffect } from "react";
import { getAudioContext } from "@/lib/audio/context";
import { getDrone, peekDrone } from "@/lib/audio/drone";
import { resolveSaHz } from "@/lib/music/swara";
import { useAppStore, useSaHz } from "@/lib/store";

/** Keeps the app-wide drone in step with the store. Mount once, at the top of the page. */
export function useDrone(): void {
  const on = useAppStore((s) => s.droneOn);
  const volume = useAppStore((s) => s.droneVolume);
  const firstString = useAppStore((s) => s.droneFirstString);
  const saHz = useSaHz();

  useEffect(() => {
    // The toggle's tap handler unlocks the context, so it exists whenever `on` becomes true.
    const context = getAudioContext();
    if (!on || !context) return;
    const drone = getDrone(context);
    const { droneVolume, droneFirstString, saNoteId, fineCents } = useAppStore.getState();
    drone.setVolume(droneVolume);
    drone.setFirstString(droneFirstString);
    drone.start(resolveSaHz(saNoteId, fineCents));
    return () => drone.stop();
  }, [on]);

  useEffect(() => peekDrone()?.setSa(saHz), [saHz]);
  useEffect(() => peekDrone()?.setVolume(volume), [volume]);
  useEffect(() => peekDrone()?.setFirstString(firstString), [firstString]);
}
