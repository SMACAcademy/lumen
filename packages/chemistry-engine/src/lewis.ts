import type { SimulationModel } from "@ise/science-engine";

/**
 * Lewis structures by counting electrons.
 *
 * Choose how many bonds join the central atom to each terminal atom. The
 * rest of the valence electrons become lone pairs: the terminal atoms are
 * filled to an octet first (hydrogen to two), and whatever is left goes on
 * the central atom. A structure works when every atom ends with an octet and
 * no electrons are short or spare. Formal charge = valence electrons −
 * lone-pair electrons − bonds. Of the working structures, the best have the
 * least total formal charge — found by trying every combination — and when
 * several tie they are resonance structures, the real molecule an average of
 * them.
 */

export interface LewisAtom {
  symbol: string;
  valence: number;
}

export interface LewisMolecule {
  formula: string;
  central: LewisAtom;
  terminals: readonly LewisAtom[];
  charge: number;
}

const A = (symbol: string): LewisAtom => ({ symbol, valence: { H: 1, C: 4, N: 5, O: 6, F: 7 }[symbol] ?? 0 });

export type LewisMoleculeId = "co2" | "o3" | "no3" | "co3" | "hcn" | "no2" | "co" | "n2" | "cn" | "h2o" | "nh3";
export const LEWIS_ORDER: readonly LewisMoleculeId[] = ["co2", "o3", "no3", "co3", "hcn", "no2", "co", "n2", "cn", "h2o", "nh3"];

export const LEWIS_MOLECULES: Record<LewisMoleculeId, LewisMolecule> = {
  co2: { formula: "CO₂", central: A("C"), terminals: [A("O"), A("O")], charge: 0 },
  o3: { formula: "O₃", central: A("O"), terminals: [A("O"), A("O")], charge: 0 },
  no3: { formula: "NO₃⁻", central: A("N"), terminals: [A("O"), A("O"), A("O")], charge: -1 },
  co3: { formula: "CO₃²⁻", central: A("C"), terminals: [A("O"), A("O"), A("O")], charge: -2 },
  hcn: { formula: "HCN", central: A("C"), terminals: [A("H"), A("N")], charge: 0 },
  no2: { formula: "NO₂⁻", central: A("N"), terminals: [A("O"), A("O")], charge: -1 },
  co: { formula: "CO", central: A("C"), terminals: [A("O")], charge: 0 },
  n2: { formula: "N₂", central: A("N"), terminals: [A("N")], charge: 0 },
  cn: { formula: "CN⁻", central: A("C"), terminals: [A("N")], charge: -1 },
  h2o: { formula: "H₂O", central: A("O"), terminals: [A("H"), A("H")], charge: 0 },
  nh3: { formula: "NH₃", central: A("N"), terminals: [A("H"), A("H"), A("H")], charge: 0 },
};

export interface LewisStructure {
  bonds: number[];
  valenceElectrons: number;
  bondElectrons: number;
  /** Lone-pair electrons on each terminal atom. */
  terminalLone: number[];
  centralLone: number;
  centralElectrons: number;
  /** More electrons in bonds than the molecule has. */
  short: boolean;
  /** The central atom holds more than eight. */
  overfull: boolean;
  /** Every atom has its octet (H two). */
  octets: boolean;
  valid: boolean;
  fcCentral: number;
  fcTerminals: number[];
  totalFormalCharge: number;
}

const target = (a: LewisAtom) => (a.symbol === "H" ? 2 : 8);

/** Lone pairs placed and formal charges worked out for these bond orders. */
export function lewisStructure(m: LewisMolecule, requested: readonly number[]): LewisStructure {
  const bonds = m.terminals.map((t, i) => (t.symbol === "H" ? 1 : Math.min(3, Math.max(1, Math.round(requested[i] ?? 1)))));
  const valenceElectrons = m.central.valence + m.terminals.reduce((s, t) => s + t.valence, 0) - m.charge;
  const bondElectrons = 2 * bonds.reduce((a, b) => a + b, 0);
  let left = valenceElectrons - bondElectrons;
  const short = left < 0;
  const terminalLone = m.terminals.map((t, i) => {
    const need = Math.max(0, target(t) - 2 * bonds[i]!);
    const give = Math.max(0, Math.min(need, left));
    left -= give;
    return give;
  });
  const centralLone = Math.max(0, left);
  const centralElectrons = bondElectrons + centralLone;
  const overfull = centralElectrons > 8;
  const terminalsOk = m.terminals.every((t, i) => 2 * bonds[i]! + terminalLone[i]! === target(t));
  const octets = !short && terminalsOk && centralElectrons === 8;
  const bondSum = bonds.reduce((a, b) => a + b, 0);
  const fcCentral = m.central.valence - centralLone - bondSum;
  const fcTerminals = m.terminals.map((t, i) => t.valence - terminalLone[i]! - bonds[i]!);
  const totalFormalCharge = Math.abs(fcCentral) + fcTerminals.reduce((s, f) => s + Math.abs(f), 0);
  return { bonds, valenceElectrons, bondElectrons, terminalLone, centralLone, centralElectrons, short, overfull, octets, valid: octets, fcCentral, fcTerminals, totalFormalCharge };
}

/** Every combination of bond orders, one to three per bond (one to H). */
function allBondings(m: LewisMolecule): number[][] {
  return m.terminals.reduce<number[][]>((acc, t) => acc.flatMap((prefix) => (t.symbol === "H" ? [1] : [1, 2, 3]).map((b) => [...prefix, b])), [[]]);
}

/** The best structures: valid, with the least total formal charge. More than one means resonance. */
export function bestStructures(m: LewisMolecule): LewisStructure[] {
  const valid = allBondings(m)
    .map((b) => lewisStructure(m, b))
    .filter((s) => s.valid);
  const least = Math.min(...valid.map((s) => s.totalFormalCharge));
  return valid.filter((s) => s.totalFormalCharge === least);
}

/** The mean order of the bonds to non-hydrogen atoms, averaged over the resonance structures. */
export function averageBondOrder(m: LewisMolecule): number {
  const best = bestStructures(m);
  const heavy = m.terminals.map((t, i) => (t.symbol === "H" ? -1 : i)).filter((i) => i >= 0);
  if (!best.length || !heavy.length) return 0;
  const mean = (s: LewisStructure) => heavy.reduce((sum, i) => sum + s.bonds[i]!, 0) / heavy.length;
  return best.reduce((sum, s) => sum + mean(s), 0) / best.length;
}

export type LewisParams = { molecule: LewisMoleculeId };

export interface LewisState {
  readonly b1: number;
  readonly b2: number;
  readonly b3: number;
  readonly clock: number;
}

export type LewisResults = {
  molecule: number;
  terminals: number;
  b1: number;
  b2: number;
  b3: number;
  valenceElectrons: number;
  bondElectrons: number;
  loneElectrons: number;
  centralElectrons: number;
  short: number;
  overfull: number;
  octets: number;
  valid: number;
  fcCentral: number;
  fc1: number;
  fc2: number;
  fc3: number;
  totalFormalCharge: number;
  best: number;
  resonance: number;
  averageBondOrder: number;
};

const KEYS = ["b1", "b2", "b3"] as const;
const clampB = (b: number) => Math.min(3, Math.max(1, Math.round(b)));
const moleculeOf = (p: LewisParams) => LEWIS_MOLECULES[p.molecule] ?? LEWIS_MOLECULES.co2;

const OUTPUTS = [
  "molecule", "terminals", "b1", "b2", "b3", "valenceElectrons", "bondElectrons", "loneElectrons", "centralElectrons",
  "short", "overfull", "octets", "valid", "fcCentral", "fc1", "fc2", "fc3", "totalFormalCharge", "best", "resonance", "averageBondOrder",
] as const satisfies readonly (keyof LewisResults)[];

const MOVE_EVERY = 1.4;
const sameBonds = (a: readonly number[], b: readonly number[]) => a.every((x, i) => x === b[i]);

export const lewisModel: SimulationModel<LewisState, LewisParams, LewisResults> = {
  id: "lewis",
  defaultParams: { molecule: "co2" },
  outputs: OUTPUTS,
  stateVariables: KEYS,

  initialize() {
    return { b1: 1, b2: 1, b3: 1, clock: 0 };
  },

  /** Play steps through the best structures: resonance, one form after another. */
  advance(state, dt, params) {
    const clock = state.clock + dt;
    if (clock < MOVE_EVERY) return { ...state, clock };
    const m = moleculeOf(params);
    const best = bestStructures(m);
    const current = lewisStructure(m, [state.b1, state.b2, state.b3]).bonds;
    const i = best.findIndex((s) => sameBonds(s.bonds, current));
    const next = best[(i + 1) % best.length]!.bonds;
    return { b1: next[0] ?? 1, b2: next[1] ?? 1, b3: next[2] ?? 1, clock: 0 };
  },

  step(state, _params, sign) {
    return { ...state, b1: clampB(state.b1 + sign), clock: 0 };
  },

  derive(state, params) {
    const m = moleculeOf(params);
    const s = lewisStructure(m, [state.b1, state.b2, state.b3]);
    const best = bestStructures(m);
    return {
      molecule: Math.max(0, LEWIS_ORDER.indexOf(params.molecule)),
      terminals: m.terminals.length,
      b1: s.bonds[0] ?? 0,
      b2: s.bonds[1] ?? 0,
      b3: s.bonds[2] ?? 0,
      valenceElectrons: s.valenceElectrons,
      bondElectrons: s.bondElectrons,
      loneElectrons: s.terminalLone.reduce((a, b) => a + b, 0) + s.centralLone,
      centralElectrons: s.centralElectrons,
      short: s.short ? 1 : 0,
      overfull: s.overfull ? 1 : 0,
      octets: s.octets ? 1 : 0,
      valid: s.valid ? 1 : 0,
      fcCentral: s.fcCentral,
      fc1: s.fcTerminals[0] ?? 0,
      fc2: s.fcTerminals[1] ?? 0,
      fc3: s.fcTerminals[2] ?? 0,
      totalFormalCharge: s.totalFormalCharge,
      best: best.some((b) => sameBonds(b.bonds, s.bonds)) ? 1 : 0,
      resonance: best.length,
      averageBondOrder: Math.round(averageBondOrder(m) * 100) / 100,
    };
  },

  getVariable(state, id) {
    return (KEYS as readonly string[]).includes(id) ? state[id as (typeof KEYS)[number]] : undefined;
  },

  setVariable(state, id, value) {
    return (KEYS as readonly string[]).includes(id) ? { ...state, [id]: clampB(value), clock: 0 } : state;
  },
};
