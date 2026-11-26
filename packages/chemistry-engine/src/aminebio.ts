import type { SimulationModel } from "@ise/science-engine";
import { organicStem } from "./organic";

/**
 * Amines (NCERT class 12, unit 9) and Biomolecules (unit 10), as data + rules.
 *
 * Basicity. NCERT's pKb values in water (Table 9.3) for ammonia, the methyl
 * and ethyl amines, benzylamine and the anilines; ring-substituted anilines
 * from standard data (pKb = 14 − pKa of the anilinium ion, 298 K). Kb =
 * 10^−pKb. The gas-phase order (3° > 2° > 1° > NH₃, the +I effect alone) is
 * given as a rule, not as numbers.
 *
 * Tests on an amine, by its class: carbylamine (1° only), Hinsberg
 * (1° → sulphonamide soluble in alkali, 2° → insoluble, 3° → no reaction),
 * nitrous acid (1° aliphatic → N₂ + alcohol, 1° aromatic → diazonium salt).
 *
 * Preparation: six routes × alkyl or aryl starting compound → product, with
 * the carbon count (Hoffmann bromamide loses one; Gabriel fails on aryl
 * halides; ammonolysis gives a mixture).
 *
 * Diazonium salts: benzenediazonium chloride + a reagent → product (Sandmeyer,
 * Gattermann, Balz–Schiemann, replacement by –I, –OH, –H, –NO₂, and the two
 * coupling reactions). The salt is made and kept at 273–278 K; warmer, it
 * decomposes (to phenol and N₂) — modelled as a sharp cut at 278 K.
 *
 * Biomolecules: sugars (class, reducing or not, units and links); the
 * α/β anomers of glucose and the specific rotation of a mixture, which Play
 * mutarotates to equilibrium; glycine and alanine as zwitterions across pH,
 * and peptides; enzymes and their substrates (lock and key); vitamins and
 * deficiency diseases (NCERT Table 10.3); DNA and RNA bases and Chargaff's
 * rule (A = T, G = C).
 */

// ── Atoms and formulae ────────────────────────────────────────────────────────

const MASS: Readonly<Record<string, number>> = { C: 12.01, H: 1.008, N: 14.01, O: 16.0, F: 19.0, Cl: 35.45, Br: 79.9, I: 126.9 };

export type AminebioFormula = Partial<Record<"C" | "H" | "N" | "O" | "F" | "Cl" | "Br" | "I", number>>;

/** Molar mass, g/mol, from standard atomic masses (C 12.01, H 1.008, N 14.01, O 16.00 …). */
export function aminebioMolarMass(f: AminebioFormula): number {
  return Object.entries(f).reduce((s, [el, n]) => s + (MASS[el] ?? 0) * (n ?? 0), 0);
}

const SUBSCRIPT = "₀₁₂₃₄₅₆₇₈₉";
const sub = (n: number) => String(n).split("").map((d) => SUBSCRIPT[Number(d)]).join("");

/** Condensed formula of a straight alkyl group of n carbons: CH₃, CH₃CH₂, CH₃(CH₂)₂ … */
export function aminebioAlkyl(n: number): string {
  if (n <= 0) return "H";
  if (n === 1) return "CH₃";
  if (n === 2) return "CH₃CH₂";
  return `CH₃(CH₂)${sub(n - 1)}`;
}

// ── Amines and their basicity ─────────────────────────────────────────────────

export interface AminebioAmine {
  formula: string;
  name: string;
  /** Carbon groups on N: 0 for NH₃, 1 primary, 2 secondary, 3 tertiary. */
  degree: number;
  /** 1 when N is bonded straight to a benzene ring (an arylamine). */
  aromatic: number;
  /** pKb in water at 298 K. */
  pKb: number;
  /** For anilines: +1 an electron-releasing group on the ring, −1 a withdrawing one, 0 none. */
  ringEffect: number;
  /** One line on why it is as basic as it is. */
  why: string;
  /** For drawing: what N carries — "ammonia", alkyl groups ("alkyl"), a benzyl group, or a ring ("aryl"). */
  kind: "ammonia" | "alkyl" | "benzyl" | "aryl";
  /** Carbons in each alkyl group on N (1 methyl, 2 ethyl); 0 for none. */
  alkylC: number;
  /** Group para to N on the ring, or "". */
  ringGroup: string;
}

/**
 * pKb: NCERT Table 9.3 for rows 0–10 (ammonia 4.75); rows 11–14 are standard
 * data (pKa of the anilinium ion 5.08, 5.34, 3.98, 1.0).
 */
export const AMINEBIO_AMINES: readonly AminebioAmine[] = [
  { formula: "NH₃", name: "ammonia", degree: 0, aromatic: 0, pKb: 4.75, ringEffect: 0, why: "The yardstick: no alkyl groups", kind: "ammonia", alkylC: 0, ringGroup: "" },
  { formula: "CH₃NH₂", name: "methanamine", degree: 1, aromatic: 0, pKb: 3.38, ringEffect: 0, why: "+I of CH₃, and RNH₃⁺ is well hydrated", kind: "alkyl", alkylC: 1, ringGroup: "" },
  { formula: "(CH₃)₂NH", name: "N-methylmethanamine", degree: 2, aromatic: 0, pKb: 3.27, ringEffect: 0, why: "Two +I groups, still well hydrated", kind: "alkyl", alkylC: 1, ringGroup: "" },
  { formula: "(CH₃)₃N", name: "N,N-dimethylmethanamine", degree: 3, aromatic: 0, pKb: 4.22, ringEffect: 0, why: "R₃NH⁺ has one N–H to H-bond with water", kind: "alkyl", alkylC: 1, ringGroup: "" },
  { formula: "C₂H₅NH₂", name: "ethanamine", degree: 1, aromatic: 0, pKb: 3.29, ringEffect: 0, why: "+I of C₂H₅, and RNH₃⁺ is well hydrated", kind: "alkyl", alkylC: 2, ringGroup: "" },
  { formula: "(C₂H₅)₂NH", name: "N-ethylethanamine", degree: 2, aromatic: 0, pKb: 3.0, ringEffect: 0, why: "+I and hydration in balance: the strongest", kind: "alkyl", alkylC: 2, ringGroup: "" },
  { formula: "(C₂H₅)₃N", name: "N,N-diethylethanamine", degree: 3, aromatic: 0, pKb: 3.25, ringEffect: 0, why: "Strong +I, but crowded and poorly hydrated", kind: "alkyl", alkylC: 2, ringGroup: "" },
  { formula: "C₆H₅CH₂NH₂", name: "phenylmethanamine", degree: 1, aromatic: 0, pKb: 4.7, ringEffect: 0, why: "N is not on the ring: its lone pair stays on N", kind: "benzyl", alkylC: 0, ringGroup: "" },
  { formula: "C₆H₅NH₂", name: "aniline", degree: 1, aromatic: 1, pKb: 9.38, ringEffect: 0, why: "N's lone pair is spread into the ring", kind: "aryl", alkylC: 0, ringGroup: "" },
  { formula: "C₆H₅NHCH₃", name: "N-methylaniline", degree: 2, aromatic: 1, pKb: 9.3, ringEffect: 0, why: "Lone pair delocalised; CH₃ helps a little", kind: "aryl", alkylC: 1, ringGroup: "" },
  { formula: "C₆H₅N(CH₃)₂", name: "N,N-dimethylaniline", degree: 3, aromatic: 1, pKb: 8.92, ringEffect: 0, why: "Lone pair delocalised; two CH₃ help a little", kind: "aryl", alkylC: 1, ringGroup: "" },
  { formula: "p-CH₃C₆H₄NH₂", name: "4-methylaniline", degree: 1, aromatic: 1, pKb: 8.92, ringEffect: 1, why: "–CH₃ releases electrons: stronger than aniline", kind: "aryl", alkylC: 0, ringGroup: "CH₃" },
  { formula: "p-CH₃OC₆H₄NH₂", name: "4-methoxyaniline", degree: 1, aromatic: 1, pKb: 8.66, ringEffect: 1, why: "–OCH₃ (+R) releases electrons: stronger", kind: "aryl", alkylC: 0, ringGroup: "OCH₃" },
  { formula: "p-ClC₆H₄NH₂", name: "4-chloroaniline", degree: 1, aromatic: 1, pKb: 10.02, ringEffect: -1, why: "–Cl (−I) withdraws electrons: weaker", kind: "aryl", alkylC: 0, ringGroup: "Cl" },
  { formula: "p-NO₂C₆H₄NH₂", name: "4-nitroaniline", degree: 1, aromatic: 1, pKb: 13.0, ringEffect: -1, why: "–NO₂ (−R, −I) withdraws strongly: far weaker", kind: "aryl", alkylC: 0, ringGroup: "NO₂" },
];

export const AMINEBIO_AMMONIA_PKB = 4.75;

export function aminebioAmine(index: number): AminebioAmine {
  return AMINEBIO_AMINES[clampInt(index, 0, AMINEBIO_AMINES.length - 1)]!;
}

export const AMINEBIO_HINSBERG = ["not part of the test", "sulphonamide, dissolves in KOH", "sulphonamide, insoluble in KOH", "no reaction"] as const;
export const AMINEBIO_NITROUS = ["not covered here", "N₂ bubbles off; an alcohol forms", "a diazonium salt (at 273–278 K)"] as const;

/** Hinsberg's reagent, C₆H₅SO₂Cl: 1° → 1, 2° → 2, 3° → 3; ammonia is not part of the test (0). */
export function aminebioHinsberg(a: AminebioAmine): number {
  return a.degree;
}

/** Carbylamine (CHCl₃ + ethanolic KOH, warm): an isocyanide, foul-smelling, from 1° amines only. */
export function aminebioCarbylamine(a: AminebioAmine): number {
  return a.degree === 1 ? 1 : 0;
}

/** Nitrous acid (NaNO₂ + HCl): 1° aliphatic → N₂ + alcohol (1); 1° aromatic → diazonium salt (2); else 0. */
export function aminebioNitrous(a: AminebioAmine): number {
  if (a.degree !== 1) return 0;
  return a.aromatic ? 2 : 1;
}

// ── Preparing amines ─────────────────────────────────────────────────────────

export const AMINEBIO_ROUTES = [
  { name: "Reduction of a nitro compound", reagent: "H₂/Pd, or Sn/HCl, or Fe/HCl" },
  { name: "Ammonolysis of a halide", reagent: "NH₃ (ethanolic), 373 K, sealed tube" },
  { name: "Reduction of a nitrile", reagent: "H₂/Ni, or LiAlH₄, or Na(Hg)/C₂H₅OH" },
  { name: "Reduction of an amide", reagent: "LiAlH₄, then H₂O" },
  { name: "Gabriel phthalimide synthesis", reagent: "phthalimide + KOH; R–X; then NaOH(aq)" },
  { name: "Hoffmann bromamide degradation", reagent: "Br₂ + 4NaOH (aq), warm" },
] as const;

export const AMINEBIO_PRODUCT_CLASSES = ["no amine", "a 1° amine only", "a mixture: 1°, 2°, 3° and R₄N⁺X⁻"] as const;

export interface AminebioPrep {
  works: number;
  /** Index into AMINEBIO_PRODUCT_CLASSES. */
  productClass: number;
  startCarbons: number;
  productCarbons: number;
  /** 1 when the product's N is on a benzene ring. */
  ringAmine: number;
  start: string;
  startName: string;
  product: string;
  productName: string;
  /** Why it fails, or what is special; "" otherwise. */
  note: string;
}

const AMINE_NAMES = (n: number) => (n === 1 ? "methanamine" : n === 2 ? "ethanamine" : `${organicStem(n)}an-1-amine`);
const PREFIX_NAME = (n: number, prefix: string) => (n <= 2 ? `${prefix}${organicStem(n)}ane` : `1-${prefix}${organicStem(n)}ane`);

/**
 * Route × starting compound → product. `aryl` = 0: an alkyl compound with n
 * carbons (nitroalkane, bromoalkane, nitrile, amide — n counts the C of –CN
 * or –CONH₂). `aryl` = 1: nitrobenzene, bromobenzene, benzonitrile, benzamide.
 */
export function aminebioPrepare(route: number, aryl: number, carbons: number): AminebioPrep {
  const r = clampInt(route, 0, AMINEBIO_ROUTES.length - 1);
  const n = clampInt(carbons, 1, 6);
  const none = (start: string, startName: string, startCarbons: number, note: string): AminebioPrep => ({
    works: 0,
    productClass: 0,
    startCarbons,
    productCarbons: 0,
    ringAmine: 0,
    start,
    startName,
    product: "no amine",
    productName: "",
    note,
  });
  const ok = (start: string, startName: string, startCarbons: number, product: string, productName: string, productCarbons: number, ringAmine: number, note = "", productClass = 1): AminebioPrep => ({
    works: 1,
    productClass,
    startCarbons,
    productCarbons,
    ringAmine,
    start,
    startName,
    product,
    productName,
    note,
  });
  const amine = (m: number) => `${aminebioAlkyl(m)}NH₂`;
  if (aryl) {
    switch (r) {
      case 0: return ok("C₆H₅NO₂", "nitrobenzene", 6, "C₆H₅NH₂", "aniline", 6, 1, "Fe/HCl preferred: FeCl₂ hydrolyses, giving back HCl");
      case 1: return none("C₆H₅Br", "bromobenzene", 6, "Aryl halides resist nucleophilic substitution");
      case 2: return ok("C₆H₅CN", "benzonitrile", 7, "C₆H₅CH₂NH₂", "phenylmethanamine", 7, 0, "–CN becomes –CH₂NH₂: N is not on the ring");
      case 3: return ok("C₆H₅CONH₂", "benzamide", 7, "C₆H₅CH₂NH₂", "phenylmethanamine", 7, 0, "C=O becomes CH₂: N is not on the ring");
      case 4: return none("C₆H₅Br", "bromobenzene", 6, "Aryl halides do not react with the phthalimide anion");
      default: return ok("C₆H₅CONH₂", "benzamide", 7, "C₆H₅NH₂", "aniline", 6, 1, "The C=O carbon leaves as CO₃²⁻: one carbon fewer");
    }
  }
  switch (r) {
    case 0: return ok(`${aminebioAlkyl(n)}NO₂`, PREFIX_NAME(n, "nitro"), n, amine(n), AMINE_NAMES(n), n, 0);
    case 1: return ok(`${aminebioAlkyl(n)}Br`, PREFIX_NAME(n, "bromo"), n, amine(n), AMINE_NAMES(n), n, 0, "The amine attacks more halide: further alkylation", 2);
    case 2: {
      const start = n === 1 ? "HCN" : `${aminebioAlkyl(n - 1)}CN`;
      const name = n === 1 ? "hydrogen cyanide" : `${organicStem(n)}anenitrile`;
      return ok(start, name, n, amine(n), AMINE_NAMES(n), n, 0, "One C more than the R–X the nitrile was made from");
    }
    case 3: {
      const start = n === 1 ? "HCONH₂" : `${aminebioAlkyl(n - 1)}CONH₂`;
      return ok(start, `${organicStem(n)}anamide`, n, amine(n), AMINE_NAMES(n), n, 0);
    }
    case 4: return ok(`${aminebioAlkyl(n)}Br`, PREFIX_NAME(n, "bromo"), n, amine(n), AMINE_NAMES(n), n, 0, "Pure 1° amine: no 2° or 3° by-products");
    default: {
      const start = n === 1 ? "HCONH₂" : `${aminebioAlkyl(n - 1)}CONH₂`;
      const name = `${organicStem(n)}anamide`;
      if (n === 1) return none(start, name, 1, "No carbon would be left to carry –NH₂");
      return ok(start, name, n, amine(n - 1), AMINE_NAMES(n - 1), n - 1, 0, "The C=O carbon leaves as CO₃²⁻: one carbon fewer");
    }
  }
}

// ── Diazonium salts ──────────────────────────────────────────────────────────

export interface AminebioDiazoReaction {
  reagent: string;
  product: string;
  productName: string;
  /** The group that takes N₂'s place on the ring, or the coupling partner's group. */
  group: string;
  /** 0 none, 1 Sandmeyer, 2 Gattermann, 3 Balz–Schiemann, 4 coupling. */
  named: number;
  /** 1 when the –N=N– stays (coupling), 0 when N₂ is lost. */
  keepsNitrogen: number;
  /** 0 colourless, 1 orange, 2 yellow. */
  colour: number;
  formula: AminebioFormula;
}

export const AMINEBIO_NAMED = ["", "Sandmeyer", "Gattermann", "Balz–Schiemann", "coupling"] as const;
export const AMINEBIO_COLOURS = ["colourless", "orange", "yellow"] as const;

export const AMINEBIO_DIAZO: readonly AminebioDiazoReaction[] = [
  { reagent: "CuCl/HCl", product: "C₆H₅Cl", productName: "chlorobenzene", group: "Cl", named: 1, keepsNitrogen: 0, colour: 0, formula: { C: 6, H: 5, Cl: 1 } },
  { reagent: "CuBr/HBr", product: "C₆H₅Br", productName: "bromobenzene", group: "Br", named: 1, keepsNitrogen: 0, colour: 0, formula: { C: 6, H: 5, Br: 1 } },
  { reagent: "CuCN/KCN", product: "C₆H₅CN", productName: "benzonitrile", group: "CN", named: 1, keepsNitrogen: 0, colour: 0, formula: { C: 7, H: 5, N: 1 } },
  { reagent: "Cu/HCl", product: "C₆H₅Cl", productName: "chlorobenzene", group: "Cl", named: 2, keepsNitrogen: 0, colour: 0, formula: { C: 6, H: 5, Cl: 1 } },
  { reagent: "Cu/HBr", product: "C₆H₅Br", productName: "bromobenzene", group: "Br", named: 2, keepsNitrogen: 0, colour: 0, formula: { C: 6, H: 5, Br: 1 } },
  { reagent: "KI", product: "C₆H₅I", productName: "iodobenzene", group: "I", named: 0, keepsNitrogen: 0, colour: 0, formula: { C: 6, H: 5, I: 1 } },
  { reagent: "HBF₄, then heat", product: "C₆H₅F", productName: "fluorobenzene", group: "F", named: 3, keepsNitrogen: 0, colour: 0, formula: { C: 6, H: 5, F: 1 } },
  { reagent: "H₂O, warm", product: "C₆H₅OH", productName: "phenol", group: "OH", named: 0, keepsNitrogen: 0, colour: 0, formula: { C: 6, H: 6, O: 1 } },
  { reagent: "H₃PO₂ (or C₂H₅OH)", product: "C₆H₆", productName: "benzene", group: "H", named: 0, keepsNitrogen: 0, colour: 0, formula: { C: 6, H: 6 } },
  { reagent: "HBF₄; NaNO₂/Cu, heat", product: "C₆H₅NO₂", productName: "nitrobenzene", group: "NO₂", named: 0, keepsNitrogen: 0, colour: 0, formula: { C: 6, H: 5, N: 1, O: 2 } },
  { reagent: "phenol, OH⁻", product: "p-HOC₆H₄N=NC₆H₅", productName: "p-hydroxyazobenzene", group: "OH", named: 4, keepsNitrogen: 1, colour: 1, formula: { C: 12, H: 10, N: 2, O: 1 } },
  { reagent: "aniline, H⁺", product: "p-H₂NC₆H₄N=NC₆H₅", productName: "p-aminoazobenzene", group: "NH₂", named: 4, keepsNitrogen: 1, colour: 2, formula: { C: 12, H: 11, N: 3 } },
];

/** Diazotisation is done, and the salt kept, at 273–278 K. */
export const AMINEBIO_DIAZO_MAX_K = 278;

export function aminebioDiazo(index: number): AminebioDiazoReaction {
  return AMINEBIO_DIAZO[clampInt(index, 0, AMINEBIO_DIAZO.length - 1)]!;
}

// ── Carbohydrates ────────────────────────────────────────────────────────────

export interface AminebioSugar {
  name: string;
  formula: string;
  /** 1 monosaccharide, 2 disaccharide, 3 polysaccharide. */
  cls: number;
  /** 1 reduces Tollens' and Fehling's reagents. */
  reducing: number;
  /** For monosaccharides: 1 aldose, 2 ketose; 0 otherwise. */
  carbonyl: number;
  /** Units as drawn: "g" α-glucose, "b" β-glucose, "f" β-fructose, "a" β-galactose, "r" ribose. */
  units: string;
  /** The glycosidic link, in words. */
  link: string;
  /** What hydrolysis gives. */
  gives: string;
  /** Molecular formula for mono- and disaccharides; empty for polysaccharides. */
  atoms: AminebioFormula;
  /** Polysaccharides with C1–C6 branches. */
  branched: number;
}

export const AMINEBIO_SUGARS: readonly AminebioSugar[] = [
  { name: "glucose", formula: "C₆H₁₂O₆", cls: 1, reducing: 1, carbonyl: 1, units: "g", link: "an aldohexose: –CHO at C1", gives: "not hydrolysed", atoms: { C: 6, H: 12, O: 6 }, branched: 0 },
  { name: "fructose", formula: "C₆H₁₂O₆", cls: 1, reducing: 1, carbonyl: 2, units: "f", link: "a ketohexose: C=O at C2", gives: "not hydrolysed", atoms: { C: 6, H: 12, O: 6 }, branched: 0 },
  { name: "ribose", formula: "C₅H₁₀O₅", cls: 1, reducing: 1, carbonyl: 1, units: "r", link: "an aldopentose, the sugar of RNA", gives: "not hydrolysed", atoms: { C: 5, H: 10, O: 5 }, branched: 0 },
  { name: "sucrose", formula: "C₁₂H₂₂O₁₁", cls: 2, reducing: 0, carbonyl: 0, units: "gf", link: "C1 of α-glucose to C2 of β-fructose", gives: "glucose + fructose", atoms: { C: 12, H: 22, O: 11 }, branched: 0 },
  { name: "maltose", formula: "C₁₂H₂₂O₁₁", cls: 2, reducing: 1, carbonyl: 0, units: "gg", link: "C1 of α-glucose to C4 of the next", gives: "2 glucose", atoms: { C: 12, H: 22, O: 11 }, branched: 0 },
  { name: "lactose", formula: "C₁₂H₂₂O₁₁", cls: 2, reducing: 1, carbonyl: 0, units: "ab", link: "C1 of β-galactose to C4 of β-glucose", gives: "galactose + glucose", atoms: { C: 12, H: 22, O: 11 }, branched: 0 },
  { name: "starch", formula: "(C₆H₁₀O₅)ₙ", cls: 3, reducing: 0, carbonyl: 0, units: "gggg", link: "α C1–C4 chains; amylopectin branches C1–C6", gives: "α-glucose", atoms: {}, branched: 1 },
  { name: "cellulose", formula: "(C₆H₁₀O₅)ₙ", cls: 3, reducing: 0, carbonyl: 0, units: "bbbb", link: "β C1–C4: long straight chains", gives: "β-glucose", atoms: {}, branched: 0 },
  { name: "glycogen", formula: "(C₆H₁₀O₅)ₙ", cls: 3, reducing: 0, carbonyl: 0, units: "gggg", link: "like amylopectin, more highly branched", gives: "α-glucose", atoms: {}, branched: 1 },
];

export const AMINEBIO_SUGAR_CLASSES = ["", "monosaccharide", "disaccharide", "polysaccharide"] as const;

export function aminebioSugar(index: number): AminebioSugar {
  return AMINEBIO_SUGARS[clampInt(index, 0, AMINEBIO_SUGARS.length - 1)]!;
}

/** Specific rotations, degrees: pure α- and β-D-glucopyranose (standard data), and glucose at equilibrium (NCERT). */
export const AMINEBIO_ALPHA_ROTATION = 112;
export const AMINEBIO_BETA_ROTATION = 18.7;
export const AMINEBIO_EQUILIBRIUM_ROTATION = 52.5;
/** NCERT: fructose −92.4°. Sucrose +66.5° (standard data). */
export const AMINEBIO_FRUCTOSE_ROTATION = -92.4;
export const AMINEBIO_SUCROSE_ROTATION = 66.5;

/** Percentage β at mutarotation equilibrium: where the mixture's rotation is +52.5°. */
export const AMINEBIO_BETA_EQUILIBRIUM = (100 * (AMINEBIO_ALPHA_ROTATION - AMINEBIO_EQUILIBRIUM_ROTATION)) / (AMINEBIO_ALPHA_ROTATION - AMINEBIO_BETA_ROTATION);

/** Specific rotation of an α/β mixture (open chain, under 1 %, ignored). */
export function aminebioRotation(betaPercent: number): number {
  const b = clamp(betaPercent, 0, 100) / 100;
  return (1 - b) * AMINEBIO_ALPHA_ROTATION + b * AMINEBIO_BETA_ROTATION;
}

/** Invert sugar: equal masses of glucose (+52.5°) and fructose (−92.4°). */
export const AMINEBIO_INVERT_ROTATION = (AMINEBIO_EQUILIBRIUM_ROTATION + AMINEBIO_FRUCTOSE_ROTATION) / 2;

// ── Amino acids and peptides ─────────────────────────────────────────────────

export interface AminebioAminoAcid {
  name: string;
  /** The side chain R in H₂N–CHR–COOH. */
  r: string;
  pKa1: number;
  pKa2: number;
  atoms: AminebioFormula;
  /** 1 when the α-carbon is chiral (every α-amino acid except glycine). */
  chiral: number;
}

/** pKa of –COOH and –NH₃⁺ at 298 K (standard data). */
export const AMINEBIO_AMINO_ACIDS: readonly AminebioAminoAcid[] = [
  { name: "glycine", r: "H", pKa1: 2.34, pKa2: 9.6, atoms: { C: 2, H: 5, N: 1, O: 2 }, chiral: 0 },
  { name: "alanine", r: "CH₃", pKa1: 2.34, pKa2: 9.69, atoms: { C: 3, H: 7, N: 1, O: 2 }, chiral: 1 },
];

export const AMINEBIO_FORMS = ["", "cation", "zwitterion", "anion"] as const;
export const AMINEBIO_WATER_MASS = aminebioMolarMass({ H: 2, O: 1 });

export function aminebioAminoAcid(index: number): AminebioAminoAcid {
  return AMINEBIO_AMINO_ACIDS[clampInt(index, 0, AMINEBIO_AMINO_ACIDS.length - 1)]!;
}

/** Average charge of the amino acid at this pH: the –NH₃⁺ still protonated minus the –COO⁻ formed. */
export function aminebioNetCharge(a: AminebioAminoAcid, pH: number): number {
  const ammonium = 1 / (1 + 10 ** (pH - a.pKa2));
  const carboxylate = 1 / (1 + 10 ** (a.pKa1 - pH));
  return ammonium - carboxylate || 0;
}

/** The form that dominates: 1 cation below pKa1, 2 zwitterion between, 3 anion above pKa2. */
export function aminebioForm(a: AminebioAminoAcid, pH: number): number {
  return pH < a.pKa1 ? 1 : pH > a.pKa2 ? 3 : 2;
}

// ── Enzymes and vitamins ─────────────────────────────────────────────────────

export interface AminebioEnzyme {
  name: string;
  /** Indices into AMINEBIO_SUGARS it acts on. */
  substrates: readonly number[];
  reaction: string;
}

export const AMINEBIO_ENZYMES: readonly AminebioEnzyme[] = [
  { name: "invertase", substrates: [3], reaction: "sucrose → glucose + fructose" },
  { name: "maltase", substrates: [4], reaction: "maltose → 2 glucose" },
  { name: "lactase", substrates: [5], reaction: "lactose → galactose + glucose" },
  { name: "diastase (amylase)", substrates: [6], reaction: "starch → maltose" },
  { name: "zymase", substrates: [0, 1], reaction: "C₆H₁₂O₆ → 2C₂H₅OH + 2CO₂" },
];

export function aminebioEnzyme(index: number): AminebioEnzyme {
  return AMINEBIO_ENZYMES[clampInt(index, 0, AMINEBIO_ENZYMES.length - 1)]!;
}

export interface AminebioVitamin {
  name: string;
  chemical: string;
  fatSoluble: number;
  /** Stored in the body (fat-soluble ones, and B₁₂ in the liver). */
  stored: number;
  disease: string;
}

/** NCERT Table 10.3. */
export const AMINEBIO_VITAMINS: readonly AminebioVitamin[] = [
  { name: "A", chemical: "retinol", fatSoluble: 1, stored: 1, disease: "xerophthalmia, night blindness" },
  { name: "B₁", chemical: "thiamine", fatSoluble: 0, stored: 0, disease: "beri beri" },
  { name: "B₂", chemical: "riboflavin", fatSoluble: 0, stored: 0, disease: "cheilosis, digestive disorders, burning skin" },
  { name: "B₆", chemical: "pyridoxine", fatSoluble: 0, stored: 0, disease: "convulsions" },
  { name: "B₁₂", chemical: "cyanocobalamin", fatSoluble: 0, stored: 1, disease: "pernicious anaemia" },
  { name: "C", chemical: "ascorbic acid", fatSoluble: 0, stored: 0, disease: "scurvy (bleeding gums)" },
  { name: "D", chemical: "calciferol", fatSoluble: 1, stored: 1, disease: "rickets; osteomalacia in adults" },
  { name: "E", chemical: "tocopherols", fatSoluble: 1, stored: 1, disease: "fragile red cells, weak muscles" },
  { name: "K", chemical: "phylloquinone", fatSoluble: 1, stored: 1, disease: "blood takes longer to clot" },
];

export function aminebioVitamin(index: number): AminebioVitamin {
  return AMINEBIO_VITAMINS[clampInt(index, 0, AMINEBIO_VITAMINS.length - 1)]!;
}

// ── Nucleic acids ────────────────────────────────────────────────────────────

export interface AminebioBase {
  name: string;
  letter: string;
  /** 1 purine (two rings), 0 pyrimidine (one ring). */
  purine: number;
  inDNA: number;
  inRNA: number;
  /** Index of its partner in DNA (for U, its partner in RNA–DNA pairing, A). */
  partner: number;
  /** Hydrogen bonds to its partner. */
  hBonds: number;
}

export const AMINEBIO_BASES: readonly AminebioBase[] = [
  { name: "adenine", letter: "A", purine: 1, inDNA: 1, inRNA: 1, partner: 3, hBonds: 2 },
  { name: "guanine", letter: "G", purine: 1, inDNA: 1, inRNA: 1, partner: 2, hBonds: 3 },
  { name: "cytosine", letter: "C", purine: 0, inDNA: 1, inRNA: 1, partner: 1, hBonds: 3 },
  { name: "thymine", letter: "T", purine: 0, inDNA: 1, inRNA: 0, partner: 0, hBonds: 2 },
  { name: "uracil", letter: "U", purine: 0, inDNA: 0, inRNA: 1, partner: 0, hBonds: 2 },
];

export function aminebioBase(index: number): AminebioBase {
  return AMINEBIO_BASES[clampInt(index, 0, AMINEBIO_BASES.length - 1)]!;
}

// ── The model ────────────────────────────────────────────────────────────────

export type AminebioParams = {
  /** Index into AMINEBIO_AMINES. */
  amine: number;
  /** Index into AMINEBIO_ROUTES. */
  route: number;
  /** 0 alkyl, 1 aryl starting compound. */
  substrate: number;
  /** Index into AMINEBIO_DIAZO. */
  reagent: number;
  sugar: number;
  aminoAcid: number;
  enzyme: number;
  vitamin: number;
  base: number;
};

export interface AminebioState {
  /** Carbons in the alkyl starting compound. */
  carbons: number;
  /** Temperature of the diazonium solution, K. */
  temperature: number;
  /** β-anomer in the glucose solution, %. */
  beta: number;
  pH: number;
  /** Amino acids in the peptide chain. */
  residues: number;
  /** Guanine as a percentage of DNA's bases. */
  guanine: number;
}

export type AminebioResults = {
  amine: number;
  degree: number;
  aromatic: number;
  pKb: number;
  kb: number;
  vsAmmonia: number;
  ringEffect: number;
  nH: number;
  cationNH: number;
  carbylamine: number;
  hinsberg: number;
  nitrous: number;

  route: number;
  substrate: number;
  carbons: number;
  works: number;
  productClass: number;
  startCarbons: number;
  productCarbons: number;
  carbonChange: number;
  ringAmine: number;
  productMass: number;

  reagent: number;
  temperature: number;
  saltKept: number;
  namedReaction: number;
  keepsNitrogen: number;
  dyeColour: number;
  diazoMass: number;

  sugar: number;
  sugarClass: number;
  reducing: number;
  carbonyl: number;
  sugarUnits: number;
  branched: number;
  sugarMass: number;
  beta: number;
  alpha: number;
  rotation: number;
  invertRotation: number;

  aminoAcid: number;
  pH: number;
  pKa1: number;
  pKa2: number;
  pI: number;
  netCharge: number;
  form: number;
  chiral: number;
  residues: number;
  peptideBonds: number;
  peptideMass: number;

  enzyme: number;
  fits: number;
  vitamin: number;
  fatSoluble: number;
  stored: number;

  base: number;
  purine: number;
  inDNA: number;
  inRNA: number;
  partner: number;
  pairHBonds: number;
  guanine: number;
  cytosine: number;
  adenine: number;
  thymine: number;
  gcContent: number;
  hBondsPer100: number;
};

const OUTPUTS = [
  "amine", "degree", "aromatic", "pKb", "kb", "vsAmmonia", "ringEffect", "nH", "cationNH", "carbylamine", "hinsberg", "nitrous",
  "route", "substrate", "carbons", "works", "productClass", "startCarbons", "productCarbons", "carbonChange", "ringAmine", "productMass",
  "reagent", "temperature", "saltKept", "namedReaction", "keepsNitrogen", "dyeColour", "diazoMass",
  "sugar", "sugarClass", "reducing", "carbonyl", "sugarUnits", "branched", "sugarMass", "beta", "alpha", "rotation", "invertRotation",
  "aminoAcid", "pH", "pKa1", "pKa2", "pI", "netCharge", "form", "chiral", "residues", "peptideBonds", "peptideMass",
  "enzyme", "fits", "vitamin", "fatSoluble", "stored",
  "base", "purine", "inDNA", "inRNA", "partner", "pairHBonds", "guanine", "cytosine", "adenine", "thymine", "gcContent", "hBondsPer100",
] as const satisfies readonly (keyof AminebioResults)[];

const finite = (v: number, fallback: number) => (Number.isFinite(v) ? v : fallback);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, finite(v, lo)));
const clampInt = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(finite(v, lo))));
const z = (v: number) => v || 0;

export const AMINEBIO_LIMITS = {
  carbons: [1, 6],
  temperature: [273, 303],
  beta: [0, 100],
  pH: [0, 14],
  residues: [1, 10],
  guanine: [0, 50],
} as const;

/** Play: the glucose mutarotates towards equilibrium, e-fold every 2 s (real solutions take hours). */
export const AMINEBIO_MUTAROTATION_RATE = 0.5;

/** Molar mass of an unbranched chain of n identical amino acids: n × M − (n − 1) × M(H₂O). */
export function aminebioPeptideMass(a: AminebioAminoAcid, n: number): number {
  return n * aminebioMolarMass(a.atoms) - (n - 1) * AMINEBIO_WATER_MASS;
}

/** Product formula of a preparation, for its molar mass: CₙH₂ₙ₊₁NH₂, aniline or benzylamine. */
function prepFormula(p: AminebioPrep): AminebioFormula {
  if (!p.works) return {};
  if (p.product === "C₆H₅NH₂") return { C: 6, H: 7, N: 1 };
  if (p.product === "C₆H₅CH₂NH₂") return { C: 7, H: 9, N: 1 };
  const n = p.productCarbons;
  return { C: n, H: 2 * n + 3, N: 1 };
}

export const aminebioModel: SimulationModel<AminebioState, AminebioParams, AminebioResults> = {
  id: "aminebio",
  defaultParams: { amine: 8, route: 5, substrate: 0, reagent: 0, sugar: 3, aminoAcid: 0, enzyme: 0, vitamin: 0, base: 0 },
  outputs: OUTPUTS,
  stateVariables: ["carbons", "temperature", "beta", "pH", "residues", "guanine"],

  initialize() {
    return { carbons: 3, temperature: 276, beta: 0, pH: 7, residues: 3, guanine: 20 };
  },

  advance(state, dt) {
    const k = 1 - Math.exp(-AMINEBIO_MUTAROTATION_RATE * Math.max(0, finite(dt, 0)));
    return { ...state, beta: clamp(state.beta + (AMINEBIO_BETA_EQUILIBRIUM - state.beta) * k, 0, 100) };
  },

  step(state, _params, sign) {
    return { ...state, beta: clamp(Math.round(state.beta) + sign, 0, 100) };
  },

  derive(state, params) {
    const amineIndex = clampInt(params.amine, 0, AMINEBIO_AMINES.length - 1);
    const a = AMINEBIO_AMINES[amineIndex]!;

    const route = clampInt(params.route, 0, AMINEBIO_ROUTES.length - 1);
    const substrate = clampInt(params.substrate, 0, 1);
    const carbons = clampInt(state.carbons, 1, 6);
    const prep = aminebioPrepare(route, substrate, carbons);

    const reagent = clampInt(params.reagent, 0, AMINEBIO_DIAZO.length - 1);
    const diazo = AMINEBIO_DIAZO[reagent]!;
    const temperature = clamp(state.temperature, 273, 303);

    const sugarIndex = clampInt(params.sugar, 0, AMINEBIO_SUGARS.length - 1);
    const sugar = AMINEBIO_SUGARS[sugarIndex]!;
    const beta = clamp(state.beta, 0, 100);

    const aaIndex = clampInt(params.aminoAcid, 0, AMINEBIO_AMINO_ACIDS.length - 1);
    const aa = AMINEBIO_AMINO_ACIDS[aaIndex]!;
    const pH = clamp(state.pH, 0, 14);
    const residues = clampInt(state.residues, 1, 10);

    const enzymeIndex = clampInt(params.enzyme, 0, AMINEBIO_ENZYMES.length - 1);
    const vitaminIndex = clampInt(params.vitamin, 0, AMINEBIO_VITAMINS.length - 1);
    const vitamin = AMINEBIO_VITAMINS[vitaminIndex]!;

    const baseIndex = clampInt(params.base, 0, AMINEBIO_BASES.length - 1);
    const base = AMINEBIO_BASES[baseIndex]!;
    const guanine = clamp(state.guanine, 0, 50);

    return {
      amine: amineIndex,
      degree: a.degree,
      aromatic: a.aromatic,
      pKb: a.pKb,
      kb: 10 ** -a.pKb,
      vsAmmonia: 10 ** (AMINEBIO_AMMONIA_PKB - a.pKb),
      ringEffect: z(a.ringEffect),
      nH: 3 - a.degree,
      cationNH: 4 - a.degree,
      carbylamine: aminebioCarbylamine(a),
      hinsberg: aminebioHinsberg(a),
      nitrous: aminebioNitrous(a),

      route,
      substrate,
      carbons,
      works: prep.works,
      productClass: prep.productClass,
      startCarbons: prep.startCarbons,
      productCarbons: prep.productCarbons,
      carbonChange: prep.works ? z(prep.productCarbons - prep.startCarbons) : 0,
      ringAmine: prep.ringAmine,
      productMass: aminebioMolarMass(prepFormula(prep)),

      reagent,
      temperature,
      saltKept: temperature <= AMINEBIO_DIAZO_MAX_K ? 1 : 0,
      namedReaction: diazo.named,
      keepsNitrogen: diazo.keepsNitrogen,
      dyeColour: diazo.colour,
      diazoMass: aminebioMolarMass(diazo.formula),

      sugar: sugarIndex,
      sugarClass: sugar.cls,
      reducing: sugar.reducing,
      carbonyl: sugar.carbonyl,
      sugarUnits: sugar.cls === 3 ? 0 : sugar.units.length,
      branched: sugar.branched,
      sugarMass: aminebioMolarMass(sugar.atoms),
      beta,
      alpha: 100 - beta,
      rotation: aminebioRotation(beta),
      invertRotation: AMINEBIO_INVERT_ROTATION,

      aminoAcid: aaIndex,
      pH,
      pKa1: aa.pKa1,
      pKa2: aa.pKa2,
      pI: (aa.pKa1 + aa.pKa2) / 2,
      netCharge: aminebioNetCharge(aa, pH),
      form: aminebioForm(aa, pH),
      chiral: aa.chiral,
      residues,
      peptideBonds: residues - 1,
      peptideMass: aminebioPeptideMass(aa, residues),

      enzyme: enzymeIndex,
      fits: AMINEBIO_ENZYMES[enzymeIndex]!.substrates.includes(sugarIndex) ? 1 : 0,
      vitamin: vitaminIndex,
      fatSoluble: vitamin.fatSoluble,
      stored: vitamin.stored,

      base: baseIndex,
      purine: base.purine,
      inDNA: base.inDNA,
      inRNA: base.inRNA,
      partner: base.partner,
      pairHBonds: base.hBonds,
      guanine,
      cytosine: guanine,
      adenine: 50 - guanine,
      thymine: 50 - guanine,
      gcContent: 2 * guanine,
      hBondsPer100: 3 * 2 * guanine + 2 * (100 - 2 * guanine),
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof AminebioState] : undefined;
  },

  setVariable(state, id, value) {
    switch (id) {
      case "carbons": return { ...state, carbons: clampInt(value, 1, 6) };
      case "temperature": return { ...state, temperature: clamp(value, 273, 303) };
      case "beta": return { ...state, beta: clamp(value, 0, 100) };
      case "pH": return { ...state, pH: clamp(value, 0, 14) };
      case "residues": return { ...state, residues: clampInt(value, 1, 10) };
      case "guanine": return { ...state, guanine: clamp(value, 0, 50) };
      default: return state;
    }
  },
};
