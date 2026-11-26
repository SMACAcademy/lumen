import { describe, expect, it } from "vitest";
import { azeotropeOf, LIQUID_PAIRS as P, raoultModel as model, type RaoultParams, vapourPressures } from "./raoult";

const at = (params: Partial<RaoultParams>, xA = 0.5, pressure = 1) => model.derive({ xA, pressure, clock: 0 }, { ...model.defaultParams, ...params });

describe("Raoult's law for an ideal pair", () => {
  it("gives straight lines: pᵢ = xᵢpᵢ*", () => {
    for (const x of [0, 0.25, 0.5, 0.9]) {
      const { pA, pB, total } = vapourPressures(P["benzene-toluene"], x);
      expect(pA).toBeCloseTo(x * 12.7, 12);
      expect(pB).toBeCloseTo((1 - x) * 3.8, 12);
      expect(total).toBeCloseTo(x * 12.7 + (1 - x) * 3.8, 12);
    }
    expect(at({ pair: "benzene-toluene" })).toMatchObject({ deviationSign: 0, azeotrope: 0 });
  });

  it("makes the vapour richer in the more volatile liquid", () => {
    const r = at({ pair: "benzene-toluene" }, 0.5);
    expect(r.yA).toBeGreaterThan(0.5);
    expect(r.yA).toBeCloseTo(12.7 / 16.5, 9);
  });
});

describe("non-ideal pairs", () => {
  it("put acetone–chloroform below Raoult's line and ethanol–water above it", () => {
    expect(at({ pair: "acetone-chloroform" }).deviationSign).toBe(-1);
    expect(at({ pair: "ethanol-water" }).deviationSign).toBe(1);
  });

  it("find azeotropes for the deviating pairs only", () => {
    expect(azeotropeOf(P["acetone-chloroform"])).not.toBeNull();
    expect(azeotropeOf(P["ethanol-water"])).toBeGreaterThan(0.5);
    expect(azeotropeOf(P["hexane-heptane"])).toBeNull();
  });

  it("keep each component's own pressure right at its pure end", () => {
    expect(vapourPressures(P["ethanol-water"], 1).total).toBeCloseTo(7.9, 12);
    expect(vapourPressures(P["ethanol-water"], 0).total).toBeCloseTo(3.2, 12);
  });
});

describe("Henry's law", () => {
  it("dissolves gas in proportion to its pressure, CO₂ far more than N₂", () => {
    expect(at({ gas: "n2" }, 0.5, 4).solubility).toBeCloseTo(4 * at({ gas: "n2" }, 0.5, 1).solubility, 9);
    expect(at({ gas: "co2" }).solubility / at({ gas: "n2" }).solubility).toBeGreaterThan(40);
    expect(at({ gas: "o2" }).mmolPerL).toBeCloseTo((1 / 34860) * 55.5 * 1000, 9);
  });

  it("numbers every output, and Play sweeps the composition", () => {
    expect(model.advance({ xA: 0.95, pressure: 1, clock: 0 }, 0.5, model.defaultParams).xA).toBe(0);
    const r = at({ pair: "ethanol-water", gas: "he" });
    for (const key of model.outputs) expect(Number.isFinite(r[key]), key).toBe(true);
  });
});
