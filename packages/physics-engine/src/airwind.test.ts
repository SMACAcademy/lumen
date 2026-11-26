import { describe, expect, it } from "vitest";
import {
  AIRWIND_LIMITS,
  AIRWIND_SCENES,
  airWindCyclone,
  airWindDensity,
  airWindLiftOffSpeed,
  airWindMaxWind,
  airWindModel as model,
  airWindPressureDrop,
  airWindWarning,
  type AirWindParams,
  type AirWindState,
} from "./airwind";

const P = model.defaultParams;
const S = model.initialize(P);
const derive = (over: Partial<AirWindParams> = {}, state: Partial<AirWindState> = {}) => model.derive({ ...S, ...state }, { ...P, ...over });

describe("air presses on everything", () => {
  it("pushes the can in once air is pumped out", () => {
    // Full of air: 101.325 kPa outside and in, so no push either way.
    expect(derive({ scene: "can" }, { airInside: 100 })).toMatchObject({ outsidePressure: 101.325, insidePressure: 101.325, pushDifference: 0, canCrushed: 0 });
    // Half the air left: 50.6625 kPa inside, so the outside wins by 50.6625 kPa.
    // On one 10 cm × 10 cm side (0.01 m²) that is 50 662.5 Pa × 0.01 m² = 506.6 N.
    const half = derive({ scene: "can" }, { airInside: 50 });
    expect(half.insidePressure).toBeCloseTo(50.6625, 6);
    expect(half.pushDifference).toBeCloseTo(50.6625, 6);
    expect(half.forceOnSide).toBeCloseTo(506.625, 3);
    expect(derive({}, { airInside: 0 }).forceOnSide).toBeCloseTo(1013.25, 3);
  });

  it("crushes the thin can once the outside wins by 20 kPa, at 80 % of the air left", () => {
    // 80 %: 101.325 × 0.2 = 20.265 kPa ≥ 20. 81 %: 101.325 × 0.19 = 19.25 kPa.
    expect(derive({}, { airInside: 80 }).canCrushed).toBe(1);
    expect(derive({}, { airInside: 81 }).canCrushed).toBe(0);
  });

  it("presses on 1 m² as hard as the weight of about 10 tonnes", () => {
    // F = 101 325 Pa × 1 m² = 101 325 N; m = F / g = 101 325 / 9.8 = 10 339.3 kg.
    const r = derive({ scene: "patch" }, { area: 1 });
    expect(r.airForce).toBe(101325);
    expect(r.airForceKN).toBeCloseTo(101.325, 6);
    expect(r.holdsUpKg).toBeCloseTo(10339.29, 2);
    expect(r.holdsUpTonnes).toBeCloseTo(10.34, 2);
    // A palm, 10 cm × 10 cm: 1013.25 N, the weight of 103.4 kg.
    expect(derive({}, { area: 0.01 }).holdsUpKg).toBeCloseTo(103.39, 2);
  });
});

describe("warm air expands and rises", () => {
  it("follows ρ = pM / (RT)", () => {
    // 25 °C: 101 325 × 0.02897 / (8.314 × 298.15) = 2935.385 / 2478.819 = 1.1842 kg/m³.
    expect(airWindDensity(25)).toBeCloseTo(1.1842, 4);
    // 60 °C: 2935.385 / (8.314 × 333.15) = 2935.385 / 2769.809 = 1.0598 kg/m³.
    expect(airWindDensity(60)).toBeCloseTo(1.0598, 4);
  });

  it("lifts the warm bag and drops the cold one", () => {
    // (1.1842 − 1.0598) kg/m³ × 0.02 m³ = 2.49 g lighter than the room air it pushes aside.
    const warm = derive({ scene: "bag" }, { bagTemp: 60 });
    expect(warm.bagLift).toBeCloseTo(2.488, 3);
    expect(warm.bagMoves).toBe(1);
    // 35 K warmer than 298.15 K: 11.7 % bigger.
    expect(warm.expandsBy).toBeCloseTo(11.74, 2);
    expect(derive({}, { bagTemp: 25 })).toMatchObject({ bagLift: 0, bagMoves: 0, expandsBy: 0 });
    expect(derive({}, { bagTemp: 0 }).bagMoves).toBe(-1);
  });
});

describe("fast-moving air has lower pressure", () => {
  it("drops the pressure by ½ρv²", () => {
    // 18 km/h = 5 m/s: ½ × 1.2 × 25 = 15 Pa. 36 km/h = 10 m/s: 60 Pa. 72 km/h = 20 m/s: 240 Pa.
    expect(airWindPressureDrop(18)).toBeCloseTo(15, 9);
    expect(airWindPressureDrop(36)).toBeCloseTo(60, 9);
    expect(derive({ scene: "blow" }, { windSpeed: 72 })).toMatchObject({ pressureDrop: 240, pressureBetween: 101.085, windSpeedMs: 20, drawnIn: 1 });
    expect(derive({ scene: "blow" }, { windSpeed: 0 })).toMatchObject({ pressureDrop: 0, drawnIn: 0 });
  });

  it("lifts the 20 m² roof once ½ρv² × 20 m² beats 600 kg × 9.8 N/kg", () => {
    // v = √(2 × 5880 / (1.2 × 20)) = √490 = 22.14 m/s = 79.7 km/h.
    expect(airWindLiftOffSpeed()).toBeCloseTo(79.69, 2);
    expect(derive({ setup: "roof" }, { windSpeed: 79 }).roofLifts).toBe(0);
    const r = derive({ setup: "roof" }, { windSpeed: 80 });
    // 80 km/h = 22.22 m/s: ½ × 1.2 × 493.8 = 296.3 Pa, × 20 m² = 5926 N.
    expect(r.upliftForce).toBeCloseTo(5925.93, 2);
    expect(r.roofLifts).toBe(1);
    // A 200 km/h cyclone wind: 1851.9 Pa × 20 m² = 37 037 N, the weight of 3779 kg.
    expect(derive({}, { windSpeed: 200 }).upliftKg).toBeCloseTo(3779.3, 1);
  });
});

describe("winds blow from high pressure to low", () => {
  it("lowers the pressure over the warmer place by 0.1 kPa per °C", () => {
    const summer = derive({ scene: "wind", map: "monsoon" }, { landLead: 10 });
    expect(summer).toMatchObject({ warmBy: 10, pressureGap: 1, warmPressure: 100.325, coolPressure: 101.325, windDirection: 1, rain: 1 });
    const winter = derive({ scene: "wind", map: "monsoon" }, { landLead: -8 });
    expect(winter).toMatchObject({ warmBy: 8, windDirection: -1, rain: 0 });
    expect(winter.warmPressure).toBeCloseTo(100.525, 6);
    expect(derive({ scene: "wind" }, { landLead: 0.2 }).windDirection).toBe(0);
  });

  it("sends the wind along the ground towards the warm equator, with no monsoon rain", () => {
    expect(derive({ scene: "wind", map: "earth" }, { equatorLead: 30 })).toMatchObject({ warmBy: 30, pressureGap: 3, windDirection: 1, rain: 0, map: 1 });
  });
});

describe("a cyclone", () => {
  it("has its strongest wind where ΔP = 1.125 ρ v_max²", () => {
    // ΔP = 5 kPa: v_max = √(5000 / 1.35) = 60.86 m/s = 219.1 km/h.
    expect(airWindMaxWind(5)).toBeCloseTo(219.09, 2);
    // 2.5 kPa: √(2500 / 1.35) = 43.03 m/s = 154.9 km/h.
    expect(airWindMaxWind(2.5)).toBeCloseTo(154.92, 2);
  });

  it("is calm with the lowest pressure in the eye, wildest at the eye wall, gentler far out", () => {
    const centre = derive({ scene: "cyclone" }, { centralDrop: 5, distance: 0 });
    expect(centre).toMatchObject({ windHere: 0, pressureHere: 96.325, centrePressure: 96.325, inEye: 1, region: 0 });
    const wall = derive({ scene: "cyclone" }, { centralDrop: 5, distance: 15 });
    expect(wall.windHere).toBeCloseTo(219.09, 2);
    expect(wall.inEye).toBe(0);
    // 10 km, the edge of the eye: (10/15)⁴ = 0.1975 of 219.1 = 43.3 km/h.
    expect(derive({}, { distance: 10 }).windHere).toBeCloseTo(43.28, 2);
    // 60 km: √(15/60) = ½ of 219.1 = 109.5 km/h.
    expect(derive({}, { distance: 60 }).windHere).toBeCloseTo(109.54, 2);
    // Pressure at 100 km: 96.325 + 1.2 × 3703.7 × (1/8 + 1 − 0.15) / 1000 = 96.325 + 4.333 = 100.658 kPa.
    expect(derive({}, { distance: 100 }).pressureHere).toBeCloseTo(100.658, 3);
    expect(derive({}, { distance: 300 }).region).toBe(2);
  });

  it("rises steadily in pressure from the centre outwards", () => {
    let last = -Infinity;
    for (let r = 0; r <= 300; r += 5) {
      const p = airWindCyclone(5, r).pressure;
      expect(p).toBeGreaterThanOrEqual(last);
      last = p;
    }
    // Far away it nears the 101.325 kPa outside.
    expect(airWindCyclone(5, 1e7).pressure).toBeCloseTo(101.325, 3);
  });
});

describe("tracking a cyclone", () => {
  it("issues an alert 48 h and a warning 24 h before it reaches the coast", () => {
    expect(derive({ scene: "track" }, { coastDistance: 600, stormSpeed: 15 })).toMatchObject({ hoursToCoast: 40, warning: 1 });
    expect(airWindWarning(721, 15)).toBe(0);
    expect(airWindWarning(720, 15)).toBe(1);
    expect(airWindWarning(361, 15)).toBe(1);
    expect(airWindWarning(360, 15)).toBe(2);
    expect(airWindWarning(0, 15)).toBe(3);
  });
});

describe("the model's plumbing", () => {
  it("clamps every variable it is given", () => {
    for (const [key, [lo, hi]] of Object.entries(AIRWIND_LIMITS)) {
      expect(model.getVariable(model.setVariable(S, key, hi + 1000, P), key), key).toBe(hi);
      expect(model.getVariable(model.setVariable(S, key, lo - 1000, P), key), key).toBe(lo);
      expect(model.getVariable(model.setVariable(S, key, Number.NaN, P), key), key).toBe(lo);
    }
    expect(model.setVariable(S, "nope", 3, P)).toBe(S);
  });

  it("gives finite numbers everywhere, with no −0", () => {
    const lowest = Object.fromEntries(Object.entries(AIRWIND_LIMITS).map(([k, [lo]]) => [k, lo])) as unknown as AirWindState;
    const highest = Object.fromEntries(Object.entries(AIRWIND_LIMITS).map(([k, [, hi]]) => [k, hi])) as unknown as AirWindState;
    for (const scene of AIRWIND_SCENES) {
      for (const state of [S, lowest, highest]) {
        const r = model.derive(state, { ...P, scene });
        for (const key of model.outputs) {
          expect(Number.isFinite(r[key]), `${scene} ${key}`).toBe(true);
          expect(Object.is(r[key], -0), `${scene} ${key}`).toBe(false);
        }
      }
    }
  });

  it("plays each scene forward", () => {
    expect(model.advance(S, 1, { ...P, scene: "can" }).airInside).toBe(90);
    expect(model.advance(S, 1, { ...P, scene: "bag" }).bagTemp).toBe(35);
    expect(model.advance(S, 1, { ...P, scene: "blow" }).windSpeed).toBe(56);
    expect(model.advance(S, 1, { ...P, scene: "wind", map: "earth" }).equatorLead).toBe(35);
    expect(model.advance(S, 1, { ...P, scene: "cyclone" }).distance).toBe(80);
    // 15 km/h × 4 h = 60 km nearer the coast each second.
    expect(model.advance(S, 1, { ...P, scene: "track" }).coastDistance).toBe(540);
    expect(model.advance({ ...S, airInside: 3 }, 1, { ...P, scene: "can" }).airInside).toBe(0);
  });

  it("steps each scene's own variable", () => {
    expect(model.step(S, { ...P, scene: "can" }, -1).airInside).toBe(95);
    expect(model.step(S, { ...P, scene: "patch" }, 1).area).toBeCloseTo(1.01, 9);
    expect(model.step(S, { ...P, scene: "wind", map: "earth" }, 1).equatorLead).toBe(35);
    expect(model.step(S, { ...P, scene: "track" }, -1).coastDistance).toBe(580);
  });
});
