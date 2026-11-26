import type { SimulationModel } from "@ise/science-engine";

/**
 * Combustion, fuels and flames, for class 8 (NCERT science, "Combustion and
 * Flame" and "Coal and Petroleum").
 *
 * Seven small benches share one model:
 *
 *   • burn     — a material, how hot it is, and how much oxygen is around it.
 *                It burns only with all three sides of the fire triangle:
 *                a fuel, enough air, and heat up to its ignition temperature;
 *   • jar      — a candle under a jar uses up the oxygen and goes out;
 *   • cup      — water in a paper cup keeps the paper below its ignition
 *                temperature, so the cup does not burn;
 *   • flame    — a probe moved through the three zones of a candle flame;
 *   • fire     — a fire and the way you try to put it out;
 *   • fuel     — NCERT's table of calorific values, and the heat a mass of
 *                fuel gives: heat = mass × calorific value;
 *   • products — what coal and petroleum are turned into.
 *
 * Simplifications, stated plainly:
 *   • Ignition temperatures are typical, rounded values; real ones vary from
 *     sample to sample. For the liquids and LPG the lab uses the lowest
 *     temperature at which their vapour catches fire from a small flame
 *     (the flash point). That is what NCERT means when it says petrol and
 *     LPG have a very low ignition temperature and kerosene must be heated a
 *     little before it catches fire.
 *   • Below 16 % oxygen nothing here burns. The real limit is about that for
 *     a candle and differs a little from fuel to fuel.
 *   • The candle uses 5 mL of oxygen every second (a typical small candle)
 *     and the jar's oxygen falls steadily until it reaches 16 %. The carbon
 *     dioxide made is not counted in the percentage.
 *   • The paper-cup heating rates are illustrative: water warms 0.5 °C a
 *     second and boils at 100 °C; an empty cup warms 20 °C a second.
 *   • A candle flame is drawn as three nested ovals, a few centimetres tall.
 *   • Where NCERT gives a range of calorific values, the middle is used for
 *     the heat (cow dung cake 7000, wood 19500, coal 29000, biogas 37500 kJ/kg).
 */

// ── Burn: the fire triangle ──────────────────────────────────────────────────

export type CombustMaterialId = "lpg" | "petrol" | "alcohol" | "kerosene" | "paper" | "wood" | "charcoal" | "stone" | "glass" | "iron-nail";

export interface CombustMaterial {
  name: string;
  combustible: 0 | 1;
  /** Ignition temperature, °C (for liquids and LPG, the flash point). 0 when it does not burn. */
  ignition: number;
  /** 0 solid, 1 liquid, 2 gas. */
  state: 0 | 1 | 2;
  /** One short line on how it burns, or why it does not. */
  note: string;
}

export const COMBUST_MATERIAL_ORDER: readonly CombustMaterialId[] = ["lpg", "petrol", "alcohol", "kerosene", "paper", "wood", "charcoal", "stone", "glass", "iron-nail"];

export const COMBUST_MATERIALS: Record<CombustMaterialId, CombustMaterial> = {
  lpg: { name: "LPG (cooking gas)", combustible: 1, ignition: -60, state: 2, note: "Inflammable: it catches fire at once" },
  petrol: { name: "Petrol", combustible: 1, ignition: -43, state: 1, note: "Inflammable: it catches fire at once" },
  alcohol: { name: "Alcohol", combustible: 1, ignition: 13, state: 1, note: "Inflammable: it catches fire easily" },
  kerosene: { name: "Kerosene", combustible: 1, ignition: 40, state: 1, note: "It must be warmed a little first" },
  paper: { name: "Paper", combustible: 1, ignition: 230, state: 0, note: "Paper burns once it is hot enough" },
  wood: { name: "Wood", combustible: 1, ignition: 300, state: 0, note: "Wood must get much hotter than kerosene" },
  charcoal: { name: "Charcoal", combustible: 1, ignition: 350, state: 0, note: "Charcoal glows: C + O₂ → CO₂" },
  stone: { name: "Stone", combustible: 0, ignition: 0, state: 0, note: "Stone is not a fuel: it never burns" },
  glass: { name: "Glass", combustible: 0, ignition: 0, state: 0, note: "Glass is not a fuel: it never burns" },
  "iron-nail": { name: "Iron nail", combustible: 0, ignition: 0, state: 0, note: "An iron nail only gets hot: it does not burn" },
};

/** Below this share of oxygen in the air, nothing here burns (%). */
export const COMBUST_OXYGEN_MIN = 16;
/** Oxygen in fresh air (%). */
export const COMBUST_OXYGEN_AIR = 21;
/** Room temperature, °C. */
export const COMBUST_ROOM = 30;

/** Which side of the fire triangle is missing: 0 none (it burns), 1 fuel, 2 air, 3 heat. */
export function combustMissing(material: CombustMaterial, temperature: number, oxygen: number): 0 | 1 | 2 | 3 {
  if (!material.combustible) return 1;
  if (temperature < material.ignition) return 3;
  if (oxygen < COMBUST_OXYGEN_MIN) return 2;
  return 0;
}

// ── Jar: a candle uses up the oxygen ─────────────────────────────────────────

export type CombustJarId = "open" | "closed";
export const COMBUST_JAR_ORDER: readonly CombustJarId[] = ["open", "closed"];

/** Oxygen a small candle uses, mL each second. */
export const COMBUST_CANDLE_O2_ML_PER_S = 5;

/** Seconds a candle burns under a closed jar of `litres` of air. */
export function combustBurnTime(litres: number): number {
  const ml = Math.max(0, litres) * 1000;
  // The oxygen it can use before the air is down to the limit.
  const usable = (ml * (COMBUST_OXYGEN_AIR - COMBUST_OXYGEN_MIN)) / 100;
  return usable / COMBUST_CANDLE_O2_ML_PER_S;
}

/** Oxygen in a closed jar after `seconds`, %. */
export function combustJarOxygen(litres: number, seconds: number): number {
  const ml = Math.max(1e-6, litres * 1000);
  const used = COMBUST_CANDLE_O2_ML_PER_S * Math.min(Math.max(0, seconds), combustBurnTime(litres));
  return COMBUST_OXYGEN_AIR - (100 * used) / ml;
}

// ── Cup: water keeps the paper cool ──────────────────────────────────────────

export type CombustCupId = "water" | "empty";
export const COMBUST_CUP_ORDER: readonly CombustCupId[] = ["water", "empty"];

/** How fast the paper warms over the flame, °C each second. */
export const COMBUST_CUP_WATER_RATE = 0.5;
export const COMBUST_CUP_EMPTY_RATE = 20;
/** The hottest the burning paper is shown, °C. */
export const COMBUST_CUP_MAX = 600;

/** Temperature of the paper after `seconds` over the flame, °C. */
export function combustCupTemperature(cup: CombustCupId, seconds: number): number {
  const t = Math.max(0, seconds);
  if (cup === "water") return Math.min(100, COMBUST_ROOM + COMBUST_CUP_WATER_RATE * t);
  return Math.min(COMBUST_CUP_MAX, COMBUST_ROOM + COMBUST_CUP_EMPTY_RATE * t);
}

// ── Flame: the three zones of a candle flame ─────────────────────────────────

/** Ovals (centre x, centre y, half-width, half-height), mm above the wick tip. */
export const COMBUST_FLAME_OUTER = { cx: 0, cy: 22, a: 9, b: 24 } as const;
export const COMBUST_FLAME_LUMINOUS = { cx: 0, cy: 27, a: 6.5, b: 18 } as const;
export const COMBUST_FLAME_DARK = { cx: 0, cy: 6, a: 4, b: 7.5 } as const;

type Oval = { cx: number; cy: number; a: number; b: number };
const inside = (o: Oval, x: number, y: number) => ((x - o.cx) / o.a) ** 2 + ((y - o.cy) / o.b) ** 2 <= 1;

/** 0 outside the flame, 1 dark zone, 2 luminous zone, 3 outer non-luminous zone. */
export function combustFlameZone(x: number, y: number): 0 | 1 | 2 | 3 {
  if (inside(COMBUST_FLAME_DARK, x, y)) return 1;
  if (inside(COMBUST_FLAME_LUMINOUS, x, y)) return 2;
  if (inside(COMBUST_FLAME_OUTER, x, y)) return 3;
  return 0;
}

export const COMBUST_ZONES = [
  { name: "outside the flame", burning: "—", sign: "" },
  { name: "dark zone (innermost)", burning: "no burning: unburnt wax vapour", sign: "Wax vapour flows out of a glass tube" },
  { name: "luminous zone (middle)", burning: "partial burning", sign: "Soot blackens a glass plate" },
  { name: "non-luminous zone (outer)", burning: "complete burning", sign: "A copper wire glows red hot" },
] as const;

// ── Fire: putting it out ─────────────────────────────────────────────────────

export type CombustFireId = "wood" | "paper" | "electrical" | "petrol" | "gas-stove";
export type CombustAgentId = "water" | "sand" | "co2" | "shut-off";

export const COMBUST_FIRE_ORDER: readonly CombustFireId[] = ["wood", "paper", "electrical", "petrol", "gas-stove"];
export const COMBUST_AGENT_ORDER: readonly CombustAgentId[] = ["water", "sand", "co2", "shut-off"];

export const COMBUST_FIRES: Record<CombustFireId, { name: string; waterSafe: 0 | 1 }> = {
  wood: { name: "Burning wood", waterSafe: 1 },
  paper: { name: "Burning paper", waterSafe: 1 },
  electrical: { name: "Electrical fire", waterSafe: 0 },
  petrol: { name: "Burning petrol", waterSafe: 0 },
  "gas-stove": { name: "Gas stove fire", waterSafe: 0 },
};

export const COMBUST_AGENTS: Record<CombustAgentId, string> = {
  water: "Water",
  sand: "Sand",
  co2: "CO₂ extinguisher",
  "shut-off": "Shut off the supply",
};

export interface CombustFireResult {
  out: 0 | 1;
  /** The side of the triangle taken away: 0 none, 1 fuel, 2 air, 3 heat. */
  side: 0 | 1 | 2 | 3;
  /** 1 when the try itself is dangerous. */
  danger: 0 | 1;
  note: string;
}

const fought = (out: 0 | 1, side: 0 | 1 | 2 | 3, note: string, danger: 0 | 1 = 0): CombustFireResult => ({ out, side, danger, note });

export function combustFight(fire: CombustFireId, agent: CombustAgentId): CombustFireResult {
  switch (fire) {
    case "wood":
    case "paper":
      if (agent === "water") return fought(1, 3, "Water cools it below its ignition temperature");
      if (agent === "sand") return fought(1, 2, "Sand covers it and cuts off the air");
      if (agent === "co2") return fought(1, 2, "CO₂ blankets it and cuts off the air");
      return fought(0, 0, "There is no supply to shut off here");
    case "electrical":
      if (agent === "water") return fought(0, 0, "Never! Water conducts: you could get a shock", 1);
      if (agent === "co2") return fought(1, 2, "CO₂ cuts off the air and does not conduct");
      if (agent === "shut-off") return fought(0, 0, "Switching off the mains is the first step");
      return fought(0, 0, "Switch off the mains, then use CO₂");
    case "petrol":
      if (agent === "water") return fought(0, 0, "Petrol floats on water and keeps burning", 1);
      if (agent === "sand") return fought(1, 2, "Sand covers a small spill and cuts off air");
      if (agent === "co2") return fought(1, 2, "CO₂ is heavier than air: it smothers it");
      return fought(0, 0, "The spilt petrol is already burning");
    case "gas-stove":
      if (agent === "shut-off") return fought(1, 1, "Turn off the regulator: no fuel, no fire");
      if (agent === "co2") return fought(0, 0, "The flame dies, but the gas keeps leaking");
      return fought(0, 0, "The gas keeps coming: turn it off first");
  }
}

// ── Fuels and calorific value ────────────────────────────────────────────────

export type CombustFuelId = "dung" | "wood" | "coal" | "biogas" | "kerosene" | "petrol" | "diesel" | "cng" | "lpg" | "hydrogen";

export interface CombustFuel {
  name: string;
  /** NCERT's calorific value, kJ/kg: lowest and highest of the range given. */
  low: number;
  high: number;
  /** 0 solid, 1 liquid, 2 gas. */
  state: 0 | 1 | 2;
  /** How much it pollutes: 0 none (only water), 1 little, 2 some, 3 a lot. */
  pollution: 0 | 1 | 2 | 3;
  /** Gives sulphur dioxide when it burns. */
  so2: 0 | 1;
  /** A fossil fuel, formed over millions of years: it will run out. */
  fossil: 0 | 1;
  note: string;
}

export const COMBUST_FUEL_ORDER: readonly CombustFuelId[] = ["dung", "wood", "coal", "biogas", "kerosene", "petrol", "diesel", "cng", "lpg", "hydrogen"];

/** NCERT class 8, "Combustion and Flame", the table of calorific values. */
export const COMBUST_FUELS: Record<CombustFuelId, CombustFuel> = {
  dung: { name: "Cow dung cake", low: 6000, high: 8000, state: 0, pollution: 3, so2: 0, fossil: 0, note: "Lots of smoke and ash" },
  wood: { name: "Wood", low: 17000, high: 22000, state: 0, pollution: 3, so2: 0, fossil: 0, note: "Smoke, ash and carbon monoxide" },
  coal: { name: "Coal", low: 25000, high: 33000, state: 0, pollution: 3, so2: 1, fossil: 1, note: "Smoke, ash and sulphur dioxide" },
  biogas: { name: "Biogas", low: 35000, high: 40000, state: 2, pollution: 1, so2: 0, fossil: 0, note: "Burns cleanly, made from dung" },
  kerosene: { name: "Kerosene", low: 45000, high: 45000, state: 1, pollution: 2, so2: 0, fossil: 1, note: "Smoky when air is short" },
  petrol: { name: "Petrol", low: 45000, high: 45000, state: 1, pollution: 2, so2: 0, fossil: 1, note: "Carbon monoxide, nitrogen oxides" },
  diesel: { name: "Diesel", low: 45000, high: 45000, state: 1, pollution: 2, so2: 1, fossil: 1, note: "Soot and sulphur dioxide" },
  cng: { name: "CNG", low: 50000, high: 50000, state: 2, pollution: 1, so2: 0, fossil: 1, note: "A cleaner fuel for vehicles" },
  lpg: { name: "LPG", low: 55000, high: 55000, state: 2, pollution: 1, so2: 0, fossil: 1, note: "Clean, easy to light, at home" },
  hydrogen: { name: "Hydrogen", low: 150000, high: 150000, state: 2, pollution: 0, so2: 0, fossil: 0, note: "Burns to water alone" },
};

/** The calorific value used for the heat: the middle of NCERT's range, kJ/kg. */
export const combustCalorific = (fuel: CombustFuel) => (fuel.low + fuel.high) / 2;

// ── Coal and petroleum products ──────────────────────────────────────────────

export type CombustProductId =
  | "coke" | "coal-tar" | "coal-gas"
  | "lpg" | "petrol" | "kerosene" | "diesel" | "lubricating-oil" | "paraffin-wax" | "bitumen";

export interface CombustProduct {
  name: string;
  /** 0 from coal, 1 from petroleum. */
  source: 0 | 1;
  /** Petroleum only: 1 collected at the top of the refinery column, 7 at the bottom; 0 for coal. */
  depth: number;
  use: string;
}

export const COMBUST_PRODUCT_ORDER: readonly CombustProductId[] = [
  "coke", "coal-tar", "coal-gas", "lpg", "petrol", "kerosene", "diesel", "lubricating-oil", "paraffin-wax", "bitumen",
];

/** NCERT class 8, "Coal and Petroleum": the products and their uses. */
export const COMBUST_PRODUCTS: Record<CombustProductId, CombustProduct> = {
  coke: { name: "Coke", source: 0, depth: 0, use: "Making steel and getting metals out of ores" },
  "coal-tar": { name: "Coal tar", source: 0, depth: 0, use: "Dyes, paints, drugs, plastics, naphthalene balls" },
  "coal-gas": { name: "Coal gas", source: 0, depth: 0, use: "Fuel for factories near coal plants" },
  lpg: { name: "LPG", source: 1, depth: 1, use: "Cooking gas for homes and industry" },
  petrol: { name: "Petrol", source: 1, depth: 2, use: "Fuel for cars, scooters and aircraft" },
  kerosene: { name: "Kerosene", source: 1, depth: 3, use: "Fuel for stoves, lamps and jet aircraft" },
  diesel: { name: "Diesel", source: 1, depth: 4, use: "Fuel for trucks, buses and generators" },
  "lubricating-oil": { name: "Lubricating oil", source: 1, depth: 5, use: "Keeps machine parts moving smoothly" },
  "paraffin-wax": { name: "Paraffin wax", source: 1, depth: 6, use: "Candles, ointments and vaseline" },
  bitumen: { name: "Bitumen", source: 1, depth: 7, use: "Paints and surfacing roads" },
};

// ── The model ────────────────────────────────────────────────────────────────

export type CombustParams = {
  material: CombustMaterialId;
  /** Temperature the material is heated to, °C. */
  temperature: number;
  /** Oxygen in the air around it, %. */
  oxygen: number;
  jar: CombustJarId;
  /** Air in the jar, L. */
  jarVolume: number;
  cup: CombustCupId;
  /** Probe position in the flame, mm: sideways from the wick, and height above it. */
  probeX: number;
  probeY: number;
  fire: CombustFireId;
  agent: CombustAgentId;
  fuel: CombustFuelId;
  /** Mass of fuel burnt, kg. */
  mass: number;
  product: CombustProductId;
};

export interface CombustState {
  /** Seconds since the candle was covered, or the cup was put on the flame. */
  readonly time: number;
}

export type CombustResults = {
  material: number;
  combustible: number;
  ignitionTemp: number;
  temperature: number;
  oxygen: number;
  hasFuel: number;
  hotEnough: number;
  enoughAir: number;
  /** 0 none (it burns), 1 fuel, 2 air, 3 heat. */
  missing: number;
  burning: number;
  inflammable: number;

  time: number;
  jar: number;
  jarVolume: number;
  jarOxygen: number;
  candleLit: number;
  /** How long the candle lasts under a closed jar of this size, s. */
  burnTime: number;

  cup: number;
  cupTemp: number;
  cupBurning: number;
  waterBoiling: number;

  probeX: number;
  probeY: number;
  /** 0 outside, 1 dark, 2 luminous, 3 non-luminous. */
  zone: number;

  fire: number;
  agent: number;
  fireOut: number;
  sideRemoved: number;
  waterSafe: number;
  danger: number;

  fuel: number;
  calorific: number;
  calorificLow: number;
  calorificHigh: number;
  mass: number;
  /** Heat given, kJ. */
  heat: number;
  fuelState: number;
  pollution: number;
  so2: number;
  fossil: number;

  product: number;
  productSource: number;
  towerDepth: number;
};

const OUTPUTS = [
  "material", "combustible", "ignitionTemp", "temperature", "oxygen", "hasFuel", "hotEnough", "enoughAir", "missing", "burning", "inflammable",
  "time", "jar", "jarVolume", "jarOxygen", "candleLit", "burnTime",
  "cup", "cupTemp", "cupBurning", "waterBoiling",
  "probeX", "probeY", "zone",
  "fire", "agent", "fireOut", "sideRemoved", "waterSafe", "danger",
  "fuel", "calorific", "calorificLow", "calorificHigh", "mass", "heat", "fuelState", "pollution", "so2", "fossil",
  "product", "productSource", "towerDepth",
] as const satisfies readonly (keyof CombustResults)[];

/** Control ranges (also used to clamp). */
export const COMBUST_TIME_MAX = 300;
export const COMBUST_TEMPERATURE_RANGE = [20, 500] as const;
export const COMBUST_OXYGEN_RANGE = [0, 21] as const;
export const COMBUST_JAR_RANGE = [0.25, 2] as const;
export const COMBUST_PROBE_X_RANGE = [-15, 15] as const;
export const COMBUST_PROBE_Y_RANGE = [0, 60] as const;
export const COMBUST_MASS_RANGE = [0, 10] as const;
/** Play runs the clock this many times faster than real time. */
export const COMBUST_PLAY_SPEED = 5;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
const indexIn = <T>(order: readonly T[], id: T) => Math.max(0, order.indexOf(id));
const tidy = (v: number) => v || 0;
const COMBUST_JARS_TABLE: Record<CombustJarId, true> = { open: true, closed: true };
const COMBUST_CUPS_TABLE: Record<CombustCupId, true> = { water: true, empty: true };
const pick = <T extends string>(table: Record<T, unknown>, id: T, fallback: T): T => (Object.prototype.hasOwnProperty.call(table, id) ? id : fallback);

export const combustionModel: SimulationModel<CombustState, CombustParams, CombustResults> = {
  id: "combustion",
  defaultParams: {
    material: "wood",
    temperature: COMBUST_ROOM,
    oxygen: COMBUST_OXYGEN_AIR,
    jar: "closed",
    jarVolume: 1,
    cup: "water",
    probeX: 0,
    probeY: 25,
    fire: "wood",
    agent: "water",
    fuel: "lpg",
    mass: 1,
    product: "petrol",
  },
  outputs: OUTPUTS,
  stateVariables: ["time"],

  initialize() {
    return { time: 0 };
  },

  /** Play runs the clock five times faster than real time. */
  advance(state, dt) {
    return { time: clamp(state.time + COMBUST_PLAY_SPEED * dt, 0, COMBUST_TIME_MAX) };
  },

  step(state, _params, sign) {
    return { time: clamp(Math.round(state.time) + sign, 0, COMBUST_TIME_MAX) };
  },

  derive(state, params) {
    const time = clamp(state.time, 0, COMBUST_TIME_MAX);

    const materialId = pick(COMBUST_MATERIALS, params.material, "wood");
    const m = COMBUST_MATERIALS[materialId];
    const temperature = clamp(params.temperature, ...COMBUST_TEMPERATURE_RANGE);
    const oxygen = clamp(params.oxygen, ...COMBUST_OXYGEN_RANGE);
    const missing = combustMissing(m, temperature, oxygen);

    const jarId = pick(COMBUST_JARS_TABLE, params.jar, "closed");
    const jarVolume = clamp(params.jarVolume, ...COMBUST_JAR_RANGE);
    const burnTime = combustBurnTime(jarVolume);
    const closed = jarId === "closed";

    const cupId = pick(COMBUST_CUPS_TABLE, params.cup, "water");
    const cupTemp = combustCupTemperature(cupId, time);

    const probeX = clamp(params.probeX, ...COMBUST_PROBE_X_RANGE);
    const probeY = clamp(params.probeY, ...COMBUST_PROBE_Y_RANGE);

    const fireId = pick(COMBUST_FIRES, params.fire, "wood");
    const agentId = pick(COMBUST_AGENTS, params.agent, "water");
    const fight = combustFight(fireId, agentId);

    const fuelId = pick(COMBUST_FUELS, params.fuel, "lpg");
    const f = COMBUST_FUELS[fuelId];
    const mass = clamp(params.mass, ...COMBUST_MASS_RANGE);
    const calorific = combustCalorific(f);

    const productId = pick(COMBUST_PRODUCTS, params.product, "petrol");
    const p = COMBUST_PRODUCTS[productId];

    return {
      material: indexIn(COMBUST_MATERIAL_ORDER, materialId),
      combustible: m.combustible,
      ignitionTemp: tidy(m.ignition),
      temperature,
      oxygen,
      hasFuel: m.combustible,
      hotEnough: m.combustible && temperature >= m.ignition ? 1 : 0,
      enoughAir: oxygen >= COMBUST_OXYGEN_MIN ? 1 : 0,
      missing,
      burning: missing === 0 ? 1 : 0,
      inflammable: m.combustible && m.ignition < COMBUST_ROOM ? 1 : 0,

      time,
      jar: indexIn(COMBUST_JAR_ORDER, jarId),
      jarVolume,
      jarOxygen: closed ? tidy(combustJarOxygen(jarVolume, time)) : COMBUST_OXYGEN_AIR,
      candleLit: !closed || time < burnTime ? 1 : 0,
      burnTime: tidy(burnTime),

      cup: indexIn(COMBUST_CUP_ORDER, cupId),
      cupTemp,
      cupBurning: cupTemp >= COMBUST_MATERIALS.paper.ignition ? 1 : 0,
      waterBoiling: cupId === "water" && cupTemp >= 100 ? 1 : 0,

      probeX: tidy(probeX),
      probeY,
      zone: combustFlameZone(probeX, probeY),

      fire: indexIn(COMBUST_FIRE_ORDER, fireId),
      agent: indexIn(COMBUST_AGENT_ORDER, agentId),
      fireOut: fight.out,
      sideRemoved: fight.side,
      waterSafe: COMBUST_FIRES[fireId].waterSafe,
      danger: fight.danger,

      fuel: indexIn(COMBUST_FUEL_ORDER, fuelId),
      calorific,
      calorificLow: f.low,
      calorificHigh: f.high,
      mass,
      heat: tidy(mass * calorific),
      fuelState: f.state,
      pollution: f.pollution,
      so2: f.so2,
      fossil: f.fossil,

      product: indexIn(COMBUST_PRODUCT_ORDER, productId),
      productSource: p.source,
      towerDepth: p.depth,
    };
  },

  getVariable(state, id) {
    return id === "time" ? state.time : undefined;
  },

  setVariable(state, id, value) {
    return id === "time" ? { time: clamp(value, 0, COMBUST_TIME_MAX) } : state;
  },
};

