import type { SimulationModel } from "@ise/science-engine";

/**
 * Electric current at work, for classes 7 and 10, in seven small scenes.
 *
 * Heat: a current I through a coil of resistance R for t seconds makes heat
 * H = I²Rt joules (Joule's law of heating); the coil's power is P = I²R, and
 * it glows when that power is big.
 *
 * House: the mains in India is 220 V at 50 Hz. Appliances are in parallel, so
 * the current from the mains is the total power ÷ 220 V. A fuse (or an MCB)
 * breaks the circuit when the current is more than its rating: overloading
 * (too many appliances) or a short circuit (live touching neutral, so almost
 * no resistance). An earth wire carries a leak from the live wire to a metal
 * body safely away to the earth — and that big current blows the fuse.
 *
 * Nail: a coil round an iron nail is an electromagnet. Its strength grows with
 * the turns × the current, and it is a magnet only while the current flows.
 *
 * Field: field lines round a bar magnet, a straight wire, a loop and a
 * solenoid. Round a straight wire the lines are circles, the right-hand thumb
 * rule gives their direction, and the field is stronger for more current and
 * weaker farther away: B = μ₀I ÷ 2πr, which is 20 μT for every ampere per
 * centimetre of distance.
 *
 * Motor: a wire carrying current across a magnetic field is pushed (Fleming's
 * left-hand rule). In a motor the split ring commutator reverses the coil's
 * current every half turn so it keeps turning one way; with plain slip rings
 * on a direct current the coil only swings to upright and stops.
 *
 * Induction: moving a magnet into or out of a coil makes the galvanometer
 * kick, more for a faster magnet and more turns, and the other way for the
 * other pole or the other direction. A still magnet makes no current.
 *
 * Generator: a coil turned in a magnetic field. With slip rings the current
 * changes direction twice every turn (alternating current); with a split ring
 * it always flows one way (direct current).
 *
 * Simplifications, said plainly: a fuse melts at once when the current is
 * more than its rating; the house wiring has 0.5 Ω, so a short circuit (or a
 * leak to an earthed body) draws 220 ÷ 0.5 = 440 A; an iron core makes the
 * electromagnet 100 times stronger, and each pin needs 20 turns × amperes of
 * strength; the galvanometer moves one division for every 20 turns × m/s; the
 * motor and the generator are drawn turning at most once a second.
 */

/** India's mains supply, V. */
export const CW_MAINS_VOLTAGE = 220;
/** India's mains frequency, Hz. */
export const CW_MAINS_FREQUENCY = 50;
/** One bulb, W. */
export const CW_BULB_POWER = 100;
/** One heater (or iron), W. */
export const CW_HEATER_POWER = 1000;
/** Resistance of the house wiring alone, Ω: all that is left in a short circuit. */
export const CW_WIRING_RESISTANCE = 0.5;
/** Fuse ratings for a home, A. */
export const CW_FUSE_RATINGS: readonly number[] = [1, 2, 3, 5, 10, 15];
/** Strength (turns × amperes) needed for each pin the nail holds. */
export const CW_STRENGTH_PER_PIN = 20;
/** How many times stronger an iron core makes the electromagnet. */
export const CW_IRON_FACTOR = 100;
/** Field of a straight wire, μT for each ampere per centimetre: μ₀ ÷ 2π = 2 × 10⁻⁷ T m/A. */
export const CW_WIRE_FIELD = 20;
/** Turns × m/s for one galvanometer division. */
export const CW_KICK_PER_DIVISION = 20;
export const CW_MAX_KICK = 10;
/** Play turns the motor and generator at most this fast, rev/s, so they can be watched. */
export const CW_SHOW_SPEED = 1;

export const CW_MAX_SECONDS = 600;
export const CW_MAX_HEAT_CURRENT = 10;
export const CW_MAX_COIL_RESISTANCE = 100;
export const CW_MAX_BULBS = 10;
export const CW_MAX_HEATERS = 3;
export const CW_MAX_TURNS = 100;
export const CW_MAX_MAGNET_CURRENT = 3;
export const CW_MAX_WIRE_CURRENT = 10;
export const CW_MIN_DISTANCE = 1;
export const CW_MAX_DISTANCE = 10;
export const CW_MAX_MOTOR_CURRENT = 5;
export const CW_MAX_MAGNET_SPEED = 2;
export const CW_MIN_GEN_SPEED = 1;
export const CW_MAX_GEN_SPEED = 50;

export type CwFault = "none" | "short" | "leak";
export type CwSource = "magnet" | "wire" | "loop" | "solenoid";

export const CW_FAULT_ORDER: readonly CwFault[] = ["none", "short", "leak"];
export const CW_SOURCE_ORDER: readonly CwSource[] = ["magnet", "wire", "loop", "solenoid"];

export type CurrentWorkParams = {
  /** Current through the heater coil, A. */
  heatCurrent: number;
  /** Resistance of the heater coil, Ω. */
  coilResistance: number;
  /** 100 W bulbs switched on. */
  bulbs: number;
  /** 1000 W heaters switched on. */
  heaters: number;
  /** The fuse (or MCB) rating, A. */
  fuseRating: number;
  fault: CwFault;
  earthed: "earthed" | "not";
  protector: "fuse" | "mcb";
  /** Turns of wire round the nail — or in the coil the magnet is pushed into. */
  coilTurns: number;
  /** Current through the nail's coil, A. */
  magnetCurrent: number;
  core: "iron" | "none";
  switchOn: "on" | "off";
  fieldSource: CwSource;
  /** Current in the straight wire, loop or solenoid, A. */
  wireCurrent: number;
  /** Distance from the straight wire, cm. */
  distance: number;
  /**
   * "forward": in a straight wire, towards you (out of the page); in a loop,
   * a solenoid or the nail's coil, anticlockwise seen from the right-hand end;
   * in the motor, out of the page in the coil side on the left.
   */
  currentDirection: "forward" | "reverse";
  /** Current through the motor's coil, A. */
  motorCurrent: number;
  /** Which pole of the motor's magnet is on the left. */
  poles: "nLeft" | "nRight";
  motorRings: "split" | "slip";
  /** Speed of the magnet: + towards the coil, − away from it, m/s. */
  magnetVelocity: number;
  /** The pole of the magnet that faces the coil. */
  magnetPole: "N" | "S";
  /** Turns of the generator's coil each second, rev/s. */
  genSpeed: number;
  genRings: "slip" | "split";
};

export interface CurrentWorkState {
  /** How long the heater has been on, s. */
  readonly seconds: number;
  /** Angle of the motor coil's first side from the horizontal, rad. */
  readonly coilAngle: number;
  /** The motor coil's angular speed, rad/s (+ anticlockwise). */
  readonly coilSpin: number;
  /** Angle of the generator's coil from upright, rad. */
  readonly genAngle: number;
}

export type CurrentWorkResults = {
  heatCurrent: number;
  coilResistance: number;
  heatVoltage: number;
  heatPower: number;
  heat: number;
  seconds: number;
  /** 0 cold to 1 glowing brightly, for the drawing. */
  glow: number;
  bulbs: number;
  heaters: number;
  housePower: number;
  mainsVoltage: number;
  mainsFrequency: number;
  houseCurrent: number;
  fuseRating: number;
  fault: number;
  fuseBlown: number;
  supplyOn: number;
  protector: number;
  earthed: number;
  shockDanger: number;
  coilTurns: number;
  magnetCurrent: number;
  ironCore: number;
  switchOn: number;
  magnetOn: number;
  magnetStrength: number;
  pinsHeld: number;
  /** +1 the nail's right end is N, −1 its left end, 0 not a magnet. */
  nailNorthEnd: number;
  fieldSource: number;
  wireCurrent: number;
  distance: number;
  /** Field of the straight wire at that distance, μT. */
  wireField: number;
  /** +1 anticlockwise round the wire (seen from where the current comes towards you), −1 clockwise, 0 none. */
  fieldTurn: number;
  /** +1 the right-hand end is N, −1 S, 0 no field. */
  rightPole: number;
  /** A compass to the right of the wire: +1 points up the page, −1 down, 0 no field. */
  compassPoints: number;
  /** +1 forward, −1 reversed. */
  currentDirection: number;
  motorCurrent: number;
  poles: number;
  motorRings: number;
  /** Force on the coil side whose current is set by currentDirection (towards you when "forward"): +1 up the page, −1 down, 0 none. */
  rodForce: number;
  keepsTurning: number;
  /** +1 anticlockwise, −1 clockwise, 0 it does not keep turning. */
  spin: number;
  coilAngle: number;
  turnRate: number;
  magnetVelocity: number;
  magnetPole: number;
  /** Galvanometer reading, divisions (+ right). */
  kick: number;
  kickSize: number;
  genSpeed: number;
  genRings: number;
  isAC: number;
  acFrequency: number;
  reversals: number;
  reversalGap: number;
  genAngle: number;
  /** Output of the generator now, −1 to 1 of its peak. */
  genOutput: number;
};

const finite = (x: number, fallback = 0) => (Number.isFinite(x) ? x : fallback);
const clampTo = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, finite(x, lo)));
const whole = (x: number, lo: number, hi: number) => Math.round(clampTo(x, lo, hi));
const clean = (x: number) => (Math.abs(x) < 1e-12 ? 0 : x) || 0;
const TAU = 2 * Math.PI;
const wrap = (a: number) => clean(((finite(a) % TAU) + TAU) % TAU);

/** Joule's law of heating, J. */
export function cwJouleHeat(current: number, resistance: number, seconds: number): number {
  return current * current * resistance * seconds;
}

/** What the mains supplies: the current, and whether the fuse goes. */
export function cwHouse(params: Pick<CurrentWorkParams, "bulbs" | "heaters" | "fuseRating" | "fault" | "earthed">) {
  const bulbs = whole(params.bulbs, 0, CW_MAX_BULBS);
  const heaters = whole(params.heaters, 0, CW_MAX_HEATERS);
  const power = bulbs * CW_BULB_POWER + heaters * CW_HEATER_POWER;
  const load = power / CW_MAINS_VOLTAGE;
  const faultCurrent = CW_MAINS_VOLTAGE / CW_WIRING_RESISTANCE;
  const earthed = params.earthed !== "not";
  const current =
    params.fault === "short" ? faultCurrent : params.fault === "leak" && earthed ? load + faultCurrent : load;
  const rating = Math.max(0.5, finite(params.fuseRating, 5));
  const blown = current > rating + 1e-9;
  return { bulbs, heaters, power, current, rating, blown, earthed, shock: params.fault === "leak" && !earthed && !blown };
}

/** The electromagnet's strength, turns × A (an air core gives a hundredth of it). */
export function cwMagnetStrength(turns: number, current: number, iron: boolean): number {
  return (turns * current) / (iron ? 1 : CW_IRON_FACTOR);
}

/** Field of a straight wire, μT, for a current in A at a distance in cm. */
export function cwWireField(current: number, distanceCm: number): number {
  return (CW_WIRE_FIELD * current) / Math.max(CW_MIN_DISTANCE, distanceCm);
}

/** Galvanometer kick, divisions: + when a north pole comes towards the coil. */
export function cwKick(turns: number, velocity: number, pole: "N" | "S"): number {
  const raw = ((turns * velocity) / CW_KICK_PER_DIVISION) * (pole === "S" ? -1 : 1);
  return clean(clampTo(raw, -CW_MAX_KICK, CW_MAX_KICK));
}

/** Torque on the motor coil (scaled), + anticlockwise. */
function motorTorque(angle: number, current: number, d: number, split: boolean): number {
  const c = Math.cos(angle);
  return 4 * current * d * (split ? -Math.abs(c) : c);
}
const MOTOR_DRAG = 2;

const OUTPUTS = [
  "heatCurrent", "coilResistance", "heatVoltage", "heatPower", "heat", "seconds", "glow",
  "bulbs", "heaters", "housePower", "mainsVoltage", "mainsFrequency", "houseCurrent", "fuseRating", "fault", "fuseBlown",
  "supplyOn", "protector", "earthed", "shockDanger",
  "coilTurns", "magnetCurrent", "ironCore", "switchOn", "magnetOn", "magnetStrength", "pinsHeld", "nailNorthEnd",
  "fieldSource", "wireCurrent", "distance", "wireField", "fieldTurn", "rightPole", "compassPoints", "currentDirection",
  "motorCurrent", "poles", "motorRings", "rodForce", "keepsTurning", "spin", "coilAngle", "turnRate",
  "magnetVelocity", "magnetPole", "kick", "kickSize",
  "genSpeed", "genRings", "isAC", "acFrequency", "reversals", "reversalGap", "genAngle", "genOutput",
] as const satisfies readonly (keyof CurrentWorkResults)[];

const clampSeconds = (s: number) => clampTo(s, 0, CW_MAX_SECONDS);

export const currentWorkModel: SimulationModel<CurrentWorkState, CurrentWorkParams, CurrentWorkResults> = {
  id: "currentwork",
  defaultParams: {
    heatCurrent: 2,
    coilResistance: 20,
    bulbs: 3,
    heaters: 0,
    fuseRating: 5,
    fault: "none",
    earthed: "earthed",
    protector: "fuse",
    coilTurns: 50,
    magnetCurrent: 1,
    core: "iron",
    switchOn: "on",
    fieldSource: "magnet",
    wireCurrent: 5,
    distance: 2,
    currentDirection: "forward",
    motorCurrent: 2,
    poles: "nLeft",
    motorRings: "split",
    magnetVelocity: 0,
    magnetPole: "N",
    genSpeed: 50,
    genRings: "slip",
  },
  outputs: OUTPUTS,
  stateVariables: ["seconds", "coilAngle", "genAngle"],

  initialize() {
    return { seconds: 30, coilAngle: 0, coilSpin: 0, genAngle: 0 };
  },

  /** Play: the heater stays on, the motor turns under its forces, the generator's coil turns. */
  advance(state, dt, params) {
    if (!(dt > 0)) return state;
    const current = clampTo(params.motorCurrent, 0, CW_MAX_MOTOR_CURRENT);
    const d = (params.currentDirection === "reverse" ? -1 : 1) * (params.poles === "nRight" ? -1 : 1);
    const split = params.motorRings !== "slip";
    let angle = finite(state.coilAngle);
    let spin = finite(state.coilSpin);
    const steps = Math.max(1, Math.ceil(dt / 0.005));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      spin += (motorTorque(angle, current, d, split) - MOTOR_DRAG * spin) * h;
      angle += spin * h;
    }
    const genTurns = Math.min(clampTo(params.genSpeed, CW_MIN_GEN_SPEED, CW_MAX_GEN_SPEED), CW_SHOW_SPEED);
    return {
      seconds: clampSeconds(state.seconds + dt),
      coilAngle: wrap(angle),
      coilSpin: clean(spin),
      genAngle: wrap(state.genAngle + TAU * genTurns * dt),
    };
  },

  step(state, _params, sign) {
    return { ...state, seconds: clampSeconds(Math.round(state.seconds / 10) * 10 + 10 * sign) };
  },

  derive(state, params) {
    // Heat.
    const heatCurrent = clampTo(params.heatCurrent, 0, CW_MAX_HEAT_CURRENT);
    const coilResistance = clampTo(params.coilResistance, 1, CW_MAX_COIL_RESISTANCE);
    const seconds = clampSeconds(state.seconds);
    const heatPower = heatCurrent * heatCurrent * coilResistance;

    // House.
    const house = cwHouse(params);

    // Electromagnet.
    const coilTurns = whole(params.coilTurns, 0, CW_MAX_TURNS);
    const magnetCurrent = clampTo(params.magnetCurrent, 0, CW_MAX_MAGNET_CURRENT);
    const iron = params.core !== "none";
    const switchOn = params.switchOn !== "off";
    const magnetOn = switchOn && magnetCurrent > 0 && coilTurns > 0;
    const magnetStrength = magnetOn ? cwMagnetStrength(coilTurns, magnetCurrent, iron) : 0;
    const dir = params.currentDirection === "reverse" ? -1 : 1;

    // Field.
    const source = Math.max(0, CW_SOURCE_ORDER.indexOf(params.fieldSource));
    const wireCurrent = clampTo(params.wireCurrent, 0, CW_MAX_WIRE_CURRENT);
    const distance = clampTo(params.distance, CW_MIN_DISTANCE, CW_MAX_DISTANCE);
    const flowing = wireCurrent > 0 ? dir : 0;
    const sourceName = CW_SOURCE_ORDER[source];

    // Motor.
    const motorCurrent = clampTo(params.motorCurrent, 0, CW_MAX_MOTOR_CURRENT);
    const d = dir * (params.poles === "nRight" ? -1 : 1);
    const split = params.motorRings !== "slip";
    const keepsTurning = split && motorCurrent > 0;

    // Induction.
    const magnetVelocity = clean(clampTo(params.magnetVelocity, -CW_MAX_MAGNET_SPEED, CW_MAX_MAGNET_SPEED));
    const kick = cwKick(coilTurns, magnetVelocity, params.magnetPole);

    // Generator.
    const genSpeed = clampTo(params.genSpeed, CW_MIN_GEN_SPEED, CW_MAX_GEN_SPEED);
    const ac = params.genRings !== "split";
    const genAngle = wrap(state.genAngle);
    const sine = Math.sin(genAngle);

    return {
      heatCurrent,
      coilResistance,
      heatVoltage: heatCurrent * coilResistance,
      heatPower,
      heat: cwJouleHeat(heatCurrent, coilResistance, seconds),
      seconds,
      glow: Math.min(1, heatPower / 2000),
      bulbs: house.bulbs,
      heaters: house.heaters,
      housePower: house.power,
      mainsVoltage: CW_MAINS_VOLTAGE,
      mainsFrequency: CW_MAINS_FREQUENCY,
      houseCurrent: house.current,
      fuseRating: house.rating,
      fault: Math.max(0, CW_FAULT_ORDER.indexOf(params.fault)),
      fuseBlown: house.blown ? 1 : 0,
      supplyOn: house.blown ? 0 : 1,
      protector: params.protector === "mcb" ? 1 : 0,
      earthed: house.earthed ? 1 : 0,
      shockDanger: house.shock ? 1 : 0,
      coilTurns,
      magnetCurrent,
      ironCore: iron ? 1 : 0,
      switchOn: switchOn ? 1 : 0,
      magnetOn: magnetOn ? 1 : 0,
      magnetStrength,
      pinsHeld: Math.floor(magnetStrength / CW_STRENGTH_PER_PIN + 1e-9),
      nailNorthEnd: magnetOn ? dir : 0,
      fieldSource: source,
      wireCurrent,
      distance,
      wireField: cwWireField(wireCurrent, distance),
      fieldTurn: flowing,
      rightPole: sourceName === "magnet" ? 1 : sourceName === "wire" ? 0 : flowing,
      compassPoints: flowing,
      currentDirection: dir,
      motorCurrent,
      poles: params.poles === "nRight" ? 1 : 0,
      motorRings: split ? 0 : 1,
      rodForce: motorCurrent > 0 ? d : 0,
      keepsTurning: keepsTurning ? 1 : 0,
      spin: keepsTurning ? -d : 0,
      coilAngle: wrap(state.coilAngle),
      turnRate: clean(finite(state.coilSpin) / TAU),
      magnetVelocity,
      magnetPole: params.magnetPole === "S" ? 1 : 0,
      kick,
      kickSize: Math.abs(kick),
      genSpeed,
      genRings: ac ? 0 : 1,
      isAC: ac ? 1 : 0,
      acFrequency: ac ? genSpeed : 0,
      reversals: ac ? 2 * genSpeed : 0,
      reversalGap: ac ? 1 / (2 * genSpeed) : 0,
      genAngle,
      genOutput: clean(ac ? sine : Math.abs(sine)),
    };
  },

  getVariable(state, id) {
    if (id === "seconds") return state.seconds;
    if (id === "coilAngle") return state.coilAngle;
    if (id === "genAngle") return state.genAngle;
    return undefined;
  },

  setVariable(state, id, value) {
    if (id === "seconds") return { ...state, seconds: clampSeconds(value) };
    if (id === "coilAngle") return { ...state, coilAngle: wrap(value), coilSpin: 0 };
    if (id === "genAngle") return { ...state, genAngle: wrap(value) };
    return state;
  },
};
