import { describe, expect, it } from "vitest";
import {
  INDUCTION_MAGNET_FAR,
  INDUCTION_MU0,
  inductionCoilRadius,
  inductionDipoleFlux,
  inductionDipoleFluxSlope,
  inductionMagnetAt,
  inductionMagnetPosition,
  inductionModel as model,
  type InductionParams,
  type InductionState,
} from "./induction";

const P = model.defaultParams;
const base: InductionState = model.initialize(P);
const derive = (params: Partial<InductionParams> = {}, state: Partial<InductionState> = {}) => model.derive({ ...base, ...state }, { ...P, ...params });

describe("magnetic flux", () => {
  it("is BA cos θ through one turn, and N times that through the coil", () => {
    const square = derive({ field: 0.5, area: 100, tilt: 0 });
    expect(square.fluxPerTurn).toBeCloseTo(0.005, 12);
    expect(square.linkage).toBeCloseTo(0.5, 12);
    expect(derive({ field: 0.5, area: 100, tilt: 60 }).fluxPerTurnMilli).toBeCloseTo(2.5, 9);
    expect(derive({ tilt: 90 })).toMatchObject({ fluxPerTurn: 0, fluxPerTurnMilli: 0, linkage: 0, cosTilt: 0 });
    expect(derive({ tilt: 180 }).fluxPerTurn).toBeCloseTo(-0.005, 12);
  });
});

describe("a magnet and a coil", () => {
  it("uses the exact on-axis flux of a dipole, and its slope", () => {
    const a = 0.05;
    expect(inductionDipoleFlux(0, a)).toBeCloseTo((INDUCTION_MU0 * 2) / (2 * a), 15);
    for (const x of [0.01, 0.03, 0.1]) {
      const h = 1e-7;
      expect(inductionDipoleFluxSlope(x, a)).toBeCloseTo((inductionDipoleFlux(x + h, a) - inductionDipoleFlux(x - h, a)) / (2 * h), 8);
    }
    expect(inductionCoilRadius(100)).toBeCloseTo(Math.sqrt(0.01 / Math.PI), 12);
  });

  it("gives ε = −N dΦ/dt: the linkage's rate of change, with the sign turned round", () => {
    const params = { ...P, magnetSpeed: 0.5 };
    const dt = 1e-5;
    const t = 0.4;
    const d0 = inductionMagnetPosition(t - dt, params);
    const d1 = inductionMagnetPosition(t + dt, params);
    const rate = (inductionMagnetAt(d1, params).linkage - inductionMagnetAt(d0, params).linkage) / (2 * dt);
    expect(inductionMagnetAt(inductionMagnetPosition(t, params), params).emf).toBeCloseTo(-rate, 7);
  });

  it("makes a bigger EMF the faster the magnet moves, in proportion", () => {
    const slow = derive({ magnetSpeed: 0.2 }, { d: 3 }).magnetEmfSize;
    const fast = derive({ magnetSpeed: 0.8 }, { d: 3 }).magnetEmfSize;
    expect(fast / slow).toBeCloseTo(4, 9);
    expect(derive({ magnetSpeed: 0.5 }, { d: 3 }).magnetEmfMilli).toBeCloseTo(16.9, 1);
  });

  it("makes no EMF once the magnet stops, though the flux is largest then", () => {
    const home = derive({ motion: "in" }, { d: 0 });
    expect(home).toMatchObject({ moving: 0, magnetEmf: 0, circulation: 0, facePole: 0, push: 0, approaching: 0 });
    expect(home.magnetLinkage).toBeCloseTo(100 * inductionDipoleFlux(0, inductionCoilRadius(100)), 12);
    expect(derive({ motion: "out" }, { d: INDUCTION_MAGNET_FAR }).moving).toBe(0);
  });

  it("obeys Lenz's law: the near face repels a magnet coming in and attracts one going out", () => {
    const cases = [
      { pole: "north", motion: "in", face: 1, circulation: 1, push: 1 },
      { pole: "north", motion: "out", face: -1, circulation: -1, push: -1 },
      { pole: "south", motion: "in", face: -1, circulation: -1, push: 1 },
      { pole: "south", motion: "out", face: 1, circulation: 1, push: -1 },
    ] as const;
    for (const c of cases) {
      const r = derive({ pole: c.pole, motion: c.motion }, { d: 5 });
      expect(r.facePole, `${c.pole} ${c.motion}`).toBe(c.face);
      expect(r.circulation, `${c.pole} ${c.motion}`).toBe(c.circulation);
      expect(r.push, `${c.pole} ${c.motion}`).toBe(c.push);
      // Pushing in raises |Φ|, so the induced EMF has the opposite sign to Φ.
      expect(Math.sign(r.magnetEmf), `${c.pole} ${c.motion}`).toBe(c.motion === "in" ? -Math.sign(r.magnetLinkage) : Math.sign(r.magnetLinkage));
    }
  });

  it("moves the magnet in or out with play and stops at the end", () => {
    let s = base;
    for (let i = 0; i < 200; i++) s = model.advance(s, 0.01, { ...P, magnetSpeed: 0.5 });
    expect(s.d).toBe(0);
    const out = model.advance({ ...base, d: 10 }, 0.1, { ...P, motion: "out", magnetSpeed: 0.5 });
    expect(out.d).toBeCloseTo(15, 9);
    expect(derive({ magnetSpeed: 0.5 }, { d: 5 }).elapsed).toBeCloseTo(0.5, 12);
    expect(derive({ magnetSpeed: 0.5 }).tripTime).toBeCloseTo(0.6, 12);
  });
});

describe("a rod sliding on rails", () => {
  it("gives ε = Bvl, I = ε/R, F = BIl and needs exactly the power that turns to heat", () => {
    const r = derive({ field: 0.5, rodLength: 0.5, rodVelocity: 2, resistance: 1 });
    expect(r.motionalEmf).toBeCloseTo(0.5, 12);
    expect(r.rodCurrent).toBeCloseTo(0.5, 12);
    expect(r.rodForce).toBeCloseTo(0.125, 12);
    expect(r.pushPower).toBeCloseTo(0.25, 12);
    expect(r.heatPower).toBeCloseTo(r.pushPower, 12);
    expect(derive({ resistance: 4 }).rodForce).toBeCloseTo(0.03125, 12);
  });

  it("drives current anticlockwise when moving right in a field into the page, and pushes back", () => {
    expect(derive({ rodVelocity: 2 })).toMatchObject({ rodSense: 1, topPositive: 1, forceDirection: -1 });
    expect(derive({ rodVelocity: -1 })).toMatchObject({ rodSense: -1, topPositive: -1, forceDirection: 1 });
    expect(derive({ rodVelocity: 0 })).toMatchObject({ rodSense: 0, forceDirection: 0, motionalEmf: 0, rodForce: 0 });
  });

  it("matches ε to the rate of change of the flux B l x", () => {
    const params = { ...P, rodVelocity: 1.5 };
    const before = model.derive({ ...base, rodX: 0.4 }, params);
    const after = model.derive(model.advance({ ...base, rodX: 0.4 }, 0.1, params), params);
    expect((after.rodFlux - before.rodFlux) / 0.1).toBeCloseTo(before.motionalEmf, 9);
  });
});

describe("eddy currents", () => {
  it("brake a solid plate hard, a slotted plate a little, and a plastic one not at all", () => {
    const [solid, slotted, plastic] = (["solid", "slotted", "plastic"] as const).map((plate) => derive({ plate, field: 0.5 }));
    expect(solid!.halfTime).toBeLessThan(slotted!.halfTime);
    expect(slotted!.halfTime).toBeLessThan(plastic!.halfTime);
    expect([solid!.eddyStrength, slotted!.eddyStrength, plastic!.eddyStrength]).toEqual([2, 1, 0]);
    expect(derive({ plate: "solid", field: 0.6 }).halfTime).toBeLessThan(derive({ plate: "solid", field: 0.2 }).halfTime);
  });

  it("dies away with time", () => {
    expect(derive({ plate: "solid", field: 0.5 }, { t: 0 }).swing).toBe(30);
    expect(derive({ plate: "solid", field: 0.5 }, { t: 2 }).swing).toBeLessThan(5);
    expect(derive({ plate: "plastic", field: 0.5 }, { t: 2 }).swing).toBeGreaterThan(28);
  });
});

describe("self and mutual inductance", () => {
  it("gives a solenoid L = μ₀n²Al", () => {
    const r = derive({ solTurns: 1000, solLength: 25, solArea: 20 });
    expect(r.turnDensity).toBeCloseTo(4000, 9);
    expect(r.inductance).toBeCloseTo(INDUCTION_MU0 * 4000 * 4000 * 0.002 * 0.25, 15);
    expect(r.inductanceMilli).toBeCloseTo(10.05, 2);
    expect(derive({ solTurns: 2000 }).inductance / derive({ solTurns: 1000 }).inductance).toBeCloseTo(4, 9);
  });

  it("opposes a change of current with −L dI/dt and stores ½LI²", () => {
    const rising = derive({ rampRate: 10 }, { current: 2 });
    expect(rising.changing).toBe(1);
    expect(rising.backEmf).toBeCloseTo(-0.1005, 4);
    expect(rising.energy).toBeCloseTo(0.0201, 4);
    const falling = derive({ rampRate: -10 }, { current: 2 });
    expect(falling.backEmf).toBeCloseTo(0.1005, 4);
    expect(derive({ rampRate: 10 }, { current: 5 })).toMatchObject({ changing: 0, backEmf: 0, secondaryEmf: 0 });
    expect(derive({ rampRate: -10 }, { current: 0 })).toMatchObject({ changing: 0, backEmf: 0 });
  });

  it("links the second coil only through the solenoid's own cross-section", () => {
    const r = derive({ solTurns: 1000, solLength: 25, solArea: 20, turns: 100, area: 100, rampRate: 10 }, { current: 2 });
    expect(r.mutual).toBeCloseTo(INDUCTION_MU0 * 4000 * 100 * 0.002, 15);
    expect(r.secondaryEmfMilli).toBeCloseTo(10.05, 2);
    expect(r.secondaryEmf).toBeLessThan(0);
    expect(r.secondaryLinkage).toBeCloseTo(r.mutual * 2, 15);
    expect(derive({ area: 40 }).mutual).toBe(derive({ area: 20 }).mutual);
    expect(derive({ area: 10 }).mutual).toBeCloseTo(derive({ area: 20 }).mutual / 2, 15);
  });

  it("ramps the current with play, between 0 and 5 A", () => {
    expect(model.advance(base, 0.5, { ...P, rampRate: 4 }).current).toBeCloseTo(2, 12);
    expect(model.advance({ ...base, current: 4.9 }, 1, { ...P, rampRate: 4 }).current).toBe(5);
    expect(model.advance({ ...base, current: 1 }, 1, { ...P, rampRate: -4 }).current).toBe(0);
  });
});

describe("the AC generator", () => {
  it("gives ε = NBAω sin ωt, peaking at NBAω when the coil's plane lies along the field", () => {
    const quarter = derive({ turns: 100, area: 100, field: 0.5, spin: 1 }, { t: 0.25 });
    expect(quarter.peakEmf).toBeCloseTo(Math.PI, 12);
    expect(quarter.genEmf).toBeCloseTo(Math.PI, 9);
    expect(quarter.genAngle).toBeCloseTo(90, 9);
    expect(quarter.genLinkage).toBe(0);
    const start = derive({ spin: 1 }, { t: 0 });
    expect(start.genEmf).toBe(0);
    expect(start.genLinkage).toBeCloseTo(0.5, 12);
    expect(derive({ spin: 1 }, { t: 0.75 }).genEmf).toBeCloseTo(-Math.PI, 9);
  });

  it("is −N dΦ/dt", () => {
    const params = { ...P, spin: 2 };
    const h = 1e-6;
    const at = (t: number) => model.derive({ ...base, t }, params);
    expect(at(0.1).genEmf).toBeCloseTo(-(at(0.1 + h).genLinkage - at(0.1 - h).genLinkage) / (2 * h), 5);
  });
});

describe("the model", () => {
  it("numbers every output, never −0", () => {
    for (const params of [P, { ...P, pole: "south" as const, motion: "out" as const, rodVelocity: 0, rampRate: 0, tilt: 90 }]) {
      for (const state of [base, { d: 0, rodX: 1, current: 5, t: 60 }]) {
        const r = model.derive(state, params);
        for (const key of model.outputs) {
          expect(Number.isFinite(r[key]), key).toBe(true);
          expect(Object.is(r[key], -0), key).toBe(false);
        }
      }
    }
  });

  it("clamps what it is given to the controls' ranges", () => {
    expect(model.setVariable(base, "d", 99, P).d).toBe(30);
    expect(model.setVariable(base, "rodX", 0, P).rodX).toBe(0.1);
    expect(model.setVariable(base, "current", 9, P).current).toBe(5);
    expect(model.setVariable(base, "t", -1, P).t).toBe(0);
    expect(model.setVariable(base, "nope", 1, P)).toBe(base);
    expect(model.step(base, P, 1).t).toBeCloseTo(0.05, 12);
  });
});
