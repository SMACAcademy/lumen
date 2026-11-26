import { describe, expect, it } from "vitest";
import {
  SETSFN_CODOMAIN_ORDER,
  SETSFN_CURVE_ORDER,
  SETSFN_CURVES,
  SETSFN_DOMAIN_ORDER,
  SETSFN_DOMAINS,
  SETSFN_KIND_ORDER,
  SETSFN_OP_ORDER,
  SETSFN_RELATION_ORDER,
  SETSFN_RULE_ORDER,
  setsfnClasses,
  setsfnContains,
  setsfnElements,
  setsfnFunctionCounts,
  setsfnRelationNow,
  setsfnShaded,
  setsfnTwoSets,
  setsFnModel as model,
  type SetsFnParams,
  type SetsFnState,
} from "./setsfn";

const base: SetsFnState = model.initialize(model.defaultParams);
const derive = (params: Partial<SetsFnParams> = {}, state: Partial<SetsFnState> = {}) => model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });

describe("two sets", () => {
  it("builds A = {1, …, 5} and B = {4, …, 7} when they share two", () => {
    const s = setsfnTwoSets(5, 4, 2);
    expect(setsfnElements(s.a)).toEqual([1, 2, 3, 4, 5]);
    expect(setsfnElements(s.b)).toEqual([4, 5, 6, 7]);
    expect(setsfnElements(setsfnShaded(s, "aMinusB", "two"))).toEqual([1, 2, 3]);
    expect(setsfnElements(setsfnShaded(s, "complementA", "two"))).toEqual([6, 7, 8, 9, 10]);
  });

  it("counts n(A ∪ B) = n(A) + n(B) − n(A ∩ B)", () => {
    expect(derive({}, { a: 5, b: 4, common: 2 })).toMatchObject({ nA: 5, nB: 4, nAB: 2, nAuB: 7, nAminusB: 3, nBminusA: 2, nCompA: 5, disjoint: 0 });
    for (let a = 0; a <= 6; a++)
      for (let b = 0; b <= 6; b++)
        for (let c = 0; c <= 6; c++) {
          const r = derive({}, { a, b, common: c });
          expect(r.nAuB, `${a} ${b} ${c}`).toBe(r.nA + r.nB - r.nAB);
          expect(r.nAuB).toBeLessThanOrEqual(10);
          expect(r.nAminusB + r.nAB).toBe(r.nA);
        }
  });

  it("keeps the overlap possible: no more than the smaller set, and enough to fit in U", () => {
    expect(derive({}, { a: 3, b: 5, common: 6 })).toMatchObject({ nAB: 3, subsetAB: 1, subsetBA: 0 });
    expect(derive({}, { a: 6, b: 6, common: 0 })).toMatchObject({ nAB: 2, nAuB: 10, nCompA: 4 });
    expect(derive({}, { a: 2, b: 3, common: 0 })).toMatchObject({ disjoint: 1, nAuB: 5 });
  });

  it("shades the chosen operation", () => {
    const sizes = SETSFN_OP_ORDER.map((op) => derive({ op }, { a: 5, b: 4, common: 1 }).nShaded);
    // A ∪ B, A ∩ B, A − B, B − A, A′ for A = {1, …, 5}, B = {5, …, 8}.
    expect(sizes).toEqual([8, 1, 4, 3, 5]);
  });

  it("gives A 2ⁿ subsets", () => {
    expect([0, 1, 3, 4, 6].map((a) => derive({}, { a }).powerA)).toEqual([1, 2, 8, 16, 64]);
  });
});

describe("three sets", () => {
  it("uses the evens, the multiples of 3 and {1, …, 6} in U = {1, …, 10}", () => {
    const r = derive({ sets: "three" });
    expect(r).toMatchObject({ nA: 5, nB: 3, nC: 6, nAB: 1, nAC: 3, nBC: 2, nAllCommon: 1, nAll: 9 });
    expect(r.nAll).toBe(r.nA + r.nB + r.nC - r.nAB - r.nAC - r.nBC + r.nAllCommon);
    expect(derive({ sets: "three", op: "union" }).nShaded).toBe(9);
    expect(derive({ sets: "three", op: "intersection" }).nShaded).toBe(1);
  });
});

describe("relations on {1, …, 5}", () => {
  const props = (relation: SetsFnParams["relation"], state: Partial<SetsFnState> = {}) => {
    const r = derive({ relation }, { addR: 0, addS: 0, addT: 0, ...state });
    return [r.pairs, r.reflexive, r.symmetric, r.transitive, r.equivalence, r.classes];
  };

  it("tests each listed relation by hand", () => {
    expect(props("identity")).toEqual([5, 1, 1, 1, 1, 5]);
    expect(props("le")).toEqual([15, 1, 0, 1, 0, 0]);
    expect(props("lt")).toEqual([10, 0, 0, 1, 0, 0]);
    // 1 divides all five; 2 divides 2 and 4; 3, 4 and 5 only themselves.
    expect(props("divides")).toEqual([10, 1, 0, 1, 0, 0]);
    // 1 ~ 2 and 2 ~ 3, but not 1 ~ 3.
    expect(props("near")).toEqual([13, 1, 1, 0, 0, 0]);
    expect(props("succ")).toEqual([4, 0, 0, 0, 0, 0]);
    // (1, 5) and (5, 1) are in, (1, 1) is not.
    expect(props("sum6")).toEqual([5, 0, 1, 0, 0, 0]);
    expect(props("parity")).toEqual([13, 1, 1, 1, 1, 2]);
    expect(props("mod3")).toEqual([9, 1, 1, 1, 1, 3]);
    expect(props("chain")).toEqual([3, 0, 0, 0, 0, 0]);
    // Vacuously symmetric and transitive, but (1, 1) is missing.
    expect(props("empty")).toEqual([0, 0, 1, 1, 0, 0]);
  });

  it("splits an equivalence relation into its classes", () => {
    expect(setsfnClasses(setsfnRelationNow("parity", { addR: 0, addS: 0, addT: 0 }))).toEqual([[1, 3, 5], [2, 4]]);
    expect(setsfnClasses(setsfnRelationNow("mod3", { addR: 0, addS: 0, addT: 0 }))).toEqual([[1, 4], [2, 5], [3]]);
    expect(setsfnClasses(setsfnRelationNow("near", { addR: 0, addS: 0, addT: 0 }))).toEqual([]);
  });

  it("adds the fewest pairs for each property, in order", () => {
    // Transitive only: (1, 3) joins the chain 1 → 2 → 3.
    expect(derive({ relation: "chain" }, { addR: 0, addS: 0, addT: 1 })).toMatchObject({ pairs: 4, added: 1, transitive: 1, equivalence: 0 });
    // Reflexive and symmetric: 5 loops and 3 mirror pairs, but 1 ~ 2 ~ 3 is not yet transitive.
    expect(derive({ relation: "chain" }, { addR: 1, addS: 1, addT: 0 })).toMatchObject({ pairs: 11, reflexive: 1, symmetric: 1, transitive: 0 });
    // All three: {1, 2, 3}² and {4, 5}².
    expect(derive({ relation: "chain" }, { addR: 1, addS: 1, addT: 1 })).toMatchObject({ pairs: 13, added: 10, equivalence: 1, classes: 2 });
    // Symmetric then transitive alone already give every (a, a) here, since every element is in some pair.
    expect(derive({ relation: "chain" }, { addR: 0, addS: 1, addT: 1 })).toMatchObject({ pairs: 13, reflexive: 1, equivalence: 1, classes: 2 });
    // The transitive closure of a symmetric relation stays symmetric, so R, S, T in that order gives the equivalence closure.
    for (const relation of ["le", "lt", "divides", "near", "succ", "sum6", "chain", "empty"] as const) {
      expect(derive({ relation }, { addR: 1, addS: 1, addT: 1 })).toMatchObject({ reflexive: 1, symmetric: 1, transitive: 1, equivalence: 1 });
    }
    // b = a + 1 closes up into the whole of X × X.
    expect(derive({ relation: "succ" }, { addR: 1, addS: 1, addT: 1 })).toMatchObject({ pairs: 25, classes: 1 });
    // Closing an equivalence relation adds nothing.
    expect(derive({ relation: "mod3" }, { addR: 1, addS: 1, addT: 1 })).toMatchObject({ pairs: 9, added: 0 });
  });
});

describe("functions as arrows", () => {
  const arrows = (f: [number, number, number, number], nCod = 5, extra = 0) => derive({}, { f1: f[0], f2: f[1], f3: f[2], f4: f[3], nCod, extra });

  it("is not a function when an element has no arrow, or two", () => {
    expect(arrows([2, 3, 3, 0])).toMatchObject({ noImage: 1, isFunction: 0, oneOne: 0, onto: 0 });
    expect(arrows([2, 3, 3, 4], 5, 4)).toMatchObject({ twoImages: 1, isFunction: 0, extraImg: 4 });
    // A second arrow to where the first already goes is the same arrow.
    expect(arrows([2, 3, 3, 4], 5, 2)).toMatchObject({ twoImages: 0, isFunction: 1, extraImg: 0 });
    // With no first arrow, the second is element 1's only arrow.
    expect(arrows([0, 3, 4, 5], 5, 1)).toMatchObject({ img1: 1, isFunction: 1, oneOne: 1 });
  });

  it("is one-one when no two arrows meet, and onto when nothing in B is missed", () => {
    expect(arrows([2, 3, 3, 5])).toMatchObject({ isFunction: 1, rangeSize: 3, oneOne: 0, onto: 0 });
    expect(arrows([1, 2, 4, 5])).toMatchObject({ rangeSize: 4, oneOne: 1, onto: 0, bijective: 0 });
    expect(arrows([1, 2, 3, 3], 3)).toMatchObject({ rangeSize: 3, oneOne: 0, onto: 1 });
    expect(arrows([4, 1, 3, 2], 4)).toMatchObject({ oneOne: 1, onto: 1, bijective: 1 });
  });

  it("pulls arrows inside a smaller B", () => {
    expect(arrows([1, 2, 4, 5], 3)).toMatchObject({ img3: 3, img4: 3, codomainSize: 3 });
  });

  it("counts the functions from a 4-element set", () => {
    // nᵐ functions; n(n − 1)(n − 2)(n − 3) one-one; onto by inclusion–exclusion.
    expect(setsfnFunctionCounts(4, 3)).toEqual({ all: 81, oneOne: 0, onto: 36 });
    expect(setsfnFunctionCounts(4, 4)).toEqual({ all: 256, oneOne: 24, onto: 24 });
    expect(setsfnFunctionCounts(4, 5)).toEqual({ all: 625, oneOne: 120, onto: 0 });
    expect(setsfnFunctionCounts(4, 2)).toEqual({ all: 16, oneOne: 0, onto: 14 });
    expect(Object.is(setsfnFunctionCounts(4, 2).oneOne, -0)).toBe(false);
    expect(arrows([1, 1, 1, 1], 3)).toMatchObject({ functionsCount: 81, oneOneCount: 0, ontoCount: 36 });
  });

  it("agrees with listing every function from {1, 2, 3, 4} to {1, 2, 3}", () => {
    let all = 0;
    let onto = 0;
    for (let i = 0; i < 81; i++) {
      const images = [i % 3, Math.floor(i / 3) % 3, Math.floor(i / 9) % 3, Math.floor(i / 27) % 3];
      all++;
      if (new Set(images).size === 3) onto++;
    }
    expect([all, onto]).toEqual([81, 36]);
  });
});

describe("functions as graphs", () => {
  const graph = (curve: SetsFnParams["curve"], domain: SetsFnParams["domain"], codomain: SetsFnParams["codomain"], k = 1) => derive({ curve, domain, codomain }, { k });

  it("finds the NCERT bijections, and only those", () => {
    const bijective = (c: SetsFnParams["curve"], d: SetsFnParams["domain"], cd: SetsFnParams["codomain"]) => graph(c, d, cd).grBijective;
    expect(bijective("cube", "all", "all")).toBe(1);
    expect(bijective("square", "nonneg", "nonneg")).toBe(1);
    expect(bijective("exp", "all", "positive")).toBe(1);
    expect(bijective("sine", "principal", "unit")).toBe(1);
    expect(bijective("abs", "nonneg", "nonneg")).toBe(1);
    expect(bijective("square", "all", "all")).toBe(0);
    expect(bijective("square", "all", "nonneg")).toBe(0);
    expect(bijective("exp", "all", "all")).toBe(0);
    expect(bijective("exp", "all", "nonneg")).toBe(0);
    expect(bijective("sine", "all", "unit")).toBe(0);
  });

  it("calls x² : ℝ → ℝ neither one-one nor onto, and x² : ℝ → [0, ∞) onto", () => {
    expect(graph("square", "all", "all")).toMatchObject({ grValid: 1, grOneOne: 0, grOnto: 0 });
    expect(graph("square", "all", "nonneg")).toMatchObject({ grOneOne: 0, grOnto: 1 });
    // eˣ never reaches 0, so it is not onto [0, ∞).
    expect(graph("exp", "all", "nonneg")).toMatchObject({ grValid: 1, grOnto: 0 });
  });

  it("is not a function into a codomain that misses part of the range", () => {
    expect(graph("square", "all", "unit")).toMatchObject({ grValid: 0, grOnto: 0, grBijective: 0 });
    expect(graph("cube", "all", "nonneg").grValid).toBe(0);
    expect(graph("sine", "all", "unit").grValid).toBe(1);
  });

  it("counts where a horizontal line meets the graph", () => {
    expect(graph("square", "all", "all", 1).crossings).toBe(2);
    expect(graph("square", "nonneg", "all", 1).crossings).toBe(1);
    expect(graph("square", "all", "all", 0).crossings).toBe(1);
    expect(graph("square", "all", "all", -1)).toMatchObject({ crossings: 0, kInRange: 0, kInCodomain: 1 });
    expect(graph("square", "principal", "all", 2).crossings).toBe(2);
    expect(graph("square", "principal", "all", 2.5).crossings).toBe(0);
    expect(graph("abs", "all", "all", 1.5).crossings).toBe(2);
    expect(graph("cube", "all", "all", -2).crossings).toBe(1);
    expect(graph("exp", "all", "all", 0).crossings).toBe(0);
    expect(graph("exp", "nonneg", "all", 0.5).crossings).toBe(0);
    expect(graph("sine", "all", "unit", 0.5).crossings).toBe(3);
    expect(graph("sine", "principal", "unit", 1).crossings).toBe(1);
    expect(graph("sine", "principal", "unit", 1.2).crossings).toBe(0);
  });

  it("stores ranges and one-one flags that sampling agrees with", () => {
    for (const id of SETSFN_CURVE_ORDER) {
      const c = SETSFN_CURVES[id];
      for (const d of SETSFN_DOMAIN_ORDER) {
        const dom = SETSFN_DOMAINS[d].set;
        const lo = Math.max(dom.lo, -6);
        const hi = Math.min(dom.hi, 6);
        const ys = Array.from({ length: 1201 }, (_, i) => c.f(lo + ((hi - lo) * i) / 1200));
        for (const y of ys) expect(setsfnContains(c.range[d], y + 0) || Math.abs(y) < 1e-12, `${id} on ${d}: ${y}`).toBe(true);
        const rising = ys.every((y, i) => i === 0 || y > ys[i - 1]!);
        const falling = ys.every((y, i) => i === 0 || y < ys[i - 1]!);
        expect(rising || falling, `${id} one-one on ${d}`).toBe(c.oneOne[d]);
      }
    }
    expect(SETSFN_CURVES.square.range.principal.hi).toBeCloseTo(2.4674, 4);
  });
});

describe("composition", () => {
  it("applies f first in g∘f", () => {
    // f = x², g = x + 1: (g∘f)(2) = 5, (f∘g)(2) = 9.
    expect(derive({ fRule: "square", gRule: "plus1" }, { x: 2 })).toMatchObject({ fx: 4, gfx: 5, gx: 3, fgx: 9, sameHere: 0, commute: 0 });
    expect(derive({ fRule: "plus1", gRule: "double" }, { x: 2 })).toMatchObject({ gfx: 6, fgx: 5 });
  });

  it("finds the pairs that commute on {−2, …, 2}", () => {
    const commute = (f: SetsFnParams["fRule"], g: SetsFnParams["gRule"]) => derive({ fRule: f, gRule: g }).commute;
    expect(commute("double", "negate")).toBe(1);
    expect(commute("plus1", "plus1")).toBe(1);
    expect(commute("plus1", "double")).toBe(0);
    expect(commute("square", "negate")).toBe(0);
    expect(commute("double", "square")).toBe(0);
    // 2x and x² agree at 0 only.
    expect(derive({ fRule: "double", gRule: "square" }, { x: 0 }).sameHere).toBe(1);
  });

  it("knows which f can be undone on {−2, …, 2}", () => {
    expect(SETSFN_RULE_ORDER.map((fRule) => derive({ fRule }).fOneOne)).toEqual([1, 1, 0, 1]);
    expect(derive({ fRule: "square" }).fImageSize).toBe(3);
    expect(Object.is(derive({ fRule: "negate" }, { x: 0 }).fx, -0)).toBe(false);
  });
});

describe("the model", () => {
  it("clamps every control and numbers every output", () => {
    let s = model.initialize(model.defaultParams);
    for (const key of model.stateVariables) {
      s = model.setVariable(s, key, 99, model.defaultParams);
      s = model.setVariable(s, key, Number.NaN, model.defaultParams);
    }
    expect(model.setVariable(base, "k", 9, model.defaultParams).k).toBe(3.5);
    expect(model.setVariable(base, "a", -3, model.defaultParams).a).toBe(0);
    expect(model.setVariable(base, "addT", 0.7, model.defaultParams).addT).toBe(1);
    for (const sets of SETSFN_KIND_ORDER)
      for (const relation of SETSFN_RELATION_ORDER)
        for (const curve of SETSFN_CURVE_ORDER)
          for (const domain of SETSFN_DOMAIN_ORDER)
            for (const codomain of SETSFN_CODOMAIN_ORDER) {
              const r = model.derive(s, { ...model.defaultParams, sets, relation, curve, domain, codomain });
              for (const key of model.outputs) {
                expect(Number.isFinite(r[key]), `${sets} ${relation} ${curve} ${domain} ${codomain} ${key}`).toBe(true);
                expect(Object.is(r[key], -0), key).toBe(false);
              }
            }
  });

  it("steps the composition's input through A", () => {
    expect(model.step({ ...base, x: 2 }, model.defaultParams, 1).x).toBe(2);
    expect(model.step({ ...base, x: 0 }, model.defaultParams, -1).x).toBe(-1);
  });
});
