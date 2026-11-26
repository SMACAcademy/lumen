import type { SimulationModel } from "@ise/science-engine";

/**
 * Metals, acids and salts, for classes 7 to 10 (NCERT science).
 *
 * Seven small benches share one model:
 *
 *   • metal or non-metal — lustre, malleability, ductility, conduction and
 *     ring, with the famous exceptions (mercury is a liquid, graphite
 *     conducts, iodine shines, sodium cuts with a knife);
 *   • corrosion — iron rusts reddish-brown, copper turns green, silver black;
 *   • the reactivity series K > Na > Ca > Mg > Al > Zn > Fe > Pb > (H) > Cu >
 *     Hg > Ag > Au — a metal strip in a salt solution displaces a metal below
 *     it, a metal above hydrogen gives hydrogen with dilute acid, and the top
 *     three react with cold water;
 *   • oxidation and reduction as gaining or losing oxygen or hydrogen;
 *   • acids with metals, carbonates, a metal oxide and a base, with the pop
 *     test for hydrogen and the limewater test for carbon dioxide;
 *   • the pH scale with everyday substances and four indicators;
 *   • salts at home and their water of crystallisation.
 *
 * Every equation is generated or written balanced (the test counts atoms).
 *
 * Simplifications, stated plainly:
 *   • How fast things happen is illustrative. Each change follows
 *     1 − e^(−t/τ) with a time constant τ chosen to look right (an iron nail in
 *     copper sulphate is mostly coated after about 20 minutes, as in the NCERT
 *     activity); the rates were not measured.
 *   • In the acid bench, a fixed 4 mmol of solid goes into 100 mL of
 *     0.1 mol/L hydrochloric acid (pH 1). The acid is always in excess; the
 *     volume is taken as constant, the gas leaves, and the pH is worked out
 *     from the hydrochloric acid left over alone.
 *   • pH values of everyday things vary; the ones here are typical.
 *   • Indicators change over a range of pH; the model uses a single cut-off
 *     for each (litmus red below 5 and blue above 8, phenolphthalein pink
 *     above 8.2, methyl orange red below 3.1 and yellow above 4.4, turmeric
 *     reddish-brown from 8).
 *   • Potassium, sodium and calcium dropped into a salt solution react with
 *     the water first; what happens after that is not shown.
 */

// ── Elements: metal or non-metal ─────────────────────────────────────────────

export type MetalAcidElementId =
  | "iron" | "copper" | "aluminium" | "gold" | "silver" | "sodium" | "mercury"
  | "sulphur" | "graphite" | "iodine" | "bromine" | "oxygen";

export interface MetalAcidElement {
  name: string;
  symbol: string;
  metal: 0 | 1;
  lustre: 0 | 1;
  malleable: 0 | 1;
  ductile: 0 | 1;
  /** Conducts electricity. */
  conducts: 0 | 1;
  sonorous: 0 | 1;
  /** At room temperature: 0 solid, 1 liquid, 2 gas. */
  state: 0 | 1 | 2;
  /** Soft enough to cut with a knife. */
  knife: 0 | 1;
  /** Its oxide: 0 acidic, 1 basic, 2 both (amphoteric), 3 hardly forms one, 4 it is oxygen. */
  oxide: 0 | 1 | 2 | 3 | 4;
  /** The oxide, as a formula ("" when there is none to show). */
  oxideFormula: string;
}

export const METALACID_ELEMENT_ORDER: readonly MetalAcidElementId[] = [
  "iron", "copper", "aluminium", "gold", "silver", "sodium", "mercury", "sulphur", "graphite", "iodine", "bromine", "oxygen",
];

const el = (
  name: string, symbol: string, flags: [0 | 1, 0 | 1, 0 | 1, 0 | 1, 0 | 1, 0 | 1], state: 0 | 1 | 2, knife: 0 | 1, oxide: MetalAcidElement["oxide"], oxideFormula: string,
): MetalAcidElement => {
  const [metal, lustre, malleable, ductile, conducts, sonorous] = flags;
  return { name, symbol, metal, lustre, malleable, ductile, conducts, sonorous, state, knife, oxide, oxideFormula };
};

export const METALACID_ELEMENTS: Record<MetalAcidElementId, MetalAcidElement> = {
  iron: el("Iron", "Fe", [1, 1, 1, 1, 1, 1], 0, 0, 1, "Fe₂O₃"),
  copper: el("Copper", "Cu", [1, 1, 1, 1, 1, 1], 0, 0, 1, "CuO"),
  aluminium: el("Aluminium", "Al", [1, 1, 1, 1, 1, 1], 0, 0, 2, "Al₂O₃"),
  gold: el("Gold", "Au", [1, 1, 1, 1, 1, 1], 0, 0, 3, ""),
  silver: el("Silver", "Ag", [1, 1, 1, 1, 1, 1], 0, 0, 3, ""),
  sodium: el("Sodium", "Na", [1, 1, 1, 1, 1, 0], 0, 1, 1, "Na₂O"),
  mercury: el("Mercury", "Hg", [1, 1, 0, 0, 1, 0], 1, 0, 1, "HgO"),
  sulphur: el("Sulphur", "S", [0, 0, 0, 0, 0, 0], 0, 0, 0, "SO₂"),
  graphite: el("Carbon (graphite)", "C", [0, 1, 0, 0, 1, 0], 0, 0, 0, "CO₂"),
  iodine: el("Iodine", "I", [0, 1, 0, 0, 0, 0], 0, 0, 0, "I₂O₅"),
  bromine: el("Bromine", "Br", [0, 0, 0, 0, 0, 0], 1, 0, 3, ""),
  oxygen: el("Oxygen", "O", [0, 0, 0, 0, 0, 0], 2, 0, 4, ""),
};

// ── Metals and the reactivity series ─────────────────────────────────────────

export type MetalAcidMetalId =
  | "potassium" | "sodium" | "calcium" | "magnesium" | "aluminium" | "zinc" | "iron" | "lead" | "copper" | "mercury" | "silver" | "gold";

/** The series, most reactive first, with hydrogen in its place. */
export const METALACID_SERIES: readonly string[] = ["K", "Na", "Ca", "Mg", "Al", "Zn", "Fe", "Pb", "H", "Cu", "Hg", "Ag", "Au"];
/** Where hydrogen sits in the series. */
export const METALACID_HYDROGEN_RANK = 8;

export const METALACID_METAL_ORDER: readonly MetalAcidMetalId[] = [
  "potassium", "sodium", "calcium", "magnesium", "aluminium", "zinc", "iron", "lead", "copper", "mercury", "silver", "gold",
];

/** Coatings that corrosion leaves: 0 none, 1 reddish-brown rust, 2 green, 3 black, 4 dull white or grey. */
export const METALACID_COATING_NAMES = ["none", "reddish-brown rust", "green coating", "black coating", "dull white or grey layer"] as const;

export interface MetalAcidMetal {
  name: string;
  symbol: string;
  /** Charge of its ion in the salts made here (iron as Fe²⁺). */
  charge: number;
  /** Place in METALACID_SERIES (0 = potassium). */
  rank: number;
  /** Time constant in dilute hydrochloric acid, min (Infinity: no reaction). */
  acidMinutes: number;
  /** Time constant in cold water, min (Infinity: no reaction). */
  waterMinutes: number;
  /** Time constant when it displaces another metal from a solution, min. */
  displaceMinutes: number;
  /** Reacts dangerously fast with water and acids. */
  violent: 0 | 1;
  /** Corrosion in moist air: time constant in days (Infinity: none), the coating, and whether it stays on as a skin. */
  corrosionDays: number;
  coating: 0 | 1 | 2 | 3 | 4;
  layerStays: 0 | 1;
  /** What it does in cold water, when nothing happens or to say how. */
  waterNote: string;
}

const NEVER = Number.POSITIVE_INFINITY;
const metal = (m: Omit<MetalAcidMetal, "rank"> & { symbol: string }): MetalAcidMetal => ({ ...m, rank: METALACID_SERIES.indexOf(m.symbol) });

export const METALACID_METALS: Record<MetalAcidMetalId, MetalAcidMetal> = {
  potassium: metal({ name: "Potassium", symbol: "K", charge: 1, acidMinutes: 0.05, waterMinutes: 0.1, displaceMinutes: NEVER, violent: 1, corrosionDays: 0.05, coating: 4, layerStays: 0, waterNote: "Potassium reacts violently and catches fire" }),
  sodium: metal({ name: "Sodium", symbol: "Na", charge: 1, acidMinutes: 0.1, waterMinutes: 0.2, displaceMinutes: NEVER, violent: 1, corrosionDays: 0.1, coating: 4, layerStays: 0, waterNote: "Sodium reacts violently with cold water" }),
  calcium: metal({ name: "Calcium", symbol: "Ca", charge: 2, acidMinutes: 0.3, waterMinutes: 2, displaceMinutes: NEVER, violent: 0, corrosionDays: 2, coating: 4, layerStays: 0, waterNote: "Calcium reacts gently with cold water and floats" }),
  magnesium: metal({ name: "Magnesium", symbol: "Mg", charge: 2, acidMinutes: 1, waterMinutes: NEVER, displaceMinutes: 2, violent: 0, corrosionDays: 20, coating: 4, layerStays: 1, waterNote: "Magnesium needs hot water, not cold" }),
  aluminium: metal({ name: "Aluminium", symbol: "Al", charge: 3, acidMinutes: 4, waterMinutes: NEVER, displaceMinutes: 6, violent: 0, corrosionDays: 0.5, coating: 4, layerStays: 1, waterNote: "Aluminium reacts only with steam" }),
  zinc: metal({ name: "Zinc", symbol: "Zn", charge: 2, acidMinutes: 3, waterMinutes: NEVER, displaceMinutes: 4, violent: 0, corrosionDays: 30, coating: 4, layerStays: 1, waterNote: "Zinc reacts only with steam" }),
  iron: metal({ name: "Iron", symbol: "Fe", charge: 2, acidMinutes: 8, waterMinutes: NEVER, displaceMinutes: 8, violent: 0, corrosionDays: 7, coating: 1, layerStays: 0, waterNote: "Iron reacts only with steam" }),
  lead: metal({ name: "Lead", symbol: "Pb", charge: 2, acidMinutes: 60, waterMinutes: NEVER, displaceMinutes: 20, violent: 0, corrosionDays: 30, coating: 4, layerStays: 1, waterNote: "Lead does not react with water" }),
  copper: metal({ name: "Copper", symbol: "Cu", charge: 2, acidMinutes: NEVER, waterMinutes: NEVER, displaceMinutes: 10, violent: 0, corrosionDays: 120, coating: 2, layerStays: 1, waterNote: "Copper does not react with water" }),
  mercury: metal({ name: "Mercury", symbol: "Hg", charge: 2, acidMinutes: NEVER, waterMinutes: NEVER, displaceMinutes: 15, violent: 0, corrosionDays: NEVER, coating: 0, layerStays: 1, waterNote: "Mercury does not react with water" }),
  silver: metal({ name: "Silver", symbol: "Ag", charge: 1, acidMinutes: NEVER, waterMinutes: NEVER, displaceMinutes: 15, violent: 0, corrosionDays: 40, coating: 3, layerStays: 1, waterNote: "Silver does not react with water" }),
  gold: metal({ name: "Gold", symbol: "Au", charge: 3, acidMinutes: NEVER, waterMinutes: NEVER, displaceMinutes: NEVER, violent: 0, corrosionDays: NEVER, coating: 0, layerStays: 1, waterNote: "Gold does not react with water" }),
};

export type MetalAcidLiquidId = "hcl" | "water" | "cuso4" | "feso4" | "znso4" | "mgso4" | "agno3";

export interface MetalAcidLiquid {
  name: string;
  formula: string;
  /** The metal in the dissolved salt, if any. */
  metal?: MetalAcidMetalId;
  anion?: "sulphate" | "nitrate";
}

export const METALACID_LIQUID_ORDER: readonly MetalAcidLiquidId[] = ["hcl", "water", "cuso4", "feso4", "znso4", "mgso4", "agno3"];

export const METALACID_LIQUIDS: Record<MetalAcidLiquidId, MetalAcidLiquid> = {
  hcl: { name: "Dilute hydrochloric acid", formula: "HCl" },
  water: { name: "Cold water", formula: "H₂O" },
  cuso4: { name: "Copper sulphate solution", formula: "CuSO₄", metal: "copper", anion: "sulphate" },
  feso4: { name: "Iron sulphate solution", formula: "FeSO₄", metal: "iron", anion: "sulphate" },
  znso4: { name: "Zinc sulphate solution", formula: "ZnSO₄", metal: "zinc", anion: "sulphate" },
  mgso4: { name: "Magnesium sulphate solution", formula: "MgSO₄", metal: "magnesium", anion: "sulphate" },
  agno3: { name: "Silver nitrate solution", formula: "AgNO₃", metal: "silver", anion: "nitrate" },
};

// ── Writing balanced equations ───────────────────────────────────────────────

const SUBSCRIPTS = "₀₁₂₃₄₅₆₇₈₉";
const subscript = (n: number) => (n === 1 ? "" : String(n).split("").map((d) => SUBSCRIPTS[Number(d)]).join(""));
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;

interface Anion {
  text: string;
  charge: number;
  /** Needs brackets when there is more than one. */
  group: boolean;
}

const ANIONS = {
  sulphate: { text: "SO₄", charge: 2, group: true },
  nitrate: { text: "NO₃", charge: 1, group: true },
  chloride: { text: "Cl", charge: 1, group: false },
  hydroxide: { text: "OH", charge: 1, group: true },
} satisfies Record<string, Anion>;

/** The neutral formula of a metal ion and an anion, and how many metal atoms it holds. */
export function metalAcidSaltFormula(symbol: string, charge: number, anion: keyof typeof ANIONS): { formula: string; metals: number } {
  const a = ANIONS[anion];
  const l = lcm(charge, a.charge);
  const x = l / charge;
  const y = l / a.charge;
  const tail = y === 1 ? a.text : a.group ? `(${a.text})${subscript(y)}` : `${a.text}${subscript(y)}`;
  return { formula: `${symbol}${subscript(x)}${tail}`, metals: x };
}

export interface MetalAcidTerm {
  n: number;
  formula: string;
}

export interface MetalAcidEquation {
  reactants: readonly MetalAcidTerm[];
  products: readonly MetalAcidTerm[];
}

const term = (n: number, formula: string): MetalAcidTerm => ({ n, formula });

/** One side as printed: "2Al + 3CuSO₄". */
export function metalAcidSide(terms: readonly MetalAcidTerm[]): string {
  return terms.map((t) => `${t.n === 1 ? "" : t.n}${t.formula}`).join(" + ");
}

export function metalAcidEquationText(eq: MetalAcidEquation): string {
  return `${metalAcidSide(eq.reactants)} → ${metalAcidSide(eq.products)}`;
}

function reduce(eq: MetalAcidEquation): MetalAcidEquation {
  const all = [...eq.reactants, ...eq.products].map((t) => t.n);
  const g = all.reduce((a, b) => gcd(a, b));
  return { reactants: eq.reactants.map((t) => term(t.n / g, t.formula)), products: eq.products.map((t) => term(t.n / g, t.formula)) };
}

/** a M + b (salt of N) → c (salt of M) + d N, balanced by charge, then made whole. */
export function metalAcidDisplacementEquation(m: MetalAcidMetal, n: MetalAcidMetal, anion: "sulphate" | "nitrate"): MetalAcidEquation {
  const l = lcm(m.charge, n.charge);
  const a = l / m.charge;
  const d = l / n.charge;
  const nSalt = metalAcidSaltFormula(n.symbol, n.charge, anion);
  const mSalt = metalAcidSaltFormula(m.symbol, m.charge, anion);
  let k = 1;
  while ((k * d) % nSalt.metals !== 0 || (k * a) % mSalt.metals !== 0) k++;
  return reduce({
    reactants: [term(k * a, m.symbol), term((k * d) / nSalt.metals, nSalt.formula)],
    products: [term((k * a) / mSalt.metals, mSalt.formula), term(k * d, n.symbol)],
  });
}

/** Metal + dilute hydrochloric acid → chloride + hydrogen. */
export function metalAcidHydrogenEquation(m: MetalAcidMetal): MetalAcidEquation {
  const salt = metalAcidSaltFormula(m.symbol, m.charge, "chloride");
  const atoms = m.charge % 2 === 0 ? 1 : 2;
  return reduce({
    reactants: [term(atoms, m.symbol), term(atoms * m.charge, "HCl")],
    products: [term(atoms, salt.formula), term((atoms * m.charge) / 2, "H₂")],
  });
}

/** Metal + cold water → hydroxide + hydrogen. */
export function metalAcidWaterEquation(m: MetalAcidMetal): MetalAcidEquation {
  const base = metalAcidSaltFormula(m.symbol, m.charge, "hydroxide");
  const atoms = m.charge % 2 === 0 ? 1 : 2;
  return reduce({
    reactants: [term(atoms, m.symbol), term(atoms * m.charge, "H₂O")],
    products: [term(atoms, base.formula), term((atoms * m.charge) / 2, "H₂")],
  });
}

/** What happens to the strip: 0 nothing, 1 displacement, 2 hydrogen from the acid, 3 it reacts with the water. */
export interface MetalAcidInLiquid {
  kind: 0 | 1 | 2 | 3;
  equation: MetalAcidEquation | null;
  /** Time constant, min (Infinity when nothing happens). */
  minutes: number;
  /** One short line on what happens. */
  note: string;
}

const lower = (s: string) => s.toLowerCase();

export function metalAcidInLiquid(metalId: MetalAcidMetalId, liquidId: MetalAcidLiquidId): MetalAcidInLiquid {
  const m = METALACID_METALS[metalId] ?? METALACID_METALS.iron;
  const liquid = METALACID_LIQUIDS[liquidId] ?? METALACID_LIQUIDS.cuso4;
  const water = (note: string): MetalAcidInLiquid => ({ kind: 3, equation: metalAcidWaterEquation(m), minutes: m.waterMinutes, note });

  if (liquidId === "water") {
    return Number.isFinite(m.waterMinutes) ? water(m.waterNote) : { kind: 0, equation: null, minutes: NEVER, note: m.waterNote };
  }
  if (liquidId === "hcl") {
    if (m.rank < METALACID_HYDROGEN_RANK) {
      const note = m.violent ? `${m.name} explodes in acid: never try it` : `${m.name} is above hydrogen: it gives hydrogen gas`;
      return { kind: 2, equation: metalAcidHydrogenEquation(m), minutes: m.acidMinutes, note };
    }
    return { kind: 0, equation: null, minutes: NEVER, note: `${m.name} is below hydrogen: no gas` };
  }
  // A salt solution.
  const n = METALACID_METALS[liquid.metal ?? "copper"];
  if (Number.isFinite(m.waterMinutes)) return water(`${m.name} reacts with the water itself first`);
  if (n === m) return { kind: 0, equation: null, minutes: NEVER, note: "The same metal: nothing to swap" };
  if (m.rank < n.rank) {
    return {
      kind: 1,
      equation: metalAcidDisplacementEquation(m, n, liquid.anion ?? "sulphate"),
      minutes: m.displaceMinutes,
      note: `${m.name} is above ${lower(n.name)}, so it pushes ${lower(n.name)} out`,
    };
  }
  return { kind: 0, equation: null, minutes: NEVER, note: `${m.name} is below ${lower(n.name)}: no change` };
}

// ── Oxidation and reduction ──────────────────────────────────────────────────

export type MetalAcidRedoxId = "copper-oxide" | "zinc-oxide" | "thermit" | "manganese-dioxide" | "hydrogen-sulphide";

/** Every substance the redox bench names, so outputs can carry an index. */
export const METALACID_REDOX_SPECIES = ["CuO", "H₂", "ZnO", "C", "Fe₂O₃", "Al", "MnO₂", "HCl", "H₂S", "Cl₂"] as const;

export interface MetalAcidRedox {
  label: string;
  equation: MetalAcidEquation;
  /** Reactant index (0-based) that is oxidised and the product it becomes; likewise for the one reduced. */
  oxidised: { reactant: number; product: number; how: "gains oxygen" | "loses hydrogen" };
  reduced: { reactant: number; product: number; how: "loses oxygen" | "gains hydrogen" };
  /** Colours of the solid before and after, for the drawing. */
  before: string;
  after: string;
}

export const METALACID_REDOX_ORDER: readonly MetalAcidRedoxId[] = ["copper-oxide", "zinc-oxide", "thermit", "manganese-dioxide", "hydrogen-sulphide"];

export const METALACID_REDOX: Record<MetalAcidRedoxId, MetalAcidRedox> = {
  "copper-oxide": {
    label: "Hydrogen over hot copper oxide",
    equation: { reactants: [term(1, "CuO"), term(1, "H₂")], products: [term(1, "Cu"), term(1, "H₂O")] },
    oxidised: { reactant: 1, product: 1, how: "gains oxygen" },
    reduced: { reactant: 0, product: 0, how: "loses oxygen" },
    before: "#1f2937",
    after: "#b45309",
  },
  "zinc-oxide": {
    label: "Zinc oxide heated with carbon",
    equation: { reactants: [term(1, "ZnO"), term(1, "C")], products: [term(1, "Zn"), term(1, "CO")] },
    oxidised: { reactant: 1, product: 1, how: "gains oxygen" },
    reduced: { reactant: 0, product: 0, how: "loses oxygen" },
    before: "#f1f5f9",
    after: "#94a3b8",
  },
  thermit: {
    label: "Iron oxide with aluminium (thermit)",
    equation: { reactants: [term(1, "Fe₂O₃"), term(2, "Al")], products: [term(2, "Fe"), term(1, "Al₂O₃")] },
    oxidised: { reactant: 1, product: 1, how: "gains oxygen" },
    reduced: { reactant: 0, product: 0, how: "loses oxygen" },
    before: "#9a3412",
    after: "#64748b",
  },
  "manganese-dioxide": {
    label: "Manganese dioxide with hydrochloric acid",
    equation: { reactants: [term(1, "MnO₂"), term(4, "HCl")], products: [term(1, "MnCl₂"), term(2, "H₂O"), term(1, "Cl₂")] },
    oxidised: { reactant: 1, product: 2, how: "loses hydrogen" },
    reduced: { reactant: 0, product: 0, how: "loses oxygen" },
    before: "#1f2937",
    after: "#fce7f3",
  },
  "hydrogen-sulphide": {
    label: "Hydrogen sulphide with chlorine",
    equation: { reactants: [term(1, "H₂S"), term(1, "Cl₂")], products: [term(2, "HCl"), term(1, "S")] },
    oxidised: { reactant: 0, product: 1, how: "loses hydrogen" },
    reduced: { reactant: 1, product: 0, how: "gains hydrogen" },
    before: "#e2e8f0",
    after: "#facc15",
  },
};

const speciesIndex = (formula: string) => Math.max(0, (METALACID_REDOX_SPECIES as readonly string[]).indexOf(formula));

// ── Acids with metals, carbonates, a metal oxide and a base ─────────────────

export type MetalAcidCompoundId = "zinc" | "marble" | "washing-soda" | "baking-soda" | "copper-oxide" | "caustic-soda";

export interface MetalAcidCompound {
  name: string;
  formula: string;
  equation: MetalAcidEquation;
  /** Hydrochloric acid used per formula unit. */
  acidPerUnit: number;
  /** 0 none, 1 hydrogen, 2 carbon dioxide. */
  gas: 0 | 1 | 2;
  minutes: number;
  /** The salt solution left is blue-green (copper chloride). */
  blue: boolean;
}

export const METALACID_COMPOUND_ORDER: readonly MetalAcidCompoundId[] = ["zinc", "marble", "washing-soda", "baking-soda", "copper-oxide", "caustic-soda"];

export const METALACID_COMPOUNDS: Record<MetalAcidCompoundId, MetalAcidCompound> = {
  zinc: { name: "Zinc granules", formula: "Zn", equation: { reactants: [term(1, "Zn"), term(2, "HCl")], products: [term(1, "ZnCl₂"), term(1, "H₂")] }, acidPerUnit: 2, gas: 1, minutes: 3, blue: false },
  marble: { name: "Marble chips", formula: "CaCO₃", equation: { reactants: [term(1, "CaCO₃"), term(2, "HCl")], products: [term(1, "CaCl₂"), term(1, "CO₂"), term(1, "H₂O")] }, acidPerUnit: 2, gas: 2, minutes: 3, blue: false },
  "washing-soda": { name: "Sodium carbonate", formula: "Na₂CO₃", equation: { reactants: [term(1, "Na₂CO₃"), term(2, "HCl")], products: [term(2, "NaCl"), term(1, "CO₂"), term(1, "H₂O")] }, acidPerUnit: 2, gas: 2, minutes: 0.5, blue: false },
  "baking-soda": { name: "Baking soda", formula: "NaHCO₃", equation: { reactants: [term(1, "NaHCO₃"), term(1, "HCl")], products: [term(1, "NaCl"), term(1, "CO₂"), term(1, "H₂O")] }, acidPerUnit: 1, gas: 2, minutes: 0.3, blue: false },
  "copper-oxide": { name: "Copper oxide", formula: "CuO", equation: { reactants: [term(1, "CuO"), term(2, "HCl")], products: [term(1, "CuCl₂"), term(1, "H₂O")] }, acidPerUnit: 2, gas: 0, minutes: 4, blue: true },
  "caustic-soda": { name: "Sodium hydroxide", formula: "NaOH", equation: { reactants: [term(1, "NaOH"), term(1, "HCl")], products: [term(1, "NaCl"), term(1, "H₂O")] }, acidPerUnit: 1, gas: 0, minutes: 0.05, blue: false },
};

/** The acid bench: 100 mL of 0.1 mol/L hydrochloric acid, and 4 mmol of solid. */
export const METALACID_ACID_MMOL = 10;
export const METALACID_ACID_ML = 100;
export const METALACID_SOLID_MMOL = 4;

// ── The pH scale ─────────────────────────────────────────────────────────────

export type MetalAcidSubstanceId =
  | "hydrochloric" | "stomach" | "lemon" | "vinegar" | "orange" | "rain" | "milk" | "water" | "salt-water"
  | "blood" | "baking-soda" | "magnesia" | "washing-soda" | "limewater" | "caustic-soda";

export const METALACID_SUBSTANCE_ORDER: readonly MetalAcidSubstanceId[] = [
  "hydrochloric", "stomach", "lemon", "vinegar", "orange", "rain", "milk", "water", "salt-water",
  "blood", "baking-soda", "magnesia", "washing-soda", "limewater", "caustic-soda",
];

/** Typical pH values. Salt and soda solutions are about 0.1 mol/L; milk of magnesia and limewater are saturated. Stomach acid (1.2), lemon (2.2), blood (7.4) and milk of magnesia (10) are NCERT class 10 values; NCERT rounds fresh milk to 6, the measured value is about 6.5. */
export const METALACID_SUBSTANCES: Record<MetalAcidSubstanceId, { name: string; pH: number }> = {
  hydrochloric: { name: "Hydrochloric acid (1 M)", pH: 0 },
  stomach: { name: "Stomach acid", pH: 1.2 },
  lemon: { name: "Lemon juice", pH: 2.2 },
  vinegar: { name: "Vinegar", pH: 2.9 },
  orange: { name: "Orange juice", pH: 3.5 },
  rain: { name: "Clean rain water", pH: 5.6 },
  milk: { name: "Fresh milk", pH: 6.5 },
  water: { name: "Pure water", pH: 7 },
  "salt-water": { name: "Common salt solution", pH: 7 },
  blood: { name: "Blood", pH: 7.4 },
  "baking-soda": { name: "Baking soda solution", pH: 8.3 },
  magnesia: { name: "Milk of magnesia", pH: 10 },
  "washing-soda": { name: "Washing soda solution", pH: 11.6 },
  limewater: { name: "Limewater", pH: 12.4 },
  "caustic-soda": { name: "Sodium hydroxide (1 M)", pH: 14 },
};

/** 0 red, 1 purple, 2 blue. */
export const metalAcidLitmus = (pH: number) => (pH < 5 ? 0 : pH > 8 ? 2 : 1);
/** 0 colourless, 1 pink. */
export const metalAcidPhenolphthalein = (pH: number) => (pH > 8.2 ? 1 : 0);
/** 0 red, 1 orange, 2 yellow. */
export const metalAcidMethylOrange = (pH: number) => (pH < 3.1 ? 0 : pH > 4.4 ? 2 : 1);
/** 0 yellow, 1 reddish-brown. */
export const metalAcidTurmeric = (pH: number) => (pH >= 8 ? 1 : 0);
/** 0 acidic, 1 neutral, 2 basic. */
export const metalAcidNature = (pH: number) => (pH < 6.95 ? 0 : pH > 7.05 ? 2 : 1);

// ── Salts ────────────────────────────────────────────────────────────────────

export type MetalAcidSaltId = "common-salt" | "baking-soda" | "washing-soda" | "bleaching-powder" | "plaster" | "gypsum" | "blue-vitriol" | "ammonium-chloride";

export interface MetalAcidSalt {
  common: string;
  formula: string;
  name: string;
  /** Molecules of water of crystallisation per formula unit. */
  water: number;
  /** Its solution in water: 0 acidic, 1 neutral, 2 basic. */
  nature: 0 | 1 | 2;
  /** A balanced equation that makes it, or that it takes part in. */
  reaction: string;
  use: string;
}

export const METALACID_SALT_ORDER: readonly MetalAcidSaltId[] = ["common-salt", "baking-soda", "washing-soda", "bleaching-powder", "plaster", "gypsum", "blue-vitriol", "ammonium-chloride"];

export const METALACID_SALTS: Record<MetalAcidSaltId, MetalAcidSalt> = {
  "common-salt": { common: "Common salt", formula: "NaCl", name: "Sodium chloride", water: 0, nature: 1, reaction: "NaOH + HCl → NaCl + H₂O", use: "Food, and the raw material for caustic soda, baking soda and bleaching powder." },
  "baking-soda": { common: "Baking soda", formula: "NaHCO₃", name: "Sodium hydrogencarbonate", water: 0, nature: 2, reaction: "NaCl + H₂O + CO₂ + NH₃ → NH₄Cl + NaHCO₃", use: "Baking powder, antacids for acidity, and soda-acid fire extinguishers." },
  "washing-soda": { common: "Washing soda", formula: "Na₂CO₃·10H₂O", name: "Sodium carbonate decahydrate", water: 10, nature: 2, reaction: "Na₂CO₃ + 10H₂O → Na₂CO₃·10H₂O", use: "Cleaning, and removing the hardness of water." },
  "bleaching-powder": { common: "Bleaching powder", formula: "CaOCl₂", name: "Calcium oxychloride", water: 0, nature: 2, reaction: "Ca(OH)₂ + Cl₂ → CaOCl₂ + H₂O", use: "Making drinking water germ-free, and bleaching cotton." },
  plaster: { common: "Plaster of Paris", formula: "CaSO₄·½H₂O", name: "Calcium sulphate hemihydrate", water: 0.5, nature: 1, reaction: "CaSO₄·2H₂O → CaSO₄·½H₂O + 1½H₂O (at 373 K)", use: "Plaster for broken bones, toys and decorations." },
  gypsum: { common: "Gypsum", formula: "CaSO₄·2H₂O", name: "Calcium sulphate dihydrate", water: 2, nature: 1, reaction: "CaSO₄·½H₂O + 1½H₂O → CaSO₄·2H₂O", use: "What plaster of Paris turns into when it sets hard." },
  "blue-vitriol": { common: "Blue vitriol", formula: "CuSO₄·5H₂O", name: "Copper sulphate pentahydrate", water: 5, nature: 0, reaction: "CuSO₄·5H₂O → CuSO₄ + 5H₂O (heated)", use: "Its water makes it blue; heated dry, it turns white." },
  "ammonium-chloride": { common: "Sal ammoniac", formula: "NH₄Cl", name: "Ammonium chloride", water: 0, nature: 0, reaction: "NH₃ + HCl → NH₄Cl", use: "Inside dry cells, and in soldering." },
};

// ── The model ────────────────────────────────────────────────────────────────

export type MetalAcidParams = {
  element: MetalAcidElementId;
  metal: MetalAcidMetalId;
  liquid: MetalAcidLiquidId;
  redox: MetalAcidRedoxId;
  compound: MetalAcidCompoundId;
  substance: MetalAcidSubstanceId;
  salt: MetalAcidSaltId;
};

export interface MetalAcidState {
  /** Minutes since the strip, solid or gas went in. */
  readonly time: number;
  /** Days in moist air. */
  readonly days: number;
}

export type MetalAcidResults = {
  element: number;
  isMetal: number;
  lustre: number;
  malleable: number;
  ductile: number;
  conducts: number;
  sonorous: number;
  physicalState: number;
  cutWithKnife: number;
  oxideNature: number;

  metal: number;
  /** 13 for potassium down to 1 for gold (hydrogen would be 5). */
  reactivity: number;
  aboveHydrogen: number;
  liquid: number;
  /** 0 nothing, 1 displacement, 2 hydrogen from acid, 3 reacts with water. */
  reaction: number;
  displaces: number;
  givesHydrogen: number;
  violent: number;
  /** How far the strip's reaction has gone, 0 to 1. */
  progress: number;
  /** Share of the strip covered by the metal pushed out. */
  coating: number;
  /** How blue (copper ions) and how pale green (iron ions) the solution is, 0 to 1. */
  blueness: number;
  greenness: number;
  /** How hard it is bubbling now, 0 to 1. */
  fizz: number;

  time: number;
  days: number;
  /** Share of the surface corroded, 0 to 1. */
  corrosion: number;
  coatingColour: number;
  layerStays: number;

  redox: number;
  oxidised: number;
  reduced: number;
  oxidisingAgent: number;
  reducingAgent: number;
  /** 0 by gaining oxygen, 1 by losing hydrogen. */
  oxidisedBy: number;
  /** 0 by losing oxygen, 1 by gaining hydrogen. */
  reducedBy: number;
  redoxProgress: number;

  compound: number;
  /** 0 none, 1 hydrogen, 2 carbon dioxide. */
  acidGas: number;
  acidProgress: number;
  /** Hydrochloric acid left, mmol, and the pH it gives. */
  acidLeft: number;
  beakerPH: number;
  /** 0 nothing yet, 1 a lit splint pops, 2 limewater turns milky. */
  gasTest: number;
  bubbling: number;

  substance: number;
  pH: number;
  nature: number;
  litmus: number;
  phenolphthalein: number;
  methylOrange: number;
  turmeric: number;

  salt: number;
  water: number;
  saltNature: number;
};

const OUTPUTS = [
  "element", "isMetal", "lustre", "malleable", "ductile", "conducts", "sonorous", "physicalState", "cutWithKnife", "oxideNature",
  "metal", "reactivity", "aboveHydrogen", "liquid", "reaction", "displaces", "givesHydrogen", "violent", "progress", "coating", "blueness", "greenness", "fizz",
  "time", "days", "corrosion", "coatingColour", "layerStays",
  "redox", "oxidised", "reduced", "oxidisingAgent", "reducingAgent", "oxidisedBy", "reducedBy", "redoxProgress",
  "compound", "acidGas", "acidProgress", "acidLeft", "beakerPH", "gasTest", "bubbling",
  "substance", "pH", "nature", "litmus", "phenolphthalein", "methylOrange", "turmeric",
  "salt", "water", "saltNature",
] as const satisfies readonly (keyof MetalAcidResults)[];

export const METALACID_TIME_MAX = 30;
export const METALACID_DAYS_MAX = 100;
/** The redox bench's time constant, min. */
export const METALACID_REDOX_MINUTES = 2;
/** A gas test works once this share of the solid has reacted. */
export const METALACID_GAS_TEST_AT = 0.05;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
/** 1 − e^(−t/τ), and 0 when nothing happens. */
const done = (t: number, tau: number) => (Number.isFinite(tau) && tau > 0 ? 1 - Math.exp(-t / tau) : 0);
const left = (t: number, tau: number) => (Number.isFinite(tau) && tau > 0 ? Math.exp(-t / tau) : 0);
const indexIn = <T>(order: readonly T[], id: T) => Math.max(0, order.indexOf(id));
const tidy = (v: number) => v || 0;

export const metalAcidModel: SimulationModel<MetalAcidState, MetalAcidParams, MetalAcidResults> = {
  id: "metalacid",
  defaultParams: {
    element: "iron",
    metal: "iron",
    liquid: "cuso4",
    redox: "copper-oxide",
    compound: "marble",
    substance: "lemon",
    salt: "baking-soda",
  },
  outputs: OUTPUTS,
  stateVariables: ["time", "days"],

  initialize() {
    return { time: 0, days: 0 };
  },

  /** Play runs the clock: a minute of reaction and two days of weather each second. */
  advance(state, dt) {
    return { time: clamp(state.time + dt, 0, METALACID_TIME_MAX), days: clamp(state.days + 2 * dt, 0, METALACID_DAYS_MAX) };
  },

  step(state, _params, sign) {
    return {
      time: clamp(Math.round(state.time * 2) / 2 + 0.5 * sign, 0, METALACID_TIME_MAX),
      days: clamp(Math.round(state.days) + sign, 0, METALACID_DAYS_MAX),
    };
  },

  derive(state, params) {
    const time = clamp(state.time, 0, METALACID_TIME_MAX);
    const days = clamp(state.days, 0, METALACID_DAYS_MAX);

    const elementId = METALACID_ELEMENTS[params.element] ? params.element : "iron";
    const e = METALACID_ELEMENTS[elementId];

    const metalId = METALACID_METALS[params.metal] ? params.metal : "iron";
    const m = METALACID_METALS[metalId];
    const liquidId = METALACID_LIQUIDS[params.liquid] ? params.liquid : "cuso4";
    const liquid = METALACID_LIQUIDS[liquidId];
    const beaker = metalAcidInLiquid(metalId, liquidId);
    const progress = done(time, beaker.minutes);
    const displaces = beaker.kind === 1 ? 1 : 0;
    let blueness = liquidId === "cuso4" ? 1 : 0;
    let greenness = liquidId === "feso4" ? 1 : 0;
    if (displaces) {
      // Ions of the metal pushed out are replaced by ions of the strip's metal.
      if (liquid.metal === "copper") blueness = 1 - progress;
      if (liquid.metal === "iron") greenness = 1 - progress;
      if (metalId === "copper") blueness = progress;
      if (metalId === "iron") greenness = progress;
    }
    if (beaker.kind === 2 && metalId === "iron") greenness = progress;

    const redoxId = METALACID_REDOX[params.redox] ? params.redox : "copper-oxide";
    const r = METALACID_REDOX[redoxId];
    const oxidised = speciesIndex(r.equation.reactants[r.oxidised.reactant]!.formula);
    const reduced = speciesIndex(r.equation.reactants[r.reduced.reactant]!.formula);

    const compoundId = METALACID_COMPOUNDS[params.compound] ? params.compound : "marble";
    const c = METALACID_COMPOUNDS[compoundId];
    const acidProgress = done(time, c.minutes);
    const acidLeft = METALACID_ACID_MMOL - METALACID_SOLID_MMOL * c.acidPerUnit * acidProgress;
    const molar = Math.max(1e-6, acidLeft / METALACID_ACID_ML);

    const substanceId = METALACID_SUBSTANCES[params.substance] ? params.substance : "lemon";
    const pH = METALACID_SUBSTANCES[substanceId].pH;

    const saltId = METALACID_SALTS[params.salt] ? params.salt : "baking-soda";
    const s = METALACID_SALTS[saltId];

    return {
      element: indexIn(METALACID_ELEMENT_ORDER, elementId),
      isMetal: e.metal,
      lustre: e.lustre,
      malleable: e.malleable,
      ductile: e.ductile,
      conducts: e.conducts,
      sonorous: e.sonorous,
      physicalState: e.state,
      cutWithKnife: e.knife,
      oxideNature: e.oxide,

      metal: indexIn(METALACID_METAL_ORDER, metalId),
      reactivity: METALACID_SERIES.length - m.rank,
      aboveHydrogen: m.rank < METALACID_HYDROGEN_RANK ? 1 : 0,
      liquid: indexIn(METALACID_LIQUID_ORDER, liquidId),
      reaction: beaker.kind,
      displaces,
      givesHydrogen: beaker.kind === 2 || beaker.kind === 3 ? 1 : 0,
      violent: beaker.kind !== 0 && beaker.kind !== 1 ? m.violent : 0,
      progress: tidy(progress),
      coating: tidy(displaces * progress),
      blueness: tidy(blueness),
      greenness: tidy(greenness),
      fizz: beaker.kind === 2 || beaker.kind === 3 ? tidy(left(time, beaker.minutes)) : 0,

      time,
      days,
      corrosion: tidy(done(days, m.corrosionDays)),
      coatingColour: m.coating,
      layerStays: m.layerStays,

      redox: indexIn(METALACID_REDOX_ORDER, redoxId),
      oxidised,
      reduced,
      oxidisingAgent: reduced,
      reducingAgent: oxidised,
      oxidisedBy: r.oxidised.how === "gains oxygen" ? 0 : 1,
      reducedBy: r.reduced.how === "loses oxygen" ? 0 : 1,
      redoxProgress: tidy(done(time, METALACID_REDOX_MINUTES)),

      compound: indexIn(METALACID_COMPOUND_ORDER, compoundId),
      acidGas: c.gas,
      acidProgress: tidy(acidProgress),
      acidLeft: tidy(acidLeft),
      beakerPH: tidy(-Math.log10(molar)),
      gasTest: c.gas !== 0 && acidProgress >= METALACID_GAS_TEST_AT ? c.gas : 0,
      bubbling: c.gas !== 0 ? tidy(left(time, c.minutes)) : 0,

      substance: indexIn(METALACID_SUBSTANCE_ORDER, substanceId),
      pH,
      nature: metalAcidNature(pH),
      litmus: metalAcidLitmus(pH),
      phenolphthalein: metalAcidPhenolphthalein(pH),
      methylOrange: metalAcidMethylOrange(pH),
      turmeric: metalAcidTurmeric(pH),

      salt: indexIn(METALACID_SALT_ORDER, saltId),
      water: s.water,
      saltNature: s.nature,
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof MetalAcidState] : undefined;
  },

  setVariable(state, id, value) {
    switch (id) {
      case "time": return { ...state, time: clamp(value, 0, METALACID_TIME_MAX) };
      case "days": return { ...state, days: clamp(value, 0, METALACID_DAYS_MAX) };
      default: return state;
    }
  },
};
