import type { SimulationModel } from "@ise/science-engine";

/**
 * Molecular shapes by VSEPR: electron pairs round a central atom push as far
 * apart as they can.
 *
 * Count the electron domains — bonds and lone pairs — and the arrangement
 * follows: two make a line, three a triangle, four a tetrahedron, five a
 * trigonal bipyramid, six an octahedron. The shape is then what the atoms
 * alone trace out, with the lone pairs invisible but taking up room (and
 * squeezing the bond angles). The molecule can be turned in 3D; its geometry
 * is built here, so the renderer draws exactly what the model says.
 */

export type MoleculeId = "co2" | "bf3" | "ch4" | "nh3" | "h2o" | "pcl5" | "sf4" | "clf3" | "xef2" | "sf6" | "brf5" | "xef4";

export interface Molecule {
  id: MoleculeId;
  formula: string;
  central: string;
  ligand: string;
  bondPairs: number;
  lonePairs: number;
  /** The bond angle quoted in textbooks, degrees (for five domains, the equatorial one). */
  bondAngle: number;
  shape: number;
  polar: boolean;
}

/** Shapes and electron arrangements, by name; results refer to them by index. */
export const SHAPES = [
  "linear",
  "trigonal planar",
  "tetrahedral",
  "trigonal pyramidal",
  "bent",
  "trigonal bipyramidal",
  "see-saw",
  "T-shaped",
  "octahedral",
  "square pyramidal",
  "square planar",
] as const;
export const ARRANGEMENTS = ["", "", "linear", "trigonal planar", "tetrahedral", "trigonal bipyramidal", "octahedral"] as const;
export const HYBRIDISATION = ["", "", "sp", "sp²", "sp³", "sp³d", "sp³d²"] as const;

const S = (name: (typeof SHAPES)[number]) => SHAPES.indexOf(name);

export const MOLECULES: Record<MoleculeId, Molecule> = {
  co2: { id: "co2", formula: "CO₂", central: "C", ligand: "O", bondPairs: 2, lonePairs: 0, bondAngle: 180, shape: S("linear"), polar: false },
  bf3: { id: "bf3", formula: "BF₃", central: "B", ligand: "F", bondPairs: 3, lonePairs: 0, bondAngle: 120, shape: S("trigonal planar"), polar: false },
  ch4: { id: "ch4", formula: "CH₄", central: "C", ligand: "H", bondPairs: 4, lonePairs: 0, bondAngle: 109.5, shape: S("tetrahedral"), polar: false },
  nh3: { id: "nh3", formula: "NH₃", central: "N", ligand: "H", bondPairs: 3, lonePairs: 1, bondAngle: 107, shape: S("trigonal pyramidal"), polar: true },
  h2o: { id: "h2o", formula: "H₂O", central: "O", ligand: "H", bondPairs: 2, lonePairs: 2, bondAngle: 104.5, shape: S("bent"), polar: true },
  pcl5: { id: "pcl5", formula: "PCl₅", central: "P", ligand: "Cl", bondPairs: 5, lonePairs: 0, bondAngle: 120, shape: S("trigonal bipyramidal"), polar: false },
  sf4: { id: "sf4", formula: "SF₄", central: "S", ligand: "F", bondPairs: 4, lonePairs: 1, bondAngle: 102, shape: S("see-saw"), polar: true },
  clf3: { id: "clf3", formula: "ClF₃", central: "Cl", ligand: "F", bondPairs: 3, lonePairs: 2, bondAngle: 87.5, shape: S("T-shaped"), polar: true },
  xef2: { id: "xef2", formula: "XeF₂", central: "Xe", ligand: "F", bondPairs: 2, lonePairs: 3, bondAngle: 180, shape: S("linear"), polar: false },
  sf6: { id: "sf6", formula: "SF₆", central: "S", ligand: "F", bondPairs: 6, lonePairs: 0, bondAngle: 90, shape: S("octahedral"), polar: false },
  brf5: { id: "brf5", formula: "BrF₅", central: "Br", ligand: "F", bondPairs: 5, lonePairs: 1, bondAngle: 85, shape: S("square pyramidal"), polar: true },
  xef4: { id: "xef4", formula: "XeF₄", central: "Xe", ligand: "F", bondPairs: 4, lonePairs: 2, bondAngle: 90, shape: S("square planar"), polar: false },
};

export const MOLECULE_ORDER: readonly MoleculeId[] = ["co2", "bf3", "ch4", "nh3", "h2o", "pcl5", "sf4", "clf3", "xef2", "sf6", "brf5", "xef4"];

export type Vec3 = readonly [number, number, number];

/**
 * Where the electron domains point, for each number of domains. The order
 * matters: VSEPR fills lone pairs first into the places that give them most
 * room, so those come first where it makes a difference — the equator of a
 * trigonal bipyramid, and opposite corners of an octahedron.
 */
const DOMAINS: Record<number, readonly Vec3[]> = {
  2: [
    [1, 0, 0],
    [-1, 0, 0],
  ],
  3: [0, 1, 2].map((k) => [Math.cos((k * 2 * Math.PI) / 3), Math.sin((k * 2 * Math.PI) / 3), 0] as Vec3),
  4: [
    // One corner straight up, so a lone pair there leaves a pyramid below.
    [0, 0, 1],
    [Math.sqrt(8 / 9), 0, -1 / 3],
    [-Math.sqrt(2 / 9), Math.sqrt(2 / 3), -1 / 3],
    [-Math.sqrt(2 / 9), -Math.sqrt(2 / 3), -1 / 3],
  ],
  5: [
    // Equatorial first — lone pairs go there — then the two axial positions.
    [1, 0, 0],
    [Math.cos((2 * Math.PI) / 3), Math.sin((2 * Math.PI) / 3), 0],
    [Math.cos((4 * Math.PI) / 3), Math.sin((4 * Math.PI) / 3), 0],
    [0, 0, 1],
    [0, 0, -1],
  ],
  6: [
    // Opposite corners first, so two lone pairs sit trans to each other.
    [0, 0, 1],
    [0, 0, -1],
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
  ],
};

/**
 * Bond directions (unit vectors from the central atom) and lone-pair
 * directions, in the molecule's own frame. The domain lists are ordered so
 * that lone pairs take the first places — which is how XeF₂ ends up linear:
 * its three lone pairs fill the equator, leaving the two bonds axial.
 */
export function geometry(m: Molecule): { bonds: Vec3[]; lone: Vec3[] } {
  const all = DOMAINS[m.bondPairs + m.lonePairs] ?? DOMAINS[4]!;
  return { lone: all.slice(0, m.lonePairs), bonds: all.slice(m.lonePairs) };
}

/** Turn a point by yaw (about the vertical) then pitch (about the horizontal), for drawing. */
export function rotate([x, y, z]: Vec3, yaw: number, pitch: number): Vec3 {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x1 = x * cy + y * sy;
  const y1 = -x * sy + y * cy;
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  return [x1, y1 * cp - z * sp, y1 * sp + z * cp];
}

/** Angle between two directions, degrees. */
export function angleBetween(a: Vec3, b: Vec3): number {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI;
}

/** How fast play turns the molecule, radians per second. */
export const SPIN_RATE = 0.8;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export type VseprParams = { molecule: MoleculeId };

export interface VseprState {
  /** How the molecule is turned for viewing, radians. */
  readonly yaw: number;
  readonly pitch: number;
}

export type VseprResults = {
  molecule: number;
  bondPairs: number;
  lonePairs: number;
  stericNumber: number;
  bondAngle: number;
  /** The smallest angle between two bonds in the drawn geometry, degrees (before lone-pair squeezing). */
  idealAngle: number;
  shape: number;
  arrangement: number;
  hybridisation: number;
  polar: number;
  yaw: number;
  pitch: number;
};

export function moleculeOf(params: VseprParams): Molecule {
  return MOLECULES[params.molecule] ?? MOLECULES.ch4;
}

const OUTPUTS = ["molecule", "bondPairs", "lonePairs", "stericNumber", "bondAngle", "idealAngle", "shape", "arrangement", "hybridisation", "polar", "yaw", "pitch"] as const satisfies readonly (keyof VseprResults)[];

export const vseprModel: SimulationModel<VseprState, VseprParams, VseprResults> = {
  id: "vsepr",
  defaultParams: { molecule: "ch4" },
  outputs: OUTPUTS,
  stateVariables: ["yaw", "pitch"],

  initialize() {
    // Slightly from above and to one side, so a tetrahedron reads as 3D and not as a flat cross.
    return { yaw: 0.5, pitch: 0.35 };
  },

  /** Play turns the molecule slowly round, so every side can be seen. */
  advance(state, dt) {
    return { ...state, yaw: wrap(state.yaw + SPIN_RATE * dt) };
  },

  /** A step turns it by 30°. */
  step(state, _params, sign) {
    return { ...state, yaw: wrap(state.yaw + (sign * Math.PI) / 6) };
  },

  derive(state, params) {
    const m = moleculeOf(params);
    const { bonds } = geometry(m);
    let smallest = 180;
    for (let i = 0; i < bonds.length; i++) for (let j = i + 1; j < bonds.length; j++) smallest = Math.min(smallest, angleBetween(bonds[i]!, bonds[j]!));
    const steric = m.bondPairs + m.lonePairs;
    return {
      molecule: MOLECULE_ORDER.indexOf(m.id),
      bondPairs: m.bondPairs,
      lonePairs: m.lonePairs,
      stericNumber: steric,
      bondAngle: m.bondAngle,
      idealAngle: Math.round(smallest * 10) / 10,
      shape: m.shape,
      arrangement: steric,
      hybridisation: steric,
      polar: m.polar ? 1 : 0,
      yaw: state.yaw,
      pitch: state.pitch,
    };
  },

  getVariable(state, id) {
    if (id === "yaw") return state.yaw;
    if (id === "pitch") return state.pitch;
    return undefined;
  },

  setVariable(state, id, value) {
    if (id === "yaw") return { ...state, yaw: wrap(value) };
    if (id === "pitch") return { ...state, pitch: Math.max(-Math.PI / 2, Math.min(Math.PI / 2, value)) };
    return state;
  },
};
