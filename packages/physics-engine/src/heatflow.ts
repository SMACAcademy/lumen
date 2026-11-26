import type { SimulationModel } from "@ise/science-engine";
import { snapZero } from "@ise/units";

/**
 * Heat transfer and thermal expansion, for class 11 (NCERT chapter 10,
 * "Thermal Properties of Matter"). One model, eight small benches:
 *
 * Scales: the same hotness read on three thermometers,
 *   F = (9/5)C + 32 and K = C + 273.15.
 *
 * Expansion: a bar of length L₀ warmed by ΔT grows by ΔL = αL₀ΔT. Its area
 * grows with β = 2α and its volume with γ = 3α (the linear approximations
 * NCERT uses, good while αΔT is tiny). A brass–steel bimetallic strip curls
 * towards the steel when heated, because brass expands more.
 *
 * Water: densest at about 4 °C (3.98 °C). Below that it expands as it cools —
 * the anomalous expansion. The density is Tanaka's (2001) fit to measured
 * data, so the numbers are real, not a sketch.
 *
 * Conduction: a lagged rod in the steady state carries H = kA(T₁ − T₂)/L.
 * Its thermal resistance is R = L/(kA), so H = ΔT/R. Two slabs in series
 * carry the same H, their resistances add, and the joint between them sits
 * at T₁ − HR₁. Side by side (parallel) the two conductances 1/R add instead.
 *
 * Convection: by day the land warms faster than the sea (lower specific
 * heat), the air over it rises, and a sea breeze blows in; by night it turns
 * round. This part is qualitative.
 *
 * Radiation: a surface at T radiates σeT⁴ per square metre (Stefan–Boltzmann)
 * and its spectrum peaks at λ_max = b/T (Wien), b = 2.9 × 10⁻³ m K. With the
 * surroundings at 300 K the net loss is σe(T⁴ − T₀⁴).
 *
 * Newton's law of cooling: the rate of cooling is proportional to the excess
 * temperature, −dT/dt = k(T − T_s), so T = T_s + (T₀ − T_s)e^(−kt).
 */

/** Stefan–Boltzmann constant, W m⁻² K⁻⁴. */
export const HEATFLOW_SIGMA = 5.67e-8;
/** Wien's displacement constant, m K. */
export const HEATFLOW_WIEN_B = 2.9e-3;
/** Absolute zero, °C. */
export const HEATFLOW_ABS_ZERO = -273.15;
/** The surroundings a radiating body exchanges heat with, K. */
export const HEATFLOW_SURROUNDINGS = 300;
/** Where water is densest, °C (Tanaka's fit). */
export const HEATFLOW_WATER_DENSEST = 3.983035;
/** The edges of the visible band, nm. */
export const HEATFLOW_VISIBLE: readonly [number, number] = [380, 750];

// ── Materials ───────────────────────────────────────────────────────────────

export type HeatflowExpander = "glass" | "steel" | "copper" | "brass" | "aluminium";
export const HEATFLOW_EXPANDER_ORDER: readonly HeatflowExpander[] = ["glass", "steel", "copper", "brass", "aluminium"];
/** Coefficients of linear expansion α, per K, near room temperature (NCERT Table 10.1). */
export const HEATFLOW_EXPANDERS: Record<HeatflowExpander, { label: string; alpha: number }> = {
  glass: { label: "Glass (Pyrex)", alpha: 0.32e-5 },
  steel: { label: "Steel", alpha: 1.2e-5 },
  copper: { label: "Copper", alpha: 1.7e-5 },
  brass: { label: "Brass", alpha: 1.8e-5 },
  aluminium: { label: "Aluminium", alpha: 2.5e-5 },
};

export type HeatflowConductor = "copper" | "aluminium" | "brass" | "steel" | "glass" | "wood";
export const HEATFLOW_CONDUCTOR_ORDER: readonly HeatflowConductor[] = ["copper", "aluminium", "brass", "steel", "glass", "wood"];
/** Thermal conductivities k, W m⁻¹ K⁻¹, near room temperature (NCERT Table 10.5). */
export const HEATFLOW_CONDUCTORS: Record<HeatflowConductor, { label: string; k: number }> = {
  copper: { label: "Copper", k: 385 },
  aluminium: { label: "Aluminium", k: 205 },
  brass: { label: "Brass", k: 109 },
  steel: { label: "Steel", k: 50.2 },
  glass: { label: "Glass", k: 0.8 },
  wood: { label: "Wood", k: 0.12 },
};

/** The bimetallic strip is always brass bonded to steel. */
export const HEATFLOW_BIMETAL = { outer: "brass", inner: "steel" } as const;

export type HeatflowDaytime = "day" | "night";

// ── Ranges of the state, matching the lab's sliders ───────────────────────

export const HEATFLOW_LIMITS = {
  celsius: [-273, 300],
  barLength: [1, 100],
  deltaT: [-100, 200],
  waterTemp: [0, 20],
  hotEnd: [0, 300],
  coldEnd: [0, 100],
  rodLength: [0.1, 2],
  area: [1, 20],
  secondLength: [0.1, 2],
  bodyTemp: [300, 10000],
  emissivity: [0.05, 1],
  startTemp: [30, 100],
  roomTemp: [0, 40],
  coolingConstant: [0.02, 0.3],
  coolTime: [0, 60],
} as const satisfies Record<string, readonly [number, number]>;

export type HeatflowStateKey = keyof typeof HEATFLOW_LIMITS;

export type HeatflowState = { readonly [K in HeatflowStateKey]: number };

export type HeatflowParams = {
  /** The bar being heated, for expansion. */
  material: HeatflowExpander;
  /** The rod, and the first slab of the composite. */
  rodMaterial: HeatflowConductor;
  /** The second slab of the composite. */
  secondMaterial: HeatflowConductor;
  daytime: HeatflowDaytime;
};

export type HeatflowResults = {
  // Scales
  celsius: number;
  fahrenheit: number;
  kelvin: number;
  // Expansion
  material: number;
  /** Coefficients of linear, area and volume expansion, per K. */
  alpha: number;
  beta: number;
  gamma: number;
  barLength: number;
  deltaT: number;
  /** The stretch in millimetres, and in metres for the formula. */
  deltaL: number;
  deltaLm: number;
  newLength: number;
  lengthChangePct: number;
  areaChangePct: number;
  volumeChangePct: number;
  bimetalMismatch: number;
  bimetalCurl: number;
  // Water
  waterTemp: number;
  waterDensity: number;
  waterVolume: number;
  waterDensest: number;
  waterTrend: number;
  // Conduction
  rodMaterial: number;
  rodK: number;
  hotEnd: number;
  coldEnd: number;
  rodLength: number;
  /** Cross-section in cm², and in m² for the formula. */
  area: number;
  areaM2: number;
  heatCurrent: number;
  gradient: number;
  rodResistance: number;
  midTemp: number;
  // Composite slabs
  secondMaterial: number;
  secondK: number;
  secondLength: number;
  secondResistance: number;
  seriesResistance: number;
  seriesHeat: number;
  interfaceTemp: number;
  kEffective: number;
  parallelHeat: number;
  // Convection
  daytime: number;
  landWarmer: number;
  breeze: number;
  // Radiation
  bodyTemp: number;
  emissivity: number;
  radiatedPower: number;
  netRadiated: number;
  peakWavelength: number;
  peakBand: number;
  glow: number;
  // Cooling
  startTemp: number;
  roomTemp: number;
  coolingConstant: number;
  coolTime: number;
  coolTemp: number;
  excessTemp: number;
  coolingRate: number;
  halfLife: number;
};

const OUTPUTS = [
  "celsius", "fahrenheit", "kelvin",
  "material", "alpha", "beta", "gamma", "barLength", "deltaT", "deltaL", "deltaLm", "newLength",
  "lengthChangePct", "areaChangePct", "volumeChangePct", "bimetalMismatch", "bimetalCurl",
  "waterTemp", "waterDensity", "waterVolume", "waterDensest", "waterTrend",
  "rodMaterial", "rodK", "hotEnd", "coldEnd", "rodLength", "area", "areaM2", "heatCurrent", "gradient", "rodResistance", "midTemp",
  "secondMaterial", "secondK", "secondLength", "secondResistance", "seriesResistance", "seriesHeat", "interfaceTemp",
  "kEffective", "parallelHeat",
  "daytime", "landWarmer", "breeze",
  "bodyTemp", "emissivity", "radiatedPower", "netRadiated", "peakWavelength", "peakBand", "glow",
  "startTemp", "roomTemp", "coolingConstant", "coolTime", "coolTemp", "excessTemp", "coolingRate", "halfLife",
] as const satisfies readonly (keyof HeatflowResults)[];

const STATE_KEYS = Object.keys(HEATFLOW_LIMITS) as HeatflowStateKey[];

function heatflowLimit(key: HeatflowStateKey, value: number): number {
  const [lo, hi] = HEATFLOW_LIMITS[key];
  return Number.isFinite(value) ? Math.min(hi, Math.max(lo, value)) : lo;
}

/** Fahrenheit and kelvin readings for a Celsius temperature. */
export function heatflowScales(celsius: number): { fahrenheit: number; kelvin: number } {
  return { fahrenheit: (9 / 5) * celsius + 32, kelvin: celsius - HEATFLOW_ABS_ZERO };
}

/** Density of pure water at T °C, kg/m³ (Tanaka et al. 2001, valid 0–40 °C). */
export function heatflowWaterDensity(t: number): number {
  const a1 = -3.983035;
  const a2 = 301.797;
  const a3 = 522528.9;
  const a4 = 69.34881;
  const a5 = 999.97495;
  return a5 * (1 - ((t + a1) ** 2 * (t + a2)) / (a3 * (t + a4)));
}

/** Wien's peak for a body at T kelvin, nm. */
export function heatflowPeak(kelvin: number): number {
  return (HEATFLOW_WIEN_B / Math.max(1, kelvin)) * 1e9;
}

/**
 * The blackbody spectrum's shape, λ⁻⁵ / (e^(hc/λkT) − 1), scaled so that it
 * is 1 at its own peak. Planck's law, for drawing the curve.
 */
export function heatflowPlanckShape(nm: number, kelvin: number): number {
  const c2 = 1.4388e-2; // hc/k, m K
  const radiance = (lambdaNm: number) => {
    const lambda = lambdaNm * 1e-9;
    const x = c2 / (lambda * kelvin);
    return x > 700 ? 0 : 1 / (lambda ** 5 * Math.expm1(x));
  };
  const peak = radiance((2.8978e-3 / kelvin) * 1e9);
  return nm > 0 && peak > 0 ? radiance(nm) / peak : 0;
}

/** 0 no visible glow, 1 dull red, 2 orange, 3 yellow-white, 4 white, 5 bluish white. */
export function heatflowGlow(kelvin: number): number {
  if (kelvin < 800) return 0;
  if (kelvin < 1100) return 1;
  if (kelvin < 1500) return 2;
  if (kelvin < 3500) return 3;
  if (kelvin < 7000) return 4;
  return 5;
}

/** Temperature of a cooling body after t minutes (Newton's law, solved). */
export function heatflowCooling(start: number, room: number, k: number, minutes: number): number {
  return room + (start - room) * Math.exp(-k * minutes);
}

function expanderOf(params: HeatflowParams) {
  return HEATFLOW_EXPANDERS[params.material] ?? HEATFLOW_EXPANDERS.steel;
}

function conductorOf(id: HeatflowConductor | undefined, fallback: HeatflowConductor) {
  return HEATFLOW_CONDUCTORS[id as HeatflowConductor] ?? HEATFLOW_CONDUCTORS[fallback];
}

const z = (v: number) => snapZero(v) || 0;

export const heatflowModel: SimulationModel<HeatflowState, HeatflowParams, HeatflowResults> = {
  id: "heatflow",
  defaultParams: { material: "steel", rodMaterial: "copper", secondMaterial: "steel", daytime: "day" },
  outputs: OUTPUTS,
  stateVariables: STATE_KEYS,

  initialize() {
    return {
      celsius: 25,
      barLength: 10,
      deltaT: 40,
      waterTemp: 10,
      hotEnd: 100,
      coldEnd: 0,
      rodLength: 0.5,
      area: 4,
      secondLength: 0.5,
      bodyTemp: 1000,
      emissivity: 1,
      startTemp: 90,
      roomTemp: 25,
      coolingConstant: 0.1,
      coolTime: 0,
    };
  },

  /** Play runs the cooling clock: one minute of cooling per second, stopping at an hour. */
  advance(state, dt) {
    return { ...state, coolTime: heatflowLimit("coolTime", state.coolTime + dt) };
  },

  /** A step moves the cooling clock by a minute. */
  step(state, _params, sign) {
    return { ...state, coolTime: heatflowLimit("coolTime", Math.round(state.coolTime) + sign) };
  },

  derive(state, params) {
    const s = Object.fromEntries(STATE_KEYS.map((k) => [k, heatflowLimit(k, state[k])])) as Record<HeatflowStateKey, number>;

    // Scales
    const { fahrenheit, kelvin } = heatflowScales(s.celsius);

    // Expansion
    const alpha = expanderOf(params).alpha;
    const strain = alpha * s.deltaT;
    const deltaL = s.barLength * strain; // m
    const mismatch = (HEATFLOW_EXPANDERS.brass.alpha - HEATFLOW_EXPANDERS.steel.alpha) * s.deltaT;

    // Water
    const rho = heatflowWaterDensity(s.waterTemp);

    // Conduction
    const k1 = conductorOf(params.rodMaterial, "copper").k;
    const k2 = conductorOf(params.secondMaterial, "steel").k;
    const areaM2 = s.area * 1e-4;
    const drop = s.hotEnd - s.coldEnd;
    const r1 = s.rodLength / (k1 * areaM2);
    const r2 = s.secondLength / (k2 * areaM2);
    const heat = drop / r1;
    const series = r1 + r2;
    const seriesHeat = drop / series;

    // Radiation
    const T = s.bodyTemp;
    const peak = heatflowPeak(T);

    // Cooling
    const coolTemp = heatflowCooling(s.startTemp, s.roomTemp, s.coolingConstant, s.coolTime);
    const excess = coolTemp - s.roomTemp;

    const day = params.daytime !== "night";

    return {
      celsius: z(s.celsius),
      fahrenheit: z(fahrenheit),
      kelvin: z(kelvin),

      material: Math.max(0, HEATFLOW_EXPANDER_ORDER.indexOf(params.material)),
      alpha,
      beta: 2 * alpha,
      gamma: 3 * alpha,
      barLength: s.barLength,
      deltaT: z(s.deltaT),
      deltaL: z(deltaL * 1000),
      deltaLm: z(deltaL),
      newLength: s.barLength + deltaL,
      lengthChangePct: z(strain * 100),
      areaChangePct: z(2 * strain * 100),
      volumeChangePct: z(3 * strain * 100),
      bimetalMismatch: z(mismatch * 1000),
      bimetalCurl: Math.sign(s.deltaT) || 0,

      waterTemp: s.waterTemp,
      waterDensity: rho,
      waterVolume: 1e6 / rho,
      waterDensest: Math.abs(s.waterTemp - HEATFLOW_WATER_DENSEST) < 0.25 ? 1 : 0,
      waterTrend: Math.abs(s.waterTemp - HEATFLOW_WATER_DENSEST) < 0.25 ? 0 : s.waterTemp < HEATFLOW_WATER_DENSEST ? -1 : 1,

      rodMaterial: Math.max(0, HEATFLOW_CONDUCTOR_ORDER.indexOf(params.rodMaterial)),
      rodK: k1,
      hotEnd: s.hotEnd,
      coldEnd: s.coldEnd,
      rodLength: s.rodLength,
      area: s.area,
      areaM2: areaM2,
      heatCurrent: z(heat),
      gradient: z(drop / s.rodLength),
      rodResistance: r1,
      midTemp: (s.hotEnd + s.coldEnd) / 2,

      secondMaterial: Math.max(0, HEATFLOW_CONDUCTOR_ORDER.indexOf(params.secondMaterial)),
      secondK: k2,
      secondLength: s.secondLength,
      secondResistance: r2,
      seriesResistance: series,
      seriesHeat: z(seriesHeat),
      interfaceTemp: z(s.hotEnd - seriesHeat * r1),
      kEffective: (s.rodLength + s.secondLength) / (s.rodLength / k1 + s.secondLength / k2),
      parallelHeat: z(drop * (1 / r1 + 1 / r2)),

      daytime: day ? 0 : 1,
      landWarmer: day ? 1 : 0,
      breeze: day ? 1 : -1,

      bodyTemp: T,
      emissivity: s.emissivity,
      radiatedPower: HEATFLOW_SIGMA * s.emissivity * T ** 4,
      netRadiated: HEATFLOW_SIGMA * s.emissivity * (T ** 4 - HEATFLOW_SURROUNDINGS ** 4),
      peakWavelength: peak,
      peakBand: peak > HEATFLOW_VISIBLE[1] ? 0 : peak >= HEATFLOW_VISIBLE[0] ? 1 : 2,
      glow: heatflowGlow(T),

      startTemp: s.startTemp,
      roomTemp: s.roomTemp,
      coolingConstant: s.coolingConstant,
      coolTime: s.coolTime,
      coolTemp: z(coolTemp),
      excessTemp: z(excess),
      coolingRate: z(s.coolingConstant * excess),
      halfLife: Math.LN2 / s.coolingConstant,
    };
  },

  getVariable(state, id) {
    return (STATE_KEYS as string[]).includes(id) ? state[id as HeatflowStateKey] : undefined;
  },

  setVariable(state, id, value) {
    if (!(STATE_KEYS as string[]).includes(id)) return state;
    const key = id as HeatflowStateKey;
    return { ...state, [key]: heatflowLimit(key, value) };
  },
};
