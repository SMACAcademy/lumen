import { describe, expect, it } from "vitest";
import { equivalenceVolume, INDICATOR_ORDER, pHAt, titrationModel, volumeAtPH, type TitrationParams } from "./titration";

const STRONG: TitrationParams = { acid: "hcl", Ca: 0.1, Cb: 0.1, indicator: "phenolphthalein" };
const WEAK: TitrationParams = { ...STRONG, acid: "ethanoic" };
const derive = (params: TitrationParams, Vb: number) => titrationModel.derive({ Vb }, params);

describe("a strong acid", () => {
  it("starts at pH 1 for 0.1 M HCl, and pH 2 for 0.01 M", () => {
    expect(derive(STRONG, 0).pH).toBeCloseTo(1, 3);
    expect(derive({ ...STRONG, Ca: 0.01 }, 0).pH).toBeCloseTo(2, 3);
  });

  it("is exactly neutral at the equivalence point", () => {
    expect(equivalenceVolume(STRONG)).toBe(25);
    expect(derive(STRONG, 25).pH).toBeCloseTo(7, 6);
  });

  it("jumps from about 4 to about 10 across the last drops", () => {
    expect(pHAt(STRONG, 24.95)).toBeCloseTo(4.0, 1);
    expect(pHAt(STRONG, 25.05)).toBeCloseTo(10.0, 1);
  });

  it("matches the arithmetic before the end: excess acid over total volume", () => {
    // 20 mL of base leaves 0.5 mmol of acid in 45 mL.
    expect(derive(STRONG, 20).pH).toBeCloseTo(-Math.log10(0.5 / 45), 4);
    expect(derive(STRONG, 20).acidLeft).toBeCloseTo(0.5, 9);
  });

  it("reads pH + pOH = 14 throughout", () => {
    for (const v of [0, 10, 25, 40]) expect(derive(STRONG, v).pH + derive(STRONG, v).pOH).toBeCloseTo(14, 9);
  });
});

describe("a weak acid", () => {
  it("starts less acidic: 0.1 M ethanoic acid is about pH 2.9", () => {
    expect(derive(WEAK, 0).pH).toBeCloseTo(2.88, 1);
  });

  it("sits at pH = pKa when half neutralised", () => {
    expect(derive(WEAK, 12.5).pH).toBeCloseTo(4.76, 2);
    expect(derive(WEAK, 0).pHAtHalf).toBeCloseTo(4.76, 2);
    // …and it does not matter how concentrated the acid was.
    expect(derive({ ...WEAK, Ca: 0.05 }, 6.25).pH).toBeCloseTo(4.76, 1);
  });

  it("has an alkaline equivalence point, because ethanoate is a base", () => {
    expect(derive(WEAK, 25).pH).toBeCloseTo(8.72, 1);
    expect(derive(WEAK, 0).pHAtEquivalence).toBeGreaterThan(8);
  });

  it("follows Henderson–Hasselbalch in the buffer region", () => {
    const r = derive(WEAK, 5); // 5 mL of 25 neutralised: [A⁻]/[HA] = 1/4
    expect(r.pH).toBeCloseTo(4.76 + Math.log10(1 / 4), 2);
    expect(r.buffer).toBe(1);
    expect(derive(STRONG, 5).buffer).toBe(0);
  });
});

describe("indicators", () => {
  it("includes NCERT's everyday indicators, changing colour where they should", () => {
    // Hydrochloric acid, 25 mL at 0.1 M: pH about 1 at 10 mL of base, 7 at 25 mL, 12 at 30 mL.
    const colours = (indicator: TitrationParams["indicator"]) => [10, 25, 30].map((Vb) => derive({ ...STRONG, indicator }, Vb).indicatorColour);
    expect(colours("litmus")).toEqual([0, 1, 2]); // red, purple, blue
    expect(colours("turmeric")).toEqual([0, 0, 2]); // yellow until well into alkali, then reddish-brown
    expect(colours("china-rose")).toEqual([0, 1, 2]); // magenta, then green
    expect(INDICATOR_ORDER.slice(-3)).toEqual(["litmus", "turmeric", "china-rose"]);
  });

  it("changes colour where its range says", () => {
    expect(derive(STRONG, 10).indicatorColour).toBe(0); // colourless phenolphthalein in acid
    expect(derive(STRONG, 30).indicatorColour).toBe(2); // pink in alkali
  });

  it("finds phenolphthalein and methyl orange both fine for strong acid with strong base", () => {
    expect(derive(STRONG, 0).indicatorSuitable).toBe(1);
    expect(derive({ ...STRONG, indicator: "methyl-orange" }, 0).indicatorSuitable).toBe(1);
  });

  it("finds methyl orange useless for a weak acid — it changes colour far too early", () => {
    const r = derive({ ...WEAK, indicator: "methyl-orange" }, 0);
    expect(r.indicatorSuitable).toBe(0);
    expect(r.endpointVolume).toBeLessThan(10);
    expect(derive(WEAK, 0).indicatorSuitable).toBe(1); // phenolphthalein is the right choice
  });

  it("locates the endpoint by where the pH crosses a value", () => {
    expect(pHAt(STRONG, volumeAtPH(STRONG, 7))).toBeCloseTo(7, 3);
  });
});

describe("running the burette", () => {
  it("drips in steadily, stops when empty, and steps half a millilitre", () => {
    expect(titrationModel.advance({ Vb: 0 }, 5, STRONG).Vb).toBe(10);
    expect(titrationModel.advance({ Vb: 49 }, 5, STRONG).Vb).toBe(50);
    expect(titrationModel.step({ Vb: 24.8 }, STRONG, 1).Vb).toBe(25.5);
    expect(titrationModel.setVariable({ Vb: 0 }, "Vb", -3, STRONG).Vb).toBe(0);
  });

  it("moves the equivalence point with the concentrations", () => {
    expect(equivalenceVolume({ ...STRONG, Ca: 0.2 })).toBe(50);
    expect(equivalenceVolume({ ...STRONG, Cb: 0.2 })).toBe(12.5);
  });
});
