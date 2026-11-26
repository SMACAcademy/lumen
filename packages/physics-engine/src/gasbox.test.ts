import { describe, expect, it } from "vitest";
import {
  GASBOX_GAS_ORDER,
  GASBOX_GASES,
  GASBOX_KB,
  GASBOX_MOLECULES,
  GASBOX_NA,
  GASBOX_R,
  gasboxFractionAbove,
  gasboxMaxwell,
  gasboxModel as model,
  gasboxMolecules,
  type GasboxParams,
  type GasboxState,
} from "./gasbox";

const base: GasboxState = { temperature: 300, volume: 25, amount: 1, t: 0 };
const derive = (gas: GasboxParams["gas"] = "n2", state: Partial<GasboxState> = {}) => model.derive({ ...base, ...state }, { gas });

describe("the ideal gas equation", () => {
  it("gives 1 mol at 273 K in 22.4 L one atmosphere, 101.3 kPa", () => {
    expect(derive("n2", { temperature: 273, volume: 22.4 }).pressure).toBeCloseTo(101.33, 2);
  });

  it("follows Boyle's and Charles's laws and grows with the amount of gas", () => {
    const p = derive().pressure;
    expect(p).toBeCloseTo(99.768, 9);
    expect(derive("n2", { volume: 12.5 }).pressure).toBeCloseTo(2 * p, 9);
    expect(derive("n2", { temperature: 600 }).pressure).toBeCloseTo(2 * p, 9);
    expect(derive("n2", { amount: 2 }).pressure).toBeCloseTo(2 * p, 9);
  });

  it("does not care which gas it is", () => {
    for (const gas of GASBOX_GAS_ORDER) expect(derive(gas).pressure, gas).toBeCloseTo(99.768, 9);
  });
});

describe("pressure from molecules", () => {
  it("agrees with ⅓ρv²rms for every gas and state", () => {
    for (const gas of GASBOX_GAS_ORDER) {
      for (const s of [{}, { temperature: 800, volume: 7, amount: 0.3 }, { temperature: 120, volume: 49, amount: 1.9 }]) {
        const r = derive(gas, s);
        expect(r.pressureKinetic / 1000, gas).toBeCloseTo(r.pressure, 9);
      }
    }
  });

  it("finds N₂ at 300 K in 25 L at 1.12 kg/m³ with v_rms = 517 m/s", () => {
    const r = derive();
    expect(r.density).toBeCloseTo(1.12, 12);
    expect(r.vrms).toBeCloseTo(516.95, 2);
    expect(r.pressureKinetic).toBeCloseTo(99768, 6);
  });
});

describe("temperature and kinetic energy", () => {
  it("gives every gas (3/2)k_BT per molecule, 6.21 × 10⁻²¹ J at 300 K", () => {
    for (const gas of GASBOX_GAS_ORDER) expect(derive(gas).ke, gas).toBeCloseTo(6.21e-21, 30);
    expect(derive("he", { temperature: 600 }).ke).toBeCloseTo(2 * 6.21e-21, 30);
  });

  it("matches ½mv²rms to within the rounding of N_A and k_B", () => {
    for (const gas of GASBOX_GAS_ORDER) {
      const r = derive(gas);
      const mass = GASBOX_GASES[gas].M / 1000 / GASBOX_NA;
      expect(Math.abs((0.5 * mass * r.vrms ** 2) / r.ke - 1), gas).toBeLessThan(0.002);
    }
  });
});

describe("molecular speeds", () => {
  it("orders v_mp < v̄ < v_rms in the ratio 1 : 1.128 : 1.225", () => {
    const r = derive();
    expect(r.vavg / r.vmp).toBeCloseTo(Math.sqrt(4 / Math.PI), 12);
    expect(r.vrms / r.vmp).toBeCloseTo(Math.sqrt(1.5), 12);
    expect([r.vmp, r.vavg, r.vrms].map((v) => Math.round(v))).toEqual([422, 476, 517]);
  });

  it("is fastest for the lightest gas and doubles when T is four times as high", () => {
    const order = ["co2", "o2", "n2", "ch4", "he", "h2"] as const;
    const speeds = order.map((g) => derive(g).vrms);
    for (let i = 1; i < speeds.length; i++) expect(speeds[i]).toBeGreaterThan(speeds[i - 1]!);
    expect(derive("h2").vrms).toBeCloseTo(1934.2, 1);
    expect(derive("n2", { temperature: 1000 }).vrms).toBeCloseTo(2 * derive("n2", { temperature: 250 }).vrms, 9);
  });
});

describe("the Maxwell distribution", () => {
  const integrate = (f: (v: number) => number, a: number, b: number, steps = 20000) => {
    const h = (b - a) / steps;
    let sum = 0;
    for (let i = 0; i < steps; i++) sum += f(a + (i + 0.5) * h) * h;
    return sum;
  };

  it("holds every molecule, peaks at v_mp, and averages to v̄ and v²rms", () => {
    const { vmp, vavg, vrms } = derive();
    const f = (v: number) => gasboxMaxwell(v, vmp);
    expect(integrate(f, 0, 10 * vmp)).toBeCloseTo(1, 6);
    expect(integrate((v) => v * f(v), 0, 10 * vmp)).toBeCloseTo(vavg, 3);
    expect(Math.sqrt(integrate((v) => v * v * f(v), 0, 10 * vmp))).toBeCloseTo(vrms, 3);
    expect(f(vmp)).toBeGreaterThan(f(vmp * 0.98));
    expect(f(vmp)).toBeGreaterThan(f(vmp * 1.02));
  });

  it("counts the molecules faster than a speed", () => {
    const vmp = 422;
    for (const v of [0, 300, 1000, 1500]) expect(gasboxFractionAbove(v, vmp)).toBeCloseTo(integrate((u) => gasboxMaxwell(u, vmp), v, 20 * vmp), 6);
    expect(derive().fastShare).toBeCloseTo(1.06, 2);
    expect(derive("h2").fastShare).toBeGreaterThan(80);
  });

  it("flattens and spreads as the gas warms: the peak falls as 1/√T", () => {
    expect(derive().peakShare).toBeCloseTo(19.67, 2);
    expect(derive("n2", { temperature: 900 }).peakShare).toBeCloseTo(19.6693 / Math.sqrt(3), 3);
  });
});

describe("degrees of freedom and specific heats", () => {
  it("counts 3 for a monatomic gas, 5 for a linear molecule, 6 for a non-linear one", () => {
    expect(GASBOX_GAS_ORDER.map((g) => derive(g).dof)).toEqual([3, 5, 5, 5, 5, 6]);
    expect(derive("co2")).toMatchObject({ dofTrans: 3, dofRot: 2 });
  });

  it("gives Cv = (f/2)R, Cp = Cv + R and γ = 1 + 2/f", () => {
    const he = derive("he");
    expect(he.cv).toBeCloseTo(1.5 * GASBOX_R, 12);
    expect(he.cp - he.cv).toBeCloseTo(GASBOX_R, 12);
    expect(he.gamma).toBeCloseTo(5 / 3, 12);
    expect(derive("n2").gamma).toBeCloseTo(1.4, 12);
    expect(derive("ch4").gamma).toBeCloseTo(4 / 3, 12);
    for (const gas of GASBOX_GAS_ORDER) expect(derive(gas).gamma, gas).toBeCloseTo(derive(gas).cp / derive(gas).cv, 12);
  });

  it("shares energy equally: ½k_BT per degree of freedom, so helium at 500 K holds what N₂ holds at 300 K", () => {
    expect(derive().energyPerDof).toBeCloseTo(0.5 * GASBOX_KB * 300, 30);
    expect(derive("he", { temperature: 500 }).internalEnergy).toBeCloseTo(derive("n2").internalEnergy, 9);
    expect(derive().internalEnergy).toBeCloseTo(6235.5, 9);
  });

  it("keeps Cv the same at every temperature in the rigid model", () => {
    expect(derive("n2", { temperature: 900 }).cv).toBe(derive().cv);
  });
});

describe("the mean free path", () => {
  it("is about 68 nm for N₂ near one atmosphere, some 180 molecular diameters", () => {
    const r = derive();
    expect(r.freePath).toBeCloseTo(68.2, 1);
    expect(r.freePathRatio).toBeCloseTo(184.4, 1);
    expect(r.spacing).toBeCloseTo(3.46, 2);
    expect(r.collisionRate).toBeCloseTo(r.vavg / (r.freePath * 1e-9), 0);
  });

  it("halves when the gas is squeezed to half the volume, and does not change on heating in a fixed box", () => {
    expect(derive("n2", { volume: 12.5 }).freePath).toBeCloseTo(derive().freePath / 2, 9);
    expect(derive("n2", { temperature: 600 }).freePath).toBeCloseTo(derive().freePath, 9);
  });
});

describe("the model", () => {
  it("draws the same seeded molecules every time, with ⟨v²⟩ near v²rms", () => {
    expect(gasboxMolecules(40)).toEqual(GASBOX_MOLECULES);
    for (const m of GASBOX_MOLECULES) {
      expect(m.x).toBeGreaterThanOrEqual(0);
      expect(m.x).toBeLessThan(1);
      expect(m.speed).toBeGreaterThan(0);
    }
    const many = gasboxMolecules(4000);
    expect(many.reduce((s, m) => s + m.speed ** 2, 0) / many.length).toBeCloseTo(1, 1);
  });

  it("lets play run time on, steps the temperature, and clamps every control", () => {
    expect(model.advance(base, 0.5, model.defaultParams).t).toBe(0.5);
    expect(model.step(base, model.defaultParams, 1).temperature).toBe(310);
    expect(model.step({ ...base, temperature: 1000 }, model.defaultParams, 1).temperature).toBe(1000);
    expect(model.setVariable(base, "temperature", 5000, model.defaultParams).temperature).toBe(1000);
    expect(model.setVariable(base, "volume", 1, model.defaultParams).volume).toBe(5);
    expect(model.setVariable(base, "amount", 9, model.defaultParams).amount).toBe(2);
    expect(model.setVariable(base, "amount", Number.NaN, model.defaultParams).amount).toBe(0.1);
  });

  it("numbers every output, for every gas and at every extreme", () => {
    for (const gas of GASBOX_GAS_ORDER) {
      for (const s of [base, { temperature: -5, volume: 0, amount: 0, t: -1 }, { temperature: 1e9, volume: 1e9, amount: 1e9, t: 1e9 }]) {
        const r = model.derive(s, { gas });
        for (const key of model.outputs) expect(Number.isFinite(r[key]), `${gas} ${key}`).toBe(true);
        expect(Object.is(r.t, -0)).toBe(false);
      }
    }
    expect(model.derive(base, { gas: "xe" as never }).gas).toBe(GASBOX_GAS_ORDER.indexOf("n2"));
  });
});
