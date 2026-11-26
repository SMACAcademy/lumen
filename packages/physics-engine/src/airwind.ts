import type { SimulationModel } from "@ise/science-engine";

/**
 * Air pressure, winds and storms for class 7 (and the air-pressure part of
 * class 8). Seven small benches share one model.
 *
 * Can: a tin can with some of its air pumped out. The air outside presses on
 * every side with 101.3 kPa; the air left inside presses back with its share
 * of that. The difference pushes the walls in, and this thin can gives way
 * once the outside wins by 20 kPa (a made-up strength for a thin can).
 *
 * Patch: the force of the air on a flat patch, F = p × A with
 * p = 101 325 Pa, and the mass whose weight is that force, m = F / g with
 * g = 9.8 m/s². On 1 m² that is 10 339 kg — about 10 tonnes.
 *
 * Bag: a 20 L paper bag of air warmed over a candle. At the same pressure
 * air's density is ρ = pM / (RT), so warm air is lighter than the room's
 * air (25 °C) and the bag is pushed up by the difference in weight of the
 * air it holds: lift = (ρ_room − ρ_bag) × V.
 *
 * Blow: air moving at speed v has its pressure lowered by ½ρv², with
 * ρ = 1.2 kg/m³ (Bernoulli's rule, met properly in class 11). Between two
 * balloons, over a paper strip, or over a roof of 20 m² that is held down as
 * firmly as a load of 600 kg. Taking the whole ½ρv² as the push on the roof
 * is a simplification.
 *
 * Wind: a warmer place has rising air and lower pressure at the ground. We
 * use a simple rule, stated in the lab: 0.1 kPa lower for each °C warmer.
 * Along the ground the wind blows from the cooler (higher-pressure) place to
 * the warmer (lower-pressure) one. Two maps: India's land against the sea
 * (the monsoon: wind from the sea brings rain), and the equator against the
 * poles.
 *
 * Cyclone: a cross-section of a cyclone whose centre pressure is ΔP below
 * the 101.3 kPa outside. The wind is calm at the centre, strongest at the eye
 * wall (15 km out), and dies away beyond it: v = v_max (r/15 km)⁴ inside,
 * v_max √(15 km / r) outside. The pressure follows from the balance between
 * the spinning air and the pressure pushing it inwards, dp/dr = ρv²/r, which
 * makes ΔP = 1.125 ρ v_max². The eye (calm, clear, lowest pressure) is the
 * inner 10 km. The Earth's spin is left out.
 *
 * Track: a cyclone heading for the coast at a steady speed. The time left is
 * distance ÷ speed. A cyclone alert (watch) goes out 48 hours ahead and a
 * cyclone warning 24 hours ahead.
 */

export type AirWindScene = "can" | "patch" | "bag" | "blow" | "wind" | "cyclone" | "track";
export const AIRWIND_SCENES: readonly AirWindScene[] = ["can", "patch", "bag", "blow", "wind", "cyclone", "track"];

export type AirWindSetup = "balloons" | "strip" | "roof";
export const AIRWIND_SETUPS: readonly AirWindSetup[] = ["balloons", "strip", "roof"];

export type AirWindMap = "monsoon" | "earth";
export const AIRWIND_MAPS: readonly AirWindMap[] = ["monsoon", "earth"];

/** Air pressure at sea level, Pa. */
export const AIRWIND_ATM = 101325;
/** g, m/s². */
export const AIRWIND_G = 9.8;
/** Density of moving air, kg/m³. */
export const AIRWIND_RHO = 1.2;
/** One side of the can is 10 cm × 10 cm, m². */
export const AIRWIND_CAN_SIDE = 0.01;
/** The thin can gives way when the outside wins by this much, kPa (made up). */
export const AIRWIND_CRUSH_KPA = 20;
/** Room temperature, °C. */
export const AIRWIND_ROOM = 25;
/** Molar mass of air (kg/mol) and the gas constant (J/(mol K)). */
export const AIRWIND_MOLAR_MASS = 0.02897;
export const AIRWIND_GAS_CONSTANT = 8.314;
/** The paper bag holds this much air, m³ (20 litres). */
export const AIRWIND_BAG_VOLUME = 0.02;
/** The roof: its area, m², and how firmly it is held down, as a load in kg. */
export const AIRWIND_ROOF = { area: 20, holdKg: 600 } as const;
/** A warmer place's pressure is this much lower for each °C, kPa (a simple rule). */
export const AIRWIND_HEAT_LOW = 0.1;
/** Less than this difference in warmth, °C, and the air is calm. */
export const AIRWIND_CALM = 0.5;
/** The cyclone: radius of the strongest winds, of the eye and of the storm clouds, km. */
export const AIRWIND_CYCLONE = { wall: 15, eye: 10, clouds: 150, inner: 4 } as const;
/** Hours ahead that a cyclone alert (watch) and a cyclone warning are issued. */
export const AIRWIND_ALERT_HOURS = 48;
export const AIRWIND_WARNING_HOURS = 24;

export const AIRWIND_LIMITS = {
  airInside: [0, 100],
  area: [0.01, 25],
  bagTemp: [0, 100],
  windSpeed: [0, 200],
  landLead: [-15, 15],
  equatorLead: [0, 60],
  centralDrop: [0.5, 7],
  distance: [0, 300],
  coastDistance: [0, 1000],
  stormSpeed: [5, 30],
} as const;

export type AirWindParams = {
  scene: AirWindScene;
  setup: AirWindSetup;
  map: AirWindMap;
};

export interface AirWindState {
  /** Share of the air left in the can, %. */
  readonly airInside: number;
  /** Area of the patch, m². */
  readonly area: number;
  /** Temperature of the air in the bag, °C. */
  readonly bagTemp: number;
  /** Speed of the moving air, km/h. */
  readonly windSpeed: number;
  /** How much warmer the land is than the sea, °C (below zero, cooler). */
  readonly landLead: number;
  /** How much warmer the equator is than the poles, °C. */
  readonly equatorLead: number;
  /** How far the cyclone's centre pressure is below the air outside, kPa. */
  readonly centralDrop: number;
  /** Distance from the cyclone's centre, km. */
  readonly distance: number;
  /** Distance of the cyclone from the coast, km. */
  readonly coastDistance: number;
  /** Speed the cyclone moves at, km/h. */
  readonly stormSpeed: number;
}

export type AirWindResults = {
  scene: number;
  setup: number;
  map: number;
  outsidePressure: number;
  airInside: number;
  insidePressure: number;
  pushDifference: number;
  forceOnSide: number;
  canCrushed: number;
  area: number;
  airForce: number;
  airForceKN: number;
  holdsUpKg: number;
  holdsUpTonnes: number;
  bagTemp: number;
  roomTemp: number;
  bagDensity: number;
  roomDensity: number;
  expandsBy: number;
  bagLift: number;
  bagMoves: number;
  windSpeed: number;
  windSpeedMs: number;
  pressureDrop: number;
  pressureBetween: number;
  drawnIn: number;
  upliftForce: number;
  upliftKg: number;
  roofLifts: number;
  liftOffSpeed: number;
  landLead: number;
  equatorLead: number;
  warmBy: number;
  warmPressure: number;
  coolPressure: number;
  pressureGap: number;
  windDirection: number;
  rain: number;
  centralDrop: number;
  distance: number;
  centrePressure: number;
  pressureHere: number;
  windHere: number;
  maxWind: number;
  inEye: number;
  region: number;
  coastDistance: number;
  stormSpeed: number;
  hoursToCoast: number;
  warning: number;
};

type Limit = readonly [number, number];
const clampTo = (value: number, [lo, hi]: Limit) => Math.min(hi, Math.max(lo, Number.isFinite(value) ? value : lo));
const tidy = (value: number, digits = 6) => Number(value.toFixed(digits)) || 0;

/** Density of air (kg/m³) at a temperature (°C) and sea-level pressure: ρ = pM / (RT). */
export function airWindDensity(celsius: number): number {
  return (AIRWIND_ATM * AIRWIND_MOLAR_MASS) / (AIRWIND_GAS_CONSTANT * (celsius + 273.15));
}

/** How much lower the pressure is in air moving at this speed (km/h), Pa: ½ρv². */
export function airWindPressureDrop(kmh: number): number {
  const v = Math.max(0, kmh) / 3.6;
  return 0.5 * AIRWIND_RHO * v * v;
}

/** The slowest wind (km/h) that lifts the roof: ½ρv² × area = holding load × g. */
export function airWindLiftOffSpeed(): number {
  return Math.sqrt((2 * AIRWIND_ROOF.holdKg * AIRWIND_G) / (AIRWIND_RHO * AIRWIND_ROOF.area)) * 3.6;
}

/** Strongest wind (km/h) of a cyclone whose centre is `dropKPa` below the air outside: ΔP = 1.125 ρ v_max². */
export function airWindMaxWind(dropKPa: number): number {
  const factor = 1 + 1 / (2 * AIRWIND_CYCLONE.inner);
  return Math.sqrt((Math.max(0, dropKPa) * 1000) / (factor * AIRWIND_RHO)) * 3.6;
}

/** Wind (km/h) and pressure (kPa) at `km` from the centre of a cyclone `dropKPa` deep. */
export function airWindCyclone(dropKPa: number, km: number): { wind: number; pressure: number } {
  const { wall, inner } = AIRWIND_CYCLONE;
  const vmax = airWindMaxWind(dropKPa) / 3.6;
  const r = Math.max(0, km);
  const inside = r <= wall;
  const wind = inside ? vmax * (r / wall) ** inner : vmax * Math.sqrt(wall / r);
  // dp/dr = ρv²/r, from the centre outwards.
  const share = inside ? (r / wall) ** (2 * inner) / (2 * inner) : 1 / (2 * inner) + 1 - wall / r;
  const centre = AIRWIND_ATM / 1000 - Math.max(0, dropKPa);
  return { wind: wind * 3.6, pressure: centre + (AIRWIND_RHO * vmax * vmax * share) / 1000 };
}

/** 0 no alert yet, 1 cyclone alert (watch), 2 cyclone warning, 3 at the coast. */
export function airWindWarning(km: number, kmh: number): number {
  if (km < 1) return 3;
  const hours = km / kmh;
  return hours <= AIRWIND_WARNING_HOURS ? 2 : hours <= AIRWIND_ALERT_HOURS ? 1 : 0;
}

const OUTPUTS = [
  "scene",
  "setup",
  "map",
  "outsidePressure",
  "airInside",
  "insidePressure",
  "pushDifference",
  "forceOnSide",
  "canCrushed",
  "area",
  "airForce",
  "airForceKN",
  "holdsUpKg",
  "holdsUpTonnes",
  "bagTemp",
  "roomTemp",
  "bagDensity",
  "roomDensity",
  "expandsBy",
  "bagLift",
  "bagMoves",
  "windSpeed",
  "windSpeedMs",
  "pressureDrop",
  "pressureBetween",
  "drawnIn",
  "upliftForce",
  "upliftKg",
  "roofLifts",
  "liftOffSpeed",
  "landLead",
  "equatorLead",
  "warmBy",
  "warmPressure",
  "coolPressure",
  "pressureGap",
  "windDirection",
  "rain",
  "centralDrop",
  "distance",
  "centrePressure",
  "pressureHere",
  "windHere",
  "maxWind",
  "inEye",
  "region",
  "coastDistance",
  "stormSpeed",
  "hoursToCoast",
  "warning",
] as const satisfies readonly (keyof AirWindResults)[];

type StateKey = keyof AirWindState;
const STATE_KEYS: readonly StateKey[] = [
  "airInside",
  "area",
  "bagTemp",
  "windSpeed",
  "landLead",
  "equatorLead",
  "centralDrop",
  "distance",
  "coastDistance",
  "stormSpeed",
];
const isStateKey = (id: string): id is StateKey => (STATE_KEYS as readonly string[]).includes(id);

/** Hours of the cyclone's journey shown per real second of Play. */
const TRACK_HOURS_PER_SECOND = 4;

/** The variable each scene's step buttons move, and by how much. */
const STEPS: Record<AirWindScene, [StateKey, number]> = {
  can: ["airInside", 5],
  patch: ["area", 0.01],
  bag: ["bagTemp", 5],
  blow: ["windSpeed", 10],
  wind: ["landLead", 1],
  cyclone: ["distance", 5],
  track: ["coastDistance", 20],
};

export const airWindModel: SimulationModel<AirWindState, AirWindParams, AirWindResults> = {
  id: "airwind",
  defaultParams: { scene: "can", setup: "balloons", map: "monsoon" },
  outputs: OUTPUTS,
  stateVariables: STATE_KEYS,

  initialize() {
    return {
      airInside: 100,
      area: 1,
      bagTemp: 25,
      windSpeed: 36,
      landLead: 10,
      equatorLead: 30,
      centralDrop: 5,
      distance: 100,
      coastDistance: 600,
      stormSpeed: 15,
    };
  },

  /** Play: pump the can, warm the bag, blow harder, warm the land, fly into the storm, or let it travel. */
  advance(state, dt, params) {
    const move = (key: StateKey, by: number) => ({ ...state, [key]: clampTo(state[key] + by, AIRWIND_LIMITS[key]) });
    switch (params.scene) {
      case "can":
        return move("airInside", -10 * dt);
      case "bag":
        return move("bagTemp", 10 * dt);
      case "blow":
        return move("windSpeed", 20 * dt);
      case "wind":
        return params.map === "earth" ? move("equatorLead", 5 * dt) : move("landLead", 2 * dt);
      case "cyclone":
        return move("distance", -20 * dt);
      case "track":
        return move("coastDistance", -state.stormSpeed * TRACK_HOURS_PER_SECOND * dt);
      default:
        return state;
    }
  },

  step(state, params, sign) {
    const [baseKey, size] = STEPS[params.scene] ?? STEPS.can;
    const key = params.scene === "wind" && params.map === "earth" ? "equatorLead" : baseKey;
    const by = key === "equatorLead" ? 5 : size;
    const snapped = Math.round(state[key] / by) * by;
    return { ...state, [key]: clampTo(tidy(snapped + sign * by, 4), AIRWIND_LIMITS[key]) };
  },

  derive(state, params) {
    const s = Object.fromEntries(STATE_KEYS.map((k) => [k, clampTo(state[k], AIRWIND_LIMITS[k])])) as Record<StateKey, number>;
    const atmKPa = AIRWIND_ATM / 1000;

    // Can.
    const inside = (atmKPa * s.airInside) / 100;
    const push = atmKPa - inside;

    // Patch.
    const airForce = AIRWIND_ATM * s.area;
    const holdsUpKg = airForce / AIRWIND_G;

    // Bag.
    const bagDensity = airWindDensity(s.bagTemp);
    const roomDensity = airWindDensity(AIRWIND_ROOM);
    const bagLift = (roomDensity - bagDensity) * AIRWIND_BAG_VOLUME * 1000;

    // Blow.
    const drop = airWindPressureDrop(s.windSpeed);
    const uplift = drop * AIRWIND_ROOF.area;

    // Wind.
    const map = AIRWIND_MAPS.includes(params.map) ? params.map : "monsoon";
    const lead = map === "earth" ? s.equatorLead : s.landLead;
    const warmBy = Math.abs(lead);
    const gap = AIRWIND_HEAT_LOW * warmBy;
    const windDirection = warmBy < AIRWIND_CALM ? 0 : lead > 0 ? 1 : -1;

    // Cyclone.
    const here = airWindCyclone(s.centralDrop, s.distance);

    return {
      scene: Math.max(0, AIRWIND_SCENES.indexOf(params.scene)),
      setup: Math.max(0, AIRWIND_SETUPS.indexOf(params.setup)),
      map: Math.max(0, AIRWIND_MAPS.indexOf(map)),
      outsidePressure: atmKPa,
      airInside: s.airInside,
      insidePressure: tidy(inside),
      pushDifference: tidy(push),
      forceOnSide: tidy(push * 1000 * AIRWIND_CAN_SIDE),
      canCrushed: push >= AIRWIND_CRUSH_KPA ? 1 : 0,
      area: s.area,
      airForce: tidy(airForce),
      airForceKN: tidy(airForce / 1000),
      holdsUpKg: tidy(holdsUpKg),
      holdsUpTonnes: tidy(holdsUpKg / 1000),
      bagTemp: s.bagTemp,
      roomTemp: AIRWIND_ROOM,
      bagDensity: tidy(bagDensity),
      roomDensity: tidy(roomDensity),
      expandsBy: tidy(((s.bagTemp - AIRWIND_ROOM) / (AIRWIND_ROOM + 273.15)) * 100),
      bagLift: tidy(bagLift),
      bagMoves: Math.abs(bagLift) < 0.05 ? 0 : bagLift > 0 ? 1 : -1,
      windSpeed: s.windSpeed,
      windSpeedMs: tidy(s.windSpeed / 3.6),
      pressureDrop: tidy(drop),
      pressureBetween: tidy(atmKPa - drop / 1000),
      drawnIn: drop > 0.5 ? 1 : 0,
      upliftForce: tidy(uplift),
      upliftKg: tidy(uplift / AIRWIND_G),
      roofLifts: uplift > AIRWIND_ROOF.holdKg * AIRWIND_G ? 1 : 0,
      liftOffSpeed: tidy(airWindLiftOffSpeed()),
      landLead: s.landLead,
      equatorLead: s.equatorLead,
      warmBy,
      warmPressure: tidy(atmKPa - gap),
      coolPressure: atmKPa,
      pressureGap: tidy(gap),
      windDirection,
      rain: map === "monsoon" && windDirection === 1 ? 1 : 0,
      centralDrop: s.centralDrop,
      distance: s.distance,
      centrePressure: tidy(atmKPa - s.centralDrop),
      pressureHere: tidy(here.pressure),
      windHere: tidy(here.wind),
      maxWind: tidy(airWindMaxWind(s.centralDrop)),
      inEye: s.distance < AIRWIND_CYCLONE.eye ? 1 : 0,
      region: s.distance < AIRWIND_CYCLONE.eye ? 0 : s.distance <= AIRWIND_CYCLONE.clouds ? 1 : 2,
      coastDistance: s.coastDistance,
      stormSpeed: s.stormSpeed,
      hoursToCoast: tidy(s.coastDistance / s.stormSpeed),
      warning: airWindWarning(s.coastDistance, s.stormSpeed),
    };
  },

  getVariable(state, id) {
    return isStateKey(id) ? state[id] : undefined;
  },

  setVariable(state, id, value) {
    return isStateKey(id) ? { ...state, [id]: clampTo(value, AIRWIND_LIMITS[id]) } : state;
  },
};
