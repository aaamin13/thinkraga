// Pure scoring logic: no browser APIs. Step 6 adds the hold tracker and score functions.

/** Tolerance bands in cents (configurable). */
export const TOLERANCE = {
  perfect: 15,
  close: 30,
  wrong: 50,
} as const;
