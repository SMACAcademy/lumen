import type { SimulationModel } from "@ise/science-engine";

/**
 * Ions carrying charge: electrolysis, and how well a solution conducts.
 *
 * Electrolysis: a current I for a time t pushes a charge Q = It through the
 * cell, which is Q/F moles of electrons. At the cathode each ion needs n of
 * them, so the mass deposited is m = (M/n)·Q/F — Faraday's first law — and
 * the same charge through two cells deposits masses in the ratio of M/n, the
 * second. Gases are counted at STP, 22.4 L a mole.
 *
 * Conductance: the molar conductivity Λm of a strong electrolyte falls a
 * little, in a straight line against √c (Kohlrausch); a weak one only
 * partly ionises, α from its Ka (Ostwald's dilution law), so Λm = αΛ°m climbs
 * steeply on dilution towards Λ°m — which is found by adding ion
 * conductivities from strong electrolytes: Kohlrausch's law of independent
 * migration.
 */

/** The Faraday constant, C mol⁻¹, as NCERT rounds it. */
export const FARADAY_ROUNDED = 96500;
/** Litres a mole of gas fills at STP (NCERT). */
export const MOLAR_VOLUME = 22.4;
/** Slope of Λm against √c for 1:1 strong electrolytes, S cm² mol⁻¹ (mol L⁻¹)^−½. */
export const KOHLRAUSCH_A = 90;

export interface ElectrodeProduct {
  /** "Cu", "H₂" … */
  formula: string;
  name: string;
  kind: "metal" | "gas";
  /** Molar mass, g mol⁻¹. */
  M: number;
  /** Electrons per formula unit formed. */
  electrons: number;
}

export interface Electrolyte {
  label: string;
  /** The ions in the cell, e.g. "Cu²⁺ and SO₄²⁻". */
  ions: string;
  cathode: ElectrodeProduct;
  anode: ElectrodeProduct;
}

export type ElectrolyteId = "copper-sulfate" | "silver-nitrate" | "molten-nacl" | "acidified-water";
export const ELECTROLYTE_ORDER: readonly ElectrolyteId[] = ["copper-sulfate", "silver-nitrate", "molten-nacl", "acidified-water"];

const oxygen: ElectrodeProduct = { formula: "O₂", name: "oxygen", kind: "gas", M: 32, electrons: 4 };

export const ELECTROLYTES: Record<ElectrolyteId, Electrolyte> = {
  "copper-sulfate": { label: "Copper sulfate", ions: "Cu²⁺ and SO₄²⁻", cathode: { formula: "Cu", name: "copper", kind: "metal", M: 63.5, electrons: 2 }, anode: oxygen },
  "silver-nitrate": { label: "Silver nitrate", ions: "Ag⁺ and NO₃⁻", cathode: { formula: "Ag", name: "silver", kind: "metal", M: 108, electrons: 1 }, anode: oxygen },
  "molten-nacl": { label: "Molten sodium chloride", ions: "Na⁺ and Cl⁻", cathode: { formula: "Na", name: "sodium", kind: "metal", M: 23, electrons: 1 }, anode: { formula: "Cl₂", name: "chlorine", kind: "gas", M: 71, electrons: 2 } },
  "acidified-water": { label: "Acidified water", ions: "H⁺ and SO₄²⁻", cathode: { formula: "H₂", name: "hydrogen", kind: "gas", M: 2, electrons: 2 }, anode: oxygen },
};

export interface IonicSolute {
  label: string;
  formula: string;
  /** Limiting molar conductivity, S cm² mol⁻¹. */
  lambdaZero: number;
  /** Acid dissociation constant for a weak electrolyte; null for a strong one. */
  Ka: number | null;
}

export type IonicSoluteId = "hcl" | "kcl" | "nacl" | "ch3coona" | "ch3cooh";
export const IONIC_SOLUTE_ORDER: readonly IonicSoluteId[] = ["hcl", "kcl", "nacl", "ch3coona", "ch3cooh"];

export const IONIC_SOLUTES: Record<IonicSoluteId, IonicSolute> = {
  hcl: { label: "Hydrochloric acid", formula: "HCl", lambdaZero: 426.2, Ka: null },
  kcl: { label: "Potassium chloride", formula: "KCl", lambdaZero: 149.9, Ka: null },
  nacl: { label: "Sodium chloride", formula: "NaCl", lambdaZero: 126.4, Ka: null },
  ch3coona: { label: "Sodium acetate", formula: "CH₃COONa", lambdaZero: 91.0, Ka: null },
  ch3cooh: { label: "Acetic acid", formula: "CH₃COOH", lambdaZero: 390.5, Ka: 1.8e-5 },
};

export const MIN_C = 0.001;
export const MAX_C = 0.1;
export const MAX_MINUTES = 120;

/** Degree of ionisation of a weak electrolyte at concentration c (Ostwald: Ka = cα²/(1 − α)). */
export function degreeOfIonisation(Ka: number, c: number): number {
  return (-Ka + Math.sqrt(Ka * Ka + 4 * Ka * c)) / (2 * c);
}

/** Molar conductivity of a solute at concentration c, S cm² mol⁻¹. */
export function molarConductivity(solute: IonicSolute, c: number): number {
  return solute.Ka === null ? solute.lambdaZero - KOHLRAUSCH_A * Math.sqrt(c) : degreeOfIonisation(solute.Ka, c) * solute.lambdaZero;
}

export type ElectrolysisParams = {
  electrolyte: ElectrolyteId;
  solute: IonicSoluteId;
};

export interface ElectrolysisState {
  /** Current, A. */
  readonly current: number;
  /** Time the current flows, min. */
  readonly time: number;
  /** Concentration of the solute, mol L⁻¹. */
  readonly c: number;
}

export type ElectrolysisResults = {
  electrolyte: number;
  solute: number;
  current: number;
  time: number;
  charge: number;
  molesElectrons: number;
  cathodeMoles: number;
  cathodeMass: number;
  cathodeGas: number;
  anodeGas: number;
  cathodeIsGas: number;
  equivalentMass: number;
  c: number;
  sqrtC: number;
  lambda: number;
  lambdaZero: number;
  alpha: number;
  kappa: number;
  resistance: number;
  strong: number;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const OUTPUTS = [
  "electrolyte", "solute", "current", "time", "charge", "molesElectrons", "cathodeMoles", "cathodeMass", "cathodeGas",
  "anodeGas", "cathodeIsGas", "equivalentMass", "c", "sqrtC", "lambda", "lambdaZero", "alpha", "kappa", "resistance", "strong",
] as const satisfies readonly (keyof ElectrolysisResults)[];

export const electrolysisModel: SimulationModel<ElectrolysisState, ElectrolysisParams, ElectrolysisResults> = {
  id: "electrolysis",
  defaultParams: { electrolyte: "copper-sulfate", solute: "kcl" },
  outputs: OUTPUTS,
  stateVariables: ["current", "time", "c"],

  initialize() {
    return { current: 2, time: 0, c: 0.01 };
  },

  /** Play runs the clock — ten minutes a second — and, for the conductance plot, keeps diluting. */
  advance(state, dt) {
    const time = state.time + 10 * dt;
    const c = state.c / (1 + 0.8 * dt);
    return { ...state, time: time > MAX_MINUTES ? 0 : time, c: c < MIN_C ? MAX_C : c };
  },

  step(state, _params, sign) {
    return { ...state, time: clamp(Math.round(state.time) + 5 * sign, 0, MAX_MINUTES) };
  },

  derive(state, params) {
    const cell = ELECTROLYTES[params.electrolyte] ?? ELECTROLYTES["copper-sulfate"];
    const solute = IONIC_SOLUTES[params.solute] ?? IONIC_SOLUTES.kcl;
    const current = clamp(state.current, 0, 10);
    const time = clamp(state.time, 0, MAX_MINUTES);
    const c = clamp(state.c, MIN_C, MAX_C);
    const charge = current * time * 60;
    const molesElectrons = charge / FARADAY_ROUNDED;
    const cathodeMoles = molesElectrons / cell.cathode.electrons;
    const anodeMoles = molesElectrons / cell.anode.electrons;
    const lambda = molarConductivity(solute, c);
    const kappa = (lambda * c) / 1000;
    return {
      electrolyte: Math.max(0, ELECTROLYTE_ORDER.indexOf(params.electrolyte)),
      solute: Math.max(0, IONIC_SOLUTE_ORDER.indexOf(params.solute)),
      current,
      time,
      charge,
      molesElectrons,
      cathodeMoles,
      cathodeMass: cell.cathode.kind === "metal" ? cathodeMoles * cell.cathode.M : 0,
      cathodeGas: cell.cathode.kind === "gas" ? cathodeMoles * MOLAR_VOLUME : 0,
      anodeGas: cell.anode.kind === "gas" ? anodeMoles * MOLAR_VOLUME : 0,
      cathodeIsGas: cell.cathode.kind === "gas" ? 1 : 0,
      equivalentMass: cell.cathode.M / cell.cathode.electrons,
      c,
      sqrtC: Math.sqrt(c),
      lambda,
      lambdaZero: solute.lambdaZero,
      alpha: solute.Ka === null ? 1 : degreeOfIonisation(solute.Ka, c),
      kappa,
      resistance: 1 / kappa,
      strong: solute.Ka === null ? 1 : 0,
    };
  },

  getVariable(state, id) {
    return id === "current" || id === "time" || id === "c" ? state[id] : undefined;
  },

  setVariable(state, id, value) {
    if (id === "current") return { ...state, current: clamp(value, 0, 10) };
    if (id === "time") return { ...state, time: clamp(value, 0, MAX_MINUTES) };
    if (id === "c") return { ...state, c: clamp(value, MIN_C, MAX_C) };
    return state;
  },
};
