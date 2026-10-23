"use client";

import type { MicError } from "@/lib/audio/mic";
import type { StreamStatus } from "@/hooks/usePitchStream";

interface StartGateProps {
  status: StreamStatus;
  error: MicError | null;
  onStart: () => void;
}

export function StartGate({ status, error, onStart }: StartGateProps) {
  const starting = status === "starting";

  return (
    <div className="flex flex-col gap-4">
      {error && <MicErrorMessage error={error} />}
      <button
        type="button"
        onClick={onStart}
        disabled={starting}
        className="h-14 rounded-2xl bg-saffron text-lg font-semibold text-background transition-opacity active:opacity-80 disabled:opacity-50"
      >
        {starting ? "Starting…" : error ? "Try again" : "Tap to start"}
      </button>
    </div>
  );
}

function MicErrorMessage({ error }: { error: MicError }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-red-400/30 bg-red-950/40 p-4 text-sm">
      <p className="font-medium text-red-200">{TITLES[error.kind]}</p>
      {error.kind === "denied" ? (
        <div className="flex flex-col gap-2 text-red-100/80">
          <p>
            <strong>iPhone (Safari):</strong> tap <em>aA</em> in the address bar → Website Settings →
            Microphone → Allow. Or open Settings → Apps → Safari → Microphone. Then reload.
          </p>
          <p>
            <strong>Android (Chrome):</strong> tap the icon left of the address bar → Permissions →
            Microphone → Allow. Or open Settings → Site settings → Microphone. Then reload.
          </p>
        </div>
      ) : (
        <p className="text-red-100/80">{DETAILS[error.kind] ?? error.message}</p>
      )}
    </div>
  );
}

const TITLES: Record<MicError["kind"], string> = {
  denied: "Microphone access is blocked",
  "no-device": "No microphone found",
  busy: "The microphone is in use",
  insecure: "A secure connection is needed",
  unsupported: "This browser can't use the microphone",
  ended: "The microphone stopped",
  other: "Couldn't start the microphone",
};

const DETAILS: Partial<Record<MicError["kind"], string>> = {
  "no-device": "Connect or enable a microphone, then try again.",
  busy: "Another app or tab may be using it. Close it and try again.",
  insecure:
    "Browsers only allow microphone access on https pages. Open the Vercel link instead of a local IP address.",
  unsupported: "Try the latest Safari on iPhone or Chrome on Android.",
  ended: "It was unplugged or taken by another app. Tap to start again.",
};
