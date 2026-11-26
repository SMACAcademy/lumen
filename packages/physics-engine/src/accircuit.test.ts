import { describe, expect, it } from "vitest";
import {
  AC_CIRCUIT_ORDER,
  AC_LIGHT_SPEED,
  AC_THETA_WRAP,
  acCircuitModel as model,
  acCurrentAt,
  acResonantFrequency,
  EM_BANDS,
  emBandOf,
  type AcParams,
  type AcState,
} from "./accircuit";

const base = model.initialize(model.defaultParams);
const derive = (params: Partial<AcParams> = {}, state: Partial<AcState> = {}) => model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });

describe("rms and peak", () => {
  it("peaks India's 230 V mains at about 325 V", () => {
    const r = derive({ circuit: "R" }, { vrms: 230 });
    expect(r.vpeak).toBeCloseTo(325.27, 2);
    expect(r.ipeak / r.irms).toBeCloseTo(Math.SQRT2, 12);
  });
});

describe("one element at a time", () => {
  it("keeps a resistor's current in step with the voltage", () => {
    const r = derive({ circuit: "R" }, { vrms: 230, resistance: 100 });
    expect(r).toMatchObject({ z: 100, phase: 0, lagLead: 0, powerFactor: 1, wattless: 0 });
    expect(r.irms).toBeCloseTo(2.3, 12);
    expect(r.power).toBeCloseTo(529, 9);
  });

  it("makes an inductor's current lag by 90° with X_L = ωL, and fall as f rises", () => {
    const r = derive({ circuit: "L" }, { inductance: 100, freq: 50 });
    expect(r.xl).toBeCloseTo(31.416, 3);
    expect(r).toMatchObject({ phase: Math.PI / 2, lagLead: 1, powerFactor: 0, power: 0 });
    expect(r.irms).toBeCloseTo(7.321, 3);
    expect(derive({ circuit: "L" }, { inductance: 100, freq: 200 }).irms).toBeCloseTo(1.830, 3);
    expect(r.wattless).toBeCloseTo(r.irms, 12);
  });

  it("makes a capacitor's current lead by 90° with X_C = 1/ωC, and rise as f rises", () => {
    const r = derive({ circuit: "C" }, { capacitance: 10, freq: 50 });
    expect(r.xc).toBeCloseTo(318.31, 2);
    expect(r).toMatchObject({ phase: -Math.PI / 2, lagLead: -1, powerFactor: 0, power: 0 });
    expect(r.irms).toBeCloseTo(0.7226, 4);
    expect(derive({ circuit: "C" }, { capacitance: 10, freq: 200 }).irms).toBeCloseTo(2.890, 3);
  });

  it("draws the current a quarter cycle behind the voltage in an inductor", () => {
    // At ωt = 90° the voltage peaks and the inductor's current is just zero.
    const r = derive({ circuit: "L" }, { theta: Math.PI / 2 });
    expect(r.v).toBeCloseTo(r.vpeak, 9);
    expect(r.i).toBeCloseTo(0, 9);
    const c = derive({ circuit: "C" }, { theta: 0 });
    expect(c.i).toBeCloseTo(c.ipeak, 9);
  });
});

describe("the series LCR circuit", () => {
  it("adds the voltages as phasors, not as numbers", () => {
    const r = derive({ circuit: "LCR" }, { resistance: 30, inductance: 100, capacitance: 10, freq: 200 });
    expect(r.z).toBeCloseTo(Math.hypot(30, r.xl - r.xc), 12);
    expect(Math.hypot(r.vr, r.vl - r.vc)).toBeCloseTo(r.vrms, 9);
    expect(r.vr + r.vl + r.vc).toBeGreaterThan(r.vrms);
    expect(Math.tan(r.phase)).toBeCloseTo((r.xl - r.xc) / 30, 12);
    expect(r.powerFactor).toBeCloseTo(0.5456, 4);
    expect(r.power).toBeCloseTo(r.irms * r.irms * 30, 9);
    expect(r.power).toBeCloseTo(524.8, 1);
    expect(r.lagLead).toBe(1);
    expect(derive({ circuit: "LCR" }, { freq: 50 }).lagLead).toBe(-1);
  });

  it("resonates at f₀ = 1/(2π√LC), where Z = R and the current peaks", () => {
    expect(acResonantFrequency(100, 10)).toBeCloseTo(159.155, 3);
    expect(acResonantFrequency(400, 10)).toBeCloseTo(79.577, 3);
    const r = derive({ circuit: "LCR" }, { vrms: 230, resistance: 10, inductance: 100, capacitance: 10, freq: 159 });
    expect(r).toMatchObject({ atResonance: 1, lagLead: 0 });
    expect(r.irms).toBeCloseTo(23, 1);
    expect(r.q).toBeCloseTo(10, 9);
    expect(r.vl).toBeCloseTo(2300, -1);
    expect(r.bandwidth).toBeCloseTo(15.915, 3);
    for (const f of [100, 150, 170, 300]) expect(acCurrentAt(f, 230, 10, 100, 10)).toBeLessThan(acCurrentAt(r.f0, 230, 10, 100, 10));
    expect(acCurrentAt(r.f0, 230, 10, 100, 10)).toBeCloseTo(23, 9);
    expect(derive({ circuit: "LCR" }, { freq: 150 }).atResonance).toBe(0);
    expect(derive({ circuit: "L" }, { freq: 159 }).atResonance).toBe(0);
  });

  it("sharpens the resonance as R falls", () => {
    expect(derive({ circuit: "LCR" }, { resistance: 50 }).q).toBeCloseTo(2, 9);
    expect(derive({ circuit: "LCR" }, { resistance: 10 }).q).toBeCloseTo(10, 9);
  });

  it("averages v·i to V I cos φ over a cycle", () => {
    for (const circuit of AC_CIRCUIT_ORDER) {
      let sum = 0;
      const n = 3600;
      for (let k = 0; k < n; k++) sum += derive({ circuit }, { resistance: 30, freq: 200, theta: (2 * Math.PI * k) / n }).p;
      expect(sum / n, circuit).toBeCloseTo(derive({ circuit }, { resistance: 30, freq: 200 }).power, 6);
    }
  });
});

describe("the transformer", () => {
  it("steps 230 V down to 11.5 V with 1000 and 50 turns, keeping the power", () => {
    const r = derive({}, { vrms: 230, np: 1000, ns: 50, resistance: 10 });
    expect(r.vs).toBeCloseTo(11.5, 12);
    expect(r.is).toBeCloseTo(1.15, 12);
    expect(r.ip * r.vrms).toBeCloseTo(r.is * r.vs, 12);
    expect(r.stepUp).toBe(-1);
    expect(derive({}, { np: 100, ns: 2000 }).stepUp).toBe(1);
  });

  it("loses far less in the line at a higher voltage", () => {
    const low = derive({}, { vrms: 230, np: 100, ns: 500 });
    const high = derive({}, { vrms: 230, np: 100, ns: 2000 });
    expect(low.vs).toBeCloseTo(1150, 9);
    expect(low.lineLoss).toBeCloseTo(1.512, 3);
    expect(high.lineLoss).toBeCloseTo(0.0945, 4);
    expect(derive({}, { vrms: 230, np: 1000, ns: 50 }).lineLoss).toBe(100);
  });
});

describe("LC oscillations", () => {
  it("swaps the energy between C and L at ω₀ = 1/√LC, keeping the total", () => {
    const start = derive({}, { inductance: 100, capacitance: 10, theta: 0 });
    expect(start.lcEnergy).toBeCloseTo(5e-4, 12);
    expect(start.lcShare).toBe(1);
    expect(start.lcCharge).toBeCloseTo(100, 9);
    expect(start.lcPeriod).toBeCloseTo(1 / 159.155, 6);
    const quarter = derive({}, { theta: Math.PI / 2 });
    expect(quarter.lcShare).toBeCloseTo(0, 12);
    expect(quarter.lcMagnetic).toBeCloseTo(quarter.lcEnergy, 12);
    // ½Li² at the peak current is the whole energy.
    expect(0.5 * 0.1 * quarter.lcCurrent ** 2).toBeCloseTo(quarter.lcEnergy, 12);
    for (const theta of [0.3, 1.1, 2.5]) {
      const r = derive({}, { theta });
      expect(r.lcElectric + r.lcMagnetic).toBeCloseTo(r.lcEnergy, 15);
    }
  });
});

describe("displacement current", () => {
  it("equals the current in the wires, and is zero with no capacitor", () => {
    const r = derive({ circuit: "C" }, { vrms: 230, freq: 50, capacitance: 10 });
    expect(r.dispCurrent).toBeCloseTo(r.irms, 12);
    expect(r.fluxRate * 8.854e-12).toBeCloseTo(r.ipeak, 9);
    expect(derive({ circuit: "R" }).dispCurrent).toBe(0);
    expect(derive({ circuit: "L" }).fluxRate).toBe(0);
  });

  it("charges the capacitor a quarter cycle behind its current", () => {
    const r = derive({ circuit: "C" }, { theta: Math.PI / 2 });
    expect(r.vcap).toBeCloseTo(r.v, 6);
  });
});

describe("electromagnetic waves", () => {
  it("travels at c = 1/√(μ₀ε₀) = 3 × 10⁸ m/s, with c = fλ", () => {
    const r = derive({}, { lambdaExp: -6.27 });
    expect(r.speed).toBe(AC_LIGHT_SPEED);
    expect(r.cFromConstants / 1e8).toBeCloseTo(2.998, 3);
    expect(r.emFreq * r.wavelength).toBeCloseTo(3e8, 0);
    expect(derive({}, { lambdaExp: 0 }).emFreq).toBeCloseTo(3e8, 0);
  });

  it("has B₀ = E₀/c, and intensity ½ε₀cE₀² pressing with I/c", () => {
    const r = derive({}, { e0: 300 });
    expect(r.b0).toBeCloseTo(1, 12);
    const sun = derive({}, { e0: 800 });
    expect(sun.intensity).toBeCloseTo(850.0, 1);
    expect(sun.energyDensity).toBeCloseTo(2.833e-6, 9);
    expect(sun.pressure).toBeCloseTo(2.833e-6, 9);
  });

  it("splits the spectrum at NCERT's boundaries", () => {
    const at = (metres: number) => EM_BANDS[emBandOf(Math.log10(metres))]!.id;
    expect([1e-13, 1e-10, 1e-7, 550e-9, 1e-5, 1e-2, 10].map(at)).toEqual(["gamma", "xray", "uv", "visible", "infrared", "microwave", "radio"]);
    expect([at(399e-9), at(401e-9), at(699e-9), at(701e-9)]).toEqual(["uv", "visible", "visible", "infrared"]);
    expect(derive({}, { lambdaExp: -6.27 }).band).toBe(3);
  });
});

describe("the model", () => {
  it("turns the clock on play and wraps after two cycles", () => {
    const s = model.advance({ ...base, theta: AC_THETA_WRAP - 0.01 }, 0.01, model.defaultParams);
    expect(s.theta).toBeCloseTo(0.01, 9);
    expect(model.advance(base, 0.5, model.defaultParams).theta).toBeCloseTo(1, 12);
  });

  it("clamps every variable to its slider", () => {
    expect(model.setVariable(base, "freq", 5000, model.defaultParams).freq).toBe(2000);
    expect(model.setVariable(base, "inductance", 0, model.defaultParams).inductance).toBe(10);
    expect(model.setVariable(base, "lambdaExp", -20, model.defaultParams).lambdaExp).toBe(-14);
    expect(model.setVariable(base, "nonsense", 3, model.defaultParams)).toBe(base);
    expect(model.step(base, model.defaultParams, 1).freq).toBe(60);
  });

  it("numbers every output at the extremes", () => {
    const corners: AcState[] = [
      { vrms: 10, freq: 10, resistance: 1, inductance: 10, capacitance: 1, np: 50, ns: 10, lambdaExp: -14, e0: 1, theta: 0 },
      { vrms: 240, freq: 2000, resistance: 200, inductance: 1000, capacitance: 100, np: 1000, ns: 2000, lambdaExp: 3, e0: 1000, theta: AC_THETA_WRAP },
      { vrms: Number.NaN, freq: -1, resistance: 0, inductance: 0, capacitance: 0, np: 0, ns: 0, lambdaExp: 99, e0: 0, theta: -1 },
    ];
    for (const state of corners) {
      for (const circuit of AC_CIRCUIT_ORDER) {
        const r = model.derive(state, { circuit });
        for (const key of model.outputs) expect(Number.isFinite(r[key]), `${circuit} ${key}`).toBe(true);
      }
    }
  });
});
