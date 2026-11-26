import type { SimulationModel } from "@ise/science-engine";
import {
  nameOrganic,
  organicFormula,
  organicFormulaText,
  organicGraphFromSketch,
  organicHasCisTrans,
  organicMolarMass,
  organicShortName,
  type OrganicGraph,
  type OrganicSketch,
} from "./organic";

/**
 * Alcohols, phenols and ethers; aldehydes, ketones and carboxylic acids
 * (NCERT class 12, units 7 and 8), as data and rules.
 *
 * Alcohols are carbon graphs (the organic-basics namer's own), and the rules
 * act on the graph: the degree is the number of carbons on the carbinol
 * carbon; oxidation turns a CH₂OH into CHO then COOH and a CHOH into C=O;
 * dehydration removes the –OH and a hydrogen from the neighbouring carbon
 * that has fewest hydrogens (Saytzeff); and the products are named by the
 * same IUPAC namer, so the rule's answer can be checked against the book's.
 *
 * Acidity: measured pKa values in water (NCERT's tables for phenol, the
 * nitrophenols, the cresols, ethanol and the carboxylic acids; literature
 * values for 2,4-dinitrophenol and picric acid; typical textbook values for
 * water and the 2° and 3° alcohols).
 *
 * Phenol's ring reactions, Williamson's synthesis and the cleavage of ethers
 * by HI are rules over small tables; the carbonyl reactions are a table of
 * ten substrates × thirteen reagents, decided by rule (aldehyde or ketone,
 * α-hydrogens, an aromatic ring on C=O, a CH₃CO– or CH₃CH(OH)– unit) with
 * each substrate's products written out.
 *
 * Simplified: one product (the major one) per reaction unless the book gives
 * two; conditions as NCERT writes them; reaction rates are not modelled —
 * "Lucas: about 5 minutes" is a typical classroom time.
 */

// ── Shared drawing hints ──────────────────────────────────────────────────────

/** A group on a benzene ring: position 1–6 and what sits there ("OH", "NO2", "Br", "CH3", "COOH", "CHO", "O-"). */
export interface OxyRingGroup {
  pos: number;
  group: string;
}

/**
 * How to draw a compound: a chain sketch (atoms "Ph" for C₆H₅), a benzene
 * ring with groups, or a plain label.
 */
export interface OxyDrawing {
  sketch?: OrganicSketch;
  ring?: OxyRingGroup[];
  label?: string;
}

const chain = (atoms: string, extra: Omit<OrganicSketch, "atoms"> = {}): OrganicSketch => ({ atoms: atoms.split(""), ...extra });
const ohAt = (at: number) => ({ at, atoms: ["O"] });
const oxoAt = (at: number) => ({ at, atoms: ["O"], order: 2 });
const methylAt = (at: number) => ({ at, atoms: ["C"] });
const carboxylAt = (at: number) => [oxoAt(at), ohAt(at)];

// ── Alcohols ──────────────────────────────────────────────────────────────────

export interface OxyAlcohol {
  name: string;
  condensed: string;
  sketch: OrganicSketch;
}

export const OXY_ALCOHOLS: readonly OxyAlcohol[] = [
  { name: "methanol", condensed: "CH₃OH", sketch: chain("CO") },
  { name: "ethanol", condensed: "CH₃CH₂OH", sketch: chain("CCO") },
  { name: "propan-1-ol", condensed: "CH₃CH₂CH₂OH", sketch: chain("CCCO") },
  { name: "propan-2-ol", condensed: "(CH₃)₂CHOH", sketch: chain("CCC", { branches: [ohAt(1)] }) },
  { name: "butan-1-ol", condensed: "CH₃(CH₂)₃OH", sketch: chain("CCCCO") },
  { name: "butan-2-ol", condensed: "CH₃CH(OH)CH₂CH₃", sketch: chain("CCCC", { branches: [ohAt(1)] }) },
  { name: "2-methylpropan-1-ol", condensed: "(CH₃)₂CHCH₂OH", sketch: chain("CCCO", { branches: [methylAt(1)] }) },
  { name: "2-methylpropan-2-ol", condensed: "(CH₃)₃COH", sketch: chain("CCC", { branches: [ohAt(1), methylAt(1)] }) },
];

/** Lucas test (conc. HCl + anhydrous ZnCl₂) at room temperature. */
export const OXY_LUCAS = ["turbid at once", "turbid in about 5 minutes", "no turbidity at room temperature"] as const;
/** Minutes before turbidity appears, by Lucas result (the last never does at room temperature). */
export const OXY_LUCAS_ONSET = [0, 5, Number.POSITIVE_INFINITY] as const;

export const OXY_OXIDATION = ["aldehyde, then carboxylic acid", "ketone", "no reaction (mild oxidants)"] as const;

/** NCERT's dehydration conditions, by degree (1°, 2°, 3°). */
export const OXY_DEHYDRATION: Readonly<Record<1 | 2 | 3, { reagent: string; kelvin: number }>> = {
  1: { reagent: "conc. H₂SO₄", kelvin: 443 },
  2: { reagent: "85% H₃PO₄", kelvin: 440 },
  3: { reagent: "20% H₃PO₄", kelvin: 358 },
};

export interface OxyAlcoholFacts {
  graph: OrganicGraph;
  /** Index of the carbon carrying –OH. */
  carbinol: number;
  /** Carbons bonded to the carbinol carbon: 0 (methanol), 1°, 2°, 3°. */
  degree: number;
  carbinolH: number;
  /** Index into OXY_LUCAS. */
  lucas: number;
  /** Index into OXY_OXIDATION. */
  oxidation: number;
  aldehyde: string | null;
  acid: string | null;
  ketone: string | null;
  /** Major alkene on dehydration (Saytzeff), or null (methanol has no β-carbon). */
  alkene: string | null;
  alkeneCisTrans: boolean;
  dehydration: { reagent: string; kelvin: number } | null;
  /** Has CH₃CH(OH)–: gives iodoform. */
  iodoform: boolean;
  molarMass: number;
  formula: string;
}

const cloneGraph = (g: OrganicGraph): OrganicGraph => ({ carbons: g.carbons.map((c) => ({ ...c })), bonds: g.bonds.map((b) => ({ ...b })) });

function carbonNeighbours(g: OrganicGraph, i: number): { j: number; order: number }[] {
  return g.bonds.flatMap((b) => (b.a === i ? [{ j: b.b, order: b.order }] : b.b === i ? [{ j: b.a, order: b.order }] : []));
}

/** Hydrogens on carbon i. */
export function oxyHydrogens(g: OrganicGraph, i: number): number {
  const c = g.carbons[i]!;
  const used = carbonNeighbours(g, i).reduce((s, n) => s + n.order, 0) + c.oh + (c.oxo ? 2 : 0);
  return Math.max(0, 4 - used);
}

/** The name NCERT would write: locant-free where only one position exists. */
export function oxyName(g: OrganicGraph): string {
  const name = nameOrganic(g).name;
  return organicShortName(name) ?? name;
}

export function oxyAlcoholFacts(alcohol: OxyAlcohol): OxyAlcoholFacts {
  const graph = organicGraphFromSketch(alcohol.sketch);
  const carbinol = graph.carbons.findIndex((c) => c.oh > 0);
  const nbrs = carbonNeighbours(graph, carbinol);
  const degree = nbrs.length;
  const carbinolH = oxyHydrogens(graph, carbinol);

  const oxidised = (oh: number) => {
    const g = cloneGraph(graph);
    g.carbons[carbinol] = { oh, oxo: true };
    return oxyName(g);
  };
  const oxidation = carbinolH >= 2 ? 0 : carbinolH === 1 ? 1 : 2;

  // Saytzeff: the hydrogen goes from the neighbour with fewest hydrogens.
  const beta = nbrs.filter((n) => oxyHydrogens(graph, n.j) > 0).sort((x, y) => oxyHydrogens(graph, x.j) - oxyHydrogens(graph, y.j) || x.j - y.j)[0];
  let alkene: string | null = null;
  let alkeneCisTrans = false;
  if (beta) {
    const g = cloneGraph(graph);
    g.carbons[carbinol] = { oh: 0, oxo: false };
    const bond = g.bonds.find((b) => (b.a === carbinol && b.b === beta.j) || (b.b === carbinol && b.a === beta.j))!;
    bond.order = 2;
    alkene = oxyName(g);
    alkeneCisTrans = organicHasCisTrans(g);
  }

  const iodoform = carbinolH >= 1 && nbrs.some((n) => oxyHydrogens(graph, n.j) === 3);
  const f = organicFormula(graph);
  return {
    graph,
    carbinol,
    degree,
    carbinolH,
    lucas: degree === 3 ? 0 : degree === 2 ? 1 : 2,
    oxidation,
    aldehyde: oxidation === 0 ? oxidised(0) : null,
    acid: oxidation === 0 ? oxidised(1) : null,
    ketone: oxidation === 1 ? oxidised(0) : null,
    alkene,
    alkeneCisTrans,
    dehydration: degree >= 1 && beta ? OXY_DEHYDRATION[Math.min(3, degree) as 1 | 2 | 3] : null,
    iodoform,
    molarMass: organicMolarMass(f),
    formula: organicFormulaText(f),
  };
}

// ── Boiling points ────────────────────────────────────────────────────────────

export const OXY_FAMILIES = ["hydrocarbon", "ether", "alcohol", "phenol"] as const;

export interface OxyBoiling {
  name: string;
  formula: string;
  /** Index into OXY_FAMILIES. */
  family: number;
  /** Normal boiling point, K. */
  kelvin: number;
  atoms: { C: number; H: number; O: number };
  drawing: OxyDrawing;
}

/** Pentane, ethoxyethane and butan-1-ol as NCERT tabulates them; the rest measured values, rounded to 1 K. */
export const OXY_BOILING: readonly OxyBoiling[] = [
  { name: "propane", formula: "CH₃CH₂CH₃", family: 0, kelvin: 231, atoms: { C: 3, H: 8, O: 0 }, drawing: { sketch: chain("CCC") } },
  { name: "methoxymethane", formula: "CH₃OCH₃", family: 1, kelvin: 249, atoms: { C: 2, H: 6, O: 1 }, drawing: { sketch: chain("COC") } },
  { name: "ethanol", formula: "CH₃CH₂OH", family: 2, kelvin: 351, atoms: { C: 2, H: 6, O: 1 }, drawing: { sketch: chain("CCO") } },
  { name: "pentane", formula: "CH₃(CH₂)₃CH₃", family: 0, kelvin: 309.1, atoms: { C: 5, H: 12, O: 0 }, drawing: { sketch: chain("CCCCC") } },
  { name: "ethoxyethane", formula: "C₂H₅OC₂H₅", family: 1, kelvin: 307.6, atoms: { C: 4, H: 10, O: 1 }, drawing: { sketch: chain("CCOCC") } },
  { name: "butan-1-ol", formula: "CH₃(CH₂)₃OH", family: 2, kelvin: 390, atoms: { C: 4, H: 10, O: 1 }, drawing: { sketch: chain("CCCCO") } },
  { name: "methylbenzene", formula: "C₆H₅CH₃", family: 0, kelvin: 384, atoms: { C: 7, H: 8, O: 0 }, drawing: { ring: [{ pos: 1, group: "CH3" }] } },
  { name: "phenol", formula: "C₆H₅OH", family: 3, kelvin: 455, atoms: { C: 6, H: 6, O: 1 }, drawing: { ring: [{ pos: 1, group: "OH" }] } },
];

export const oxyMolarMass = (a: { C: number; H: number; O: number }) => a.C * 12.01 + a.H * 1.008 + a.O * 16.0;

// ── Acidity ──────────────────────────────────────────────────────────────────

export const OXY_ACID_FAMILIES = ["water", "alcohol", "phenol", "carboxylic acid"] as const;
/** Where the conjugate base's charge goes. */
export const OXY_ANION_SPREAD = ["stays on one O", "spread round the ring (o, p)", "shared by two equal O"] as const;

export interface OxyAcid {
  name: string;
  formula: string;
  /** pKa in water at 298 K. */
  pKa: number;
  /** Index into OXY_ACID_FAMILIES. */
  family: number;
  /** What the substituent does, in a few words (empty for the parent). */
  effect: string;
  drawing: OxyDrawing;
}

const halos = (el: string, at: number, n: number) => Array.from({ length: n }, () => ({ at, atoms: [el] }));

/** NCERT's values for phenol, the nitrophenols, the cresols, ethanol and the carboxylic acids; 2,4-dinitrophenol and picric acid are literature values (picric acid is quoted between 0.4 and 0.7); water and the 2°, 3° alcohols are typical textbook values. */
export const OXY_ACIDS: readonly OxyAcid[] = [
  { name: "water", formula: "H₂O", pKa: 15.7, family: 0, effect: "", drawing: { label: "H₂O" } },
  { name: "ethanol", formula: "CH₃CH₂OH", pKa: 15.9, family: 1, effect: "+I of the ethyl group crowds the charge on O", drawing: { sketch: chain("CCO") } },
  { name: "propan-2-ol", formula: "(CH₃)₂CHOH", pKa: 17.1, family: 1, effect: "two alkyl groups (+I): weaker still", drawing: { sketch: chain("CCC", { branches: [ohAt(1)] }) } },
  { name: "2-methylpropan-2-ol", formula: "(CH₃)₃COH", pKa: 18.0, family: 1, effect: "three alkyl groups (+I): the weakest", drawing: { sketch: chain("CCC", { branches: [ohAt(1), methylAt(1)] }) } },
  { name: "phenol", formula: "C₆H₅OH", pKa: 10.0, family: 2, effect: "", drawing: { ring: [{ pos: 1, group: "OH" }] } },
  { name: "2-nitrophenol", formula: "o-O₂NC₆H₄OH", pKa: 7.2, family: 2, effect: "–NO₂ at ortho: −R and −I draw the charge out", drawing: { ring: [{ pos: 1, group: "OH" }, { pos: 2, group: "NO2" }] } },
  { name: "3-nitrophenol", formula: "m-O₂NC₆H₄OH", pKa: 8.3, family: 2, effect: "–NO₂ at meta: −I only, no resonance there", drawing: { ring: [{ pos: 1, group: "OH" }, { pos: 3, group: "NO2" }] } },
  { name: "4-nitrophenol", formula: "p-O₂NC₆H₄OH", pKa: 7.1, family: 2, effect: "–NO₂ at para: −R and −I draw the charge out", drawing: { ring: [{ pos: 1, group: "OH" }, { pos: 4, group: "NO2" }] } },
  { name: "2,4-dinitrophenol", formula: "2,4-(O₂N)₂C₆H₃OH", pKa: 4.0, family: 2, effect: "two –NO₂ at o and p: much stronger", drawing: { ring: [{ pos: 1, group: "OH" }, { pos: 2, group: "NO2" }, { pos: 4, group: "NO2" }] } },
  { name: "2,4,6-trinitrophenol", formula: "picric acid", pKa: 0.71, family: 2, effect: "three –NO₂ at o, o, p: as strong as many acids", drawing: { ring: [{ pos: 1, group: "OH" }, { pos: 2, group: "NO2" }, { pos: 4, group: "NO2" }, { pos: 6, group: "NO2" }] } },
  { name: "2-methylphenol", formula: "o-cresol", pKa: 10.2, family: 2, effect: "–CH₃ (+I) pushes charge back: weaker", drawing: { ring: [{ pos: 1, group: "OH" }, { pos: 2, group: "CH3" }] } },
  { name: "3-methylphenol", formula: "m-cresol", pKa: 10.1, family: 2, effect: "–CH₃ (+I) pushes charge back: weaker", drawing: { ring: [{ pos: 1, group: "OH" }, { pos: 3, group: "CH3" }] } },
  { name: "4-methylphenol", formula: "p-cresol", pKa: 10.2, family: 2, effect: "–CH₃ (+I) pushes charge back: weaker", drawing: { ring: [{ pos: 1, group: "OH" }, { pos: 4, group: "CH3" }] } },
  { name: "methanoic acid", formula: "HCOOH", pKa: 3.75, family: 3, effect: "", drawing: { sketch: { atoms: ["C"], branches: carboxylAt(0) } } },
  { name: "ethanoic acid", formula: "CH₃COOH", pKa: 4.76, family: 3, effect: "+I of –CH₃: weaker than HCOOH", drawing: { sketch: { atoms: ["C", "C"], branches: carboxylAt(1) } } },
  { name: "propanoic acid", formula: "CH₃CH₂COOH", pKa: 4.88, family: 3, effect: "+I of –C₂H₅: a little weaker again", drawing: { sketch: { atoms: ["C", "C", "C"], branches: carboxylAt(2) } } },
  { name: "benzoic acid", formula: "C₆H₅COOH", pKa: 4.19, family: 3, effect: "sp² phenyl pulls (−I): stronger than CH₃COOH", drawing: { ring: [{ pos: 1, group: "COOH" }] } },
  { name: "chloroethanoic acid", formula: "ClCH₂COOH", pKa: 2.86, family: 3, effect: "–Cl (−I) spreads the charge: stronger", drawing: { sketch: { atoms: ["C", "C"], branches: [...halos("Cl", 0, 1), ...carboxylAt(1)] } } },
  { name: "trichloroethanoic acid", formula: "Cl₃CCOOH", pKa: 0.64, family: 3, effect: "three Cl (−I): much stronger", drawing: { sketch: { atoms: ["C", "C"], branches: [...halos("Cl", 0, 3), ...carboxylAt(1)] } } },
  { name: "trifluoroethanoic acid", formula: "CF₃COOH", pKa: 0.23, family: 3, effect: "three F, the strongest −I pull", drawing: { sketch: { atoms: ["C", "C"], branches: [...halos("F", 0, 3), ...carboxylAt(1)] } } },
];

// ── Phenol's reactions ───────────────────────────────────────────────────────

export interface OxyPhenolReaction {
  name: string;
  reagent: string;
  /** One or two product rings (two for an o/p mixture), with what each is called. */
  products: { ring: OxyRingGroup[]; name: string; tag?: string }[];
  observation: string;
  /** The electrophile, for ring substitutions. */
  electrophile: string;
}

const phenolWith = (...extra: OxyRingGroup[]): OxyRingGroup[] => [{ pos: 1, group: "OH" }, ...extra];

export const OXY_PHENOL_REACTIONS: readonly OxyPhenolReaction[] = [
  {
    name: "bromine water",
    reagent: "Br₂(aq)",
    products: [{ ring: phenolWith({ pos: 2, group: "Br" }, { pos: 4, group: "Br" }, { pos: 6, group: "Br" }), name: "2,4,6-tribromophenol" }],
    observation: "white precipitate at once",
    electrophile: "Br⁺ (Br₂ polarised by the ring)",
  },
  {
    name: "bromine in CS₂",
    reagent: "Br₂ in CS₂, 273 K",
    products: [
      { ring: phenolWith({ pos: 4, group: "Br" }), name: "4-bromophenol", tag: "major" },
      { ring: phenolWith({ pos: 2, group: "Br" }), name: "2-bromophenol", tag: "minor" },
    ],
    observation: "monobromophenols only",
    electrophile: "Br⁺ (Br₂ polarised by the ring)",
  },
  {
    name: "dilute nitric acid",
    reagent: "dil. HNO₃, 298 K",
    products: [
      { ring: phenolWith({ pos: 2, group: "NO2" }), name: "2-nitrophenol" },
      { ring: phenolWith({ pos: 4, group: "NO2" }), name: "4-nitrophenol" },
    ],
    observation: "o- and p-nitrophenol, parted by steam",
    electrophile: "NO₂⁺",
  },
  {
    name: "concentrated nitric acid",
    reagent: "conc. HNO₃",
    products: [{ ring: phenolWith({ pos: 2, group: "NO2" }, { pos: 4, group: "NO2" }, { pos: 6, group: "NO2" }), name: "2,4,6-trinitrophenol" }],
    observation: "picric acid, yellow",
    electrophile: "NO₂⁺",
  },
  {
    name: "Kolbe's reaction",
    reagent: "NaOH; CO₂, 400 K, 4–7 atm; H⁺",
    products: [{ ring: phenolWith({ pos: 2, group: "COOH" }), name: "2-hydroxybenzoic acid" }],
    observation: "salicylic acid",
    electrophile: "CO₂ (attacks the phenoxide ion)",
  },
  {
    name: "Reimer–Tiemann reaction",
    reagent: "CHCl₃ + aq. NaOH, 340 K; H⁺",
    products: [{ ring: phenolWith({ pos: 2, group: "CHO" }), name: "2-hydroxybenzaldehyde" }],
    observation: "salicylaldehyde",
    electrophile: ":CCl₂ (dichlorocarbene)",
  },
  {
    name: "sodium hydroxide",
    reagent: "NaOH(aq)",
    products: [{ ring: [{ pos: 1, group: "O-" }], name: "sodium phenoxide" }],
    observation: "dissolves: phenol is an acid",
    electrophile: "",
  },
  {
    name: "zinc dust",
    reagent: "Zn dust, heat",
    products: [{ ring: [], name: "benzene" }],
    observation: "the –OH is removed",
    electrophile: "",
  },
];

// ── Ethers ───────────────────────────────────────────────────────────────────

/** Alkyl and aryl groups: methyl, ethyl, isopropyl, tert-butyl, phenyl. */
/** Written as they read on the left of a bond ("(CH₃)₃C–") and on the right ("–C(CH₃)₃"). */
export const OXY_GROUPS = [
  { formula: "CH₃", right: "CH₃", name: "methyl", degree: 0 },
  { formula: "C₂H₅", right: "C₂H₅", name: "ethyl", degree: 1 },
  { formula: "(CH₃)₂CH", right: "CH(CH₃)₂", name: "isopropyl", degree: 2 },
  { formula: "(CH₃)₃C", right: "C(CH₃)₃", name: "tert-butyl", degree: 3 },
  { formula: "C₆H₅", right: "C₆H₅", name: "phenyl", degree: -1 },
] as const;

/** Halides R–Br, by group (index into OXY_GROUPS). */
export const OXY_HALIDES = [0, 1, 2, 3, 4] as const;
/** Sodium alkoxides and phenoxide R′O⁻Na⁺, by group. */
export const OXY_ALKOXIDES = [0, 1, 3, 4] as const;

export const OXY_WILLIAMSON = ["ether (SN2)", "ether + alkene (elimination competes)", "alkene only (elimination)", "no reaction"] as const;

/** Alkenes from losing HBr, by halide group. */
const ALKENE_FROM: Readonly<Record<number, string>> = { 1: "CH₂=CH₂", 2: "CH₃CH=CH₂", 3: "(CH₃)₂C=CH₂" };

/** IUPAC names of the ethers, by the two groups (smaller index first). */
const ETHER_NAMES: Readonly<Record<string, string>> = {
  "0,0": "methoxymethane",
  "0,1": "methoxyethane",
  "0,2": "2-methoxypropane",
  "0,3": "2-methoxy-2-methylpropane",
  "0,4": "methoxybenzene",
  "1,1": "ethoxyethane",
  "1,2": "2-ethoxypropane",
  "1,3": "2-ethoxy-2-methylpropane",
  "1,4": "ethoxybenzene",
  "2,3": "2-methyl-2-(propan-2-yloxy)propane",
  "2,4": "(propan-2-yloxy)benzene",
};

/** A code for the ether made from groups a and b: 10 × (smaller + 1) + (larger + 1); 0 for none. */
export const oxyEtherCode = (a: number, b: number) => 10 * (Math.min(a, b) + 1) + Math.max(a, b) + 1;

export interface OxyWilliamson {
  outcome: number;
  ether: string | null;
  etherName: string | null;
  etherCode: number;
  alkene: string | null;
  why: string;
}

/** R–Br + R′O⁻Na⁺: the alkoxide attacks the halide's carbon (SN2) or takes a β-H (E2). */
export function oxyWilliamson(halideGroup: number, alkoxideGroup: number): OxyWilliamson {
  const h = OXY_GROUPS[halideGroup]!;
  const o = OXY_GROUPS[alkoxideGroup]!;
  const ether = `${o.formula}–O–${h.right}`;
  const key = `${Math.min(halideGroup, alkoxideGroup)},${Math.max(halideGroup, alkoxideGroup)}`;
  const name = ETHER_NAMES[key] ?? null;
  if (h.degree < 0) return { outcome: 3, ether: null, etherName: null, etherCode: 0, alkene: null, why: "an aryl halide does not undergo SN2" };
  if (h.degree === 3) return { outcome: 2, ether: null, etherName: null, etherCode: 0, alkene: ALKENE_FROM[3]!, why: "a 3° carbon is too crowded: the alkoxide takes a β-H" };
  if (h.degree === 2) return { outcome: 1, ether, etherName: name, etherCode: oxyEtherCode(halideGroup, alkoxideGroup), alkene: ALKENE_FROM[2]!, why: "a 2° halide: elimination competes" };
  return { outcome: 0, ether, etherName: name, etherCode: oxyEtherCode(halideGroup, alkoxideGroup), alkene: null, why: "a methyl or 1° halide: clean SN2" };
}

/** Ethers for cleavage by HI, as their two groups. */
export const OXY_ETHERS: readonly (readonly [number, number])[] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [4, 0],
  [1, 1],
];

export const OXY_CLEAVAGE = ["", "SN2: I⁻ attacks the less crowded carbon", "SN1: the 3° carbocation forms"] as const;

export interface OxyCleavage {
  ether: string;
  /** Group (index into OXY_GROUPS) that leaves as the iodide, and the one that stays on O as the alcohol or phenol. */
  iodide: number;
  alcohol: number;
  /** 1 SN2, 2 SN1. */
  mechanism: number;
  products: string;
}

const iodideOf = (g: number) => `${OXY_GROUPS[g]!.formula}I`;
const alcoholOf = (g: number) => `${OXY_GROUPS[g]!.formula}OH`;

/** R–O–R′ + HI (one equivalent): which side becomes the iodide. */
export function oxyCleave(a: number, b: number): OxyCleavage {
  const ga = OXY_GROUPS[a]!;
  const gb = OXY_GROUPS[b]!;
  let iodide: number;
  let mechanism: number;
  if (ga.degree < 0 || gb.degree < 0) {
    // The O–aryl bond has partial double-bond character and is not broken: phenol and an alkyl iodide.
    iodide = ga.degree < 0 ? b : a;
    mechanism = 1;
  } else if (ga.degree === 3 || gb.degree === 3) {
    iodide = ga.degree === 3 ? a : b;
    mechanism = 2;
  } else {
    iodide = ga.degree <= gb.degree ? a : b;
    mechanism = 1;
  }
  const alcohol = iodide === a ? b : a;
  return { ether: `${ga.formula}–O–${gb.right}`, iodide, alcohol, mechanism, products: `${iodideOf(iodide)} + ${alcoholOf(alcohol)}` };
}

// ── Carbonyl compounds and their reactions ───────────────────────────────────

/** 0 an alcohol, 1 aldehyde, 2 ketone, 3 carboxylic acid. */
export const OXY_CARBONYL_TYPES = ["alcohol", "aldehyde", "ketone", "carboxylic acid"] as const;

export interface OxySubstrate {
  name: string;
  formula: string;
  type: number;
  /** Hydrogens on carbons next to C=O (or to –COOH). */
  alphaH: number;
  /** A benzene ring joined to the carbonyl carbon. */
  aromatic: boolean;
  /** Carbon groups on the carbonyl (or carbinol) carbon. */
  carbonGroups: number;
  /** CH₃CO– or CH₃CH(OH)– joined to H or C: gives iodoform. */
  methylCarbonyl: boolean;
  /** For aldehydes and ketones: the two groups on C=O, as written ("H", "CH₃", "C₆H₅"). */
  groups?: readonly [string, string];
  drawing: OxyDrawing;
  /** Products, written out (null where the reaction does not apply). */
  carboxylate?: string;
  oxidised?: { formula: string; name: string };
  reduced?: { formula: string; name: string };
  cyanohydrin?: { formula: string; name: string };
  grignard?: { formula: string; name: string; degree: number };
  aldol?: { formula: string; name: string };
  cannizzaro?: string;
  haloformSalt?: string;
}

/** Sketch atoms "Ph" are a C₆H₅ group. */
export const OXY_SUBSTRATES: readonly OxySubstrate[] = [
  {
    name: "methanal",
    formula: "HCHO",
    type: 1,
    alphaH: 0,
    aromatic: false,
    carbonGroups: 0,
    methylCarbonyl: false,
    groups: ["H", "H"],
    drawing: { sketch: { atoms: ["C", "O"], orders: [2] } },
    carboxylate: "HCOO⁻",
    oxidised: { formula: "HCOOH", name: "methanoic acid" },
    reduced: { formula: "CH₄", name: "methane" },
    cyanohydrin: { formula: "HOCH₂CN", name: "hydroxyethanenitrile" },
    grignard: { formula: "CH₃CH₂OH", name: "ethanol", degree: 1 },
    cannizzaro: "CH₃OH + HCOO⁻Na⁺",
  },
  {
    name: "ethanal",
    formula: "CH₃CHO",
    type: 1,
    alphaH: 3,
    aromatic: false,
    carbonGroups: 1,
    methylCarbonyl: true,
    groups: ["CH₃", "H"],
    drawing: { sketch: { atoms: ["C", "C", "O"], orders: [1, 2] } },
    carboxylate: "CH₃COO⁻",
    oxidised: { formula: "CH₃COOH", name: "ethanoic acid" },
    reduced: { formula: "CH₃CH₃", name: "ethane" },
    cyanohydrin: { formula: "CH₃CH(OH)CN", name: "2-hydroxypropanenitrile" },
    grignard: { formula: "CH₃CH(OH)CH₃", name: "propan-2-ol", degree: 2 },
    aldol: { formula: "CH₃CH(OH)CH₂CHO", name: "3-hydroxybutanal" },
    haloformSalt: "HCOO⁻Na⁺",
  },
  {
    name: "propanal",
    formula: "CH₃CH₂CHO",
    type: 1,
    alphaH: 2,
    aromatic: false,
    carbonGroups: 1,
    methylCarbonyl: false,
    groups: ["C₂H₅", "H"],
    drawing: { sketch: { atoms: ["C", "C", "C", "O"], orders: [1, 1, 2] } },
    carboxylate: "CH₃CH₂COO⁻",
    oxidised: { formula: "CH₃CH₂COOH", name: "propanoic acid" },
    reduced: { formula: "CH₃CH₂CH₃", name: "propane" },
    cyanohydrin: { formula: "CH₃CH₂CH(OH)CN", name: "2-hydroxybutanenitrile" },
    grignard: { formula: "CH₃CH₂CH(OH)CH₃", name: "butan-2-ol", degree: 2 },
    aldol: { formula: "CH₃CH₂CH(OH)CH(CH₃)CHO", name: "3-hydroxy-2-methylpentanal" },
  },
  {
    name: "benzaldehyde",
    formula: "C₆H₅CHO",
    type: 1,
    alphaH: 0,
    aromatic: true,
    carbonGroups: 1,
    methylCarbonyl: false,
    groups: ["C₆H₅", "H"],
    drawing: { sketch: { atoms: ["Ph", "C", "O"], orders: [1, 2] } },
    carboxylate: "C₆H₅COO⁻",
    oxidised: { formula: "C₆H₅COOH", name: "benzoic acid" },
    reduced: { formula: "C₆H₅CH₃", name: "methylbenzene" },
    cyanohydrin: { formula: "C₆H₅CH(OH)CN", name: "2-hydroxy-2-phenylethanenitrile" },
    grignard: { formula: "C₆H₅CH(OH)CH₃", name: "1-phenylethanol", degree: 2 },
    cannizzaro: "C₆H₅CH₂OH + C₆H₅COO⁻Na⁺",
  },
  {
    name: "propanone",
    formula: "CH₃COCH₃",
    type: 2,
    alphaH: 6,
    aromatic: false,
    carbonGroups: 2,
    methylCarbonyl: true,
    groups: ["CH₃", "CH₃"],
    drawing: { sketch: { atoms: ["C", "C", "C"], branches: [oxoAt(1)] } },
    reduced: { formula: "CH₃CH₂CH₃", name: "propane" },
    cyanohydrin: { formula: "(CH₃)₂C(OH)CN", name: "2-hydroxy-2-methylpropanenitrile" },
    grignard: { formula: "(CH₃)₃COH", name: "2-methylpropan-2-ol", degree: 3 },
    aldol: { formula: "(CH₃)₂C(OH)CH₂COCH₃", name: "4-hydroxy-4-methylpentan-2-one" },
    haloformSalt: "CH₃COO⁻Na⁺",
  },
  {
    name: "1-phenylethanone",
    formula: "C₆H₅COCH₃",
    type: 2,
    alphaH: 3,
    aromatic: true,
    carbonGroups: 2,
    methylCarbonyl: true,
    groups: ["C₆H₅", "CH₃"],
    drawing: { sketch: { atoms: ["Ph", "C", "C"], branches: [oxoAt(1)] } },
    reduced: { formula: "C₆H₅CH₂CH₃", name: "ethylbenzene" },
    cyanohydrin: { formula: "C₆H₅C(OH)(CH₃)CN", name: "2-hydroxy-2-phenylpropanenitrile" },
    grignard: { formula: "C₆H₅C(OH)(CH₃)₂", name: "2-phenylpropan-2-ol", degree: 3 },
    aldol: { formula: "C₆H₅C(OH)(CH₃)CH₂COC₆H₅", name: "3-hydroxy-1,3-diphenylbutan-1-one" },
    haloformSalt: "C₆H₅COO⁻Na⁺",
  },
  {
    name: "pentan-3-one",
    formula: "C₂H₅COC₂H₅",
    type: 2,
    alphaH: 4,
    aromatic: false,
    carbonGroups: 2,
    methylCarbonyl: false,
    groups: ["C₂H₅", "C₂H₅"],
    drawing: { sketch: { atoms: ["C", "C", "C", "C", "C"], branches: [oxoAt(2)] } },
    reduced: { formula: "CH₃(CH₂)₃CH₃", name: "pentane" },
    cyanohydrin: { formula: "(C₂H₅)₂C(OH)CN", name: "2-ethyl-2-hydroxybutanenitrile" },
    grignard: { formula: "(C₂H₅)₂C(OH)CH₃", name: "3-methylpentan-3-ol", degree: 3 },
    aldol: { formula: "C₂H₅COCH(CH₃)C(OH)(C₂H₅)₂", name: "5-ethyl-5-hydroxy-4-methylheptan-3-one" },
  },
  {
    name: "ethanol",
    formula: "CH₃CH₂OH",
    type: 0,
    alphaH: 0,
    aromatic: false,
    carbonGroups: 1,
    methylCarbonyl: true,
    drawing: { sketch: chain("CCO") },
    oxidised: { formula: "CH₃COOH", name: "ethanoic acid (via ethanal)" },
    haloformSalt: "HCOO⁻Na⁺",
  },
  {
    name: "propan-2-ol",
    formula: "(CH₃)₂CHOH",
    type: 0,
    alphaH: 0,
    aromatic: false,
    carbonGroups: 2,
    methylCarbonyl: true,
    drawing: { sketch: chain("CCC", { branches: [ohAt(1)] }) },
    oxidised: { formula: "CH₃COCH₃", name: "propanone" },
    haloformSalt: "CH₃COO⁻Na⁺",
  },
  {
    name: "ethanoic acid",
    formula: "CH₃COOH",
    type: 3,
    alphaH: 3,
    aromatic: false,
    carbonGroups: 1,
    methylCarbonyl: false,
    drawing: { sketch: { atoms: ["C", "C"], branches: carboxylAt(1) } },
  },
];

export interface OxyReagent {
  name: string;
  /** Short reagent text for the arrow. */
  reagent: string;
  /** A test with something to see. */
  test: boolean;
}

export const OXY_REAGENTS: readonly OxyReagent[] = [
  { name: "Tollens' test", reagent: "[Ag(NH₃)₂]⁺, warm", test: true },
  { name: "Fehling's test", reagent: "Fehling's A + B, warm", test: true },
  { name: "Iodoform test", reagent: "I₂ + NaOH", test: true },
  { name: "2,4-DNP test", reagent: "2,4-dinitrophenylhydrazine", test: true },
  { name: "Dilute alkali", reagent: "dil. NaOH", test: false },
  { name: "Concentrated alkali", reagent: "conc. NaOH", test: false },
  { name: "Clemmensen reduction", reagent: "Zn–Hg, conc. HCl", test: false },
  { name: "Wolff–Kishner reduction", reagent: "NH₂NH₂; KOH, glycol, heat", test: false },
  { name: "Hydrogen cyanide", reagent: "HCN (trace of base)", test: false },
  { name: "Grignard reagent", reagent: "CH₃MgBr, dry ether; H₃O⁺", test: false },
  { name: "Acidified dichromate", reagent: "K₂Cr₂O₇, H₂SO₄", test: false },
  { name: "HVZ reaction", reagent: "Cl₂, red P; H₂O", test: false },
  { name: "Soda lime", reagent: "NaOH + CaO, heat", test: false },
];

/** What a reaction makes. */
export const OXY_PRODUCT_CLASSES = [
  "no reaction",
  "silver mirror",
  "red-brown Cu₂O",
  "yellow iodoform",
  "yellow-to-red precipitate",
  "aldol",
  "alcohol + carboxylate (Cannizzaro)",
  "C=O reduced to CH₂",
  "cyanohydrin",
  "alcohol",
  "carboxylic acid",
  "ketone",
  "α-chloro acid",
  "alkane (–CO₂)",
  "salt",
  "methane (reagent destroyed)",
] as const;

export interface OxyReaction {
  reacts: boolean;
  /** Index into OXY_PRODUCT_CLASSES. */
  productClass: number;
  /** Products as formulae, or "" when nothing happens. */
  product: string;
  productName: string;
  /** Degree of the alcohol made by a Grignard reagent; 0 otherwise. */
  productDegree: number;
  /** Why, in a few words. */
  why: string;
}

const none = (why: string): OxyReaction => ({ reacts: false, productClass: 0, product: "", productName: "", productDegree: 0, why });
const made = (productClass: number, product: string, productName: string, why: string, productDegree = 0): OxyReaction => ({ reacts: true, productClass, product, productName, productDegree, why });

/** Substrate × reagent → what happens, by rule. */
export function oxyReact(substrateIndex: number, reagentIndex: number): OxyReaction {
  const s = OXY_SUBSTRATES[substrateIndex]!;
  const carbonyl = s.type === 1 || s.type === 2;
  const aldehyde = s.type === 1;
  const acid = s.type === 3;
  switch (reagentIndex) {
    case 0:
      return aldehyde ? made(1, `${s.carboxylate} + Ag`, "silver mirror", "aldehydes reduce Ag⁺ to silver") : none(s.type === 2 ? "ketones are not oxidised by Tollens'" : "no –CHO group");
    case 1:
      if (aldehyde && !s.aromatic) return made(2, `${s.carboxylate} + Cu₂O`, "red-brown precipitate", "aliphatic aldehydes reduce Cu²⁺");
      return none(aldehyde ? "aromatic aldehydes do not respond" : s.type === 2 ? "ketones do not respond" : "no –CHO group");
    case 2:
      return s.methylCarbonyl
        ? made(3, `CHI₃ + ${s.haloformSalt}`, "iodoform, yellow", s.type === 0 ? "CH₃CH(OH)– is oxidised to CH₃CO–" : "CH₃CO– joined to H or C")
        : none(acid ? "CH₃CO– here is joined to –OH" : "no CH₃CO– or CH₃CH(OH)–");
    case 3:
      return carbonyl ? made(4, "2,4-DNP derivative", "a 2,4-dinitrophenylhydrazone", "addition–elimination at C=O") : none(acid ? "the acid's C=O does not react" : "no C=O group");
    case 4:
    case 5: {
      if (acid) return made(14, "CH₃COO⁻Na⁺ + H₂O", "sodium ethanoate", "an acid is neutralised");
      if (!carbonyl) return none("an alcohol is not changed by alkali");
      if (s.alphaH > 0) return made(5, s.aldol!.formula, s.aldol!.name, reagentIndex === 5 ? "it has α-H, so aldol, not Cannizzaro" : "α-H makes an enolate, which adds to C=O");
      if (reagentIndex === 5 && aldehyde) return made(6, s.cannizzaro!, "Cannizzaro: one reduced, one oxidised", "no α-H: hydride moves between two molecules");
      return none(reagentIndex === 4 ? "no α-H: no aldol" : "no α-H and no H on C=O");
    }
    case 6:
    case 7:
      return carbonyl ? made(7, s.reduced!.formula, s.reduced!.name, reagentIndex === 6 ? ">C=O → >CH₂ in acid" : ">C=O → >CH₂ in base") : none(acid ? "–COOH is not reduced this way" : "no C=O group");
    case 8:
      return carbonyl ? made(8, s.cyanohydrin!.formula, s.cyanohydrin!.name, "CN⁻ adds to C, H⁺ to O") : none(acid ? "the acid's C=O does not add HCN" : "no C=O group");
    case 9:
      if (carbonyl) return made(9, s.grignard!.formula, s.grignard!.name, "CH₃⁻ adds to C; then H₃O⁺", s.grignard!.degree);
      return made(15, "CH₄", "methane", "the O–H's proton destroys the reagent");
    case 10:
      if (aldehyde) return made(10, s.oxidised!.formula, s.oxidised!.name, "–CHO is oxidised easily");
      if (s.type === 0 && s.oxidised) return made(s.carbonGroups >= 2 ? 11 : 10, s.oxidised.formula, s.oxidised.name, s.carbonGroups >= 2 ? "a 2° alcohol gives a ketone" : "a 1° alcohol: aldehyde, then acid");
      return none(s.type === 2 ? "ketones need vigorous oxidation" : "already fully oxidised");
    case 11:
      return acid && s.alphaH > 0 ? made(12, "ClCH₂COOH", "chloroethanoic acid", "Cl replaces an α-H") : none("HVZ needs a –COOH with α-H");
    case 12:
      return acid ? made(13, "CH₄ + Na₂CO₃", "methane", "the sodium salt loses CO₂") : none("decarboxylation needs –COOH");
    default:
      return none("");
  }
}

/** Preparations of aldehydes NCERT names, for reference. */
export const OXY_PREPARATIONS = [
  { name: "Rosenmund reduction", from: "RCOCl", reagent: "H₂, Pd–BaSO₄", product: "RCHO" },
  { name: "Stephen reaction", from: "RCN", reagent: "SnCl₂ + HCl; H₃O⁺", product: "RCHO" },
  { name: "Etard reaction", from: "C₆H₅CH₃", reagent: "CrO₂Cl₂ in CS₂; H₃O⁺", product: "C₆H₅CHO" },
  { name: "Gatterman–Koch reaction", from: "C₆H₆", reagent: "CO, HCl, anhyd. AlCl₃/CuCl", product: "C₆H₅CHO" },
] as const;

// ── The model ────────────────────────────────────────────────────────────────

export type OxyParams = {
  /** Index into OXY_BOILING. */
  bpCompound: number;
  /** Index into OXY_ACIDS. */
  acid: number;
  /** Index into OXY_PHENOL_REACTIONS. */
  phenolReaction: number;
  /** Index into OXY_ETHERS. */
  ether: number;
  /** Index into OXY_SUBSTRATES. */
  substrate: number;
  /** Index into OXY_REAGENTS. */
  reagent: number;
};

export interface OxyState {
  /** Index into OXY_ALCOHOLS. */
  alcohol: number;
  /** Minutes since the alcohol met Lucas reagent. */
  minutes: number;
  /** Index into OXY_HALIDES. */
  halide: number;
  /** Index into OXY_ALKOXIDES. */
  alkoxide: number;
}

export type OxyResults = {
  alcohol: number;
  degree: number;
  carbinolH: number;
  lucas: number;
  minutes: number;
  turbid: number;
  oxidation: number;
  dehydrationK: number;
  alkeneCisTrans: number;
  alcoholIodoform: number;
  alcoholMolarMass: number;
  bpCompound: number;
  boilingPoint: number;
  bpMolarMass: number;
  hBond: number;
  bpFamily: number;
  acid: number;
  pKa: number;
  ka: number;
  acidFamily: number;
  anionSpread: number;
  phenolReaction: number;
  groupsAdded: number;
  orthoPara: number;
  halide: number;
  alkoxide: number;
  halideDegree: number;
  williamson: number;
  etherCode: number;
  ether: number;
  cleavageMechanism: number;
  phenolFormed: number;
  substrate: number;
  reagent: number;
  carbonylType: number;
  alphaH: number;
  aromatic: number;
  carbonGroups: number;
  methylCarbonyl: number;
  reacts: number;
  isTest: number;
  productClass: number;
  productDegree: number;
};

const OUTPUTS = [
  "alcohol", "degree", "carbinolH", "lucas", "minutes", "turbid", "oxidation", "dehydrationK", "alkeneCisTrans", "alcoholIodoform", "alcoholMolarMass",
  "bpCompound", "boilingPoint", "bpMolarMass", "hBond", "bpFamily",
  "acid", "pKa", "ka", "acidFamily", "anionSpread",
  "phenolReaction", "groupsAdded", "orthoPara",
  "halide", "alkoxide", "halideDegree", "williamson", "etherCode",
  "ether", "cleavageMechanism", "phenolFormed",
  "substrate", "reagent", "carbonylType", "alphaH", "aromatic", "carbonGroups", "methylCarbonyl", "reacts", "isTest", "productClass", "productDegree",
] as const satisfies readonly (keyof OxyResults)[];

export const OXY_LUCAS_MINUTES = 10;

const finite = (v: number, fallback = 0) => (Number.isFinite(v) ? v : fallback);
const clampTo = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, finite(v, lo)));
const index = (v: number, length: number) => Math.round(clampTo(v, 0, length - 1));
const z = (v: number) => v || 0;

/** Look-ups that clamp an index into range, for the renderer as well as the model. */
export const oxyAlcohol = (i: number) => OXY_ALCOHOLS[index(i, OXY_ALCOHOLS.length)]!;
export const oxyBoiling = (i: number) => OXY_BOILING[index(i, OXY_BOILING.length)]!;
export const oxyAcid = (i: number) => OXY_ACIDS[index(i, OXY_ACIDS.length)]!;
export const oxyPhenolReaction = (i: number) => OXY_PHENOL_REACTIONS[index(i, OXY_PHENOL_REACTIONS.length)]!;
export const oxyEther = (i: number) => OXY_ETHERS[index(i, OXY_ETHERS.length)]!;
export const oxySubstrateIndex = (i: number) => index(i, OXY_SUBSTRATES.length);
export const oxyReagentIndex = (i: number) => index(i, OXY_REAGENTS.length);
export const oxyHalideGroup = (i: number) => OXY_HALIDES[index(i, OXY_HALIDES.length)]!;
export const oxyAlkoxideGroup = (i: number) => OXY_ALKOXIDES[index(i, OXY_ALKOXIDES.length)]!;

/** Whether Lucas reagent has turned cloudy after `minutes`. */
export function oxyTurbid(lucas: number, minutes: number): boolean {
  const onset = OXY_LUCAS_ONSET[lucas] ?? Number.POSITIVE_INFINITY;
  return finite(minutes) >= onset;
}

const facts = OXY_ALCOHOLS.map(oxyAlcoholFacts);
export const oxyAlcoholFactsAt = (i: number) => facts[index(i, facts.length)]!;

export const oxycompoundModel: SimulationModel<OxyState, OxyParams, OxyResults> = {
  id: "oxycompound",
  defaultParams: { bpCompound: 2, acid: 4, phenolReaction: 0, ether: 0, substrate: 1, reagent: 0 },
  outputs: OUTPUTS,
  stateVariables: ["alcohol", "minutes", "halide", "alkoxide"],

  initialize() {
    return { alcohol: 5, minutes: 0, halide: 0, alkoxide: 2 };
  },

  /** Play runs the Lucas clock: a minute a second. */
  advance(state, dt) {
    return { ...state, minutes: Math.min(OXY_LUCAS_MINUTES, finite(state.minutes) + dt) };
  },

  step(state, _params, sign) {
    return { ...state, minutes: clampTo(Math.round(finite(state.minutes)) + sign, 0, OXY_LUCAS_MINUTES) };
  },

  derive(state, params) {
    const alcohol = index(state.alcohol, OXY_ALCOHOLS.length);
    const f = facts[alcohol]!;
    const minutes = clampTo(state.minutes, 0, OXY_LUCAS_MINUTES);

    const bpCompound = index(params.bpCompound, OXY_BOILING.length);
    const bp = OXY_BOILING[bpCompound]!;

    const acidIndex = index(params.acid, OXY_ACIDS.length);
    const acid = OXY_ACIDS[acidIndex]!;

    const phenolReaction = index(params.phenolReaction, OXY_PHENOL_REACTIONS.length);
    const added = OXY_PHENOL_REACTIONS[phenolReaction]!.products[0]!.ring.filter((g) => g.pos !== 1);

    const halide = index(state.halide, OXY_HALIDES.length);
    const alkoxide = index(state.alkoxide, OXY_ALKOXIDES.length);
    const w = oxyWilliamson(OXY_HALIDES[halide]!, OXY_ALKOXIDES[alkoxide]!);

    const etherIndex = index(params.ether, OXY_ETHERS.length);
    const [ea, eb] = OXY_ETHERS[etherIndex]!;
    const cleavage = oxyCleave(ea, eb);

    const substrate = oxySubstrateIndex(params.substrate);
    const reagent = oxyReagentIndex(params.reagent);
    const s = OXY_SUBSTRATES[substrate]!;
    const reaction = oxyReact(substrate, reagent);

    return {
      alcohol,
      degree: f.degree,
      carbinolH: f.carbinolH,
      lucas: f.lucas,
      minutes,
      turbid: oxyTurbid(f.lucas, minutes) ? 1 : 0,
      oxidation: f.oxidation,
      dehydrationK: f.dehydration?.kelvin ?? 0,
      alkeneCisTrans: f.alkeneCisTrans ? 1 : 0,
      alcoholIodoform: f.iodoform ? 1 : 0,
      alcoholMolarMass: f.molarMass,

      bpCompound,
      boilingPoint: bp.kelvin,
      bpMolarMass: oxyMolarMass(bp.atoms),
      hBond: bp.family >= 2 ? 1 : 0,
      bpFamily: bp.family,

      acid: acidIndex,
      pKa: acid.pKa,
      ka: 10 ** -acid.pKa,
      acidFamily: acid.family,
      anionSpread: acid.family === 3 ? 2 : acid.family === 2 ? 1 : 0,

      phenolReaction,
      groupsAdded: added.length,
      orthoPara: added.length > 0 && added.every((g) => g.pos === 2 || g.pos === 4 || g.pos === 6) ? 1 : 0,

      halide,
      alkoxide,
      halideDegree: OXY_GROUPS[OXY_HALIDES[halide]!]!.degree,
      williamson: w.outcome,
      etherCode: w.etherCode,

      ether: etherIndex,
      cleavageMechanism: cleavage.mechanism,
      phenolFormed: OXY_GROUPS[cleavage.alcohol]!.degree < 0 ? 1 : 0,

      substrate,
      reagent,
      carbonylType: s.type,
      alphaH: s.alphaH,
      aromatic: s.aromatic ? 1 : 0,
      carbonGroups: s.carbonGroups,
      methylCarbonyl: s.methylCarbonyl ? 1 : 0,
      reacts: reaction.reacts ? 1 : 0,
      isTest: OXY_REAGENTS[reagent]!.test ? 1 : 0,
      productClass: z(reaction.productClass),
      productDegree: z(reaction.productDegree),
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof OxyState] : undefined;
  },

  setVariable(state, id, value) {
    switch (id) {
      case "alcohol": return { ...state, alcohol: index(value, OXY_ALCOHOLS.length) };
      case "minutes": return { ...state, minutes: clampTo(value, 0, OXY_LUCAS_MINUTES) };
      case "halide": return { ...state, halide: index(value, OXY_HALIDES.length) };
      case "alkoxide": return { ...state, alkoxide: index(value, OXY_ALKOXIDES.length) };
      default: return state;
    }
  },
};
