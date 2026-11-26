import type { SimulationModel } from "@ise/science-engine";

/**
 * A torch on a table: cells, bulbs, a switch and a gap to test things in,
 * all in one loop.
 *
 * A bulb lights only when there is an unbroken path from one end of the
 * battery to the other. The switch breaks the path on purpose; an insulator
 * in the gap breaks it too, and a conductor closes it. With the path closed,
 * the current is the battery's voltage shared across everything in the loop
 * (I = V ÷ R), so more cells mean a brighter bulb and more bulbs in a line
 * mean dimmer ones. Side by side (in parallel), every bulb gets the whole push
 * and glows fully — which is how a house is wired.
 */

export type GapMaterial = "wire" | "copper" | "iron" | "aluminium" | "graphite" | "rubber" | "plastic" | "wood" | "glass" | "air";

export interface GapInfo {
  label: string;
  conducts: boolean;
  /** Resistance of the sample across the gap, in ohms (Infinity for an insulator). */
  resistance: number;
}

export const GAP_MATERIALS: Record<GapMaterial, GapInfo> = {
  wire: { label: "Wire", conducts: true, resistance: 0 },
  copper: { label: "Copper coin", conducts: true, resistance: 0.01 },
  iron: { label: "Iron key", conducts: true, resistance: 0.05 },
  aluminium: { label: "Aluminium foil", conducts: true, resistance: 0.02 },
  graphite: { label: "Pencil lead", conducts: true, resistance: 6 },
  rubber: { label: "Eraser", conducts: false, resistance: Number.POSITIVE_INFINITY },
  plastic: { label: "Plastic ruler", conducts: false, resistance: Number.POSITIVE_INFINITY },
  wood: { label: "Wooden stick", conducts: false, resistance: Number.POSITIVE_INFINITY },
  glass: { label: "Glass rod", conducts: false, resistance: Number.POSITIVE_INFINITY },
  air: { label: "Nothing (a gap)", conducts: false, resistance: Number.POSITIVE_INFINITY },
};

/** Gap materials in a fixed order, so a result can name one with a number. */
export const GAP_ORDER: readonly GapMaterial[] = ["wire", "copper", "iron", "aluminium", "graphite", "rubber", "plastic", "wood", "glass", "air"];

/** One torch cell. */
export const CELL_VOLTAGE = 1.5;
/** One torch bulb, hot. */
export const BULB_RESISTANCE = 6;
/** Power in one bulb from one cell: what "brightness 1" means. */
const REFERENCE_POWER = (CELL_VOLTAGE * CELL_VOLTAGE) / BULB_RESISTANCE;
export const MAX_CELLS = 4;
export const MAX_BULBS = 3;

export type CircuitParams = {
  cells: number;
  bulbs: number;
  switchClosed: "closed" | "open";
  gap: GapMaterial;
  /** Bulbs one after another ("series", the default) or side by side ("parallel"). */
  arrangement?: "series" | "parallel";
};

export interface CircuitState {
  /** Seconds, only to move the drawn charges along. */
  readonly t: number;
}

export type CircuitResults = {
  cells: number;
  bulbs: number;
  switchClosed: number;
  gap: number;
  conducts: number;
  closed: number;
  voltage: number;
  resistance: number;
  current: number;
  brightness: number;
  lit: number;
  t: number;
  /** 0 series, 1 parallel. */
  arrangement: number;
  /** Current through each bulb. */
  bulbCurrent: number;
  /** Power the cells deliver, P = VI. */
  power: number;
};

const count = (value: number, max: number, min = 0) => Math.min(max, Math.max(min, Math.round(value)));

export function gapOf(params: CircuitParams): GapInfo {
  return GAP_MATERIALS[params.gap] ?? GAP_MATERIALS.wire;
}

const OUTPUTS = [
  "cells",
  "bulbs",
  "switchClosed",
  "gap",
  "conducts",
  "closed",
  "voltage",
  "resistance",
  "current",
  "brightness",
  "lit",
  "t",
  "arrangement",
  "bulbCurrent",
  "power",
] as const satisfies readonly (keyof CircuitResults)[];

export const circuitModel: SimulationModel<CircuitState, CircuitParams, CircuitResults> = {
  id: "circuit",
  defaultParams: { cells: 1, bulbs: 1, switchClosed: "closed", gap: "wire", arrangement: "series" },
  outputs: OUTPUTS,
  stateVariables: ["t"],

  initialize() {
    return { t: 0 };
  },

  advance(state, dt) {
    return { t: state.t + dt };
  },

  step(state, _params, sign) {
    return { t: Math.max(0, state.t + sign * 0.5) };
  },

  derive(state, params) {
    const cells = count(params.cells, MAX_CELLS);
    const bulbs = count(params.bulbs, MAX_BULBS, 1);
    const gap = gapOf(params);
    const switchClosed = params.switchClosed === "closed";
    const voltage = cells * CELL_VOLTAGE;
    const closed = switchClosed && gap.conducts && cells > 0;
    const parallel = params.arrangement === "parallel";
    // In series the bulbs' resistances add; side by side they share the current, so the total falls.
    const bulbsResistance = parallel ? BULB_RESISTANCE / bulbs : bulbs * BULB_RESISTANCE;
    const resistance = switchClosed && gap.conducts ? bulbsResistance + gap.resistance : -1;
    const current = closed ? voltage / resistance : 0;
    const bulbCurrent = parallel ? current / bulbs : current;
    const brightness = (bulbCurrent * bulbCurrent * BULB_RESISTANCE) / REFERENCE_POWER;
    return {
      cells,
      bulbs,
      switchClosed: switchClosed ? 1 : 0,
      gap: Math.max(0, GAP_ORDER.indexOf(params.gap)),
      conducts: gap.conducts ? 1 : 0,
      closed: closed ? 1 : 0,
      voltage,
      resistance,
      current,
      brightness,
      lit: brightness >= 0.05 ? 1 : 0,
      t: state.t,
      arrangement: parallel ? 1 : 0,
      bulbCurrent,
      power: voltage * current,
    };
  },

  getVariable(state, id) {
    return id === "t" ? state.t : undefined;
  },

  setVariable(state, id, value) {
    return id === "t" ? { t: Math.max(0, value) } : state;
  },
};
