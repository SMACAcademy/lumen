import { describe, expect, it } from "vitest";
import {
  CAP_ARRANGEMENT_ORDER,
  CAP_NETWORK_ORDER,
  CAP_POINT_A,
  CAP_SPHERE_RADIUS,
  capacitorModel as model,
  capFieldAt,
  capNetwork,
  capParallelPlate,
  capPotentialAt,
  type CapacitorParams,
  type CapacitorState,
} from "./capacitor";

const P = model.defaultParams;
const fresh = () => model.initialize(P);
const derive = (params: Partial<CapacitorParams> = {}, state: Partial<CapacitorState> = {}) => model.derive({ ...fresh(), ...state }, { ...P, ...params });
const set = (state: CapacitorState, writes: [string, number][], params: CapacitorParams = P) =>
  writes.reduce((s, [id, v]) => model.setVariable(s, id, v, params), state);

describe("the potential of point charges", () => {
  it("is kq/r: 10 nC gives 900 V at 10 cm and 1800 V at 5 cm", () => {
    expect(derive({}, { px: 10, py: 0 }).potential).toBeCloseTo(900, 9);
    expect(derive({}, { px: 0, py: 5 }).potential).toBeCloseTo(1800, 9);
    expect(derive({}, { px: 6, py: 8, q1: -5 }).potential).toBeCloseTo(-450, 9);
  });

  it("gives a field kq/r² pointing away from a positive charge", () => {
    const r = derive({}, { px: 10, py: 0 });
    expect(r.field).toBeCloseTo(9, 9);
    expect(r.fieldX).toBeCloseTo(9, 9);
    expect(r.fieldY).toBeCloseTo(0, 9);
    expect(derive({}, { px: 0, py: 5, q1: -10 }).fieldY).toBeCloseTo(-36, 9);
  });

  it("adds the potentials of two charges, and is zero all along a dipole's perpendicular bisector", () => {
    const two = { arrangement: "two" as const };
    for (const y of [-8, 0, 3, 9]) expect(derive(two, { q1: 10, q2: -10, separation: 6, px: 0, py: y }).potential).toBeCloseTo(0, 9);
    // Two +10 nC charges 6 cm apart: at the midpoint each gives 3000 V.
    expect(derive(two, { q1: 10, q2: 10, separation: 6, px: 0, py: 0 }).potential).toBeCloseTo(6000, 9);
    expect(derive(two, { q1: 10, q2: 10, separation: 6, px: 0, py: 0 }).field).toBeCloseTo(0, 9);
  });

  it("is minus the slope of the field: E = −dV/dx everywhere", () => {
    const h = 1e-5;
    for (const arrangement of CAP_ARRANGEMENT_ORDER) {
      for (const [x, y] of [[7, 3], [-9, -6], [12, 5], [2.5, -7.5]] as const) {
        const [ex, ey] = capFieldAt(arrangement, 7, -4, 6, x, y);
        const dvdx = (capPotentialAt(arrangement, 7, -4, 6, x + h, y) - capPotentialAt(arrangement, 7, -4, 6, x - h, y)) / (2 * h * 1e-2);
        const dvdy = (capPotentialAt(arrangement, 7, -4, 6, x, y + h) - capPotentialAt(arrangement, 7, -4, 6, x, y - h)) / (2 * h * 1e-2);
        expect(ex, `${arrangement} Ex at ${x},${y}`).toBeCloseTo(-dvdx, 3);
        expect(ey, `${arrangement} Ey at ${x},${y}`).toBeCloseTo(-dvdy, 3);
      }
    }
  });
});

describe("work and potential energy", () => {
  it("costs q₀(V_P − V_A) to carry the test charge from A, whichever way it goes", () => {
    const r = derive({}, { px: 5, py: 0 });
    expect(r.potentialA).toBeCloseTo(900, 9);
    expect(r.work).toBeCloseTo(0.9, 12);
    // Integrate −q₀E·dl along two different paths from A to P: both give q₀ΔV.
    const lineWork = (path: (t: number) => [number, number]) => {
      let w = 0;
      const n = 20000;
      for (let i = 0; i < n; i++) {
        const [x1, y1] = path(i / n);
        const [x2, y2] = path((i + 1) / n);
        const [ex, ey] = capFieldAt("one", 10, 0, 6, (x1 + x2) / 2, (y1 + y2) / 2);
        w -= 1e-9 * (ex * (x2 - x1) + ey * (y2 - y1)) * 1e-2;
      }
      return w * 1e6;
    };
    const [ax, ay] = CAP_POINT_A;
    const straightish = lineWork((t) => [ax + (5 - ax) * t, ay + 6 * Math.sin(Math.PI * t)]);
    const roundabout = lineWork((t) => [ax + (5 - ax) * t, ay - 9 * Math.sin(Math.PI * t)]);
    expect(straightish).toBeCloseTo(0.9, 3);
    expect(roundabout).toBeCloseTo(0.9, 3);
  });

  it("costs nothing to move along an equipotential", () => {
    expect(derive({}, { px: 10, py: 0 }).work).toBeCloseTo(0, 12);
    expect(derive({}, { px: 6, py: 8 }).work).toBeCloseTo(0, 12);
  });

  it("stores kq₁q₂/r in a pair of charges: 15 µJ for two 10 nC charges 6 cm apart, negative for unlike charges", () => {
    expect(derive({ arrangement: "two" }, { q1: 10, q2: 10, separation: 6 }).pairEnergy).toBeCloseTo(15, 9);
    expect(derive({ arrangement: "two" }, { q1: 10, q2: -10, separation: 6 }).pairEnergy).toBeCloseTo(-15, 9);
    expect(derive({ arrangement: "two" }, { q1: 10, q2: 10, separation: 12 }).pairEnergy).toBeCloseTo(7.5, 9);
    expect(derive({ arrangement: "one" }).pairEnergy).toBe(0);
    expect(derive({}, { px: 10, py: 0 }).testEnergy).toBeCloseTo(0.9, 12);
  });
});

describe("a conductor", () => {
  it("has no field inside and one potential throughout, kQ/R", () => {
    for (const [x, y] of [[0, 0], [2, 1], [-3, -2]] as const) {
      const r = derive({ arrangement: "shell" }, { q1: 4, px: x, py: y });
      expect(r).toMatchObject({ inside: 1, field: 0 });
      expect(r.potential).toBeCloseTo(900, 9);
    }
    expect(derive({ arrangement: "shell" }, { q1: 4, px: 8, py: 0 }).inside).toBe(0);
  });

  it("bends the outside field to meet its surface at right angles, three times stronger at the front", () => {
    const R = CAP_SPHERE_RADIUS + 1e-9;
    const [ex, ey] = capFieldAt("shell", 0, 0, 6, R, 0);
    expect(ex / 1000).toBeCloseTo(15, 6);
    expect(ey).toBeCloseTo(0, 6);
    // At 45°, the field along the surface is zero: it is purely radial.
    const c = R / Math.SQRT2;
    const [fx, fy] = capFieldAt("shell", 3, 0, 6, c, c);
    expect(-fx + fy).toBeCloseTo(0, 3);
    // On the sides (θ = 90°) the uncharged sphere's field is zero.
    expect(Math.hypot(...capFieldAt("shell", 0, 0, 6, 0, R))).toBeCloseTo(0, 3);
  });

  it("joins the surface potential smoothly", () => {
    expect(capPotentialAt("shell", 5, 0, 6, CAP_SPHERE_RADIUS + 1e-9, 0)).toBeCloseTo(capPotentialAt("shell", 5, 0, 6, 0, 0), 4);
  });
});

describe("the parallel-plate capacitor", () => {
  it("has C = ε₀KA/d: 88.5 pF for 100 cm² and 1 mm of air", () => {
    expect(capParallelPlate(100, 1, 1)).toBeCloseTo(88.5, 9);
    const r = derive();
    expect(r.capacitance).toBeCloseTo(88.5, 9);
    expect(r.plateCharge).toBeCloseTo(8.85, 9);
    expect(r.plateVoltage).toBeCloseTo(100, 9);
    expect(r.plateField).toBeCloseTo(100, 9);
    expect(r.plateEnergy).toBeCloseTo(0.4425, 9);
  });

  it("doubles C with twice the area, halves it with twice the gap, and multiplies it by K", () => {
    expect(derive({}, set(fresh(), [["area", 200]])).capacitance).toBeCloseTo(177, 9);
    expect(derive({}, set(fresh(), [["gap", 2]])).capacitance).toBeCloseTo(44.25, 9);
    expect(derive({}, set(fresh(), [["k", 5]])).capacitance).toBeCloseTo(442.5, 9);
    expect(derive({}, set(fresh(), [["k", 5]])).airCapacitance).toBeCloseTo(88.5, 9);
  });

  it("stores U = ½CV² = Q²/2C = ½QV", () => {
    const r = derive({}, set(fresh(), [["voltage", 200], ["area", 300]]));
    const C = r.capacitance * 1e-12;
    const Q = r.plateCharge * 1e-9;
    expect(r.plateEnergy * 1e-6).toBeCloseTo(0.5 * C * 200 * 200, 15);
    expect(r.plateEnergy * 1e-6).toBeCloseTo((Q * Q) / (2 * C), 15);
  });

  it("with the battery connected: a dielectric keeps V and E, and raises Q and U K times", () => {
    const before = derive({}, fresh());
    const after = derive({}, set(fresh(), [["k", 5]]));
    expect(after.plateVoltage).toBeCloseTo(100, 9);
    expect(after.plateField).toBeCloseTo(100, 9);
    expect(after.plateCharge).toBeCloseTo(5 * before.plateCharge, 9);
    expect(after.plateEnergy).toBeCloseTo(5 * before.plateEnergy, 9);
  });

  it("with the battery disconnected: a dielectric keeps Q, and cuts V, E and U K times", () => {
    const off = set(fresh(), [["battery", 0]]);
    const after = derive({}, set(off, [["k", 5]]));
    expect(after.connected).toBe(0);
    expect(after.plateCharge).toBeCloseTo(8.85, 9);
    expect(after.plateVoltage).toBeCloseTo(20, 9);
    expect(after.plateField).toBeCloseTo(20, 9);
    expect(after.plateEnergy).toBeCloseTo(0.4425 / 5, 9);
  });

  it("raises V with a wider gap once disconnected, and the battery voltage no longer matters", () => {
    const off = set(fresh(), [["battery", 0], ["gap", 3], ["voltage", 400]]);
    const r = derive({}, off);
    expect(r.plateCharge).toBeCloseTo(8.85, 9);
    expect(r.plateVoltage).toBeCloseTo(300, 9);
    expect(r.plateField).toBeCloseTo(100, 9);
  });

  it("recharges to CV when the battery is reconnected, and Play pulls the plates apart", () => {
    const back = set(fresh(), [["battery", 0], ["k", 4], ["battery", 1], ["battery", 0]]);
    expect(derive({}, back).plateCharge).toBeCloseTo(4 * 8.85, 9);
    let s = fresh();
    for (let i = 0; i < 10; i++) s = model.advance(s, 0.1, P);
    expect(s.gap).toBeCloseTo(2, 9);
    expect(derive({}, s).plateCharge).toBeCloseTo(8.85 / 2, 9);
    for (let i = 0; i < 200; i++) s = model.advance(s, 0.1, P);
    expect(s.gap).toBe(10);
    expect(model.step(fresh(), P, 1).gap).toBe(1.5);
  });
});

describe("combinations", () => {
  it("in series: 1/C = Σ1/Cᵢ, one charge, the voltage shared inversely", () => {
    const n = capNetwork("series", 2, 3, 6, 12);
    expect(n.ceq).toBeCloseTo(1, 12);
    expect(n.q).toEqual([12, 12, 12].map((v) => expect.closeTo(v, 9)));
    expect(n.v[0]).toBeCloseTo(6, 9);
    expect(n.v[1]).toBeCloseTo(4, 9);
    expect(n.v[2]).toBeCloseTo(2, 9);
    expect(n.energy).toBeCloseTo(72, 9);
  });

  it("in parallel: C = ΣCᵢ, one voltage, the charge shared in proportion", () => {
    const n = capNetwork("parallel", 2, 3, 6, 12);
    expect(n.ceq).toBe(11);
    expect(n.q).toEqual([24, 36, 72]);
    expect(n.v).toEqual([12, 12, 12]);
    expect(n.energy).toBeCloseTo(792, 9);
  });

  it("C₁ in series with C₂ ∥ C₃: 6 µF with 2 µF ∥ 4 µF is 3 µF", () => {
    const r = derive({ network: "mixed" }, { c1: 6, c2: 2, c3: 4, voltage: 12 });
    expect(r.ceq).toBeCloseTo(3, 12);
    expect(r.netCharge).toBeCloseTo(36, 9);
    expect([r.capQ1, r.capQ2, r.capQ3]).toEqual([36, 12, 24].map((v) => expect.closeTo(v, 9)));
    expect([r.capV1, r.capV2, r.capV3]).toEqual([6, 6, 6].map((v) => expect.closeTo(v, 9)));
  });

  it("shares charge: 6 µF at 12 V joined to an empty 3 µF settles at 8 V and loses a third of its energy", () => {
    const r = derive({ network: "share" }, { c1: 6, c2: 3, voltage: 12 });
    expect(r.capV1).toBeCloseTo(8, 9);
    expect(r.capQ1 + r.capQ2).toBeCloseTo(72, 9);
    expect(r.energyBefore).toBeCloseTo(432, 9);
    expect(r.netEnergy).toBeCloseTo(288, 9);
    expect(r.energyLost).toBeCloseTo((6 * 3 * 144) / (2 * 9), 9);
  });

  it("keeps the charge on every series capacitor equal, and the voltages adding up", () => {
    for (const network of CAP_NETWORK_ORDER.slice(0, 3)) {
      const r = derive({ network }, { c1: 5, c2: 7, c3: 2, voltage: 30 });
      expect(r.netEnergy).toBeCloseTo(0.5 * r.ceq * 30 * 30, 9);
      expect(r.energyLost).toBe(0);
    }
  });
});

describe("the model", () => {
  it("clamps every control to its range", () => {
    const s = set(fresh(), [["q1", 50], ["px", -99], ["gap", 0], ["k", 0.2], ["c3", 40], ["voltage", -5], ["battery", 7]]);
    expect(s).toMatchObject({ q1: 10, px: -15, gap: 0.5, k: 1, c3: 12, voltage: 1, battery: 1 });
    expect(model.setVariable(fresh(), "charge", 999, P).charge).toBeCloseTo(8.85, 9);
  });

  it("numbers every output, even on top of a charge", () => {
    for (const arrangement of CAP_ARRANGEMENT_ORDER) {
      for (const network of CAP_NETWORK_ORDER) {
        for (const at of [{ px: 0, py: 0 }, { px: -3, py: 0 }, { px: 15, py: -10 }]) {
          const r = derive({ arrangement, network }, { ...at, q2: 10 });
          for (const key of model.outputs) {
            expect(Number.isFinite(r[key]), `${arrangement} ${network} ${key}`).toBe(true);
            expect(Object.is(r[key], -0), `${key} is −0`).toBe(false);
          }
        }
      }
    }
  });
});
