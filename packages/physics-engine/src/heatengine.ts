import type { SimulationModel } from "@ise/science-engine";

/**
 * Thermodynamics for class 11: one mole of ideal gas in a cylinder.
 *
 * Equilibrium (the zeroth law): two bodies in contact pass heat from the
 * hotter to the colder until both reach one common temperature,
 * T = (C_A·T_A + C_B·T_B) / (C_A + C_B). The temperature difference dies away
 * exponentially, at a rate G(1/C_A + 1/C_B) set by how well they touch.
 *
 * Processes (the first law, NCERT's sign convention): ΔQ = ΔU + ΔW, where Q is
 * the heat given TO the gas and W the work done BY the gas — positive when it
 * expands. The gas starts at 10 L and temperature T₁ and is taken by one of
 * four processes:
 *   isothermal  T constant:  W = nRT ln(V₂/V₁), ΔU = 0, Q = W
 *   adiabatic   Q = 0:       PV^γ constant, TV^(γ−1) constant, W = −ΔU
 *   isobaric    P constant:  W = P(V₂ − V₁), Q = nC_pΔT
 *   isochoric   V constant:  W = 0, Q = ΔU = nC_vΔT
 * For an ideal gas ΔU = nC_vΔT whatever the path.
 *
 * Cycles: a rectangle (two isochores and two isobars) or a Carnot cycle (two
 * isotherms and two adiabats). Round a cycle ΔU = 0, so the net work — the
 * area enclosed on the P–V diagram — is Q₁ − Q₂. The efficiency is
 * η = W/Q₁; no engine working between T₁ and T₂ beats Carnot's 1 − T₂/T₁.
 * Run backwards it is a refrigerator, with coefficient of performance
 * α = Q₂/W, which for Carnot is T₂/(T₁ − T₂).
 *
 * Units: pressure in kPa and volume in litres, so P·V comes out in joules
 * (1 kPa × 1 L = 1 J). n = 1 mol throughout.
 */

/** Gas constant, J mol⁻¹ K⁻¹. */
export const THERMO_R = 8.314;
/** Every process and the rectangle cycle start from this volume, L. */
export const THERMO_V_START = 10;
/** The rectangle cycle's lower pressure, kPa. */
export const THERMO_P_LOW = 100;
/** Heat capacity of body A, J/K. */
export const THERMO_C_A = 1000;
/** How well the two bodies conduct heat to each other, W/K. */
export const THERMO_CONTACT = 400;
/** Bodies closer than this, K, count as having reached equilibrium. */
export const THERMO_SETTLED = 1;
/** The contact clock stops here, s. */
export const THERMO_T_MAX = 20;
/** The cold body of the Carnot cycle is kept at least this far below the hot one, K. */
export const THERMO_MIN_GAP = 10;

export type ThermoGas = "mono" | "di";
export const THERMO_GAS_ORDER: readonly ThermoGas[] = ["mono", "di"];
/** γ = C_p/C_v and the molar heat capacity at constant volume in units of R. */
export const THERMO_GASES: Record<ThermoGas, { label: string; gamma: number; cv: number }> = {
  mono: { label: "Monatomic", gamma: 5 / 3, cv: 1.5 },
  di: { label: "Diatomic", gamma: 7 / 5, cv: 2.5 },
};

export type ThermoProcess = "isothermal" | "adiabatic" | "isobaric" | "isochoric";
export const THERMO_PROCESS_ORDER: readonly ThermoProcess[] = ["isothermal", "adiabatic", "isobaric", "isochoric"];

export type ThermoCycle = "rectangle" | "carnot";
export const THERMO_CYCLE_ORDER: readonly ThermoCycle[] = ["rectangle", "carnot"];

/** The ranges of the state variables: [min, max]. */
export const THERMO_LIMITS = {
  TA: [200, 500],
  TB: [200, 500],
  CB: [250, 4000],
  t: [0, THERMO_T_MAX],
  T1: [200, 600],
  V: [5, 30],
  Tend: [100, 900],
  Vb: [12, 30],
  Ph: [120, 400],
  Th: [300, 800],
  Tc: [200, 400],
  ratio: [1.5, 3],
  phase: [0, 4],
} as const satisfies Record<string, readonly [number, number]>;

export type HeatEngineParams = {
  gas: ThermoGas;
  process: ThermoProcess;
  cycle: ThermoCycle;
};

export interface HeatEngineState {
  /** Starting temperatures of the two bodies, K, the heat capacity of B, J/K, and the time in contact, s. */
  readonly TA: number;
  readonly TB: number;
  readonly CB: number;
  readonly t: number;
  /** The gas's starting temperature, K; the volume it is taken to, L; the end temperature of the isochoric process, K. */
  readonly T1: number;
  readonly V: number;
  readonly Tend: number;
  /** The rectangle's right side, L, and top, kPa. */
  readonly Vb: number;
  readonly Ph: number;
  /** The Carnot cycle's hot and cold temperatures, K, and the expansion ratio V_B/V_A of its hot isotherm. */
  readonly Th: number;
  readonly Tc: number;
  readonly ratio: number;
  /** Where the running point is on the cycle: 0 at A, 1 at B, 2 at C, 3 at D. */
  readonly phase: number;
}

export type HeatEngineResults = {
  // Two bodies in contact: their starting temperatures and B's heat capacity, then where they are now.
  TA0: number;
  TB0: number;
  capB: number;
  tempA: number;
  tempB: number;
  Tcommon: number;
  heatAB: number;
  tContact: number;
  settled: number;
  // One process.
  gas: number;
  gamma: number;
  process: number;
  P1: number;
  V1: number;
  T1: number;
  P2: number;
  V2: number;
  T2: number;
  W: number;
  Q: number;
  dU: number;
  /** 1 expanding, −1 compressed, 0 no change of volume. */
  expanding: number;
  /** The pressure at V₂ had the gas gone there along the isotherm, or along the adiabat, from the same start. */
  Piso: number;
  Padia: number;
  // One cycle.
  cycle: number;
  VA: number;
  VB: number;
  VC: number;
  VD: number;
  PA: number;
  PB: number;
  PC: number;
  PD: number;
  Wnet: number;
  Q1: number;
  Q2: number;
  eta: number;
  /** Carnot's efficiency between the hottest and coldest temperatures the cycle reaches. */
  etaCarnot: number;
  Thot: number;
  Tcold: number;
  /** The cycle run backwards as a refrigerator: Q₂/W, and Carnot's T₂/(T₁ − T₂). */
  cop: number;
  copCarnot: number;
  phase: number;
  stage: number;
  dotV: number;
  dotP: number;
};

const OUTPUTS = [
  "TA0", "TB0", "capB", "tempA", "tempB", "Tcommon", "heatAB", "tContact", "settled",
  "gas", "gamma", "process", "P1", "V1", "T1", "P2", "V2", "T2", "W", "Q", "dU", "expanding", "Piso", "Padia",
  "cycle", "VA", "VB", "VC", "VD", "PA", "PB", "PC", "PD", "Wnet", "Q1", "Q2", "eta", "etaCarnot", "Thot", "Tcold", "cop", "copCarnot",
  "phase", "stage", "dotV", "dotP",
] as const satisfies readonly (keyof HeatEngineResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
const limit = (id: keyof typeof THERMO_LIMITS, v: number) => clamp(v, THERMO_LIMITS[id][0], THERMO_LIMITS[id][1]);
/** No −0 in the outputs. */
const z = (v: number) => v || 0;

const gasOf = (params: HeatEngineParams) => (THERMO_GAS_ORDER.includes(params.gas) ? params.gas : "mono");
const processOf = (params: HeatEngineParams) => (THERMO_PROCESS_ORDER.includes(params.process) ? params.process : "isothermal");
const cycleOf = (params: HeatEngineParams) => (THERMO_CYCLE_ORDER.includes(params.cycle) ? params.cycle : "rectangle");

/** Two bodies after `t` seconds in contact. */
export function thermoContact(TA: number, TB: number, CB: number, t: number) {
  const common = (THERMO_C_A * TA + CB * TB) / (THERMO_C_A + CB);
  const decay = Math.exp(-THERMO_CONTACT * (1 / THERMO_C_A + 1 / CB) * t);
  const tempA = common + (TA - common) * decay;
  const tempB = common + (TB - common) * decay;
  return { common, tempA, tempB, heatAB: THERMO_C_A * (TA - tempA) };
}

/** The end state, work, heat and change of internal energy of one mole taken from (V₁, T₁). */
export function thermoProcess(process: ThermoProcess, gas: ThermoGas, T1: number, V2wanted: number, Tend: number) {
  const { gamma, cv } = THERMO_GASES[gas];
  const V1 = THERMO_V_START;
  const P1 = (THERMO_R * T1) / V1;
  let V2 = V2wanted;
  let T2 = T1;
  let W = 0;
  let Q = 0;
  let dU = 0;
  switch (process) {
    case "isothermal":
      W = THERMO_R * T1 * Math.log(V2 / V1);
      Q = W;
      break;
    case "adiabatic":
      T2 = T1 * (V1 / V2) ** (gamma - 1);
      dU = cv * THERMO_R * (T2 - T1);
      W = -dU;
      break;
    case "isobaric":
      T2 = (T1 * V2) / V1;
      W = P1 * (V2 - V1);
      dU = cv * THERMO_R * (T2 - T1);
      Q = dU + W;
      break;
    case "isochoric":
      V2 = V1;
      T2 = Tend;
      dU = cv * THERMO_R * (T2 - T1);
      Q = dU;
      break;
  }
  return { V1, P1, V2, T2, P2: (THERMO_R * T2) / V2, W, Q, dU };
}

export interface ThermoCycleShape {
  /** 0 rectangle, 1 Carnot. */
  cycle: number;
  gamma: number;
  V: readonly [number, number, number, number];
  P: readonly [number, number, number, number];
}

/**
 * The point at `phase` round the cycle A → B → C → D → A: the rectangle's
 * sides are straight; the Carnot cycle's are isotherms (stages 0 and 2) and
 * adiabats (1 and 3), with V moving geometrically along each.
 */
export function thermoCyclePoint(shape: ThermoCycleShape, phase: number): { V: number; P: number; stage: number } {
  const p = ((phase % 4) + 4) % 4;
  const stage = Math.min(3, Math.floor(p));
  const f = p - stage;
  const next = (stage + 1) % 4;
  const [Vi, Vj, Pi, Pj] = [shape.V[stage]!, shape.V[next]!, shape.P[stage]!, shape.P[next]!];
  if (shape.cycle === 0) return { V: Vi + (Vj - Vi) * f, P: Pi + (Pj - Pi) * f, stage };
  const V = Vi * (Vj / Vi) ** f;
  const P = stage % 2 === 0 ? (Pi * Vi) / V : Pi * (Vi / V) ** shape.gamma;
  return { V, P, stage };
}

/** Corners, heats and work of the chosen cycle, for one mole. */
export function thermoCycle(cycle: ThermoCycle, gas: ThermoGas, s: Pick<HeatEngineState, "Vb" | "Ph" | "Th" | "Tc" | "ratio">) {
  const { gamma, cv } = THERMO_GASES[gas];
  if (cycle === "rectangle") {
    const Va = THERMO_V_START;
    const Vb = limit("Vb", s.Vb);
    const Pl = THERMO_P_LOW;
    const Ph = limit("Ph", s.Ph);
    // Heat goes in up the left side (isochoric) and along the top (isobaric), and out on the other two.
    const Q1 = cv * Va * (Ph - Pl) + (cv + 1) * Ph * (Vb - Va);
    const Q2 = cv * Vb * (Ph - Pl) + (cv + 1) * Pl * (Vb - Va);
    return {
      shape: { cycle: 0, gamma, V: [Va, Va, Vb, Vb], P: [Pl, Ph, Ph, Pl] } as ThermoCycleShape,
      Q1,
      Q2,
      W: (Ph - Pl) * (Vb - Va),
      Thot: (Ph * Vb) / THERMO_R,
      Tcold: (Pl * Va) / THERMO_R,
    };
  }
  const Th = limit("Th", s.Th);
  const Tc = Math.min(limit("Tc", s.Tc), Th - THERMO_MIN_GAP);
  const ratio = limit("ratio", s.ratio);
  const VA = THERMO_V_START;
  const VB = VA * ratio;
  const stretch = (Th / Tc) ** (1 / (gamma - 1));
  const VC = VB * stretch;
  const VD = VA * stretch;
  const Q1 = THERMO_R * Th * Math.log(ratio);
  const Q2 = THERMO_R * Tc * Math.log(VC / VD);
  return {
    shape: { cycle: 1, gamma, V: [VA, VB, VC, VD], P: [(THERMO_R * Th) / VA, (THERMO_R * Th) / VB, (THERMO_R * Tc) / VC, (THERMO_R * Tc) / VD] } as ThermoCycleShape,
    Q1,
    Q2,
    W: Q1 - Q2,
    Thot: Th,
    Tcold: Tc,
  };
}

export const heatEngineModel: SimulationModel<HeatEngineState, HeatEngineParams, HeatEngineResults> = {
  id: "heatengine",
  defaultParams: { gas: "mono", process: "isothermal", cycle: "rectangle" },
  outputs: OUTPUTS,
  stateVariables: ["TA", "TB", "CB", "t", "T1", "V", "Tend", "Vb", "Ph", "Th", "Tc", "ratio", "phase"],

  initialize() {
    return { TA: 400, TB: 300, CB: 1000, t: 0, T1: 300, V: 20, Tend: 450, Vb: 20, Ph: 200, Th: 500, Tc: 300, ratio: 2, phase: 0 };
  },

  /** Play keeps the bodies in contact (until the clock stops) and runs the point round the cycle. */
  advance(state, dt) {
    return { ...state, t: limit("t", state.t + dt), phase: (((state.phase + 0.5 * dt) % 4) + 4) % 4 };
  },

  /** A step moves the gas's volume by one litre. */
  step(state, _params, sign) {
    return { ...state, V: limit("V", Math.round(state.V) + sign) };
  },

  derive(state, params) {
    const gasId = gasOf(params);
    const gas = THERMO_GASES[gasId];
    const [TA0, TB0, capB] = [limit("TA", state.TA), limit("TB", state.TB), limit("CB", state.CB)];
    const contact = thermoContact(TA0, TB0, capB, limit("t", state.t));

    const processId = processOf(params);
    const T1 = limit("T1", state.T1);
    const p = thermoProcess(processId, gasId, T1, limit("V", state.V), limit("Tend", state.Tend));
    const Piso = (p.P1 * p.V1) / p.V2;
    const Padia = p.P1 * (p.V1 / p.V2) ** gas.gamma;

    const cycleId = cycleOf(params);
    const c = thermoCycle(cycleId, gasId, state);
    const phase = limit("phase", state.phase) % 4;
    const dot = thermoCyclePoint(c.shape, phase);
    const [VA, VB, VC, VD] = c.shape.V;
    const [PA, PB, PC, PD] = c.shape.P;
    return {
      TA0,
      TB0,
      capB,
      tempA: contact.tempA,
      tempB: contact.tempB,
      Tcommon: contact.common,
      heatAB: z(contact.heatAB),
      tContact: limit("t", state.t),
      settled: Math.abs(contact.tempA - contact.tempB) < THERMO_SETTLED ? 1 : 0,

      gas: THERMO_GAS_ORDER.indexOf(gasId),
      gamma: gas.gamma,
      process: THERMO_PROCESS_ORDER.indexOf(processId),
      P1: p.P1,
      V1: p.V1,
      T1,
      P2: p.P2,
      V2: p.V2,
      T2: p.T2,
      W: z(p.W),
      Q: z(p.Q),
      dU: z(p.dU),
      expanding: z(Math.sign(p.V2 - p.V1)),
      Piso,
      Padia,

      cycle: THERMO_CYCLE_ORDER.indexOf(cycleId),
      VA, VB, VC, VD, PA, PB, PC, PD,
      Wnet: c.W,
      Q1: c.Q1,
      Q2: c.Q2,
      eta: c.W / c.Q1,
      etaCarnot: 1 - c.Tcold / c.Thot,
      Thot: c.Thot,
      Tcold: c.Tcold,
      cop: c.Q2 / c.W,
      copCarnot: c.Tcold / (c.Thot - c.Tcold),
      phase,
      stage: dot.stage,
      dotV: dot.V,
      dotP: dot.P,
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof HeatEngineState] : undefined;
  },

  setVariable(state, id, value) {
    if (!(id in THERMO_LIMITS)) return state;
    const v = limit(id as keyof typeof THERMO_LIMITS, value);
    // A new pair of bodies starts its contact afresh.
    if (id === "TA" || id === "TB" || id === "CB") return { ...state, [id]: v, t: 0 };
    return { ...state, [id]: v };
  },
};
