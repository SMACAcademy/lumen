import type { SimulationModel } from "@ise/science-engine";
import { snapZero } from "@ise/units";

/**
 * A first-order reaction, A → B, and what temperature does to it.
 *
 *   [A] = [A]₀ · e^(−kt)          the integrated rate law
 *   t½  = ln 2 / k                 the half-life, whatever [A]₀ is
 *   k   = k₂₉₈ · e^(−(Eₐ/R)(1/T − 1/298))   Arrhenius, anchored at 298 K
 *
 * The chapter's two surprises both fall out of these: starting with twice as
 * much does not change the half-life at all, and ten degrees can double the
 * rate. Time is in minutes, and play runs as a time-lapse — one second of
 * playing is one minute of reaction.
 */

export type KineticsParams = {
  /** Starting concentration of A, in mol/L. */
  a0: number;
  /** The rate constant at 298 K, in min⁻¹. */
  kRef: number;
  /** Activation energy, in kJ/mol. */
  Ea: number;
  /** Temperature, in kelvin. */
  T: number;
};

export interface KineticsState {
  /** Minutes since the reaction started. */
  readonly t: number;
}

export type KineticsResults = {
  t: number;
  a0: number;
  /** Concentrations of the reactant and the product now, in mol/L. */
  concentration: number;
  product: number;
  /** What is left of A, as a fraction and as a percentage reacted. */
  fractionLeft: number;
  percentReacted: number;
  /** The rate now, −d[A]/dt = k[A], and at the very start, in mol L⁻¹ min⁻¹. */
  rate: number;
  initialRate: number;
  /** The rate constant at this temperature, in min⁻¹, and the half-life, in minutes. */
  k: number;
  halfLife: number;
  /** How many half-lives have gone by. */
  halfLives: number;
  /** ln[A] and ln([A]₀/[A]) — the second is kt, a straight line through the origin. */
  lnConcentration: number;
  lnRatio: number;
  /** Time to use up 90 % and 99 % of A, in minutes. */
  t90: number;
  t99: number;
  T: number;
  celsius: number;
  Ea: number;
  kRef: number;
  /** How many times faster the reaction goes 10 K hotter than now. */
  tenDegreeFactor: number;
  /** The fraction of collisions with at least Eₐ, e^(−Eₐ/RT), as a power of ten. */
  log10Boltzmann: number;
  /** How long the run lasts: eight half-lives, capped at two hours. */
  runEnd: number;
};

export const GAS_CONSTANT = 8.314; // J mol⁻¹ K⁻¹
export const REFERENCE_T = 298;
/** A run never outlasts this many minutes, however slow the reaction. */
export const MAX_RUN = 120;
/** Minutes of reaction per second of play. */
export const TIME_LAPSE = 1;

/** The rate constant at temperature T, in min⁻¹. */
export function rateConstant(params: Pick<KineticsParams, "kRef" | "Ea" | "T">, T = params.T): number {
  const exponent = -((params.Ea * 1000) / GAS_CONSTANT) * (1 / T - 1 / REFERENCE_T);
  return params.kRef * Math.exp(exponent);
}

export function runEnd(params: KineticsParams): number {
  return Math.min(MAX_RUN, (8 * Math.LN2) / Math.max(1e-9, rateConstant(params)));
}

/** Concentration of A after t minutes, in mol/L. */
export function concentrationAt(params: KineticsParams, t: number): number {
  return params.a0 * Math.exp(-rateConstant(params) * Math.max(0, t));
}

const OUTPUTS = [
  "t",
  "a0",
  "concentration",
  "product",
  "fractionLeft",
  "percentReacted",
  "rate",
  "initialRate",
  "k",
  "halfLife",
  "halfLives",
  "lnConcentration",
  "lnRatio",
  "t90",
  "t99",
  "T",
  "celsius",
  "Ea",
  "kRef",
  "tenDegreeFactor",
  "log10Boltzmann",
  "runEnd",
] as const satisfies readonly (keyof KineticsResults)[];

export const kineticsModel: SimulationModel<KineticsState, KineticsParams, KineticsResults> = {
  id: "kinetics",
  defaultParams: { a0: 1, kRef: 0.1, Ea: 53, T: 298 },
  outputs: OUTPUTS,
  stateVariables: ["t"],

  initialize() {
    return { t: 0 };
  },

  /** Time-lapse: the reaction runs until it is all but over, then stops. */
  advance(state, dt, params) {
    return { t: Math.min(runEnd(params), state.t + dt * TIME_LAPSE) };
  },

  /** A step is one half-life, so stepping shows the halving directly. */
  step(state, params, sign) {
    const half = Math.LN2 / rateConstant(params);
    const snapped = Math.round(state.t / half) * half;
    return { t: Math.max(0, Math.min(runEnd(params), snapped + sign * half)) };
  },

  derive(state, params) {
    const k = rateConstant(params);
    const end = runEnd(params);
    const t = Math.max(0, Math.min(end, state.t));
    const concentration = concentrationAt(params, t);
    const fractionLeft = concentration / Math.max(1e-12, params.a0);
    const halfLife = Math.LN2 / k;
    return {
      t,
      a0: params.a0,
      concentration,
      product: snapZero(params.a0 - concentration),
      fractionLeft,
      percentReacted: snapZero((1 - fractionLeft) * 100),
      rate: k * concentration,
      initialRate: k * params.a0,
      k,
      halfLife,
      halfLives: t / halfLife,
      lnConcentration: Math.log(Math.max(1e-12, concentration)),
      lnRatio: snapZero(k * t),
      t90: Math.LN10 / k,
      t99: (2 * Math.LN10) / k,
      T: params.T,
      celsius: snapZero(params.T - 273.15),
      Ea: params.Ea,
      kRef: params.kRef,
      tenDegreeFactor: rateConstant(params, params.T + 10) / k,
      log10Boltzmann: -((params.Ea * 1000) / (GAS_CONSTANT * params.T)) / Math.LN10,
      runEnd: end,
    };
  },

  getVariable(state, id) {
    return id === "t" ? state.t : undefined;
  },

  setVariable(state, id, value, params) {
    return id === "t" ? { t: Math.max(0, Math.min(runEnd(params), value)) } : state;
  },
};
