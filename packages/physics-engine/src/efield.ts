import type { SimulationModel } from "@ise/science-engine";

/**
 * Electric charges and fields, class 12 (NCERT chapter 1).
 *
 * Charges: q₁ and q₂ sit on the x-axis, a distance r apart, either side of
 * the origin; a third charge q₃ sits at the point P = (x, y). Coulomb's law
 * F = kq₁q₂/r² gives the pull or push between any two of them, and the force
 * on q₃ is the vector sum of the forces from q₁ and q₂ (superposition).
 * Charge comes in whole numbers of e: q = ne.
 *
 * Field: the field at P is the force per coulomb a test charge there would
 * feel from q₁ and q₂, E = Σ kqᵢ r̂ᵢ / rᵢ². Make q₁ = −q₂ and the pair is a
 * dipole, of moment p = q × 2a pointing from −q to +q.
 *
 * Dipole in a uniform field: no net force, but a torque τ = pE sin θ, and a
 * potential energy U = −pE cos θ.
 *
 * Flux: through a flat surface of area A whose normal makes θ with a uniform
 * field, Φ = EA cos θ. Gauss's law: the flux out of any closed surface is
 * q_enc / ε₀, whatever its size — here a sphere centred on q₁.
 *
 * Gauss's law at work: a long straight line (λ/2πε₀r), a large flat sheet
 * (σ/2ε₀) and a thin spherical shell (zero inside, kQ/r² outside).
 *
 * Motion: an electron or proton fired between two plates across a uniform
 * field E. Like a ball thrown sideways under gravity, it keeps its speed along
 * the plates and gains speed across them: y = qEx² / 2mv².
 *
 * All the arithmetic is in SI. Controls are in µC, cm, cm², degrees and km/s
 * because those are the sizes of school problems; derive converts them.
 */

/** Coulomb's constant 1/4πε₀, N m²/C² — the rounded NCERT value. */
export const EF_K = 9e9;
/** Permittivity of free space, C²/(N m²). */
export const EF_EPSILON0 = 8.854e-12;
/** The elementary charge, C. */
export const EF_E = 1.6e-19;
export const EF_ELECTRON_MASS = 9.1e-31;
export const EF_PROTON_MASS = 1.67e-27;
/** A point is never treated as closer than this to a charge, cm. */
export const EF_MIN_GAP = 1;
/** The charged spherical shell's radius, cm. */
export const EF_SHELL_RADIUS = 10;
/** The deflecting plates: length along the beam and gap between them, cm. */
export const EF_PLATE_LENGTH = 5;
export const EF_PLATE_GAP = 2;
/** The window the charges live in: x in ±25 cm, y in ±20 cm. */
export const EF_X_LIMIT = 25;
export const EF_Y_LIMIT = 20;

const UC = 1e-6;
const CM = 0.01;
const DEG = Math.PI / 180;

export type EfieldSource = "line" | "sheet" | "shell";
export const EF_SOURCE_ORDER: readonly EfieldSource[] = ["line", "sheet", "shell"];
export type EfieldParticle = "electron" | "proton";
export const EF_PARTICLE_ORDER: readonly EfieldParticle[] = ["electron", "proton"];

export type EfieldParams = { source: EfieldSource; particle: EfieldParticle };

export interface EfieldState {
  /** The three charges, µC. */
  readonly q1: number;
  readonly q2: number;
  readonly q3: number;
  /** Distance from q₁ to q₂, cm; q₁ is at (−r/2, 0) and q₂ at (r/2, 0). */
  readonly sep: number;
  /** The point P where q₃ sits and where the field is measured, cm. */
  readonly px: number;
  readonly py: number;
  /** The dipole in a uniform field: its charge (µC), its length 2a (cm) and its angle to the field (deg). */
  readonly dipoleCharge: number;
  readonly dipoleLength: number;
  readonly theta: number;
  /** The uniform field, N/C. */
  readonly fieldE: number;
  /** A flat surface: its area (cm²) and the angle between its normal and the field (deg). */
  readonly area: number;
  readonly tilt: number;
  /** The Gaussian sphere around q₁, radius in cm. */
  readonly gaussR: number;
  /** λ (µC/m), σ (µC/m²) or Q (µC), by source; and the distance from the source, cm. */
  readonly amount: number;
  readonly dist: number;
  /** Launch speed between the plates, km/s; and how far along its path the charge is, 0–1. */
  readonly speed: number;
  readonly progress: number;
}

export type EfieldResults = {
  q1: number;
  q2: number;
  q3: number;
  sep: number;
  px: number;
  py: number;
  /** Electrons removed from (q₁ > 0) or added to (q₁ < 0) the body carrying q₁, in units of 10¹². */
  electrons12: number;
  /** Size of the force between q₁ and q₂, N. */
  force12: number;
  /** 1 they repel, −1 they attract, 0 one is uncharged. */
  interaction: number;
  /** The forces on q₃ from q₁ and from q₂, and their sum, N. */
  f31x: number;
  f31y: number;
  f32x: number;
  f32y: number;
  f31: number;
  f32: number;
  netX: number;
  netY: number;
  netForce: number;
  /** Direction of the net force, degrees anticlockwise from +x. */
  netAngle: number;
  /** The field at P from q₁ and q₂, N/C. */
  fieldX: number;
  fieldY: number;
  field: number;
  fieldAngle: number;
  /** 1 when P is within 1 cm of q₁ or q₂ (distances are then held at 1 cm). */
  tooClose: number;
  /** 1 when q₁ = −q₂ ≠ 0. */
  isDipole: number;
  /** p = |q| × r, C m (0 unless a dipole); +1 when p points along +x, −1 along −x. */
  pairMoment: number;
  pDirection: number;
  /** cos of the angle between E at P and p: +1 along p, −1 against it (0 unless a dipole). */
  fieldAlongP: number;
  /** Distance of P from the midpoint of q₁ and q₂, cm. */
  probeR: number;
  dipoleCharge: number;
  dipoleLength: number;
  theta: number;
  fieldE: number;
  /** p = q × 2a for the dipole in the uniform field, C m. */
  dipoleP: number;
  /** τ = pE sin θ, and its largest value pE, N m. */
  torque: number;
  maxTorque: number;
  /** U = −pE cos θ, J. */
  energy: number;
  /** qE on each end of the dipole, and the net force (zero), N. */
  forceEach: number;
  dipoleNetForce: number;
  area: number;
  tilt: number;
  /** Φ = EA cos θ, N m²/C. */
  flux: number;
  /** A cos θ: the area the field actually sees, cm². */
  projectedArea: number;
  gaussR: number;
  /** Charge inside the Gaussian sphere, µC; how many charges are inside. */
  qEnclosed: number;
  enclosedCount: number;
  /** Φ = q_enc / ε₀, N m²/C. */
  gaussFlux: number;
  /** The sphere's area, m², and the average outward field over it, Φ / area, N/C. */
  sphereArea: number;
  avgField: number;
  source: number;
  amount: number;
  dist: number;
  /** The field of the line, sheet or shell at that distance, N/C. */
  appField: number;
  /** 1 when the point is inside the shell. */
  insideShell: number;
  particle: number;
  speed: number;
  /** The particle's acceleration across the plates |q|E/m, m/s². */
  accel: number;
  /** 1 if it hits a plate before it gets out; where it hits, cm. */
  hitsPlate: number;
  hitX: number;
  /** Sideways shift as it leaves the plates (or reaches one), mm; time between the plates, ns; angle it leaves at, deg. */
  exitDeflection: number;
  transit: number;
  exitAngle: number;
  /** Where the particle is now: along the plates (cm), across them (mm, up positive), and the time so far (ns). */
  progress: number;
  posX: number;
  posY: number;
  time: number;
};

const OUTPUTS = [
  "q1", "q2", "q3", "sep", "px", "py", "electrons12", "force12", "interaction",
  "f31x", "f31y", "f32x", "f32y", "f31", "f32", "netX", "netY", "netForce", "netAngle",
  "fieldX", "fieldY", "field", "fieldAngle", "tooClose", "isDipole", "pairMoment", "pDirection", "fieldAlongP", "probeR",
  "dipoleCharge", "dipoleLength", "theta", "fieldE", "dipoleP", "torque", "maxTorque", "energy", "forceEach", "dipoleNetForce",
  "area", "tilt", "flux", "projectedArea",
  "gaussR", "qEnclosed", "enclosedCount", "gaussFlux", "sphereArea", "avgField",
  "source", "amount", "dist", "appField", "insideShell",
  "particle", "speed", "accel", "hitsPlate", "hitX", "exitDeflection", "transit", "exitAngle", "progress", "posX", "posY", "time",
] as const satisfies readonly (keyof EfieldResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** No −0 in the outputs. */
const z = (v: number) => (v === 0 || !Number.isFinite(v) ? 0 : v);
/** An angle in degrees, anticlockwise from +x, in (−180, 180]. */
const angleOf = (x: number, y: number) => (x === 0 && y === 0 ? 0 : z(Math.atan2(y, x) / DEG));

/** The control ranges, in control units. */
export const EF_RANGES = {
  q1: [-10, 10],
  q2: [-10, 10],
  q3: [-10, 10],
  sep: [2, 30],
  px: [-EF_X_LIMIT, EF_X_LIMIT],
  py: [-EF_Y_LIMIT, EF_Y_LIMIT],
  dipoleCharge: [0.5, 10],
  dipoleLength: [0.5, 10],
  theta: [0, 180],
  fieldE: [0, 100000],
  area: [10, 400],
  tilt: [0, 180],
  gaussR: [1, 40],
  amount: [0.5, 10],
  dist: [0.5, 40],
  speed: [100, 30000],
  progress: [0, 1],
} as const satisfies Record<keyof EfieldState, readonly [number, number]>;

/** Where q₁ and q₂ sit, cm. */
export function efieldChargePositions(sep: number): { a: readonly [number, number]; b: readonly [number, number] } {
  return { a: [-sep / 2, 0], b: [sep / 2, 0] };
}

/**
 * The field (N/C) at (x, y) cm from point charges [x, y, q µC], by Coulomb's
 * law and superposition. Distances below `minGap` cm are held at it.
 */
export function efieldAt(x: number, y: number, charges: readonly (readonly [number, number, number])[], minGap = EF_MIN_GAP): [number, number] {
  let ex = 0;
  let ey = 0;
  for (const [cx, cy, q] of charges) {
    if (q === 0) continue;
    const dx = (x - cx) * CM;
    const dy = (y - cy) * CM;
    const d = Math.max(Math.hypot(dx, dy), minGap * CM);
    const len = Math.hypot(dx, dy);
    const ux = len > 0 ? dx / len : 0;
    const uy = len > 0 ? dy / len : 0;
    const e = (EF_K * q * UC) / (d * d);
    ex += e * ux;
    ey += e * uy;
  }
  return [ex, ey];
}

/** Coulomb's law: the size of the force between q₁ and q₂ (µC) r cm apart, N. */
export function efieldCoulombForce(q1: number, q2: number, r: number): number {
  const d = Math.max(r, EF_MIN_GAP) * CM;
  return (EF_K * Math.abs(q1 * UC * q2 * UC)) / (d * d);
}

/** The field of a line (λ µC/m), sheet (σ µC/m²) or shell (Q µC, radius 10 cm) at r cm, N/C. */
export function efieldGaussField(source: EfieldSource, amount: number, r: number): number {
  const d = Math.max(r, 0.5) * CM;
  if (source === "line") return (amount * UC) / (2 * Math.PI * EF_EPSILON0 * d);
  if (source === "sheet") return (amount * UC) / (2 * EF_EPSILON0);
  return r < EF_SHELL_RADIUS ? 0 : (EF_K * amount * UC) / (d * d);
}

const sourceOf = (params: EfieldParams) => (EF_SOURCE_ORDER.includes(params.source) ? params.source : "line");
const particleOf = (params: EfieldParams) => (EF_PARTICLE_ORDER.includes(params.particle) ? params.particle : "electron");

/** The deflecting plates: everything about a charge fired between them. */
export function efieldFlight(particle: EfieldParticle, fieldE: number, speedKmS: number) {
  const charge = particle === "electron" ? -EF_E : EF_E;
  const mass = particle === "electron" ? EF_ELECTRON_MASS : EF_PROTON_MASS;
  const v = Math.max(1, speedKmS) * 1000;
  const accel = (Math.abs(charge) * Math.max(0, fieldE)) / mass;
  const length = EF_PLATE_LENGTH * CM;
  const half = (EF_PLATE_GAP / 2) * CM;
  // The field points down (top plate +), so a negative charge is pushed up.
  const up = charge < 0 ? 1 : -1;
  const hitTime = accel > 0 ? Math.sqrt((2 * half) / accel) : Infinity;
  const hitX = v * hitTime;
  const hits = hitX < length;
  const end = hits ? hitX : length;
  /** Sideways shift, m, after going x metres along. */
  const shift = (x: number) => (accel * x * x) / (2 * v * v);
  return { charge, mass, v, accel, up, hits, hitX, end, shift, length };
}

const DEFAULT_STATE: EfieldState = {
  q1: 2,
  q2: -3,
  q3: 1,
  sep: 10,
  px: 0,
  py: 8,
  dipoleCharge: 1,
  dipoleLength: 2,
  theta: 60,
  fieldE: 1000,
  area: 100,
  tilt: 0,
  gaussR: 5,
  amount: 1,
  dist: 10,
  speed: 10000,
  progress: 0,
};

export const efieldModel: SimulationModel<EfieldState, EfieldParams, EfieldResults> = {
  id: "efield",
  defaultParams: { source: "line", particle: "electron" },
  outputs: OUTPUTS,
  stateVariables: Object.keys(DEFAULT_STATE),

  initialize() {
    return { ...DEFAULT_STATE };
  },

  /** Play fires the charge between the plates: two seconds from one end to the other, then it stops. */
  advance(state, dt) {
    return { ...state, progress: clamp(state.progress + dt / 2, 0, 1) };
  },

  step(state, _params, sign) {
    return { ...state, progress: clamp(Math.round(state.progress * 10) / 10 + 0.1 * sign, 0, 1) };
  },

  derive(state, params) {
    const s = { ...state };
    for (const key of Object.keys(EF_RANGES) as (keyof EfieldState)[]) {
      const [lo, hi] = EF_RANGES[key];
      (s as Record<string, number>)[key] = clamp(Number.isFinite(state[key]) ? state[key] : DEFAULT_STATE[key], lo, hi);
    }

    // ── Charges, Coulomb's law and superposition ──
    const { q1, q2, q3, sep, px, py } = s;
    const { a, b } = efieldChargePositions(sep);
    const dA = Math.hypot(px - a[0], py - a[1]);
    const dB = Math.hypot(px - b[0], py - b[1]);
    const tooClose = (q1 !== 0 && dA < EF_MIN_GAP) || (q2 !== 0 && dB < EF_MIN_GAP) ? 1 : 0;
    const [e1x, e1y] = efieldAt(px, py, [[a[0], a[1], q1]]);
    const [e2x, e2y] = efieldAt(px, py, [[b[0], b[1], q2]]);
    const fieldX = e1x + e2x;
    const fieldY = e1y + e2y;
    const field = Math.hypot(fieldX, fieldY);
    const f31x = q3 * UC * e1x;
    const f31y = q3 * UC * e1y;
    const f32x = q3 * UC * e2x;
    const f32y = q3 * UC * e2y;
    const netX = f31x + f32x;
    const netY = f31y + f32y;

    // ── The pair as a dipole ──
    const isDipole = q1 !== 0 && Math.abs(q1 + q2) < 1e-9 ? 1 : 0;
    const pDirection = isDipole ? (q2 > 0 ? 1 : -1) : 0;
    const fieldAlongP = isDipole && field > 0 ? (fieldX * pDirection) / field : 0;

    // ── A dipole in a uniform field ──
    const E = s.fieldE;
    const dipoleP = s.dipoleCharge * UC * s.dipoleLength * CM;
    const th = s.theta * DEG;

    // ── Flux through a flat surface ──
    const areaM2 = s.area * CM * CM;
    const cosTilt = Math.cos(s.tilt * DEG);

    // ── Gauss's law: a sphere centred on q₁ ──
    const R = s.gaussR;
    const inside = [
      { q: q1, d: 0 },
      { q: q2, d: sep },
      { q: q3, d: dA },
    ].filter((c) => c.q !== 0 && c.d < R);
    const qEnclosed = inside.reduce((sum, c) => sum + c.q, 0);
    const gaussFlux = (qEnclosed * UC) / EF_EPSILON0;
    const sphereArea = 4 * Math.PI * (R * CM) ** 2;

    // ── A line, a sheet and a shell ──
    const source = sourceOf(params);

    // ── A charge between the plates ──
    const particle = particleOf(params);
    const flight = efieldFlight(particle, E, s.speed);
    const x = s.progress * flight.end;
    const exitShift = flight.hits ? (EF_PLATE_GAP / 2) * CM : flight.shift(flight.length);

    return {
      q1: z(q1),
      q2: z(q2),
      q3: z(q3),
      sep,
      px: z(px),
      py: z(py),
      electrons12: (Math.abs(q1) * UC) / EF_E / 1e12,
      force12: efieldCoulombForce(q1, q2, sep),
      interaction: z(Math.sign(q1 * q2)),
      f31x: z(f31x),
      f31y: z(f31y),
      f32x: z(f32x),
      f32y: z(f32y),
      f31: Math.hypot(f31x, f31y),
      f32: Math.hypot(f32x, f32y),
      netX: z(netX),
      netY: z(netY),
      netForce: Math.hypot(netX, netY),
      netAngle: angleOf(netX, netY),
      fieldX: z(fieldX),
      fieldY: z(fieldY),
      field,
      fieldAngle: angleOf(fieldX, fieldY),
      tooClose,
      isDipole,
      pairMoment: isDipole ? Math.abs(q1) * UC * sep * CM : 0,
      pDirection,
      fieldAlongP: z(fieldAlongP),
      probeR: Math.hypot(px, py),
      dipoleCharge: s.dipoleCharge,
      dipoleLength: s.dipoleLength,
      theta: s.theta,
      fieldE: E,
      dipoleP,
      torque: z(dipoleP * E * Math.sin(th)),
      maxTorque: dipoleP * E,
      energy: z(-dipoleP * E * Math.cos(th)),
      forceEach: s.dipoleCharge * UC * E,
      dipoleNetForce: z(s.dipoleCharge * UC * E - s.dipoleCharge * UC * E),
      area: s.area,
      tilt: s.tilt,
      flux: z(E * areaM2 * cosTilt),
      projectedArea: z(s.area * cosTilt),
      gaussR: R,
      qEnclosed: z(qEnclosed),
      enclosedCount: inside.length,
      gaussFlux: z(gaussFlux),
      sphereArea,
      avgField: z(gaussFlux / sphereArea),
      source: EF_SOURCE_ORDER.indexOf(source),
      amount: s.amount,
      dist: s.dist,
      appField: efieldGaussField(source, s.amount, s.dist),
      insideShell: source === "shell" && s.dist < EF_SHELL_RADIUS ? 1 : 0,
      particle: EF_PARTICLE_ORDER.indexOf(particle),
      speed: s.speed,
      accel: flight.accel,
      hitsPlate: flight.hits ? 1 : 0,
      hitX: flight.hits ? flight.hitX / CM : 0,
      exitDeflection: exitShift * 1000,
      transit: (flight.end / flight.v) * 1e9,
      exitAngle: flight.hits ? 0 : Math.atan((flight.accel * flight.length) / (flight.v * flight.v)) / DEG,
      progress: s.progress,
      posX: x / CM,
      posY: z(flight.up * flight.shift(x) * 1000),
      time: (x / flight.v) * 1e9,
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof EfieldState] : undefined;
  },

  setVariable(state, id, value) {
    if (!(id in EF_RANGES) || !Number.isFinite(value)) return state;
    const [lo, hi] = EF_RANGES[id as keyof EfieldState];
    const next = { ...state, [id]: clamp(value, lo, hi) };
    // A new launch speed or field starts the charge again at the plates' edge.
    return id === "speed" || id === "fieldE" ? { ...next, progress: 0 } : next;
  },
};
