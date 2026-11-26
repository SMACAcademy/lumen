import type { SimulationModel } from "@ise/science-engine";

/**
 * Orbitals: where the electrons of an atom go, and what an orbital looks like.
 *
 * Electrons fill subshells in order of energy — the (n + l) rule, 1s 2s 2p 3s
 * 3p 4s 3d 4p — two to an orbital with opposite spins (Pauli), and spread out
 * one to an orbital before any pair up (Hund). Chromium and copper break the
 * order: a half-full or full 3d is worth borrowing a 4s electron for.
 *
 * Separately, one orbital is picked by its quantum numbers n, l and m. Its
 * shape follows from l (s a sphere, p a dumbbell, d a clover), its
 * orientation from m, and its nodes from n and l: n − l − 1 radial, l angular.
 */

export interface Subshell {
  /** "1s", "2p", "3d" … */
  id: string;
  n: number;
  l: number;
}

const LETTER = ["s", "p", "d", "f"] as const;
const sub = (n: number, l: number): Subshell => ({ id: `${n}${LETTER[l]}`, n, l });

/** The order subshells fill in, to krypton. */
export const SUBSHELL_ORDER: readonly Subshell[] = [sub(1, 0), sub(2, 0), sub(2, 1), sub(3, 0), sub(3, 1), sub(4, 0), sub(3, 2), sub(4, 1)];

export const MAX_Z = 36;
const orbitalsIn = (l: number) => 2 * l + 1;

/** The two exceptions of the first 36 elements: a 4s electron moves into 3d. */
const EXCEPTIONS: Readonly<Record<number, Readonly<Record<string, number>>>> = {
  24: { "4s": 1, "3d": 5 },
  29: { "4s": 1, "3d": 10 },
};

export const SYMBOLS = [
  "", "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar",
  "K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Ga", "Ge", "As", "Se", "Br", "Kr",
] as const;

const clampZ = (z: number) => Math.min(MAX_Z, Math.max(1, Math.round(z)));

/** Electrons in each subshell of element `Z`, in filling order (exceptions included). */
export function configurationOf(Z: number): Record<string, number> {
  let left = clampZ(Z);
  const out: Record<string, number> = {};
  for (const s of SUBSHELL_ORDER) {
    const take = Math.min(left, 2 * orbitalsIn(s.l));
    out[s.id] = take;
    left -= take;
  }
  return { ...out, ...(EXCEPTIONS[clampZ(Z)] ?? {}) };
}

const SUPERSCRIPT = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
const sup = (k: number) => [...String(k)].map((d) => SUPERSCRIPT[Number(d)]).join("");

/** "1s² 2s² 2p⁶ 3s¹" — in filling order, as NCERT writes it. */
export function configurationText(Z: number): string {
  const config = configurationOf(Z);
  return SUBSHELL_ORDER.filter((s) => (config[s.id] ?? 0) > 0)
    .map((s) => `${s.id}${sup(config[s.id]!)}`)
    .join(" ");
}

/** Each orbital of a subshell holding `electrons`: [spin up, spin down], filled singly first (Hund). */
export function boxesFor(l: number, electrons: number): [boolean, boolean][] {
  const orbitals = orbitalsIn(l);
  const paired = Math.max(0, electrons - orbitals);
  return Array.from({ length: orbitals }, (_, i) => [i < Math.min(electrons, orbitals), i < paired]);
}

export type OrbitalsParams = {
  /** Which way Play builds atoms: up the table, or back down. */
  direction: "up" | "down";
};

export interface OrbitalsState {
  readonly Z: number;
  readonly n: number;
  readonly l: number;
  readonly m: number;
  /** Seconds since Play last added an electron. */
  readonly clock: number;
}

export type OrbitalsResults = {
  Z: number;
  unpaired: number;
  paramagnetic: number;
  lastN: number;
  lastL: number;
  block: number;
  exception: number;
  valenceShell: number;
  n: number;
  l: number;
  m: number;
  radialNodes: number;
  angularNodes: number;
  nodes: number;
  orbitalsInShell: number;
  shellCapacity: number;
  subshellCapacity: number;
  nPlusL: number;
};

/** An orbital's quantum numbers made legal: l below n, m between −l and l. */
export function legalOrbital(n: number, l: number, m: number): { n: number; l: number; m: number } {
  const N = Math.min(4, Math.max(1, Math.round(n)));
  const L = Math.min(N - 1, Math.max(0, Math.round(l)), 3);
  // "|| 0" turns −0 (from −L when L is 0) into 0.
  const M = Math.min(L, Math.max(-L, Math.round(m))) || 0;
  return { n: N, l: L, m: M };
}

const OUTPUTS = [
  "Z", "unpaired", "paramagnetic", "lastN", "lastL", "block", "exception", "valenceShell",
  "n", "l", "m", "radialNodes", "angularNodes", "nodes", "orbitalsInShell", "shellCapacity", "subshellCapacity", "nPlusL",
] as const satisfies readonly (keyof OrbitalsResults)[];

const ADD_EVERY = 0.8;

export const orbitalsModel: SimulationModel<OrbitalsState, OrbitalsParams, OrbitalsResults> = {
  id: "orbitals",
  defaultParams: { direction: "up" },
  outputs: OUTPUTS,
  stateVariables: ["Z", "n", "l", "m"],

  initialize() {
    return { Z: 1, n: 2, l: 1, m: 0, clock: 0 };
  },

  advance(state, dt, params) {
    const clock = state.clock + dt;
    if (clock < ADD_EVERY) return { ...state, clock };
    const next = state.Z + (params.direction === "down" ? -1 : 1);
    return { ...state, Z: next > MAX_Z ? 1 : next < 1 ? MAX_Z : next, clock: 0 };
  },

  step(state, _params, sign) {
    return { ...state, Z: clampZ(state.Z + sign), clock: 0 };
  },

  derive(state) {
    const Z = clampZ(state.Z);
    const config = configurationOf(Z);
    let unpaired = 0;
    let last: Subshell = SUBSHELL_ORDER[0]!;
    let valenceShell = 1;
    for (const s of SUBSHELL_ORDER) {
      const k = config[s.id] ?? 0;
      if (k === 0) continue;
      const o = orbitalsIn(s.l);
      unpaired += k <= o ? k : 2 * o - k;
      last = s;
      valenceShell = Math.max(valenceShell, s.n);
    }
    const { n, l, m } = legalOrbital(state.n, state.l, state.m);
    return {
      Z,
      unpaired,
      paramagnetic: unpaired > 0 ? 1 : 0,
      lastN: last.n,
      lastL: last.l,
      block: last.l,
      exception: EXCEPTIONS[Z] ? 1 : 0,
      valenceShell,
      n,
      l,
      m,
      radialNodes: n - l - 1,
      angularNodes: l,
      nodes: n - 1,
      orbitalsInShell: n * n,
      shellCapacity: 2 * n * n,
      subshellCapacity: 2 * orbitalsIn(l),
      nPlusL: n + l,
    };
  },

  getVariable(state, id) {
    return id === "Z" || id === "n" || id === "l" || id === "m" ? state[id] : undefined;
  },

  setVariable(state, id, value) {
    if (id === "Z") return { ...state, Z: clampZ(value), clock: 0 };
    if (id === "n" || id === "l" || id === "m") {
      const next = { n: state.n, l: state.l, m: state.m, [id]: value };
      return { ...state, ...legalOrbital(next.n, next.l, next.m) };
    }
    return state;
  },
};
