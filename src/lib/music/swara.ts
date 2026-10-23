// Pure music logic: no browser APIs, so it can be unit tested and reused in a Capacitor app.
// All pitch is measured in cents relative to the user's Sa, never as absolute Western notes.

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

export function findNoteOption(id: string): NoteOption | undefined {
  return NOTE_OPTIONS.find((n) => n.id === id);
}

/** Effective Sa frequency: the chosen note shifted by the fine-tune offset. */
export function resolveSaHz(noteId: string, fineCents: number): number {
  const note = findNoteOption(noteId) ?? findNoteOption(DEFAULT_SA_NOTE_ID);
  if (!note) throw new Error("Default Sa note missing from NOTE_OPTIONS");
  return centsToHz(fineCents, note.hz);
}

export type SwaraCode = "S" | "r" | "R" | "g" | "G" | "m" | "M" | "P" | "d" | "D" | "n" | "N";
export type TuningSystem = "et" | "just";
export type SwaraKind = "achal" | "shuddha" | "komal" | "tivra";

export interface Swara {
  /** Lower case = komal, "M" = tivra Ma. */
  code: SwaraCode;
  name: string;
  /** Short Latin name, e.g. "Re". */
  latin: string;
  /** Devanagari name, e.g. "रे". */
  devanagari: string;
  kind: SwaraKind;
  etCents: number;
  /** Just intonation ratio as [numerator, denominator]. */
  justRatio: readonly [number, number];
}

export const SWARAS: readonly Swara[] = [
  { code: "S", name: "Shadja", latin: "Sa", devanagari: "सा", kind: "achal", etCents: 0, justRatio: [1, 1] },
  { code: "r", name: "Komal Rishabh", latin: "Re", devanagari: "रे", kind: "komal", etCents: 100, justRatio: [16, 15] },
  { code: "R", name: "Shuddha Rishabh", latin: "Re", devanagari: "रे", kind: "shuddha", etCents: 200, justRatio: [9, 8] },
  { code: "g", name: "Komal Gandhar", latin: "Ga", devanagari: "ग", kind: "komal", etCents: 300, justRatio: [6, 5] },
  { code: "G", name: "Shuddha Gandhar", latin: "Ga", devanagari: "ग", kind: "shuddha", etCents: 400, justRatio: [5, 4] },
  { code: "m", name: "Shuddha Madhyam", latin: "Ma", devanagari: "म", kind: "shuddha", etCents: 500, justRatio: [4, 3] },
  { code: "M", name: "Tivra Madhyam", latin: "Ma", devanagari: "म", kind: "tivra", etCents: 600, justRatio: [45, 32] },
  { code: "P", name: "Pancham", latin: "Pa", devanagari: "प", kind: "achal", etCents: 700, justRatio: [3, 2] },
  { code: "d", name: "Komal Dhaivat", latin: "Dha", devanagari: "ध", kind: "komal", etCents: 800, justRatio: [8, 5] },
  { code: "D", name: "Shuddha Dhaivat", latin: "Dha", devanagari: "ध", kind: "shuddha", etCents: 900, justRatio: [5, 3] },
  { code: "n", name: "Komal Nishad", latin: "Ni", devanagari: "नि", kind: "komal", etCents: 1000, justRatio: [9, 5] },
  { code: "N", name: "Shuddha Nishad", latin: "Ni", devanagari: "नि", kind: "shuddha", etCents: 1100, justRatio: [15, 8] },
];

const SWARA_BY_CODE = new Map<SwaraCode, Swara>(SWARAS.map((s) => [s.code, s]));

export const CENTS_PER_OCTAVE = 1200;

export function getSwara(code: SwaraCode): Swara {
  const swara = SWARA_BY_CODE.get(code);
  if (!swara) throw new Error(`Unknown swara code: ${code}`);
  return swara;
}

export function hzToCents(hz: number, saHz: number): number {
  return 1200 * Math.log2(hz / saHz);
}

export function centsToHz(cents: number, saHz: number): number {
  return saHz * 2 ** (cents / 1200);
}

/** Cents above Sa within the madhya saptak, shifted by `octave` (-1 mandra, 0 madhya, 1 taar). */
export function swaraCents(code: SwaraCode, tuning: TuningSystem, octave = 0): number {
  const swara = getSwara(code);
  const withinOctave =
    tuning === "just" ? 1200 * Math.log2(swara.justRatio[0] / swara.justRatio[1]) : swara.etCents;
  return withinOctave + octave * CENTS_PER_OCTAVE;
}

/** Display label with komal/tivra marked by a simple suffix, e.g. { devanagari: "रे (k)", latin: "Re (k)" }. */
export function swaraLabel(code: SwaraCode): { devanagari: string; latin: string } {
  const { devanagari, latin, kind } = getSwara(code);
  const suffix = kind === "komal" ? " (k)" : kind === "tivra" ? " (t)" : "";
  return { devanagari: devanagari + suffix, latin: latin + suffix };
}

export interface NearestSwara {
  code: SwaraCode;
  /** -1 mandra, 0 madhya, 1 taar. */
  octave: number;
  /** Absolute cents of the swara relative to Sa (includes the octave). */
  targetCents: number;
  /** cents - targetCents, within -600..600. */
  offsetCents: number;
}

export function nearestSwara(cents: number, tuning: TuningSystem): NearestSwara {
  const octave = Math.floor(cents / CENTS_PER_OCTAVE);
  const position = cents - octave * CENTS_PER_OCTAVE;

  let best: { code: SwaraCode; octave: number; distance: number } | undefined;
  for (const { code } of SWARAS) {
    const distance = Math.abs(position - swaraCents(code, tuning));
    if (!best || distance < best.distance) best = { code, octave, distance };
  }
  // The upper Sa is the closest candidate for positions just below the octave boundary.
  if (best && Math.abs(position - CENTS_PER_OCTAVE) < best.distance) {
    best = { code: "S", octave: octave + 1, distance: 0 };
  }
  if (!best) throw new Error("SWARAS is empty");

  const targetCents = swaraCents(best.code, tuning, best.octave);
  return { code: best.code, octave: best.octave, targetCents, offsetCents: cents - targetCents };
}
