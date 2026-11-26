import { describe, expect, it } from "vitest";
import {
  PHOTO_HC_EV_NM,
  PHOTO_METAL_ORDER,
  PHOTO_METALS,
  photoCurrentAt,
  photoElectronWavelength,
  photoelectricModel as model,
  photoPeakAngle,
  photoScatter,
  type PhotoelectricParams,
  type PhotoelectricState,
} from "./photoelectric";

const P = model.defaultParams;
const base = model.initialize(P);
const derive = (state: Partial<PhotoelectricState> = {}, params: Partial<PhotoelectricParams> = {}) =>
  model.derive({ ...base, ...state }, { ...P, ...params });

describe("photons", () => {
  it("carry E = hν = hc/λ, with hc ≈ 1240 eV nm", () => {
    expect(PHOTO_HC_EV_NM).toBeCloseTo(1243.1, 1);
    const r = derive({ wavelength: 500 });
    expect(r.frequency).toBeCloseTo(600, 9);
    expect(r.photonEnergy).toBeCloseTo(2.486, 3);
    expect(r.photonEnergyJ).toBeCloseTo(3.978, 3);
  });

  it("carry momentum p = h/λ", () => {
    expect(derive({ wavelength: 500 }).photonMomentum).toBeCloseTo(1.326, 3);
    expect(derive({ wavelength: 250 }).photonMomentum).toBeCloseTo(2.652, 3);
  });

  it("arrive at N = P/hν a second: NCERT's 2 mW laser at 6.0 × 10¹⁴ Hz sends 5.0 × 10¹⁵", () => {
    expect(derive({ wavelength: 500, power: 2 }).photonFlux).toBeCloseTo(5.03, 2);
    expect(derive({ wavelength: 500, power: 0 }).photonFlux).toBe(0);
  });
});

describe("the threshold", () => {
  it("is ν₀ = φ/h: caesium 516 THz (5.16 × 10¹⁴ Hz), 581 nm", () => {
    const r = derive();
    expect(r.workFunction).toBe(2.14);
    expect(r.thresholdFrequency).toBeCloseTo(516.4, 1);
    expect(r.thresholdWavelength).toBeCloseTo(580.9, 1);
    expect(derive({}, { metal: "pt" }).thresholdWavelength).toBeCloseTo(220.0, 1);
  });

  it("lets nothing out below it, however bright the light", () => {
    const dim = derive({ wavelength: 600, power: 2 });
    expect(dim).toMatchObject({ emits: 0, kMax: 0, stoppingPotential: 0, saturationCurrent: 0, current: 0 });
    expect(derive({ wavelength: 570, power: 0.05 }).emits).toBe(1);
  });

  it("rises with the work function down NCERT's table", () => {
    const thresholds = PHOTO_METAL_ORDER.map((m) => derive({}, { metal: m }).thresholdFrequency);
    for (let i = 1; i < thresholds.length; i++) expect(thresholds[i]).toBeGreaterThan(thresholds[i - 1]!);
    expect(PHOTO_METALS.na.workFunction).toBe(2.75);
  });
});

describe("Einstein's equation", () => {
  it("gives K_max = hν − φ and eV₀ = K_max", () => {
    const r = derive({ wavelength: 400 });
    expect(r.photonEnergy).toBeCloseTo(3.108, 3);
    expect(r.kMax).toBeCloseTo(0.968, 3);
    expect(r.stoppingPotential).toBeCloseTo(0.968, 3);
    expect(r.vMax).toBeCloseTo(583, 0);
  });

  it("matches NCERT: caesium stopped by 0.60 V needs 454 nm light", () => {
    expect(derive({ wavelength: 453.7 }).stoppingPotential).toBeCloseTo(0.6, 3);
  });

  it("puts V₀ against ν on a line of slope h/e = 4.14 × 10⁻¹⁵ V s through ν₀", () => {
    const a = derive({ wavelength: 300 });
    const b = derive({ wavelength: 200 });
    const slope = (b.stoppingPotential - a.stoppingPotential) / ((b.frequency - a.frequency) * 1e12);
    expect(slope / 1e-15).toBeCloseTo(4.144, 3);
    expect(a.hOverE).toBeCloseTo(4.144, 3);
    expect(a.planck).toBeCloseTo(6.63, 9);
    // Extend the line back to V₀ = 0: it meets the axis at ν₀.
    expect(a.frequency - a.stoppingPotential / (slope * 1e12)).toBeCloseTo(a.thresholdFrequency, 6);
  });

  it("keeps the same slope for every metal, with a different ν₀", () => {
    const k = derive({ wavelength: 250 }, { metal: "k" });
    const cu = derive({ wavelength: 250 }, { metal: "cu" });
    expect(k.stoppingPotential - cu.stoppingPotential).toBeCloseTo(4.65 - 2.3, 9);
  });
});

describe("the photocurrent", () => {
  it("saturates in proportion to the light's power, one electron for every 100 photons", () => {
    const one = derive({ wavelength: 500, power: 1 });
    const two = derive({ wavelength: 500, power: 2 });
    expect(one.saturationCurrent).toBeCloseTo(4.02, 2);
    expect(two.saturationCurrent / one.saturationCurrent).toBeCloseTo(2, 12);
  });

  it("has a stopping potential that does not depend on the power", () => {
    expect(derive({ wavelength: 400, power: 0.5 }).stoppingPotential).toBe(derive({ wavelength: 400, power: 2 }).stoppingPotential);
  });

  it("falls in a straight line from saturation at 0 V to nothing at −V₀", () => {
    expect(photoCurrentAt(4, 2, 1)).toBe(4);
    expect(photoCurrentAt(4, 2, 0)).toBe(4);
    expect(photoCurrentAt(4, 2, -1)).toBe(2);
    expect(photoCurrentAt(4, 2, -2)).toBe(0);
    expect(photoCurrentAt(4, 2, -3)).toBe(0);
    const r = derive({ wavelength: 400, collector: -0.5 });
    expect(r.collected).toBeCloseTo(1 - 0.5 / 0.968, 3);
    expect(r.retarding).toBe(0.5);
  });
});

describe("electron waves", () => {
  it("give 54 V electrons λ = h/√(2meV) ≈ 1.227/√V = 0.167 nm", () => {
    expect(photoElectronWavelength(54)).toBeCloseTo(0.1671, 4);
    expect(photoElectronWavelength(54)).toBeCloseTo(1.227 / Math.sqrt(54), 3);
    expect(derive({ accel: 54 }).electronWavelength).toBeCloseTo(0.1671, 4);
  });

  it("peak where D sin θ = λ: 51° at 54 V; D sin 50° = 0.165 nm", () => {
    expect(photoPeakAngle(0.1671)).toBeCloseTo(51.0, 1);
    expect(derive({ accel: 54, detector: 50 }).gratingWavelength).toBeCloseTo(0.1647, 4);
    expect(derive({ accel: 20 })).toMatchObject({ hasPeak: 0, peakAngle: 0, peakHeight: 0 });
  });

  it("scatter most strongly round the peak angle, and most of all at 54 V", () => {
    const at = (v: number, a: number) => photoScatter(v, a);
    let best = 10;
    for (let a = 10; a <= 90; a++) if (at(54, a) > at(54, best)) best = a;
    expect(best).toBe(51);
    expect(at(54, 51)).toBeGreaterThan(at(44, 55));
    expect(at(54, 51)).toBeGreaterThan(at(68, 46));
    expect(derive({ accel: 54, detector: 50 }).detectorReading).toBeGreaterThan(93);
    expect(derive({ accel: 54, detector: 30 }).detectorReading).toBeLessThan(50);
  });
});

describe("the model", () => {
  it("clamps every control to its range and links frequency to wavelength", () => {
    expect(model.setVariable(base, "wavelength", 50, P).wavelength).toBe(150);
    expect(model.setVariable(base, "power", 9, P).power).toBe(2);
    expect(model.setVariable(base, "collector", -20, P).collector).toBe(-8);
    expect(model.setVariable(base, "accel", 500, P).accel).toBe(150);
    expect(model.setVariable(base, "detector", 0, P).detector).toBe(10);
    expect(model.setVariable(base, "frequency", 600, P).wavelength).toBeCloseTo(500, 9);
    expect(model.setVariable(base, "frequency", 9000, P).wavelength).toBeCloseTo(150, 9);
    expect(model.getVariable({ ...base, wavelength: 500 }, "frequency")).toBeCloseTo(600, 9);
  });

  it("loops the animation and steps the wavelength", () => {
    expect(model.advance({ ...base, t: 1.99 }, 0.02, P).t).toBeCloseTo(0.01, 9);
    expect(model.step(base, P, 1).wavelength).toBe(410);
  });

  it("numbers every output", () => {
    for (const state of [base, { ...base, wavelength: 750, power: 0, collector: -8 }, { ...base, accel: 10 }]) {
      const r = model.derive(state, P);
      for (const key of model.outputs) expect(Number.isFinite(r[key]), key).toBe(true);
      expect(Object.is(r.retarding, -0)).toBe(false);
    }
  });
});
