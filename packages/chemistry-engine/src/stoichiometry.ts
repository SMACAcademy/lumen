import type { SimulationModel } from "@ise/science-engine";
import { snapZero } from "@ise/units";

/**
 * Weighing out two reactants and letting them react to completion.
 *
 * Everything starts in grams, because that is what a balance measures, and
 * is turned into moles, because that is what reactions count. The balanced
 * equation then says how many moles of each react together; whichever runs
 * out first is the limiting reagent, and it alone decides how much product
 * can form. Mass is conserved throughout — the total never changes, however
 * far the reaction has gone.
 */

export type StoichReactionId = "water" | "ammonia" | "methane";

export interface StoichSpecies {
  formula: string;
  /** Molar mass, g/mol. */
  M: number;
  /** Coefficient in the balanced equation. */
  nu: number;
}

export interface StoichReaction {
  id: StoichReactionId;
  label: string;
  reactants: readonly [StoichSpecies, StoichSpecies];
  /** One or two products. */
  products: readonly StoichSpecies[];
}

export const STOICH_REACTIONS: Record<StoichReactionId, StoichReaction> = {
  water: {
    id: "water",
    label: "2H₂ + O₂ → 2H₂O",
    reactants: [
      { formula: "H₂", M: 2, nu: 2 },
      { formula: "O₂", M: 32, nu: 1 },
    ],
    products: [{ formula: "H₂O", M: 18, nu: 2 }],
  },
  ammonia: {
    id: "ammonia",
    label: "N₂ + 3H₂ → 2NH₃",
    reactants: [
      { formula: "N₂", M: 28, nu: 1 },
      { formula: "H₂", M: 2, nu: 3 },
    ],
    products: [{ formula: "NH₃", M: 17, nu: 2 }],
  },
  methane: {
    id: "methane",
    label: "CH₄ + 2O₂ → CO₂ + 2H₂O",
    reactants: [
      { formula: "CH₄", M: 16, nu: 1 },
      { formula: "O₂", M: 32, nu: 2 },
    ],
    products: [
      { formula: "CO₂", M: 44, nu: 1 },
      { formula: "H₂O", M: 18, nu: 2 },
    ],
  },
};

export const STOICH_ORDER: readonly StoichReactionId[] = ["water", "ammonia", "methane"];

/** Seconds of play for the reaction to run to completion. */
export const REACTION_TIME = 4;
/** Reactant amounts closer than this share (0.5 %) count as exactly in proportion. */
export const EXACT = 0.005;

/** Which reactant runs out: 0 the first, 1 the second, 2 both together, −1 nothing to react. */
export const LIMITING = { first: 0, second: 1, exact: 2, none: -1 } as const;

export type StoichParams = {
  reaction: StoichReactionId;
  /** Masses weighed out, in grams. */
  massA: number;
  massB: number;
};

export interface StoichState {
  /** How far the reaction has gone: 0 not started, 1 complete. */
  readonly progress: number;
}

export type StoichResults = {
  reaction: number;
  progress: number;
  /** Moles of each reactant weighed out. */
  molesAStart: number;
  molesBStart: number;
  /** Moles and grams of everything now. */
  molesA: number;
  molesB: number;
  molesC: number;
  molesD: number;
  massANow: number;
  massBNow: number;
  massC: number;
  massD: number;
  /** Total mass in the flask: the same at every stage. */
  totalMass: number;
  limiting: number;
  /** How much of the reaction, in moles of "reaction", can happen at most. */
  maxExtent: number;
  /** Grams of the first product at completion. */
  theoreticalYield: number;
  /** Grams of the reactant in excess left over at completion. */
  excessLeft: number;
  /** Grams of the second reactant needed to use up all of the first exactly. */
  massBNeeded: number;
};

export function stoichOf(params: StoichParams): StoichReaction {
  return STOICH_REACTIONS[params.reaction] ?? STOICH_REACTIONS.water;
}

/** The largest extent the reactants allow, and which one sets it. */
export function limitingReagent(params: StoichParams): { extent: number; limiting: number } {
  const [a, b] = stoichOf(params).reactants;
  const nA = Math.max(0, params.massA) / a.M;
  const nB = Math.max(0, params.massB) / b.M;
  const byA = nA / a.nu;
  const byB = nB / b.nu;
  const extent = Math.min(byA, byB);
  if (extent <= 0) return { extent: 0, limiting: LIMITING.none };
  if (Math.abs(byA - byB) <= EXACT * Math.max(byA, byB)) return { extent, limiting: LIMITING.exact };
  return { extent, limiting: byA < byB ? LIMITING.first : LIMITING.second };
}

const clampProgress = (p: number) => Math.min(1, Math.max(0, p));

const OUTPUTS = [
  "reaction",
  "progress",
  "molesAStart",
  "molesBStart",
  "molesA",
  "molesB",
  "molesC",
  "molesD",
  "massANow",
  "massBNow",
  "massC",
  "massD",
  "totalMass",
  "limiting",
  "maxExtent",
  "theoreticalYield",
  "excessLeft",
  "massBNeeded",
] as const satisfies readonly (keyof StoichResults)[];

export const stoichiometryModel: SimulationModel<StoichState, StoichParams, StoichResults> = {
  id: "stoichiometry",
  defaultParams: { reaction: "water", massA: 4, massB: 32 },
  outputs: OUTPUTS,
  stateVariables: ["progress"],

  initialize() {
    return { progress: 0 };
  },

  /** Play lets the reaction run to completion. */
  advance(state, dt) {
    return { progress: clampProgress(state.progress + dt / REACTION_TIME) };
  },

  /** A step is a quarter of the way. */
  step(state, _params, sign) {
    return { progress: clampProgress(Math.round((state.progress + sign * 0.25) * 4) / 4) };
  },

  derive(state, params) {
    const reaction = stoichOf(params);
    const [a, b] = reaction.reactants;
    const [c, d] = reaction.products;
    const p = clampProgress(state.progress);
    const { extent: maxExtent, limiting } = limitingReagent(params);
    const x = maxExtent * p;
    const molesAStart = Math.max(0, params.massA) / a.M;
    const molesBStart = Math.max(0, params.massB) / b.M;
    const molesA = snapZero(molesAStart - a.nu * x, 1e-12);
    const molesB = snapZero(molesBStart - b.nu * x, 1e-12);
    const molesC = c ? c.nu * x : 0;
    const molesD = d ? d.nu * x : 0;
    const leftA = molesAStart - a.nu * maxExtent;
    const leftB = molesBStart - b.nu * maxExtent;
    return {
      reaction: STOICH_ORDER.indexOf(reaction.id),
      progress: p,
      molesAStart,
      molesBStart,
      molesA,
      molesB,
      molesC,
      molesD,
      massANow: molesA * a.M,
      massBNow: molesB * b.M,
      massC: molesC * (c?.M ?? 0),
      massD: molesD * (d?.M ?? 0),
      totalMass: molesA * a.M + molesB * b.M + molesC * (c?.M ?? 0) + molesD * (d?.M ?? 0),
      limiting,
      maxExtent,
      theoreticalYield: c ? c.nu * maxExtent * c.M : 0,
      excessLeft: snapZero(limiting === LIMITING.first ? leftB * b.M : limiting === LIMITING.second ? leftA * a.M : 0, 1e-9),
      massBNeeded: ((molesAStart / a.nu) * b.nu) * b.M,
    };
  },

  getVariable(state, id) {
    return id === "progress" ? state.progress : undefined;
  },

  setVariable(state, id, value) {
    return id === "progress" ? { progress: clampProgress(value) } : state;
  },
};
