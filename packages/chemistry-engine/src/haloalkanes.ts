import type { SimulationModel } from "@ise/science-engine";
import { nameOrganic, organicGraphFromSketch, organicHasCisTrans, organicShortName, type OrganicSketch } from "./organic";

/**
 * Haloalkanes and haloarenes (NCERT class 12, chapter 6).
 *
 * The C–X bond: CH₃–X bond lengths, bond enthalpies and dipole moments as
 * NCERT tabulates them; Pauling electronegativities; boiling points of CH₃X
 * (standard data). Reactivity of R–X in substitution: R–I > R–Br > R–Cl > R–F,
 * the order of falling bond strength.
 *
 * Substitution, as data and rules:
 *   SN2 — one step, backside attack, Walden inversion; rate = k[RX][Nu⁻];
 *         CH₃X > 1° > 2° > 3° (steric hindrance).
 *   SN1 — slow ionisation to a planar carbocation, then fast attack from
 *         either face (racemisation); rate = k[RX]; 3° > 2° > 1° > CH₃X.
 *   Relative rates are rough, rounded textbook figures for alkyl bromides
 *   (they depend on the nucleophile and solvent): what matters is the order.
 *   The geometry of each mechanism is generated in 3D (bond units) so the
 *   umbrella flip and the R/S labels come from the same coordinates.
 *   A chooser predicts SN2 / SN1 / both from substrate × nucleophile ×
 *   solvent; 2° halides are honestly "both" unless the conditions push hard.
 *
 * Elimination: substrates as carbon sketches with one Br; the products are
 * worked out by rule — aqueous KOH substitutes (an alcohol), alcoholic KOH
 * removes HBr using each β-hydrogen in turn (alkenes) — and named with the
 * IUPAC namer from the organic lab. Saytzeff: the alkene with more alkyl
 * groups on its C=C is the major product.
 *
 * Chirality: four molecules drawn as a tetrahedron and its mirror image; the
 * mirror image can be turned about the vertical bond to try to superimpose
 * it. Specific rotations are measured values for the (S)-(+) forms; a
 * mixture's rotation is [α] × (fraction (+) − fraction (−)).
 *
 * Haloarenes: NCERT's conditions for replacing Cl by OH as –NO₂ groups are
 * added at ortho/para; the aryl C–Cl bond (169 pm) against CH₃–Cl (178 pm);
 * chlorobenzene's electrophilic substitutions (ortho + para, para major).
 */

// ── The C–X bond ─────────────────────────────────────────────────────────────

export interface HaloBond {
  symbol: "F" | "Cl" | "Br" | "I";
  formula: string;
  /** C–X bond length in CH₃X, pm (NCERT). */
  length: number;
  /** C–X bond enthalpy, kJ/mol (NCERT). */
  enthalpy: number;
  /** Dipole moment of CH₃X, debye (NCERT). */
  dipole: number;
  /** Pauling electronegativity of X. */
  electronegativity: number;
  /** Boiling point of CH₃X, °C. */
  boilingPoint: number;
}

export const HALO_BONDS: readonly HaloBond[] = [
  { symbol: "F", formula: "CH₃F", length: 139, enthalpy: 452, dipole: 1.847, electronegativity: 3.98, boilingPoint: -78.4 },
  { symbol: "Cl", formula: "CH₃Cl", length: 178, enthalpy: 351, dipole: 1.86, electronegativity: 3.16, boilingPoint: -24.2 },
  { symbol: "Br", formula: "CH₃Br", length: 193, enthalpy: 293, dipole: 1.83, electronegativity: 2.96, boilingPoint: 3.6 },
  { symbol: "I", formula: "CH₃I", length: 214, enthalpy: 234, dipole: 1.636, electronegativity: 2.66, boilingPoint: 42.4 },
];

/** Pauling electronegativity of carbon. */
export const HALO_CARBON_EN = 2.55;

/** The aryl C–Cl bond in chlorobenzene, pm (NCERT). */
export const HALO_ARYL_C_CL = 169;

// ── 3D geometry ──────────────────────────────────────────────────────────────

/** A point in bond lengths: x right, y up, z towards the viewer (right-handed). */
export interface HaloVec {
  x: number;
  y: number;
  z: number;
}

const v3 = (x: number, y: number, z: number): HaloVec => ({ x: x || 0, y: y || 0, z: z || 0 });
const cross = (a: HaloVec, b: HaloVec): HaloVec => v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
const dot = (a: HaloVec, b: HaloVec) => a.x * b.x + a.y * b.y + a.z * b.z;

/** CIP descriptor: 0 none, 1 R, 2 S. */
export const HALO_CONFIGS = ["", "R", "S"] as const;

/**
 * R or S from positions round a stereocentre at the origin. `priority` 1 is
 * highest; the four must be different, else 0. Looking with the lowest
 * priority pointing away, 1 → 2 → 3 clockwise is R — which, for vectors from
 * the centre in a right-handed frame, is (a × b) · c < 0.
 */
export function haloConfiguration(ligands: readonly { p: HaloVec; priority: number }[]): number {
  if (ligands.length !== 4 || new Set(ligands.map((l) => l.priority)).size !== 4) return 0;
  const by = [...ligands].sort((u, w) => u.priority - w.priority);
  const t = dot(cross(by[0]!.p, by[1]!.p), by[2]!.p);
  if (Math.abs(t) < 1e-6) return 0;
  return t < 0 ? 1 : 2;
}

// ── Substitution ─────────────────────────────────────────────────────────────

export const HALO_DEGREES = ["methyl", "1°", "2°", "3°"] as const;

export interface HaloSubstrate {
  formula: string;
  name: string;
  /** The three groups on the α-carbon besides Br: up, front (wedge), back (dash). */
  groups: readonly [string, string, string];
  /** CIP priorities of those groups (1 is reserved for the halogen or the nucleophile); 0 if two are the same. */
  priorities: readonly [number, number, number];
  /** Rough relative SN2 rate (1° = 1); 0 means too slow to measure. */
  sn2: number;
  /** Rough relative SN1 rate (1° = 1); 0 means too slow to measure. */
  sn1: number;
}

export const HALO_SUBSTRATES: readonly HaloSubstrate[] = [
  { formula: "CH₃Br", name: "bromomethane", groups: ["H", "H", "H"], priorities: [0, 0, 0], sn2: 30, sn1: 0 },
  { formula: "CH₃CH₂Br", name: "bromoethane", groups: ["H", "CH₃", "H"], priorities: [0, 0, 0], sn2: 1, sn1: 1 },
  { formula: "CH₃CHBrCH₂CH₃", name: "2-bromobutane", groups: ["H", "C₂H₅", "CH₃"], priorities: [4, 2, 3], sn2: 0.02, sn1: 12 },
  { formula: "(CH₃)₃CBr", name: "2-bromo-2-methylpropane", groups: ["CH₃", "CH₃", "CH₃"], priorities: [0, 0, 0], sn2: 0, sn1: 1_200_000 },
];

/** One picture of a mechanism: the α-carbon at the origin, its three groups, the nucleophile and the leaving group. */
export interface HaloFrame {
  groups: [HaloVec, HaloVec, HaloVec];
  /** Nucleophile's oxygen, or null when it is not in the picture. */
  nu: HaloVec | null;
  /** Leaving halogen, or null. */
  leaving: HaloVec | null;
  /** 0 no bond, 0.5 partial (being made or broken), 1 a full bond. */
  nuBond: number;
  leavingBond: number;
  /** Charge on the α-carbon (+1 for the carbocation). */
  charge: number;
  /** Share of the product this picture stands for (SN1 gives two). */
  share: number;
}

const COS_TET = 1 / 3;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp(t, 0, 1);

/**
 * The three groups round the α-carbon. `k` = +1: tilted away from +x (the
 * halogen side), as in R–Br; 0: flat (transition state, carbocation);
 * −1: tilted away from −x (the umbrella turned inside out).
 */
export function haloUmbrella(k: number): [HaloVec, HaloVec, HaloVec] {
  const ax = -COS_TET * clamp(k, -1, 1);
  const r = Math.sqrt(1 - ax * ax);
  return [0, 120, 240].map((deg) => {
    const a = (deg * Math.PI) / 180;
    return v3(ax, r * Math.cos(a), r * Math.sin(a));
  }) as [HaloVec, HaloVec, HaloVec];
}

/** SN2, progress 0 → 1. The nucleophile comes from −x, the halogen leaves along +x. A 3° carbon stops it short. */
export function haloSn2Frame(progress: number, degree: number): HaloFrame {
  const blocked = Math.round(degree) >= 3;
  const s = blocked ? Math.min(clamp(progress, 0, 1), 0.2) : clamp(progress, 0, 1);
  const dNu = s < 0.5 ? lerp(3.2, 1.3, s / 0.5) : lerp(1.3, 1, (s - 0.5) / 0.5);
  const dX = s < 0.5 ? lerp(1, 1.3, s / 0.5) : lerp(1.3, 3.2, (s - 0.5) / 0.5);
  return {
    groups: haloUmbrella(clamp((0.5 - s) / 0.2, -1, 1)),
    nu: v3(-dNu, 0, 0),
    leaving: v3(dX, 0, 0),
    nuBond: s < 0.3 ? 0 : s < 0.7 ? 0.5 : 1,
    leavingBond: s < 0.3 ? 1 : s < 0.7 ? 0.5 : 0,
    charge: 0,
    share: 1,
  };
}

/**
 * SN1, progress 0 → 1: the C–X bond ionises (0–0.4), the planar carbocation
 * waits (0.4–0.55), then the nucleophile attacks both faces equally — two
 * pictures, inversion (from −x) and retention (from +x), half each.
 */
export function haloSn1Frames(progress: number): HaloFrame[] {
  const s = clamp(progress, 0, 1);
  if (s < 0.55) {
    const f = clamp(s / 0.4, 0, 1);
    const bond = f < 0.4 ? 1 : f < 0.8 ? 0.5 : 0;
    return [{ groups: haloUmbrella(1 - f), nu: null, leaving: v3(lerp(1, 3.2, f), 0, 0), nuBond: 0, leavingBond: bond, charge: bond === 0 ? 1 : 0, share: 1 }];
  }
  const g = (s - 0.55) / 0.45;
  const bond = g < 0.5 ? 0 : g < 0.85 ? 0.5 : 1;
  const d = lerp(3.2, 1, g);
  const frame = (side: number): HaloFrame => ({
    groups: haloUmbrella(side * g),
    nu: v3(side * d, 0, 0),
    leaving: null,
    nuBond: bond,
    leavingBond: 0,
    charge: bond === 1 ? 0 : 1,
    share: 0.5,
  });
  return [frame(-1), frame(1)];
}

/** R/S of the α-carbon in a frame, with the halogen or nucleophile (whichever is bonded) as priority 1. */
export function haloFrameConfiguration(frame: HaloFrame, degree: number): number {
  const sub = HALO_SUBSTRATES[clamp(Math.round(degree), 0, 3)]!;
  const top = frame.nuBond === 1 ? frame.nu : frame.leavingBond === 1 ? frame.leaving : null;
  if (!top || sub.priorities.includes(0)) return 0;
  return haloConfiguration([{ p: top, priority: 1 }, ...frame.groups.map((p, i) => ({ p, priority: sub.priorities[i]! }))]);
}

export const HALO_PATHWAYS = ["SN2", "SN1", "both (mixed)"] as const;

/**
 * Which substitution mechanism: methyl and 1° go SN2 (their cations are too
 * unstable for SN1); 3° goes SN1 (the back is blocked); 2° goes SN2 with a
 * strong nucleophile in a polar aprotic solvent, SN1 with a weak one in a
 * polar protic solvent, and a mixture otherwise.
 */
export function haloPathway(degree: number, strongNucleophile: boolean, proticSolvent: boolean): number {
  const d = clamp(Math.round(degree), 0, 3);
  if (d <= 1) return 0;
  if (d === 3) return 1;
  if (strongNucleophile && !proticSolvent) return 0;
  if (!strongNucleophile && proticSolvent) return 1;
  return 2;
}

// ── Elimination ──────────────────────────────────────────────────────────────

export interface HaloEliminationSubstrate {
  name: string;
  formula: string;
  degree: number;
  /** Carbon sketch with one Br: the last main-chain atom or the last branch. */
  sketch: OrganicSketch;
  /** Major alkene's share with alcoholic KOH, %, where NCERT gives it; 0 otherwise. */
  majorPercent: number;
}

const C = (n: number) => Array.from({ length: n }, () => "C");

export const HALO_ELIMINATION_SUBSTRATES: readonly HaloEliminationSubstrate[] = [
  { name: "bromoethane", formula: "CH₃CH₂Br", degree: 1, sketch: { atoms: [...C(2), "Br"] }, majorPercent: 0 },
  { name: "1-bromobutane", formula: "CH₃CH₂CH₂CH₂Br", degree: 1, sketch: { atoms: [...C(4), "Br"] }, majorPercent: 0 },
  { name: "2-bromopropane", formula: "CH₃CHBrCH₃", degree: 2, sketch: { atoms: C(3), branches: [{ at: 1, atoms: ["Br"] }] }, majorPercent: 0 },
  { name: "2-bromobutane", formula: "CH₃CHBrCH₂CH₃", degree: 2, sketch: { atoms: C(4), branches: [{ at: 1, atoms: ["Br"] }] }, majorPercent: 0 },
  { name: "2-bromopentane", formula: "CH₃CHBrCH₂CH₂CH₃", degree: 2, sketch: { atoms: C(5), branches: [{ at: 1, atoms: ["Br"] }] }, majorPercent: 81 },
  { name: "2-bromo-2-methylbutane", formula: "(CH₃)₂CBrCH₂CH₃", degree: 3, sketch: { atoms: C(4), branches: [{ at: 1, atoms: ["C"] }, { at: 1, atoms: ["Br"] }] }, majorPercent: 0 },
  { name: "2-bromo-2-methylpropane", formula: "(CH₃)₃CBr", degree: 3, sketch: { atoms: C(3), branches: [{ at: 1, atoms: ["C"] }, { at: 1, atoms: ["Br"] }] }, majorPercent: 0 },
];

interface Link {
  a: number;
  b: number;
  order: number;
  /** Where the bond lives in the sketch: chain bond i → i + 1, or branch k's first bond. */
  chain?: number;
  branch?: number;
}

/** Atoms (main chain, then branches) and the bonds between them. */
function sketchLinks(sketch: OrganicSketch): { atoms: string[]; links: Link[] } {
  const atoms = [...sketch.atoms, ...(sketch.branches ?? []).flatMap((b) => b.atoms)];
  const links: Link[] = [];
  sketch.atoms.forEach((_, i) => {
    if (i + 1 < sketch.atoms.length) links.push({ a: i, b: i + 1, order: sketch.orders?.[i] ?? 1, chain: i });
  });
  let next = sketch.atoms.length;
  (sketch.branches ?? []).forEach((branch, k) => {
    branch.atoms.forEach((_, j) => {
      links.push({ a: j === 0 ? branch.at : next + j - 1, b: next + j, order: j === 0 ? (branch.order ?? 1) : 1, ...(j === 0 ? { branch: k } : {}) });
    });
    next += branch.atoms.length;
  });
  return { atoms, links };
}

/** The sketch with Br taken off (it must be the last chain atom or the last branch). */
function withoutBromine(sketch: OrganicSketch): OrganicSketch {
  if (sketch.atoms[sketch.atoms.length - 1] === "Br") {
    return { ...sketch, atoms: sketch.atoms.slice(0, -1), orders: sketch.orders?.slice(0, sketch.atoms.length - 2) };
  }
  return { ...sketch, branches: (sketch.branches ?? []).slice(0, -1) };
}

export interface HaloAlkene {
  /** IUPAC name with every locant (prop-1-ene). */
  name: string;
  /** The name NCERT writes (propene), or the IUPAC name. */
  shortName: string;
  sketch: OrganicSketch;
  /** Alkyl groups on the two carbons of the C=C. */
  alkyl: number;
  /** Whether it has cis and trans forms. */
  cisTrans: boolean;
}

export interface HaloEliminationResult {
  /** The α-carbon (bonded to Br), as an atom index of the sketch. */
  alpha: number;
  /** β-carbons that carry a hydrogen, as atom indices. */
  beta: number[];
  /** Hydrogens on β-carbons. */
  betaHydrogens: number;
  alcohol: { name: string; sketch: OrganicSketch };
  /** Distinct alkenes, major (most substituted, Saytzeff) first. */
  alkenes: HaloAlkene[];
}

const nameOf = (sketch: OrganicSketch) => nameOrganic(organicGraphFromSketch(sketch)).name;

/** Substitution and elimination products of an alkyl bromide, by rule. */
export function haloEliminate(substrate: HaloEliminationSubstrate): HaloEliminationResult {
  const { atoms, links } = sketchLinks(substrate.sketch);
  const br = atoms.indexOf("Br");
  const alphaLink = links.find((l) => l.a === br || l.b === br)!;
  const alpha = alphaLink.a === br ? alphaLink.b : alphaLink.a;
  const carbonNeighbours = (i: number) => links.filter((l) => (l.a === i || l.b === i) && atoms[l.a === i ? l.b : l.a] === "C");
  const hydrogens = (i: number) => 4 - links.filter((l) => l.a === i || l.b === i).reduce((s, l) => s + l.order, 0);

  const alcoholSketch: OrganicSketch = {
    ...substrate.sketch,
    atoms: substrate.sketch.atoms.map((a) => (a === "Br" ? "O" : a)),
    branches: substrate.sketch.branches?.map((b) => ({ ...b, atoms: b.atoms.map((a) => (a === "Br" ? "O" : a)) })),
  };

  const bare = withoutBromine(substrate.sketch);
  const beta: number[] = [];
  const found = new Map<string, HaloAlkene>();
  for (const link of carbonNeighbours(alpha)) {
    const j = link.a === alpha ? link.b : link.a;
    if (hydrogens(j) <= 0) continue;
    beta.push(j);
    const sketch: OrganicSketch = { ...bare, orders: bare.atoms.slice(0, -1).map((_, i) => bare.orders?.[i] ?? 1), branches: bare.branches?.map((b) => ({ ...b })) };
    if (link.chain !== undefined) sketch.orders![link.chain] = 2;
    else if (link.branch !== undefined) sketch.branches![link.branch] = { ...sketch.branches![link.branch]!, order: 2 };
    const name = nameOf(sketch);
    if (found.has(name)) continue;
    found.set(name, {
      name,
      shortName: organicShortName(name) ?? name,
      sketch,
      alkyl: carbonNeighbours(alpha).length - 1 + carbonNeighbours(j).length - 1,
      cisTrans: organicHasCisTrans(organicGraphFromSketch(sketch)),
    });
  }
  const alkenes = [...found.values()].sort((p, q) => q.alkyl - p.alkyl);
  return {
    alpha,
    beta,
    betaHydrogens: beta.reduce((s, j) => s + hydrogens(j), 0),
    alcohol: { name: nameOf(alcoholSketch), sketch: alcoholSketch },
    alkenes,
  };
}

// ── Chirality ────────────────────────────────────────────────────────────────

export interface HaloChiralMolecule {
  name: string;
  formula: string;
  /** Groups on the central carbon: up, right, front (wedge), back (dash). */
  groups: readonly [string, string, string, string];
  /** CIP priorities in the same order (1 highest); all 0 when two groups are the same. */
  priorities: readonly [number, number, number, number];
  /** Specific rotation of the (S) enantiomer, degrees ([α]D, measured); 0 if achiral. */
  rotationS: number;
}

export const HALO_CHIRAL_MOLECULES: readonly HaloChiralMolecule[] = [
  { name: "butan-2-ol", formula: "CH₃CH(OH)CH₂CH₃", groups: ["H", "OH", "C₂H₅", "CH₃"], priorities: [4, 1, 2, 3], rotationS: 13.5 },
  { name: "2-bromobutane", formula: "CH₃CHBrCH₂CH₃", groups: ["H", "Br", "C₂H₅", "CH₃"], priorities: [4, 1, 2, 3], rotationS: 23.1 },
  { name: "2-bromopropane", formula: "CH₃CHBrCH₃", groups: ["H", "Br", "CH₃", "CH₃"], priorities: [0, 0, 0, 0], rotationS: 0 },
  { name: "2-bromo-2-methylpropane", formula: "(CH₃)₃CBr", groups: ["Br", "CH₃", "CH₃", "CH₃"], priorities: [0, 0, 0, 0], rotationS: 0 },
];

/** Tetrahedral directions: up, right, front, back. */
export const HALO_TETRAHEDRON: readonly HaloVec[] = (() => {
  const r = Math.sqrt(8) / 3;
  return [v3(0, 1, 0), v3(r, -COS_TET, 0), v3(-r / 2, -COS_TET, r * Math.sqrt(3) / 2), v3(-r / 2, -COS_TET, -r * Math.sqrt(3) / 2)];
})();

/** The mirror image (x → −x) turned by `turnDeg` about the vertical axis. */
export function haloMirrorPositions(turnDeg: number): HaloVec[] {
  const t = (turnDeg * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return HALO_TETRAHEDRON.map((p) => {
    const x = -p.x;
    return v3(x * c + p.z * s, p.y, -x * s + p.z * c);
  });
}

/** Whether the turned mirror image lies exactly on the original, group for group. */
export function haloSuperimposes(molecule: HaloChiralMolecule, turnDeg: number): boolean {
  const mirror = haloMirrorPositions(turnDeg);
  return HALO_TETRAHEDRON.every((p, i) => {
    const j = mirror.findIndex((q) => Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) < 0.05);
    return j >= 0 && molecule.groups[j] === molecule.groups[i];
  });
}

/** R/S of the molecule as drawn (A), or of its mirror image (B). */
export function haloChiralConfiguration(molecule: HaloChiralMolecule, mirror = false): number {
  if (molecule.priorities.includes(0)) return 0;
  const positions = mirror ? haloMirrorPositions(0) : HALO_TETRAHEDRON;
  return haloConfiguration(positions.map((p, i) => ({ p, priority: molecule.priorities[i]! })));
}

// ── Haloarenes ───────────────────────────────────────────────────────────────

export interface HaloArene {
  name: string;
  /** Ring positions (Cl on C1) carrying –NO₂. */
  nitro: readonly number[];
  /** Conditions for Cl → OH (NCERT). */
  conditions: string;
  /** Temperature needed, K (NCERT). */
  temperature: number;
  product: string;
}

export const HALO_ARENES: readonly HaloArene[] = [
  { name: "chlorobenzene", nitro: [], conditions: "NaOH, 623 K, 300 atm; then H⁺", temperature: 623, product: "phenol" },
  { name: "1-chloro-4-nitrobenzene", nitro: [4], conditions: "NaOH, 443 K; then H⁺", temperature: 443, product: "4-nitrophenol" },
  { name: "1-chloro-2,4-dinitrobenzene", nitro: [2, 4], conditions: "NaOH, 368 K; then H⁺", temperature: 368, product: "2,4-dinitrophenol" },
  { name: "2-chloro-1,3,5-trinitrobenzene", nitro: [2, 4, 6], conditions: "warm water, 323 K", temperature: 323, product: "2,4,6-trinitrophenol (picric acid)" },
];

export interface HaloElectrophile {
  reagent: string;
  /** The group that enters the ring. */
  group: string;
  ortho: string;
  para: string;
}

/** Chlorobenzene's electrophilic substitutions (NCERT): ortho and para products, para major. */
export const HALO_ELECTROPHILES: readonly HaloElectrophile[] = [
  { reagent: "Cl₂, anhydrous FeCl₃", group: "Cl", ortho: "1,2-dichlorobenzene", para: "1,4-dichlorobenzene" },
  { reagent: "conc. HNO₃ + conc. H₂SO₄", group: "NO₂", ortho: "1-chloro-2-nitrobenzene", para: "1-chloro-4-nitrobenzene" },
  { reagent: "conc. H₂SO₄, heat", group: "SO₃H", ortho: "2-chlorobenzenesulphonic acid", para: "4-chlorobenzenesulphonic acid" },
  { reagent: "CH₃Cl, anhydrous AlCl₃", group: "CH₃", ortho: "1-chloro-2-methylbenzene", para: "1-chloro-4-methylbenzene" },
  { reagent: "CH₃COCl, anhydrous AlCl₃", group: "COCH₃", ortho: "2-chloroacetophenone", para: "4-chloroacetophenone" },
];

// ── The model ────────────────────────────────────────────────────────────────

export type HaloParams = {
  /** 1 strong (OH⁻, CN⁻), 0 weak (H₂O, CH₃OH). */
  nucleophile: number;
  /** 1 polar protic (water, alcohols), 0 polar aprotic (acetone, DMSO). */
  solvent: number;
  /** Index into HALO_ELIMINATION_SUBSTRATES. */
  substrate: number;
  /** 0 aqueous KOH, 1 alcoholic KOH. */
  reagent: number;
  /** Index into HALO_CHIRAL_MOLECULES. */
  molecule: number;
  /** Index into HALO_ARENES. */
  arene: number;
  /** Index into HALO_ELECTROPHILES. */
  electrophile: number;
};

export interface HaloState {
  /** 0 F, 1 Cl, 2 Br, 3 I. */
  halogen: number;
  /** 0 methyl, 1 primary, 2 secondary, 3 tertiary. */
  degree: number;
  /** How far the mechanism has run, 0 → 1. */
  progress: number;
  /** [RX] and [Nu⁻], mol/L. */
  rx: number;
  nu: number;
  /** Turn of the mirror image about the vertical bond, degrees. */
  turn: number;
  /** Share of the (+) enantiomer in the sample, %. */
  plus: number;
}

export type HaloResults = {
  halogen: number;
  bondLength: number;
  bondEnthalpy: number;
  dipole: number;
  electronegativity: number;
  enDiff: number;
  boilingPoint: number;
  reactivityRank: number;

  degree: number;
  alkylGroups: number;
  sn2Rate: number;
  sn1Rate: number;
  sn2Rank: number;
  sn1Rank: number;
  alphaH: number;
  sn2Blocked: number;
  sn1Possible: number;
  progress: number;
  sn2Stage: number;
  sn1Stage: number;
  configBefore: number;
  configAfter: number;
  rx: number;
  nu: number;
  sn2RateFactor: number;
  sn1RateFactor: number;
  sn2Order: number;
  sn1Order: number;
  nucleophile: number;
  solvent: number;
  pathway: number;
  eliminationRisk: number;

  substrate: number;
  substrateDegree: number;
  reagent: number;
  productClass: number;
  alkeneCount: number;
  majorAlkyl: number;
  minorAlkyl: number;
  betaCarbons: number;
  betaHydrogens: number;
  majorPercent: number;

  molecule: number;
  distinctGroups: number;
  chiral: number;
  turn: number;
  superimposes: number;
  configA: number;
  configB: number;
  specificRotation: number;
  plus: number;
  enantiomericExcess: number;
  mixtureRotation: number;

  arene: number;
  opNitro: number;
  temperature: number;
  arylBond: number;
  alkylBond: number;
  electrophile: number;
};

const OUTPUTS = [
  "halogen", "bondLength", "bondEnthalpy", "dipole", "electronegativity", "enDiff", "boilingPoint", "reactivityRank",
  "degree", "alkylGroups", "sn2Rate", "sn1Rate", "sn2Rank", "sn1Rank", "alphaH", "sn2Blocked", "sn1Possible",
  "progress", "sn2Stage", "sn1Stage", "configBefore", "configAfter",
  "rx", "nu", "sn2RateFactor", "sn1RateFactor", "sn2Order", "sn1Order", "nucleophile", "solvent", "pathway", "eliminationRisk",
  "substrate", "substrateDegree", "reagent", "productClass", "alkeneCount", "majorAlkyl", "minorAlkyl", "betaCarbons", "betaHydrogens", "majorPercent",
  "molecule", "distinctGroups", "chiral", "turn", "superimposes", "configA", "configB", "specificRotation", "plus", "enantiomericExcess", "mixtureRotation",
  "arene", "opNitro", "temperature", "arylBond", "alkylBond", "electrophile",
] as const satisfies readonly (keyof HaloResults)[];

/** Concentrations the rate factors are measured against, mol/L. */
export const HALO_REFERENCE_CONC = 0.1;

const index = (v: number, n: number) => clamp(Math.round(Number.isFinite(v) ? v : 0), 0, n - 1);
const z = (v: number) => v || 0;
const snap = (v: number, step: number) => Math.round(v / step) * step;

export function haloEliminationSubstrate(i: number): HaloEliminationSubstrate {
  return HALO_ELIMINATION_SUBSTRATES[index(i, HALO_ELIMINATION_SUBSTRATES.length)]!;
}
export function haloChiralMolecule(i: number): HaloChiralMolecule {
  return HALO_CHIRAL_MOLECULES[index(i, HALO_CHIRAL_MOLECULES.length)]!;
}
export function haloArene(i: number): HaloArene {
  return HALO_ARENES[index(i, HALO_ARENES.length)]!;
}
export function haloElectrophile(i: number): HaloElectrophile {
  return HALO_ELECTROPHILES[index(i, HALO_ELECTROPHILES.length)]!;
}

const LIMITS = {
  halogen: [0, 3],
  degree: [0, 3],
  progress: [0, 1],
  rx: [0.05, 0.5],
  nu: [0.05, 0.5],
  turn: [0, 360],
  plus: [0, 100],
} as const satisfies Record<keyof HaloState, readonly [number, number]>;

/** SN2 stage: 0 approach, 1 transition state, 2 product. */
const sn2Stage = (p: number) => (p < 0.3 ? 0 : p < 0.7 ? 1 : 2);
/** SN1 stage: 0 C–X ionising, 1 carbocation, 2 attack and product. */
const sn1Stage = (p: number) => (p < 0.32 ? 0 : p < 0.55 ? 1 : 2);

export const haloModel: SimulationModel<HaloState, HaloParams, HaloResults> = {
  id: "halo",
  defaultParams: { nucleophile: 1, solvent: 1, substrate: 3, reagent: 1, molecule: 1, arene: 0, electrophile: 1 },
  outputs: OUTPUTS,
  stateVariables: ["halogen", "degree", "progress", "rx", "nu", "turn", "plus"],

  initialize() {
    return { halogen: 1, degree: 0, progress: 0, rx: 0.1, nu: 0.1, turn: 0, plus: 100 };
  },

  /** Play runs the mechanism over four seconds. */
  advance(state, dt) {
    return { ...state, progress: Math.min(1, state.progress + 0.25 * Math.max(0, dt)) };
  },

  step(state, _params, sign) {
    return { ...state, progress: clamp(snap(state.progress, 0.1) + 0.1 * sign, 0, 1) };
  },

  derive(state, params) {
    const h = index(state.halogen, 4);
    const bond = HALO_BONDS[h]!;
    const degree = index(state.degree, 4);
    const sub = HALO_SUBSTRATES[degree]!;
    const progress = clamp(state.progress, 0, 1);
    const rx = clamp(state.rx, LIMITS.rx[0], LIMITS.rx[1]);
    const nu = clamp(state.nu, LIMITS.nu[0], LIMITS.nu[1]);
    const strong = Math.round(params.nucleophile) === 1;
    const protic = Math.round(params.solvent) === 1;
    const twoDifferent = degree === 2;
    const configBefore = twoDifferent ? haloFrameConfiguration(haloSn2Frame(0, degree), degree) : 0;
    const configAfter = twoDifferent ? haloFrameConfiguration(haloSn2Frame(1, degree), degree) : 0;

    const elimination = haloEliminationSubstrate(params.substrate);
    const products = haloEliminate(elimination);
    const alcoholic = Math.round(params.reagent) === 1;

    const molecule = haloChiralMolecule(params.molecule);
    const turn = clamp(state.turn, 0, 360);
    const plus = clamp(state.plus, 0, 100);
    const chiral = molecule.rotationS !== 0 ? 1 : 0;
    const configA = haloChiralConfiguration(molecule);
    const configB = haloChiralConfiguration(molecule, true);
    const rotationA = configA === 2 ? molecule.rotationS : -molecule.rotationS;
    const excess = (2 * plus) / 100 - 1;

    const arene = haloArene(params.arene);

    return {
      halogen: h,
      bondLength: bond.length,
      bondEnthalpy: bond.enthalpy,
      dipole: bond.dipole,
      electronegativity: bond.electronegativity,
      enDiff: Math.round((bond.electronegativity - HALO_CARBON_EN) * 100) / 100,
      boilingPoint: bond.boilingPoint,
      reactivityRank: h + 1,

      degree,
      alkylGroups: degree,
      sn2Rate: sub.sn2,
      sn1Rate: sub.sn1,
      sn2Rank: 4 - degree,
      sn1Rank: degree + 1,
      // C–H bonds next to C⁺: CH₃⁺ 0, CH₃CH₂⁺ 3, CH₃CH⁺CH₂CH₃ (from 2-bromobutane) 3 + 2 = 5, (CH₃)₃C⁺ 9.
      alphaH: [0, 3, 5, 9][degree]!,
      sn2Blocked: degree === 3 ? 1 : 0,
      sn1Possible: degree >= 2 ? 1 : 0,
      progress,
      sn2Stage: sn2Stage(degree === 3 ? Math.min(progress, 0.2) : progress),
      sn1Stage: sn1Stage(progress),
      configBefore,
      configAfter,
      rx,
      nu,
      sn2RateFactor: (rx / HALO_REFERENCE_CONC) * (nu / HALO_REFERENCE_CONC),
      sn1RateFactor: rx / HALO_REFERENCE_CONC,
      sn2Order: 2,
      sn1Order: 1,
      nucleophile: strong ? 1 : 0,
      solvent: protic ? 1 : 0,
      pathway: haloPathway(degree, strong, protic),
      eliminationRisk: strong && degree >= 2 ? 1 : 0,

      substrate: HALO_ELIMINATION_SUBSTRATES.indexOf(elimination),
      substrateDegree: elimination.degree,
      reagent: alcoholic ? 1 : 0,
      productClass: alcoholic ? 1 : 0,
      alkeneCount: products.alkenes.length,
      majorAlkyl: products.alkenes[0]?.alkyl ?? 0,
      minorAlkyl: products.alkenes[1]?.alkyl ?? 0,
      betaCarbons: products.beta.length,
      betaHydrogens: products.betaHydrogens,
      majorPercent: elimination.majorPercent,

      molecule: HALO_CHIRAL_MOLECULES.indexOf(molecule),
      distinctGroups: new Set(molecule.groups).size,
      chiral,
      turn,
      superimposes: haloSuperimposes(molecule, turn) ? 1 : 0,
      configA,
      configB,
      specificRotation: z(chiral ? rotationA : 0),
      plus,
      enantiomericExcess: Math.abs(excess) * 100,
      mixtureRotation: z(chiral ? Math.abs(molecule.rotationS) * excess : 0),

      arene: HALO_ARENES.indexOf(arene),
      opNitro: arene.nitro.filter((p) => p === 2 || p === 4 || p === 6).length,
      temperature: arene.temperature,
      arylBond: HALO_ARYL_C_CL,
      alkylBond: HALO_BONDS[1]!.length,
      electrophile: HALO_ELECTROPHILES.indexOf(haloElectrophile(params.electrophile)),
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof HaloState] : undefined;
  },

  setVariable(state, id, value) {
    if (!(id in LIMITS)) return state;
    const [lo, hi] = LIMITS[id as keyof HaloState];
    const integer = id === "halogen" || id === "degree";
    const v = clamp(value, lo, hi);
    return { ...state, [id]: integer ? Math.round(v) : v };
  },
};
