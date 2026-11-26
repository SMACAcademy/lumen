import type { SimulationModel } from "@ise/science-engine";

/**
 * The 3d transition metals, scandium to zinc.
 *
 * Each element has its oxidation states — few at the ends of the row, most
 * in the middle, up to +7 for manganese, which can use all its 3d and 4s
 * electrons. An ion loses its 4s electrons first, so it keeps Z − 18 − n d
 * electrons. Unpaired d electrons make it paramagnetic, with a spin-only
 * moment √(n(n + 2)) BM, and let it absorb visible light by jumping between
 * d orbitals — so d⁰ and d¹⁰ ions are colourless. Permanganate and
 * dichromate are the exception: deeply coloured with no d electrons at all,
 * from charge moving between the oxygens and the metal.
 */

export const COLOUR_NAMES = ["colourless", "purple", "blue", "green", "violet", "yellow", "orange", "pink", "brown", "metallic"] as const;
export type ColourName = (typeof COLOUR_NAMES)[number];

export interface TransitionElement {
  symbol: string;
  name: string;
  /** Oxidation states of its ions, low to high (NCERT). */
  states: readonly number[];
  /** E°(M²⁺/M), V; null when M²⁺ is not a common ion. */
  e2: number | null;
}

export const TRANSITION_ELEMENTS: Readonly<Record<number, TransitionElement>> = {
  21: { symbol: "Sc", name: "Scandium", states: [3], e2: null },
  22: { symbol: "Ti", name: "Titanium", states: [3, 4], e2: -1.63 },
  23: { symbol: "V", name: "Vanadium", states: [2, 3, 4, 5], e2: -1.18 },
  24: { symbol: "Cr", name: "Chromium", states: [2, 3, 6], e2: -0.9 },
  25: { symbol: "Mn", name: "Manganese", states: [2, 3, 4, 6, 7], e2: -1.18 },
  26: { symbol: "Fe", name: "Iron", states: [2, 3], e2: -0.44 },
  27: { symbol: "Co", name: "Cobalt", states: [2, 3], e2: -0.28 },
  28: { symbol: "Ni", name: "Nickel", states: [2], e2: -0.25 },
  29: { symbol: "Cu", name: "Copper", states: [1, 2], e2: 0.34 },
  30: { symbol: "Zn", name: "Zinc", states: [2], e2: -0.76 },
};

export const FIRST_Z = 21;
export const LAST_Z = 30;

/** The species each state is found as in water, and its colour (NCERT). */
const SPECIES: Readonly<Record<string, { formula: string; colour: ColourName }>> = {
  "21:3": { formula: "Sc³⁺", colour: "colourless" },
  "22:3": { formula: "Ti³⁺", colour: "purple" },
  "22:4": { formula: "Ti⁴⁺", colour: "colourless" },
  "23:2": { formula: "V²⁺", colour: "violet" },
  "23:3": { formula: "V³⁺", colour: "green" },
  "23:4": { formula: "VO²⁺", colour: "blue" },
  "23:5": { formula: "VO₂⁺", colour: "yellow" },
  "24:2": { formula: "Cr²⁺", colour: "blue" },
  "24:3": { formula: "Cr³⁺", colour: "violet" },
  "24:6": { formula: "Cr₂O₇²⁻", colour: "orange" },
  "25:2": { formula: "Mn²⁺", colour: "pink" },
  "25:3": { formula: "Mn³⁺", colour: "violet" },
  "25:4": { formula: "MnO₂", colour: "brown" },
  "25:6": { formula: "MnO₄²⁻", colour: "green" },
  "25:7": { formula: "MnO₄⁻", colour: "purple" },
  "26:2": { formula: "Fe²⁺", colour: "green" },
  "26:3": { formula: "Fe³⁺", colour: "yellow" },
  "27:2": { formula: "Co²⁺", colour: "pink" },
  "27:3": { formula: "Co³⁺", colour: "blue" },
  "28:2": { formula: "Ni²⁺", colour: "green" },
  "29:1": { formula: "Cu⁺", colour: "colourless" },
  "29:2": { formula: "Cu²⁺", colour: "blue" },
  "30:2": { formula: "Zn²⁺", colour: "colourless" },
};

/** Oxo-species coloured by charge transfer rather than by d–d jumps. */
const CHARGE_TRANSFER = new Set(["23:5", "24:6", "25:6", "25:7"]);

const clampZ = (z: number) => Math.min(LAST_Z, Math.max(FIRST_Z, Math.round(z)));

/** The nearest real oxidation state of element Z to `ox` (0 is the metal itself). */
export function snapOx(Z: number, ox: number): number {
  const states = [0, ...(TRANSITION_ELEMENTS[clampZ(Z)]?.states ?? [])];
  return states.reduce((best, s) => (Math.abs(s - ox) < Math.abs(best - ox) ? s : best), states[0]!);
}

/** d electrons of element Z in oxidation state ox: the neutral atom is 3dⁿ4s² (Cr and Cu 4s¹); ions lose 4s first. */
export function dElectrons(Z: number, ox: number): number {
  const z = clampZ(Z);
  if (ox === 0) return z === 24 ? 5 : z === 29 ? 10 : z - 20;
  return Math.max(0, z - 18 - ox);
}

/** Unpaired electrons among n d electrons in five d orbitals (Hund). */
export function unpairedOf(d: number): number {
  return d <= 5 ? d : 10 - d;
}

/** Spin-only magnetic moment, BM. */
export function spinOnlyMoment(unpaired: number): number {
  return Math.sqrt(unpaired * (unpaired + 2));
}

/** The formula and colour of element Z in state ox. */
export function transitionSpecies(Z: number, ox: number): { formula: string; colour: ColourName } {
  const z = clampZ(Z);
  if (ox === 0) return { formula: TRANSITION_ELEMENTS[z]!.symbol, colour: "metallic" };
  return SPECIES[`${z}:${ox}`] ?? { formula: TRANSITION_ELEMENTS[z]!.symbol, colour: "colourless" };
}

export type TransitionParams = {
  /** What Play walks through: the elements at one oxidation state, or one element's states. */
  walk: "elements" | "states";
};

export interface TransitionState {
  readonly Z: number;
  readonly ox: number;
  /** Seconds since Play last moved. */
  readonly clock: number;
}

export type TransitionResults = {
  Z: number;
  ox: number;
  maxOx: number;
  stateCount: number;
  dCount: number;
  unpaired: number;
  moment: number;
  paramagnetic: number;
  coloured: number;
  chargeTransfer: number;
  colour: number;
  e2: number;
  hasE2: number;
};

const OUTPUTS = [
  "Z", "ox", "maxOx", "stateCount", "dCount", "unpaired", "moment", "paramagnetic", "coloured", "chargeTransfer", "colour", "e2", "hasE2",
] as const satisfies readonly (keyof TransitionResults)[];

const MOVE_EVERY = 0.9;

export const transitionModel: SimulationModel<TransitionState, TransitionParams, TransitionResults> = {
  id: "transition",
  defaultParams: { walk: "elements" },
  outputs: OUTPUTS,
  stateVariables: ["Z", "ox"],

  initialize() {
    return { Z: 26, ox: 2, clock: 0 };
  },

  advance(state, dt, params) {
    const clock = state.clock + dt;
    if (clock < MOVE_EVERY) return { ...state, clock };
    if (params.walk === "states") {
      const states = [0, ...TRANSITION_ELEMENTS[clampZ(state.Z)]!.states];
      const i = states.indexOf(snapOx(state.Z, state.ox));
      return { ...state, ox: states[(i + 1) % states.length]!, clock: 0 };
    }
    const Z = state.Z >= LAST_Z ? FIRST_Z : clampZ(state.Z) + 1;
    return { ...state, Z, clock: 0 };
  },

  step(state, _params, sign) {
    return { ...state, Z: clampZ(state.Z + sign), clock: 0 };
  },

  derive(state) {
    const Z = clampZ(state.Z);
    const el = TRANSITION_ELEMENTS[Z]!;
    const ox = snapOx(Z, state.ox);
    const dCount = dElectrons(Z, ox);
    // A neutral Cr (3d⁵4s¹) or Cu (3d¹⁰4s¹) atom has an unpaired 4s electron too.
    const unpaired = unpairedOf(dCount) + (ox === 0 && (Z === 24 || Z === 29) ? 1 : 0);
    const key = `${Z}:${ox}`;
    const chargeTransfer = CHARGE_TRANSFER.has(key);
    const colour = transitionSpecies(Z, ox).colour;
    return {
      Z,
      ox,
      maxOx: Math.max(...el.states),
      stateCount: el.states.length,
      dCount,
      unpaired,
      moment: spinOnlyMoment(unpaired),
      paramagnetic: unpaired > 0 ? 1 : 0,
      coloured: ox > 0 && colour !== "colourless" ? 1 : 0,
      chargeTransfer: chargeTransfer ? 1 : 0,
      colour: COLOUR_NAMES.indexOf(colour),
      e2: el.e2 ?? 0,
      hasE2: el.e2 === null ? 0 : 1,
    };
  },

  getVariable(state, id) {
    return id === "Z" ? state.Z : id === "ox" ? state.ox : undefined;
  },

  setVariable(state, id, value) {
    if (id === "Z") {
      const Z = clampZ(value);
      return { ...state, Z, ox: snapOx(Z, state.ox), clock: 0 };
    }
    if (id === "ox") return { ...state, ox: snapOx(state.Z, value) };
    return state;
  },
};
