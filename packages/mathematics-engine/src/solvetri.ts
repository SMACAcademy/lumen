import type { SimulationModel } from "@ise/science-engine";

/**
 * Solving triangles: the properties of a triangle for class 11 (JEE), and
 * heights and distances.
 *
 * The triangle: two sides and the angle between them fix a triangle (SAS).
 * The usual names: side a = BC lies opposite angle A, b = CA opposite B and
 * c = AB opposite C. The cosine rule gives the third side,
 * c² = a² + b² − 2ab cos C, which is Pythagoras when C = 90°. The sine rule
 * says a/sin A = b/sin B = c/sin C, and that common ratio is 2R, the
 * diameter of the circle through all three corners.
 *
 * Area Δ = ½ab sin C, or Heron's √(s(s − a)(s − b)(s − c)) with
 * s = (a + b + c)/2. The circumradius R = abc/4Δ, the inradius r = Δ/s.
 * The centroid G, circumcentre O and orthocentre H lie on Euler's line,
 * with GH = 2·OG.
 *
 * The ambiguous case: an angle A, the side b next to it and the side a
 * opposite it (SSA). With h = b sin A, an acute A gives no triangle if
 * a < h, one right-angled triangle if a = h, two if h < a < b, and one if
 * a ≥ b. An obtuse A gives one triangle only if a > b.
 *
 * Heights and distances: a tower seen at an angle of elevation θ from a
 * point d away on level ground is d·tan θ tall. Seen from two points in
 * line at elevations α (nearer) and β (farther), a gap g apart, its foot is
 * x = g·tan β/(tan α − tan β) from the nearer point and its height x·tan α.
 * From the top of a lighthouse h tall, a ship at an angle of depression θ
 * is h/tan θ away — the depression from the top equals the elevation of
 * the top from the ship (alternate angles). Ground level, observers' eye
 * height ignored, as in NCERT.
 */

export type SolveTriSight = "tower" | "two-points" | "lighthouse";
export const SOLVETRI_SIGHT_ORDER: readonly SolveTriSight[] = ["tower", "two-points", "lighthouse"];

export type SolveTriParams = { sight: SolveTriSight };

export interface SolveTriState {
  /** The SAS triangle: sides a = BC and b = CA, and the angle C between them (degrees). */
  readonly a: number;
  readonly b: number;
  readonly angleC: number;
  /** The ambiguous case: angle A (degrees), the side b next to it, and the side a opposite it. */
  readonly ssaA: number;
  readonly ssaB: number;
  readonly ssaSide: number;
  /** Heights and distances: the nearer angle (elevation, or depression from a lighthouse), degrees. */
  readonly elev: number;
  /** The farther angle, degrees. */
  readonly far: number;
  /** Distance from the observer to the tower's foot, m. */
  readonly dist: number;
  /** Distance between the two observation points, m. */
  readonly gap: number;
  /** Height of the lighthouse, m. */
  readonly tall: number;
}

/** Each state variable's range: [min, max]. */
export const SOLVETRI_RANGES: Record<keyof SolveTriState, readonly [number, number]> = {
  a: [1, 10],
  b: [1, 10],
  angleC: [10, 170],
  ssaA: [10, 150],
  ssaB: [1, 12],
  ssaSide: [1, 12],
  elev: [10, 80],
  far: [10, 80],
  dist: [5, 100],
  gap: [5, 100],
  tall: [10, 150],
};

export type SolveTriResults = {
  // The SAS triangle.
  a: number;
  b: number;
  c: number;
  angleA: number;
  angleB: number;
  angleC: number;
  /** a/sin A, b/sin B, c/sin C: all equal to 2R. */
  ratioA: number;
  ratioB: number;
  ratioC: number;
  twoR: number;
  /** The cosine rule's three parts: c² = (a² + b²) − 2ab cos C. */
  cSquared: number;
  sumSquares: number;
  cosTerm: number;
  area: number;
  heron: number;
  semi: number;
  perimeter: number;
  circumR: number;
  inR: number;
  /** 0 acute, 1 right-angled, 2 obtuse (by the largest angle). */
  kind: number;
  /** Euler's line: OG, GH (= 2·OG) and OI (OI² = R² − 2Rr). */
  og: number;
  gh: number;
  oi: number;
  /** Corners and centres, with C at the origin and B along the x-axis. */
  ax: number;
  ay: number;
  bx: number;
  ox: number;
  oy: number;
  ix: number;
  iy: number;
  gx: number;
  gy: number;
  hx: number;
  hy: number;
  // The ambiguous case.
  ssaA: number;
  ssaB: number;
  ssaSide: number;
  /** b sin A: the shortest a can be. */
  ssaHeight: number;
  /** How many triangles fit: 0, 1 or 2. */
  ssaCount: number;
  /** Angle B and side c of each solution (0 where there is none); the first has the acute B. */
  ssaB1: number;
  ssaB2: number;
  ssaC1: number;
  ssaC2: number;
  // Heights and distances.
  sight: number;
  elev: number;
  far: number;
  sightHeight: number;
  /** Horizontal distance from the nearer point (or to the nearer ship). */
  sightNear: number;
  sightFar: number;
  /** The distance between the two points, or between the two ships. */
  sightGap: number;
  /** Length of the nearer line of sight. */
  sightLine: number;
  /** 0 when the two angles cannot belong to one picture (the farther must be the smaller). */
  sightOk: number;
};

const OUTPUTS = [
  "a", "b", "c", "angleA", "angleB", "angleC", "ratioA", "ratioB", "ratioC", "twoR",
  "cSquared", "sumSquares", "cosTerm", "area", "heron", "semi", "perimeter", "circumR", "inR", "kind",
  "og", "gh", "oi", "ax", "ay", "bx", "ox", "oy", "ix", "iy", "gx", "gy", "hx", "hy",
  "ssaA", "ssaB", "ssaSide", "ssaHeight", "ssaCount", "ssaB1", "ssaB2", "ssaC1", "ssaC2",
  "sight", "elev", "far", "sightHeight", "sightNear", "sightFar", "sightGap", "sightLine", "sightOk",
] as const satisfies readonly (keyof SolveTriResults)[];

const DEG = Math.PI / 180;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const within = (key: keyof SolveTriState, v: number) => clamp(Number.isFinite(v) ? v : SOLVETRI_RANGES[key][0], SOLVETRI_RANGES[key][0], SOLVETRI_RANGES[key][1]);
/** Rounding noise (cos 90° = 6 × 10⁻¹⁷) and −0 shown as a clean 0. */
const tidy = (v: number) => (Math.abs(v) < 1e-9 ? 0 : v) || 0;
/** The largest angle within this of 90° counts as a right angle. */
const RIGHT = 0.05;

const sightOf = (params: SolveTriParams): SolveTriSight => (SOLVETRI_SIGHT_ORDER.includes(params.sight) ? params.sight : "tower");

/** Solve the SSA case: angle A (degrees), side b next to it, side a opposite it. */
export function solveTriAmbiguous(angleA: number, b: number, a: number): { height: number; solutions: { angleB: number; c: number }[] } {
  const height = b * Math.sin(angleA * DEG);
  const sinB = height / a;
  const candidates: number[] = [];
  if (Math.abs(sinB - 1) <= 1e-9) candidates.push(90);
  else if (sinB < 1) {
    const acute = Math.asin(sinB) / DEG;
    candidates.push(acute, 180 - acute);
  }
  const solutions = candidates
    .filter((angleB) => angleA + angleB < 180 - 1e-6)
    .map((angleB) => ({ angleB, c: (a * Math.sin((180 - angleA - angleB) * DEG)) / Math.sin(angleA * DEG) }));
  return { height, solutions };
}

export const solveTriModel: SimulationModel<SolveTriState, SolveTriParams, SolveTriResults> = {
  id: "solvetri",
  defaultParams: { sight: "tower" },
  outputs: OUTPUTS,
  stateVariables: ["a", "b", "angleC", "ssaA", "ssaB", "ssaSide", "elev", "far", "dist", "gap", "tall"],

  initialize() {
    return { a: 4, b: 3, angleC: 90, ssaA: 30, ssaB: 10, ssaSide: 7, elev: 60, far: 30, dist: 30, gap: 20, tall: 75 };
  },

  /** Play opens angle C at 20° a second, and starts again from 10° after 170°. */
  advance(state, dt) {
    const next = within("angleC", state.angleC) + 20 * dt;
    return { ...state, angleC: next > SOLVETRI_RANGES.angleC[1] ? SOLVETRI_RANGES.angleC[0] : next };
  },

  /** Steps move angle C to the next multiple of 15°. */
  step(state, _params, sign) {
    const at = within("angleC", state.angleC);
    const next = sign > 0 ? Math.floor(at / 15 + 1e-9) * 15 + 15 : Math.ceil(at / 15 - 1e-9) * 15 - 15;
    return { ...state, angleC: within("angleC", next) };
  },

  derive(state, params) {
    // ── The SAS triangle ──
    const a = within("a", state.a);
    const b = within("b", state.b);
    const C = within("angleC", state.angleC);
    const cosC = Math.cos(C * DEG);
    const sinC = Math.sin(C * DEG);
    const cSquared = a * a + b * b - 2 * a * b * cosC;
    const c = Math.sqrt(Math.max(cSquared, 0));
    const A = Math.acos(clamp((b * b + c * c - a * a) / (2 * b * c), -1, 1)) / DEG;
    const B = 180 - A - C;
    const area = 0.5 * a * b * sinC;
    const semi = (a + b + c) / 2;
    const heron = Math.sqrt(Math.max(0, semi * (semi - a) * (semi - b) * (semi - c)));
    const circumR = (a * b * c) / (4 * area);
    const inR = area / semi;
    const largest = Math.max(A, B, C);
    const kind = Math.abs(largest - 90) <= RIGHT ? 1 : largest > 90 ? 2 : 0;

    // C at the origin, B = (a, 0), A = (b cos C, b sin C).
    const ax = b * cosC;
    const ay = b * sinC;
    const ox = a / 2;
    const oy = (b * b - a * ax) / (2 * ay);
    const gx = (ax + a) / 3;
    const gy = ay / 3;
    const ix = (a * ax + b * a) / (2 * semi);
    const iy = (a * ay) / (2 * semi);
    const hx = ax + a - 2 * ox;
    const hy = ay - 2 * oy;

    // ── The ambiguous case ──
    const ssaA = within("ssaA", state.ssaA);
    const ssaB = within("ssaB", state.ssaB);
    const ssaSide = within("ssaSide", state.ssaSide);
    const ssa = solveTriAmbiguous(ssaA, ssaB, ssaSide);
    const [first, second] = ssa.solutions;

    // ── Heights and distances ──
    const sightId = sightOf(params);
    const elev = within("elev", state.elev);
    const far = within("far", state.far);
    const dist = within("dist", state.dist);
    const gap = within("gap", state.gap);
    const tall = within("tall", state.tall);
    const tanNear = Math.tan(elev * DEG);
    const tanFar = Math.tan(far * DEG);
    let sightHeight = 0;
    let sightNear = 0;
    let sightFar = 0;
    let sightGap = 0;
    let sightOk = 1;
    if (sightId === "tower") {
      sightNear = dist;
      sightFar = dist;
      sightHeight = dist * tanNear;
    } else if (sightId === "two-points") {
      if (elev > far) {
        sightNear = (gap * tanFar) / (tanNear - tanFar);
        sightFar = sightNear + gap;
        sightHeight = sightNear * tanNear;
        sightGap = gap;
      } else sightOk = 0;
    } else {
      sightHeight = tall;
      sightNear = tall / tanNear;
      sightFar = tall / tanFar;
      if (elev > far) sightGap = sightFar - sightNear;
      else sightOk = 0;
    }

    return {
      a,
      b,
      c,
      angleA: A,
      angleB: B,
      angleC: C,
      ratioA: a / Math.sin(A * DEG),
      ratioB: b / Math.sin(B * DEG),
      ratioC: c / sinC,
      twoR: 2 * circumR,
      cSquared: tidy(cSquared),
      sumSquares: a * a + b * b,
      cosTerm: tidy(2 * a * b * cosC),
      area,
      heron,
      semi,
      perimeter: 2 * semi,
      circumR,
      inR,
      kind,
      og: tidy(Math.hypot(gx - ox, gy - oy)),
      gh: tidy(Math.hypot(hx - gx, hy - gy)),
      oi: tidy(Math.hypot(ix - ox, iy - oy)),
      ax: tidy(ax),
      ay,
      bx: a,
      ox,
      oy: tidy(oy),
      ix,
      iy,
      gx,
      gy,
      hx: tidy(hx),
      hy: tidy(hy),
      ssaA,
      ssaB,
      ssaSide,
      ssaHeight: ssa.height,
      ssaCount: ssa.solutions.length,
      ssaB1: first?.angleB ?? 0,
      ssaB2: second?.angleB ?? 0,
      ssaC1: tidy(first?.c ?? 0),
      ssaC2: tidy(second?.c ?? 0),
      sight: SOLVETRI_SIGHT_ORDER.indexOf(sightId),
      elev,
      far,
      sightHeight,
      sightNear,
      sightFar,
      sightGap,
      sightLine: Math.hypot(sightHeight, sightNear),
      sightOk,
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof SolveTriState] : undefined;
  },

  setVariable(state, id, value) {
    if (!(id in SOLVETRI_RANGES)) return state;
    const key = id as keyof SolveTriState;
    return { ...state, [key]: within(key, value) };
  },
};
