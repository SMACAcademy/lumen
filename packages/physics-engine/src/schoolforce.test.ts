import { describe, expect, it } from "vitest";
import {
  SF_G_EARTH,
  SF_G_MOON,
  sfFallTime,
  sfFeatherTime,
  sfGravitation,
  sfPressure,
  schoolForceModel as model,
  type SchoolForceParams,
  type SchoolForceState,
} from "./schoolforce";

const P = model.defaultParams;
const S0 = model.initialize(P);
const derive = (over: Partial<SchoolForceParams> = {}, state: Partial<SchoolForceState> = {}) =>
  model.derive({ ...S0, ...state }, { ...P, ...over });
const moving = (v: number) => ({ startSpeed: v, v });

describe("pushes and pulls", () => {
  it("adds forces the same way and subtracts opposite ones", () => {
    expect(derive({ forceA: 20, forceB: 10, together: "same" }).applied).toBe(30);
    expect(derive({ forceA: 20, forceB: 10, together: "opposite" }).applied).toBe(10);
    const left = derive({ forceA: 10, forceB: 25, together: "opposite" });
    expect(left).toMatchObject({ applied: -15, appliedSize: 15, appliedDir: -1 });
    expect(derive({ forceA: 30, forceB: 30, together: "opposite" })).toMatchObject({ applied: 0, appliedDir: 0, netForce: 0, fate: 0 });
  });
});

describe("friction", () => {
  // A 5 kg box weighs 5 × 9.8 = 49 N.
  it("holds a box still until the push beats static friction", () => {
    const glass = derive({ surface: "glass", forceA: 9 });
    expect(glass.frictionLimit).toBeCloseTo(9.8, 9); // 0.2 × 49
    expect(glass).toMatchObject({ fate: 0, netForce: 0 });
    expect(glass.frictionSize).toBeCloseTo(9, 9); // friction matches the push exactly
    const going = derive({ surface: "glass", forceA: 20 });
    expect(going.fate).toBe(1);
    expect(going.frictionSize).toBeCloseTo(7.35, 9); // sliding 0.15 × 49
    expect(going.netForce).toBeCloseTo(12.65, 9);
    expect(going.accel).toBeCloseTo(2.53, 9);
  });

  it("is larger on rougher surfaces, and smallest when rolling", () => {
    const [glass, wood, sand] = (["glass", "wood", "sand"] as const).map((surface) => derive({ surface }));
    expect([glass!.frictionLimit, wood!.frictionLimit, sand!.frictionLimit].map((f) => +f.toFixed(2))).toEqual([9.8, 24.5, 39.2]);
    expect([glass!.movingFriction, wood!.movingFriction, sand!.movingFriction].map((f) => +f.toFixed(2))).toEqual([7.35, 19.6, 29.4]);
    expect(derive({ surface: "wood", wheels: "wheels" }).movingFriction).toBeCloseTo(0.98, 9);
    for (const surface of ["glass", "wood", "sand"] as const) {
      const slide = derive({ surface });
      const roll = derive({ surface, wheels: "wheels" });
      expect(roll.movingFriction).toBeLessThan(slide.movingFriction);
      expect(slide.movingFriction).toBeLessThan(slide.frictionLimit);
    }
  });

  it("grows with the weight of the box", () => {
    expect(derive({ mass: 10 }).frictionLimit / derive({ mass: 5 }).frictionLimit).toBeCloseTo(2, 12);
  });

  it("slows a sliding box to a stop: d = v² / 2a", () => {
    // Wood, 3 m/s: a = 19.6 / 5 = 3.92 m/s², d = 9 / 7.84 = 1.148 m.
    const wood = derive({ surface: "wood" }, moving(3));
    expect(wood.fate).toBe(3);
    expect(wood.stopDistance).toBeCloseTo(9 / 7.84, 9);
    expect(derive({ surface: "sand" }, moving(3)).stopDistance).toBeCloseTo(9 / (2 * 5.88), 9);
    expect(derive({ surface: "glass" }, moving(3)).stopDistance).toBeCloseTo(9 / (2 * 1.47), 9);
    expect(derive({ surface: "glass", wheels: "wheels" }, moving(3)).stopDistance).toBeCloseTo(9 / (2 * 0.098), 6);
  });

  it("names what a force does to a moving box: speed up, slow down, or turn it back", () => {
    expect(derive({ surface: "glass", forceA: 20 }, moving(2)).fate).toBe(1);
    expect(derive({ surface: "wood", forceA: 10 }, moving(2)).fate).toBe(3);
    expect(derive({ surface: "glass", forceA: 40, together: "same" }, moving(2)).fate).toBe(1);
    expect(derive({ surface: "glass", forceA: 0, forceB: 40, together: "opposite" }, moving(2)).fate).toBe(4);
    expect(derive({ surface: "wood", forceA: 19.6 }, moving(2)).fate).toBe(2);
  });

  it("plays the slide out and stops where the sum says", () => {
    let s = model.setVariable(S0, "startSpeed", 3, P);
    for (let i = 0; i < 120; i++) s = model.advance(s, 1 / 60, P);
    expect(s.v).toBe(0);
    expect(s.x).toBeCloseTo(9 / 7.84, 3);
  });

  it("turns a box back when a big push opposes it", () => {
    const params = { ...P, surface: "glass" as const, forceA: 0, forceB: 40, together: "opposite" as const };
    let s = model.setVariable(S0, "startSpeed", 2, params);
    for (let i = 0; i < 120; i++) s = model.advance(s, 1 / 60, params);
    expect(s.v).toBeLessThan(0);
  });
});

describe("pressure", () => {
  it("is force divided by area, in pascals", () => {
    expect(sfPressure(500, 5000)).toBeCloseTo(1000, 9); // 500 N on 0.5 m²
    expect(derive({ pressForce: 200, area: 100 }).pressure).toBeCloseTo(20000, 6);
    expect(derive({ pressForce: 200, area: 400 }).pressure).toBeCloseTo(5000, 6);
    expect(derive({ pressForce: 20, area: 0.01 }).pressure).toBeCloseTo(2e7, 0); // a nail's point
    expect(derive({ pressForce: 600, area: 3000 }).pressure).toBeCloseTo(2000, 6); // skis
    expect(derive({ area: 250 }).areaM2).toBeCloseTo(0.025, 12);
  });
});

describe("gravitation", () => {
  it("follows F = G m₁ m₂ / d²", () => {
    expect(sfGravitation(100, 100, 1)).toBeCloseTo(6.67e-7, 18);
    expect(derive({ massA: 100, massB: 100, distance: 2 }).gravForce).toBeCloseTo(1.6675e-7, 18);
  });

  it("is four times as strong at half the distance, twice for twice the mass", () => {
    expect(sfGravitation(100, 100, 1) / sfGravitation(100, 100, 2)).toBeCloseTo(4, 12);
    expect(sfGravitation(200, 100, 2) / sfGravitation(100, 100, 2)).toBeCloseTo(2, 12);
    expect(sfGravitation(100, 100, 4) / sfGravitation(100, 100, 2)).toBeCloseTo(0.25, 12);
  });

  it("is tiny next to the Earth's pull", () => {
    expect(derive({ massA: 100 }).earthPullA).toBeCloseTo(980, 9);
  });
});

describe("free fall", () => {
  it("drops everything with the same g when there is no air", () => {
    const r = derive({ air: "vacuum" }, { dropHeight: 4.9 });
    expect(r.coinTime).toBeCloseTo(1, 12); // 4.9 = ½ × 9.8 × 1²
    expect(r.featherTime).toBeCloseTo(1, 12);
    expect(r).toMatchObject({ together: 1, hasAir: 0 });
    expect(r.impactSpeed).toBeCloseTo(9.8, 12);
  });

  it("holds the feather back in air", () => {
    const r = derive({ air: "air" }, { dropHeight: 2 });
    expect(r.coinTime).toBeCloseTo(sfFallTime(2, 9.8), 12);
    expect(r.coinTime).toBeCloseTo(0.639, 3);
    expect(r.featherTime).toBeCloseTo(4.05, 2); // ≈ 2 m at 0.5 m/s, plus a moment to speed up
    expect(r).toMatchObject({ together: 0, hasAir: 1 });
    expect(sfFeatherTime(2, 9.8)).toBeGreaterThan(4);
  });

  it("has no air on the Moon, so both fall together, more slowly", () => {
    const r = derive({ air: "air", gravity: SF_G_MOON }, { dropHeight: 2 });
    expect(r).toMatchObject({ hasAir: 0, together: 1, onMoon: 1 });
    expect(r.coinTime).toBeCloseTo(Math.sqrt(4 / 1.63), 12);
  });

  it("shows the coin and feather falling as the clock runs", () => {
    const r = derive({ air: "vacuum" }, { dropHeight: 4.9, t: 0.5 });
    expect(r.coinDrop).toBeCloseTo(1.225, 12);
    expect(r.featherDrop).toBeCloseTo(1.225, 12);
    expect(derive({ air: "vacuum" }, { dropHeight: 4.9, t: 1.2 })).toMatchObject({ coinLanded: 1, featherLanded: 1, coinDrop: 4.9 });
  });
});

describe("mass and weight", () => {
  it("weighs m g: the same mass weighs about a sixth as much on the Moon", () => {
    const earth = derive({ mass: 60, gravity: SF_G_EARTH });
    const moon = derive({ mass: 60, gravity: SF_G_MOON });
    expect(earth.weight).toBeCloseTo(588, 9);
    expect(moon.weight).toBeCloseTo(97.8, 9);
    expect(moon.mass).toBe(earth.mass);
    expect(moon.weight / earth.weight).toBeCloseTo(1 / 6, 1);
  });
});

describe("state", () => {
  it("clamps its controls and restarts the clock", () => {
    expect(model.setVariable(S0, "startSpeed", 9, P)).toMatchObject({ startSpeed: 3, v: 3, x: 0, t: 0 });
    expect(model.setVariable(S0, "dropHeight", 50, P).dropHeight).toBe(20);
    expect(model.setVariable(S0, "dropHeight", 0, P).dropHeight).toBe(1);
  });

  it("numbers every output, never −0", () => {
    for (const r of [derive(), derive({ forceA: 30, forceB: 30, together: "opposite" }), derive({ mass: 0, distance: 0, area: 0, gravity: 0 })]) {
      for (const key of model.outputs) {
        expect(Number.isFinite(r[key]), key).toBe(true);
        expect(Object.is(r[key], -0), key).toBe(false);
      }
    }
  });
});
