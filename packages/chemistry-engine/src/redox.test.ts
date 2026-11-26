import { describe, expect, it } from "vitest";
import { electronCount, REDOX_ORDER, REDOX_REACTIONS, redoxModel as model, redoxMove, type RedoxState } from "./redox";

const ones: RedoxState = { c1: 1, c2: 1, c3: 1, c4: 1, clock: 0 };
const withAnswer = (a: readonly number[]): RedoxState => ({ ...ones, c1: a[0] ?? 1, c2: a[1] ?? 1, c3: a[2] ?? 1, c4: a[3] ?? 1 });

describe("oxidation numbers", () => {
  it("add up to each species' charge", () => {
    for (const id of REDOX_ORDER) {
      const r = REDOX_REACTIONS[id];
      for (const s of [...r.reactants, ...r.products]) {
        const sum = Object.entries(s.atoms).reduce((total, [el, n]) => total + n * (s.ox[el] ?? Number.NaN), 0);
        expect(sum, `${id}: ${s.formula}`).toBe(s.charge);
      }
    }
  });

  it("agree with each reaction's oxidised and reduced element", () => {
    for (const id of REDOX_ORDER) {
      const { reactants, products, oxidised, reduced } = REDOX_REACTIONS[id];
      const oxIn = (list: typeof reactants, el: string) => list.find((s) => s.atoms[el])?.ox[el];
      expect(oxIn(reactants, oxidised.element), id).toBe(oxidised.from);
      expect(oxIn(products, oxidised.element), id).toBe(oxidised.to);
      expect(oxidised.to).toBeGreaterThan(oxidised.from);
      expect(reduced.to).toBeLessThan(reduced.from);
    }
  });
});

describe("balancing by electrons", () => {
  it("balances atoms, charge and electrons with each answer", () => {
    for (const id of REDOX_ORDER) {
      const r = model.derive(withAnswer(REDOX_REACTIONS[id].answer), { reaction: id });
      expect(r, id).toMatchObject({ balanced: 1, simplest: 1, electronsBalanced: 1, atomsBalanced: 1, chargeBalanced: 1 });
    }
  });

  it("catches a charge that does not balance when the atoms do", () => {
    // Cu + 2Ag⁺ → Cu²⁺ + Ag has Ag out of balance; Cu + Ag⁺ → Cu²⁺ + Ag balances atoms but not charge.
    const r = model.derive(ones, { reaction: "copper-silver" });
    expect(r).toMatchObject({ atomsBalanced: 1, chargeLeft: 1, chargeRight: 2, chargeBalanced: 0, balanced: 0, electronsLost: 2, electronsGained: 1 });
  });

  it("counts electrons from the change in oxidation number", () => {
    expect(electronCount(REDOX_REACTIONS["iron-ore"], withAnswer([1, 3, 2, 3]))).toEqual({ lost: 6, gained: 6 });
    expect(electronCount(REDOX_REACTIONS.thermite, ones)).toEqual({ lost: 3, gained: 6 });
  });

  it("reaches every answer from all ones, electrons first", () => {
    for (const id of REDOX_ORDER) {
      let s = ones;
      for (let i = 0; i < 30; i++) s = redoxMove(REDOX_REACTIONS[id], s);
      expect(model.derive(s, { reaction: id }), id).toMatchObject({ balanced: 1, simplest: 1 });
    }
  });
});

describe("which way it goes", () => {
  it("runs when E°cell is positive", () => {
    expect(model.derive(ones, { reaction: "zinc-copper" })).toMatchObject({ ecell: 1.1, spontaneous: 1 });
    expect(model.derive(ones, { reaction: "copper-zinc" })).toMatchObject({ ecell: -1.1, spontaneous: 0 });
    expect(model.derive(ones, { reaction: "chlorine-bromide" }).ecell).toBeCloseTo(0.27, 9);
    expect(model.derive(ones, { reaction: "bromine-chloride" }).spontaneous).toBe(0);
    expect(model.derive(ones, { reaction: "thermite" })).toMatchObject({ hasPotential: 0, spontaneous: 1 });
  });

  it("numbers every output", () => {
    const r = model.derive(ones, model.defaultParams);
    for (const key of model.outputs) expect(Number.isFinite(r[key]), key).toBe(true);
  });
});
