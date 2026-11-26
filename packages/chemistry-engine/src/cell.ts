import type { SimulationModel } from "@ise/science-engine";
import { snapZero } from "@ise/units";

/**
 * A galvanic cell: two metals in solutions of their own ions, a salt bridge
 * and a voltmeter.
 *
 * Each electrode sits at its Nernst potential,
 *
 *   E = E° + (0.0591 / z) · log₁₀[Mᶻ⁺],
 *
 * and the cell's voltage is the difference, right minus left. Which metal is
 * the anode, which way the electrons flow, ΔG = −nFE and the equilibrium
 * constant all follow. Played, the cell does work: ions are made at the anode
 * and used up at the cathode until the voltage falls to zero — which is
 * exactly Q = K. A flat battery is a reaction at equilibrium.
 */

export type ElectrodeId = "mg" | "zn" | "fe" | "pb" | "cu" | "ag";

export interface Electrode {
  id: ElectrodeId;
  metal: string;
  ion: string;
  /** Charge on the ion, and so electrons per metal atom. */
  z: number;
  /** Standard reduction potential, in volts. */
  E0: number;
}

export const ELECTRODES: Record<ElectrodeId, Electrode> = {
  mg: { id: "mg", metal: "Mg", ion: "Mg²⁺", z: 2, E0: -2.37 },
  zn: { id: "zn", metal: "Zn", ion: "Zn²⁺", z: 2, E0: -0.76 },
  fe: { id: "fe", metal: "Fe", ion: "Fe²⁺", z: 2, E0: -0.44 },
  pb: { id: "pb", metal: "Pb", ion: "Pb²⁺", z: 2, E0: -0.13 },
  cu: { id: "cu", metal: "Cu", ion: "Cu²⁺", z: 2, E0: 0.34 },
  ag: { id: "ag", metal: "Ag", ion: "Ag⁺", z: 1, E0: 0.8 },
};

/** Electrodes in a fixed order, so a result can name one with a number. */
export const ELECTRODE_ORDER: readonly ElectrodeId[] = ["mg", "zn", "fe", "pb", "cu", "ag"];

/** 2.303RT/F at 298 K, in volts. */
export const NERNST_SLOPE = 0.0591;
export const FARADAY = 96485;
/** Seconds of play to run a fresh cell all the way down. */
export const RUN_DOWN_TIME = 8;

export type CellParams = {
  left: ElectrodeId;
  right: ElectrodeId;
  /** Starting ion concentrations in each beaker, in mol/L. */
  cLeft: number;
  cRight: number;
};

export interface CellState {
  /** The cell these amounts belong to: a different pair or starting mixture starts afresh. */
  readonly pair: string;
  /** How far the cell has run down: 0 fresh, 1 flat (at equilibrium). */
  readonly progress: number;
}

export type CellResults = {
  left: number;
  right: number;
  /** Ion concentrations now, in mol/L. */
  concLeft: number;
  concRight: number;
  /** Standard and actual electrode potentials, in volts. */
  E0Left: number;
  E0Right: number;
  ELeft: number;
  ERight: number;
  /** The cell's voltage now (right − left), and under standard conditions. */
  Ecell: number;
  Ecell0: number;
  /** Electrons transferred in the balanced equation. */
  n: number;
  /** Gibbs energy change, in kJ per mole of reaction: ΔG = −nFE. */
  deltaG: number;
  deltaG0: number;
  /** Equilibrium constant and reaction quotient, for the reaction as the cell is written. */
  K: number;
  log10K: number;
  Q: number;
  /** 1 when the left electrode is the anode (electrons flow left to right through the wire), −1 the other way, 0 when flat. */
  direction: number;
  /** 1 when the cell as written runs by itself. */
  spontaneous: number;
  /** 1 once the voltage has fallen to zero. */
  flat: number;
  /** How far it has run down, 0 to 1. */
  progress: number;
};

export function pairOf(params: CellParams): string {
  return `${params.left}|${params.right}|${params.cLeft}|${params.cRight}`;
}

export function electrode(id: ElectrodeId): Electrode {
  return ELECTRODES[id] ?? ELECTRODES.zn;
}

/** Potential of an electrode, by Nernst, from log₁₀ of its ion concentration. */
export function electrodePotentialLog(e: Electrode, log10c: number): number {
  return e.E0 + (NERNST_SLOPE / e.z) * log10c;
}

/** Potential of an electrode in a solution of its ions, by Nernst. */
export function electrodePotential(e: Electrode, concentration: number): number {
  return electrodePotentialLog(e, Math.log10(Math.max(concentration, 1e-300)));
}

export function cellVoltage(params: CellParams, cLeft: number, cRight: number): number {
  return electrodePotential(electrode(params.right), cRight) - electrodePotential(electrode(params.left), cLeft);
}

interface Sides {
  /** The beaker whose ions are being used up, and the other one. */
  dep: Electrode;
  other: Electrode;
  c0: number;
  cOther0: number;
  side: "left" | "right";
}

function sides(params: CellParams, side: "left" | "right"): Sides {
  const L = electrode(params.left);
  const R = electrode(params.right);
  return side === "right"
    ? { dep: R, other: L, c0: params.cRight, cOther0: params.cLeft, side }
    : { dep: L, other: R, c0: params.cLeft, cOther0: params.cRight, side };
}

/** The other beaker's concentration once the depleting one has fallen to c: count the electrons. */
function partner(s: Sides, c: number): number {
  return s.cOther0 + ((s.c0 - c) * s.dep.z) / s.other.z;
}

/**
 * The mixture the cell ends at. Whichever beaker's ions are being used up
 * falls towards a concentration that can be absurdly small — about 10⁻³⁷
 * mol/L for a Daniell cell — so it is found in log space, where nothing is
 * lost to rounding.
 */
export function flatMixture(params: CellParams): { side: "left" | "right" | null; logDepleted: number } {
  const E = cellVoltage(params, params.cLeft, params.cRight);
  if (Math.abs(E) < 1e-12) return { side: null, logDepleted: 0 };
  // A positive cell uses up the right-hand ions (they are reduced); a negative one, the left-hand ions.
  const s = sides(params, E > 0 ? "right" : "left");
  // How far the depleting ion's potential sits above the other's: shrinks to zero as it runs out.
  const gap = (logc: number) => electrodePotentialLog(s.dep, logc) - electrodePotential(s.other, partner(s, 10 ** logc));
  let lo = -300;
  let hi = Math.log10(s.c0);
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (gap(mid) < 0) lo = mid;
    else hi = mid;
  }
  return { side: s.side, logDepleted: (lo + hi) / 2 };
}

/**
 * Concentrations part-way down. The ion being used up moves steadily in log
 * space, so the voltage — linear in the log — falls steadily to zero.
 */
export function concentrationsAt(params: CellParams, progress: number): { left: number; right: number } {
  const p = Math.min(1, Math.max(0, progress));
  const end = flatMixture(params);
  if (!end.side) return { left: params.cLeft, right: params.cRight };
  const s = sides(params, end.side);
  const c = 10 ** ((1 - p) * Math.log10(s.c0) + p * end.logDepleted);
  const other = partner(s, c);
  return end.side === "right" ? { left: other, right: c } : { left: c, right: other };
}

/** The smallest whole number of electrons both half-reactions can share. */
export function electronsTransferred(a: number, b: number): number {
  const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));
  return (a * b) / gcd(a, b);
}

function current(state: CellState, params: CellParams): CellState {
  const pair = pairOf(params);
  return state.pair === pair ? state : { pair, progress: 0 };
}

const clampProgress = (p: number) => Math.min(1, Math.max(0, p));

const OUTPUTS = [
  "left",
  "right",
  "concLeft",
  "concRight",
  "E0Left",
  "E0Right",
  "ELeft",
  "ERight",
  "Ecell",
  "Ecell0",
  "n",
  "deltaG",
  "deltaG0",
  "K",
  "log10K",
  "Q",
  "direction",
  "spontaneous",
  "flat",
  "progress",
] as const satisfies readonly (keyof CellResults)[];

export const cellModel: SimulationModel<CellState, CellParams, CellResults> = {
  id: "cell",
  defaultParams: { left: "zn", right: "cu", cLeft: 1, cRight: 1 },
  outputs: OUTPUTS,
  stateVariables: ["progress"],

  initialize(params) {
    return { pair: pairOf(params), progress: 0 };
  },

  /** Playing closes the circuit: the cell runs down until it is flat. */
  advance(state, dt, params) {
    const s = current(state, params);
    return { ...s, progress: clampProgress(s.progress + dt / RUN_DOWN_TIME) };
  },

  /** A step is a tenth of the way down (or back up). */
  step(state, params, sign) {
    const s = current(state, params);
    return { ...s, progress: clampProgress(Math.round((s.progress + sign * 0.1) * 10) / 10) };
  },

  derive(state, params) {
    const s = current(state, params);
    const L = electrode(params.left);
    const R = electrode(params.right);
    const { left: cL, right: cR } = concentrationsAt(params, s.progress);
    const ELeft = electrodePotential(L, cL);
    const ERight = electrodePotential(R, cR);
    const Ecell = ERight - ELeft;
    const Ecell0 = R.E0 - L.E0;
    const n = electronsTransferred(L.z, R.z);
    // As written: the right-hand ions are reduced while the left-hand metal dissolves.
    const logQ = (n / L.z) * Math.log10(Math.max(cL, 1e-300)) - (n / R.z) * Math.log10(Math.max(cR, 1e-300));
    const log10K = (n * Ecell0) / NERNST_SLOPE;
    const flat = Math.abs(Ecell) < 1e-3;
    return {
      left: ELECTRODE_ORDER.indexOf(L.id),
      right: ELECTRODE_ORDER.indexOf(R.id),
      concLeft: cL,
      concRight: cR,
      E0Left: L.E0,
      E0Right: R.E0,
      ELeft,
      ERight,
      Ecell: snapZero(Ecell, 5e-5),
      Ecell0,
      n,
      deltaG: snapZero((-n * FARADAY * Ecell) / 1000, 5e-3),
      deltaG0: (-n * FARADAY * Ecell0) / 1000,
      K: 10 ** log10K,
      log10K,
      Q: 10 ** logQ,
      direction: flat ? 0 : Ecell > 0 ? 1 : -1,
      spontaneous: Ecell > 0 ? 1 : 0,
      flat: flat ? 1 : 0,
      progress: s.progress,
    };
  },

  getVariable(state, id) {
    return id === "progress" ? state.progress : undefined;
  },

  setVariable(state, id, value, params) {
    const s = current(state, params);
    return id === "progress" ? { ...s, progress: clampProgress(value) } : s;
  },
};
