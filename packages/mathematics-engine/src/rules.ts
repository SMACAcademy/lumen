import type { SimulationModel } from "@ise/science-engine";

/**
 * The rules of differentiation, each as something you can watch.
 *
 * Product: a rectangle with sides u(x) and v(x). Nudge x by Δx and it grows
 * by two strips, v·Δu and u·Δv, and a small corner Δu·Δv. Divide by Δx and
 * let Δx shrink: the strips give u′v + uv′, and the corner vanishes.
 *
 * Chain: y = f(u) with u = g(x), as three number lines. A small interval on
 * the x line is stretched by g′(x) onto the u line, and that by f′(u) onto
 * the y line. The overall stretch is the product.
 *
 * Implicit and parametric: a point going round x²/a² + y²/b² = 1. Its
 * tangent's slope is −b²x/a²y without ever solving for y; or, with
 * x = a cos t and y = b sin t, (dy/dt) ÷ (dx/dt).
 *
 * Every derivative below is exact and entered by hand; the growth and the
 * ratios shown to the learner are computed from the functions themselves.
 */

export interface ProductPair {
  label: string;
  uLabel: string;
  vLabel: string;
  u(x: number): number;
  v(x: number): number;
  du(x: number): number;
  dv(x: number): number;
}

export type ProductPairId = "x-square" | "line-line" | "root-x" | "x-exp";
export const PRODUCT_PAIR_ORDER: readonly ProductPairId[] = ["x-square", "line-line", "root-x", "x-exp"];
export const PRODUCT_PAIRS: Record<ProductPairId, ProductPair> = {
  "x-square": { label: "x · x²", uLabel: "x", vLabel: "x²", u: (x) => x, v: (x) => x * x, du: () => 1, dv: (x) => 2 * x },
  "line-line": { label: "(x + 1)(2x + 1)", uLabel: "x + 1", vLabel: "2x + 1", u: (x) => x + 1, v: (x) => 2 * x + 1, du: () => 1, dv: () => 2 },
  "root-x": { label: "√x · x", uLabel: "√x", vLabel: "x", u: (x) => Math.sqrt(x), v: (x) => x, du: (x) => 1 / (2 * Math.sqrt(x)), dv: () => 1 },
  "x-exp": { label: "x · e^(x/2)", uLabel: "x", vLabel: "e^(x/2)", u: (x) => x, v: (x) => Math.exp(x / 2), du: () => 1, dv: (x) => Math.exp(x / 2) / 2 },
};
/** x runs over this stretch for every pair, and the nudge over this one. */
export const PRODUCT_X: readonly [number, number] = [0.5, 2.5];
export const NUDGE: readonly [number, number] = [0.001, 0.5];

export interface ChainComposition {
  label: string;
  innerLabel: string;
  outerLabel: string;
  g(x: number): number;
  dg(x: number): number;
  f(u: number): number;
  df(u: number): number;
  /** Windows for the three number lines. */
  x: readonly [number, number];
  u: readonly [number, number];
  y: readonly [number, number];
}

export type ChainCompositionId = "square-linear" | "sine-double" | "exp-square" | "sine-square";
export const CHAIN_COMPOSITION_ORDER: readonly ChainCompositionId[] = ["square-linear", "sine-double", "exp-square", "sine-square"];
export const CHAIN_COMPOSITIONS: Record<ChainCompositionId, ChainComposition> = {
  "square-linear": { label: "(3x + 1)²", innerLabel: "u = 3x + 1", outerLabel: "y = u²", g: (x) => 3 * x + 1, dg: () => 3, f: (u) => u * u, df: (u) => 2 * u, x: [-1, 1.5], u: [-2, 7], y: [0, 36] },
  "sine-double": { label: "sin 2x", innerLabel: "u = 2x", outerLabel: "y = sin u", g: (x) => 2 * x, dg: () => 2, f: (u) => Math.sin(u), df: (u) => Math.cos(u), x: [-3, 3.5], u: [-6, 8], y: [-1.2, 1.2] },
  "exp-square": { label: "e^(x²)", innerLabel: "u = x²", outerLabel: "y = eᵘ", g: (x) => x * x, dg: (x) => 2 * x, f: (u) => Math.exp(u), df: (u) => Math.exp(u), x: [-1.5, 2], u: [0, 4], y: [0, 55] },
  "sine-square": { label: "sin(x²)", innerLabel: "u = x²", outerLabel: "y = sin u", g: (x) => x * x, dg: (x) => 2 * x, f: (u) => Math.sin(u), df: (u) => Math.cos(u), x: [-2.5, 3], u: [0, 9], y: [-1.2, 1.2] },
};

export type ImplicitShapeId = "circle" | "ellipse";
export const IMPLICIT_SHAPE_ORDER: readonly ImplicitShapeId[] = ["circle", "ellipse"];
export const IMPLICIT_SHAPES: Record<ImplicitShapeId, { label: string; a: number; b: number }> = {
  circle: { label: "x² + y² = 25", a: 5, b: 5 },
  ellipse: { label: "x²/25 + y²/9 = 1", a: 5, b: 3 },
};

export type RulesParams = { pair: ProductPairId; composition: ChainCompositionId; shape: ImplicitShapeId };

export interface RulesState {
  /** Where the product is looked at. */
  readonly x: number;
  /** Where the chain is looked at. */
  readonly cx: number;
  /** The nudge Δx, shared by the product and the chain. */
  readonly dx: number;
  /** How far round the curve the point is, degrees. */
  readonly angle: number;
}

export type RulesResults = {
  pair: number;
  x: number;
  dx: number;
  u: number;
  v: number;
  uRate: number;
  vRate: number;
  /** The rectangle's area, and how it grows when x is nudged: in all, in the two strips, in the corner. */
  area: number;
  grown: number;
  strips: number;
  corner: number;
  cornerShare: number;
  /** Δ(uv)/Δx, and the exact u′v + uv′. */
  average: number;
  productRule: number;
  composition: number;
  cx: number;
  inner: number;
  outer: number;
  innerRate: number;
  outerRate: number;
  chainRate: number;
  innerChange: number;
  outerChange: number;
  /** Δy/Δx. */
  actualRatio: number;
  shape: number;
  angle: number;
  pointX: number;
  pointY: number;
  /** The tangent's slope, 0 with vertical = 1 where it stands upright. */
  tangentSlope: number;
  vertical: number;
  horizontal: number;
  dxdt: number;
  dydt: number;
};

const OUTPUTS = [
  "pair", "x", "dx", "u", "v", "uRate", "vRate", "area", "grown", "strips", "corner", "cornerShare", "average", "productRule",
  "composition", "cx", "inner", "outer", "innerRate", "outerRate", "chainRate", "innerChange", "outerChange", "actualRatio",
  "shape", "angle", "pointX", "pointY", "tangentSlope", "vertical", "horizontal", "dxdt", "dydt",
] as const satisfies readonly (keyof RulesResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const tidy = (v: number) => (Math.abs(v) < 1e-12 ? 0 : v);
/** While playing, Δx shrinks by e^(−rate·t) and the point turns this many degrees a second. */
const SHRINK_RATE = 0.9;
const TURN_RATE = 30;

export const rulesModel: SimulationModel<RulesState, RulesParams, RulesResults> = {
  id: "rules",
  defaultParams: { pair: "x-square", composition: "square-linear", shape: "circle" },
  outputs: OUTPUTS,
  stateVariables: ["x", "cx", "dx", "angle"],

  initialize() {
    return { x: 1.5, cx: 0.5, dx: 0.5, angle: 53.13 };
  },

  advance(state, dt) {
    return { ...state, dx: clamp(state.dx * Math.exp(-SHRINK_RATE * dt), NUDGE[0], NUDGE[1]), angle: (state.angle + TURN_RATE * dt) % 360 };
  },

  step(state, _params, sign) {
    return { ...state, dx: clamp(sign > 0 ? state.dx / 2 : state.dx * 2, NUDGE[0], NUDGE[1]), angle: (state.angle + 15 * sign + 360) % 360 };
  },

  derive(state, params) {
    const pairId = PRODUCT_PAIR_ORDER.includes(params.pair) ? params.pair : "x-square";
    const pair = PRODUCT_PAIRS[pairId];
    const x = clamp(state.x, PRODUCT_X[0], PRODUCT_X[1]);
    const dx = clamp(state.dx, NUDGE[0], NUDGE[1]);
    const u = pair.u(x);
    const v = pair.v(x);
    const du = pair.u(x + dx) - u;
    const dv = pair.v(x + dx) - v;
    const grown = pair.u(x + dx) * pair.v(x + dx) - u * v;

    const compositionId = CHAIN_COMPOSITION_ORDER.includes(params.composition) ? params.composition : "square-linear";
    const chain = CHAIN_COMPOSITIONS[compositionId];
    const cx = clamp(state.cx, chain.x[0], chain.x[1] - NUDGE[1]);
    const inner = chain.g(cx);
    const outer = chain.f(inner);
    const innerChange = chain.g(cx + dx) - inner;
    const outerChange = chain.f(chain.g(cx + dx)) - outer;

    const shapeId = IMPLICIT_SHAPE_ORDER.includes(params.shape) ? params.shape : "circle";
    const { a, b } = IMPLICIT_SHAPES[shapeId];
    const angle = ((state.angle % 360) + 360) % 360;
    const t = (angle * Math.PI) / 180;
    const pointX = tidy(a * Math.cos(t));
    const pointY = tidy(b * Math.sin(t));
    const dxdt = tidy(-a * Math.sin(t));
    const dydt = tidy(b * Math.cos(t));
    const vertical = Math.abs(dxdt) < 1e-9;
    return {
      pair: PRODUCT_PAIR_ORDER.indexOf(pairId),
      x,
      dx,
      u,
      v,
      uRate: pair.du(x),
      vRate: pair.dv(x),
      area: u * v,
      grown,
      strips: v * du + u * dv,
      corner: du * dv,
      cornerShare: grown === 0 ? 0 : (du * dv) / grown,
      average: grown / dx,
      productRule: pair.du(x) * v + u * pair.dv(x),
      composition: CHAIN_COMPOSITION_ORDER.indexOf(compositionId),
      cx,
      inner,
      outer,
      innerRate: chain.dg(cx),
      outerRate: chain.df(inner),
      chainRate: chain.dg(cx) * chain.df(inner),
      innerChange,
      outerChange,
      actualRatio: outerChange / dx,
      shape: IMPLICIT_SHAPE_ORDER.indexOf(shapeId),
      angle,
      pointX,
      pointY,
      tangentSlope: vertical ? 0 : tidy(dydt / dxdt),
      vertical: vertical ? 1 : 0,
      horizontal: !vertical && Math.abs(dydt) < 1e-9 ? 1 : 0,
      dxdt,
      dydt,
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof RulesState] : undefined;
  },

  setVariable(state, id, value) {
    switch (id) {
      case "x": return { ...state, x: clamp(value, PRODUCT_X[0], PRODUCT_X[1]) };
      case "cx": return { ...state, cx: clamp(value, -3, 3) };
      case "dx": return { ...state, dx: clamp(value, NUDGE[0], NUDGE[1]) };
      case "angle": return { ...state, angle: clamp(value, 0, 360) };
      default: return state;
    }
  },
};
