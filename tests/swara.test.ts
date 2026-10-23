import { describe, expect, it } from "vitest";
import {
  NOTE_OPTIONS,
  SWARAS,
  centsToHz,
  hzToCents,
  nearestSwara,
  resolveSaHz,
  swaraCents,
  swaraLabel,
} from "@/lib/music/swara";

const SA = 138.59;

describe("hzToCents / centsToHz", () => {
  it("measures cents relative to Sa", () => {
    expect(hzToCents(SA, SA)).toBeCloseTo(0, 9);
    expect(hzToCents(SA * 2, SA)).toBeCloseTo(1200, 9);
    expect(hzToCents(SA / 2, SA)).toBeCloseTo(-1200, 9);
  });

  it("round-trips", () => {
    expect(centsToHz(hzToCents(200, SA), SA)).toBeCloseTo(200, 9);
  });
});

describe("swaraCents", () => {
  it("has 12 swaras with ET cents at multiples of 100", () => {
    expect(SWARAS).toHaveLength(12);
    SWARAS.forEach((s, i) => expect(swaraCents(s.code, "et")).toBe(i * 100));
  });

  it("derives just cents from ratios", () => {
    expect(swaraCents("P", "just")).toBeCloseTo(701.955, 3);
    expect(swaraCents("G", "just")).toBeCloseTo(386.314, 3);
    expect(swaraCents("M", "just")).toBeCloseTo(590.224, 3);
  });

  it("shifts by octave", () => {
    expect(swaraCents("S", "et", 1)).toBe(1200);
    expect(swaraCents("P", "et", -1)).toBe(-500);
  });
});

describe("nearestSwara", () => {
  it("maps Sa to S with 0 offset", () => {
    expect(nearestSwara(hzToCents(SA, SA), "et")).toMatchObject({ code: "S", octave: 0, offsetCents: 0 });
  });

  it("maps Sa * 9/8 to R: about +4 cents in ET, 0 in just", () => {
    const cents = hzToCents((SA * 9) / 8, SA);
    const et = nearestSwara(cents, "et");
    expect(et.code).toBe("R");
    expect(et.offsetCents).toBeCloseTo(3.91, 1);
    const just = nearestSwara(cents, "just");
    expect(just.code).toBe("R");
    expect(just.offsetCents).toBeCloseTo(0, 9);
  });

  it("maps Sa * 2 to S in octave 1 and Sa / 2 to S in octave -1", () => {
    expect(nearestSwara(hzToCents(SA * 2, SA), "et")).toMatchObject({ code: "S", octave: 1, offsetCents: 0 });
    expect(nearestSwara(hzToCents(SA / 2, SA), "et")).toMatchObject({ code: "S", octave: -1, offsetCents: 0 });
  });

  it("wraps 3 cents below the upper Sa to S octave 1 with offset -3", () => {
    const result = nearestSwara(1197, "et");
    expect(result).toMatchObject({ code: "S", octave: 1, targetCents: 1200 });
    expect(result.offsetCents).toBeCloseTo(-3, 9);
  });

  it("wraps just below Sa into the lower octave's Sa", () => {
    const result = nearestSwara(-3, "et");
    expect(result).toMatchObject({ code: "S", octave: 0 });
    expect(result.offsetCents).toBeCloseTo(-3, 9);
    const below = nearestSwara(-1203, "et");
    expect(below).toMatchObject({ code: "S", octave: -1 });
    expect(below.offsetCents).toBeCloseTo(-3, 9);
  });

  it("detects komal swaras", () => {
    expect(nearestSwara(hzToCents((SA * 6) / 5, SA), "just")).toMatchObject({ code: "g", offsetCents: 0 });
    expect(nearestSwara(hzToCents((SA * 16) / 15, SA), "just").code).toBe("r");
    expect(nearestSwara(1000, "et").code).toBe("n");
    expect(nearestSwara(800, "et").code).toBe("d");
  });

  it("detects tivra Ma", () => {
    expect(nearestSwara(hzToCents((SA * 45) / 32, SA), "just")).toMatchObject({ code: "M", offsetCents: 0 });
    expect(nearestSwara(600, "et").code).toBe("M");
    expect(nearestSwara(500, "et").code).toBe("m");
  });

  it("keeps the offset within ±600 across the whole range", () => {
    for (let c = -1500; c <= 2500; c += 7) {
      for (const tuning of ["et", "just"] as const) {
        const { offsetCents } = nearestSwara(c, tuning);
        expect(Math.abs(offsetCents)).toBeLessThanOrEqual(600);
      }
    }
  });

  it("is consistent: targetCents + offsetCents === cents", () => {
    const r = nearestSwara(1450.5, "just");
    expect(r.targetCents + r.offsetCents).toBeCloseTo(1450.5, 9);
    expect(r.octave).toBe(1);
  });
});

describe("swaraLabel", () => {
  it("marks komal and tivra with a suffix", () => {
    expect(swaraLabel("S")).toEqual({ native: "सा", latin: "Sa" });
    expect(swaraLabel("R")).toEqual({ native: "रे", latin: "Re" });
    expect(swaraLabel("r")).toEqual({ native: "रे (k)", latin: "Re (k)" });
    expect(swaraLabel("M")).toEqual({ native: "म (t)", latin: "Ma (t)" });
  });

  it("supports Bangla names", () => {
    const names = ["S", "R", "G", "m", "P", "D", "N"] as const;
    expect(names.map((c) => swaraLabel(c, "bengali").native).join(" ")).toBe("সা রে গা মা পা ধা নি");
    expect(swaraLabel("g", "bengali")).toEqual({ native: "গা (k)", latin: "Ga (k)" });
    expect(swaraLabel("M", "bengali")).toEqual({ native: "মা (t)", latin: "Ma (t)" });
  });
});

describe("NOTE_OPTIONS", () => {
  it("spans G2 to D4 with A4 = 440 Hz equal temperament", () => {
    expect(NOTE_OPTIONS[0]).toMatchObject({ id: "G2", label: "G2 · 98.0 Hz" });
    expect(NOTE_OPTIONS.at(-1)).toMatchObject({ id: "D4", label: "D4 · 293.7 Hz" });
    expect(NOTE_OPTIONS).toHaveLength(20);
  });

  it("resolves the default Sa", () => {
    expect(resolveSaHz("C#3", 0)).toBeCloseTo(138.59, 2);
    expect(resolveSaHz("A2", 0)).toBeCloseTo(110, 9);
  });
});
