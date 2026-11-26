import type { SimulationModel } from "@ise/science-engine";
import { organicGraphFromSketch, organicHasCisTrans, type OrganicSketch } from "./organic";

/**
 * Hydrocarbons (NCERT class 11, chapter 9).
 *
 * Conformations. Ethane turned about its C–C bond: the torsional energy as a
 * function of the dihedral angle θ between front and back C–H bonds,
 *
 *   E(θ) = ½ · 12.5 kJ/mol · (1 + cos 3θ),
 *
 * highest when eclipsed (θ = 0°, 120°, 240°) and zero when staggered
 * (60°, 180°, 300°). The 12.5 kJ/mol barrier is NCERT's figure; the cosine
 * shape is the usual simple model of the curve.
 *
 * Mechanisms, as data: free-radical chlorination of methane (initiation,
 * propagation, termination); HBr adding to propene by way of the more stable
 * 2° carbocation (Markovnikov); and the peroxide (Kharasch) effect, where Br•
 * adds first and the 2° radical decides the orientation (anti-Markovnikov).
 *
 * Additions to alkenes and alkynes, as rules over a small table: which carbon
 * of the multiple bond takes the H (the one that already has more H), what
 * the intermediate is and how substituted, and what the product is. Each
 * product's structure is built by rule from the substrate's sketch; its name
 * comes from a table that the tests check against known answers.
 *
 * Benzene: Hückel's rule (cyclic, planar, fully conjugated, 4n + 2 π
 * electrons) over eight rings and ions, with the π electrons counted from
 * the structure; Kekulé structures and the 139 pm bond; electrophilic
 * substitution (the electrophile, the σ-complex, loss of H⁺); and the
 * directing influence of substituents, worked out from their inductive and
 * resonance effects.
 */

// ── Conformations of ethane ───────────────────────────────────────────────────

/** Energy difference between eclipsed and staggered ethane, kJ/mol (NCERT). */
export const HYDROCARBON_ETHANE_BARRIER = 12.5;

export const HYDROCARBON_CONFORMATIONS = ["eclipsed", "staggered", "skew"] as const;

const DEG = Math.PI / 180;
const z = (v: number) => v || 0;

/** Torsional energy above the staggered form, kJ/mol: ½ · barrier · (1 + cos 3θ). */
export function hydrocarbonTorsionalEnergy(dihedralDeg: number): number {
  const d = Number.isFinite(dihedralDeg) ? dihedralDeg : 0;
  const e = (HYDROCARBON_ETHANE_BARRIER / 2) * (1 + Math.cos(3 * d * DEG));
  return z(Math.max(0, Math.round(e * 1e9) / 1e9));
}

/** 0 eclipsed, 1 staggered, 2 skew (anything between), to within half a degree. */
export function hydrocarbonConformation(dihedralDeg: number): number {
  const d = (((Number.isFinite(dihedralDeg) ? dihedralDeg : 0) % 120) + 120) % 120;
  if (Math.min(d, 120 - d) < 0.5) return 0;
  if (Math.abs(d - 60) < 0.5) return 1;
  return 2;
}

// ── Mechanisms ───────────────────────────────────────────────────────────────

/** 0 initiation, 1 propagation, 2 termination, 3 a step of an ionic mechanism. */
export const HYDROCARBON_STAGE_KINDS = ["initiation", "propagation", "termination", "ionic step"] as const;
/** What a step leaves on carbon: 0 nothing, 1 a carbocation, 2 a free radical. */
export const HYDROCARBON_INTERMEDIATES = ["none", "carbocation", "free radical"] as const;

export interface HydrocarbonStage {
  kind: 0 | 1 | 2 | 3;
  reactants: string;
  products: string;
  /** One line on what happens (≤ 50 characters, for the canvas). */
  note: string;
  /** Free radicals made (+) or used up (−) in this step. */
  radicalChange: number;
  intermediate: 0 | 1 | 2;
  /** Degree of the carbon carrying the charge or odd electron (0 if none). */
  degree: number;
}

export interface HydrocarbonMechanism {
  id: string;
  name: string;
  overall: string;
  conditions: string;
  stages: HydrocarbonStage[];
}

export const HYDROCARBON_MECHANISMS: readonly HydrocarbonMechanism[] = [
  {
    id: "chlorination",
    name: "Chlorination of methane",
    overall: "CH₄ + Cl₂ → CH₃Cl + HCl",
    conditions: "diffused sunlight (hν) or heat",
    stages: [
      { kind: 0, reactants: "Cl–Cl", products: "Cl• + Cl•", note: "Light splits Cl₂ evenly: homolysis", radicalChange: 2, intermediate: 0, degree: 0 },
      { kind: 1, reactants: "CH₄ + Cl•", products: "•CH₃ + H–Cl", note: "Cl• takes an H atom; a methyl radical is left", radicalChange: 0, intermediate: 2, degree: 0 },
      { kind: 1, reactants: "•CH₃ + Cl–Cl", products: "CH₃–Cl + Cl•", note: "The new Cl• carries the chain on", radicalChange: 0, intermediate: 0, degree: 0 },
      { kind: 2, reactants: "Cl• + Cl•", products: "Cl–Cl", note: "Two radicals pair up: the chain stops", radicalChange: -2, intermediate: 0, degree: 0 },
      { kind: 2, reactants: "•CH₃ + •CH₃", products: "CH₃–CH₃", note: "Ethane forms as a by-product", radicalChange: -2, intermediate: 0, degree: 0 },
      { kind: 2, reactants: "•CH₃ + Cl•", products: "CH₃–Cl", note: "Two radicals pair up: the chain stops", radicalChange: -2, intermediate: 0, degree: 0 },
    ],
  },
  {
    id: "hbr",
    name: "HBr adds to propene",
    overall: "CH₃CH=CH₂ + HBr → CH₃CHBrCH₃",
    conditions: "no peroxide: an ionic mechanism",
    stages: [
      { kind: 3, reactants: "CH₃CH=CH₂ + H–Br", products: "CH₃C⁺HCH₃ + Br⁻", note: "H⁺ adds to CH₂: the 2° carbocation is favoured", radicalChange: 0, intermediate: 1, degree: 2 },
      { kind: 3, reactants: "CH₃C⁺HCH₃ + Br⁻", products: "CH₃CHBrCH₃", note: "Br⁻ joins the C⁺: 2-bromopropane", radicalChange: 0, intermediate: 0, degree: 0 },
    ],
  },
  {
    id: "peroxide",
    name: "HBr adds to propene, with peroxide",
    overall: "CH₃CH=CH₂ + HBr → CH₃CH₂CH₂Br",
    conditions: "benzoyl peroxide: a free-radical chain",
    stages: [
      { kind: 0, reactants: "C₆H₅COO–OOCC₆H₅", products: "2 C₆H₅• + 2 CO₂", note: "The O–O bond splits; the radicals lose CO₂", radicalChange: 2, intermediate: 0, degree: 0 },
      { kind: 0, reactants: "C₆H₅• + H–Br", products: "C₆H₆ + Br•", note: "The phenyl radical takes H, freeing Br•", radicalChange: 0, intermediate: 0, degree: 0 },
      { kind: 1, reactants: "Br• + CH₂=CHCH₃", products: "BrCH₂–C•HCH₃", note: "Br• adds to CH₂: the 2° radical is favoured", radicalChange: 0, intermediate: 2, degree: 2 },
      { kind: 1, reactants: "BrCH₂C•HCH₃ + H–Br", products: "BrCH₂CH₂CH₃ + Br•", note: "H from HBr, and Br• goes on: 1-bromopropane", radicalChange: 0, intermediate: 0, degree: 0 },
    ],
  },
];

export const HYDROCARBON_MAX_STAGE = 5;

export function hydrocarbonMechanism(index: number): HydrocarbonMechanism {
  return HYDROCARBON_MECHANISMS[clampInt(index, 0, HYDROCARBON_MECHANISMS.length - 1)]!;
}

// ── Sketch helpers ───────────────────────────────────────────────────────────

/** Bonds carbon i of the main chain makes to other atoms in the sketch. */
export function hydrocarbonBondsUsed(sketch: OrganicSketch, i: number): number {
  const order = (k: number) => sketch.orders?.[k] ?? 1;
  let used = 0;
  if (i > 0) used += order(i - 1);
  if (i + 1 < sketch.atoms.length) used += order(i);
  for (const b of sketch.branches ?? []) if (b.at === i) used += b.order ?? 1;
  return used;
}

/** Hydrogens on main-chain carbon i (valence 4). */
export function hydrocarbonHydrogens(sketch: OrganicSketch, i: number): number {
  return Math.max(0, 4 - hydrocarbonBondsUsed(sketch, i));
}

/** Carbon atoms bonded to main-chain carbon i: its degree (1°, 2°, 3°). */
export function hydrocarbonCarbonNeighbours(sketch: OrganicSketch, i: number): number {
  let n = 0;
  if (i > 0) n++;
  if (i + 1 < sketch.atoms.length) n++;
  for (const b of sketch.branches ?? []) if (b.at === i && b.atoms[0] === "C") n++;
  return n;
}

/** Index i of the first chain bond i → i + 1 with this order, or −1. */
const multipleAt = (sketch: OrganicSketch, order: number) => (sketch.orders ?? []).findIndex((o) => o === order);

/** The locant of main-chain carbon i in a product named on that chain (both ends tried). */
const locantOf = (n: number, i: number) => Math.min(i + 1, n - i);

const withOrder = (sketch: OrganicSketch, at: number, order: number): OrganicSketch => ({
  ...sketch,
  orders: sketch.atoms.slice(1).map((_, k) => (k === at ? order : (sketch.orders?.[k] ?? 1))),
  branches: [...(sketch.branches ?? [])],
});

const addBranches = (sketch: OrganicSketch, extra: { at: number; atoms: string[]; order?: number }[]): OrganicSketch => ({
  ...sketch,
  branches: [...(sketch.branches ?? []), ...extra],
});

// ── Alkenes ──────────────────────────────────────────────────────────────────

export interface HydrocarbonAlkene {
  id: string;
  name: string;
  formula: string;
  sketch: OrganicSketch;
  /**
   * Product names, by reagent (HYDROCARBON_ALKENE_REAGENTS order). For
   * ozonolysis, the two carbonyl compounds from the first and second carbon
   * of the double bond.
   */
  products: readonly [string, string, string, string, string, string, string, readonly [string, string]];
}

export const HYDROCARBON_ALKENES: readonly HydrocarbonAlkene[] = [
  {
    id: "ethene",
    name: "ethene",
    formula: "CH₂=CH₂",
    sketch: { atoms: ["C", "C"], orders: [2] },
    products: ["ethane", "1,2-dibromoethane", "bromoethane", "bromoethane", "chloroethane", "ethanol", "ethane-1,2-diol", ["methanal", "methanal"]],
  },
  {
    id: "propene",
    name: "propene",
    formula: "CH₂=CHCH₃",
    sketch: { atoms: ["C", "C", "C"], orders: [2, 1] },
    products: ["propane", "1,2-dibromopropane", "2-bromopropane", "1-bromopropane", "2-chloropropane", "propan-2-ol", "propane-1,2-diol", ["methanal", "ethanal"]],
  },
  {
    id: "but-1-ene",
    name: "but-1-ene",
    formula: "CH₂=CHCH₂CH₃",
    sketch: { atoms: ["C", "C", "C", "C"], orders: [2, 1, 1] },
    products: ["butane", "1,2-dibromobutane", "2-bromobutane", "1-bromobutane", "2-chlorobutane", "butan-2-ol", "butane-1,2-diol", ["methanal", "propanal"]],
  },
  {
    id: "but-2-ene",
    name: "but-2-ene",
    formula: "CH₃CH=CHCH₃",
    sketch: { atoms: ["C", "C", "C", "C"], orders: [1, 2, 1] },
    products: ["butane", "2,3-dibromobutane", "2-bromobutane", "2-bromobutane", "2-chlorobutane", "butan-2-ol", "butane-2,3-diol", ["ethanal", "ethanal"]],
  },
  {
    id: "2-methylpropene",
    name: "2-methylpropene",
    formula: "CH₂=C(CH₃)₂",
    sketch: { atoms: ["C", "C", "C"], orders: [2, 1], branches: [{ at: 1, atoms: ["C"] }] },
    products: [
      "2-methylpropane",
      "1,2-dibromo-2-methylpropane",
      "2-bromo-2-methylpropane",
      "1-bromo-2-methylpropane",
      "2-chloro-2-methylpropane",
      "2-methylpropan-2-ol",
      "2-methylpropane-1,2-diol",
      ["methanal", "propanone"],
    ],
  },
];

/** How the two halves of the reagent are placed: the same on both carbons, H + X by a rule, or the C=C cut. */
export type HydrocarbonAddKind = "same" | "markovnikov" | "anti" | "cut";

export interface HydrocarbonAlkeneReagent {
  id: string;
  label: string;
  kind: HydrocarbonAddKind;
  /** The atom put on carbon (both carbons for "same"; the non-H carbon otherwise); "" for H₂. */
  atom: string;
  /** Intermediate on the way: 0 none shown, 1 carbocation, 2 free radical. */
  intermediate: 0 | 1 | 2;
  /** Product class, for the words. */
  makes: string;
}

export const HYDROCARBON_ALKENE_REAGENTS: readonly HydrocarbonAlkeneReagent[] = [
  { id: "h2", label: "H₂, Ni (or Pt, Pd)", kind: "same", atom: "", intermediate: 0, makes: "an alkane" },
  { id: "br2", label: "Br₂ in CCl₄", kind: "same", atom: "Br", intermediate: 0, makes: "a vicinal dibromide" },
  { id: "hbr", label: "HBr", kind: "markovnikov", atom: "Br", intermediate: 1, makes: "a bromoalkane" },
  { id: "hbr-peroxide", label: "HBr, with peroxide", kind: "anti", atom: "Br", intermediate: 2, makes: "a bromoalkane" },
  { id: "hcl-peroxide", label: "HCl, with peroxide", kind: "markovnikov", atom: "Cl", intermediate: 1, makes: "a chloroalkane" },
  { id: "water", label: "H₂O, H⁺ (conc. H₂SO₄)", kind: "markovnikov", atom: "O", intermediate: 1, makes: "an alcohol" },
  { id: "baeyer", label: "cold dil. KMnO₄ (Baeyer's)", kind: "same", atom: "O", intermediate: 0, makes: "a vicinal diol (glycol)" },
  { id: "ozone", label: "O₃, then Zn + H₂O", kind: "cut", atom: "O", intermediate: 0, makes: "two carbonyl compounds" },
];

/** 0 both carbons treated alike (or no choice), 1 Markovnikov, 2 anti-Markovnikov. */
export const HYDROCARBON_ORIENTATIONS = ["no choice", "Markovnikov", "anti-Markovnikov"] as const;

export interface HydrocarbonAddition {
  /** Product structures (two for ozonolysis). */
  sketches: OrganicSketch[];
  names: string[];
  orientation: number;
  intermediate: number;
  /** Degree of the carbon that carries the carbocation or radical (0 if none). */
  degree: number;
  /** Main-chain carbon that took X (HX or H₂O), −1 otherwise. */
  xAt: number;
  /** Its locant in the product's name (0 if none). */
  xLocant: number;
}

export function hydrocarbonAlkene(index: number): HydrocarbonAlkene {
  return HYDROCARBON_ALKENES[clampInt(index, 0, HYDROCARBON_ALKENES.length - 1)]!;
}

export function hydrocarbonAlkeneReagent(index: number): HydrocarbonAlkeneReagent {
  return HYDROCARBON_ALKENE_REAGENTS[clampInt(index, 0, HYDROCARBON_ALKENE_REAGENTS.length - 1)]!;
}

/** The two carbons of the C=C, [a, a + 1]. */
export function hydrocarbonDoubleBond(sketch: OrganicSketch): [number, number] {
  const a = Math.max(0, multipleAt(sketch, 2));
  return [a, a + 1];
}

/**
 * Markovnikov's rule as a rule: the carbon that already has more H takes the
 * H; the other — more substituted, so it carries the more stable carbocation
 * (or radical) — takes X. Returns [carbon for H, carbon for X], or null when
 * the two carbons carry the same number of H.
 */
export function hydrocarbonMarkovnikov(sketch: OrganicSketch, a: number, b: number): [number, number] | null {
  const ha = hydrocarbonHydrogens(sketch, a);
  const hb = hydrocarbonHydrogens(sketch, b);
  if (ha === hb) return null;
  return ha > hb ? [a, b] : [b, a];
}

/** Cut a chain between carbons a and a + 1 into two pieces, each carbon getting =O. */
function ozonolyse(sketch: OrganicSketch, a: number): OrganicSketch[] {
  const orders = sketch.orders ?? [];
  const branches = sketch.branches ?? [];
  const left: OrganicSketch = {
    atoms: sketch.atoms.slice(0, a + 1),
    orders: orders.slice(0, a),
    branches: [...branches.filter((b) => b.at <= a), { at: a, atoms: ["O"], order: 2 }],
  };
  const right: OrganicSketch = {
    atoms: sketch.atoms.slice(a + 1),
    orders: orders.slice(a + 1),
    branches: [...branches.filter((b) => b.at > a).map((b) => ({ ...b, at: b.at - a - 1 })), { at: 0, atoms: ["O"], order: 2 }],
  };
  return [left, right];
}

export function hydrocarbonAdd(alkene: HydrocarbonAlkene, reagent: HydrocarbonAlkeneReagent): HydrocarbonAddition {
  const s = alkene.sketch;
  const [a, b] = hydrocarbonDoubleBond(s);
  const n = s.atoms.length;
  const r = HYDROCARBON_ALKENE_REAGENTS.indexOf(reagent);
  const name = (k: number) => alkene.products[k] as string;
  const single = withOrder(s, a, 1);
  const rule = hydrocarbonMarkovnikov(s, a, b);
  const moreSubstituted = Math.max(hydrocarbonCarbonNeighbours(s, a), hydrocarbonCarbonNeighbours(s, b));

  if (reagent.kind === "cut") {
    const [x, y] = alkene.products[7];
    return { sketches: ozonolyse(s, a), names: [x, y], orientation: 0, intermediate: 0, degree: 0, xAt: -1, xLocant: 0 };
  }
  if (reagent.kind === "same") {
    const extra = reagent.atom ? [{ at: a, atoms: [reagent.atom] }, { at: b, atoms: [reagent.atom] }] : [];
    return { sketches: [addBranches(single, extra)], names: [name(r)], orientation: 0, intermediate: 0, degree: 0, xAt: -1, xLocant: 0 };
  }
  // H–X: Markovnikov puts X on the more substituted carbon; the peroxide effect (HBr only) the other.
  const [hCarbon, xCarbon] = rule ?? [a, b];
  const xAt = reagent.kind === "anti" ? hCarbon : xCarbon;
  const orientation = rule === null ? 0 : reagent.kind === "anti" ? 2 : 1;
  return {
    sketches: [addBranches(single, [{ at: xAt, atoms: [reagent.atom] }])],
    names: [name(r)],
    orientation,
    intermediate: reagent.intermediate,
    degree: moreSubstituted,
    xAt,
    xLocant: locantOf(n, xAt),
  };
}

// ── Alkynes ──────────────────────────────────────────────────────────────────

export interface HydrocarbonAlkyne {
  id: string;
  name: string;
  formula: string;
  sketch: OrganicSketch;
  /** Product names by reagent (HYDROCARBON_ALKYNE_REAGENTS order). */
  products: readonly [string, string, string, string, string, string, string];
}

export const HYDROCARBON_ALKYNES: readonly HydrocarbonAlkyne[] = [
  {
    id: "ethyne",
    name: "ethyne",
    formula: "HC≡CH",
    sketch: { atoms: ["C", "C"], orders: [3] },
    products: ["sodium ethynide", "ethene", "sodium ethynide", "ethane", "1,1,2,2-tetrabromoethane", "1,1-dibromoethane", "ethanal"],
  },
  {
    id: "propyne",
    name: "propyne",
    formula: "HC≡CCH₃",
    sketch: { atoms: ["C", "C", "C"], orders: [3, 1] },
    products: ["sodium propynide", "propene", "sodium propynide", "propane", "1,1,2,2-tetrabromopropane", "2,2-dibromopropane", "propanone"],
  },
  {
    id: "but-1-yne",
    name: "but-1-yne",
    formula: "HC≡CCH₂CH₃",
    sketch: { atoms: ["C", "C", "C", "C"], orders: [3, 1, 1] },
    products: ["sodium but-1-ynide", "but-1-ene", "sodium but-1-ynide", "butane", "1,1,2,2-tetrabromobutane", "2,2-dibromobutane", "butanone"],
  },
  {
    id: "but-2-yne",
    name: "but-2-yne",
    formula: "CH₃C≡CCH₃",
    sketch: { atoms: ["C", "C", "C", "C"], orders: [1, 3, 1] },
    products: ["no reaction", "cis-but-2-ene", "trans-but-2-ene", "butane", "2,2,3,3-tetrabromobutane", "2,2-dibromobutane", "butanone"],
  },
];

export interface HydrocarbonAlkyneReagent {
  id: string;
  label: string;
}

export const HYDROCARBON_ALKYNE_REAGENTS: readonly HydrocarbonAlkyneReagent[] = [
  { id: "nanh2", label: "NaNH₂ (sodamide)" },
  { id: "lindlar", label: "H₂, Lindlar's catalyst" },
  { id: "na-nh3", label: "Na in liquid NH₃" },
  { id: "h2-ni", label: "excess H₂, Ni" },
  { id: "br2", label: "Br₂, 2 mol" },
  { id: "hbr", label: "HBr, 2 mol" },
  { id: "hydration", label: "H₂O, Hg²⁺ + H₂SO₄, 333 K" },
];

/** 0 no cis/trans in the product, 1 cis alkene, 2 trans alkene. */
export const HYDROCARBON_STEREO = ["none", "cis", "trans"] as const;

export interface HydrocarbonAlkyneResult {
  sketch: OrganicSketch;
  name: string;
  /** Whether anything happens. */
  reacts: number;
  /** Chain carbon left as C⁻ (with Na⁺), −1 if none. */
  anionAt: number;
  stereo: number;
  /** Order of the bond left between the two carbons of the old C≡C. */
  bondAfter: number;
}

export function hydrocarbonAlkyne(index: number): HydrocarbonAlkyne {
  return HYDROCARBON_ALKYNES[clampInt(index, 0, HYDROCARBON_ALKYNES.length - 1)]!;
}

export function hydrocarbonAlkyneReagent(index: number): HydrocarbonAlkyneReagent {
  return HYDROCARBON_ALKYNE_REAGENTS[clampInt(index, 0, HYDROCARBON_ALKYNE_REAGENTS.length - 1)]!;
}

/** The two carbons of the C≡C, [a, a + 1]. */
export function hydrocarbonTripleBond(sketch: OrganicSketch): [number, number] {
  const a = Math.max(0, multipleAt(sketch, 3));
  return [a, a + 1];
}

/** Acidic H: those on a triply bonded (sp) carbon. */
export function hydrocarbonAcidicH(alkyne: HydrocarbonAlkyne): number {
  const [a, b] = hydrocarbonTripleBond(alkyne.sketch);
  return hydrocarbonHydrogens(alkyne.sketch, a) + hydrocarbonHydrogens(alkyne.sketch, b);
}

export function hydrocarbonAlkyneReact(alkyne: HydrocarbonAlkyne, reagent: HydrocarbonAlkyneReagent): HydrocarbonAlkyneResult {
  const s = alkyne.sketch;
  const [a, b] = hydrocarbonTripleBond(s);
  const k = HYDROCARBON_ALKYNE_REAGENTS.indexOf(reagent);
  const name = alkyne.products[Math.max(0, k)] ?? "";
  const terminal = hydrocarbonHydrogens(s, a) > 0 ? a : hydrocarbonHydrogens(s, b) > 0 ? b : -1;
  // The carbon that takes X (or =O): the one with more carbon neighbours; the first if they tie.
  const markovnikov = hydrocarbonCarbonNeighbours(s, b) > hydrocarbonCarbonNeighbours(s, a) ? b : a;
  const result = (sketch: OrganicSketch, extra: Partial<HydrocarbonAlkyneResult> = {}): HydrocarbonAlkyneResult => ({
    sketch,
    name,
    reacts: 1,
    anionAt: -1,
    stereo: 0,
    bondAfter: 1,
    ...extra,
  });
  const alkeneStereo = (sketch: OrganicSketch, cis: boolean) => (organicHasCisTrans(organicGraphFromSketch(sketch)) ? (cis ? 1 : 2) : 0);

  switch (reagent.id) {
    case "nanh2":
    case "na-nh3": {
      // A strong base (or Na) removes the acidic H of a terminal alkyne.
      if (terminal >= 0) return result(s, { anionAt: terminal, bondAfter: 3 });
      if (reagent.id === "nanh2") return result(s, { reacts: 0, bondAfter: 3 });
      // Na in liquid NH₃ reduces an internal alkyne to the trans alkene.
      const trans = withOrder(s, a, 2);
      return result(trans, { bondAfter: 2, stereo: alkeneStereo(trans, false) });
    }
    case "lindlar": {
      const cis: OrganicSketch = { ...withOrder(s, a, 2), cisAt: a };
      return result(cis, { bondAfter: 2, stereo: alkeneStereo(cis, true) });
    }
    case "h2-ni":
      return result(withOrder(s, a, 1));
    case "br2":
      return result(addBranches(withOrder(s, a, 1), [{ at: a, atoms: ["Br"] }, { at: a, atoms: ["Br"] }, { at: b, atoms: ["Br"] }, { at: b, atoms: ["Br"] }]));
    case "hbr":
      return result(addBranches(withOrder(s, a, 1), [{ at: markovnikov, atoms: ["Br"] }, { at: markovnikov, atoms: ["Br"] }]));
    default:
      // Hydration: the enol first formed rearranges to the carbonyl compound.
      return result(addBranches(withOrder(s, a, 1), [{ at: markovnikov, atoms: ["O"], order: 2 }]));
  }
}

// ── Aromaticity ──────────────────────────────────────────────────────────────

export interface HydrocarbonRing {
  id: string;
  name: string;
  formula: string;
  /** Ring atoms (all carbon). */
  atoms: number;
  /** Ring bonds [i, j, order]: a Kekulé structure. */
  bonds: readonly (readonly [number, number, 1 | 2])[];
  /** Carbon carrying a charge: −1 with a lone pair in a p orbital, +1 with an empty p orbital. */
  chargeAt?: number;
  charge?: number;
  /** An sp³ (CH₂) ring carbon, with no p orbital. */
  sp3At?: number;
  planar: boolean;
  /** Why it is shaped as it is, if not flat. */
  shape?: string;
}

const cycle = (n: number, doubles: number[]): (readonly [number, number, 1 | 2])[] =>
  Array.from({ length: n }, (_, i) => [i, (i + 1) % n, doubles.includes(i) ? 2 : 1] as const);

export const HYDROCARBON_RINGS: readonly HydrocarbonRing[] = [
  { id: "benzene", name: "benzene", formula: "C₆H₆", atoms: 6, bonds: cycle(6, [0, 2, 4]), planar: true },
  { id: "cp-anion", name: "cyclopentadienyl anion", formula: "C₅H₅⁻", atoms: 5, bonds: cycle(5, [0, 2]), chargeAt: 4, charge: -1, planar: true },
  { id: "tropylium", name: "cycloheptatrienyl cation", formula: "C₇H₇⁺", atoms: 7, bonds: cycle(7, [0, 2, 4]), chargeAt: 6, charge: 1, planar: true },
  {
    id: "naphthalene",
    name: "naphthalene",
    formula: "C₁₀H₈",
    atoms: 10,
    // Two hexagons sharing the bond 0–1: left ring 0-2-3-4-5-1, right ring 0-6-7-8-9-1.
    bonds: [
      [0, 1, 2], [0, 2, 1], [2, 3, 2], [3, 4, 1], [4, 5, 2], [5, 1, 1],
      [0, 6, 1], [6, 7, 2], [7, 8, 1], [8, 9, 2], [9, 1, 1],
    ],
    planar: true,
  },
  { id: "cyclobutadiene", name: "cyclobutadiene", formula: "C₄H₄", atoms: 4, bonds: cycle(4, [0, 2]), planar: true },
  { id: "cot", name: "cyclooctatetraene", formula: "C₈H₈", atoms: 8, bonds: cycle(8, [0, 2, 4, 6]), planar: false, shape: "tub-shaped" },
  { id: "cyclopentadiene", name: "cyclopenta-1,3-diene", formula: "C₅H₆", atoms: 5, bonds: cycle(5, [0, 2]), sp3At: 4, planar: true },
  { id: "cp-cation", name: "cyclopentadienyl cation", formula: "C₅H₅⁺", atoms: 5, bonds: cycle(5, [0, 2]), chargeAt: 4, charge: 1, planar: true },
];

/** 0 aromatic; 1 an sp³ carbon breaks the ring of p orbitals; 2 not planar; 3 4n π electrons, not 4n + 2. */
export const HYDROCARBON_AROMATIC_REASONS = ["aromatic", "an sp³ carbon breaks the ring", "not planar", "4n π electrons, not 4n + 2"] as const;

export interface HydrocarbonHuckel {
  piElectrons: number;
  conjugated: boolean;
  /** n in 4n + 2, or −1. */
  n: number;
  aromatic: boolean;
  reason: number;
}

export function hydrocarbonRing(index: number): HydrocarbonRing {
  return HYDROCARBON_RINGS[clampInt(index, 0, HYDROCARBON_RINGS.length - 1)]!;
}

/** π electrons counted from the structure: two per C=C, two for a carbanion's lone pair, none for C⁺. */
export function hydrocarbonPiElectrons(ring: HydrocarbonRing): number {
  const doubles = ring.bonds.filter((b) => b[2] === 2).length;
  return 2 * doubles + ((ring.charge ?? 0) < 0 ? 2 : 0);
}

/** Hückel's rule: cyclic, planar, a p orbital on every ring atom, and 4n + 2 π electrons. */
export function hydrocarbonHuckel(ring: HydrocarbonRing): HydrocarbonHuckel {
  const piElectrons = hydrocarbonPiElectrons(ring);
  const conjugated = ring.sp3At === undefined;
  const n = (piElectrons - 2) % 4 === 0 && piElectrons >= 2 ? (piElectrons - 2) / 4 : -1;
  const reason = !conjugated ? 1 : !ring.planar ? 2 : n < 0 ? 3 : 0;
  return { piElectrons, conjugated, n, aromatic: reason === 0, reason };
}

/** C–C bond lengths, pm (NCERT): single, benzene, double, triple. */
export const HYDROCARBON_BOND_LENGTHS = { single: 154, benzene: 139, double: 134, triple: 120 } as const;

// ── Electrophilic substitution ───────────────────────────────────────────────

export interface HydrocarbonEasReaction {
  id: string;
  name: string;
  reagents: string;
  electrophile: string;
  charge: number;
  /** How the electrophile is made. */
  generation: string;
  product: string;
  /** The group the product carries. */
  group: string;
}

export const HYDROCARBON_EAS_REACTIONS: readonly HydrocarbonEasReaction[] = [
  { id: "nitration", name: "Nitration", reagents: "conc. HNO₃ + conc. H₂SO₄", electrophile: "NO₂⁺", charge: 1, generation: "HNO₃ + 2H₂SO₄ → NO₂⁺ + H₃O⁺ + 2HSO₄⁻", product: "nitrobenzene", group: "NO₂" },
  { id: "chlorination", name: "Chlorination", reagents: "Cl₂, anhydrous FeCl₃", electrophile: "Cl⁺", charge: 1, generation: "Cl₂ + FeCl₃ → Cl⁺ + [FeCl₄]⁻", product: "chlorobenzene", group: "Cl" },
  { id: "bromination", name: "Bromination", reagents: "Br₂, anhydrous FeBr₃", electrophile: "Br⁺", charge: 1, generation: "Br₂ + FeBr₃ → Br⁺ + [FeBr₄]⁻", product: "bromobenzene", group: "Br" },
  { id: "sulphonation", name: "Sulphonation", reagents: "fuming H₂SO₄ (oleum)", electrophile: "SO₃", charge: 0, generation: "2H₂SO₄ → SO₃ + H₃O⁺ + HSO₄⁻", product: "benzenesulphonic acid", group: "SO₃H" },
  { id: "alkylation", name: "Friedel–Crafts alkylation", reagents: "CH₃Cl, anhydrous AlCl₃", electrophile: "CH₃⁺", charge: 1, generation: "CH₃Cl + AlCl₃ → CH₃⁺ + [AlCl₄]⁻", product: "toluene (methylbenzene)", group: "CH₃" },
  { id: "acylation", name: "Friedel–Crafts acylation", reagents: "CH₃COCl, anhydrous AlCl₃", electrophile: "CH₃CO⁺", charge: 1, generation: "CH₃COCl + AlCl₃ → CH₃CO⁺ + [AlCl₄]⁻", product: "acetophenone", group: "COCH₃" },
];

export const HYDROCARBON_EAS_STAGES = ["the electrophile forms", "E⁺ attacks: the σ-complex", "H⁺ leaves: aromatic again"] as const;

export function hydrocarbonEasReaction(index: number): HydrocarbonEasReaction {
  return HYDROCARBON_EAS_REACTIONS[clampInt(index, 0, HYDROCARBON_EAS_REACTIONS.length - 1)]!;
}

export interface HydrocarbonSubstituent {
  id: string;
  label: string;
  /** +1 pushes electrons through σ bonds (+I), −1 pulls (−I), 0 none (H). */
  inductive: number;
  /** +1 gives a lone pair to the ring (+R), −1 pulls π electrons out (−R), 0 none. */
  resonance: number;
  /** Halogens: −I outweighs +R for the rate, but +R still steers to o/p. */
  halogen: boolean;
}

export const HYDROCARBON_SUBSTITUENTS: readonly HydrocarbonSubstituent[] = [
  { id: "h", label: "–H", inductive: 0, resonance: 0, halogen: false },
  { id: "oh", label: "–OH", inductive: -1, resonance: 1, halogen: false },
  { id: "nh2", label: "–NH₂", inductive: -1, resonance: 1, halogen: false },
  { id: "och3", label: "–OCH₃", inductive: -1, resonance: 1, halogen: false },
  { id: "ch3", label: "–CH₃", inductive: 1, resonance: 0, halogen: false },
  { id: "cl", label: "–Cl", inductive: -1, resonance: 1, halogen: true },
  { id: "br", label: "–Br", inductive: -1, resonance: 1, halogen: true },
  { id: "no2", label: "–NO₂", inductive: -1, resonance: -1, halogen: false },
  { id: "cn", label: "–CN", inductive: -1, resonance: -1, halogen: false },
  { id: "cho", label: "–CHO", inductive: -1, resonance: -1, halogen: false },
  { id: "cooh", label: "–COOH", inductive: -1, resonance: -1, halogen: false },
];

/** 0 no preference (benzene itself), 1 ortho and para, 2 meta. */
export const HYDROCARBON_DIRECTS = ["any position", "ortho and para", "meta"] as const;
export const HYDROCARBON_POSITIONS = ["", "", "ortho", "meta", "para"] as const;

export function hydrocarbonSubstituent(index: number): HydrocarbonSubstituent {
  return HYDROCARBON_SUBSTITUENTS[clampInt(index, 0, HYDROCARBON_SUBSTITUENTS.length - 1)]!;
}

/** Electron-giving groups (+R, or +I with hyperconjugation) direct o/p; −R groups direct meta. */
export function hydrocarbonDirects(s: HydrocarbonSubstituent): number {
  if (s.resonance > 0 || (s.resonance === 0 && s.inductive > 0)) return 1;
  if (s.resonance < 0) return 2;
  return 0;
}

/** +1 activating (faster than benzene), −1 deactivating, 0 benzene itself. */
export function hydrocarbonActivation(s: HydrocarbonSubstituent): number {
  if (s.halogen) return -1;
  if (s.resonance > 0 || s.inductive > 0) return 1;
  if (s.resonance < 0 || s.inductive < 0) return -1;
  return 0;
}

/** Charge resonance puts on a ring position (2 ortho, 3 meta, 4 para): −1 with a donor at o/p, +1 with an acceptor, 0 at meta. */
export function hydrocarbonPositionCharge(s: HydrocarbonSubstituent, position: number): number {
  const d = hydrocarbonDirects(s);
  if (d === 0 || position === 3) return 0;
  return d === 1 ? -1 : 1;
}

// ── The model ────────────────────────────────────────────────────────────────

export type HydrocarbonParams = {
  /** Indices into the tables above. */
  mechanism: number;
  alkene: number;
  reagent: number;
  alkyne: number;
  alkyneReagent: number;
  ring: number;
  reaction: number;
  substituent: number;
};

export interface HydrocarbonState {
  /** Dihedral angle between front and back C–H bonds, degrees. */
  dihedral: number;
  /** Step of the radical or ionic mechanism shown. */
  stage: number;
  /** Step of electrophilic substitution: 0, 1 or 2. */
  easStage: number;
  /** Ring position attacked: 2 ortho, 3 meta, 4 para. */
  position: number;
}

export type HydrocarbonResults = {
  dihedral: number;
  torsionalEnergy: number;
  conformation: number;
  mechanism: number;
  stage: number;
  stageCount: number;
  stageKind: number;
  radicalChange: number;
  mechIntermediate: number;
  mechDegree: number;
  alkene: number;
  reagent: number;
  orientation: number;
  addIntermediate: number;
  addDegree: number;
  xLocant: number;
  alkeneCisTrans: number;
  productCount: number;
  alkyne: number;
  alkyneReagent: number;
  acidicH: number;
  reacts: number;
  stereo: number;
  bondAfter: number;
  ring: number;
  piElectrons: number;
  ringAtoms: number;
  planar: number;
  conjugated: number;
  huckelN: number;
  aromatic: number;
  aromaticReason: number;
  ringCharge: number;
  bondSingle: number;
  bondDouble: number;
  bondBenzene: number;
  bondTriple: number;
  reaction: number;
  easStage: number;
  ringSp3: number;
  ringIntact: number;
  sigmaCharge: number;
  electrophileCharge: number;
  substituent: number;
  directs: number;
  activation: number;
  position: number;
  favoured: number;
  positionCharge: number;
};

const OUTPUTS = [
  "dihedral", "torsionalEnergy", "conformation",
  "mechanism", "stage", "stageCount", "stageKind", "radicalChange", "mechIntermediate", "mechDegree",
  "alkene", "reagent", "orientation", "addIntermediate", "addDegree", "xLocant", "alkeneCisTrans", "productCount",
  "alkyne", "alkyneReagent", "acidicH", "reacts", "stereo", "bondAfter",
  "ring", "piElectrons", "ringAtoms", "planar", "conjugated", "huckelN", "aromatic", "aromaticReason", "ringCharge",
  "bondSingle", "bondDouble", "bondBenzene", "bondTriple",
  "reaction", "easStage", "ringSp3", "ringIntact", "sigmaCharge", "electrophileCharge",
  "substituent", "directs", "activation", "position", "favoured", "positionCharge",
] as const satisfies readonly (keyof HydrocarbonResults)[];

function clampInt(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, Math.round(Number.isFinite(v) ? v : lo)));
}
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));

/** Rotation speed under Play, degrees a second. */
export const HYDROCARBON_TURN_RATE = 60;

export const hydrocarbonModel: SimulationModel<HydrocarbonState, HydrocarbonParams, HydrocarbonResults> = {
  id: "hydrocarbon",
  defaultParams: { mechanism: 0, alkene: 1, reagent: 2, alkyne: 1, alkyneReagent: 0, ring: 0, reaction: 0, substituent: 4 },
  outputs: OUTPUTS,
  stateVariables: ["dihedral", "stage", "easStage", "position"],

  initialize() {
    return { dihedral: 60, stage: 0, easStage: 0, position: 2 };
  },

  /** Play turns the back carbon steadily; past 360° it starts again at 0°. */
  advance(state, dt) {
    const next = state.dihedral + HYDROCARBON_TURN_RATE * (Number.isFinite(dt) ? dt : 0);
    return { ...state, dihedral: next > 360 ? next - 360 : next };
  },

  /** A step is 60°: eclipsed to staggered and on. */
  step(state, _params, sign) {
    const snapped = Math.round(state.dihedral / 60) * 60 + 60 * sign;
    return { ...state, dihedral: clamp(snapped, 0, 360) };
  },

  derive(state, params) {
    const dihedral = clamp(state.dihedral, 0, 360);

    const mechanism = hydrocarbonMechanism(params.mechanism);
    const stage = clampInt(state.stage, 0, mechanism.stages.length - 1);
    const st = mechanism.stages[stage]!;

    const alkene = hydrocarbonAlkene(params.alkene);
    const reagent = hydrocarbonAlkeneReagent(params.reagent);
    const added = hydrocarbonAdd(alkene, reagent);

    const alkyne = hydrocarbonAlkyne(params.alkyne);
    const alkyneReagent = hydrocarbonAlkyneReagent(params.alkyneReagent);
    const reacted = hydrocarbonAlkyneReact(alkyne, alkyneReagent);

    const ring = hydrocarbonRing(params.ring);
    const huckel = hydrocarbonHuckel(ring);

    const reaction = hydrocarbonEasReaction(params.reaction);
    const easStage = clampInt(state.easStage, 0, 2);

    const substituent = hydrocarbonSubstituent(params.substituent);
    const directs = hydrocarbonDirects(substituent);
    const position = clampInt(state.position, 2, 4);

    return {
      dihedral,
      torsionalEnergy: hydrocarbonTorsionalEnergy(dihedral),
      conformation: hydrocarbonConformation(dihedral),

      mechanism: HYDROCARBON_MECHANISMS.indexOf(mechanism),
      stage,
      stageCount: mechanism.stages.length,
      stageKind: st.kind,
      radicalChange: z(st.radicalChange),
      mechIntermediate: st.intermediate,
      mechDegree: st.degree,

      alkene: HYDROCARBON_ALKENES.indexOf(alkene),
      reagent: HYDROCARBON_ALKENE_REAGENTS.indexOf(reagent),
      orientation: added.orientation,
      addIntermediate: added.intermediate,
      addDegree: added.intermediate > 0 ? added.degree : 0,
      xLocant: added.xLocant,
      alkeneCisTrans: organicHasCisTrans(organicGraphFromSketch(alkene.sketch)) ? 1 : 0,
      productCount: added.sketches.length,

      alkyne: HYDROCARBON_ALKYNES.indexOf(alkyne),
      alkyneReagent: HYDROCARBON_ALKYNE_REAGENTS.indexOf(alkyneReagent),
      acidicH: hydrocarbonAcidicH(alkyne),
      reacts: reacted.reacts,
      stereo: reacted.stereo,
      bondAfter: reacted.bondAfter,

      ring: HYDROCARBON_RINGS.indexOf(ring),
      piElectrons: huckel.piElectrons,
      ringAtoms: ring.atoms,
      planar: ring.planar ? 1 : 0,
      conjugated: huckel.conjugated ? 1 : 0,
      huckelN: huckel.n,
      aromatic: huckel.aromatic ? 1 : 0,
      aromaticReason: huckel.reason,
      ringCharge: z(ring.charge ?? 0),

      bondSingle: HYDROCARBON_BOND_LENGTHS.single,
      bondDouble: HYDROCARBON_BOND_LENGTHS.double,
      bondBenzene: HYDROCARBON_BOND_LENGTHS.benzene,
      bondTriple: HYDROCARBON_BOND_LENGTHS.triple,

      reaction: HYDROCARBON_EAS_REACTIONS.indexOf(reaction),
      easStage,
      ringSp3: easStage === 1 ? 1 : 0,
      ringIntact: easStage === 1 ? 0 : 1,
      sigmaCharge: easStage === 1 ? 1 : 0,
      electrophileCharge: reaction.charge,

      substituent: HYDROCARBON_SUBSTITUENTS.indexOf(substituent),
      directs,
      activation: z(hydrocarbonActivation(substituent)),
      position,
      favoured: directs === 0 || (directs === 1 && position !== 3) || (directs === 2 && position === 3) ? 1 : 0,
      positionCharge: z(hydrocarbonPositionCharge(substituent, position)),
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof HydrocarbonState] : undefined;
  },

  setVariable(state, id, value) {
    switch (id) {
      case "dihedral": return { ...state, dihedral: clamp(value, 0, 360) };
      case "stage": return { ...state, stage: clampInt(value, 0, HYDROCARBON_MAX_STAGE) };
      case "easStage": return { ...state, easStage: clampInt(value, 0, 2) };
      case "position": return { ...state, position: clampInt(value, 2, 4) };
      default: return state;
    }
  },
};
