import { describe, expect, it } from "vitest";
import { ACTINOIDS, fBlockModel as model, fElectronsIn, LANTHANOIDS, unpairedF, type FBlockParams } from "./fblock";

const derive = (series: FBlockParams["series"], index: number, charge = 3) => model.derive({ index, charge, clock: 0 }, { series });
const at = (series: FBlockParams["series"], symbol: string, charge = 3) => {
  const list = series === "actinoids" ? ACTINOIDS : LANTHANOIDS;
  return derive(series, list.findIndex((e) => e.symbol === symbol) + 1, charge);
};

describe("the lanthanoid contraction", () => {
  it("shrinks Ln³⁺ from 106 pm at lanthanum to 86 pm at ytterbium, never rising", () => {
    const radii = LANTHANOIDS.map((e) => e.radius3).filter((r): r is number => r !== null);
    expect(radii[0]).toBe(106);
    expect(radii[radii.length - 1]).toBe(86);
    for (let i = 1; i < radii.length; i++) expect(radii[i]).toBeLessThan(radii[i - 1]!);
  });

  it("flags lutetium's radius, which NCERT does not give", () => {
    expect(at("lanthanoids", "Lu")).toMatchObject({ radius3: 0, known3: 0, Z: 71 });
    expect(at("lanthanoids", "Gd")).toMatchObject({ radius3: 94, known3: 1, known4: 0 });
  });

  it("runs the fifteen elements from Z = 57 to 71 and 89 to 103", () => {
    expect(LANTHANOIDS.map((e) => e.Z)).toEqual(Array.from({ length: 15 }, (_, i) => 57 + i));
    expect(ACTINOIDS.map((e) => e.Z)).toEqual(Array.from({ length: 15 }, (_, i) => 89 + i));
  });
});

describe("f electrons", () => {
  it("leaves Z − 54 − n in a lanthanoid ion and Z − 86 − n in an actinoid ion", () => {
    expect(fElectronsIn("lanthanoids", 64, 3)).toBe(7);
    expect(fElectronsIn("actinoids", 92, 4)).toBe(2);
    expect(LANTHANOIDS.map((e) => fElectronsIn("lanthanoids", e.Z, 3))).toEqual(Array.from({ length: 15 }, (_, i) => i));
  });

  it("finds the empty, half-full and full shells behind the odd oxidation states", () => {
    expect(at("lanthanoids", "La", 3)).toMatchObject({ fElectrons: 0, paramagnetic: 0, exists: 1 });
    expect(at("lanthanoids", "Ce", 4)).toMatchObject({ fElectrons: 0, paramagnetic: 0, exists: 1 });
    expect(at("lanthanoids", "Eu", 2)).toMatchObject({ fElectrons: 7, unpaired: 7, exists: 1 });
    expect(at("lanthanoids", "Gd", 3)).toMatchObject({ fElectrons: 7, unpaired: 7 });
    expect(at("lanthanoids", "Tb", 4)).toMatchObject({ fElectrons: 7, exists: 1 });
    expect(at("lanthanoids", "Yb", 2)).toMatchObject({ fElectrons: 14, paramagnetic: 0, exists: 1 });
    expect(at("lanthanoids", "Lu", 3)).toMatchObject({ fElectrons: 14, paramagnetic: 0 });
  });

  it("pairs electrons only after all seven orbitals have one", () => {
    expect([0, 1, 6, 7, 8, 13, 14].map(unpairedF)).toEqual([0, 1, 6, 7, 6, 1, 0]);
  });

  it("says when an ion is not a known oxidation state", () => {
    expect(at("lanthanoids", "Gd", 4).exists).toBe(0);
    expect(at("actinoids", "U", 6)).toMatchObject({ exists: 1, fElectrons: 0 });
    expect(at("actinoids", "Th", 3).exists).toBe(0);
  });
});

describe("oxidation states", () => {
  it("keeps the lanthanoids to +3 with a few +2 and +4", () => {
    expect(LANTHANOIDS.every((e) => e.states.includes(3))).toBe(true);
    expect(LANTHANOIDS.filter((e) => e.states.includes(4)).map((e) => e.symbol)).toEqual(["Ce", "Pr", "Nd", "Tb", "Dy"]);
    expect(LANTHANOIDS.filter((e) => e.states.includes(2)).map((e) => e.symbol)).toEqual(["Sm", "Eu", "Yb"]);
  });

  it("lets the early actinoids range far wider, up to +7", () => {
    expect(ACTINOIDS.filter((e) => e.states.includes(7)).map((e) => e.symbol)).toEqual(["Np", "Pu"]);
    expect(at("actinoids", "Ac")).toMatchObject({ minOx: 3, maxOx: 3, stateCount: 1 });
    expect(at("actinoids", "U")).toMatchObject({ minOx: 3, maxOx: 6, stateCount: 4 });
    expect(ACTINOIDS.map((e) => e.states.length)).toEqual([1, 1, 3, 4, 5, 5, 4, 2, 2, 1, 1, 1, 1, 1, 1]);
  });

  it("makes every actinoid radioactive, and only promethium among the lanthanoids", () => {
    expect(ACTINOIDS.every((e) => e.radioactive)).toBe(true);
    expect(LANTHANOIDS.filter((e) => e.radioactive).map((e) => e.symbol)).toEqual(["Pm"]);
  });

  it("shrinks the actinoid ions too", () => {
    const m4 = ACTINOIDS.map((e) => e.radius4).filter((r): r is number => r !== null);
    for (let i = 1; i < m4.length; i++) expect(m4[i]).toBeLessThan(m4[i - 1]!);
    expect(at("actinoids", "U")).toMatchObject({ radius3: 103, radius4: 93, known3: 1, known4: 1 });
  });
});

describe("the model", () => {
  it("walks along the series on play and starts again", () => {
    let s = model.initialize(model.defaultParams);
    for (let i = 0; i < 9; i++) s = model.advance(s, 0.1, model.defaultParams);
    expect(s.index).toBe(2);
    s = model.advance({ index: 15, charge: 3, clock: 0.75 }, 0.1, model.defaultParams);
    expect(s.index).toBe(1);
  });

  it("keeps the controls in range and numbers every output", () => {
    let s = model.initialize(model.defaultParams);
    for (const [id, value] of [["index", 40], ["charge", 0]] as const) s = model.setVariable(s, id, value, model.defaultParams);
    expect(s).toMatchObject({ index: 15, charge: 2 });
    for (const series of ["lanthanoids", "actinoids"] as const) {
      for (let index = 1; index <= 15; index++) {
        const r = derive(series, index, 7);
        for (const key of model.outputs) expect(Number.isFinite(r[key]), `${series} ${index} ${key}`).toBe(true);
      }
    }
  });
});
