import type { SimulationModel } from "@ise/science-engine";

/**
 * Batteries you can buy, and the rust they fight.
 *
 * Cells: every commercial cell is a redox reaction with a fixed voltage. Its
 * useful energy per mole is ΔG = −nFE; cells in series add their voltages.
 * A dry cell's voltage sags as it runs down, a mercury cell's holds steady,
 * a lead–acid battery can be recharged (and its acid gets thinner as it
 * discharges), and a fuel cell runs as long as it is fed.
 *
 * Corrosion: iron rusts only with both water and oxygen, faster with salt.
 * Paint and tin keep them out until scratched — and scratched tin makes
 * things worse, since iron (E° −0.44 V) then gives its electrons to tin
 * (−0.14 V). Zinc protects even when scratched: it is more reactive
 * (−0.76 V), so it corrodes instead of the iron — sacrificial protection.
 */

export type CellId = "dry" | "mercury" | "lead-acid" | "fuel";
export const CELL_ORDER: readonly CellId[] = ["dry", "mercury", "lead-acid", "fuel"];

export interface CommercialCell {
  label: string;
  /** Rated voltage of one cell, V. */
  emf: number;
  /** Electrons per mole of reaction as written. */
  electrons: number;
  rechargeable: boolean;
  /** How the voltage behaves as the cell runs down, for a fraction q of charge left. */
  voltageAt: (q: number) => number;
  reaction: string;
}

/** The Faraday constant, C mol⁻¹, as NCERT rounds it (batteries lab). */
export const CELL_FARADAY = 96500;

export const CELLS: Record<CellId, CommercialCell> = {
  dry: { label: "Dry cell", emf: 1.5, electrons: 2, rechargeable: false, voltageAt: (q) => 1.5 * (0.75 + 0.25 * q), reaction: "Zn + 2MnO₂ + 2NH₄⁺ → Zn²⁺ + Mn₂O₃ + 2NH₃ + H₂O" },
  mercury: { label: "Mercury cell", emf: 1.35, electrons: 2, rechargeable: false, voltageAt: () => 1.35, reaction: "Zn(Hg) + HgO → ZnO + Hg" },
  "lead-acid": { label: "Lead–acid battery", emf: 2.0, electrons: 2, rechargeable: true, voltageAt: (q) => 1.95 + 0.1 * q, reaction: "Pb + PbO₂ + 2H₂SO₄ → 2PbSO₄ + 2H₂O" },
  fuel: { label: "H₂–O₂ fuel cell", emf: 1.23, electrons: 2, rechargeable: false, voltageAt: () => 1.23, reaction: "H₂ + ½O₂ → H₂O" },
};

export type YesNo = "yes" | "no";
export type Coating = "none" | "paint" | "zinc" | "tin";
export const COATING_ORDER: readonly Coating[] = ["none", "paint", "zinc", "tin"];

/** Fraction of the nail rusted per day in water and air. */
export const RUST_PER_DAY = 0.02;
export const SALT_FACTOR = 3;
export const MAX_DAYS = 30;

export type BatteriesParams = {
  cell: CellId;
  water: YesNo;
  air: YesNo;
  salt: YesNo;
  coating: Coating;
  scratched: YesNo;
};

export interface BatteriesState {
  /** Cells joined in series. */
  readonly cells: number;
  /** Charge left, %. */
  readonly charge: number;
  /** Days the nail has stood. */
  readonly days: number;
}

export type BatteriesResults = {
  cell: number;
  cells: number;
  emf: number;
  voltage: number;
  electrons: number;
  deltaG: number;
  rechargeable: number;
  charge: number;
  flat: number;
  acidDensity: number;
  coating: number;
  hasWater: number;
  hasAir: number;
  hasSalt: number;
  days: number;
  ironExposed: number;
  rusts: number;
  rustRate: number;
  rusted: number;
  sacrificial: number;
  zincCorroded: number;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const OUTPUTS = [
  "cell", "cells", "emf", "voltage", "electrons", "deltaG", "rechargeable", "charge", "flat", "acidDensity",
  "coating", "hasWater", "hasAir", "hasSalt", "days", "ironExposed", "rusts", "rustRate", "rusted", "sacrificial", "zincCorroded",
] as const satisfies readonly (keyof BatteriesResults)[];

export const batteriesModel: SimulationModel<BatteriesState, BatteriesParams, BatteriesResults> = {
  id: "batteries",
  defaultParams: { cell: "dry", water: "yes", air: "yes", salt: "no", coating: "none", scratched: "no" },
  outputs: OUTPUTS,
  stateVariables: ["cells", "charge", "days"],

  initialize() {
    return { cells: 1, charge: 100, days: 0 };
  },

  /** Play runs the cells down and lets the days pass: five per cent and three days a second. */
  advance(state, dt) {
    const days = state.days + 3 * dt;
    return { ...state, charge: Math.max(0, state.charge - 5 * dt), days: days > MAX_DAYS ? 0 : days };
  },

  step(state, _params, sign) {
    return { ...state, cells: clamp(Math.round(state.cells) + sign, 1, 6) };
  },

  derive(state, params) {
    const cell = CELLS[params.cell] ?? CELLS.dry;
    const cells = clamp(Math.round(state.cells), 1, 6);
    const charge = clamp(state.charge, 0, 100);
    const q = charge / 100;
    const flat = charge <= 0;
    const days = clamp(state.days, 0, MAX_DAYS);

    const coating = params.coating;
    const scratched = params.scratched === "yes";
    const wet = params.water === "yes" && params.air === "yes";
    const ironExposed = coating === "none" || ((coating === "paint" || coating === "tin") && scratched) || (coating === "zinc" && scratched);
    const sacrificial = coating === "zinc" && wet;
    const rusts = wet && ironExposed && !sacrificial;
    const salt = params.salt === "yes" ? SALT_FACTOR : 1;
    // Scratched tin: iron becomes the anode of a little cell and rusts faster; a scratch in paint exposes only a little iron.
    const exposure = coating === "tin" ? 2 : coating === "paint" ? 0.3 : 1;
    const rustRate = rusts ? RUST_PER_DAY * salt * exposure : 0;

    return {
      cell: Math.max(0, CELL_ORDER.indexOf(params.cell)),
      cells,
      emf: cell.emf,
      voltage: flat ? 0 : cells * cell.voltageAt(q),
      electrons: cell.electrons,
      deltaG: (-cell.electrons * CELL_FARADAY * cell.emf) / 1000,
      rechargeable: cell.rechargeable ? 1 : 0,
      charge,
      flat: flat ? 1 : 0,
      acidDensity: params.cell === "lead-acid" ? 1.1 + 0.18 * q : 0,
      coating: Math.max(0, COATING_ORDER.indexOf(coating)),
      hasWater: params.water === "yes" ? 1 : 0,
      hasAir: params.air === "yes" ? 1 : 0,
      hasSalt: params.salt === "yes" ? 1 : 0,
      days,
      ironExposed: ironExposed ? 1 : 0,
      rusts: rusts ? 1 : 0,
      rustRate,
      rusted: Math.min(1, rustRate * days),
      sacrificial: sacrificial ? 1 : 0,
      zincCorroded: sacrificial ? Math.min(1, 0.01 * salt * days) : 0,
    };
  },

  getVariable(state, id) {
    return id === "cells" || id === "charge" || id === "days" ? state[id] : undefined;
  },

  setVariable(state, id, value) {
    if (id === "cells") return { ...state, cells: clamp(Math.round(value), 1, 6) };
    if (id === "charge") return { ...state, charge: clamp(value, 0, 100) };
    if (id === "days") return { ...state, days: clamp(value, 0, MAX_DAYS) };
    return state;
  },
};
