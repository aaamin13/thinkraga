import { describe, expect, it } from "vitest";
import { PitchSmoother } from "@/lib/audio/smoothing";

describe("PitchSmoother", () => {
  it("passes a steady pitch through unchanged", () => {
    const s = new PitchSmoother();
    let out = s.push(140);
    for (let i = 0; i < 10; i++) out = s.push(140);
    expect(out.medianHz).toBe(140);
    expect(out.smoothedHz).toBeCloseTo(140, 9);
  });

  it("median removes a single octave glitch", () => {
    const s = new PitchSmoother();
    [140, 140, 140, 140].forEach((hz) => s.push(hz));
    expect(s.push(280).medianHz).toBe(140);
  });

  it("EMA moves 35% of the way (in log-frequency) toward a new pitch", () => {
    const s = new PitchSmoother();
    for (let i = 0; i < 5; i++) s.push(100);
    // Enough 200 Hz readings to flip the median, then the EMA follows it.
    s.push(200);
    s.push(200);
    const out = s.push(200);
    expect(out.medianHz).toBe(200);
    expect(out.smoothedHz).toBeGreaterThan(100);
    expect(out.smoothedHz).toBeLessThan(200);
  });

  it("returns nulls for invalid frames and starts fresh after a long gap", () => {
    const s = new PitchSmoother();
    for (let i = 0; i < 5; i++) s.push(100);
    expect(s.push(null)).toEqual({ rawHz: null, medianHz: null, smoothedHz: null });
    for (let i = 0; i < 8; i++) s.push(null);
    expect(s.push(200).smoothedHz).toBeCloseTo(200, 9);
  });
});
