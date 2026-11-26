import { cosOf, sinOf } from "./unit-circle";

/**
 * Function families used by the calculus labs. Each carries its exact
 * derivative, so a numerical secant slope can be compared with the true
 * tangent slope, and a sensible viewing window.
 */
export interface FunctionFamily {
  id: string;
  /** Right-hand side as shown to learners, e.g. "x²". */
  label: string;
  f(x: number): number;
  /** Exact derivative f′(x). */
  df(x: number): number;
  view: { x: readonly [number, number]; y: readonly [number, number] };
}

const LN2 = Math.log(2);

export const functionFamilies: Readonly<Record<string, FunctionFamily>> = {
  quadratic: {
    id: "quadratic",
    label: "x²",
    f: (x) => x * x,
    df: (x) => 2 * x,
    view: { x: [-3, 3], y: [-2, 9] },
  },
  cubic: {
    id: "cubic",
    label: "x³/3 − x",
    f: (x) => (x * x * x) / 3 - x,
    df: (x) => x * x - 1,
    view: { x: [-3, 3], y: [-6.5, 6.5] },
  },
  sine: {
    id: "sine",
    label: "2 sin x",
    f: (x) => 2 * sinOf(x),
    df: (x) => 2 * cosOf(x),
    view: { x: [-3.5, 3.5], y: [-3, 3] },
  },
  exponential: {
    id: "exponential",
    label: "2ˣ",
    f: (x) => 2 ** x,
    df: (x) => LN2 * 2 ** x,
    view: { x: [-3, 3], y: [-1, 9] },
  },
};

export function familyOf(id: unknown): FunctionFamily {
  return (typeof id === "string" && functionFamilies[id]) || functionFamilies.quadratic!;
}
