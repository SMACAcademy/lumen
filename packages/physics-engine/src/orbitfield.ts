import type { SimulationModel } from "@ise/science-engine";

/**
 * The Earth's gravitational field, and what it means to live in it.
 *
 * Distance: g = GM/r² outside the Earth and g = g₀(r/R) inside it (a
 * uniform Earth). Close to the surface these give g₀(1 − 2h/R) for a small
 * height h and g₀(1 − d/R) for a depth d. Spin takes ω²R cos²λ off g at
 * latitude λ — about 0.034 m/s² at the equator, nothing at the poles.
 *
 * Field: the force on each kilogram. Between the Earth and the Moon the two
 * pulls point opposite ways and cancel at one null point.
 *
 * Weightlessness: a weighing machine reads m(g − a), where a is how fast the
 * floor accelerates downwards. In a lift whose cable has snapped, or in an
 * orbiting station, a = g: the floor falls as fast as you do, and reads zero
 * — although gravity at a 400 km orbit is still nine-tenths of g₀.
 *
 * Orbit energy: in a circular orbit KE = GMm/2r, PE = −GMm/r, so the total is
 * E = −GMm/2r and it takes GMm/2r (the binding energy) to escape. Moving to a
 * higher orbit costs (GMm/2)(1/r₁ − 1/r₂).
 *
 * Constants. G = 6.67 × 10⁻¹¹ and M_E = 6.0 × 10²⁴ kg give GM = 4.00 × 10¹⁴
 * and GM/R² ≈ 9.77 m/s² with R = 6400 km. The lab instead takes g₀ = 9.8
 * m/s² and GM = g₀R² = 4.01 × 10¹⁴ m³/s², as NCERT's worked examples do, so
 * every number agrees with the 9.8 used in class. The Moon is 1/81.5 of the
 * Earth's mass (7.36 × 10²² kg) at 3.84 × 10⁵ km.
 */

export const OF_G = 6.67e-11;
export const OF_EARTH_MASS = 6.0e24;
/** Earth's radius, km. */
export const OF_RADIUS_KM = 6400;
const R = OF_RADIUS_KM * 1000;
/** Surface gravity used throughout, m/s². */
export const OF_G0 = 9.8;
/** GM = g₀R², m³/s². */
export const OF_GM = OF_G0 * R * R;
/** What G·M_E gives with the constants above, and the surface g that implies (≈ 9.77 m/s²). */
export const OF_GM_FROM_G = OF_G * OF_EARTH_MASS;
export const OF_G0_FROM_G = OF_GM_FROM_G / (R * R);
/** Earth's spin, one turn a day, rad/s (7.27 × 10⁻⁵). */
export const OF_OMEGA = (2 * Math.PI) / 86400;
export const OF_MOON_MASS = 7.36e22;
/** Earth–Moon distance, centre to centre, km. */
export const OF_MOON_DISTANCE_KM = 384000;
/** Within this of the null point counts as having found it, km. */
export const OF_NULL_CLOSE_KM = 2000;
/** Seconds of play per drawn lap of the orbit. */
export const OF_LAP = 8;

export const OF_LIMITS = {
  probeR: [0, 4 * OF_RADIUS_KM],
  latitude: [0, 90],
  fieldX: [7000, 380000],
  partnerMass: [0.5, 82],
  liftAccel: [-9.8, 4.9],
  bodyMass: [20, 120],
  orbitHeight: [200, 40000],
  targetHeight: [200, 40000],
  satMass: [100, 2000],
} as const satisfies Record<string, readonly [number, number]>;

export type OrbitFieldFrame = "ground" | "lift" | "station";
export const OF_FRAME_ORDER: readonly OrbitFieldFrame[] = ["ground", "lift", "station"];

export type OrbitFieldParams = {
  /** Distance of the probe from the Earth's centre, km. */
  probeR: number;
  /** Latitude on the surface, degrees. */
  latitude: number;
  /** Position on the Earth–Moon line, km from the Earth's centre. */
  fieldX: number;
  /** Mass of the second body, in Moon masses. */
  partnerMass: number;
  /** Where the weighing machine is. */
  frame: OrbitFieldFrame;
  /** The lift's acceleration, m/s², upwards positive. */
  liftAccel: number;
  /** Mass of the person on the weighing machine, kg. */
  bodyMass: number;
  /** Height of the circular orbit (and of the station) above the surface, km. */
  orbitHeight: number;
  /** Height of the orbit to move to, km. */
  targetHeight: number;
  /** Mass of the satellite, kg. */
  satMass: number;
};

export interface OrbitFieldState {
  /** Time, s — only moves the pictures. */
  readonly t: number;
}

export type OrbitFieldResults = {
  probeR: number;
  rOverR: number;
  inside: number;
  height: number;
  depth: number;
  g: number;
  gRatio: number;
  gApprox: number;
  approxError: number;
  latitude: number;
  latitudeDrop: number;
  gLatitude: number;
  fieldX: number;
  partnerMass: number;
  earthPull: number;
  partnerPull: number;
  netField: number;
  fieldStrength: number;
  nullPoint: number;
  atNull: number;
  towards: number;
  frame: number;
  liftAccel: number;
  bodyMass: number;
  localG: number;
  frameAccel: number;
  trueWeight: number;
  reading: number;
  readingKg: number;
  apparentFraction: number;
  floating: number;
  orbitHeight: number;
  orbitRadius: number;
  orbitRadiusRatio: number;
  orbitalSpeed: number;
  period: number;
  satMass: number;
  kinetic: number;
  potential: number;
  total: number;
  binding: number;
  targetHeight: number;
  targetTotal: number;
  transferEnergy: number;
  transferShare: number;
  launchEnergy: number;
  phase: number;
};

const OUTPUTS = [
  "probeR", "rOverR", "inside", "height", "depth", "g", "gRatio", "gApprox", "approxError", "latitude", "latitudeDrop", "gLatitude",
  "fieldX", "partnerMass", "earthPull", "partnerPull", "netField", "fieldStrength", "nullPoint", "atNull", "towards",
  "frame", "liftAccel", "bodyMass", "localG", "frameAccel", "trueWeight", "reading", "readingKg", "apparentFraction", "floating",
  "orbitHeight", "orbitRadius", "orbitRadiusRatio", "orbitalSpeed", "period", "satMass", "kinetic", "potential", "total", "binding",
  "targetHeight", "targetTotal", "transferEnergy", "transferShare", "launchEnergy", "phase",
] as const satisfies readonly (keyof OrbitFieldResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
const within = (v: number, key: keyof typeof OF_LIMITS) => clamp(v, OF_LIMITS[key][0], OF_LIMITS[key][1]);
/** Finite, and never −0. */
const z = (v: number) => (Number.isFinite(v) ? v || 0 : 0);

/** g at a distance r (km) from the centre of a uniform Earth, m/s². */
export function gAtRadius(rKm: number): number {
  const r = Math.max(0, rKm);
  return r < OF_RADIUS_KM ? (OF_G0 * r) / OF_RADIUS_KM : OF_G0 * (OF_RADIUS_KM / r) ** 2;
}

/** The small-height and depth formulas: g₀(1 − 2h/R) above, g₀(1 − d/R) below. */
export function gNearSurface(rKm: number): number {
  const r = Math.max(0, rKm);
  return r < OF_RADIUS_KM ? OF_G0 * (1 - (OF_RADIUS_KM - r) / OF_RADIUS_KM) : OF_G0 * (1 - (2 * (r - OF_RADIUS_KM)) / OF_RADIUS_KM);
}

/** How much the Earth's spin takes off g at latitude λ (degrees), m/s². */
export function spinReduction(latitudeDeg: number): number {
  const c = Math.cos((latitudeDeg * Math.PI) / 180);
  return OF_OMEGA * OF_OMEGA * R * c * c;
}

/** Where the Earth's pull and a partner's (in Moon masses) cancel, km from the Earth's centre. */
export function nullPointKm(partnerMoons: number): number {
  return OF_MOON_DISTANCE_KM / (1 + Math.sqrt((partnerMoons * OF_MOON_MASS) / OF_EARTH_MASS));
}

/** Energy of a satellite of mass m (kg) in a circular orbit of radius r (m): KE, PE and total, J. */
export function orbitEnergies(m: number, r: number) {
  const potential = (-OF_GM * m) / r;
  return { kinetic: -potential / 2, potential, total: potential / 2 };
}

const frameOf = (params: OrbitFieldParams) => (OF_FRAME_ORDER.includes(params.frame) ? params.frame : "ground");

export const orbitFieldModel: SimulationModel<OrbitFieldState, OrbitFieldParams, OrbitFieldResults> = {
  id: "orbitfield",
  defaultParams: {
    probeR: 9600,
    latitude: 0,
    fieldX: 200000,
    partnerMass: 1,
    frame: "station",
    liftAccel: 0,
    bodyMass: 60,
    orbitHeight: 400,
    targetHeight: 6400,
    satMass: 400,
  },
  outputs: OUTPUTS,
  stateVariables: ["t"],

  initialize() {
    return { t: 0 };
  },

  /** Play only turns the pictures: the satellite goes round, once every OF_LAP seconds. */
  advance(state, dt) {
    const t = state.t + dt;
    return { t: t >= 1000 * OF_LAP ? 0 : t };
  },

  step(state, _params, sign) {
    return { t: Math.max(0, Math.round(state.t) + sign) };
  },

  derive(state, params) {
    // Distance from the centre.
    const probeR = within(params.probeR, "probeR");
    const g = gAtRadius(probeR);
    const inside = probeR < OF_RADIUS_KM;
    const gApprox = gNearSurface(probeR);

    // Latitude, on the surface.
    const latitude = within(params.latitude, "latitude");
    const latitudeDrop = spinReduction(latitude);

    // The Earth–Moon line.
    const fieldX = within(params.fieldX, "fieldX");
    const partnerMass = within(params.partnerMass, "partnerMass");
    const gmPartner = (OF_GM * partnerMass * OF_MOON_MASS) / OF_EARTH_MASS;
    const earthPull = OF_GM / (fieldX * 1000) ** 2;
    const partnerPull = gmPartner / ((OF_MOON_DISTANCE_KM - fieldX) * 1000) ** 2;
    const netField = earthPull - partnerPull;
    const nullPoint = nullPointKm(partnerMass);
    const atNull = Math.abs(fieldX - nullPoint) <= OF_NULL_CLOSE_KM;

    // The weighing machine.
    const frame = frameOf(params);
    const liftAccel = within(params.liftAccel, "liftAccel");
    const bodyMass = within(params.bodyMass, "bodyMass");
    const orbitHeight = within(params.orbitHeight, "orbitHeight");
    const r1 = (OF_RADIUS_KM + orbitHeight) * 1000;
    const localG = frame === "station" ? OF_GM / (r1 * r1) : OF_G0;
    const frameAccel = frame === "station" ? localG : frame === "lift" ? -liftAccel : 0;
    const reading = frame === "station" ? 0 : Math.max(0, bodyMass * (localG - frameAccel));

    // The orbit and its energy.
    const satMass = within(params.satMass, "satMass");
    const targetHeight = within(params.targetHeight, "targetHeight");
    const r2 = (OF_RADIUS_KM + targetHeight) * 1000;
    const here = orbitEnergies(satMass, r1);
    const there = orbitEnergies(satMass, r2);
    const speed = Math.sqrt(OF_GM / r1);
    const binding = -here.total;
    const transferEnergy = there.total - here.total;

    const t = Math.max(0, state.t);
    return {
      probeR,
      rOverR: probeR / OF_RADIUS_KM,
      inside: inside ? 1 : 0,
      height: Math.max(0, probeR - OF_RADIUS_KM),
      depth: Math.max(0, OF_RADIUS_KM - probeR),
      g: z(g),
      gRatio: z(g / OF_G0),
      gApprox: z(gApprox),
      approxError: inside || g <= 0 ? 0 : z(((gApprox - g) / g) * 100),
      latitude,
      latitudeDrop: z(latitudeDrop),
      gLatitude: z(OF_G0 - latitudeDrop),
      fieldX,
      partnerMass,
      earthPull: z(earthPull),
      partnerPull: z(partnerPull),
      netField: z(netField),
      fieldStrength: z(Math.abs(netField)),
      nullPoint: z(nullPoint),
      atNull: atNull ? 1 : 0,
      towards: atNull ? 0 : netField > 0 ? 1 : -1,
      frame: OF_FRAME_ORDER.indexOf(frame),
      liftAccel: z(liftAccel),
      bodyMass,
      localG: z(localG),
      frameAccel: z(frameAccel),
      trueWeight: z(bodyMass * localG),
      reading: z(reading),
      readingKg: z(reading / OF_G0),
      apparentFraction: z(reading / (bodyMass * OF_G0)),
      floating: reading < 0.005 ? 1 : 0,
      orbitHeight,
      orbitRadius: r1 / 1000,
      orbitRadiusRatio: r1 / R,
      orbitalSpeed: z(speed / 1000),
      period: z((2 * Math.PI * r1) / speed / 60),
      satMass,
      kinetic: z(here.kinetic),
      potential: z(here.potential),
      total: z(here.total),
      binding: z(binding),
      targetHeight,
      targetTotal: z(there.total),
      transferEnergy: z(transferEnergy),
      transferShare: z(transferEnergy / binding),
      launchEnergy: z(here.total + (OF_GM * satMass) / R),
      phase: z((t / OF_LAP) % 1),
    };
  },

  getVariable(state, id) {
    return id === "t" ? state.t : undefined;
  },

  setVariable(state, id, value) {
    if (id === "t") return { t: clamp(value, 0, 1000 * OF_LAP) };
    return state;
  },
};
