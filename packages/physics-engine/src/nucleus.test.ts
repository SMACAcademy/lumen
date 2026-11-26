import { describe, expect, it } from "vitest";
import {
  NUC_DECAY_DRAWS,
  NUC_MODEL_PEAK_A,
  NUC_NUCLIDE_ORDER,
  NUC_NUCLIDES,
  NUC_PARENT_ORDER,
  NUC_REACTION_ORDER,
  NUC_SAMPLE,
  nucModelPerNucleon,
  nucleusModel as model,
  type NucleusParams,
  type NucleusState,
} from "./nucleus";

const base: NucleusState = { curveA: 20, halfLife: 30, t: 0, k: 2, generation: 4 };
const derive = (params: Partial<NucleusParams> = {}, state: Partial<NucleusState> = {}) =>
  model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });

describe("the size of a nucleus", () => {
  it("has R = 1.2 A^⅓ fm", () => {
    expect(derive({ nuclide: 1 }).radius).toBeCloseTo(1.2, 12);
    expect(derive({ nuclide: 56 }).radius).toBeCloseTo(1.2 * Math.cbrt(56), 12);
    expect(derive({ nuclide: 56 }).radius).toBeCloseTo(4.59, 2);
    expect(derive({ nuclide: 238 }).radius).toBeCloseTo(7.44, 2);
  });

  it("has the same density, about 2.3 × 10¹⁷ kg/m³, whatever its size", () => {
    const rho = derive({ nuclide: 4 }).density;
    expect(rho / 1e17).toBeCloseTo(2.29, 2);
    // By hand: 1.66 × 10⁻²⁷ kg ÷ (4/3 · π · (1.2 × 10⁻¹⁵ m)³).
    expect(rho).toBeCloseTo(1.66054e-27 / ((4 / 3) * Math.PI * 1.2e-15 ** 3), -12);
    for (const A of NUC_NUCLIDE_ORDER) expect(derive({ nuclide: A }).density / rho).toBeCloseTo(1, 12);
  });
});

describe("mass defect and binding energy", () => {
  it("gives helium-4 28.3 MeV, 7.07 MeV per nucleon, as by hand", () => {
    // 2 × 1.007825 + 2 × 1.008665 − 4.002603 = 0.030377 u; × 931.5 = 28.296 MeV.
    const he = derive({ nuclide: 4 });
    expect(he).toMatchObject({ protons: 2, neutrons: 2, massNumber: 4 });
    expect(he.partsMass).toBeCloseTo(4.03298, 9);
    expect(he.massDefect).toBeCloseTo(0.030377, 9);
    expect(he.bindingEnergy).toBeCloseTo(28.296, 2);
    expect(he.bindingPerNucleon).toBeCloseTo(7.074, 3);
  });

  it("gives deuterium 2.22 MeV, iron-56 8.79 MeV per nucleon and uranium-238 7.57", () => {
    expect(derive({ nuclide: 2 }).bindingEnergy).toBeCloseTo((1.007825 + 1.008665 - 2.014102) * 931.5, 9);
    expect(derive({ nuclide: 2 }).bindingEnergy).toBeCloseTo(2.224, 3);
    expect(derive({ nuclide: 12 }).bindingEnergy).toBeCloseTo(92.16, 2);
    expect(derive({ nuclide: 56 }).bindingPerNucleon).toBeCloseTo(8.79, 2);
    expect(derive({ nuclide: 238 }).bindingPerNucleon).toBeCloseTo(7.57, 2);
    expect(derive({ nuclide: 1 }).bindingEnergy).toBe(0);
  });

  it("makes iron-56 the most tightly bound of the real nuclides", () => {
    const perNucleon = NUC_NUCLIDE_ORDER.map((A) => derive({ nuclide: A }).bindingPerNucleon);
    expect(Math.max(...perNucleon)).toBe(derive({ nuclide: 56 }).bindingPerNucleon);
    for (const A of NUC_NUCLIDE_ORDER) expect(NUC_NUCLIDES[A]!.A).toBe(A);
  });
});

describe("the model curve", () => {
  it("peaks near A = 60 at about 8.8 MeV per nucleon", () => {
    expect(NUC_MODEL_PEAK_A).toBe(61);
    expect(nucModelPerNucleon(NUC_MODEL_PEAK_A)).toBeCloseTo(8.84, 2);
    expect(derive({}, { curveA: 61 }).atPeak).toBe(1);
    expect(derive({}, { curveA: 56 }).atPeak).toBe(1);
    expect(derive({}, { curveA: 20 }).atPeak).toBe(0);
    expect(derive({}, { curveA: 238 }).atPeak).toBe(0);
  });

  it("stays within 0.5 MeV of the real values from carbon up, and 0.25 MeV from calcium", () => {
    for (const A of [12, 16, 40, 56, 92, 141, 208, 235, 238]) {
      expect(Math.abs(nucModelPerNucleon(A) - derive({ nuclide: A }).bindingPerNucleon), `A = ${A}`).toBeLessThan(0.5);
    }
    for (const A of [40, 56, 92, 141, 208, 235, 238]) {
      expect(Math.abs(nucModelPerNucleon(A) - derive({ nuclide: A }).bindingPerNucleon), `A = ${A}`).toBeLessThan(0.25);
    }
  });
});

describe("radioactive decay", () => {
  it("follows N = N₀e^(−λt), with T½ = 0.693/λ and τ = 1/λ", () => {
    const r = derive({}, { halfLife: 20, t: 60 });
    expect(r.lambda).toBeCloseTo(0.693 / 20, 4);
    expect(r.meanLife).toBeCloseTo(28.85, 2);
    expect(r.expected).toBeCloseTo(50, 10);
    expect(r.fraction).toBeCloseTo(0.125, 12);
    expect(r.halfLivesGone).toBe(3);
    expect(r.activity).toBeCloseTo(r.lambda * 50, 12);
    expect(r.activity).toBeCloseTo(1.73, 2);
  });

  it("counts a sample that wanders about the law, the same every time", () => {
    const counts = [1, 2, 3, 4].map((n) => derive({}, { halfLife: 30, t: 30 * n }).counted);
    expect(counts).toEqual([206, 99, 48, 23]);
    expect(derive({}, { t: 0 }).counted).toBe(NUC_SAMPLE);
    for (const d of NUC_DECAY_DRAWS) expect(d > 0 && d <= 1).toBe(true);
    const r = derive({}, { halfLife: 30, t: 30 });
    expect(r.counted + r.decayed).toBe(NUC_SAMPLE);
  });

  it("decays only forwards: no atom comes back", () => {
    let last = NUC_SAMPLE;
    for (let t = 0; t <= 400; t += 5) {
      const now = derive({}, { t }).counted;
      expect(now).toBeLessThanOrEqual(last);
      last = now;
    }
  });

  it("changes A and Z as α, β⁻, β⁺ and γ decays should", () => {
    expect(derive({ parent: "u238" })).toMatchObject({ decayKind: 0, parentZ: 92, parentA: 238, daughterZ: 90, daughterA: 234, deltaZ: -2, deltaA: -4 });
    expect(derive({ parent: "c14" })).toMatchObject({ decayKind: 1, daughterZ: 7, deltaZ: 1, deltaA: 0 });
    expect(derive({ parent: "na22" })).toMatchObject({ decayKind: 2, daughterZ: 10, deltaZ: -1, deltaA: 0 });
    expect(derive({ parent: "ni60" })).toMatchObject({ decayKind: 3, deltaZ: 0, deltaA: 0 });
    expect(Object.is(derive({ parent: "ni60" }).deltaZ, -0)).toBe(false);
  });

  it("releases the energies of the real decays", () => {
    // U-238 → Th-234 + He-4: (238.050788 − 234.043601 − 4.002603) × 931.5.
    expect(derive({ parent: "u238" }).decayQ).toBeCloseTo(4.27, 2);
    expect(derive({ parent: "ra226" }).decayQ).toBeCloseTo(4.87, 2);
    expect(derive({ parent: "c14" }).decayQ).toBeCloseTo(0.156, 3);
    expect(derive({ parent: "na22" }).decayQ).toBeCloseTo(1.82, 2);
    for (const p of NUC_PARENT_ORDER) expect(derive({ parent: p }).decayQ, p).toBeGreaterThan(0);
  });
});

describe("fission and fusion", () => {
  it("releases 173 MeV when U-235 splits into Ba-141 and Kr-92", () => {
    const r = derive({ reaction: "fission" });
    expect(r.reactionDefect).toBeCloseTo(0.186024, 6);
    expect(r.q).toBeCloseTo(173.28, 2);
    // The same from binding energies: what the fragments gain over U-235.
    const gain = derive({ nuclide: 141 }).bindingEnergy + derive({ nuclide: 92 }).bindingEnergy - derive({ nuclide: 235 }).bindingEnergy;
    expect(r.q).toBeCloseTo(gain, 6);
  });

  it("releases 17.6 MeV in D–T fusion and 26.7 MeV for each helium made in the Sun", () => {
    expect(derive({ reaction: "dt" }).q).toBeCloseTo(17.59, 2);
    const sun = derive({ reaction: "sun" });
    expect(sun.q).toBeCloseTo((4 * 1.007825 - 4.002603) * 931.5, 9);
    expect(sun.q).toBeCloseTo(26.73, 2);
    expect(sun.qPerNucleon).toBeCloseTo(6.68, 2);
  });

  it("gets far more energy per nucleon of fuel from fusion than from fission", () => {
    const [fission, dt, sun] = NUC_REACTION_ORDER.map((id) => derive({ reaction: id }).qPerNucleon);
    expect(fission).toBeCloseTo(0.73, 2);
    expect(dt).toBeGreaterThan(4 * fission!);
    expect(sun).toBeGreaterThan(dt!);
  });

  it("grows a chain reaction as kⁿ: dying out, steady or running away", () => {
    expect(derive({}, { k: 2, generation: 10 })).toMatchObject({ chainFissions: 1024, chainKind: 2 });
    expect(derive({}, { k: 1, generation: 10 })).toMatchObject({ chainFissions: 1, chainKind: 1 });
    expect(derive({}, { k: 0.5, generation: 3 })).toMatchObject({ chainFissions: 0.125, chainKind: 0 });
  });
});

describe("the model", () => {
  it("runs the clock on, steps by quarter half-lives, and clamps every control", () => {
    expect(model.advance({ ...base, t: 399 }, 5, model.defaultParams).t).toBe(400);
    expect(model.step({ ...base, halfLife: 20, t: 0 }, model.defaultParams, 1).t).toBe(5);
    expect(model.step({ ...base, halfLife: 20, t: 0 }, model.defaultParams, -1).t).toBe(0);
    const s = model.setVariable(base, "halfLife", 500, model.defaultParams);
    expect(s.halfLife).toBe(100);
    expect(model.setVariable(base, "k", 9, model.defaultParams).k).toBe(2.5);
    expect(model.setVariable(base, "curveA", 1, model.defaultParams).curveA).toBe(4);
    expect(model.setVariable(base, "generation", 3.6, model.defaultParams).generation).toBe(4);
    expect(model.setVariable(base, "t", -3, model.defaultParams).t).toBe(0);
    expect(model.getVariable(base, "halfLife")).toBe(30);
  });

  it("numbers every output, for every choice and at the ends of every range", () => {
    for (const nuclide of NUC_NUCLIDE_ORDER) {
      for (const parent of NUC_PARENT_ORDER) {
        for (const reaction of NUC_REACTION_ORDER) {
          for (const state of [base, { curveA: 999, halfLife: -1, t: 1e9, k: 99, generation: 99 }, { curveA: Number.NaN, halfLife: 0, t: -5, k: 0, generation: -1 }]) {
            const r = model.derive(state, { nuclide, parent, reaction });
            for (const key of model.outputs) expect(Number.isFinite(r[key]), `${nuclide} ${parent} ${reaction} ${key}`).toBe(true);
          }
        }
      }
    }
    const fallback = model.derive(base, { nuclide: 5, parent: "x" as never, reaction: "y" as never });
    expect(fallback).toMatchObject({ nuclide: 56, parent: 0, reaction: 0 });
  });
});
