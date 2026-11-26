import { describe, expect, it } from "vitest";
import {
  heatEngineModel as model,
  THERMO_CYCLE_ORDER,
  THERMO_GAS_ORDER,
  THERMO_PROCESS_ORDER,
  THERMO_R,
  thermoCycle,
  thermoCyclePoint,
  type HeatEngineParams,
  type HeatEngineState,
} from "./heatengine";

const base = model.initialize(model.defaultParams);
const derive = (params: Partial<HeatEngineParams> = {}, state: Partial<HeatEngineState> = {}) =>
  model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });

describe("two bodies in contact", () => {
  it("settle at the heat-capacity-weighted mean temperature", () => {
    expect(derive({}, { TA: 400, TB: 300, CB: 1000, t: 0 })).toMatchObject({ tempA: 400, tempB: 300, settled: 0, heatAB: 0 });
    expect(derive({}, { TA: 400, TB: 300, CB: 1000 }).Tcommon).toBeCloseTo(350, 12);
    expect(derive({}, { TA: 400, TB: 300, CB: 3000 }).Tcommon).toBeCloseTo(325, 12);
    const late = derive({}, { TA: 400, TB: 300, CB: 1000, t: 20 });
    expect(late.settled).toBe(1);
    expect(late.tempA).toBeCloseTo(350, 3);
    expect(late.heatAB).toBeCloseTo(50000, -1);
  });

  it("lose exactly the heat the other gains, and take about 6 s to come within 1 K", () => {
    const r = derive({}, { TA: 400, TB: 300, CB: 1000, t: 2 });
    expect(1000 * (400 - r.tempA)).toBeCloseTo(1000 * (r.tempB - 300), 9);
    expect(derive({}, { TA: 400, TB: 300, CB: 1000, t: 5.5 }).settled).toBe(0);
    expect(derive({}, { TA: 400, TB: 300, CB: 1000, t: 6 }).settled).toBe(1);
  });

  it("restarts the contact when a body is changed", () => {
    expect(model.setVariable({ ...base, t: 7 }, "TA", 450, model.defaultParams)).toMatchObject({ TA: 450, t: 0 });
  });
});

describe("the first law, Q = ΔU + W", () => {
  it("holds in every process", () => {
    for (const process of THERMO_PROCESS_ORDER) {
      for (const gas of THERMO_GAS_ORDER) {
        for (const V of [5, 15, 30]) {
          const r = derive({ process, gas }, { V, T1: 350, Tend: 200 });
          expect(r.Q, `${process} ${gas} ${V}`).toBeCloseTo(r.dU + r.W, 9);
          // ΔU of an ideal gas depends only on the temperature change.
          expect(r.dU).toBeCloseTo(THERMO_GASES_CV[gas] * THERMO_R * (r.T2 - r.T1), 9);
          expect(r.P2 * r.V2).toBeCloseTo(THERMO_R * r.T2, 9);
        }
      }
    }
  });

  it("isobaric expansion from 10 L to 20 L at 300 K: W = 2494 J, ΔU = 3741 J, Q = 6236 J", () => {
    const r = derive({ process: "isobaric", gas: "mono" }, { T1: 300, V: 20 });
    expect(r.P1).toBeCloseTo(249.42, 2);
    expect(r.W).toBeCloseTo(2494.2, 1);
    expect(r.dU).toBeCloseTo(3741.3, 1);
    expect(r.Q).toBeCloseTo(6235.5, 1);
    expect(r.T2).toBeCloseTo(600, 9);
  });

  it("isothermal: ΔU = 0 and all the heat leaves as work, RT ln(V₂/V₁)", () => {
    const r = derive({ process: "isothermal" }, { T1: 300, V: 20 });
    expect(r.dU).toBe(0);
    expect(r.W).toBeCloseTo(1728.8, 1);
    expect(r.Q).toBe(r.W);
    expect(derive({ process: "isothermal" }, { T1: 300, V: 15 }).W).toBeCloseTo(1011.3, 1);
    expect(derive({ process: "isothermal" }, { T1: 300, V: 5 }).W).toBeLessThan(0);
  });

  it("adiabatic: Q = 0, PV^γ and TV^(γ−1) stay constant, the gas cools as it expands", () => {
    const r = derive({ process: "adiabatic", gas: "di" }, { T1: 300, V: 5 });
    expect(r.Q).toBe(0);
    expect(r.T2).toBeCloseTo(300 * 2 ** 0.4, 9);
    expect(r.T2).toBeCloseTo(395.85, 2);
    expect(r.P2 * r.V2 ** 1.4).toBeCloseTo(r.P1 * r.V1 ** 1.4, 6);
    expect(r.P2).toBeCloseTo(r.Padia, 9);
    expect(derive({ process: "adiabatic", gas: "mono" }, { T1: 300, V: 20 }).T2).toBeCloseTo(300 * 0.5 ** (2 / 3), 9);
  });

  it("makes the adiabat steeper than the isotherm through the same point", () => {
    for (const gas of THERMO_GAS_ORDER) {
      const squeezed = derive({ gas }, { V: 5 });
      expect(squeezed.Padia).toBeGreaterThan(squeezed.Piso);
      const stretched = derive({ gas }, { V: 25 });
      expect(stretched.Padia).toBeLessThan(stretched.Piso);
    }
  });

  it("isochoric: no work, all the heat goes into internal energy", () => {
    const r = derive({ process: "isochoric", gas: "mono" }, { T1: 300, Tend: 600, V: 25 });
    expect(r).toMatchObject({ W: 0, V2: 10, expanding: 0 });
    expect(r.Q).toBeCloseTo(1.5 * THERMO_R * 300, 9);
    expect(r.P2).toBeCloseTo(2 * r.P1, 9);
  });
});

const THERMO_GASES_CV = { mono: 1.5, di: 2.5 } as const;

describe("cycles", () => {
  it("rectangle: net work is the enclosed area, Q₁ − Q₂", () => {
    const r = derive({ cycle: "rectangle", gas: "mono" }, { Vb: 20, Ph: 200 });
    expect(r.Wnet).toBe(1000);
    expect(r.Q1).toBeCloseTo(6500, 9);
    expect(r.Q1 - r.Q2).toBeCloseTo(r.Wnet, 9);
    expect(r.eta).toBeCloseTo(1000 / 6500, 12);
    // Between its hottest (C) and coldest (A) corners Carnot would manage far more.
    expect(r.etaCarnot).toBeCloseTo(0.75, 12);
    expect(r.eta).toBeLessThan(r.etaCarnot);
    expect(derive({ cycle: "rectangle" }, { Vb: 20, Ph: 300 }).Wnet).toBe(2000);
    expect(derive({ cycle: "rectangle" }, { Vb: 20, Ph: 300 }).eta).toBeCloseTo(2000 / 10500, 12);
  });

  it("never lets the rectangle beat Carnot between its hottest and coldest corners", () => {
    for (const gas of THERMO_GAS_ORDER) {
      for (let Vb = 12; Vb <= 30; Vb += 2) {
        for (let Ph = 120; Ph <= 400; Ph += 20) {
          const r = derive({ cycle: "rectangle", gas }, { Vb, Ph });
          expect(r.eta, `${gas} ${Vb} ${Ph}`).toBeLessThan(r.etaCarnot);
          expect(r.eta).toBeGreaterThan(0);
          expect(r.cop).toBeCloseTo(r.Q2 / r.Wnet, 12);
        }
      }
    }
  });

  it("Carnot: η = 1 − T₂/T₁ whatever the gas or expansion", () => {
    for (const gas of THERMO_GAS_ORDER) {
      for (const ratio of [1.5, 2, 3]) {
        const r = derive({ cycle: "carnot", gas }, { Th: 500, Tc: 300, ratio });
        expect(r.eta).toBeCloseTo(0.4, 12);
        expect(r.etaCarnot).toBeCloseTo(0.4, 12);
        expect(r.Q2 / r.Q1).toBeCloseTo(300 / 500, 12);
        expect(r.Q1).toBeCloseTo(THERMO_R * 500 * Math.log(ratio), 9);
      }
    }
    expect(derive({ cycle: "carnot" }, { Th: 500, Tc: 200 }).eta).toBeCloseTo(0.6, 12);
  });

  it("closes the Carnot cycle: each corner sits on both its isotherm and its adiabat", () => {
    for (const gas of THERMO_GAS_ORDER) {
      const r = derive({ cycle: "carnot", gas }, { Th: 600, Tc: 250, ratio: 2.5 });
      const g = r.gamma;
      expect(r.PA * r.VA).toBeCloseTo(THERMO_R * 600, 9);
      expect(r.PB * r.VB).toBeCloseTo(THERMO_R * 600, 9);
      expect(r.PC * r.VC).toBeCloseTo(THERMO_R * 250, 9);
      expect(r.PD * r.VD).toBeCloseTo(THERMO_R * 250, 9);
      expect(r.PB * r.VB ** g).toBeCloseTo(r.PC * r.VC ** g, 6);
      expect(r.PD * r.VD ** g).toBeCloseTo(r.PA * r.VA ** g, 6);
    }
  });

  it("as a refrigerator: COP = Q₂/W, T₂/(T₁ − T₂) = 5 between 300 K and 250 K", () => {
    const r = derive({ cycle: "carnot" }, { Th: 300, Tc: 250 });
    expect(r.cop).toBeCloseTo(5, 12);
    expect(r.copCarnot).toBeCloseTo(5, 12);
    expect(r.Q2).toBeCloseTo(THERMO_R * 250 * Math.log(2), 9);
  });

  it("keeps the cold body below the hot one", () => {
    const r = derive({ cycle: "carnot" }, { Th: 300, Tc: 400 });
    expect(r.Tcold).toBe(290);
    expect(Number.isFinite(r.cop)).toBe(true);
  });

  it("runs the point round the corners, joining up at each", () => {
    for (const cycle of THERMO_CYCLE_ORDER) {
      const c = thermoCycle(cycle, "di", { ...base, Th: 700, Tc: 300 });
      for (let k = 0; k < 4; k++) {
        const at = thermoCyclePoint(c.shape, k);
        expect(at.V, `${cycle} ${k}`).toBeCloseTo(c.shape.V[k]!, 9);
        expect(at.P, `${cycle} ${k}`).toBeCloseTo(c.shape.P[k]!, 9);
        const end = thermoCyclePoint(c.shape, k + 0.999999);
        expect(end.P, `${cycle} end of ${k}`).toBeCloseTo(c.shape.P[(k + 1) % 4]!, 1);
      }
    }
    let s = base;
    for (let i = 0; i < 9; i++) s = model.advance(s, 1, model.defaultParams);
    expect(s.phase).toBeCloseTo(0.5, 12);
    expect(s.t).toBe(9);
  });
});

describe("the model", () => {
  it("clamps every variable to its range and numbers every output", () => {
    expect(model.setVariable(base, "V", 99, model.defaultParams).V).toBe(30);
    expect(model.setVariable(base, "Tc", 0, model.defaultParams).Tc).toBe(200);
    expect(model.setVariable(base, "nonsense", 3, model.defaultParams)).toBe(base);
    expect(model.step(base, model.defaultParams, 1).V).toBe(21);
    const extremes: Partial<HeatEngineState>[] = [
      { TA: 0, TB: 9999, CB: 0, t: -5, T1: 0, V: 0, Tend: 0, Vb: 0, Ph: 0, Th: 0, Tc: 9999, ratio: 0, phase: -1 },
      { TA: 500, TB: 500, CB: 4000, t: 20, T1: 600, V: 30, Tend: 900, Vb: 30, Ph: 400, Th: 800, Tc: 200, ratio: 3, phase: 4 },
    ];
    for (const state of extremes) {
      for (const gas of THERMO_GAS_ORDER) {
        for (const process of THERMO_PROCESS_ORDER) {
          for (const cycle of THERMO_CYCLE_ORDER) {
            const r = derive({ gas, process, cycle }, state);
            for (const key of model.outputs) expect(Number.isFinite(r[key]), `${gas} ${process} ${cycle} ${key}`).toBe(true);
            for (const key of model.outputs) expect(Object.is(r[key], -0), key).toBe(false);
          }
        }
      }
    }
  });
});
