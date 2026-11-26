import type { SimulationModel } from "@ise/science-engine";

/**
 * Linear inequalities (class 11) and linear programming (class 12).
 *
 * One variable: ax + b < c on a number line. Subtract b, divide by a — and
 * if a is negative the sign turns round. The answer is a ray with an open
 * dot (< or >) or a closed one (≤ or ≥). Two inequalities at once: the
 * numbers on both rays.
 *
 * Two variables: px + qy ≤ r is a half-plane. Its boundary px + qy = r is
 * solid when the boundary belongs (≤, ≥) and dashed when it does not (<, >);
 * a test point, usually (0, 0), says which side to shade.
 *
 * Linear programming: a few half-planes with x ≥ 0 and y ≥ 0 cut out a
 * feasible region — bounded, unbounded or empty. Z = px + qy is best at a
 * corner (the corner point method). On an unbounded region the best corner
 * is the answer only when the open half-plane beyond it (Z > M for a
 * maximum, Z < m for a minimum) misses the region. An iso-profit line Z = k
 * slid across the region leaves it at a corner.
 *
 * Coefficients are whole numbers, so boundaries and corners are exact
 * fractions: every corner is the rational meeting point of two lines and is
 * checked against every constraint without rounding.
 */

// ── Exact fractions ──────────────────────────────────────────────────────────

/** n/d with d > 0, in lowest terms. */
export interface LpFraction {
  readonly n: number;
  readonly d: number;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x || 1;
}

export function lpFraction(n: number, d = 1): LpFraction {
  if (d === 0) throw new Error("lpFraction: zero denominator");
  const sign = d < 0 ? -1 : 1;
  const g = gcd(n, d);
  return { n: (sign * n) / g || 0, d: Math.abs(d) / g };
}

/** −1, 0 or 1 as x is below, equal to or above y. Exact. */
export function lpCompare(x: LpFraction, y: LpFraction): number {
  return Math.sign(x.n * y.d - y.n * x.d);
}

export const lpValue = (f: LpFraction): number => f.n / f.d || 0;

const minus = (text: string) => text.replace(/-/g, "−");

/** "4", "−3", "5/2". */
export function lpFractionText(f: LpFraction): string {
  return minus(f.d === 1 ? `${f.n}` : `${f.n}/${f.d}`);
}

// ── Relations ────────────────────────────────────────────────────────────────

export type LpRelation = "lt" | "le" | "gt" | "ge";
export const LP_RELATION_ORDER: readonly LpRelation[] = ["lt", "le", "gt", "ge"];
export const LP_SYMBOL: Record<LpRelation, string> = { lt: "<", le: "≤", gt: ">", ge: "≥" };
/** The relation after multiplying both sides by a negative number. */
export const LP_FLIP: Record<LpRelation, LpRelation> = { lt: "gt", le: "ge", gt: "lt", ge: "le" };

export function lpHolds(lhs: number, rel: LpRelation, rhs: number): boolean {
  switch (rel) {
    case "lt": return lhs < rhs;
    case "le": return lhs <= rhs;
    case "gt": return lhs > rhs;
    case "ge": return lhs >= rhs;
  }
}

const isStrict = (rel: LpRelation) => rel === "lt" || rel === "gt";

/** "3x − 4", "−x + 2", "2x" — a·x + b written as a textbook would. */
export function lpOneSideText(a: number, b: number): string {
  const ax = a === 0 ? "" : a === 1 ? "x" : a === -1 ? "−x" : `${minus(String(a))}x`;
  if (!ax) return minus(String(b));
  if (b === 0) return ax;
  return `${ax} ${b > 0 ? "+" : "−"} ${Math.abs(b)}`;
}

/** "250x + 75y", "x − y", "−50x + 20y". */
export function lpLinearText(a: number, b: number): string {
  const term = (k: number, v: string) => (k === 1 ? v : k === -1 ? `−${v}` : `${minus(String(k))}${v}`);
  if (a === 0 && b === 0) return "0";
  if (a === 0) return term(b, "y");
  if (b === 0) return term(a, "x");
  return `${term(a, "x")} ${b > 0 ? "+" : "−"} ${term(Math.abs(b), "y")}`;
}

// ── One variable ─────────────────────────────────────────────────────────────

/** The solutions of a·x + b (rel) c: every x, none, x above the bound, or x below it. */
export interface LpSolution {
  kind: "all" | "none" | "above" | "below";
  bound: LpFraction;
  /** The bound itself is a solution (≤ or ≥): a closed dot. */
  closed: boolean;
  /** a is negative, so dividing by it turned the sign round. */
  flipped: boolean;
}

export function lpSolveOne(a: number, b: number, rel: LpRelation, c: number): LpSolution {
  const closed = !isStrict(rel);
  if (a === 0) return { kind: lpHolds(b, rel, c) ? "all" : "none", bound: lpFraction(0), closed, flipped: false };
  const flipped = a < 0;
  const after = flipped ? LP_FLIP[rel] : rel;
  return { kind: after === "lt" || after === "le" ? "below" : "above", bound: lpFraction(c - b, a), closed, flipped };
}

/** A set of real numbers: an interval whose ends may be missing (infinite). */
export interface LpInterval {
  empty: boolean;
  lo: LpFraction | null;
  loClosed: boolean;
  hi: LpFraction | null;
  hiClosed: boolean;
}

export function lpIntervalOf(s: LpSolution): LpInterval {
  switch (s.kind) {
    case "all": return { empty: false, lo: null, loClosed: false, hi: null, hiClosed: false };
    case "none": return { empty: true, lo: null, loClosed: false, hi: null, hiClosed: false };
    case "above": return { empty: false, lo: s.bound, loClosed: s.closed, hi: null, hiClosed: false };
    case "below": return { empty: false, lo: null, loClosed: false, hi: s.bound, hiClosed: s.closed };
  }
}

/** The numbers in both sets. */
export function lpIntersect(p: LpInterval, q: LpInterval): LpInterval {
  if (p.empty || q.empty) return { empty: true, lo: null, loClosed: false, hi: null, hiClosed: false };
  let lo = p.lo;
  let loClosed = p.loClosed;
  if (q.lo && (!lo || lpCompare(q.lo, lo) > 0)) [lo, loClosed] = [q.lo, q.loClosed];
  else if (q.lo && lo && lpCompare(q.lo, lo) === 0) loClosed = loClosed && q.loClosed;
  let hi = p.hi;
  let hiClosed = p.hiClosed;
  if (q.hi && (!hi || lpCompare(q.hi, hi) < 0)) [hi, hiClosed] = [q.hi, q.hiClosed];
  else if (q.hi && hi && lpCompare(q.hi, hi) === 0) hiClosed = hiClosed && q.hiClosed;
  const order = lo && hi ? lpCompare(lo, hi) : -1;
  const empty = order > 0 || (order === 0 && !(loClosed && hiClosed));
  return empty ? { empty: true, lo: null, loClosed: false, hi: null, hiClosed: false } : { empty, lo, loClosed, hi, hiClosed };
}

/** How many whole numbers a bounded interval holds (0 for an empty or unbounded one). */
export function lpIntegerCount(set: LpInterval): number {
  if (set.empty || !set.lo || !set.hi) return 0;
  const lo = lpValue(set.lo);
  const hi = lpValue(set.hi);
  const first = set.loClosed ? Math.ceil(lo) : Math.floor(lo) + 1;
  const last = set.hiClosed ? Math.floor(hi) : Math.ceil(hi) - 1;
  return Math.max(0, last - first + 1);
}

// ── Linear programming ───────────────────────────────────────────────────────

/** a·x + b·y (rel) c, with whole-number coefficients. */
export interface LpConstraint {
  readonly a: number;
  readonly b: number;
  readonly rel: "le" | "ge";
  readonly c: number;
}

/** x ≥ 0 and y ≥ 0: part of every problem here. */
export const LP_AXES: readonly LpConstraint[] = [
  { a: 1, b: 0, rel: "ge", c: 0 },
  { a: 0, b: 1, rel: "ge", c: 0 },
];

export function lpConstraintText(k: LpConstraint): string {
  return `${lpLinearText(k.a, k.b)} ${LP_SYMBOL[k.rel]} ${minus(String(k.c))}`;
}

export interface LpProblem {
  /** A short name, and the story in a line. */
  label: string;
  story: string;
  /** What x and y count. */
  xName: string;
  yName: string;
  goal: "max" | "min";
  /** The objective Z = p·x + q·y. */
  p: number;
  q: number;
  /** The constraints besides x ≥ 0, y ≥ 0. */
  constraints: readonly LpConstraint[];
  /** The plane shown: 0 ≤ x ≤ view[0], 0 ≤ y ≤ view[1]. */
  view: readonly [number, number];
  /** The values of k the iso-line slider runs across. */
  window: readonly [number, number];
}

export type LpProblemId = "furniture" | "diet" | "simple" | "cost" | "tie" | "nomin" | "empty";
export const LP_PROBLEM_ORDER: readonly LpProblemId[] = ["furniture", "diet", "simple", "cost", "tie", "nomin", "empty"];

/** NCERT class 12, chapter 12: the furniture dealer, the dietician, and the worked examples. */
export const LP_PROBLEMS: Record<LpProblemId, LpProblem> = {
  furniture: {
    label: "Furniture dealer",
    story: "Rs 50,000, room for 60 pieces: tables and chairs",
    xName: "tables",
    yName: "chairs",
    goal: "max",
    p: 250,
    q: 75,
    constraints: [
      { a: 5, b: 1, rel: "le", c: 100 },
      { a: 1, b: 1, rel: "le", c: 60 },
    ],
    view: [64, 110],
    window: [0, 10000],
  },
  diet: {
    label: "Dietician",
    story: "At least 8 units of vitamin A and 10 of C",
    xName: "kg of food I",
    yName: "kg of food II",
    goal: "min",
    p: 50,
    q: 70,
    constraints: [
      { a: 2, b: 1, rel: "ge", c: 8 },
      { a: 1, b: 2, rel: "ge", c: 10 },
    ],
    view: [12, 10],
    window: [0, 1000],
  },
  simple: {
    label: "Two constraints",
    story: "NCERT's first worked example",
    xName: "x",
    yName: "y",
    goal: "max",
    p: 4,
    q: 1,
    constraints: [
      { a: 1, b: 1, rel: "le", c: 50 },
      { a: 3, b: 1, rel: "le", c: 90 },
    ],
    view: [60, 100],
    window: [0, 200],
  },
  cost: {
    label: "A thin region",
    story: "A minimum between two lines",
    xName: "x",
    yName: "y",
    goal: "min",
    p: 200,
    q: 500,
    constraints: [
      { a: 1, b: 2, rel: "ge", c: 10 },
      { a: 3, b: 4, rel: "le", c: 24 },
    ],
    view: [11, 7],
    window: [0, 4000],
  },
  tie: {
    label: "A tie",
    story: "Two corners share the largest Z",
    xName: "x",
    yName: "y",
    goal: "max",
    p: 3,
    q: 9,
    constraints: [
      { a: 1, b: 3, rel: "le", c: 60 },
      { a: 1, b: 1, rel: "ge", c: 10 },
      { a: 1, b: -1, rel: "le", c: 0 },
    ],
    view: [25, 25],
    window: [0, 300],
  },
  nomin: {
    label: "No minimum",
    story: "An unbounded region where Z falls for ever",
    xName: "x",
    yName: "y",
    goal: "min",
    p: -50,
    q: 20,
    constraints: [
      { a: 2, b: -1, rel: "ge", c: -5 },
      { a: 3, b: 1, rel: "ge", c: 3 },
      { a: 2, b: -3, rel: "le", c: 12 },
    ],
    view: [10, 10],
    window: [-600, 200],
  },
  empty: {
    label: "No feasible region",
    story: "Constraints that cannot all hold",
    xName: "x",
    yName: "y",
    goal: "min",
    p: 3,
    q: 2,
    constraints: [
      { a: 1, b: 1, rel: "ge", c: 8 },
      { a: 3, b: 5, rel: "le", c: 15 },
    ],
    view: [10, 10],
    window: [0, 40],
  },
};

export interface LpCorner {
  x: LpFraction;
  y: LpFraction;
  /** Z there. */
  z: LpFraction;
}

export interface LpRegion {
  feasible: boolean;
  bounded: boolean;
  /** The corners in order round the region, counterclockwise from the lowest-left. */
  corners: LpCorner[];
  /** Directions in which the region runs on for ever. */
  rays: [number, number][];
  /** Z grows (or falls) without limit somewhere in the region. */
  supInfinite: boolean;
  infInfinite: boolean;
}

/** Does the point (xn/d, yn/d) satisfy a·x + b·y (rel) c? Exact: d > 0 and everything is a whole number. */
function satisfies(k: LpConstraint, xn: number, yn: number, d: number): boolean {
  return lpHolds(k.a * xn + k.b * yn, k.rel, k.c * d);
}

/** The feasible region of `constraints` with x ≥ 0, y ≥ 0, and how Z = p·x + q·y behaves on it. */
export function lpRegion(constraints: readonly LpConstraint[], p: number, q: number): LpRegion {
  const all = [...constraints, ...LP_AXES];
  const found: { xn: number; yn: number; d: number }[] = [];
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const s = all[i]!;
      const t = all[j]!;
      let d = s.a * t.b - t.a * s.b;
      if (d === 0) continue;
      let xn = s.c * t.b - t.c * s.b;
      let yn = s.a * t.c - t.a * s.c;
      if (d < 0) [xn, yn, d] = [-xn, -yn, -d];
      if (!all.every((k) => satisfies(k, xn, yn, d))) continue;
      if (!found.some((f) => f.xn * d === xn * f.d && f.yn * d === yn * f.d)) found.push({ xn, yn, d });
    }
  }
  let corners: LpCorner[] = found.map(({ xn, yn, d }) => ({ x: lpFraction(xn, d), y: lpFraction(yn, d), z: lpFraction(p * xn + q * yn, d) }));

  // Round the region: by angle about the corners' centre, starting at the lowest-left corner.
  if (corners.length > 2) {
    const cx = corners.reduce((sum, k) => sum + lpValue(k.x), 0) / corners.length;
    const cy = corners.reduce((sum, k) => sum + lpValue(k.y), 0) / corners.length;
    corners.sort((m, n) => Math.atan2(lpValue(m.y) - cy, lpValue(m.x) - cx) - Math.atan2(lpValue(n.y) - cy, lpValue(n.x) - cx));
  }
  if (corners.length > 1) {
    let start = 0;
    corners.forEach((k, i) => {
      const s = corners[start]!;
      const byX = lpCompare(k.x, s.x);
      if (byX < 0 || (byX === 0 && lpCompare(k.y, s.y) < 0)) start = i;
    });
    corners = [...corners.slice(start), ...corners.slice(0, start)];
  }

  // With x ≥ 0 and y ≥ 0 the directions of escape form a pointed cone, so its
  // edges run along some constraint's boundary: try ±(−b, a) for each.
  const feasible = corners.length > 0;
  const rays: [number, number][] = [];
  if (feasible) {
    for (const k of all) {
      for (const sign of [1, -1]) {
        const dx = -k.b * sign;
        const dy = k.a * sign;
        if (dx === 0 && dy === 0) continue;
        if (!all.every((m) => lpHolds(m.a * dx + m.b * dy, m.rel, 0))) continue;
        if (!rays.some(([ex, ey]) => ex * dy === ey * dx && Math.sign(ex) === Math.sign(dx) && Math.sign(ey) === Math.sign(dy))) rays.push([dx, dy]);
      }
    }
  }
  return {
    feasible,
    bounded: feasible && rays.length === 0,
    corners,
    rays,
    supInfinite: rays.some(([dx, dy]) => p * dx + q * dy > 0),
    infInfinite: rays.some(([dx, dy]) => p * dx + q * dy < 0),
  };
}

/** Cut a polygon down to the part where a·x + b·y (rel) c — for drawing; floating point. */
export function lpClip(polygon: readonly (readonly [number, number])[], k: LpConstraint): [number, number][] {
  const inside = ([x, y]: readonly [number, number]) => (k.rel === "le" ? k.a * x + k.b * y <= k.c + 1e-9 : k.a * x + k.b * y >= k.c - 1e-9);
  const out: [number, number][] = [];
  for (let i = 0; i < polygon.length; i++) {
    const from = polygon[i]!;
    const to = polygon[(i + 1) % polygon.length]!;
    const fromIn = inside(from);
    const toIn = inside(to);
    if (fromIn) out.push([from[0], from[1]]);
    if (fromIn !== toIn) {
      const f = k.a * from[0] + k.b * from[1] - k.c;
      const g = k.a * to[0] + k.b * to[1] - k.c;
      const t = f / (f - g);
      out.push([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t]);
    }
  }
  return out;
}

/** The feasible region as seen in the box 0 ≤ x ≤ xMax, 0 ≤ y ≤ yMax: a polygon, empty when there is none. */
export function lpVisibleRegion(constraints: readonly LpConstraint[], xMax: number, yMax: number): [number, number][] {
  let polygon: [number, number][] = [
    [0, 0],
    [xMax, 0],
    [xMax, yMax],
    [0, yMax],
  ];
  for (const k of constraints) polygon = lpClip(polygon, k);
  return polygon;
}

/** A half-plane p·x + q·y (rel) r cut to a square window, for drawing. */
export function lpHalfPlane(p: number, q: number, rel: LpRelation, r: number, limit: number): [number, number][] {
  const box: [number, number][] = [
    [-limit, -limit],
    [limit, -limit],
    [limit, limit],
    [-limit, limit],
  ];
  return lpClip(box, { a: p, b: q, rel: rel === "lt" || rel === "le" ? "le" : "ge", c: r });
}

// ── The model ────────────────────────────────────────────────────────────────

export const LP_NUMBER_LIMIT = 10;
export const LP_PLANE_LIMIT = 8;
export const LP_POINT_LIMIT = 110;
export const LP_MAX_CORNERS = 6;

export type LinprogParams = {
  /** The relations of the two one-variable inequalities. */
  rel1: LpRelation;
  rel2: LpRelation;
  /** The relation of the two-variable inequality. */
  rel: LpRelation;
  problem: LpProblemId;
};

export interface LinprogState {
  /** a·x + b (rel1) c, and a2·x + b2 (rel2) c2, with a test number t. */
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly a2: number;
  readonly b2: number;
  readonly c2: number;
  readonly t: number;
  /** p·x + q·y (rel) r, with a test point (u, v). */
  readonly p: number;
  readonly q: number;
  readonly r: number;
  readonly u: number;
  readonly v: number;
  /** A trial point (rx, ry) for the problem, the corner being read, and the iso-line's place along its window (0–1). */
  readonly rx: number;
  readonly ry: number;
  readonly corner: number;
  readonly s: number;
}

export type LinprogResults = {
  a: number;
  b: number;
  c: number;
  /** The relations, as their place in LP_RELATION_ORDER (0 <, 1 ≤, 2 >, 3 ≥). */
  rel1: number;
  a2: number;
  b2: number;
  c2: number;
  rel2: number;
  /** The first inequality's boundary (c − b)/a, 0 when a = 0. */
  bound1: number;
  /** 1: x above the bound; −1: below; 2: every x; 0: no x. */
  dir1: number;
  closed1: number;
  flipped1: number;
  bound2: number;
  dir2: number;
  closed2: number;
  flipped2: number;
  t: number;
  holds1: number;
  holds2: number;
  holdsBoth: number;
  /** Both together: 0 none, 1 a bounded interval, 2 x above lo, 3 x below hi, 4 every x. */
  setKind: number;
  lo: number;
  hi: number;
  loClosed: number;
  hiClosed: number;
  /** Whole numbers in a bounded answer. */
  integers: number;

  p: number;
  q: number;
  r: number;
  rel: number;
  u: number;
  v: number;
  /** p·u + q·v, and whether (u, v) and (0, 0) satisfy the inequality. */
  lhs: number;
  holds: number;
  originHolds: number;
  /** 1 when (u, v) is on the boundary line. */
  onBoundary: number;
  /** 1 for < and >: a dashed boundary. */
  strict: number;
  /** 1 when p = q = 0 and there is no line. */
  degenerate: number;

  problem: number;
  goalMax: number;
  feasible: number;
  bounded: number;
  /** 0 empty, 1 bounded, 2 unbounded. */
  regionKind: number;
  cornerCount: number;
  rx: number;
  ry: number;
  inRegion: number;
  /** How many constraints (rx, ry) breaks. */
  broken: number;
  pointZ: number;
  corner: number;
  cornerX: number;
  cornerY: number;
  cornerZ: number;
  cornerIsBest: number;
  zLow: number;
  zHigh: number;
  /** The maximum (or minimum) asked for exists. */
  hasBest: number;
  best: number;
  bestX: number;
  bestY: number;
  /** How many corners share the best value (2: every point of the edge between them). */
  bestCount: number;
  /** The open half-plane beyond the best corner value (Z > M, or Z < m) meets the region: no optimum. */
  beyondMeets: number;
  s: number;
  /** The iso-line Z = k. */
  k: number;
  isoMeets: number;
  isoAtBest: number;
};

const OUTPUTS = [
  "a", "b", "c", "rel1", "a2", "b2", "c2", "rel2", "bound1", "dir1", "closed1", "flipped1", "bound2", "dir2", "closed2", "flipped2",
  "t", "holds1", "holds2", "holdsBoth", "setKind", "lo", "hi", "loClosed", "hiClosed", "integers",
  "p", "q", "r", "rel", "u", "v", "lhs", "holds", "originHolds", "onBoundary", "strict", "degenerate",
  "problem", "goalMax", "feasible", "bounded", "regionKind", "cornerCount", "rx", "ry", "inRegion", "broken", "pointZ",
  "corner", "cornerX", "cornerY", "cornerZ", "cornerIsBest", "zLow", "zHigh", "hasBest", "best", "bestX", "bestY", "bestCount",
  "beyondMeets", "s", "k", "isoMeets", "isoAtBest",
] as const satisfies readonly (keyof LinprogResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const whole = (v: number, lim: number) => clamp(Math.round(v), -lim, lim) || 0;
const half = (v: number, lo: number, hi: number) => clamp(Math.round(v * 2) / 2, lo, hi) || 0;

const relOf = (rel: unknown): LpRelation => (LP_RELATION_ORDER.includes(rel as LpRelation) ? (rel as LpRelation) : "le");
const problemOf = (params: LinprogParams): LpProblemId => (LP_PROBLEM_ORDER.includes(params.problem) ? params.problem : "furniture");
const DIR: Record<LpSolution["kind"], number> = { above: 1, below: -1, all: 2, none: 0 };

function setKindOf(set: LpInterval): number {
  if (set.empty) return 0;
  if (set.lo && set.hi) return 1;
  if (set.lo) return 2;
  if (set.hi) return 3;
  return 4;
}

/** Region facts are pure functions of the problem, so work each out once. */
const REGIONS = new Map<LpProblemId, LpRegion>();
export function lpProblemRegion(id: LpProblemId): LpRegion {
  let region = REGIONS.get(id);
  if (!region) {
    const problem = LP_PROBLEMS[id];
    region = lpRegion(problem.constraints, problem.p, problem.q);
    REGIONS.set(id, region);
  }
  return region;
}

const LIMITS: Record<string, (v: number) => number> = {
  a: (v) => whole(v, 5),
  a2: (v) => whole(v, 5),
  b: (v) => whole(v, 10),
  c: (v) => whole(v, 10),
  b2: (v) => whole(v, 10),
  c2: (v) => whole(v, 10),
  t: (v) => half(v, -LP_NUMBER_LIMIT, LP_NUMBER_LIMIT),
  p: (v) => whole(v, 5),
  q: (v) => whole(v, 5),
  r: (v) => whole(v, 12),
  u: (v) => half(v, -LP_PLANE_LIMIT, LP_PLANE_LIMIT),
  v: (v) => half(v, -LP_PLANE_LIMIT, LP_PLANE_LIMIT),
  rx: (v) => half(v, 0, LP_POINT_LIMIT),
  ry: (v) => half(v, 0, LP_POINT_LIMIT),
  corner: (v) => clamp(Math.round(v), 1, LP_MAX_CORNERS),
  s: (v) => clamp(Math.round(v * 1000) / 1000, 0, 1),
};
const KEYS = Object.keys(LIMITS) as (keyof LinprogState)[];

export const linprogModel: SimulationModel<LinprogState, LinprogParams, LinprogResults> = {
  id: "linprog",
  defaultParams: { rel1: "lt", rel2: "ge", rel: "le", problem: "furniture" },
  outputs: OUTPUTS,
  stateVariables: KEYS,

  initialize() {
    return { a: 3, b: -4, c: 8, a2: 1, b2: 1, c2: 0, t: 0, p: 2, q: 3, r: 12, u: 1, v: 1, rx: 10, ry: 20, corner: 1, s: 0.5 };
  },

  /** Play slides the iso-line Z = k across its window, and round again. */
  advance(state, dt) {
    const s = state.s + 0.08 * dt;
    return { ...state, s: s > 1 ? 0 : clamp(s, 0, 1) };
  },

  /** A step moves to the next corner (or the one before). */
  step(state, params, sign) {
    const count = Math.max(1, lpProblemRegion(problemOf(params)).corners.length);
    return { ...state, corner: clamp(Math.round(state.corner) + sign, 1, count) };
  },

  derive(state, params) {
    // One variable.
    const a = LIMITS.a!(state.a);
    const b = LIMITS.b!(state.b);
    const c = LIMITS.c!(state.c);
    const a2 = LIMITS.a2!(state.a2);
    const b2 = LIMITS.b2!(state.b2);
    const c2 = LIMITS.c2!(state.c2);
    const t = LIMITS.t!(state.t);
    const rel1 = relOf(params.rel1);
    const rel2 = relOf(params.rel2);
    const one = lpSolveOne(a, b, rel1, c);
    const two = lpSolveOne(a2, b2, rel2, c2);
    const both = lpIntersect(lpIntervalOf(one), lpIntervalOf(two));
    const holds1 = lpHolds(a * t + b, rel1, c);
    const holds2 = lpHolds(a2 * t + b2, rel2, c2);

    // Two variables.
    const p = LIMITS.p!(state.p);
    const q = LIMITS.q!(state.q);
    const r = LIMITS.r!(state.r);
    const u = LIMITS.u!(state.u);
    const v = LIMITS.v!(state.v);
    const rel = relOf(params.rel);
    const lhs = p * u + q * v;

    // Linear programming.
    const id = problemOf(params);
    const problem = LP_PROBLEMS[id];
    const region = lpProblemRegion(id);
    const all = [...problem.constraints, ...LP_AXES];
    const rx = clamp(LIMITS.rx!(state.rx), 0, problem.view[0]);
    const ry = clamp(LIMITS.ry!(state.ry), 0, problem.view[1]);
    const broken = all.filter((k) => !lpHolds(k.a * rx + k.b * ry, k.rel, k.c)).length;
    const corners = region.corners;
    const zs = corners.map((k) => k.z);
    const low = zs.reduce<LpFraction | null>((m, z) => (!m || lpCompare(z, m) < 0 ? z : m), null);
    const high = zs.reduce<LpFraction | null>((m, z) => (!m || lpCompare(z, m) > 0 ? z : m), null);
    const max = problem.goal === "max";
    const target = max ? high : low;
    const hasBest = region.feasible && !(max ? region.supInfinite : region.infInfinite);
    const bestCorners = target ? corners.filter((k) => lpCompare(k.z, target) === 0) : [];
    const bestCorner = bestCorners[0];
    const index = corners.length ? clamp(Math.round(LIMITS.corner!(state.corner)), 1, corners.length) : 0;
    const chosen = index ? corners[index - 1] : undefined;
    const s = LIMITS.s!(state.s);
    const span = problem.window[1] - problem.window[0];
    const k = Math.round((problem.window[0] + s * span) * 1e6) / 1e6 || 0;
    const eps = span * 1e-6;
    const isoMeets =
      region.feasible && (region.infInfinite || (low !== null && k >= lpValue(low) - eps)) && (region.supInfinite || (high !== null && k <= lpValue(high) + eps));

    return {
      a,
      b,
      c,
      rel1: LP_RELATION_ORDER.indexOf(rel1),
      a2,
      b2,
      c2,
      rel2: LP_RELATION_ORDER.indexOf(rel2),
      bound1: lpValue(one.bound),
      dir1: DIR[one.kind],
      closed1: one.closed ? 1 : 0,
      flipped1: one.flipped ? 1 : 0,
      bound2: lpValue(two.bound),
      dir2: DIR[two.kind],
      closed2: two.closed ? 1 : 0,
      flipped2: two.flipped ? 1 : 0,
      t,
      holds1: holds1 ? 1 : 0,
      holds2: holds2 ? 1 : 0,
      holdsBoth: holds1 && holds2 ? 1 : 0,
      setKind: setKindOf(both),
      lo: both.lo ? lpValue(both.lo) : 0,
      hi: both.hi ? lpValue(both.hi) : 0,
      loClosed: both.loClosed ? 1 : 0,
      hiClosed: both.hiClosed ? 1 : 0,
      integers: lpIntegerCount(both),

      p,
      q,
      r,
      rel: LP_RELATION_ORDER.indexOf(rel),
      u,
      v,
      lhs: lhs || 0,
      holds: lpHolds(lhs, rel, r) ? 1 : 0,
      originHolds: lpHolds(0, rel, r) ? 1 : 0,
      onBoundary: lhs === r ? 1 : 0,
      strict: isStrict(rel) ? 1 : 0,
      degenerate: p === 0 && q === 0 ? 1 : 0,

      problem: LP_PROBLEM_ORDER.indexOf(id),
      goalMax: max ? 1 : 0,
      feasible: region.feasible ? 1 : 0,
      bounded: region.bounded ? 1 : 0,
      regionKind: !region.feasible ? 0 : region.bounded ? 1 : 2,
      cornerCount: corners.length,
      rx,
      ry,
      inRegion: broken === 0 ? 1 : 0,
      broken,
      pointZ: problem.p * rx + problem.q * ry || 0,
      corner: index,
      cornerX: chosen ? lpValue(chosen.x) : 0,
      cornerY: chosen ? lpValue(chosen.y) : 0,
      cornerZ: chosen ? lpValue(chosen.z) : 0,
      cornerIsBest: hasBest && chosen && target && lpCompare(chosen.z, target) === 0 ? 1 : 0,
      zLow: low ? lpValue(low) : 0,
      zHigh: high ? lpValue(high) : 0,
      hasBest: hasBest ? 1 : 0,
      best: hasBest && target ? lpValue(target) : 0,
      bestX: hasBest && bestCorner ? lpValue(bestCorner.x) : 0,
      bestY: hasBest && bestCorner ? lpValue(bestCorner.y) : 0,
      bestCount: hasBest ? bestCorners.length : 0,
      beyondMeets: region.feasible && (max ? region.supInfinite : region.infInfinite) ? 1 : 0,
      s,
      k,
      isoMeets: isoMeets ? 1 : 0,
      isoAtBest: hasBest && target && Math.abs(k - lpValue(target)) <= eps ? 1 : 0,
    };
  },

  getVariable(state, id) {
    return (KEYS as readonly string[]).includes(id) ? state[id as keyof LinprogState] : undefined;
  },

  setVariable(state, id, value) {
    const limit = LIMITS[id];
    return limit ? { ...state, [id]: limit(value) } : state;
  },
};
