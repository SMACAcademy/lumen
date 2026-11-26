import { describe, expect, it } from "vitest";
import { crossover, gibbsModel, QUADRANT, quadrantOf, type GibbsParams } from "./gibbs";

const ICE: GibbsParams = { dH: 6.01, dS: 22 };
const derive = (params: GibbsParams, T: number) => gibbsModel.derive({ T }, params);

describe("ΔG = ΔH − TΔS", () => {
  it("melts ice above 273 K and not below", () => {
    expect(derive(ICE, 263).spontaneous).toBe(0);
    expect(derive(ICE, 283).spontaneous).toBe(1);
    expect(crossover(ICE.dH, ICE.dS)).toBeCloseTo(273.2, 0);
  });

  it("puts the entropy term on the same footing as ΔH, in kJ", () => {
    const r = derive(ICE, 300);
    expect(r.TdS).toBeCloseTo(6.6, 9);
    expect(r.dG).toBeCloseTo(6.01 - 6.6, 9);
  });

  it("decomposes limestone only above about 1100 K", () => {
    expect(crossover(178, 161)).toBeCloseTo(1105.6, 0);
    expect(derive({ dH: 178, dS: 161 }, 1000).spontaneous).toBe(0);
    expect(derive({ dH: 178, dS: 161 }, 1200).spontaneous).toBe(1);
  });
});

describe("the four kinds of reaction", () => {
  it("sorts reactions by the signs of ΔH and ΔS", () => {
    expect(quadrantOf(-890, 50)).toBe(QUADRANT.always);
    expect(quadrantOf(50, -50)).toBe(QUADRANT.never);
    expect(quadrantOf(-92.2, -198.7)).toBe(QUADRANT.lowT);
    expect(quadrantOf(178, 161)).toBe(QUADRANT.highT);
  });

  it("has no crossover when the signs agree on the answer", () => {
    expect(crossover(-890, 50)).toBe(-1);
    expect(crossover(50, -50)).toBe(-1);
  });

  it("makes the Haber process spontaneous only below about 464 K", () => {
    expect(crossover(-92.2, -198.7)).toBeCloseTo(464, 0);
    expect(derive({ dH: -92.2, dS: -198.7 }, 400).spontaneous).toBe(1);
    expect(derive({ dH: -92.2, dS: -198.7 }, 600).spontaneous).toBe(0);
  });
});

describe("ΔG° = −RT ln K", () => {
  it("gives K = 1 exactly where ΔG = 0", () => {
    const T = crossover(ICE.dH, ICE.dS);
    expect(derive(ICE, T).log10K).toBeCloseTo(0, 6);
  });

  it("gives the Haber process K of about 6 × 10⁵ at 298 K", () => {
    const r = derive({ dH: -92.2, dS: -198.7 }, 298);
    expect(r.dG).toBeCloseTo(-33.0, 1);
    expect(r.log10K).toBeCloseTo(5.78, 1);
  });
});

describe("the thermometer", () => {
  it("warms when played and steps ten kelvin, within its range", () => {
    expect(gibbsModel.advance({ T: 250 }, 1, ICE).T).toBe(350);
    expect(gibbsModel.advance({ T: 1950 }, 5, ICE).T).toBe(2000);
    expect(gibbsModel.step({ T: 273 }, ICE, 1).T).toBe(280);
    expect(gibbsModel.setVariable({ T: 300 }, "T", 5, ICE).T).toBe(100);
  });
});
