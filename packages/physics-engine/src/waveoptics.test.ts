import { describe, expect, it } from "vitest";
import {
  WAVE_OPTICS_BELOW_ORDER,
  WAVE_OPTICS_LIGHT_ORDER,
  WAVE_OPTICS_SLITS_ORDER,
  waveOpticsAiry,
  waveOpticsBesselJ1,
  waveOpticsFringeWidth,
  waveOpticsModel as model,
  waveOpticsWhiteTwoSlit,
  type WaveOpticsParams,
  type WaveOpticsState,
} from "./waveoptics";

const P = model.defaultParams;
const S = model.initialize(P);
const derive = (state: Partial<WaveOpticsState> = {}, params: Partial<WaveOpticsParams> = {}) => model.derive({ ...S, ...state }, { ...P, ...params });

describe("Young's double slit", () => {
  it("makes fringes β = λD/d wide: 600 nm, 0.5 mm, 1 m gives 1.2 mm", () => {
    expect(derive().fringeWidth).toBeCloseTo(1.2, 12);
    expect(waveOpticsFringeWidth(500, 1.5, 0.25)).toBeCloseTo(3, 12);
    // Violet, green and red through the same slits.
    expect([400, 550, 700].map((wavelength) => derive({ wavelength }).fringeWidth)).toEqual([0.8, 1.1, 1.4].map((v) => expect.closeTo(v, 12)));
    // Twice the screen distance, twice the fringe; twice the slit separation, half.
    expect(derive({ screenDist: 2 }).fringeWidth).toBeCloseTo(2.4, 12);
    expect(derive({ slitSep: 1 }).fringeWidth).toBeCloseTo(0.6, 12);
  });

  it("puts the bright fringes where the path difference is nλ, at y = nβ", () => {
    for (const n of [0, 1, 2, 3]) {
      const r = derive({ probe: 1.2 * n });
      expect(r.pathDiff).toBeCloseTo(600 * n, 9);
      expect(r.pathWaves).toBeCloseTo(n, 12);
      expect(r.intensity).toBeCloseTo(4, 9);
      expect(r.fringe).toBe(2);
    }
    expect(derive({ probe: -2.4 })).toMatchObject({ fringe: 2 });
    expect(derive({ probe: -2.4 }).pathDiff).toBeCloseTo(-1200, 9);
  });

  it("puts the dark fringes half-way, at path difference (n + ½)λ", () => {
    for (const y of [0.6, 1.8, 3.0]) {
      const r = derive({ probe: y });
      expect(r.intensity).toBeCloseTo(0, 9);
      expect(r.fringe).toBe(1);
    }
    expect(derive({ probe: 1.8 }).pathWaves).toBeCloseTo(1.5, 12);
  });

  it("follows I = 4I₀cos²(φ/2): a quarter of a fringe from the centre is 2I₀", () => {
    const r = derive({ probe: 0.3 });
    expect(r.pathDiff).toBeCloseTo(150, 9);
    expect(r.phase).toBeCloseTo(Math.PI / 2, 12);
    expect(r.intensity).toBeCloseTo(2, 12);
    expect(r.fringe).toBe(0);
    expect(derive({ probe: 0.2 }).intensity).toBeCloseTo(3, 12);
  });

  it("lights the screen evenly with one slit covered, and with two separate lamps", () => {
    expect(derive({ probe: 0.6 }, { slits: "one" })).toMatchObject({ intensity: 1, fringe: 3, interferes: 0 });
    expect(derive({ probe: 0.6 }, { slits: "lamps" })).toMatchObject({ intensity: 2, fringe: 3, interferes: 0 });
    expect(derive({}, { slits: "both" }).interferes).toBe(1);
  });

  it("gives white light a bright central fringe that washes out to an even 2I₀", () => {
    expect(derive({ probe: 0 }, { light: "white" })).toMatchObject({ intensity: 4, fringe: 4 });
    for (const delta of [15000, 20000, 30000, 40000]) expect(Math.abs(waveOpticsWhiteTwoSlit(delta) - 2), `${delta}`).toBeLessThan(0.1);
    // Off-centre the colours stop agreeing, so the first fringe is no longer fully bright or dark.
    const first = derive({ probe: 1.2 }, { light: "white" }).intensity;
    expect(first).toBeLessThan(4);
    expect(first).toBeGreaterThan(2);
  });

  it("steps the probe half a fringe at a time", () => {
    let s = model.initialize(P);
    s = model.step(s, P, 1);
    expect(s.probe).toBeCloseTo(0.6, 12);
    s = model.step(s, P, 1);
    expect(model.derive(s, P).fringe).toBe(2);
    expect(model.step(s, P, -1).probe).toBeCloseTo(0.6, 12);
  });
});

describe("single-slit diffraction", () => {
  it("is dark at a·y/D = nλ, so the central maximum is 2λD/a wide", () => {
    const r = derive({ slitWidth: 0.1 });
    expect(r.firstMinimum).toBeCloseTo(6, 12);
    expect(r.centralWidth).toBeCloseTo(12, 12);
    for (const y of [6, 12, 18, -6]) expect(derive({ slitWidth: 0.1, probe: y }).singleIntensity).toBeCloseTo(0, 12);
    expect(derive({ slitWidth: 0.1, probe: 12 }).slitWaves).toBeCloseTo(2, 12);
    expect(derive({ slitWidth: 0.1, probe: 0 }).singleIntensity).toBe(1);
  });

  it("has secondary maxima much fainter than the centre, near (n + ½)λD/a", () => {
    // The first secondary maximum is at u = 4.493 (just short of 1.5π), at 4.7% of the centre.
    const y = (4.4934 / Math.PI) * 6;
    expect(derive({ slitWidth: 0.1, probe: y }).singleIntensity).toBeCloseTo(0.0472, 4);
    expect(derive({ slitWidth: 0.1, probe: 9 }).singleIntensity).toBeCloseTo(4 / (9 * Math.PI * Math.PI), 9);
  });

  it("spreads more through a narrower slit", () => {
    expect(derive({ slitWidth: 0.05 }).centralWidth).toBeCloseTo(24, 12);
    expect(derive({ wavelength: 500, slitWidth: 0.1 }).centralWidth).toBeCloseTo(10, 12);
  });
});

describe("Huygens' wavelets and refraction", () => {
  it("bends a wavefront so that sin i / sin r = v₁/v₂ = n", () => {
    const r = derive({ incidence: 30, index: 1.5 });
    expect(r.refraction).toBeCloseTo((Math.asin(1 / 3) * 180) / Math.PI, 12);
    expect(r.refraction).toBeCloseTo(19.47, 2);
    expect(r.sinRatio).toBeCloseTo(1.5, 12);
    expect(r.speedIn).toBeCloseTo(2e8, 3);
    expect(3e8 / r.speedIn).toBeCloseTo(r.sinRatio, 12);
  });

  it("shortens the wavelength in glass but keeps the frequency", () => {
    const r = derive({ wavelength: 600, index: 1.5 });
    expect(r.wavelengthIn).toBeCloseTo(400, 12);
    expect(r.frequency).toBeCloseTo(500, 12);
    expect(derive({ index: 1, incidence: 40 }).refraction).toBeCloseTo(40, 12);
    expect(derive({ incidence: 0 })).toMatchObject({ refraction: 0, sinRatio: 1.5 });
  });
});

describe("resolving power", () => {
  it("uses the Airy pattern, dark first at x = 3.832", () => {
    expect(waveOpticsBesselJ1(1)).toBeCloseTo(0.4400505857, 7);
    expect(waveOpticsBesselJ1(10)).toBeCloseTo(0.0434727462, 7);
    expect(waveOpticsBesselJ1(-1)).toBeCloseTo(-0.4400505857, 7);
    expect(waveOpticsBesselJ1(3.8317)).toBeCloseTo(0, 4);
    expect(waveOpticsAiry(0)).toBe(1);
    expect(waveOpticsAiry(3.8317)).toBeCloseTo(0, 7);
  });

  it("gives a 10 cm telescope θ = 1.22λ/D = 6.71 µrad in green light", () => {
    const r = derive({ wavelength: 550, aperture: 10 });
    expect(r.thetaMin).toBeCloseTo(6.71, 12);
    expect(r.resolvingPower).toBeCloseTo(1e6 / 6.71, 6);
    expect(derive({ wavelength: 550, aperture: 100 }).thetaMin).toBeCloseTo(0.671, 12);
  });

  it("resolves two stars only when they are at least θ apart, with a 26% dip at the limit", () => {
    expect(derive({ wavelength: 550, aperture: 10, separation: 10 }).resolved).toBe(1);
    expect(derive({ wavelength: 550, aperture: 10, separation: 5 }).resolved).toBe(0);
    expect(derive({ wavelength: 550, aperture: 34, separation: 2 }).resolved).toBe(1);
    expect(derive({ wavelength: 550, aperture: 33, separation: 2 }).resolved).toBe(0);
    expect(derive({ wavelength: 550, aperture: 10, separation: 6.71 }).dip).toBeCloseTo(0.735, 3);
    expect(derive({ wavelength: 550, aperture: 10, separation: 0.5 }).dip).toBeGreaterThan(0.99);
    expect(derive({ wavelength: 550, aperture: 100, separation: 40 }).dip).toBeLessThan(0.01);
  });
});

describe("polarisation", () => {
  it("passes half the unpolarised light, then cos²θ of it (Malus)", () => {
    expect(derive({ analyser: 0 })).toMatchObject({ afterFirst: 0.5, transmitted: 0.5, malusFraction: 1 });
    expect(derive({ analyser: 45 }).transmitted).toBeCloseTo(0.25, 12);
    expect(derive({ analyser: 60 }).transmitted).toBeCloseTo(0.125, 12);
    expect(derive({ analyser: 90 }).transmitted).toBeCloseTo(0, 12);
    expect(derive({ analyser: 180 }).transmitted).toBeCloseTo(0.5, 12);
  });

  it("polarises reflected light completely at Brewster's angle, tan θ_B = n", () => {
    const glass = derive({ index: 1.5 });
    expect(glass.brewsterAngle).toBeCloseTo(56.31, 2);
    const at = derive({ index: 1.5, incidence: glass.brewsterAngle });
    expect(at.reflectP).toBeCloseTo(0, 12);
    expect(at.reflectS).toBeGreaterThan(0.1);
    expect(at.polarisedReflect).toBeCloseTo(1, 12);
    expect(at.angleSum).toBeCloseTo(90, 9);
    expect(derive({ index: 1.5, incidence: 56 }).atBrewster).toBe(1);
    expect(derive({ index: 1.5, incidence: 40 })).toMatchObject({ atBrewster: 0 });
    expect(derive({ index: 1.33 }).brewsterAngle).toBeCloseTo(53.06, 2);
    expect(derive({ index: 1.33, incidence: 53 }).atBrewster).toBe(1);
    expect(derive({ index: 1.33, incidence: 53 }).polarisedReflect).toBeGreaterThan(0.999);
  });

  it("reflects both polarisations alike head on, so the reflected light is not polarised", () => {
    const r = derive({ index: 1.5, incidence: 0 });
    expect(r.reflectS).toBeCloseTo(0.04, 12);
    expect(r.reflectP).toBeCloseTo(0.04, 12);
    expect(r.polarisedReflect).toBe(0);
  });
});

describe("thin films", () => {
  it("adds half a wavelength for one reflection off a denser medium: a soap film", () => {
    const r = derive({ index: 1.33, thickness: 100, incidence: 0, wavelength: 550 }, { below: "air" });
    expect(r.filmPath).toBeCloseTo(266, 9);
    expect(r.phaseFlips).toBe(1);
    expect(r.filmOrder).toBeCloseTo(541 / 550, 12);
    expect(r.filmFringe).toBe(2);
    // So a film far thinner than the light is dark: the black spot before a bubble pops.
    expect(derive({ index: 1.33, thickness: 10, incidence: 0, wavelength: 550 }, { below: "air" }).filmFringe).toBe(1);
  });

  it("needs no extra half wavelength when both reflections are off denser media: a lens coating", () => {
    const r = derive({ index: 1.38, thickness: 100, incidence: 0, wavelength: 550 }, { below: "glass" });
    expect(r.phaseFlips).toBe(2);
    expect(r.filmOrder).toBeCloseTo(276 / 550, 12);
    expect(r.filmFringe).toBe(1);
    expect(derive({ index: 1.38, thickness: 200, incidence: 0, wavelength: 550 }, { below: "glass" }).filmFringe).toBe(2);
  });

  it("counts an oil film on water like a soap film, and shortens the path when viewed at a slant", () => {
    const oil = derive({ index: 1.47, thickness: 190, incidence: 0, wavelength: 550 }, { below: "water" });
    expect(oil.phaseFlips).toBe(1);
    expect(oil.filmFringe).toBe(1);
    const slant = derive({ index: 1.5, thickness: 200, incidence: 30 });
    expect(slant.filmRefraction).toBeCloseTo(19.47, 2);
    expect(slant.filmPath).toBeCloseTo(2 * 1.5 * 200 * Math.sqrt(1 - 1 / 9), 9);
  });
});

describe("the model", () => {
  it("clamps every slider to its range", () => {
    expect(model.setVariable(S, "wavelength", 900, P).wavelength).toBe(700);
    expect(model.setVariable(S, "slitSep", 0, P).slitSep).toBe(0.1);
    expect(model.setVariable(S, "probe", -50, P).probe).toBe(-20);
    expect(model.setVariable(S, "analyser", 200, P).analyser).toBe(180);
    expect(model.setVariable(S, "nothing", 3, P)).toBe(S);
  });

  it("loops the animation clock", () => {
    expect(model.advance({ ...S, t: 3.9 }, 0.2, P).t).toBeCloseTo(0.1, 12);
  });

  it("numbers every output in every setting", () => {
    for (const slits of WAVE_OPTICS_SLITS_ORDER)
      for (const light of WAVE_OPTICS_LIGHT_ORDER)
        for (const below of WAVE_OPTICS_BELOW_ORDER)
          for (const extreme of [{}, { index: 1, incidence: 0, probe: -20, thickness: 10 }, { index: 2, incidence: 85, probe: 20, separation: 40, aperture: 100 }]) {
            const r = derive(extreme, { slits, light, below });
            for (const key of model.outputs) expect(Number.isFinite(r[key]), `${slits} ${light} ${below} ${key}`).toBe(true);
            for (const key of model.outputs) expect(Object.is(r[key], -0), `${key} is −0`).toBe(false);
          }
  });
});
