import { describe, expect, it } from "vitest";
import {
  alphaPath,
  closestApproach,
  MATTER_PARTICLE_ORDER,
  matterWaveModel as model,
  SCATTER_TARGET_ORDER,
  scatteringAngle,
  type MatterWaveParams,
  type MatterWaveState,
} from "./matterwave";

const base: MatterWaveState = { logSpeed: 6, logDx: -10, impact: 100, energy: 5.5 };
const derive = (params: Partial<MatterWaveParams> = {}, state: Partial<MatterWaveState> = {}) =>
  model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });

describe("matter waves", () => {
  it("gives an electron at 10⁶ m/s a wavelength the size of an atom", () => {
    const r = derive({ particle: "electron" });
    expect(r.wavelengthPm).toBeCloseTo(727.4, 0);
    expect(r.wavelike).toBe(1);
    expect(r.kineticEV).toBeCloseTo(2.84, 2);
  });

  it("gives a cricket ball a wavelength far below anything measurable", () => {
    const r = derive({ particle: "ball" }, { logSpeed: 1.5 });
    expect(r.wavelength).toBeLessThan(1e-33);
    expect(r.wavelike).toBe(0);
  });

  it("halves the wavelength when the speed doubles, and shortens it for heavier particles", () => {
    const at = (logSpeed: number) => derive({}, { logSpeed }).wavelength;
    expect(at(6 + Math.log10(2))).toBeCloseTo(at(6) / 2, 16);
    const byMass = MATTER_PARTICLE_ORDER.map((particle) => derive({ particle }).wavelength);
    for (let i = 1; i < byMass.length; i++) expect(byMass[i]).toBeLessThan(byMass[i - 1]!);
  });
});

describe("the uncertainty principle", () => {
  it("leaves an electron pinned to an atom's width unsure of its speed by 579 km/s", () => {
    expect(derive({ particle: "electron" }, { logDx: -10 }).dvKmPerS).toBeCloseTo(578.9, 0);
    // NCERT: Δx = 0.1 Å gives 5.79 × 10⁶ m/s.
    expect(derive({ particle: "electron" }, { logDx: -11 }).logDv).toBeCloseTo(Math.log10(5.79e6), 3);
  });

  it("trades position for velocity: ten times sharper, ten times blurrier", () => {
    expect(derive({}, { logDx: -11 }).logDv - derive({}, { logDx: -10 }).logDv).toBeCloseTo(1, 10);
  });

  it("is nothing for a cricket ball", () => {
    expect(derive({ particle: "ball" }, { logDx: -6 }).logDv).toBeLessThan(-27);
  });
});

describe("Rutherford scattering", () => {
  it("stops a 7.7 MeV alpha 30 fm from a gold nucleus, as NCERT works out", () => {
    expect(closestApproach(79, 7.7)).toBeCloseTo(29.5, 1);
    expect(derive({}, { energy: 5.5 }).closest).toBeCloseTo(41.4, 1);
  });

  it("turns a head-on alpha straight back, and a wide miss hardly at all", () => {
    expect(derive({}, { impact: 0 })).toMatchObject({ deflection: 180, backscatter: 1 });
    expect(derive({}, { impact: 0 }).minDistance).toBeCloseTo(41.4, 1);
    expect(derive({}, { impact: 200 }).deflection).toBeLessThan(12);
    expect(derive({}, { impact: 200 }).backscatter).toBe(0);
  });

  it("turns through exactly 90° when b is half the closest approach", () => {
    expect(scatteringAngle(20, 40)).toBeCloseTo(90, 10);
    expect(scatteringAngle(-20, 40)).toBeCloseTo(90, 10);
  });

  it("bends less for a faster alpha or a lighter nucleus", () => {
    expect(derive({}, { energy: 10, impact: 50 }).deflection).toBeLessThan(derive({}, { energy: 5, impact: 50 }).deflection);
    const byZ = SCATTER_TARGET_ORDER.map((target) => derive({ target }, { impact: 50 }).deflection);
    for (let i = 1; i < byZ.length; i++) expect(byZ[i]).toBeLessThan(byZ[i - 1]!);
  });

  it("integrates a path that agrees with the formulas", () => {
    for (const b of [10, 20.7, 60, 150]) {
      const d = 41.4;
      const path = alphaPath(b, d);
      const nearest = Math.min(...path.map(([x, y]) => Math.hypot(x, y)));
      const half = (scatteringAngle(b, d) * Math.PI) / 360;
      expect(Math.abs(nearest / ((d / 2) * (1 + 1 / Math.sin(half))) - 1), `b = ${b}`).toBeLessThan(0.01);
      const [[x1, y1], [x2, y2]] = path.slice(-2) as [[number, number], [number, number]];
      const turned = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
      expect(Math.abs(turned - scatteringAngle(b, d)), `b = ${b}`).toBeLessThan(3);
    }
  });

  it("lets nothing bounce back from Thomson's atom", () => {
    for (const impact of [0, 50, 200]) {
      const r = derive({ atomModel: "pudding" }, { impact });
      expect(r.deflection).toBeLessThan(0.05);
      expect(r.backscatter).toBe(0);
    }
  });
});

describe("the model", () => {
  it("aims closer on play, then starts again from a wide miss", () => {
    let s = model.initialize(model.defaultParams);
    s = model.advance(s, 2, model.defaultParams);
    expect(s.impact).toBe(50);
    s = model.advance(s, 3, model.defaultParams);
    expect(s.impact).toBe(200);
  });

  it("keeps every control in range and numbers every output", () => {
    let s = model.initialize(model.defaultParams);
    for (const [id, value] of [["logSpeed", 20], ["logDx", 0], ["impact", -5], ["energy", 99]] as const) s = model.setVariable(s, id, value, model.defaultParams);
    expect(s).toEqual({ logSpeed: 7.5, logDx: -3, impact: 0, energy: 10 });
    for (const particle of MATTER_PARTICLE_ORDER) {
      for (const atomModel of ["nuclear", "pudding"] as const) {
        const r = model.derive(s, { particle, target: "gold", atomModel });
        for (const key of model.outputs) expect(Number.isFinite(r[key]), `${particle} ${atomModel} ${key}`).toBe(true);
      }
    }
  });
});
