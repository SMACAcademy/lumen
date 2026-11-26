import type { SimulationModel } from "@ise/science-engine";
import { nameOrganic, organicShortName, type OrganicGraph } from "./organic";

/**
 * Carbon and its compounds, for class 10 (NCERT science, chapter 4).
 *
 * Bonding. Electron-dot structures of small molecules (H₂, Cl₂, O₂, N₂, H₂O,
 * NH₃, CH₄, CO₂, ethane, ethene, ethyne) as data: atoms, shared pairs and
 * lone pairs, with each atom's own electrons marked as dots or crosses.
 * Every atom ends with eight electrons round it (hydrogen two). The three
 * allotropes of carbon — diamond, graphite and fullerene C₆₀ — as a table.
 *
 * Chains. A straight chain of 1–10 carbons, with a double or triple bond at
 * the chain's end, or one functional group: –Cl, –Br, –OH, –CHO, >C=O (on
 * C2) or –COOH. Named the way NCERT's class 10 book names them (propanol,
 * propanone, chloropropane, butene), from the stem and the group's suffix or
 * prefix; where the class 11 namer covers the compound, its full IUPAC name
 * (propan-1-ol, but-1-ene) is given too. Formula and formula mass (C 12,
 * H 1, O 16, Cl 35.5, Br 80 u), and each member is 14 u (one –CH₂–) heavier
 * than the one before. Boiling points of the straight-chain alkanes are
 * measured values.
 *
 * Reactions. Burning the chain compound in a chosen supply of air (balanced
 * with whole numbers; a clean blue flame for a saturated compound with
 * enough air, a sooty yellow one otherwise — NCERT's rule), and nine fixed
 * reactions of ethene, methane, ethanol and ethanoic acid, each with its
 * reagent, condition and any gas given off.
 *
 * Soaps. Soap (sodium stearate, say) in hard water: each Ca²⁺ (or Mg²⁺)
 * takes two soap anions out as insoluble scum, 2RCOO⁻ + Ca²⁺ → (RCOO)₂Ca↓.
 * Only the soap left over can gather into micelles round the oil, and only
 * once there is enough of it — that threshold (2 mmol in the bowl) and the
 * cleaning percentage are illustrative. A detergent's calcium salt is
 * soluble, so it makes no scum.
 */

// ── Electron-dot structures ──────────────────────────────────────────────────

export interface CarbonDotAtom {
  el: string;
  /** Position, in bond lengths, y down. */
  x: number;
  y: number;
  /** Electrons in the outer shell of the free atom. */
  valence: number;
  /** How this atom's own electrons are drawn. */
  own: "dot" | "cross";
  /** Lone pairs on the atom in the molecule. */
  lone: number;
}

export interface CarbonDotBond {
  a: number;
  b: number;
  order: 1 | 2 | 3;
}

export interface CarbonDotMolecule {
  formula: string;
  name: string;
  atoms: CarbonDotAtom[];
  bonds: CarbonDotBond[];
}

export type CarbonMoleculeId = "h2" | "cl2" | "o2" | "n2" | "h2o" | "nh3" | "ch4" | "co2" | "c2h6" | "c2h4" | "c2h2";
export const CARBON_MOLECULE_ORDER: readonly CarbonMoleculeId[] = ["h2", "cl2", "o2", "n2", "h2o", "nh3", "ch4", "co2", "c2h6", "c2h4", "c2h2"];

const VALENCE: Readonly<Record<string, number>> = { H: 1, C: 4, N: 5, O: 6, Cl: 7 };
const at = (el: string, x: number, y: number, own: "dot" | "cross", lone = 0): CarbonDotAtom => ({ el, x, y, valence: VALENCE[el] ?? 0, own, lone });
const bond = (a: number, b: number, order: 1 | 2 | 3 = 1): CarbonDotBond => ({ a, b, order });

export const CARBON_MOLECULES: Readonly<Record<CarbonMoleculeId, CarbonDotMolecule>> = {
  h2: { formula: "H₂", name: "hydrogen", atoms: [at("H", 0, 0, "dot"), at("H", 1, 0, "cross")], bonds: [bond(0, 1)] },
  cl2: { formula: "Cl₂", name: "chlorine", atoms: [at("Cl", 0, 0, "dot", 3), at("Cl", 1, 0, "cross", 3)], bonds: [bond(0, 1)] },
  o2: { formula: "O₂", name: "oxygen", atoms: [at("O", 0, 0, "dot", 2), at("O", 1, 0, "cross", 2)], bonds: [bond(0, 1, 2)] },
  n2: { formula: "N₂", name: "nitrogen", atoms: [at("N", 0, 0, "dot", 1), at("N", 1, 0, "cross", 1)], bonds: [bond(0, 1, 3)] },
  h2o: { formula: "H₂O", name: "water", atoms: [at("O", 0, 0, "dot", 2), at("H", -1, 0, "cross"), at("H", 0, 1, "cross")], bonds: [bond(0, 1), bond(0, 2)] },
  nh3: { formula: "NH₃", name: "ammonia", atoms: [at("N", 0, 0, "dot", 1), at("H", -1, 0, "cross"), at("H", 1, 0, "cross"), at("H", 0, 1, "cross")], bonds: [bond(0, 1), bond(0, 2), bond(0, 3)] },
  ch4: {
    formula: "CH₄",
    name: "methane",
    atoms: [at("C", 0, 0, "dot"), at("H", -1, 0, "cross"), at("H", 1, 0, "cross"), at("H", 0, -1, "cross"), at("H", 0, 1, "cross")],
    bonds: [bond(0, 1), bond(0, 2), bond(0, 3), bond(0, 4)],
  },
  co2: { formula: "CO₂", name: "carbon dioxide", atoms: [at("C", 0, 0, "dot"), at("O", -1, 0, "cross", 2), at("O", 1, 0, "cross", 2)], bonds: [bond(0, 1, 2), bond(0, 2, 2)] },
  c2h6: {
    formula: "C₂H₆",
    name: "ethane",
    atoms: [at("C", 0, 0, "dot"), at("C", 1, 0, "dot"), at("H", -1, 0, "cross"), at("H", 0, -1, "cross"), at("H", 0, 1, "cross"), at("H", 2, 0, "cross"), at("H", 1, -1, "cross"), at("H", 1, 1, "cross")],
    bonds: [bond(0, 1), bond(0, 2), bond(0, 3), bond(0, 4), bond(1, 5), bond(1, 6), bond(1, 7)],
  },
  c2h4: {
    formula: "C₂H₄",
    name: "ethene",
    atoms: [at("C", 0, 0, "dot"), at("C", 1, 0, "dot"), at("H", -0.7, -0.7, "cross"), at("H", -0.7, 0.7, "cross"), at("H", 1.7, -0.7, "cross"), at("H", 1.7, 0.7, "cross")],
    bonds: [bond(0, 1, 2), bond(0, 2), bond(0, 3), bond(1, 4), bond(1, 5)],
  },
  c2h2: {
    formula: "C₂H₂",
    name: "ethyne",
    atoms: [at("C", 0, 0, "dot"), at("C", 1, 0, "dot"), at("H", -1, 0, "cross"), at("H", 2, 0, "cross")],
    bonds: [bond(0, 1, 3), bond(0, 2), bond(1, 3)],
  },
};

export function carbonMolecule(id: string): CarbonDotMolecule {
  return CARBON_MOLECULES[id as CarbonMoleculeId] ?? CARBON_MOLECULES.ch4;
}

/** Electrons round atom i in the molecule: two for every shared pair it is in, two for each lone pair. */
export function carbonElectronsAround(m: CarbonDotMolecule, i: number): number {
  const shared = m.bonds.reduce((s, b) => s + (b.a === i || b.b === i ? b.order : 0), 0);
  return 2 * shared + 2 * m.atoms[i]!.lone;
}

/** Bonds atom i makes (a double bond counts two): its valency in the molecule. */
export function carbonBondsOf(m: CarbonDotMolecule, i: number): number {
  return m.bonds.reduce((s, b) => s + (b.a === i || b.b === i ? b.order : 0), 0);
}

// ── Allotropes ───────────────────────────────────────────────────────────────

export type CarbonAllotropeId = "diamond" | "graphite" | "fullerene";
export const CARBON_ALLOTROPE_ORDER: readonly CarbonAllotropeId[] = ["diamond", "graphite", "fullerene"];

export interface CarbonAllotrope {
  name: string;
  /** Carbon atoms each carbon is bonded to. */
  neighbours: number;
  /** Conducts electricity well. */
  conducts: boolean;
  /** Atoms in one molecule; 0 for a giant structure. */
  atoms: number;
  structure: string;
  property: string;
}

export const CARBON_ALLOTROPES: Readonly<Record<CarbonAllotropeId, CarbonAllotrope>> = {
  diamond: { name: "diamond", neighbours: 4, conducts: false, atoms: 0, structure: "rigid 3D network", property: "hardest natural substance" },
  graphite: { name: "graphite", neighbours: 3, conducts: true, atoms: 0, structure: "flat hexagonal layers", property: "smooth and slippery" },
  fullerene: { name: "fullerene C₆₀", neighbours: 3, conducts: false, atoms: 60, structure: "a closed cage like a football", property: "60 atoms in a closed ball" },
};

// ── Chains and functional groups ─────────────────────────────────────────────

export const CARBON_MAX_CHAIN = 10;

/** Group codes: 0 none, 1 –Cl, 2 –Br, 3 –OH, 4 –CHO, 5 >C=O, 6 –COOH. */
export const CARBON_GROUPS = ["none", "chloro –Cl", "bromo –Br", "alcohol –OH", "aldehyde –CHO", "ketone >C=O", "carboxylic acid –COOH"] as const;

/** Series (class) codes for a chain compound, and for the products of the reactions. */
/** The last entry is for burning, whose carbon product is CO₂, not a chain compound. */
export const CARBON_SERIES = ["alkane", "alkene", "alkyne", "haloalkane", "alcohol", "aldehyde", "ketone", "carboxylic acid", "ester", "salt", "carbon dioxide"] as const;

export const CARBON_PROBLEMS = ["", "a double or triple bond needs two carbons", "a ketone needs at least three carbons", "one change at a time: a multiple bond or a group"] as const;

const STEMS = ["", "meth", "eth", "prop", "but", "pent", "hex", "hept", "oct", "non", "dec"];

/** Formula masses in u, as NCERT's class 10 book uses them. */
export const CARBON_ATOMIC_MASS: Readonly<Record<string, number>> = { C: 12, H: 1, O: 16, Cl: 35.5, Br: 80, Na: 23 };

/** Boiling points of the straight-chain alkanes CₙH₂ₙ₊₂, °C (measured, 1 atm). */
export const CARBON_ALKANE_BP = [Number.NaN, -161.5, -88.6, -42.1, -0.5, 36.1, 68.7, 98.4, 125.7, 150.8, 174.1] as const;

/** Room temperature for "gas or liquid?", °C. */
export const CARBON_ROOM_C = 25;

export interface CarbonChain {
  carbons: number;
  /** 0 single bonds only, 1 a C=C, 2 a C≡C (between C1 and C2). */
  bond: number;
  group: number;
}

export interface CarbonChainInfo {
  chain: CarbonChain;
  /** Index into CARBON_PROBLEMS; 0 means fine. */
  problem: number;
  /** Index into CARBON_SERIES. */
  series: number;
  name: string;
  /** The class 11 IUPAC name, when different from `name` and the namer covers it; else "". */
  iupac: string;
  condensed: string;
  C: number;
  H: number;
  O: number;
  /** Chlorine or bromine atoms. */
  X: number;
  halogen: "" | "Cl" | "Br";
  formula: string;
  mass: number;
  /** Shared electron pairs (covalent bonds, a double bond counting two). */
  pairs: number;
}

const roundInt = (v: number) => Math.round(Number.isFinite(v) ? v : 0);
const clampInt = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, roundInt(v)));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));

const SUBSCRIPT = "₀₁₂₃₄₅₆₇₈₉";
/** "C₃H₈O": digits as subscripts. */
export const carbonSub = (n: number) => String(n).split("").map((d) => SUBSCRIPT[Number(d)]).join("");

export function carbonFormulaText(parts: readonly [string, number][]): string {
  return parts.map(([el, n]) => (n === 0 ? "" : n === 1 ? el : `${el}${carbonSub(n)}`)).join("");
}

/** "CH₂" repeated k times. */
const ch2 = (k: number) => "CH₂".repeat(Math.max(0, k));

/** NCERT-style condensed formula, written out in full: CH₃CH₂CH₂OH, CH₃COCH₃, CH₂=CHCH₃. */
function condensedFormula(n: number, bond: number, group: number): string {
  if (bond === 1) return n === 2 ? "CH₂=CH₂" : `CH₂=CH${ch2(n - 3)}CH₃`;
  if (bond === 2) return n === 2 ? "HC≡CH" : `HC≡C${ch2(n - 3)}CH₃`;
  switch (group) {
    case 1:
    case 2: {
      const x = group === 1 ? "Cl" : "Br";
      return n === 1 ? `CH₃${x}` : `CH₃${ch2(n - 2)}CH₂${x}`;
    }
    case 3: return n === 1 ? "CH₃OH" : `CH₃${ch2(n - 2)}CH₂OH`;
    case 4: return n === 1 ? "HCHO" : `CH₃${ch2(n - 2)}CHO`;
    case 5: return `CH₃CO${ch2(n - 3)}CH₃`;
    case 6: return n === 1 ? "HCOOH" : `CH₃${ch2(n - 2)}COOH`;
    default: return n === 1 ? "CH₄" : `CH₃${ch2(n - 2)}CH₃`;
  }
}

/** The chain as a graph for the class 11 namer (no halogens). */
function chainGraph(n: number, bond: number, group: number): OrganicGraph {
  const carbons = Array.from({ length: n }, () => ({ oh: 0, oxo: false }));
  const bonds = Array.from({ length: n - 1 }, (_, i) => ({ a: i, b: i + 1, order: (i === 0 && bond > 0 ? bond + 1 : 1) as 1 | 2 | 3 }));
  if (group === 3) carbons[0]!.oh = 1;
  if (group === 4) carbons[0]!.oxo = true;
  if (group === 5) carbons[1]!.oxo = true;
  if (group === 6) {
    carbons[0]!.oxo = true;
    carbons[0]!.oh = 1;
  }
  return { carbons, bonds };
}

/** Bring a chain inside its ranges. */
export function carbonNormalise(c: CarbonChain): CarbonChain {
  return { carbons: clampInt(c.carbons, 1, CARBON_MAX_CHAIN), bond: clampInt(c.bond, 0, 2), group: clampInt(c.group, 0, 6) };
}

export function carbonChainInfo(input: CarbonChain): CarbonChainInfo {
  const chain = carbonNormalise(input);
  const { carbons: n, bond, group } = chain;
  const problem = bond > 0 && n < 2 ? 1 : group === 5 && n < 3 ? 2 : bond > 0 && group > 0 ? 3 : 0;
  const stem = STEMS[n]!;
  const series = bond === 1 ? 1 : bond === 2 ? 2 : group === 0 ? 0 : group <= 2 ? 3 : group + 1;

  // Hydrogens from the general formulae: CₙH₂ₙ₊₂ less two for each extra bond, less one for each group.
  let H = 2 * n + 2 - 2 * bond;
  let O = 0;
  let X = 0;
  if (group === 1 || group === 2) {
    H -= 1;
    X = 1;
  } else if (group === 3) O = 1; // C–H becomes C–O–H: same H count
  else if (group === 4 || group === 5) {
    H -= 2;
    O = 1;
  } else if (group === 6) {
    H -= 2;
    O = 2;
  }
  const halogen: CarbonChainInfo["halogen"] = group === 1 ? "Cl" : group === 2 ? "Br" : "";
  const formula = carbonFormulaText([["C", n], ["H", H], ...(halogen ? ([[halogen, X]] as [string, number][]) : []), ["O", O]]);
  const mass = 12 * n + H + 16 * O + (halogen ? CARBON_ATOMIC_MASS[halogen]! * X : 0);
  const pairs = (4 * n + H + 2 * O + X) / 2;

  let name = "";
  if (problem === 0) {
    if (bond === 1) name = `${stem}ene`;
    else if (bond === 2) name = `${stem}yne`;
    else {
      const ane = `${stem}ane`;
      name = [ane, `chloro${ane}`, `bromo${ane}`, `${stem}anol`, `${stem}anal`, `${stem}anone`, `${stem}anoic acid`][group]!;
    }
  }
  let iupac = "";
  if (problem === 0 && !halogen) {
    const full = nameOrganic(chainGraph(n, bond, group)).name;
    if (full !== name && organicShortName(full) !== name) iupac = full;
  }
  return { chain, problem, series, name, iupac, condensed: problem === 0 ? condensedFormula(n, bond, group) : "", C: n, H, O, X, halogen, formula, mass, pairs };
}

// ── Burning ──────────────────────────────────────────────────────────────────

export interface CarbonCombustion {
  /** The fuel can be burnt here (a valid chain with no halogen). */
  ok: boolean;
  /** O₂ per molecule of fuel for complete burning. */
  oxygen: number;
  co2: number;
  water: number;
  /** Whole-number coefficients: fuel, O₂, CO₂, H₂O. */
  coefficients: [number, number, number, number];
  equation: string;
}

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

/** The fuel as written in an equation: the condensed formula when short (CH₃CH₂OH), else the molecular one (C₈H₁₈). */
export function carbonFuelFormula(info: CarbonChainInfo): string {
  return info.condensed && info.condensed.length <= 10 ? info.condensed : info.formula;
}

/** CₓHᵧO_z + (x + y/4 − z/2) O₂ → x CO₂ + y/2 H₂O, in whole numbers. */
export function carbonCombustion(info: CarbonChainInfo): CarbonCombustion {
  const ok = info.problem === 0 && info.X === 0;
  const { C: x, H: y, O: z } = info;
  const oxygen = x + y / 4 - z / 2;
  // Multiply by 4 to clear quarters and halves, then divide out the common factor.
  const raw = [4, 4 * oxygen, 4 * x, 2 * y].map(Math.round);
  const g = raw.reduce((a, b) => gcd(a, b));
  const k = raw.map((v) => v / g) as [number, number, number, number];
  const term = (c: number, f: string) => `${c === 1 ? "" : c}${f}`;
  const equation = ok ? `${term(k[0], carbonFuelFormula(info))} + ${term(k[1], "O₂")} → ${term(k[2], "CO₂")} + ${term(k[3], "H₂O")}` : "";
  return { ok, oxygen, co2: x, water: y / 2, coefficients: k, equation };
}

// ── Fixed reactions ──────────────────────────────────────────────────────────

export type CarbonReactionId =
  | "combustion"
  | "oxidation"
  | "addition"
  | "substitution"
  | "sodium"
  | "dehydration"
  | "esterification"
  | "saponification"
  | "carbonate"
  | "neutralisation";

export const CARBON_REACTION_ORDER: readonly CarbonReactionId[] = [
  "combustion",
  "oxidation",
  "addition",
  "substitution",
  "sodium",
  "dehydration",
  "esterification",
  "saponification",
  "carbonate",
  "neutralisation",
];

export const CARBON_GASES = ["none", "hydrogen", "carbon dioxide", "hydrogen chloride", "ethene"] as const;

export interface CarbonTerm {
  coef: number;
  formula: string;
}

export interface CarbonReaction {
  title: string;
  /** What is added and how — written over the arrow. */
  condition: string;
  reactants: CarbonTerm[];
  products: CarbonTerm[];
  /** Index into CARBON_GASES. */
  gas: number;
  /** Series (CARBON_SERIES) of the main carbon product. */
  product: number;
  /** One line on what you see. */
  observe: string;
}

const t = (coef: number, formula: string): CarbonTerm => ({ coef, formula });

/** NCERT's reactions (class 10, §4.4–4.5). The combustion entry is filled in from the chain. */
export const CARBON_REACTIONS: Readonly<Record<Exclude<CarbonReactionId, "combustion">, CarbonReaction>> = {
  oxidation: {
    title: "Oxidation: ethanol to ethanoic acid",
    condition: "alkaline KMnO₄, heat",
    reactants: [t(1, "CH₃CH₂OH"), t(2, "[O]")],
    products: [t(1, "CH₃COOH"), t(1, "H₂O")],
    gas: 0,
    product: 7,
    observe: "the purple KMnO₄ loses its colour",
  },
  addition: {
    title: "Addition: hydrogen adds to ethene",
    condition: "nickel catalyst, heat",
    reactants: [t(1, "CH₂=CH₂"), t(1, "H₂")],
    products: [t(1, "CH₃CH₃")],
    gas: 0,
    product: 0,
    observe: "how oils are hardened into vanaspati ghee",
  },
  substitution: {
    title: "Substitution: chlorine swaps for H",
    condition: "sunlight",
    reactants: [t(1, "CH₄"), t(1, "Cl₂")],
    products: [t(1, "CH₃Cl"), t(1, "HCl")],
    gas: 3,
    product: 3,
    observe: "fast in sunlight; nothing in the dark",
  },
  sodium: {
    title: "Ethanol and sodium",
    condition: "room temperature",
    reactants: [t(2, "Na"), t(2, "CH₃CH₂OH")],
    products: [t(2, "CH₃CH₂ONa"), t(1, "H₂")],
    gas: 1,
    product: 9,
    observe: "fizzing; the gas burns with a pop",
  },
  dehydration: {
    title: "Ethanol loses water",
    condition: "hot conc. H₂SO₄, 443 K",
    reactants: [t(1, "CH₃CH₂OH")],
    products: [t(1, "CH₂=CH₂"), t(1, "H₂O")],
    gas: 4,
    product: 1,
    observe: "ethene comes off; the acid takes the water",
  },
  esterification: {
    title: "Esterification: acid + alcohol",
    condition: "a few drops of conc. H₂SO₄, warm",
    reactants: [t(1, "CH₃COOH"), t(1, "CH₃CH₂OH")],
    products: [t(1, "CH₃COOCH₂CH₃"), t(1, "H₂O")],
    gas: 0,
    product: 8,
    observe: "a sweet, fruity smell: ethyl ethanoate",
  },
  saponification: {
    title: "Saponification: ester + alkali",
    condition: "NaOH solution, heat",
    reactants: [t(1, "CH₃COOCH₂CH₃"), t(1, "NaOH")],
    products: [t(1, "CH₃CH₂OH"), t(1, "CH₃COONa")],
    gas: 0,
    product: 4,
    observe: "the ester splits back; fats this way give soap",
  },
  carbonate: {
    title: "Ethanoic acid and a carbonate",
    condition: "room temperature",
    reactants: [t(2, "CH₃COOH"), t(1, "Na₂CO₃")],
    products: [t(2, "CH₃COONa"), t(1, "H₂O"), t(1, "CO₂")],
    gas: 2,
    product: 9,
    observe: "fizzing; the gas turns limewater milky",
  },
  neutralisation: {
    title: "Ethanoic acid and an alkali",
    condition: "room temperature",
    reactants: [t(1, "CH₃COOH"), t(1, "NaOH")],
    products: [t(1, "CH₃COONa"), t(1, "H₂O")],
    gas: 0,
    product: 9,
    observe: "salt and water: sodium ethanoate",
  },
};

/** "2Na + 2CH₃CH₂OH → 2CH₃CH₂ONa + H₂". */
export function carbonEquationText(r: Pick<CarbonReaction, "reactants" | "products">): string {
  const side = (terms: readonly CarbonTerm[]) => terms.map((x) => `${x.coef === 1 ? "" : x.coef}${x.formula}`).join(" + ");
  return `${side(r.reactants)} → ${side(r.products)}`;
}

/** The reaction for an id; combustion is built from the chain compound. */
export function carbonReaction(id: string, info: CarbonChainInfo): CarbonReaction {
  if (id !== "combustion" && id in CARBON_REACTIONS) return CARBON_REACTIONS[id as Exclude<CarbonReactionId, "combustion">];
  const burn = carbonCombustion(info);
  const [f, o, c, w] = burn.coefficients;
  return {
    title: burn.ok ? `Burning ${info.name}` : "Burning: pick a compound without Cl or Br",
    condition: "air, a flame",
    reactants: burn.ok ? [t(f, carbonFuelFormula(info)), t(o, "O₂")] : [],
    products: burn.ok ? [t(c, "CO₂"), t(w, "H₂O")] : [],
    gas: burn.ok ? 2 : 0,
    product: 10, // CO₂: burning leaves no chain compound
    observe: "heat and light",
  };
}

// ── Soap and hard water ──────────────────────────────────────────────────────

/** Free soap needed in the bowl before micelles (and lather) form, mmol — illustrative. */
export const CARBON_MICELLE_MMOL = 2;
/** Free soap above the threshold that lifts all the oil, mmol — illustrative. */
export const CARBON_CLEAN_SPAN_MMOL = 4;

export interface CarbonWash {
  /** Calcium (or magnesium) soap thrown out as scum, mmol. */
  scum: number;
  /** Soap used up making scum, mmol. */
  wasted: number;
  /** Soap left free in the water, mmol. */
  free: number;
  micelles: boolean;
  /** Oil lifted off, %. */
  cleaning: number;
  /** Soap to add before any lather appears, mmol. */
  toLather: number;
}

/** 2RCOO⁻Na⁺ + Ca²⁺ → (RCOO)₂Ca↓ + 2Na⁺; a detergent's calcium salt stays dissolved. */
export function carbonWash(added: number, hardness: number, detergent: boolean): CarbonWash {
  const soap = Math.max(0, Number.isFinite(added) ? added : 0);
  const ca = Math.max(0, Number.isFinite(hardness) ? hardness : 0);
  const scum = detergent ? 0 : Math.min(ca, soap / 2);
  const wasted = 2 * scum;
  const free = soap - wasted;
  const micelles = free > CARBON_MICELLE_MMOL + 1e-9;
  const cleaning = 100 * clamp((free - CARBON_MICELLE_MMOL) / CARBON_CLEAN_SPAN_MMOL, 0, 1);
  return { scum, wasted, free, micelles, cleaning, toLather: (detergent ? 0 : 2 * ca) + CARBON_MICELLE_MMOL };
}

// ── The model ────────────────────────────────────────────────────────────────

export type CarbonCleanerId = "soap" | "detergent";

export type CarbonSchoolParams = {
  molecule: CarbonMoleculeId;
  allotrope: CarbonAllotropeId;
  reaction: CarbonReactionId;
  cleaner: CarbonCleanerId;
};

export interface CarbonSchoolState extends CarbonChain {
  /** Air supplied, % of what complete burning needs. */
  air: number;
  /** Soap (or detergent) added, mmol. */
  soap: number;
  /** Ca²⁺ and Mg²⁺ in the water, mmol. */
  hardness: number;
}

export type CarbonSchoolResults = {
  molecule: number;
  sharedPairs: number;
  lonePairs: number;
  valenceElectrons: number;
  singleBonds: number;
  doubleBonds: number;
  tripleBonds: number;
  maxBondOrder: number;
  carbonBonds: number;
  allotrope: number;
  neighbours: number;
  conducts: number;
  atomsPerMolecule: number;
  carbons: number;
  bond: number;
  group: number;
  valid: number;
  problem: number;
  series: number;
  saturated: number;
  hydrogens: number;
  oxygens: number;
  halogens: number;
  formulaMass: number;
  massStep: number;
  chainPairs: number;
  alkaneBoilingPoint: number;
  alkaneGas: number;
  air: number;
  fuelOk: number;
  oxygenNeeded: number;
  co2Made: number;
  waterMade: number;
  complete: number;
  flame: number;
  reaction: number;
  gas: number;
  productSeries: number;
  cleaner: number;
  soap: number;
  hardness: number;
  scum: number;
  soapWasted: number;
  freeSoap: number;
  micelles: number;
  cleaning: number;
  soapToLather: number;
};

const OUTPUTS = [
  "molecule", "sharedPairs", "lonePairs", "valenceElectrons", "singleBonds", "doubleBonds", "tripleBonds", "maxBondOrder", "carbonBonds",
  "allotrope", "neighbours", "conducts", "atomsPerMolecule",
  "carbons", "bond", "group", "valid", "problem", "series", "saturated", "hydrogens", "oxygens", "halogens", "formulaMass", "massStep", "chainPairs",
  "alkaneBoilingPoint", "alkaneGas",
  "air", "fuelOk", "oxygenNeeded", "co2Made", "waterMade", "complete", "flame",
  "reaction", "gas", "productSeries",
  "cleaner", "soap", "hardness", "scum", "soapWasted", "freeSoap", "micelles", "cleaning", "soapToLather",
] as const satisfies readonly (keyof CarbonSchoolResults)[];

export const CARBON_AIR_RANGE = [40, 150] as const;
export const CARBON_SOAP_MAX = 20;
export const CARBON_HARDNESS_MAX = 6;

const z = (v: number) => v || 0;

/** The chain part of the results, back as a chain — for the renderer. */
export function carbonChainFromResults(r: Readonly<Record<string, unknown>>): CarbonChain {
  const n = (k: keyof CarbonChain) => (typeof r[k] === "number" ? (r[k] as number) : 0);
  return { carbons: n("carbons") || 1, bond: n("bond"), group: n("group") };
}

export const carbonSchoolModel: SimulationModel<CarbonSchoolState, CarbonSchoolParams, CarbonSchoolResults> = {
  id: "carbonschool",
  defaultParams: { molecule: "ch4", allotrope: "diamond", reaction: "combustion", cleaner: "soap" },
  outputs: OUTPUTS,
  stateVariables: ["carbons", "bond", "group", "air", "soap", "hardness"],

  initialize() {
    return { carbons: 2, bond: 0, group: 0, air: 120, soap: 0, hardness: 0 };
  },

  /** Play pours soap in, 1 mmol a second. */
  advance(state, dt) {
    return { ...state, soap: Math.min(CARBON_SOAP_MAX, state.soap + dt) };
  },

  step(state, _params, sign) {
    return { ...state, soap: clamp(Math.round(state.soap * 2) / 2 + 0.5 * sign, 0, CARBON_SOAP_MAX) };
  },

  derive(state, params) {
    const m = carbonMolecule(params.molecule);
    const orders = m.bonds.map((b) => b.order);
    const sharedPairs = orders.reduce((s, o) => s + o, 0);
    const lonePairs = m.atoms.reduce((s, a) => s + a.lone, 0);
    const carbonIndex = m.atoms.findIndex((a) => a.el === "C");

    const allotropeId = CARBON_ALLOTROPES[params.allotrope] ? params.allotrope : "diamond";
    const allotrope = CARBON_ALLOTROPES[allotropeId];

    const info = carbonChainInfo(state);
    const valid = info.problem === 0;
    const n = info.chain.carbons;
    const bp = CARBON_ALKANE_BP[n]!;

    const air = clamp(state.air, CARBON_AIR_RANGE[0], CARBON_AIR_RANGE[1]);
    const burn = carbonCombustion(info);
    const saturated = info.chain.bond === 0;
    // NCERT's rule: a clean flame needs a saturated fuel and enough air; a sooty one means unburnt carbon.
    const complete = burn.ok && saturated && air >= 100 - 1e-9;
    const flame = !burn.ok ? 0 : complete ? 1 : 2;

    const reactionId = CARBON_REACTION_ORDER.includes(params.reaction) ? params.reaction : "combustion";
    const reaction = carbonReaction(reactionId, info);

    const detergent = params.cleaner === "detergent";
    const soap = clamp(state.soap, 0, CARBON_SOAP_MAX);
    const hardness = clamp(state.hardness, 0, CARBON_HARDNESS_MAX);
    const wash = carbonWash(soap, hardness, detergent);

    return {
      molecule: Math.max(0, CARBON_MOLECULE_ORDER.indexOf(params.molecule)),
      sharedPairs,
      lonePairs,
      valenceElectrons: m.atoms.reduce((s, a) => s + a.valence, 0),
      singleBonds: orders.filter((o) => o === 1).length,
      doubleBonds: orders.filter((o) => o === 2).length,
      tripleBonds: orders.filter((o) => o === 3).length,
      maxBondOrder: Math.max(...orders),
      carbonBonds: carbonIndex >= 0 ? carbonBondsOf(m, carbonIndex) : 0,

      allotrope: CARBON_ALLOTROPE_ORDER.indexOf(allotropeId),
      neighbours: allotrope.neighbours,
      conducts: allotrope.conducts ? 1 : 0,
      atomsPerMolecule: allotrope.atoms,

      carbons: n,
      bond: info.chain.bond,
      group: info.chain.group,
      valid: valid ? 1 : 0,
      problem: info.problem,
      series: info.series,
      saturated: saturated ? 1 : 0,
      hydrogens: info.H,
      oxygens: info.O,
      halogens: info.X,
      formulaMass: info.mass,
      massStep: 14,
      chainPairs: info.pairs,
      alkaneBoilingPoint: bp,
      alkaneGas: bp < CARBON_ROOM_C ? 1 : 0,

      air,
      fuelOk: burn.ok ? 1 : 0,
      oxygenNeeded: burn.ok ? burn.oxygen : 0,
      co2Made: burn.ok ? burn.co2 : 0,
      waterMade: burn.ok ? burn.water : 0,
      complete: complete ? 1 : 0,
      flame,

      reaction: CARBON_REACTION_ORDER.indexOf(reactionId),
      gas: reaction.gas,
      productSeries: reaction.product,

      cleaner: detergent ? 1 : 0,
      soap,
      hardness,
      scum: z(wash.scum),
      soapWasted: z(wash.wasted),
      freeSoap: z(wash.free),
      micelles: wash.micelles ? 1 : 0,
      cleaning: z(wash.cleaning),
      soapToLather: wash.toLather,
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof CarbonSchoolState] : undefined;
  },

  setVariable(state, id, value) {
    switch (id) {
      case "carbons": return { ...state, carbons: clampInt(value, 1, CARBON_MAX_CHAIN) };
      case "bond": return { ...state, bond: clampInt(value, 0, 2) };
      case "group": return { ...state, group: clampInt(value, 0, 6) };
      case "air": return { ...state, air: clamp(value, CARBON_AIR_RANGE[0], CARBON_AIR_RANGE[1]) };
      case "soap": return { ...state, soap: clamp(value, 0, CARBON_SOAP_MAX) };
      case "hardness": return { ...state, hardness: clamp(value, 0, CARBON_HARDNESS_MAX) };
      default: return state;
    }
  },
};
