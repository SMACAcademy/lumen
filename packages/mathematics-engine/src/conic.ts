import type { SimulationModel } from "@ise/science-engine";

/**
 * Conic sections: the parabola, the ellipse and the hyperbola.
 *
 * Slice: a double cone of semi-vertical angle α = 30°, cut by a plane at an
 * angle β to the axis (the plane does not pass through the vertex). β = 90°
 * gives a circle, α < β < 90° an ellipse, β = α a parabola and β < α a
 * hyperbola. The section's eccentricity is e = cos β / cos α.
 *
 * Locus: a fixed focus F (the origin) and a fixed directrix x = −2. The point
 * P moves so that PF = e·PM, where PM is its distance from the directrix. In
 * polar form about F, r = 2e / (1 − e cos φ). e < 1 closes into an ellipse,
 * e = 1 is a parabola, e > 1 a hyperbola.
 *
 * Standard forms, with a point P carried round the curve by a parameter:
 *   parabola  y² = 4ax  (and y² = −4ax, x² = 4ay, x² = −4ay):
 *             P = (at², 2at), focus (a, 0), directrix x = −a, latus rectum 4a.
 *   ellipse   x²/a² + y²/b² = 1:  P = (a cos θ, b sin θ). With a > b the
 *             foci are (±c, 0), c² = a² − b², e = c/a, PF₁ + PF₂ = 2a.
 *             With b > a the major axis is along y: foci (0, ±c),
 *             c² = b² − a², e = c/b, PF₁ + PF₂ = 2b. a = b is a circle.
 *   hyperbola x²/a² − y²/b² = 1:  P = (a sec θ, b tan θ), foci (±c, 0),
 *             c² = a² + b², e = c/a, |PF₁ − PF₂| = 2a, asymptotes y = ±(b/a)x.
 *
 * Tangents at P = (x₁, y₁): yy₁ = 2a(x + x₁), xx₁/a² + yy₁/b² = 1 and
 * xx₁/a² − yy₁/b² = 1; the normal is at right angles. The tangent makes equal
 * angles with the two focal lines — for the parabola, with PF and the line
 * through P parallel to the axis — which is the reflective property.
 */

export type ConicKind = "parabola" | "ellipse" | "hyperbola";
export const CONIC_KIND_ORDER: readonly ConicKind[] = ["parabola", "ellipse", "hyperbola"];

/** Which way the parabola opens: y² = 4ax, y² = −4ax, x² = 4ay, x² = −4ay. */
export type ConicOpening = "right" | "left" | "up" | "down";
export const CONIC_OPENING_ORDER: readonly ConicOpening[] = ["right", "left", "up", "down"];
export const CONIC_OPENING_EQUATIONS: Record<ConicOpening, string> = {
  right: "y² = 4ax",
  left: "y² = −4ax",
  up: "x² = 4ay",
  down: "x² = −4ay",
};

/** The cone's semi-vertical angle α, in degrees. */
export const CONE_HALF_ANGLE = 30;
/** Distance from the locus view's focus to its directrix x = −2. */
export const LOCUS_FOCUS_DIRECTRIX = 2;
/** The locus point is kept within this distance of the focus. */
export const LOCUS_MAX_RADIUS = 6;
/** On the hyperbola, θ is kept this many degrees or more from ±90° (|sec θ| ≤ 3.24). */
export const HYPERBOLA_THETA_LIMIT = 72;

/** Sections and locus shapes: 0 a circle, 1 an ellipse, 2 a parabola, 3 a hyperbola. */
export const CONIC_SHAPE_LABELS = ["circle", "ellipse", "parabola", "hyperbola"] as const;

export type ConicParams = { kind: ConicKind; opens: ConicOpening };

export interface ConicState {
  /** The cutting plane's angle with the cone's axis, β, in degrees. */
  readonly tilt: number;
  /** The locus's eccentricity, and the point's angle at the focus (degrees). */
  readonly e: number;
  readonly phi: number;
  /** The standard form's a and b. */
  readonly a: number;
  readonly b: number;
  /** The parabola's parameter t, and the ellipse's or hyperbola's θ (degrees). */
  readonly t: number;
  readonly theta: number;
}

export type ConicResults = {
  tilt: number;
  sliceKind: number;
  sliceE: number;
  locusE: number;
  locusKind: number;
  phi: number;
  lx: number;
  ly: number;
  lpf: number;
  lpm: number;
  lratio: number;
  kind: number;
  opens: number;
  a: number;
  b: number;
  c: number;
  ecc: number;
  latusRectum: number;
  /** 1 for an ellipse with b > a, whose major axis is along y. */
  majorVertical: number;
  /** t for the parabola, θ in degrees otherwise — after any snapping. */
  param: number;
  px: number;
  py: number;
  focusCount: number;
  f1x: number;
  f1y: number;
  f2x: number;
  f2y: number;
  /** The directrix belonging to F₁: x = directrix when directrixVertical is 1, else y = directrix. */
  hasDirectrix: number;
  directrix: number;
  directrixVertical: number;
  pf1: number;
  pf2: number;
  pm: number;
  /** PF₁/PM — the eccentricity again, wherever P is. */
  ratio: number;
  /** PF₁ + PF₂ and |PF₁ − PF₂| (0 for the parabola, which has one focus). */
  sumDist: number;
  diffDist: number;
  asymptoteSlope: number;
  tangentSlope: number;
  tangentVertical: number;
  normalSlope: number;
  normalVertical: number;
  /** The acute angles (degrees) the tangent makes with the two focal lines (for the parabola, the axis-parallel ray and PF). */
  angle1: number;
  angle2: number;
};

const OUTPUTS = [
  "tilt", "sliceKind", "sliceE",
  "locusE", "locusKind", "phi", "lx", "ly", "lpf", "lpm", "lratio",
  "kind", "opens", "a", "b", "c", "ecc", "latusRectum", "majorVertical", "param", "px", "py",
  "focusCount", "f1x", "f1y", "f2x", "f2y", "hasDirectrix", "directrix", "directrixVertical",
  "pf1", "pf2", "pm", "ratio", "sumDist", "diffDist", "asymptoteSlope",
  "tangentSlope", "tangentVertical", "normalSlope", "normalVertical", "angle1", "angle2",
] as const satisfies readonly (keyof ConicResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const DEG = Math.PI / 180;
/** Never hand out −0. */
const z = (v: number) => v || 0;
/** Wrap degrees into [−180, 180]. */
const wrap = (deg: number) => {
  const w = ((((deg + 180) % 360) + 360) % 360) - 180;
  return w === -180 && deg > 0 ? 180 : w;
};

const kindOf = (params: ConicParams) => (CONIC_KIND_ORDER.includes(params.kind) ? params.kind : "parabola");
const opensOf = (params: ConicParams) => (CONIC_OPENING_ORDER.includes(params.opens) ? params.opens : "right");

/** The parabola's own frame (u along the axis, v across) turned into x and y. */
export function conicOrient(opens: ConicOpening, u: number, v: number): [number, number] {
  switch (opens) {
    case "left": return [z(-u), z(v)];
    case "up": return [z(v), z(u)];
    case "down": return [z(v), z(-u)];
    default: return [z(u), z(v)];
  }
}

/** The cone's section for a plane at β degrees to the axis: its shape index and eccentricity. */
export function coneSection(tilt: number): { shape: number; e: number } {
  if (tilt >= 89.5) return { shape: 0, e: 0 };
  if (Math.abs(tilt - CONE_HALF_ANGLE) < 0.5) return { shape: 2, e: 1 };
  return { shape: tilt > CONE_HALF_ANGLE ? 1 : 3, e: Math.cos(tilt * DEG) / Math.cos(CONE_HALF_ANGLE * DEG) };
}

/** Shape index for an eccentricity: 0 a circle, 1 an ellipse, 2 a parabola, 3 a hyperbola. */
export function conicShapeOf(e: number): number {
  if (e < 1e-9) return 0;
  if (Math.abs(e - 1) < 1e-9) return 2;
  return e < 1 ? 1 : 3;
}

/**
 * The signed polar radius about the focus, r = ep/(1 − e cos φ). Negative
 * values put the point on the hyperbola's far branch, behind the directrix;
 * Infinity where the curve runs off to infinity.
 */
export function conicPolarRadius(e: number, phiDeg: number, p = LOCUS_FOCUS_DIRECTRIX): number {
  const d = 1 - e * Math.cos(phiDeg * DEG);
  return Math.abs(d) < 1e-12 ? Number.POSITIVE_INFINITY : (e * p) / d;
}

/** The point on a standard-form conic at parameter s (t for the parabola, θ in degrees otherwise). */
export function conicPoint(kind: ConicKind, opens: ConicOpening, a: number, b: number, s: number): [number, number] {
  if (kind === "parabola") return conicOrient(opens, a * s * s, 2 * a * s);
  const th = s * DEG;
  if (kind === "ellipse") return [z(a * Math.cos(th)), z(b * Math.sin(th))];
  return [z(a / Math.cos(th)), z(b * Math.tan(th))];
}

/** Keep θ on the hyperbola away from ±90°, where sec θ runs off to infinity. */
export function hyperbolaTheta(theta: number): number {
  const th = wrap(theta);
  const off = Math.abs(Math.abs(th) - 90);
  const band = 90 - HYPERBOLA_THETA_LIMIT;
  if (off >= band) return th;
  const sign = th < 0 ? -1 : 1;
  return sign * (Math.abs(th) <= 90 ? HYPERBOLA_THETA_LIMIT : 180 - HYPERBOLA_THETA_LIMIT);
}

/** Acute angle in degrees between two lines with directions d and w. */
function lineAngle(dx: number, dy: number, wx: number, wy: number): number {
  const n = Math.hypot(dx, dy) * Math.hypot(wx, wy);
  if (n < 1e-12) return 90;
  return Math.acos(clamp(Math.abs(dx * wx + dy * wy) / n, 0, 1)) / DEG;
}

const STEEP = 1e-9;

export const conicModel: SimulationModel<ConicState, ConicParams, ConicResults> = {
  id: "conic",
  defaultParams: { kind: "parabola", opens: "right" },
  outputs: OUTPUTS,
  stateVariables: ["tilt", "e", "phi", "a", "b", "t", "theta"],

  initialize() {
    return { tilt: 50, e: 0.5, phi: 90, a: 2, b: 1.5, t: 1, theta: 60 };
  },

  /** Play carries the points round their curves. */
  advance(state, dt) {
    const t = state.t + 0.6 * dt;
    return { ...state, t: t > 3 ? t - 6 : t, theta: wrap(state.theta + 36 * dt), phi: wrap(state.phi + 36 * dt) };
  },

  step(state, _params, sign) {
    return {
      ...state,
      t: clamp(Math.round(state.t * 2) / 2 + 0.5 * sign, -3, 3),
      theta: clamp(Math.round(state.theta / 15) * 15 + 15 * sign, -180, 180),
      phi: clamp(Math.round(state.phi / 15) * 15 + 15 * sign, -180, 180),
    };
  },

  derive(state, params) {
    // ── Slice ──
    const tilt = clamp(state.tilt, 0, 90);
    const section = coneSection(tilt);

    // ── Locus ──
    const p = LOCUS_FOCUS_DIRECTRIX;
    let e = clamp(state.e, 0.2, 2);
    if (Math.abs(e - 1) < 0.005) e = 1;
    let phi = wrap(clamp(state.phi, -180, 180));
    // Keep P near enough: 1 − e cos φ ≥ ep/R.
    const cosMax = (1 - (e * p) / LOCUS_MAX_RADIUS) / e;
    if (cosMax < 1) {
      const least = Math.acos(clamp(cosMax, -1, 1)) / DEG;
      if (Math.abs(phi) < least) phi = (phi < 0 ? -1 : 1) * least;
    }
    const r = conicPolarRadius(e, phi, p);
    const lx = r * Math.cos(phi * DEG);
    const ly = r * Math.sin(phi * DEG);
    const lpm = lx + p;

    // ── Standard forms ──
    const kind = kindOf(params);
    const opens = opensOf(params);
    const a = clamp(state.a, 0.5, 5);
    const b = clamp(state.b, 0.5, 5);
    let c = 0;
    let ecc = 0;
    let latusRectum = 0;
    let majorVertical = 0;
    let param = 0;
    let focusCount = 2;
    let f1: [number, number] = [0, 0];
    let f2: [number, number] = [0, 0];
    let hasDirectrix = 1;
    let directrix = 0;
    let directrixVertical = 1;
    let asymptoteSlope = 0;
    let P: [number, number];
    let tangent: [number, number];
    let ray: [number, number] | null = null;

    if (kind === "parabola") {
      param = clamp(state.t, -3, 3);
      P = conicPoint(kind, opens, a, b, param);
      ecc = 1;
      c = a;
      latusRectum = 4 * a;
      focusCount = 1;
      f1 = conicOrient(opens, a, 0);
      f2 = f1;
      directrixVertical = opens === "right" || opens === "left" ? 1 : 0;
      directrix = opens === "right" || opens === "up" ? -a : a;
      tangent = conicOrient(opens, param, 1);
      ray = conicOrient(opens, 1, 0);
    } else if (kind === "ellipse") {
      param = clamp(state.theta, -180, 180);
      P = conicPoint(kind, opens, a, b, param);
      const th = param * DEG;
      majorVertical = b > a ? 1 : 0;
      const major = Math.max(a, b);
      const minor = Math.min(a, b);
      c = Math.sqrt(Math.max(0, major * major - minor * minor));
      ecc = c / major;
      latusRectum = (2 * minor * minor) / major;
      f1 = majorVertical ? [0, c] : [c, 0];
      f2 = majorVertical ? [0, z(-c)] : [z(-c), 0];
      hasDirectrix = c > 1e-9 ? 1 : 0;
      directrix = hasDirectrix ? (major * major) / c : 0;
      directrixVertical = majorVertical ? 0 : 1;
      tangent = [-a * Math.sin(th), b * Math.cos(th)];
    } else {
      param = hyperbolaTheta(clamp(state.theta, -180, 180));
      P = conicPoint(kind, opens, a, b, param);
      const th = param * DEG;
      c = Math.hypot(a, b);
      ecc = c / a;
      latusRectum = (2 * b * b) / a;
      f1 = [c, 0];
      f2 = [-c, 0];
      directrix = (a * a) / c;
      asymptoteSlope = b / a;
      tangent = [a * Math.sin(th), b];
    }

    const [px, py] = P;
    const pf1 = Math.hypot(px - f1[0], py - f1[1]);
    const pf2 = focusCount === 2 ? Math.hypot(px - f2[0], py - f2[1]) : 0;
    const pm = hasDirectrix ? Math.abs(directrixVertical ? px - directrix : py - directrix) : 0;

    const [tx, ty] = tangent;
    const tangentVertical = Math.abs(tx) < STEEP * Math.max(1, Math.abs(ty)) ? 1 : 0;
    const tangentSlope = tangentVertical ? 0 : ty / tx;
    const normalVertical = !tangentVertical && Math.abs(tangentSlope) < STEEP ? 1 : 0;
    const normalSlope = tangentVertical || normalVertical ? 0 : -1 / tangentSlope;
    const angle1 = ray ? lineAngle(tx, ty, ray[0], ray[1]) : lineAngle(tx, ty, f1[0] - px, f1[1] - py);
    const angle2 = ray ? lineAngle(tx, ty, f1[0] - px, f1[1] - py) : lineAngle(tx, ty, f2[0] - px, f2[1] - py);

    return {
      tilt,
      sliceKind: section.shape,
      sliceE: z(section.e),
      locusE: e,
      locusKind: conicShapeOf(e),
      phi: z(phi),
      lx: z(lx),
      ly: z(ly),
      lpf: r,
      lpm,
      lratio: r / lpm,
      kind: CONIC_KIND_ORDER.indexOf(kind),
      opens: CONIC_OPENING_ORDER.indexOf(opens),
      a,
      b,
      c,
      ecc,
      latusRectum,
      majorVertical,
      param: z(param),
      px: z(px),
      py: z(py),
      focusCount,
      f1x: z(f1[0]),
      f1y: z(f1[1]),
      f2x: z(f2[0]),
      f2y: z(f2[1]),
      hasDirectrix,
      directrix: z(directrix),
      directrixVertical,
      pf1,
      pf2,
      pm,
      ratio: pm > 1e-12 ? pf1 / pm : 0,
      sumDist: focusCount === 2 ? pf1 + pf2 : 0,
      diffDist: focusCount === 2 ? Math.abs(pf1 - pf2) : 0,
      asymptoteSlope,
      tangentSlope: normalVertical ? 0 : z(tangentSlope),
      tangentVertical,
      normalSlope: z(normalSlope),
      normalVertical,
      angle1,
      angle2,
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof ConicState] : undefined;
  },

  setVariable(state, id, value) {
    switch (id) {
      case "tilt": return { ...state, tilt: clamp(value, 0, 90) };
      case "e": return { ...state, e: clamp(value, 0.2, 2) };
      case "phi": return { ...state, phi: clamp(value, -180, 180) };
      case "a": return { ...state, a: clamp(value, 0.5, 5) };
      case "b": return { ...state, b: clamp(value, 0.5, 5) };
      case "t": return { ...state, t: clamp(value, -3, 3) };
      case "theta": return { ...state, theta: clamp(value, -180, 180) };
      default: return state;
    }
  },
};
