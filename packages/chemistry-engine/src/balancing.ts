import type { SimulationModel } from "@ise/science-engine";

/**
 * Balancing a chemical equation by counting atoms.
 *
 * A reaction only rearranges atoms: none are made and none destroyed, so
 * every element must appear as many times on the right as on the left. The
 * learner changes the number in front of each substance — never the formula
 * itself — until the tally for every element matches. When it does, the
 * masses on both sides match too: the conservation of mass.
 *
 * Play shows the usual strategy one move at a time: find the first element
 * that does not add up, and add one more of a substance containing it on the
 * side that is short.
 */

export type BalancingReactionId =
  | "water"
  | "ammonia"
  | "magnesium-oxide"
  | "rust"
  | "methane"
  | "limestone"
  | "electrolysis"
  | "zinc-acid"
  | "iron-copper"
  | "barium-sulfate";

export type ReactionType = "combination" | "decomposition" | "displacement" | "double-displacement" | "combustion";

export const REACTION_TYPE_ORDER: readonly ReactionType[] = ["combination", "decomposition", "displacement", "double-displacement", "combustion"];

export interface BalancingSpecies {
  /** As printed, with subscripts. */
  formula: string;
  atoms: Readonly<Record<string, number>>;
}

export interface BalancingReaction {
  label: string;
  type: ReactionType;
  reactants: readonly BalancingSpecies[];
  products: readonly BalancingSpecies[];
  /** The smallest whole numbers that balance it, reactants then products. */
  answer: readonly number[];
}

const sp = (formula: string, atoms: Record<string, number>): BalancingSpecies => ({ formula, atoms });

export const BALANCING_ORDER: readonly BalancingReactionId[] = [
  "water",
  "ammonia",
  "magnesium-oxide",
  "rust",
  "methane",
  "limestone",
  "electrolysis",
  "zinc-acid",
  "iron-copper",
  "barium-sulfate",
];

export const BALANCING_REACTIONS: Record<BalancingReactionId, BalancingReaction> = {
  water: {
    label: "Hydrogen burns to water",
    type: "combination",
    reactants: [sp("H₂", { H: 2 }), sp("O₂", { O: 2 })],
    products: [sp("H₂O", { H: 2, O: 1 })],
    answer: [2, 1, 2],
  },
  ammonia: {
    label: "Making ammonia",
    type: "combination",
    reactants: [sp("N₂", { N: 2 }), sp("H₂", { H: 2 })],
    products: [sp("NH₃", { N: 1, H: 3 })],
    answer: [1, 3, 2],
  },
  "magnesium-oxide": {
    label: "Magnesium ribbon burns",
    type: "combination",
    reactants: [sp("Mg", { Mg: 1 }), sp("O₂", { O: 2 })],
    products: [sp("MgO", { Mg: 1, O: 1 })],
    answer: [2, 1, 2],
  },
  rust: {
    label: "Iron rusts",
    type: "combination",
    reactants: [sp("Fe", { Fe: 1 }), sp("O₂", { O: 2 })],
    products: [sp("Fe₂O₃", { Fe: 2, O: 3 })],
    answer: [4, 3, 2],
  },
  methane: {
    label: "Methane burns",
    type: "combustion",
    reactants: [sp("CH₄", { C: 1, H: 4 }), sp("O₂", { O: 2 })],
    products: [sp("CO₂", { C: 1, O: 2 }), sp("H₂O", { H: 2, O: 1 })],
    answer: [1, 2, 1, 2],
  },
  limestone: {
    label: "Heating limestone",
    type: "decomposition",
    reactants: [sp("CaCO₃", { Ca: 1, C: 1, O: 3 })],
    products: [sp("CaO", { Ca: 1, O: 1 }), sp("CO₂", { C: 1, O: 2 })],
    answer: [1, 1, 1],
  },
  electrolysis: {
    label: "Splitting water with electricity",
    type: "decomposition",
    reactants: [sp("H₂O", { H: 2, O: 1 })],
    products: [sp("H₂", { H: 2 }), sp("O₂", { O: 2 })],
    answer: [2, 2, 1],
  },
  "zinc-acid": {
    label: "Zinc in hydrochloric acid",
    type: "displacement",
    reactants: [sp("Zn", { Zn: 1 }), sp("HCl", { H: 1, Cl: 1 })],
    products: [sp("ZnCl₂", { Zn: 1, Cl: 2 }), sp("H₂", { H: 2 })],
    answer: [1, 2, 1, 1],
  },
  "iron-copper": {
    label: "An iron nail in copper sulfate",
    type: "displacement",
    reactants: [sp("Fe", { Fe: 1 }), sp("CuSO₄", { Cu: 1, S: 1, O: 4 })],
    products: [sp("FeSO₄", { Fe: 1, S: 1, O: 4 }), sp("Cu", { Cu: 1 })],
    answer: [1, 1, 1, 1],
  },
  "barium-sulfate": {
    label: "Barium chloride and sodium sulfate",
    type: "double-displacement",
    reactants: [sp("BaCl₂", { Ba: 1, Cl: 2 }), sp("Na₂SO₄", { Na: 2, S: 1, O: 4 })],
    products: [sp("BaSO₄", { Ba: 1, S: 1, O: 4 }), sp("NaCl", { Na: 1, Cl: 1 })],
    answer: [1, 1, 1, 2],
  },
};

/** Grams per mole, to weigh each side. */
export const ATOMIC_MASS: Readonly<Record<string, number>> = {
  H: 1, C: 12, N: 14, O: 16, Na: 23, Mg: 24, S: 32, Cl: 35.5, Ca: 40, Fe: 56, Cu: 63.5, Zn: 65, Ba: 137,
};

export const MAX_COEFFICIENT = 6;
/** Slots in the tally: no reaction here has more elements. */
export const TALLY_SLOTS = 5;

export type BalancingParams = { reaction: BalancingReactionId };

export interface BalancingState {
  /** The number in front of each substance, reactants then products. */
  readonly c1: number;
  readonly c2: number;
  readonly c3: number;
  readonly c4: number;
  /** Seconds since Play last made a move. */
  readonly clock: number;
}

export type BalancingResults = {
  reaction: number;
  type: number;
  species: number;
  c1: number;
  c2: number;
  c3: number;
  c4: number;
  elements: number;
  left1: number;
  left2: number;
  left3: number;
  left4: number;
  left5: number;
  right1: number;
  right2: number;
  right3: number;
  right4: number;
  right5: number;
  balanced: number;
  /** Balanced with no common factor left over. */
  simplest: number;
  /** How many elements do not add up yet. */
  unbalanced: number;
  atomsLeft: number;
  atomsRight: number;
  massLeft: number;
  massRight: number;
};

const COEFFICIENTS = ["c1", "c2", "c3", "c4"] as const;
type Coefficient = (typeof COEFFICIENTS)[number];

const clampC = (c: number) => Math.min(MAX_COEFFICIENT, Math.max(1, Math.round(c)));
const reactionOf = (params: BalancingParams) => BALANCING_REACTIONS[params.reaction] ?? BALANCING_REACTIONS.water;

/** Every substance in order with its coefficient key: reactants, then products. */
function slots(reaction: BalancingReaction) {
  return [...reaction.reactants, ...reaction.products].map((species, i) => ({ species, key: COEFFICIENTS[i] as Coefficient, left: i < reaction.reactants.length }));
}

/** Elements in the order they first appear, reading left to right. */
export function elementsOf(reaction: BalancingReaction): string[] {
  const seen: string[] = [];
  for (const s of [...reaction.reactants, ...reaction.products]) for (const el of Object.keys(s.atoms)) if (!seen.includes(el)) seen.push(el);
  return seen;
}

/** Atoms of each element on each side for these coefficients. */
export function tally(reaction: BalancingReaction, state: BalancingState): { element: string; left: number; right: number }[] {
  return elementsOf(reaction).map((element) => {
    let left = 0;
    let right = 0;
    for (const { species, key, left: isLeft } of slots(reaction)) {
      const n = (species.atoms[element] ?? 0) * clampC(state[key]);
      if (isLeft) left += n;
      else right += n;
    }
    return { element, left, right };
  });
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** One move of the balancing strategy, or the same state when balanced or stuck. */
export function balancingMove(reaction: BalancingReaction, state: BalancingState): BalancingState {
  const short = tally(reaction, state).find((t) => t.left !== t.right);
  if (!short) return state;
  const shortLeft = short.left < short.right;
  const slot = slots(reaction).find((s) => s.left === shortLeft && (s.species.atoms[short.element] ?? 0) > 0);
  if (!slot || clampC(state[slot.key]) >= MAX_COEFFICIENT) return state;
  return { ...state, [slot.key]: clampC(state[slot.key]) + 1 };
}

const OUTPUTS = [
  "reaction", "type", "species", "c1", "c2", "c3", "c4", "elements",
  "left1", "left2", "left3", "left4", "left5", "right1", "right2", "right3", "right4", "right5",
  "balanced", "simplest", "unbalanced", "atomsLeft", "atomsRight", "massLeft", "massRight",
] as const satisfies readonly (keyof BalancingResults)[];

/** Seconds between the moves Play makes. */
const MOVE_EVERY = 0.8;

export const balancingModel: SimulationModel<BalancingState, BalancingParams, BalancingResults> = {
  id: "balancing",
  defaultParams: { reaction: "water" },
  outputs: OUTPUTS,
  stateVariables: ["c1", "c2", "c3", "c4"],

  initialize() {
    return { c1: 1, c2: 1, c3: 1, c4: 1, clock: 0 };
  },

  advance(state, dt, params) {
    const clock = state.clock + dt;
    if (clock < MOVE_EVERY) return { ...state, clock };
    return { ...balancingMove(reactionOf(params), state), clock: 0 };
  },

  step(state, params, sign) {
    // Step moves the first substance's number: the one balancing usually starts from.
    return sign > 0 ? { ...balancingMove(reactionOf(params), state), clock: 0 } : { ...state, c1: clampC(state.c1 - 1) };
  },

  derive(state, params) {
    const reaction = reactionOf(params);
    const counts = tally(reaction, state);
    const all = slots(reaction);
    const coefficients = all.map((s) => clampC(state[s.key]));
    const unbalanced = counts.filter((t) => t.left !== t.right).length;
    const massOf = (isLeft: boolean) =>
      all.filter((s) => s.left === isLeft).reduce((sum, s) => sum + clampC(state[s.key]) * Object.entries(s.species.atoms).reduce((m, [el, n]) => m + (ATOMIC_MASS[el] ?? 0) * n, 0), 0);
    const at = (i: number, side: "left" | "right") => counts[i]?.[side] ?? 0;
    return {
      reaction: Math.max(0, BALANCING_ORDER.indexOf(params.reaction)),
      type: REACTION_TYPE_ORDER.indexOf(reaction.type),
      species: all.length,
      c1: clampC(state.c1),
      c2: clampC(state.c2),
      c3: clampC(state.c3),
      c4: all.length > 3 ? clampC(state.c4) : 0,
      elements: counts.length,
      left1: at(0, "left"),
      left2: at(1, "left"),
      left3: at(2, "left"),
      left4: at(3, "left"),
      left5: at(4, "left"),
      right1: at(0, "right"),
      right2: at(1, "right"),
      right3: at(2, "right"),
      right4: at(3, "right"),
      right5: at(4, "right"),
      balanced: unbalanced === 0 ? 1 : 0,
      simplest: unbalanced === 0 && coefficients.reduce(gcd) === 1 ? 1 : 0,
      unbalanced,
      atomsLeft: counts.reduce((sum, t) => sum + t.left, 0),
      atomsRight: counts.reduce((sum, t) => sum + t.right, 0),
      massLeft: massOf(true),
      massRight: massOf(false),
    };
  },

  getVariable(state, id) {
    return (COEFFICIENTS as readonly string[]).includes(id) ? state[id as Coefficient] : undefined;
  },

  setVariable(state, id, value) {
    return (COEFFICIENTS as readonly string[]).includes(id) ? { ...state, [id]: clampC(value) } : state;
  },
};
