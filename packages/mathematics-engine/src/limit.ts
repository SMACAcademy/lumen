import type { SimulationModel } from "@ise/science-engine";

/**
 * Limits, continuity and differentiability, watched rather than stated.
 *
 * Approach: a function with one interesting point a. Two markers sit at
 * a − h and a + h; as h shrinks their heights either close on one number
 * (the limit), on two different numbers (a jump), run off (a pole) or never
 * settle (sin 1/x). The limit is about where the function is heading, not
 * about what it does at a: the graph may have a hole there, or a point moved
 * off the curve.
 *
 * Trap: the same idea made exact. A band of half-height ε round the limit L,
 * a strip of half-width δ round a: the limit is L if, however thin the band,
 * some strip keeps the whole graph inside it.
 *
 * Zoom: differentiability. Zoom in on a point with equal scales and a smooth
 * curve straightens — its left and right slopes agree. A corner, cusp or
 * vertical tangent never does.
 *
 * Every limit, value and kind below is exact, entered by hand; the lab's
 * numbers come from evaluating f itself.
 */

export type DiscontinuityKind = "continuous" | "removable" | "jump" | "infinite" | "oscillating";
export const DISCONTINUITY_KINDS: readonly DiscontinuityKind[] = ["continuous", "removable", "jump", "infinite", "oscillating"];

export interface LimitFunction {
  /** The rule as shown to learners. */
  label: string;
  /** NaN where the rule gives no value. */
  f(x: number): number;
  /** The point being approached. */
  a: number;
  /** One-sided limits; null where the function does not settle on a finite number. */
  left: number | null;
  right: number | null;
  /** f(a), or null where it is undefined. */
  value: number | null;
  kind: DiscontinuityKind;
  view: { x: readonly [number, number]; y: readonly [number, number] };
}

export type LimitFunctionId = "hole" | "sinc" | "expm" | "root" | "moved" | "smooth" | "jump" | "pole" | "wiggle";
export const LIMIT_FUNCTION_ORDER: readonly LimitFunctionId[] = ["hole", "sinc", "expm", "root", "moved", "smooth", "jump", "pole", "wiggle"];

export const LIMIT_FUNCTIONS: Record<LimitFunctionId, LimitFunction> = {
  hole: { label: "(x² − 1) / (x − 1)", f: (x) => (x === 1 ? NaN : (x * x - 1) / (x - 1)), a: 1, left: 2, right: 2, value: null, kind: "removable", view: { x: [-1, 3], y: [-0.5, 4.5] } },
  sinc: { label: "sin x / x", f: (x) => (x === 0 ? NaN : Math.sin(x) / x), a: 0, left: 1, right: 1, value: null, kind: "removable", view: { x: [-7, 7], y: [-0.6, 1.6] } },
  expm: { label: "(eˣ − 1) / x", f: (x) => (x === 0 ? NaN : Math.expm1(x) / x), a: 0, left: 1, right: 1, value: null, kind: "removable", view: { x: [-3, 2.5], y: [-0.5, 5] } },
  root: { label: "(√(x + 1) − 1) / x", f: (x) => (x === 0 || x < -1 ? NaN : (Math.sqrt(x + 1) - 1) / x), a: 0, left: 0.5, right: 0.5, value: null, kind: "removable", view: { x: [-1, 3], y: [-0.1, 1.2] } },
  moved: { label: "x + 1, but f(1) = 3", f: (x) => (x === 1 ? 3 : x + 1), a: 1, left: 2, right: 2, value: 3, kind: "removable", view: { x: [-1, 3], y: [-0.5, 4.5] } },
  smooth: { label: "x²", f: (x) => x * x, a: 1, left: 1, right: 1, value: 1, kind: "continuous", view: { x: [-2, 3], y: [-1, 5] } },
  jump: { label: "|x| / x", f: (x) => (x === 0 ? NaN : Math.sign(x)), a: 0, left: -1, right: 1, value: null, kind: "jump", view: { x: [-3, 3], y: [-2, 2] } },
  pole: { label: "1 / x", f: (x) => (x === 0 ? NaN : 1 / x), a: 0, left: null, right: null, value: null, kind: "infinite", view: { x: [-3, 3], y: [-6, 6] } },
  wiggle: { label: "sin(1 / x)", f: (x) => (x === 0 ? NaN : Math.sin(1 / x)), a: 0, left: null, right: null, value: null, kind: "oscillating", view: { x: [-1, 1], y: [-1.6, 1.6] } },
};

/** The two-sided limit at a, or null where there is none. */
export function limitOf(fn: LimitFunction): number | null {
  return fn.left !== null && fn.right !== null && fn.left === fn.right ? fn.left : null;
}

/** The number the trap's band is centred on: the limit, or half-way between two one-sided limits. */
export function trapCentre(fn: LimitFunction): number {
  const limit = limitOf(fn);
  if (limit !== null) return limit;
  return fn.left !== null && fn.right !== null ? (fn.left + fn.right) / 2 : 0;
}

/** Whether every point of the graph within δ of a (but not at a) lies within ε of the centre. */
export function isTrapped(fn: LimitFunction, delta: number, epsilon: number): boolean {
  if (fn.left === null || fn.right === null) return false;
  const centre = trapCentre(fn);
  const samples = 200;
  for (let i = 1; i <= samples; i++) {
    const d = (delta * i) / (samples + 1);
    for (const x of [fn.a - d, fn.a + d]) {
      const y = fn.f(x);
      // Outside the function's domain there is nothing to escape the band.
      if (Number.isFinite(y) && Math.abs(y - centre) >= epsilon) return false;
    }
  }
  return true;
}

/** The widest strip, to the nearest hundredth up to 1, that traps the graph; 0 if none does. */
export function widestTrap(fn: LimitFunction, epsilon: number): number {
  // A narrower strip is a subset of a wider one, so "trapped" switches once: bisect for where.
  if (!isTrapped(fn, 0.01, epsilon)) return 0;
  let lo = 1;
  let hi = 100;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (isTrapped(fn, mid / 100, epsilon)) lo = mid;
    else hi = mid - 1;
  }
  return lo / 100;
}

export type CornerKind = "smooth" | "corner" | "vertical" | "cusp";
export const CORNER_KINDS: readonly CornerKind[] = ["smooth", "corner", "vertical", "cusp"];

export interface ZoomCurve {
  label: string;
  f(x: number): number;
  a: number;
  /** f′(a) where it exists. */
  derivative: number | null;
  kind: CornerKind;
}

export type ZoomCurveId = "parabola" | "joined" | "abs" | "broken" | "cuberoot" | "cusp";
export const ZOOM_CURVE_ORDER: readonly ZoomCurveId[] = ["parabola", "joined", "abs", "broken", "cuberoot", "cusp"];

export const ZOOM_CURVES: Record<ZoomCurveId, ZoomCurve> = {
  parabola: { label: "x², at x = 1", f: (x) => x * x, a: 1, derivative: 2, kind: "smooth" },
  joined: { label: "x² up to 1, then 2x − 1", f: (x) => (x < 1 ? x * x : 2 * x - 1), a: 1, derivative: 2, kind: "smooth" },
  abs: { label: "|x|, at x = 0", f: (x) => Math.abs(x), a: 0, derivative: null, kind: "corner" },
  broken: { label: "x² up to 1, then x", f: (x) => (x < 1 ? x * x : x), a: 1, derivative: null, kind: "corner" },
  cuberoot: { label: "∛x, at x = 0", f: (x) => Math.cbrt(x), a: 0, derivative: null, kind: "vertical" },
  cusp: { label: "∛(x²), at x = 0", f: (x) => Math.cbrt(x * x), a: 0, derivative: null, kind: "cusp" },
};

/** Half the width of the window at a given zoom: 2 units at ×1, 0.002 at ×1000. */
export function zoomWindow(zoomLog: number): number {
  return 2 / 10 ** zoomLog;
}

export type LimitParams = { function: LimitFunctionId; curve: ZoomCurveId };

export interface LimitState {
  /** Distance of the two markers from a; also the strip's half-width δ. */
  readonly h: number;
  /** The band's half-height ε. */
  readonly epsilon: number;
  /** log₁₀ of the zoom factor. */
  readonly zoom: number;
}

export type LimitResults = {
  function: number;
  a: number;
  h: number;
  xLeft: number;
  xRight: number;
  /** f just left and just right of a (held within ±10⁶). */
  fLeft: number;
  fRight: number;
  /** |fRight − fLeft|. */
  gap: number;
  hasLimit: number;
  limit: number;
  leftLimit: number;
  rightLimit: number;
  hasLeft: number;
  hasRight: number;
  /** f(a), with defined = 0 where there is none. */
  defined: number;
  value: number;
  continuous: number;
  /** Index into DISCONTINUITY_KINDS. */
  kind: number;
  epsilon: number;
  trapped: number;
  /** The widest δ (to 0.01, up to 1) that works for this ε; 0 if none. */
  bestDelta: number;
  curve: number;
  /** The zoom as a factor and as a power of ten, and the window's half-width. */
  zoom: number;
  zoomFactor: number;
  window: number;
  slopeLeft: number;
  slopeRight: number;
  slopeGap: number;
  differentiable: number;
  derivative: number;
  /** Index into CORNER_KINDS. */
  corner: number;
};

const OUTPUTS = [
  "function", "a", "h", "xLeft", "xRight", "fLeft", "fRight", "gap", "hasLimit", "limit", "leftLimit", "rightLimit", "hasLeft", "hasRight",
  "defined", "value", "continuous", "kind", "epsilon", "trapped", "bestDelta",
  "curve", "zoom", "zoomFactor", "window", "slopeLeft", "slopeRight", "slopeGap", "differentiable", "derivative", "corner",
] as const satisfies readonly (keyof LimitResults)[];

export const LIMIT_H_MIN = 0.001;
export const LIMIT_H_MAX = 1;
export const MAX_ZOOM = 3;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const bounded = (v: number) => (Number.isFinite(v) ? clamp(v, -1e6, 1e6) : 0);
/** While playing, h shrinks by e^(−rate·t) and the zoom grows by half a power of ten a second. */
const SHRINK_RATE = 0.9;
const ZOOM_RATE = 0.5;

export const limitModel: SimulationModel<LimitState, LimitParams, LimitResults> = {
  id: "limit",
  defaultParams: { function: "hole", curve: "parabola" },
  outputs: OUTPUTS,
  stateVariables: ["h", "epsilon", "zoom"],

  initialize() {
    return { h: 1, epsilon: 0.5, zoom: 0 };
  },

  advance(state, dt) {
    return {
      ...state,
      h: clamp(state.h * Math.exp(-SHRINK_RATE * dt), LIMIT_H_MIN, LIMIT_H_MAX),
      zoom: Math.min(MAX_ZOOM, state.zoom + ZOOM_RATE * dt),
    };
  },

  /** A step forward halves h and zooms in by half a power of ten. */
  step(state, _params, sign) {
    return {
      ...state,
      h: clamp(sign > 0 ? state.h / 2 : state.h * 2, LIMIT_H_MIN, LIMIT_H_MAX),
      zoom: clamp(Math.round(state.zoom * 2) / 2 + 0.5 * sign, 0, MAX_ZOOM),
    };
  },

  derive(state, params) {
    const id = LIMIT_FUNCTION_ORDER.includes(params.function) ? params.function : "hole";
    const fn = LIMIT_FUNCTIONS[id];
    const h = clamp(state.h, LIMIT_H_MIN, LIMIT_H_MAX);
    const epsilon = clamp(state.epsilon, 0.05, 1);
    const fLeft = bounded(fn.f(fn.a - h));
    const fRight = bounded(fn.f(fn.a + h));
    const limit = limitOf(fn);

    const curveId = ZOOM_CURVE_ORDER.includes(params.curve) ? params.curve : "parabola";
    const curve = ZOOM_CURVES[curveId];
    const zoom = clamp(state.zoom, 0, MAX_ZOOM);
    const w = zoomWindow(zoom);
    const slopeLeft = (curve.f(curve.a) - curve.f(curve.a - w)) / w;
    const slopeRight = (curve.f(curve.a + w) - curve.f(curve.a)) / w;
    return {
      function: LIMIT_FUNCTION_ORDER.indexOf(id),
      a: fn.a,
      h,
      xLeft: fn.a - h,
      xRight: fn.a + h,
      fLeft,
      fRight,
      gap: Math.abs(fRight - fLeft),
      hasLimit: limit === null ? 0 : 1,
      limit: limit ?? 0,
      leftLimit: fn.left ?? 0,
      rightLimit: fn.right ?? 0,
      hasLeft: fn.left === null ? 0 : 1,
      hasRight: fn.right === null ? 0 : 1,
      defined: fn.value === null ? 0 : 1,
      value: fn.value ?? 0,
      continuous: fn.kind === "continuous" ? 1 : 0,
      kind: DISCONTINUITY_KINDS.indexOf(fn.kind),
      epsilon,
      trapped: isTrapped(fn, h, epsilon) ? 1 : 0,
      bestDelta: widestTrap(fn, epsilon),
      curve: ZOOM_CURVE_ORDER.indexOf(curveId),
      zoom,
      zoomFactor: 10 ** zoom,
      window: w,
      slopeLeft,
      slopeRight,
      slopeGap: Math.abs(slopeRight - slopeLeft),
      differentiable: curve.derivative === null ? 0 : 1,
      derivative: curve.derivative ?? 0,
      corner: CORNER_KINDS.indexOf(curve.kind),
    };
  },

  getVariable(state, id) {
    return id === "h" ? state.h : id === "epsilon" ? state.epsilon : id === "zoom" ? state.zoom : undefined;
  },

  setVariable(state, id, value) {
    if (id === "h") return { ...state, h: clamp(value, LIMIT_H_MIN, LIMIT_H_MAX) };
    if (id === "epsilon") return { ...state, epsilon: clamp(value, 0.05, 1) };
    if (id === "zoom") return { ...state, zoom: clamp(value, 0, MAX_ZOOM) };
    return state;
  },
};
