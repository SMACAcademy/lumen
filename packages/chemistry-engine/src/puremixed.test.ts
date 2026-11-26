import { describe, expect, it } from "vitest";
import {
  mixtureModel as model,
  PURE_COLLOID_ORDER,
  PURE_COLLOIDS,
  PURE_LIQUID_ORDER,
  PURE_LIQUIDS,
  PURE_SAMPLE_ORDER,
  pureColloidType,
  pureIronSulphur,
  pureLiquidKind,
  pureSettlingSpeed,
  type PureMixedParams,
  type PureMixedState,
} from "./puremixed";

const base = model.initialize(model.defaultParams);
const derive = (params: Partial<PureMixedParams> = {}, state: Partial<PureMixedState> = {}) =>
  model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });

describe("pure substances and mixtures", () => {
  it("calls elements and compounds pure, and everything else a mixture", () => {
    expect(derive({ sample: "gold" })).toMatchObject({ sampleKind: 0, pure: 1, fixedPoint: 1, separable: 0 });
    expect(derive({ sample: "water" })).toMatchObject({ sampleKind: 1, pure: 1, homogeneous: 1 });
    expect(derive({ sample: "brass" })).toMatchObject({ sampleKind: 2, pure: 0, homogeneous: 1, separable: 1, fixedPoint: 0 });
    expect(derive({ sample: "soil" })).toMatchObject({ sampleKind: 3, pure: 0, homogeneous: 0 });
  });

  it("files iron and sulphur mixed as a heterogeneous mixture, but iron sulphide as a compound", () => {
    expect(derive({ sample: "iron-sulphur" }).sampleKind).toBe(3);
    expect(derive({ sample: "iron-sulphide" }).sampleKind).toBe(1);
  });

  it("numbers every sample by its place in the list", () => {
    PURE_SAMPLE_ORDER.forEach((sample, i) => expect(derive({ sample }).sample).toBe(i));
  });
});

describe("iron and sulphur", () => {
  it("leaves everything free when only mixed: the magnet pulls out all the iron", () => {
    expect(derive({ fes: "mixed" }, { iron: 7, sulphur: 4 })).toMatchObject({ heated: 0, fesMass: 0, magnetPulls: 7, cs2Dissolves: 4, acidGas: 1, looks: 0 });
  });

  it("joins 7 g of iron with 4 g of sulphur exactly, 56 : 32", () => {
    expect(derive({ fes: "heated" }, { iron: 7, sulphur: 4 })).toMatchObject({ fesMass: 11, ironLeft: 0, sulphurLeft: 0, magnetPulls: 0, cs2Dissolves: 0, acidGas: 2, looks: 1 });
  });

  it("leaves the extra iron over: 10 g with 4 g gives 11 g of iron sulphide and 3 g of iron", () => {
    const r = derive({ fes: "heated" }, { iron: 10, sulphur: 4 });
    expect(r).toMatchObject({ ironReacted: 7, sulphurReacted: 4, fesMass: 11, magnetPulls: 3, acidGas: 3, looks: 2 });
  });

  it("uses all of NCERT's 5 g of iron with 3 g of sulphur, leaving 1/7 g of sulphur", () => {
    const r = pureIronSulphur(5, 3, true);
    // 5 g of iron takes 5 × 32/56 = 2.857 g of sulphur and makes 5 × 88/56 = 7.857 g of FeS.
    expect(r.sulphurReacted).toBeCloseTo(2.857143, 5);
    expect(r.fesMass).toBeCloseTo(7.857143, 5);
    expect(r.sulphurLeft).toBeCloseTo(0.142857, 5);
    expect(r.ironLeft).toBe(0);
  });

  it("never gains or loses mass", () => {
    for (const [iron, sulphur] of [[1, 9], [7, 4], [14, 0.5], [3.5, 2]] as const) {
      const r = derive({ fes: "heated" }, { iron, sulphur });
      expect(r.fesMass + r.ironLeft + r.sulphurLeft).toBeCloseTo(iron + sulphur, 9);
    }
  });
});

describe("the strength of a solution", () => {
  it("works NCERT's example: 40 g of salt in 320 g of water is 11.1% by mass", () => {
    const r = derive({ solute: "salt" }, { soluteMass: 40, water: 320, temp: 20 });
    expect(r.solutionMass).toBe(360);
    expect(r.massPercent).toBeCloseTo(11.111, 3);
    expect(r.saturated).toBe(0);
  });

  it("makes a saturated salt solution at 20 °C 36 ÷ 136 = 26.5%, the strongest it can be", () => {
    const r = derive({ solute: "salt" }, { soluteMass: 50, water: 100, temp: 20 });
    expect(r).toMatchObject({ dissolved: 36, undissolved: 14, saturated: 1, solutionMass: 136 });
    expect(r.massPercent).toBeCloseTo(26.47, 2);
    expect(r.maxPercent).toBeCloseTo(26.47, 2);
  });

  it("lets warm water hold a far stronger potassium nitrate solution", () => {
    expect(derive({ solute: "kno3" }, { temp: 20 }).maxPercent).toBeCloseTo((32 / 132) * 100, 9);
    expect(derive({ solute: "kno3" }, { temp: 60 }).maxPercent).toBeCloseTo((106 / 206) * 100, 9);
  });

  it("weakens a solution when water is added: 20 g of salt in 100 g, then 200 g", () => {
    expect(derive({}, { soluteMass: 20, water: 100 }).massPercent).toBeCloseTo(16.667, 3);
    expect(derive({}, { soluteMass: 20, water: 200 }).massPercent).toBeCloseTo(9.091, 3);
  });

  it("makes 10 g of salt in 90 g of water a 10% solution", () => {
    expect(derive({}, { soluteMass: 10, water: 90 }).massPercent).toBeCloseTo(10, 9);
  });

  it("gives grams in every 100 mL by volume: 4.5 g in 500 mL is 0.9%, like a saline drip", () => {
    expect(derive({}, { flaskMass: 4.5, volume: 500 }).massByVolume).toBeCloseTo(0.9, 9);
    expect(derive({}, { flaskMass: 9, volume: 1000 }).massByVolume).toBeCloseTo(0.9, 9);
  });

  it("returns 0, not NaN, with no solute", () => {
    expect(derive({}, { soluteMass: 0, water: 50 })).toMatchObject({ massPercent: 0, saturated: 0, undissolved: 0 });
  });
});

describe("solutions, colloids and suspensions", () => {
  it("sorts by particle size: under 1 nm, 1 to 1000 nm, over 1000 nm", () => {
    expect([0.3, 1, 1000, 1001].map(pureLiquidKind)).toEqual([0, 1, 1, 2]);
    expect(derive({ liquid: "salt-solution" })).toMatchObject({ liquidKind: 0, scatters: 0, passesFilter: 1, liquidHomogeneous: 1 });
    expect(derive({ liquid: "milk" })).toMatchObject({ liquidKind: 1, scatters: 1, passesFilter: 1, liquidHomogeneous: 0 });
    expect(derive({ liquid: "chalk" })).toMatchObject({ liquidKind: 2, scatters: 1, passesFilter: 0, liquidHomogeneous: 0 });
  });

  it("settles chalk by Stokes' law: 10 µm grains fall 5 cm in about 9 minutes", () => {
    // v = 2 × 1700 × 9.8 × (5 × 10⁻⁶)² ÷ (9 × 10⁻³) = 9.256 × 10⁻⁵ m/s; 0.05 m ÷ v = 540 s.
    expect(pureSettlingSpeed(10_000, 2700)).toBeCloseTo(9.2556e-5, 8);
    expect(derive({ liquid: "chalk" }).settleMinutes).toBeCloseTo(9.0036, 3);
    expect(derive({ liquid: "chalk" }, { minutes: 3 }).settled).toBeCloseTo(33.32, 1);
    expect(derive({ liquid: "chalk" }, { minutes: 9 }).clear).toBe(0);
    expect(derive({ liquid: "chalk" }, { minutes: 10 })).toMatchObject({ settled: 100, clear: 1 });
  });

  it("settles bigger grains faster: sand, then mud, then chalk", () => {
    const t = (liquid: PureMixedParams["liquid"]) => derive({ liquid }).settleMinutes;
    expect(t("sand")).toBeLessThan(t("mud"));
    expect(t("mud")).toBeLessThan(t("chalk"));
    expect(t("mud")).toBeCloseTo(2.32, 2);
  });

  it("leaves a colloid spread out after an hour, and a solution never settles", () => {
    expect(derive({ liquid: "milk" }, { minutes: 60 }).settled).toBeLessThan(0.01);
    expect(derive({ liquid: "salt-solution" }, { minutes: 60 })).toMatchObject({ settled: 0, settleMinutes: 0, clear: 0 });
  });

  it("lists every liquid's size in a believable order for its kind", () => {
    for (const id of PURE_LIQUID_ORDER) expect(Number.isFinite(derive({ liquid: id }).settled), id).toBe(true);
    expect(PURE_LIQUIDS.soap.size).toBeLessThan(PURE_LIQUIDS.milk.size);
  });
});

describe("kinds of colloid", () => {
  it("follows NCERT's table", () => {
    const type = (id: (typeof PURE_COLLOID_ORDER)[number]) => pureColloidType(PURE_COLLOIDS[id].dispersed, PURE_COLLOIDS[id].medium);
    expect(["fog", "cloud", "smoke"].map((id) => type(id as "fog"))).toEqual([0, 0, 0]);
    expect([type("shaving-cream"), type("foam-rubber"), type("sponge")]).toEqual([1, 1, 1]);
    expect([type("milk"), type("face-cream")]).toEqual([2, 2]);
    expect(type("milk-of-magnesia")).toBe(3);
    expect([type("jelly"), type("cheese"), type("butter")]).toEqual([4, 4, 4]);
    expect([type("gemstone"), type("milky-glass")]).toEqual([5, 5]);
  });

  it("reports the phases of fog: liquid droplets in a gas", () => {
    expect(derive({ colloid: "fog" })).toMatchObject({ dispersed: 1, medium: 2, colloidType: 0 });
  });
});

describe("the model contract", () => {
  it("clamps every variable to its control's range", () => {
    let s = model.setVariable(base, "iron", 99, model.defaultParams);
    s = model.setVariable(s, "water", 1, model.defaultParams);
    s = model.setVariable(s, "minutes", -5, model.defaultParams);
    expect(s).toMatchObject({ iron: 14, water: 50, minutes: 0 });
    expect(model.setVariable(base, "nonsense", 1, model.defaultParams)).toBe(base);
  });

  it("lets time pass with play", () => {
    expect(model.advance(base, 2.5, model.defaultParams).minutes).toBe(2.5);
    expect(model.step(base, model.defaultParams, 1).minutes).toBe(1);
  });

  it("gives a finite number for every output, everywhere", () => {
    for (const liquid of PURE_LIQUID_ORDER) {
      for (const sample of PURE_SAMPLE_ORDER) {
        const r = derive({ liquid, sample, fes: "heated" }, { soluteMass: 0, flaskMass: 0, minutes: 60 });
        for (const key of model.outputs) {
          expect(Number.isFinite(r[key]), key).toBe(true);
          expect(Object.is(r[key], -0), key).toBe(false);
        }
      }
    }
  });
});
