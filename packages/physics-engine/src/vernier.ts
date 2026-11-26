import type { SimulationModel } from "@ise/science-engine";

/**
 * A vernier calliper. The jaws hold an object of some true width; the
 * instrument can only report multiples of its least count, and a bent
 * instrument reports them shifted by its zero error.
 *
 * Everything an exam question asks — least count, main-scale reading,
 * coinciding division, zero correction, absolute and percentage error — is
 * derived here from one number: how far the jaws are open.
 */

export type VernierParams = {
  /** One main-scale division, in mm (1 mm on a school calliper). */
  msd: number;
  /** Divisions on the vernier scale: 10, 20 or 50. */
  divisions: number;
  /** How far off the instrument reads when the jaws are shut, in mm. */
  zeroError: number;
};

export interface VernierState {
  /** True width of the object between the jaws, in mm. */
  readonly width: number;
}

export type VernierResults = {
  /** The true width — what a perfect instrument would report. */
  width: number;
  /** Smallest difference the instrument can resolve, in mm. */
  leastCount: number;
  /** One division of the vernier scale, in mm. */
  vernierDivision: number;
  divisions: number;
  msd: number;
  /** Where the vernier zero actually sits, including the zero error. */
  scalePosition: number;
  /** Main-scale reading just before the vernier zero, in mm. */
  mainReading: number;
  /** Which vernier division lines up with a main-scale mark. */
  coincidence: number;
  /** What the instrument shows: main reading + coincidence × least count. */
  observedReading: number;
  zeroError: number;
  /** Observed reading minus the zero error. */
  correctedReading: number;
  /** How far the corrected reading is from the truth, in mm. */
  absoluteError: number;
  percentError: number;
  /** Decimal places the least count justifies. */
  decimals: number;
};

export const MAX_WIDTH = 60;

const clampWidth = (w: number) => Math.min(MAX_WIDTH, Math.max(0, w));

export function leastCountOf(p: { msd: number; divisions: number }): number {
  return p.msd / p.divisions;
}

/** What the instrument shows for a true width: quantised, and shifted by any zero error. */
export function readingOf(p: VernierParams, width: number): { mainReading: number; coincidence: number; observed: number } {
  const lc = leastCountOf(p);
  const shown = width + p.zeroError;
  const steps = Math.round(shown / lc);
  const quantised = steps * lc;
  let mainReading = Math.floor(quantised / p.msd + 1e-9) * p.msd;
  let coincidence = Math.round((quantised - mainReading) / lc);
  if (coincidence >= p.divisions) {
    mainReading += p.msd;
    coincidence = 0;
  }
  return { mainReading, coincidence, observed: mainReading + coincidence * lc };
}

const OUTPUTS = [
  "width",
  "leastCount",
  "vernierDivision",
  "divisions",
  "msd",
  "scalePosition",
  "mainReading",
  "coincidence",
  "observedReading",
  "zeroError",
  "correctedReading",
  "absoluteError",
  "percentError",
  "decimals",
] as const satisfies readonly (keyof VernierResults)[];

export const vernierModel: SimulationModel<VernierState, VernierParams, VernierResults> = {
  id: "vernier-calliper",
  defaultParams: { msd: 1, divisions: 10, zeroError: 0 },
  outputs: OUTPUTS,
  stateVariables: ["width"],

  initialize() {
    return { width: 12.4 };
  },

  /** Playing opens the jaws steadily, so the scales can be watched sliding past. */
  advance(state, dt) {
    const next = state.width + dt * 4;
    return { width: next > MAX_WIDTH ? 0 : next };
  },

  /** Steps move by exactly one least count — the smallest change the instrument can see. */
  step(state, params, sign) {
    return { width: clampWidth(state.width + sign * leastCountOf(params)) };
  },

  derive(state, params) {
    const lc = leastCountOf(params);
    const { mainReading, coincidence, observed } = readingOf(params, state.width);
    const corrected = observed - params.zeroError;
    const absolute = Math.abs(corrected - state.width);
    return {
      width: state.width,
      leastCount: lc,
      vernierDivision: params.msd - lc,
      divisions: params.divisions,
      msd: params.msd,
      scalePosition: state.width + params.zeroError,
      mainReading,
      coincidence,
      observedReading: observed,
      zeroError: params.zeroError,
      correctedReading: corrected,
      absoluteError: absolute,
      percentError: state.width > 1e-9 ? (100 * absolute) / state.width : 0,
      decimals: Math.max(0, Math.ceil(-Math.log10(lc) - 1e-9)),
    };
  },

  getVariable(state, id) {
    return id === "width" ? state.width : undefined;
  },

  setVariable(state, id, value) {
    return id === "width" ? { width: clampWidth(value) } : state;
  },
};
