import type { SimulationModel } from "@ise/science-engine";

/**
 * Forces, pressure and gravity for classes 8 and 9, in five small scenes.
 *
 * Push: two friends push a box along a floor. Forces the same way add,
 * opposite ways subtract. Friction holds a box still until the combined push
 * beats the most it can give (static friction); once sliding, a slightly
 * smaller sliding friction acts, and on wheels a much smaller rolling
 * friction. Friction = μ × weight, with μ set by the surface.
 *
 * Pressure: a force pressing on an area, p = F / A, in pascals (N/m²).
 *
 * Gravity: two masses pull on each other, F = G m₁ m₂ / d².
 *
 * Fall: a coin and a feather dropped together. Without air both fall with the
 * same g. In air the feather soon reaches a small, steady speed (modelled with
 * air drag growing in step with speed); the coin's air drag is so small over a
 * few metres that it is left out.
 *
 * Weight: a mass on a spring balance, W = m g, on the Earth or the Moon.
 */

export type SfSurface = "glass" | "wood" | "sand";

export const SF_SURFACE_ORDER: readonly SfSurface[] = ["glass", "wood", "sand"];

/** Friction coefficients: friction = μ × weight. Rolling < sliding < static on every surface. */
export const SF_SURFACES: Record<SfSurface, { label: string; static: number; sliding: number; rolling: number }> = {
  glass: { label: "Glass", static: 0.2, sliding: 0.15, rolling: 0.01 },
  wood: { label: "Wood", static: 0.5, sliding: 0.4, rolling: 0.02 },
  sand: { label: "Sand", static: 0.8, sliding: 0.6, rolling: 0.1 },
};

/** The universal gravitational constant, N m²/kg². */
export const SF_BIG_G = 6.67e-11;
/** Acceleration due to gravity on the Earth, m/s². */
export const SF_G_EARTH = 9.8;
/** Acceleration due to gravity on the Moon, m/s² — about a sixth of the Earth's. */
export const SF_G_MOON = 1.63;
/** The steady speed a feather settles to in air, m/s. */
export const SF_FEATHER_SPEED = 0.5;

export const SF_MAX_START_SPEED = 3;
export const SF_MIN_DROP = 1;
export const SF_MAX_DROP = 20;
/** Smallest contact area, cm² (a nail's point, about 1 mm²). */
export const SF_MIN_AREA = 0.01;
/** The model stops its clock here, s. */
const MAX_T = 120;

export type SchoolForceParams = {
  /** Friend A's push, to the right, N. */
  forceA: number;
  /** Friend B's push, N. */
  forceB: number;
  /** Whether B pushes the same way as A, or the opposite way. */
  together: "same" | "opposite";
  surface: SfSurface;
  wheels: "none" | "wheels";
  /** The box (or object) mass, kg. */
  mass: number;
  /** Force pressing down, N. */
  pressForce: number;
  /** Area it presses on, cm². */
  area: number;
  /** The two masses that pull on each other, kg. */
  massA: number;
  massB: number;
  /** Centre-to-centre distance between them, m. */
  distance: number;
  air: "air" | "vacuum";
  /** g where we are, m/s²: 9.8 on the Earth, 1.63 on the Moon. */
  gravity: number;
};

export interface SchoolForceState {
  /** The box's speed to the right when it is let go, m/s. */
  readonly startSpeed: number;
  /** Where the box is, m from its start. */
  readonly x: number;
  /** Its velocity, m/s (+ to the right). */
  readonly v: number;
  /** Time since the start, s. */
  readonly t: number;
  /** Height the coin and feather fall from, m. */
  readonly dropHeight: number;
}

export type SchoolForceResults = {
  surface: number;
  wheels: number;
  forceA: number;
  forceB: number;
  /** Combined push, N (+ right, − left). */
  applied: number;
  appliedSize: number;
  /** −1 left, 0 none, 1 right. */
  appliedDir: number;
  /** Most friction can give a box at rest, N. */
  frictionLimit: number;
  /** Friction on a moving box (sliding, or rolling on wheels), N. */
  movingFriction: number;
  /** Friction now, N (+ right, − left). */
  friction: number;
  frictionSize: number;
  /** Net force now, N (+ right, − left). */
  netForce: number;
  netSize: number;
  accel: number;
  velocity: number;
  speed: number;
  position: number;
  moving: number;
  /** What happens next: 0 stays still, 1 speeds up, 2 steady, 3 slows and stops, 4 stops then goes back. */
  fate: number;
  /** How far it slides before stopping, m (0 if it is not slowing down). */
  stopDistance: number;
  mass: number;
  weight: number;
  g: number;
  onMoon: number;
  pressForce: number;
  area: number;
  areaM2: number;
  pressure: number;
  massA: number;
  massB: number;
  distance: number;
  gravForce: number;
  /** How hard the Earth pulls mass A, N. */
  earthPullA: number;
  dropHeight: number;
  hasAir: number;
  coinTime: number;
  featherTime: number;
  /** 1 when the coin and feather land together. */
  together: number;
  impactSpeed: number;
  fallClock: number;
  coinDrop: number;
  featherDrop: number;
  coinLanded: number;
  featherLanded: number;
  t: number;
};

const finite = (x: number, fallback = 0) => (Number.isFinite(x) ? x : fallback);
const clampTo = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, finite(x, lo)));
const sign = (x: number) => (x > 0 ? 1 : x < 0 ? -1 : 0);
const clean = (x: number) => (Math.abs(x) < 1e-12 ? 0 : x) || 0;

/** g from the params, never zero or negative. */
export function sfGravity(params: Pick<SchoolForceParams, "gravity">): number {
  const g = Number(params.gravity);
  return Number.isFinite(g) && g > 0 ? g : SF_G_EARTH;
}

/** The combined push of A and B, N (+ right). */
export function sfApplied(params: Pick<SchoolForceParams, "forceA" | "forceB" | "together">): number {
  const a = Math.max(0, finite(params.forceA));
  const b = Math.max(0, finite(params.forceB));
  return clean(params.together === "opposite" ? a - b : a + b);
}

/** Static limit and moving friction for the box, N. */
export function sfFriction(params: Pick<SchoolForceParams, "surface" | "wheels" | "mass" | "gravity">) {
  const s = SF_SURFACES[params.surface] ?? SF_SURFACES.wood;
  const weight = Math.max(0.1, finite(params.mass, 1)) * sfGravity(params);
  const rolling = params.wheels === "wheels";
  return { limit: (rolling ? s.rolling : s.static) * weight, moving: (rolling ? s.rolling : s.sliding) * weight };
}

/** Friction and net force on the box at velocity v, N. */
function forcesAt(v: number, applied: number, limit: number, moving: number) {
  if (v === 0) {
    if (Math.abs(applied) <= limit) return { friction: -applied, net: 0 };
    const friction = -sign(applied) * moving;
    return { friction, net: applied + friction };
  }
  const friction = -sign(v) * moving;
  return { friction, net: applied + friction };
}

/** What the box does from velocity v: see `fate` in the results. */
export function sfFate(v: number, applied: number, limit: number, moving: number): number {
  if (v === 0) return Math.abs(applied) <= limit ? 0 : 1;
  const along = applied * sign(v) - moving;
  if (along > 1e-9) return 1;
  if (along > -1e-9) return 2;
  return Math.abs(applied) > limit ? 4 : 3;
}

/** Pressure in Pa for a force in N on an area in cm². */
export function sfPressure(force: number, areaCm2: number): number {
  return Math.max(0, finite(force)) / (Math.max(SF_MIN_AREA, finite(areaCm2, 1)) * 1e-4);
}

/** Newton's law of gravitation, N. */
export function sfGravitation(m1: number, m2: number, d: number): number {
  return (SF_BIG_G * Math.max(0, m1) * Math.max(0, m2)) / Math.max(0.1, d) ** 2;
}

/** How far the feather has fallen through air after t s, m (air drag in step with its speed). */
export function sfFeatherDrop(t: number, g: number): number {
  const tau = SF_FEATHER_SPEED / g;
  return SF_FEATHER_SPEED * t - SF_FEATHER_SPEED * tau * (1 - Math.exp(-t / tau));
}

/** Time for the feather to fall h metres through air, s. */
export function sfFeatherTime(h: number, g: number): number {
  let lo = 0;
  let hi = h / SF_FEATHER_SPEED + 1;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (sfFeatherDrop(mid, g) < h) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Time to fall h metres from rest with no air, s: h = ½ g t². */
export function sfFallTime(h: number, g: number): number {
  return Math.sqrt((2 * Math.max(0, h)) / g);
}

const OUTPUTS = [
  "surface", "wheels", "forceA", "forceB", "applied", "appliedSize", "appliedDir", "frictionLimit", "movingFriction",
  "friction", "frictionSize", "netForce", "netSize", "accel", "velocity", "speed", "position", "moving", "fate",
  "stopDistance", "mass", "weight", "g", "onMoon", "pressForce", "area", "areaM2", "pressure", "massA", "massB",
  "distance", "gravForce", "earthPullA", "dropHeight", "hasAir", "coinTime", "featherTime", "together", "impactSpeed",
  "fallClock", "coinDrop", "featherDrop", "coinLanded", "featherLanded", "t",
] as const satisfies readonly (keyof SchoolForceResults)[];

const clampStart = (v: number) => clampTo(v, 0, SF_MAX_START_SPEED);
const clampDrop = (h: number) => clampTo(h, SF_MIN_DROP, SF_MAX_DROP);

export const schoolForceModel: SimulationModel<SchoolForceState, SchoolForceParams, SchoolForceResults> = {
  id: "schoolforce",
  defaultParams: {
    forceA: 0,
    forceB: 0,
    together: "same",
    surface: "wood",
    wheels: "none",
    mass: 5,
    pressForce: 50,
    area: 100,
    massA: 100,
    massB: 100,
    distance: 2,
    air: "air",
    gravity: SF_G_EARTH,
  },
  outputs: OUTPUTS,
  stateVariables: ["startSpeed", "dropHeight", "t"],

  initialize() {
    return { startSpeed: 0, x: 0, v: 0, t: 0, dropHeight: 2 };
  },

  /** Play: the box moves under its forces, and the coin and feather drop (again and again). */
  advance(state, dt, params) {
    if (state.t >= MAX_T || !(dt > 0)) return state;
    const m = Math.max(0.1, finite(params.mass, 1));
    const applied = sfApplied(params);
    const { limit, moving } = sfFriction(params);
    let { x, v } = state;
    const steps = Math.max(1, Math.ceil(dt / 0.005));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const a = forcesAt(v, applied, limit, moving).net / m;
      const next = v + a * h;
      if (v !== 0 && sign(next) !== sign(v)) {
        // Friction brings it to rest here; it does not push it back the other way.
        const stop = -v / a;
        x += (v * stop) / 2;
        v = 0;
      } else {
        x += ((v + next) / 2) * h;
        v = next;
      }
    }
    return { ...state, x: clean(x), v: clean(v), t: Math.min(MAX_T, state.t + dt) };
  },

  step(state, _params, sign) {
    return { ...state, x: 0, v: state.startSpeed, t: 0, dropHeight: clampDrop(Math.round(state.dropHeight) + sign) };
  },

  derive(state, params) {
    const g = sfGravity(params);
    const m = Math.max(0.1, finite(params.mass, 1));
    const applied = sfApplied(params);
    const { limit, moving } = sfFriction(params);
    const v = clean(finite(state.v));
    const { friction, net } = forcesAt(v, applied, limit, moving);
    const fate = sfFate(v, applied, limit, moving);
    const accel = net / m;
    const stopDistance = (fate === 3 || fate === 4) && accel !== 0 ? (v * v) / (2 * Math.abs(accel)) : 0;

    const pressForce = Math.max(0, finite(params.pressForce));
    const area = Math.max(SF_MIN_AREA, finite(params.area, 1));

    const massA = Math.max(0, finite(params.massA));
    const massB = Math.max(0, finite(params.massB));
    const distance = Math.max(0.1, finite(params.distance, 1));

    const h = clampDrop(state.dropHeight);
    const hasAir = params.air === "air" && g > 5 ? 1 : 0;
    const coinTime = sfFallTime(h, g);
    const featherTime = hasAir ? sfFeatherTime(h, g) : coinTime;
    const loop = Math.max(coinTime, featherTime) + 1;
    const t = Math.max(0, finite(state.t));
    const fallClock = t % loop;
    const coinDrop = Math.min(h, 0.5 * g * fallClock * fallClock);
    const featherDrop = hasAir ? Math.min(h, sfFeatherDrop(fallClock, g)) : coinDrop;

    return {
      surface: Math.max(0, SF_SURFACE_ORDER.indexOf(params.surface)),
      wheels: params.wheels === "wheels" ? 1 : 0,
      forceA: Math.max(0, finite(params.forceA)),
      forceB: Math.max(0, finite(params.forceB)),
      applied,
      appliedSize: Math.abs(applied),
      appliedDir: sign(applied),
      frictionLimit: limit,
      movingFriction: moving,
      friction: clean(friction),
      frictionSize: Math.abs(friction),
      netForce: clean(net),
      netSize: Math.abs(net),
      accel: clean(accel),
      velocity: v,
      speed: Math.abs(v),
      position: clean(finite(state.x)),
      moving: v !== 0 ? 1 : 0,
      fate,
      stopDistance,
      mass: m,
      weight: m * g,
      g,
      onMoon: g < 5 ? 1 : 0,
      pressForce,
      area,
      areaM2: area * 1e-4,
      pressure: sfPressure(pressForce, area),
      massA,
      massB,
      distance,
      gravForce: sfGravitation(massA, massB, distance),
      earthPullA: massA * SF_G_EARTH,
      dropHeight: h,
      hasAir,
      coinTime,
      featherTime,
      together: Math.abs(featherTime - coinTime) < 1e-9 ? 1 : 0,
      impactSpeed: g * coinTime,
      fallClock,
      coinDrop,
      featherDrop,
      coinLanded: fallClock >= coinTime ? 1 : 0,
      featherLanded: fallClock >= featherTime ? 1 : 0,
      t,
    };
  },

  getVariable(state, id) {
    if (id === "startSpeed") return state.startSpeed;
    if (id === "dropHeight") return state.dropHeight;
    if (id === "t") return state.t;
    return undefined;
  },

  setVariable(state, id, value) {
    if (id === "startSpeed") {
      const s = clampStart(value);
      return { ...state, startSpeed: s, x: 0, v: s, t: 0 };
    }
    if (id === "dropHeight") return { ...state, dropHeight: clampDrop(value), t: 0 };
    if (id === "t") return { ...state, t: clampTo(value, 0, MAX_T) };
    return state;
  },
};
