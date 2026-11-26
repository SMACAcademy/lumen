import type { SimulationModel } from "@ise/science-engine";

/**
 * Vapour pressure of liquid mixtures, and gases dissolved in water.
 *
 * Raoult's law: in an ideal mixture each liquid's vapour pressure is its
 * mole fraction times its pure vapour pressure, pᵢ = xᵢpᵢ*, so the total is
 * a straight line between the two pure liquids and the vapour is richer in
 * the more volatile one. Real mixtures deviate: when A–B attractions are
 * weaker than A–A and B–B the molecules escape more easily (positive
 * deviation, ethanol–water); when they are stronger, less easily (negative
 * deviation, acetone–chloroform). Here that is the one-parameter Margules
 * model, γ_A = exp(A x_B²): A = 0 ideal, A > 0 positive, A < 0 negative — a
 * model, with A chosen for each pair to show its known behaviour. Deviate
 * enough and the total pressure has a maximum or minimum inside: an
 * azeotrope, which boils without changing composition.
 *
 * Henry's law: a gas dissolves in proportion to its pressure, x = p / K_H.
 */

export interface LiquidPair {
  label: string;
  a: string;
  b: string;
  /** Pure vapour pressures at 298 K, kPa. */
  pA: number;
  pB: number;
  /** Margules parameter: 0 ideal, > 0 positive deviation, < 0 negative. */
  margules: number;
}

export type LiquidPairId = "benzene-toluene" | "hexane-heptane" | "acetone-chloroform" | "ethanol-water";
export const LIQUID_PAIR_ORDER: readonly LiquidPairId[] = ["benzene-toluene", "hexane-heptane", "acetone-chloroform", "ethanol-water"];

export const LIQUID_PAIRS: Record<LiquidPairId, LiquidPair> = {
  "benzene-toluene": { label: "Benzene + toluene", a: "benzene", b: "toluene", pA: 12.7, pB: 3.8, margules: 0 },
  "hexane-heptane": { label: "Hexane + heptane", a: "hexane", b: "heptane", pA: 20.2, pB: 6.1, margules: 0 },
  "acetone-chloroform": { label: "Acetone + chloroform", a: "acetone", b: "chloroform", pA: 30.8, pB: 26.2, margules: -0.8 },
  "ethanol-water": { label: "Ethanol + water", a: "ethanol", b: "water", pA: 7.9, pB: 3.2, margules: 1.2 },
};

export interface HenryGas {
  formula: string;
  /** Henry's law constant in water, kbar (NCERT). */
  kH: number;
}

export type HenryGasId = "he" | "n2" | "o2" | "co2";
export const HENRY_GAS_ORDER: readonly HenryGasId[] = ["he", "n2", "o2", "co2"];
export const HENRY_GASES: Record<HenryGasId, HenryGas> = {
  he: { formula: "He", kH: 144.97 },
  n2: { formula: "N₂", kH: 76.48 },
  o2: { formula: "O₂", kH: 34.86 },
  co2: { formula: "CO₂", kH: 1.67 },
};

/** Mol of water in a litre. */
const WATER_MOL_PER_L = 55.5;

/** Partial and total vapour pressures (kPa) of a pair at mole fraction xA. */
export function vapourPressures(pair: LiquidPair, xA: number): { pA: number; pB: number; total: number } {
  const x = Math.min(1, Math.max(0, xA));
  const xB = 1 - x;
  const pA = x * Math.exp(pair.margules * xB * xB) * pair.pA;
  const pB = xB * Math.exp(pair.margules * x * x) * pair.pB;
  return { pA, pB, total: pA + pB };
}

/** Where the total pressure has a maximum or minimum strictly inside 0 < x < 1, or null. */
export function azeotropeOf(pair: LiquidPair): number | null {
  if (pair.margules === 0) return null;
  const steps = 400;
  const totals = Array.from({ length: steps + 1 }, (_, i) => vapourPressures(pair, i / steps).total);
  const ends = [totals[0]!, totals[steps]!];
  const pick = pair.margules > 0 ? Math.max(...totals) : Math.min(...totals);
  const i = totals.indexOf(pick);
  const inside = pair.margules > 0 ? pick > Math.max(...ends) + 1e-9 : pick < Math.min(...ends) - 1e-9;
  return inside && i > 0 && i < steps ? i / steps : null;
}

export type RaoultParams = { pair: LiquidPairId; gas: HenryGasId };

export interface RaoultState {
  /** Mole fraction of the first (more volatile) liquid. */
  readonly xA: number;
  /** Gas pressure over the water, bar. */
  readonly pressure: number;
  readonly clock: number;
}

export type RaoultResults = {
  pair: number;
  xA: number;
  pA: number;
  pB: number;
  pTotal: number;
  idealTotal: number;
  deviation: number;
  deviationSign: number;
  yA: number;
  pAStar: number;
  pBStar: number;
  azeotrope: number;
  azeotropeX: number;
  gas: number;
  pressure: number;
  solubility: number;
  mmolPerL: number;
};

const OUTPUTS = [
  "pair", "xA", "pA", "pB", "pTotal", "idealTotal", "deviation", "deviationSign", "yA", "pAStar", "pBStar",
  "azeotrope", "azeotropeX", "gas", "pressure", "solubility", "mmolPerL",
] as const satisfies readonly (keyof RaoultResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const raoultModel: SimulationModel<RaoultState, RaoultParams, RaoultResults> = {
  id: "raoult",
  defaultParams: { pair: "benzene-toluene", gas: "o2" },
  outputs: OUTPUTS,
  stateVariables: ["xA", "pressure"],

  initialize() {
    return { xA: 0.5, pressure: 1, clock: 0 };
  },

  /** Play sweeps the composition from pure B to pure A. */
  advance(state, dt) {
    const x = state.xA + 0.2 * dt;
    return { ...state, xA: x > 1 ? 0 : x, clock: 0 };
  },

  step(state, _params, sign) {
    return { ...state, xA: clamp(Math.round(state.xA * 10) / 10 + 0.1 * sign, 0, 1) };
  },

  derive(state, params) {
    const pair = LIQUID_PAIRS[params.pair] ?? LIQUID_PAIRS["benzene-toluene"];
    const gas = HENRY_GASES[params.gas] ?? HENRY_GASES.o2;
    const xA = clamp(state.xA, 0, 1);
    const { pA, pB, total } = vapourPressures(pair, xA);
    const ideal = xA * pair.pA + (1 - xA) * pair.pB;
    const deviation = total - ideal;
    const az = azeotropeOf(pair);
    const pressure = clamp(state.pressure, 0.1, 10);
    const x = pressure / (gas.kH * 1000);
    return {
      pair: Math.max(0, LIQUID_PAIR_ORDER.indexOf(params.pair)),
      xA,
      pA,
      pB,
      pTotal: total,
      idealTotal: ideal,
      deviation,
      deviationSign: Math.abs(deviation) < 1e-9 ? 0 : Math.sign(deviation),
      yA: total > 0 ? pA / total : 0,
      pAStar: pair.pA,
      pBStar: pair.pB,
      azeotrope: az === null ? 0 : 1,
      azeotropeX: az ?? 0,
      gas: Math.max(0, HENRY_GAS_ORDER.indexOf(params.gas)),
      pressure,
      solubility: x * 1e6,
      mmolPerL: x * WATER_MOL_PER_L * 1000,
    };
  },

  getVariable(state, id) {
    return id === "xA" ? state.xA : id === "pressure" ? state.pressure : undefined;
  },

  setVariable(state, id, value) {
    if (id === "xA") return { ...state, xA: clamp(value, 0, 1) };
    if (id === "pressure") return { ...state, pressure: clamp(value, 0.1, 10) };
    return state;
  },
};
