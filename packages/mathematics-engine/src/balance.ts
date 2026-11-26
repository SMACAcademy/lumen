import type { SimulationModel } from "@ise/science-engine";

/**
 * An equation is a balance.
 *
 * The left pan holds a boxes of an unknown weight x and b unit weights; the
 * right pan holds c boxes and d units: a·x + b = c·x + d. Guess x and the
 * scale tips until the guess is right. Or solve it the algebra way: take the
 * same from both pans — units, or whole boxes — and the scale never moves,
 * until one box sits alone against its weight in units.
 */

export type BalanceParams = {
  /** Boxes on the left. */
  a: number;
  /** Units on the left. */
  b: number;
  /** Boxes on the right. */
  c: number;
  /** Units on the right. */
  d: number;
};

export interface BalanceState {
  /** The guessed weight of one box. */
  readonly x: number;
  /** Units taken off both pans. */
  readonly take: number;
  /** Boxes taken off both pans. */
  readonly takeX: number;
}

export type BalanceResults = {
  a: number;
  b: number;
  c: number;
  d: number;
  x: number;
  take: number;
  takeX: number;
  leftBoxes: number;
  leftUnits: number;
  rightBoxes: number;
  rightUnits: number;
  leftWeight: number;
  rightWeight: number;
  /** 1 when the left pan is heavier, −1 when the right is, 0 when level. */
  tilt: number;
  balanced: number;
  /** The weight of a box that balances the scale; −1 when no single weight does. */
  solution: number;
  /** 1 when boxes sit alone on one pan and units alone on the other. */
  isolated: number;
  /** When isolated: the units each box must weigh; −1 otherwise. */
  perBox: number;
};

export const MAX_BOXES = 5;
export const MAX_UNITS = 20;
export const MAX_GUESS = 20;

const whole = (value: number, max: number) => Math.min(max, Math.max(0, Math.round(value)));

/** One pan written as an expression: "2x + 3", "x", "11", or "0". */
export function sideText(boxes: number, units: number): string {
  const x = boxes === 0 ? "" : boxes === 1 ? "x" : `${boxes}x`;
  if (x && units) return `${x} + ${units}`;
  return x || String(units);
}

const OUTPUTS = [
  "a",
  "b",
  "c",
  "d",
  "x",
  "take",
  "takeX",
  "leftBoxes",
  "leftUnits",
  "rightBoxes",
  "rightUnits",
  "leftWeight",
  "rightWeight",
  "tilt",
  "balanced",
  "solution",
  "isolated",
  "perBox",
] as const satisfies readonly (keyof BalanceResults)[];

function pans(params: BalanceParams) {
  return {
    a: whole(params.a, MAX_BOXES),
    b: whole(params.b, MAX_UNITS),
    c: whole(params.c, MAX_BOXES),
    d: whole(params.d, MAX_UNITS),
  };
}

export const balanceModel: SimulationModel<BalanceState, BalanceParams, BalanceResults> = {
  id: "balance",
  defaultParams: { a: 2, b: 3, c: 0, d: 11 },
  outputs: OUTPUTS,
  stateVariables: ["x", "take", "takeX"],

  initialize() {
    return { x: 1, take: 0, takeX: 0 };
  },

  /** Play tries bigger and bigger guesses, one a second. */
  advance(state, dt) {
    return { ...state, x: Math.min(MAX_GUESS, state.x + dt) };
  },

  /** A step tries the next whole-number guess. */
  step(state, _params, sign) {
    return { ...state, x: whole(state.x + sign, MAX_GUESS) };
  },

  derive(state, params) {
    const { a, b, c, d } = pans(params);
    const x = Math.min(MAX_GUESS, Math.max(0, state.x));
    const take = whole(state.take, Math.min(b, d));
    const takeX = whole(state.takeX, Math.min(a, c));
    const leftBoxes = a - takeX;
    const leftUnits = b - take;
    const rightBoxes = c - takeX;
    const rightUnits = d - take;
    const leftWeight = leftBoxes * x + leftUnits;
    const rightWeight = rightBoxes * x + rightUnits;
    const diff = leftWeight - rightWeight;
    const balanced = Math.abs(diff) < 1e-9;
    const solution = a === c ? -1 : (d - b) / (a - c);
    const leftAlone = leftBoxes > 0 && leftUnits === 0 && rightBoxes === 0;
    const rightAlone = rightBoxes > 0 && rightUnits === 0 && leftBoxes === 0;
    const isolated = leftAlone || rightAlone;
    return {
      a,
      b,
      c,
      d,
      x,
      take,
      takeX,
      leftBoxes,
      leftUnits,
      rightBoxes,
      rightUnits,
      leftWeight,
      rightWeight,
      tilt: balanced ? 0 : Math.sign(diff),
      balanced: balanced ? 1 : 0,
      solution: solution >= 0 ? solution : -1,
      isolated: isolated ? 1 : 0,
      perBox: leftAlone ? rightUnits / leftBoxes : rightAlone ? leftUnits / rightBoxes : -1,
    };
  },

  getVariable(state, id) {
    return id === "x" ? state.x : id === "take" ? state.take : id === "takeX" ? state.takeX : undefined;
  },

  setVariable(state, id, value, params) {
    const { a, b, c, d } = pans(params);
    if (id === "x") return { ...state, x: Math.min(MAX_GUESS, Math.max(0, value)) };
    if (id === "take") return { ...state, take: whole(value, Math.min(b, d)) };
    if (id === "takeX") return { ...state, takeX: whole(value, Math.min(a, c)) };
    return state;
  },
};
