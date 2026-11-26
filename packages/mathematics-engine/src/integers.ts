import type { SimulationModel } from "@ise/science-engine";

/**
 * Integers and rational numbers, classes 6 to 8, on the number line.
 *
 * Hops: a frog starts at an integer and hops. Adding a positive number hops
 * right, adding a negative number hops left, and subtracting a number is
 * adding its opposite: 2 − (−4) = 2 + 4.
 *
 * Life: the same sums told as a temperature, a lift, a bank balance or a
 * height above sea level, each with its own zero.
 *
 * Times: times × jump is `times` hops of size `jump`, all from 0. A minus sign
 * on the jump points the hops left; a minus sign on the count turns the frog
 * round. Two minus signs turn it round twice, so (−3) × (−2) = +6.
 *
 * Rationals: p/q with q ≠ 0, placed on the line; its standard form (bottom
 * positive, no common factor); a second rational to compare it with; the
 * fractions that fit between the two once the gap is cut finer and finer;
 * and the two added or subtracted over a common bottom number.
 *
 * All the arithmetic is on whole numbers — no rounding anywhere.
 */

export type IntegersSceneId = "temperature" | "lift" | "bank" | "sea";
export const INTEGERS_SCENE_ORDER: readonly IntegersSceneId[] = ["temperature", "lift", "bank", "sea"];

export interface IntegersScene {
  label: string;
  /** One step on the line is this much in real life (1 °C, 1 floor, ₹100, 10 m). */
  scale: number;
  /** How an amount is written, e.g. "−5 °C", "₹300". */
  format(amount: number): string;
  /** The name of zero, and of the side below it. */
  zero: string;
  below: string;
}

/** A minus sign as printed: "−5", never "-5". */
export const integersSigned = (value: number): string => (value < 0 ? `−${Math.abs(value)}` : String(value));

export const INTEGERS_SCENES: Record<IntegersSceneId, IntegersScene> = {
  temperature: { label: "Temperature", scale: 1, format: (t) => `${integersSigned(t)} °C`, zero: "0 °C", below: "below freezing" },
  lift: {
    label: "A lift",
    scale: 1,
    format: (f) => (f === 0 ? "ground floor" : f > 0 ? `floor ${f}` : `basement ${-f}`),
    zero: "ground",
    below: "basements",
  },
  bank: { label: "Bank balance", scale: 100, format: (r) => (r < 0 ? `owes ₹${-r}` : `₹${r}`), zero: "₹0", below: "money owed" },
  sea: { label: "Height above sea level", scale: 10, format: (h) => `${integersSigned(h)} m`, zero: "sea level", below: "under water" },
};

export type IntegersParams = {
  /** 1 to add the move, −1 to subtract it (also used between the two fractions). */
  sign: number;
  /** The number added or subtracted. */
  move: number;
  scene: IntegersSceneId;
  /** times × jump: how many hops, and how big each one is. */
  times: number;
  jump: number;
  /** Bottom numbers of the two rationals (0 is allowed, and flagged). */
  q: number;
  q2: number;
  /** How many times finer the common pieces are cut, between the two rationals. */
  zoom: number;
};

export interface IntegersState {
  /** Where the frog starts. */
  readonly start: number;
  /** Top numbers of the two rationals. */
  readonly p: number;
  readonly p2: number;
  /** Hops made so far, while playing (fractional mid-hop). */
  readonly hop: number;
}

export type IntegersResults = {
  start: number;
  move: number;
  sign: number;
  /** What is really added: the move, or its opposite when subtracting. */
  added: number;
  opposite: number;
  result: number;
  hops: number;
  /** 1 right, −1 left, 0 no move. */
  direction: number;
  position: number;
  landed: number;
  /** −1, 0 or 1. */
  resultSign: number;
  scene: number;
  scale: number;
  startAmount: number;
  changeAmount: number;
  amount: number;
  below: number;
  times: number;
  jump: number;
  product: number;
  /** How many of the two factors are negative: each one turns the frog round. */
  turns: number;
  productSign: number;
  timesPosition: number;
  timesLanded: number;
  p: number;
  q: number;
  valid: number;
  value: number;
  stdN: number;
  stdD: number;
  isInteger: number;
  ratSign: number;
  p2: number;
  q2: number;
  valid2: number;
  value2: number;
  std2N: number;
  std2D: number;
  /** −1, 0 or 1 as p/q is smaller than, equal to or bigger than p2/q2 (0 if either is undefined). */
  compare: number;
  same: number;
  zoom: number;
  /** The common bottom number of the zoomed gap, and both rationals over it. */
  commonD: number;
  aOver: number;
  bOver: number;
  between: number;
  midN: number;
  midD: number;
  midValue: number;
  /** Adding fractions: the least common bottom number and both tops over it. */
  lcd: number;
  aScaled: number;
  bScaled: number;
  bSigned: number;
  sumOver: number;
  sumN: number;
  sumD: number;
  sumValue: number;
};

export const INTEGERS_RANGE = 10;
export const INTEGERS_TIMES_RANGE = 5;
export const INTEGERS_P_RANGE = 12;
export const INTEGERS_MAX_ZOOM = 10;
/** Hops per second when playing, and the pause (in hops) on landing before it starts again. */
export const INTEGERS_HOP_RATE = 1.5;
export const INTEGERS_HOP_PAUSE = 1;

export function integersGcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y) [x, y] = [y, x % y];
  return x;
}

export function integersLcm(a: number, b: number): number {
  const g = integersGcd(a, b);
  return g === 0 ? 0 : Math.abs(Math.round(a) * Math.round(b)) / g;
}

/** p/q in lowest terms with a positive bottom; [0, 1] when q is 0 or p is 0. */
export function integersStandard(p: number, q: number): [number, number] {
  if (q === 0 || p === 0) return [0, 1];
  const g = integersGcd(p, q);
  const s = Math.sign(q);
  return [(s * p) / g || 0, Math.abs(q) / g];
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const whole = (v: unknown, lo: number, hi: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? clamp(Math.round(v), lo, hi) || 0 : fallback;
const z = (v: number) => v || 0;

const sceneOf = (params: IntegersParams) => (INTEGERS_SCENE_ORDER.includes(params.scene) ? params.scene : "temperature");

function readParams(params: IntegersParams) {
  return {
    sign: params.sign === -1 ? -1 : 1,
    move: whole(params.move, -INTEGERS_RANGE, INTEGERS_RANGE, 0),
    times: whole(params.times, -INTEGERS_TIMES_RANGE, INTEGERS_TIMES_RANGE, 0),
    jump: whole(params.jump, -INTEGERS_TIMES_RANGE, INTEGERS_TIMES_RANGE, 0),
    q: whole(params.q, -INTEGERS_P_RANGE, INTEGERS_P_RANGE, 1),
    q2: whole(params.q2, -INTEGERS_P_RANGE, INTEGERS_P_RANGE, 1),
    zoom: whole(params.zoom, 1, INTEGERS_MAX_ZOOM, 1),
  };
}

/** The longest walk either line needs, so play can loop. */
function longestWalk(params: IntegersParams): number {
  const { sign, move, times } = readParams(params);
  return Math.max(Math.abs(sign * move), Math.abs(times));
}

const OUTPUTS = [
  "start", "move", "sign", "added", "opposite", "result", "hops", "direction", "position", "landed", "resultSign",
  "scene", "scale", "startAmount", "changeAmount", "amount", "below",
  "times", "jump", "product", "turns", "productSign", "timesPosition", "timesLanded",
  "p", "q", "valid", "value", "stdN", "stdD", "isInteger", "ratSign", "p2", "q2", "valid2", "value2", "std2N", "std2D", "compare", "same",
  "zoom", "commonD", "aOver", "bOver", "between", "midN", "midD", "midValue",
  "lcd", "aScaled", "bScaled", "bSigned", "sumOver", "sumN", "sumD", "sumValue",
] as const satisfies readonly (keyof IntegersResults)[];

export const integersModel: SimulationModel<IntegersState, IntegersParams, IntegersResults> = {
  id: "integers",
  defaultParams: { sign: 1, move: -5, scene: "temperature", times: 3, jump: -2, q: 4, q2: 2, zoom: 1 },
  outputs: OUTPUTS,
  stateVariables: ["start", "p", "p2", "hop"],

  initialize() {
    return { start: 3, p: 3, p2: 1, hop: 0 };
  },

  /** Play hops the frog along, pauses on landing, and starts again. */
  advance(state, dt, params) {
    const total = longestWalk(params);
    if (state.hop >= total + INTEGERS_HOP_PAUSE) return { ...state, hop: 0 };
    return { ...state, hop: Math.min(total + INTEGERS_HOP_PAUSE, Math.max(0, state.hop) + INTEGERS_HOP_RATE * dt) };
  },

  /** One whole hop at a time. */
  step(state, params, sign) {
    const total = longestWalk(params);
    return { ...state, hop: clamp(Math.round(state.hop) + sign, 0, total) };
  },

  derive(state, params) {
    const { sign, move, times, jump, q, q2, zoom } = readParams(params);

    // Hops: start + (±move).
    const start = whole(state.start, -INTEGERS_RANGE, INTEGERS_RANGE, 0);
    const hop = Math.max(0, Number.isFinite(state.hop) ? state.hop : 0);
    const added = z(sign * move);
    const result = start + added;
    const hops = Math.abs(added);
    const direction = Math.sign(added);
    const position = z(start + direction * Math.min(hop, hops));

    // Life: the same sum, scaled to a real amount.
    const sceneId = sceneOf(params);
    const scene = INTEGERS_SCENES[sceneId];

    // Times: `times` hops of `jump`, from 0.
    const product = z(times * jump);
    const timesPosition = z(Math.sign(times) * jump * Math.min(hop, Math.abs(times)));

    // Rationals, kept as whole-number pairs.
    const p = whole(state.p, -INTEGERS_P_RANGE, INTEGERS_P_RANGE, 0);
    const p2 = whole(state.p2, -INTEGERS_P_RANGE, INTEGERS_P_RANGE, 0);
    const valid = q !== 0 ? 1 : 0;
    const valid2 = q2 !== 0 ? 1 : 0;
    const both = valid && valid2;
    const [stdN, stdD] = integersStandard(p, q);
    const [std2N, std2D] = integersStandard(p2, q2);
    // The sign moved to the top, but not cancelled down: 2/4 + 1/3 is worked with quarters and thirds.
    const aN = valid ? z(Math.sign(q) * p) : 0;
    const aD = valid ? Math.abs(q) : 1;
    const bN = valid2 ? z(Math.sign(q2) * p2) : 0;
    const bD = valid2 ? Math.abs(q2) : 1;

    const lcd = both ? integersLcm(aD, bD) : 1;
    const aScaled = both ? z((aN * lcd) / aD) : 0;
    const bScaled = both ? z((bN * lcd) / bD) : 0;
    const bSigned = z(sign * bScaled);
    const sumOver = z(aScaled + bSigned);
    const [sumN, sumD] = both ? integersStandard(sumOver, lcd) : [0, 1];

    const commonD = lcd * zoom;
    const aOver = z(aScaled * zoom);
    const bOver = z(bScaled * zoom);
    const [midN, midD] = both ? integersStandard(aN * bD + bN * aD, 2 * aD * bD) : [0, 1];

    return {
      start,
      move,
      sign,
      added,
      opposite: z(-move),
      result,
      hops,
      direction,
      position,
      landed: hop >= hops ? 1 : 0,
      resultSign: Math.sign(result),
      scene: INTEGERS_SCENE_ORDER.indexOf(sceneId),
      scale: scene.scale,
      startAmount: z(start * scene.scale),
      changeAmount: z(added * scene.scale),
      amount: z(result * scene.scale),
      below: result < 0 ? 1 : 0,
      times,
      jump,
      product,
      turns: (times < 0 ? 1 : 0) + (jump < 0 ? 1 : 0),
      productSign: Math.sign(product),
      timesPosition,
      timesLanded: hop >= Math.abs(times) ? 1 : 0,
      p,
      q,
      valid,
      value: valid ? z(p / q) : 0,
      stdN,
      stdD,
      isInteger: valid && stdD === 1 ? 1 : 0,
      ratSign: valid ? Math.sign(stdN) : 0,
      p2,
      q2,
      valid2,
      value2: valid2 ? z(p2 / q2) : 0,
      std2N,
      std2D,
      // Exactly, by cross-multiplying whole numbers over positive bottoms.
      compare: both ? Math.sign(aN * bD - bN * aD) : 0,
      same: both && stdN === std2N && stdD === std2D ? 1 : 0,
      zoom,
      commonD,
      aOver,
      bOver,
      between: both ? Math.max(0, Math.abs(aOver - bOver) - 1) : 0,
      midN,
      midD,
      midValue: z(midN / midD),
      lcd,
      aScaled,
      bScaled,
      bSigned,
      sumOver,
      sumN,
      sumD,
      sumValue: z(sumN / sumD),
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof IntegersState] : undefined;
  },

  setVariable(state, id, value) {
    if (!Number.isFinite(value)) return state;
    switch (id) {
      case "start": return { ...state, start: clamp(Math.round(value), -INTEGERS_RANGE, INTEGERS_RANGE) || 0 };
      case "p": return { ...state, p: clamp(Math.round(value), -INTEGERS_P_RANGE, INTEGERS_P_RANGE) || 0 };
      case "p2": return { ...state, p2: clamp(Math.round(value), -INTEGERS_P_RANGE, INTEGERS_P_RANGE) || 0 };
      case "hop": return { ...state, hop: clamp(value, 0, 2 * INTEGERS_RANGE + INTEGERS_HOP_PAUSE) };
      default: return state;
    }
  },
};
