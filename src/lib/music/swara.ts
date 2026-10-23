// Pure music logic: no browser APIs. Step 2 adds swara tables, tuning systems and nearestSwara.

export interface NoteOption {
  /** Western note name used as the picker id, e.g. "C#3". */
  id: string;
  hz: number;
  label: string;
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

const FIRST_MIDI = 43; // G2
const LAST_MIDI = 62; // D4

function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

function midiToName(midi: number): string {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

/** Candidate Sa notes from G2 to D4, A4 = 440 Hz equal temperament. */
export const NOTE_OPTIONS: readonly NoteOption[] = Array.from(
  { length: LAST_MIDI - FIRST_MIDI + 1 },
  (_, i) => {
    const midi = FIRST_MIDI + i;
    const id = midiToName(midi);
    const hz = midiToHz(midi);
    return { id, hz, label: `${id} · ${hz.toFixed(1)} Hz` };
  },
);

export const DEFAULT_SA_NOTE_ID = "C#3";
export const FINE_TUNE_RANGE_CENTS = 50;

export function hzToCents(hz: number, saHz: number): number {
  return 1200 * Math.log2(hz / saHz);
}

export function centsToHz(cents: number, saHz: number): number {
  return saHz * 2 ** (cents / 1200);
}

export function findNoteOption(id: string): NoteOption | undefined {
  return NOTE_OPTIONS.find((n) => n.id === id);
}

/** Effective Sa frequency: the chosen note shifted by the fine-tune offset. */
export function resolveSaHz(noteId: string, fineCents: number): number {
  const note = findNoteOption(noteId) ?? findNoteOption(DEFAULT_SA_NOTE_ID);
  if (!note) throw new Error("Default Sa note missing from NOTE_OPTIONS");
  return centsToHz(fineCents, note.hz);
}
