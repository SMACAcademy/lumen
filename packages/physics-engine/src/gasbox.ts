import type { SimulationModel } from "@ise/science-engine";

/**
 * A box of gas with a piston: kinetic theory for class 11.
 *
 * n moles of an ideal gas at temperature T fill a volume V behind a piston.
 * The molecules fly about and bounce off the walls; every bounce pushes, and
 * the pushes add up to the pressure. Two routes give the same number:
 *
 *   P = nRT / V                    the ideal gas equation
 *   P = ⅓ ρ v²rms                  from molecules hitting the walls
 *
 * because v²rms = 3RT/M and ρ = nM/V. Each molecule carries, on average,
 * kinetic energy (3/2)k_BT whatever the gas: temperature measures it.
 *
 * Speeds follow the Maxwell distribution, with three landmarks:
 *   v_mp = √(2RT/M) < v̄ = √(8RT/πM) < v_rms = √(3RT/M).
 *
 * Equipartition gives each degree of freedom ½k_BT per molecule. Counting
 * molecules as rigid — no vibration — a monatomic gas has f = 3, a diatomic
 * or other linear molecule f = 5, a non-linear one f = 6. Then
 * Cv = (f/2)R, Cp = Cv + R and γ = 1 + 2/f. CO₂ is linear, so the rigid
 * count gives it 5; its measured γ (1.30) is lower because its bending
 * vibrations already join in at room temperature.
 *
 * The mean free path is λ = k_BT / (√2 π d² P), with d an effective
 * molecular diameter taken from the collision cross-section.
 *
 * Constants are NCERT's: R = 8.314 J mol⁻¹ K⁻¹, k_B = 1.38 × 10⁻²³ J/K,
 * N_A = 6.02 × 10²³ mol⁻¹. The gas is ideal throughout.
 */

export const GASBOX_R = 8.314;
export const GASBOX_KB = 1.38e-23;
export const GASBOX_NA = 6.02e23;

export const GASBOX_T_RANGE = [100, 1000] as const;
/** Litres. */
export const GASBOX_V_RANGE = [5, 50] as const;
/** Moles. */
export const GASBOX_N_RANGE = [0.1, 2] as const;
/** The speed `fastShare` counts molecules above, m/s. */
export const GASBOX_FAST_SPEED = 1000;

/** 0 one atom, 1 two atoms, 2 a longer straight molecule, 3 a bent or three-dimensional one. */
export type GasboxShape = "monatomic" | "diatomic" | "linear" | "nonlinear";
export const GASBOX_SHAPE_ORDER: readonly GasboxShape[] = ["monatomic", "diatomic", "linear", "nonlinear"];

export interface GasboxGas {
  formula: string;
  name: string;
  /** Molar mass, g/mol. */
  M: number;
  /** Effective molecular diameter, nm, from the collision cross-section. */
  diameter: number;
  shape: GasboxShape;
  /** Rotational degrees of freedom of the rigid molecule. */
  rotational: number;
  /** Measured γ near room temperature. */
  gammaMeasured: number;
}

export type GasboxGasId = "he" | "h2" | "n2" | "o2" | "co2" | "ch4";
export const GASBOX_GAS_ORDER: readonly GasboxGasId[] = ["he", "h2", "n2", "o2", "co2", "ch4"];

export const GASBOX_GASES: Record<GasboxGasId, GasboxGas> = {
  he: { formula: "He", name: "Helium", M: 4, diameter: 0.26, shape: "monatomic", rotational: 0, gammaMeasured: 1.66 },
  h2: { formula: "H₂", name: "Hydrogen", M: 2, diameter: 0.29, shape: "diatomic", rotational: 2, gammaMeasured: 1.41 },
  n2: { formula: "N₂", name: "Nitrogen", M: 28, diameter: 0.37, shape: "diatomic", rotational: 2, gammaMeasured: 1.4 },
  o2: { formula: "O₂", name: "Oxygen", M: 32, diameter: 0.36, shape: "diatomic", rotational: 2, gammaMeasured: 1.4 },
  co2: { formula: "CO₂", name: "Carbon dioxide", M: 44, diameter: 0.41, shape: "linear", rotational: 2, gammaMeasured: 1.3 },
  ch4: { formula: "CH₄", name: "Methane", M: 16, diameter: 0.38, shape: "nonlinear", rotational: 3, gammaMeasured: 1.31 },
};

/** v_rms, v̄ and v_mp, m/s, for temperature T (K) and molar mass M (g/mol). */
export function gasboxSpeeds(T: number, M: number): { vrms: number; vavg: number; vmp: number } {
  const m = M / 1000;
  return {
    vrms: Math.sqrt((3 * GASBOX_R * T) / m),
    vavg: Math.sqrt((8 * GASBOX_R * T) / (Math.PI * m)),
    vmp: Math.sqrt((2 * GASBOX_R * T) / m),
  };
}

/** The Maxwell distribution, per m/s, written with the most probable speed: (4/√π)(v²/v_mp³)e^(−v²/v_mp²). */
export function gasboxMaxwell(v: number, vmp: number): number {
  if (vmp <= 0) return 0;
  const x = v / vmp;
  return ((4 / Math.sqrt(Math.PI)) * x * x * Math.exp(-x * x)) / vmp;
}

/** erfc(x) for x ≥ 0 (Abramowitz and Stegun 7.1.26, good to 1.5 × 10⁻⁷). */
function erfc(x: number): number {
  const t = 1 / (1 + 0.3275911 * x);
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  return poly * Math.exp(-x * x);
}

/** The fraction of molecules faster than `v` when the most probable speed is `vmp`. */
export function gasboxFractionAbove(v: number, vmp: number): number {
  if (vmp <= 0) return 0;
  const x = Math.max(0, v / vmp);
  return Math.min(1, Math.max(0, erfc(x) + (2 / Math.sqrt(Math.PI)) * x * Math.exp(-x * x)));
}

/** One drawn molecule: where it starts in the box (0–1), which way it heads, and its speed as a multiple of v_rms. */
export interface GasboxMolecule {
  x: number;
  y: number;
  angle: number;
  speed: number;
}

/** A fixed, seeded crowd of molecules, so every drawing and every test sees the same box. */
export function gasboxMolecules(count: number, seed = 20261118): GasboxMolecule[] {
  let s = seed >>> 0 || 1;
  const random = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gauss = () => Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());
  const out: GasboxMolecule[] = [];
  for (let i = 0; i < count; i++) {
    // A 3D Maxwell speed: the length of three Gaussian components, scaled so ⟨v²⟩ = v²rms.
    const [a, b, c] = [gauss(), gauss(), gauss()];
    out.push({ x: random(), y: random(), angle: 2 * Math.PI * random(), speed: Math.hypot(a, b, c) / Math.sqrt(3) });
  }
  return out;
}

export const GASBOX_MOLECULES: readonly GasboxMolecule[] = gasboxMolecules(40);

export type GasboxParams = { gas: GasboxGasId };

export interface GasboxState {
  /** Temperature, K. */
  readonly temperature: number;
  /** Volume behind the piston, L. */
  readonly volume: number;
  /** Amount of gas, mol. */
  readonly amount: number;
  /** Time the molecules have been moving, s. */
  readonly t: number;
}

export type GasboxResults = {
  gas: number;
  molarMass: number;
  temperature: number;
  volume: number;
  amount: number;
  /** From PV = nRT, kPa. */
  pressure: number;
  /** From ⅓ρv²rms, Pa. */
  pressureKinetic: number;
  /** kg/m³. */
  density: number;
  vrms: number;
  vavg: number;
  vmp: number;
  /** Average translational kinetic energy of one molecule, J. */
  ke: number;
  molecules: number;
  /** Molecules per m³. */
  numberDensity: number;
  /** Typical distance between neighbours, nm. */
  spacing: number;
  /** Height of the Maxwell curve's peak, % of molecules per 100 m/s. */
  peakShare: number;
  /** % of molecules faster than 1000 m/s. */
  fastShare: number;
  shape: number;
  dofTrans: number;
  dofRot: number;
  dof: number;
  /** J mol⁻¹ K⁻¹. */
  cv: number;
  cp: number;
  gamma: number;
  gammaMeasured: number;
  /** ½k_BT, J. */
  energyPerDof: number;
  /** (f/2)RT, J/mol, and n times it, J. */
  molarEnergy: number;
  internalEnergy: number;
  /** nm. */
  diameter: number;
  freePath: number;
  freePathRatio: number;
  /** Collisions per second for one molecule, v̄ / λ. */
  collisionRate: number;
  t: number;
};

const OUTPUTS = [
  "gas", "molarMass", "temperature", "volume", "amount", "pressure", "pressureKinetic", "density",
  "vrms", "vavg", "vmp", "ke", "molecules", "numberDensity", "spacing", "peakShare", "fastShare",
  "shape", "dofTrans", "dofRot", "dof", "cv", "cp", "gamma", "gammaMeasured", "energyPerDof", "molarEnergy", "internalEnergy",
  "diameter", "freePath", "freePathRatio", "collisionRate", "t",
] as const satisfies readonly (keyof GasboxResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
const gasOf = (params: GasboxParams): GasboxGasId => (GASBOX_GAS_ORDER.includes(params.gas) ? params.gas : "n2");
/** Play wraps time round after this long, s, so it stays a modest number. */
const LOOP = 600;

export const gasboxModel: SimulationModel<GasboxState, GasboxParams, GasboxResults> = {
  id: "gasbox",
  defaultParams: { gas: "n2" },
  outputs: OUTPUTS,
  stateVariables: ["temperature", "volume", "amount", "t"],

  initialize() {
    return { temperature: 300, volume: 25, amount: 1, t: 0 };
  },

  /** Play lets the molecules fly. */
  advance(state, dt) {
    const t = state.t + dt;
    return { ...state, t: t >= LOOP ? t - LOOP : Math.max(0, t) };
  },

  /** A step warms or cools the gas by 10 K. */
  step(state, _params, sign) {
    return { ...state, temperature: clamp(Math.round(state.temperature / 10) * 10 + 10 * sign, GASBOX_T_RANGE[0], GASBOX_T_RANGE[1]) };
  },

  derive(state, params) {
    const id = gasOf(params);
    const gas = GASBOX_GASES[id];
    const T = clamp(state.temperature, GASBOX_T_RANGE[0], GASBOX_T_RANGE[1]);
    const V = clamp(state.volume, GASBOX_V_RANGE[0], GASBOX_V_RANGE[1]);
    const n = clamp(state.amount, GASBOX_N_RANGE[0], GASBOX_N_RANGE[1]);
    const m3 = V / 1000;
    const pascals = (n * GASBOX_R * T) / m3;
    const density = (n * gas.M) / 1000 / m3;
    const { vrms, vavg, vmp } = gasboxSpeeds(T, gas.M);
    const molecules = n * GASBOX_NA;
    const numberDensity = molecules / m3;
    const d = gas.diameter * 1e-9;
    const lambda = (GASBOX_KB * T) / (Math.SQRT2 * Math.PI * d * d * pascals);
    const dof = 3 + gas.rotational;
    const cv = (dof / 2) * GASBOX_R;
    const molarEnergy = (dof / 2) * GASBOX_R * T;
    return {
      gas: GASBOX_GAS_ORDER.indexOf(id),
      molarMass: gas.M,
      temperature: T,
      volume: V,
      amount: n,
      pressure: pascals / 1000,
      pressureKinetic: (density * vrms * vrms) / 3,
      density,
      vrms,
      vavg,
      vmp,
      ke: 1.5 * GASBOX_KB * T,
      molecules,
      numberDensity,
      spacing: Math.cbrt(1 / numberDensity) * 1e9,
      peakShare: gasboxMaxwell(vmp, vmp) * 100 * 100,
      fastShare: gasboxFractionAbove(GASBOX_FAST_SPEED, vmp) * 100,
      shape: GASBOX_SHAPE_ORDER.indexOf(gas.shape),
      dofTrans: 3,
      dofRot: gas.rotational,
      dof,
      cv,
      cp: cv + GASBOX_R,
      gamma: 1 + 2 / dof,
      gammaMeasured: gas.gammaMeasured,
      energyPerDof: 0.5 * GASBOX_KB * T,
      molarEnergy,
      internalEnergy: n * molarEnergy,
      diameter: gas.diameter,
      freePath: lambda * 1e9,
      freePathRatio: lambda / d,
      collisionRate: vavg / lambda,
      t: Math.max(0, state.t) || 0,
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof GasboxState] : undefined;
  },

  setVariable(state, id, value) {
    switch (id) {
      case "temperature": return { ...state, temperature: clamp(value, GASBOX_T_RANGE[0], GASBOX_T_RANGE[1]) };
      case "volume": return { ...state, volume: clamp(value, GASBOX_V_RANGE[0], GASBOX_V_RANGE[1]) };
      case "amount": return { ...state, amount: clamp(value, GASBOX_N_RANGE[0], GASBOX_N_RANGE[1]) };
      case "t": return { ...state, t: clamp(value, 0, LOOP) };
      default: return state;
    }
  },
};
