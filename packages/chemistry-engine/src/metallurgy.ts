import type { SimulationModel } from "@ise/science-engine";
import { METALACID_SERIES } from "./metalacid";

/**
 * Ionic compounds, extracting metals and alloys, for class 10 (NCERT
 * science, "Metals and Non-metals").
 *
 * Four small benches share one model:
 *
 *   • giving electrons — a metal atom hands its outer electrons to non-metal
 *     atoms, one at a time, until every ion has a full outer shell:
 *     Na (2,8,1) + Cl (2,8,7) → Na⁺ (2,8) + Cl⁻ (2,8,8);
 *   • properties of ionic compounds — melting and boiling points, whether
 *     they dissolve in water or kerosene, and whether a bulb glows when the
 *     solid, the melt or a solution is put in the circuit;
 *   • extraction — an ore goes through four stages (enrich, convert to the
 *     oxide, reduce, refine), and the route depends on where the metal sits
 *     in the reactivity series;
 *   • alloys — what each is made of, and gold measured in carats.
 *
 * Every equation is written balanced (the test counts atoms and charges).
 *
 * Simplifications, stated plainly:
 *   • The electron transfer is shown as one electron moving after another; in
 *     reality the compound forms from many atoms at once.
 *   • Melting and boiling points are NCERT's table values, except magnesium
 *     oxide, which NCERT does not list (data-book values, rounded).
 *   • Each ore is taken as the pure mineral once its gangue is removed, so
 *     "metal in the ore" is the share of the metal in the mineral's formula
 *     mass, with school atomic masses (Zn 65, Fe 56, Cu 63.5, …).
 *   • The stages run on a 0–4 dial: each stage takes one unit of it. Real
 *     plants take hours or days for each.
 *   • Alloy recipes vary; the ones here are typical (brass 70% copper and
 *     30% zinc, 18-8 stainless steel, the 63/37 electrician's solder).
 */

// ── Atoms and ions ───────────────────────────────────────────────────────────

export type MetAtomSymbol = "Li" | "Na" | "Mg" | "Ca" | "Cl" | "O";

export interface MetAtom {
  name: string;
  /** Electrons in each shell, K first. */
  shells: readonly number[];
}

export const MET_ATOMS: Record<MetAtomSymbol, MetAtom> = {
  Li: { name: "Lithium", shells: [2, 1] },
  Na: { name: "Sodium", shells: [2, 8, 1] },
  Mg: { name: "Magnesium", shells: [2, 8, 2] },
  Ca: { name: "Calcium", shells: [2, 8, 8, 2] },
  Cl: { name: "Chlorine", shells: [2, 8, 7] },
  O: { name: "Oxygen", shells: [2, 6] },
};

/** Electrons in the outermost shell. */
export function metOuter(symbol: MetAtomSymbol): number {
  const shells = MET_ATOMS[symbol].shells;
  return shells[shells.length - 1]!;
}

/** The shells after the atom gives away (charge > 0) or takes in (charge < 0) electrons to reach a full outer shell. */
export function metIonShells(symbol: MetAtomSymbol, charge: number): number[] {
  const shells = [...MET_ATOMS[symbol].shells];
  if (charge > 0) {
    shells[shells.length - 1] = shells[shells.length - 1]! - charge;
    if (shells[shells.length - 1] === 0) shells.pop();
  } else if (charge < 0) {
    shells[shells.length - 1] = shells[shells.length - 1]! - charge;
  }
  return shells;
}

/** "2,8,1". */
export function metShellText(shells: readonly number[]): string {
  return shells.join(",");
}

/** "Na⁺", "Mg²⁺", "O²⁻". */
export function metIonText(symbol: string, charge: number): string {
  if (charge === 0) return symbol;
  const size = Math.abs(charge);
  return `${symbol}${size === 1 ? "" : "⁰¹²³⁴"[size]}${charge > 0 ? "⁺" : "⁻"}`;
}

// ── Equations, every one balanced ────────────────────────────────────────────

export const MET_EQUATIONS = {
  // Forming ionic compounds
  "form-nacl": "2Na + Cl₂ → 2NaCl",
  "form-licl": "2Li + Cl₂ → 2LiCl",
  "form-mgcl2": "Mg + Cl₂ → MgCl₂",
  "form-cacl2": "Ca + Cl₂ → CaCl₂",
  "form-mgo": "2Mg + O₂ → 2MgO",
  "form-cao": "2Ca + O₂ → 2CaO",
  "ion-na": "Na → Na⁺ + e⁻",
  "ion-li": "Li → Li⁺ + e⁻",
  "ion-mg": "Mg → Mg²⁺ + 2e⁻",
  "ion-ca": "Ca → Ca²⁺ + 2e⁻",
  "ion-cl": "Cl + e⁻ → Cl⁻",
  "ion-o": "O + 2e⁻ → O²⁻",
  "slake-cao": "CaO + H₂O → Ca(OH)₂",
  // Electrolysis of the melt
  "electrolyse-nacl": "2NaCl → 2Na + Cl₂",
  "electrolyse-mgcl2": "MgCl₂ → Mg + Cl₂",
  "electrolyse-al2o3": "2Al₂O₃ → 4Al + 3O₂",
  "cathode-na": "Na⁺ + e⁻ → Na",
  "anode-cl": "2Cl⁻ → Cl₂ + 2e⁻",
  // Roasting, calcination and reduction with carbon
  "roast-zns": "2ZnS + 3O₂ → 2ZnO + 2SO₂",
  "calcine-znco3": "ZnCO₃ → ZnO + CO₂",
  "reduce-zno": "ZnO + C → Zn + CO",
  "reduce-fe2o3": "Fe₂O₃ + 3C → 2Fe + 3CO",
  "roast-pbs": "2PbS + 3O₂ → 2PbO + 2SO₂",
  "reduce-pbo": "PbO + C → Pb + CO",
  // Heating alone
  "roast-hgs": "2HgS + 3O₂ → 2HgO + 2SO₂",
  "heat-hgo": "2HgO → 2Hg + O₂",
  "roast-cu2s": "2Cu₂S + 3O₂ → 2Cu₂O + 2SO₂",
  "self-cu": "2Cu₂O + Cu₂S → 6Cu + SO₂",
  // A more reactive metal as the reducing agent
  thermit: "Fe₂O₃ + 2Al → 2Fe + Al₂O₃",
  // Electrolytic refining of copper
  "refine-anode": "Cu → Cu²⁺ + 2e⁻",
  "refine-cathode": "Cu²⁺ + 2e⁻ → Cu",
} as const;

export type MetEquationId = keyof typeof MET_EQUATIONS;

// ── Ionic compounds ──────────────────────────────────────────────────────────

export type MetIonicId = "nacl" | "licl" | "mgcl2" | "cacl2" | "mgo" | "cao";
export const MET_IONIC_ORDER: readonly MetIonicId[] = ["nacl", "licl", "mgcl2", "cacl2", "mgo", "cao"];

/** In water: 0 hardly dissolves, 1 dissolves, 2 reacts with it (and the product dissolves a little). */
export type MetInWater = 0 | 1 | 2;

export interface MetIonic {
  formula: string;
  name: string;
  metal: MetAtomSymbol;
  nonMetal: MetAtomSymbol;
  /** Non-metal atoms for each metal atom. */
  nonMetals: 1 | 2;
  meltingK: number;
  boilingK: number;
  /** Whether the two temperatures are NCERT's table values. */
  ncert: 0 | 1;
  inWater: MetInWater;
  formation: MetEquationId;
}

export const MET_IONIC: Record<MetIonicId, MetIonic> = {
  nacl: { formula: "NaCl", name: "Sodium chloride", metal: "Na", nonMetal: "Cl", nonMetals: 1, meltingK: 1074, boilingK: 1686, ncert: 1, inWater: 1, formation: "form-nacl" },
  licl: { formula: "LiCl", name: "Lithium chloride", metal: "Li", nonMetal: "Cl", nonMetals: 1, meltingK: 887, boilingK: 1600, ncert: 1, inWater: 1, formation: "form-licl" },
  mgcl2: { formula: "MgCl₂", name: "Magnesium chloride", metal: "Mg", nonMetal: "Cl", nonMetals: 2, meltingK: 981, boilingK: 1685, ncert: 1, inWater: 1, formation: "form-mgcl2" },
  cacl2: { formula: "CaCl₂", name: "Calcium chloride", metal: "Ca", nonMetal: "Cl", nonMetals: 2, meltingK: 1045, boilingK: 1900, ncert: 1, inWater: 1, formation: "form-cacl2" },
  mgo: { formula: "MgO", name: "Magnesium oxide", metal: "Mg", nonMetal: "O", nonMetals: 1, meltingK: 3125, boilingK: 3873, ncert: 0, inWater: 0, formation: "form-mgo" },
  cao: { formula: "CaO", name: "Calcium oxide", metal: "Ca", nonMetal: "O", nonMetals: 1, meltingK: 2850, boilingK: 3120, ncert: 1, inWater: 2, formation: "form-cao" },
};

/** How the compound is tested in the circuit. */
export type MetFormId = "solid" | "molten" | "water" | "kerosene";
export const MET_FORM_ORDER: readonly MetFormId[] = ["solid", "molten", "water", "kerosene"];

/** Whether ions are free to carry a current: never in the solid, always in the melt, in a liquid only if it dissolves. */
export function metConducts(compound: MetIonic, form: MetFormId): 0 | 1 {
  switch (form) {
    case "solid": return 0;
    case "molten": return 1;
    case "water": return compound.inWater === 0 ? 0 : 1;
    case "kerosene": return 0;
  }
}

// ── Ores and their routes ────────────────────────────────────────────────────

export type MetOreId =
  | "rock-salt" | "magnesium-chloride" | "bauxite" | "zinc-blende" | "calamine" | "haematite" | "galena"
  | "copper-glance" | "cinnabar" | "native-gold" | "thermit";
export const MET_ORE_ORDER: readonly MetOreId[] = [
  "rock-salt", "magnesium-chloride", "bauxite", "zinc-blende", "calamine", "haematite", "galena", "copper-glance", "cinnabar", "native-gold", "thermit",
];

/** How the metal is freed: 0 electrolysis of the melt, 1 reducing the oxide with carbon, 2 heating alone, 3 found free, 4 displaced by aluminium. */
export type MetMethod = 0 | 1 | 2 | 3 | 4;
export const MET_METHOD_NAMES = ["electrolysis of the melt", "reduction with carbon", "heating alone", "found free", "displacement by aluminium"] as const;

/** What the mineral is: 0 chloride, 1 oxide, 2 sulphide, 3 carbonate, 4 the metal itself. */
export type MetOreKind = 0 | 1 | 2 | 3 | 4;

export interface MetStage {
  title: string;
  /** The reaction at this stage, if there is one. */
  equation?: MetEquationId;
  /** A short note when there is no reaction to show. */
  note?: string;
  /** Not needed for this ore. */
  skipped: 0 | 1;
}

export interface MetOre {
  name: string;
  /** The mineral, as a formula. */
  mineral: string;
  /** Atoms in one formula unit of the mineral. */
  composition: Readonly<Record<string, number>>;
  metal: string;
  metalName: string;
  kind: MetOreKind;
  method: MetMethod;
  /** Gas given off when the ore is converted to an oxide: 0 none, 1 sulphur dioxide, 2 carbon dioxide. */
  firstGas: 0 | 1 | 2;
  /** Refined by electrolysis, with the impure metal as the anode. */
  refined: 0 | 1;
  stages: readonly [MetStage, MetStage, MetStage, MetStage];
}

const enrich: MetStage = { title: "Enrich: remove the gangue", note: "Sand and rock are separated from the ore", skipped: 0 };
const refineBy = (metal: string): MetStage => ({ title: "Refine by electrolysis", note: `Impure ${metal} anode, pure ${metal} cathode`, skipped: 0 });
const pureEnough: MetStage = { title: "Refine", note: "Pure enough straight from the cell", skipped: 1 };

export const MET_ORES: Record<MetOreId, MetOre> = {
  "rock-salt": {
    name: "Rock salt", mineral: "NaCl", composition: { Na: 1, Cl: 1 }, metal: "Na", metalName: "sodium", kind: 0, method: 0, firstGas: 0, refined: 0,
    stages: [enrich, { title: "Melt the chloride", note: "Ions must be free to move", skipped: 0 }, { title: "Electrolyse the melt", equation: "electrolyse-nacl", skipped: 0 }, pureEnough],
  },
  "magnesium-chloride": {
    name: "Magnesium chloride", mineral: "MgCl₂", composition: { Mg: 1, Cl: 2 }, metal: "Mg", metalName: "magnesium", kind: 0, method: 0, firstGas: 0, refined: 0,
    stages: [enrich, { title: "Melt the chloride", note: "Ions must be free to move", skipped: 0 }, { title: "Electrolyse the melt", equation: "electrolyse-mgcl2", skipped: 0 }, pureEnough],
  },
  bauxite: {
    name: "Bauxite", mineral: "Al₂O₃", composition: { Al: 2, O: 3 }, metal: "Al", metalName: "aluminium", kind: 1, method: 0, firstGas: 0, refined: 0,
    stages: [enrich, { title: "Melt the oxide", note: "Carbon cannot take oxygen from Al₂O₃", skipped: 0 }, { title: "Electrolyse the melt", equation: "electrolyse-al2o3", skipped: 0 }, pureEnough],
  },
  "zinc-blende": {
    name: "Zinc blende", mineral: "ZnS", composition: { Zn: 1, S: 1 }, metal: "Zn", metalName: "zinc", kind: 2, method: 1, firstGas: 1, refined: 1,
    stages: [enrich, { title: "Roast: heat strongly in air", equation: "roast-zns", skipped: 0 }, { title: "Reduce with carbon", equation: "reduce-zno", skipped: 0 }, refineBy("zinc")],
  },
  calamine: {
    name: "Calamine", mineral: "ZnCO₃", composition: { Zn: 1, C: 1, O: 3 }, metal: "Zn", metalName: "zinc", kind: 3, method: 1, firstGas: 2, refined: 1,
    stages: [enrich, { title: "Calcine: heat in limited air", equation: "calcine-znco3", skipped: 0 }, { title: "Reduce with carbon", equation: "reduce-zno", skipped: 0 }, refineBy("zinc")],
  },
  haematite: {
    name: "Haematite", mineral: "Fe₂O₃", composition: { Fe: 2, O: 3 }, metal: "Fe", metalName: "iron", kind: 1, method: 1, firstGas: 0, refined: 0,
    stages: [enrich, { title: "Convert to the oxide", note: "Already an oxide: nothing to do", skipped: 1 }, { title: "Reduce with carbon", equation: "reduce-fe2o3", skipped: 0 }, { title: "Refine", note: "Iron is not refined by electrolysis", skipped: 1 }],
  },
  galena: {
    name: "Galena", mineral: "PbS", composition: { Pb: 1, S: 1 }, metal: "Pb", metalName: "lead", kind: 2, method: 1, firstGas: 1, refined: 1,
    stages: [enrich, { title: "Roast: heat strongly in air", equation: "roast-pbs", skipped: 0 }, { title: "Reduce with carbon", equation: "reduce-pbo", skipped: 0 }, refineBy("lead")],
  },
  "copper-glance": {
    name: "Copper glance", mineral: "Cu₂S", composition: { Cu: 2, S: 1 }, metal: "Cu", metalName: "copper", kind: 2, method: 2, firstGas: 1, refined: 1,
    stages: [enrich, { title: "Roast: heat in air", equation: "roast-cu2s", skipped: 0 }, { title: "Keep heating: no carbon needed", equation: "self-cu", skipped: 0 }, refineBy("copper")],
  },
  cinnabar: {
    name: "Cinnabar", mineral: "HgS", composition: { Hg: 1, S: 1 }, metal: "Hg", metalName: "mercury", kind: 2, method: 2, firstGas: 1, refined: 0,
    stages: [enrich, { title: "Roast: heat in air", equation: "roast-hgs", skipped: 0 }, { title: "Heat the oxide alone", equation: "heat-hgo", skipped: 0 }, { title: "Refine", note: "Mercury is purified by distilling it", skipped: 1 }],
  },
  "native-gold": {
    name: "Gold nuggets", mineral: "Au", composition: { Au: 1 }, metal: "Au", metalName: "gold", kind: 4, method: 3, firstGas: 0, refined: 1,
    stages: [{ title: "Wash out the gangue", note: "Gold is heavy: water carries sand away", skipped: 0 }, { title: "Convert to the oxide", note: "Already the metal: nothing to do", skipped: 1 }, { title: "Reduce", note: "Already the metal: nothing to do", skipped: 1 }, refineBy("gold")],
  },
  thermit: {
    name: "Thermit welding", mineral: "Fe₂O₃", composition: { Fe: 2, O: 3 }, metal: "Fe", metalName: "iron", kind: 1, method: 4, firstGas: 0, refined: 0,
    stages: [{ title: "Enrich", note: "Pure iron oxide powder: no gangue", skipped: 1 }, { title: "Mix with aluminium powder", note: "Packed round the gap between two rails", skipped: 0 }, { title: "Light it: aluminium takes the oxygen", equation: "thermit", skipped: 0 }, { title: "Weld", note: "Molten iron fills the gap between rails", skipped: 0 }],
  },
};

/** School atomic masses, u. */
export const MET_ATOMIC_MASS: Readonly<Record<string, number>> = {
  H: 1, C: 12, O: 16, Na: 23, Mg: 24, Al: 27, S: 32, Cl: 35.5, Ca: 40, Fe: 56, Cu: 63.5, Zn: 65, Au: 197, Hg: 201, Pb: 207,
};

/** The share of the metal in the mineral's formula mass, in per cent. */
export function metMetalPercent(ore: MetOre): number {
  let total = 0;
  for (const [symbol, n] of Object.entries(ore.composition)) total += (MET_ATOMIC_MASS[symbol] ?? 0) * n;
  const metal = (MET_ATOMIC_MASS[ore.metal] ?? 0) * (ore.composition[ore.metal] ?? 0);
  return total > 0 ? (100 * metal) / total : 0;
}

/** Place in the series, 13 for potassium down to 1 for gold (as in the metals, acids and salts lab). */
export function metReactivity(symbol: string): number {
  const rank = METALACID_SERIES.indexOf(symbol);
  return rank < 0 ? 0 : METALACID_SERIES.length - rank;
}

/** The route the reactivity series suggests: high → electrolysis, middle → carbon, low → heat alone, lowest → found free. */
export function metMethodForMetal(symbol: string): MetMethod {
  const rank = METALACID_SERIES.indexOf(symbol);
  if (rank <= METALACID_SERIES.indexOf("Al")) return 0;
  if (rank <= METALACID_SERIES.indexOf("Pb")) return 1;
  if (rank <= METALACID_SERIES.indexOf("Hg")) return 2;
  return 3;
}

// ── Alloys ───────────────────────────────────────────────────────────────────

export type MetAlloyElement = "Cu" | "Zn" | "Sn" | "Pb" | "Fe" | "Cr" | "Ni" | "C" | "Au";
export const MET_ALLOY_ELEMENTS: readonly MetAlloyElement[] = ["Cu", "Zn", "Sn", "Pb", "Fe", "Cr", "Ni", "C", "Au"];

export type MetAlloyId = "brass" | "bronze" | "solder" | "stainless" | "steel" | "gold22";
export const MET_ALLOY_ORDER: readonly MetAlloyId[] = ["brass", "bronze", "solder", "stainless", "steel", "gold22"];

/** Melting points of the pure metals in solder, and of the solder itself (63% tin, the lowest-melting mix), K. */
export const MET_LEAD_MELTS_K = 601;
export const MET_TIN_MELTS_K = 505;
export const MET_SOLDER_MELTS_K = 456;

export interface MetAlloy {
  name: string;
  /** Parts by mass; the model turns them into percentages. */
  parts: Partial<Record<MetAlloyElement, number>>;
  /** The metal the others are melted into. */
  base: MetAlloyElement;
  use: string;
  /** Rusts in moist air (only iron alloys can rust). */
  rusts: 0 | 1;
  /** Why the alloy beats the pure metal. */
  note: string;
}

export const MET_ALLOYS: Record<MetAlloyId, MetAlloy> = {
  brass: { name: "Brass", parts: { Cu: 70, Zn: 30 }, base: "Cu", use: "Taps, locks and musical instruments", rusts: 0, note: "Harder than copper, but a poorer conductor" },
  bronze: { name: "Bronze", parts: { Cu: 90, Sn: 10 }, base: "Cu", use: "Statues, medals and bells", rusts: 0, note: "Harder than copper, but a poorer conductor" },
  solder: {
    name: "Solder", parts: { Sn: 63, Pb: 37 }, base: "Sn", use: "Joining electrical wires", rusts: 0,
    note: `Melts at ${MET_SOLDER_MELTS_K} K; tin ${MET_TIN_MELTS_K} K, lead ${MET_LEAD_MELTS_K} K`,
  },
  stainless: { name: "Stainless steel", parts: { Fe: 74, Cr: 18, Ni: 8 }, base: "Fe", use: "Kitchen vessels and surgical tools", rusts: 0, note: "Chromium and nickel stop it rusting" },
  steel: { name: "Steel", parts: { Fe: 99.95, C: 0.05 }, base: "Fe", use: "Bridges, rails and machines", rusts: 1, note: "A little carbon makes soft iron hard and strong" },
  gold22: { name: "22 carat gold", parts: { Au: 22, Cu: 2 }, base: "Au", use: "Jewellery", rusts: 0, note: "Pure gold is too soft to keep its shape" },
};

/** Each element's share of the alloy, in per cent. */
export function metAlloyPercents(alloy: MetAlloy): Record<MetAlloyElement, number> {
  const total = Object.values(alloy.parts).reduce((sum, n) => sum + (n ?? 0), 0);
  const out = {} as Record<MetAlloyElement, number>;
  for (const element of MET_ALLOY_ELEMENTS) out[element] = total > 0 ? (100 * (alloy.parts[element] ?? 0)) / total : 0;
  return out;
}

/** Gold is measured in 24 parts: 24 carat is pure. */
export const MET_CARAT_MAX = 24;

// ── The model ────────────────────────────────────────────────────────────────

export type MetallurgyParams = {
  compound: MetIonicId;
  form: MetFormId;
  ore: MetOreId;
  alloy: MetAlloyId;
};

export interface MetallurgyState {
  /** How far the electron transfer has gone, 0 to 1. */
  readonly transfer: number;
  /** Progress along the ore's four stages, 0 to 4. */
  readonly stage: number;
  /** Carats of the gold, 1 to 24. */
  readonly carat: number;
}

export type MetallurgyResults = {
  compound: number;
  /** Non-metal atoms for each metal atom. */
  nonMetalAtoms: number;
  metalOuter: number;
  nonMetalOuter: number;
  /** Electrons each metal atom gives, and each non-metal atom takes. */
  valency: number;
  gainEach: number;
  electronsTotal: number;
  transfer: number;
  electronsMoved: number;
  /** Charge on the metal so far, and the total negative charge on the non-metals so far. */
  metalCharge: number;
  nonMetalCharge: number;
  /** Sum of all charges: always zero. */
  totalCharge: number;
  /** 1 once every atom has a full outer shell. */
  ionsFormed: number;
  meltingPoint: number;
  boilingPoint: number;
  form: number;
  conducts: number;
  inWater: number;
  inKerosene: number;

  ore: number;
  reactivity: number;
  method: number;
  /** The method the reactivity series alone suggests. */
  seriesMethod: number;
  oreKind: number;
  firstGas: number;
  metalPercent: number;
  stage: number;
  stageIndex: number;
  stageSkipped: number;
  gangueLeft: number;
  metalFormed: number;
  refinedByElectrolysis: number;
  refined: number;

  alloy: number;
  alloyMetals: number;
  hasNonMetal: number;
  mainPercent: number;
  copperPercent: number;
  zincPercent: number;
  tinPercent: number;
  leadPercent: number;
  ironPercent: number;
  chromiumPercent: number;
  nickelPercent: number;
  carbonPercent: number;
  alloyGoldPercent: number;
  rusts: number;

  carat: number;
  goldPercent: number;
  otherParts: number;
};

const OUTPUTS = [
  "compound", "nonMetalAtoms", "metalOuter", "nonMetalOuter", "valency", "gainEach", "electronsTotal", "transfer", "electronsMoved",
  "metalCharge", "nonMetalCharge", "totalCharge", "ionsFormed", "meltingPoint", "boilingPoint", "form", "conducts", "inWater", "inKerosene",
  "ore", "reactivity", "method", "seriesMethod", "oreKind", "firstGas", "metalPercent", "stage", "stageIndex", "stageSkipped", "gangueLeft",
  "metalFormed", "refinedByElectrolysis", "refined",
  "alloy", "alloyMetals", "hasNonMetal", "mainPercent", "copperPercent", "zincPercent", "tinPercent", "leadPercent", "ironPercent",
  "chromiumPercent", "nickelPercent", "carbonPercent", "alloyGoldPercent", "rusts",
  "carat", "goldPercent", "otherParts",
] as const satisfies readonly (keyof MetallurgyResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
const index = <T>(order: readonly T[], value: T) => Math.max(0, order.indexOf(value));

export const MET_STAGE_MAX = 4;

export const metallurgyModel: SimulationModel<MetallurgyState, MetallurgyParams, MetallurgyResults> = {
  id: "metallurgy",
  defaultParams: { compound: "nacl", form: "solid", ore: "zinc-blende", alloy: "brass" },
  outputs: OUTPUTS,
  stateVariables: ["transfer", "stage", "carat"],

  initialize() {
    return { transfer: 0, stage: 0, carat: 22 };
  },

  /** Play moves the electrons across in two seconds, and walks the ore through a stage every two seconds. */
  advance(state, dt) {
    return { ...state, transfer: clamp(state.transfer + dt / 2, 0, 1), stage: clamp(state.stage + dt / 2, 0, MET_STAGE_MAX) };
  },

  step(state, _params, sign) {
    return {
      transfer: clamp(Math.round(state.transfer * 4) / 4 + 0.25 * sign, 0, 1),
      stage: clamp(Math.round(state.stage) + sign, 0, MET_STAGE_MAX),
      carat: clamp(Math.round(state.carat) + sign, 1, MET_CARAT_MAX),
    };
  },

  derive(state, params) {
    // Giving electrons
    const c = MET_IONIC[params.compound] ?? MET_IONIC.nacl;
    const compoundId = MET_IONIC[params.compound] ? params.compound : "nacl";
    const valency = metOuter(c.metal);
    const gainEach = 8 - metOuter(c.nonMetal);
    const total = valency;
    const transfer = clamp(state.transfer, 0, 1);
    const moved = Math.min(total, Math.floor(transfer * total + 1e-9));
    const formId = MET_FORM_ORDER.includes(params.form) ? params.form : "solid";

    // Extraction
    const oreId = MET_ORES[params.ore] ? params.ore : "zinc-blende";
    const ore = MET_ORES[oreId];
    const stage = clamp(state.stage, 0, MET_STAGE_MAX);
    const stageIndex = Math.min(3, Math.floor(stage));
    const native = ore.kind === 4;
    const noGangue = ore.stages[0].skipped === 1;

    // Alloys
    const alloyId = MET_ALLOYS[params.alloy] ? params.alloy : "brass";
    const alloy = MET_ALLOYS[alloyId];
    const percent = metAlloyPercents(alloy);
    const elements = MET_ALLOY_ELEMENTS.filter((e) => percent[e] > 0);

    const carat = Math.round(clamp(state.carat, 1, MET_CARAT_MAX));

    return {
      compound: index(MET_IONIC_ORDER, compoundId),
      nonMetalAtoms: c.nonMetals,
      metalOuter: valency,
      nonMetalOuter: metOuter(c.nonMetal),
      valency,
      gainEach,
      electronsTotal: total,
      transfer,
      electronsMoved: moved,
      metalCharge: moved,
      nonMetalCharge: moved,
      totalCharge: moved - moved || 0,
      ionsFormed: moved === total ? 1 : 0,
      meltingPoint: c.meltingK,
      boilingPoint: c.boilingK,
      form: index(MET_FORM_ORDER, formId),
      conducts: metConducts(c, formId),
      inWater: c.inWater,
      inKerosene: 0,

      ore: index(MET_ORE_ORDER, oreId),
      reactivity: metReactivity(ore.metal),
      method: ore.method,
      seriesMethod: metMethodForMetal(ore.metal),
      oreKind: ore.kind,
      firstGas: ore.firstGas,
      metalPercent: metMetalPercent(ore),
      stage,
      stageIndex,
      stageSkipped: ore.stages[stageIndex]!.skipped,
      gangueLeft: noGangue ? 0 : 1 - clamp(stage, 0, 1),
      metalFormed: native ? 1 : clamp(stage - 2, 0, 1),
      refinedByElectrolysis: ore.refined,
      refined: ore.refined ? clamp(stage - 3, 0, 1) : 0,

      alloy: index(MET_ALLOY_ORDER, alloyId),
      alloyMetals: elements.filter((e) => e !== "C").length,
      hasNonMetal: percent.C > 0 ? 1 : 0,
      mainPercent: percent[alloy.base],
      copperPercent: percent.Cu,
      zincPercent: percent.Zn,
      tinPercent: percent.Sn,
      leadPercent: percent.Pb,
      ironPercent: percent.Fe,
      chromiumPercent: percent.Cr,
      nickelPercent: percent.Ni,
      carbonPercent: percent.C,
      alloyGoldPercent: percent.Au,
      rusts: alloy.rusts,

      carat,
      goldPercent: (100 * carat) / MET_CARAT_MAX,
      otherParts: MET_CARAT_MAX - carat,
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof MetallurgyState] : undefined;
  },

  setVariable(state, id, value) {
    switch (id) {
      case "transfer": return { ...state, transfer: clamp(value, 0, 1) };
      case "stage": return { ...state, stage: clamp(value, 0, MET_STAGE_MAX) };
      case "carat": return { ...state, carat: clamp(value, 1, MET_CARAT_MAX) };
      default: return state;
    }
  },
};
