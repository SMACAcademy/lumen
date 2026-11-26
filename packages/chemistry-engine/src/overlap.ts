import type { SimulationModel } from "@ise/science-engine";

/**
 * Valence bond theory: a covalent bond is two half-filled orbitals
 * overlapping, with the shared pair between the nuclei.
 *
 * Bring two hydrogen atoms together and the energy falls as each nucleus
 * attracts the other's electron, then climbs steeply as the nuclei repel.
 * The bottom of the well is the bond: 74 pm apart, 435.8 kJ/mol below two
 * separate atoms. The curve here is a Morse potential through NCERT's two
 * numbers — a model of the shape, not a calculation from first principles.
 * The overlap of the two 1s orbitals is the exact integral
 * S = e^(−R/a₀)(1 + R/a₀ + R²/3a₀²).
 *
 * How the orbitals meet decides the kind of bond: head-on along the line of
 * the nuclei is a sigma (σ) bond; side by side, above and below that line,
 * a pi (π) bond; an s orbital meeting a p orbital sideways cancels to
 * nothing. In a molecule every bonded pair has one σ bond, and a double or
 * triple bond adds one or two π bonds on top.
 */

export const H2_BOND_LENGTH = 74;
export const H2_BOND_ENTHALPY = 435.8;
/** Morse width parameter for H₂, per pm. */
const MORSE_A = 0.0194;
const BOHR_RADIUS = 52.9;
export const MIN_DISTANCE = 30;
export const MAX_DISTANCE = 400;

/** Energy of two H atoms R pm apart, kJ/mol, with separate atoms at zero. */
export function h2Energy(distance: number): number {
  const x = 1 - Math.exp(-MORSE_A * (distance - H2_BOND_LENGTH));
  return H2_BOND_ENTHALPY * (x * x - 1);
}

/** Overlap integral of two hydrogen 1s orbitals R pm apart: 1 on top of each other, 0 far apart. */
export function overlapIntegral(distance: number): number {
  const r = Math.max(0, distance) / BOHR_RADIUS;
  return Math.exp(-r) * (1 + r + (r * r) / 3);
}

export type OverlapTypeId = "ss" | "sp" | "pp-head" | "pp-side" | "sp-side";
export const OVERLAP_TYPE_ORDER: readonly OverlapTypeId[] = ["ss", "sp", "pp-head", "pp-side", "sp-side"];
export const OVERLAP_TYPES: Record<OverlapTypeId, { name: string; orbitals: readonly ["s" | "p", "s" | "p"]; headOn: boolean; bond: "sigma" | "pi" | "none" }> = {
  ss: { name: "s with s", orbitals: ["s", "s"], headOn: true, bond: "sigma" },
  sp: { name: "s with p, end-on", orbitals: ["s", "p"], headOn: true, bond: "sigma" },
  "pp-head": { name: "p with p, end-on", orbitals: ["p", "p"], headOn: true, bond: "sigma" },
  "pp-side": { name: "p with p, side by side", orbitals: ["p", "p"], headOn: false, bond: "pi" },
  "sp-side": { name: "s with p, sideways", orbitals: ["s", "p"], headOn: false, bond: "none" },
};

export interface BondedMolecule {
  formula: string;
  name: string;
  /** Atoms, placed for drawing in units of about one bond length. */
  atoms: readonly { el: string; x: number; y: number }[];
  /** Bonds as [atom, atom, order]. */
  bonds: readonly (readonly [number, number, 1 | 2 | 3])[];
}

const at = (el: string, x: number, y: number) => ({ el, x, y });
const hexagon = (radius: number) => Array.from({ length: 6 }, (_, k) => [radius * Math.cos(Math.PI / 2 + (k * Math.PI) / 3), radius * Math.sin(Math.PI / 2 + (k * Math.PI) / 3)] as const);
const RING = hexagon(1.2);
const RING_H = hexagon(2.25);

export type BondedMoleculeId = "h2" | "ethane" | "ethene" | "ethyne" | "n2" | "o2" | "co2" | "hcn" | "methanal" | "benzene";
export const BONDED_MOLECULE_ORDER: readonly BondedMoleculeId[] = ["h2", "ethane", "ethene", "ethyne", "n2", "o2", "co2", "hcn", "methanal", "benzene"];
export const BONDED_MOLECULES: Record<BondedMoleculeId, BondedMolecule> = {
  h2: { formula: "H₂", name: "Hydrogen", atoms: [at("H", -0.6, 0), at("H", 0.6, 0)], bonds: [[0, 1, 1]] },
  ethane: {
    formula: "C₂H₆",
    name: "Ethane",
    atoms: [at("C", -0.65, 0), at("C", 0.65, 0), at("H", -1.2, 1.05), at("H", -1.85, 0), at("H", -1.2, -1.05), at("H", 1.2, 1.05), at("H", 1.85, 0), at("H", 1.2, -1.05)],
    bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1], [1, 5, 1], [1, 6, 1], [1, 7, 1]],
  },
  ethene: {
    formula: "C₂H₄",
    name: "Ethene",
    atoms: [at("C", -0.65, 0), at("C", 0.65, 0), at("H", -1.35, 1), at("H", -1.35, -1), at("H", 1.35, 1), at("H", 1.35, -1)],
    bonds: [[0, 1, 2], [0, 2, 1], [0, 3, 1], [1, 4, 1], [1, 5, 1]],
  },
  ethyne: { formula: "C₂H₂", name: "Ethyne", atoms: [at("H", -1.9, 0), at("C", -0.65, 0), at("C", 0.65, 0), at("H", 1.9, 0)], bonds: [[0, 1, 1], [1, 2, 3], [2, 3, 1]] },
  n2: { formula: "N₂", name: "Nitrogen", atoms: [at("N", -0.65, 0), at("N", 0.65, 0)], bonds: [[0, 1, 3]] },
  o2: { formula: "O₂", name: "Oxygen", atoms: [at("O", -0.65, 0), at("O", 0.65, 0)], bonds: [[0, 1, 2]] },
  co2: { formula: "CO₂", name: "Carbon dioxide", atoms: [at("O", -1.3, 0), at("C", 0, 0), at("O", 1.3, 0)], bonds: [[0, 1, 2], [1, 2, 2]] },
  hcn: { formula: "HCN", name: "Hydrogen cyanide", atoms: [at("H", -1.25, 0), at("C", 0, 0), at("N", 1.3, 0)], bonds: [[0, 1, 1], [1, 2, 3]] },
  methanal: { formula: "HCHO", name: "Methanal", atoms: [at("C", 0, 0), at("O", 1.3, 0), at("H", -0.75, 1), at("H", -0.75, -1)], bonds: [[0, 1, 2], [0, 2, 1], [0, 3, 1]] },
  benzene: {
    formula: "C₆H₆",
    name: "Benzene",
    atoms: [...RING.map(([x, y]) => at("C", x, y)), ...RING_H.map(([x, y]) => at("H", x, y))],
    bonds: [
      ...RING.map((_, k) => [k, (k + 1) % 6, k % 2 === 0 ? 2 : 1] as const),
      ...RING.map((_, k) => [k, k + 6, 1] as const),
    ],
  },
};

/** σ bonds: one for every bonded pair. π bonds: one for each bond order above the first. */
export function bondCounts(molecule: BondedMolecule): { sigma: number; pi: number; doubles: number; triples: number } {
  return {
    sigma: molecule.bonds.length,
    pi: molecule.bonds.reduce((sum, [, , order]) => sum + order - 1, 0),
    doubles: molecule.bonds.filter(([, , order]) => order === 2).length,
    triples: molecule.bonds.filter(([, , order]) => order === 3).length,
  };
}

export type OverlapParams = { overlapType: OverlapTypeId; molecule: BondedMoleculeId };

export interface OverlapState {
  /** Distance between the two hydrogen nuclei, pm. */
  readonly distance: number;
}

export type OverlapResults = {
  distance: number;
  /** Energy relative to separate atoms, kJ/mol. */
  energy: number;
  overlap: number;
  /** 1 within 3 pm of the bond length; 1 when the nuclei are closer than that. */
  atMinimum: number;
  repelling: number;
  overlapType: number;
  sigma: number;
  pi: number;
  zero: number;
  headOn: number;
  molecule: number;
  sigmaBonds: number;
  piBonds: number;
  totalBonds: number;
  doubleBonds: number;
  tripleBonds: number;
};

const OUTPUTS = [
  "distance", "energy", "overlap", "atMinimum", "repelling", "overlapType", "sigma", "pi", "zero", "headOn",
  "molecule", "sigmaBonds", "piBonds", "totalBonds", "doubleBonds", "tripleBonds",
] as const satisfies readonly (keyof OverlapResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** How fast play brings the atoms together, pm per second. */
const APPROACH = 60;

export const overlapModel: SimulationModel<OverlapState, OverlapParams, OverlapResults> = {
  id: "overlap",
  defaultParams: { overlapType: "ss", molecule: "ethene" },
  outputs: OUTPUTS,
  stateVariables: ["distance"],

  initialize() {
    return { distance: 300 };
  },

  /** Play lets the atoms fall together, and stops at the bottom of the well. */
  advance(state, dt) {
    if (state.distance <= H2_BOND_LENGTH) return state;
    return { distance: Math.max(H2_BOND_LENGTH, state.distance - APPROACH * dt) };
  },

  step(state, _params, sign) {
    return { distance: clamp(Math.round(state.distance / 10) * 10 - 10 * sign, MIN_DISTANCE, MAX_DISTANCE) };
  },

  derive(state, params) {
    const distance = clamp(state.distance, MIN_DISTANCE, MAX_DISTANCE);
    const typeId = OVERLAP_TYPE_ORDER.includes(params.overlapType) ? params.overlapType : "ss";
    const type = OVERLAP_TYPES[typeId];
    const moleculeId = BONDED_MOLECULE_ORDER.includes(params.molecule) ? params.molecule : "ethene";
    const counts = bondCounts(BONDED_MOLECULES[moleculeId]);
    return {
      distance,
      energy: h2Energy(distance),
      overlap: overlapIntegral(distance),
      atMinimum: Math.abs(distance - H2_BOND_LENGTH) <= 3 ? 1 : 0,
      repelling: distance < H2_BOND_LENGTH - 3 ? 1 : 0,
      overlapType: OVERLAP_TYPE_ORDER.indexOf(typeId),
      sigma: type.bond === "sigma" ? 1 : 0,
      pi: type.bond === "pi" ? 1 : 0,
      zero: type.bond === "none" ? 1 : 0,
      headOn: type.headOn ? 1 : 0,
      molecule: BONDED_MOLECULE_ORDER.indexOf(moleculeId),
      sigmaBonds: counts.sigma,
      piBonds: counts.pi,
      totalBonds: counts.sigma + counts.pi,
      doubleBonds: counts.doubles,
      tripleBonds: counts.triples,
    };
  },

  getVariable(state, id) {
    return id === "distance" ? state.distance : undefined;
  },

  setVariable(state, id, value) {
    return id === "distance" ? { distance: clamp(value, MIN_DISTANCE, MAX_DISTANCE) } : state;
  },
};
