import type { SimulationModel } from "@ise/science-engine";

/**
 * Compound angles, trigonometric equations and inverse functions.
 *
 * Compound angles: two angles A and B on the unit circle. Turning the radius
 * through A and then through B lands on the point for A + B, whose
 * x-coordinate is cos A cos B − sin A sin B: go cos B along the direction A,
 * then sin B at right angles to it, and add up how far each piece moves
 * sideways. NCERT's own proof is carried too: the chord from A to −B equals
 * the chord from A + B to 0, which gives cos(A + B) after squaring.
 *
 * Equations: the line y = k cuts y = sin x (or cos x, tan x) again and again.
 * With α the principal value of the inverse (sin⁻¹k, cos⁻¹k, tan⁻¹k) every
 * solution is x = nπ + (−1)ⁿα, x = 2nπ ± α or x = nπ + α. NCERT calls the
 * solutions in 0 ≤ x < 2π the principal solutions.
 *
 * Inverses: sin restricted to [−π/2, π/2], cos to [0, π] and tan to
 * (−π/2, π/2) are one-one, and their inverses return an angle in that
 * range — the principal value. sin⁻¹(sin θ) is θ only when θ is already in
 * the range. sin⁻¹u + cos⁻¹u = π/2, and tan⁻¹u + tan⁻¹v is
 * tan⁻¹((u + v)/(1 − uv)) when uv < 1, with π added (u > 0) or taken away
 * (u < 0) when uv > 1.
 *
 * Small angles: for θ in radians and small, sin θ ≈ θ, tan θ ≈ θ and
 * cos θ ≈ 1 − θ²/2. The model gives the true value, the approximation and
 * the percentage error |approximation − true| ÷ true × 100 for the function
 * chosen; θ − sin θ is 1% of sin θ at about 14°.
 *
 * Every angle is in radians; the …Deg outputs are the same angles in degrees.
 */

export type TrigPlusFunction = "sin" | "cos" | "tan";
export const TRIGPLUS_FUNCTIONS: readonly TrigPlusFunction[] = ["sin", "cos", "tan"];

const PI = Math.PI;
const TWO_PI = 2 * PI;
const DEG = 180 / PI;

/** The window of x shown for the equations, −5π/2 to 5π/2: n = −2 … 2 of the sine and tangent families fit inside. */
export const TRIGPLUS_WINDOW: readonly [number, number] = [-2.5 * PI, 2.5 * PI];

/** Below this, a number is zero; within this, two solutions are the same one. */
const TINY = 1e-12;
const SAME = 1e-7;
const tidy = (v: number) => (Math.abs(v) < TINY ? 0 : v);
/**
 * Slider values arrive as sums of steps (−2 + 300 × 0.01 …); snap a value within
 * 10⁻⁹ of a hundredth onto it, so that 1 is exactly 1. Exact values such as ⅓ or
 * √3/2 are left alone.
 */
const snap = (v: number) => {
  const r = Math.round(v * 100) / 100;
  return (Math.abs(v - r) < 1e-9 ? r : v) || 0;
};
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function trigPlusForward(f: TrigPlusFunction, x: number): number {
  if (f === "sin") return Math.sin(x);
  if (f === "cos") return Math.cos(x);
  return Math.tan(x);
}

/** Whether the inverse of f is defined at u: sin⁻¹ and cos⁻¹ need −1 ≤ u ≤ 1. */
export function trigPlusInDomain(f: TrigPlusFunction, u: number): boolean {
  return f === "tan" || Math.abs(u) <= 1 + 1e-12;
}

/** The principal value: sin⁻¹ in [−π/2, π/2], cos⁻¹ in [0, π], tan⁻¹ in (−π/2, π/2). NaN outside the domain. */
export function trigPlusInverse(f: TrigPlusFunction, u: number): number {
  if (!trigPlusInDomain(f, u)) return Number.NaN;
  if (f === "sin") return Math.asin(clamp(u, -1, 1));
  if (f === "cos") return Math.acos(clamp(u, -1, 1));
  return Math.atan(u);
}

/** The principal range of each inverse, as [low, high]. */
export const TRIGPLUS_RANGE: Record<TrigPlusFunction, readonly [number, number]> = {
  sin: [-PI / 2, PI / 2],
  cos: [0, PI],
  tan: [-PI / 2, PI / 2],
};

/**
 * The general solution of f(x) = f(α) for integer n:
 * sin: nπ + (−1)ⁿα; cos: 2nπ ± α (branch +1 or −1); tan: nπ + α.
 */
export function trigPlusGeneralSolution(f: TrigPlusFunction, alpha: number, n: number, branch: 1 | -1 = 1): number {
  if (f === "sin") return n * PI + (n % 2 === 0 ? 1 : -1) * alpha;
  if (f === "cos") return 2 * n * PI + branch * alpha;
  return n * PI + alpha;
}

/** Every solution of f(x) = k with lo ≤ x < hi, ascending, each counted once. */
export function trigPlusSolutionsIn(f: TrigPlusFunction, k: number, lo: number, hi: number): number[] {
  if (!trigPlusInDomain(f, k)) return [];
  const alpha = trigPlusInverse(f, k);
  const found: number[] = [];
  const reach = Math.ceil(Math.max(Math.abs(lo), Math.abs(hi)) / PI) + 2;
  for (let n = -reach; n <= reach; n++) {
    for (const branch of [1, -1] as const) {
      const x = tidy(trigPlusGeneralSolution(f, alpha, n, branch));
      if (x >= lo - SAME && x < hi - SAME && !found.some((y) => Math.abs(y - x) < SAME)) found.push(Math.max(x, lo));
    }
  }
  return found.sort((a, b) => a - b);
}

/** f⁻¹(f(θ)): the principal angle with the same sine (cosine, tangent) as θ. Undefined for tan at odd multiples of π/2. */
export function trigPlusFold(f: TrigPlusFunction, theta: number): { value: number; defined: boolean } {
  if (f === "tan") {
    if (Math.abs(Math.cos(theta)) < 1e-9) return { value: 0, defined: false };
    // θ less the nearest multiple of π.
    return { value: tidy(theta - Math.round(theta / PI) * PI), defined: true };
  }
  return { value: tidy(trigPlusInverse(f, trigPlusForward(f, theta))), defined: true };
}

/**
 * tan⁻¹u + tan⁻¹v against tan⁻¹((u + v)/(1 − uv)). The two agree when uv < 1;
 * when uv > 1 the sum is the formula's angle plus π (u > 0) or minus π (u < 0).
 * At uv = 1 the formula divides by zero and the sum is ±π/2.
 */
export function trigPlusTanSum(u: number, v: number): { sum: number; formula: number; correction: number; defined: boolean } {
  const sum = Math.atan(u) + Math.atan(v);
  const product = u * v;
  if (Math.abs(1 - product) < 1e-9) return { sum, formula: 0, correction: 0, defined: false };
  const formula = Math.atan((u + v) / (1 - product));
  const correction = product < 1 ? 0 : u > 0 ? 1 : -1;
  return { sum, formula, correction, defined: true };
}

export type TrigPlusParams = { func: TrigPlusFunction };

export interface TrigPlusState {
  /** The two angles of the compound-angle view, rad. */
  readonly A: number;
  readonly B: number;
  /** The level of the line y = k, and which member n of the general solution is marked. */
  readonly k: number;
  readonly n: number;
  /** The inputs of the inverse functions, and the angle fed through f then f⁻¹. */
  readonly u: number;
  readonly v: number;
  readonly theta: number;
  /** The angle of the small-angle view, rad (0 to 60°). Defaults to 10°. */
  readonly small?: number;
}

export type TrigPlusResults = {
  A: number;
  B: number;
  aDeg: number;
  bDeg: number;
  sinA: number;
  cosA: number;
  sinB: number;
  cosB: number;
  sum: number;
  sumDeg: number;
  /** cos(A + B) and sin(A + B), straight from the angle. */
  cosSum: number;
  sinSum: number;
  /** The pieces of the expansions, and the expansions themselves. */
  cosACosB: number;
  sinASinB: number;
  sinACosB: number;
  cosASinB: number;
  cosSumFormula: number;
  sinSumFormula: number;
  cosDiff: number;
  sinDiff: number;
  cosDiffFormula: number;
  sinDiffFormula: number;
  /** tan(A + B), and 0 for undefined when cos(A + B) = 0. */
  tanSum: number;
  tanSumDefined: number;
  /** NCERT's proof: the chord P₁P₃ (from A to −B) and the chord P₂P₄ (from A + B to 0). */
  chordP1P3: number;
  chordP2P4: number;
  /** Double and half angles. */
  sin2A: number;
  cos2A: number;
  sin2AFormula: number;
  cos2AForm1: number;
  cos2AForm2: number;
  cos2AForm3: number;
  sinHalfSq: number;
  halfFormula: number;
  pythagoras: number;

  /** 0 sin, 1 cos, 2 tan. */
  func: number;
  k: number;
  /** 1 when f(x) = k has solutions. */
  solvable: number;
  /** α = f⁻¹(k), the principal value; 0 when there is none. */
  alpha: number;
  alphaDeg: number;
  /** Solutions with 0 ≤ x < 2π: how many, and the first two (0 where missing). */
  principalCount: number;
  principal1: number;
  principal2: number;
  principal1Deg: number;
  principal2Deg: number;
  /** Solutions in the window −5π/2 ≤ x < 5π/2. */
  windowCount: number;
  n: number;
  /** The n-th member of the general solution (for cos, 2nπ + α and 2nπ − α). */
  solutionN: number;
  solutionNDeg: number;
  solutionNOther: number;
  solutionNOtherDeg: number;
  /** f at that solution — k again, whatever n is. */
  fAtSolution: number;

  u: number;
  /** 1 when f⁻¹(u) is defined (always, for tan). */
  inDomain: number;
  inverse: number;
  inverseDeg: number;
  /** f⁻¹(−u): −sin⁻¹u, π − cos⁻¹u, −tan⁻¹u. */
  inverseOfNeg: number;
  inverseOfNegDeg: number;
  /** sin⁻¹u, cos⁻¹u and their sum, when −1 ≤ u ≤ 1 (0 otherwise). */
  uInRange: number;
  asinU: number;
  acosU: number;
  complementSum: number;
  complementSumDeg: number;
  v: number;
  uv: number;
  atanU: number;
  atanV: number;
  atanSum: number;
  atanSumDeg: number;
  /** tan⁻¹((u + v)/(1 − uv)) and the multiple of π to add to it; 0 and undefined at uv = 1. */
  tanFormula: number;
  tanFormulaDeg: number;
  tanFormulaDefined: number;
  correction: number;
  theta: number;
  thetaDeg: number;
  /** f⁻¹(f(θ)), and whether it gives θ back. */
  fold: number;
  foldDeg: number;
  foldDefined: number;
  foldSame: number;

  /** Small angles: θ in degrees and radians, f(θ), its small-angle form (θ, θ or 1 − θ²/2) and the error in it, %. */
  smallDeg: number;
  smallRad: number;
  smallTrue: number;
  smallApprox: number;
  smallErrorPct: number;
};

const OUTPUTS = [
  "A", "B", "aDeg", "bDeg", "sinA", "cosA", "sinB", "cosB", "sum", "sumDeg", "cosSum", "sinSum",
  "cosACosB", "sinASinB", "sinACosB", "cosASinB", "cosSumFormula", "sinSumFormula", "cosDiff", "sinDiff", "cosDiffFormula", "sinDiffFormula",
  "tanSum", "tanSumDefined", "chordP1P3", "chordP2P4",
  "sin2A", "cos2A", "sin2AFormula", "cos2AForm1", "cos2AForm2", "cos2AForm3", "sinHalfSq", "halfFormula", "pythagoras",
  "func", "k", "solvable", "alpha", "alphaDeg", "principalCount", "principal1", "principal2", "principal1Deg", "principal2Deg",
  "windowCount", "n", "solutionN", "solutionNDeg", "solutionNOther", "solutionNOtherDeg", "fAtSolution",
  "u", "inDomain", "inverse", "inverseDeg", "inverseOfNeg", "inverseOfNegDeg", "uInRange", "asinU", "acosU", "complementSum", "complementSumDeg",
  "v", "uv", "atanU", "atanV", "atanSum", "atanSumDeg", "tanFormula", "tanFormulaDeg", "tanFormulaDefined", "correction",
  "theta", "thetaDeg", "fold", "foldDeg", "foldDefined", "foldSame",
  "smallDeg", "smallRad", "smallTrue", "smallApprox", "smallErrorPct",
] as const satisfies readonly (keyof TrigPlusResults)[];

/** Control ranges: A and B one turn, k and the inverse inputs a little past ±1, n from −2 to 2, θ two turns. */
export const TRIGPLUS_LIMITS = {
  A: [0, TWO_PI],
  B: [0, TWO_PI],
  k: [-2, 2],
  n: [-2, 2],
  u: [-3, 3],
  v: [-3, 3],
  theta: [-TWO_PI, TWO_PI],
  small: [0, PI / 3],
} as const satisfies Record<keyof TrigPlusState, readonly [number, number]>;

/** Play turns B at 30° a second, round and round. */
const TURN_RATE = PI / 6;
const STEP = PI / 12;

const SMALL_DEFAULT = PI / 18;

/** f(θ) and its small-angle form: sin θ ≈ θ, tan θ ≈ θ, cos θ ≈ 1 − θ²/2. */
export function trigPlusSmallAngle(f: TrigPlusFunction, theta: number): { exact: number; approx: number; errorPct: number } {
  const exact = trigPlusForward(f, theta);
  const approx = f === "cos" ? 1 - (theta * theta) / 2 : theta;
  const errorPct = Math.abs(exact) < 1e-12 ? 0 : (Math.abs(approx - exact) / Math.abs(exact)) * 100;
  return { exact: tidy(exact), approx: tidy(approx), errorPct: tidy(errorPct) };
}

const funcOf = (params: TrigPlusParams): TrigPlusFunction => (TRIGPLUS_FUNCTIONS.includes(params.func) ? params.func : "sin");
const deg = (rad: number) => tidy(rad * DEG);

export const trigPlusModel: SimulationModel<TrigPlusState, TrigPlusParams, TrigPlusResults> = {
  id: "trigplus",
  defaultParams: { func: "sin" },
  outputs: OUTPUTS,
  stateVariables: ["A", "B", "k", "n", "u", "v", "theta", "small"],

  initialize() {
    return { A: PI / 4, B: PI / 6, k: 0.5, n: 0, u: 0.5, v: 1 / 3, theta: (5 * PI) / 6, small: SMALL_DEFAULT };
  },

  advance(state, dt) {
    const B = (state.B + TURN_RATE * dt) % TWO_PI;
    return { ...state, B };
  },

  step(state, _params, sign) {
    const next = Math.round(state.B / STEP + sign) * STEP;
    return { ...state, B: next > TWO_PI + 1e-9 ? next - TWO_PI : next < -1e-9 ? next + TWO_PI : clamp(next, 0, TWO_PI) };
  },

  derive(state, params) {
    // ── Compound angles ──
    const A = clamp(state.A, 0, TWO_PI);
    const B = clamp(state.B, 0, TWO_PI);
    const sinA = tidy(Math.sin(A));
    const cosA = tidy(Math.cos(A));
    const sinB = tidy(Math.sin(B));
    const cosB = tidy(Math.cos(B));
    const cosSum = tidy(Math.cos(A + B));
    const sinSum = tidy(Math.sin(A + B));
    const tanSumDefined = Math.abs(Math.cos(A + B)) > 1e-9;
    const chord = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1);

    // ── Equations ──
    const f = funcOf(params);
    const k = snap(clamp(state.k, -2, 2));
    const n = Math.round(clamp(state.n, -2, 2)) || 0;
    const solvable = trigPlusInDomain(f, k);
    const alpha = solvable ? tidy(trigPlusInverse(f, k)) : 0;
    const principal = trigPlusSolutionsIn(f, k, 0, TWO_PI);
    const inWindow = trigPlusSolutionsIn(f, k, TRIGPLUS_WINDOW[0], TRIGPLUS_WINDOW[1]);
    const solutionN = solvable ? tidy(trigPlusGeneralSolution(f, alpha, n, 1)) : 0;
    const solutionNOther = solvable ? tidy(trigPlusGeneralSolution(f, alpha, n, -1)) : 0;

    // ── Inverses ──
    const u = snap(clamp(state.u, -3, 3));
    const v = snap(clamp(state.v, -3, 3));
    const inDomain = trigPlusInDomain(f, u);
    const inverse = inDomain ? tidy(trigPlusInverse(f, u)) : 0;
    const inverseOfNeg = inDomain ? tidy(trigPlusInverse(f, -u)) : 0;
    const uInRange = Math.abs(u) <= 1;
    const asinU = uInRange ? tidy(Math.asin(u)) : 0;
    const acosU = uInRange ? tidy(Math.acos(u)) : 0;
    const tan = trigPlusTanSum(u, v);
    const theta = clamp(state.theta, -TWO_PI, TWO_PI);
    const fold = trigPlusFold(f, theta);

    // ── Small angles ──
    const small = clamp(state.small ?? SMALL_DEFAULT, 0, PI / 3);
    const approximation = trigPlusSmallAngle(f, small);

    return {
      A,
      B,
      aDeg: deg(A),
      bDeg: deg(B),
      sinA,
      cosA,
      sinB,
      cosB,
      sum: A + B,
      sumDeg: deg(A + B),
      cosSum,
      sinSum,
      cosACosB: tidy(cosA * cosB),
      sinASinB: tidy(sinA * sinB),
      sinACosB: tidy(sinA * cosB),
      cosASinB: tidy(cosA * sinB),
      cosSumFormula: tidy(cosA * cosB - sinA * sinB),
      sinSumFormula: tidy(sinA * cosB + cosA * sinB),
      cosDiff: tidy(Math.cos(A - B)),
      sinDiff: tidy(Math.sin(A - B)),
      cosDiffFormula: tidy(cosA * cosB + sinA * sinB),
      sinDiffFormula: tidy(sinA * cosB - cosA * sinB),
      tanSum: tanSumDefined ? tidy(Math.tan(A + B)) : 0,
      tanSumDefined: tanSumDefined ? 1 : 0,
      chordP1P3: chord(cosA, sinA, cosB, -sinB),
      chordP2P4: chord(cosSum, sinSum, 1, 0),
      sin2A: tidy(Math.sin(2 * A)),
      cos2A: tidy(Math.cos(2 * A)),
      sin2AFormula: tidy(2 * sinA * cosA),
      cos2AForm1: tidy(cosA * cosA - sinA * sinA),
      cos2AForm2: tidy(2 * cosA * cosA - 1),
      cos2AForm3: tidy(1 - 2 * sinA * sinA),
      sinHalfSq: tidy(Math.sin(A / 2) ** 2),
      halfFormula: tidy((1 - cosA) / 2),
      pythagoras: sinA * sinA + cosA * cosA,

      func: TRIGPLUS_FUNCTIONS.indexOf(f),
      k,
      solvable: solvable ? 1 : 0,
      alpha,
      alphaDeg: deg(alpha),
      principalCount: principal.length,
      principal1: principal[0] ?? 0,
      principal2: principal[1] ?? 0,
      principal1Deg: deg(principal[0] ?? 0),
      principal2Deg: deg(principal[1] ?? 0),
      windowCount: inWindow.length,
      n,
      solutionN,
      solutionNDeg: deg(solutionN),
      solutionNOther,
      solutionNOtherDeg: deg(solutionNOther),
      fAtSolution: solvable ? tidy(snap(trigPlusForward(f, solutionN))) : 0,

      u,
      inDomain: inDomain ? 1 : 0,
      inverse,
      inverseDeg: deg(inverse),
      inverseOfNeg,
      inverseOfNegDeg: deg(inverseOfNeg),
      uInRange: uInRange ? 1 : 0,
      asinU,
      acosU,
      complementSum: uInRange ? asinU + acosU : 0,
      complementSumDeg: uInRange ? deg(asinU + acosU) : 0,
      v,
      uv: tidy(u * v),
      atanU: tidy(Math.atan(u)),
      atanV: tidy(Math.atan(v)),
      atanSum: tidy(tan.sum),
      atanSumDeg: deg(tan.sum),
      tanFormula: tidy(tan.formula),
      tanFormulaDeg: deg(tan.formula),
      tanFormulaDefined: tan.defined ? 1 : 0,
      correction: tan.correction,
      theta,
      thetaDeg: deg(theta),
      fold: fold.value,
      foldDeg: deg(fold.value),
      foldDefined: fold.defined ? 1 : 0,
      foldSame: fold.defined && Math.abs(fold.value - theta) < 1e-9 ? 1 : 0,

      smallDeg: deg(small),
      smallRad: small,
      smallTrue: approximation.exact,
      smallApprox: approximation.approx,
      smallErrorPct: approximation.errorPct,
    };
  },

  getVariable(state, id) {
    if (id === "small") return state.small ?? SMALL_DEFAULT;
    return id in state ? state[id as keyof TrigPlusState] : undefined;
  },

  setVariable(state, id, value) {
    if (!(id in TRIGPLUS_LIMITS) || !Number.isFinite(value)) return state;
    const [lo, hi] = TRIGPLUS_LIMITS[id as keyof TrigPlusState];
    const clamped = clamp(value, lo, hi);
    return { ...state, [id]: id === "n" ? Math.round(clamped) : clamped };
  },
};
