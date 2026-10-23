// One shared AudioContext for the whole app (mic analysis now, drone later).

type AudioContextConstructor = typeof AudioContext;

/** Minimal typing for the Audio Session API (iOS Safari 16.4+), which lib.dom does not include yet. */
interface AudioSessionLike {
  type: string;
}

let context: AudioContext | null = null;

/**
 * Declares that this page both plays and records. Without it, iOS switches audio mode only when
 * the mic opens, which can re-route playback (e.g. from AirPods to the quiet phone speaker).
 */
function declarePlayAndRecord(): void {
  const session = (navigator as Navigator & { audioSession?: AudioSessionLike }).audioSession;
  if (!session) return;
  try {
    session.type = "play-and-record";
  } catch {
    // Unsupported value on this browser: keep the default behaviour.
  }
}

/**
 * Creates the singleton lazily and starts resuming it. Call this synchronously inside the
 * "Tap to start" handler: iOS only allows audio to start from a user gesture.
 */
export function unlockAudioContext(): AudioContext {
  declarePlayAndRecord();
  if (!context || context.state === "closed") {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
    if (!Ctor) throw new Error("Web Audio is not supported in this browser.");
    context = new Ctor();
  }
  void context.resume();
  return context;
}

export function getAudioContext(): AudioContext | null {
  return context;
}
