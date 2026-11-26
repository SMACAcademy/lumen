import type { SimulationModel } from "@ise/science-engine";

/**
 * Electrostatic potential and capacitance, class 12 (NCERT chapter 2).
 *
 * Potential: one or two point charges, or a conducting sphere sitting in a
 * steady outside field. The potential at a point is the work per unit charge
 * an outside agent does to bring a test charge there from far away; for a
 * point charge V = kq/r, and potentials of several charges simply add. The
 * work to carry the test charge q₀ from a fixed point A to the probe P is
 * W = q₀(V_P − V_A) — the same whichever path it takes. Two charges held
 * r apart store U = kq₁q₂/r. Inside the conductor the field is zero and the
 * potential is the same everywhere: it shields its inside from the outside
 * field.
 *
 * Capacitor: two parallel plates of area A, a gap d, filled with a dielectric
 * of constant K. C = ε₀KA/d, Q = CV, U = ½CV² = Q²/2C, E = V/d. With the
 * battery connected V stays fixed; disconnected, Q stays fixed.
 *
 * Combinations: three capacitors in series, in parallel, or C₁ in series with
 * C₂ ∥ C₃ — and a charged C₁ joined to an empty C₂, sharing its charge.
 *
 * Units, chosen so the numbers are friendly: charges in nC (point charges and
 * plates) or µC (the combinations), distances in cm (point charges) and mm
 * (the gap), capacitance in pF (plates) or µF (combinations), field in kV/m,
 * energies in µJ.
 */

/** Coulomb's constant, N m²/C², and the permittivity of free space, F/m (NCERT's values). */
export const CAP_COULOMB_K = 9e9;
export const CAP_EPSILON_0 = 8.85e-12;
/** The test charge carried about, nC. */
export const CAP_TEST_CHARGE = 1;
/** The fixed starting point A of the test charge, cm. */
export const CAP_POINT_A: readonly [number, number] = [-10, 0];
/** Distances to a point charge are never taken smaller than this, cm (the charge is a small ball). */
export const CAP_MIN_DISTANCE = 0.5;
/** The conducting sphere's radius, cm, and the steady outside field it sits in, V/m (pointing along +x). */
export const CAP_SPHERE_RADIUS = 4;
export const CAP_OUTSIDE_FIELD = 5000;
/** The window the charges live in, cm. */
export const CAP_X_RANGE: readonly [number, number] = [-15, 15];
export const CAP_Y_RANGE: readonly [number, number] = [-10, 10];
/** Play pulls the plates apart at this rate, mm/s. */
export const CAP_PULL_RATE = 1;

export type CapArrangement = "one" | "two" | "shell";
export const CAP_ARRANGEMENT_ORDER: readonly CapArrangement[] = ["one", "two", "shell"];

export type CapNetwork = "series" | "parallel" | "mixed" | "share";
export const CAP_NETWORK_ORDER: readonly CapNetwork[] = ["series", "parallel", "mixed", "share"];

export type CapacitorParams = { arrangement: CapArrangement; network: CapNetwork };

export interface CapacitorState {
  /** Point charges, nC, and how far apart the two are, cm. */
  readonly q1: number;
  readonly q2: number;
  readonly separation: number;
  /** The probe, cm. */
  readonly px: number;
  readonly py: number;
  /** Plate area cm², gap mm, dielectric constant. */
  readonly area: number;
  readonly gap: number;
  readonly k: number;
  /** Battery emf, V, and whether it is connected to the plates (1) or not (0). */
  readonly voltage: number;
  readonly battery: number;
  /** Charge on the plates while disconnected, nC. */
  readonly charge: number;
  /** The three capacitors of the combinations, µF. */
  readonly c1: number;
  readonly c2: number;
  readonly c3: number;
}

export type CapacitorResults = {
  arrangement: number;
  q1: number;
  q2: number;
  separation: number;
  px: number;
  py: number;
  /** From the probe to q₁ (or to the sphere's centre), cm. */
  distance: number;
  potential: number;
  potentialA: number;
  /** Field at the probe, kV/m. */
  field: number;
  fieldX: number;
  fieldY: number;
  /** Work by an outside agent to carry q₀ from A to the probe, µJ. */
  work: number;
  /** q₀V at the probe: the work to bring q₀ there from far away, µJ. */
  testEnergy: number;
  /** kq₁q₂/r of the two charges, µJ. */
  pairEnergy: number;
  /** 1 when the probe is inside the conductor. */
  inside: number;
  area: number;
  gap: number;
  dielectric: number;
  batteryVoltage: number;
  connected: number;
  /** pF. */
  capacitance: number;
  airCapacitance: number;
  /** nC, V, kV/m, µJ. */
  plateCharge: number;
  plateVoltage: number;
  plateField: number;
  plateEnergy: number;
  network: number;
  c1: number;
  c2: number;
  c3: number;
  /** µF, µC, V, µJ. */
  ceq: number;
  netCharge: number;
  capQ1: number;
  capQ2: number;
  capQ3: number;
  capV1: number;
  capV2: number;
  capV3: number;
  netEnergy: number;
  energyBefore: number;
  energyLost: number;
};

const OUTPUTS = [
  "arrangement", "q1", "q2", "separation", "px", "py", "distance", "potential", "potentialA", "field", "fieldX", "fieldY",
  "work", "testEnergy", "pairEnergy", "inside",
  "area", "gap", "dielectric", "batteryVoltage", "connected", "capacitance", "airCapacitance", "plateCharge", "plateVoltage", "plateField", "plateEnergy",
  "network", "c1", "c2", "c3", "ceq", "netCharge", "capQ1", "capQ2", "capQ3", "capV1", "capV2", "capV3", "netEnergy", "energyBefore", "energyLost",
] as const satisfies readonly (keyof CapacitorResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
/** Turns −0 into 0. */
const z = (v: number) => v || 0;

/** The ranges of every state variable, matching the concept's controls. */
export const CAP_LIMITS = {
  q1: [-10, 10],
  q2: [-10, 10],
  separation: [2, 12],
  px: [-15, 15],
  py: [-10, 10],
  area: [20, 400],
  gap: [0.5, 10],
  k: [1, 10],
  voltage: [1, 500],
  battery: [0, 1],
  charge: [0, 1e6],
  c1: [1, 12],
  c2: [1, 12],
  c3: [1, 12],
} as const satisfies Record<keyof CapacitorState, readonly [number, number]>;

export interface CapPointCharge {
  x: number;
  y: number;
  /** nC. */
  q: number;
}

/** The point charges of an arrangement (none for the sphere), positions in cm. */
export function capCharges(arrangement: CapArrangement, q1: number, q2: number, separation: number): CapPointCharge[] {
  if (arrangement === "one") return [{ x: 0, y: 0, q: q1 }];
  if (arrangement === "two") return [{ x: -separation / 2, y: 0, q: q1 }, { x: separation / 2, y: 0, q: q2 }];
  return [];
}

/**
 * The potential at (x, y) cm, in volts. For point charges V = Σ kqᵢ/rᵢ, zero far away.
 * For the sphere (charge q₁) in the outside field E₀ along +x, V is measured from the
 * plane x = 0 far from the sphere: outside, V = kQ/r − E₀x(1 − R³/r³); inside, kQ/R.
 */
export function capPotentialAt(arrangement: CapArrangement, q1: number, q2: number, separation: number, x: number, y: number): number {
  if (arrangement === "shell") {
    const r = Math.hypot(x, y);
    const R = CAP_SPHERE_RADIUS;
    if (r <= R) return z((CAP_COULOMB_K * q1 * 1e-9) / (R * 1e-2));
    return z((CAP_COULOMB_K * q1 * 1e-9) / (r * 1e-2) - CAP_OUTSIDE_FIELD * x * 1e-2 * (1 - (R / r) ** 3));
  }
  let v = 0;
  for (const c of capCharges(arrangement, q1, q2, separation)) {
    const r = Math.max(CAP_MIN_DISTANCE, Math.hypot(x - c.x, y - c.y));
    v += (CAP_COULOMB_K * c.q * 1e-9) / (r * 1e-2);
  }
  return z(v);
}

/** The field at (x, y) cm, [Eₓ, E_y] in V/m: minus the gradient of the potential above. */
export function capFieldAt(arrangement: CapArrangement, q1: number, q2: number, separation: number, x: number, y: number): [number, number] {
  if (arrangement === "shell") {
    const r = Math.hypot(x, y);
    const R = CAP_SPHERE_RADIUS;
    if (r <= R) return [0, 0];
    const kq = CAP_COULOMB_K * q1 * 1e-9 * 1e4; // kQ/r² with r in cm, V/m × cm²
    const R3 = R ** 3;
    const ex = (kq * x) / r ** 3 + CAP_OUTSIDE_FIELD - CAP_OUTSIDE_FIELD * R3 * (1 / r ** 3 - (3 * x * x) / r ** 5);
    const ey = (kq * y) / r ** 3 + (3 * CAP_OUTSIDE_FIELD * R3 * x * y) / r ** 5;
    return [z(ex), z(ey)];
  }
  let ex = 0;
  let ey = 0;
  for (const c of capCharges(arrangement, q1, q2, separation)) {
    const dx = x - c.x;
    const dy = y - c.y;
    const raw = Math.hypot(dx, dy);
    const r = Math.max(CAP_MIN_DISTANCE, raw);
    const e = (CAP_COULOMB_K * c.q * 1e-9) / (r * 1e-2) ** 2;
    if (raw > 1e-12) {
      ex += (e * dx) / raw;
      ey += (e * dy) / raw;
    }
  }
  return [z(ex), z(ey)];
}

/** A parallel-plate capacitor, C = ε₀KA/d, in pF, from A in cm² and d in mm. */
export function capParallelPlate(area: number, gap: number, k: number): number {
  return (CAP_EPSILON_0 * k * area * 1e-4) / (gap * 1e-3) * 1e12;
}

export interface CapNetworkResult {
  ceq: number;
  charge: number;
  q: [number, number, number];
  v: [number, number, number];
  energy: number;
  energyBefore: number;
}

/**
 * Three capacitors (µF) on a battery of V volts. Charges in µC, energies in µJ.
 * "share": C₁ is charged to V, taken off the battery and joined across an empty C₂.
 */
export function capNetwork(network: CapNetwork, c1: number, c2: number, c3: number, V: number): CapNetworkResult {
  if (network === "series") {
    const ceq = 1 / (1 / c1 + 1 / c2 + 1 / c3);
    const Q = ceq * V;
    return { ceq, charge: Q, q: [Q, Q, Q], v: [Q / c1, Q / c2, Q / c3], energy: 0.5 * ceq * V * V, energyBefore: 0.5 * ceq * V * V };
  }
  if (network === "parallel") {
    const ceq = c1 + c2 + c3;
    return { ceq, charge: ceq * V, q: [c1 * V, c2 * V, c3 * V], v: [V, V, V], energy: 0.5 * ceq * V * V, energyBefore: 0.5 * ceq * V * V };
  }
  if (network === "mixed") {
    const pair = c2 + c3;
    const ceq = (c1 * pair) / (c1 + pair);
    const Q = ceq * V;
    const v23 = Q / pair;
    return { ceq, charge: Q, q: [Q, c2 * v23, c3 * v23], v: [Q / c1, v23, v23], energy: 0.5 * ceq * V * V, energyBefore: 0.5 * ceq * V * V };
  }
  const Q = c1 * V;
  const common = Q / (c1 + c2);
  return {
    ceq: c1 + c2,
    charge: Q,
    q: [c1 * common, c2 * common, 0],
    v: [common, common, 0],
    energy: 0.5 * (c1 + c2) * common * common,
    energyBefore: 0.5 * c1 * V * V,
  };
}

const arrangementOf = (params: CapacitorParams) => (CAP_ARRANGEMENT_ORDER.includes(params.arrangement) ? params.arrangement : "one");
const networkOf = (params: CapacitorParams) => (CAP_NETWORK_ORDER.includes(params.network) ? params.network : "series");

/** The charge a connected battery puts on the plates, nC. */
const chargeFromBattery = (s: CapacitorState) =>
  (capParallelPlate(clamp(s.area, 20, 400), clamp(s.gap, 0.5, 10), clamp(s.k, 1, 10)) * clamp(s.voltage, 1, 500)) / 1000;
/** While the battery is connected it keeps the plates' charge at CV. */
const sync = (s: CapacitorState): CapacitorState => (s.battery >= 0.5 ? { ...s, charge: chargeFromBattery(s) } : s);

export const capacitorModel: SimulationModel<CapacitorState, CapacitorParams, CapacitorResults> = {
  id: "capacitor",
  defaultParams: { arrangement: "one", network: "series" },
  outputs: OUTPUTS,
  stateVariables: ["q1", "q2", "separation", "px", "py", "area", "gap", "k", "voltage", "battery", "c1", "c2", "c3"],

  initialize() {
    return sync({ q1: 10, q2: -10, separation: 6, px: 5, py: 0, area: 100, gap: 1, k: 1, voltage: 100, battery: 1, charge: 0, c1: 2, c2: 3, c3: 6 });
  },

  /** Play pulls the plates apart, 1 mm a second, until the gap is 10 mm. */
  advance(state, dt) {
    return sync({ ...state, gap: clamp(state.gap + CAP_PULL_RATE * dt, 0.5, 10) });
  },

  step(state, _params, sign) {
    return sync({ ...state, gap: clamp(Math.round(state.gap * 2) / 2 + 0.5 * sign, 0.5, 10) });
  },

  derive(state, params) {
    const arrangement = arrangementOf(params);
    const q1 = clamp(state.q1, -10, 10);
    const q2 = clamp(state.q2, -10, 10);
    const s = clamp(state.separation, 2, 12);
    const px = clamp(state.px, -15, 15);
    const py = clamp(state.py, -10, 10);
    const potential = capPotentialAt(arrangement, q1, q2, s, px, py);
    const potentialA = capPotentialAt(arrangement, q1, q2, s, CAP_POINT_A[0], CAP_POINT_A[1]);
    const [ex, ey] = capFieldAt(arrangement, q1, q2, s, px, py);
    const centre = arrangement === "two" ? -s / 2 : 0;
    const distance = Math.hypot(px - centre, py);

    const area = clamp(state.area, 20, 400);
    const gap = clamp(state.gap, 0.5, 10);
    const k = clamp(state.k, 1, 10);
    const voltage = clamp(state.voltage, 1, 500);
    const connected = state.battery >= 0.5 ? 1 : 0;
    const C = capParallelPlate(area, gap, k);
    const Q = connected ? (C * voltage) / 1000 : clamp(state.charge, 0, 1e6);
    const plateVoltage = (Q * 1000) / C;

    const network = networkOf(params);
    const c1 = clamp(state.c1, 1, 12);
    const c2 = clamp(state.c2, 1, 12);
    const c3 = clamp(state.c3, 1, 12);
    const net = capNetwork(network, c1, c2, c3, voltage);
    return {
      arrangement: CAP_ARRANGEMENT_ORDER.indexOf(arrangement),
      q1,
      q2,
      separation: s,
      px: z(px),
      py: z(py),
      distance,
      potential,
      potentialA,
      field: Math.hypot(ex, ey) / 1000,
      fieldX: z(ex / 1000),
      fieldY: z(ey / 1000),
      work: z(CAP_TEST_CHARGE * (potential - potentialA) * 1e-3),
      testEnergy: z(CAP_TEST_CHARGE * potential * 1e-3),
      pairEnergy: arrangement === "two" ? z((CAP_COULOMB_K * q1 * q2 * 1e-18) / (s * 1e-2) * 1e6) : 0,
      inside: arrangement === "shell" && Math.hypot(px, py) <= CAP_SPHERE_RADIUS ? 1 : 0,
      area,
      gap,
      dielectric: k,
      batteryVoltage: voltage,
      connected,
      capacitance: C,
      airCapacitance: C / k,
      plateCharge: Q,
      plateVoltage,
      plateField: plateVoltage / gap,
      plateEnergy: 0.5 * Q * plateVoltage * 1e-3,
      network: CAP_NETWORK_ORDER.indexOf(network),
      c1,
      c2,
      c3,
      ceq: net.ceq,
      netCharge: net.charge,
      capQ1: net.q[0],
      capQ2: net.q[1],
      capQ3: net.q[2],
      capV1: net.v[0],
      capV2: net.v[1],
      capV3: net.v[2],
      netEnergy: net.energy,
      energyBefore: net.energyBefore,
      energyLost: Math.max(0, net.energyBefore - net.energy),
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof CapacitorState] : undefined;
  },

  setVariable(state, id, value) {
    if (!(id in CAP_LIMITS) || id === "charge") return state;
    const key = id as keyof CapacitorState;
    const [lo, hi] = CAP_LIMITS[key];
    if (key === "battery") {
      const on = clamp(Math.round(value), 0, 1);
      if (on === 1) return sync({ ...state, battery: 1 });
      // Disconnecting keeps whatever charge the battery had put there.
      return { ...sync(state), battery: 0 };
    }
    return sync({ ...state, [key]: clamp(value, lo, hi) });
  },
};
