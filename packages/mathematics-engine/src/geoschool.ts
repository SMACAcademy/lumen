import type { SimulationModel } from "@ise/science-engine";

/**
 * School geometry, classes 6 to 9: angles, triangles, quadrilaterals and
 * circles. Seven small scenes share one state; the renderer shows one at a
 * time.
 *
 * Turn: one arm stays put and the other turns through `turn` degrees. The
 * size of the turn names the angle — acute, right, obtuse, straight, reflex,
 * complete.
 *
 * Pairs: two straight lines cross at `cross` degrees. Neighbours on a line
 * (a linear pair) add to 180°; the angles across the crossing (vertically
 * opposite) are equal.
 *
 * Parallel: a transversal cuts line 1 at P at `cut` degrees, and line 2 at Q.
 * Line 2 is turned `tilt` degrees about Q; at tilt 0 the lines are parallel.
 * Numbering the angles as in NCERT — ∠1 to ∠4 at P going round from the
 * upper right, ∠5 to ∠8 at Q — ∠1 and ∠5 are corresponding, ∠4 and ∠6
 * alternate interior, and ∠4 and ∠5 co-interior:
 *   ∠1 = cut, ∠5 = cut − tilt, ∠4 = 180 − cut, ∠6 = 180 − cut + tilt,
 *   ∠4 + ∠5 = 180 − tilt.
 * So the pairs are equal (and the co-interior pair adds to 180°) exactly when
 * the lines are parallel.
 *
 * Triangle: base A → B of length 6, with angles A and B at its ends. The
 * apex C is where the two rays meet, and the angle there is measured from
 * the drawing, not assumed. The exterior angle is made at B by carrying the
 * base on beyond B.
 *
 * Build: given parts, how many triangles can be made? SSS, SAS, ASA and RHS
 * always give one (or none, if the parts cannot close). SSA can give two,
 * and AAA gives the same shape in any size. With SSS the three sticks also
 * show the triangle inequality.
 *
 * Quad: A at the origin, AB along the ground, AD at `quadAngle`, and the top
 * DC parallel to AB but `quadShift` longer. At shift 0 it is a
 * parallelogram.
 *
 * Circle: a chord AB at the bottom of a unit circle makes `arc` degrees at
 * the centre. P and Q are points on the circle at polar angles `pointP` and
 * `pointQ` (degrees anticlockwise from the right). The angle each makes at
 * the circle is measured from the drawing.
 */

export type GeoSchoolRule = "sss" | "sas" | "asa" | "rhs" | "ssa" | "aaa";
export const GEOSCHOOL_RULE_ORDER: readonly GeoSchoolRule[] = ["sss", "sas", "asa", "rhs", "ssa", "aaa"];
/** Whether the rule always pins down one triangle. */
export const GEOSCHOOL_RULE_FIXES: Record<GeoSchoolRule, boolean> = { sss: true, sas: true, asa: true, rhs: true, ssa: false, aaa: false };

export type GeoSchoolParams = { rule: GeoSchoolRule };

export interface GeoSchoolState {
  readonly turn: number;
  readonly cross: number;
  readonly cut: number;
  readonly tilt: number;
  readonly angleA: number;
  readonly angleB: number;
  readonly sideP: number;
  readonly sideQ: number;
  readonly sideR: number;
  readonly quadBase: number;
  readonly quadSide: number;
  readonly quadAngle: number;
  readonly quadShift: number;
  readonly arc: number;
  readonly pointP: number;
  readonly pointQ: number;
}

/** Each state value's allowed range: angles in degrees, lengths in cm. */
export const GEOSCHOOL_RANGES: Record<keyof GeoSchoolState, readonly [number, number]> = {
  turn: [0, 360],
  cross: [10, 170],
  cut: [40, 140],
  tilt: [-30, 30],
  angleA: [10, 150],
  angleB: [10, 150],
  sideP: [1, 12],
  sideQ: [1, 12],
  sideR: [1, 12],
  quadBase: [3, 8],
  quadSide: [2, 6],
  quadAngle: [40, 140],
  quadShift: [-2, 2],
  arc: [20, 180],
  pointP: [0, 359],
  pointQ: [0, 359],
};

/** The base of the angle-sum triangle, cm. */
export const GEOSCHOOL_BASE = 6;
/** The smallest angle C the triangle keeps, degrees. */
export const GEOSCHOOL_MIN_C = 10;

/** Angle kinds: 0 zero, 1 acute, 2 right, 3 obtuse, 4 straight, 5 reflex, 6 complete. */
export const GEOSCHOOL_KIND_NAMES = ["a zero angle", "an acute angle", "a right angle", "an obtuse angle", "a straight angle", "a reflex angle", "a complete turn"] as const;

/** Triangle counts: 0 none, 1 exactly one, 2 two, 3 endless (any size). */
export const GEOSCHOOL_COUNT_NAMES = ["no triangle", "exactly one triangle", "two different triangles", "endless triangles, any size"] as const;

export type GeoSchoolResults = {
  // Turn
  turn: number;
  turnKind: number;
  turnRest: number;
  // Pairs
  cross: number;
  supplement: number;
  opposite: number;
  complement: number;
  hasComplement: number;
  // Parallel
  cut: number;
  tilt: number;
  corrTop: number;
  corrBottom: number;
  altTop: number;
  altBottom: number;
  coInteriorSum: number;
  isParallel: number;
  // Triangle
  triA: number;
  triB: number;
  triC: number;
  triSum: number;
  exterior: number;
  oppositeSum: number;
  triKind: number;
  apexX: number;
  apexY: number;
  // Build
  rule: number;
  ruleFixes: number;
  triangles: number;
  sideP: number;
  sideQ: number;
  sideR: number;
  longest: number;
  otherTwo: number;
  closes: number;
  flat: number;
  buildA: number;
  buildB: number;
  /** The built triangle: X at the origin, Y at (buildYX, 0), Z at (buildZX, buildZY). */
  buildYX: number;
  buildZX: number;
  buildZY: number;
  /** SSA's second place for Y, or 0. */
  buildY2X: number;
  builtXY: number;
  builtYZ: number;
  builtXZ: number;
  // Quad
  quadBase: number;
  quadSide: number;
  quadAngle: number;
  quadShift: number;
  qA: number;
  qB: number;
  qC: number;
  qD: number;
  qSum: number;
  sideBC: number;
  sideCD: number;
  ao: number;
  oc: number;
  bo: number;
  od: number;
  bisect: number;
  oppositeEqual: number;
  isParallelogram: number;
  // Circle
  arc: number;
  pointP: number;
  pointQ: number;
  angleP: number;
  angleQ: number;
  /** 1 on the major arc (the centre's side), 2 on the minor arc, 0 on A or B. */
  pSide: number;
  qSide: number;
  centreForP: number;
  twiceP: number;
  sameSegment: number;
  oppositeArcs: number;
  cyclicSum: number;
  semicircle: number;
};

const OUTPUTS = [
  "turn", "turnKind", "turnRest",
  "cross", "supplement", "opposite", "complement", "hasComplement",
  "cut", "tilt", "corrTop", "corrBottom", "altTop", "altBottom", "coInteriorSum", "isParallel",
  "triA", "triB", "triC", "triSum", "exterior", "oppositeSum", "triKind", "apexX", "apexY",
  "rule", "ruleFixes", "triangles", "sideP", "sideQ", "sideR", "longest", "otherTwo", "closes", "flat",
  "buildA", "buildB", "buildYX", "buildZX", "buildZY", "buildY2X", "builtXY", "builtYZ", "builtXZ",
  "quadBase", "quadSide", "quadAngle", "quadShift", "qA", "qB", "qC", "qD", "qSum", "sideBC", "sideCD", "ao", "oc", "bo", "od",
  "bisect", "oppositeEqual", "isParallelogram",
  "arc", "pointP", "pointQ", "angleP", "angleQ", "pSide", "qSide", "centreForP", "twiceP", "sameSegment", "oppositeArcs", "cyclicSum", "semicircle",
] as const satisfies readonly (keyof GeoSchoolResults)[];

const EPS = 1e-9;
const RAD = Math.PI / 180;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Rounds away floating-point dust (and −0), so 179.99999999999997 reads as 180. */
const r9 = (x: number) => Math.round(x * 1e9) / 1e9 || 0;
const inRange = (key: keyof GeoSchoolState, v: number) => clamp(Number.isFinite(v) ? v : GEOSCHOOL_RANGES[key][0], GEOSCHOOL_RANGES[key][0], GEOSCHOOL_RANGES[key][1]);

type V = readonly [number, number];
/** The angle between two vectors, degrees, 0 to 180. */
function between(u: V, v: V): number {
  return (Math.atan2(Math.abs(u[0] * v[1] - u[1] * v[0]), u[0] * v[0] + u[1] * v[1]) * 180) / Math.PI;
}
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
const len = (a: V) => Math.hypot(a[0], a[1]);

/** The kind of an angle of `deg` degrees (see GEOSCHOOL_KIND_NAMES). */
export function geoSchoolAngleKind(deg: number): number {
  if (deg <= EPS) return 0;
  if (deg < 90 - EPS) return 1;
  if (deg <= 90 + EPS) return 2;
  if (deg < 180 - EPS) return 3;
  if (deg <= 180 + EPS) return 4;
  if (deg < 360 - EPS) return 5;
  return 6;
}

/** Angles A and B as the triangle keeps them: each 10° to 150°, and A + B at most 170°. */
export function geoSchoolTriangleAngles(angleA: number, angleB: number): [number, number] {
  const A = inRange("angleA", angleA);
  const B = clamp(inRange("angleB", angleB), GEOSCHOOL_RANGES.angleB[0], Math.min(GEOSCHOOL_RANGES.angleB[1], 180 - GEOSCHOOL_MIN_C - A));
  return [A, B];
}

/** Where rays from (0, 0) at A° and from (base, 0) at (180 − B)° meet. */
export function geoSchoolApex(base: number, A: number, B: number): [number, number] {
  const s = (base * Math.sin(B * RAD)) / Math.sin((A + B) * RAD);
  return [s * Math.cos(A * RAD), s * Math.sin(A * RAD)];
}

export interface GeoSchoolBuild {
  count: number;
  yx: number;
  zx: number;
  zy: number;
  y2x: number;
}

/** The triangle a rule's parts make: X at the origin, Y on the ground, Z above. */
export function geoSchoolBuild(rule: GeoSchoolRule, p: number, q: number, r: number, A: number, B: number): GeoSchoolBuild {
  const none: GeoSchoolBuild = { count: 0, yx: p, zx: 0, zy: 0, y2x: 0 };
  switch (rule) {
    case "sss": {
      const [s1, s2, s3] = [p, q, r].sort((a, b) => a - b) as [number, number, number];
      if (s3 >= s1 + s2 - EPS) return { ...none, yx: s3 };
      const zx = (s3 * s3 + s2 * s2 - s1 * s1) / (2 * s3);
      return { count: 1, yx: s3, zx, zy: Math.sqrt(Math.max(0, s2 * s2 - zx * zx)), y2x: 0 };
    }
    case "sas":
      return { count: 1, yx: p, zx: q * Math.cos(A * RAD), zy: q * Math.sin(A * RAD), y2x: 0 };
    case "asa":
    case "aaa": {
      const [zx, zy] = geoSchoolApex(p, A, B);
      return { count: rule === "aaa" ? 3 : 1, yx: p, zx, zy, y2x: 0 };
    }
    case "rhs":
      // The right angle is at Y; XY = p and the hypotenuse XZ = q.
      if (q <= p + EPS) return none;
      return { count: 1, yx: p, zx: p, zy: Math.sqrt(q * q - p * p), y2x: 0 };
    case "ssa": {
      // XZ = p at angle A to the ground; YZ = q swings down from Z to meet it.
      const zx = p * Math.cos(A * RAD);
      const zy = p * Math.sin(A * RAD);
      const disc = q * q - zy * zy;
      if (disc < -EPS) return { ...none, zx, zy, yx: 0 };
      const root = Math.sqrt(Math.max(0, disc));
      const places = (root <= EPS ? [zx] : [zx + root, zx - root]).filter((x) => x > EPS);
      if (places.length === 0) return { ...none, zx, zy, yx: 0 };
      return { count: places.length, yx: places[0]!, zx, zy, y2x: places[1] ?? 0 };
    }
  }
}

/** Polar angle (degrees) normalised to −180…180 about the bottom of the circle. */
const fromBottom = (phi: number) => {
  const d = (((phi + 90) % 360) + 360) % 360;
  return d > 180 ? d - 360 : d;
};

/** Which arc a point at polar angle `phi` sits on: 1 major, 2 minor, 0 on A or B. */
export function geoSchoolArcSide(arc: number, phi: number): number {
  const d = Math.abs(fromBottom(phi));
  if (Math.abs(d - arc / 2) < 1e-6) return 0;
  return d < arc / 2 ? 2 : 1;
}

/** The angle a chord making `arc` degrees at the centre makes at the point at polar angle `phi`; 0 at A or B. */
export function geoSchoolInscribed(arc: number, phi: number): number {
  if (geoSchoolArcSide(arc, phi) === 0) return 0;
  const at = (deg: number): V => [Math.cos(deg * RAD), Math.sin(deg * RAD)];
  const A = at(-90 - arc / 2);
  const B = at(-90 + arc / 2);
  const P = at(phi);
  return between(sub(A, P), sub(B, P));
}

export const geoSchoolModel: SimulationModel<GeoSchoolState, GeoSchoolParams, GeoSchoolResults> = {
  id: "geoschool",
  defaultParams: { rule: "sss" },
  outputs: OUTPUTS,
  stateVariables: ["turn", "cross", "cut", "tilt", "angleA", "angleB", "sideP", "sideQ", "sideR", "quadBase", "quadSide", "quadAngle", "quadShift", "arc", "pointP", "pointQ"],

  initialize() {
    return {
      turn: 60,
      cross: 50,
      cut: 60,
      tilt: 0,
      angleA: 50,
      angleB: 60,
      sideP: 3,
      sideQ: 4,
      sideR: 5,
      quadBase: 6,
      quadSide: 4,
      quadAngle: 60,
      quadShift: 0,
      arc: 100,
      pointP: 90,
      pointQ: 270,
    };
  },

  /** Play turns the arm, and walks P round the circle, at 30° a second. */
  advance(state, dt) {
    const turn = state.turn + 30 * dt;
    return { ...state, turn: turn > 360 ? turn - 360 : turn, pointP: (state.pointP + 30 * dt) % 360 };
  },

  step(state, _params, sign) {
    const snap = (v: number) => Math.round(v / 15) * 15 + 15 * sign;
    const p = snap(state.pointP);
    return { ...state, turn: clamp(snap(state.turn), 0, 360), pointP: ((p % 360) + 360) % 360 };
  },

  derive(state, params) {
    // Turn
    const turn = inRange("turn", state.turn);

    // Pairs
    const cross = inRange("cross", state.cross);

    // Parallel
    const cut = inRange("cut", state.cut);
    const tilt = inRange("tilt", state.tilt);
    const corrBottom = cut - tilt;

    // Triangle
    const [A, B] = geoSchoolTriangleAngles(state.angleA, state.angleB);
    const [apexX, apexY] = geoSchoolApex(GEOSCHOOL_BASE, A, B);
    const apex: V = [apexX, apexY];
    const C = r9(between(sub([0, 0], apex), sub([GEOSCHOOL_BASE, 0], apex)));
    const largest = Math.max(A, B, C);

    // Build
    const rule = GEOSCHOOL_RULE_ORDER.includes(params.rule) ? params.rule : "sss";
    const p = inRange("sideP", state.sideP);
    const q = inRange("sideQ", state.sideQ);
    const r = inRange("sideR", state.sideR);
    const sorted = [p, q, r].sort((a, b) => a - b) as [number, number, number];
    const built = geoSchoolBuild(rule, p, q, r, A, B);
    const made = built.count > 0;
    const Z: V = [built.zx, built.zy];

    // Quad
    const a = inRange("quadBase", state.quadBase);
    const b = inRange("quadSide", state.quadSide);
    const alpha = inRange("quadAngle", state.quadAngle);
    const shift = inRange("quadShift", state.quadShift);
    const QA: V = [0, 0];
    const QB: V = [a, 0];
    const QD: V = [b * Math.cos(alpha * RAD), b * Math.sin(alpha * RAD)];
    const QC: V = [QD[0] + a + shift, QD[1]];
    const qA = r9(between(sub(QB, QA), sub(QD, QA)));
    const qB = r9(between(sub(QA, QB), sub(QC, QB)));
    const qC = r9(between(sub(QB, QC), sub(QD, QC)));
    const qD = r9(between(sub(QC, QD), sub(QA, QD)));
    // Diagonals AC and BD meet at O = A + t(C − A) = B + u(D − B).
    const ac = sub(QC, QA);
    const bd = sub(QD, QB);
    const det = ac[0] * -bd[1] - ac[1] * -bd[0];
    const t = ((QB[0] - QA[0]) * -bd[1] - (QB[1] - QA[1]) * -bd[0]) / det;
    const u = (ac[0] * (QB[1] - QA[1]) - ac[1] * (QB[0] - QA[0])) / det;
    const acLen = len(ac);
    const bdLen = len(bd);

    // Circle
    const arc = inRange("arc", state.arc);
    const pointP = Number.isFinite(state.pointP) ? state.pointP : 90;
    const pointQ = Number.isFinite(state.pointQ) ? state.pointQ : 270;
    const pSide = geoSchoolArcSide(arc, pointP);
    const qSide = geoSchoolArcSide(arc, pointQ);
    const angleP = r9(geoSchoolInscribed(arc, pointP));
    const angleQ = r9(geoSchoolInscribed(arc, pointQ));

    return {
      turn,
      turnKind: geoSchoolAngleKind(turn),
      turnRest: 360 - turn,

      cross,
      supplement: 180 - cross,
      opposite: cross,
      complement: cross < 90 ? 90 - cross : 0,
      hasComplement: cross < 90 ? 1 : 0,

      cut,
      tilt,
      corrTop: cut,
      corrBottom,
      altTop: 180 - cut,
      altBottom: 180 - corrBottom,
      coInteriorSum: 180 - cut + corrBottom,
      isParallel: Math.abs(tilt) < EPS ? 1 : 0,

      triA: A,
      triB: B,
      triC: C,
      triSum: r9(A + B + C),
      exterior: 180 - B,
      oppositeSum: r9(A + C),
      triKind: largest < 90 - 1e-6 ? 1 : largest <= 90 + 1e-6 ? 2 : 3,
      apexX: r9(apexX),
      apexY: r9(apexY),

      rule: GEOSCHOOL_RULE_ORDER.indexOf(rule),
      ruleFixes: GEOSCHOOL_RULE_FIXES[rule] ? 1 : 0,
      triangles: built.count,
      sideP: p,
      sideQ: q,
      sideR: r,
      longest: sorted[2],
      otherTwo: sorted[0] + sorted[1],
      closes: sorted[2] < sorted[0] + sorted[1] - EPS ? 1 : 0,
      flat: Math.abs(sorted[2] - sorted[0] - sorted[1]) <= EPS ? 1 : 0,
      buildA: A,
      buildB: B,
      buildYX: r9(built.yx),
      buildZX: r9(built.zx),
      buildZY: r9(built.zy),
      buildY2X: r9(built.y2x),
      builtXY: made ? r9(built.yx) : 0,
      builtYZ: made ? r9(len(sub(Z, [built.yx, 0]))) : 0,
      builtXZ: made ? r9(len(Z)) : 0,

      quadBase: a,
      quadSide: b,
      quadAngle: alpha,
      quadShift: shift,
      qA,
      qB,
      qC,
      qD,
      qSum: r9(qA + qB + qC + qD),
      sideBC: r9(len(sub(QC, QB))),
      sideCD: a + shift,
      ao: r9(t * acLen),
      oc: r9((1 - t) * acLen),
      bo: r9(u * bdLen),
      od: r9((1 - u) * bdLen),
      bisect: Math.abs(t - 0.5) < 1e-9 && Math.abs(u - 0.5) < 1e-9 ? 1 : 0,
      oppositeEqual: Math.abs(qA - qC) < 1e-6 && Math.abs(qB - qD) < 1e-6 ? 1 : 0,
      isParallelogram: Math.abs(shift) < EPS ? 1 : 0,

      arc,
      pointP,
      pointQ,
      angleP,
      angleQ,
      pSide,
      qSide,
      centreForP: pSide === 1 ? arc : pSide === 2 ? 360 - arc : 0,
      twiceP: r9(2 * angleP),
      sameSegment: pSide > 0 && pSide === qSide ? 1 : 0,
      oppositeArcs: pSide > 0 && qSide > 0 && pSide !== qSide ? 1 : 0,
      cyclicSum: r9(angleP + angleQ),
      semicircle: arc >= 180 - EPS ? 1 : 0,
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof GeoSchoolState] : undefined;
  },

  setVariable(state, id, value) {
    if (!(id in GEOSCHOOL_RANGES)) return state;
    return { ...state, [id]: inRange(id as keyof GeoSchoolState, value) };
  },
};
