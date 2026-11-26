import type { SimulationModel } from "@ise/science-engine";
import { ELEMENTS } from "./periodic";

/**
 * Atoms, molecules and the periodic table, for classes 9 and 10.
 *
 * Seven small calculations, one for each part of the two NCERT chapters:
 *
 *   molecules     atomicity, and molecular mass = Σ atomic masses (u)
 *   formulae      cross the valencies of two ions, cancel any common factor;
 *                 formula unit mass = Σ masses of the ions
 *   the mole      n = m ÷ M, particles = n × 6.022 × 10²³
 *   triads        Döbereiner: middle mass ≈ average of the other two
 *   octaves       Newlands: is every eighth element like the first?
 *   Mendeleev     a gap's oxide from its group valency, his predicted mass
 *                 against the one later measured; pairs that atomic mass
 *                 puts in the wrong order
 *   trends        atomic size, metal or non-metal, and valency along a
 *                 period or down a group
 *
 * Atomic masses are NCERT class 9's rounded values (Cl = 35.5); the masses
 * of the triads, Mendeleev's gaps and the order pairs are class 10's, to
 * one decimal place. Radii up to calcium are the ones the periodic-trends
 * lab uses; heavier ones are NCERT's (Rb 244, Cs 262 pm; Ge 122, Sn 140,
 * Pb 146 pm; Br 114, I 133 pm). Crossing valencies says what formula two
 * ions would make; it does not promise that every pair makes a stable
 * compound.
 */

/** Avogadro's number, as NCERT quotes it. */
export const SA_AVOGADRO = 6.022e23;

/** NCERT class 9 atomic masses, u. */
export const SA_ATOMIC_MASS: Readonly<Record<string, number>> = {
  H: 1,
  He: 4,
  C: 12,
  N: 14,
  O: 16,
  Na: 23,
  Mg: 24,
  Al: 27,
  P: 31,
  S: 32,
  Cl: 35.5,
  Ar: 40,
  K: 39,
  Ca: 40,
  Fe: 56,
  Cu: 63.5,
  Zn: 65,
};

/** Atoms of each element in one particle. */
export type SAComposition = Readonly<Record<string, number>>;

export function saMassOf(atoms: SAComposition): number {
  return Object.entries(atoms).reduce((sum, [symbol, n]) => sum + (SA_ATOMIC_MASS[symbol] ?? 0) * n, 0);
}

const SUBSCRIPTS = "₀₁₂₃₄₅₆₇₈₉";
/** 12 → "₁₂". */
export function saSubscript(n: number): string {
  return String(n)
    .split("")
    .map((d) => SUBSCRIPTS[Number(d)] ?? d)
    .join("");
}

// ── Substances ───────────────────────────────────────────────────────────────

/** What one particle is: 0 an atom, 1 a molecule, 2 a formula unit of an ionic compound. */
export const SA_PARTICLE = { atom: 0, molecule: 1, formulaUnit: 2 } as const;

export interface SASubstance {
  formula: string;
  name: string;
  atoms: SAComposition;
  particle: number;
}

export type SASubstanceId =
  | "he" | "ar" | "c" | "na" | "al"
  | "h2" | "o2" | "n2" | "cl2" | "o3" | "p4" | "s8"
  | "h2o" | "nh3" | "co2" | "ch4" | "nacl";

export const SA_SUBSTANCE_ORDER: readonly SASubstanceId[] = [
  "he", "ar", "c", "na", "al", "h2", "o2", "n2", "cl2", "o3", "p4", "s8", "h2o", "nh3", "co2", "ch4", "nacl",
];

export const SA_SUBSTANCES: Record<SASubstanceId, SASubstance> = {
  he: { formula: "He", name: "Helium", atoms: { He: 1 }, particle: SA_PARTICLE.atom },
  ar: { formula: "Ar", name: "Argon", atoms: { Ar: 1 }, particle: SA_PARTICLE.atom },
  c: { formula: "C", name: "Carbon", atoms: { C: 1 }, particle: SA_PARTICLE.atom },
  na: { formula: "Na", name: "Sodium", atoms: { Na: 1 }, particle: SA_PARTICLE.atom },
  al: { formula: "Al", name: "Aluminium", atoms: { Al: 1 }, particle: SA_PARTICLE.atom },
  h2: { formula: "H₂", name: "Hydrogen gas", atoms: { H: 2 }, particle: SA_PARTICLE.molecule },
  o2: { formula: "O₂", name: "Oxygen gas", atoms: { O: 2 }, particle: SA_PARTICLE.molecule },
  n2: { formula: "N₂", name: "Nitrogen gas", atoms: { N: 2 }, particle: SA_PARTICLE.molecule },
  cl2: { formula: "Cl₂", name: "Chlorine gas", atoms: { Cl: 2 }, particle: SA_PARTICLE.molecule },
  o3: { formula: "O₃", name: "Ozone", atoms: { O: 3 }, particle: SA_PARTICLE.molecule },
  p4: { formula: "P₄", name: "Phosphorus", atoms: { P: 4 }, particle: SA_PARTICLE.molecule },
  s8: { formula: "S₈", name: "Sulphur", atoms: { S: 8 }, particle: SA_PARTICLE.molecule },
  h2o: { formula: "H₂O", name: "Water", atoms: { H: 2, O: 1 }, particle: SA_PARTICLE.molecule },
  nh3: { formula: "NH₃", name: "Ammonia", atoms: { N: 1, H: 3 }, particle: SA_PARTICLE.molecule },
  co2: { formula: "CO₂", name: "Carbon dioxide", atoms: { C: 1, O: 2 }, particle: SA_PARTICLE.molecule },
  ch4: { formula: "CH₄", name: "Methane", atoms: { C: 1, H: 4 }, particle: SA_PARTICLE.molecule },
  nacl: { formula: "NaCl", name: "Sodium chloride", atoms: { Na: 1, Cl: 1 }, particle: SA_PARTICLE.formulaUnit },
};

// ── Ions and formulae ────────────────────────────────────────────────────────

export interface SAIon {
  /** Symbol without the charge, e.g. "SO₄". */
  core: string;
  /** With the charge, e.g. "SO₄²⁻". */
  symbol: string;
  name: string;
  atoms: SAComposition;
  /** Size of the charge: the valency. */
  valency: number;
}

export type SACationId = "na" | "k" | "nh4" | "mg" | "ca" | "zn" | "cu" | "al" | "fe";
export type SAAnionId = "cl" | "oh" | "no3" | "hco3" | "o" | "s" | "co3" | "so4" | "po4";

export const SA_CATION_ORDER: readonly SACationId[] = ["na", "k", "nh4", "mg", "ca", "zn", "cu", "al", "fe"];
export const SA_ANION_ORDER: readonly SAAnionId[] = ["cl", "oh", "no3", "hco3", "o", "s", "co3", "so4", "po4"];

export const SA_CATIONS: Record<SACationId, SAIon> = {
  na: { core: "Na", symbol: "Na⁺", name: "Sodium", atoms: { Na: 1 }, valency: 1 },
  k: { core: "K", symbol: "K⁺", name: "Potassium", atoms: { K: 1 }, valency: 1 },
  nh4: { core: "NH₄", symbol: "NH₄⁺", name: "Ammonium", atoms: { N: 1, H: 4 }, valency: 1 },
  mg: { core: "Mg", symbol: "Mg²⁺", name: "Magnesium", atoms: { Mg: 1 }, valency: 2 },
  ca: { core: "Ca", symbol: "Ca²⁺", name: "Calcium", atoms: { Ca: 1 }, valency: 2 },
  zn: { core: "Zn", symbol: "Zn²⁺", name: "Zinc", atoms: { Zn: 1 }, valency: 2 },
  cu: { core: "Cu", symbol: "Cu²⁺", name: "Copper(II)", atoms: { Cu: 1 }, valency: 2 },
  al: { core: "Al", symbol: "Al³⁺", name: "Aluminium", atoms: { Al: 1 }, valency: 3 },
  fe: { core: "Fe", symbol: "Fe³⁺", name: "Iron(III)", atoms: { Fe: 1 }, valency: 3 },
};

export const SA_ANIONS: Record<SAAnionId, SAIon> = {
  cl: { core: "Cl", symbol: "Cl⁻", name: "Chloride", atoms: { Cl: 1 }, valency: 1 },
  oh: { core: "OH", symbol: "OH⁻", name: "Hydroxide", atoms: { O: 1, H: 1 }, valency: 1 },
  no3: { core: "NO₃", symbol: "NO₃⁻", name: "Nitrate", atoms: { N: 1, O: 3 }, valency: 1 },
  hco3: { core: "HCO₃", symbol: "HCO₃⁻", name: "Hydrogen carbonate", atoms: { H: 1, C: 1, O: 3 }, valency: 1 },
  o: { core: "O", symbol: "O²⁻", name: "Oxide", atoms: { O: 1 }, valency: 2 },
  s: { core: "S", symbol: "S²⁻", name: "Sulphide", atoms: { S: 1 }, valency: 2 },
  co3: { core: "CO₃", symbol: "CO₃²⁻", name: "Carbonate", atoms: { C: 1, O: 3 }, valency: 2 },
  so4: { core: "SO₄", symbol: "SO₄²⁻", name: "Sulphate", atoms: { S: 1, O: 4 }, valency: 2 },
  po4: { core: "PO₄", symbol: "PO₄³⁻", name: "Phosphate", atoms: { P: 1, O: 4 }, valency: 3 },
};

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/**
 * Cross the valencies: each ion takes the other's valency as its count, and
 * any common factor is cancelled. Returns [cations, anions].
 */
export function saCross(cationValency: number, anionValency: number): [number, number] {
  const a = Math.max(1, Math.round(cationValency));
  const b = Math.max(1, Math.round(anionValency));
  const g = gcd(a, b);
  return [b / g, a / g];
}

const atomCount = (atoms: SAComposition) => Object.values(atoms).reduce((s, n) => s + n, 0);

/** One part of a formula: "Al₂", "(SO₄)₃", "NH₄", "Cl₂". */
function part(ion: SAIon, n: number): string {
  if (n === 1) return ion.core;
  return atomCount(ion.atoms) > 1 ? `(${ion.core})${saSubscript(n)}` : `${ion.core}${saSubscript(n)}`;
}

export function saFormulaText(cation: SACationId, anion: SAAnionId): string {
  const c = SA_CATIONS[cation] ?? SA_CATIONS.na;
  const a = SA_ANIONS[anion] ?? SA_ANIONS.cl;
  const [nc, na] = saCross(c.valency, a.valency);
  return part(c, nc) + part(a, na);
}

// ── Döbereiner's triads ──────────────────────────────────────────────────────

export interface SATriad {
  symbols: readonly [string, string, string];
  masses: readonly [number, number, number];
}

export type SATriadId = "li-na-k" | "ca-sr-ba" | "cl-br-i" | "n-p-as";
export const SA_TRIAD_ORDER: readonly SATriadId[] = ["li-na-k", "ca-sr-ba", "cl-br-i", "n-p-as"];

/** NCERT class 10 atomic masses. N, P, As is a family that is not a triad. */
export const SA_TRIADS: Record<SATriadId, SATriad> = {
  "li-na-k": { symbols: ["Li", "Na", "K"], masses: [6.9, 23.0, 39.0] },
  "ca-sr-ba": { symbols: ["Ca", "Sr", "Ba"], masses: [40.1, 87.6, 137.3] },
  "cl-br-i": { symbols: ["Cl", "Br", "I"], masses: [35.5, 79.9, 126.9] },
  "n-p-as": { symbols: ["N", "P", "As"], masses: [14.0, 31.0, 74.9] },
};

/** A middle mass within this percentage of the average counts as a triad. */
export const SA_TRIAD_TOLERANCE = 5;

// ── Newlands' octaves ────────────────────────────────────────────────────────

export interface SAOctaveSlot {
  /** "Co, Ni" where Newlands put two elements in one slot. */
  label: string;
  /** Modern group of the slot's (first) element, used to judge "alike". */
  group: number;
}

const slot = (label: string, group: number): SAOctaveSlot => ({ label, group });

/** Newlands' table as NCERT prints it: seven notes to a row. */
export const SA_OCTAVES: readonly SAOctaveSlot[] = [
  slot("H", 1), slot("Li", 1), slot("Be", 2), slot("B", 13), slot("C", 14), slot("N", 15), slot("O", 16),
  slot("F", 17), slot("Na", 1), slot("Mg", 2), slot("Al", 13), slot("Si", 14), slot("P", 15), slot("S", 16),
  slot("Cl", 17), slot("K", 1), slot("Ca", 2), slot("Cr", 6), slot("Ti", 4), slot("Mn", 7), slot("Fe", 8),
  slot("Co, Ni", 9), slot("Cu", 11), slot("Zn", 12), slot("Y", 3), slot("In", 13), slot("As", 15), slot("Se", 16),
  slot("Br", 17), slot("Rb", 1), slot("Sr", 2), slot("Ce, La", 3), slot("Zr", 4),
];

/** The notes of the Indian scale NCERT uses: sa, re, ga, ma, pa, da, ni. */
export const SA_NOTES: readonly string[] = ["sa", "re", "ga", "ma", "pa", "da", "ni"];
/** Calcium's place in Newlands' list. */
export const SA_CALCIUM_SLOT = 17;

// ── Mendeleev ────────────────────────────────────────────────────────────────

export interface SAGap {
  eka: string;
  /** What filled the gap, and when. */
  element: string;
  symbol: string;
  discovered: number;
  /** Mendeleev's group (I–VIII), which is the valency in its oxide. */
  group: number;
  /** The element above the gap. */
  above: string;
  predicted: number;
  measured: number;
}

export type SAGapId = "eka-boron" | "eka-aluminium" | "eka-silicon";
export const SA_GAP_ORDER: readonly SAGapId[] = ["eka-boron", "eka-aluminium", "eka-silicon"];

export const SA_GAPS: Record<SAGapId, SAGap> = {
  "eka-boron": { eka: "Eka-boron", element: "Scandium", symbol: "Sc", discovered: 1879, group: 3, above: "B", predicted: 44, measured: 45.0 },
  "eka-aluminium": { eka: "Eka-aluminium", element: "Gallium", symbol: "Ga", discovered: 1875, group: 3, above: "Al", predicted: 68, measured: 69.7 },
  "eka-silicon": { eka: "Eka-silicon", element: "Germanium", symbol: "Ge", discovered: 1886, group: 4, above: "Si", predicted: 72, measured: 72.6 },
};

export interface SAOrderPair {
  symbols: readonly [string, string];
  /** Atomic numbers: the first is the smaller. */
  Z: readonly [number, number];
  masses: readonly [number, number];
}

export type SAPairId = "na-mg" | "ar-k" | "co-ni" | "te-i";
export const SA_PAIR_ORDER: readonly SAPairId[] = ["na-mg", "ar-k", "co-ni", "te-i"];

export const SA_PAIRS: Record<SAPairId, SAOrderPair> = {
  "na-mg": { symbols: ["Na", "Mg"], Z: [11, 12], masses: [23.0, 24.3] },
  "ar-k": { symbols: ["Ar", "K"], Z: [18, 19], masses: [39.9, 39.1] },
  "co-ni": { symbols: ["Co", "Ni"], Z: [27, 28], masses: [58.9, 58.7] },
  "te-i": { symbols: ["Te", "I"], Z: [52, 53], masses: [127.6, 126.9] },
};

// ── Trends ───────────────────────────────────────────────────────────────────

/** 0 non-metal, 1 metalloid, 2 metal, 3 noble gas. */
export const SA_CHARACTER = { nonMetal: 0, metalloid: 1, metal: 2, noble: 3 } as const;

export interface SATrendElement {
  symbol: string;
  Z: number;
  period: number;
  group: number;
  /** pm; null for the noble gases, whose radii are not compared. */
  radius: number | null;
  character: number;
}

/** Radius from the periodic-trends lab's table for Z ≤ 20, else NCERT's value given here. */
function trend(symbol: string, Z: number, period: number, group: number, character: number, heavyRadius: number | null = null): SATrendElement {
  const radius = Z <= ELEMENTS.length ? (ELEMENTS[Z - 1]?.radius ?? null) : heavyRadius;
  return { symbol, Z, period, group, radius, character };
}

const { nonMetal, metalloid, metal, noble } = SA_CHARACTER;

export type SASeriesId = "period-2" | "period-3" | "group-1" | "group-14" | "group-17";
export const SA_SERIES_ORDER: readonly SASeriesId[] = ["period-2", "period-3", "group-1", "group-14", "group-17"];

export const SA_SERIES: Record<SASeriesId, readonly SATrendElement[]> = {
  "period-2": [
    trend("Li", 3, 2, 1, metal), trend("Be", 4, 2, 2, metal), trend("B", 5, 2, 13, metalloid), trend("C", 6, 2, 14, nonMetal),
    trend("N", 7, 2, 15, nonMetal), trend("O", 8, 2, 16, nonMetal), trend("F", 9, 2, 17, nonMetal), trend("Ne", 10, 2, 18, noble),
  ],
  "period-3": [
    trend("Na", 11, 3, 1, metal), trend("Mg", 12, 3, 2, metal), trend("Al", 13, 3, 13, metal), trend("Si", 14, 3, 14, metalloid),
    trend("P", 15, 3, 15, nonMetal), trend("S", 16, 3, 16, nonMetal), trend("Cl", 17, 3, 17, nonMetal), trend("Ar", 18, 3, 18, noble),
  ],
  "group-1": [
    trend("Li", 3, 2, 1, metal), trend("Na", 11, 3, 1, metal), trend("K", 19, 4, 1, metal),
    trend("Rb", 37, 5, 1, metal, 244), trend("Cs", 55, 6, 1, metal, 262),
  ],
  "group-14": [
    trend("C", 6, 2, 14, nonMetal), trend("Si", 14, 3, 14, metalloid), trend("Ge", 32, 4, 14, metalloid, 122),
    trend("Sn", 50, 5, 14, metal, 140), trend("Pb", 82, 6, 14, metal, 146),
  ],
  "group-17": [
    trend("F", 9, 2, 17, nonMetal), trend("Cl", 17, 3, 17, nonMetal), trend("Br", 35, 4, 17, nonMetal, 114), trend("I", 53, 5, 17, nonMetal, 133),
  ],
};

/** Outer electrons from the group: 1 and 2, then group − 10; 8 for a noble gas. */
export function saValenceElectrons(group: number): number {
  return group <= 2 ? group : group - 10;
}

/** Valency from the outer electrons: up to 4 given or shared, otherwise 8 minus them; 0 for a full shell. */
export function saValency(valence: number): number {
  if (valence >= 8) return 0;
  return valence <= 4 ? valence : 8 - valence;
}

// ── The model ────────────────────────────────────────────────────────────────

export type SchoolAtomsParams = {
  substance: SASubstanceId;
  cation: SACationId;
  anion: SAAnionId;
  triad: SATriadId;
  gap: SAGapId;
  pair: SAPairId;
  series: SASeriesId;
};

export interface SchoolAtomsState {
  /** Grams weighed out. */
  readonly mass: number;
  /** Place in Newlands' list, 1 to 33. */
  readonly octave: number;
  /** Place along the chosen period or group, from 1. */
  readonly member: number;
}

export const SA_MASS_MAX = 150;
export const SA_MEMBER_MAX = 8;
/** Members walked per second of play. */
export const SA_WALK_RATE = 1.5;

export type SchoolAtomsResults = {
  substance: number;
  atomicity: number;
  particleKind: number;
  elements: number;
  molecularMass: number;
  cation: number;
  anion: number;
  cationValency: number;
  anionValency: number;
  cationCount: number;
  anionCount: number;
  /** 1 when the crossed numbers shared a factor that was cancelled. */
  simplified: number;
  totalPositive: number;
  /** Size of the total negative charge. */
  totalNegative: number;
  formulaMass: number;
  ionsPerUnit: number;
  mass: number;
  molarMass: number;
  moles: number;
  particles: number;
  /** Particles in units of 10²³. */
  particlesE23: number;
  atoms: number;
  atomsE23: number;
  triad: number;
  triadFirst: number;
  triadMiddle: number;
  triadLast: number;
  triadAverage: number;
  /** Middle mass minus the average. */
  triadGap: number;
  /** |gap| as a percentage of the average. */
  triadOff: number;
  isTriad: number;
  octave: number;
  octaveNote: number;
  octaveRow: number;
  eighth: number;
  hasEighth: number;
  alike: number;
  pastCalcium: number;
  gap: number;
  ekaGroup: number;
  ekaPredicted: number;
  ekaMeasured: number;
  ekaError: number;
  ekaOxideMetal: number;
  ekaOxideOxygen: number;
  ekaChloride: number;
  pair: number;
  pairFirstZ: number;
  pairSecondZ: number;
  pairFirstMass: number;
  pairSecondMass: number;
  /** 1 when ordering by atomic mass gives the same order as atomic number. */
  massOrderAgrees: number;
  series: number;
  member: number;
  members: number;
  trendZ: number;
  trendPeriod: number;
  trendGroup: number;
  radius: number;
  hasRadius: number;
  character: number;
  valenceElectrons: number;
  valency: number;
  shells: number;
};

const OUTPUTS = [
  "substance", "atomicity", "particleKind", "elements", "molecularMass",
  "cation", "anion", "cationValency", "anionValency", "cationCount", "anionCount", "simplified", "totalPositive", "totalNegative", "formulaMass", "ionsPerUnit",
  "mass", "molarMass", "moles", "particles", "particlesE23", "atoms", "atomsE23",
  "triad", "triadFirst", "triadMiddle", "triadLast", "triadAverage", "triadGap", "triadOff", "isTriad",
  "octave", "octaveNote", "octaveRow", "eighth", "hasEighth", "alike", "pastCalcium",
  "gap", "ekaGroup", "ekaPredicted", "ekaMeasured", "ekaError", "ekaOxideMetal", "ekaOxideOxygen", "ekaChloride",
  "pair", "pairFirstZ", "pairSecondZ", "pairFirstMass", "pairSecondMass", "massOrderAgrees",
  "series", "member", "members", "trendZ", "trendPeriod", "trendGroup", "radius", "hasRadius", "character", "valenceElectrons", "valency", "shells",
] as const satisfies readonly (keyof SchoolAtomsResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
const round = (v: number, digits: number) => Math.round(v * 10 ** digits) / 10 ** digits;
const index = <T>(order: readonly T[], id: T) => Math.max(0, order.indexOf(id));

export function saSeriesOf(params: Pick<SchoolAtomsParams, "series">): readonly SATrendElement[] {
  return SA_SERIES[params.series] ?? SA_SERIES["period-3"];
}

/** The member actually shown: whole numbers, and no further than the series goes. */
export function saMemberIndex(state: SchoolAtomsState, params: Pick<SchoolAtomsParams, "series">): number {
  return clamp(Math.round(state.member), 1, saSeriesOf(params).length);
}

export const schoolAtomsModel: SimulationModel<SchoolAtomsState, SchoolAtomsParams, SchoolAtomsResults> = {
  id: "schoolatoms",
  defaultParams: { substance: "o2", cation: "al", anion: "so4", triad: "li-na-k", gap: "eka-aluminium", pair: "co-ni", series: "period-3" },
  outputs: OUTPUTS,
  stateVariables: ["mass", "octave", "member"],

  initialize() {
    return { mass: 8, octave: 2, member: 1 };
  },

  /** Play walks along the period or down the group. */
  advance(state, dt, params) {
    return { ...state, member: clamp(state.member + SA_WALK_RATE * dt, 1, saSeriesOf(params).length) };
  },

  /** A step is one element along the period or group. */
  step(state, params, sign) {
    return { ...state, member: clamp(Math.round(state.member) + sign, 1, saSeriesOf(params).length) };
  },

  derive(state, params) {
    // Molecules and the mole.
    const substance = SA_SUBSTANCES[params.substance] ?? SA_SUBSTANCES.o2;
    const molecularMass = round(saMassOf(substance.atoms), 3);
    const atomicity = atomCount(substance.atoms);
    const mass = clamp(state.mass, 0, SA_MASS_MAX);
    const moles = molecularMass > 0 ? mass / molecularMass : 0;
    const particles = moles * SA_AVOGADRO;

    // Formulae.
    const cation = SA_CATIONS[params.cation] ?? SA_CATIONS.al;
    const anion = SA_ANIONS[params.anion] ?? SA_ANIONS.so4;
    const [cationCount, anionCount] = saCross(cation.valency, anion.valency);
    const formulaMass = round(cationCount * saMassOf(cation.atoms) + anionCount * saMassOf(anion.atoms), 3);

    // Triads.
    const triad = SA_TRIADS[params.triad] ?? SA_TRIADS["li-na-k"];
    const [first, middle, last] = triad.masses;
    const triadAverage = round((first + last) / 2, 4);
    const triadGap = round(middle - triadAverage, 4);
    const triadOff = round((Math.abs(triadGap) / triadAverage) * 100, 4);

    // Octaves.
    const octave = clamp(Math.round(state.octave), 1, SA_OCTAVES.length);
    const eighth = octave + 7;
    const hasEighth = eighth <= SA_OCTAVES.length ? 1 : 0;
    const alike = hasEighth && SA_OCTAVES[octave - 1]!.group === SA_OCTAVES[eighth - 1]!.group ? 1 : 0;

    // Mendeleev.
    const gap = SA_GAPS[params.gap] ?? SA_GAPS["eka-aluminium"];
    const [oxideMetal, oxideOxygen] = saCross(gap.group, 2);
    const pair = SA_PAIRS[params.pair] ?? SA_PAIRS["co-ni"];

    // Trends.
    const series = saSeriesOf(params);
    const member = saMemberIndex(state, params);
    const element = series[member - 1]!;
    const valenceElectrons = element.group === 18 ? 8 : saValenceElectrons(element.group);

    return {
      substance: index(SA_SUBSTANCE_ORDER, params.substance),
      atomicity,
      particleKind: substance.particle,
      elements: Object.keys(substance.atoms).length,
      molecularMass,
      cation: index(SA_CATION_ORDER, params.cation),
      anion: index(SA_ANION_ORDER, params.anion),
      cationValency: cation.valency,
      anionValency: anion.valency,
      cationCount,
      anionCount,
      simplified: cationCount !== anion.valency ? 1 : 0,
      totalPositive: cationCount * cation.valency,
      totalNegative: anionCount * anion.valency,
      formulaMass,
      ionsPerUnit: cationCount + anionCount,
      mass,
      molarMass: molecularMass,
      moles,
      particles,
      particlesE23: particles / 1e23,
      atoms: particles * atomicity,
      atomsE23: (particles * atomicity) / 1e23,
      triad: index(SA_TRIAD_ORDER, params.triad),
      triadFirst: first,
      triadMiddle: middle,
      triadLast: last,
      triadAverage,
      triadGap: triadGap || 0,
      triadOff,
      isTriad: triadOff < SA_TRIAD_TOLERANCE ? 1 : 0,
      octave,
      octaveNote: ((octave - 1) % 7) + 1,
      octaveRow: Math.floor((octave - 1) / 7) + 1,
      eighth: hasEighth ? eighth : 0,
      hasEighth,
      alike,
      pastCalcium: eighth > SA_CALCIUM_SLOT ? 1 : 0,
      gap: index(SA_GAP_ORDER, params.gap),
      ekaGroup: gap.group,
      ekaPredicted: gap.predicted,
      ekaMeasured: gap.measured,
      ekaError: round((Math.abs(gap.measured - gap.predicted) / gap.measured) * 100, 4),
      ekaOxideMetal: oxideMetal,
      ekaOxideOxygen: oxideOxygen,
      ekaChloride: gap.group,
      pair: index(SA_PAIR_ORDER, params.pair),
      pairFirstZ: pair.Z[0],
      pairSecondZ: pair.Z[1],
      pairFirstMass: pair.masses[0],
      pairSecondMass: pair.masses[1],
      massOrderAgrees: pair.masses[0] < pair.masses[1] ? 1 : 0,
      series: index(SA_SERIES_ORDER, params.series),
      member,
      members: series.length,
      trendZ: element.Z,
      trendPeriod: element.period,
      trendGroup: element.group,
      radius: element.radius ?? 0,
      hasRadius: element.radius === null ? 0 : 1,
      character: element.character,
      valenceElectrons,
      valency: saValency(valenceElectrons),
      shells: element.period,
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof SchoolAtomsState] : undefined;
  },

  setVariable(state, id, value) {
    switch (id) {
      case "mass":
        return { ...state, mass: clamp(value, 0, SA_MASS_MAX) };
      case "octave":
        return { ...state, octave: clamp(Math.round(value), 1, SA_OCTAVES.length) };
      case "member":
        return { ...state, member: clamp(Math.round(value), 1, SA_MEMBER_MAX) };
      default:
        return state;
    }
  },
};
