import type { SimulationModel } from "@ise/science-engine";

/**
 * Semiconductor electronics, class 12 (NCERT chapter 14).
 *
 * Bands: in a solid the electron energy levels crowd into bands. In a metal
 * the valence and conduction bands overlap; in a semiconductor a small gap
 * separates them (silicon 1.1 eV, germanium 0.7 eV); in an insulator the gap
 * is wide (diamond 5.4 eV), so at room temperature almost no electron crosses.
 *
 * Doping: a pentavalent atom (P, As) gives silicon a free electron — n-type;
 * a trivalent atom (B, Al) leaves a hole — p-type. In equilibrium the two
 * densities always multiply to the same number, n_e n_h = n_i², and the
 * crystal stays neutral, n_e = n_h + N_D (or n_h = n_e + N_A).
 *
 * The p–n junction: diffusion leaves a depletion layer of fixed ions and a
 * barrier potential V₀ (0.7 V silicon, 0.3 V germanium). Forward bias lowers
 * the barrier to V₀ − V and thins the layer; reverse bias raises and widens
 * it. The width is worked out from the textbook abrupt-junction result
 * W = √(2ε(V₀ − V)(1/N_A + 1/N_D)/e) with both sides doped to 10²² m⁻³ —
 * a model, and the formula itself is beyond NCERT.
 *
 * The diode: modelled by Shockley's equation I = I₀(e^{V/ηV_T} − 1), with
 * η = 2, I₀ = 10 nA for silicon and η = 1, I₀ = 1 µA for germanium. The
 * current reaches 10 mA at 0.71 V (Si) and 0.24 V (Ge) — the "cut-in".
 * Reverse current is the tiny saturation current I₀ until breakdown, which
 * this rectifier diode reaches at 50 V (beyond the −10 V slider) and the
 * Zener diode at 6.0 V. Past breakdown the curve is drawn with a 2 Ω slope.
 * Currents above 200 mA either way are beyond the diode's rating, so they
 * are held there and flagged.
 *
 * Rectifiers: a 50 Hz sine of peak V_m. Each conducting silicon diode drops
 * 0.7 V. Half-wave passes one half of each cycle; full-wave (centre-tap)
 * both. A capacitor across the 1 kΩ load charges to the peak and discharges
 * through the load between peaks, leaving a ripple; the steady output is
 * found by stepping the circuit through several cycles.
 *
 * Zener regulator: an unregulated input through a 200 Ω series resistor to a
 * 6.0 V Zener with a 1.5 kΩ load across it. The Zener is ideal: once it
 * breaks down its voltage is exactly 6.0 V and it takes whatever current the
 * resistor sends that the load does not.
 *
 * Optoelectronics: an LED emits at λ = hc/E_g ≈ 1240/E_g nm (E_g in eV).
 * A 1 mm² photodiode, reverse biased, gives 0.5 A per watt of light plus a
 * 10 nA dark current. A 10 cm × 10 cm silicon solar cell gives a
 * short-circuit current of 3.5 A in full sunlight (1000 W/m²) and an
 * open-circuit voltage V_oc = V_T ln(I_sc/I₀ + 1), I₀ = 1 nA.
 *
 * Transistor: an n-p-n transistor in common emitter, V_CC = 10 V,
 * R_C = 2 kΩ, the input V_i through R_B = 20 kΩ. V_BE is taken as 0.7 V, so
 * I_B = (V_i − 0.7)/R_B; then I_C = βI_B until the transistor saturates at
 * V_CE = 0.2 V. In the active region the output voltage falls β R_C / R_B
 * volts for every volt the input rises — the voltage gain.
 *
 * Logic gates: OR, AND, NOT, NAND and NOR, and NOT, AND and OR built from
 * NAND gates alone.
 */

/** Boltzmann's constant J/K, the electron charge C, room temperature K, and V_T = kT/e. */
export const SEMI_BOLTZMANN = 1.38e-23;
export const SEMI_CHARGE = 1.6e-19;
export const SEMI_TEMPERATURE = 300;
export const SEMI_THERMAL_VOLTAGE = (SEMI_BOLTZMANN * SEMI_TEMPERATURE) / SEMI_CHARGE;
export const SEMI_EPSILON_0 = 8.85e-12;
/** hc/e in eV nm. */
export const SEMI_HC = 1240;

// ── Bands ────────────────────────────────────────────────────────────────────

export type SemiSolid = "metal" | "silicon" | "germanium" | "diamond";
export const SEMI_SOLID_ORDER: readonly SemiSolid[] = ["metal", "silicon", "germanium", "diamond"];
/** Band gap, eV (0 where the bands overlap), and free electrons per m³ at room temperature. */
export const SEMI_SOLIDS: Record<SemiSolid, { label: string; gap: number; carriers: number }> = {
  metal: { label: "Copper (a metal)", gap: 0, carriers: 8.5e28 },
  silicon: { label: "Silicon", gap: 1.1, carriers: 1.5e16 },
  germanium: { label: "Germanium", gap: 0.7, carriers: 2.4e19 },
  diamond: { label: "Diamond (carbon)", gap: 5.4, carriers: 0 },
};
/** A gap wider than this, eV, makes an insulator. */
export const SEMI_INSULATOR_GAP = 3;

// ── Doping ───────────────────────────────────────────────────────────────────

export type SemiMaterial = "silicon" | "germanium";
export const SEMI_MATERIAL_ORDER: readonly SemiMaterial[] = ["silicon", "germanium"];
/** Atoms per m³ and intrinsic carrier density n_i per m³ at 300 K. */
export const SEMI_MATERIALS: Record<SemiMaterial, { label: string; atoms: number; ni: number }> = {
  silicon: { label: "Silicon", atoms: 5e28, ni: 1.5e16 },
  germanium: { label: "Germanium", atoms: 4.4e28, ni: 2.4e19 },
};

export type SemiDopant = "none" | "pentavalent" | "trivalent";
export const SEMI_DOPANT_ORDER: readonly SemiDopant[] = ["none", "pentavalent", "trivalent"];

// ── Junction and diode ───────────────────────────────────────────────────────

export type SemiDevice = "silicon" | "germanium" | "zener";
export const SEMI_DEVICE_ORDER: readonly SemiDevice[] = ["silicon", "germanium", "zener"];
export interface SemiDiode {
  label: string;
  /** Barrier potential V, ideality factor, saturation current A, reverse breakdown V. */
  barrier: number;
  eta: number;
  i0: number;
  breakdown: number;
  /** Relative permittivity, and the doping on each side, per m³. */
  permittivity: number;
  doping: number;
}
export const SEMI_DIODES: Record<SemiDevice, SemiDiode> = {
  silicon: { label: "Silicon diode", barrier: 0.7, eta: 2, i0: 1e-8, breakdown: 50, permittivity: 11.7, doping: 1e22 },
  germanium: { label: "Germanium diode", barrier: 0.3, eta: 1, i0: 1e-6, breakdown: 50, permittivity: 16, doping: 1e22 },
  zener: { label: "Zener diode (silicon)", barrier: 0.7, eta: 2, i0: 1e-8, breakdown: 6, permittivity: 11.7, doping: 1e24 },
};
/** Slope resistance past breakdown, Ω; the diode's current rating, A; the cut-in current, A. */
export const SEMI_BREAKDOWN_SLOPE = 2;
export const SEMI_MAX_CURRENT = 0.2;
export const SEMI_CUT_IN_CURRENT = 0.01;
export const SEMI_BIAS_RANGE: readonly [number, number] = [-10, 0.8];

// ── Rectifier ────────────────────────────────────────────────────────────────

export type SemiRectifier = "half" | "full";
export const SEMI_RECTIFIER_ORDER: readonly SemiRectifier[] = ["half", "full"];
/** Mains frequency Hz, the drop across a conducting diode V, and the load Ω. */
export const SEMI_MAINS = 50;
export const SEMI_DROP = 0.7;
export const SEMI_LOAD = 1000;
/** Samples per mains cycle when stepping the rectifier, and Play's slow motion (1 s of play = 20 ms). */
export const SEMI_SAMPLES = 500;
export const SEMI_SLOW = 0.02;

// ── Zener regulator ──────────────────────────────────────────────────────────

export const SEMI_ZENER_VOLTAGE = 6;
export const SEMI_SERIES_R = 200;
export const SEMI_ZENER_LOAD = 1500;

// ── Light ────────────────────────────────────────────────────────────────────

/** Photodiode: area m², responsivity A/W, dark current A. */
export const SEMI_PD_AREA = 1e-6;
export const SEMI_PD_RESPONSIVITY = 0.5;
export const SEMI_PD_DARK = 1e-8;
/** Solar cell: area m², short-circuit current per W/m² of light A, saturation current A. */
export const SEMI_CELL_AREA = 0.01;
export const SEMI_CELL_CURRENT = 3.5e-3;
export const SEMI_CELL_I0 = 1e-9;

/** Light colours by wavelength: index, name and the shortest wavelength (nm) of each band. */
export const SEMI_COLOURS: readonly { name: string; from: number }[] = [
  { name: "infrared", from: 700 },
  { name: "red", from: 620 },
  { name: "orange", from: 590 },
  { name: "yellow", from: 570 },
  { name: "green", from: 495 },
  { name: "blue", from: 450 },
  { name: "violet", from: 400 },
  { name: "ultraviolet", from: 0 },
];

// ── Transistor ───────────────────────────────────────────────────────────────

export const SEMI_VCC = 10;
export const SEMI_RC = 2000;
export const SEMI_RB = 20000;
export const SEMI_VBE = 0.7;
export const SEMI_VCE_SAT = 0.2;

// ── Gates ────────────────────────────────────────────────────────────────────

export type SemiGate = "or" | "and" | "not" | "nand" | "nor" | "nand-not" | "nand-and" | "nand-or";
export const SEMI_GATE_ORDER: readonly SemiGate[] = ["or", "and", "not", "nand", "nor", "nand-not", "nand-and", "nand-or"];
export const SEMI_GATES: Record<SemiGate, { label: string; inputs: 1 | 2; nands: number }> = {
  or: { label: "OR", inputs: 2, nands: 0 },
  and: { label: "AND", inputs: 2, nands: 0 },
  not: { label: "NOT", inputs: 1, nands: 0 },
  nand: { label: "NAND", inputs: 2, nands: 1 },
  nor: { label: "NOR", inputs: 2, nands: 0 },
  "nand-not": { label: "NOT from one NAND", inputs: 1, nands: 1 },
  "nand-and": { label: "AND from two NANDs", inputs: 2, nands: 2 },
  "nand-or": { label: "OR from three NANDs", inputs: 2, nands: 3 },
};

const nand = (a: number, b: number) => (a && b ? 0 : 1);

/** The gate's output (0 or 1) for inputs a and b (0 or 1). One-input gates read only a. */
export function semiGateOutput(gate: SemiGate, a: number, b: number): number {
  const A = a >= 0.5 ? 1 : 0;
  const B = b >= 0.5 ? 1 : 0;
  switch (gate) {
    case "or": return A || B ? 1 : 0;
    case "and": return A && B ? 1 : 0;
    case "not": return A ? 0 : 1;
    case "nand": return nand(A, B);
    case "nor": return A || B ? 0 : 1;
    case "nand-not": return nand(A, A);
    case "nand-and": return nand(nand(A, B), nand(A, B));
    case "nand-or": return nand(nand(A, A), nand(B, B));
    default: return 0;
  }
}

// ── Physics helpers ──────────────────────────────────────────────────────────

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Carrier densities per m³ for a dopant density N per m³: neutrality plus n_e n_h = n_i². */
export function semiCarriers(ni: number, dopant: SemiDopant, density: number): { ne: number; nh: number } {
  if (dopant === "none" || density <= 0) return { ne: ni, nh: ni };
  const majority = density / 2 + Math.sqrt((density / 2) ** 2 + ni * ni);
  const minority = (ni * ni) / majority;
  return dopant === "pentavalent" ? { ne: majority, nh: minority } : { ne: minority, nh: majority };
}

/** Depletion width, µm, at bias V (0 once forward bias has removed the barrier). */
export function semiDepletionWidth(diode: SemiDiode, bias: number): number {
  const drop = diode.barrier - bias;
  if (drop <= 0) return 0;
  const eps = diode.permittivity * SEMI_EPSILON_0;
  return Math.sqrt(((2 * eps * drop) / SEMI_CHARGE) * (2 / diode.doping)) * 1e6;
}

/** The diode's current, A, at bias V, by the model, before the rating is applied. */
export function semiDiodeModelCurrent(diode: SemiDiode, bias: number): number {
  const nvt = diode.eta * SEMI_THERMAL_VOLTAGE;
  const i = diode.i0 * (Math.exp(Math.min(bias / nvt, 50)) - 1);
  return bias < -diode.breakdown ? i - (-diode.breakdown - bias) / SEMI_BREAKDOWN_SLOPE : i;
}

/** The diode's current, A, at bias V; beyond ±200 mA it is held at the rating. */
export function semiDiodeCurrent(diode: SemiDiode, bias: number): number {
  return clamp(semiDiodeModelCurrent(diode, bias), -SEMI_MAX_CURRENT, SEMI_MAX_CURRENT);
}

/** The bias, V, at which the forward current reaches the 10 mA cut-in. */
export function semiCutIn(diode: SemiDiode): number {
  return diode.eta * SEMI_THERMAL_VOLTAGE * Math.log(SEMI_CUT_IN_CURRENT / diode.i0 + 1);
}

/** The rectified (unfiltered) output at time t s, V. */
export function semiRectified(kind: SemiRectifier, peak: number, t: number): number {
  const s = Math.sin(2 * Math.PI * SEMI_MAINS * t);
  const v = kind === "full" ? peak * Math.abs(s) : peak * s;
  return Math.max(0, v - SEMI_DROP);
}

export interface SemiWave {
  /** Times s, input V and output V for two steady mains cycles, sampled SEMI_SAMPLES times a cycle. */
  t: number[];
  vin: number[];
  vout: number[];
}

/**
 * Two steady cycles of the rectifier's output. With the capacitor (µF) the
 * output follows the rectified input while it is rising and otherwise
 * discharges through the load; the first two cycles are run and dropped so
 * the capacitor has charged.
 */
export function semiRectifierWave(kind: SemiRectifier, peak: number, filter: boolean, capacitance: number): SemiWave {
  const period = 1 / SEMI_MAINS;
  const dt = period / SEMI_SAMPLES;
  const decay = filter ? Math.exp(-dt / (SEMI_LOAD * Math.max(capacitance, 1) * 1e-6)) : 0;
  const out: SemiWave = { t: [], vin: [], vout: [] };
  let v = 0;
  for (let k = 0; k <= 4 * SEMI_SAMPLES; k++) {
    const t = k * dt;
    const source = semiRectified(kind, peak, t);
    v = filter ? Math.max(source, v * decay) : source;
    if (k >= 2 * SEMI_SAMPLES) {
      out.t.push(t - 2 * period);
      out.vin.push(peak * Math.sin(2 * Math.PI * SEMI_MAINS * t));
      out.vout.push(v);
    }
  }
  return out;
}

/** Colour index (into SEMI_COLOURS) of light of wavelength λ nm. */
export function semiColourOf(wavelength: number): number {
  const i = SEMI_COLOURS.findIndex((c) => wavelength >= c.from);
  return i < 0 ? SEMI_COLOURS.length - 1 : i;
}

/** Solar cell: short-circuit current A, open-circuit voltage V and best power W in light of L W/m². */
export function semiSolarCell(light: number): { isc: number; voc: number; pmax: number } {
  const isc = SEMI_CELL_CURRENT * Math.max(0, light);
  if (isc <= 0) return { isc: 0, voc: 0, pmax: 0 };
  const vt = SEMI_THERMAL_VOLTAGE;
  const voc = vt * Math.log(isc / SEMI_CELL_I0 + 1);
  let pmax = 0;
  for (let k = 1; k < 2000; k++) {
    const v = (voc * k) / 2000;
    pmax = Math.max(pmax, v * (isc - SEMI_CELL_I0 * (Math.exp(v / vt) - 1)));
  }
  return { isc, voc, pmax };
}

// ── The model ────────────────────────────────────────────────────────────────

export type SemiconductorParams = {
  solid: SemiSolid;
  material: SemiMaterial;
  dopant: SemiDopant;
  device: SemiDevice;
  rectifier: SemiRectifier;
  /** 1 with the smoothing capacitor across the load. */
  filter: number;
  /** The transistor's current gain β = I_C / I_B. */
  beta: number;
  gate: SemiGate;
};

export interface SemiconductorState {
  /** Dopant atoms per million host atoms. */
  readonly ppm: number;
  /** Voltage across the diode, V (positive = forward). */
  readonly bias: number;
  /** Rectifier input peak V, and the smoothing capacitor µF. */
  readonly peak: number;
  readonly capacitance: number;
  /** Unregulated input to the Zener regulator, V. */
  readonly vin: number;
  /** The LED's band gap, eV. */
  readonly gap: number;
  /** Light falling on the photodiode and the solar cell, W/m². */
  readonly light: number;
  /** Transistor input voltage, V. */
  readonly vi: number;
  /** Gate inputs, 0 or 1. */
  readonly a: number;
  readonly b: number;
  /** Time along the mains cycle, s (Play). */
  readonly t: number;
}

export type SemiconductorResults = {
  solid: number;
  bandGap: number;
  solidClass: number;
  freeCarriers: number;
  material: number;
  dopant: number;
  ppm: number;
  atoms: number;
  ni: number;
  donors: number;
  ne: number;
  nh: number;
  carrierProduct: number;
  semiType: number;
  device: number;
  bias: number;
  barrier: number;
  effBarrier: number;
  depletion: number;
  biasState: number;
  current: number;
  currentMicro: number;
  satCurrent: number;
  cutIn: number;
  breakdown: number;
  brokenDown: number;
  overload: number;
  rectifier: number;
  filter: number;
  peak: number;
  capacitance: number;
  outPeak: number;
  outAverage: number;
  ripple: number;
  rippleFreq: number;
  t: number;
  vinNow: number;
  voutNow: number;
  vin: number;
  vout: number;
  seriesCurrent: number;
  loadCurrent: number;
  zenerCurrent: number;
  regulating: number;
  zenerPower: number;
  gap: number;
  wavelength: number;
  ledColour: number;
  gapTimesWavelength: number;
  light: number;
  photoCurrent: number;
  shortCircuit: number;
  openVoltage: number;
  maxPower: number;
  efficiency: number;
  vi: number;
  beta: number;
  baseCurrent: number;
  collectorCurrent: number;
  emitterCurrent: number;
  vce: number;
  region: number;
  voltageGain: number;
  powerGain: number;
  alpha: number;
  gate: number;
  a: number;
  b: number;
  y: number;
  nands: number;
};

const OUTPUTS = [
  "solid", "bandGap", "solidClass", "freeCarriers",
  "material", "dopant", "ppm", "atoms", "ni", "donors", "ne", "nh", "carrierProduct", "semiType",
  "device", "bias", "barrier", "effBarrier", "depletion", "biasState", "current", "currentMicro", "satCurrent", "cutIn", "breakdown", "brokenDown", "overload",
  "rectifier", "filter", "peak", "capacitance", "outPeak", "outAverage", "ripple", "rippleFreq", "t", "vinNow", "voutNow",
  "vin", "vout", "seriesCurrent", "loadCurrent", "zenerCurrent", "regulating", "zenerPower",
  "gap", "wavelength", "ledColour", "gapTimesWavelength",
  "light", "photoCurrent", "shortCircuit", "openVoltage", "maxPower", "efficiency",
  "vi", "beta", "baseCurrent", "collectorCurrent", "emitterCurrent", "vce", "region", "voltageGain", "powerGain", "alpha",
  "gate", "a", "b", "y", "nands",
] as const satisfies readonly (keyof SemiconductorResults)[];

/** The slider ranges, which setVariable clamps to. */
export const SEMI_RANGES = {
  ppm: [0, 10],
  bias: SEMI_BIAS_RANGE,
  peak: [2, 20],
  capacitance: [10, 1000],
  vin: [0, 20],
  gap: [1.4, 3.4],
  light: [0, 1000],
  vi: [0, 5],
  a: [0, 1],
  b: [0, 1],
} as const satisfies Record<string, readonly [number, number]>;

const pick = <T extends string>(order: readonly T[], value: T, fallback: T) => (order.includes(value) ? value : fallback);
const zero = (v: number) => v || 0;

export const semiconductorModel: SimulationModel<SemiconductorState, SemiconductorParams, SemiconductorResults> = {
  id: "semiconductor",
  defaultParams: { solid: "silicon", material: "silicon", dopant: "pentavalent", device: "silicon", rectifier: "half", filter: 0, beta: 100, gate: "and" },
  outputs: OUTPUTS,
  stateVariables: ["ppm", "bias", "peak", "capacitance", "vin", "gap", "light", "vi", "a", "b", "t"],

  initialize() {
    return { ppm: 1, bias: 0, peak: 10, capacitance: 100, vin: 10, gap: 1.9, light: 500, vi: 1, a: 0, b: 0, t: 0 };
  },

  /** Play runs the mains on, in slow motion: one 20 ms cycle a second. */
  advance(state, dt) {
    const t = state.t + dt * SEMI_SLOW;
    return { ...state, t: t >= 2 / SEMI_MAINS ? t - 2 / SEMI_MAINS : t };
  },

  /** Steps the diode's bias by 0.05 V. */
  step(state, _params, sign) {
    return { ...state, bias: clamp(Math.round(state.bias * 20) / 20 + 0.05 * sign, SEMI_BIAS_RANGE[0], SEMI_BIAS_RANGE[1]) };
  },

  derive(state, params) {
    // Bands
    const solidId = pick(SEMI_SOLID_ORDER, params.solid, "silicon");
    const solid = SEMI_SOLIDS[solidId];

    // Doping
    const materialId = pick(SEMI_MATERIAL_ORDER, params.material, "silicon");
    const material = SEMI_MATERIALS[materialId];
    const dopantId = pick(SEMI_DOPANT_ORDER, params.dopant, "none");
    const ppm = clamp(state.ppm, 0, SEMI_RANGES.ppm[1]);
    const donors = dopantId === "none" ? 0 : ppm * 1e-6 * material.atoms;
    const { ne, nh } = semiCarriers(material.ni, dopantId, donors);

    // Junction and diode
    const deviceId = pick(SEMI_DEVICE_ORDER, params.device, "silicon");
    const diode = SEMI_DIODES[deviceId];
    const bias = clamp(state.bias, SEMI_BIAS_RANGE[0], SEMI_BIAS_RANGE[1]);
    const raw = semiDiodeModelCurrent(diode, bias);
    const current = clamp(raw, -SEMI_MAX_CURRENT, SEMI_MAX_CURRENT);

    // Rectifier
    const kind = pick(SEMI_RECTIFIER_ORDER, params.rectifier, "half");
    const filter = params.filter >= 0.5 ? 1 : 0;
    const peak = clamp(state.peak, SEMI_RANGES.peak[0], SEMI_RANGES.peak[1]);
    const capacitance = clamp(state.capacitance, SEMI_RANGES.capacitance[0], SEMI_RANGES.capacitance[1]);
    const wave = semiRectifierWave(kind, peak, filter === 1, capacitance);
    const cycle = wave.vout.slice(SEMI_SAMPLES);
    const outPeak = Math.max(...cycle);
    const outMin = Math.min(...cycle);
    const outAverage = cycle.slice(1).reduce((s, v) => s + v, 0) / SEMI_SAMPLES;
    const t = clamp(state.t, 0, 2 / SEMI_MAINS);
    const index = clamp(Math.round((t * SEMI_MAINS) * SEMI_SAMPLES), 0, wave.vout.length - 1);

    // Zener regulator
    const vin = clamp(state.vin, SEMI_RANGES.vin[0], SEMI_RANGES.vin[1]);
    const divided = (vin * SEMI_ZENER_LOAD) / (SEMI_SERIES_R + SEMI_ZENER_LOAD);
    const regulating = divided > SEMI_ZENER_VOLTAGE ? 1 : 0;
    const vout = regulating ? SEMI_ZENER_VOLTAGE : divided;
    const seriesCurrent = ((vin - vout) / SEMI_SERIES_R) * 1000;
    const loadCurrent = (vout / SEMI_ZENER_LOAD) * 1000;
    const zenerCurrent = regulating ? seriesCurrent - loadCurrent : 0;

    // Light
    const gap = clamp(state.gap, SEMI_RANGES.gap[0], SEMI_RANGES.gap[1]);
    const wavelength = SEMI_HC / gap;
    const light = clamp(state.light, SEMI_RANGES.light[0], SEMI_RANGES.light[1]);
    const cell = semiSolarCell(light);

    // Transistor
    const beta = clamp(params.beta, 20, 400);
    const vi = clamp(state.vi, SEMI_RANGES.vi[0], SEMI_RANGES.vi[1]);
    const ib = Math.max(0, (vi - SEMI_VBE) / SEMI_RB);
    const saturation = (SEMI_VCC - SEMI_VCE_SAT) / SEMI_RC;
    const region = ib <= 0 ? 0 : beta * ib >= saturation ? 2 : 1;
    const ic = region === 0 ? 0 : region === 2 ? saturation : beta * ib;
    const vce = region === 2 ? SEMI_VCE_SAT : SEMI_VCC - ic * SEMI_RC;
    const voltageGain = (beta * SEMI_RC) / SEMI_RB;

    // Gates
    const gateId = pick(SEMI_GATE_ORDER, params.gate, "and");
    const a = state.a >= 0.5 ? 1 : 0;
    const b = state.b >= 0.5 ? 1 : 0;

    return {
      solid: SEMI_SOLID_ORDER.indexOf(solidId),
      bandGap: solid.gap,
      solidClass: solid.gap <= 0 ? 0 : solid.gap > SEMI_INSULATOR_GAP ? 2 : 1,
      freeCarriers: solid.carriers,
      material: SEMI_MATERIAL_ORDER.indexOf(materialId),
      dopant: SEMI_DOPANT_ORDER.indexOf(dopantId),
      ppm,
      atoms: material.atoms,
      ni: material.ni,
      donors,
      ne,
      nh,
      carrierProduct: ne * nh,
      semiType: donors <= 0 ? 0 : dopantId === "pentavalent" ? 1 : 2,
      device: SEMI_DEVICE_ORDER.indexOf(deviceId),
      bias: zero(bias),
      barrier: diode.barrier,
      effBarrier: Math.max(0, diode.barrier - bias),
      depletion: semiDepletionWidth(diode, bias),
      biasState: bias > 0.005 ? 1 : bias < -0.005 ? -1 : 0,
      current: zero(current * 1000),
      currentMicro: zero(current * 1e6),
      satCurrent: diode.i0 * 1e6,
      cutIn: semiCutIn(diode),
      breakdown: diode.breakdown,
      brokenDown: bias < -diode.breakdown ? 1 : 0,
      overload: Math.abs(raw) > SEMI_MAX_CURRENT ? 1 : 0,
      rectifier: SEMI_RECTIFIER_ORDER.indexOf(kind),
      filter,
      peak,
      capacitance,
      outPeak,
      outAverage,
      ripple: outPeak - outMin,
      rippleFreq: kind === "full" ? 2 * SEMI_MAINS : SEMI_MAINS,
      t,
      vinNow: Math.abs(wave.vin[index] ?? 0) < 1e-9 ? 0 : (wave.vin[index] ?? 0),
      voutNow: wave.vout[index] ?? 0,
      vin,
      vout,
      seriesCurrent,
      loadCurrent,
      zenerCurrent,
      regulating,
      zenerPower: (SEMI_ZENER_VOLTAGE * zenerCurrent) / 1000,
      gap,
      wavelength,
      ledColour: semiColourOf(wavelength),
      gapTimesWavelength: gap * wavelength,
      light,
      photoCurrent: (SEMI_PD_DARK + SEMI_PD_RESPONSIVITY * light * SEMI_PD_AREA) * 1e6,
      shortCircuit: cell.isc,
      openVoltage: cell.voc,
      maxPower: cell.pmax,
      efficiency: light > 0 ? (cell.pmax / (light * SEMI_CELL_AREA)) * 100 : 0,
      vi,
      beta,
      baseCurrent: ib * 1e6,
      collectorCurrent: ic * 1000,
      emitterCurrent: (ib + ic) * 1000,
      vce,
      region,
      voltageGain,
      powerGain: beta * voltageGain,
      alpha: beta / (1 + beta),
      gate: SEMI_GATE_ORDER.indexOf(gateId),
      a,
      b,
      y: semiGateOutput(gateId, a, b),
      nands: SEMI_GATES[gateId].nands,
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof SemiconductorState] : undefined;
  },

  setVariable(state, id, value) {
    if (!Number.isFinite(value)) return state;
    if (id === "t") return { ...state, t: clamp(value, 0, 2 / SEMI_MAINS) };
    if (id in SEMI_RANGES) {
      const [lo, hi] = SEMI_RANGES[id as keyof typeof SEMI_RANGES];
      const v = clamp(value, lo, hi);
      return { ...state, [id]: id === "a" || id === "b" ? Math.round(v) : v };
    }
    return state;
  },
};
