import type { SimulationModel } from "@ise/science-engine";
import { schoolSolubility } from "./schoolmatter";

/**
 * Is matter around us pure? NCERT class 9, chapter 2.
 *
 * Five small benches.
 *
 * Sort. A pure substance has one kind of particle: an element (one kind of
 * atom) or a compound (elements joined in a fixed ratio). It melts and boils
 * at fixed temperatures. A mixture has more than one kind of particle, can
 * be made in any proportion, and can be pulled apart by physical means. A
 * homogeneous mixture is the same all through (salt water, air, brass); a
 * heterogeneous one is not (soil, muddy water).
 *
 * Iron and sulphur. NCERT's activity: mix iron filings with sulphur powder,
 * or heat them to make iron sulphide, Fe + S → FeS. Iron and sulphur join
 * in the ratio of their atomic masses, 56 : 32 = 7 : 4, so any extra of
 * either is left over unchanged. A magnet pulls out only free iron; carbon
 * disulphide dissolves only free sulphur; dilute acid gives hydrogen (no
 * smell) with free iron and hydrogen sulphide (rotten eggs) with FeS.
 *
 *   iron that reacts = the smaller of (iron, sulphur × 56/32)
 *   iron sulphide    = iron that reacts × 88/56
 *
 * Strength. Mass by mass percentage = mass of solute ÷ mass of solution × 100,
 * where the solution is the solute that has dissolved plus the water. How
 * much can dissolve comes from NCERT's solubility table (the same table as
 * the Materials and Particles lab, joined by straight lines). The strongest
 * solution at a temperature is the saturated one: s ÷ (100 + s) × 100.
 *
 * Flask. Mass by volume percentage = mass of solute ÷ volume of solution
 * × 100: grams in every 100 mL. The solute is dissolved and the flask made
 * up to the mark; within these amounts all of it dissolves.
 *
 * Beam. Solutions, colloids and suspensions by particle size: smaller than
 * 1 nm, 1 to 1000 nm, bigger than 1000 nm. Colloids and suspensions scatter a
 * beam of light (the Tyndall effect); a solution does not. Filter paper
 * holds back a suspension's particles only. Settling uses Stokes' law for
 * one typical particle size: v = 2(ρ − ρ_water)·g·r² ÷ 9η, falling through
 * 5 cm of water. Dissolved particles never settle; colloid particles would
 * take years by Stokes' law alone, and the jostling of water molecules keeps
 * them spread out anyway. Particle sizes are typical values, not exact.
 *
 * Colloids. NCERT's table: the dispersed phase (solid, liquid or gas) spread
 * through the dispersion medium decides the kind — aerosol, foam, emulsion,
 * sol, gel or solid sol.
 */

// ── Sorting substances ───────────────────────────────────────────────────────

/** 0 element, 1 compound, 2 homogeneous mixture, 3 heterogeneous mixture. */
export type PureSampleKind = 0 | 1 | 2 | 3;

export interface PureSample {
  label: string;
  kind: PureSampleKind;
  /** What its particles are, in at most 55 characters. */
  parts: string;
  /** Formula, for pure substances. */
  formula?: string;
}

export type PureSampleId =
  | "gold"
  | "iron"
  | "oxygen"
  | "sulphur"
  | "water"
  | "salt"
  | "sugar"
  | "carbon-dioxide"
  | "iron-sulphide"
  | "air"
  | "salt-water"
  | "soda-water"
  | "brass"
  | "soil"
  | "muddy-water"
  | "iron-sulphur";

export const PURE_SAMPLE_ORDER: readonly PureSampleId[] = [
  "gold", "iron", "oxygen", "sulphur", "water", "salt", "sugar", "carbon-dioxide", "iron-sulphide",
  "air", "salt-water", "soda-water", "brass", "soil", "muddy-water", "iron-sulphur",
];

export const PURE_SAMPLES: Record<PureSampleId, PureSample> = {
  gold: { label: "Gold", kind: 0, parts: "Only gold atoms", formula: "Au" },
  iron: { label: "Iron", kind: 0, parts: "Only iron atoms", formula: "Fe" },
  oxygen: { label: "Oxygen", kind: 0, parts: "Only oxygen molecules, O₂", formula: "O₂" },
  sulphur: { label: "Sulphur", kind: 0, parts: "Only sulphur atoms", formula: "S" },
  water: { label: "Distilled water", kind: 1, parts: "Only water molecules: H₂O, all alike", formula: "H₂O" },
  salt: { label: "Common salt", kind: 1, parts: "Sodium and chlorine joined, 1 : 1", formula: "NaCl" },
  sugar: { label: "Sugar", kind: 1, parts: "Only sugar molecules: C, H and O joined", formula: "C₁₂H₂₂O₁₁" },
  "carbon-dioxide": { label: "Carbon dioxide", kind: 1, parts: "Only CO₂ molecules, all alike", formula: "CO₂" },
  "iron-sulphide": { label: "Iron sulphide", kind: 1, parts: "Iron and sulphur joined, 1 : 1", formula: "FeS" },
  air: { label: "Air", kind: 2, parts: "Nitrogen, oxygen, argon, CO₂, water vapour" },
  "salt-water": { label: "Salt water", kind: 2, parts: "Water with salt spread evenly through it" },
  "soda-water": { label: "Soda water", kind: 2, parts: "Water with carbon dioxide dissolved in it" },
  brass: { label: "Brass", kind: 2, parts: "Copper and zinc, mixed when molten" },
  soil: { label: "Soil", kind: 3, parts: "Sand, clay, humus, water and air" },
  "muddy-water": { label: "Muddy water", kind: 3, parts: "Water with bits of mud floating in it" },
  "iron-sulphur": { label: "Iron filings and sulphur", kind: 3, parts: "Grey iron and yellow sulphur, side by side" },
};

// ── Iron and sulphur ─────────────────────────────────────────────────────────

/** NCERT's atomic masses, u. */
export const PURE_FE = 56;
export const PURE_S = 32;
export const PURE_FES = PURE_FE + PURE_S;

export type PureFesId = "mixed" | "heated";
export const PURE_FES_ORDER: readonly PureFesId[] = ["mixed", "heated"];

export type PureFesTestId = "magnet" | "cs2" | "acid";
export const PURE_FES_TEST_ORDER: readonly PureFesTestId[] = ["magnet", "cs2", "acid"];

export interface PureFesOutcome {
  ironReacted: number;
  sulphurReacted: number;
  fesMass: number;
  ironLeft: number;
  sulphurLeft: number;
}

const tidy = (v: number) => Math.round(v * 1e9) / 1e9 || 0;

/** What is in the dish: nothing joins when only mixed; on heating, iron and sulphur join 7 : 4 by mass. */
export function pureIronSulphur(iron: number, sulphur: number, heated: boolean): PureFesOutcome {
  const ironReacted = heated ? Math.min(iron, (sulphur * PURE_FE) / PURE_S) : 0;
  const sulphurReacted = (ironReacted * PURE_S) / PURE_FE;
  return {
    ironReacted: tidy(ironReacted),
    sulphurReacted: tidy(sulphurReacted),
    fesMass: tidy((ironReacted * PURE_FES) / PURE_FE),
    ironLeft: tidy(iron - ironReacted),
    sulphurLeft: tidy(sulphur - sulphurReacted),
  };
}

// ── Strength of a solution ───────────────────────────────────────────────────

export type PureSoluteId = "salt" | "sugar" | "kno3";
export const PURE_SOLUTE_ORDER: readonly PureSoluteId[] = ["salt", "sugar", "kno3"];
export const PURE_SOLUTE_NAMES: Record<PureSoluteId, string> = { salt: "salt", sugar: "sugar", kno3: "potassium nitrate" };

/** Mass by mass percentage: solute ÷ (solute + water) × 100. */
export function pureMassPercent(solute: number, water: number): number {
  const total = solute + water;
  return total > 0 ? (solute / total) * 100 : 0;
}

/** Mass by volume percentage: grams of solute in every 100 mL of solution. */
export function pureMassByVolume(solute: number, volume: number): number {
  return volume > 0 ? (solute / volume) * 100 : 0;
}

// ── Solutions, colloids and suspensions ──────────────────────────────────────

export type PureLiquidId =
  | "salt-solution"
  | "sugar-solution"
  | "copper-sulphate"
  | "soap"
  | "starch"
  | "milk"
  | "chalk"
  | "mud"
  | "sand";

export interface PureLiquid {
  label: string;
  /** Typical particle diameter, nm. */
  size: number;
  /** Density of the particles, kg/m³ (only used for colloids and suspensions). */
  density: number;
}

export const PURE_LIQUID_ORDER: readonly PureLiquidId[] = ["salt-solution", "sugar-solution", "copper-sulphate", "soap", "starch", "milk", "chalk", "mud", "sand"];

export const PURE_LIQUIDS: Record<PureLiquidId, PureLiquid> = {
  // Ions and small molecules: a fraction of a nanometre.
  "salt-solution": { label: "Salt solution", size: 0.3, density: 2160 },
  "sugar-solution": { label: "Sugar solution", size: 0.9, density: 1590 },
  "copper-sulphate": { label: "Copper sulphate solution", size: 0.5, density: 2290 },
  // Soap clusters (micelles), starch coils and milk's protein particles.
  soap: { label: "Soap solution", size: 5, density: 1050 },
  starch: { label: "Starch solution", size: 50, density: 1500 },
  milk: { label: "Milk in water", size: 150, density: 1100 },
  // Ground solids stirred into water.
  chalk: { label: "Chalk powder in water", size: 10_000, density: 2700 },
  mud: { label: "Muddy water", size: 20_000, density: 2650 },
  sand: { label: "Fine sand in water", size: 60_000, density: 2650 },
};

/** 0 solution (< 1 nm), 1 colloid (1 to 1000 nm), 2 suspension (> 1000 nm). */
export function pureLiquidKind(sizeNm: number): 0 | 1 | 2 {
  return sizeNm < 1 ? 0 : sizeNm <= 1000 ? 1 : 2;
}

export const PURE_G = 9.8;
/** Water at 20 °C: viscosity in Pa s, density in kg/m³. */
export const PURE_WATER_VISCOSITY = 1.0e-3;
export const PURE_WATER_DENSITY = 1000;
/** Depth of liquid the particles fall through, m. */
export const PURE_DEPTH = 0.05;

/** Stokes' law settling speed, m/s, for a particle of diameter `sizeNm` and density `density`. */
export function pureSettlingSpeed(sizeNm: number, density: number): number {
  const r = (sizeNm * 1e-9) / 2;
  return Math.max(0, (2 * (density - PURE_WATER_DENSITY) * PURE_G * r * r) / (9 * PURE_WATER_VISCOSITY));
}

// ── Kinds of colloid ─────────────────────────────────────────────────────────

/** 0 solid, 1 liquid, 2 gas. */
export type PurePhase = 0 | 1 | 2;

export type PureColloidId =
  | "fog"
  | "cloud"
  | "smoke"
  | "shaving-cream"
  | "milk"
  | "face-cream"
  | "milk-of-magnesia"
  | "foam-rubber"
  | "sponge"
  | "jelly"
  | "cheese"
  | "butter"
  | "gemstone"
  | "milky-glass";

export const PURE_COLLOID_ORDER: readonly PureColloidId[] = [
  "fog", "cloud", "smoke", "shaving-cream", "milk", "face-cream", "milk-of-magnesia",
  "foam-rubber", "sponge", "jelly", "cheese", "butter", "gemstone", "milky-glass",
];

export const PURE_COLLOIDS: Record<PureColloidId, { label: string; dispersed: PurePhase; medium: PurePhase }> = {
  fog: { label: "Fog", dispersed: 1, medium: 2 },
  cloud: { label: "Cloud", dispersed: 1, medium: 2 },
  smoke: { label: "Smoke", dispersed: 0, medium: 2 },
  "shaving-cream": { label: "Shaving cream", dispersed: 2, medium: 1 },
  milk: { label: "Milk", dispersed: 1, medium: 1 },
  "face-cream": { label: "Face cream", dispersed: 1, medium: 1 },
  "milk-of-magnesia": { label: "Milk of magnesia", dispersed: 0, medium: 1 },
  "foam-rubber": { label: "Foam rubber", dispersed: 2, medium: 0 },
  sponge: { label: "Sponge", dispersed: 2, medium: 0 },
  jelly: { label: "Jelly", dispersed: 1, medium: 0 },
  cheese: { label: "Cheese", dispersed: 1, medium: 0 },
  butter: { label: "Butter", dispersed: 1, medium: 0 },
  gemstone: { label: "Coloured gemstone", dispersed: 0, medium: 0 },
  "milky-glass": { label: "Milky glass", dispersed: 0, medium: 0 },
};

/** NCERT's table: 0 aerosol, 1 foam, 2 emulsion, 3 sol, 4 gel, 5 solid sol. */
export function pureColloidType(dispersed: PurePhase, medium: PurePhase): number {
  if (medium === 2) return 0; // liquid or solid in a gas
  if (dispersed === 2) return 1; // gas in a liquid or a solid
  if (medium === 1) return dispersed === 1 ? 2 : 3;
  return dispersed === 1 ? 4 : 5;
}

// ── The model ────────────────────────────────────────────────────────────────

export type PureMixedParams = {
  sample: PureSampleId;
  fes: PureFesId;
  fesTest: PureFesTestId;
  solute: PureSoluteId;
  liquid: PureLiquidId;
  colloid: PureColloidId;
};

export interface PureMixedState {
  /** Grams of iron filings and sulphur powder in the dish. */
  readonly iron: number;
  readonly sulphur: number;
  /** Grams of solute stirred into the beaker, and grams of water. */
  readonly soluteMass: number;
  readonly water: number;
  /** Temperature of the water, °C. */
  readonly temp: number;
  /** Grams of solute in the flask, and the volume it is made up to, mL. */
  readonly flaskMass: number;
  readonly volume: number;
  /** Minutes the liquid has stood still. */
  readonly minutes: number;
}

export const PURE_LIMITS: Record<keyof PureMixedState, readonly [number, number]> = {
  iron: [0.5, 14],
  sulphur: [0.5, 14],
  soluteMass: [0, 200],
  water: [50, 500],
  temp: [10, 80],
  flaskMass: [0, 20],
  volume: [100, 1000],
  minutes: [0, 60],
};

export type PureMixedResults = {
  sample: number;
  sampleKind: number;
  pure: number;
  homogeneous: number;
  separable: number;
  fixedPoint: number;

  heated: number;
  fesTest: number;
  iron: number;
  sulphur: number;
  totalMass: number;
  ironReacted: number;
  sulphurReacted: number;
  fesMass: number;
  ironLeft: number;
  sulphurLeft: number;
  magnetPulls: number;
  cs2Dissolves: number;
  /** 1 hydrogen only, 2 hydrogen sulphide only, 3 both. */
  acidGas: number;
  /** 0 grey and yellow bits, 1 black all through, 2 black with spare iron or sulphur. */
  looks: number;

  solute: number;
  soluteMass: number;
  water: number;
  temp: number;
  solubility: number;
  canDissolve: number;
  dissolved: number;
  undissolved: number;
  solutionMass: number;
  massPercent: number;
  saturated: number;
  maxPercent: number;

  flaskMass: number;
  volume: number;
  massByVolume: number;

  liquid: number;
  liquidKind: number;
  particleSize: number;
  scatters: number;
  passesFilter: number;
  liquidHomogeneous: number;
  minutes: number;
  settled: number;
  settleMinutes: number;
  clear: number;

  colloid: number;
  dispersed: number;
  medium: number;
  colloidType: number;
};

const OUTPUTS = [
  "sample", "sampleKind", "pure", "homogeneous", "separable", "fixedPoint",
  "heated", "fesTest", "iron", "sulphur", "totalMass", "ironReacted", "sulphurReacted", "fesMass", "ironLeft", "sulphurLeft",
  "magnetPulls", "cs2Dissolves", "acidGas", "looks",
  "solute", "soluteMass", "water", "temp", "solubility", "canDissolve", "dissolved", "undissolved", "solutionMass", "massPercent", "saturated", "maxPercent",
  "flaskMass", "volume", "massByVolume",
  "liquid", "liquidKind", "particleSize", "scatters", "passesFilter", "liquidHomogeneous", "minutes", "settled", "settleMinutes", "clear",
  "colloid", "dispersed", "medium", "colloidType",
] as const satisfies readonly (keyof PureMixedResults)[];

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
}
const limit = (key: keyof PureMixedState, v: number) => clamp(v, PURE_LIMITS[key][0], PURE_LIMITS[key][1]);
const pick = <T>(order: readonly T[], value: T, fallback: T): T => (order.includes(value) ? value : fallback);

export const mixtureModel: SimulationModel<PureMixedState, PureMixedParams, PureMixedResults> = {
  id: "mixture",
  defaultParams: { sample: "gold", fes: "mixed", fesTest: "magnet", solute: "salt", liquid: "salt-solution", colloid: "fog" },
  outputs: OUTPUTS,
  stateVariables: Object.keys(PURE_LIMITS),

  initialize() {
    return { iron: 7, sulphur: 4, soluteMass: 40, water: 320, temp: 20, flaskMass: 4.5, volume: 500, minutes: 0 };
  },

  /** Play lets the liquid stand: a minute every second. */
  advance(state, dt) {
    return { ...state, minutes: limit("minutes", state.minutes + dt) };
  },

  /** A step is one more (or one less) minute of standing. */
  step(state, _params, sign) {
    return { ...state, minutes: limit("minutes", Math.round(state.minutes) + sign) };
  },

  derive(state, params) {
    const sampleId = pick(PURE_SAMPLE_ORDER, params.sample, "gold");
    const sample = PURE_SAMPLES[sampleId];
    const pure = sample.kind <= 1;

    const heated = params.fes === "heated";
    const fesTest = pick(PURE_FES_TEST_ORDER, params.fesTest, "magnet");
    const iron = limit("iron", state.iron);
    const sulphur = limit("sulphur", state.sulphur);
    const fes = pureIronSulphur(iron, sulphur, heated);
    const freeIron = fes.ironLeft > 0;
    const acidGas = fes.fesMass > 0 ? (freeIron ? 3 : 2) : 1;
    const looks = !heated ? 0 : fes.ironLeft > 0 || fes.sulphurLeft > 0 ? 2 : 1;

    const soluteId = pick(PURE_SOLUTE_ORDER, params.solute, "salt");
    const soluteMass = limit("soluteMass", state.soluteMass);
    const water = limit("water", state.water);
    const temp = limit("temp", state.temp);
    const solubility = schoolSolubility(soluteId, temp);
    const canDissolve = (solubility * water) / 100;
    const dissolved = Math.min(soluteMass, canDissolve);
    const flaskMass = limit("flaskMass", state.flaskMass);
    const volume = limit("volume", state.volume);

    const liquidId = pick(PURE_LIQUID_ORDER, params.liquid, "salt-solution");
    const liquid = PURE_LIQUIDS[liquidId];
    const liquidKind = pureLiquidKind(liquid.size);
    const minutes = limit("minutes", state.minutes);
    const speed = liquidKind === 0 ? 0 : pureSettlingSpeed(liquid.size, liquid.density);
    const settled = Math.min(100, ((speed * minutes * 60) / PURE_DEPTH) * 100);
    const settleMinutes = liquidKind === 2 && speed > 0 ? PURE_DEPTH / speed / 60 : 0;

    const colloidId = pick(PURE_COLLOID_ORDER, params.colloid, "fog");
    const colloid = PURE_COLLOIDS[colloidId];

    return {
      sample: PURE_SAMPLE_ORDER.indexOf(sampleId),
      sampleKind: sample.kind,
      pure: pure ? 1 : 0,
      homogeneous: sample.kind === 3 ? 0 : 1,
      separable: pure ? 0 : 1,
      fixedPoint: pure ? 1 : 0,

      heated: heated ? 1 : 0,
      fesTest: PURE_FES_TEST_ORDER.indexOf(fesTest),
      iron,
      sulphur,
      totalMass: iron + sulphur,
      ...fes,
      magnetPulls: fes.ironLeft,
      cs2Dissolves: fes.sulphurLeft,
      acidGas,
      looks,

      solute: PURE_SOLUTE_ORDER.indexOf(soluteId),
      soluteMass,
      water,
      temp,
      solubility,
      canDissolve,
      dissolved,
      undissolved: tidy(soluteMass - dissolved),
      solutionMass: dissolved + water,
      massPercent: pureMassPercent(dissolved, water),
      saturated: soluteMass > 0 && soluteMass >= canDissolve ? 1 : 0,
      maxPercent: pureMassPercent(solubility, 100),

      flaskMass,
      volume,
      massByVolume: pureMassByVolume(flaskMass, volume),

      liquid: PURE_LIQUID_ORDER.indexOf(liquidId),
      liquidKind,
      particleSize: liquid.size,
      scatters: liquidKind >= 1 ? 1 : 0,
      passesFilter: liquidKind <= 1 ? 1 : 0,
      liquidHomogeneous: liquidKind === 0 ? 1 : 0,
      minutes,
      settled,
      settleMinutes,
      clear: liquidKind === 2 && settled >= 100 ? 1 : 0,

      colloid: PURE_COLLOID_ORDER.indexOf(colloidId),
      dispersed: colloid.dispersed,
      medium: colloid.medium,
      colloidType: pureColloidType(colloid.dispersed, colloid.medium),
    };
  },

  getVariable(state, id) {
    return id in PURE_LIMITS ? state[id as keyof PureMixedState] : undefined;
  },

  setVariable(state, id, value) {
    if (!(id in PURE_LIMITS)) return state;
    const key = id as keyof PureMixedState;
    return { ...state, [key]: limit(key, value) };
  },
};
