import { degToRad } from "@ise/units";
import { describe, expect, it } from "vitest";
import { componentsOf, vectorModel as model } from "./vector";

const P = model.defaultParams;
const derive = (r: number, deg: number) => model.derive({ r, theta: degToRad(deg), time: 0 }, P);

describe("components from polar form", () => {
  it("vₓ = r cos θ and v_y = r sin θ", () => {
    const v = derive(5, 30);
    expect(v.vx).toBeCloseTo(5 * Math.cos(Math.PI / 6), 12);
    expect(v.vy).toBeCloseTo(2.5, 12);
  });

  it("gives exact zeros on the axes", () => {
    expect(componentsOf(3, Math.PI / 2).vx).toBe(0);
    expect(componentsOf(3, Math.PI).vy).toBe(0);
  });

  it("satisfies vₓ² + v_y² = r² and vₓ/r = cos θ", () => {
    for (const [r, deg] of [
      [1, 10],
      [4, 123],
      [6, 250],
      [2.5, 359],
    ] as const) {
      const v = derive(r, deg);
      expect(v.sumSquares).toBeCloseTo(v.rSquared, 10);
      expect(v.vxOverR).toBeCloseTo(v.cosTheta, 12);
      expect(v.vyOverR).toBeCloseTo(v.sinTheta, 12);
    }
  });

  it("reports quadrants with signs of the components", () => {
    expect(derive(2, 45).quadrant).toBe(1);
    expect(derive(2, 135).quadrant).toBe(2);
    expect(derive(2, 225).quadrant).toBe(3);
    expect(derive(2, 315).quadrant).toBe(4);
    expect(derive(2, 90).quadrant).toBe(0);
    expect(derive(0, 45).quadrant).toBe(0);
  });

  it("vₓ/r is undefined for the zero vector", () => {
    expect(Number.isNaN(derive(0, 30).vxOverR)).toBe(true);
  });
});

describe("writing either description", () => {
  const s0 = model.initialize(P);

  it("setting components updates magnitude and angle (3-4-5)", () => {
    let s = model.setVariable(s0, "vx", 3, P);
    s = model.setVariable(s, "vy", 4, P);
    const v = model.derive(s, P);
    expect(v.magnitude).toBeCloseTo(5, 12);
    expect(v.thetaDeg).toBeCloseTo(53.130102, 5);
    expect(model.getVariable(s, "vx")).toBeCloseTo(3, 12);
  });

  it("setting one component keeps the other", () => {
    const s = model.setVariable(s0, "vx", -2, P);
    const before = model.derive(s0, P);
    const after = model.derive(s, P);
    expect(after.vy).toBeCloseTo(before.vy, 12);
    expect(after.vx).toBeCloseTo(-2, 12);
  });

  it("flipping vₓ leaves the magnitude unchanged", () => {
    let s = model.setVariable(s0, "vx", 3, P);
    s = model.setVariable(s, "vy", 4, P);
    const flipped = model.setVariable(s, "vx", -3, P);
    expect(model.derive(flipped, P).magnitude).toBeCloseTo(5, 12);
  });

  it("the zero vector keeps its last direction", () => {
    let s = model.setVariable(s0, "magnitude", 0, P);
    expect(model.derive(s, P).magnitude).toBe(0);
    s = model.setVariable(s, "vx", 0, P);
    expect(s.theta).toBeCloseTo(s0.theta, 12);
    s = model.setVariable(s, "magnitude", 2, P);
    expect(model.derive(s, P).thetaDeg).toBeCloseTo(30, 9);
  });

  it("magnitude cannot go negative and angles wrap the short way", () => {
    expect(model.setVariable(s0, "magnitude", -3, P).r).toBe(0);
    const s = model.setVariable({ r: 1, theta: degToRad(350), time: 0 }, "theta", degToRad(10), P);
    expect(s.theta).toBeCloseTo(degToRad(370), 12);
  });
});

describe("rotation", () => {
  it("rotates at ω and steps by the step size", () => {
    const s = model.advance(model.initialize(P), 2, P);
    expect(s.theta).toBeCloseTo(Math.PI / 6 + Math.PI / 3, 12);
    const stepped = model.step({ r: 1, theta: degToRad(20), time: 0 }, P, 1);
    expect(stepped.theta).toBeCloseTo(degToRad(30), 12);
  });
});

describe("adding vectors", () => {
  const P2 = model.defaultParams;
  const add = (a: number, b: number, betweenDeg: number, operation: "add" | "subtract" = "add") =>
    model.derive({ r: a, theta: 0, time: 0, b, bTheta: degToRad(betweenDeg) }, { ...P2, operation });

  it("gives 5 for 4 and 3 at right angles, and A + B and A − B by the cosine rule", () => {
    expect(add(4, 3, 90).resultant).toBeCloseTo(5, 12);
    const r = add(4, 3, 60);
    expect(r.resultant).toBeCloseTo(Math.sqrt(37), 12);
    expect(r.resultantFormula).toBeCloseTo(r.resultant, 12);
    expect(r.resultantFromADeg).toBeCloseTo((Math.atan((3 * Math.sin(Math.PI / 3)) / (4 + 3 * Math.cos(Math.PI / 3))) * 180) / Math.PI, 9);
    expect(r.resultantFromADeg).toBeCloseTo(25.28, 2);
    const d = add(4, 3, 60, "subtract");
    expect(d.resultant).toBeCloseTo(Math.sqrt(13), 12);
    expect(d.resultantFormula).toBeCloseTo(d.resultant, 12);
    expect(d.operation).toBe(1);
  });

  it("is largest when the two point the same way and smallest when opposite", () => {
    expect(add(4, 3, 0).resultant).toBeCloseTo(7, 12);
    expect(add(4, 3, 180).resultant).toBeCloseTo(1, 12);
    expect(add(4, 3, 270).angleBetweenDeg).toBeCloseTo(90, 9);
  });

  it("agrees with the cosine rule for any directions", () => {
    for (const [ta, tb] of [
      [30, 200],
      [300, 10],
      [135, 135],
    ] as const) {
      for (const operation of ["add", "subtract"] as const) {
        const r = model.derive({ r: 2.5, theta: degToRad(ta), time: 0, b: 3.5, bTheta: degToRad(tb) }, { ...P2, operation });
        expect(r.resultantFormula).toBeCloseTo(r.resultant, 10);
      }
    }
  });

  it("writes B by size, direction or components, within its range", () => {
    const s0 = model.initialize(P2);
    let s = model.setVariable(s0, "bx", 2, P2);
    s = model.setVariable(s, "by", -2, P2);
    expect(model.getVariable(s, "b")).toBeCloseTo(Math.sqrt(8), 12);
    expect(model.getVariable(s, "bTheta")).toBeCloseTo(degToRad(315), 12);
    expect(model.getVariable(model.setVariable(s0, "b", 9, P2), "b")).toBe(4);
    expect(model.getVariable(model.setVariable(s0, "tilt", 2, P2), "tilt")).toBeCloseTo(Math.PI / 2, 12);
    expect(model.getVariable(model.setVariable(s0, "mass", 0, P2), "mass")).toBe(0.5);
    expect(model.setVariable(s0, "b", Number.NaN, P2)).toBe(s0);
  });
});

describe("resolving along chosen axes", () => {
  const P2 = model.defaultParams;
  it("splits A along axes turned through α", () => {
    const r = model.derive({ r: 4, theta: degToRad(60), time: 0, tilt: degToRad(30) }, P2);
    expect(r.alongAxis).toBeCloseTo(4 * Math.cos(Math.PI / 6), 12);
    expect(r.acrossAxis).toBeCloseTo(2, 12);
    const level = model.derive({ r: 5, theta: degToRad(40), time: 0, tilt: degToRad(40) }, P2);
    expect(level.acrossAxis).toBe(0);
    expect(level.alongAxis).toBeCloseTo(5, 12);
  });

  it("splits the weight on a slope into mg sin α and mg cos α with g = 9.8", () => {
    const r = model.derive({ r: 4, theta: 0, time: 0, mass: 2, tilt: degToRad(30) }, P2);
    expect(r.weight).toBeCloseTo(19.6, 12);
    expect(r.downSlope).toBeCloseTo(9.8, 12);
    expect(r.intoSlope).toBeCloseTo(19.6 * Math.cos(Math.PI / 6), 12);
    expect(r.downSlope ** 2 + r.intoSlope ** 2).toBeCloseTo(r.weight ** 2, 10);
    const flat = model.derive({ r: 4, theta: 0, time: 0, mass: 5, tilt: 0 }, P2);
    expect(flat.downSlope).toBe(0);
    expect(flat.intoSlope).toBeCloseTo(49, 12);
  });
});

describe("rates of change of a turning vector", () => {
  const P2 = { ...model.defaultParams, omega: Math.PI / 2 };
  const at = (deg: number, params = P2) => model.derive({ r: 4, theta: degToRad(deg), time: 0 }, params);

  it("has velocity rω along the tangent and acceleration rω² towards the centre", () => {
    const r = at(0);
    expect(r.speed).toBeCloseTo(2 * Math.PI, 12);
    expect(r.velX).toBe(0);
    expect(r.velY).toBeCloseTo(2 * Math.PI, 12);
    expect(r.accX).toBeCloseTo(-(Math.PI ** 2), 12);
    expect(r.accMagnitude).toBeCloseTo(Math.PI ** 2, 12);
    expect(r.angleRVDeg).toBeCloseTo(90, 9);
    expect(r.angleRADeg).toBeCloseTo(180, 9);
    const cw = at(0, { ...P2, direction: "cw" });
    expect(cw.velY).toBeCloseTo(-2 * Math.PI, 12);
    expect(cw.accX).toBeCloseTo(-(Math.PI ** 2), 12);
  });

  it("keeps the speed while the direction of v turns", () => {
    expect(at(90).speed).toBeCloseTo(at(0).speed, 12);
    expect(at(90).velX).toBeCloseTo(-2 * Math.PI, 12);
  });

  it("|Δr|/Δt rises to rω as Δt shrinks, and |Δv|/Δt to rω²", () => {
    const rate = (deltaT: number) => at(0, { ...P2, deltaT });
    expect(rate(2).chordLength).toBeCloseTo(8, 12);
    expect(rate(2).chordRate).toBeCloseTo(4, 12);
    expect(rate(0.1).chordRate).toBeGreaterThan(rate(0.5).chordRate);
    expect(rate(0.1).chordRate).toBeCloseTo(6.2767, 4);
    expect(rate(0.01).deltaVRate).toBeCloseTo(Math.PI ** 2, 2);
  });

  it("gives a finite number for every output, never −0", () => {
    for (const r of [0, 2]) {
      for (const deltaT of [0, 0.5]) {
        const out = model.derive({ r, theta: degToRad(180), time: 0, b: 0, bTheta: 0 }, { ...P2, deltaT });
        for (const key of model.outputs.filter((k) => k !== "vxOverR" && k !== "vyOverR")) {
          expect(Number.isFinite(out[key]), key).toBe(true);
          expect(Object.is(out[key], -0), `${key} is −0`).toBe(false);
        }
      }
    }
  });
});
