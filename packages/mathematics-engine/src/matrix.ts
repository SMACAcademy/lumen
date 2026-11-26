import type { SimulationModel } from "@ise/science-engine";

/**
 * Matrices and determinants (NCERT class 12, chapters 3 and 4, and JEE).
 *
 * A 2 × 2 matrix A = [a b; c d] is a transformation of the plane: it sends
 * the point (x, y) to (ax + by, cx + dy) = x·(a, c) + y·(b, d). So its first
 * column is where î = (1, 0) lands and its second column is where ĵ = (0, 1)
 * lands; the unit square becomes the parallelogram on those two columns.
 * A comes either from four entries or from a ready-made family: a rotation
 * by θ, a reflection in the line through O at angle θ, a shear [1 k; 0 1] or
 * a stretch [k 0; 0 1].
 *
 * Determinant: |A| = ad − bc is the signed area of the image of the unit
 * square — every area is multiplied by |A|. Negative: the picture is flipped
 * over. Zero: the plane is squashed onto a line (or a point), and nothing can
 * undo that, so there is no inverse.
 *
 * Product: AB means "do B first, then A": (AB)P = A(BP). A second matrix B is
 * one of four presets. AB and BA are usually different; |AB| = |A||B|.
 *
 * Inverse: adj A = [d −b; −c a] (the transpose of the matrix of cofactors),
 * A(adj A) = (adj A)A = |A|I, and A⁻¹ = adj A / |A| when |A| ≠ 0.
 *
 * Special matrices: Aᵀ swaps rows and columns. A is symmetric when Aᵀ = A
 * and skew-symmetric when Aᵀ = −A (so its diagonal is 0). Every square matrix
 * is ½(A + Aᵀ) + ½(A − Aᵀ), a symmetric plus a skew-symmetric part. A is
 * orthogonal when AᵀA = I: its columns are perpendicular unit vectors, it
 * keeps every length, and |A| = ±1 (a rotation or a reflection).
 *
 * Linear systems: ax + by = e and cx + dy = f, i.e. AX = B with the same A.
 * |A| ≠ 0: one solution, X = A⁻¹B, or by Cramer's rule x = D₁/D, y = D₂/D
 * with D = |A|, D₁ = ed − bf, D₂ = af − ec. |A| = 0: (adj A)B = (D₁, D₂). If it
 * is not zero there is no solution (parallel lines); if it is zero there are
 * infinitely many (the same line) — except when A is the zero matrix and
 * e or f is not 0, when there are none.
 *
 * 3 × 3 determinant: one of three ready-made matrices with a variable entry x
 * in the bottom-right corner. Expanding along any row or column,
 * Δ = Σ (entry × cofactor), with cofactor Cᵢⱼ = (−1)^(i+j) Mᵢⱼ and the minor
 * Mᵢⱼ the 2 × 2 determinant left when row i and column j are struck out.
 *
 * Entries move in halves, so determinants, adjoints and Cramer's numerators
 * are exact; the tests check them against values worked by hand.
 */

export type Matrix2 = readonly [number, number, number, number];
export type Matrix3 = readonly [readonly [number, number, number], readonly [number, number, number], readonly [number, number, number]];

export type MatrixSource = "entries" | "rotation" | "reflection" | "shear" | "stretch";
export const MATRIX_SOURCE_ORDER: readonly MatrixSource[] = ["entries", "rotation", "reflection", "shear", "stretch"];

export type MatrixSecond = "rotate" | "reflect" | "shear" | "stretch";
export const MATRIX_SECOND_ORDER: readonly MatrixSecond[] = ["rotate", "reflect", "shear", "stretch"];
/** The second matrix B, row by row: [b₁₁, b₁₂, b₂₁, b₂₂]. */
export const MATRIX_SECOND: Record<MatrixSecond, { label: string; m: Matrix2 }> = {
  rotate: { label: "quarter turn", m: [0, -1, 1, 0] },
  reflect: { label: "reflect in x-axis", m: [1, 0, 0, -1] },
  shear: { label: "shear", m: [1, 1, 0, 1] },
  stretch: { label: "stretch x by 2", m: [2, 0, 0, 1] },
};

export type MatrixGrid = "counting" | "ncert" | "triangular";
export const MATRIX_GRID_ORDER: readonly MatrixGrid[] = ["counting", "ncert", "triangular"];
/** The 3 × 3 matrices, each with x in the bottom-right corner. */
export const MATRIX_GRIDS: Record<MatrixGrid, (x: number) => Matrix3> = {
  counting: (x) => [[1, 2, 3], [4, 5, 6], [7, 8, x]],
  ncert: (x) => [[1, 2, 4], [-1, 3, 0], [4, 1, x]],
  triangular: (x) => [[2, 1, 3], [0, 3, 5], [0, 0, x]],
};

export type MatrixExpand = "row" | "column";
export const MATRIX_EXPAND_ORDER: readonly MatrixExpand[] = ["row", "column"];

export type MatrixParams = { source: MatrixSource; second: MatrixSecond; grid3: MatrixGrid; expandBy: MatrixExpand };

/** Slider limits, shared with the renderer and the concept. */
export const MATRIX_ENTRY = 4;
export const MATRIX_K = 3;
export const MATRIX_POINT = 3;
export const MATRIX_RHS = 6;
export const MATRIX_X3 = 10;
/** Play turns θ at this rate, rad/s. */
export const MATRIX_TURN_RATE = Math.PI / 4;

export interface MatrixState {
  /** A = [a b; c d] when the source is "entries". */
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  /** The angle of a rotation, or of the mirror line of a reflection, rad. */
  readonly theta: number;
  /** The factor of a shear or a stretch. */
  readonly k: number;
  /** A point P to transform. */
  readonly px: number;
  readonly py: number;
  /** Right-hand sides of ax + by = e, cx + dy = f. */
  readonly e: number;
  readonly f: number;
  /** The variable entry of the 3 × 3 matrix, and the row or column to expand along (1–3). */
  readonly x3: number;
  readonly line: number;
}

export type MatrixResults = {
  source: number;
  /** The matrix A in use, row by row. */
  a11: number;
  a12: number;
  a21: number;
  a22: number;
  theta: number;
  thetaDeg: number;
  k: number;

  px: number;
  py: number;
  /** AP. */
  imageX: number;
  imageY: number;
  lengthIn: number;
  lengthOut: number;

  det: number;
  area: number;
  /** 1 keeps the picture the right way round, −1 flips it, 0 squashes it. */
  orientation: number;
  /** 2 the plane stays a plane, 1 squashed onto a line, 0 onto a point. */
  rank: number;
  trace: number;

  second: number;
  b11: number;
  b12: number;
  b21: number;
  b22: number;
  /** AB: B first, then A. */
  ab11: number;
  ab12: number;
  ab21: number;
  ab22: number;
  /** BA: A first, then B. */
  ba11: number;
  ba12: number;
  ba21: number;
  ba22: number;
  commute: number;
  detB: number;
  detAB: number;

  invertible: number;
  adj11: number;
  adj12: number;
  adj21: number;
  adj22: number;
  /** A⁻¹ = adj A / |A|; NaN (shown as "undefined") when |A| = 0, never a misleading 0. */
  inv11: number;
  inv12: number;
  inv21: number;
  inv22: number;

  /** The off-diagonal entries of Aᵀ (its diagonal is A's). */
  tr12: number;
  tr21: number;
  /** ½(A + Aᵀ) = [a₁₁ s; s a₂₂] and ½(A − Aᵀ) = [0 w; −w 0]: s and w. */
  sym12: number;
  skew12: number;
  /** 0 neither, 1 symmetric, 2 skew-symmetric, 3 both (only the zero matrix). */
  symmetry: number;
  /** Column 1 · column 2, and the columns' lengths. */
  columnDot: number;
  column1: number;
  column2: number;
  isOrthogonal: number;

  e: number;
  f: number;
  /** Cramer: D₁ = ed − bf and D₂ = af − ec; also (adj A)B = (D₁, D₂). */
  d1: number;
  d2: number;
  /** 0 one solution, 1 no solution, 2 infinitely many. */
  system: number;
  /** The solution, when there is exactly one; NaN (shown as "undefined") otherwise. */
  solX: number;
  solY: number;

  grid3: number;
  x3: number;
  g11: number;
  g12: number;
  g13: number;
  g21: number;
  g22: number;
  g23: number;
  g31: number;
  g32: number;
  g33: number;
  /** 0 along a row, 1 down a column; which one (1–3). */
  expandBy: number;
  line: number;
  /** Along the chosen line: the entries, their minors, cofactors and entry × cofactor. */
  le1: number;
  le2: number;
  le3: number;
  lm1: number;
  lm2: number;
  lm3: number;
  lc1: number;
  lc2: number;
  lc3: number;
  lt1: number;
  lt2: number;
  lt3: number;
  det3: number;
};

const OUTPUTS = [
  "source", "a11", "a12", "a21", "a22", "theta", "thetaDeg", "k",
  "px", "py", "imageX", "imageY", "lengthIn", "lengthOut",
  "det", "area", "orientation", "rank", "trace",
  "second", "b11", "b12", "b21", "b22", "ab11", "ab12", "ab21", "ab22", "ba11", "ba12", "ba21", "ba22", "commute", "detB", "detAB",
  "invertible", "adj11", "adj12", "adj21", "adj22", "inv11", "inv12", "inv21", "inv22",
  "tr12", "tr21", "sym12", "skew12", "symmetry", "columnDot", "column1", "column2", "isOrthogonal",
  "e", "f", "d1", "d2", "system", "solX", "solY",
  "grid3", "x3", "g11", "g12", "g13", "g21", "g22", "g23", "g31", "g32", "g33",
  "expandBy", "line", "le1", "le2", "le3", "lm1", "lm2", "lm3", "lc1", "lc2", "lc3", "lt1", "lt2", "lt3", "det3",
] as const satisfies readonly (keyof MatrixResults)[];

const EPS = 1e-9;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Float noise (0.5000000000000001, 6e-17) is cleaned away; −0 becomes 0. Genuine values such as 1/3 are kept. */
function clean(v: number): number {
  if (!Number.isFinite(v)) return 0;
  const r = Math.round(v * 1e9) / 1e9;
  return (Math.abs(r - v) < 1e-11 ? r : v) || 0;
}

/** The product of two 2 × 2 matrices, row by row. */
export function matrixMultiply2(p: Matrix2, q: Matrix2): Matrix2 {
  return [p[0] * q[0] + p[1] * q[2], p[0] * q[1] + p[1] * q[3], p[2] * q[0] + p[3] * q[2], p[2] * q[1] + p[3] * q[3]];
}

export const matrixDet2 = (m: Matrix2) => m[0] * m[3] - m[1] * m[2];

/** The minor Mᵢⱼ of a 3 × 3 matrix (i, j from 1): the determinant left when row i and column j are struck out. */
export function matrixMinor3(m: Matrix3, i: number, j: number): number {
  const rows = [0, 1, 2].filter((r) => r !== i - 1);
  const cols = [0, 1, 2].filter((c) => c !== j - 1);
  const [r0, r1] = rows as [number, number];
  const [c0, c1] = cols as [number, number];
  return m[r0]![c0]! * m[r1]![c1]! - m[r0]![c1]! * m[r1]![c0]!;
}

export const matrixCofactor3 = (m: Matrix3, i: number, j: number) => ((i + j) % 2 === 0 ? 1 : -1) * matrixMinor3(m, i, j);

/** Δ by the rule of Sarrus — independent of any expansion, so the expansions can be checked against it. */
export function matrixDet3(m: Matrix3): number {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  return a * e * i + b * f * g + c * d * h - c * e * g - a * f * h - b * d * i;
}

function gcd(x: number, y: number): number {
  let [p, q] = [Math.abs(x), Math.abs(y)];
  while (q) [p, q] = [q, p % q];
  return p;
}

/**
 * p/q as a fraction in lowest terms, denominator positive. Exact when p and q
 * are multiples of 1/1024 (every entry, determinant and Cramer numerator
 * here); otherwise the nearest fraction with denominator up to 1000.
 */
export function matrixRatio(p: number, q: number): { num: number; den: number } | null {
  if (Math.abs(q) < EPS) return null;
  const scale = 1024;
  const P = p * scale;
  const Q = q * scale;
  if (Math.abs(P - Math.round(P)) < 1e-6 && Math.abs(Q - Math.round(Q)) < 1e-6) {
    const [n, m] = [Math.round(P), Math.round(Q)];
    const g = gcd(n, m) || 1;
    const sign = m < 0 ? -1 : 1;
    return { num: (sign * n) / g || 0, den: (sign * m) / g };
  }
  const v = p / q;
  for (let den = 1; den <= 1000; den++) {
    const num = Math.round(v * den);
    if (Math.abs(num / den - v) < 1e-9) return { num: num || 0, den };
  }
  return null;
}

/** The matrix A for a source, row by row. */
export function matrixFromSource(source: MatrixSource, state: Pick<MatrixState, "a" | "b" | "c" | "d" | "theta" | "k">): Matrix2 {
  const t = state.theta;
  switch (source) {
    case "rotation":
      return [Math.cos(t), -Math.sin(t), Math.sin(t), Math.cos(t)];
    case "reflection":
      return [Math.cos(2 * t), Math.sin(2 * t), Math.sin(2 * t), -Math.cos(2 * t)];
    case "shear":
      return [1, state.k, 0, 1];
    case "stretch":
      return [state.k, 0, 0, 1];
    default:
      return [state.a, state.b, state.c, state.d];
  }
}

const sourceOf = (p: MatrixParams) => (MATRIX_SOURCE_ORDER.includes(p.source) ? p.source : "entries");
const secondOf = (p: MatrixParams) => (MATRIX_SECOND_ORDER.includes(p.second) ? p.second : "rotate");
const gridOf = (p: MatrixParams) => (MATRIX_GRID_ORDER.includes(p.grid3) ? p.grid3 : "counting");
const expandOf = (p: MatrixParams) => (MATRIX_EXPAND_ORDER.includes(p.expandBy) ? p.expandBy : "row");

/** θ brought into (−π, π]. */
function wrap(t: number): number {
  let v = t;
  while (v > Math.PI + 1e-12) v -= 2 * Math.PI;
  while (v <= -Math.PI + 1e-12) v += 2 * Math.PI;
  return v;
}

function clampState(s: MatrixState): MatrixState {
  const E = MATRIX_ENTRY;
  return {
    a: clamp(s.a, -E, E) || 0,
    b: clamp(s.b, -E, E) || 0,
    c: clamp(s.c, -E, E) || 0,
    d: clamp(s.d, -E, E) || 0,
    theta: clamp(s.theta, -Math.PI, Math.PI) || 0,
    k: clamp(s.k, -MATRIX_K, MATRIX_K) || 0,
    px: clamp(s.px, -MATRIX_POINT, MATRIX_POINT) || 0,
    py: clamp(s.py, -MATRIX_POINT, MATRIX_POINT) || 0,
    e: clamp(s.e, -MATRIX_RHS, MATRIX_RHS) || 0,
    f: clamp(s.f, -MATRIX_RHS, MATRIX_RHS) || 0,
    x3: clamp(s.x3, -MATRIX_X3, MATRIX_X3) || 0,
    line: Math.round(clamp(s.line, 1, 3)),
  };
}

export const matrixModel: SimulationModel<MatrixState, MatrixParams, MatrixResults> = {
  id: "matrix",
  defaultParams: { source: "entries", second: "rotate", grid3: "counting", expandBy: "row" },
  outputs: OUTPUTS,
  stateVariables: ["a", "b", "c", "d", "theta", "k", "px", "py", "e", "f", "x3", "line"],

  initialize() {
    return { a: 2, b: 1, c: 1, d: 3, theta: Math.PI / 6, k: 1, px: 1, py: 1, e: 5, f: 5, x3: 0, line: 1 };
  },

  /** Play turns θ: a rotation spins, a mirror line swings round. */
  advance(state, dt) {
    return { ...state, theta: wrap(state.theta + MATRIX_TURN_RATE * dt) };
  },

  /** A step turns θ by 15°. */
  step(state, _params, sign) {
    const step = Math.PI / 12;
    return { ...state, theta: wrap(Math.round(state.theta / step) * step + step * sign) };
  },

  derive(raw, params) {
    const s = clampState(raw);
    const sourceId = sourceOf(params);
    const A = matrixFromSource(sourceId, s).map(clean) as unknown as Matrix2;
    const [a11, a12, a21, a22] = A;
    const det = clean(matrixDet2(A));
    const singular = Math.abs(det) < EPS;

    const imageX = a11 * s.px + a12 * s.py;
    const imageY = a21 * s.px + a22 * s.py;

    const secondId = secondOf(params);
    const B = MATRIX_SECOND[secondId].m;
    const AB = matrixMultiply2(A, B);
    const BA = matrixMultiply2(B, A);
    const commute = AB.every((v, i) => Math.abs(v - BA[i]!) < EPS) ? 1 : 0;

    // Inverse by the adjoint.
    const adj: Matrix2 = [a22, -a12, -a21, a11];
    const inv: Matrix2 = singular ? [0, 0, 0, 0] : (adj.map((v) => v / det) as unknown as Matrix2);

    // Transpose, and the symmetric and skew-symmetric parts.
    const isSym = Math.abs(a12 - a21) < EPS;
    const isSkew = Math.abs(a11) < EPS && Math.abs(a22) < EPS && Math.abs(a12 + a21) < EPS;
    const column1 = Math.hypot(a11, a21);
    const column2 = Math.hypot(a12, a22);
    const columnDot = a11 * a12 + a21 * a22;
    const orthogonal = Math.abs(column1 * column1 - 1) < 1e-9 && Math.abs(column2 * column2 - 1) < 1e-9 && Math.abs(columnDot) < 1e-9;

    // The linear system AX = (e, f).
    const d1 = s.e * a22 - a12 * s.f;
    const d2 = a11 * s.f - s.e * a21;
    const zeroA = A.every((v) => Math.abs(v) < EPS);
    let system: number;
    if (!singular) system = 0;
    else if (zeroA) system = Math.abs(s.e) < EPS && Math.abs(s.f) < EPS ? 2 : 1;
    else system = Math.abs(d1) < EPS && Math.abs(d2) < EPS ? 2 : 1;

    // The 3 × 3 determinant, expanded along the chosen row or column.
    const gridId = gridOf(params);
    const G = MATRIX_GRIDS[gridId](s.x3);
    const expand = expandOf(params);
    const L = s.line;
    const at = (n: number): [number, number] => (expand === "row" ? [L, n] : [n, L]);
    const along = [1, 2, 3].map((n) => {
      const [i, j] = at(n);
      const entry = G[i - 1]![j - 1]!;
      const minor = matrixMinor3(G, i, j);
      const cofactor = matrixCofactor3(G, i, j);
      return { entry, minor, cofactor, term: entry * cofactor };
    });
    const [x1, x2, x3] = along as [(typeof along)[0], (typeof along)[0], (typeof along)[0]];

    const out: MatrixResults = {
      source: MATRIX_SOURCE_ORDER.indexOf(sourceId),
      a11,
      a12,
      a21,
      a22,
      theta: s.theta,
      thetaDeg: (s.theta * 180) / Math.PI,
      k: s.k,

      px: s.px,
      py: s.py,
      imageX,
      imageY,
      lengthIn: Math.hypot(s.px, s.py),
      lengthOut: Math.hypot(imageX, imageY),

      det,
      area: Math.abs(det),
      orientation: singular ? 0 : Math.sign(det),
      rank: !singular ? 2 : zeroA ? 0 : 1,
      trace: a11 + a22,

      second: MATRIX_SECOND_ORDER.indexOf(secondId),
      b11: B[0],
      b12: B[1],
      b21: B[2],
      b22: B[3],
      ab11: AB[0],
      ab12: AB[1],
      ab21: AB[2],
      ab22: AB[3],
      ba11: BA[0],
      ba12: BA[1],
      ba21: BA[2],
      ba22: BA[3],
      commute,
      detB: matrixDet2(B),
      detAB: matrixDet2(AB),

      invertible: singular ? 0 : 1,
      adj11: adj[0],
      adj12: adj[1],
      adj21: adj[2],
      adj22: adj[3],
      inv11: inv[0],
      inv12: inv[1],
      inv21: inv[2],
      inv22: inv[3],

      tr12: a21,
      tr21: a12,
      sym12: (a12 + a21) / 2,
      skew12: (a12 - a21) / 2,
      symmetry: isSym && isSkew ? 3 : isSym ? 1 : isSkew ? 2 : 0,
      columnDot,
      column1,
      column2,
      isOrthogonal: orthogonal ? 1 : 0,

      e: s.e,
      f: s.f,
      d1,
      d2,
      system,
      solX: system === 0 ? d1 / det : 0,
      solY: system === 0 ? d2 / det : 0,

      grid3: MATRIX_GRID_ORDER.indexOf(gridId),
      x3: s.x3,
      g11: G[0][0],
      g12: G[0][1],
      g13: G[0][2],
      g21: G[1][0],
      g22: G[1][1],
      g23: G[1][2],
      g31: G[2][0],
      g32: G[2][1],
      g33: G[2][2],
      expandBy: MATRIX_EXPAND_ORDER.indexOf(expand),
      line: L,
      le1: x1.entry,
      le2: x2.entry,
      le3: x3.entry,
      lm1: x1.minor,
      lm2: x2.minor,
      lm3: x3.minor,
      lc1: x1.cofactor,
      lc2: x2.cofactor,
      lc3: x3.cofactor,
      lt1: x1.term,
      lt2: x2.term,
      lt3: x3.term,
      det3: x1.term + x2.term + x3.term,
    };
    for (const key of OUTPUTS) out[key] = clean(out[key]);
    // No inverse, or no single solution: NaN, which the lab shows as "undefined" rather than 0.
    if (singular) out.inv11 = out.inv12 = out.inv21 = out.inv22 = Number.NaN;
    if (system !== 0) out.solX = out.solY = Number.NaN;
    return out;
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof MatrixState] : undefined;
  },

  setVariable(state, id, value) {
    switch (id) {
      case "a":
      case "b":
      case "c":
      case "d":
        return { ...state, [id]: clamp(value, -MATRIX_ENTRY, MATRIX_ENTRY) || 0 };
      case "theta": return { ...state, theta: clamp(value, -Math.PI, Math.PI) || 0 };
      case "k": return { ...state, k: clamp(value, -MATRIX_K, MATRIX_K) || 0 };
      case "px":
      case "py":
        return { ...state, [id]: clamp(value, -MATRIX_POINT, MATRIX_POINT) || 0 };
      case "e":
      case "f":
        return { ...state, [id]: clamp(value, -MATRIX_RHS, MATRIX_RHS) || 0 };
      case "x3": return { ...state, x3: clamp(value, -MATRIX_X3, MATRIX_X3) || 0 };
      case "line": return { ...state, line: Math.round(clamp(value, 1, 3)) };
      default: return state;
    }
  },
};

