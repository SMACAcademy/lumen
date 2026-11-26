import type { SimulationModel } from "@ise/science-engine";

/**
 * Heat for class 7: hot and cold, thermometers, the three ways heat travels,
 * and the breezes at the seaside. Six small benches share one model.
 *
 * Touch: one hand has been in hot water and one in cold, then both go into
 * the same middle bowl. Each hand only feels whether the water is hotter or
 * colder than itself, so the two hands disagree.
 *
 * Thermometers: a clinical thermometer reads 35–42 °C in steps of 0.1 °C and
 * has a kink that stops the mercury falling back, so it keeps its reading when
 * taken out; a laboratory thermometer reads −10 to 110 °C in steps of 1 °C
 * and falls back to the room's temperature when taken out.
 *
 * Conduction: one end of a rod is held in a flame and pins are stuck along it
 * with wax. The temperature along the rod follows the textbook result for
 * heat soaking into a long bar, T = T₀ + (T_end − T₀) erfc(x / 2√(αt)), with
 * each material's real thermal diffusivity α. A pin drops when its wax
 * reaches 60 °C. Simplifications, stated in the lab: the hot end stays at
 * 200 °C, and no heat is lost from the rod to the air.
 *
 * Convection and radiation are drawn qualitatively. The water in the beaker
 * warms at a steady made-up rate; the two cans in the sun warm towards a
 * steady temperature, the black can (absorbing 90% of the sunlight) far more
 * than the white one (20%).
 *
 * Sea and land: over a day the land's temperature swings 8 °C either side of
 * 28 °C and the sea's only 1 °C, both warmest at 2 pm. The breeze blows from
 * the cooler surface to the warmer one, where the air is rising.
 */

export type SchoolHeatScene = "touch" | "thermometer" | "conduction" | "convection" | "radiation" | "breeze";
export const SCHOOLHEAT_SCENES: readonly SchoolHeatScene[] = ["touch", "thermometer", "conduction", "convection", "radiation", "breeze"];

export type SchoolHeatThermometer = "clinical" | "laboratory";
export const SCHOOLHEAT_THERMOMETER_ORDER: readonly SchoolHeatThermometer[] = ["clinical", "laboratory"];
export const SCHOOLHEAT_THERMOMETERS: Record<SchoolHeatThermometer, { label: string; min: number; max: number; leastCount: number }> = {
  clinical: { label: "Clinical", min: 35, max: 42, leastCount: 0.1 },
  laboratory: { label: "Laboratory", min: -10, max: 110, leastCount: 1 },
};

export type SchoolHeatMaterial = "copper" | "aluminium" | "iron" | "steel" | "glass" | "wood" | "plastic";
export const SCHOOLHEAT_MATERIAL_ORDER: readonly SchoolHeatMaterial[] = ["copper", "aluminium", "iron", "steel", "glass", "wood", "plastic"];
/** Thermal diffusivity α (m²/s): how fast heat soaks along the material. Metals are good conductors. */
export const SCHOOLHEAT_MATERIALS: Record<SchoolHeatMaterial, { label: string; diffusivity: number; metal: boolean }> = {
  copper: { label: "Copper", diffusivity: 1.11e-4, metal: true },
  aluminium: { label: "Aluminium", diffusivity: 9.7e-5, metal: true },
  iron: { label: "Iron", diffusivity: 2.3e-5, metal: true },
  steel: { label: "Stainless steel", diffusivity: 4.2e-6, metal: true },
  glass: { label: "Glass", diffusivity: 3.4e-7, metal: false },
  wood: { label: "Wood", diffusivity: 1.3e-7, metal: false },
  plastic: { label: "Plastic", diffusivity: 1.1e-7, metal: false },
};

/** Room temperature, °C. */
export const SCHOOLHEAT_ROOM = 25;
/** Normal human body temperature, °C. */
export const SCHOOLHEAT_BODY = 37;
/** The rod's end in the flame is held at this, °C. */
export const SCHOOLHEAT_FLAME_END = 200;
/** Candle wax softens and lets go of a pin at this, °C. */
export const SCHOOLHEAT_WAX_MELTS = 60;
/** Where the pins are stuck, cm from the hot end. */
export const SCHOOLHEAT_PINS: readonly number[] = [3, 6, 9, 12, 15];
/** A hand can tell water is warmer or colder than itself only beyond this difference, °C. */
export const SCHOOLHEAT_FEEL_GAP = 1;
/** The burner warms the beaker by this much each minute, °C/min (made up, to show the water warming). */
export const SCHOOLHEAT_WATER_RATE = 7.5;
/** Minutes for the purple streak to go once round the beaker (made up). */
export const SCHOOLHEAT_STREAK_LOOP = 2;
/** How much of the sunlight each can absorbs, and how far full sunlight would warm the water, °C. */
export const SCHOOLHEAT_ABSORB = { black: 0.9, white: 0.2 } as const;
export const SCHOOLHEAT_SUN_RISE = 20;
/** Minutes for a can in the sun to get most of the way to its steady temperature. */
export const SCHOOLHEAT_SUN_TAU = 20;
/** Land and sea over a day: mean, swing either side, and the warmest hour. */
export const SCHOOLHEAT_DAY = { mean: 28, landSwing: 8, seaSwing: 1, warmestHour: 14 } as const;
/** Less than this temperature difference between land and sea, °C, and the air is calm. */
export const SCHOOLHEAT_CALM = 0.5;

export const SCHOOLHEAT_LIMITS = {
  bowlTemp: [10, 50],
  temperature: [-15, 115],
  heatTime: [0, 10],
  sunTime: [0, 60],
  hour: [0, 24],
} as const;

export type SchoolHeatParams = {
  scene: SchoolHeatScene;
  /** Temperature of the water the left hand was in before, °C. */
  leftHand: number;
  /** Temperature of the water the right hand was in before, °C. */
  rightHand: number;
  thermometer: SchoolHeatThermometer;
  /** 0 while the thermometer is in place, 1 once it has been taken out. */
  takenOut: number;
  material: SchoolHeatMaterial;
};

export interface SchoolHeatState {
  /** The middle bowl, °C. */
  readonly bowlTemp: number;
  /** What the thermometer is measuring, °C. */
  readonly temperature: number;
  /** Minutes since the flame was lit under the rod or the beaker. */
  readonly heatTime: number;
  /** Minutes the two cans have been in the sun. */
  readonly sunTime: number;
  /** Hour of the day at the seaside, 0–24. */
  readonly hour: number;
}

export type SchoolHeatResults = {
  scene: number;
  bowlTemp: number;
  leftHand: number;
  rightHand: number;
  leftFeels: number;
  rightFeels: number;
  handsAgree: number;
  temperature: number;
  thermometer: number;
  takenOut: number;
  reading: number;
  scaleMin: number;
  scaleMax: number;
  leastCount: number;
  outOfRange: number;
  vsNormal: number;
  material: number;
  heatTime: number;
  pinsFallen: number;
  farTemp: number;
  goodConductor: number;
  waterTemp: number;
  streak: number;
  sunTime: number;
  blackCanTemp: number;
  whiteCanTemp: number;
  canDifference: number;
  needsMedium: number;
  hour: number;
  landTemp: number;
  seaTemp: number;
  landLead: number;
  breeze: number;
  daytime: number;
};

const clampTo = (value: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, Number.isFinite(value) ? value : lo));
const tidy = (value: number, digits = 6) => Number(value.toFixed(digits)) || 0;

/** erfc(x) for x ≥ 0 (Abramowitz and Stegun 7.1.26, good to about 10⁻⁷). */
function complementaryError(x: number): number {
  const t = 1 / (1 + 0.3275911 * x);
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  return poly * Math.exp(-x * x);
}

/** Temperature (°C) x cm along a rod of this material, `minutes` after its end went into the flame. */
export function schoolHeatRodTemp(material: SchoolHeatMaterial, x: number, minutes: number): number {
  const alpha = (SCHOOLHEAT_MATERIALS[material] ?? SCHOOLHEAT_MATERIALS.copper).diffusivity;
  if (x <= 0) return SCHOOLHEAT_FLAME_END;
  const seconds = minutes * 60;
  if (seconds <= 0) return SCHOOLHEAT_ROOM;
  const u = x / 100 / (2 * Math.sqrt(alpha * seconds));
  return SCHOOLHEAT_ROOM + (SCHOOLHEAT_FLAME_END - SCHOOLHEAT_ROOM) * complementaryError(u);
}

/** How many of the five pins have dropped off. */
export function schoolHeatPinsFallen(material: SchoolHeatMaterial, minutes: number): number {
  return SCHOOLHEAT_PINS.filter((x) => schoolHeatRodTemp(material, x, minutes) >= SCHOOLHEAT_WAX_MELTS).length;
}

/** −1 colder than the hand, 0 the same, 1 warmer. */
export function schoolHeatFeel(water: number, hand: number): number {
  const gap = water - hand;
  return Math.abs(gap) <= SCHOOLHEAT_FEEL_GAP ? 0 : gap > 0 ? 1 : -1;
}

/** Water temperature (°C) in a can of this colour after `minutes` in the sun. */
export function schoolHeatCanTemp(colour: keyof typeof SCHOOLHEAT_ABSORB, minutes: number): number {
  return SCHOOLHEAT_ROOM + SCHOOLHEAT_ABSORB[colour] * SCHOOLHEAT_SUN_RISE * (1 - Math.exp(-Math.max(0, minutes) / SCHOOLHEAT_SUN_TAU));
}

/** Land and sea temperatures (°C) at an hour of the day. */
export function schoolHeatDay(hour: number): { land: number; sea: number } {
  const phase = Math.cos((2 * Math.PI * (hour - SCHOOLHEAT_DAY.warmestHour)) / 24);
  return { land: SCHOOLHEAT_DAY.mean + SCHOOLHEAT_DAY.landSwing * phase, sea: SCHOOLHEAT_DAY.mean + SCHOOLHEAT_DAY.seaSwing * phase };
}

/** What a thermometer shows: the value snapped to its least count, held by the kink or fallen back to the room. */
export function schoolHeatReading(kind: SchoolHeatThermometer, temperature: number, takenOut: boolean) {
  const spec = SCHOOLHEAT_THERMOMETERS[kind] ?? SCHOOLHEAT_THERMOMETERS.clinical;
  // A clinical thermometer's kink holds the mercury; a laboratory one falls back to the room.
  const shown = takenOut && kind === "laboratory" ? SCHOOLHEAT_ROOM : temperature;
  const clamped = Math.min(spec.max, Math.max(spec.min, shown));
  const reading = tidy(Math.round(clamped / spec.leastCount) * spec.leastCount, 1);
  return { reading, outOfRange: shown < spec.min || shown > spec.max ? 1 : 0, spec };
}

const OUTPUTS = [
  "scene",
  "bowlTemp",
  "leftHand",
  "rightHand",
  "leftFeels",
  "rightFeels",
  "handsAgree",
  "temperature",
  "thermometer",
  "takenOut",
  "reading",
  "scaleMin",
  "scaleMax",
  "leastCount",
  "outOfRange",
  "vsNormal",
  "material",
  "heatTime",
  "pinsFallen",
  "farTemp",
  "goodConductor",
  "waterTemp",
  "streak",
  "sunTime",
  "blackCanTemp",
  "whiteCanTemp",
  "canDifference",
  "needsMedium",
  "hour",
  "landTemp",
  "seaTemp",
  "landLead",
  "breeze",
  "daytime",
] as const satisfies readonly (keyof SchoolHeatResults)[];

/** Play speeds: minutes of heating, minutes in the sun and hours of the day, per real second. */
const HEAT_RATE = 0.5;
const SUN_RATE = 3;
const HOUR_RATE = 1;

export const schoolHeatModel: SimulationModel<SchoolHeatState, SchoolHeatParams, SchoolHeatResults> = {
  id: "schoolheat",
  defaultParams: { scene: "touch", leftHand: 45, rightHand: 10, thermometer: "clinical", takenOut: 0, material: "copper" },
  outputs: OUTPUTS,
  stateVariables: ["bowlTemp", "temperature", "heatTime", "sunTime", "hour"],

  initialize() {
    return { bowlTemp: 27, temperature: 37, heatTime: 0, sunTime: 0, hour: 10 };
  },

  /** Play runs the scene's clock: the flame, the sun, or the hours of the day. */
  advance(state, dt, params) {
    switch (params.scene) {
      case "conduction":
      case "convection":
        return { ...state, heatTime: clampTo(state.heatTime + HEAT_RATE * dt, SCHOOLHEAT_LIMITS.heatTime) };
      case "radiation":
        return { ...state, sunTime: clampTo(state.sunTime + SUN_RATE * dt, SCHOOLHEAT_LIMITS.sunTime) };
      case "breeze": {
        const next = state.hour + HOUR_RATE * dt;
        return { ...state, hour: next >= 24 ? next - 24 : next };
      }
      default:
        return state;
    }
  },

  step(state, params, sign) {
    switch (params.scene) {
      case "touch":
        return { ...state, bowlTemp: clampTo(Math.round(state.bowlTemp) + sign, SCHOOLHEAT_LIMITS.bowlTemp) };
      case "thermometer":
        return { ...state, temperature: clampTo(tidy(Math.round(state.temperature * 10) / 10 + sign * 0.1, 1), SCHOOLHEAT_LIMITS.temperature) };
      case "conduction":
      case "convection":
        return { ...state, heatTime: clampTo(tidy(Math.round(state.heatTime * 2) / 2 + sign * 0.5, 1), SCHOOLHEAT_LIMITS.heatTime) };
      case "radiation":
        return { ...state, sunTime: clampTo(Math.round(state.sunTime / 5) * 5 + sign * 5, SCHOOLHEAT_LIMITS.sunTime) };
      default:
        return { ...state, hour: clampTo(Math.round(state.hour) + sign, SCHOOLHEAT_LIMITS.hour) };
    }
  },

  derive(state, params) {
    const scene = Math.max(0, SCHOOLHEAT_SCENES.indexOf(params.scene));
    const bowlTemp = clampTo(state.bowlTemp, SCHOOLHEAT_LIMITS.bowlTemp);
    const leftFeels = schoolHeatFeel(bowlTemp, params.leftHand);
    const rightFeels = schoolHeatFeel(bowlTemp, params.rightHand);

    const kind = SCHOOLHEAT_THERMOMETERS[params.thermometer] ? params.thermometer : "clinical";
    const temperature = clampTo(state.temperature, SCHOOLHEAT_LIMITS.temperature);
    const { reading, outOfRange, spec } = schoolHeatReading(kind, temperature, params.takenOut >= 0.5);
    const tenths = Math.round(reading * 10) - SCHOOLHEAT_BODY * 10;

    const material = SCHOOLHEAT_MATERIALS[params.material] ? params.material : "copper";
    const heatTime = clampTo(state.heatTime, SCHOOLHEAT_LIMITS.heatTime);
    const sunTime = clampTo(state.sunTime, SCHOOLHEAT_LIMITS.sunTime);
    const black = schoolHeatCanTemp("black", sunTime);
    const white = schoolHeatCanTemp("white", sunTime);

    const hour = clampTo(state.hour, SCHOOLHEAT_LIMITS.hour);
    const { land, sea } = schoolHeatDay(hour);
    const lead = land - sea;

    return {
      scene,
      bowlTemp,
      leftHand: params.leftHand,
      rightHand: params.rightHand,
      leftFeels,
      rightFeels,
      handsAgree: leftFeels === rightFeels ? 1 : 0,
      temperature,
      thermometer: Math.max(0, SCHOOLHEAT_THERMOMETER_ORDER.indexOf(kind)),
      takenOut: params.takenOut >= 0.5 ? 1 : 0,
      reading,
      scaleMin: spec.min,
      scaleMax: spec.max,
      leastCount: spec.leastCount,
      outOfRange,
      vsNormal: tenths > 0 ? 1 : tenths < 0 ? -1 : 0,
      material: Math.max(0, SCHOOLHEAT_MATERIAL_ORDER.indexOf(material)),
      heatTime,
      pinsFallen: schoolHeatPinsFallen(material, heatTime),
      farTemp: tidy(schoolHeatRodTemp(material, SCHOOLHEAT_PINS[SCHOOLHEAT_PINS.length - 1]!, heatTime)),
      goodConductor: SCHOOLHEAT_MATERIALS[material].metal ? 1 : 0,
      waterTemp: tidy(Math.min(100, SCHOOLHEAT_ROOM + SCHOOLHEAT_WATER_RATE * heatTime)),
      streak: tidy(Math.min(1, heatTime / SCHOOLHEAT_STREAK_LOOP)),
      sunTime,
      blackCanTemp: tidy(black),
      whiteCanTemp: tidy(white),
      canDifference: tidy(black - white),
      needsMedium: params.scene === "radiation" ? 0 : 1,
      hour,
      landTemp: tidy(land),
      seaTemp: tidy(sea),
      landLead: tidy(lead),
      breeze: Math.abs(lead) <= SCHOOLHEAT_CALM ? 0 : lead > 0 ? 1 : -1,
      daytime: hour >= 6 && hour < 18 ? 1 : 0,
    };
  },

  getVariable(state, id) {
    switch (id) {
      case "bowlTemp":
      case "temperature":
      case "heatTime":
      case "sunTime":
      case "hour":
        return state[id];
      default:
        return undefined;
    }
  },

  setVariable(state, id, value) {
    switch (id) {
      case "bowlTemp":
      case "temperature":
      case "heatTime":
      case "sunTime":
      case "hour":
        return { ...state, [id]: clampTo(value, SCHOOLHEAT_LIMITS[id]) };
      default:
        return state;
    }
  },
};
