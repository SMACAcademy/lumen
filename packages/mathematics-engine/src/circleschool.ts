import type { SimulationModel } from "@ise/science-engine";

/**
 * Circles and coordinates for classes 9 and 10 (NCERT "Circles", "Areas
 * Related to Circles", "Coordinate Geometry" and "Heron's Formula").
 *
 * A line and a circle: a straight line slides towards a circle. Far away it
 * misses (no common point), then it touches at one point (a tangent), then
 * it cuts at two (a secant). It touches exactly when its distance from the
 * centre equals the radius.
 *
 * The tangent at a point: a line through a point P of the circle, turned to
 * any angle with the radius OP. It cuts the circle a second time unless the
 * angle is 90°, so the tangent at P is the line at right angles to OP.
 *
 * Two tangents from outside: from a point P at distance d from the centre
 * there are two tangents when P is outside, one when P is on the circle, and
 * none from inside. Both tangents are √(d² − r²) long.
 *
 * Sectors: a slice of angle θ has arc θ/360 × 2πr and area θ/360 × πr². The
 * segment cut off by the chord is the sector take away triangle OAB (for an
 * angle up to 180°; past 180° the triangle is added instead).
 *
 * The section formula: the point dividing AB in the ratio m : n, and the
 * midpoint (m = n).
 *
 * Heron's formula: a triangle's area from its three sides alone.
 *
 * π is what NCERT uses in its sums, 22/7 or 3.14, chosen by a parameter.
 */

export type CircleSchoolPi = "22/7" | "3.14";
export const CIRCLE_SCHOOL_PI: Record<CircleSchoolPi, number> = { "22/7": 22 / 7, "3.14": 3.14 };

export type CircleSchoolParams = { pi: CircleSchoolPi };

export interface CircleSchoolState {
  /** The circle's radius (cm). */
  readonly radius: number;
  /** How far the sliding line is from the centre (cm). */
  readonly gap: number;
  /** Where P sits on the circle, in degrees from the right-hand end of the horizontal diameter. */
  readonly touch: number;
  /** The angle between the radius OP and the line through P (degrees). */
  readonly tilt: number;
  /** How far the outside point is from the centre (cm). */
  readonly dist: number;
  /** The angle of the sector at the centre (degrees). */
  readonly theta: number;
  /** A(x₁, y₁), B(x₂, y₂) and the ratio m : n. */
  readonly ax: number;
  readonly ay: number;
  readonly bx: number;
  readonly by: number;
  readonly m: number;
  readonly n: number;
  /** The three sides of the triangle for Heron's formula. */
  readonly sideA: number;
  readonly sideB: number;
  readonly sideC: number;
}

export const CIRCLE_SCHOOL_RANGES: Record<keyof CircleSchoolState, readonly [number, number]> = {
  radius: [1, 28],
  gap: [0, 30],
  touch: [0, 360],
  tilt: [0, 180],
  dist: [0, 30],
  theta: [0, 360],
  ax: [-10, 10],
  ay: [-10, 10],
  bx: [-10, 10],
  by: [-10, 10],
  m: [1, 10],
  n: [1, 10],
  sideA: [1, 130],
  sideB: [1, 130],
  sideC: [1, 130],
};

export const CIRCLE_SCHOOL_DEFAULT_STATE: CircleSchoolState = {
  radius: 5,
  gap: 8,
  touch: 60,
  tilt: 60,
  dist: 13,
  theta: 60,
  ax: -1,
  ay: 7,
  bx: 4,
  by: -3,
  m: 2,
  n: 3,
  sideA: 3,
  sideB: 4,
  sideC: 5,
};

/** A line this close (cm) to the radius counts as touching; a tilt this close to 90° counts as a right angle. */
export const CIRCLE_SCHOOL_TOUCH = 0.05;
export const CIRCLE_SCHOOL_RIGHT = 0.5;
/** Play walks P round the circle at this many degrees a second. */
export const CIRCLE_SCHOOL_WALK = 30;

export type CircleSchoolResults = {
  radius: number;
  /** The sliding line: its distance, how many points it shares with the circle, and the chord it cuts. */
  gap: number;
  crossings: number;
  chord: number;
  /** The line through P. */
  touch: number;
  tilt: number;
  px: number;
  py: number;
  lineDistance: number;
  tiltCrossings: number;
  tiltChord: number;
  isTangent: number;
  /** Two tangents from an outside point. */
  dist: number;
  tangentCount: number;
  tangentLength: number;
  tangentAngle: number;
  centreAngle: number;
  angleSum: number;
  /** The sector. */
  theta: number;
  piChoice: number;
  piValue: number;
  circumference: number;
  circleArea: number;
  arc: number;
  sectorArea: number;
  majorSector: number;
  sectorChord: number;
  triangleArea: number;
  segment: number;
  majorSegment: number;
  /** The section formula. */
  ax: number;
  ay: number;
  bx: number;
  by: number;
  m: number;
  n: number;
  sectionX: number;
  sectionY: number;
  midX: number;
  midY: number;
  abLength: number;
  apLength: number;
  pbLength: number;
  ratio: number;
  /** Heron's formula. */
  sideA: number;
  sideB: number;
  sideC: number;
  perimeter: number;
  semi: number;
  sMinusA: number;
  sMinusB: number;
  sMinusC: number;
  heronProduct: number;
  heronArea: number;
  closes: number;
  /** 0 no triangle, 1 acute-angled, 2 right-angled, 3 obtuse-angled. */
  heronKind: number;
};

const OUTPUTS = [
  "radius", "gap", "crossings", "chord",
  "touch", "tilt", "px", "py", "lineDistance", "tiltCrossings", "tiltChord", "isTangent",
  "dist", "tangentCount", "tangentLength", "tangentAngle", "centreAngle", "angleSum",
  "theta", "piChoice", "piValue", "circumference", "circleArea", "arc", "sectorArea", "majorSector", "sectorChord", "triangleArea", "segment", "majorSegment",
  "ax", "ay", "bx", "by", "m", "n", "sectionX", "sectionY", "midX", "midY", "abLength", "apLength", "pbLength", "ratio",
  "sideA", "sideB", "sideC", "perimeter", "semi", "sMinusA", "sMinusB", "sMinusC", "heronProduct", "heronArea", "closes", "heronKind",
] as const satisfies readonly (keyof CircleSchoolResults)[];

const RAD = Math.PI / 180;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Rounds away floating-point dust (and −0), so 5 sin 90° is 5 and cos 90° is 0. */
const tidy = (v: number) => Math.round(v * 1e9) / 1e9 || 0;
const inRange = (state: CircleSchoolState, key: keyof CircleSchoolState) => {
  const [lo, hi] = CIRCLE_SCHOOL_RANGES[key];
  const v = state[key];
  return Number.isFinite(v) ? clamp(v, lo, hi) : CIRCLE_SCHOOL_DEFAULT_STATE[key];
};
const piOf = (params: CircleSchoolParams): CircleSchoolPi => (params.pi === "3.14" ? "3.14" : "22/7");

/** How many points a line at distance d from the centre shares with a circle of radius r. */
export function circleSchoolCrossings(d: number, r: number): number {
  if (Math.abs(d - r) <= CIRCLE_SCHOOL_TOUCH) return 1;
  return d < r ? 2 : 0;
}

/** Heron's formula: the semi-perimeter, the four factors and the area (0 if the sides do not close). */
export function circleSchoolHeron(a: number, b: number, c: number) {
  const s = (a + b + c) / 2;
  const product = s * (s - a) * (s - b) * (s - c);
  const longest = Math.max(a, b, c);
  const closes = longest < a + b + c - longest ? 1 : 0;
  return { s, product, closes, area: closes ? Math.sqrt(Math.max(0, product)) : 0 };
}

/** The point dividing A(x₁, y₁) to B(x₂, y₂) internally in the ratio m : n. */
export function circleSchoolSection(x1: number, y1: number, x2: number, y2: number, m: number, n: number): [number, number] {
  return [(m * x2 + n * x1) / (m + n) || 0, (m * y2 + n * y1) / (m + n) || 0];
}

export const circleSchoolModel: SimulationModel<CircleSchoolState, CircleSchoolParams, CircleSchoolResults> = {
  id: "circleschool",
  defaultParams: { pi: "22/7" },
  outputs: OUTPUTS,
  stateVariables: Object.keys(CIRCLE_SCHOOL_RANGES),

  initialize() {
    return { ...CIRCLE_SCHOOL_DEFAULT_STATE };
  },

  /** Play walks P round the circle, keeping the angle its line makes with the radius. */
  advance(state, dt) {
    return { ...state, touch: (((state.touch + CIRCLE_SCHOOL_WALK * dt) % 360) + 360) % 360 };
  },

  step(state, _params, sign) {
    const next = Math.round(state.touch / 15) * 15 + 15 * sign;
    return { ...state, touch: ((next % 360) + 360) % 360 };
  },

  derive(state, params) {
    const r = inRange(state, "radius");

    // A line sliding towards the circle.
    const gap = inRange(state, "gap");
    const crossings = circleSchoolCrossings(gap, r);
    const chord = crossings === 2 ? 2 * Math.sqrt(r * r - gap * gap) : 0;

    // The line through P at an angle to the radius OP.
    const touch = inRange(state, "touch");
    const tilt = inRange(state, "tilt");
    const right = Math.abs(tilt - 90) < CIRCLE_SCHOOL_RIGHT;
    const tiltCrossings = right ? 1 : 2;

    // Two tangents from a point d from the centre.
    const dist = inRange(state, "dist");
    const tangentCount = circleSchoolCrossings(dist, r) === 1 ? 1 : dist > r ? 2 : 0;
    const tangentLength = tangentCount === 2 ? Math.sqrt(dist * dist - r * r) : 0;
    const tangentAngle = tangentCount === 2 ? (2 * Math.asin(r / dist)) / RAD : 0;
    const centreAngle = tangentCount === 2 ? 180 - tangentAngle : 0;

    // The sector.
    const piId = piOf(params);
    const pi = CIRCLE_SCHOOL_PI[piId];
    const theta = inRange(state, "theta");
    const circleArea = pi * r * r;
    const sectorArea = (theta / 360) * circleArea;
    const triangleArea = tidy(0.5 * r * r * Math.abs(Math.sin(theta * RAD)));
    const segment = theta <= 180 ? sectorArea - triangleArea : sectorArea + triangleArea;

    // The section formula.
    const ax = inRange(state, "ax");
    const ay = inRange(state, "ay");
    const bx = inRange(state, "bx");
    const by = inRange(state, "by");
    const m = inRange(state, "m");
    const n = inRange(state, "n");
    const [sectionX, sectionY] = circleSchoolSection(ax, ay, bx, by, m, n);

    // Heron's formula.
    const a = inRange(state, "sideA");
    const b = inRange(state, "sideB");
    const c = inRange(state, "sideC");
    const heron = circleSchoolHeron(a, b, c);
    const sorted = [a, b, c].sort((p, q) => p - q) as [number, number, number];
    const bend = sorted[0] * sorted[0] + sorted[1] * sorted[1] - sorted[2] * sorted[2];
    const heronKind = !heron.closes ? 0 : Math.abs(bend) < 1e-9 ? 2 : bend > 0 ? 1 : 3;

    return {
      radius: r,
      gap,
      crossings,
      chord,
      touch,
      tilt,
      px: tidy(r * Math.cos(touch * RAD)),
      py: tidy(r * Math.sin(touch * RAD)),
      lineDistance: tidy(r * Math.sin(tilt * RAD)),
      tiltCrossings,
      tiltChord: right ? 0 : tidy(2 * r * Math.abs(Math.cos(tilt * RAD))),
      isTangent: right ? 1 : 0,
      dist,
      tangentCount,
      tangentLength,
      tangentAngle,
      centreAngle,
      angleSum: tangentAngle + centreAngle,
      theta,
      piChoice: piId === "22/7" ? 0 : 1,
      piValue: pi,
      circumference: 2 * pi * r,
      circleArea,
      arc: (theta / 360) * 2 * pi * r,
      sectorArea,
      majorSector: circleArea - sectorArea,
      sectorChord: tidy(2 * r * Math.sin((theta / 2) * RAD)),
      triangleArea,
      segment,
      majorSegment: circleArea - segment,
      ax,
      ay,
      bx,
      by,
      m,
      n,
      sectionX,
      sectionY,
      midX: (ax + bx) / 2 || 0,
      midY: (ay + by) / 2 || 0,
      abLength: Math.hypot(bx - ax, by - ay),
      apLength: Math.hypot(sectionX - ax, sectionY - ay),
      pbLength: Math.hypot(bx - sectionX, by - sectionY),
      ratio: m / n,
      sideA: a,
      sideB: b,
      sideC: c,
      perimeter: a + b + c,
      semi: heron.s,
      sMinusA: heron.s - a || 0,
      sMinusB: heron.s - b || 0,
      sMinusC: heron.s - c || 0,
      heronProduct: heron.product || 0,
      heronArea: heron.area,
      closes: heron.closes,
      heronKind,
    };
  },

  getVariable(state, id) {
    return id in CIRCLE_SCHOOL_RANGES ? state[id as keyof CircleSchoolState] : undefined;
  },

  setVariable(state, id, value) {
    if (!(id in CIRCLE_SCHOOL_RANGES) || !Number.isFinite(value)) return state;
    const [lo, hi] = CIRCLE_SCHOOL_RANGES[id as keyof CircleSchoolState];
    return { ...state, [id]: clamp(value, lo, hi) };
  },
};
