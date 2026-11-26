import type { SimulationModel } from "@ise/science-engine";
import type { Vec3 } from "./vsepr";

/**
 * Groups 17 and 18: the halogens and the noble gases.
 *
 * The trends are measured values from NCERT's class 12 tables, shown rather
 * than derived; a value NCERT does not give is null, and reported as not
 * known. Three things are worked out:
 *
 *  - Displacement. A halogen oxidises the halide of any halogen below it,
 *    because its E°(X₂/X⁻) is higher: E°cell = E°(oxidant) − E°(halide's
 *    own couple), positive when the reaction goes.
 *  - Lone pairs. In an interhalogen XX′ₙ or a xenon compound, the central
 *    atom keeps (valence electrons − oxidation state) ÷ 2 lone pairs.
 *  - Shape. Bonds plus lone pairs give the electron domains, and VSEPR the
 *    shape. XeF₆, with seven domains, is drawn as an octahedron of fluorines
 *    with the lone pair over one face — "distorted octahedral".
 */

export interface GroupElement {
  symbol: string;
  name: string;
  Z: number;
  /** Covalent radius (halogens) or atomic radius (noble gases), pm. */
  radius: number | null;
  /** First ionisation enthalpy, kJ/mol. */
  ionisation: number;
  /** Electron gain enthalpy, kJ/mol. */
  gain: number;
  /** Boiling point, K. */
  boiling: number;
  /** X–X bond dissociation enthalpy, kJ/mol. */
  bond: number | null;
  /** E°(X₂/X⁻), V. */
  potential: number | null;
  /** pKa of HX in water. */
  pKa: number | null;
  /** The element at 298 K. */
  state: "gas" | "liquid" | "solid";
  colour: string;
}

export const HALOGEN_ELEMENTS: readonly GroupElement[] = [
  { symbol: "F", name: "Fluorine", Z: 9, radius: 64, ionisation: 1680, gain: -333, boiling: 84.9, bond: 158.8, potential: 2.87, pKa: 3.2, state: "gas", colour: "pale yellow" },
  { symbol: "Cl", name: "Chlorine", Z: 17, radius: 99, ionisation: 1256, gain: -349, boiling: 239.0, bond: 242.6, potential: 1.36, pKa: -7.0, state: "gas", colour: "greenish yellow" },
  { symbol: "Br", name: "Bromine", Z: 35, radius: 114, ionisation: 1142, gain: -325, boiling: 332.5, bond: 192.8, potential: 1.09, pKa: -9.5, state: "liquid", colour: "red-brown" },
  { symbol: "I", name: "Iodine", Z: 53, radius: 133, ionisation: 1008, gain: -296, boiling: 458.2, bond: 151.1, potential: 0.54, pKa: -10.0, state: "solid", colour: "violet" },
];

export const NOBLE_GASES: readonly GroupElement[] = [
  { symbol: "He", name: "Helium", Z: 2, radius: 120, ionisation: 2372, gain: 48, boiling: 4.2, bond: null, potential: null, pKa: null, state: "gas", colour: "colourless" },
  { symbol: "Ne", name: "Neon", Z: 10, radius: 160, ionisation: 2080, gain: 116, boiling: 27.1, bond: null, potential: null, pKa: null, state: "gas", colour: "colourless" },
  { symbol: "Ar", name: "Argon", Z: 18, radius: 190, ionisation: 1520, gain: 96, boiling: 87.2, bond: null, potential: null, pKa: null, state: "gas", colour: "colourless" },
  { symbol: "Kr", name: "Krypton", Z: 36, radius: 200, ionisation: 1351, gain: 96, boiling: 119.7, bond: null, potential: null, pKa: null, state: "gas", colour: "colourless" },
  { symbol: "Xe", name: "Xenon", Z: 54, radius: 220, ionisation: 1170, gain: 77, boiling: 165.0, bond: null, potential: null, pKa: null, state: "gas", colour: "colourless" },
  { symbol: "Rn", name: "Radon", Z: 86, radius: null, ionisation: 1037, gain: 68, boiling: 211, bond: null, potential: null, pKa: null, state: "gas", colour: "colourless" },
];

export type GroupFamilyId = "halogens" | "noble";
export const GROUP_FAMILY_ORDER: readonly GroupFamilyId[] = ["halogens", "noble"];

export function groupElements(family: GroupFamilyId): readonly GroupElement[] {
  return family === "noble" ? NOBLE_GASES : HALOGEN_ELEMENTS;
}

export type GroupPropertyId = "radius" | "ionisation" | "gain" | "boiling" | "bond" | "potential" | "pKa";
export const GROUP_PROPERTY_ORDER: readonly GroupPropertyId[] = ["radius", "ionisation", "gain", "boiling", "bond", "potential", "pKa"];
export const GROUP_PROPERTIES: Record<GroupPropertyId, { name: string; unit: string }> = {
  radius: { name: "Radius", unit: "pm" },
  ionisation: { name: "Ionisation enthalpy", unit: "kJ/mol" },
  gain: { name: "Electron gain enthalpy", unit: "kJ/mol" },
  boiling: { name: "Boiling point", unit: "K" },
  bond: { name: "X–X bond enthalpy", unit: "kJ/mol" },
  potential: { name: "E°(X₂/X⁻)", unit: "V" },
  pKa: { name: "pKa of HX", unit: "" },
};

export type HalogenId = "f2" | "cl2" | "br2" | "i2";
export const HALOGEN_ORDER: readonly HalogenId[] = ["f2", "cl2", "br2", "i2"];
export type HalideId = "fluoride" | "chloride" | "bromide" | "iodide";
export const HALIDE_ORDER: readonly HalideId[] = ["fluoride", "chloride", "bromide", "iodide"];

/** Shapes and hybridisations; results refer to them by index. */
export const HALOGEN_SHAPES = ["linear", "T-shaped", "square planar", "square pyramidal", "pyramidal", "pentagonal bipyramidal", "distorted octahedral"] as const;
export const HALOGEN_HYBRIDS = ["sp³", "sp³d", "sp³d²", "sp³d³"] as const;

export interface HalogenCompound {
  formula: string;
  central: string;
  /** Valence electrons of the central atom, and its oxidation state here. */
  valence: number;
  oxidationState: number;
  /** The atoms bonded to it, in the order their directions are given. */
  atoms: readonly string[];
  shape: (typeof HALOGEN_SHAPES)[number];
  hybrid: (typeof HALOGEN_HYBRIDS)[number];
}

export type HalogenCompoundId = "clf3" | "brf5" | "if7" | "xef2" | "xef4" | "xef6" | "xeo3" | "xeof4";
export const HALOGEN_COMPOUND_ORDER: readonly HalogenCompoundId[] = ["clf3", "brf5", "if7", "xef2", "xef4", "xef6", "xeo3", "xeof4"];
const repeat = (atom: string, n: number) => Array.from({ length: n }, () => atom);
export const HALOGEN_COMPOUNDS: Record<HalogenCompoundId, HalogenCompound> = {
  clf3: { formula: "ClF₃", central: "Cl", valence: 7, oxidationState: 3, atoms: repeat("F", 3), shape: "T-shaped", hybrid: "sp³d" },
  brf5: { formula: "BrF₅", central: "Br", valence: 7, oxidationState: 5, atoms: repeat("F", 5), shape: "square pyramidal", hybrid: "sp³d²" },
  if7: { formula: "IF₇", central: "I", valence: 7, oxidationState: 7, atoms: repeat("F", 7), shape: "pentagonal bipyramidal", hybrid: "sp³d³" },
  xef2: { formula: "XeF₂", central: "Xe", valence: 8, oxidationState: 2, atoms: repeat("F", 2), shape: "linear", hybrid: "sp³d" },
  xef4: { formula: "XeF₄", central: "Xe", valence: 8, oxidationState: 4, atoms: repeat("F", 4), shape: "square planar", hybrid: "sp³d²" },
  xef6: { formula: "XeF₆", central: "Xe", valence: 8, oxidationState: 6, atoms: repeat("F", 6), shape: "distorted octahedral", hybrid: "sp³d³" },
  xeo3: { formula: "XeO₃", central: "Xe", valence: 8, oxidationState: 6, atoms: repeat("O", 3), shape: "pyramidal", hybrid: "sp³" },
  xeof4: { formula: "XeOF₄", central: "Xe", valence: 8, oxidationState: 6, atoms: ["O", ...repeat("F", 4)], shape: "square pyramidal", hybrid: "sp³d²" },
};

/** Lone pairs left on the central atom. */
export function centralLonePairs(compound: HalogenCompound): number {
  return (compound.valence - compound.oxidationState) / 2;
}

const ring = (n: number, z = 0): Vec3[] => Array.from({ length: n }, (_, k) => [Math.cos((k * 2 * Math.PI) / n), Math.sin((k * 2 * Math.PI) / n), z] as Vec3);
const UP: Vec3 = [0, 0, 1];
const DOWN: Vec3 = [0, 0, -1];
const TETRA: Vec3[] = [UP, [Math.sqrt(8 / 9), 0, -1 / 3], [-Math.sqrt(2 / 9), Math.sqrt(2 / 3), -1 / 3], [-Math.sqrt(2 / 9), -Math.sqrt(2 / 3), -1 / 3]];

/** Unit vectors from the central atom to each bonded atom (in `atoms` order) and along each lone pair. */
export function compoundGeometry(id: HalogenCompoundId): { bonds: Vec3[]; lone: Vec3[] } {
  const equator = ring(3);
  const square = ring(4);
  switch (id) {
    // Five domains: lone pairs take the equator.
    case "clf3": return { lone: [equator[1]!, equator[2]!], bonds: [equator[0]!, UP, DOWN] };
    case "xef2": return { lone: equator, bonds: [UP, DOWN] };
    // Six domains: lone pairs opposite each other, or opposite the odd atom.
    case "brf5": return { lone: [DOWN], bonds: [UP, ...square] };
    case "xef4": return { lone: [UP, DOWN], bonds: square };
    case "xeof4": return { lone: [DOWN], bonds: [UP, ...square] };
    // Seven domains.
    case "if7": return { lone: [], bonds: [...ring(5), UP, DOWN] };
    case "xef6": return { lone: [[1 / Math.sqrt(3), 1 / Math.sqrt(3), 1 / Math.sqrt(3)]], bonds: [...square, UP, DOWN] };
    // Four domains.
    case "xeo3": return { lone: [TETRA[0]!], bonds: TETRA.slice(1) };
  }
}

export type HalogensParams = {
  family: GroupFamilyId;
  property: GroupPropertyId;
  oxidant: HalogenId;
  halide: HalideId;
  compound: HalogenCompoundId;
};

export interface HalogensState {
  /** Place down the group, from 1. */
  readonly position: number;
  /** How far the molecule has been turned, radians. */
  readonly yaw: number;
}

export type HalogensResults = {
  family: number;
  position: number;
  Z: number;
  property: number;
  /** The chosen property of the chosen element; 0 with known = 0 where NCERT gives none. */
  value: number;
  known: number;
  radius: number;
  ionisation: number;
  gain: number;
  boiling: number;
  bond: number;
  potential: number;
  pKa: number;
  /** 0 gas, 1 liquid, 2 solid at 298 K. */
  phase: number;
  oxidant: number;
  halide: number;
  /** 1 when the halogen frees the halide's halogen, and E°cell for that reaction, V. */
  displaces: number;
  emf: number;
  compound: number;
  oxidationState: number;
  bondPairs: number;
  lonePairs: number;
  domains: number;
  shape: number;
  hybrid: number;
  /** 1 for a xenon compound, 0 for an interhalogen. */
  xenon: number;
  yaw: number;
};

const OUTPUTS = [
  "family", "position", "Z", "property", "value", "known", "radius", "ionisation", "gain", "boiling", "bond", "potential", "pKa", "phase",
  "oxidant", "halide", "displaces", "emf",
  "compound", "oxidationState", "bondPairs", "lonePairs", "domains", "shape", "hybrid", "xenon", "yaw",
] as const satisfies readonly (keyof HalogensResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const PHASES = ["gas", "liquid", "solid"] as const;
/** How fast play turns the molecule, radians per second. */
const TURN_RATE = 0.8;

export const halogensModel: SimulationModel<HalogensState, HalogensParams, HalogensResults> = {
  id: "halogens",
  defaultParams: { family: "halogens", property: "boiling", oxidant: "cl2", halide: "bromide", compound: "xef4" },
  outputs: OUTPUTS,
  stateVariables: ["position", "yaw"],

  initialize() {
    return { position: 1, yaw: 0.6 };
  },

  advance(state, dt) {
    return { ...state, yaw: (state.yaw + TURN_RATE * dt) % (2 * Math.PI) };
  },

  step(state, params, sign) {
    return { ...state, position: clamp(Math.round(state.position) + sign, 1, groupElements(params.family).length) };
  },

  derive(state, params) {
    const family: GroupFamilyId = params.family === "noble" ? "noble" : "halogens";
    const elements = groupElements(family);
    const position = clamp(Math.round(state.position), 1, elements.length);
    const element = elements[position - 1]!;
    const property = GROUP_PROPERTY_ORDER.includes(params.property) ? params.property : "boiling";
    const value = element[property];

    const oxidant = Math.max(0, HALOGEN_ORDER.indexOf(params.oxidant));
    const halide = Math.max(0, HALIDE_ORDER.indexOf(params.halide));
    const emf = (HALOGEN_ELEMENTS[oxidant]!.potential ?? 0) - (HALOGEN_ELEMENTS[halide]!.potential ?? 0);

    const compoundId = HALOGEN_COMPOUND_ORDER.includes(params.compound) ? params.compound : "xef4";
    const compound = HALOGEN_COMPOUNDS[compoundId];
    const lonePairs = centralLonePairs(compound);
    return {
      family: GROUP_FAMILY_ORDER.indexOf(family),
      position,
      Z: element.Z,
      property: GROUP_PROPERTY_ORDER.indexOf(property),
      value: value ?? 0,
      known: value === null ? 0 : 1,
      radius: element.radius ?? 0,
      ionisation: element.ionisation,
      gain: element.gain,
      boiling: element.boiling,
      bond: element.bond ?? 0,
      potential: element.potential ?? 0,
      pKa: element.pKa ?? 0,
      phase: PHASES.indexOf(element.state),
      oxidant,
      halide,
      displaces: emf > 0 ? 1 : 0,
      emf: Math.round(emf * 100) / 100 || 0,
      compound: HALOGEN_COMPOUND_ORDER.indexOf(compoundId),
      oxidationState: compound.oxidationState,
      bondPairs: compound.atoms.length,
      lonePairs,
      domains: compound.atoms.length + lonePairs,
      shape: HALOGEN_SHAPES.indexOf(compound.shape),
      hybrid: HALOGEN_HYBRIDS.indexOf(compound.hybrid),
      xenon: compound.central === "Xe" ? 1 : 0,
      yaw: state.yaw,
    };
  },

  getVariable(state, id) {
    return id === "position" ? state.position : id === "yaw" ? state.yaw : undefined;
  },

  setVariable(state, id, value) {
    // Up to the longer group's length: a level may set the place before it sets the family.
    if (id === "position") return { ...state, position: clamp(Math.round(value), 1, NOBLE_GASES.length) };
    if (id === "yaw") return { ...state, yaw: value };
    return state;
  },
};
