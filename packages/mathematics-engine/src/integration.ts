import type { SimulationModel } from "@ise/science-engine";

/**
 * Methods of integration, each as a picture of areas.
 *
 * Substitution: ∫ f(g(x))·g′(x) dx over [a, b] is cut into strips. Each strip
 * is carried over to the u-axis by u = g(x): its width becomes
 * g(x + Δx) − g(x) ≈ g′(x)·Δx, stretched by g′, and its height drops from
 * f(g(x))·g′(x) to f(u), shrunk by the same g′. The strip's area is
 * unchanged, so the total is ∫ f(u) du over [g(a), g(b)].
 *
 * By parts: the curve (u(t), v(t)) for t from a to b. The region below it is
 * ∫v du and the region to its left ∫u dv; together they fill the rectangle
 * u(b)·v(b) less the corner u(a)·v(a). So ∫u dv = [uv] − ∫v du — the product
 * rule's rectangle, integrated.
 *
 * Partial fractions: a fraction with two linear factors below is the sum of
 * two simple fractions A/(x + p) + B/(x + q), each with a logarithm for its
 * integral; the areas under the two pieces add to the area under the whole.
 *
 * Every antiderivative and every exact value below is entered by hand and
 * checked in the tests against a fine numerical sum.
 */

export interface Substitution {
  label: string;
  integrandLabel: string;
  innerLabel: string;
  outerLabel: string;
  g(x: number): number;
  dg(x: number): number;
  f(u: number): number;
  /** An antiderivative of f, in u. */
  F(u: number): number;
  /** The lower limit is always 0; the upper may go up to this. */
  xMax: number;
  /** Drawing windows: one horizontal length for both axes (so a stretch shows), and one height range. */
  span: number;
  height: number;
}

export type SubstitutionId = "double" | "exp-square" | "sin-cos" | "log";
export const SUBSTITUTION_ORDER: readonly SubstitutionId[] = ["double", "exp-square", "sin-cos", "log"];
export const SUBSTITUTIONS: Record<SubstitutionId, Substitution> = {
  double: {
    label: "∫ 2 cos 2x dx",
    integrandLabel: "2 cos 2x",
    innerLabel: "u = 2x",
    outerLabel: "cos u",
    g: (x) => 2 * x,
    dg: () => 2,
    f: (u) => Math.cos(u),
    F: (u) => Math.sin(u),
    xMax: Math.PI / 4,
    span: Math.PI / 2,
    height: 2.2,
  },
  "exp-square": {
    label: "∫ 2x·e^(x²) dx",
    integrandLabel: "2x·e^(x²)",
    innerLabel: "u = x²",
    outerLabel: "eᵘ",
    g: (x) => x * x,
    dg: (x) => 2 * x,
    f: (u) => Math.exp(u),
    F: (u) => Math.exp(u),
    xMax: 1,
    span: 1,
    height: 6,
  },
  "sin-cos": {
    label: "∫ sin x cos x dx",
    integrandLabel: "sin x cos x",
    innerLabel: "u = sin x",
    outerLabel: "u",
    g: (x) => Math.sin(x),
    dg: (x) => Math.cos(x),
    f: (u) => u,
    F: (u) => (u * u) / 2,
    xMax: Math.PI / 2,
    span: Math.PI / 2,
    height: 1.1,
  },
  log: {
    label: "∫ x/(1 + x²) dx",
    integrandLabel: "x/(1 + x²)",
    innerLabel: "u = 1 + x²",
    outerLabel: "1/(2u)",
    g: (x) => 1 + x * x,
    dg: (x) => 2 * x,
    f: (u) => 1 / (2 * u),
    F: (u) => Math.log(u) / 2,
    xMax: 1.5,
    span: 2.25,
    height: 0.6,
  },
};

export interface PartsPair {
  label: string;
  uLabel: string;
  dvLabel: string;
  vLabel: string;
  /** The integration variable runs over [a, b]. */
  a: number;
  b: number;
  u(t: number): number;
  v(t: number): number;
  du(t: number): number;
  dv(t: number): number;
  /** Antiderivatives of u·v′ and of v·u′. */
  udvPrimitive(t: number): number;
  vduPrimitive(t: number): number;
  /** ∫u dv over the whole of [a, b], entered by hand. */
  exact: number;
  /** Drawing window for the (u, v) plane. */
  uWindow: readonly [number, number];
  vWindow: readonly [number, number];
}

export type PartsPairId = "x-exp" | "x-cos" | "log" | "x-log";
export const PARTS_PAIR_ORDER: readonly PartsPairId[] = ["x-exp", "x-cos", "log", "x-log"];
export const PARTS_PAIRS: Record<PartsPairId, PartsPair> = {
  "x-exp": {
    label: "∫₀¹ x eˣ dx",
    uLabel: "u = x",
    dvLabel: "dv = eˣ dx",
    vLabel: "v = eˣ",
    a: 0,
    b: 1,
    u: (t) => t,
    v: (t) => Math.exp(t),
    du: () => 1,
    dv: (t) => Math.exp(t),
    udvPrimitive: (t) => (t - 1) * Math.exp(t),
    vduPrimitive: (t) => Math.exp(t),
    exact: 1,
    uWindow: [-0.15, 1.25],
    vWindow: [-0.3, 3.1],
  },
  "x-cos": {
    label: "∫₀^(π/2) x cos x dx",
    uLabel: "u = x",
    dvLabel: "dv = cos x dx",
    vLabel: "v = sin x",
    a: 0,
    b: Math.PI / 2,
    u: (t) => t,
    v: (t) => Math.sin(t),
    du: () => 1,
    dv: (t) => Math.cos(t),
    udvPrimitive: (t) => t * Math.sin(t) + Math.cos(t),
    vduPrimitive: (t) => -Math.cos(t),
    exact: Math.PI / 2 - 1,
    uWindow: [-0.2, 1.9],
    vWindow: [-0.12, 1.2],
  },
  log: {
    label: "∫₁^e ln x dx",
    uLabel: "u = ln x",
    dvLabel: "dv = dx",
    vLabel: "v = x",
    a: 1,
    b: Math.E,
    u: (t) => Math.log(t),
    v: (t) => t,
    du: (t) => 1 / t,
    dv: () => 1,
    udvPrimitive: (t) => t * Math.log(t) - t,
    vduPrimitive: (t) => t,
    exact: 1,
    uWindow: [-0.15, 1.25],
    vWindow: [-0.3, 3.1],
  },
  "x-log": {
    label: "∫₁^e x ln x dx",
    uLabel: "u = ln x",
    dvLabel: "dv = x dx",
    vLabel: "v = x²/2",
    a: 1,
    b: Math.E,
    u: (t) => Math.log(t),
    v: (t) => (t * t) / 2,
    du: (t) => 1 / t,
    dv: (t) => t,
    udvPrimitive: (t) => ((t * t) / 2) * Math.log(t) - (t * t) / 4,
    vduPrimitive: (t) => (t * t) / 4,
    exact: (Math.E * Math.E + 1) / 4,
    uWindow: [-0.15, 1.25],
    vWindow: [-0.4, 4.1],
  },
};

export interface PartialFraction {
  label: string;
  splitLabel: string;
  /** The fraction as written, entered by hand. */
  f(x: number): number;
  /** f = A/(x + p) + B/(x + q). */
  A: number;
  p: number;
  B: number;
  q: number;
  /** The area under f from 0 to 1, entered by hand. */
  exactToOne: number;
  /** Height window for drawing. */
  y: readonly [number, number];
}

export type PartialFractionId = "one-two" | "one-three" | "with-x";
export const PARTIAL_FRACTION_ORDER: readonly PartialFractionId[] = ["one-two", "one-three", "with-x"];
export const PARTIAL_FRACTIONS: Record<PartialFractionId, PartialFraction> = {
  "one-two": {
    label: "1/((x + 1)(x + 2))",
    splitLabel: "1/(x + 1) − 1/(x + 2)",
    f: (x) => 1 / ((x + 1) * (x + 2)),
    A: 1,
    p: 1,
    B: -1,
    q: 2,
    exactToOne: Math.log(4 / 3),
    y: [-0.6, 1.1],
  },
  "one-three": {
    label: "1/((x + 1)(x + 3))",
    splitLabel: "½/(x + 1) − ½/(x + 3)",
    f: (x) => 1 / ((x + 1) * (x + 3)),
    A: 0.5,
    p: 1,
    B: -0.5,
    q: 3,
    exactToOne: Math.log(3 / 2) / 2,
    y: [-0.6, 1.1],
  },
  "with-x": {
    label: "(x + 3)/((x + 1)(x + 2))",
    splitLabel: "2/(x + 1) − 1/(x + 2)",
    f: (x) => (x + 3) / ((x + 1) * (x + 2)),
    A: 2,
    p: 1,
    B: -1,
    q: 2,
    exactToOne: Math.log(8 / 3),
    y: [-0.6, 2.2],
  },
};

/** The ranges of the controls. */
export const SUBSTITUTION_UPPER: readonly [number, number] = [0.1, 1.6];
export const STRIP_COUNT: readonly [number, number] = [1, 64];
export const FRACTION_UPPER: readonly [number, number] = [0.1, 4];

export type IntegrationParams = { substitution: SubstitutionId; pair: PartsPairId; fraction: PartialFractionId };

export interface IntegrationState {
  /** Upper limit b of the substitution integral (lower limit 0). */
  readonly upper: number;
  /** Number of strips. */
  readonly strips: number;
  /** Where on [0, b] the picked strip is. */
  readonly probe: number;
  /** How far along [a, b] the parts curve has been drawn, 0 to 1. */
  readonly sweep: number;
  /** Upper limit of the partial-fraction integral (lower limit 0). */
  readonly fracUpper: number;
}

export type IntegrationResults = {
  substitution: number;
  upper: number;
  uLower: number;
  uUpper: number;
  strips: number;
  /** The strip sums on the x side and on the u side, and the exact value. */
  xSum: number;
  uSum: number;
  exactSub: number;
  subError: number;
  /** The picked strip: where it is, where it lands on the u-axis, how much it is stretched, and its two heights. */
  probe: number;
  probeU: number;
  stretch: number;
  heightX: number;
  heightU: number;
  pair: number;
  sweep: number;
  t: number;
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  /** [uv] = u(t)v(t) − u(a)v(a), and the two areas that fill it. */
  uv: number;
  vdu: number;
  udv: number;
  fraction: number;
  fracUpper: number;
  coefA: number;
  coefB: number;
  areaA: number;
  areaB: number;
  areaWhole: number;
};

const OUTPUTS = [
  "substitution", "upper", "uLower", "uUpper", "strips", "xSum", "uSum", "exactSub", "subError",
  "probe", "probeU", "stretch", "heightX", "heightU",
  "pair", "sweep", "t", "u0", "v0", "u1", "v1", "uv", "vdu", "udv",
  "fraction", "fracUpper", "coefA", "coefB", "areaA", "areaB", "areaWhole",
] as const satisfies readonly (keyof IntegrationResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const tidy = (v: number) => (Math.abs(v) < 1e-12 ? 0 : v);
/** While playing, the strip count grows by e^(rate·t) and the parts curve is drawn at this fraction a second. */
const STRIP_GROWTH = 0.7;
const SWEEP_RATE = 0.25;

const substitutionOf = (params: IntegrationParams) => (SUBSTITUTION_ORDER.includes(params.substitution) ? params.substitution : "exp-square");
const pairOf = (params: IntegrationParams) => (PARTS_PAIR_ORDER.includes(params.pair) ? params.pair : "x-exp");
const fractionOf = (params: IntegrationParams) => (PARTIAL_FRACTION_ORDER.includes(params.fraction) ? params.fraction : "one-two");

/** The strip edges x₀ … xₙ on [0, b], and each strip's midpoint. */
export function integrationStrips(b: number, n: number): { edges: number[]; mids: number[] } {
  const h = b / n;
  const edges = Array.from({ length: n + 1 }, (_, i) => i * h);
  const mids = Array.from({ length: n }, (_, i) => (i + 0.5) * h);
  return { edges, mids };
}

/** Which strip of n on [0, b] the probe falls in. */
export function integrationProbeStrip(probe: number, b: number, n: number): number {
  return clamp(Math.floor((probe / b) * n), 0, n - 1);
}

export const integrationModel: SimulationModel<IntegrationState, IntegrationParams, IntegrationResults> = {
  id: "integration",
  defaultParams: { substitution: "exp-square", pair: "x-exp", fraction: "one-two" },
  outputs: OUTPUTS,
  stateVariables: ["upper", "strips", "probe", "sweep", "fracUpper"],

  initialize() {
    return { upper: 1, strips: 4, probe: 0.5, sweep: 1, fracUpper: 1 };
  },

  /** Play multiplies the strips and draws the parts curve on; both stop at their ends. */
  advance(state, dt) {
    return {
      ...state,
      strips: clamp(Math.max(state.strips, 1) * Math.exp(STRIP_GROWTH * dt), STRIP_COUNT[0], STRIP_COUNT[1]),
      sweep: clamp(state.sweep + SWEEP_RATE * dt, 0, 1),
    };
  },

  step(state, _params, sign) {
    const n = clamp(Math.round(state.strips), STRIP_COUNT[0], STRIP_COUNT[1]);
    return {
      ...state,
      strips: clamp(sign > 0 ? n * 2 : Math.floor(n / 2), STRIP_COUNT[0], STRIP_COUNT[1]),
      sweep: clamp(Math.round(state.sweep * 10) / 10 + 0.1 * sign, 0, 1),
    };
  },

  derive(state, params) {
    const subId = substitutionOf(params);
    const sub = SUBSTITUTIONS[subId];
    const b = clamp(state.upper, SUBSTITUTION_UPPER[0], sub.xMax);
    const n = clamp(Math.round(state.strips), STRIP_COUNT[0], STRIP_COUNT[1]);
    const { edges, mids } = integrationStrips(b, n);
    let xSum = 0;
    let uSum = 0;
    for (let i = 0; i < n; i++) {
      const m = mids[i]!;
      const height = sub.f(sub.g(m));
      xSum += height * sub.dg(m) * (b / n);
      uSum += height * (sub.g(edges[i + 1]!) - sub.g(edges[i]!));
    }
    const uLower = sub.g(0);
    const uUpper = sub.g(b);
    const exactSub = sub.F(uUpper) - sub.F(uLower);
    const probe = clamp(state.probe, 0, b);

    const pairId = pairOf(params);
    const pair = PARTS_PAIRS[pairId];
    const sweep = clamp(state.sweep, 0, 1);
    const t = pair.a + sweep * (pair.b - pair.a);
    const u0 = pair.u(pair.a);
    const v0 = pair.v(pair.a);
    const u1 = pair.u(t);
    const v1 = pair.v(t);

    const fracId = fractionOf(params);
    const frac = PARTIAL_FRACTIONS[fracId];
    const c = clamp(state.fracUpper, FRACTION_UPPER[0], FRACTION_UPPER[1]);
    const areaA = frac.A * Math.log((c + frac.p) / frac.p);
    const areaB = frac.B * Math.log((c + frac.q) / frac.q);

    return {
      substitution: SUBSTITUTION_ORDER.indexOf(subId),
      upper: b,
      uLower,
      uUpper,
      strips: n,
      xSum,
      uSum,
      exactSub,
      subError: Math.abs(xSum - exactSub),
      probe,
      probeU: sub.g(probe),
      stretch: tidy(sub.dg(probe)),
      heightX: tidy(sub.f(sub.g(probe)) * sub.dg(probe)),
      heightU: sub.f(sub.g(probe)),
      pair: PARTS_PAIR_ORDER.indexOf(pairId),
      sweep,
      t,
      u0: tidy(u0),
      v0,
      u1: tidy(u1),
      v1: tidy(v1),
      uv: tidy(u1 * v1 - u0 * v0),
      vdu: tidy(pair.vduPrimitive(t) - pair.vduPrimitive(pair.a)),
      udv: tidy(pair.udvPrimitive(t) - pair.udvPrimitive(pair.a)),
      fraction: PARTIAL_FRACTION_ORDER.indexOf(fracId),
      fracUpper: c,
      coefA: frac.A,
      coefB: frac.B,
      areaA,
      areaB,
      areaWhole: areaA + areaB,
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof IntegrationState] : undefined;
  },

  setVariable(state, id, value) {
    switch (id) {
      case "upper": return { ...state, upper: clamp(value, SUBSTITUTION_UPPER[0], SUBSTITUTION_UPPER[1]) };
      case "strips": return { ...state, strips: clamp(value, STRIP_COUNT[0], STRIP_COUNT[1]) };
      case "probe": return { ...state, probe: clamp(value, 0, SUBSTITUTION_UPPER[1]) };
      case "sweep": return { ...state, sweep: clamp(value, 0, 1) };
      case "fracUpper": return { ...state, fracUpper: clamp(value, FRACTION_UPPER[0], FRACTION_UPPER[1]) };
      default: return state;
    }
  },
};
