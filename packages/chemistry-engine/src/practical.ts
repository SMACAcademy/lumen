import type { SimulationModel } from "@ise/science-engine";

/**
 * The practical chemistry bench of the NCERT class 11–12 lab manuals.
 *
 * Titration. A pipette puts 10.0 mL of a standard solution in the flask;
 * the burette holds the solution whose strength is wanted. At the end point
 * the equivalents match:
 *
 *   n₁M₁V₁ = n₂M₂V₂          n = the n-factor (basicity, acidity, or
 *                            electrons gained or lost per formula unit)
 *
 * which is the balanced equation read as M₁V₁/a = M₂V₂/b. Oxalic acid has
 * n = 2 against NaOH (it is dibasic) and also n = 2 against KMnO₄
 * (C₂O₄²⁻ → 2CO₂ + 2e⁻); KMnO₄ in acid has n = 5 (MnO₄⁻ → Mn²⁺); Mohr's salt
 * has n = 1 (Fe²⁺ → Fe³⁺).
 *
 * The end point is taken to be the equivalence point: phenolphthalein turns
 * pink within a fraction of a drop of it for a strong base, and one drop of
 * excess KMnO₄ (its own indicator) leaves the flask permanently pale pink.
 * The indicator error, a drop's worth, is ignored. A reading within 0.1 mL
 * past equivalence (about two drops) counts as the end point.
 *
 * Salt analysis follows the lab manual's scheme: preliminary tests (colour,
 * flame), anion tests on the sodium carbonate extract, then the cation group
 * reagents in order. Element detection uses Lassaigne's sodium fusion
 * extract; functional groups use the manual's simple tube tests. Every
 * result is a row of a table, not a computation: the model looks it up.
 */

// ── Observations: one table of everything a test can show ───────────────────

/** Colours a tube, flame or precipitate can show. The renderer paints them. */
export type PracticalColour =
  | "none"
  | "colourless"
  | "white"
  | "milky"
  | "blue"
  | "deep-blue"
  | "yellow-brown"
  | "pale-pink"
  | "pink"
  | "golden-yellow"
  | "lilac"
  | "brick-red"
  | "crimson"
  | "apple-green"
  | "blue-green"
  | "black"
  | "reddish-brown"
  | "red-brown"
  | "dirty-white"
  | "prussian-blue"
  | "violet"
  | "pale-yellow"
  | "yellow"
  | "orange"
  | "brown"
  | "silver";

export interface PracticalObservation {
  /** What is seen, in at most 55 characters. */
  text: string;
  /** The liquid in the tube (or the flame's colour for a flame test). */
  liquid: PracticalColour;
  /** A precipitate, if one forms. */
  solid?: PracticalColour;
  effect?: "flame" | "bubbles" | "ring" | "mirror" | "gas";
  /** Something visibly happened. */
  change: boolean;
}

export const PRACTICAL_OBSERVATIONS: readonly PracticalObservation[] = [
  /* 0 */ { text: "No characteristic flame colour", liquid: "none", effect: "flame", change: false },
  /* 1 */ { text: "Golden-yellow flame", liquid: "golden-yellow", effect: "flame", change: true },
  /* 2 */ { text: "Lilac flame (pink-violet through blue glass)", liquid: "lilac", effect: "flame", change: true },
  /* 3 */ { text: "Brick-red flame", liquid: "brick-red", effect: "flame", change: true },
  /* 4 */ { text: "Crimson-red flame", liquid: "crimson", effect: "flame", change: true },
  /* 5 */ { text: "Apple-green flame", liquid: "apple-green", effect: "flame", change: true },
  /* 6 */ { text: "Blue-green flame", liquid: "blue-green", effect: "flame", change: true },
  /* 7 */ { text: "Brisk effervescence; CO₂ turns limewater milky", liquid: "milky", effect: "bubbles", change: true },
  /* 8 */ { text: "No gas with dil H₂SO₄", liquid: "colourless", change: false },
  /* 9 */ { text: "White ppt of AgCl, soluble in NH₄OH", liquid: "colourless", solid: "white", change: true },
  /* 10 */ { text: "No precipitate with AgNO₃", liquid: "colourless", change: false },
  /* 11 */ { text: "White ppt of BaSO₄, insoluble in conc HCl", liquid: "colourless", solid: "white", change: true },
  /* 12 */ { text: "No precipitate with BaCl₂", liquid: "colourless", change: false },
  /* 13 */ { text: "Brown ring where the two layers meet", liquid: "colourless", effect: "ring", change: true },
  /* 14 */ { text: "No brown ring", liquid: "colourless", change: false },
  /* 15 */ { text: "NH₃ given off: moist red litmus turns blue", liquid: "colourless", effect: "gas", change: true },
  /* 16 */ { text: "No ammonia given off", liquid: "colourless", change: false },
  /* 17 */ { text: "No precipitate", liquid: "colourless", change: false },
  /* 18 */ { text: "White ppt of PbCl₂ (dissolves in hot water)", liquid: "colourless", solid: "white", change: true },
  /* 19 */ { text: "Black ppt of CuS", liquid: "colourless", solid: "black", change: true },
  /* 20 */ { text: "Reddish-brown ppt of Fe(OH)₃", liquid: "colourless", solid: "reddish-brown", change: true },
  /* 21 */ { text: "White gelatinous ppt of Al(OH)₃", liquid: "colourless", solid: "white", change: true },
  /* 22 */ { text: "Dirty-white ppt of ZnS", liquid: "colourless", solid: "dirty-white", change: true },
  /* 23 */ { text: "White ppt of BaCO₃", liquid: "colourless", solid: "white", change: true },
  /* 24 */ { text: "White ppt of SrCO₃", liquid: "colourless", solid: "white", change: true },
  /* 25 */ { text: "White ppt of CaCO₃", liquid: "colourless", solid: "white", change: true },
  /* 26 */ { text: "White crystalline ppt of Mg(NH₄)PO₄", liquid: "colourless", solid: "white", change: true },
  /* 27 */ { text: "Prussian blue colour: nitrogen present", liquid: "prussian-blue", change: true },
  /* 28 */ { text: "No Prussian blue", liquid: "pale-yellow", change: false },
  /* 29 */ { text: "Violet colour: sulfur present", liquid: "violet", change: true },
  /* 30 */ { text: "No violet colour", liquid: "colourless", change: false },
  /* 31 */ { text: "Black ppt of PbS: sulfur present", liquid: "colourless", solid: "black", change: true },
  /* 32 */ { text: "No black precipitate", liquid: "colourless", change: false },
  /* 33 */ { text: "Pale-yellow AgBr, sparingly soluble in NH₄OH", liquid: "colourless", solid: "pale-yellow", change: true },
  /* 34 */ { text: "Yellow AgI, insoluble in NH₄OH", liquid: "colourless", solid: "yellow", change: true },
  /* 35 */ { text: "Orange colour stays", liquid: "orange", change: false },
  /* 36 */ { text: "Decolourised at once", liquid: "colourless", change: true },
  /* 37 */ { text: "Decolourised; white ppt of 2,4,6-tribromophenol", liquid: "colourless", solid: "white", change: true },
  /* 38 */ { text: "Decolourised slowly: the aldehyde is oxidised", liquid: "colourless", change: true },
  /* 39 */ { text: "Yellow CAN turns pink-red", liquid: "pink", change: true },
  /* 40 */ { text: "Brown-black ppt, not a red colour", liquid: "yellow", solid: "brown", change: true },
  /* 41 */ { text: "Stays yellow", liquid: "yellow", change: false },
  /* 42 */ { text: "Silver mirror on the tube", liquid: "colourless", effect: "mirror", change: true },
  /* 43 */ { text: "No silver mirror", liquid: "colourless", change: false },
  /* 44 */ { text: "Red-brown ppt of Cu₂O", liquid: "blue", solid: "red-brown", change: true },
  /* 45 */ { text: "Stays deep blue", liquid: "deep-blue", change: false },
  /* 46 */ { text: "Brisk effervescence of CO₂", liquid: "colourless", effect: "bubbles", change: true },
  /* 47 */ { text: "No effervescence", liquid: "colourless", change: false },
  /* 48 */ { text: "Violet colour with neutral FeCl₃", liquid: "violet", change: true },
  /* 49 */ { text: "No violet colour; stays yellow", liquid: "yellow-brown", change: false },
  // Free ethanoic acid keeps the solution too acidic for much colour; neutralised to acetate it
  // gives the classic deep red (basic iron(III) acetate), which is not the phenol violet.
  /* 50 */ { text: "No violet; red only once neutralised (acetate)", liquid: "yellow-brown", change: false },
];

// ── Titrations ──────────────────────────────────────────────────────────────

export type PracticalTitrationId = "hcl-naoh" | "oxalic-naoh" | "kmno4-oxalic" | "kmno4-mohr";
export const PRACTICAL_TITRATION_ORDER: readonly PracticalTitrationId[] = ["hcl-naoh", "oxalic-naoh", "kmno4-oxalic", "kmno4-mohr"];

export interface PracticalTitration {
  /** The standard solution pipetted into the flask. */
  flask: string;
  flaskMolarity: number;
  nFlask: number;
  /** The solution in the burette, whose strength is found. */
  burette: string;
  nBurette: number;
  /** Molar mass of the burette's solute, g/mol, for the strength in g/L. */
  buretteMolarMass: number;
  /** "phenolphthalein" in the flask, or KMnO₄ as its own indicator. */
  indicator: "phenolphthalein" | "self";
  equation: string;
}

export const PRACTICAL_TITRATIONS: Record<PracticalTitrationId, PracticalTitration> = {
  "hcl-naoh": { flask: "HCl", flaskMolarity: 0.1, nFlask: 1, burette: "NaOH", nBurette: 1, buretteMolarMass: 40, indicator: "phenolphthalein", equation: "HCl + NaOH → NaCl + H₂O" },
  "oxalic-naoh": { flask: "oxalic acid", flaskMolarity: 0.1, nFlask: 2, burette: "NaOH", nBurette: 1, buretteMolarMass: 40, indicator: "phenolphthalein", equation: "H₂C₂O₄ + 2NaOH → Na₂C₂O₄ + 2H₂O" },
  "kmno4-oxalic": { flask: "oxalic acid", flaskMolarity: 0.05, nFlask: 2, burette: "KMnO₄", nBurette: 5, buretteMolarMass: 158, indicator: "self", equation: "2MnO₄⁻ + 5C₂O₄²⁻ + 16H⁺ → 2Mn²⁺ + 10CO₂ + 8H₂O" },
  "kmno4-mohr": { flask: "Mohr's salt", flaskMolarity: 0.05, nFlask: 1, burette: "KMnO₄", nBurette: 5, buretteMolarMass: 158, indicator: "self", equation: "MnO₄⁻ + 5Fe²⁺ + 8H⁺ → Mn²⁺ + 5Fe³⁺ + 4H₂O" },
};

/** Pipette volume, mL. */
export const PRACTICAL_PIPETTE = 10;
/** Burette graduations, mL; a reading is estimated to the nearest of these. */
export const PRACTICAL_LEAST_COUNT = 0.1;
/** Readings up to this far past equivalence (about two drops) count as the end point. */
export const PRACTICAL_END_WINDOW = 0.1;

/** Volume from the burette at equivalence: n₁M₁V₁ = n₂M₂V₂ solved for V₂, mL. */
export function practicalEquivalence(t: PracticalTitration, strength: number): number {
  return strength > 0 ? (t.nFlask * t.flaskMolarity * PRACTICAL_PIPETTE) / (t.nBurette * strength) : 0;
}

/** Molarity of the burette solution worked out from a titre, mol/L (0 for no titre). */
export function practicalMolarityFromTitre(t: PracticalTitration, titre: number): number {
  return titre >= PRACTICAL_LEAST_COUNT ? (t.nFlask * t.flaskMolarity * PRACTICAL_PIPETTE) / (t.nBurette * titre) : 0;
}

/** Three titres are concordant when they agree to within 0.1 mL. */
export function practicalConcordant(titres: readonly number[]): boolean {
  if (titres.length < 2) return false;
  return Math.max(...titres) - Math.min(...titres) <= PRACTICAL_LEAST_COUNT + 1e-9;
}

// ── Salt analysis ───────────────────────────────────────────────────────────

export type PracticalSaltId =
  | "nh4cl"
  | "pbno3"
  | "cuso4"
  | "fecl3"
  | "al2so43"
  | "znco3"
  | "bacl2"
  | "srno3"
  | "caco3"
  | "mgso4"
  | "na2co3"
  | "kno3";
export const PRACTICAL_SALT_ORDER: readonly PracticalSaltId[] = ["nh4cl", "pbno3", "cuso4", "fecl3", "al2so43", "znco3", "bacl2", "srno3", "caco3", "mgso4", "na2co3", "kno3"];

/** Anions, in order: carbonate, chloride, sulfate, nitrate. */
export const PRACTICAL_ANIONS = ["CO₃²⁻", "Cl⁻", "SO₄²⁻", "NO₃⁻"] as const;

/** Group 0–6 of the lab manual's scheme; 7 for Na⁺ and K⁺, which no group reagent brings down. */
export const PRACTICAL_NO_GROUP = 7;

export interface PracticalSalt {
  formula: string;
  name: string;
  cation: string;
  /** Index into PRACTICAL_ANIONS. */
  anion: number;
  group: number;
  /** 0 white, 1 blue, 2 yellowish-brown. */
  colour: number;
  /** Flame-test observation (index into PRACTICAL_OBSERVATIONS). */
  flame: number;
  /** What the group reagent shows when it reaches this cation's group. */
  groupObservation: number;
  /** The confirmatory test for the cation. */
  confirm: string;
}

export const PRACTICAL_SALTS: Record<PracticalSaltId, PracticalSalt> = {
  nh4cl: { formula: "NH₄Cl", name: "Ammonium chloride", cation: "NH₄⁺", anion: 1, group: 0, colour: 0, flame: 0, groupObservation: 15, confirm: "Brown ppt with Nessler's reagent" },
  pbno3: { formula: "Pb(NO₃)₂", name: "Lead nitrate", cation: "Pb²⁺", anion: 3, group: 1, colour: 0, flame: 0, groupObservation: 18, confirm: "Yellow ppt of PbI₂ with KI" },
  cuso4: { formula: "CuSO₄·5H₂O", name: "Copper sulfate", cation: "Cu²⁺", anion: 2, group: 2, colour: 1, flame: 6, groupObservation: 19, confirm: "Deep blue solution with excess NH₄OH" },
  fecl3: { formula: "FeCl₃", name: "Iron(III) chloride", cation: "Fe³⁺", anion: 1, group: 3, colour: 2, flame: 0, groupObservation: 20, confirm: "Blood-red colour with KSCN" },
  al2so43: { formula: "Al₂(SO₄)₃", name: "Aluminium sulfate", cation: "Al³⁺", anion: 2, group: 3, colour: 0, flame: 0, groupObservation: 21, confirm: "Blue lake: blue flakes in a colourless liquid" },
  znco3: { formula: "ZnCO₃", name: "Zinc carbonate", cation: "Zn²⁺", anion: 0, group: 4, colour: 0, flame: 0, groupObservation: 22, confirm: "Bluish-white ppt with K₄[Fe(CN)₆]" },
  bacl2: { formula: "BaCl₂", name: "Barium chloride", cation: "Ba²⁺", anion: 1, group: 5, colour: 0, flame: 5, groupObservation: 23, confirm: "Yellow ppt of BaCrO₄ with K₂CrO₄" },
  srno3: { formula: "Sr(NO₃)₂", name: "Strontium nitrate", cation: "Sr²⁺", anion: 3, group: 5, colour: 0, flame: 4, groupObservation: 24, confirm: "White ppt of SrSO₄ with (NH₄)₂SO₄" },
  caco3: { formula: "CaCO₃", name: "Calcium carbonate", cation: "Ca²⁺", anion: 0, group: 5, colour: 0, flame: 3, groupObservation: 25, confirm: "White ppt with ammonium oxalate" },
  mgso4: { formula: "MgSO₄", name: "Magnesium sulfate", cation: "Mg²⁺", anion: 2, group: 6, colour: 0, flame: 0, groupObservation: 26, confirm: "Blue ppt with magneson reagent" },
  na2co3: { formula: "Na₂CO₃", name: "Sodium carbonate", cation: "Na⁺", anion: 0, group: 7, colour: 0, flame: 1, groupObservation: 17, confirm: "Golden-yellow flame" },
  kno3: { formula: "KNO₃", name: "Potassium nitrate", cation: "K⁺", anion: 3, group: 7, colour: 0, flame: 2, groupObservation: 17, confirm: "Lilac flame, seen through blue glass" },
};

export type PracticalReagentId = "flame" | "dil-h2so4" | "agno3" | "bacl2" | "brown-ring";
export const PRACTICAL_REAGENT_ORDER: readonly PracticalReagentId[] = ["flame", "dil-h2so4", "agno3", "bacl2", "brown-ring"];

/** The group reagents, stage 0 to 6. */
export const PRACTICAL_GROUP_REAGENTS = [
  "NaOH, warmed",
  "dil HCl",
  "H₂S in dil HCl",
  "NH₄OH with NH₄Cl",
  "H₂S in NH₄OH",
  "(NH₄)₂CO₃ in NH₄OH",
  "Na₂HPO₄ in NH₄OH",
] as const;

/** What a salt shows with one of the preliminary or anion tests. */
export function practicalSaltTest(salt: PracticalSalt, reagent: PracticalReagentId): number {
  switch (reagent) {
    case "flame":
      return salt.flame;
    case "dil-h2so4":
      return salt.anion === 0 ? 7 : 8;
    case "agno3":
      return salt.anion === 1 ? 9 : 10;
    case "bacl2":
      return salt.anion === 2 ? 11 : 12;
    case "brown-ring":
      return salt.anion === 3 ? 13 : 14;
  }
}

/** What the scheme shows at a stage: the group precipitate, or nothing. */
export function practicalSchemeObservation(salt: PracticalSalt, stage: number): number {
  if (stage === salt.group) return salt.groupObservation;
  return stage === 0 ? 16 : 17;
}

// ── Lassaigne's test ────────────────────────────────────────────────────────

export type PracticalCompoundId = "urea" | "thiophene" | "chlorobenzene" | "bromobenzene" | "iodoform" | "chloroaniline" | "naphthalene";
export const PRACTICAL_COMPOUND_ORDER: readonly PracticalCompoundId[] = ["urea", "thiophene", "chlorobenzene", "bromobenzene", "iodoform", "chloroaniline", "naphthalene"];

export interface PracticalCompound {
  name: string;
  formula: string;
  nitrogen: boolean;
  sulfur: boolean;
  /** 0 none, 1 Cl, 2 Br, 3 I. */
  halogen: number;
}

export const PRACTICAL_COMPOUNDS: Record<PracticalCompoundId, PracticalCompound> = {
  urea: { name: "Urea", formula: "CO(NH₂)₂", nitrogen: true, sulfur: false, halogen: 0 },
  thiophene: { name: "Thiophene", formula: "C₄H₄S", nitrogen: false, sulfur: true, halogen: 0 },
  chlorobenzene: { name: "Chlorobenzene", formula: "C₆H₅Cl", nitrogen: false, sulfur: false, halogen: 1 },
  bromobenzene: { name: "Bromobenzene", formula: "C₆H₅Br", nitrogen: false, sulfur: false, halogen: 2 },
  iodoform: { name: "Iodoform", formula: "CHI₃", nitrogen: false, sulfur: false, halogen: 3 },
  chloroaniline: { name: "4-Chloroaniline", formula: "ClC₆H₄NH₂", nitrogen: true, sulfur: false, halogen: 1 },
  naphthalene: { name: "Naphthalene", formula: "C₁₀H₈", nitrogen: false, sulfur: false, halogen: 0 },
};

export type PracticalFusionTestId = "prussian" | "nitroprusside" | "lead-acetate" | "silver";
export const PRACTICAL_FUSION_TEST_ORDER: readonly PracticalFusionTestId[] = ["prussian", "nitroprusside", "lead-acetate", "silver"];

/** What the sodium fusion extract shows with one test. */
export function practicalFusionTest(compound: PracticalCompound, test: PracticalFusionTestId): number {
  switch (test) {
    case "prussian":
      return compound.nitrogen ? 27 : 28;
    case "nitroprusside":
      return compound.sulfur ? 29 : 30;
    case "lead-acetate":
      return compound.sulfur ? 31 : 32;
    case "silver":
      return [10, 9, 33, 34][compound.halogen] ?? 10;
  }
}

// ── Functional groups ───────────────────────────────────────────────────────

export type PracticalOrganicId = "ethanol" | "phenol" | "ethanal" | "propanone" | "ethanoic" | "cyclohexene";
export const PRACTICAL_ORGANIC_ORDER: readonly PracticalOrganicId[] = ["ethanol", "phenol", "ethanal", "propanone", "ethanoic", "cyclohexene"];

export type PracticalGroupTestId = "bromine-water" | "can" | "tollens" | "fehling" | "bicarbonate" | "ferric";
export const PRACTICAL_GROUP_TEST_ORDER: readonly PracticalGroupTestId[] = ["bromine-water", "can", "tollens", "fehling", "bicarbonate", "ferric"];

/** Functional groups, in order: alcohol, phenol, aldehyde, ketone, carboxylic acid, alkene. */
export const PRACTICAL_FUNCTIONAL_GROUPS = ["alcohol", "phenol", "aldehyde", "ketone", "carboxylic acid", "C=C"] as const;

/** The group each test is meant to show (index into PRACTICAL_FUNCTIONAL_GROUPS). */
export const PRACTICAL_TEST_FOR: Record<PracticalGroupTestId, number> = {
  "bromine-water": 5,
  can: 0,
  tollens: 2,
  fehling: 2,
  bicarbonate: 4,
  ferric: 1,
};

export interface PracticalOrganic {
  name: string;
  formula: string;
  group: number;
  /** Observation for each test, in PRACTICAL_GROUP_TEST_ORDER. */
  results: readonly [number, number, number, number, number, number];
}

export const PRACTICAL_ORGANICS: Record<PracticalOrganicId, PracticalOrganic> = {
  ethanol: { name: "Ethanol", formula: "C₂H₅OH", group: 0, results: [35, 39, 43, 45, 47, 49] },
  phenol: { name: "Phenol", formula: "C₆H₅OH", group: 1, results: [37, 40, 43, 45, 47, 48] },
  ethanal: { name: "Ethanal", formula: "CH₃CHO", group: 2, results: [38, 41, 42, 44, 47, 49] },
  propanone: { name: "Propanone", formula: "CH₃COCH₃", group: 3, results: [35, 41, 43, 45, 47, 49] },
  ethanoic: { name: "Ethanoic acid", formula: "CH₃COOH", group: 4, results: [35, 41, 43, 45, 46, 50] },
  cyclohexene: { name: "Cyclohexene", formula: "C₆H₁₀", group: 5, results: [36, 41, 43, 45, 47, 49] },
};

export function practicalGroupTest(organic: PracticalOrganic, test: PracticalGroupTestId): number {
  return organic.results[PRACTICAL_GROUP_TEST_ORDER.indexOf(test)] ?? 0;
}

// ── The model ───────────────────────────────────────────────────────────────

export type PracticalParams = {
  titration: PracticalTitrationId;
  salt: PracticalSaltId;
  reagent: PracticalReagentId;
  compound: PracticalCompoundId;
  fusionTest: PracticalFusionTestId;
  organic: PracticalOrganicId;
  groupTest: PracticalGroupTestId;
};

export interface PracticalState {
  /** Volume run in from the burette, mL. */
  readonly added: number;
  /** Burette reading before the run, mL. */
  readonly initial: number;
  /** True molarity of the burette solution — the unknown. */
  readonly strength: number;
  /** How far down the cation scheme: the group reagent added last (0–6). */
  readonly stage: number;
  /** The learner's answers to "what is it?". */
  readonly saltGuess: number;
  readonly compoundGuess: number;
  readonly organicGuess: number;
}

export type PracticalResults = {
  titration: number;
  flaskMolarity: number;
  flaskVolume: number;
  nFlask: number;
  nBurette: number;
  strength: number;
  /** Burette volume at equivalence, mL. */
  equivalence: number;
  added: number;
  initialReading: number;
  finalReading: number;
  titre: number;
  /** 0 colourless, 1 the first permanent pale pink (end point), 2 too pink (overshot). */
  flaskColour: number;
  atEndPoint: number;
  /** mL run in past equivalence. */
  overshoot: number;
  /** The burette molarity worked out from the titre as read. */
  foundMolarity: number;
  /** The burette solution's strength in g/L. */
  gramsPerLitre: number;
  flaskNormality: number;
  buretteNormality: number;
  /** 1 when KMnO₄ is its own indicator. */
  selfIndicator: number;

  salt: number;
  saltColour: number;
  anion: number;
  cationGroup: number;
  flame: number;
  reagent: number;
  saltObservation: number;
  saltChange: number;
  stage: number;
  schemeObservation: number;
  /** 1 when the reagent just added brings this cation down. */
  precipitate: number;
  /** 1 when the cation came down at an earlier stage. */
  removedEarlier: number;
  confirm: number;
  saltGuess: number;
  saltGuessRight: number;

  compound: number;
  hasNitrogen: number;
  hasSulfur: number;
  halogen: number;
  fusionTest: number;
  fusionObservation: number;
  fusionPositive: number;
  compoundGuess: number;
  compoundGuessRight: number;

  organic: number;
  functionalGroup: number;
  groupTest: number;
  organicObservation: number;
  organicChange: number;
  /** 1 when the test shows the very group it is meant for. */
  testFindsGroup: number;
  organicGuess: number;
  organicGuessRight: number;
};

const OUTPUTS = [
  "titration", "flaskMolarity", "flaskVolume", "nFlask", "nBurette", "strength", "equivalence", "added", "initialReading", "finalReading",
  "titre", "flaskColour", "atEndPoint", "overshoot", "foundMolarity", "gramsPerLitre", "flaskNormality", "buretteNormality", "selfIndicator",
  "salt", "saltColour", "anion", "cationGroup", "flame", "reagent", "saltObservation", "saltChange", "stage", "schemeObservation",
  "precipitate", "removedEarlier", "confirm", "saltGuess", "saltGuessRight",
  "compound", "hasNitrogen", "hasSulfur", "halogen", "fusionTest", "fusionObservation", "fusionPositive", "compoundGuess", "compoundGuessRight",
  "organic", "functionalGroup", "groupTest", "organicObservation", "organicChange", "testFindsGroup", "organicGuess", "organicGuessRight",
] as const satisfies readonly (keyof PracticalResults)[];

/** Slider limits for each state variable. */
export const PRACTICAL_LIMITS: Record<keyof PracticalState, readonly [number, number]> = {
  added: [0, 40],
  initial: [0, 10],
  strength: [0.005, 0.2],
  stage: [0, 6],
  saltGuess: [0, PRACTICAL_SALT_ORDER.length - 1],
  compoundGuess: [0, PRACTICAL_COMPOUND_ORDER.length - 1],
  organicGuess: [0, PRACTICAL_ORGANIC_ORDER.length - 1],
};

/** Play runs the burette at this rate, mL/s. */
export const PRACTICAL_FLOW = 1;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const hundredths = (v: number) => Math.round(v * 100) / 100;
const pick = <T extends string>(order: readonly T[], value: T) => Math.max(0, order.indexOf(value));

function limit(id: keyof PracticalState, value: number): number {
  const [lo, hi] = PRACTICAL_LIMITS[id];
  const v = clamp(Number.isFinite(value) ? value : lo, lo, hi);
  switch (id) {
    case "added":
    case "initial":
      return hundredths(v);
    case "strength":
      return Math.round(v * 10000) / 10000;
    default:
      return Math.round(v);
  }
}

export const practicalModel: SimulationModel<PracticalState, PracticalParams, PracticalResults> = {
  id: "practical",
  defaultParams: { titration: "hcl-naoh", salt: "nh4cl", reagent: "flame", compound: "urea", fusionTest: "prussian", organic: "ethanol", groupTest: "bromine-water" },
  outputs: OUTPUTS,
  stateVariables: ["added", "initial", "strength", "stage", "saltGuess", "compoundGuess", "organicGuess"],

  initialize() {
    return { added: 0, initial: 0, strength: 0.1, stage: 0, saltGuess: 0, compoundGuess: 0, organicGuess: 0 };
  },

  /** Play opens the tap. */
  advance(state, dt) {
    return { ...state, added: limit("added", state.added + PRACTICAL_FLOW * dt) };
  },

  /** One step is one graduation, 0.1 mL. */
  step(state, _params, sign) {
    return { ...state, added: limit("added", state.added + PRACTICAL_LEAST_COUNT * sign) };
  },

  derive(state, params) {
    const t = PRACTICAL_TITRATIONS[params.titration] ?? PRACTICAL_TITRATIONS["hcl-naoh"];
    const added = limit("added", state.added);
    const initial = limit("initial", state.initial);
    const strength = limit("strength", state.strength);
    const equivalence = practicalEquivalence(t, strength);
    const past = added - equivalence;
    const atEnd = past >= -1e-6 && past <= PRACTICAL_END_WINDOW + 1e-6;
    const flaskColour = past < -1e-6 ? 0 : atEnd ? 1 : 2;

    const saltId = PRACTICAL_SALT_ORDER.includes(params.salt) ? params.salt : "nh4cl";
    const salt = PRACTICAL_SALTS[saltId];
    const reagent = PRACTICAL_REAGENT_ORDER.includes(params.reagent) ? params.reagent : "flame";
    const saltObservation = practicalSaltTest(salt, reagent);
    const stage = limit("stage", state.stage);
    const schemeObservation = practicalSchemeObservation(salt, stage);
    const saltIndex = pick(PRACTICAL_SALT_ORDER, saltId);
    const saltGuess = limit("saltGuess", state.saltGuess);

    const compoundId = PRACTICAL_COMPOUND_ORDER.includes(params.compound) ? params.compound : "urea";
    const compound = PRACTICAL_COMPOUNDS[compoundId];
    const fusionTest = PRACTICAL_FUSION_TEST_ORDER.includes(params.fusionTest) ? params.fusionTest : "prussian";
    const fusionObservation = practicalFusionTest(compound, fusionTest);
    const compoundIndex = pick(PRACTICAL_COMPOUND_ORDER, compoundId);
    const compoundGuess = limit("compoundGuess", state.compoundGuess);

    const organicId = PRACTICAL_ORGANIC_ORDER.includes(params.organic) ? params.organic : "ethanol";
    const organic = PRACTICAL_ORGANICS[organicId];
    const groupTest = PRACTICAL_GROUP_TEST_ORDER.includes(params.groupTest) ? params.groupTest : "bromine-water";
    const organicObservation = practicalGroupTest(organic, groupTest);
    const organicChange = PRACTICAL_OBSERVATIONS[organicObservation]?.change ? 1 : 0;
    const organicIndex = pick(PRACTICAL_ORGANIC_ORDER, organicId);
    const organicGuess = limit("organicGuess", state.organicGuess);

    return {
      titration: pick(PRACTICAL_TITRATION_ORDER, params.titration),
      flaskMolarity: t.flaskMolarity,
      flaskVolume: PRACTICAL_PIPETTE,
      nFlask: t.nFlask,
      nBurette: t.nBurette,
      strength,
      equivalence,
      added,
      initialReading: initial,
      finalReading: hundredths(initial + added),
      titre: added,
      flaskColour,
      atEndPoint: atEnd ? 1 : 0,
      overshoot: Math.max(0, hundredths(past)) || 0,
      foundMolarity: practicalMolarityFromTitre(t, added),
      gramsPerLitre: strength * t.buretteMolarMass,
      flaskNormality: t.nFlask * t.flaskMolarity,
      buretteNormality: t.nBurette * strength,
      selfIndicator: t.indicator === "self" ? 1 : 0,

      salt: saltIndex,
      saltColour: salt.colour,
      anion: salt.anion,
      cationGroup: salt.group,
      flame: salt.flame,
      reagent: pick(PRACTICAL_REAGENT_ORDER, reagent),
      saltObservation,
      saltChange: PRACTICAL_OBSERVATIONS[saltObservation]?.change ? 1 : 0,
      stage,
      schemeObservation,
      precipitate: stage === salt.group ? 1 : 0,
      removedEarlier: salt.group >= 1 && salt.group < stage ? 1 : 0,
      confirm: saltIndex,
      saltGuess,
      saltGuessRight: saltGuess === saltIndex ? 1 : 0,

      compound: compoundIndex,
      hasNitrogen: compound.nitrogen ? 1 : 0,
      hasSulfur: compound.sulfur ? 1 : 0,
      halogen: compound.halogen,
      fusionTest: pick(PRACTICAL_FUSION_TEST_ORDER, fusionTest),
      fusionObservation,
      fusionPositive: PRACTICAL_OBSERVATIONS[fusionObservation]?.change ? 1 : 0,
      compoundGuess,
      compoundGuessRight: compoundGuess === compoundIndex ? 1 : 0,

      organic: organicIndex,
      functionalGroup: organic.group,
      groupTest: pick(PRACTICAL_GROUP_TEST_ORDER, groupTest),
      organicObservation,
      organicChange,
      testFindsGroup: organicChange === 1 && PRACTICAL_TEST_FOR[groupTest] === organic.group ? 1 : 0,
      organicGuess,
      organicGuessRight: organicGuess === organicIndex ? 1 : 0,
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof PracticalState] : undefined;
  },

  setVariable(state, id, value) {
    if (!(id in PRACTICAL_LIMITS)) return state;
    const key = id as keyof PracticalState;
    return { ...state, [key]: limit(key, value) };
  },
};
