import { describe, expect, it } from "vitest";
import {
  SEMI_DIODES,
  SEMI_GATE_ORDER,
  SEMI_THERMAL_VOLTAGE,
  semiCarriers,
  semiColourOf,
  semiconductorModel as model,
  semiCutIn,
  semiGateOutput,
  semiRectifierWave,
  type SemiconductorParams,
  type SemiconductorState,
} from "./semiconductor";

const P = model.defaultParams;
const S = model.initialize(P);
const derive = (params: Partial<SemiconductorParams> = {}, state: Partial<SemiconductorState> = {}) => model.derive({ ...S, ...state }, { ...P, ...params });

describe("energy bands", () => {
  it("has overlapping bands in a metal, a small gap in a semiconductor and a wide one in an insulator", () => {
    expect(derive({ solid: "metal" })).toMatchObject({ bandGap: 0, solidClass: 0 });
    expect(derive({ solid: "silicon" })).toMatchObject({ bandGap: 1.1, solidClass: 1 });
    expect(derive({ solid: "germanium" })).toMatchObject({ bandGap: 0.7, solidClass: 1 });
    expect(derive({ solid: "diamond" })).toMatchObject({ bandGap: 5.4, solidClass: 2, freeCarriers: 0 });
  });
});

describe("doping", () => {
  it("reproduces NCERT's example: silicon with 1 ppm arsenic", () => {
    const r = derive({ material: "silicon", dopant: "pentavalent" }, { ppm: 1 });
    expect(r.donors).toBeCloseTo(5e22, -18);
    expect(r.ne / 5e22).toBeCloseTo(1, 9);
    expect(r.nh / 4.5e9).toBeCloseTo(1, 9);
    expect(r.semiType).toBe(1);
  });

  it("keeps n_e n_h = n_i² whatever the doping", () => {
    for (const dopant of ["none", "pentavalent", "trivalent"] as const) {
      for (const ppm of [0, 0.5, 4]) {
        const r = derive({ dopant }, { ppm });
        expect(r.carrierProduct / (r.ni * r.ni)).toBeCloseTo(1, 9);
      }
    }
  });

  it("makes holes the majority with a trivalent dopant, and is intrinsic without one", () => {
    const p = derive({ dopant: "trivalent" }, { ppm: 2 });
    expect(p.semiType).toBe(2);
    expect(p.nh).toBeGreaterThan(p.ne);
    expect(derive({ dopant: "none" }, { ppm: 2 })).toMatchObject({ semiType: 0, ne: 1.5e16, nh: 1.5e16 });
    expect(semiCarriers(1e10, "pentavalent", 0)).toEqual({ ne: 1e10, nh: 1e10 });
  });
});

describe("the p–n junction", () => {
  it("has a barrier of 0.7 V in silicon and 0.3 V in germanium, lowered by forward bias", () => {
    expect(derive({ device: "silicon" }, { bias: 0 }).barrier).toBe(0.7);
    expect(derive({ device: "germanium" }, { bias: 0 }).barrier).toBe(0.3);
    expect(derive({ device: "silicon" }, { bias: 0.3 }).effBarrier).toBeCloseTo(0.4, 12);
    expect(derive({ device: "silicon" }, { bias: -5 }).effBarrier).toBeCloseTo(5.7, 12);
  });

  it("narrows the depletion layer in forward bias and widens it in reverse", () => {
    const w0 = derive({}, { bias: 0 }).depletion;
    expect(w0).toBeCloseTo(0.426, 3);
    expect(derive({}, { bias: 0.4 }).depletion).toBeLessThan(w0);
    expect(derive({}, { bias: -5 }).depletion).toBeGreaterThan(w0);
    expect(derive({}, { bias: 0.75 }).depletion).toBe(0);
    // Heavy doping makes the Zener's layer ten times thinner.
    expect(derive({ device: "zener" }, { bias: 0 }).depletion).toBeCloseTo(w0 / 10, 6);
  });
});

describe("the diode characteristic", () => {
  it("follows I = I₀(e^{V/ηV_T} − 1)", () => {
    const d = SEMI_DIODES.silicon;
    const r = derive({ device: "silicon" }, { bias: 0.6 });
    expect(r.current).toBeCloseTo(d.i0 * (Math.exp(0.6 / (2 * SEMI_THERMAL_VOLTAGE)) - 1) * 1000, 9);
    expect(derive({}, { bias: 0 }).current).toBe(0);
  });

  it("cuts in near 0.7 V for silicon and 0.2 V for germanium", () => {
    expect(semiCutIn(SEMI_DIODES.silicon)).toBeCloseTo(0.715, 3);
    expect(semiCutIn(SEMI_DIODES.germanium)).toBeCloseTo(0.238, 3);
    expect(derive({}, { bias: 0.5 }).current).toBeLessThan(1);
    expect(derive({}, { bias: 0.75 }).current).toBeGreaterThan(10);
  });

  it("lets only the tiny saturation current through in reverse, until breakdown", () => {
    expect(derive({ device: "silicon" }, { bias: -5 }).currentMicro).toBeCloseTo(-0.01, 6);
    expect(derive({ device: "germanium" }, { bias: -5 }).currentMicro).toBeCloseTo(-1, 6);
    expect(derive({ device: "zener" }, { bias: -5.9 })).toMatchObject({ brokenDown: 0 });
    const z = derive({ device: "zener" }, { bias: -6.1 });
    expect(z.brokenDown).toBe(1);
    expect(z.current).toBeCloseTo(-50, 3);
  });

  it("holds the current at the 200 mA rating and flags it", () => {
    expect(derive({ device: "germanium" }, { bias: 0.6 })).toMatchObject({ current: 200, overload: 1 });
    expect(derive({ device: "zener" }, { bias: -10 })).toMatchObject({ current: -200, overload: 1 });
    expect(derive({ device: "silicon" }, { bias: 0.8 }).overload).toBe(0);
  });
});

describe("rectifiers", () => {
  it("passes half the cycle, or both halves, less 0.7 V", () => {
    const half = derive({ rectifier: "half", filter: 0 }, { peak: 10 });
    const full = derive({ rectifier: "full", filter: 0 }, { peak: 10 });
    expect(half.outPeak).toBeCloseTo(9.3, 9);
    expect(half.rippleFreq).toBe(50);
    expect(full.rippleFreq).toBe(100);
    // The average of max(0, V_m sin θ − 0.7) over a cycle.
    const t1 = Math.asin(0.07);
    const exact = (2 * 10 * Math.cos(t1) - 0.7 * (Math.PI - 2 * t1)) / (2 * Math.PI);
    expect(half.outAverage).toBeCloseTo(exact, 3);
    expect(full.outAverage).toBeCloseTo(2 * exact, 3);
  });

  it("smooths the output with a capacitor: a bigger one leaves less ripple", () => {
    const bare = derive({ filter: 0 }, { peak: 10 });
    const small = derive({ filter: 1 }, { peak: 10, capacitance: 100 });
    const big = derive({ filter: 1 }, { peak: 10, capacitance: 1000 });
    expect(bare.ripple).toBeCloseTo(9.3, 9);
    expect(small.ripple).toBeLessThan(bare.ripple);
    expect(big.ripple).toBeLessThan(small.ripple);
    expect(big.outAverage).toBeGreaterThan(small.outAverage);
    expect(derive({ rectifier: "full", filter: 1 }, { capacitance: 100 }).ripple).toBeLessThan(small.ripple);
  });

  it("samples two steady cycles", () => {
    const w = semiRectifierWave("full", 10, true, 100);
    expect(w.t.length).toBe(1001);
    expect(Math.min(...w.vout)).toBeGreaterThan(8);
  });
});

describe("the Zener regulator", () => {
  it("holds the output at 6.0 V once the input is high enough", () => {
    for (const vin of [8, 10, 15, 20]) expect(derive({}, { vin }).vout).toBe(6);
    const r = derive({}, { vin: 10 });
    expect(r.seriesCurrent).toBeCloseTo(20, 9);
    expect(r.loadCurrent).toBeCloseTo(4, 9);
    expect(r.zenerCurrent).toBeCloseTo(16, 9);
  });

  it("does not regulate below 6.8 V", () => {
    const r = derive({}, { vin: 5 });
    expect(r.regulating).toBe(0);
    expect(r.zenerCurrent).toBe(0);
    expect(r.vout).toBeCloseTo(5 * 1500 / 1700, 9);
  });
});

describe("light", () => {
  it("gives an LED's wavelength as 1240 / E_g nm, and its colour", () => {
    const r = derive({}, { gap: 1.9 });
    expect(r.wavelength).toBeCloseTo(652.6, 1);
    expect(r.gapTimesWavelength).toBeCloseTo(1240, 9);
    expect([semiColourOf(867), semiColourOf(650), semiColourOf(550), semiColourOf(460), semiColourOf(365)]).toEqual([0, 1, 4, 5, 7]);
  });

  it("makes the photocurrent grow in proportion to the light", () => {
    expect(derive({}, { light: 400 }).photoCurrent - 0.01).toBeCloseTo(2 * (derive({}, { light: 200 }).photoCurrent - 0.01), 9);
    expect(derive({}, { light: 0 }).photoCurrent).toBeCloseTo(0.01, 12);
  });

  it("gives a solar cell a current ∝ light but a voltage that barely changes", () => {
    const full = derive({}, { light: 1000 });
    const dim = derive({}, { light: 100 });
    expect(full.shortCircuit).toBeCloseTo(3.5, 9);
    expect(full.openVoltage).toBeCloseTo(0.569, 3);
    expect(dim.openVoltage).toBeCloseTo(0.509, 3);
    expect(full.efficiency).toBeGreaterThan(15);
    expect(full.efficiency).toBeLessThan(18);
    expect(derive({}, { light: 0 })).toMatchObject({ shortCircuit: 0, openVoltage: 0, maxPower: 0, efficiency: 0 });
  });
});

describe("the transistor", () => {
  it("is cut off below 0.7 V, amplifies, then saturates", () => {
    expect(derive({}, { vi: 0.5 })).toMatchObject({ region: 0, collectorCurrent: 0, vce: 10 });
    const active = derive({ beta: 100 }, { vi: 1 });
    expect(active.region).toBe(1);
    expect(active.baseCurrent).toBeCloseTo(15, 9);
    expect(active.collectorCurrent).toBeCloseTo(1.5, 9);
    expect(active.emitterCurrent).toBeCloseTo(1.515, 9);
    expect(active.vce).toBeCloseTo(7, 9);
    expect(derive({}, { vi: 3 })).toMatchObject({ region: 2, vce: 0.2 });
  });

  it("has voltage gain β R_C / R_B, the slope of the transfer curve", () => {
    const r = derive({ beta: 100 });
    expect(r.voltageGain).toBe(10);
    expect(r.powerGain).toBe(1000);
    const slope = (derive({}, { vi: 1.2 }).vce - derive({}, { vi: 1 }).vce) / 0.2;
    expect(slope).toBeCloseTo(-10, 9);
    expect(r.alpha).toBeCloseTo(100 / 101, 12);
  });
});

describe("logic gates", () => {
  it("follows each truth table", () => {
    const table = (gate: (typeof SEMI_GATE_ORDER)[number]) => [semiGateOutput(gate, 0, 0), semiGateOutput(gate, 0, 1), semiGateOutput(gate, 1, 0), semiGateOutput(gate, 1, 1)];
    expect(table("or")).toEqual([0, 1, 1, 1]);
    expect(table("and")).toEqual([0, 0, 0, 1]);
    expect(table("nand")).toEqual([1, 1, 1, 0]);
    expect(table("nor")).toEqual([1, 0, 0, 0]);
    expect(table("not")).toEqual([1, 1, 0, 0]);
  });

  it("builds NOT, AND and OR from NAND gates alone", () => {
    for (const a of [0, 1]) {
      for (const b of [0, 1]) {
        expect(semiGateOutput("nand-not", a, b)).toBe(semiGateOutput("not", a, b));
        expect(semiGateOutput("nand-and", a, b)).toBe(semiGateOutput("and", a, b));
        expect(semiGateOutput("nand-or", a, b)).toBe(semiGateOutput("or", a, b));
      }
    }
    expect(derive({ gate: "nand-or" }, { a: 1, b: 0 })).toMatchObject({ y: 1, nands: 3 });
  });
});

describe("the model", () => {
  it("clamps every slider to its range and rounds the gate inputs", () => {
    expect(model.setVariable(S, "bias", -50, P).bias).toBe(-10);
    expect(model.setVariable(S, "gap", 9, P).gap).toBe(3.4);
    expect(model.setVariable(S, "a", 0.7, P).a).toBe(1);
    expect(model.setVariable(S, "nope", 3, P)).toBe(S);
  });

  it("plays the mains on in slow motion and wraps after two cycles", () => {
    expect(model.advance({ ...S, t: 0 }, 1, P).t).toBeCloseTo(0.02, 12);
    expect(model.advance({ ...S, t: 0.039 }, 0.1, P).t).toBeCloseTo(0.001, 12);
    expect(model.step({ ...S, bias: 0.6 }, P, 1).bias).toBeCloseTo(0.65, 12);
  });

  it("numbers every output, everywhere", () => {
    for (const state of [S, { ...S, bias: -10, light: 0, vi: 5, ppm: 0, gap: 3.4 }, { ...S, bias: 0.8, peak: 20, capacitance: 10 }]) {
      for (const device of ["silicon", "germanium", "zener"] as const) {
        const r = model.derive(state, { ...P, device, filter: 1, rectifier: "full" });
        for (const key of model.outputs) {
          expect(Number.isFinite(r[key]), key).toBe(true);
          expect(Object.is(r[key], -0), key).toBe(false);
        }
      }
    }
  });
});
