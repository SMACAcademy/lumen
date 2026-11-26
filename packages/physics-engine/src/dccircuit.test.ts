import { describe, expect, it } from "vitest";
import {
  DC_CELLS_ORDER,
  DC_MATERIAL_ORDER,
  DC_NETWORK_ORDER,
  DC_POT_CELL_ORDER,
  DC_RANGES,
  DC_RC_PHASE_ORDER,
  dcBridgeCurrent,
  dcCircuitModel as model,
  dcKirchhoff,
  dcPotentiometerCurrent,
  dcSolveLinear,
  type DcCircuitParams,
  type DcCircuitState,
} from "./dccircuit";

const P = model.defaultParams;
const base = model.initialize(P);
const derive = (state: Partial<DcCircuitState> = {}, params: Partial<DcCircuitParams> = {}) => model.derive({ ...base, ...state }, { ...P, ...params });

describe("the linear solver", () => {
  it("solves a 3 × 3 system exactly, pivoting past a zero", () => {
    const x = dcSolveLinear(
      [
        [0, 2, 1],
        [1, 1, 1],
        [2, 1, -1],
      ],
      [7, 6, 1],
    );
    // x = 1, y = 2, z = 3
    expect(x[0]).toBeCloseTo(1, 12);
    expect(x[1]).toBeCloseTo(2, 12);
    expect(x[2]).toBeCloseTo(3, 12);
  });
});

describe("drift of electrons", () => {
  it("gives NCERT's 1.1 mm/s for 1.5 A in a copper wire of 1.0 × 10⁻⁷ m²", () => {
    const r = derive({ current: 1.5, area: 0.1 });
    // v = I / (neA) = 1.5 / (8.5e28 × 1.6e-19 × 1e-7) = 1.5 / 1360
    expect(r.driftSpeed).toBeCloseTo((1.5 / 1360) * 1000, 10);
    expect(r.driftSpeed).toBeCloseTo(1.103, 3);
    expect(r.currentDensity).toBeCloseTo(1.5e7, 3);
    expect(r.driftField).toBeCloseTo(0.255, 10);
    expect(r.electronRate).toBeCloseTo(9.375e18, -14);
    expect(r.driftTime).toBeCloseTo(1360 / 1.5, 6);
  });

  it("doubles the drift for double the current, halves it for double the area", () => {
    expect(derive({ current: 3 }).driftSpeed).toBeCloseTo(2 * derive({ current: 1.5 }).driftSpeed, 12);
    expect(derive({ area: 0.2 }).driftSpeed).toBeCloseTo(derive({ area: 0.1 }).driftSpeed / 2, 12);
  });

  it("finds copper's mobility 1/(neρ) and relaxation time m/(ne²ρ), whatever the current", () => {
    const r = derive({ current: 4, area: 2 });
    expect(r.mobility).toBeCloseTo(1 / (8.5e28 * 1.6e-19 * 1.7e-8), 12);
    expect(r.mobility).toBeCloseTo(4.33e-3, 5);
    expect(r.relaxation).toBeCloseTo(2.46e-14, 16);
  });
});

describe("resistance and resistivity", () => {
  it("makes 1 m of 0.1 mm² nichrome 10 Ω at 0 °C, R = ρL/A", () => {
    expect(derive({ temp: 0, length: 1, area: 0.1 }).wireR).toBeCloseTo(10, 10);
    expect(derive({ temp: 0, length: 2, area: 0.1 }).wireR).toBeCloseTo(20, 10);
    expect(derive({ temp: 0, length: 1, area: 0.2 }).wireR).toBeCloseTo(5, 10);
  });

  it("raises ρ by ρ₀α(T − T₀)", () => {
    expect(derive({ temp: 100 }).wireR).toBeCloseTo(10.4, 10);
    const cu = derive({ temp: 100 }, { material: "copper" });
    expect(cu.rho).toBeCloseTo(1.7e-8 * 1.68, 20);
    expect(cu.wireRatio).toBeCloseTo(1.68, 12);
    // Manganin barely changes: why it is used for standard resistors.
    expect(derive({ temp: 100 }, { material: "manganin" }).wireRatio).toBeCloseTo(1.0002, 12);
  });

  it("obeys Ohm's law across the wire", () => {
    const r = derive({ temp: 0, emf: 5 });
    expect(r.wireI).toBeCloseTo(0.5, 12);
    expect(r.wireP).toBeCloseTo(2.5, 12);
  });
});

describe("series and parallel", () => {
  it("adds resistors in series", () => {
    const r = derive({ emf: 6, r1: 10, r2: 20, r3: 30 }, { network: "series" });
    expect(r).toMatchObject({ netReq: 60 });
    expect(r.netI).toBeCloseTo(0.1, 12);
    expect([r.netV1, r.netV2, r.netV3].map((v) => +v.toFixed(10))).toEqual([1, 2, 3]);
  });

  it("adds reciprocals in parallel, and the currents add up", () => {
    const r = derive({ emf: 6, r1: 10, r2: 20, r3: 30 }, { network: "parallel" });
    expect(r.netReq).toBeCloseTo(60 / 11, 12);
    expect(r.netI1).toBeCloseTo(0.6, 12);
    expect(r.netI2).toBeCloseTo(0.3, 12);
    expect(r.netI3).toBeCloseTo(0.2, 12);
    expect(r.netI).toBeCloseTo(1.1, 12);
  });

  it("puts R₁ in series with R₂ ∥ R₃", () => {
    const r = derive({ emf: 6, r1: 10, r2: 20, r3: 30 }, { network: "mixed" });
    expect(r.netReq).toBeCloseTo(22, 12);
    expect(r.netI1).toBeCloseTo(6 / 22, 12);
    expect(r.netI2 + r.netI3).toBeCloseTo(r.netI1, 12);
    expect(r.netI2 / r.netI3).toBeCloseTo(1.5, 12);
    expect(r.netV1 + r.netV2).toBeCloseTo(6, 12);
    expect(r.netP1 + r.netP2 + r.netP3).toBeCloseTo(r.netP, 12);
  });
});

describe("a cell with internal resistance", () => {
  it("drops Ir inside the cell: 6 V, 1 Ω into 5 Ω gives 1 A at 5 V", () => {
    const r = derive({ emf: 6, intR: 1, load: 5 });
    expect(r.cellI).toBeCloseTo(1, 12);
    expect(r.terminal).toBeCloseTo(5, 12);
    expect(r.loadP).toBeCloseTo(5, 12);
    expect(r.lostP).toBeCloseTo(1, 12);
    expect(r.supplyP).toBeCloseTo(6, 12);
    expect(r.efficiency).toBeCloseTo(500 / 6, 10);
  });

  it("gives the load the most power, E²/4r, when R = r", () => {
    const at = derive({ emf: 6, intR: 1, load: 1 });
    expect(at).toMatchObject({ atMax: 1 });
    expect(at.loadP).toBeCloseTo(9, 12);
    expect(at.maxP).toBeCloseTo(9, 12);
    expect(at.efficiency).toBeCloseTo(50, 12);
    for (const load of [0.5, 1.5, 2, 5, 20]) expect(derive({ emf: 6, intR: 1, load }).loadP).toBeLessThan(9);
  });
});

describe("cells in combination", () => {
  it("adds emfs and internal resistances in series, and subtracts emfs when opposed", () => {
    const series = derive({ emf: 6, intR: 1, emf2: 1.5, intR2: 0.5, load: 5 }, { cells: "series" });
    expect(series).toMatchObject({ eqEmf: 7.5, eqR: 1.5 });
    expect(series.cellI).toBeCloseTo(7.5 / 6.5, 12);
    const opposed = derive({ emf: 6, intR: 1, emf2: 1.5, intR2: 0.5, load: 5 }, { cells: "opposing" });
    expect(opposed).toMatchObject({ eqEmf: 4.5, eqR: 1.5 });
    expect(opposed.cellI2).toBeCloseTo(-opposed.cellI, 12);
  });

  it("combines cells in parallel as E = (E₁r₂ + E₂r₁)/(r₁ + r₂), r = r₁r₂/(r₁ + r₂)", () => {
    const r = derive({ emf: 6, intR: 1, emf2: 3, intR2: 2, load: 4 }, { cells: "parallel" });
    expect(r.eqEmf).toBeCloseTo(5, 12);
    expect(r.eqR).toBeCloseTo(2 / 3, 12);
    expect(r.cellI).toBeCloseTo(5 / (4 + 2 / 3), 12);
    expect(r.terminal).toBeCloseTo(30 / 7, 12);
    // The weaker cell is charged by the stronger.
    expect(r.cellI1).toBeCloseTo(6 - 30 / 7, 12);
    expect(r.cellI2).toBeCloseTo((3 - 30 / 7) / 2, 12);
    expect(r.cellI1 + r.cellI2).toBeCloseTo(r.cellI, 12);
    expect(r.supplyP).toBeCloseTo(r.loadP + r.lostP, 12);
  });

  it("gives two identical cells in parallel the same emf and half the resistance", () => {
    const r = derive({ emf: 2, intR: 1, emf2: 2, intR2: 1, load: 1.5 }, { cells: "parallel" });
    expect(r.eqEmf).toBeCloseTo(2, 12);
    expect(r.eqR).toBeCloseTo(0.5, 12);
    expect(r.cellI).toBeCloseTo(1, 12);
  });
});

describe("Kirchhoff's rules", () => {
  it("solves 12 V, 6 V, 2 Ω, 3 Ω, 6 Ω to I₁ = 2 A, I₂ = −2/3 A, I₃ = 4/3 A", () => {
    const [i1, i2, i3] = dcKirchhoff(12, 6, 2, 3, 6);
    expect(i1).toBeCloseTo(2, 12);
    expect(i2).toBeCloseTo(-2 / 3, 12);
    expect(i3).toBeCloseTo(4 / 3, 12);
    const r = derive({ emf: 12, emf2: 6, r1: 2, r2: 3, r3: 6 });
    expect(r.kNode).toBeCloseTo(8, 12);
  });

  it("satisfies the junction rule and both loop rules for any values", () => {
    for (const [e1, e2, r1, r2, r3] of [[6, 1.5, 10, 20, 30], [9, 12, 4, 7, 2], [1, 20, 100, 1, 50]] as const) {
      const r = derive({ emf: e1, emf2: e2, r1, r2, r3 });
      expect(r.kI1 + r.kI2).toBeCloseTo(r.kI3, 12);
      expect(r.kI1 * r1 + r.kI3 * r3).toBeCloseTo(e1, 10);
      expect(r.kI2 * r2 + r.kI3 * r3).toBeCloseTo(e2, 10);
    }
  });

  it("leaves the second cell idle when E₂ equals the junction potential", () => {
    expect(derive({ emf: 12, emf2: 9, r1: 2, r2: 3, r3: 6 }).kI2).toBe(0);
  });
});

describe("the Wheatstone bridge", () => {
  it("is balanced, with no galvanometer current, when P/Q = R/S", () => {
    const r = derive({ r1: 10, r2: 20, r3: 30, box: 60 });
    expect(r).toMatchObject({ bridgeBalanced: 1, bridgeIg: 0, balancingS: 60 });
    expect(dcBridgeCurrent(6, 10, 20, 30, 60)).toBeCloseTo(0, 14);
    expect(dcBridgeCurrent(6, 5, 7, 15, 21)).toBeCloseTo(0, 14);
  });

  it("drives 13.04 mA through a 20 Ω galvanometer when S = 40 Ω", () => {
    // Node equations by hand: 0.2V_B − 0.05V_D = 0.6 and −0.05V_B + (13/120)V_D = 0.2,
    // so V_D = 3.65217 V, V_B = 3.91304 V and I_g = 0.26087 / 20 A.
    const r = derive({ emf: 6, r1: 10, r2: 20, r3: 30, box: 40 });
    expect(r.bridgeBalanced).toBe(0);
    expect(r.bridgeIg).toBeCloseTo(13.0435, 3);
    expect(derive({ emf: 6, r1: 10, r2: 20, r3: 30, box: 80 }).bridgeIg).toBeLessThan(0);
  });
});

describe("the metre bridge", () => {
  it("balances 10 Ω of nichrome against 10 Ω at 50 cm", () => {
    const r = derive({ temp: 0, box: 10, jockey: 50 });
    expect(r.meterBalance).toBeCloseTo(50, 10);
    expect(r).toMatchObject({ meterNull: 1 });
    expect(r.meterIg).toBeCloseTo(0, 12);
    expect(r.meterReading).toBeCloseTo(10, 12);
    expect(r.rhoMeasured).toBeCloseTo(1e-6, 18);
  });

  it("balances X/S = l/(100 − l) and reads X = S·l/(100 − l)", () => {
    const r = derive({ temp: 0, box: 15, jockey: 40 });
    expect(r.meterBalance).toBeCloseTo(40, 10);
    expect(r.meterReading).toBeCloseTo(10, 12);
    expect(r.meterIg).toBeCloseTo(0, 12);
    const off = derive({ temp: 0, box: 15, jockey: 30 });
    expect(off.meterNull).toBe(0);
    expect(Math.abs(off.meterIg)).toBeGreaterThan(1);
    expect(derive({ temp: 0, box: 15, jockey: 50 }).meterIg * off.meterIg).toBeLessThan(0);
  });
});

describe("the potentiometer", () => {
  it("balances 6 V at 600 cm on a wire of 1 V per metre", () => {
    const r = derive({ emf: 6, potJockey: 600 });
    expect(r).toMatchObject({ potGradient: 1, potOnWire: 1, potNull: 1 });
    expect(r.potBalance).toBeCloseTo(600, 10);
    expect(r.potIg).toBeCloseTo(0, 12);
    expect(Math.abs(derive({ emf: 6, potJockey: 400 }).potIg)).toBeGreaterThan(1);
  });

  it("finds r = R(l₁/l₂ − 1): 6 V, 1 Ω shunted by 5 Ω balances at 500 cm", () => {
    const r = derive({ emf: 6, intR: 1, load: 5, potJockey: 500 }, { potCell: "shunted" });
    expect(r.potBalance).toBeCloseTo(500, 10);
    expect(r).toMatchObject({ potNull: 1 });
    expect(r.potL1).toBeCloseTo(600, 10);
    expect(r.potL2).toBeCloseTo(500, 10);
    expect(r.potInternal).toBeCloseTo(1, 12);
    expect(derive({ intR: 2.3, load: 7 }).potInternal).toBeCloseTo(2.3, 12);
  });

  it("compares two emfs by their balance lengths", () => {
    const r = derive({ emf: 6, emf2: 1.5, potJockey: 150 }, { potCell: "second" });
    expect(r.potLE2).toBeCloseTo(150, 10);
    expect(r.potEmfRatio).toBeCloseTo(4, 12);
    expect(r.potNull).toBe(1);
    expect(dcPotentiometerCurrent(1.5, 0.5, 150)).toBeCloseTo(0, 12);
  });

  it("cannot balance a cell stronger than the driver", () => {
    const r = derive({ emf: 12, potJockey: 1000 });
    expect(r).toMatchObject({ potOnWire: 0, potNull: 0 });
  });
});

describe("charging and discharging a capacitor", () => {
  it("has τ = RC: 10 kΩ × 100 µF = 1 s, reaching 63.2 % after one τ", () => {
    const r = derive({ emf: 6, rcR: 10, rcC: 100, time: 1 });
    expect(r.tau).toBeCloseTo(1, 12);
    expect(r.rcQmax).toBeCloseTo(600, 12);
    expect(r.rcQ).toBeCloseTo(600 * (1 - Math.exp(-1)), 10);
    expect(r.rcFraction).toBeCloseTo(63.21, 2);
    expect(r.rcI0).toBeCloseTo(0.6, 12);
    expect(r.rcI).toBeCloseTo(0.6 * Math.exp(-1), 12);
    expect(r.rcV + r.rcI * 10).toBeCloseTo(6, 12);
  });

  it("discharges from full, to 36.8 % after one τ", () => {
    const r = derive({ emf: 6, rcR: 10, rcC: 100, time: 1 }, { rcPhase: "discharge" });
    expect(r.rcFraction).toBeCloseTo(36.79, 2);
    expect(r.rcV).toBeCloseTo(r.rcI * 10, 12);
    expect(derive({ time: 0 }, { rcPhase: "discharge" }).rcFraction).toBe(100);
    expect(derive({ time: 0 }).rcQ).toBe(0);
  });

  it("runs the clock on with play, stopping at 8τ", () => {
    let s = model.initialize(P);
    for (let i = 0; i < 400; i++) s = model.advance(s, 0.05, P);
    expect(s.time).toBeCloseTo(8, 10);
    expect(s.clock).toBeCloseTo(20, 8);
    expect(model.step({ ...base, time: 1.2 }, P, 1).time).toBeCloseTo(1.5, 12);
  });
});

describe("the model", () => {
  it("clamps every control to its range", () => {
    for (const [key, [lo, hi]] of Object.entries(DC_RANGES)) {
      expect(model.setVariable(base, key, hi + 1000, P)[key as keyof DcCircuitState], key).toBe(hi);
      expect(model.setVariable(base, key, lo - 1000, P)[key as keyof DcCircuitState], key).toBe(lo);
      expect(model.getVariable(model.setVariable(base, key, (lo + hi) / 2, P), key)).toBe((lo + hi) / 2);
    }
    expect(model.setVariable(base, "nonsense", 3, P)).toBe(base);
  });

  it("numbers every output, at the ends of every range and in every arrangement", () => {
    const ends = [0, 1].map((k) => Object.fromEntries(Object.entries(DC_RANGES).map(([key, range]) => [key, range[k]])) as Partial<DcCircuitState>);
    for (const state of [{}, ...ends]) {
      for (const material of DC_MATERIAL_ORDER) for (const network of DC_NETWORK_ORDER) for (const cells of DC_CELLS_ORDER) for (const potCell of DC_POT_CELL_ORDER) for (const rcPhase of DC_RC_PHASE_ORDER) {
        const r = derive(state, { material, network, cells, potCell, rcPhase });
        for (const key of model.outputs) {
          expect(Number.isFinite(r[key]), `${key}`).toBe(true);
          expect(Object.is(r[key], -0), `${key} is −0`).toBe(false);
        }
      }
    }
  });
});
