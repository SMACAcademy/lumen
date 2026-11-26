import type { SimulationModel } from "@ise/science-engine";

/**
 * Enthalpy changes and Hess's law.
 *
 * Every substance has a standard enthalpy of formation, the enthalpy change
 * of making it from its elements (elements themselves: zero). So a
 * reaction's enthalpy change is ΣΔfH(products) − ΣΔfH(reactants): going
 * down from the reactants to the elements and back up to the products gives
 * the same ΔH as going straight across — Hess's law, since enthalpy is a
 * state function. For gases, average bond enthalpies give an estimate:
 * the energy to break the reactants' bonds less the energy released forming
 * the products'. ΔH is extensive: twice the reaction, twice the heat.
 */

export interface EnthalpySpecies {
  formula: string;
  /** Standard enthalpy of formation, kJ mol⁻¹ (NCERT). */
  dfH: number;
  /** Bonds in one molecule, for gases with average bond enthalpies; null otherwise. */
  bonds: Readonly<Record<string, number>> | null;
}

/** Average bond enthalpies, kJ mol⁻¹. */
export const BOND_ENTHALPY: Readonly<Record<string, number>> = {
  "H–H": 435.8,
  "Cl–Cl": 242.4,
  "H–Cl": 431,
  "C–H": 414,
  "O=O": 498,
  "C=O": 803,
  "O–H": 463,
  "N≡N": 946,
  "N–H": 389,
  "C=C": 614,
  "C–C": 347,
  "N=O": 632,
};

const sp = (formula: string, dfH: number, bonds: Record<string, number> | null = null): EnthalpySpecies => ({ formula, dfH, bonds });

const H2 = sp("H₂(g)", 0, { "H–H": 1 });
const Cl2 = sp("Cl₂(g)", 0, { "Cl–Cl": 1 });
const HCl = sp("HCl(g)", -92.3, { "H–Cl": 1 });
const CH4 = sp("CH₄(g)", -74.8, { "C–H": 4 });
const O2 = sp("O₂(g)", 0, { "O=O": 1 });
const CO2 = sp("CO₂(g)", -393.5, { "C=O": 2 });
const H2Ol = sp("H₂O(l)", -285.8);
const H2Og = sp("H₂O(g)", -241.8, { "O–H": 2 });
const N2 = sp("N₂(g)", 0, { "N≡N": 1 });
const NH3 = sp("NH₃(g)", -46.1, { "N–H": 3 });
const C = sp("C(graphite)", 0);
const CO = sp("CO(g)", -110.5);
const CaCO3 = sp("CaCO₃(s)", -1206.9);
const CaO = sp("CaO(s)", -635.1);
const C2H4 = sp("C₂H₄(g)", 52.3, { "C=C": 1, "C–H": 4 });
const C2H6 = sp("C₂H₆(g)", -84.7, { "C–C": 1, "C–H": 6 });
const NO = sp("NO(g)", 90.2, { "N=O": 1 });

export interface EnthalpyReaction {
  label: string;
  reactants: readonly [number, EnthalpySpecies][];
  products: readonly [number, EnthalpySpecies][];
}

export type EnthalpyReactionId =
  | "hcl"
  | "methane-liquid"
  | "methane-gas"
  | "ammonia"
  | "carbon-monoxide"
  | "limestone"
  | "water"
  | "ethene"
  | "nitric-oxide";

export const ENTHALPY_ORDER: readonly EnthalpyReactionId[] = ["hcl", "methane-liquid", "methane-gas", "ammonia", "carbon-monoxide", "limestone", "water", "ethene", "nitric-oxide"];

export const ENTHALPY_REACTIONS: Record<EnthalpyReactionId, EnthalpyReaction> = {
  hcl: { label: "Hydrogen and chlorine", reactants: [[1, H2], [1, Cl2]], products: [[2, HCl]] },
  "methane-liquid": { label: "Methane burns (liquid water)", reactants: [[1, CH4], [2, O2]], products: [[1, CO2], [2, H2Ol]] },
  "methane-gas": { label: "Methane burns (steam)", reactants: [[1, CH4], [2, O2]], products: [[1, CO2], [2, H2Og]] },
  ammonia: { label: "Making ammonia", reactants: [[1, N2], [3, H2]], products: [[2, NH3]] },
  "carbon-monoxide": { label: "Carbon to carbon monoxide", reactants: [[1, C], [0.5, O2]], products: [[1, CO]] },
  limestone: { label: "Heating limestone", reactants: [[1, CaCO3]], products: [[1, CaO], [1, CO2]] },
  water: { label: "Hydrogen burns", reactants: [[1, H2], [0.5, O2]], products: [[1, H2Ol]] },
  ethene: { label: "Hydrogenating ethene", reactants: [[1, C2H4], [1, H2]], products: [[1, C2H6]] },
  "nitric-oxide": { label: "Nitrogen and oxygen", reactants: [[1, N2], [1, O2]], products: [[2, NO]] },
};

const sumH = (side: readonly [number, EnthalpySpecies][]) => side.reduce((s, [k, x]) => s + k * x.dfH, 0);
const sumBonds = (side: readonly [number, EnthalpySpecies][]) =>
  side.reduce((s, [k, x]) => s + k * Object.entries(x.bonds ?? {}).reduce((b, [bond, count]) => b + count * BOND_ENTHALPY[bond]!, 0), 0);
const round1 = (v: number) => Math.round(v * 10) / 10 || 0;

/** ΔrH from enthalpies of formation, kJ per mole of reaction as written. */
export function reactionEnthalpy(r: EnthalpyReaction): number {
  return round1(sumH(r.products) - sumH(r.reactants));
}

/** The formula as written: "CH₄(g) + 2O₂(g) → CO₂(g) + 2H₂O(l)". */
export function reactionEquation(r: EnthalpyReaction): string {
  const side = (s: readonly [number, EnthalpySpecies][]) => s.map(([k, x]) => `${k === 1 ? "" : k === 0.5 ? "½" : k}${x.formula}`).join(" + ");
  return `${side(r.reactants)} → ${side(r.products)}`;
}

export type EnthalpyParams = { reaction: EnthalpyReactionId };

export interface EnthalpyState {
  /** Moles of reaction, as written. */
  readonly n: number;
  readonly clock: number;
}

export type EnthalpyResults = {
  reaction: number;
  n: number;
  deltaH: number;
  exothermic: number;
  heat: number;
  reactantsH: number;
  productsH: number;
  hasBonds: number;
  bondsBroken: number;
  bondsFormed: number;
  bondEstimate: number;
};

const clampN = (n: number) => Math.min(4, Math.max(0.5, Math.round(n * 2) / 2));

const OUTPUTS = [
  "reaction", "n", "deltaH", "exothermic", "heat", "reactantsH", "productsH", "hasBonds", "bondsBroken", "bondsFormed", "bondEstimate",
] as const satisfies readonly (keyof EnthalpyResults)[];

const MOVE_EVERY = 1.2;

export const enthalpyModel: SimulationModel<EnthalpyState, EnthalpyParams, EnthalpyResults> = {
  id: "enthalpy",
  defaultParams: { reaction: "methane-liquid" },
  outputs: OUTPUTS,
  stateVariables: ["n"],

  initialize() {
    return { n: 1, clock: 0 };
  },

  /** Play runs more and more of the reaction: half a mole at a time, up to four. */
  advance(state, dt) {
    const clock = state.clock + dt;
    if (clock < MOVE_EVERY) return { ...state, clock };
    return { n: state.n >= 4 ? 0.5 : clampN(state.n + 0.5), clock: 0 };
  },

  step(state, _params, sign) {
    return { n: clampN(state.n + 0.5 * sign), clock: 0 };
  },

  derive(state, params) {
    const r = ENTHALPY_REACTIONS[params.reaction] ?? ENTHALPY_REACTIONS["methane-liquid"];
    const n = clampN(state.n);
    const deltaH = reactionEnthalpy(r);
    const all = [...r.reactants, ...r.products];
    const hasBonds = all.every(([, x]) => x.bonds !== null);
    const broken = hasBonds ? sumBonds(r.reactants) : 0;
    const formed = hasBonds ? sumBonds(r.products) : 0;
    return {
      reaction: Math.max(0, ENTHALPY_ORDER.indexOf(params.reaction)),
      n,
      deltaH,
      exothermic: deltaH < 0 ? 1 : 0,
      heat: round1(-deltaH * n),
      reactantsH: round1(sumH(r.reactants)),
      productsH: round1(sumH(r.products)),
      hasBonds: hasBonds ? 1 : 0,
      bondsBroken: round1(broken),
      bondsFormed: round1(formed),
      bondEstimate: round1(broken - formed),
    };
  },

  getVariable(state, id) {
    return id === "n" ? state.n : undefined;
  },

  setVariable(state, id, value) {
    return id === "n" ? { n: clampN(value), clock: 0 } : state;
  },
};
