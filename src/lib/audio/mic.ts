export type MicErrorKind =
  | "denied"
  | "no-device"
  | "busy"
  | "insecure"
  | "unsupported"
  | "ended"
  | "other";

export class MicError extends Error {
  constructor(
    readonly kind: MicErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "MicError";
  }
}

export function toMicError(error: unknown): MicError {
  if (error instanceof MicError) return error;
  if (error instanceof DOMException) {
    switch (error.name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
        return new MicError("denied", error.message);
      case "NotFoundError":
      case "OverconstrainedError":
        return new MicError("no-device", error.message);
      case "NotReadableError":
      case "AbortError":
        return new MicError("busy", error.message);
      case "SecurityError":
        return new MicError("insecure", error.message);
    }
  }
  return new MicError("other", error instanceof Error ? error.message : String(error));
}

export interface Mic {
  analyser: AnalyserNode;
  stop(): void;
}

/**
 * Opens the microphone and routes it to an AnalyserNode only. The source is deliberately never
 * connected to `destination`, so the user does not hear themselves (and cannot feed back).
 */
export async function startMic(
  context: AudioContext,
  fftSize: number,
  onEnded: () => void,
): Promise<Mic> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw window.isSecureContext
      ? new MicError("unsupported", "Microphone capture is not supported in this browser.")
      : new MicError("insecure", "Microphone access needs a secure (https) connection.");
  }

  let stream: MediaStream;
  try {
    // Voice processing would flatten and gate exactly the sustained notes we want to measure.
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
  } catch (error) {
    throw toMicError(error);
  }

  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = fftSize;
  source.connect(analyser);

  const tracks = stream.getAudioTracks();
  tracks.forEach((track) => track.addEventListener("ended", onEnded));

  return {
    analyser,
    stop() {
      tracks.forEach((track) => track.removeEventListener("ended", onEnded));
      source.disconnect();
      stream.getTracks().forEach((track) => track.stop());
    },
  };
}
