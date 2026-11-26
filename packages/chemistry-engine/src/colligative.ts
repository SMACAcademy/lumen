import type { SimulationModel } from "@ise/science-engine";
import { snapZero } from "@ise/units";

/**
 * Two beakers side by side at the same temperature: the pure solvent, and a
 * solution of it. Cool them and the pure one freezes first; heat them and it
 * boils first.
 *
 * Every shift comes from counting dissolved particles: ΔTf = i·Kf·m,
 * ΔTb = i·Kb·m, the relative lowering of vapour pressure is the mole
 * fraction of solute particles (Raoult), and the osmotic pressure is i·C·R·T.
 * The van 't Hoff factor i is where the chemistry hides — salt splits into
 * two ions, calcium chloride into three, and ethanoic acid in benzene pairs
 * up and counts as half.
 */

export type SolventId = "water" | "benzene";
export type SoluteId = "glucose" | "nacl" | "cacl2" | "ethanoic";

export interface Solvent {
  id: SolventId;
  label: string;
  /** Freezing and boiling points, °C. */
  Tf: number;
  Tb: number;
  /** Cryoscopic and ebullioscopic constants, K kg/mol. */
  Kf: number;
  Kb: number;
  /** Molar mass, g/mol, and enthalpy of vaporisation, kJ/mol. */
  M: number;
  dHvap: number;
}

export const SOLVENTS: Record<SolventId, Solvent> = {
  water: { id: "water", label: "Water", Tf: 0, Tb: 100, Kf: 1.86, Kb: 0.52, M: 18, dHvap: 40.7 },
  benzene: { id: "benzene", label: "Benzene", Tf: 5.5, Tb: 80.1, Kf: 5.12, Kb: 2.53, M: 78, dHvap: 30.8 },
};

export interface Solute {
  id: SoluteId;
  label: string;
  /** Particles per formula unit dissolved, in each solvent. */
  i: Record<SolventId, number>;
}

export const SOLUTES: Record<SoluteId, Solute> = {
  glucose: { id: "glucose", label: "Glucose", i: { water: 1, benzene: 1 } },
  nacl: { id: "nacl", label: "Sodium chloride", i: { water: 2, benzene: 2 } },
  cacl2: { id: "cacl2", label: "Calcium chloride", i: { water: 3, benzene: 3 } },
  // Ethanoic acid barely ionises in water, and pairs into dimers in benzene.
  ethanoic: { id: "ethanoic", label: "Ethanoic acid", i: { water: 1, benzene: 0.5 } },
};

export const SOLVENT_ORDER: readonly SolventId[] = ["water", "benzene"];
export const SOLUTE_ORDER: readonly SoluteId[] = ["glucose", "nacl", "cacl2", "ethanoic"];

/** The temperatures the thermometer covers, °C, and how fast play heats, °C/s. */
export const T_RANGE: readonly [number, number] = [-30, 130];
export const HEAT_RATE = 6;
const R_ATM = 0.08206;
const R_J = 8.314;

/** States, as numbers so a goal can name one. */
export const PHASE = { solid: 0, liquid: 1, boiling: 2 } as const;

export type ColligativeParams = {
  solvent: SolventId;
  solute: SoluteId;
  /** Molality, mol of solute per kg of solvent. */
  m: number;
};

export interface ColligativeState {
  /** Temperature of both beakers, °C. */
  readonly T: number;
}

export type ColligativeResults = {
  solvent: number;
  solute: number;
  T: number;
  m: number;
  /** van 't Hoff factor, and the effective molality of particles, i·m. */
  i: number;
  particles: number;
  Kf: number;
  Kb: number;
  /** Freezing and boiling points, pure and with the solute, °C. */
  TfPure: number;
  TbPure: number;
  TfSolution: number;
  TbSolution: number;
  deltaTf: number;
  deltaTb: number;
  /** 0 solid, 1 liquid, 2 boiling — for each beaker. */
  statePure: number;
  stateSolution: number;
  /** Relative lowering of vapour pressure, Δp/p°: the mole fraction of solute particles. */
  relativeLowering: number;
  /** Vapour pressures at the current temperature, atm. */
  vapourPure: number;
  vapourSolution: number;
  /** Osmotic pressure at 298 K, atm, taking molarity ≈ molality. */
  osmoticPressure: number;
};

export function solventOf(params: ColligativeParams): Solvent {
  return SOLVENTS[params.solvent] ?? SOLVENTS.water;
}

export function vanTHoff(params: ColligativeParams): number {
  return (SOLUTES[params.solute] ?? SOLUTES.glucose).i[solventOf(params).id];
}

/** Vapour pressure of the pure solvent at T °C, atm (Clausius–Clapeyron through its boiling point). */
export function vapourPressure(solvent: Solvent, T: number): number {
  const K = T + 273.15;
  const Kb = solvent.Tb + 273.15;
  return Math.exp(-((solvent.dHvap * 1000) / R_J) * (1 / K - 1 / Kb));
}

/** Mole fraction of solute particles, from molality: i·m out of i·m + (1000 / M) moles. */
export function soluteFraction(params: ColligativeParams): number {
  const particles = vanTHoff(params) * Math.max(0, params.m);
  return particles / (particles + 1000 / solventOf(params).M);
}

function phaseAt(T: number, Tf: number, Tb: number): number {
  if (T < Tf) return PHASE.solid;
  if (T >= Tb) return PHASE.boiling;
  return PHASE.liquid;
}

const clampT = (T: number) => Math.min(T_RANGE[1], Math.max(T_RANGE[0], T));

const OUTPUTS = [
  "solvent",
  "solute",
  "T",
  "m",
  "i",
  "particles",
  "Kf",
  "Kb",
  "TfPure",
  "TbPure",
  "TfSolution",
  "TbSolution",
  "deltaTf",
  "deltaTb",
  "statePure",
  "stateSolution",
  "relativeLowering",
  "vapourPure",
  "vapourSolution",
  "osmoticPressure",
] as const satisfies readonly (keyof ColligativeResults)[];

export const colligativeModel: SimulationModel<ColligativeState, ColligativeParams, ColligativeResults> = {
  id: "colligative",
  defaultParams: { solvent: "water", solute: "glucose", m: 1 },
  outputs: OUTPUTS,
  stateVariables: ["T"],

  initialize() {
    return { T: 20 };
  },

  /** Play warms both beakers steadily. */
  advance(state, dt) {
    return { T: clampT(state.T + HEAT_RATE * dt) };
  },

  /** A step is one degree. */
  step(state, _params, sign) {
    return { T: clampT(Math.round(state.T) + sign) };
  },

  derive(state, params) {
    const solvent = solventOf(params);
    const i = vanTHoff(params);
    const m = Math.max(0, params.m);
    const particles = i * m;
    const deltaTf = solvent.Kf * particles;
    const deltaTb = solvent.Kb * particles;
    const TfSolution = solvent.Tf - deltaTf;
    const TbSolution = solvent.Tb + deltaTb;
    const T = clampT(state.T);
    const x = soluteFraction(params);
    const pure = vapourPressure(solvent, T);
    return {
      solvent: SOLVENT_ORDER.indexOf(solvent.id),
      solute: SOLUTE_ORDER.indexOf(params.solute),
      T,
      m,
      i,
      particles,
      Kf: solvent.Kf,
      Kb: solvent.Kb,
      TfPure: solvent.Tf,
      TbPure: solvent.Tb,
      TfSolution: snapZero(TfSolution),
      TbSolution,
      deltaTf,
      deltaTb,
      statePure: phaseAt(T, solvent.Tf, solvent.Tb),
      stateSolution: phaseAt(T, TfSolution, TbSolution),
      relativeLowering: x,
      vapourPure: pure,
      vapourSolution: pure * (1 - x),
      osmoticPressure: particles * R_ATM * 298,
    };
  },

  getVariable(state, id) {
    return id === "T" ? state.T : undefined;
  },

  setVariable(state, id, value) {
    return id === "T" ? { T: clampT(value) } : state;
  },
};
