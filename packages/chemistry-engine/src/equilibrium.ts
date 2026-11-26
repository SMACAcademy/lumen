import type { SimulationModel } from "@ise/science-engine";
import { snapZero } from "@ise/units";

/**
 * A gas-phase reaction settling into equilibrium, aA + bB ⇌ cC, in a
 * cylinder whose volume and temperature the learner controls.
 *
 * The one rule is Q → K. The model works out where the equilibrium lies for
 * the amounts and conditions right now — by solving Q(x) = K for the extent
 * x — and lets the mixture relax towards it. Le Chatelier's principle is not
 * coded anywhere: squeeze the cylinder and the concentrations jump, Q moves
 * away from K, and the mixture shifts back. Warm it and K itself moves, by
 * van 't Hoff. That is the whole chapter, falling out of one equation.
 */

export type ReactionId = "n2o4" | "hi" | "haber";

export interface EquilibriumReaction {
  id: ReactionId;
  label: string;
  /** Species A, B (null when there is only one reactant) and C. */
  species: readonly [string, string | null, string];
  /** Stoichiometric coefficients a, b, c. */
  nu: readonly [number, number, number];
  /** Kc at the reference temperature, in (mol/L)^Δn. */
  Kref: number;
  Tref: number;
  /** Enthalpy change of the forward reaction, kJ/mol. */
  deltaH: number;
  /** Amounts it starts from, in mol. */
  start: readonly [number, number, number];
  /** Which species (0, 1, 2) is coloured, and its colour name — or −1 when all are colourless. */
  coloured: number;
  note: string;
}

export const REACTIONS: Record<ReactionId, EquilibriumReaction> = {
  n2o4: {
    id: "n2o4",
    label: "N₂O₄ ⇌ 2NO₂",
    species: ["N₂O₄", null, "NO₂"],
    nu: [1, 0, 2],
    Kref: 4.6e-3,
    Tref: 298,
    deltaH: 57.2,
    start: [0.1, 0, 0],
    coloured: 2,
    note: "Colourless N₂O₄ splits into brown NO₂. Endothermic, and one molecule becomes two.",
  },
  hi: {
    id: "hi",
    label: "H₂ + I₂ ⇌ 2HI",
    species: ["H₂", "I₂", "HI"],
    nu: [1, 1, 2],
    Kref: 54,
    Tref: 700,
    deltaH: -9.5,
    start: [0.1, 0.1, 0],
    coloured: 1,
    note: "Violet iodine vapour fades as it reacts. Two molecules on each side, so pressure changes nothing.",
  },
  haber: {
    id: "haber",
    label: "N₂ + 3H₂ ⇌ 2NH₃",
    species: ["N₂", "H₂", "NH₃"],
    nu: [1, 3, 2],
    Kref: 0.5,
    Tref: 700,
    deltaH: -92.4,
    start: [0.5, 1.5, 0],
    coloured: -1,
    note: "The Haber process: four molecules become two, and it gives out heat.",
  },
};

/** Reactions in a fixed order, so a result can name one with a number. */
export const REACTION_ORDER: readonly ReactionId[] = ["n2o4", "hi", "haber"];

/** The gas constant twice over: for van 't Hoff, and for pressures in atm. */
export const R_J = 8.314;
export const R_ATM = 0.08206;
/** How quickly the mixture relaxes towards equilibrium, in seconds (e-folding time). */
export const RELAX_TIME = 1.2;
/** Most moles of any one species the lab allows. */
export const MAX_MOLES = 5;

export type EquilibriumParams = {
  reaction: ReactionId;
  /** Volume of the cylinder, in litres. */
  V: number;
  /** Temperature, in kelvin. */
  T: number;
};

export interface EquilibriumState {
  /** The reaction these amounts belong to: switching reaction starts afresh. */
  readonly reaction: ReactionId;
  /** Moles of A, B and C in the cylinder now. */
  readonly nA: number;
  readonly nB: number;
  readonly nC: number;
}

export type EquilibriumResults = {
  /** Which reaction, as its place in REACTION_ORDER. */
  reaction: number;
  nA: number;
  nB: number;
  nC: number;
  /** Concentrations now, in mol/L. */
  concA: number;
  concB: number;
  concC: number;
  /** Where they are heading: the equilibrium concentrations for the conditions now. */
  eqA: number;
  eqB: number;
  eqC: number;
  /** The reaction quotient and the equilibrium constant (concentrations), and their ratio. */
  Q: number;
  K: number;
  QoverK: number;
  /** log₁₀ of each, for the gauge. */
  logQ: number;
  logK: number;
  /** Kp, in atm^Δn, and Δn itself. */
  Kp: number;
  deltaN: number;
  /** +1 shifting forward (towards C), −1 backward, 0 at equilibrium. */
  direction: number;
  atEquilibrium: number;
  /** Forward and backward rates, relative: the larger of the two is 1. */
  forwardRate: number;
  backwardRate: number;
  /** Fraction of the A-side material that has become C (the degree of dissociation for N₂O₄). */
  conversion: number;
  /** Total pressure in the cylinder, in atm. */
  pressure: number;
  V: number;
  T: number;
  deltaH: number;
  /** Concentration of the coloured species, in mol/L (0 when none is coloured). */
  colourConc: number;
};

export function reactionOf(params: EquilibriumParams): EquilibriumReaction {
  return REACTIONS[params.reaction] ?? REACTIONS.n2o4;
}

/** Kc at temperature T, by van 't Hoff from the reference value. */
export function equilibriumConstant(reaction: EquilibriumReaction, T: number): number {
  return reaction.Kref * Math.exp(-((reaction.deltaH * 1000) / R_J) * (1 / T - 1 / reaction.Tref));
}

type Amounts = Pick<EquilibriumState, "nA" | "nB" | "nC">;

function amountsAfter(reaction: EquilibriumReaction, s: Amounts, x: number): [number, number, number] {
  const [a, b, c] = reaction.nu;
  return [s.nA - a * x, b > 0 ? s.nB - b * x : 0, s.nC + c * x];
}

/** ln Q for given amounts in volume V. Infinite when a reactant is missing, −∞ when the product is. */
function lnQ(reaction: EquilibriumReaction, n: readonly [number, number, number], V: number): number {
  const [a, b, c] = reaction.nu;
  const lnc = (m: number) => Math.log(Math.max(m, 0) / V);
  return c * lnc(n[2]) - a * lnc(n[0]) - (b > 0 ? b * lnc(n[1]) : 0);
}

export function reactionQuotient(reaction: EquilibriumReaction, s: Amounts, V: number): number {
  return Math.exp(lnQ(reaction, [s.nA, reaction.nu[1] > 0 ? s.nB : 0, s.nC], V));
}

/**
 * How far the reaction must run from here to reach equilibrium: the extent
 * x (mol) at which Q = K. ln Q rises steadily with x, so bisection finds it.
 */
export function extentToEquilibrium(reaction: EquilibriumReaction, s: Amounts, V: number, K: number): number {
  const [a, b, c] = reaction.nu;
  const lo = -s.nC / c;
  const hi = Math.min(s.nA / a, b > 0 ? s.nB / b : Number.POSITIVE_INFINITY);
  if (!(hi > lo)) return 0;
  const target = Math.log(K);
  let left = lo;
  let right = hi;
  for (let i = 0; i < 200; i++) {
    const mid = (left + right) / 2;
    if (lnQ(reaction, amountsAfter(reaction, s, mid), V) < target) left = mid;
    else right = mid;
  }
  return (left + right) / 2;
}

/** The equilibrium the mixture would settle into from here. */
export function equilibriumState(params: EquilibriumParams, s: Amounts): EquilibriumState {
  return relax(current({ reaction: params.reaction, ...s }, params), params, 1);
}

/** The mixture a reaction starts from. */
export function startingMixture(reaction: EquilibriumReaction): EquilibriumState {
  return { reaction: reaction.id, nA: reaction.start[0], nB: reaction.start[1], nC: reaction.start[2] };
}

/** The state as it applies to these params: a different reaction means its own starting mixture. */
function current(state: EquilibriumState, params: EquilibriumParams): EquilibriumState {
  const reaction = reactionOf(params);
  return state.reaction === reaction.id ? state : startingMixture(reaction);
}

/** Move a fraction of the way from here to equilibrium (1 = all the way). */
function relax(state: EquilibriumState, params: EquilibriumParams, fraction: number): EquilibriumState {
  const reaction = reactionOf(params);
  const K = equilibriumConstant(reaction, params.T);
  const x = extentToEquilibrium(reaction, state, params.V, K) * fraction;
  const [nA, nB, nC] = amountsAfter(reaction, state, x);
  return { reaction: reaction.id, nA: Math.max(0, nA), nB: Math.max(0, nB), nC: Math.max(0, nC) };
}

const clampMoles = (n: number) => Math.min(MAX_MOLES, Math.max(0, n));

const OUTPUTS = [
  "reaction",
  "nA",
  "nB",
  "nC",
  "concA",
  "concB",
  "concC",
  "eqA",
  "eqB",
  "eqC",
  "Q",
  "K",
  "QoverK",
  "logQ",
  "logK",
  "Kp",
  "deltaN",
  "direction",
  "atEquilibrium",
  "forwardRate",
  "backwardRate",
  "conversion",
  "pressure",
  "V",
  "T",
  "deltaH",
  "colourConc",
] as const satisfies readonly (keyof EquilibriumResults)[];

export const equilibriumModel: SimulationModel<EquilibriumState, EquilibriumParams, EquilibriumResults> = {
  id: "equilibrium",
  defaultParams: { reaction: "n2o4", V: 1, T: 298 },
  outputs: OUTPUTS,
  stateVariables: ["nA", "nB", "nC"],

  initialize(params) {
    return startingMixture(reactionOf(params));
  },

  /** Time runs the mixture towards equilibrium, exponentially. */
  advance(state, dt, params) {
    return relax(current(state, params), params, 1 - Math.exp(-dt / RELAX_TIME));
  },

  /** Stepping forward jumps one relaxation time towards equilibrium; there is no stepping back. */
  step(state, params, sign) {
    return sign > 0 ? relax(current(state, params), params, 1 - Math.exp(-1)) : current(state, params);
  },

  derive(state, params) {
    const reaction = reactionOf(params);
    const [a, b, c] = reaction.nu;
    const here = current(state, params);
    const s: EquilibriumState = { reaction: reaction.id, nA: here.nA, nB: b > 0 ? here.nB : 0, nC: here.nC };
    const { V, T } = params;
    const K = equilibriumConstant(reaction, T);
    const Q = reactionQuotient(reaction, s, V);
    const eq = equilibriumState(params, s);
    const lnRatio = Math.log(Q) - Math.log(K);
    const direction = !Number.isFinite(lnRatio) ? (lnRatio > 0 ? -1 : 1) : Math.abs(lnRatio) < 0.02 ? 0 : lnRatio < 0 ? 1 : -1;
    // Mass action, with the forward rate constant set to 1: forward ∝ [A]^a[B]^b, backward ∝ [C]^c / K.
    const conc = (n: number) => n / V;
    const forward = conc(s.nA) ** a * (b > 0 ? conc(s.nB) ** b : 1);
    const backward = conc(s.nC) ** c / K;
    const biggest = Math.max(forward, backward, 1e-300);
    const deltaN = c - a - b;
    const aSide = s.nA + (s.nC * a) / c;
    const colourMoles = reaction.coloured === 0 ? s.nA : reaction.coloured === 1 ? s.nB : reaction.coloured === 2 ? s.nC : 0;
    return {
      reaction: REACTION_ORDER.indexOf(reaction.id),
      nA: s.nA,
      nB: s.nB,
      nC: s.nC,
      concA: conc(s.nA),
      concB: conc(s.nB),
      concC: conc(s.nC),
      eqA: conc(eq.nA),
      eqB: conc(eq.nB),
      eqC: conc(eq.nC),
      Q,
      K,
      QoverK: Q / K,
      logQ: Math.log10(Math.max(Q, 1e-300)),
      logK: Math.log10(K),
      Kp: K * (R_ATM * T) ** deltaN,
      deltaN,
      direction,
      atEquilibrium: direction === 0 ? 1 : 0,
      forwardRate: forward / biggest,
      backwardRate: backward / biggest,
      conversion: aSide > 0 ? snapZero((s.nC * a) / c / aSide) : 0,
      pressure: ((s.nA + s.nB + s.nC) * R_ATM * T) / V,
      V,
      T,
      deltaH: reaction.deltaH,
      colourConc: conc(colourMoles),
    };
  },

  getVariable(state, id) {
    if (id === "nA") return state.nA;
    if (id === "nB") return state.nB;
    if (id === "nC") return state.nC;
    return undefined;
  },

  /** Setting an amount is adding (or removing) that gas: the mixture then shifts to make up for it. */
  setVariable(state, id, value, params) {
    const s = current(state, params);
    if (id === "nA") return { ...s, nA: clampMoles(value) };
    if (id === "nB") return { ...s, nB: clampMoles(value) };
    if (id === "nC") return { ...s, nC: clampMoles(value) };
    return s;
  },
};
