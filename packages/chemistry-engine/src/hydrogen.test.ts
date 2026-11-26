import { describe, expect, it } from "vitest";
import { CYCLE, JUMP_AT, hydrogenModel, levelEnergy, lineWavelength, normaliseLevels, REGION } from "./hydrogen";

const H = { species: "H" as const };
const derive = (upper: number, lower: number, species: "H" | "He+" | "Li2+" = "H", t = 0) =>
  hydrogenModel.derive({ upper, lower, t }, { species });

describe("the Bohr levels", () => {
  it("puts hydrogen's ground state at −13.6 eV, falling as 1/n²", () => {
    expect(levelEnergy(1)).toBeCloseTo(-13.6, 1);
    expect(levelEnergy(2) / levelEnergy(1)).toBeCloseTo(1 / 4, 12);
    expect(levelEnergy(3) / levelEnergy(1)).toBeCloseTo(1 / 9, 12);
  });

  it("scales with Z²: He⁺ is bound four times as tightly", () => {
    expect(levelEnergy(1, 2) / levelEnergy(1, 1)).toBeCloseTo(4, 12);
    expect(derive(3, 2, "Li2+").ionisationEnergy).toBeCloseTo(9 * 13.6, 0);
  });

  it("gives orbit radii as 52.9 n²/Z pm", () => {
    const r = derive(3, 1);
    expect(r.radiusLower).toBeCloseTo(52.9, 6);
    expect(r.radiusUpper).toBeCloseTo(9 * 52.9, 6);
    expect(derive(2, 1, "He+").radiusLower).toBeCloseTo(26.45, 6);
    expect(derive(3, 2).radiusRatio).toBeCloseTo(2.25, 12);
  });
});

describe("the lines", () => {
  it("draws hydrogen's red line, H-α, at 656 nm", () => {
    const r = derive(3, 2);
    expect(r.wavelength).toBeCloseTo(656.5, 0);
    expect(r.photonEnergy).toBeCloseTo(1.89, 2);
    expect(r.series).toBe(2);
    expect(r.region).toBe(REGION.visible);
    expect(r.visible).toBe(1);
  });

  it("finds Lyman in the ultraviolet and Paschen in the infrared", () => {
    expect(derive(2, 1).wavelength).toBeCloseTo(121.6, 0);
    expect(derive(2, 1).region).toBe(REGION.ultraviolet);
    expect(derive(4, 3).wavelength).toBeCloseTo(1875, -1);
    expect(derive(4, 3).region).toBe(REGION.infrared);
  });

  it("gives every visible Balmer line, from red to violet", () => {
    const balmer = [3, 4, 5, 6].map((n) => Math.round(lineWavelength(n, 2)));
    expect(balmer).toEqual([656, 486, 434, 410]);
    for (const n of [3, 4, 5, 6]) expect(derive(n, 2).visible).toBe(1);
  });

  it("puts each series' limit where an electron from infinity would land", () => {
    expect(derive(3, 2).seriesLimit).toBeCloseTo(364.7, 1);
    expect(derive(2, 1).seriesLimit).toBeCloseTo(91.18, 1);
    for (let n = 3; n <= 6; n++) expect(derive(n, 2).wavelength).toBeGreaterThan(derive(n, 2).seriesLimit);
  });

  it("matches the classic puzzle: He⁺ 6 → 4 is exactly hydrogen's 3 → 2", () => {
    expect(derive(6, 4, "He+").wavelength).toBeCloseTo(derive(3, 2).wavelength, 9);
    expect(derive(4, 2, "He+").wavelength).toBeCloseTo(derive(2, 1).wavelength, 9);
  });

  it("keeps energy, wavelength, frequency and wavenumber consistent", () => {
    const r = derive(5, 2);
    expect(r.photonEnergy * r.wavelength).toBeCloseTo(1239.84, 1); // E = hc/λ
    expect(r.frequency * 1e12 * r.wavelength * 1e-9).toBeCloseTo(2.998e8, -6); // c = fλ
    expect(r.wavenumber * r.wavelength * 1e-7).toBeCloseTo(1, 9);
    expect(r.photonEnergy).toBeCloseTo(r.energyUpper - r.energyLower, 12);
  });
});

describe("choosing the levels", () => {
  it("keeps the levels whole and the upper one above the lower one", () => {
    expect(normaliseLevels(3.4, 1.6, "upper")).toEqual({ upper: 3, lower: 2 });
    expect(normaliseLevels(2, 2, "upper")).toEqual({ upper: 2, lower: 1 });
    expect(normaliseLevels(3, 4, "lower")).toEqual({ upper: 5, lower: 4 });
    expect(normaliseLevels(99, -5, "upper")).toEqual({ upper: 6, lower: 1 });
  });

  it("lets the learner move either end of the jump", () => {
    const s = hydrogenModel.initialize(H);
    expect(hydrogenModel.setVariable(s, "upper", 5, H)).toMatchObject({ upper: 5, lower: 2 });
    expect(hydrogenModel.setVariable(s, "lower", 3, H)).toMatchObject({ upper: 4, lower: 3 });
    expect(hydrogenModel.getVariable({ upper: 4, lower: 1, t: 0 }, "lower")).toBe(1);
    expect(hydrogenModel.step(s, H, 1)).toMatchObject({ upper: 4, lower: 2 });
  });
});

describe("the emission, played", () => {
  it("drops the electron partway through each cycle, then sends the photon off", () => {
    expect(derive(3, 2, "H", 0.5)).toMatchObject({ dropped: 0, photonProgress: 0 });
    const after = derive(3, 2, "H", JUMP_AT + (CYCLE - JUMP_AT) / 2);
    expect(after.dropped).toBe(1);
    expect(after.photonProgress).toBeCloseTo(0.5, 12);
  });

  it("loops rather than stopping", () => {
    const s = hydrogenModel.advance({ upper: 3, lower: 2, t: CYCLE - 0.1 }, 0.3, H);
    expect(s.t).toBeCloseTo(0.2, 12);
  });
});
