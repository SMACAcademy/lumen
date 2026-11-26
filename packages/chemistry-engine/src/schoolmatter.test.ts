import { describe, expect, it } from "vitest";
import {
  SCHOOL_METHOD_ORDER,
  SCHOOL_MIXTURE_ORDER,
  SCHOOL_MIXTURES,
  SCHOOL_OBJECT_ORDER,
  SCHOOL_SOLUTE_ORDER,
  schoolDiffusionRatio,
  schoolEvaporationRate,
  type SchoolMatterParams,
  type SchoolMatterState,
  schoolMatterModel as model,
  schoolParticleSpeed,
  schoolSolubility,
  schoolVapourPressure,
  schoolWaterViscosity,
  schoolWetBulb,
  separationReason,
} from "./schoolmatter";

const base: SchoolMatterState = model.initialize(model.defaultParams);
const derive = (params: Partial<SchoolMatterParams> = {}, state: Partial<SchoolMatterState> = {}) =>
  model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });

describe("materials", () => {
  it("knows which objects are lustrous, hard and see-through", () => {
    expect(derive({ object: "nail" })).toMatchObject({ lustrous: 1, hard: 1, see: 0 });
    expect(derive({ object: "cork" })).toMatchObject({ lustrous: 0, hard: 0, see: 0 });
    expect(derive({ object: "marble" })).toMatchObject({ lustrous: 0, see: 2 });
    expect(derive({ object: "frosted" }).see).toBe(1);
    expect(derive({ object: "butter-paper" }).see).toBe(1);
  });

  it("floats an object only when it is less dense than water", () => {
    expect(derive({ object: "wood" })).toMatchObject({ density: 0.6, floats: 1 });
    expect(derive({ object: "candle" })).toMatchObject({ density: 0.9, floats: 1 });
    expect(derive({ object: "eraser" })).toMatchObject({ density: 1.2, floats: 0 });
    expect(derive({ object: "coin" }).floats).toBe(0);
  });
});

describe("dissolving", () => {
  it("uses NCERT's table: 36 g of salt and 32 g of potassium nitrate in 100 g of water at 20 °C", () => {
    expect(schoolSolubility("salt", 20)).toBe(36);
    expect(schoolSolubility("kno3", 20)).toBe(32);
    expect(schoolSolubility("kno3", 80)).toBe(167);
    expect(schoolSolubility("sugar", 20)).toBe(204);
  });

  it("joins the table with straight lines, and holds the ends", () => {
    expect(schoolSolubility("kno3", 30)).toBeCloseTo(47, 10); // halfway from 32 to 62
    expect(schoolSolubility("kno3", 70)).toBeCloseTo(136.5, 10);
    expect(schoolSolubility("kno3", 5)).toBe(21);
  });

  it("dissolves only up to the solubility, and leaves the rest at the bottom", () => {
    const r = derive({ solute: "salt" }, { added: 40, water: 100, waterTemp: 20 });
    expect(r).toMatchObject({ canDissolve: 36, dissolved: 36, undissolved: 4, saturated: 1 });
    expect(r.strength).toBeCloseTo((36 / 136) * 100, 10);
    expect(derive({ solute: "salt" }, { added: 30 })).toMatchObject({ dissolved: 30, undissolved: 0, saturated: 0 });
    expect(derive({ solute: "salt" }, { added: 36 }).saturated).toBe(1);
  });

  it("scales with the water: NCERT's 31 g of potassium nitrate in 50 g of water at 313 K", () => {
    expect(derive({ solute: "kno3" }, { water: 50, waterTemp: 40 }).canDissolve).toBeCloseTo(31, 10);
  });

  it("lets warm water dissolve far more potassium nitrate, but hardly more salt", () => {
    expect(derive({ solute: "kno3" }, { waterTemp: 60 }).solubility / derive({ solute: "kno3" }, { waterTemp: 20 }).solubility).toBeCloseTo(106 / 32, 10);
    expect(derive({ solute: "salt" }, { waterTemp: 60 }).solubility).toBe(37);
  });

  it("never dissolves sand or chalk, and never calls them saturated", () => {
    for (const solute of ["sand", "chalk"] as const) {
      expect(derive({ solute }, { added: 20 })).toMatchObject({ soluble: 0, dissolved: 0, undissolved: 20, saturated: 0, strength: 0 });
    }
    for (const solute of ["salt", "sugar", "kno3"] as const) expect(derive({ solute }).soluble).toBe(1);
  });
});

describe("separating", () => {
  it("matches each mixture with its method", () => {
    const best = (mixture: SchoolMatterParams["mixture"]) => SCHOOL_METHOD_ORDER[derive({ mixture }).best];
    expect(best("stones-rice")).toBe("handpick");
    expect(best("husk-wheat")).toBe("winnow");
    expect(best("bran-flour")).toBe("sieve");
    expect(best("pebbles-sand")).toBe("sieve");
    expect(best("sand-water")).toBe("decant");
    expect(best("salt-water")).toBe("evaporate");
    expect(best("iron-sand")).toBe("magnet");
  });

  it("says filtering cannot get dissolved salt out, but evaporating can", () => {
    expect(derive({ mixture: "salt-water", method: "filter" }).suits).toBe(0);
    expect(derive({ mixture: "salt-water", method: "evaporate" }).suits).toBe(1);
    expect(derive({ mixture: "sand-water", method: "filter" }).suits).toBe(1);
    expect(separationReason("salt-water", "filter")).toContain("through the paper");
    expect(separationReason("stones-rice", "magnet")).toContain("magnet");
    expect(separationReason("bran-flour", "filter")).toContain("no liquid");
  });

  it("has a short reason for every pair", () => {
    for (const mixture of SCHOOL_MIXTURE_ORDER) {
      expect(SCHOOL_MIXTURES[mixture].suits.length).toBeGreaterThan(0);
      for (const method of SCHOOL_METHOD_ORDER) {
        const reason = separationReason(mixture, method);
        expect(reason.length, `${mixture} ${method}`).toBeLessThanOrEqual(50);
      }
    }
  });
});

describe("rusting", () => {
  it("needs both air and water on bare iron", () => {
    expect(derive({ tube: "open", coating: "none" }, { days: 8 })).toMatchObject({ air: 1, wet: 1, rusts: 1 });
    expect(derive({ tube: "open" }, { days: 8 }).rustCover).toBeCloseTo(100 * (1 - Math.exp(-1)), 10);
    expect(derive({ tube: "dry" }, { days: 8 })).toMatchObject({ air: 1, wet: 0, rusts: 0, rustCover: 0 });
    expect(derive({ tube: "boiled" }, { days: 8 })).toMatchObject({ air: 0, wet: 1, rusts: 0, rustCover: 0 });
  });

  it("is stopped by paint, grease and zinc", () => {
    for (const coating of ["paint", "grease", "zinc"] as const) expect(derive({ tube: "open", coating }, { days: 30 }).rustCover).toBe(0);
  });
});

describe("particles", () => {
  it("sets the state of water by its temperature", () => {
    expect([-5, 0, 50, 99, 100, 120].map((temp) => derive({}, { temp }).phase)).toEqual([0, 1, 1, 1, 2, 2]);
  });

  it("moves particles at √(8RT/πM): about 587 m/s at 20 °C", () => {
    expect(schoolParticleSpeed(20)).toBeCloseTo(Math.sqrt((8 * 8.314 * 293.15) / (Math.PI * 0.018)), 10);
    expect(derive({}, { temp: 20 }).speed).toBeCloseTo(587.2, 1);
    expect(derive({}, { temp: 100 }).speed).toBeCloseTo(662.5, 1);
  });

  it("spaces gas particles about 13 widths apart at 100 °C; solids and liquids touch", () => {
    expect(derive({}, { temp: 100 }).spacing).toBeCloseTo(13.2, 1);
    expect(derive({}, { temp: 50 }).spacing).toBe(1);
    expect(derive({}, { temp: -10 }).spacing).toBe(1);
  });

  it("spreads ink about 3.4 times faster at 80 °C than at 20 °C", () => {
    expect(schoolWaterViscosity(20)).toBeCloseTo(1.0e-3, 5);
    expect(schoolDiffusionRatio(20)).toBeCloseTo(1, 12);
    expect(derive({}, { inkTemp: 80 }).diffusion).toBeCloseTo(3.44, 2);
    expect(derive({}, { inkTemp: 5 }).diffusion).toBeLessThan(1);
  });
});

describe("evaporation", () => {
  it("works out the rate by hand: 2.04 g an hour from 100 cm² at 25 °C, still air, 60 %", () => {
    const ps = schoolVapourPressure(25);
    expect(ps).toBeCloseTo(3162, 0);
    const x = (p: number) => (0.622 * p) / (101325 - p);
    const byHand = 25 * 0.01 * (x(ps) - x(0.6 * ps)) * 1000;
    expect(schoolEvaporationRate(100, 25, 0, 60)).toBeCloseTo(byHand, 10);
    expect(derive().evapRate).toBeCloseTo(2.04, 2);
    expect(derive().dryTime).toBeCloseTo(100 / 2.0416, 1);
  });

  it("goes faster with more surface, heat, wind or drier air", () => {
    const r0 = derive().evapRate;
    expect(derive({}, { area: 500 }).evapRate).toBeCloseTo(5 * r0, 10);
    expect(derive({}, { wind: 3 }).evapRate).toBeCloseTo((82 / 25) * r0, 10);
    expect(derive({}, { airTemp: 40 }).evapRate).toBeGreaterThan(r0);
    expect(derive({}, { humidity: 30 }).evapRate).toBeGreaterThan(r0);
    expect(derive({}, { humidity: 90 }).evapRate).toBeLessThan(r0);
  });

  it("cools a wet surface to the wet-bulb temperature, more in dry air", () => {
    expect(schoolWetBulb(20, 50)).toBeCloseTo(13.7, 1); // Stull's own example
    const dry = derive({}, { airTemp: 40, humidity: 20 });
    expect(dry.wetBulb).toBeCloseTo(22.7, 1);
    expect(dry.coolingBy).toBeCloseTo(17.3, 1);
    expect(derive({}, { airTemp: 30, humidity: 90 }).coolingBy).toBeLessThan(derive({}, { airTemp: 30, humidity: 30 }).coolingBy);
  });
});

describe("the model", () => {
  it("lets time pass on play, and stops at the ends", () => {
    let s = model.initialize(model.defaultParams);
    for (let i = 0; i < 100; i++) s = model.advance(s, 1, model.defaultParams);
    expect(s).toMatchObject({ days: 30, clock: 60 });
    expect(model.step(base, model.defaultParams, 1).added).toBe(1);
    expect(model.step(base, model.defaultParams, -1).added).toBe(0);
  });

  it("keeps every control in range and numbers every output", () => {
    let s = model.initialize(model.defaultParams);
    for (const [id, value] of [["added", 999], ["water", 1], ["waterTemp", 200], ["days", -4], ["temp", -300], ["inkTemp", 500], ["clock", 1e6], ["area", 0], ["airTemp", 99], ["wind", -1], ["humidity", 100]] as const) {
      s = model.setVariable(s, id, value, model.defaultParams);
    }
    expect(s).toEqual({ added: 400, water: 50, waterTemp: 80, days: 0, temp: -20, inkTemp: 90, clock: 60, area: 10, airTemp: 45, wind: 0, humidity: 95 });
    expect(model.setVariable(s, "nonsense", 3, model.defaultParams)).toBe(s);
    for (const object of SCHOOL_OBJECT_ORDER) {
      for (const solute of SCHOOL_SOLUTE_ORDER) {
        const r = model.derive(s, { ...model.defaultParams, object, solute });
        for (const key of model.outputs) {
          expect(Number.isFinite(r[key]), `${object} ${solute} ${key}`).toBe(true);
          expect(Object.is(r[key], -0), key).toBe(false);
        }
      }
    }
  });
});
