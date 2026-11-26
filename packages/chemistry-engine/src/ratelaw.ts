import type { SimulationModel } from "@ise/science-engine";
import { GAS_CONSTANT } from "./kinetics";

/**
 * Rate laws for A → products, and why only some collisions react.
 *
 * The rate law says how the rate depends on concentration: rate = k[A]ⁿ.
 * The order n is found by experiment — double [A] and see whether the rate
 * stays put (zero order), doubles (first) or quadruples (second). Each order
 * has its own integrated law, its own straight-line plot and its own
 * half-life:
 *
 *   n = 0   [A] = [A]₀ − kt          [A] against t      t½ = [A]₀ / 2k
 *   n = 1   [A] = [A]₀ e^(−kt)       ln[A] against t    t½ = ln 2 / k
 *   n = 2   1/[A] = 1/[A]₀ + kt      1/[A] against t    t½ = 1 / (k[A]₀)
 *
 * Collision theory says where k comes from: molecules must collide, with at
 * least the activation energy, and the right way round. The fraction of
 * collisions with enough energy is e^(−Eₐ/RT); the orientation (steric)
 * factor P cuts it down further. The energy distribution drawn beside it is
 * the Maxwell–Boltzmann curve, as textbooks draw it — the number reported is
 * the Arrhenius factor, not the exact area of that curve's tail.
 *
 * Time is in minutes; play runs five minutes of reaction a second.
 */

export type RateOrderId = "zero" | "first" | "second";
export const RATE_ORDER_IDS: readonly RateOrderId[] = ["zero", "first", "second"];

export type RatePlotId = "concentration" | "log" | "inverse";
export const RATE_PLOT_IDS: readonly RatePlotId[] = ["concentration", "log", "inverse"];

export type RateLawParams = { order: RateOrderId; plot: RatePlotId };

export interface RateLawState {
  /** Starting concentration, mol/L. */
  readonly a0: number;
  /** Rate constant, in mol/L and minutes; its unit depends on the order. */
  readonly k: number;
  /** Minutes since the start. */
  readonly t: number;
  /** Temperature, K. */
  readonly T: number;
  /** Activation energy, kJ/mol. */
  readonly Ea: number;
  /** Orientation (steric) factor, 0–1. */
  readonly steric: number;
}

export type RateLawResults = {
  order: number;
  plot: number;
  a0: number;
  k: number;
  t: number;
  concentration: number;
  product: number;
  /** The rate now, and at the start, mol L⁻¹ min⁻¹. */
  rate: number;
  initialRate: number;
  /** What doubling [A] does to the rate: 1, 2 or 4. */
  doubleFactor: number;
  /** The first half-life, min. */
  halfLife: number;
  fractionLeft: number;
  percentReacted: number;
  lnConcentration: number;
  inverseConcentration: number;
  /** The y-value on the chosen plot, whether that plot is a straight line for this order, and the slope of the one that is. */
  plotY: number;
  straight: number;
  slope: number;
  /** 1 once a zero-order reaction has used up all its A. */
  finished: number;
  T: number;
  Ea: number;
  steric: number;
  eaOverRT: number;
  /** e^(−Eₐ/RT), as a fraction, as a power of ten, and as collisions per thousand. */
  energyFraction: number;
  log10Fraction: number;
  perThousand: number;
  /** With the orientation factor too. */
  effectivePerThousand: number;
};

/** A run lasts this many minutes. */
export const RATE_LAW_RUN = 60;
/** Minutes of reaction per second of play. */
export const RATE_LAW_LAPSE = 5;
/** ln and 1/x are drawn no lower than this concentration. */
const FLOOR = 1e-4;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const orderOf = (id: RateOrderId) => Math.max(0, RATE_ORDER_IDS.indexOf(id));

/** [A] after t minutes for an order-n reaction, mol/L. */
export function orderConcentration(order: number, a0: number, k: number, t: number): number {
  const time = Math.max(0, t);
  if (order === 0) return Math.max(0, a0 - k * time);
  if (order === 1) return a0 * Math.exp(-k * time);
  return a0 / (1 + a0 * k * time);
}

/** The times at which [A] has fallen to a half, a quarter, an eighth… of [A]₀. */
export function halvingTimes(order: number, a0: number, k: number, count = 3): number[] {
  return Array.from({ length: count }, (_, j) => {
    const i = j + 1;
    if (order === 0) return (a0 * (1 - 2 ** -i)) / k;
    if (order === 1) return (i * Math.LN2) / k;
    return (2 ** i - 1) / (k * a0);
  });
}

/** What a plot shows for a concentration: [A], ln[A] or 1/[A]. */
export function ratePlotValue(plot: RatePlotId, concentration: number): number {
  if (plot === "concentration") return concentration;
  const c = Math.max(FLOOR, concentration);
  return plot === "log" ? Math.log(c) : 1 / c;
}

/** The Maxwell–Boltzmann density of molecular energies at T, per kJ/mol. */
export function boltzmannDensity(energy: number, T: number): number {
  const rt = (GAS_CONSTANT * T) / 1000;
  if (energy <= 0) return 0;
  return (2 / Math.sqrt(Math.PI)) * rt ** -1.5 * Math.sqrt(energy) * Math.exp(-energy / rt);
}

const OUTPUTS = [
  "order", "plot", "a0", "k", "t", "concentration", "product", "rate", "initialRate", "doubleFactor", "halfLife",
  "fractionLeft", "percentReacted", "lnConcentration", "inverseConcentration", "plotY", "straight", "slope", "finished",
  "T", "Ea", "steric", "eaOverRT", "energyFraction", "log10Fraction", "perThousand", "effectivePerThousand",
] as const satisfies readonly (keyof RateLawResults)[];

export const rateLawModel: SimulationModel<RateLawState, RateLawParams, RateLawResults> = {
  id: "ratelaw",
  defaultParams: { order: "first", plot: "concentration" },
  outputs: OUTPUTS,
  stateVariables: ["a0", "k", "t", "T", "Ea", "steric"],

  initialize() {
    return { a0: 1, k: 0.05, t: 0, T: 300, Ea: 10, steric: 1 };
  },

  advance(state, dt) {
    return { ...state, t: Math.min(RATE_LAW_RUN, state.t + dt * RATE_LAW_LAPSE) };
  },

  step(state, _params, sign) {
    return { ...state, t: clamp(Math.round(state.t / 5) * 5 + 5 * sign, 0, RATE_LAW_RUN) };
  },

  derive(state, params) {
    const order = orderOf(params.order);
    const plot = RATE_PLOT_IDS.includes(params.plot) ? params.plot : "concentration";
    const a0 = clamp(state.a0, 0.1, 2);
    const k = clamp(state.k, 0.01, 0.2);
    const t = clamp(state.t, 0, RATE_LAW_RUN);
    const concentration = orderConcentration(order, a0, k, t);
    const fractionLeft = concentration / a0;
    const T = clamp(state.T, 250, 1200);
    const Ea = clamp(state.Ea, 2, 40);
    const steric = clamp(state.steric, 0.05, 1);
    const eaOverRT = (Ea * 1000) / (GAS_CONSTANT * T);
    const energyFraction = Math.exp(-eaOverRT);
    return {
      order,
      plot: RATE_PLOT_IDS.indexOf(plot),
      a0,
      k,
      t,
      concentration,
      product: a0 - concentration,
      rate: order === 0 ? (concentration > 0 ? k : 0) : k * concentration ** order,
      initialRate: k * a0 ** order,
      doubleFactor: 2 ** order,
      halfLife: halvingTimes(order, a0, k, 1)[0] ?? 0,
      fractionLeft,
      percentReacted: (1 - fractionLeft) * 100,
      lnConcentration: ratePlotValue("log", concentration),
      inverseConcentration: ratePlotValue("inverse", concentration),
      plotY: ratePlotValue(plot, concentration),
      straight: RATE_PLOT_IDS.indexOf(plot) === order ? 1 : 0,
      slope: order === 2 ? k : -k,
      finished: concentration <= 0 ? 1 : 0,
      T,
      Ea,
      steric,
      eaOverRT,
      energyFraction,
      log10Fraction: -eaOverRT / Math.LN10,
      perThousand: energyFraction * 1000,
      effectivePerThousand: energyFraction * steric * 1000,
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof RateLawState] : undefined;
  },

  setVariable(state, id, value) {
    switch (id) {
      case "a0": return { ...state, a0: clamp(value, 0.1, 2) };
      case "k": return { ...state, k: clamp(value, 0.01, 0.2) };
      case "t": return { ...state, t: clamp(value, 0, RATE_LAW_RUN) };
      case "T": return { ...state, T: clamp(value, 250, 1200) };
      case "Ea": return { ...state, Ea: clamp(value, 2, 40) };
      case "steric": return { ...state, steric: clamp(value, 0.05, 1) };
      default: return state;
    }
  },
};
