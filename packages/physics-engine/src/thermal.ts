import type { SimulationModel } from "@ise/science-engine";
import { snapZero } from "@ise/units";

/**
 * Heat going into a substance, and what the temperature does about it.
 *
 * The heating curve is the chapter: two slopes set by the specific heats,
 * two flat stretches set by the latent heats, and a kink at each change of
 * state. Everything the lab reports — the temperature, the phase, how much
 * has melted — is read off the same running total of joules, so the flat
 * parts are not drawn as a special case. They are what the arithmetic does.
 */

export type SubstanceId = "water" | "ethanol" | "lead" | "iron";

export interface Substance {
  id: SubstanceId;
  label: string;
  /** Specific heat capacities in J/(kg K), for each state. */
  solidHeat: number;
  liquidHeat: number;
  gasHeat: number;
  /** Latent heats in J/kg. */
  latentFusion: number;
  latentVaporisation: number;
  /** Change-of-state temperatures, in °C. */
  meltingPoint: number;
  boilingPoint: number;
  note: string;
}

export const SUBSTANCES: Record<SubstanceId, Substance> = {
  water: {
    id: "water",
    label: "Water",
    solidHeat: 2100,
    liquidHeat: 4186,
    gasHeat: 2010,
    latentFusion: 334000,
    latentVaporisation: 2260000,
    meltingPoint: 0,
    boilingPoint: 100,
    note: "A huge specific heat and an enormous latent heat of vaporisation, which is why sweating works.",
  },
  ethanol: {
    id: "ethanol",
    label: "Ethanol",
    solidHeat: 2400,
    liquidHeat: 2440,
    gasHeat: 1430,
    latentFusion: 108000,
    latentVaporisation: 841000,
    meltingPoint: -114,
    boilingPoint: 78,
    note: "Boils below water and takes a third of the energy to do it — the basis of distilling.",
  },
  lead: {
    id: "lead",
    label: "Lead",
    solidHeat: 128,
    liquidHeat: 130,
    gasHeat: 105,
    latentFusion: 23000,
    latentVaporisation: 871000,
    meltingPoint: 327,
    boilingPoint: 1749,
    note: "A tiny specific heat: the same joules take lead thirty times further in temperature than water.",
  },
  iron: {
    id: "iron",
    label: "Iron",
    solidHeat: 450,
    liquidHeat: 820,
    gasHeat: 450,
    latentFusion: 247000,
    latentVaporisation: 6090000,
    meltingPoint: 1538,
    boilingPoint: 2862,
    note: "Melts white-hot, and asks for a great deal of energy to get there.",
  },
};

export type ThermalParams = {
  substance: SubstanceId;
  /** Mass being heated, in kilograms. */
  mass: number;
  /** Heater power, in watts. */
  power: number;
};

export interface ThermalState {
  /** Energy put in since the start, in joules. */
  readonly heat: number;
}

/** Phases, as numbers so a goal can name one. */
export const PHASE = { solid: 0, melting: 1, liquid: 2, boiling: 3, gas: 4 } as const;

export type ThermalResults = {
  heat: number;
  /** The same, in kilojoules — which is how a heating curve is labelled. */
  heatKJ: number;
  /** Temperature now, in °C. */
  temperature: number;
  /** Where it has got to: 0 solid, 1 melting, 2 liquid, 3 boiling, 4 gas. */
  phase: number;
  /** 1 while the temperature is standing still through a change of state. */
  changingState: number;
  /** How much of the solid has melted, and how much of the liquid has boiled away. */
  meltedFraction: number;
  boiledFraction: number;
  mass: number;
  power: number;
  /** How long this much heat takes at the current power, in seconds and minutes. */
  seconds: number;
  minutes: number;
  meltingPoint: number;
  boilingPoint: number;
  startTemperature: number;
  /** The specific heat that applies right now, in J/(kg K); zero mid-change. */
  specificHeatNow: number;
  latentFusion: number;
  latentVaporisation: number;
  /** Energy to reach each milestone from cold, in joules. */
  heatToMelting: number;
  heatMelted: number;
  heatToBoiling: number;
  heatBoiled: number;
  /** What each plateau costs for this much substance, in kilojoules. */
  meltingEnergyKJ: number;
  boilingEnergyKJ: number;
  /** Everything the run will ask for, in joules and kilojoules. */
  totalHeat: number;
  totalHeatKJ: number;
};

/** How far above the boiling point the run follows the gas, in kelvin. */
export const GAS_HEADROOM = 100;
/** How far below its melting point each substance starts, in kelvin. */
export const START_BELOW_MELTING = 20;

export function substanceOf(params: ThermalParams): Substance {
  return SUBSTANCES[params.substance] ?? SUBSTANCES.water;
}

export function startTemperature(s: Substance): number {
  return s.meltingPoint - START_BELOW_MELTING;
}

/** The four milestones of a heating curve, as running totals of joules. */
export function milestones(params: ThermalParams) {
  const s = substanceOf(params);
  const m = Math.max(1e-9, params.mass);
  const toMelting = m * s.solidHeat * START_BELOW_MELTING;
  const melted = toMelting + m * s.latentFusion;
  const toBoiling = melted + m * s.liquidHeat * (s.boilingPoint - s.meltingPoint);
  const boiled = toBoiling + m * s.latentVaporisation;
  const total = boiled + m * s.gasHeat * GAS_HEADROOM;
  return { toMelting, melted, toBoiling, boiled, total };
}

/** Temperature and phase after a given number of joules. */
export function stateAfter(params: ThermalParams, heat: number): { temperature: number; phase: number } {
  const s = substanceOf(params);
  const m = Math.max(1e-9, params.mass);
  const q = Math.max(0, heat);
  const marks = milestones(params);
  if (q < marks.toMelting) {
    return { temperature: startTemperature(s) + q / (m * s.solidHeat), phase: PHASE.solid };
  }
  if (q < marks.melted) return { temperature: s.meltingPoint, phase: PHASE.melting };
  if (q < marks.toBoiling) {
    return { temperature: s.meltingPoint + (q - marks.melted) / (m * s.liquidHeat), phase: PHASE.liquid };
  }
  if (q < marks.boiled) return { temperature: s.boilingPoint, phase: PHASE.boiling };
  return { temperature: s.boilingPoint + (q - marks.boiled) / (m * s.gasHeat), phase: PHASE.gas };
}

const OUTPUTS = [
  "heat",
  "heatKJ",
  "temperature",
  "phase",
  "changingState",
  "meltedFraction",
  "boiledFraction",
  "mass",
  "power",
  "seconds",
  "minutes",
  "meltingPoint",
  "boilingPoint",
  "startTemperature",
  "specificHeatNow",
  "latentFusion",
  "latentVaporisation",
  "heatToMelting",
  "heatMelted",
  "heatToBoiling",
  "heatBoiled",
  "totalHeat",
  "totalHeatKJ",
  "meltingEnergyKJ",
  "boilingEnergyKJ",
] as const satisfies readonly (keyof ThermalResults)[];

export const thermalModel: SimulationModel<ThermalState, ThermalParams, ThermalResults> = {
  id: "thermal",
  defaultParams: { substance: "water", mass: 0.1, power: 10000 },
  outputs: OUTPUTS,
  stateVariables: ["heat"],

  initialize() {
    return { heat: 0 };
  },

  /** Play runs the heater: joules go in at its rated power, and stop at the top. */
  advance(state, dt, params) {
    return { heat: Math.min(milestones(params).total, state.heat + params.power * dt) };
  },

  /** A step is a twentieth of the whole run, which lands on the flat parts. */
  step(state, params, sign) {
    const total = milestones(params).total;
    return { heat: Math.max(0, Math.min(total, state.heat + (sign * total) / 20)) };
  },

  derive(state, params) {
    const s = substanceOf(params);
    const marks = milestones(params);
    const heat = Math.max(0, Math.min(marks.total, state.heat));
    const { temperature, phase } = stateAfter(params, heat);
    const changing = phase === PHASE.melting || phase === PHASE.boiling;
    return {
      heat,
      heatKJ: snapZero(heat / 1000),
      temperature: snapZero(temperature),
      phase,
      changingState: changing ? 1 : 0,
      meltedFraction: Math.min(1, Math.max(0, (heat - marks.toMelting) / (marks.melted - marks.toMelting))),
      boiledFraction: Math.min(1, Math.max(0, (heat - marks.toBoiling) / (marks.boiled - marks.toBoiling))),
      mass: params.mass,
      power: params.power,
      seconds: heat / Math.max(1e-9, params.power),
      minutes: heat / Math.max(1e-9, params.power) / 60,
      meltingPoint: s.meltingPoint,
      boilingPoint: s.boilingPoint,
      startTemperature: startTemperature(s),
      // Mid-change the temperature does not move at all, so there is no c to quote.
      specificHeatNow: changing ? 0 : phase === PHASE.solid ? s.solidHeat : phase === PHASE.liquid ? s.liquidHeat : s.gasHeat,
      latentFusion: s.latentFusion,
      latentVaporisation: s.latentVaporisation,
      heatToMelting: marks.toMelting,
      heatMelted: marks.melted,
      heatToBoiling: marks.toBoiling,
      heatBoiled: marks.boiled,
      totalHeat: marks.total,
      totalHeatKJ: marks.total / 1000,
      meltingEnergyKJ: (marks.melted - marks.toMelting) / 1000,
      boilingEnergyKJ: (marks.boiled - marks.toBoiling) / 1000,
    };
  },

  getVariable(state, id) {
    return id === "heat" ? state.heat : undefined;
  },

  setVariable(state, id, value, params) {
    return id === "heat" ? { heat: Math.max(0, Math.min(milestones(params).total, value)) } : state;
  },
};
