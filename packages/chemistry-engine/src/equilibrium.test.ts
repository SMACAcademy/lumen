import { describe, expect, it } from "vitest";
import {
  equilibriumConstant,
  equilibriumModel,
  equilibriumState,
  extentToEquilibrium,
  REACTIONS,
  reactionQuotient,
  RELAX_TIME,
  startingMixture,
  type EquilibriumParams,
  type EquilibriumState,
} from "./equilibrium";

const N2O4: EquilibriumParams = { reaction: "n2o4", V: 1, T: 298 };
const HI: EquilibriumParams = { reaction: "hi", V: 1, T: 700 };
const HABER: EquilibriumParams = { reaction: "haber", V: 5, T: 700 };

/** Let a mixture settle completely. */
const settle = (params: EquilibriumParams, state = equilibriumModel.initialize(params)) => equilibriumModel.advance(state, 60, params);
const derive = (params: EquilibriumParams, state: EquilibriumState) => equilibriumModel.derive(state, params);

describe("finding equilibrium", () => {
  it("settles where Q = K", () => {
    for (const params of [N2O4, HI, HABER]) {
      const r = derive(params, settle(params));
      expect(r.QoverK).toBeCloseTo(1, 6);
      expect(r.atEquilibrium).toBe(1);
      expect(r.direction).toBe(0);
    }
  });

  it("gets the textbook answer for H₂ + I₂ ⇌ 2HI with K = 54", () => {
    // x²·4 / (0.1 − x)² = 54  →  2x/(0.1 − x) = √54  →  x = 0.0786
    const r = derive(HI, settle(HI));
    expect(r.concC).toBeCloseTo(2 * 0.07860, 4);
    expect(r.concA).toBeCloseTo(0.1 - 0.0786, 4);
  });

  it("conserves atoms: what A loses, C gains in proportion", () => {
    const start = equilibriumModel.initialize(HABER);
    const end = settle(HABER, start);
    const x = (start.nA - end.nA) / 1;
    expect(start.nB - end.nB).toBeCloseTo(3 * x, 9);
    expect(end.nC - start.nC).toBeCloseTo(2 * x, 9);
  });

  it("knows where it is heading before it gets there", () => {
    const start = equilibriumModel.initialize(N2O4);
    const r = derive(N2O4, start);
    const target = equilibriumState(N2O4, start);
    expect(r.eqC).toBeCloseTo(target.nC / N2O4.V, 12);
    expect(r.direction).toBe(1); // only N₂O₄ so far: it must go forward
    expect(r.forwardRate).toBe(1);
    expect(r.backwardRate).toBe(0);
  });

  it("goes backward when there is too much product", () => {
    const r = derive(N2O4, { reaction: "n2o4", nA: 0, nB: 0, nC: 0.3 });
    expect(r.direction).toBe(-1);
    expect(r.QoverK).toBeGreaterThan(1);
  });

  it("makes forward and backward rates equal at equilibrium — it has not stopped", () => {
    const r = derive(HI, settle(HI));
    expect(r.forwardRate).toBeCloseTo(1, 4);
    expect(r.backwardRate).toBeCloseTo(1, 4);
  });

  it("finds no reaction when a reactant is missing entirely", () => {
    expect(extentToEquilibrium(REACTIONS.hi, { nA: 0.1, nB: 0, nC: 0 }, 1, 54)).toBe(0);
  });
});

describe("Le Chatelier, without being told", () => {
  it("squeezing N₂O₄ ⇌ 2NO₂ pushes it back towards fewer molecules", () => {
    const before = settle(N2O4);
    const squeezed = { ...N2O4, V: 0.5 };
    expect(derive(squeezed, before).direction).toBe(-1);
    expect(derive(squeezed, settle(squeezed, before)).conversion).toBeLessThan(derive(N2O4, before).conversion);
  });

  it("squeezing H₂ + I₂ ⇌ 2HI changes nothing: two molecules on each side", () => {
    const before = settle(HI);
    const squeezed = { ...HI, V: 0.25 };
    expect(derive(squeezed, before).direction).toBe(0);
    expect(derive(squeezed, settle(squeezed, before)).conversion).toBeCloseTo(derive(HI, before).conversion, 9);
  });

  it("adding more reactant shifts it forward, and uses some of it up", () => {
    const before = settle(HI);
    const added = equilibriumModel.setVariable(before, "nA", before.nA + 0.1, HI);
    expect(derive(HI, added).direction).toBe(1);
    const after = settle(HI, added);
    expect(after.nC).toBeGreaterThan(before.nC);
    expect(after.nA).toBeLessThan(added.nA);
  });

  it("warming an endothermic reaction raises K; warming an exothermic one lowers it", () => {
    expect(equilibriumConstant(REACTIONS.n2o4, 350)).toBeGreaterThan(equilibriumConstant(REACTIONS.n2o4, 298));
    expect(equilibriumConstant(REACTIONS.haber, 800)).toBeLessThan(equilibriumConstant(REACTIONS.haber, 700));
    expect(equilibriumConstant(REACTIONS.hi, 700)).toBeCloseTo(54, 9);
  });

  it("gives the Haber process more ammonia when squeezed and less when heated", () => {
    const base = derive(HABER, settle(HABER)).conversion;
    expect(derive({ ...HABER, V: 1 }, settle({ ...HABER, V: 1 })).conversion).toBeGreaterThan(base);
    expect(derive({ ...HABER, T: 900 }, settle({ ...HABER, T: 900 })).conversion).toBeLessThan(base);
  });
});

describe("Kc, Kp and the gauges", () => {
  it("relates Kp to Kc by (RT)^Δn", () => {
    const r = derive(N2O4, settle(N2O4));
    expect(r.deltaN).toBe(1);
    expect(r.Kp).toBeCloseTo(r.K * 0.08206 * 298, 9);
    expect(derive(HI, settle(HI)).Kp).toBeCloseTo(derive(HI, settle(HI)).K, 12);
  });

  it("reports the pressure from pV = nRT", () => {
    const r = derive(N2O4, startingMixture(REACTIONS.n2o4));
    expect(r.pressure).toBeCloseTo(0.1 * 0.08206 * 298, 9);
  });

  it("follows the brown gas for the colour", () => {
    const r = derive(N2O4, settle(N2O4));
    expect(r.colourConc).toBeCloseTo(r.concC, 12);
    expect(derive(HABER, settle(HABER)).colourConc).toBe(0);
  });

  it("computes Q from the concentrations", () => {
    const s = { reaction: "n2o4" as const, nA: 0.05, nB: 0, nC: 0.02 };
    expect(reactionQuotient(REACTIONS.n2o4, s, 2)).toBeCloseTo(0.01 ** 2 / 0.025, 12);
  });
});

describe("running it", () => {
  it("relaxes exponentially: one relaxation time covers 63 % of the way", () => {
    const start = equilibriumModel.initialize(N2O4);
    const target = equilibriumState(N2O4, start);
    const once = equilibriumModel.advance(start, RELAX_TIME, N2O4);
    expect((once.nC - start.nC) / (target.nC - start.nC)).toBeCloseTo(1 - Math.exp(-1), 9);
    expect(equilibriumModel.step(start, N2O4, 1).nC).toBeCloseTo(once.nC, 12);
  });

  it("starts a new reaction afresh when the reaction is switched", () => {
    const n2o4 = settle(N2O4);
    const r = derive(HI, n2o4);
    expect(r.nA).toBe(REACTIONS.hi.start[0]);
    expect(r.nB).toBe(REACTIONS.hi.start[1]);
    expect(equilibriumModel.advance(n2o4, 0, HI).reaction).toBe("hi");
  });

  it("lets the learner add and remove gas, within limits", () => {
    const s = equilibriumModel.initialize(HI);
    expect(equilibriumModel.setVariable(s, "nB", 0.4, HI).nB).toBe(0.4);
    expect(equilibriumModel.setVariable(s, "nC", -1, HI).nC).toBe(0);
    expect(equilibriumModel.getVariable(s, "nA")).toBe(0.1);
  });
});
