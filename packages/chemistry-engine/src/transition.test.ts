import { describe, expect, it } from "vitest";
import { dElectrons, FIRST_Z, LAST_Z, snapOx, transitionSpecies, transitionModel as model } from "./transition";

const P = model.defaultParams;
const at = (Z: number, ox: number) => model.derive({ Z, ox, clock: 0 }, P);

describe("d electrons", () => {
  it("lose 4s first: an ion keeps Z − 18 − n", () => {
    expect(dElectrons(26, 2)).toBe(6);
    expect(dElectrons(26, 3)).toBe(5);
    expect(dElectrons(29, 1)).toBe(10);
    expect(dElectrons(25, 7)).toBe(0);
  });

  it("follow the atoms' configurations, Cr and Cu included", () => {
    expect([dElectrons(22, 0), dElectrons(24, 0), dElectrons(29, 0), dElectrons(30, 0)]).toEqual([2, 5, 10, 10]);
    expect(at(24, 0).unpaired).toBe(6);
  });
});

describe("magnetism", () => {
  it("gives the spin-only moment √(n(n + 2))", () => {
    expect(at(26, 2)).toMatchObject({ unpaired: 4, paramagnetic: 1 });
    expect(at(26, 2).moment).toBeCloseTo(4.9, 2);
    expect(at(25, 2).moment).toBeCloseTo(5.92, 2);
    expect(at(30, 2)).toMatchObject({ unpaired: 0, moment: 0, paramagnetic: 0 });
  });
});

describe("colour", () => {
  it("leaves d⁰ and d¹⁰ ions colourless", () => {
    for (const [Z, ox] of [[21, 3], [22, 4], [29, 1], [30, 2]] as const) expect(at(Z, ox).coloured, `${Z}:${ox}`).toBe(0);
    for (const [Z, ox] of [[22, 3], [24, 3], [26, 3], [28, 2], [29, 2]] as const) expect(at(Z, ox).coloured, `${Z}:${ox}`).toBe(1);
  });

  it("colours permanganate and dichromate by charge transfer, with no d electrons", () => {
    expect(at(25, 7)).toMatchObject({ dCount: 0, coloured: 1, chargeTransfer: 1 });
    expect(transitionSpecies(25, 7)).toEqual({ formula: "MnO₄⁻", colour: "purple" });
    expect(transitionSpecies(24, 6)).toEqual({ formula: "Cr₂O₇²⁻", colour: "orange" });
    expect(at(29, 2).chargeTransfer).toBe(0);
  });
});

describe("oxidation states", () => {
  it("peak at manganese, +7, and fall away either side", () => {
    const max = Array.from({ length: LAST_Z - FIRST_Z + 1 }, (_, i) => at(FIRST_Z + i, 2).maxOx);
    expect(max).toEqual([3, 4, 5, 6, 7, 3, 3, 2, 2, 2]);
    expect(at(25, 2).stateCount).toBe(5);
  });

  it("snap to a state the element really has", () => {
    expect(snapOx(28, 3)).toBe(2);
    expect(snapOx(25, 5)).toBe(4);
    expect(model.setVariable({ Z: 25, ox: 7, clock: 0 }, "Z", 26, P).ox).toBe(3);
  });

  it("make copper the only one above hydrogen", () => {
    const positive = Array.from({ length: 10 }, (_, i) => at(21 + i, 2)).filter((r) => r.hasE2 === 1 && r.e2 > 0);
    expect(positive.map((r) => r.Z)).toEqual([29]);
  });
});

describe("the model", () => {
  it("walks the series, or one element's states, on Play", () => {
    expect(model.advance({ Z: 30, ox: 2, clock: 0.9 }, 0.1, P).Z).toBe(21);
    expect(model.advance({ Z: 25, ox: 4, clock: 0.9 }, 0.1, { walk: "states" }).ox).toBe(6);
    const r = at(26, 2);
    for (const key of model.outputs) expect(Number.isFinite(r[key]), key).toBe(true);
  });
});
