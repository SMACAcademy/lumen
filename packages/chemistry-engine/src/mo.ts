import type { SimulationModel } from "@ise/science-engine";

/**
 * Molecular orbital theory for homonuclear diatomic molecules, H₂ to Ne₂.
 *
 * Two atoms' orbitals combine into bonding orbitals (lower in energy) and
 * antibonding ones (higher). The molecule's electrons fill them in order —
 * σ1s σ*1s σ2s σ*2s, then for B₂, C₂ and N₂ the two π2p before σ2p, and from
 * O₂ on σ2p before π2p — with Hund's rule in the paired π orbitals.
 * Bond order = (bonding − antibonding)/2: zero means no molecule (He₂, Be₂,
 * Ne₂), and any unpaired electron — O₂'s two in π* — makes it paramagnetic,
 * which the Lewis structure cannot explain.
 */

export interface MolecularOrbital {
  id: string;
  /** As printed: "σ2s", "π*2p". */
  label: string;
  bonding: boolean;
  /** Two for the π pairs. */
  degeneracy: 1 | 2;
}

const mo = (id: string, label: string, bonding: boolean, degeneracy: 1 | 2 = 1): MolecularOrbital => ({ id, label, bonding, degeneracy });

const CORE = [mo("s1s", "σ1s", true), mo("s1s*", "σ*1s", false), mo("s2s", "σ2s", true), mo("s2s*", "σ*2s", false)];
const PI = mo("p2p", "π2p", true, 2);
const SIGMA = mo("s2p", "σ2p", true);
const TOP = [mo("p2p*", "π*2p", false, 2), mo("s2p*", "σ*2p", false)];

/** The order the molecular orbitals fill in: π2p below σ2p up to nitrogen (Z ≤ 7), above it from oxygen on. */
export function orbitalOrder(Z: number): MolecularOrbital[] {
  return Z <= 7 ? [...CORE, PI, SIGMA, ...TOP] : [...CORE, SIGMA, PI, ...TOP];
}

export const MO_SYMBOLS = ["", "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne"] as const;

/** Textbook bond lengths (pm) and enthalpies (kJ mol⁻¹) of the neutral molecules. */
export const DIATOMIC_DATA: Readonly<Record<number, { length: number; enthalpy: number }>> = {
  1: { length: 74, enthalpy: 436 },
  3: { length: 267, enthalpy: 105 },
  5: { length: 159, enthalpy: 290 },
  6: { length: 124, enthalpy: 602 },
  7: { length: 110, enthalpy: 946 },
  8: { length: 121, enthalpy: 498 },
  9: { length: 142, enthalpy: 158 },
};

/** Electrons in each orbital of each MO (one entry per degenerate orbital), filled in order with Hund's rule. */
export function fillMOs(Z: number, electrons: number): number[][] {
  let left = Math.max(0, electrons);
  return orbitalOrder(Z).map((m) => {
    const n = Math.min(left, 2 * m.degeneracy);
    left -= n;
    if (m.degeneracy === 1) return [n];
    // Two degenerate orbitals: one electron each before any pair.
    return [n >= 3 ? 2 : Math.min(n, 1), n >= 4 ? 2 : n >= 2 ? 1 : 0];
  });
}

const SUP: Record<string, string> = { "1": "", "2": "²" };

/** "O₂", "O₂⁺", "O₂²⁻". */
export function diatomicFormula(Z: number, charge: number): string {
  const sym = MO_SYMBOLS[Math.min(10, Math.max(1, Math.round(Z)))];
  if (charge === 0) return `${sym}₂`;
  return `${sym}₂${SUP[String(Math.abs(charge))] ?? Math.abs(charge)}${charge > 0 ? "⁺" : "⁻"}`;
}

export type MOParams = {
  /** What Play steps through: the elements, or the charge on one molecule. */
  walk: "elements" | "charge";
};

export interface MOState {
  readonly Z: number;
  readonly charge: number;
  readonly clock: number;
}

export type MOResults = {
  Z: number;
  charge: number;
  electrons: number;
  bonding: number;
  antibonding: number;
  bondOrder: number;
  exists: number;
  unpaired: number;
  paramagnetic: number;
  piFirst: number;
  homo: number;
  bondLength: number;
  hasLength: number;
  bondEnthalpy: number;
  hasEnthalpy: number;
};

const clampZ = (z: number) => Math.min(10, Math.max(1, Math.round(z)));
const clampCharge = (q: number) => Math.min(2, Math.max(-2, Math.round(q)));

const OUTPUTS = [
  "Z", "charge", "electrons", "bonding", "antibonding", "bondOrder", "exists", "unpaired", "paramagnetic",
  "piFirst", "homo", "bondLength", "hasLength", "bondEnthalpy", "hasEnthalpy",
] as const satisfies readonly (keyof MOResults)[];

const MOVE_EVERY = 1.2;

export const moModel: SimulationModel<MOState, MOParams, MOResults> = {
  id: "mo",
  defaultParams: { walk: "elements" },
  outputs: OUTPUTS,
  stateVariables: ["Z", "charge"],

  initialize() {
    return { Z: 8, charge: 0, clock: 0 };
  },

  advance(state, dt, params) {
    const clock = state.clock + dt;
    if (clock < MOVE_EVERY) return { ...state, clock };
    if (params.walk === "charge") return { ...state, charge: state.charge >= 2 ? -2 : clampCharge(state.charge) + 1, clock: 0 };
    return { ...state, Z: state.Z >= 10 ? 1 : clampZ(state.Z) + 1, clock: 0 };
  },

  step(state, _params, sign) {
    return { ...state, Z: clampZ(state.Z + sign), clock: 0 };
  },

  derive(state) {
    const Z = clampZ(state.Z);
    const charge = clampCharge(state.charge);
    const electrons = Math.min(20, Math.max(0, 2 * Z - charge));
    const order = orbitalOrder(Z);
    const filled = fillMOs(Z, electrons);
    let bonding = 0;
    let antibonding = 0;
    let unpaired = 0;
    let homo = -1;
    filled.forEach((orbitals, i) => {
      const n = orbitals.reduce((a, b) => a + b, 0);
      if (order[i]!.bonding) bonding += n;
      else antibonding += n;
      unpaired += orbitals.filter((k) => k === 1).length;
      if (n > 0) homo = i;
    });
    const bondOrder = (bonding - antibonding) / 2;
    const data = charge === 0 ? DIATOMIC_DATA[Z] : undefined;
    return {
      Z,
      charge,
      electrons,
      bonding,
      antibonding,
      bondOrder,
      exists: bondOrder > 0 ? 1 : 0,
      unpaired,
      paramagnetic: unpaired > 0 ? 1 : 0,
      piFirst: Z <= 7 ? 1 : 0,
      homo,
      bondLength: data?.length ?? 0,
      hasLength: data ? 1 : 0,
      bondEnthalpy: data?.enthalpy ?? 0,
      hasEnthalpy: data ? 1 : 0,
    };
  },

  getVariable(state, id) {
    return id === "Z" ? state.Z : id === "charge" ? state.charge : undefined;
  },

  setVariable(state, id, value) {
    if (id === "Z") return { ...state, Z: clampZ(value) };
    if (id === "charge") return { ...state, charge: clampCharge(value) };
    return state;
  },
};
