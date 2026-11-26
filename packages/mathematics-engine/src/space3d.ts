import type { SimulationModel } from "@ise/science-engine";

/**
 * Vectors and geometry in three dimensions (NCERT class 12, chapters 10 and
 * 11, and JEE).
 *
 * Four free vectors a, b, c and e, each set by its components, a plane
 * Ax + By + Cz = D (normal n = (A, B, C)), and a ratio m : n.
 *
 * Section: A and B are the points with position vectors a and b. The point
 * P dividing AB in m : n is (m b + n a)/(m + n) internally and
 * (m b − n a)/(m − n) externally — undefined externally when m = n.
 *
 * Scalar product: a·b = |a||b| cos θ, and the projection of a on b,
 * a·b/|b|, is the length of a's shadow along b.
 *
 * Vector product: a × b is perpendicular to both (right-hand rule), and its
 * length |a||b| sin θ is the area of the parallelogram on a and b.
 *
 * Triple products: [a b c] = a·(b × c) is the signed volume of the
 * parallelepiped on a, b, c — zero exactly when they are coplanar. The
 * vector triple product a × (b × c) = (a·c) b − (a·b) c.
 *
 * Direction cosines of a: l, m, n = aₓ/|a|, a_y/|a|, a_z/|a|, the cosines
 * of the angles a makes with the axes; l² + m² + n² = 1.
 *
 * Lines: L₁ is r = a + λb, L₂ is r = c + μe. The angle between them is the
 * acute one, cos θ = |b·e|/(|b||e|). If b × e ≠ 0 the shortest distance is
 * |(c − a)·(b × e)|/|b × e| (zero: they meet; otherwise skew). If b × e = 0
 * the lines are parallel and the distance is |(c − a) × b|/|b|.
 *
 * Planes: the distance from A to r·n = D is |n·a − D|/|n|. L₁ meets the
 * plane at angle φ with sin φ = |b·n|/(|b||n|); when b·n = 0 it is
 * parallel to the plane (or lies in it).
 *
 * Degenerate cases (a zero vector, a zero normal, parallel lines, m = n
 * externally) are reported by flag outputs; every output stays finite.
 */

export type Space3dDivision = "internal" | "external";
export type Space3dParams = { division: Space3dDivision };

export interface Space3dState {
  /** Azimuth of the viewpoint, rad: turning the view, not the vectors. */
  readonly yaw: number;
  readonly ax: number;
  readonly ay: number;
  readonly az: number;
  readonly bx: number;
  readonly by: number;
  readonly bz: number;
  readonly cx: number;
  readonly cy: number;
  readonly cz: number;
  readonly ex: number;
  readonly ey: number;
  readonly ez: number;
  /** The plane's normal (A, B, C) and constant D. */
  readonly nx: number;
  readonly ny: number;
  readonly nz: number;
  readonly d: number;
  /** The ratio m : n. */
  readonly m: number;
  readonly n: number;
}

export type Space3dResults = {
  yaw: number;
  /** 0 internal, 1 external. */
  division: number;
  ax: number;
  ay: number;
  az: number;
  bx: number;
  by: number;
  bz: number;
  cx: number;
  cy: number;
  cz: number;
  ex: number;
  ey: number;
  ez: number;
  nx: number;
  ny: number;
  nz: number;
  d: number;
  m: number;
  n: number;
  magA: number;
  magB: number;
  magC: number;
  magE: number;
  /** The point dividing AB in m : n. */
  px: number;
  py: number;
  pz: number;
  /** 0 when there is no such point (external division with m = n). */
  sectionOk: number;
  apLength: number;
  pbLength: number;
  dot: number;
  /** Angle between a and b, rad and degrees; 0 when either is the zero vector. */
  angle: number;
  angleDeg: number;
  /** 1 when both vectors are non-zero, so the angle is defined. */
  dotDefined: number;
  perpendicular: number;
  /** Scalar projection of a on b, a·b/|b|, and the projection vector. */
  projection: number;
  shadowX: number;
  shadowY: number;
  shadowZ: number;
  crossX: number;
  crossY: number;
  crossZ: number;
  /** |a × b|: the area of the parallelogram on a and b. */
  crossMag: number;
  triangleArea: number;
  /** 1 when a and b are non-zero and parallel (a × b = 0). */
  parallel: number;
  /** [a b c] and the volume of the parallelepiped. */
  triple: number;
  volume: number;
  tetraVolume: number;
  coplanar: number;
  /** 1 right-handed (positive), −1 left-handed, 0 coplanar. */
  handed: number;
  /** a × (b × c). */
  vtX: number;
  vtY: number;
  vtZ: number;
  vtMag: number;
  dirL: number;
  dirM: number;
  dirN: number;
  dirSum: number;
  alpha: number;
  beta: number;
  gamma: number;
  alphaDeg: number;
  betaDeg: number;
  gammaDeg: number;
  dirDefined: number;
  /** Acute angle between L₁ and L₂. */
  linesAngle: number;
  linesAngleDeg: number;
  /** 0 they meet, 1 parallel, 2 skew, 3 the same line, 4 a direction is zero. */
  linesRelation: number;
  shortestDistance: number;
  /** Ends of the shortest segment: F₁ on L₁, F₂ on L₂. */
  f1x: number;
  f1y: number;
  f1z: number;
  f2x: number;
  f2y: number;
  f2z: number;
  normalMag: number;
  planeDefined: number;
  /** |D|/|n|: how far the plane is from the origin. */
  originDistance: number;
  /** Distance from A to the plane, and whether A lies on it. */
  planeDistance: number;
  onPlane: number;
  /** Foot of the perpendicular from A to the plane. */
  footX: number;
  footY: number;
  footZ: number;
  /** Angle between L₁ and the plane. */
  linePlaneAngle: number;
  linePlaneDeg: number;
  /** 0 parallel to the plane, 1 meets it at one point, 2 lies in it, 3 undefined. */
  lineMeetsPlane: number;
  hitX: number;
  hitY: number;
  hitZ: number;
};

const OUTPUTS = [
  "yaw", "division", "ax", "ay", "az", "bx", "by", "bz", "cx", "cy", "cz", "ex", "ey", "ez", "nx", "ny", "nz", "d", "m", "n",
  "magA", "magB", "magC", "magE",
  "px", "py", "pz", "sectionOk", "apLength", "pbLength",
  "dot", "angle", "angleDeg", "dotDefined", "perpendicular", "projection", "shadowX", "shadowY", "shadowZ",
  "crossX", "crossY", "crossZ", "crossMag", "triangleArea", "parallel",
  "triple", "volume", "tetraVolume", "coplanar", "handed", "vtX", "vtY", "vtZ", "vtMag",
  "dirL", "dirM", "dirN", "dirSum", "alpha", "beta", "gamma", "alphaDeg", "betaDeg", "gammaDeg", "dirDefined",
  "linesAngle", "linesAngleDeg", "linesRelation", "shortestDistance", "f1x", "f1y", "f1z", "f2x", "f2y", "f2z",
  "normalMag", "planeDefined", "originDistance", "planeDistance", "onPlane", "footX", "footY", "footZ",
  "linePlaneAngle", "linePlaneDeg", "lineMeetsPlane", "hitX", "hitY", "hitZ",
] as const satisfies readonly (keyof Space3dResults)[];

/** Slider limits: components, the plane's constant, and the ratio. */
export const SPACE3D_COMPONENT_MAX = 4;
export const SPACE3D_D_MAX = 12;
export const SPACE3D_RATIO_MAX = 6;
/** How fast Play turns the view, rad/s. */
export const SPACE3D_TURN_RATE = Math.PI / 8;

type V3 = readonly [number, number, number];

const EPS = 1e-9;
/** Lines closer than this meet; a point closer than this to the plane is on it. */
const MEET = 1e-6;
const DEG = 180 / Math.PI;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const dot = (u: V3, v: V3) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const cross = (u: V3, v: V3): V3 => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const sub = (u: V3, v: V3): V3 => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
const add = (u: V3, v: V3): V3 => [u[0] + v[0], u[1] + v[1], u[2] + v[2]];
const times = (k: number, u: V3): V3 => [k * u[0], k * u[1], k * u[2]];
const mag = (u: V3) => Math.hypot(u[0], u[1], u[2]);
/** The angle between two non-zero vectors, accurate near 0 and π. */
const between = (u: V3, v: V3) => Math.atan2(mag(cross(u, v)), dot(u, v));
const wrap = (angle: number) => {
  const turned = ((((angle + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
  return turned;
};

const divisionOf = (params: Space3dParams): Space3dDivision => (params.division === "external" ? "external" : "internal");

const COMPONENT_KEYS = ["ax", "ay", "az", "bx", "by", "bz", "cx", "cy", "cz", "ex", "ey", "ez", "nx", "ny", "nz"] as const;

export const space3dModel: SimulationModel<Space3dState, Space3dParams, Space3dResults> = {
  id: "space3d",
  defaultParams: { division: "internal" },
  outputs: OUTPUTS,
  stateVariables: ["yaw", ...COMPONENT_KEYS, "d", "m", "n"],

  initialize() {
    return {
      yaw: Math.PI / 6,
      ax: 3, ay: 1, az: 2,
      bx: 1, by: 3, bz: 1,
      cx: 1, cy: 0, cz: 3,
      ex: 1, ey: 1, ez: 0,
      nx: 1, ny: 1, nz: 1,
      d: 3,
      m: 2, n: 1,
    };
  },

  /** Play turns the view; the geometry itself does not move. */
  advance(state, dt) {
    return { ...state, yaw: wrap(state.yaw + SPACE3D_TURN_RATE * dt) };
  },

  step(state, _params, sign) {
    const notch = Math.PI / 12;
    return { ...state, yaw: wrap(Math.round(state.yaw / notch) * notch + notch * sign) };
  },

  derive(state, params) {
    const s = clampState(state);
    const external = divisionOf(params) === "external";
    const a: V3 = [s.ax, s.ay, s.az];
    const b: V3 = [s.bx, s.by, s.bz];
    const c: V3 = [s.cx, s.cy, s.cz];
    const e: V3 = [s.ex, s.ey, s.ez];
    const nv: V3 = [s.nx, s.ny, s.nz];
    const magA = mag(a);
    const magB = mag(b);
    const magC = mag(c);
    const magE = mag(e);

    // Section formula.
    const { m, n } = s;
    const sectionOk = !external || Math.abs(m - n) > EPS;
    const p: V3 = !sectionOk ? [0, 0, 0] : external ? times(1 / (m - n), sub(times(m, b), times(n, a))) : times(1 / (m + n), add(times(m, b), times(n, a)));

    // Scalar product and projection.
    const ab = dot(a, b);
    const dotDefined = magA > EPS && magB > EPS;
    const angle = dotDefined ? between(a, b) : 0;
    const projection = magB > EPS ? ab / magB : 0;
    const shadow = magB > EPS ? times(ab / (magB * magB), b) : ([0, 0, 0] as V3);

    // Vector product.
    const axb = cross(a, b);
    const crossMag = mag(axb);
    const parallel = dotDefined && crossMag <= EPS * magA * magB;

    // Triple products.
    const triple = dot(a, cross(b, c));
    const coplanar = Math.abs(triple) <= EPS * Math.max(1, magA * magB * magC);
    const vt = sub(times(dot(a, c), b), times(ab, c));

    // Direction cosines of a.
    const dirDefined = magA > EPS;
    const l = dirDefined ? s.ax / magA : 0;
    const mm = dirDefined ? s.ay / magA : 0;
    const nn = dirDefined ? s.az / magA : 0;
    const acosOf = (k: number) => (dirDefined ? Math.acos(clamp(k, -1, 1)) : 0);

    // Two lines: r = a + λb and r = c + μe.
    const lines = twoLines(a, b, c, e);

    // The plane r·n = D, the point A and the line L₁.
    const plane = planeWith(a, b, nv, s.d);

    const results: Space3dResults = {
      yaw: s.yaw,
      division: external ? 1 : 0,
      ax: s.ax, ay: s.ay, az: s.az,
      bx: s.bx, by: s.by, bz: s.bz,
      cx: s.cx, cy: s.cy, cz: s.cz,
      ex: s.ex, ey: s.ey, ez: s.ez,
      nx: s.nx, ny: s.ny, nz: s.nz,
      d: s.d,
      m,
      n,
      magA,
      magB,
      magC,
      magE,
      px: p[0],
      py: p[1],
      pz: p[2],
      sectionOk: sectionOk ? 1 : 0,
      apLength: sectionOk ? mag(sub(p, a)) : 0,
      pbLength: sectionOk ? mag(sub(b, p)) : 0,
      dot: ab,
      angle,
      angleDeg: angle * DEG,
      dotDefined: dotDefined ? 1 : 0,
      perpendicular: dotDefined && Math.abs(ab) <= EPS * magA * magB ? 1 : 0,
      projection,
      shadowX: shadow[0],
      shadowY: shadow[1],
      shadowZ: shadow[2],
      crossX: axb[0],
      crossY: axb[1],
      crossZ: axb[2],
      crossMag,
      triangleArea: crossMag / 2,
      parallel: parallel ? 1 : 0,
      triple,
      volume: Math.abs(triple),
      tetraVolume: Math.abs(triple) / 6,
      coplanar: coplanar ? 1 : 0,
      handed: coplanar ? 0 : Math.sign(triple),
      vtX: vt[0],
      vtY: vt[1],
      vtZ: vt[2],
      vtMag: mag(vt),
      dirL: l,
      dirM: mm,
      dirN: nn,
      dirSum: l * l + mm * mm + nn * nn,
      alpha: acosOf(l),
      beta: acosOf(mm),
      gamma: acosOf(nn),
      alphaDeg: acosOf(l) * DEG,
      betaDeg: acosOf(mm) * DEG,
      gammaDeg: acosOf(nn) * DEG,
      dirDefined: dirDefined ? 1 : 0,
      ...lines,
      ...plane,
    };
    return tidy(results);
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof Space3dState] : undefined;
  },

  setVariable(state, id, value) {
    if (!Number.isFinite(value)) return state;
    if ((COMPONENT_KEYS as readonly string[]).includes(id)) return { ...state, [id]: clamp(value, -SPACE3D_COMPONENT_MAX, SPACE3D_COMPONENT_MAX) };
    switch (id) {
      case "yaw": return { ...state, yaw: clamp(value, -Math.PI, Math.PI) };
      case "d": return { ...state, d: clamp(value, -SPACE3D_D_MAX, SPACE3D_D_MAX) };
      case "m": return { ...state, m: clamp(value, 1, SPACE3D_RATIO_MAX) };
      case "n": return { ...state, n: clamp(value, 1, SPACE3D_RATIO_MAX) };
      default: return state;
    }
  },
};

function clampState(s: Space3dState): Space3dState {
  const k = (v: number) => clamp(Number.isFinite(v) ? v : 0, -SPACE3D_COMPONENT_MAX, SPACE3D_COMPONENT_MAX);
  return {
    yaw: Number.isFinite(s.yaw) ? clamp(s.yaw, -Math.PI, Math.PI) : 0,
    ax: k(s.ax), ay: k(s.ay), az: k(s.az),
    bx: k(s.bx), by: k(s.by), bz: k(s.bz),
    cx: k(s.cx), cy: k(s.cy), cz: k(s.cz),
    ex: k(s.ex), ey: k(s.ey), ez: k(s.ez),
    nx: k(s.nx), ny: k(s.ny), nz: k(s.nz),
    d: clamp(Number.isFinite(s.d) ? s.d : 0, -SPACE3D_D_MAX, SPACE3D_D_MAX),
    m: clamp(Number.isFinite(s.m) ? s.m : 1, 1, SPACE3D_RATIO_MAX),
    n: clamp(Number.isFinite(s.n) ? s.n : 1, 1, SPACE3D_RATIO_MAX),
  };
}

/** L₁: r = a + λb and L₂: r = c + μe — their angle, how they sit, and the shortest segment between them. */
function twoLines(a: V3, b: V3, c: V3, e: V3) {
  const magB = mag(b);
  const magE = mag(e);
  const none = { linesAngle: 0, linesAngleDeg: 0, linesRelation: 4, shortestDistance: 0, f1x: a[0], f1y: a[1], f1z: a[2], f2x: c[0], f2y: c[1], f2z: c[2] };
  if (magB <= EPS || magE <= EPS) return none;
  const be = cross(b, e);
  const beMag = mag(be);
  const r = sub(c, a);
  // The acute angle: a line has no arrow, so b and −b give the same line.
  const linesAngle = Math.atan2(beMag, Math.abs(dot(b, e)));
  const base = { linesAngle, linesAngleDeg: linesAngle * DEG };
  if (beMag <= EPS * magB * magE) {
    // Parallel: the distance from A to L₂, along the perpendicular from A.
    const foot = add(c, times(dot(sub(a, c), e) / (magE * magE), e));
    const distance = mag(cross(r, b)) / magB;
    return { ...base, linesRelation: distance <= MEET ? 3 : 1, shortestDistance: distance, f1x: a[0], f1y: a[1], f1z: a[2], f2x: foot[0], f2y: foot[1], f2z: foot[2] };
  }
  const distance = Math.abs(dot(r, be)) / beMag;
  // Feet of the common perpendicular: (F₂ − F₁)·b = 0 and (F₂ − F₁)·e = 0.
  const bb = dot(b, b);
  const ee = dot(e, e);
  const bdot = dot(b, e);
  const rb = dot(r, b);
  const re = dot(r, e);
  const det = beMag * beMag;
  const lambda = (rb * ee - bdot * re) / det;
  const mu = (rb * bdot - bb * re) / det;
  const f1 = add(a, times(lambda, b));
  const f2 = add(c, times(mu, e));
  return { ...base, linesRelation: distance <= MEET ? 0 : 2, shortestDistance: distance, f1x: f1[0], f1y: f1[1], f1z: f1[2], f2x: f2[0], f2y: f2[1], f2z: f2[2] };
}

/** The plane r·n = D, with the point A and the line L₁: r = a + λb. */
function planeWith(a: V3, b: V3, nv: V3, d: number) {
  const normalMag = mag(nv);
  if (normalMag <= EPS) {
    return {
      normalMag: 0, planeDefined: 0, originDistance: 0, planeDistance: 0, onPlane: 0, footX: a[0], footY: a[1], footZ: a[2],
      linePlaneAngle: 0, linePlaneDeg: 0, lineMeetsPlane: 3, hitX: a[0], hitY: a[1], hitZ: a[2],
    };
  }
  const value = dot(nv, a) - d;
  const planeDistance = Math.abs(value) / normalMag;
  const onPlane = planeDistance <= MEET;
  const foot = sub(a, times(value / (normalMag * normalMag), nv));
  const magB = mag(b);
  const plane = {
    normalMag,
    planeDefined: 1,
    originDistance: Math.abs(d) / normalMag,
    planeDistance,
    onPlane: onPlane ? 1 : 0,
    footX: foot[0],
    footY: foot[1],
    footZ: foot[2],
  };
  if (magB <= EPS) return { ...plane, linePlaneAngle: 0, linePlaneDeg: 0, lineMeetsPlane: 3, hitX: a[0], hitY: a[1], hitZ: a[2] };
  const along = dot(nv, b);
  // φ is the complement of the angle between the line and the normal.
  const linePlaneAngle = Math.atan2(Math.abs(along), mag(cross(nv, b)));
  const angle = { linePlaneAngle, linePlaneDeg: linePlaneAngle * DEG };
  if (Math.abs(along) <= EPS * normalMag * magB) return { ...plane, ...angle, lineMeetsPlane: onPlane ? 2 : 0, hitX: a[0], hitY: a[1], hitZ: a[2] };
  const hit = add(a, times(-value / along, b));
  return { ...plane, ...angle, lineMeetsPlane: 1, hitX: hit[0], hitY: hit[1], hitZ: hit[2] };
}

/** No −0, and nothing that is not a finite number. */
function tidy(results: Space3dResults): Space3dResults {
  const out = { ...results };
  for (const key of OUTPUTS) {
    const v = out[key];
    out[key] = Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? 0 : v) : 0;
  }
  return out;
}
