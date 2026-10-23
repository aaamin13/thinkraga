import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_SA_NOTE_ID,
  FINE_TUNE_RANGE_CENTS,
  findNoteOption,
  resolveSaHz,
} from "@/lib/music/swara";

interface PersistedSettings {
  saNoteId: string;
  fineCents: number;
}

interface AppState extends PersistedSettings {
  /** True once localStorage has been read (it is never available during SSR). */
  hydrated: boolean;
  setSaNote: (id: string) => void;
  setFineCents: (cents: number) => void;
}

const DEFAULTS: PersistedSettings = { saNoteId: DEFAULT_SA_NOTE_ID, fineCents: 0 };

function sanitize(raw: Partial<PersistedSettings> | undefined): PersistedSettings {
  const saNoteId =
    typeof raw?.saNoteId === "string" && findNoteOption(raw.saNoteId)
      ? raw.saNoteId
      : DEFAULTS.saNoteId;
  const fine = typeof raw?.fineCents === "number" && Number.isFinite(raw.fineCents) ? raw.fineCents : 0;
  const fineCents = Math.max(-FINE_TUNE_RANGE_CENTS, Math.min(FINE_TUNE_RANGE_CENTS, Math.round(fine)));
  return { saNoteId, fineCents };
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      hydrated: false,
      setSaNote: (id) => set({ saNoteId: sanitize({ saNoteId: id }).saNoteId }),
      setFineCents: (cents) => set({ fineCents: sanitize({ fineCents: cents }).fineCents }),
    }),
    {
      name: "thinkraga-settings",
      version: 1,
      // Rehydrated manually in an effect so server and first client render match.
      skipHydration: true,
      partialize: ({ saNoteId, fineCents }): PersistedSettings => ({ saNoteId, fineCents }),
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
