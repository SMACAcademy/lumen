import type { SimulationModel } from "@ise/science-engine";

/**
 * Work and power for class 9, in four small scenes.
 *
 * Work: a steady force F acts on something that moves a distance s. Along the
 * motion it does work W = F × s (positive). Against the motion, like friction
 * on a sliding box, W = −F × s (negative). At right angles to the motion, like
 * the upward force holding a bag carried along a level road, W = 0. And if
 * nothing moves (s = 0) — pushing a wall, holding a bag still — W = 0 too.
 * 1 joule = 1 newton × 1 metre.
 *
 * Lift: raising a mass m through a height h at a steady speed takes a force
 * equal to its weight m g, so the work done is W = m g h, with g = 9.8 m/s².
 *
 * Power: two climbers of the same mass go up the same stairs, A in tA seconds
 * and B in tB. Each does the same work m g h, but at different powers:
 * P = W / t (the average power over the climb), in watts, 1 W = 1 J/s.
 *
 * Bill: an appliance of power P (W) is on for some hours a day, for some days.
 * Energy used, in kilowatt hours, = P (kW) × time (h); 1 kWh = 1000 W × 3600 s
 * = 3.6 × 10⁶ J, and one kWh is one "unit" on the electricity bill.
 */

export type SwDirection = "along" | "against" | "across";

export const SW_DIRECTION_ORDER: readonly SwDirection[] = ["along", "against", "across"];

/** cos θ for each direction: the share of the force that acts along the motion. */
export const SW_ALIGNMENT: Record<SwDirection, number> = { along: 1, against: -1, across: 0 };

/** Acceleration due to gravity, m/s². */
export const SW_G = 9.8;
/** Joules in one kilowatt hour: 1000 W × 3600 s. */
export const SW_JOULES_PER_KWH = 3.6e6;
/** How fast the box moves when Play is pressed, m/s. */
export const SW_PUSH_SPEED = 1;
/** How fast the load rises when Play is pressed, m/s. */
export const SW_LIFT_SPEED = 0.5;

export const SW_MAX_FORCE = 100;
export const SW_MAX_DISTANCE = 20;
export const SW_MIN_MASS = 1;
export const SW_MAX_MASS = 100;
export const SW_MAX_HEIGHT = 20;
export const SW_MIN_TIME = 1;
export const SW_MAX_TIME = 60;
export const SW_MIN_APPLIANCE = 5;
export const SW_MAX_APPLIANCE = 3000;
export const SW_MIN_HOURS = 0.5;
export const SW_MAX_HOURS = 24;
export const SW_MAX_DAYS = 31;
export const SW_MIN_RATE = 1;
export const SW_MAX_RATE = 20;
/** The model stops its clock here, s. */
export const SW_MAX_T = 120;

export type SchoolWorkParams = {
  /** The steady force, N. */
  force: number;
  /** Which way the force acts compared with the motion. */
  direction: SwDirection;
  /** How far the object moves, m. */
  distance: number;
  /** The mass lifted: a load, or a climber's own body, kg. */
  mass: number;
  /** The height it is raised, m. */
  height: number;
  /** Climber A's time to the top, s. */
  timeA: number;
  /** Climber B's time to the top, s. */
  timeB: number;
  /** The appliance's power rating, W. */
  appliance: number;
  /** Hours it is on each day. */
  hours: number;
  /** Number of days. */
  days: number;
  /** Price of one unit (1 kWh), rupees. */
  rate: number;
};

export interface SchoolWorkState {
  /** Time since Play was pressed, s. */
  readonly t: number;
}

export type SchoolWorkResults = {
  force: number;
  /** 0 along, 1 against, 2 across. */
  direction: number;
  /** cos θ: 1 along, −1 against, 0 across. */
  alignment: number;
  distance: number;
  /** Work done by the force over the whole distance, J. */
  work: number;
  workSize: number;
  /** 1 positive, 0 zero, −1 negative. */
  workSign: number;
  /** How far the object has moved so far, m. */
  moved: number;
  /** Work done so far, J. */
  workSoFar: number;
  /** 1 once the object has moved the whole distance. */
  pushDone: number;
  mass: number;
  height: number;
  /** m g, N. */
  weight: number;
  /** m g h, J: the work to lift the mass (the load, or each climber). */
  liftWork: number;
  /** How high the load has risen so far, m. */
  liftNow: number;
  liftWorkSoFar: number;
  timeA: number;
  timeB: number;
  /** Average power of A and of B, W. */
  powerA: number;
  powerB: number;
  powerAkW: number;
  powerBkW: number;
  /** A's power ÷ B's power. */
  powerRatio: number;
  /** 1 if A has more power, −1 if B does, 0 if they are equal. */
  morePower: number;
  /** How high each climber is now, m. */
  climbA: number;
  climbB: number;
  aDone: number;
  bDone: number;
  appliance: number;
  applianceKW: number;
  hours: number;
  days: number;
  /** Hours on, over all the days. */
  totalHours: number;
  rate: number;
  /** Units (kWh) used each day. */
  dailyKWh: number;
  /** Units (kWh) used over all the days. */
  energyKWh: number;
  /** The same energy in joules. */
  energyJ: number;
  /** The bill, rupees. */
  cost: number;
  t: number;
};

const finite = (x: number, fallback = 0) => (Number.isFinite(x) ? x : fallback);
const clampTo = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, finite(Number(x), lo)));
const clean = (x: number) => (Math.abs(x) < 1e-12 ? 0 : x) || 0;
const sign = (x: number) => (x > 1e-12 ? 1 : x < -1e-12 ? -1 : 0);

/** Work done by a steady force F over a distance s, J: F s along, −F s against, 0 across. */
export function swWork(force: number, distance: number, direction: SwDirection): number {
  return clean((SW_ALIGNMENT[direction] ?? 1) * Math.max(0, force) * Math.max(0, distance));
}

/** Work done lifting a mass m through h at a steady speed, J: m g h. */
export function swLiftWork(mass: number, height: number, g = SW_G): number {
  return Math.max(0, mass) * g * Math.max(0, height);
}

/** Average power, W: work ÷ time. */
export function swPower(work: number, time: number): number {
  return time > 0 ? work / time : 0;
}

/** Energy used by an appliance of `watts` for `hours`, in kWh (units). */
export function swUnits(watts: number, hours: number): number {
  return (Math.max(0, watts) * Math.max(0, hours)) / 1000;
}

const OUTPUTS = [
  "force", "direction", "alignment", "distance", "work", "workSize", "workSign", "moved", "workSoFar", "pushDone",
  "mass", "height", "weight", "liftWork", "liftNow", "liftWorkSoFar",
  "timeA", "timeB", "powerA", "powerB", "powerAkW", "powerBkW", "powerRatio", "morePower", "climbA", "climbB", "aDone", "bDone",
  "appliance", "applianceKW", "hours", "days", "totalHours", "rate", "dailyKWh", "energyKWh", "energyJ", "cost", "t",
] as const satisfies readonly (keyof SchoolWorkResults)[];

/** The params, each clamped to its control's range. */
function tidy(params: SchoolWorkParams) {
  const direction: SwDirection = SW_DIRECTION_ORDER.includes(params.direction) ? params.direction : "along";
  return {
    force: clampTo(params.force, 0, SW_MAX_FORCE),
    direction,
    distance: clampTo(params.distance, 0, SW_MAX_DISTANCE),
    mass: clampTo(params.mass, SW_MIN_MASS, SW_MAX_MASS),
    height: clampTo(params.height, 0, SW_MAX_HEIGHT),
    timeA: clampTo(params.timeA, SW_MIN_TIME, SW_MAX_TIME),
    timeB: clampTo(params.timeB, SW_MIN_TIME, SW_MAX_TIME),
    appliance: clampTo(params.appliance, SW_MIN_APPLIANCE, SW_MAX_APPLIANCE),
    hours: clampTo(params.hours, SW_MIN_HOURS, SW_MAX_HOURS),
    days: clampTo(params.days, 1, SW_MAX_DAYS),
    rate: clampTo(params.rate, SW_MIN_RATE, SW_MAX_RATE),
  };
}

export const schoolWorkModel: SimulationModel<SchoolWorkState, SchoolWorkParams, SchoolWorkResults> = {
  id: "schoolwork",
  defaultParams: {
    force: 5,
    direction: "along",
    distance: 2,
    mass: 50,
    height: 3,
    timeA: 5,
    timeB: 15,
    appliance: 100,
    hours: 10,
    days: 1,
    rate: 5,
  },
  outputs: OUTPUTS,
  stateVariables: ["t"],

  initialize() {
    return { t: 0 };
  },

  /** Play: the box moves, the load rises, and the climbers go up the stairs. */
  advance(state, dt) {
    if (!(dt > 0)) return state;
    return { t: Math.min(SW_MAX_T, Math.max(0, finite(state.t)) + dt) };
  },

  step(state, _params, sign) {
    return { t: clampTo(Math.round(state.t) + sign, 0, SW_MAX_T) };
  },

  derive(state, params) {
    const p = tidy(params);
    const t = clampTo(state.t, 0, SW_MAX_T);
    const alignment = SW_ALIGNMENT[p.direction];

    const work = swWork(p.force, p.distance, p.direction);
    const moved = Math.min(p.distance, SW_PUSH_SPEED * t);

    const weight = p.mass * SW_G;
    const liftWork = swLiftWork(p.mass, p.height);
    const liftNow = Math.min(p.height, SW_LIFT_SPEED * t);

    const powerA = swPower(liftWork, p.timeA);
    const powerB = swPower(liftWork, p.timeB);

    const totalHours = p.hours * p.days;
    const energyKWh = swUnits(p.appliance, totalHours);

    return {
      force: p.force,
      direction: SW_DIRECTION_ORDER.indexOf(p.direction),
      alignment,
      distance: p.distance,
      work,
      workSize: Math.abs(work),
      workSign: sign(work),
      moved,
      workSoFar: swWork(p.force, moved, p.direction),
      pushDone: t >= p.distance / SW_PUSH_SPEED ? 1 : 0,
      mass: p.mass,
      height: p.height,
      weight,
      liftWork,
      liftNow,
      liftWorkSoFar: swLiftWork(p.mass, liftNow),
      timeA: p.timeA,
      timeB: p.timeB,
      powerA,
      powerB,
      powerAkW: powerA / 1000,
      powerBkW: powerB / 1000,
      powerRatio: p.timeB / p.timeA,
      morePower: p.timeA < p.timeB ? 1 : p.timeA > p.timeB ? -1 : 0,
      climbA: Math.min(p.height, (p.height * t) / p.timeA),
      climbB: Math.min(p.height, (p.height * t) / p.timeB),
      aDone: t >= p.timeA ? 1 : 0,
      bDone: t >= p.timeB ? 1 : 0,
      appliance: p.appliance,
      applianceKW: p.appliance / 1000,
      hours: p.hours,
      days: p.days,
      totalHours,
      rate: p.rate,
      dailyKWh: swUnits(p.appliance, p.hours),
      energyKWh,
      energyJ: energyKWh * SW_JOULES_PER_KWH,
      cost: energyKWh * p.rate,
      t,
    };
  },

  getVariable(state, id) {
    return id === "t" ? state.t : undefined;
  },

  setVariable(state, id, value) {
    if (id === "t") return { t: clampTo(value, 0, SW_MAX_T) };
    return state;
  },
};
