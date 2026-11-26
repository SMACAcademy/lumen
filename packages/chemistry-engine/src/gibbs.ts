import type { SimulationModel } from "@ise/science-engine";
import { snapZero } from "@ise/units";

/**
 * Will it go? ΔG = ΔH − TΔS, and a reaction runs by itself when ΔG < 0.
 *
 * Against temperature, ΔG is a straight line: it starts at ΔH and slopes
 * down by ΔS for every kelvin. The signs of ΔH and ΔS decide everything —
 * whether the reaction always goes, never goes, or goes only above or below
 * a crossover temperature, T = ΔH/ΔS — and ΔG° = −RT ln K turns the answer
 * into how far it goes.
 */

export type GibbsParams = {
  /** Enthalpy change, kJ/mol. */
  dH: number;
  /** Entropy change, J/(mol K). */
  dS: number;
};

export interface GibbsState {
  /** Temperature, K. */
  readonly T: number;
}

/** The four combinations of signs, as numbers so a goal can name one. */
export const QUADRANT = {
  /** ΔH < 0, ΔS > 0: spontaneous at every temperature. */
  always: 0,
  /** ΔH > 0, ΔS < 0: never spontaneous. */
  never: 1,
  /** ΔH < 0, ΔS < 0: spontaneous below the crossover. */
  lowT: 2,
  /** ΔH > 0, ΔS > 0: spontaneous above the crossover. */
  highT: 3,
} as const;

export const T_LIMITS: readonly [number, number] = [100, 2000];
/** How fast play warms, K per second. */
export const WARM_RATE = 100;
const R = 8.314;

export type GibbsResults = {
  T: number;
  celsius: number;
  dH: number;
  dS: number;
  /** TΔS, in kJ/mol — the entropy term, on the same footing as ΔH. */
  TdS: number;
  dG: number;
  spontaneous: number;
  quadrant: number;
  /** ΔH/ΔS, in K, where ΔG changes sign; −1 when it never does. */
  crossoverT: number;
  /** K = e^(−ΔG°/RT), and log₁₀ K. */
  K: number;
  log10K: number;
};

export function quadrantOf(dH: number, dS: number): number {
  if (dH <= 0 && dS >= 0) return QUADRANT.always;
  if (dH >= 0 && dS <= 0) return QUADRANT.never;
  return dH < 0 ? QUADRANT.lowT : QUADRANT.highT;
}

/** The temperature at which ΔG = 0, in K, or −1 when the signs of ΔH and ΔS never allow it. */
export function crossover(dH: number, dS: number): number {
  const q = quadrantOf(dH, dS);
  if (q === QUADRANT.always || q === QUADRANT.never || dS === 0) return -1;
  return (dH * 1000) / dS;
}

const clampT = (T: number) => Math.min(T_LIMITS[1], Math.max(T_LIMITS[0], T));

const OUTPUTS = ["T", "celsius", "dH", "dS", "TdS", "dG", "spontaneous", "quadrant", "crossoverT", "K", "log10K"] as const satisfies readonly (keyof GibbsResults)[];

export const gibbsModel: SimulationModel<GibbsState, GibbsParams, GibbsResults> = {
  id: "gibbs",
  defaultParams: { dH: 6.01, dS: 22 },
  outputs: OUTPUTS,
  stateVariables: ["T"],

  initialize() {
    return { T: 250 };
  },

  /** Play warms the reaction steadily. */
  advance(state, dt) {
    return { T: clampT(state.T + WARM_RATE * dt) };
  },

  /** A step is ten kelvin. */
  step(state, _params, sign) {
    return { T: clampT(Math.round(state.T / 10) * 10 + sign * 10) };
  },

  derive(state, params) {
    const T = clampT(state.T);
    const TdS = (T * params.dS) / 1000;
    const dG = params.dH - TdS;
    const log10K = (-dG * 1000) / (R * T) / Math.LN10;
    return {
      T,
      celsius: snapZero(T - 273.15),
      dH: params.dH,
      dS: params.dS,
      TdS,
      dG: snapZero(dG, 1e-9),
      spontaneous: dG < 0 ? 1 : 0,
      quadrant: quadrantOf(params.dH, params.dS),
      crossoverT: crossover(params.dH, params.dS),
      K: 10 ** Math.min(300, Math.max(-300, log10K)),
      log10K,
    };
  },

  getVariable(state, id) {
    return id === "T" ? state.T : undefined;
  },

  setVariable(state, id, value) {
    return id === "T" ? { T: clampT(value) } : state;
  },
};
