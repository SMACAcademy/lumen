import type { SimulationModel } from "@ise/science-engine";

/**
 * Reflections and images for class 8 (NCERT "Light"): four benches, one rule.
 *
 * Every bit of a mirror obeys the laws of reflection — the angle of
 * reflection equals the angle of incidence, and the incident ray, the normal
 * and the reflected ray lie in one plane (the page).
 *
 * Surface: seven parallel rays land on a surface. Smooth, every bit faces the
 * same way, so the reflected rays stay parallel (regular reflection). Rough,
 * each small bit is tilted by its own amount t, so each ray leaves at i + 2t
 * from the surface's overall normal and the rays scatter (diffuse
 * reflection) — though each still obeys i = r at its own bit.
 *
 * Mirrors at an angle θ: images are found by tracing reflections. An image
 * in one mirror acts as an object for the other, until an image lands
 * behind both mirrors (in the wedge opposite them), where neither can
 * reflect it again. With the object halfway between the mirrors this gives
 * 360°/θ − 1 images whenever 360/θ is a whole number (90° → 3, 60° → 5,
 * 45° → 7). For other angles the lab simply counts what the tracing gives,
 * which depends on where the object stands. An image made by an odd number
 * of reflections is laterally inverted; one made by an even number is not.
 *
 * Kaleidoscope: three mirror strips at 60° to each other. Each corner is a
 * pair of mirrors at 60°, so it shows 5 images round the real triangle, and
 * the pattern repeats all over.
 *
 * Periscope: two parallel mirrors, each tilted from the horizontal by α.
 * The top one turns the light through 2α; the bottom one turns it back, so
 * the light always leaves parallel to how it came in. At α = 45° the light
 * goes straight down the tube and you see over a wall as high as the tube.
 * Tilt them and the light runs into the side of the tube.
 *
 * Simplifications, said plainly: mirrors are perfectly flat and reflect all
 * the light; rays are drawn in one plane; the rough surface is a row of
 * seven small flat bits with fixed tilts; the periscope tube is 10 cm wide.
 */

export type MirrorScene = "surface" | "angle" | "kaleidoscope" | "periscope";
export const MIRROR_SCENE_ORDER: readonly MirrorScene[] = ["surface", "angle", "kaleidoscope", "periscope"];

/** How far each of the seven bits of surface is tilted, as a share of the largest tilt. */
export const MIRROR_SURFACE_BUMPS: readonly number[] = [-0.7, 0.9, -0.3, 0.6, -1, 0.2, 0.8];
/** The ray whose angles are measured (the middle one). */
export const MIRROR_WATCHED_RAY = 3;
/** Largest tilt of a bit of surface at 100 % roughness, degrees. */
export const MIRROR_MAX_TILT = 18;
export const MIRROR_MAX_INCIDENCE = 50;
/** Mirror angles that divide 360° exactly — the ones the step buttons visit. */
export const MIRROR_CLEAN_ANGLES: readonly number[] = [30, 36, 40, 45, 60, 72, 90, 120, 180];
export const MIRROR_MIN_ANGLE = 30;
export const MIRROR_MAX_ANGLE = 180;
/** The periscope's tube is this wide, cm. */
export const PERISCOPE_WIDTH = 10;
export const PERISCOPE_MIN_HEIGHT = 20;
export const PERISCOPE_MAX_HEIGHT = 100;
export const PERISCOPE_MIN_TILT = 30;
export const PERISCOPE_MAX_TILT = 60;
/** Kaleidoscope turns per second, in radians of the tumble. */
const TURN_RATE = 0.8;

const DEG = Math.PI / 180;
/** Two angles closer than this (degrees) are the same place. */
const SAME = 1e-6;

export type MirrorAngleParams = {
  scene: MirrorScene;
};

export interface MirrorAngleState {
  /** Angle of the incoming rays from the surface's normal, degrees. */
  readonly incidence: number;
  /** How rough the surface is, %. */
  readonly roughness: number;
  /** Angle between the two mirrors, degrees. */
  readonly mirrorAngle: number;
  /** Periscope tube height (top mirror to bottom mirror), cm. */
  readonly tubeHeight: number;
  /** Tilt of each periscope mirror from the horizontal, degrees. */
  readonly tilt: number;
  /** How far the kaleidoscope has been turned (moves the beads), radians. */
  readonly turn: number;
}

export type MirrorAngleResults = {
  scene: number;
  // Surface
  incidence: number;
  roughness: number;
  /** The watched ray's angle out, from the surface's overall normal, degrees. */
  reflection: number;
  /** Widest angle between two reflected rays, degrees. */
  spread: number;
  /** 0 regular (the rays stay parallel), 1 diffuse. */
  diffuse: number;
  /** Tilt of the bit of surface the watched ray lands on, degrees. */
  facetTilt: number;
  /** The watched ray's angle of incidence at its own bit, degrees. */
  facetIn: number;
  /** The watched ray's angle of reflection at its own bit, degrees. */
  facetOut: number;
  // Mirrors at an angle
  mirrorAngle: number;
  /** 360 / θ. */
  fits: number;
  /** 1 when 360 / θ is a whole number. */
  wholeFit: number;
  images: number;
  /** Images made by an odd number of reflections: left and right swapped. */
  reversedImages: number;
  uprightImages: number;
  // Kaleidoscope
  kaleidoImages: number;
  turn: number;
  // Periscope
  tubeHeight: number;
  tilt: number;
  /** How far the top mirror turns the light, degrees. */
  turnAngle: number;
  /** Angle of incidence at the top mirror, degrees. */
  topIncidence: number;
  /** Where the light lands, sideways from the middle of the bottom mirror, cm. */
  landing: number;
  /** Where the light lands, up from the middle of the bottom mirror (the mirror slopes), cm. */
  landY: number;
  /** 1 when the light reaches the bottom mirror and your eye. */
  sees: number;
  /** How far the periscope lifts your line of sight, cm. */
  lift: number;
  /** Angle between the light coming out and the light going in, degrees. */
  exitAngle: number;
  periscopeMirrors: number;
  /** 1 if the periscope's picture is left–right reversed. */
  periscopeReversed: number;
};

export interface MirrorImage {
  /** Where the image is, measured round from the first mirror (0°) towards the second (θ), degrees in [0, 360). */
  angle: number;
  /** How many reflections made it. */
  reflections: number;
  /** The mirrors it bounced off, in order: 1 is the mirror at 0°, 2 the mirror at θ. */
  sequence: readonly (1 | 2)[];
}

const wrap = (a: number) => {
  const w = ((a % 360) + 360) % 360;
  return w > 360 - SAME ? 0 : w;
};

/** Behind both mirrors: the wedge between their extensions, from 180° to 180° + θ (edges included — an image in a mirror's plane cannot be reflected by it). */
function behindBoth(angle: number, theta: number): boolean {
  const a = wrap(angle);
  return a >= 180 - SAME && a <= 180 + theta + SAME;
}

/**
 * The images of an object between two mirrors that meet at angle θ, found
 * by tracing reflections. The object is at `phi` degrees from the first
 * mirror (halfway, θ/2, by default). Each chain starts in one mirror and
 * bounces to the other until an image lands behind both; images two chains
 * share are counted once.
 */
export function traceMirrorImages(theta: number, phi = theta / 2): MirrorImage[] {
  const t = Math.min(MIRROR_MAX_ANGLE, Math.max(1, theta));
  const found: MirrorImage[] = [];
  for (const first of [1, 2] as const) {
    let angle = phi;
    let mirror: 1 | 2 = first;
    const sequence: (1 | 2)[] = [];
    for (let k = 0; k < 400; k++) {
      angle = mirror === 1 ? -angle : 2 * t - angle;
      sequence.push(mirror);
      const image = { angle: wrap(angle), reflections: sequence.length, sequence: [...sequence] };
      const twin = found.find((f) => Math.abs(wrap(f.angle - image.angle + 180) - 180) < SAME);
      if (!twin) found.push(image);
      if (behindBoth(angle, t)) break;
      mirror = mirror === 1 ? 2 : 1;
    }
  }
  return found.sort((a, b) => a.angle - b.angle);
}

/** Tilt of each bit of surface for a roughness in %, degrees. */
export function mirrorFacetTilts(roughness: number): number[] {
  const r = Math.min(100, Math.max(0, roughness)) / 100;
  return MIRROR_SURFACE_BUMPS.map((b) => b * r * MIRROR_MAX_TILT || 0);
}

/**
 * A ray coming down at `incidence` degrees from the vertical (from the
 * upper left) bounces off a bit of surface tilted by `tilt` degrees.
 * Returns the angle it leaves at, from the vertical (positive to the right),
 * and the angles of incidence and reflection measured from that bit's own normal.
 */
export function reflectOffFacet(incidence: number, tilt: number): { out: number; facetIn: number; facetOut: number } {
  const d = { x: Math.sin(incidence * DEG), y: -Math.cos(incidence * DEG) };
  const n = { x: Math.sin(tilt * DEG), y: Math.cos(tilt * DEG) };
  const dot = d.x * n.x + d.y * n.y;
  const r = { x: d.x - 2 * dot * n.x, y: d.y - 2 * dot * n.y };
  const between = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.acos(Math.min(1, Math.max(-1, a.x * b.x + a.y * b.y))) / DEG;
  return {
    out: Math.atan2(r.x, r.y) / DEG || 0,
    facetIn: between({ x: -d.x, y: -d.y }, n),
    facetOut: between(r, n),
  };
}

/**
 * The periscope's middle ray: in level from the left at the top mirror,
 * down the tube, and out at the bottom. Mirrors tilted `tilt` degrees from
 * the horizontal, `height` cm apart.
 */
export function periscopePath(height: number, tilt: number) {
  const a = tilt * DEG;
  // The top mirror turns the level ray through 2α, down the tube.
  const down = -2 * a;
  // Down the tube the ray lands on the bottom mirror's line this far sideways from its middle.
  const raw = (height * Math.cos(2 * a)) / Math.tan(a);
  const landing = Math.abs(raw) < 1e-9 ? 0 : raw;
  const sees = Math.abs(landing) <= PERISCOPE_WIDTH / 2 + 1e-9 ? 1 : 0;
  // It lands this far above the bottom mirror's middle (negative is below), as the mirror slopes.
  const landY = Math.abs(height * Math.cos(2 * a)) < 1e-9 ? 0 : -height * Math.cos(2 * a);
  // The bottom mirror is parallel to the top one, so it turns the ray back level.
  const exit = 2 * -a - down;
  return {
    turnAngle: (2 * a) / DEG,
    topIncidence: 90 - tilt,
    landing,
    landY,
    sees,
    lift: sees ? height - landY : 0,
    exitAngle: Math.abs(exit / DEG) < 1e-9 ? 0 : exit / DEG,
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const clampState = (s: MirrorAngleState): MirrorAngleState => ({
  incidence: clamp(s.incidence, 0, MIRROR_MAX_INCIDENCE),
  roughness: clamp(s.roughness, 0, 100),
  mirrorAngle: clamp(s.mirrorAngle, MIRROR_MIN_ANGLE, MIRROR_MAX_ANGLE),
  tubeHeight: clamp(s.tubeHeight, PERISCOPE_MIN_HEIGHT, PERISCOPE_MAX_HEIGHT),
  tilt: clamp(s.tilt, PERISCOPE_MIN_TILT, PERISCOPE_MAX_TILT),
  turn: Number.isFinite(s.turn) ? s.turn : 0,
});

const OUTPUTS = [
  "scene", "incidence", "roughness", "reflection", "spread", "diffuse", "facetTilt", "facetIn", "facetOut",
  "mirrorAngle", "fits", "wholeFit", "images", "reversedImages", "uprightImages", "kaleidoImages", "turn",
  "tubeHeight", "tilt", "turnAngle", "topIncidence", "landing", "landY", "sees", "lift", "exitAngle", "periscopeMirrors", "periscopeReversed",
] as const satisfies readonly (keyof MirrorAngleResults)[];

const STATE_KEYS = ["incidence", "roughness", "mirrorAngle", "tubeHeight", "tilt", "turn"] as const;
type StateKey = (typeof STATE_KEYS)[number];
const isStateKey = (id: string): id is StateKey => (STATE_KEYS as readonly string[]).includes(id);

export const mirrorAngleModel: SimulationModel<MirrorAngleState, MirrorAngleParams, MirrorAngleResults> = {
  id: "mirrorangle",
  defaultParams: { scene: "surface" },
  outputs: OUTPUTS,
  stateVariables: STATE_KEYS,

  initialize() {
    return { incidence: 30, roughness: 0, mirrorAngle: 90, tubeHeight: 50, tilt: 45, turn: 0 };
  },

  /** Play turns the kaleidoscope, so its beads tumble. */
  advance(state, dt) {
    return { ...state, turn: (state.turn + TURN_RATE * dt) % (2 * Math.PI) };
  },

  step(state, params, sign) {
    const s = clampState(state);
    switch (params.scene) {
      case "angle": {
        // Visit the angles that divide 360° exactly.
        const list = MIRROR_CLEAN_ANGLES;
        const next = sign > 0 ? list.find((a) => a > s.mirrorAngle + SAME) : [...list].reverse().find((a) => a < s.mirrorAngle - SAME);
        return { ...s, mirrorAngle: next ?? s.mirrorAngle };
      }
      case "periscope":
        return clampState({ ...s, tilt: Math.round(s.tilt) + sign });
      case "kaleidoscope":
        return { ...s, turn: s.turn + 0.3 * sign };
      default:
        return clampState({ ...s, roughness: Math.round(s.roughness / 10) * 10 + 10 * sign });
    }
  },

  derive(state, params) {
    const s = clampState(state);

    const tilts = mirrorFacetTilts(s.roughness);
    const rays = tilts.map((t) => reflectOffFacet(s.incidence, t));
    const outs = rays.map((r) => r.out);
    const spread = Math.max(...outs) - Math.min(...outs);
    const watched = rays[MIRROR_WATCHED_RAY]!;

    const fits = 360 / s.mirrorAngle;
    const images = traceMirrorImages(s.mirrorAngle);
    const reversed = images.filter((im) => im.reflections % 2 === 1).length;

    const periscope = periscopePath(s.tubeHeight, s.tilt);
    const periscopeMirrors = 2;

    return {
      scene: Math.max(0, MIRROR_SCENE_ORDER.indexOf(params.scene)),
      incidence: s.incidence,
      roughness: s.roughness,
      reflection: watched.out,
      spread: spread < 1e-9 ? 0 : spread,
      diffuse: spread >= 2 ? 1 : 0,
      facetTilt: tilts[MIRROR_WATCHED_RAY]!,
      facetIn: watched.facetIn,
      facetOut: watched.facetOut,
      mirrorAngle: s.mirrorAngle,
      fits,
      wholeFit: Math.abs(fits - Math.round(fits)) < 1e-9 ? 1 : 0,
      images: images.length,
      reversedImages: reversed,
      uprightImages: images.length - reversed,
      kaleidoImages: traceMirrorImages(60).length,
      turn: s.turn,
      tubeHeight: s.tubeHeight,
      tilt: s.tilt,
      ...periscope,
      periscopeMirrors,
      periscopeReversed: periscopeMirrors % 2,
    };
  },

  getVariable(state, id) {
    return isStateKey(id) ? state[id] : undefined;
  },

  setVariable(state, id, value) {
    if (!isStateKey(id) || !Number.isFinite(value)) return state;
    return clampState({ ...state, [id]: value });
  },
};
