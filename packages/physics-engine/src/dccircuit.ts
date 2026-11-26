import type { SimulationModel } from "@ise/science-engine";

/**
 * Current electricity for class 12 (NCERT chapter 3), nine circuits at once.
 *
 * Drift: a copper wire carries current I. Its free electrons (n = 8.5 × 10²⁸
 * per m³) drift against the current at v_d = I / (neA) — about a millimetre
 * a second — on top of their fast random thermal motion. From ρ follow the
 * field in the wire E = ρI/A, the mobility μ = v_d/E and the relaxation time
 * τ = m/(ne²ρ).
 *
 * Wire: R = ρL/A, with ρ = ρ₀[1 + α(T − T₀)], ρ₀ and α from NCERT's table
 * (at T₀ = 0 °C). An ideal supply of emf E across it drives I = E/R.
 *
 * Network: three resistors in series, in parallel, or R₁ in series with
 * R₂ ∥ R₃, across an ideal supply E.
 *
 * Cells: one cell (E, r), or two (E, r and E₂, r₂) in series, in series
 * opposing, or in parallel, driving a load R. I = E_eq/(R + r_eq), V = E − Ir,
 * and the load takes the most power when R = r_eq.
 *
 * Kirchhoff: E with R₁, E₂ with R₂, and R₃ shared between the two loops. The
 * junction and loop equations are solved exactly as a linear system.
 *
 * Wheatstone: P = R₁, Q = R₂, R = R₃ and S (a resistance box), with a 20 Ω
 * galvanometer from B to D. The galvanometer current is solved exactly; it
 * is zero when P/Q = R/S.
 *
 * Metre bridge: the wire of the Wire circuit (X) in the left gap, the box S
 * in the right, a 100 cm bridge wire below and a jockey at l. Balanced when
 * X/S = l/(100 − l); the reading gives X and then ρ = XA/L.
 *
 * Potentiometer: a 10 m wire kept at 1 V per metre by a driver battery. The
 * cell under test balances at l = E/φ. With a resistance R across it the
 * balance moves to l₂, and r = R(l₁/l₂ − 1). E/E₂ = l₁/l₂ compares two cells.
 *
 * RC: a capacitor C charged through R from E, q = CE(1 − e^(−t/RC)), or
 * discharged from full, q = CE·e^(−t/RC).
 *
 * Cells drawn without an internal resistance (in Wire, Network, Kirchhoff,
 * the bridges and RC) are ideal. Every circuit is solved exactly.
 */

/** Free electrons per m³ in copper, the electron's charge (C) and mass (kg). */
export const DC_ELECTRON_DENSITY = 8.5e28;
export const DC_CHARGE = 1.6e-19;
export const DC_ELECTRON_MASS = 9.1e-31;
/** Copper's resistivity, used for the drifting wire, Ω m. */
export const DC_COPPER_RESISTIVITY = 1.7e-8;
/** The temperature NCERT's ρ₀ and α refer to, °C. */
export const DC_REFERENCE_TEMP = 0;
/** The galvanometer in the bridges and the potentiometer, Ω. */
export const DC_GALVANOMETER = 20;
/** The metre bridge wire: 100 cm of 0.02 Ω per cm. */
export const DC_BRIDGE_LENGTH = 100;
export const DC_BRIDGE_OHM_PER_CM = 0.02;
/** The potentiometer wire: 1000 cm of 0.01 Ω per cm, with 10 V across it — 1 V per metre. */
export const DC_POT_LENGTH = 1000;
export const DC_POT_OHM_PER_CM = 0.01;
export const DC_POT_DRIVER = 10;
/** Potential gradient along the potentiometer wire, V per cm. */
export const DC_POT_GRADIENT = DC_POT_DRIVER / DC_POT_LENGTH;
/** A jockey this close to the balance point (cm) counts as balanced. */
export const DC_METER_CLOSE = 0.3;
export const DC_POT_CLOSE = 1;

export type DcMaterial = "copper" | "aluminium" | "iron" | "nichrome" | "manganin";
export const DC_MATERIAL_ORDER: readonly DcMaterial[] = ["copper", "aluminium", "iron", "nichrome", "manganin"];
/** NCERT Table 3.1: resistivity ρ₀ (Ω m) and temperature coefficient α (per °C) at 0 °C. */
export const DC_MATERIALS: Record<DcMaterial, { label: string; rho0: number; alpha: number }> = {
  copper: { label: "Copper", rho0: 1.7e-8, alpha: 0.0068 },
  aluminium: { label: "Aluminium", rho0: 2.7e-8, alpha: 0.0043 },
  iron: { label: "Iron", rho0: 10e-8, alpha: 0.0065 },
  nichrome: { label: "Nichrome", rho0: 100e-8, alpha: 0.0004 },
  manganin: { label: "Manganin", rho0: 48e-8, alpha: 0.002e-3 },
};

export type DcNetwork = "series" | "parallel" | "mixed";
export const DC_NETWORK_ORDER: readonly DcNetwork[] = ["series", "parallel", "mixed"];
export type DcCells = "one" | "series" | "opposing" | "parallel";
export const DC_CELLS_ORDER: readonly DcCells[] = ["one", "series", "opposing", "parallel"];
/** What the potentiometer is balancing: cell 1, cell 1 with R across it, or cell 2. */
export type DcPotCell = "first" | "shunted" | "second";
export const DC_POT_CELL_ORDER: readonly DcPotCell[] = ["first", "shunted", "second"];
export type DcRcPhase = "charge" | "discharge";
export const DC_RC_PHASE_ORDER: readonly DcRcPhase[] = ["charge", "discharge"];

export type DcCircuitParams = {
  material: DcMaterial;
  network: DcNetwork;
  cells: DcCells;
  potCell: DcPotCell;
  rcPhase: DcRcPhase;
};

export interface DcCircuitState {
  /** Current in the drifting copper wire, A. */
  readonly current: number;
  /** Cross-section of the wire, mm². */
  readonly area: number;
  /** Length of the wire, m. */
  readonly length: number;
  /** Temperature of the wire, °C. */
  readonly temp: number;
  /** EMF of the (first) cell, V, and its internal resistance, Ω. */
  readonly emf: number;
  readonly intR: number;
  /** External resistance across the cell, Ω. */
  readonly load: number;
  /** The second cell. */
  readonly emf2: number;
  readonly intR2: number;
  /** Three resistors, Ω — the network, Kirchhoff's loops, and P, Q, R of the bridge. */
  readonly r1: number;
  readonly r2: number;
  readonly r3: number;
  /** The resistance box, Ω: S of the Wheatstone bridge and the known S of the metre bridge. */
  readonly box: number;
  /** Jockey on the metre bridge wire, cm from A. */
  readonly jockey: number;
  /** Jockey on the potentiometer wire, cm from A. */
  readonly potJockey: number;
  /** RC circuit: kΩ, µF, and the time since the switch was closed, s. */
  readonly rcR: number;
  readonly rcC: number;
  readonly time: number;
  /** Seconds of animation, for the drifting electrons. */
  readonly clock: number;
}

type RangedKey = Exclude<keyof DcCircuitState, "clock">;

/** Each control's range, in the units above. setVariable clamps to these. */
export const DC_RANGES: Record<RangedKey, readonly [number, number]> = {
  current: [0.1, 10],
  area: [0.05, 5],
  length: [0.1, 5],
  temp: [0, 300],
  emf: [0.5, 20],
  intR: [0.1, 5],
  load: [0.5, 50],
  emf2: [0.5, 20],
  intR2: [0.1, 5],
  r1: [1, 100],
  r2: [1, 100],
  r3: [1, 100],
  box: [0.5, 200],
  jockey: [1, 99],
  potJockey: [0, 1000],
  rcR: [1, 100],
  rcC: [10, 1000],
  time: [0, 600],
};

const STATE_KEYS = Object.keys(DC_RANGES) as RangedKey[];

export type DcCircuitResults = {
  material: number;
  network: number;
  cells: number;
  potCell: number;
  rcPhase: number;
  current: number;
  area: number;
  length: number;
  temp: number;
  emf: number;
  intR: number;
  load: number;
  emf2: number;
  intR2: number;
  r1: number;
  r2: number;
  r3: number;
  box: number;
  jockey: number;
  potJockey: number;
  rcR: number;
  rcC: number;
  time: number;
  clock: number;
  /** Drift: mm/s, A/m², V/m, m²/(V s), s, electrons per second, s to drift 1 m. */
  driftSpeed: number;
  currentDensity: number;
  driftField: number;
  mobility: number;
  relaxation: number;
  electronRate: number;
  driftTime: number;
  /** Wire: Ω m, per °C, Ω, R_T/R₀, A, W. */
  rho0: number;
  alpha: number;
  rho: number;
  wireR: number;
  wireRatio: number;
  wireI: number;
  wireP: number;
  /** Network: equivalent resistance, supply current, and each resistor's current, voltage and power. */
  netReq: number;
  netI: number;
  netI1: number;
  netI2: number;
  netI3: number;
  netV1: number;
  netV2: number;
  netV3: number;
  netP1: number;
  netP2: number;
  netP3: number;
  netP: number;
  /** Cells: equivalent emf and resistance, load current, terminal voltage, each cell's current out of its + terminal. */
  eqEmf: number;
  eqR: number;
  cellI: number;
  terminal: number;
  cellI1: number;
  cellI2: number;
  loadP: number;
  lostP: number;
  supplyP: number;
  maxP: number;
  atMax: number;
  efficiency: number;
  /** Kirchhoff: I₁ up the left branch, I₂ up the right, I₃ down the middle, and the top junction's potential. */
  kI1: number;
  kI2: number;
  kI3: number;
  kNode: number;
  /** Wheatstone: galvanometer current B → D in mA, balance flag, the S that would balance, P/Q and R/S. */
  bridgeIg: number;
  bridgeBalanced: number;
  balancingS: number;
  ratioPQ: number;
  ratioRS: number;
  /** Metre bridge: balance length (cm), galvanometer mA, at balance, X from the reading, ρ from the reading. */
  meterBalance: number;
  meterIg: number;
  meterNull: number;
  meterReading: number;
  rhoMeasured: number;
  /** Potentiometer: V/m, the balance length now (cm), whether it is on the wire, galvanometer mA, at balance. */
  potGradient: number;
  potEmf: number;
  potBalance: number;
  potOnWire: number;
  potIg: number;
  potNull: number;
  potL1: number;
  potL2: number;
  potLE2: number;
  potInternal: number;
  potEmfRatio: number;
  /** RC: τ (s), full charge (µC), charge (µC), capacitor voltage, current (mA, a magnitude), first current (mA), % charged, t/τ. */
  tau: number;
  rcQmax: number;
  rcQ: number;
  rcV: number;
  rcI: number;
  rcI0: number;
  rcFraction: number;
  rcTimes: number;
};

const OUTPUTS = [
  "material", "network", "cells", "potCell", "rcPhase",
  "current", "area", "length", "temp", "emf", "intR", "load", "emf2", "intR2", "r1", "r2", "r3", "box", "jockey", "potJockey", "rcR", "rcC", "time", "clock",
  "driftSpeed", "currentDensity", "driftField", "mobility", "relaxation", "electronRate", "driftTime",
  "rho0", "alpha", "rho", "wireR", "wireRatio", "wireI", "wireP",
  "netReq", "netI", "netI1", "netI2", "netI3", "netV1", "netV2", "netV3", "netP1", "netP2", "netP3", "netP",
  "eqEmf", "eqR", "cellI", "terminal", "cellI1", "cellI2", "loadP", "lostP", "supplyP", "maxP", "atMax", "efficiency",
  "kI1", "kI2", "kI3", "kNode",
  "bridgeIg", "bridgeBalanced", "balancingS", "ratioPQ", "ratioRS",
  "meterBalance", "meterIg", "meterNull", "meterReading", "rhoMeasured",
  "potGradient", "potEmf", "potBalance", "potOnWire", "potIg", "potNull", "potL1", "potL2", "potLE2", "potInternal", "potEmfRatio",
  "tau", "rcQmax", "rcQ", "rcV", "rcI", "rcI0", "rcFraction", "rcTimes",
] as const satisfies readonly (keyof DcCircuitResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** A finite number with no −0. */
const z = (v: number) => (Number.isFinite(v) ? v || 0 : 0);
const pick = <T extends string>(order: readonly T[], value: T): T => (order.includes(value) ? value : order[0]!);

/**
 * Solve a·x = b by Gaussian elimination with partial pivoting. Exact up to
 * rounding; returns zeros for a singular system (never met by these circuits).
 */
export function dcSolveLinear(a: readonly (readonly number[])[], b: readonly number[]): number[] {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]!]);
  for (let col = 0; col < n; col++) {
    let best = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(m[row]![col]!) > Math.abs(m[best]![col]!)) best = row;
    if (Math.abs(m[best]![col]!) < 1e-300) return new Array<number>(n).fill(0);
    [m[col], m[best]] = [m[best]!, m[col]!];
    for (let row = col + 1; row < n; row++) {
      const f = m[row]![col]! / m[col]![col]!;
      for (let k = col; k <= n; k++) m[row]![k]! -= f * m[col]![k]!;
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let sum = m[row]![n]!;
    for (let k = row + 1; k < n; k++) sum -= m[row]![k]! * x[k]!;
    x[row] = sum / m[row]![row]!;
  }
  return x;
}

/** Resistivity at T °C: ρ₀[1 + α(T − T₀)]. */
export function dcResistivity(material: DcMaterial, temp: number): number {
  const m = DC_MATERIALS[material] ?? DC_MATERIALS.copper;
  return m.rho0 * (1 + m.alpha * (temp - DC_REFERENCE_TEMP));
}

/** Resistance of a wire, Ω, from ρ (Ω m), length (m) and cross-section (mm²). */
export function dcWireResistance(rho: number, length: number, areaMm2: number): number {
  return (rho * length) / (areaMm2 * 1e-6);
}

/**
 * The two-loop circuit by Kirchhoff's rules: E₁ and R₁ on the left, E₂ and R₂
 * on the right, R₃ in the middle, both cells' + terminals towards the top junction.
 *   junction:  I₁ + I₂ − I₃ = 0
 *   left loop:  R₁I₁ + R₃I₃ = E₁
 *   right loop: R₂I₂ + R₃I₃ = E₂
 */
export function dcKirchhoff(e1: number, e2: number, r1: number, r2: number, r3: number): [number, number, number] {
  const [i1, i2, i3] = dcSolveLinear(
    [
      [1, 1, -1],
      [r1, 0, r3],
      [0, r2, r3],
    ],
    [0, e1, e2],
  );
  return [i1!, i2!, i3!];
}

/**
 * Galvanometer current (A, from B to D) in a Wheatstone bridge with an ideal
 * cell E from A to C: P from A to B, Q from B to C, R from A to D, S from D to C,
 * and the galvanometer G from B to D. Node equations for V_B and V_D.
 */
export function dcBridgeCurrent(e: number, p: number, q: number, r: number, s: number, g = DC_GALVANOMETER): number {
  const [vb, vd] = dcSolveLinear(
    [
      [1 / p + 1 / q + 1 / g, -1 / g],
      [-1 / g, 1 / r + 1 / s + 1 / g],
    ],
    [e / p, e / r],
  );
  return (vb! - vd!) / g;
}

/**
 * Galvanometer current (A) in the potentiometer: the driver holds A at V and C
 * at 0 along a wire of resistance λ per cm; a cell (E, r) has its + terminal at
 * A and its − terminal through the galvanometer to the jockey at x cm. Positive
 * when current is pushed into the cell's + terminal.
 */
export function dcPotentiometerCurrent(e: number, r: number, x: number): number {
  const at = clamp(x, 0.01, DC_POT_LENGTH - 0.01);
  const rad = DC_POT_OHM_PER_CM * at;
  const rdc = DC_POT_OHM_PER_CM * (DC_POT_LENGTH - at);
  const branch = r + DC_GALVANOMETER;
  const [vd] = dcSolveLinear([[1 / rad + 1 / branch + 1 / rdc]], [DC_POT_DRIVER / rad + (DC_POT_DRIVER - e) / branch]);
  return (DC_POT_DRIVER - vd! - e) / branch;
}

/** The equivalent cell of a pair: [E_eq, r_eq]. */
export function dcCellPair(cells: DcCells, e1: number, r1: number, e2: number, r2: number): [number, number] {
  switch (cells) {
    case "series":
      return [e1 + e2, r1 + r2];
    case "opposing":
      return [e1 - e2, r1 + r2];
    case "parallel":
      return [(e1 * r2 + e2 * r1) / (r1 + r2), (r1 * r2) / (r1 + r2)];
    default:
      return [e1, r1];
  }
}

const clampState = (state: DcCircuitState): DcCircuitState => {
  const out = { ...state } as Record<keyof DcCircuitState, number>;
  for (const key of STATE_KEYS) {
    const [lo, hi] = DC_RANGES[key];
    out[key] = clamp(Number.isFinite(state[key]) ? state[key] : lo, lo, hi);
  }
  out.clock = Number.isFinite(state.clock) ? state.clock : 0;
  return out as DcCircuitState;
};

const tauOf = (s: DcCircuitState) => (s.rcR * s.rcC) / 1000;

export const dcCircuitModel: SimulationModel<DcCircuitState, DcCircuitParams, DcCircuitResults> = {
  id: "dccircuit",
  defaultParams: { material: "nichrome", network: "series", cells: "one", potCell: "first", rcPhase: "charge" },
  outputs: OUTPUTS,
  stateVariables: STATE_KEYS,

  initialize() {
    return {
      current: 1.5,
      area: 0.1,
      length: 1,
      temp: 20,
      emf: 6,
      intR: 1,
      load: 5,
      emf2: 1.5,
      intR2: 0.5,
      r1: 10,
      r2: 20,
      r3: 30,
      box: 40,
      jockey: 50,
      potJockey: 300,
      rcR: 10,
      rcC: 100,
      time: 0,
      clock: 0,
    };
  },

  /** Play runs the RC clock on until the capacitor has all but finished (8τ), and keeps the electrons drifting. */
  advance(state, dt) {
    const s = clampState(state);
    const stop = Math.min(DC_RANGES.time[1], 8 * tauOf(s));
    const time = s.time >= stop ? s.time : Math.min(stop, s.time + dt);
    return { ...state, time, clock: (s.clock + dt) % 3600 };
  },

  /** A step moves the RC clock by half a time constant. */
  step(state, _params, sign) {
    const s = clampState(state);
    const half = tauOf(s) / 2;
    const time = clamp(Math.round(s.time / half) * half + half * sign, DC_RANGES.time[0], DC_RANGES.time[1]);
    return { ...state, time };
  },

  derive(state, params) {
    const s = clampState(state);
    const material = pick(DC_MATERIAL_ORDER, params.material);
    const network = pick(DC_NETWORK_ORDER, params.network);
    const cells = pick(DC_CELLS_ORDER, params.cells);
    const potCell = pick(DC_POT_CELL_ORDER, params.potCell);
    const rcPhase = pick(DC_RC_PHASE_ORDER, params.rcPhase);
    const E = s.emf;

    // Drift in a copper wire.
    const areaM2 = s.area * 1e-6;
    const vd = s.current / (DC_ELECTRON_DENSITY * DC_CHARGE * areaM2);
    const density = s.current / areaM2;
    const field = DC_COPPER_RESISTIVITY * density;

    // The wire.
    const mat = DC_MATERIALS[material];
    const rho = dcResistivity(material, s.temp);
    const wireR = dcWireResistance(rho, s.length, s.area);

    // The network, across an ideal supply E.
    let netReq: number;
    let ni: [number, number, number];
    let nv: [number, number, number];
    if (network === "series") {
      netReq = s.r1 + s.r2 + s.r3;
      const i = E / netReq;
      ni = [i, i, i];
      nv = [i * s.r1, i * s.r2, i * s.r3];
    } else if (network === "parallel") {
      netReq = 1 / (1 / s.r1 + 1 / s.r2 + 1 / s.r3);
      ni = [E / s.r1, E / s.r2, E / s.r3];
      nv = [E, E, E];
    } else {
      const rp = (s.r2 * s.r3) / (s.r2 + s.r3);
      netReq = s.r1 + rp;
      const i = E / netReq;
      const vp = i * rp;
      ni = [i, vp / s.r2, vp / s.r3];
      nv = [i * s.r1, vp, vp];
    }
    const netI = E / netReq;

    // The cell (or pair of cells) and its load.
    const [eqEmf, eqR] = dcCellPair(cells, E, s.intR, s.emf2, s.intR2);
    const cellI = eqEmf / (s.load + eqR);
    const terminal = cellI * s.load;
    const [cellI1, cellI2] =
      cells === "one" ? [cellI, 0]
      : cells === "series" ? [cellI, cellI]
      : cells === "opposing" ? [cellI, -cellI]
      : [(E - terminal) / s.intR, (s.emf2 - terminal) / s.intR2];
    const lostP = cellI1 * cellI1 * s.intR + (cells === "one" ? 0 : cellI2 * cellI2 * s.intR2);
    const supplyP = E * cellI1 + (cells === "one" ? 0 : s.emf2 * cellI2);

    // Kirchhoff's two loops.
    const [kI1, kI2, kI3] = dcKirchhoff(E, s.emf2, s.r1, s.r2, s.r3);

    // Wheatstone bridge: P = R₁, Q = R₂, R = R₃, S = box.
    const balanced = Math.abs(s.r1 * s.box - s.r2 * s.r3) <= 1e-9 * (s.r1 * s.box + s.r2 * s.r3);
    const bridgeIg = balanced ? 0 : dcBridgeCurrent(E, s.r1, s.r2, s.r3, s.box);

    // Metre bridge: the wire X in the left gap, the box S in the right.
    const meterBalance = (DC_BRIDGE_LENGTH * wireR) / (wireR + s.box);
    const l = s.jockey;
    const meterIg = dcBridgeCurrent(E, wireR, s.box, DC_BRIDGE_OHM_PER_CM * l, DC_BRIDGE_OHM_PER_CM * (DC_BRIDGE_LENGTH - l));
    const meterReading = (s.box * l) / (DC_BRIDGE_LENGTH - l);

    // Potentiometer.
    const shuntedEmf = (E * s.load) / (s.load + s.intR);
    const shuntedR = (s.intR * s.load) / (s.load + s.intR);
    const [potEmf, potR] = potCell === "first" ? [E, s.intR] : potCell === "shunted" ? [shuntedEmf, shuntedR] : [s.emf2, s.intR2];
    const potBalance = potEmf / DC_POT_GRADIENT;
    const potOnWire = potEmf <= DC_POT_DRIVER ? 1 : 0;
    const potL1 = E / DC_POT_GRADIENT;
    const potL2 = shuntedEmf / DC_POT_GRADIENT;
    const potLE2 = s.emf2 / DC_POT_GRADIENT;

    // RC.
    const tau = tauOf(s);
    const decay = Math.exp(-s.time / tau);
    const rcQmax = s.rcC * E;
    const rcI0 = E / s.rcR;
    const charging = rcPhase === "charge";
    const rcQ = charging ? rcQmax * (1 - decay) : rcQmax * decay;

    return {
      material: DC_MATERIAL_ORDER.indexOf(material),
      network: DC_NETWORK_ORDER.indexOf(network),
      cells: DC_CELLS_ORDER.indexOf(cells),
      potCell: DC_POT_CELL_ORDER.indexOf(potCell),
      rcPhase: DC_RC_PHASE_ORDER.indexOf(rcPhase),
      current: s.current,
      area: s.area,
      length: s.length,
      temp: s.temp,
      emf: E,
      intR: s.intR,
      load: s.load,
      emf2: s.emf2,
      intR2: s.intR2,
      r1: s.r1,
      r2: s.r2,
      r3: s.r3,
      box: s.box,
      jockey: s.jockey,
      potJockey: s.potJockey,
      rcR: s.rcR,
      rcC: s.rcC,
      time: s.time,
      clock: z(s.clock),
      driftSpeed: z(vd * 1000),
      currentDensity: z(density),
      driftField: z(field),
      mobility: z(vd / field),
      relaxation: z(DC_ELECTRON_MASS / (DC_ELECTRON_DENSITY * DC_CHARGE * DC_CHARGE * DC_COPPER_RESISTIVITY)),
      electronRate: z(s.current / DC_CHARGE),
      driftTime: z(1 / vd),
      rho0: mat.rho0,
      alpha: mat.alpha,
      rho: z(rho),
      wireR: z(wireR),
      wireRatio: z(rho / mat.rho0),
      wireI: z(E / wireR),
      wireP: z((E * E) / wireR),
      netReq: z(netReq),
      netI: z(netI),
      netI1: z(ni[0]),
      netI2: z(ni[1]),
      netI3: z(ni[2]),
      netV1: z(nv[0]),
      netV2: z(nv[1]),
      netV3: z(nv[2]),
      netP1: z(ni[0] * nv[0]),
      netP2: z(ni[1] * nv[1]),
      netP3: z(ni[2] * nv[2]),
      netP: z(E * netI),
      eqEmf: z(eqEmf),
      eqR: z(eqR),
      cellI: z(cellI),
      terminal: z(terminal),
      cellI1: z(cellI1),
      cellI2: z(cellI2),
      loadP: z(cellI * cellI * s.load),
      lostP: z(lostP),
      supplyP: z(supplyP),
      maxP: z((eqEmf * eqEmf) / (4 * eqR)),
      atMax: Math.abs(s.load - eqR) <= 0.01 ? 1 : 0,
      efficiency: z((100 * s.load) / (s.load + eqR)),
      kI1: z(kI1),
      kI2: z(kI2),
      kI3: z(kI3),
      kNode: z(kI3 * s.r3),
      bridgeIg: z(bridgeIg * 1000),
      bridgeBalanced: balanced ? 1 : 0,
      balancingS: z((s.r2 * s.r3) / s.r1),
      ratioPQ: z(s.r1 / s.r2),
      ratioRS: z(s.r3 / s.box),
      meterBalance: z(meterBalance),
      meterIg: z(meterIg * 1000),
      meterNull: Math.abs(l - meterBalance) <= DC_METER_CLOSE ? 1 : 0,
      meterReading: z(meterReading),
      rhoMeasured: z((meterReading * s.area * 1e-6) / s.length),
      potGradient: DC_POT_GRADIENT * 100,
      potEmf: z(potEmf),
      potBalance: z(potBalance),
      potOnWire,
      potIg: z(dcPotentiometerCurrent(potEmf, potR, s.potJockey) * 1000),
      potNull: potOnWire === 1 && Math.abs(s.potJockey - potBalance) <= DC_POT_CLOSE ? 1 : 0,
      potL1: z(potL1),
      potL2: z(potL2),
      potLE2: z(potLE2),
      potInternal: z(s.load * (potL1 / potL2 - 1)),
      potEmfRatio: z(potL1 / potLE2),
      tau: z(tau),
      rcQmax: z(rcQmax),
      rcQ: z(rcQ),
      rcV: z(rcQ / s.rcC),
      rcI: z(rcI0 * decay),
      rcI0: z(rcI0),
      rcFraction: z((100 * rcQ) / rcQmax),
      rcTimes: z(s.time / tau),
    };
  },

  getVariable(state, id) {
    return (STATE_KEYS as readonly string[]).includes(id) ? state[id as RangedKey] : undefined;
  },

  setVariable(state, id, value) {
    if (!(STATE_KEYS as readonly string[]).includes(id)) return state;
    const [lo, hi] = DC_RANGES[id as RangedKey];
    return { ...state, [id]: clamp(Number.isFinite(value) ? value : lo, lo, hi) };
  },
};
