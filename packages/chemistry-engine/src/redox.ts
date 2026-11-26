import type { SimulationModel } from "@ise/science-engine";

/**
 * Redox: electrons changing hands, counted with oxidation numbers.
 *
 * Every atom in a species gets an oxidation number, and they add up to the
 * species' charge. In a redox reaction one element's number rises — it is
 * oxidised, losing electrons — and another's falls — it is reduced, gaining
 * them. A redox equation balances when the electrons lost equal the
 * electrons gained, and then the atoms and the charge follow.
 *
 * Whether the reaction runs is read from electrode potentials: E°cell =
 * E°(the couple reduced) − E°(the couple oxidised), and it goes if E°cell is
 * positive — zinc pushes copper out of solution, but not the other way round.
 */

export interface RedoxSpecies {
  /** As printed, e.g. "Cu²⁺", "Fe₂O₃". */
  formula: string;
  atoms: Readonly<Record<string, number>>;
  charge: number;
  /** Oxidation number of each element in it. */
  ox: Readonly<Record<string, number>>;
}

export interface ElectronChange {
  element: string;
  from: number;
  to: number;
}

export interface RedoxReaction {
  label: string;
  reactants: readonly RedoxSpecies[];
  products: readonly RedoxSpecies[];
  /** Smallest whole numbers that balance it, reactants then products. */
  answer: readonly number[];
  oxidised: ElectronChange;
  reduced: ElectronChange;
  /** E°cell in volts, when the reaction is a pair of standard couples. */
  ecell: number | null;
}

const sp = (formula: string, atoms: Record<string, number>, charge: number, ox: Record<string, number>): RedoxSpecies => ({ formula, atoms, charge, ox });

// The species, with their oxidation numbers.
const Zn = sp("Zn", { Zn: 1 }, 0, { Zn: 0 });
const Zn2 = sp("Zn²⁺", { Zn: 1 }, 2, { Zn: 2 });
const Cu = sp("Cu", { Cu: 1 }, 0, { Cu: 0 });
const Cu2 = sp("Cu²⁺", { Cu: 1 }, 2, { Cu: 2 });
const Ag = sp("Ag", { Ag: 1 }, 0, { Ag: 0 });
const Ag1 = sp("Ag⁺", { Ag: 1 }, 1, { Ag: 1 });
const Fe3 = sp("Fe³⁺", { Fe: 1 }, 3, { Fe: 3 });
const Fe2 = sp("Fe²⁺", { Fe: 1 }, 2, { Fe: 2 });
const Fe = sp("Fe", { Fe: 1 }, 0, { Fe: 0 });
const I = sp("I⁻", { I: 1 }, -1, { I: -1 });
const I2 = sp("I₂", { I: 2 }, 0, { I: 0 });
const Cl2 = sp("Cl₂", { Cl: 2 }, 0, { Cl: 0 });
const Cl = sp("Cl⁻", { Cl: 1 }, -1, { Cl: -1 });
const Br2 = sp("Br₂", { Br: 2 }, 0, { Br: 0 });
const Br = sp("Br⁻", { Br: 1 }, -1, { Br: -1 });
const Mg = sp("Mg", { Mg: 1 }, 0, { Mg: 0 });
const Mg2 = sp("Mg²⁺", { Mg: 1 }, 2, { Mg: 2 });
const H = sp("H⁺", { H: 1 }, 1, { H: 1 });
const H2 = sp("H₂", { H: 2 }, 0, { H: 0 });
const O2 = sp("O₂", { O: 2 }, 0, { O: 0 });
const H2O = sp("H₂O", { H: 2, O: 1 }, 0, { H: 1, O: -2 });
const Fe2O3 = sp("Fe₂O₃", { Fe: 2, O: 3 }, 0, { Fe: 3, O: -2 });
const CO = sp("CO", { C: 1, O: 1 }, 0, { C: 2, O: -2 });
const CO2 = sp("CO₂", { C: 1, O: 2 }, 0, { C: 4, O: -2 });
const Al = sp("Al", { Al: 1 }, 0, { Al: 0 });
const Al2O3 = sp("Al₂O₃", { Al: 2, O: 3 }, 0, { Al: 3, O: -2 });

/** Standard reduction potentials, V (NCERT). */
export const E_STANDARD = {
  "Mg²⁺/Mg": -2.37,
  "Zn²⁺/Zn": -0.76,
  "Fe²⁺/Fe": -0.44,
  "Sn²⁺/Sn": -0.14,
  "H⁺/H₂": 0,
  "Cu²⁺/Cu": 0.34,
  "I₂/I⁻": 0.54,
  "Fe³⁺/Fe²⁺": 0.77,
  "Ag⁺/Ag": 0.8,
  "Br₂/Br⁻": 1.09,
  "O₂/H₂O": 1.23,
  "Cl₂/Cl⁻": 1.36,
} as const;

const E = E_STANDARD;
const round2 = (v: number) => Math.round(v * 100) / 100;

export type RedoxReactionId =
  | "zinc-copper"
  | "copper-silver"
  | "iron-iodide"
  | "chlorine-bromide"
  | "magnesium-acid"
  | "hydrogen-oxygen"
  | "iron-ore"
  | "thermite"
  | "copper-zinc"
  | "bromine-chloride";

export const REDOX_ORDER: readonly RedoxReactionId[] = [
  "zinc-copper",
  "copper-silver",
  "iron-iodide",
  "chlorine-bromide",
  "magnesium-acid",
  "hydrogen-oxygen",
  "iron-ore",
  "thermite",
  "copper-zinc",
  "bromine-chloride",
];

export const REDOX_REACTIONS: Record<RedoxReactionId, RedoxReaction> = {
  "zinc-copper": {
    label: "Zinc in copper sulfate",
    reactants: [Zn, Cu2],
    products: [Zn2, Cu],
    answer: [1, 1, 1, 1],
    oxidised: { element: "Zn", from: 0, to: 2 },
    reduced: { element: "Cu", from: 2, to: 0 },
    ecell: round2(E["Cu²⁺/Cu"] - E["Zn²⁺/Zn"]),
  },
  "copper-silver": {
    label: "Copper in silver nitrate",
    reactants: [Cu, Ag1],
    products: [Cu2, Ag],
    answer: [1, 2, 1, 2],
    oxidised: { element: "Cu", from: 0, to: 2 },
    reduced: { element: "Ag", from: 1, to: 0 },
    ecell: round2(E["Ag⁺/Ag"] - E["Cu²⁺/Cu"]),
  },
  "iron-iodide": {
    label: "Iron(III) and iodide",
    reactants: [Fe3, I],
    products: [Fe2, I2],
    answer: [2, 2, 2, 1],
    oxidised: { element: "I", from: -1, to: 0 },
    reduced: { element: "Fe", from: 3, to: 2 },
    ecell: round2(E["Fe³⁺/Fe²⁺"] - E["I₂/I⁻"]),
  },
  "chlorine-bromide": {
    label: "Chlorine water and bromide",
    reactants: [Cl2, Br],
    products: [Cl, Br2],
    answer: [1, 2, 2, 1],
    oxidised: { element: "Br", from: -1, to: 0 },
    reduced: { element: "Cl", from: 0, to: -1 },
    ecell: round2(E["Cl₂/Cl⁻"] - E["Br₂/Br⁻"]),
  },
  "magnesium-acid": {
    label: "Magnesium in acid",
    reactants: [Mg, H],
    products: [Mg2, H2],
    answer: [1, 2, 1, 1],
    oxidised: { element: "Mg", from: 0, to: 2 },
    reduced: { element: "H", from: 1, to: 0 },
    ecell: round2(E["H⁺/H₂"] - E["Mg²⁺/Mg"]),
  },
  "hydrogen-oxygen": {
    label: "Hydrogen burns in oxygen",
    reactants: [H2, O2],
    products: [H2O],
    answer: [2, 1, 2],
    oxidised: { element: "H", from: 0, to: 1 },
    reduced: { element: "O", from: 0, to: -2 },
    ecell: round2(E["O₂/H₂O"] - E["H⁺/H₂"]),
  },
  "iron-ore": {
    label: "Iron ore in the blast furnace",
    reactants: [Fe2O3, CO],
    products: [Fe, CO2],
    answer: [1, 3, 2, 3],
    oxidised: { element: "C", from: 2, to: 4 },
    reduced: { element: "Fe", from: 3, to: 0 },
    ecell: null,
  },
  thermite: {
    label: "The thermite reaction",
    reactants: [Al, Fe2O3],
    products: [Al2O3, Fe],
    answer: [2, 1, 1, 2],
    oxidised: { element: "Al", from: 0, to: 3 },
    reduced: { element: "Fe", from: 3, to: 0 },
    ecell: null,
  },
  "copper-zinc": {
    label: "Copper in zinc sulfate",
    reactants: [Cu, Zn2],
    products: [Cu2, Zn],
    answer: [1, 1, 1, 1],
    oxidised: { element: "Cu", from: 0, to: 2 },
    reduced: { element: "Zn", from: 2, to: 0 },
    ecell: round2(E["Zn²⁺/Zn"] - E["Cu²⁺/Cu"]),
  },
  "bromine-chloride": {
    label: "Bromine water and chloride",
    reactants: [Br2, Cl],
    products: [Br, Cl2],
    answer: [1, 2, 2, 1],
    oxidised: { element: "Cl", from: -1, to: 0 },
    reduced: { element: "Br", from: 0, to: -1 },
    ecell: round2(E["Br₂/Br⁻"] - E["Cl₂/Cl⁻"]),
  },
};

export const REDOX_MAX_COEFFICIENT = 6;

export type RedoxParams = { reaction: RedoxReactionId };

export interface RedoxState {
  readonly c1: number;
  readonly c2: number;
  readonly c3: number;
  readonly c4: number;
  /** Seconds since Play last made a move. */
  readonly clock: number;
}

export type RedoxResults = {
  reaction: number;
  species: number;
  c1: number;
  c2: number;
  c3: number;
  c4: number;
  atomsBalanced: number;
  chargeLeft: number;
  chargeRight: number;
  chargeBalanced: number;
  electronsLost: number;
  electronsGained: number;
  electronsBalanced: number;
  balanced: number;
  simplest: number;
  oxidisedFrom: number;
  oxidisedTo: number;
  reducedFrom: number;
  reducedTo: number;
  ecell: number;
  hasPotential: number;
  spontaneous: number;
};

const KEYS = ["c1", "c2", "c3", "c4"] as const;
type Key = (typeof KEYS)[number];
const clampC = (c: number) => Math.min(REDOX_MAX_COEFFICIENT, Math.max(1, Math.round(c)));
const reactionOf = (params: RedoxParams) => REDOX_REACTIONS[params.reaction] ?? REDOX_REACTIONS["zinc-copper"];

function slots(reaction: RedoxReaction) {
  return [...reaction.reactants, ...reaction.products].map((species, i) => ({ species, key: KEYS[i] as Key, left: i < reaction.reactants.length }));
}

/** Elements in the order they first appear. */
export function redoxElements(reaction: RedoxReaction): string[] {
  const seen: string[] = [];
  for (const s of [...reaction.reactants, ...reaction.products]) for (const el of Object.keys(s.atoms)) if (!seen.includes(el)) seen.push(el);
  return seen;
}

/** Atoms of each element on each side. */
export function redoxTally(reaction: RedoxReaction, state: RedoxState): { element: string; left: number; right: number }[] {
  return redoxElements(reaction).map((element) => {
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

/** Electrons the reactants lose and gain, counted from the element oxidised and the element reduced. */
export function electronCount(reaction: RedoxReaction, state: RedoxState): { lost: number; gained: number } {
  const reactantAtoms = (element: string) => slots(reaction).filter((s) => s.left).reduce((sum, s) => sum + (s.species.atoms[element] ?? 0) * clampC(state[s.key]), 0);
  const { oxidised, reduced } = reaction;
  return {
    lost: reactantAtoms(oxidised.element) * (oxidised.to - oxidised.from),
    gained: reactantAtoms(reduced.element) * (reduced.from - reduced.to),
  };
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** One step of the textbook method: balance the electrons first, then the atoms. */
export function redoxMove(reaction: RedoxReaction, state: RedoxState): RedoxState {
  const bump = (key: Key) => (clampC(state[key]) >= REDOX_MAX_COEFFICIENT ? state : { ...state, [key]: clampC(state[key]) + 1 });
  const reactantWith = (element: string) => slots(reaction).find((s) => s.left && (s.species.atoms[element] ?? 0) > 0);
  const { lost, gained } = electronCount(reaction, state);
  if (lost !== gained) {
    const slot = reactantWith(lost < gained ? reaction.oxidised.element : reaction.reduced.element);
    return slot ? bump(slot.key) : state;
  }
  const short = redoxTally(reaction, state).find((t) => t.left !== t.right);
  if (!short) return state;
  const slot = slots(reaction).find((s) => s.left === short.left < short.right && (s.species.atoms[short.element] ?? 0) > 0);
  return slot ? bump(slot.key) : state;
}

const OUTPUTS = [
  "reaction", "species", "c1", "c2", "c3", "c4", "atomsBalanced", "chargeLeft", "chargeRight", "chargeBalanced",
  "electronsLost", "electronsGained", "electronsBalanced", "balanced", "simplest",
  "oxidisedFrom", "oxidisedTo", "reducedFrom", "reducedTo", "ecell", "hasPotential", "spontaneous",
] as const satisfies readonly (keyof RedoxResults)[];

const MOVE_EVERY = 0.8;

export const redoxModel: SimulationModel<RedoxState, RedoxParams, RedoxResults> = {
  id: "redox",
  defaultParams: { reaction: "zinc-copper" },
  outputs: OUTPUTS,
  stateVariables: KEYS,

  initialize() {
    return { c1: 1, c2: 1, c3: 1, c4: 1, clock: 0 };
  },

  advance(state, dt, params) {
    const clock = state.clock + dt;
    if (clock < MOVE_EVERY) return { ...state, clock };
    return { ...redoxMove(reactionOf(params), state), clock: 0 };
  },

  step(state, params, sign) {
    return sign > 0 ? { ...redoxMove(reactionOf(params), state), clock: 0 } : { ...state, c1: clampC(state.c1 - 1) };
  },

  derive(state, params) {
    const reaction = reactionOf(params);
    const all = slots(reaction);
    const tally = redoxTally(reaction, state);
    const chargeOf = (left: boolean) => all.filter((s) => s.left === left).reduce((sum, s) => sum + s.species.charge * clampC(state[s.key]), 0);
    const chargeLeft = chargeOf(true);
    const chargeRight = chargeOf(false);
    const atomsBalanced = tally.every((t) => t.left === t.right);
    const chargeBalanced = chargeLeft === chargeRight;
    const { lost, gained } = electronCount(reaction, state);
    const coefficients = all.map((s) => clampC(state[s.key]));
    const balanced = atomsBalanced && chargeBalanced;
    return {
      reaction: Math.max(0, REDOX_ORDER.indexOf(params.reaction)),
      species: all.length,
      c1: clampC(state.c1),
      c2: clampC(state.c2),
      c3: clampC(state.c3),
      c4: all.length > 3 ? clampC(state.c4) : 0,
      atomsBalanced: atomsBalanced ? 1 : 0,
      chargeLeft,
      chargeRight,
      chargeBalanced: chargeBalanced ? 1 : 0,
      electronsLost: lost,
      electronsGained: gained,
      electronsBalanced: lost === gained ? 1 : 0,
      balanced: balanced ? 1 : 0,
      simplest: balanced && coefficients.reduce(gcd) === 1 ? 1 : 0,
      oxidisedFrom: reaction.oxidised.from,
      oxidisedTo: reaction.oxidised.to,
      reducedFrom: reaction.reduced.from,
      reducedTo: reaction.reduced.to,
      ecell: reaction.ecell ?? 0,
      hasPotential: reaction.ecell === null ? 0 : 1,
      spontaneous: reaction.ecell === null || reaction.ecell > 0 ? 1 : 0,
    };
  },

  getVariable(state, id) {
    return (KEYS as readonly string[]).includes(id) ? state[id as Key] : undefined;
  },

  setVariable(state, id, value) {
    return (KEYS as readonly string[]).includes(id) ? { ...state, [id]: clampC(value) } : state;
  },
};
