import type { SimulationModel } from "@ise/science-engine";

/**
 * Sparingly soluble salts.
 *
 * A salt MₓXᵧ in contact with its saturated solution is at equilibrium,
 * MₓXᵧ(s) ⇌ xM + yX, and the solid does not appear in the constant:
 *
 *   Ksp = [M]ˣ[X]ʸ                       the solubility product
 *   S   = (Ksp / xˣyʸ)^(1/(x+y))          the solubility in pure water
 *
 * Add an ion the salt already has — chloride to silver chloride — and the
 * equilibrium shifts back: less dissolves (the common-ion effect). Here the
 * solubility with a common anion at concentration c is the exact root of
 * (xS)ˣ(c + yS)ʸ = Ksp, not the c ≫ S shortcut.
 *
 * Mix two solutions and the ionic product Q = [M]ˣ[X]ʸ says what happens:
 * Q < Ksp stays clear, Q > Ksp precipitates until Q falls to Ksp.
 *
 * Ksp values are NCERT's at 298 K. Concentrations stand in for activities,
 * and complex ions (AgCl₂⁻ in strong chloride) are ignored.
 */

export interface SparinglySolubleSalt {
  formula: string;
  name: string;
  cation: string;
  anion: string;
  /** Cations and anions in one formula unit. */
  x: number;
  y: number;
  ksp: number;
  /** Molar mass, g/mol. */
  M: number;
  /** A soluble salt that supplies the common anion. */
  source: string;
}

export type SparinglySolubleId = "agcl" | "agbr" | "agi" | "baso4" | "caco3" | "caf2" | "pbi2" | "mgoh2" | "ag2cro4" | "feoh3";
export const SPARINGLY_SOLUBLE_ORDER: readonly SparinglySolubleId[] = ["agcl", "agbr", "agi", "baso4", "caco3", "caf2", "pbi2", "mgoh2", "ag2cro4", "feoh3"];

export const SPARINGLY_SOLUBLE: Record<SparinglySolubleId, SparinglySolubleSalt> = {
  agcl: { formula: "AgCl", name: "Silver chloride", cation: "Ag⁺", anion: "Cl⁻", x: 1, y: 1, ksp: 1.8e-10, M: 143.3, source: "NaCl" },
  agbr: { formula: "AgBr", name: "Silver bromide", cation: "Ag⁺", anion: "Br⁻", x: 1, y: 1, ksp: 5.0e-13, M: 187.8, source: "NaBr" },
  agi: { formula: "AgI", name: "Silver iodide", cation: "Ag⁺", anion: "I⁻", x: 1, y: 1, ksp: 8.3e-17, M: 234.8, source: "KI" },
  baso4: { formula: "BaSO₄", name: "Barium sulfate", cation: "Ba²⁺", anion: "SO₄²⁻", x: 1, y: 1, ksp: 1.1e-10, M: 233.4, source: "Na₂SO₄" },
  caco3: { formula: "CaCO₃", name: "Calcium carbonate", cation: "Ca²⁺", anion: "CO₃²⁻", x: 1, y: 1, ksp: 3.3e-9, M: 100.1, source: "Na₂CO₃" },
  caf2: { formula: "CaF₂", name: "Calcium fluoride", cation: "Ca²⁺", anion: "F⁻", x: 1, y: 2, ksp: 5.3e-9, M: 78.1, source: "NaF" },
  pbi2: { formula: "PbI₂", name: "Lead iodide", cation: "Pb²⁺", anion: "I⁻", x: 1, y: 2, ksp: 7.1e-9, M: 461.0, source: "KI" },
  mgoh2: { formula: "Mg(OH)₂", name: "Magnesium hydroxide", cation: "Mg²⁺", anion: "OH⁻", x: 1, y: 2, ksp: 1.8e-11, M: 58.3, source: "NaOH" },
  ag2cro4: { formula: "Ag₂CrO₄", name: "Silver chromate", cation: "Ag⁺", anion: "CrO₄²⁻", x: 2, y: 1, ksp: 1.1e-12, M: 331.7, source: "K₂CrO₄" },
  feoh3: { formula: "Fe(OH)₃", name: "Iron(III) hydroxide", cation: "Fe³⁺", anion: "OH⁻", x: 1, y: 3, ksp: 1.0e-38, M: 106.9, source: "NaOH" },
};

/** Solubility in pure water, mol/L. */
export function molarSolubility(salt: SparinglySolubleSalt): number {
  return (salt.ksp / (salt.x ** salt.x * salt.y ** salt.y)) ** (1 / (salt.x + salt.y));
}

/** Solubility (mol/L) when the solution already holds the common anion at `common` mol/L: the exact root. */
export function solubilityWithCommonIon(salt: SparinglySolubleSalt, common: number): number {
  const c = Math.max(0, common);
  const pure = molarSolubility(salt);
  if (c === 0) return pure;
  const product = (s: number) => (salt.x * s) ** salt.x * (c + salt.y * s) ** salt.y;
  // The product rises with S, and S in water is already too much: bisect on log S.
  let lo = Math.log(1e-60);
  let hi = Math.log(pure);
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (product(Math.exp(mid)) > salt.ksp) hi = mid;
    else lo = mid;
  }
  return Math.exp((lo + hi) / 2);
}

/** log₁₀ of the ionic product for mixed concentrations 10^(−pCation) and 10^(−pAnion). */
export function logIonicProduct(salt: SparinglySolubleSalt, pCation: number, pAnion: number): number {
  return -(salt.x * pCation + salt.y * pAnion);
}

export type KspParams = { salt: SparinglySolubleId };

export interface KspState {
  /** Common anion already in the water, mol/L. */
  readonly common: number;
  /** −log₁₀ of the cation and anion concentrations after mixing. */
  readonly pCation: number;
  readonly pAnion: number;
}

export type KspResults = {
  salt: number;
  cations: number;
  anions: number;
  /** Ions from one formula unit: 2 for AB, 3 for AB₂ or A₂B, 4 for AB₃. */
  ions: number;
  ksp: number;
  pKsp: number;
  /** Solubility in pure water: mol/L, its log, µmol/L and mg/L. */
  solubility: number;
  logSolubility: number;
  microSolubility: number;
  mgPerLitre: number;
  common: number;
  /** Solubility with the common ion present: mol/L, its log and nmol/L. */
  dissolved: number;
  logDissolved: number;
  nanoDissolved: number;
  /** How many times less soluble than in pure water. */
  suppression: number;
  cationConc: number;
  anionConc: number;
  pCation: number;
  pAnion: number;
  logQ: number;
  /** log₁₀(Q/Ksp), and its sign: −1 unsaturated, 0 saturated, 1 supersaturated. */
  logQOverK: number;
  saturation: number;
  precipitates: number;
};

const OUTPUTS = [
  "salt", "cations", "anions", "ions", "ksp", "pKsp", "solubility", "logSolubility", "microSolubility", "mgPerLitre",
  "common", "dissolved", "logDissolved", "nanoDissolved", "suppression", "cationConc", "anionConc",
  "pCation", "pAnion", "logQ", "logQOverK", "saturation", "precipitates",
] as const satisfies readonly (keyof KspResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Q within this many log units of Ksp counts as saturated. */
const SATURATED = 0.02;

export const kspModel: SimulationModel<KspState, KspParams, KspResults> = {
  id: "ksp",
  defaultParams: { salt: "agcl" },
  outputs: OUTPUTS,
  stateVariables: ["common", "pCation", "pAnion"],

  initialize() {
    return { common: 0, pCation: 6, pAnion: 6 };
  },

  /** Play stirs in the common ion. */
  advance(state, dt) {
    return { ...state, common: Math.min(0.1, state.common + 0.01 * dt) };
  },

  step(state, _params, sign) {
    return { ...state, common: clamp(Math.round(state.common * 100) / 100 + 0.01 * sign, 0, 0.1) };
  },

  derive(state, params) {
    const salt = SPARINGLY_SOLUBLE[params.salt] ?? SPARINGLY_SOLUBLE.agcl;
    const common = clamp(state.common, 0, 0.1);
    const pCation = clamp(state.pCation, 1, 12);
    const pAnion = clamp(state.pAnion, 1, 12);
    const solubility = molarSolubility(salt);
    const dissolved = solubilityWithCommonIon(salt, common);
    const logQ = logIonicProduct(salt, pCation, pAnion);
    const logQOverK = logQ - Math.log10(salt.ksp);
    return {
      salt: Math.max(0, SPARINGLY_SOLUBLE_ORDER.indexOf(params.salt)),
      cations: salt.x,
      anions: salt.y,
      ions: salt.x + salt.y,
      ksp: salt.ksp,
      pKsp: -Math.log10(salt.ksp),
      solubility,
      logSolubility: Math.log10(solubility),
      microSolubility: solubility * 1e6,
      mgPerLitre: solubility * salt.M * 1000,
      common,
      dissolved,
      logDissolved: Math.log10(dissolved),
      nanoDissolved: dissolved * 1e9,
      suppression: solubility / dissolved,
      cationConc: salt.x * dissolved,
      anionConc: common + salt.y * dissolved,
      pCation,
      pAnion,
      logQ,
      logQOverK,
      saturation: Math.abs(logQOverK) < SATURATED ? 0 : Math.sign(logQOverK),
      precipitates: logQOverK >= SATURATED ? 1 : 0,
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof KspState] : undefined;
  },

  setVariable(state, id, value) {
    switch (id) {
      case "common": return { ...state, common: clamp(value, 0, 0.1) };
      case "pCation": return { ...state, pCation: clamp(value, 1, 12) };
      case "pAnion": return { ...state, pAnion: clamp(value, 1, 12) };
      default: return state;
    }
  },
};
