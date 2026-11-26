import type { SimulationModel } from "@ise/science-engine";

/**
 * The first twenty elements and the trends that run through them.
 *
 * This model is data, not an equation: measured atomic radii, first
 * ionisation enthalpies, electronegativities and electron gain enthalpies
 * (the values NCERT tabulates). What the lab adds is the view — the same
 * numbers laid out on the periodic table and against atomic number, so the
 * pattern (small and tightly held to the top right, large and loosely held
 * to the bottom left) and its famous exceptions can be seen at a glance.
 * Where a quantity is not defined or not quoted (a noble gas's
 * electronegativity), it is marked missing rather than invented.
 */

export interface Element {
  Z: number;
  symbol: string;
  name: string;
  period: number;
  group: number;
  /** Atomic radius, pm (metallic radius for metals, covalent for non-metals); null where not quoted. */
  radius: number | null;
  /** First ionisation enthalpy, kJ/mol. */
  ionisation: number;
  /** Pauling electronegativity; null for the noble gases. */
  electronegativity: number | null;
  /** Electron gain enthalpy, kJ/mol (negative: energy released); null where not quoted. */
  electronGain: number | null;
}

const E = (
  Z: number,
  symbol: string,
  name: string,
  period: number,
  group: number,
  radius: number | null,
  ionisation: number,
  electronegativity: number | null,
  electronGain: number | null,
): Element => ({ Z, symbol, name, period, group, radius, ionisation, electronegativity, electronGain });

export const ELEMENTS: readonly Element[] = [
  E(1, "H", "Hydrogen", 1, 1, 37, 1312, 2.2, -73),
  E(2, "He", "Helium", 1, 18, null, 2372, null, 48),
  E(3, "Li", "Lithium", 2, 1, 152, 520, 0.98, -60),
  E(4, "Be", "Beryllium", 2, 2, 111, 899, 1.57, null),
  E(5, "B", "Boron", 2, 13, 88, 801, 2.04, -27),
  E(6, "C", "Carbon", 2, 14, 77, 1086, 2.55, -122),
  E(7, "N", "Nitrogen", 2, 15, 74, 1402, 3.04, null),
  E(8, "O", "Oxygen", 2, 16, 66, 1314, 3.44, -141),
  E(9, "F", "Fluorine", 2, 17, 64, 1681, 3.98, -328),
  E(10, "Ne", "Neon", 2, 18, null, 2081, null, 116),
  E(11, "Na", "Sodium", 3, 1, 186, 496, 0.93, -53),
  E(12, "Mg", "Magnesium", 3, 2, 160, 737, 1.31, null),
  E(13, "Al", "Aluminium", 3, 13, 143, 577, 1.61, -44),
  E(14, "Si", "Silicon", 3, 14, 117, 786, 1.9, -134),
  E(15, "P", "Phosphorus", 3, 15, 110, 1012, 2.19, -72),
  E(16, "S", "Sulfur", 3, 16, 104, 1000, 2.58, -200),
  E(17, "Cl", "Chlorine", 3, 17, 99, 1251, 3.16, -349),
  E(18, "Ar", "Argon", 3, 18, null, 1521, null, 96),
  E(19, "K", "Potassium", 4, 1, 231, 419, 0.82, -48),
  E(20, "Ca", "Calcium", 4, 2, 197, 590, 1.0, null),
];

export type PropertyId = "radius" | "ionisation" | "electronegativity" | "electronGain";
export const PROPERTY_ORDER: readonly PropertyId[] = ["radius", "ionisation", "electronegativity", "electronGain"];
export const PROPERTY_LABELS: Record<PropertyId, { name: string; unit: string }> = {
  radius: { name: "Atomic radius", unit: "pm" },
  ionisation: { name: "First ionisation enthalpy", unit: "kJ/mol" },
  electronegativity: { name: "Electronegativity", unit: "" },
  electronGain: { name: "Electron gain enthalpy", unit: "kJ/mol" },
};

/** How many elements play steps through per second. */
export const SWEEP_RATE = 2.5;

export type PeriodicParams = {
  property: PropertyId;
  /**
   * Isotopes: the % of a sample that is the element's most common isotope;
   * the rest is the isotope in focus. Optional, so the trends lab need not set it.
   */
  mix?: number;
};

export interface PeriodicState {
  /** The element in focus, by atomic number (whole numbers; fractions round). */
  readonly Z: number;
  /**
   * Mass number of the isotope in focus. Absent means the most common one;
   * choosing another element drops it unless that element has the same isotope.
   */
  readonly A?: number;
}

export type PeriodicResults = {
  Z: number;
  period: number;
  group: number;
  property: number;
  /** The chosen property for this element, and 1 when it has a value at all. */
  value: number;
  hasValue: number;
  radius: number;
  ionisation: number;
  electronegativity: number;
  electronGain: number;
  /** 1 for the noble gases, which sit outside most of these trends. */
  nobleGas: number;
  /** 1 for metals (groups 1, 2 and aluminium), 0 for the rest. */
  metal: number;
  /** Electrons in the K, L, M and N shells, filled 2, 8, 8 as NCERT's class 9 model does. */
  shellK: number;
  shellL: number;
  shellM: number;
  shellN: number;
  shells: number;
  valenceElectrons: number;
  /** Electrons given, taken or shared to fill the outer shell; 0 for a full one. */
  valency: number;
  protons: number;
  neutrons: number;
  /** Mass number of the most common isotope. */
  massNumber: number;
  /** The isotope in focus (the A control): its mass number and neutrons, A − Z. */
  isotopeMass: number;
  isotopeNeutrons: number;
  /** How many naturally occurring isotopes the element has, and 1 if this one is radioactive. */
  isotopes: number;
  radioactive: number;
  /** A sample: mix % of the most common isotope, the rest the one in focus. */
  mix: number;
  /** The sample's average atomic mass, u, weighting mass numbers by abundance (NCERT class 9). */
  averageMass: number;
};

/** Shell capacities in the class 9 model: 2, then 8, 8, and the rest in N. */
const SHELL_CAPACITY = [2, 8, 8, 18] as const;

/** Mass numbers of each element's most common isotope, Z 1–20. */
export const MASS_NUMBERS: readonly number[] = [1, 4, 7, 9, 11, 12, 14, 16, 19, 20, 23, 24, 27, 28, 31, 32, 35, 40, 39, 40];

/**
 * Mass numbers of the naturally occurring isotopes of Z 1–20: the stable ones,
 * plus tritium, carbon-14 and potassium-40, which are radioactive.
 */
export const ATOM_ISOTOPES: readonly (readonly number[])[] = [
  [1, 2, 3],
  [3, 4],
  [6, 7],
  [9],
  [10, 11],
  [12, 13, 14],
  [14, 15],
  [16, 17, 18],
  [19],
  [20, 21, 22],
  [23],
  [24, 25, 26],
  [27],
  [28, 29, 30],
  [31],
  [32, 33, 34, 36],
  [35, 37],
  [36, 38, 40],
  [39, 40, 41],
  [40, 42, 43, 44, 46, 48],
];

/** The radioactive ones in that list, as "Z-A". */
export const RADIOACTIVE_ISOTOPES: ReadonlySet<string> = new Set(["1-3", "6-14", "19-40"]);

/** The isotopes of element Z, lightest first. */
export function isotopesOf(Z: number): readonly number[] {
  return ATOM_ISOTOPES[elementAt(Z).Z - 1]!;
}

/** The listed isotope of Z nearest to mass number A (the lighter one on a tie). */
export function nearestIsotope(Z: number, A: number): number {
  return isotopesOf(Z).reduce((best, a) => (Math.abs(a - A) < Math.abs(best - A) ? a : best));
}

/** Average mass number of a sample that is `percentCommon` % one isotope and the rest another. */
export function sampleAverageMass(common: number, other: number, percentCommon: number): number {
  const f = Math.min(100, Math.max(0, percentCommon)) / 100;
  return f * common + (1 - f) * other;
}

/** Electrons in each shell, filling from the inside out. */
export function shellsOf(Z: number): number[] {
  const filled: number[] = [];
  let left = Z;
  for (const capacity of SHELL_CAPACITY) {
    if (left <= 0) break;
    const n = Math.min(capacity, left);
    filled.push(n);
    left -= n;
  }
  return filled;
}

/** Valency from the outer shell: give away up to 4, or take the rest to make 8 (2 for the first shell). */
export function valencyOf(Z: number): number {
  const shells = shellsOf(Z);
  const outer = shells[shells.length - 1] ?? 0;
  const full = shells.length === 1 ? 2 : 8;
  if (outer === full) return 0;
  return outer <= 4 ? outer : full - outer;
}

export function elementAt(Z: number): Element {
  const z = Math.round(Math.min(ELEMENTS.length, Math.max(1, Z)));
  return ELEMENTS[z - 1]!;
}

export function propertyOf(e: Element, property: PropertyId): number | null {
  return e[property];
}

const clampZ = (Z: number) => Math.min(ELEMENTS.length, Math.max(1, Z));

/** Move to element Z, keeping the chosen isotope only if the new element has it too. */
function withZ(state: PeriodicState, Z: number): PeriodicState {
  const A = state.A;
  return A !== undefined && isotopesOf(Z).includes(A) ? { Z, A } : { Z };
}

const OUTPUTS = [
  "Z",
  "period",
  "group",
  "property",
  "value",
  "hasValue",
  "radius",
  "ionisation",
  "electronegativity",
  "electronGain",
  "nobleGas",
  "metal",
  "shellK",
  "shellL",
  "shellM",
  "shellN",
  "shells",
  "valenceElectrons",
  "valency",
  "protons",
  "neutrons",
  "massNumber",
  "isotopeMass",
  "isotopeNeutrons",
  "isotopes",
  "radioactive",
  "mix",
  "averageMass",
] as const satisfies readonly (keyof PeriodicResults)[];

export const periodicModel: SimulationModel<PeriodicState, PeriodicParams, PeriodicResults> = {
  id: "periodic",
  defaultParams: { property: "radius", mix: 100 },
  outputs: OUTPUTS,
  stateVariables: ["Z", "A"],

  initialize() {
    return { Z: 3 };
  },

  /** Play walks through the table, element by element, and stops at calcium. */
  advance(state, dt) {
    return withZ(state, clampZ(state.Z + SWEEP_RATE * dt));
  },

  /** A step is one element. */
  step(state, _params, sign) {
    return withZ(state, clampZ(Math.round(state.Z) + sign));
  },

  derive(state, params) {
    const e = elementAt(state.Z);
    const value = propertyOf(e, params.property);
    const shells = shellsOf(e.Z);
    const common = MASS_NUMBERS[e.Z - 1] ?? e.Z;
    const A = state.A === undefined ? common : nearestIsotope(e.Z, state.A);
    const mix = Math.min(100, Math.max(0, Number.isFinite(params.mix) ? (params.mix as number) : 100));
    return {
      Z: e.Z,
      period: e.period,
      group: e.group,
      property: PROPERTY_ORDER.indexOf(params.property),
      value: value ?? 0,
      hasValue: value === null ? 0 : 1,
      radius: e.radius ?? 0,
      ionisation: e.ionisation,
      electronegativity: e.electronegativity ?? 0,
      electronGain: e.electronGain ?? 0,
      nobleGas: e.group === 18 ? 1 : 0,
      metal: e.group <= 2 && e.Z !== 1 ? 1 : e.symbol === "Al" ? 1 : 0,
      shellK: shells[0] ?? 0,
      shellL: shells[1] ?? 0,
      shellM: shells[2] ?? 0,
      shellN: shells[3] ?? 0,
      shells: shells.length,
      valenceElectrons: shells[shells.length - 1] ?? 0,
      valency: valencyOf(e.Z),
      protons: e.Z,
      neutrons: (MASS_NUMBERS[e.Z - 1] ?? e.Z) - e.Z,
      massNumber: MASS_NUMBERS[e.Z - 1] ?? e.Z,
      isotopeMass: A,
      isotopeNeutrons: A - e.Z,
      isotopes: isotopesOf(e.Z).length,
      radioactive: RADIOACTIVE_ISOTOPES.has(`${e.Z}-${A}`) ? 1 : 0,
      mix,
      averageMass: sampleAverageMass(common, A, mix),
    };
  },

  getVariable(state, id) {
    if (id === "Z") return state.Z;
    if (id === "A") return state.A ?? MASS_NUMBERS[elementAt(state.Z).Z - 1];
    return undefined;
  },

  /** Z picks an element; A picks one of its isotopes (snapping to the nearest real one, within 1–48). */
  setVariable(state, id, value) {
    if (id === "Z") return withZ(state, clampZ(Math.round(value)));
    if (id === "A") return { Z: state.Z, A: nearestIsotope(state.Z, Math.min(48, Math.max(1, Math.round(value)))) };
    return state;
  },
};
