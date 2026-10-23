// One shared AudioContext for the whole app (mic analysis now, drone later).

type AudioContextConstructor = typeof AudioContext;

let context: AudioContext | null = null;

/**
 * Creates the singleton lazily and starts resuming it. Call this synchronously inside the
 * "Tap to start" handler: iOS only allows audio to start from a user gesture.
 */
export function unlockAudioContext(): AudioContext {
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
