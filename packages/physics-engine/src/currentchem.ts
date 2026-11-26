import type { SimulationModel } from "@ise/science-engine";
import { BULB_RESISTANCE, CELL_VOLTAGE } from "./circuit";

/**
 * Chemical effects of electric current (class 8), in three scenes.
 *
 * A tester: cells, two bare ends, and something that shows a current — a
 * torch bulb, an LED, or a compass with the wire wound round it. Dip the ends
 * into a liquid. If the liquid conducts, a current flows and the tester shows
 * it. A bulb needs a big current to glow; an LED glows with a few
 * thousandths of an ampere; a compass needle turns for even less. Distilled
 * water hardly conducts, but salt stirred into it makes it conduct well: it
 * is the charged particles (ions) from dissolved salts, acids and bases that
 * carry the current through a liquid.
 *
 * Electrolysis: a current through a conducting solution makes a chemical
 * change. In copper sulphate solution with carbon rods, copper coats the rod
 * joined to the negative terminal, oxygen bubbles from the positive one, and
 * the blue colour fades as the copper leaves the solution. In water with a
 * little acid, hydrogen bubbles at the negative rod and oxygen at the
 * positive — twice as much hydrogen as oxygen.
 *
 * Electroplating: a copper plate on the positive terminal, an iron key on
 * the negative, both in copper sulphate. Copper leaves the plate and coats
 * the key; the solution stays just as blue. Wired the other way round the key
 * is eaten away instead and the plate gets the copper.
 *
 * Simplifications: the liquids' resistances between the tester's ends are
 * fixed, typical values; each pinch of salt adds the same conductance; the
 * LED needs 1.8 V and has a 100 Ω resistor in series; the compass coil is
 * 10 Ω. The current in the electrolysis and plating scenes is set directly
 * (a real cell would give less as the liquid changes). The amounts of copper,
 * hydrogen and oxygen are the real ones for the charge that flows (Faraday's
 * law, F = 96500 C, gases at room temperature, 24 L per mole); the coat is
 * spread evenly over a key of 10 cm², so its thickness grows with
 * current × time.
 */

export type CurrentChemLiquid = "joined" | "distilled" | "tap" | "lemon" | "vinegar" | "sugar" | "oil" | "copperSulphate";
export type CurrentChemTester = "bulb" | "led" | "compass";
export type CurrentChemBath = "copperSulphate" | "water";
export type CurrentChemKeyOn = "negative" | "positive";

export interface CurrentChemLiquidInfo {
  label: string;
  /** Conductance between the tester's two ends, in siemens (Infinity when the ends touch). */
  conductance: number;
  /** Salt dissolves in it (everything watery). */
  takesSalt: boolean;
}

/** The liquids in a fixed order, so a result can name one with a number. */
export const CCHEM_LIQUID_ORDER: readonly CurrentChemLiquid[] = ["joined", "distilled", "tap", "lemon", "vinegar", "sugar", "oil", "copperSulphate"];

export const CCHEM_LIQUIDS: Record<CurrentChemLiquid, CurrentChemLiquidInfo> = {
  joined: { label: "Ends touching", conductance: Number.POSITIVE_INFINITY, takesSalt: false },
  distilled: { label: "Distilled water", conductance: 1e-6, takesSalt: true },
  tap: { label: "Tap water", conductance: 1 / 600, takesSalt: true },
  lemon: { label: "Lemon juice", conductance: 1 / 150, takesSalt: true },
  vinegar: { label: "Vinegar", conductance: 1 / 250, takesSalt: true },
  sugar: { label: "Sugar in distilled water", conductance: 2e-6, takesSalt: true },
  oil: { label: "Vegetable oil", conductance: 0, takesSalt: false },
  copperSulphate: { label: "Copper sulphate solution", conductance: 1 / 30, takesSalt: true },
};

export const CCHEM_TESTER_ORDER: readonly CurrentChemTester[] = ["bulb", "led", "compass"];
export const CCHEM_BATH_ORDER: readonly CurrentChemBath[] = ["copperSulphate", "water"];

export const CCHEM_MAX_CELLS = 4;
export const CCHEM_MAX_SALT = 5;
/** Conductance each pinch of salt adds, S. */
export const CCHEM_SALT_CONDUCTANCE = 0.025;
/** A torch bulb glows (visibly) from this brightness, 1 being one bulb on one cell — as in the circuit lab. */
export const CCHEM_BULB_GLOW = 0.05;
/** Voltage an LED needs before any current flows, V. */
export const CCHEM_LED_DROP = 1.8;
/** The resistor that protects the LED, Ω. */
export const CCHEM_LED_RESISTOR = 100;
/** An LED glows visibly from this current, A. */
export const CCHEM_LED_GLOW = 0.001;
/** Resistance of the coil wound round the compass, Ω. */
export const CCHEM_COMPASS_COIL = 10;
/** The needle turns 45° at this current, A. */
export const CCHEM_COMPASS_HALF = 0.005;
/** A turn this big is easy to see, rad (2°). */
export const CCHEM_COMPASS_SEEN = (2 * Math.PI) / 180;

export const CCHEM_MAX_CURRENT = 2;
export const CCHEM_MAX_MINUTES = 30;
export const CCHEM_FARADAY = 96500;
export const CCHEM_COPPER_MOLAR_MASS = 63.5;
export const CCHEM_IRON_MOLAR_MASS = 56;
export const CCHEM_COPPER_DENSITY = 8.96;
/** Area of the key's surface, cm². */
export const CCHEM_KEY_AREA = 10;
/** One mole of gas at room temperature, mL. */
export const CCHEM_GAS_MOLAR_VOLUME = 24000;
/** Copper in the beaker: 200 mL of 0.1 mol/L copper sulphate, mg. */
export const CCHEM_BEAKER_COPPER = 0.2 * 0.1 * CCHEM_COPPER_MOLAR_MASS * 1000;

/** Copper laid down by a charge q (coulombs), mg: two electrons for each copper atom. */
export function cchemCopperFromCharge(q: number): number {
  return ((q * CCHEM_COPPER_MOLAR_MASS) / (2 * CCHEM_FARADAY)) * 1000;
}

/** Thickness of `mg` milligrams of copper spread over the key, µm. */
export function cchemCoatThickness(mg: number): number {
  return (mg / 1000 / CCHEM_COPPER_DENSITY / CCHEM_KEY_AREA) * 1e4;
}

export type CurrentChemParams = {
  liquid: CurrentChemLiquid;
  tester: CurrentChemTester;
  /** Cells in the tester, 1.5 V each. */
  cells: number;
  /** Pinches of salt stirred into the liquid. */
  salt: number;
  bath: CurrentChemBath;
  /** Current through the electrolysis or plating bath, A. */
  current: number;
  /** Which terminal the key is joined to. */
  keyOn: CurrentChemKeyOn;
};

export interface CurrentChemState {
  /** Minutes the current has been flowing. */
  readonly minutes: number;
}

export type CurrentChemResults = {
  liquid: number;
  tester: number;
  cells: number;
  salt: number;
  voltage: number;
  /** 0 does not conduct, 1 hardly, 2 conducts, 3 conducts well, 4 the ends touch. */
  liquidKind: number;
  /** Current through the tester, mA. */
  testerCurrent: number;
  /** The tester shows a current: bulb glows, LED glows, or needle turns. */
  shows: number;
  /** The bulb's brightness, 1 being one bulb on one cell. */
  brightness: number;
  /** The LED's glow, 0 to 1. */
  ledGlow: number;
  /** How far the compass needle turns, rad. */
  deflection: number;
  bath: number;
  current: number;
  minutes: number;
  /** Charge that has flowed, C. */
  charge: number;
  /** Copper on the negative carbon rod, mg. */
  copperDeposit: number;
  /** Hydrogen at the negative rod, mL. */
  hydrogen: number;
  /** Oxygen at the positive rod, mL. */
  oxygen: number;
  /** Blue colour left in the electrolysis beaker, %. */
  blueLeft: number;
  /** 0 key on −, 1 key on +. */
  keyOn: number;
  coatOnKey: number;
  /** Copper coat on the key, µm. */
  coatThickness: number;
  /** Copper laid down on whichever electrode is negative, mg. */
  copperMoved: number;
  /** Copper the plate loses, mg. */
  plateLoss: number;
  /** Iron the key loses when it is on +, mg. */
  keyLoss: number;
  /** Blue colour left in the plating beaker, %. */
  plateBlue: number;
};

const clampTo = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(value) ? value : lo));
const clampMinutes = (m: number) => clampTo(m, 0, CCHEM_MAX_MINUTES);
const index = <T>(order: readonly T[], value: T) => Math.max(0, order.indexOf(value));

export function cchemLiquidOf(params: Pick<CurrentChemParams, "liquid">): CurrentChemLiquidInfo {
  return CCHEM_LIQUIDS[params.liquid] ?? CCHEM_LIQUIDS.distilled;
}

/** Conductance of the liquid with its salt, S. */
export function cchemConductance(liquid: CurrentChemLiquidInfo, salt: number): number {
  return liquid.conductance + (liquid.takesSalt ? CCHEM_SALT_CONDUCTANCE * clampTo(Math.round(salt), 0, CCHEM_MAX_SALT) : 0);
}

/** Current a push `v` drives through a resistance `r` in series with a liquid of conductance `g`, A. */
export function cchemSeriesCurrent(v: number, r: number, g: number): number {
  if (v <= 0 || g <= 0) return 0;
  if (!Number.isFinite(g)) return v / r;
  return (v * g) / (1 + r * g);
}

function kindOf(g: number): number {
  if (!Number.isFinite(g)) return 4;
  if (g <= 0) return 0;
  if (g < 1e-4) return 1;
  if (g < 0.02) return 2;
  return 3;
}

const OUTPUTS = [
  "liquid", "tester", "cells", "salt", "voltage", "liquidKind", "testerCurrent", "shows", "brightness", "ledGlow", "deflection",
  "bath", "current", "minutes", "charge", "copperDeposit", "hydrogen", "oxygen", "blueLeft",
  "keyOn", "coatOnKey", "coatThickness", "copperMoved", "plateLoss", "keyLoss", "plateBlue",
] as const satisfies readonly (keyof CurrentChemResults)[];

export const currentChemModel: SimulationModel<CurrentChemState, CurrentChemParams, CurrentChemResults> = {
  id: "currentchem",
  defaultParams: { liquid: "lemon", tester: "bulb", cells: 2, salt: 0, bath: "copperSulphate", current: 0.5, keyOn: "negative" },
  outputs: OUTPUTS,
  stateVariables: ["minutes"],

  initialize() {
    return { minutes: 0 };
  },

  /** Play runs the current: one minute of the experiment each second. */
  advance(state, dt) {
    if (!(dt > 0)) return state;
    return { minutes: clampMinutes(state.minutes + dt) };
  },

  step(state, _params, sign) {
    return { minutes: clampMinutes(Math.round(state.minutes) + sign) };
  },

  derive(state, params) {
    // ── The tester ───────────────────────────────────────────────────────
    const liquid = cchemLiquidOf(params);
    const cells = clampTo(Math.round(params.cells), 1, CCHEM_MAX_CELLS);
    const salt = liquid.takesSalt ? clampTo(Math.round(params.salt), 0, CCHEM_MAX_SALT) : 0;
    const g = cchemConductance(liquid, salt);
    const voltage = cells * CELL_VOLTAGE;
    const tester = CCHEM_TESTER_ORDER.includes(params.tester) ? params.tester : "bulb";
    let amps = 0;
    let brightness = 0;
    let ledGlow = 0;
    let deflection = 0;
    let shows = 0;
    if (tester === "bulb") {
      amps = cchemSeriesCurrent(voltage, BULB_RESISTANCE, g);
      // Brightness 1 is one bulb on one cell: P = I²R against 1.5² ÷ 6 W.
      brightness = (amps * amps * BULB_RESISTANCE) / ((CELL_VOLTAGE * CELL_VOLTAGE) / BULB_RESISTANCE);
      shows = brightness >= CCHEM_BULB_GLOW ? 1 : 0;
    } else if (tester === "led") {
      amps = cchemSeriesCurrent(Math.max(0, voltage - CCHEM_LED_DROP), CCHEM_LED_RESISTOR, g);
      shows = amps >= CCHEM_LED_GLOW ? 1 : 0;
      ledGlow = shows ? Math.min(1, amps / 0.02) : 0;
    } else {
      amps = cchemSeriesCurrent(voltage, CCHEM_COMPASS_COIL, g);
      deflection = Math.atan(amps / CCHEM_COMPASS_HALF);
      shows = deflection >= CCHEM_COMPASS_SEEN ? 1 : 0;
    }

    // ── Electrolysis ─────────────────────────────────────────────────────
    const current = clampTo(params.current, 0, CCHEM_MAX_CURRENT);
    const minutes = clampMinutes(state.minutes);
    const charge = current * minutes * 60;
    const bath = params.bath === "water" ? "water" : "copperSulphate";
    const copper = Math.min(CCHEM_BEAKER_COPPER, cchemCopperFromCharge(charge));
    const copperDeposit = bath === "copperSulphate" ? copper : 0;
    // Two electrons free one hydrogen molecule; four free one oxygen molecule.
    const hydrogen = bath === "water" ? (charge / (2 * CCHEM_FARADAY)) * CCHEM_GAS_MOLAR_VOLUME : 0;
    const oxygen = (charge / (4 * CCHEM_FARADAY)) * CCHEM_GAS_MOLAR_VOLUME;
    const blueLeft = bath === "copperSulphate" ? 100 * (1 - copperDeposit / CCHEM_BEAKER_COPPER) : 0;

    // ── Electroplating ───────────────────────────────────────────────────
    const keyOnPositive = params.keyOn === "positive";
    const copperMoved = copper;
    const coatThickness = keyOnPositive ? 0 : cchemCoatThickness(copperMoved);
    // With the key on +, the iron key dissolves and copper comes out of the solution onto the plate.
    const keyLoss = keyOnPositive ? ((charge * CCHEM_IRON_MOLAR_MASS) / (2 * CCHEM_FARADAY)) * 1000 : 0;

    return {
      liquid: index(CCHEM_LIQUID_ORDER, params.liquid),
      tester: index(CCHEM_TESTER_ORDER, tester),
      cells,
      salt,
      voltage,
      liquidKind: kindOf(g),
      testerCurrent: amps * 1000 || 0,
      shows,
      brightness: brightness || 0,
      ledGlow: ledGlow || 0,
      deflection: deflection || 0,
      bath: index(CCHEM_BATH_ORDER, bath),
      current,
      minutes,
      charge: charge || 0,
      copperDeposit: copperDeposit || 0,
      hydrogen: hydrogen || 0,
      oxygen: oxygen || 0,
      blueLeft: blueLeft || 0,
      keyOn: keyOnPositive ? 1 : 0,
      coatOnKey: coatThickness > 0 ? 1 : 0,
      coatThickness: coatThickness || 0,
      copperMoved: copperMoved || 0,
      plateLoss: keyOnPositive ? 0 : copperMoved || 0,
      keyLoss: keyLoss || 0,
      plateBlue: keyOnPositive ? 100 * (1 - copperMoved / CCHEM_BEAKER_COPPER) : 100,
    };
  },

  getVariable(state, id) {
    return id === "minutes" ? state.minutes : undefined;
  },

  setVariable(state, id, value) {
    return id === "minutes" ? { minutes: clampMinutes(value) } : state;
  },
};
