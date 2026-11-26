import type { SimulationModel } from "@ise/science-engine";

/**
 * What a formula weighs, what it is made of, and how strong a solution is.
 *
 * Atomic mass: an element's atoms come in isotopes, and the atomic mass on
 * the periodic table is their average, weighted by how common each is.
 * Chlorine is 75.77 % ³⁵Cl and the rest ³⁷Cl, hence 35.45.
 *
 * Formulae: add the atomic masses for the molar mass; each element's share
 * of it is the percentage composition. Divide the atom counts by their
 * highest common factor for the empirical formula — glucose C₆H₁₂O₆ and
 * acetic acid C₂H₄O₂ are both CH₂O. Atomic masses here are H = 1, C = 12,
 * O = 16, as school sums use.
 *
 * Concentration: m grams of solute made up to V mL of solution of density ρ.
 *   molarity   = n / V(L)              changes with temperature, as V does
 *   molality   = n / kg of solvent     does not
 *   mole fraction = n / (n + n_water)
 *   mass %     = 100 m / (Vρ)
 */

export interface IsotopePair {
  symbol: string;
  name: string;
  /** Mass numbers and isotopic masses (u) of the lighter and heavier isotope. */
  light: { A: number; mass: number };
  heavy: { A: number; mass: number };
  /** Natural abundance of the lighter isotope, %. */
  abundance: number;
}

export type IsotopeElementId = "chlorine" | "boron" | "copper" | "bromine" | "lithium";
export const ISOTOPE_ELEMENT_ORDER: readonly IsotopeElementId[] = ["chlorine", "boron", "copper", "bromine", "lithium"];
export const ISOTOPE_ELEMENTS: Record<IsotopeElementId, IsotopePair> = {
  chlorine: { symbol: "Cl", name: "Chlorine", light: { A: 35, mass: 34.969 }, heavy: { A: 37, mass: 36.966 }, abundance: 75.77 },
  boron: { symbol: "B", name: "Boron", light: { A: 10, mass: 10.013 }, heavy: { A: 11, mass: 11.009 }, abundance: 19.9 },
  copper: { symbol: "Cu", name: "Copper", light: { A: 63, mass: 62.93 }, heavy: { A: 65, mass: 64.928 }, abundance: 69.15 },
  bromine: { symbol: "Br", name: "Bromine", light: { A: 79, mass: 78.918 }, heavy: { A: 81, mass: 80.916 }, abundance: 50.69 },
  lithium: { symbol: "Li", name: "Lithium", light: { A: 6, mass: 6.015 }, heavy: { A: 7, mass: 7.016 }, abundance: 7.59 },
};

/** Average atomic mass (u) when `percentLight` % of the atoms are the lighter isotope. */
export function averageAtomicMass(pair: IsotopePair, percentLight: number): number {
  const f = Math.min(100, Math.max(0, percentLight)) / 100;
  return f * pair.light.mass + (1 - f) * pair.heavy.mass;
}

export type FormulaAtoms = { C: number; H: number; O: number };
export const FORMULA_MASSES: FormulaAtoms = { C: 12, H: 1, O: 16 };
const ELEMENTS = ["C", "H", "O"] as const;

export interface FormulaCompound {
  name: string;
  atoms: FormulaAtoms;
}

export type FormulaCompoundId =
  | "water" | "hydrogen-peroxide" | "carbon-dioxide" | "methane" | "ethane" | "ethyne" | "benzene" | "formaldehyde" | "acetic-acid" | "glucose" | "ethanol";
export const FORMULA_COMPOUND_ORDER: readonly FormulaCompoundId[] = [
  "water", "hydrogen-peroxide", "carbon-dioxide", "methane", "ethane", "ethyne", "benzene", "formaldehyde", "acetic-acid", "glucose", "ethanol",
];
export const FORMULA_COMPOUNDS: Record<FormulaCompoundId, FormulaCompound> = {
  water: { name: "Water", atoms: { C: 0, H: 2, O: 1 } },
  "hydrogen-peroxide": { name: "Hydrogen peroxide", atoms: { C: 0, H: 2, O: 2 } },
  "carbon-dioxide": { name: "Carbon dioxide", atoms: { C: 1, H: 0, O: 2 } },
  methane: { name: "Methane", atoms: { C: 1, H: 4, O: 0 } },
  ethane: { name: "Ethane", atoms: { C: 2, H: 6, O: 0 } },
  ethyne: { name: "Ethyne", atoms: { C: 2, H: 2, O: 0 } },
  benzene: { name: "Benzene", atoms: { C: 6, H: 6, O: 0 } },
  formaldehyde: { name: "Formaldehyde", atoms: { C: 1, H: 2, O: 1 } },
  "acetic-acid": { name: "Acetic acid", atoms: { C: 2, H: 4, O: 2 } },
  glucose: { name: "Glucose", atoms: { C: 6, H: 12, O: 6 } },
  ethanol: { name: "Ethanol", atoms: { C: 2, H: 6, O: 1 } },
};

const SUBSCRIPTS = "₀₁₂₃₄₅₆₇₈₉";
const subscript = (n: number) => String(n).split("").map((d) => SUBSCRIPTS[Number(d)]).join("");

/** "C₆H₁₂O₆" from the atom counts. */
export function formulaText(atoms: FormulaAtoms): string {
  return ELEMENTS.map((e) => (atoms[e] === 0 ? "" : e + (atoms[e] === 1 ? "" : subscript(atoms[e])))).join("");
}

export function formulaMass(atoms: FormulaAtoms): number {
  return ELEMENTS.reduce((sum, e) => sum + atoms[e] * FORMULA_MASSES[e], 0);
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** The simplest whole-number ratio, and how many of it make the molecule. */
export function empiricalOf(atoms: FormulaAtoms): { atoms: FormulaAtoms; multiple: number } {
  const multiple = Math.max(1, ELEMENTS.reduce((g, e) => gcd(g, atoms[e]), 0));
  return { atoms: { C: atoms.C / multiple, H: atoms.H / multiple, O: atoms.O / multiple }, multiple };
}

export interface ConcSolute {
  name: string;
  formula: string;
  /** Molar mass, g/mol. */
  M: number;
}

export type ConcSoluteId = "nacl" | "naoh" | "glucose" | "urea" | "h2so4";
export const CONC_SOLUTE_ORDER: readonly ConcSoluteId[] = ["nacl", "naoh", "glucose", "urea", "h2so4"];
export const CONC_SOLUTES: Record<ConcSoluteId, ConcSolute> = {
  nacl: { name: "Sodium chloride", formula: "NaCl", M: 58.5 },
  naoh: { name: "Sodium hydroxide", formula: "NaOH", M: 40 },
  glucose: { name: "Glucose", formula: "C₆H₁₂O₆", M: 180 },
  urea: { name: "Urea", formula: "NH₂CONH₂", M: 60 },
  h2so4: { name: "Sulfuric acid", formula: "H₂SO₄", M: 98 },
};

const WATER_M = 18;
const AVOGADRO_E23 = 6.022;

export type CompositionParams = { element: IsotopeElementId; compound: FormulaCompoundId; solute: ConcSoluteId };

export interface CompositionState {
  /** Percentage of atoms that are the lighter isotope. */
  readonly abundance: number;
  /** Mass of the compound weighed out, g. */
  readonly sample: number;
  /** Mass of solute dissolved, g. */
  readonly soluteMass: number;
  /** Volume the solution is made up to, mL. */
  readonly volume: number;
  /** Density of the solution, g/mL. */
  readonly density: number;
}

export type CompositionResults = {
  element: number;
  abundance: number;
  lightMass: number;
  heavyMass: number;
  averageMass: number;
  naturalAbundance: number;
  naturalMass: number;
  /** 1 when the abundance set is within a percentage point of nature's. */
  atNatural: number;
  compound: number;
  molarMass: number;
  atomsC: number;
  atomsH: number;
  atomsO: number;
  percentC: number;
  percentH: number;
  percentO: number;
  empiricalMass: number;
  /** How many empirical units make one molecule, and whether that is just one. */
  multiple: number;
  isEmpirical: number;
  sample: number;
  moles: number;
  /** Molecules in the sample, in units of 10²³. */
  molecules: number;
  solute: number;
  soluteMolarMass: number;
  soluteMass: number;
  volume: number;
  density: number;
  soluteMoles: number;
  solventMass: number;
  molarity: number;
  molality: number;
  moleFraction: number;
  massPercent: number;
};

const OUTPUTS = [
  "element", "abundance", "lightMass", "heavyMass", "averageMass", "naturalAbundance", "naturalMass", "atNatural",
  "compound", "molarMass", "atomsC", "atomsH", "atomsO", "percentC", "percentH", "percentO", "empiricalMass", "multiple", "isEmpirical",
  "sample", "moles", "molecules",
  "solute", "soluteMolarMass", "soluteMass", "volume", "density", "soluteMoles", "solventMass", "molarity", "molality", "moleFraction", "massPercent",
] as const satisfies readonly (keyof CompositionResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const compositionModel: SimulationModel<CompositionState, CompositionParams, CompositionResults> = {
  id: "composition",
  defaultParams: { element: "chlorine", compound: "glucose", solute: "nacl" },
  outputs: OUTPUTS,
  stateVariables: ["abundance", "sample", "soluteMass", "volume", "density"],

  initialize() {
    return { abundance: 50, sample: 18, soluteMass: 58.5, volume: 1000, density: 1 };
  },

  /** Play sweeps the isotope mix from all-heavy to all-light. */
  advance(state, dt) {
    const next = state.abundance + 10 * dt;
    return { ...state, abundance: next > 100 ? 0 : next };
  },

  step(state, _params, sign) {
    return { ...state, abundance: clamp(Math.round(state.abundance / 5) * 5 + 5 * sign, 0, 100) };
  },

  derive(state, params) {
    const pair = ISOTOPE_ELEMENTS[params.element] ?? ISOTOPE_ELEMENTS.chlorine;
    const abundance = clamp(state.abundance, 0, 100);

    const compound = FORMULA_COMPOUNDS[params.compound] ?? FORMULA_COMPOUNDS.glucose;
    const molarMass = formulaMass(compound.atoms);
    const empirical = empiricalOf(compound.atoms);
    const percent = (e: keyof FormulaAtoms) => (100 * compound.atoms[e] * FORMULA_MASSES[e]) / molarMass;
    const sample = clamp(state.sample, 1, 200);
    const moles = sample / molarMass;

    const solute = CONC_SOLUTES[params.solute] ?? CONC_SOLUTES.nacl;
    const soluteMass = clamp(state.soluteMass, 1, 100);
    const volume = clamp(state.volume, 250, 1000);
    const density = clamp(state.density, 1, 1.4);
    const soluteMoles = soluteMass / solute.M;
    const solventMass = volume * density - soluteMass;

    return {
      element: Math.max(0, ISOTOPE_ELEMENT_ORDER.indexOf(params.element)),
      abundance,
      lightMass: pair.light.mass,
      heavyMass: pair.heavy.mass,
      averageMass: averageAtomicMass(pair, abundance),
      naturalAbundance: pair.abundance,
      naturalMass: averageAtomicMass(pair, pair.abundance),
      atNatural: Math.abs(abundance - pair.abundance) <= 1 ? 1 : 0,
      compound: Math.max(0, FORMULA_COMPOUND_ORDER.indexOf(params.compound)),
      molarMass,
      atomsC: compound.atoms.C,
      atomsH: compound.atoms.H,
      atomsO: compound.atoms.O,
      percentC: percent("C"),
      percentH: percent("H"),
      percentO: percent("O"),
      empiricalMass: formulaMass(empirical.atoms),
      multiple: empirical.multiple,
      isEmpirical: empirical.multiple === 1 ? 1 : 0,
      sample,
      moles,
      molecules: moles * AVOGADRO_E23,
      solute: Math.max(0, CONC_SOLUTE_ORDER.indexOf(params.solute)),
      soluteMolarMass: solute.M,
      soluteMass,
      volume,
      density,
      soluteMoles,
      solventMass,
      molarity: soluteMoles / (volume / 1000),
      molality: soluteMoles / (solventMass / 1000),
      moleFraction: soluteMoles / (soluteMoles + solventMass / WATER_M),
      massPercent: (100 * soluteMass) / (volume * density),
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof CompositionState] : undefined;
  },

  setVariable(state, id, value) {
    switch (id) {
      case "abundance": return { ...state, abundance: clamp(value, 0, 100) };
      case "sample": return { ...state, sample: clamp(value, 1, 200) };
      case "soluteMass": return { ...state, soluteMass: clamp(value, 1, 100) };
      case "volume": return { ...state, volume: clamp(value, 250, 1000) };
      case "density": return { ...state, density: clamp(value, 1, 1.4) };
      default: return state;
    }
  },
};
