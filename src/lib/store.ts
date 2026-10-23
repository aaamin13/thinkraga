import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_SA_NOTE_ID,
  FINE_TUNE_RANGE_CENTS,
  findNoteOption,
  resolveSaHz,
  type SwaraCode,
} from "@/lib/music/swara";

export const FFT_SIZES = [2048, 4096] as const;
export type FftSize = (typeof FFT_SIZES)[number];

interface PersistedSettings {
  saNoteId: string;
  fineCents: number;
  /** 2048 is more responsive; 4096 tracks low voices better. */
  fftSize: FftSize;
}

export interface DetectedPitch {
  hz: number;
  /** Cents relative to the user's Sa. */
  cents: number;
  code: SwaraCode;
  octave: number;
  offsetCents: number;
}

/** Coarse snapshot of the audio loop, pushed at most ~15 times a second. */
export interface LiveReading {
  pitch: DetectedPitch | null;
  rawHz: number | null;
  clarity: number;
  rms: number;
  fps: number;
}

export const EMPTY_LIVE: LiveReading = { pitch: null, rawHz: null, clarity: 0, rms: 0, fps: 0 };

interface AppState extends PersistedSettings {
  /** True once localStorage has been read (it is never available during SSR). */
  hydrated: boolean;
  sampleRate: number | null;
  live: LiveReading;
  setSaNote: (id: string) => void;
  setFineCents: (cents: number) => void;
  setFftSize: (size: FftSize) => void;
  setSampleRate: (rate: number | null) => void;
  setLive: (live: LiveReading) => void;
}

const DEFAULTS: PersistedSettings = { saNoteId: DEFAULT_SA_NOTE_ID, fineCents: 0, fftSize: 2048 };

function sanitize(raw: Partial<PersistedSettings> | undefined): PersistedSettings {
  const saNoteId =
    typeof raw?.saNoteId === "string" && findNoteOption(raw.saNoteId)
      ? raw.saNoteId
      : DEFAULTS.saNoteId;
  const fine = typeof raw?.fineCents === "number" && Number.isFinite(raw.fineCents) ? raw.fineCents : 0;
  const fineCents = Math.max(-FINE_TUNE_RANGE_CENTS, Math.min(FINE_TUNE_RANGE_CENTS, Math.round(fine)));
  const fftSize = FFT_SIZES.find((size) => size === raw?.fftSize) ?? DEFAULTS.fftSize;
  return { saNoteId, fineCents, fftSize };
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      hydrated: false,
      sampleRate: null,
      live: EMPTY_LIVE,
      setSaNote: (id) => set({ saNoteId: sanitize({ saNoteId: id }).saNoteId }),
      setFineCents: (cents) => set({ fineCents: sanitize({ fineCents: cents }).fineCents }),
      setFftSize: (size) => set({ fftSize: sanitize({ fftSize: size }).fftSize }),
      setSampleRate: (sampleRate) => set({ sampleRate }),
      setLive: (live) => set({ live }),
    }),
    {
      name: "thinkraga-settings",
      version: 1,
      // Rehydrated manually in an effect so server and first client render match.
      skipHydration: true,
      partialize: ({ saNoteId, fineCents, fftSize }): PersistedSettings => ({
        saNoteId,
        fineCents,
        fftSize,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...sanitize(persisted as Partial<PersistedSettings> | undefined),
      }),
      onRehydrateStorage: () => () => {
        useAppStore.setState({ hydrated: true });
      },
    },
  ),
);

/** Effective Sa in Hz (note + fine tune). */
export function useSaHz(): number {
  return useAppStore((s) => resolveSaHz(s.saNoteId, s.fineCents));
}
