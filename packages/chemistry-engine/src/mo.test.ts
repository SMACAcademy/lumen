import { describe, expect, it } from "vitest";
import { DIATOMIC_DATA, diatomicFormula, fillMOs, moModel as model, orbitalOrder } from "./mo";

const at = (Z: number, charge = 0) => model.derive({ Z, charge, clock: 0 }, model.defaultParams);

describe("bond order", () => {
  it("matches the textbook from H₂ to Ne₂", () => {
    const orders = Array.from({ length: 10 }, (_, i) => at(i + 1).bondOrder);
    expect(orders).toEqual([1, 0, 1, 0, 1, 2, 3, 2, 1, 0]);
    expect([at(2).exists, at(4).exists, at(10).exists]).toEqual([0, 0, 0]);
  });

  it("follows oxygen's ions and hydrogen's cation", () => {
    expect([at(8, 1).bondOrder, at(8, -1).bondOrder, at(8, -2).bondOrder]).toEqual([2.5, 1.5, 1]);
    expect(at(1, 1).bondOrder).toBe(0.5);
    expect(at(7, 1).bondOrder).toBe(2.5);
  });
});

describe("magnetism", () => {
  it("makes O₂ paramagnetic with two unpaired π* electrons, and N₂ diamagnetic", () => {
    expect(at(8)).toMatchObject({ unpaired: 2, paramagnetic: 1 });
    expect(at(7)).toMatchObject({ unpaired: 0, paramagnetic: 0 });
    expect(at(9).paramagnetic).toBe(0);
  });

  it("makes B₂ paramagnetic too — the evidence that π2p lies below σ2p there", () => {
    expect(at(5)).toMatchObject({ unpaired: 2, piFirst: 1 });
    expect(orbitalOrder(5).map((m) => m.label).slice(4, 6)).toEqual(["π2p", "σ2p"]);
    expect(orbitalOrder(8).map((m) => m.label).slice(4, 6)).toEqual(["σ2p", "π2p"]);
  });

  it("fills a degenerate pair singly before pairing", () => {
    const o2 = fillMOs(8, 16);
    expect(o2[6]).toEqual([1, 1]);
  });
});

describe("bond length and strength", () => {
  it("shorten and strengthen with bond order", () => {
    const rows = Object.keys(DIATOMIC_DATA).map((z) => at(Number(z)));
    for (const a of rows)
      for (const b of rows)
        if (a.bondOrder > b.bondOrder) {
          expect(a.bondEnthalpy, `${a.Z} vs ${b.Z}`).toBeGreaterThan(b.bondEnthalpy);
        }
    expect(at(7).bondLength).toBeLessThan(at(8).bondLength);
    expect(at(8).bondLength).toBeLessThan(at(9).bondLength);
    expect(at(8, 1).hasLength).toBe(0);
  });

  it("writes the formulae", () => {
    expect([diatomicFormula(8, 0), diatomicFormula(8, 1), diatomicFormula(8, -2), diatomicFormula(1, 1)]).toEqual(["O₂", "O₂⁺", "O₂²⁻", "H₂⁺"]);
  });

  it("numbers every output, and Play walks the elements", () => {
    expect(model.advance({ Z: 10, charge: 0, clock: 1.2 }, 0.1, model.defaultParams).Z).toBe(1);
    const r = at(8);
    for (const key of model.outputs) expect(Number.isFinite(r[key]), key).toBe(true);
  });
});
