import type { SimulationModel } from "@ise/science-engine";

/**
 * Moving charges and magnetism (NCERT class 12, chapter 4).
 *
 * A magnetic field pushes on a moving charge, F = q v × B, always at right
 * angles to its velocity: so it bends the path but never changes the speed.
 * Across the field the charge goes round a circle of radius r = m v⊥ / qB, in
 * a time T = 2πm / qB that does not depend on how fast it goes; any velocity
 * along B carries it on, so the path is a helix. A velocity selector balances
 * qE against qvB, and a cyclotron keeps kicking ions across a gap in step
 * with their unchanging period.
 *
 * A current is many moving charges, so a wire in a field feels F = I L × B;
 * two parallel currents push or pull on each other, and a coil feels a
 * torque τ = N I A B sin θ — the moving-coil galvanometer.
 *
 * Currents also make fields: the Biot–Savart law for a short element, and
 * from it (or from Ampère's circuital law) the field of a long wire, of a
 * circular loop, of a solenoid and of a toroid.
 *
 * Directions, with the page as the x–y plane (x to the right, y up the page,
 * z out of the page towards the reader):
 * - orbit: a charge moving +x with B into the page is pushed +y if positive,
 *   so a positive charge circles anticlockwise in a field into the page;
 * - velocity selector: E points down the page and B into it, so on a positive
 *   charge qE is down and qvB is up (both flip for a negative charge);
 * - force on a wire: B points +x, the current at angle θ anticlockwise from B;
 *   F = I L × B is into the page for 0 < θ < 180° and out for 180° < θ < 360°;
 * - torque: B points +x and the coil's moment m is at θ from B; the torque
 *   m × B always turns m towards B;
 * - fields: a current out of the page has anticlockwise field lines; a loop or
 *   solenoid seen side-on with ⊙ along its top and ⊗ along its bottom has its
 *   field along the axis to the right; a toroid with ⊙ on its inner rim has an
 *   anticlockwise field in its core.
 *
 * Constants as NCERT uses them: e = 1.6 × 10⁻¹⁹ C, mₚ = 1.67 × 10⁻²⁷ kg,
 * mₑ = 9.1 × 10⁻³¹ kg, μ₀ = 4π × 10⁻⁷ T m/A. Motion is non-relativistic.
 */

export const LORENTZ_MU0 = 4 * Math.PI * 1e-7;
export const LORENTZ_E = 1.6e-19;
export const LORENTZ_C = 3e8;
/** Restoring torque of the galvanometer's spring, N m per radian. */
export const LORENTZ_SPRING = 5e-6;
/** The galvanometer's scale runs from −60° to +60°. */
export const LORENTZ_FULL_SCALE = Math.PI / 3;
/** The toroid's core lies between these radii, cm. */
export const LORENTZ_TOROID_INNER = 15;
export const LORENTZ_TOROID_OUTER = 25;
/** The Biot–Savart element is this long, cm. */
export const LORENTZ_ELEMENT = 1;

export type LorentzParticle = "proton" | "electron" | "alpha";
export type LorentzIon = "proton" | "deuteron" | "alpha";
export type LorentzFieldDirection = "into" | "out";
export type LorentzSense = "same" | "opposite";
export type LorentzSource = "element" | "wire" | "loop" | "solenoid" | "toroid";
export type LorentzFlow = "forward" | "reverse";

export const LORENTZ_PARTICLE_ORDER: readonly LorentzParticle[] = ["proton", "electron", "alpha"];
export const LORENTZ_ION_ORDER: readonly LorentzIon[] = ["proton", "deuteron", "alpha"];
export const LORENTZ_SOURCE_ORDER: readonly LorentzSource[] = ["element", "wire", "loop", "solenoid", "toroid"];

/** Charge in units of e, and mass in kg. */
export const LORENTZ_PARTICLES: Record<LorentzParticle, { label: string; charge: number; mass: number }> = {
  proton: { label: "Proton", charge: 1, mass: 1.67e-27 },
  electron: { label: "Electron", charge: -1, mass: 9.1e-31 },
  alpha: { label: "Alpha particle", charge: 2, mass: 6.68e-27 },
};

export const LORENTZ_IONS: Record<LorentzIon, { label: string; charge: number; mass: number }> = {
  proton: { label: "Protons", charge: 1, mass: 1.67e-27 },
  deuteron: { label: "Deuterons", charge: 1, mass: 3.34e-27 },
  alpha: { label: "Alpha particles", charge: 2, mass: 6.68e-27 },
};

/**
 * Codes for the direction of a field or force, shared by several outputs.
 * 0 none, 1 out of the page, 2 into the page, 3 anticlockwise, 4 clockwise,
 * 5 to the right, 6 to the left.
 */
export const LORENTZ_DIRECTION = { none: 0, out: 1, into: 2, anticlockwise: 3, clockwise: 4, right: 5, left: 6 } as const;

export type LorentzParams = {
  particle: LorentzParticle;
  /** Whether B points into or out of the page in the orbit view. */
  fieldDirection: LorentzFieldDirection;
  ion: LorentzIon;
  /** Whether the two parallel wires carry their currents the same way. */
  sense: LorentzSense;
  source: LorentzSource;
  /** The current as drawn, or reversed. */
  flow: LorentzFlow;
};

export interface LorentzState {
  /** Speed of the charge, km/s. */
  readonly speed: number;
  /** Field in the orbit and selector views, mT. */
  readonly field: number;
  /** Angle between v and B, rad. */
  readonly pitchAngle: number;
  /** Revolutions completed, for play (0–3, wrapping). */
  readonly turn: number;
  /** Electric field in the velocity selector, kV/m. */
  readonly efield: number;
  /** Cyclotron field, T. */
  readonly cycField: number;
  /** Radius of the dees, cm. */
  readonly deeRadius: number;
  /** Voltage across the gap, kV. */
  readonly gapVoltage: number;
  /** Gap crossings so far, for play. */
  readonly crossings: number;
  /**
   * The current, A: in the wire in a field, in the coil, in the first of the
   * two parallel wires, and in whatever makes the field.
   */
  readonly current: number;
  /** The field the wire and the coil sit in, T. */
  readonly fieldT: number;
  /** Length of the wire in the field, or of the solenoid, cm. */
  readonly length: number;
  /**
   * θ, rad: from B to the wire's current, from B to the coil's moment, or
   * from the current element to the field point.
   */
  readonly angle: number;
  /** Current in the second parallel wire, A. */
  readonly current2: number;
  /** cm. */
  readonly separation: number;
  /** Turns of the coil, loop, solenoid or toroid. */
  readonly turns: number;
  /** cm². */
  readonly coilArea: number;
  /** Current through the galvanometer, µA. */
  readonly meterCurrent: number;
  /** Distance to the field point, loop radius or Amperian radius, cm. */
  readonly distance: number;
  /** Distance along the loop's axis, cm. */
  readonly axial: number;
}

export type LorentzResults = {
  particle: number;
  fieldDirection: number;
  chargeE: number;
  speed: number;
  field: number;
  pitchAngle: number;
  /** |q| v B sin θ, N. */
  force: number;
  /** cm. */
  radius: number;
  /** µs. */
  period: number;
  /** MHz. */
  frequency: number;
  /** Distance along B per turn, cm. */
  pitch: number;
  /** +1 anticlockwise, −1 clockwise as seen on the page, 0 not circling. */
  sense: number;
  /** eV — the field never changes it. */
  kineticEnergy: number;
  turn: number;
  /** µs since play started. */
  elapsed: number;
  efield: number;
  electricForce: number;
  magneticForce: number;
  /** E / B, km/s. */
  selectorSpeed: number;
  /** +1 bends up the page, −1 down, 0 straight through. */
  selectorDeflect: number;
  ion: number;
  cycField: number;
  deeRadius: number;
  gapVoltage: number;
  /** MHz. */
  cycFrequency: number;
  /** km/s. */
  maxSpeed: number;
  /** Per cent of the speed of light. */
  maxSpeedPercent: number;
  /** MeV. */
  maxEnergy: number;
  /** MeV. */
  energyPerCrossing: number;
  crossingsNeeded: number;
  crossings: number;
  /** MeV. */
  energyNow: number;
  /** cm. */
  radiusNow: number;
  exited: number;
  current: number;
  fieldT: number;
  length: number;
  angle: number;
  /** N. */
  wireForce: number;
  /** A direction code: out, into or none. */
  wireForceDir: number;
  current2: number;
  separation: number;
  /** Field of wire 1 where wire 2 is, µT. */
  fieldAtWire2: number;
  /** N/m. */
  forcePerLength: number;
  /** The same, in units of 10⁻⁷ N/m. */
  forceE7: number;
  /** +1 attract, −1 repel, 0 no force. */
  attract: number;
  turns: number;
  coilArea: number;
  /** N I A, A m². */
  moment: number;
  /** N m. */
  torque: number;
  /** |sin θ|: the torque as a fraction of its greatest. */
  torqueFraction: number;
  /** +1 anticlockwise, −1 clockwise, 0 none. */
  torqueSense: number;
  /** 0 not balanced, 1 stable (m along B), 2 unstable (m against B). */
  equilibrium: number;
  /** Force on each side of the coil perpendicular to the page, N. */
  sideForce: number;
  meterCurrent: number;
  /** Needle angle, rad, held at the stops. */
  deflection: number;
  offScale: number;
  /** Degrees of deflection per µA. */
  sensitivity: number;
  source: number;
  flow: number;
  distance: number;
  axial: number;
  /** The field at the point of interest, µT. */
  sourceField: number;
  /** A direction code. */
  fieldDir: number;
  /** μ₀ N I / 2R at the loop's centre, µT. */
  centreField: number;
  /** Turns per metre. */
  turnsPerMetre: number;
  /** ∮B·dl ÷ μ₀ round the Amperian circle (wire and toroid), A. */
  lineIntegral: number;
  /** Current through the Amperian circle (wire and toroid), A. */
  enclosed: number;
  /** For the toroid: 0 in the hole, 1 in the core, 2 outside. */
  region: number;
};

type Range = readonly [min: number, max: number];

/** Every state variable's range, in its stored unit. */
export const LORENTZ_RANGES = {
  speed: [100, 10000],
  field: [1, 1000],
  pitchAngle: [0, Math.PI / 2],
  efield: [0, 1000],
  cycField: [0.2, 1],
  deeRadius: [20, 80],
  gapVoltage: [10, 100],
  current: [0, 20],
  fieldT: [0, 2],
  length: [5, 100],
  angle: [0, 2 * Math.PI],
  current2: [0, 20],
  separation: [1, 100],
  turns: [1, 1000],
  coilArea: [1, 400],
  meterCurrent: [-300, 300],
  distance: [1, 50],
  axial: [0, 50],
} as const satisfies Record<string, Range>;

type Ranged = keyof typeof LORENTZ_RANGES;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const within = (id: Ranged, v: number) => clamp(Number.isFinite(v) ? v : LORENTZ_RANGES[id][0], LORENTZ_RANGES[id][0], LORENTZ_RANGES[id][1]);
/** No −0, no NaN. */
const tidy = (v: number) => (Number.isFinite(v) ? v || 0 : 0);
/** A sine that is exactly zero at whole multiples of 180°. */
const sine = (a: number) => (Math.abs(Math.sin(a)) < 1e-12 ? 0 : Math.sin(a));
const cosine = (a: number) => (Math.abs(Math.cos(a)) < 1e-12 ? 0 : Math.cos(a));

/** Radius of the circle, m, for speed v (m/s) across a field B (T). */
export function lorentzRadius(mass: number, chargeE: number, v: number, B: number): number {
  return B > 0 ? (mass * v) / (Math.abs(chargeE) * LORENTZ_E * B) : 0;
}

/** Time for one turn, s: 2πm / qB — the same at any speed. */
export function lorentzPeriod(mass: number, chargeE: number, B: number): number {
  return B > 0 ? (2 * Math.PI * mass) / (Math.abs(chargeE) * LORENTZ_E * B) : 0;
}

/** Field of a long straight wire, T, at r metres. */
export function wireFieldAt(I: number, r: number): number {
  return r > 0 ? (LORENTZ_MU0 * I) / (2 * Math.PI * r) : 0;
}

/** Field on the axis of N circular turns of radius R, x from the centre (all m), T. */
export function loopFieldAt(N: number, I: number, R: number, x: number): number {
  return R > 0 ? (LORENTZ_MU0 * N * I * R * R) / (2 * Math.pow(R * R + x * x, 1.5)) : 0;
}

/** The toroid region for an Amperian circle of radius r cm. */
function toroidRegion(r: number): number {
  return r < LORENTZ_TOROID_INNER ? 0 : r <= LORENTZ_TOROID_OUTER ? 1 : 2;
}

const particleOf = (p: LorentzParams) => LORENTZ_PARTICLES[p.particle] ?? LORENTZ_PARTICLES.proton;
const ionOf = (p: LorentzParams) => LORENTZ_IONS[p.ion] ?? LORENTZ_IONS.proton;

/** The cyclotron's numbers, before the ion leaves. */
function cyclotron(state: LorentzState, params: LorentzParams) {
  const ion = ionOf(params);
  const q = ion.charge * LORENTZ_E;
  const B = within("cycField", state.cycField);
  const R = within("deeRadius", state.deeRadius) / 100;
  const V = within("gapVoltage", state.gapVoltage) * 1000;
  const maxSpeed = (q * B * R) / ion.mass;
  const maxEnergyJ = (q * q * B * B * R * R) / (2 * ion.mass);
  const perCrossingJ = q * V;
  const needed = Math.ceil(maxEnergyJ / perCrossingJ - 1e-9);
  return { ion, q, B, R, V, maxSpeed, maxEnergyJ, perCrossingJ, needed };
}

const OUTPUTS = [
  "particle", "fieldDirection", "chargeE", "speed", "field", "pitchAngle", "force", "radius", "period", "frequency", "pitch",
  "sense", "kineticEnergy", "turn", "elapsed",
  "efield", "electricForce", "magneticForce", "selectorSpeed", "selectorDeflect",
  "ion", "cycField", "deeRadius", "gapVoltage", "cycFrequency", "maxSpeed", "maxSpeedPercent", "maxEnergy", "energyPerCrossing",
  "crossingsNeeded", "crossings", "energyNow", "radiusNow", "exited",
  "current", "fieldT", "length", "angle", "wireForce", "wireForceDir",
  "current2", "separation", "fieldAtWire2", "forcePerLength", "forceE7", "attract",
  "turns", "coilArea", "moment", "torque", "torqueFraction", "torqueSense", "equilibrium", "sideForce",
  "meterCurrent", "deflection", "offScale", "sensitivity",
  "source", "flow", "distance", "axial",
  "sourceField", "fieldDir", "centreField", "turnsPerMetre", "lineIntegral", "enclosed", "region",
] as const satisfies readonly (keyof LorentzResults)[];

const STATE_KEYS = [
  "speed", "field", "pitchAngle", "turn", "efield", "cycField", "deeRadius", "gapVoltage", "crossings",
  "current", "fieldT", "length", "angle", "current2", "separation", "turns", "coilArea", "meterCurrent", "distance", "axial",
] as const satisfies readonly (keyof LorentzState)[];

/** Revolutions per second of play, whatever the real period. */
const TURN_RATE = 0.25;
const TURN_WINDOW = 3;
/** Play spends this long on the whole cyclotron run, s, then pauses with the beam out. */
const CYCLOTRON_RUN = 12;
const CYCLOTRON_PAUSE = 1.5;

export const lorentzModel: SimulationModel<LorentzState, LorentzParams, LorentzResults> = {
  id: "lorentz",
  defaultParams: { particle: "proton", fieldDirection: "into", ion: "proton", sense: "same", source: "wire", flow: "forward" },
  outputs: OUTPUTS,
  stateVariables: STATE_KEYS,

  initialize() {
    return {
      speed: 1000,
      field: 100,
      pitchAngle: Math.PI / 2,
      turn: 0,
      efield: 50,
      cycField: 0.5,
      deeRadius: 50,
      gapVoltage: 50,
      crossings: 0,
      current: 10,
      fieldT: 0.5,
      length: 50,
      angle: Math.PI / 2,
      current2: 10,
      separation: 10,
      turns: 100,
      coilArea: 4,
      meterCurrent: 100,
      distance: 10,
      axial: 0,
    };
  },

  /** Play turns the charge round its circle, and runs the cyclotron until the beam is out. */
  advance(state, dt, params) {
    const turn = (state.turn + TURN_RATE * dt) % TURN_WINDOW;
    const { needed } = cyclotron(state, params);
    const rate = Math.max(2, needed / CYCLOTRON_RUN);
    const next = state.crossings + rate * dt;
    return { ...state, turn, crossings: next > needed + rate * CYCLOTRON_PAUSE ? 0 : next };
  },

  step(state, params, sign) {
    const { needed } = cyclotron(state, params);
    return {
      ...state,
      turn: (((Math.round(state.turn * 8) + sign) / 8) % TURN_WINDOW + TURN_WINDOW) % TURN_WINDOW,
      crossings: clamp(Math.floor(state.crossings) + sign, 0, needed),
    };
  },

  derive(state, params) {
    // ── A charge in a field ──────────────────────────────────────────────
    const particle = particleOf(params);
    const qe = particle.charge;
    const q = Math.abs(qe) * LORENTZ_E;
    const speed = within("speed", state.speed);
    const v = speed * 1000;
    const field = within("field", state.field);
    const B = field / 1000;
    const angle = within("pitchAngle", state.pitchAngle);
    const across = sine(angle);
    const along = cosine(angle);
    const period = lorentzPeriod(particle.mass, qe, B);
    const into = params.fieldDirection !== "out";
    const turning = across > 0 ? Math.sign(qe) * (into ? 1 : -1) : 0;
    const turn = clamp(Number.isFinite(state.turn) ? state.turn : 0, 0, TURN_WINDOW);

    // ── The velocity selector: E down the page, B into it ────────────────
    const efield = within("efield", state.efield);
    const E = efield * 1000;
    const electricForce = q * E;
    const magneticForce = q * v * B;
    const balance = Math.abs(v * B - E) <= 0.005 * Math.max(v * B, E);
    // Upward force: q(vB − E) for a positive charge; a negative charge is pushed the other way.
    const upward = Math.sign(qe) * (v * B - E);

    // ── The cyclotron ────────────────────────────────────────────────────
    const cyc = cyclotron(state, params);
    const crossed = clamp(Math.floor(Number.isFinite(state.crossings) ? state.crossings : 0), 0, cyc.needed);
    const energyNowJ = Math.min(crossed * cyc.perCrossingJ, cyc.maxEnergyJ);
    const MeV = LORENTZ_E * 1e6;

    // ── Shared by the wire, the coil and the sources ─────────────────────
    const current = within("current", state.current);
    const fieldT = within("fieldT", state.fieldT);
    const length = within("length", state.length);
    const theta = within("angle", state.angle);
    const turns = Math.round(within("turns", state.turns));
    const sinTheta = sine(theta);
    const cosTheta = cosine(theta);

    // ── A wire in a field: B along +x, the current at θ from it ──────────
    const wireForce = fieldT * current * (length / 100) * Math.abs(sinTheta);
    // F_z = −I L B sin θ: into the page for 0 < θ < 180°.
    const wireForceDir = wireForce === 0 ? LORENTZ_DIRECTION.none : sinTheta > 0 ? LORENTZ_DIRECTION.into : LORENTZ_DIRECTION.out;

    // ── Two parallel wires: I₁ is the shared current ─────────────────────
    const current2 = within("current2", state.current2);
    const separation = within("separation", state.separation);
    const d = separation / 100;
    const forcePerLength = (LORENTZ_MU0 * current * current2) / (2 * Math.PI * d);
    const attract = forcePerLength === 0 ? 0 : params.sense === "opposite" ? -1 : 1;

    // ── A coil in a field: B along +x, the moment at θ from it ───────────
    const coilArea = within("coilArea", state.coilArea);
    const area = coilArea / 1e4;
    const moment = turns * current * area;
    const torque = moment * fieldT * Math.abs(sinTheta);
    const aligned = Math.abs(sinTheta) < Math.sin(Math.PI / 360);

    // ── The galvanometer: the same coil in a radial field ────────────────
    const meterCurrent = within("meterCurrent", state.meterCurrent);
    const perAmp = (turns * area * fieldT) / LORENTZ_SPRING;
    const swing = perAmp * meterCurrent * 1e-6;

    // ── Fields of currents ───────────────────────────────────────────────
    const sourceIndex = Math.max(0, LORENTZ_SOURCE_ORDER.indexOf(params.source));
    const source = LORENTZ_SOURCE_ORDER[sourceIndex] ?? "wire";
    const reversed = params.flow === "reverse";
    const sourceCurrent = current;
    const distance = within("distance", state.distance);
    const axial = within("axial", state.axial);
    const r = distance / 100;
    const n = turns / (length / 100);
    const region = toroidRegion(distance);
    let sourceField = 0;
    let fieldDir: number = LORENTZ_DIRECTION.none;
    let lineIntegral = 0;
    let enclosed = 0;
    if (source === "element") {
      // dB = μ₀ I dl sin θ / 4πr²; dl × r̂ is into the page with the point to the right of an upward element.
      const s = sinTheta;
      sourceField = (LORENTZ_MU0 * sourceCurrent * (LORENTZ_ELEMENT / 100) * Math.abs(s)) / (4 * Math.PI * r * r);
      if (sourceField > 0) fieldDir = (s > 0) !== reversed ? LORENTZ_DIRECTION.into : LORENTZ_DIRECTION.out;
    } else if (source === "wire") {
      sourceField = wireFieldAt(sourceCurrent, r);
      if (sourceField > 0) fieldDir = reversed ? LORENTZ_DIRECTION.clockwise : LORENTZ_DIRECTION.anticlockwise;
      lineIntegral = (sourceField * 2 * Math.PI * r) / LORENTZ_MU0;
      enclosed = sourceCurrent;
    } else if (source === "loop") {
      sourceField = loopFieldAt(turns, sourceCurrent, r, axial / 100);
      if (sourceField > 0) fieldDir = reversed ? LORENTZ_DIRECTION.left : LORENTZ_DIRECTION.right;
    } else if (source === "solenoid") {
      sourceField = LORENTZ_MU0 * n * sourceCurrent;
      if (sourceField > 0) fieldDir = reversed ? LORENTZ_DIRECTION.left : LORENTZ_DIRECTION.right;
    } else {
      enclosed = region === 1 ? turns * sourceCurrent : 0;
      sourceField = (LORENTZ_MU0 * enclosed) / (2 * Math.PI * r);
      if (sourceField > 0) fieldDir = reversed ? LORENTZ_DIRECTION.clockwise : LORENTZ_DIRECTION.anticlockwise;
      lineIntegral = (sourceField * 2 * Math.PI * r) / LORENTZ_MU0;
    }

    return {
      particle: Math.max(0, LORENTZ_PARTICLE_ORDER.indexOf(params.particle)),
      fieldDirection: into ? 0 : 1,
      chargeE: qe,
      speed,
      field,
      pitchAngle: angle,
      force: tidy(q * v * B * across),
      radius: tidy(lorentzRadius(particle.mass, qe, v * across, B) * 100),
      period: tidy(period * 1e6),
      frequency: tidy(period > 0 ? 1 / period / 1e6 : 0),
      pitch: tidy(v * along * period * 100),
      sense: tidy(turning),
      kineticEnergy: tidy((0.5 * particle.mass * v * v) / LORENTZ_E),
      turn,
      elapsed: tidy(turn * period * 1e6),

      efield,
      electricForce: tidy(electricForce),
      magneticForce: tidy(magneticForce),
      selectorSpeed: tidy(B > 0 ? E / B / 1000 : 0),
      selectorDeflect: balance ? 0 : Math.sign(upward) || 0,

      ion: Math.max(0, LORENTZ_ION_ORDER.indexOf(params.ion)),
      cycField: cyc.B,
      deeRadius: cyc.R * 100,
      gapVoltage: cyc.V / 1000,
      cycFrequency: tidy((cyc.q * cyc.B) / (2 * Math.PI * cyc.ion.mass) / 1e6),
      maxSpeed: tidy(cyc.maxSpeed / 1000),
      maxSpeedPercent: tidy((cyc.maxSpeed / LORENTZ_C) * 100),
      maxEnergy: tidy(cyc.maxEnergyJ / MeV),
      energyPerCrossing: tidy(cyc.perCrossingJ / MeV),
      crossingsNeeded: cyc.needed,
      crossings: crossed,
      energyNow: tidy(energyNowJ / MeV),
      radiusNow: tidy(cyc.maxEnergyJ > 0 ? cyc.R * Math.sqrt(energyNowJ / cyc.maxEnergyJ) * 100 : 0),
      exited: state.crossings >= cyc.needed ? 1 : 0,

      current,
      fieldT,
      length,
      angle: theta,
      wireForce: tidy(wireForce),
      wireForceDir,

      current2,
      separation,
      fieldAtWire2: tidy(wireFieldAt(current, d) * 1e6),
      forcePerLength: tidy(forcePerLength),
      forceE7: tidy(forcePerLength / 1e-7),
      attract,

      turns,
      coilArea,
      moment: tidy(moment),
      torque: tidy(torque),
      torqueFraction: Math.abs(sinTheta),
      // τ_z = −mB sin θ: the torque turns m towards B.
      torqueSense: torque === 0 ? 0 : sinTheta > 0 ? -1 : 1,
      equilibrium: !aligned || moment * fieldT === 0 ? 0 : cosTheta > 0 ? 1 : 2,
      sideForce: tidy(turns * current * Math.sqrt(area) * fieldT),

      meterCurrent,
      deflection: tidy(clamp(swing, -LORENTZ_FULL_SCALE, LORENTZ_FULL_SCALE)),
      offScale: Math.abs(swing) > LORENTZ_FULL_SCALE + 1e-9 ? 1 : 0,
      sensitivity: tidy(perAmp * 1e-6 * (180 / Math.PI)),

      source: sourceIndex,
      flow: reversed ? 1 : 0,
      distance,
      axial,
      sourceField: tidy(sourceField * 1e6),
      fieldDir,
      centreField: tidy(loopFieldAt(turns, sourceCurrent, r, 0) * 1e6),
      turnsPerMetre: tidy(n),
      lineIntegral: tidy(lineIntegral),
      enclosed,
      region,
    };
  },

  getVariable(state, id) {
    return (STATE_KEYS as readonly string[]).includes(id) ? state[id as keyof LorentzState] : undefined;
  },

  setVariable(state, id, value, params) {
    if (id === "turn") return { ...state, turn: clamp(Number.isFinite(value) ? value : 0, 0, TURN_WINDOW) };
    if (id === "crossings") {
      const { needed } = cyclotron(state, params);
      return { ...state, crossings: clamp(Number.isFinite(value) ? Math.round(value) : 0, 0, needed) };
    }
    if (!(id in LORENTZ_RANGES)) return state;
    const next = { ...state, [id]: within(id as Ranged, value) };
    // A new cyclotron starts its ion from the centre again.
    if (id === "cycField" || id === "deeRadius" || id === "gapVoltage") return { ...next, crossings: 0 };
    return next;
  },
};
