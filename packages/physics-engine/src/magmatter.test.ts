import { describe, expect, it } from "vitest";
import {
  MAGMATTER_CORES,
  magmatterLoopPoint,
  magmatterModel as model,
  type MagmatterParams,
  type MagmatterState,
} from "./magmatter";

const P = model.defaultParams;
const S = model.initialize(P);
const derive = (params: Partial<MagmatterParams> = {}, state: Partial<MagmatterState> = {}) => model.derive({ ...S, ...state }, { ...P, ...params });
const deg = (d: number) => (d * Math.PI) / 180;

describe("the bar magnet as a dipole", () => {
  it("gives NCERT's fields 15 cm from a 0.48 J/T magnet", () => {
    const r = derive({ moment: 0.48 }, { r: 15 });
    expect(r.bAxis).toBeCloseTo(28.44, 2);
    expect(r.bEquator).toBeCloseTo(14.22, 2);
  });

  it("is twice as strong on the axis as on the equator, and falls as 1/r³", () => {
    const near = derive({ moment: 1 }, { r: 10 });
    expect(near.ratio).toBeCloseTo(2, 12);
    expect(near.bAxis).toBeCloseTo(200, 9);
    expect(derive({ moment: 1 }, { r: 20 }).bAxis).toBeCloseTo(25, 9);
  });

  it("points along m on the axis and against it on the equator", () => {
    expect(derive({ probe: "axis" })).toMatchObject({ along: 1, probe: 0 });
    expect(derive({ probe: "equator" })).toMatchObject({ along: -1, probe: 1 });
    expect(derive({ probe: "equator" }, { r: 15 }).bProbe).toBe(derive({}, { r: 15 }).bEquator);
  });

  it("has no net flux out of a closed surface", () => {
    expect(derive().netFlux).toBe(0);
  });
});

describe("a magnet in a uniform field", () => {
  it("feels a torque mB sin θ and has energy −mB cos θ", () => {
    const r = derive({ moment: 0.36, field: 250 }, { theta: deg(30) });
    expect(r.torque).toBeCloseTo(0.045, 12);
    expect(r.energy).toBeCloseTo(-0.09 * Math.cos(deg(30)), 12);
    expect(derive({ moment: 0.36, field: 250 }, { theta: deg(90) }).torqueRatio).toBeCloseTo(1, 12);
    expect(derive({ moment: 0.36, field: 250 }, { theta: Math.PI }).energy).toBeCloseTo(0.09, 12);
    expect(derive({}, { theta: 0 })).toMatchObject({ equilibrium: 1, torque: 0, work: 0 });
    expect(derive({}, { theta: Math.PI }).equilibrium).toBe(2);
  });

  it("swings with NCERT's period: 10 oscillations in about 6.7 s", () => {
    const r = derive({ moment: 0.067, field: 10 });
    expect(r.period).toBeCloseTo(0.665, 3);
    expect(derive({ moment: 0.067, field: 40 }).period).toBeCloseTo(r.period / 2, 12);
  });

  it("swings back to where it started after one period, for a small swing", () => {
    const params = { ...P, moment: 0.067, field: 10 };
    const period = model.derive(S, params).period;
    let s = model.setVariable(S, "theta", deg(5), params);
    for (let i = 0; i < 100; i++) s = model.advance(s, period / 100, params);
    expect(s.theta).toBeCloseTo(deg(5), 3);
  });
});

describe("the Earth's field", () => {
  it("splits into B_H = B cos δ and B_V = B sin δ, with tan δ = B_V / B_H", () => {
    const delhi = derive({ place: "delhi" });
    expect(delhi.bH).toBeCloseTo(47 * Math.cos(deg(43)), 9);
    expect(delhi.bH).toBeCloseTo(34.37, 2);
    expect(delhi.bV / delhi.bH).toBeCloseTo(Math.tan(delhi.dip), 9);
    expect(derive({ place: "srinagar" }).bV).toBeCloseTo(37.74, 2);
  });

  it("has a dip rising from the south of India to the north, and no horizontal field at the pole", () => {
    const dips = ["thiruvananthapuram", "chennai", "mumbai", "delhi", "srinagar"].map((place) => derive({ place: place as MagmatterParams["place"] }).dip);
    expect([...dips].sort((a, b) => a - b)).toEqual(dips);
    expect(derive({ place: "pole" })).toMatchObject({ bH: 0, compass: 0 });
    expect(derive({ place: "thiruvananthapuram" }).total).toBe(40);
  });

  it("shows a larger apparent dip out of the meridian, and 90° at right angles to it", () => {
    expect(derive({ place: "delhi" }, { tilt: 0 }).apparentDip).toBeCloseTo(deg(43), 12);
    const sixty = derive({ place: "delhi" }, { tilt: deg(60) }).apparentDip;
    expect(Math.tan(sixty)).toBeCloseTo(2 * Math.tan(deg(43)), 9);
    expect(derive({ place: "delhi" }, { tilt: Math.PI / 2 }).apparentDip).toBeCloseTo(Math.PI / 2, 9);
  });
});

describe("magnetic materials", () => {
  it("sets H = nI and B = μ₀(H + M)", () => {
    const r = derive({ material: "aluminium", current: 2 });
    expect(r.hField).toBe(2000);
    expect(r.magnetisation).toBeCloseTo(0.046, 12);
    expect(r.bInside).toBeCloseTo(4e-7 * Math.PI * 2000.046, 15);
    expect(r.muR).toBeCloseTo(1.000023, 12);
  });

  it("gives diamagnets small negative χ, paramagnets small positive χ and ferromagnets a huge one", () => {
    expect(derive({ material: "bismuth" })).toMatchObject({ kind: 0, chi: -1.66e-5, pull: -1 });
    expect(derive({ material: "aluminium" })).toMatchObject({ kind: 1, chi: 2.3e-5, pull: 1 });
    const iron = derive({ material: "iron", current: 0.1 });
    expect(iron.kind).toBe(2);
    expect(iron.chi).toBeGreaterThan(1000);
  });

  it("saturates iron at about 2 T", () => {
    expect(derive({ material: "iron", current: 2 }).bInside).toBeCloseTo(2.05, 2);
  });

  it("follows Curie's law for oxygen", () => {
    expect(derive({ material: "oxygen", temperature: 200 }).chi / derive({ material: "oxygen", temperature: 400 }).chi).toBeCloseTo(2, 12);
    expect(derive({ material: "aluminium", temperature: 200 }).chi).toBe(derive({ material: "aluminium", temperature: 400 }).chi);
  });

  it("turns iron paramagnetic above 1043 K", () => {
    expect(derive({ material: "iron", temperature: 1040 }).kind).toBe(2);
    const hot = derive({ material: "iron", temperature: 1050 });
    expect(hot.kind).toBe(1);
    expect(hot.chi).toBeCloseTo(2.3 / 7, 12);
    expect(derive({ material: "nickel", temperature: 640 }).kind).toBe(1);
  });
});

describe("hysteresis", () => {
  it("keeps the retentivity at H = 0 and loses it all at H = −H_c", () => {
    const steel = derive({ core: "steel" }, { cycle: 0.25 });
    expect(steel.hLoop).toBe(0);
    expect(steel.bLoop).toBeCloseTo(1.0, 9);
    expect(steel.falling).toBe(1);
    const core = MAGMATTER_CORES.steel;
    const c = Math.acos(-core.coercivity / core.maxField) / (2 * Math.PI);
    expect(magmatterLoopPoint(core, c).b).toBeCloseTo(0, 9);
    expect(derive({ core: "soft-iron" }, { cycle: 0.75 }).bLoop).toBeCloseTo(-1.2, 9);
  });

  it("closes the loop, saturated at the tips", () => {
    for (const core of Object.values(MAGMATTER_CORES)) {
      expect(magmatterLoopPoint(core, 0).b).toBeCloseTo(magmatterLoopPoint(core, 0.999999).b, 4);
      expect(magmatterLoopPoint(core, 0).b).toBeGreaterThan(0.99 * core.saturation);
    }
  });

  it("loses about 4·B_s·H_c per cycle: far more for steel than for soft iron", () => {
    expect(derive({ core: "soft-iron" }).loss).toBeCloseTo(512, -1);
    expect(derive({ core: "steel" }).loss).toBeCloseTo(22400, -2);
  });

  it("goes round the loop on Play", () => {
    const s = model.advance({ ...S, cycle: 0.9 }, 1.6, P);
    expect(s.cycle).toBeCloseTo(0.1, 9);
  });
});

describe("the model", () => {
  it("clamps every variable to its control's range", () => {
    expect(model.setVariable(S, "r", 2, P).r).toBe(10);
    expect(model.setVariable(S, "theta", 9, P).theta).toBeCloseTo(Math.PI, 12);
    expect(model.setVariable(S, "tilt", -1, P).tilt).toBe(0);
    expect(model.setVariable(S, "cycle", 3, P).cycle).toBe(1);
    expect(model.setVariable({ ...S, omega: 4 }, "theta", 1, P).omega).toBe(0);
  });

  it("numbers every output, everywhere", () => {
    for (const material of ["bismuth", "oxygen", "nickel", "iron"] as const)
      for (const place of ["thiruvananthapuram", "pole"] as const)
        for (const state of [{ r: 10, theta: 0, tilt: 0, cycle: 0 }, { r: 50, theta: Math.PI, tilt: Math.PI / 2, cycle: 1 }]) {
          const r = derive({ material, place, current: 0, temperature: 1500 }, state);
          for (const key of model.outputs) {
            expect(Number.isFinite(r[key]), key).toBe(true);
            expect(Object.is(r[key], -0), key).toBe(false);
          }
        }
  });
});
