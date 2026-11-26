import type { SimulationModel } from "@ise/science-engine";

/**
 * Nuclei, class 12.
 *
 * Size: a nucleus of mass number A has radius R = R₀A^⅓ with R₀ = 1.2 fm, so
 * its volume grows in step with A and its density — A atomic mass units in a
 * sphere of that volume — is about 2.3 × 10¹⁷ kg/m³ for every nucleus.
 *
 * Binding: a nucleus weighs less than its protons and neutrons apart. The
 * mass defect Δm = [Z·m(¹H) + (A − Z)·m_n] − M(atom), worked with *atomic*
 * masses throughout (the Z electrons in Z hydrogen atoms cancel the Z
 * electrons of the atom), and the binding energy is Δm × 931.5 MeV/u. The
 * masses are real (AME 2020, rounded to 6 decimals).
 *
 * The curve: binding energy per nucleon rises steeply through the light
 * nuclei, peaks near iron at about 8.8 MeV, and falls slowly to 7.6 MeV for
 * uranium. The smooth curve is a model — the semi-empirical (Weizsäcker)
 * formula along the line of stable nuclei — and the dots are the real values.
 * Splitting a heavy nucleus or fusing light ones both move towards the peak,
 * and the gain in binding is released as energy.
 *
 * Decay: a sample of 400 atoms. Each decays at a random moment, the same
 * moments every run (a seeded draw), so the count wanders about the law
 * N = N₀e^(−λt), with T½ = ln 2/λ ≈ 0.693/λ, mean life τ = 1/λ and activity
 * R = λN. Alpha, beta and gamma decays of real parents change A and Z.
 *
 * Reactions: the fission of U-235, deuterium–tritium fusion, and the Sun's
 * net 4 ¹H → ⁴He, each with Q from real masses; and a chain reaction in which
 * each fission sets off k more.
 */

/** Atomic mass of hydrogen-1 and the mass of the neutron, u. */
export const NUC_M_H = 1.007825;
export const NUC_M_N = 1.008665;
/** Electron mass, u (for β⁺ decay, where two electron masses go missing). */
export const NUC_M_E = 0.000549;
/** Energy equivalent of one atomic mass unit, MeV. */
export const NUC_MEV_PER_U = 931.5;
/** One atomic mass unit, kg. */
export const NUC_U_KG = 1.66054e-27;
/** R₀, fm. */
export const NUC_R0 = 1.2;

export const NUC_SYMBOLS: Record<number, string> = {
  0: "n",
  1: "H",
  2: "He",
  3: "Li",
  6: "C",
  7: "N",
  8: "O",
  10: "Ne",
  11: "Na",
  20: "Ca",
  26: "Fe",
  28: "Ni",
  36: "Kr",
  56: "Ba",
  82: "Pb",
  86: "Rn",
  88: "Ra",
  90: "Th",
  91: "Pa",
  92: "U",
};

export interface NucNuclide {
  /** Short name, e.g. "Fe-56". */
  name: string;
  Z: number;
  A: number;
  /** Atomic mass, u. */
  mass: number;
}

/** The nuclides on the binding-energy curve, keyed by mass number (each A appears once). */
export const NUC_NUCLIDE_ORDER: readonly number[] = [1, 2, 3, 4, 7, 12, 16, 40, 56, 92, 141, 208, 235, 238];
export const NUC_NUCLIDES: Record<number, NucNuclide> = {
  1: { name: "H-1", Z: 1, A: 1, mass: 1.007825 },
  2: { name: "H-2", Z: 1, A: 2, mass: 2.014102 },
  3: { name: "H-3", Z: 1, A: 3, mass: 3.016049 },
  4: { name: "He-4", Z: 2, A: 4, mass: 4.002603 },
  7: { name: "Li-7", Z: 3, A: 7, mass: 7.016003 },
  12: { name: "C-12", Z: 6, A: 12, mass: 12 },
  16: { name: "O-16", Z: 8, A: 16, mass: 15.994915 },
  40: { name: "Ca-40", Z: 20, A: 40, mass: 39.962591 },
  56: { name: "Fe-56", Z: 26, A: 56, mass: 55.934936 },
  92: { name: "Kr-92", Z: 36, A: 92, mass: 91.926173 },
  141: { name: "Ba-141", Z: 56, A: 141, mass: 140.914403 },
  208: { name: "Pb-208", Z: 82, A: 208, mass: 207.976652 },
  235: { name: "U-235", Z: 92, A: 235, mass: 235.04393 },
  238: { name: "U-238", Z: 92, A: 238, mass: 238.050788 },
};

/** Mass defect of a nucleus from its atomic mass, u. */
export function nucMassDefect(Z: number, A: number, mass: number): number {
  return Z * NUC_M_H + (A - Z) * NUC_M_N - mass;
}

/** Binding energy, MeV. */
export function nucBindingEnergy(Z: number, A: number, mass: number): number {
  return nucMassDefect(Z, A, mass) * NUC_MEV_PER_U;
}

/** Nuclear radius R = R₀A^⅓, fm. */
export function nucRadius(A: number): number {
  return NUC_R0 * Math.cbrt(A);
}

/** Density of a nucleus taken as A atomic mass units in a sphere of radius R₀A^⅓, kg/m³. */
export function nucDensity(A: number): number {
  const r = nucRadius(A) * 1e-15;
  return (A * NUC_U_KG) / ((4 / 3) * Math.PI * r * r * r);
}

/** Everyday densities to set a nucleus against, kg/m³. */
export const NUC_EVERYDAY_DENSITIES: readonly { label: string; density: number }[] = [
  { label: "water", density: 1000 },
  { label: "iron", density: 7870 },
];

/** Semi-empirical (Weizsäcker) coefficients, MeV — volume, surface, Coulomb, asymmetry. */
export const NUC_SEMF = { volume: 15.75, surface: 17.8, coulomb: 0.711, asymmetry: 23.7 } as const;

/** The Z of the most stable nucleus of mass number A on the model (pairing left out). */
export function nucStableZ(A: number): number {
  return A / (2 + (NUC_SEMF.coulomb / (2 * NUC_SEMF.asymmetry)) * Math.cbrt(A) ** 2);
}

/** Binding energy per nucleon on the model curve, MeV — a smooth model, poor for the lightest nuclei. */
export function nucModelPerNucleon(A: number): number {
  const a = Math.max(1, A);
  const Z = nucStableZ(a);
  const B =
    NUC_SEMF.volume * a -
    NUC_SEMF.surface * Math.cbrt(a) ** 2 -
    (NUC_SEMF.coulomb * Z * (Z - 1)) / Math.cbrt(a) -
    (NUC_SEMF.asymmetry * (a - 2 * Z) ** 2) / a;
  return B / a;
}

/** Where the model curve peaks (found once, by trying every A). */
export const NUC_MODEL_PEAK_A: number = (() => {
  let best = 4;
  for (let A = 4; A <= 240; A++) if (nucModelPerNucleon(A) > nucModelPerNucleon(best)) best = A;
  return best;
})();
/** Within this many mass numbers of the model's peak counts as at the top. */
export const NUC_PEAK_WINDOW = 6;

// ── Radioactive decay ────────────────────────────────────────────────────────

export type NucDecayKind = "alpha" | "beta-minus" | "beta-plus" | "gamma";
export const NUC_DECAY_KINDS: readonly NucDecayKind[] = ["alpha", "beta-minus", "beta-plus", "gamma"];

export interface NucParent {
  label: string;
  kind: NucDecayKind;
  parent: NucNuclide;
  daughter: NucNuclide;
  /** Excited parent (γ decay): the photon's energy, MeV, in place of a mass difference. */
  photon?: number;
}

export type NucParentId = "u238" | "ra226" | "th234" | "c14" | "na22" | "ni60";
export const NUC_PARENT_ORDER: readonly NucParentId[] = ["u238", "ra226", "th234", "c14", "na22", "ni60"];
const He4 = NUC_NUCLIDES[4]!;
export const NUC_PARENTS: Record<NucParentId, NucParent> = {
  u238: { label: "U-238", kind: "alpha", parent: NUC_NUCLIDES[238]!, daughter: { name: "Th-234", Z: 90, A: 234, mass: 234.043601 } },
  ra226: { label: "Ra-226", kind: "alpha", parent: { name: "Ra-226", Z: 88, A: 226, mass: 226.02541 }, daughter: { name: "Rn-222", Z: 86, A: 222, mass: 222.017578 } },
  th234: { label: "Th-234", kind: "beta-minus", parent: { name: "Th-234", Z: 90, A: 234, mass: 234.043601 }, daughter: { name: "Pa-234", Z: 91, A: 234, mass: 234.043308 } },
  c14: { label: "C-14", kind: "beta-minus", parent: { name: "C-14", Z: 6, A: 14, mass: 14.003242 }, daughter: { name: "N-14", Z: 7, A: 14, mass: 14.003074 } },
  na22: { label: "Na-22", kind: "beta-plus", parent: { name: "Na-22", Z: 11, A: 22, mass: 21.994437 }, daughter: { name: "Ne-22", Z: 10, A: 22, mass: 21.991385 } },
  ni60: {
    label: "Ni-60*",
    kind: "gamma",
    parent: { name: "Ni-60*", Z: 28, A: 60, mass: 59.930786 },
    daughter: { name: "Ni-60", Z: 28, A: 60, mass: 59.930786 },
    photon: 1.33,
  },
};

/** Energy released in a decay, MeV, from atomic masses. */
export function nucDecayQ(p: NucParent): number {
  if (p.kind === "gamma") return p.photon ?? 0;
  const loss =
    p.kind === "alpha"
      ? p.parent.mass - p.daughter.mass - He4.mass
      : p.kind === "beta-minus"
        ? p.parent.mass - p.daughter.mass
        : p.parent.mass - p.daughter.mass - 2 * NUC_M_E;
  return loss * NUC_MEV_PER_U;
}

/** Atoms in the sample. */
export const NUC_SAMPLE = 400;
export const NUC_GRID = 20;
export const NUC_MAX_TIME = 400;
export const NUC_HALF_LIFE_RANGE: readonly [number, number] = [10, 100];

/** One fixed random draw per atom, in (0, 1): atom i is still there while its draw is below e^(−λt). */
export const NUC_DECAY_DRAWS: readonly number[] = (() => {
  let s = 20261140 >>> 0;
  const random = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: NUC_SAMPLE }, () => 1 - random());
})();

/** Whether atom i is still undecayed when a fraction `remaining` of the law is left. */
export function nucSurvives(i: number, remaining: number): boolean {
  return (NUC_DECAY_DRAWS[i] ?? 1) < remaining;
}

// ── Reactions ────────────────────────────────────────────────────────────────

export interface NucReaction {
  label: string;
  /** The reaction written out, and its masses in and out, u. */
  equation: string;
  before: number;
  after: number;
  /** Nucleons that go in, for the energy per nucleon of fuel. */
  nucleons: number;
  fusion: boolean;
}

export type NucReactionId = "fission" | "dt" | "sun";
export const NUC_REACTION_ORDER: readonly NucReactionId[] = ["fission", "dt", "sun"];
const m = (A: number) => NUC_NUCLIDES[A]!.mass;
export const NUC_REACTIONS: Record<NucReactionId, NucReaction> = {
  fission: {
    label: "Fission of U-235",
    equation: "n + ²³⁵U → ¹⁴¹Ba + ⁹²Kr + 3n",
    before: NUC_M_N + m(235),
    after: m(141) + m(92) + 3 * NUC_M_N,
    nucleons: 236,
    fusion: false,
  },
  dt: {
    label: "Deuterium–tritium fusion",
    equation: "²H + ³H → ⁴He + n",
    before: m(2) + m(3),
    after: m(4) + NUC_M_N,
    nucleons: 5,
    fusion: true,
  },
  sun: {
    label: "Hydrogen to helium in the Sun",
    equation: "4 ¹H → ⁴He + 2e⁺ + 2ν",
    // With atomic masses the two positrons' annihilation with two of the four electrons is included.
    before: 4 * m(1),
    after: m(4),
    nucleons: 4,
    fusion: true,
  },
};

export const NUC_K_RANGE: readonly [number, number] = [0.5, 2.5];
export const NUC_MAX_GENERATION = 10;

// ── The model ────────────────────────────────────────────────────────────────

export type NucleusParams = {
  /** The nuclide studied, by its mass number (one of NUC_NUCLIDE_ORDER). */
  nuclide: number;
  parent: NucParentId;
  reaction: NucReactionId;
};

export interface NucleusState {
  /** Where the marker sits on the model curve. */
  readonly curveA: number;
  /** Half-life of the sample, s, and the time since it was fresh, s. */
  readonly halfLife: number;
  readonly t: number;
  /** Neutrons from each fission that go on to cause another, and the generation looked at. */
  readonly k: number;
  readonly generation: number;
}

export type NucleusResults = {
  nuclide: number;
  massNumber: number;
  protons: number;
  neutrons: number;
  radius: number;
  volume: number;
  density: number;
  atomicMass: number;
  partsMass: number;
  massDefect: number;
  bindingEnergy: number;
  bindingPerNucleon: number;
  curveA: number;
  curveZ: number;
  curvePerNucleon: number;
  peakA: number;
  atPeak: number;
  t: number;
  halfLife: number;
  lambda: number;
  meanLife: number;
  expected: number;
  counted: number;
  decayed: number;
  fraction: number;
  activity: number;
  halfLivesGone: number;
  parent: number;
  decayKind: number;
  parentZ: number;
  parentA: number;
  daughterZ: number;
  daughterA: number;
  deltaZ: number;
  deltaA: number;
  decayQ: number;
  reaction: number;
  massBefore: number;
  massAfter: number;
  reactionDefect: number;
  q: number;
  qPerNucleon: number;
  fusion: number;
  k: number;
  generation: number;
  chainFissions: number;
  chainKind: number;
};

const OUTPUTS = [
  "nuclide", "massNumber", "protons", "neutrons", "radius", "volume", "density", "atomicMass", "partsMass", "massDefect", "bindingEnergy", "bindingPerNucleon",
  "curveA", "curveZ", "curvePerNucleon", "peakA", "atPeak",
  "t", "halfLife", "lambda", "meanLife", "expected", "counted", "decayed", "fraction", "activity", "halfLivesGone",
  "parent", "decayKind", "parentZ", "parentA", "daughterZ", "daughterA", "deltaZ", "deltaA", "decayQ",
  "reaction", "massBefore", "massAfter", "reactionDefect", "q", "qPerNucleon", "fusion", "k", "generation", "chainFissions", "chainKind",
] as const satisfies readonly (keyof NucleusResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
const nuclideOf = (params: NucleusParams) => NUC_NUCLIDES[Number(params.nuclide)] ?? NUC_NUCLIDES[56]!;
const parentOf = (params: NucleusParams) => (NUC_PARENT_ORDER.includes(params.parent) ? params.parent : "u238");
const reactionOf = (params: NucleusParams) => (NUC_REACTION_ORDER.includes(params.reaction) ? params.reaction : "fission");

export const nucleusModel: SimulationModel<NucleusState, NucleusParams, NucleusResults> = {
  id: "nucleus",
  defaultParams: { nuclide: 56, parent: "u238", reaction: "fission" },
  outputs: OUTPUTS,
  stateVariables: ["curveA", "halfLife", "t", "k", "generation"],

  initialize() {
    return { curveA: 20, halfLife: 30, t: 0, k: 2, generation: 4 };
  },

  /** Play lets the sample decay, and stops when the clock runs out. */
  advance(state, dt) {
    return { ...state, t: clamp(state.t + dt, 0, NUC_MAX_TIME) };
  },

  /** A step moves the clock on or back by a quarter of a half-life. */
  step(state, _params, sign) {
    const quarter = clamp(state.halfLife, NUC_HALF_LIFE_RANGE[0], NUC_HALF_LIFE_RANGE[1]) / 4;
    return { ...state, t: clamp(Math.round(state.t / quarter) * quarter + quarter * sign, 0, NUC_MAX_TIME) };
  },

  derive(state, params) {
    const n = nuclideOf(params);
    const radius = nucRadius(n.A);
    const defect = nucMassDefect(n.Z, n.A, n.mass);
    const binding = defect * NUC_MEV_PER_U;

    const curveA = Math.round(clamp(state.curveA, 4, 240));

    const halfLife = clamp(state.halfLife, NUC_HALF_LIFE_RANGE[0], NUC_HALF_LIFE_RANGE[1]);
    const t = clamp(state.t, 0, NUC_MAX_TIME);
    const lambda = Math.LN2 / halfLife;
    const fraction = Math.exp(-lambda * t);
    let counted = 0;
    for (let i = 0; i < NUC_SAMPLE; i++) if (nucSurvives(i, fraction)) counted++;
    const expected = NUC_SAMPLE * fraction;

    const parentId = parentOf(params);
    const p = NUC_PARENTS[parentId];

    const reactionId = reactionOf(params);
    const r = NUC_REACTIONS[reactionId];
    const reactionDefect = r.before - r.after;
    const q = reactionDefect * NUC_MEV_PER_U;

    const k = clamp(state.k, NUC_K_RANGE[0], NUC_K_RANGE[1]);
    const generation = Math.round(clamp(state.generation, 0, NUC_MAX_GENERATION));

    return {
      nuclide: n.A,
      massNumber: n.A,
      protons: n.Z,
      neutrons: n.A - n.Z,
      radius,
      volume: (4 / 3) * Math.PI * radius ** 3,
      density: nucDensity(n.A),
      atomicMass: n.mass,
      partsMass: n.Z * NUC_M_H + (n.A - n.Z) * NUC_M_N,
      massDefect: defect,
      bindingEnergy: binding,
      bindingPerNucleon: binding / n.A,
      curveA,
      curveZ: Math.round(nucStableZ(curveA)),
      curvePerNucleon: nucModelPerNucleon(curveA),
      peakA: NUC_MODEL_PEAK_A,
      atPeak: Math.abs(curveA - NUC_MODEL_PEAK_A) <= NUC_PEAK_WINDOW ? 1 : 0,
      t,
      halfLife,
      lambda,
      meanLife: 1 / lambda,
      expected,
      counted,
      decayed: NUC_SAMPLE - counted,
      fraction,
      activity: lambda * expected,
      halfLivesGone: t / halfLife,
      parent: NUC_PARENT_ORDER.indexOf(parentId),
      decayKind: NUC_DECAY_KINDS.indexOf(p.kind),
      parentZ: p.parent.Z,
      parentA: p.parent.A,
      daughterZ: p.daughter.Z,
      daughterA: p.daughter.A,
      deltaZ: p.daughter.Z - p.parent.Z || 0,
      deltaA: p.daughter.A - p.parent.A || 0,
      decayQ: nucDecayQ(p),
      reaction: NUC_REACTION_ORDER.indexOf(reactionId),
      massBefore: r.before,
      massAfter: r.after,
      reactionDefect,
      q,
      qPerNucleon: q / r.nucleons,
      fusion: r.fusion ? 1 : 0,
      k,
      generation,
      chainFissions: k ** generation,
      chainKind: Math.abs(k - 1) < 0.005 ? 1 : k < 1 ? 0 : 2,
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof NucleusState] : undefined;
  },

  setVariable(state, id, value) {
    switch (id) {
      case "curveA": return { ...state, curveA: Math.round(clamp(value, 4, 240)) };
      case "halfLife": return { ...state, halfLife: clamp(value, NUC_HALF_LIFE_RANGE[0], NUC_HALF_LIFE_RANGE[1]) };
      case "t": return { ...state, t: clamp(value, 0, NUC_MAX_TIME) };
      case "k": return { ...state, k: clamp(value, NUC_K_RANGE[0], NUC_K_RANGE[1]) };
      case "generation": return { ...state, generation: Math.round(clamp(value, 0, NUC_MAX_GENERATION)) };
      default: return state;
    }
  },
};
