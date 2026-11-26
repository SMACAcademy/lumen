import { describe, expect, it } from "vitest";
import { balancingModel as model, balancingMove, elementsOf, BALANCING_ORDER, BALANCING_REACTIONS, TALLY_SLOTS, tally, type BalancingState } from "./balancing";

const ones: BalancingState = { c1: 1, c2: 1, c3: 1, c4: 1, clock: 0 };
const withAnswer = (answer: readonly number[]): BalancingState => ({ ...ones, c1: answer[0] ?? 1, c2: answer[1] ?? 1, c3: answer[2] ?? 1, c4: answer[3] ?? 1 });

describe("the reactions", () => {
  it("each balance with their answer, and fit the tally", () => {
    for (const id of BALANCING_ORDER) {
      const reaction = BALANCING_REACTIONS[id];
      expect(tally(reaction, withAnswer(reaction.answer)).every((t) => t.left === t.right), id).toBe(true);
      expect(reaction.answer).toHaveLength(reaction.reactants.length + reaction.products.length);
      expect(elementsOf(reaction).length, id).toBeLessThanOrEqual(TALLY_SLOTS);
    }
  });
});

describe("counting atoms", () => {
  it("counts each element on each side", () => {
    const r = model.derive(ones, { reaction: "water" });
    expect(r).toMatchObject({ elements: 2, left1: 2, right1: 2, left2: 2, right2: 1, balanced: 0, unbalanced: 1 });
    expect(model.derive({ ...ones, c1: 2, c3: 2 }, { reaction: "water" })).toMatchObject({ balanced: 1, simplest: 1, atomsLeft: 6, atomsRight: 6 });
  });

  it("knows a balanced equation that is not in its smallest numbers", () => {
    expect(model.derive({ ...ones, c1: 4, c2: 2, c3: 4 }, { reaction: "water" })).toMatchObject({ balanced: 1, simplest: 0 });
  });

  it("weighs the same on both sides once balanced — and not before", () => {
    const balanced = model.derive(withAnswer(BALANCING_REACTIONS.rust.answer), { reaction: "rust" });
    expect(balanced.massLeft).toBeCloseTo(balanced.massRight, 9);
    expect(balanced.massLeft).toBeCloseTo(320, 9);
    const not = model.derive(ones, { reaction: "rust" });
    expect(not.massLeft).not.toBeCloseTo(not.massRight, 3);
  });

  it("names the reaction type, and ignores the fourth number for three substances", () => {
    expect(model.derive(ones, { reaction: "limestone" })).toMatchObject({ type: 1, species: 3, c4: 0 });
    expect(model.derive(ones, { reaction: "barium-sulfate" }).type).toBe(3);
  });
});

describe("the balancing strategy", () => {
  it("balances every reaction from all ones, in its smallest numbers", () => {
    for (const id of BALANCING_ORDER) {
      const reaction = BALANCING_REACTIONS[id];
      let state = ones;
      for (let i = 0; i < 30; i++) state = balancingMove(reaction, state);
      const r = model.derive(state, { reaction: id });
      expect(r.balanced, id).toBe(1);
      expect(r.simplest, id).toBe(1);
    }
  });

  it("makes one move each time Play's clock ticks over", () => {
    const s = model.advance(ones, 0.5, { reaction: "water" });
    expect(s).toMatchObject({ c1: 1, c3: 1 });
    expect(model.advance(s, 0.4, { reaction: "water" })).toMatchObject({ c3: 2, clock: 0 });
  });

  it("keeps coefficients whole and between 1 and 6", () => {
    expect(model.setVariable(ones, "c2", 9, model.defaultParams).c2).toBe(6);
    expect(model.setVariable(ones, "c2", 0, model.defaultParams).c2).toBe(1);
    const r = model.derive(ones, model.defaultParams);
    for (const key of model.outputs) expect(Number.isFinite(r[key]), key).toBe(true);
  });
});
