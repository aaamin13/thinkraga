import { swaraCents, type SwaraCode, type TuningSystem } from "@/lib/music/swara";

export interface ExerciseNote {
  code: SwaraCode;
  /** -1 mandra, 0 madhya, 1 taar. */
  octave: number;
}

export interface Exercise {
  id: string;
  name: string;
  notes: readonly ExerciseNote[];
}

export const SA_RE_GA: Exercise = {
  id: "sa-re-ga",
  name: "Sa Re Ga",
  notes: [
    { code: "S", octave: 0 },
    { code: "R", octave: 0 },
    { code: "G", octave: 0 },
  ],
};

/** Absolute cents of a note relative to Sa. */
export function noteTargetCents(note: ExerciseNote, tuning: TuningSystem = "et"): number {
  return swaraCents(note.code, tuning, note.octave);
}
