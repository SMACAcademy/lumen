import type { SimulationModel } from "@ise/science-engine";

/**
 * Lines and circles (NCERT class 11, chapter 9 "Straight Lines" and the
 * circle of chapter 10 "Conic Sections", with the JEE extras).
 *
 * Lines are written in general form, Ax + By + C = 0, so a vertical line
 * (B = 0) is an ordinary member and needs no special case in the sums. Its
 * slope is m = −A/B when B ≠ 0.
 *
 * Angle between two lines: the acute angle θ with
 * tan θ = |(m₁ − m₂)/(1 + m₁m₂)|. In the coefficients that is
 * tan θ = |A₁B₂ − A₂B₁| / |A₁A₂ + B₁B₂|, which also covers a vertical line.
 * Parallel when A₁B₂ = A₂B₁ (m₁ = m₂); perpendicular when A₁A₂ + B₁B₂ = 0
 * (m₁m₂ = −1). The lines meet at Cramer's point
 * ((B₁C₂ − B₂C₁)/(A₁B₂ − A₂B₁), (C₁A₂ − C₂A₁)/(A₁B₂ − A₂B₁)).
 *
 * Distance from (x₁, y₁) to the first line: |Ax₁ + By₁ + C|/√(A² + B²). The
 * foot of the perpendicular is (x₁ − At, y₁ − Bt) with
 * t = (Ax₁ + By₁ + C)/(A² + B²). Two parallel lines, rescaled to the same A
 * and B, are |C₁ − C₂|/√(A² + B²) apart.
 *
 * Family of lines: L₁ + λL₂ = 0 is a line through the point where L₁ and L₂
 * meet, for every λ; sliding λ turns it about that point.
 *
 * Circle: (x − h)² + (y − k)² = r², or in general form
 * x² + y² + 2gx + 2fy + c = 0 with centre (−g, −f) and r² = g² + f² − c.
 * When g² + f² − c is zero the "circle" is a single point; when it is
 * negative there is no real circle at all.
 *
 * A line against the circle: the centre's distance d from the line decides —
 * d < r it cuts (a chord of length 2√(r² − d²)), d = r it touches, d > r it
 * misses. Equivalently, the quadratic left after substituting the line into
 * the circle has a positive, zero or negative discriminant; for y = mx + c
 * meeting x² + y² = r² that discriminant is 4[r²(1 + m²) − c²], so the line
 * touches exactly when c² = r²(1 + m²).
 *
 * Tangent at a point (x₁, y₁) of the circle: xx₁ + yy₁ + g(x + x₁) +
 * f(y + y₁) + c = 0 (xx₁ + yy₁ = r² for a circle at the origin); the normal
 * there passes through the centre. From an outside point P the tangent has
 * length √S₁, S₁ = x₁² + y₁² + 2gx₁ + 2fy₁ + c: S₁ > 0 outside, 0 on,
 * < 0 inside.
 *
 * Two circles S₁ = 0, S₂ = 0: by the gap between their centres against
 * r₁ + r₂ and |r₁ − r₂| they lie apart (4 common tangents), touch outside
 * (3), cut (2), touch inside (1) or one lies inside the other (0). Their
 * radical axis S₁ − S₂ = 0 is a straight line at right angles to the line
 * of centres; when they cut it is the common chord.
 *
 * Family of circles: S + λL = 0 is a circle through the points where the
 * line L (the first line) meets S, for every λ.
 *
 * The forms of a line (the foundation): the line through two points
 * A(x₁, y₁) and B(x₂, y₂) has slope m = (y₂ − y₁)/(x₂ − x₁) = tan θ, θ its
 * inclination in [0°, 180°); x₁ = x₂ makes it vertical, θ = 90° and the slope
 * undefined. Its general form Ax + By + C = 0 has A = y₂ − y₁, B = x₁ − x₂,
 * C = x₂y₁ − x₁y₂, scaled here to the smallest whole numbers with A > 0 (or
 * A = 0, B > 0) when the numbers allow. Then the slope is −A/B and the
 * intercepts are −C/A on the x-axis and −C/B on the y-axis. Its normal form
 * x cos ω + y sin ω = p takes p = |C|/√(A² + B²) ≥ 0, the length of the
 * perpendicular from the origin, and ω the angle that perpendicular makes
 * with the x-axis (for a line through the origin, p = 0 and ω is taken in
 * [0°, 180°)). A third point P lies on AB — the three are collinear — when
 * (x₂ − x₁)(y_P − y₁) = (y₂ − y₁)(x_P − x₁), that is slope AP = slope AB.
 *
 * Every number is computed exactly from these formulas; the tests check them
 * against values worked by hand.
 */

export type CircleLineForm = "centre" | "general";
export type CircleLineParams = {
  /** How the first circle is given: by centre and radius, or by g, f and c. */
  form: CircleLineForm;
};

export interface CircleLineState {
  /** The two lines A₁x + B₁y + C₁ = 0 and A₂x + B₂y + C₂ = 0. */
  readonly a1: number;
  readonly b1: number;
  readonly c1: number;
  readonly a2: number;
  readonly b2: number;
  readonly c2: number;
  /** A point P, for distances and for tangents from outside. */
  readonly px: number;
  readonly py: number;
  /** λ of the families L₁ + λL₂ = 0 and S + λL₁ = 0. */
  readonly lam: number;
  /** The first circle by centre and radius … */
  readonly h: number;
  readonly k: number;
  readonly r: number;
  /** … or by x² + y² + 2gx + 2fy + c = 0. */
  readonly g: number;
  readonly f: number;
  readonly c: number;
  /** Where on the first circle the tangent is drawn, as an angle from its centre. */
  readonly phi: number;
  /** The second circle, by centre and radius. */
  readonly h2: number;
  readonly k2: number;
  readonly r2: number;
  /** Two points A(x₁, y₁) and B(x₂, y₂) fixing a line, for its forms. */
  readonly ax: number;
  readonly ay: number;
  readonly bx: number;
  readonly by: number;
}

export type CircleLineResults = {
  /** The two lines' coefficients, as used. */
  a1: number;
  b1: number;
  c1: number;
  a2: number;
  b2: number;
  c2: number;
  line1Valid: number;
  line2Valid: number;
  m1: number;
  m2: number;
  vertical1: number;
  vertical2: number;
  /** The first line's y-intercept −C/B (0 when vertical). */
  intercept1: number;
  /** m₁m₂ when neither line is vertical, else 0. */
  slopeProduct: number;
  /** The acute angle between the lines, in rad and in degrees. */
  angle: number;
  angleDeg: number;
  /** tan θ; 0 when the lines are perpendicular (tan 90° is undefined). */
  tanAngle: number;
  /** 0 meet at an angle, 1 parallel, 2 perpendicular, 3 the same line. */
  lineRelation: number;
  meets: number;
  meetX: number;
  meetY: number;
  px: number;
  py: number;
  /** Distance from P to the first line, and the foot of the perpendicular. */
  distance: number;
  footX: number;
  footY: number;
  /** Sign of A·px + B·py + C: which side of the first line P is on. */
  side: number;
  /** Distance between the lines when parallel, else 0. */
  parallelDistance: number;
  lam: number;
  famA: number;
  famB: number;
  famC: number;
  famValid: number;
  famVertical: number;
  famSlope: number;
  /** The first circle. */
  form: number;
  cx: number;
  cy: number;
  radius: number;
  rSquared: number;
  /** 1 a real circle, 0 a point circle, −1 not a real circle. */
  circleKind: number;
  circleG: number;
  circleF: number;
  circleC: number;
  /** The first line against the first circle. */
  centreDistance: number;
  meetCount: number;
  chord: number;
  /** Discriminant of the quadratic left after substituting the line into the circle (in x; in y for a vertical line). */
  discriminant: number;
  cut1x: number;
  cut1y: number;
  cut2x: number;
  cut2y: number;
  /** The tangent and normal at the point at angle φ on the circle. */
  phi: number;
  tx: number;
  ty: number;
  tangentA: number;
  tangentB: number;
  tangentC: number;
  tangentVertical: number;
  tangentSlope: number;
  normalVertical: number;
  normalSlope: number;
  /** P against the circle: S₁, and the tangent length √S₁ from outside. */
  s1: number;
  pointPosition: number;
  tangentLength: number;
  contact1x: number;
  contact1y: number;
  contact2x: number;
  contact2y: number;
  /** The second circle and the radical axis S₁ − S₂ = 0. */
  cx2: number;
  cy2: number;
  radius2: number;
  centreGap: number;
  /** 0 apart, 1 touching outside, 2 cutting, 3 touching inside, 4 one inside the other, 5 the same circle. */
  circlesRelation: number;
  commonTangents: number;
  radicalExists: number;
  radicalA: number;
  radicalB: number;
  radicalC: number;
  /** Where the radical axis crosses the x-axis (0 when it is horizontal). */
  radicalX: number;
  commonChord: number;
  /** The member of S + λL₁ = 0. */
  famCx: number;
  famCy: number;
  famRSquared: number;
  famR: number;
  famKind: number;
  famConst: number;
  /** The line through A and B: its forms (see the header). */
  ax: number;
  ay: number;
  bx: number;
  by: number;
  /** 1 when A and B differ, so they fix a line. */
  abValid: number;
  abVertical: number;
  /** (y₂ − y₁)/(x₂ − x₁); 0 when vertical (the slope is then undefined). */
  abSlope: number;
  /** The inclination θ in degrees, 0 ≤ θ < 180; 90 when vertical. */
  abInclination: number;
  /** General form Ax + By + C = 0, in the smallest whole numbers with A > 0 (or A = 0, B > 0). */
  abA: number;
  abB: number;
  abC: number;
  /** −C/A, where the line crosses the x-axis; 0 with abHasXIntercept = 0 when it is horizontal. */
  abXIntercept: number;
  abHasXIntercept: number;
  /** −C/B, where it crosses the y-axis; 0 with abHasYIntercept = 0 when it is vertical. */
  abYIntercept: number;
  abHasYIntercept: number;
  /** Normal form x cos ω + y sin ω = p: p ≥ 0, ω in degrees in [0, 360). */
  abNormalP: number;
  abNormalDeg: number;
  /** The foot of the perpendicular from the origin, (p cos ω, p sin ω). */
  abFootX: number;
  abFootY: number;
  /** 1 when P lies on the line AB (A, B and P collinear). */
  abCollinear: number;
  /** Area of the triangle ABP, ½|(x₂ − x₁)(y_P − y₁) − (y₂ − y₁)(x_P − x₁)|. */
  abpArea: number;
};

const OUTPUTS = [
  "a1", "b1", "c1", "a2", "b2", "c2", "line1Valid", "line2Valid", "m1", "m2", "vertical1", "vertical2", "intercept1", "slopeProduct", "angle", "angleDeg", "tanAngle", "lineRelation", "meets", "meetX", "meetY",
  "px", "py", "distance", "footX", "footY", "side", "parallelDistance",
  "lam", "famA", "famB", "famC", "famValid", "famVertical", "famSlope",
  "form", "cx", "cy", "radius", "rSquared", "circleKind", "circleG", "circleF", "circleC",
  "centreDistance", "meetCount", "chord", "discriminant", "cut1x", "cut1y", "cut2x", "cut2y",
  "phi", "tx", "ty", "tangentA", "tangentB", "tangentC", "tangentVertical", "tangentSlope", "normalVertical", "normalSlope",
  "s1", "pointPosition", "tangentLength", "contact1x", "contact1y", "contact2x", "contact2y",
  "cx2", "cy2", "radius2", "centreGap", "circlesRelation", "commonTangents", "radicalExists", "radicalA", "radicalB", "radicalC", "radicalX", "commonChord",
  "famCx", "famCy", "famRSquared", "famR", "famKind", "famConst",
  "ax", "ay", "bx", "by", "abValid", "abVertical", "abSlope", "abInclination", "abA", "abB", "abC",
  "abXIntercept", "abHasXIntercept", "abYIntercept", "abHasYIntercept", "abNormalP", "abNormalDeg", "abFootX", "abFootY", "abCollinear", "abpArea",
] as const satisfies readonly (keyof CircleLineResults)[];

/** The plane the lab draws on runs from −10 to 10 both ways. */
export const CIRCLE_LINE_EXTENT = 10;

/** The range of every state variable: [min, max]. setVariable clamps to these. */
export const CIRCLE_LINE_RANGES: Record<keyof CircleLineState, readonly [number, number]> = {
  a1: [-10, 10],
  b1: [-10, 10],
  c1: [-30, 30],
  a2: [-10, 10],
  b2: [-10, 10],
  c2: [-30, 30],
  px: [-10, 10],
  py: [-10, 10],
  lam: [-10, 10],
  h: [-8, 8],
  k: [-8, 8],
  r: [0.5, 10],
  g: [-8, 8],
  f: [-8, 8],
  c: [-50, 50],
  phi: [0, 2 * Math.PI],
  h2: [-8, 8],
  k2: [-8, 8],
  r2: [0.5, 10],
  ax: [-10, 10],
  ay: [-10, 10],
  bx: [-10, 10],
  by: [-10, 10],
};

const EPS = 1e-9;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Tidy away rounding dust and −0, so 6e-17 reads as 0. */
const clean = (v: number) => (Math.abs(v) < 1e-12 ? 0 : v);
const sign = (v: number) => (Math.abs(v) <= EPS ? 0 : Math.sign(v));

export const CIRCLE_LINE_DEFAULT_STATE: CircleLineState = {
  a1: 1,
  b1: -1,
  c1: 1,
  a2: 1,
  b2: 2,
  c2: -8,
  px: 4,
  py: -2,
  lam: 1,
  h: 0,
  k: 0,
  r: 4,
  g: -2,
  f: 3,
  c: -12,
  phi: Math.PI / 4,
  h2: 5,
  k2: 0,
  r2: 3,
  ax: -2,
  ay: 1,
  bx: 2,
  by: 4,
};

interface Circle {
  h: number;
  k: number;
  rSq: number;
  g: number;
  f: number;
  c: number;
}

/** Greatest common divisor of whole numbers (0 when all are 0). */
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

/**
 * Ax + By + C = 0 in its tidiest form: the smallest whole numbers when some
 * multiple up to 100 makes all three whole, else scaled so A² + B² = 1; then
 * signed so A > 0, or A = 0 and B > 0.
 */
function tidyLine(a: number, b: number, c: number): [number, number, number] {
  let out: [number, number, number] = [a, b, c];
  const whole = (v: number) => Math.abs(v - Math.round(v)) <= 1e-9 * Math.max(1, Math.abs(v));
  let scaled = false;
  for (let k = 1; k <= 100 && !scaled; k++) {
    if ([a, b, c].every((v) => whole(k * v))) {
      const ints = [a, b, c].map((v) => Math.round(k * v)) as [number, number, number];
      const d = gcd(gcd(ints[0], ints[1]), ints[2]) || 1;
      out = ints.map((v) => v / d) as [number, number, number];
      scaled = true;
    }
  }
  if (!scaled) {
    const n = Math.hypot(a, b) || 1;
    out = [a / n, b / n, c / n];
  }
  const flip = Math.abs(out[0]) > EPS ? out[0] < 0 : out[1] < 0;
  return flip ? [-out[0], -out[1], -out[2]] : out;
}

const formOf = (params: CircleLineParams): CircleLineForm => (params.form === "general" ? "general" : "centre");

function firstCircle(s: CircleLineState, form: CircleLineForm): Circle {
  if (form === "general") {
    const g = clamp(s.g, ...CIRCLE_LINE_RANGES.g);
    const f = clamp(s.f, ...CIRCLE_LINE_RANGES.f);
    const c = clamp(s.c, ...CIRCLE_LINE_RANGES.c);
    return { h: -g, k: -f, rSq: g * g + f * f - c, g, f, c };
  }
  const h = clamp(s.h, ...CIRCLE_LINE_RANGES.h);
  const k = clamp(s.k, ...CIRCLE_LINE_RANGES.k);
  const r = clamp(s.r, ...CIRCLE_LINE_RANGES.r);
  return { h, k, rSq: r * r, g: -h, f: -k, c: h * h + k * k - r * r };
}

export const circleLineModel: SimulationModel<CircleLineState, CircleLineParams, CircleLineResults> = {
  id: "circleline",
  defaultParams: { form: "centre" },
  outputs: OUTPUTS,
  stateVariables: Object.keys(CIRCLE_LINE_RANGES),

  initialize() {
    return { ...CIRCLE_LINE_DEFAULT_STATE };
  },

  /** Play walks the tangent point round the circle, half a radian a second. */
  advance(state, dt) {
    const turn = 2 * Math.PI;
    return { ...state, phi: (((state.phi + 0.5 * dt) % turn) + turn) % turn };
  },

  step(state, _params, dir) {
    const notch = Math.PI / 12;
    const next = Math.round(state.phi / notch) + dir;
    return { ...state, phi: ((next % 24) + 24) % 24 * notch };
  },

  derive(state, params) {
    const s = state;
    const [a1, b1, c1, a2, b2, c2] = (["a1", "b1", "c1", "a2", "b2", "c2"] as const).map((id) => clamp(s[id], ...CIRCLE_LINE_RANGES[id])) as [number, number, number, number, number, number];
    const px = clamp(s.px, ...CIRCLE_LINE_RANGES.px);
    const py = clamp(s.py, ...CIRCLE_LINE_RANGES.py);
    const lam = clamp(s.lam, ...CIRCLE_LINE_RANGES.lam);
    const n1 = a1 * a1 + b1 * b1;
    const n2 = a2 * a2 + b2 * b2;
    const valid1 = n1 > EPS;
    const valid2 = n2 > EPS;

    // ── Two lines ────────────────────────────────────────────────────────
    const vertical1 = valid1 && Math.abs(b1) <= EPS;
    const vertical2 = valid2 && Math.abs(b2) <= EPS;
    const m1 = valid1 && !vertical1 ? -a1 / b1 : 0;
    const m2 = valid2 && !vertical2 ? -a2 / b2 : 0;
    const cross = a1 * b2 - a2 * b1;
    const dot = a1 * a2 + b1 * b2;
    let lineRelation = 0;
    let meets = 0;
    let meetX = 0;
    let meetY = 0;
    if (valid1 && valid2) {
      if (Math.abs(cross) <= EPS) {
        const same = Math.abs(a1 * c2 - a2 * c1) <= EPS && Math.abs(b1 * c2 - b2 * c1) <= EPS;
        lineRelation = same ? 3 : 1;
      } else {
        lineRelation = Math.abs(dot) <= EPS ? 2 : 0;
        meets = 1;
        meetX = (b1 * c2 - b2 * c1) / cross;
        meetY = (c1 * a2 - c2 * a1) / cross;
      }
    }
    const parallel = lineRelation === 1 || lineRelation === 3;
    const angle = valid1 && valid2 && !parallel ? Math.atan2(Math.abs(cross), Math.abs(dot)) : 0;
    const tanAngle = valid1 && valid2 && !parallel && Math.abs(dot) > EPS ? Math.abs(cross) / Math.abs(dot) : 0;

    // ── Distance from P ──────────────────────────────────────────────────
    const value1 = a1 * px + b1 * py + c1;
    const t = valid1 ? value1 / n1 : 0;
    const distance = valid1 ? Math.abs(value1) / Math.sqrt(n1) : 0;
    let parallelDistance = 0;
    if (valid1 && valid2 && parallel) {
      // Rescale the second line to share the first one's A and B.
      const scale = Math.abs(a2) > EPS ? a1 / a2 : b1 / b2;
      parallelDistance = Math.abs(c1 - scale * c2) / Math.sqrt(n1);
    }

    // ── L₁ + λL₂ = 0 ─────────────────────────────────────────────────────
    const famA = a1 + lam * a2;
    const famB = b1 + lam * b2;
    const famC = c1 + lam * c2;
    const famValid = famA * famA + famB * famB > EPS;
    const famVertical = famValid && Math.abs(famB) <= EPS;

    // ── The first circle ─────────────────────────────────────────────────
    const form = formOf(params);
    const circle = firstCircle(s, form);
    const { h, k, rSq } = circle;
    const circleKind = rSq > EPS ? 1 : rSq >= -EPS ? 0 : -1;
    const real = circleKind === 1;
    const r = real ? Math.sqrt(rSq) : 0;

    // ── The first line against the circle ────────────────────────────────
    const atCentre = a1 * h + b1 * k + c1;
    const centreDistance = valid1 ? Math.abs(atCentre) / Math.sqrt(n1) : 0;
    let meetCount = 0;
    let chord = 0;
    let discriminant = 0;
    let cut1x = 0;
    let cut1y = 0;
    let cut2x = 0;
    let cut2y = 0;
    if (valid1 && real) {
      // r²(A² + B²) − (Ah + Bk + C)²: the discriminant's sign, without square roots.
      const q = rSq * n1 - atCentre * atCentre;
      discriminant = (4 * q) / (Math.abs(b1) > EPS ? b1 * b1 : a1 * a1);
      meetCount = q > EPS ? 2 : q >= -EPS ? 1 : 0;
      if (meetCount > 0) {
        const tc = atCentre / n1;
        const fx = h - a1 * tc;
        const fy = k - b1 * tc;
        const half = meetCount === 2 ? Math.sqrt(q / n1) : 0;
        const ux = -b1 / Math.sqrt(n1);
        const uy = a1 / Math.sqrt(n1);
        chord = 2 * half;
        cut1x = fx - half * ux;
        cut1y = fy - half * uy;
        cut2x = fx + half * ux;
        cut2y = fy + half * uy;
      }
    }

    // ── Tangent and normal at the point at angle φ ───────────────────────
    const phi = clamp(s.phi, ...CIRCLE_LINE_RANGES.phi);
    const cos = clean(Math.cos(phi));
    const sin = clean(Math.sin(phi));
    const tx = real ? h + r * cos : 0;
    const ty = real ? k + r * sin : 0;
    const tangentVertical = real && Math.abs(sin) <= EPS;
    const normalVertical = real && Math.abs(cos) <= EPS;

    // ── P against the circle ─────────────────────────────────────────────
    const s1 = (px - h) ** 2 + (py - k) ** 2 - rSq;
    const pointPosition = circleKind === -1 ? 0 : sign(s1);
    const outside = real && pointPosition === 1;
    let contacts = [0, 0, 0, 0];
    if (outside) {
      const gap = Math.hypot(px - h, py - k);
      const beta = Math.atan2(py - k, px - h);
      const alpha = Math.acos(clamp(r / gap, -1, 1));
      contacts = [h + r * Math.cos(beta + alpha), k + r * Math.sin(beta + alpha), h + r * Math.cos(beta - alpha), k + r * Math.sin(beta - alpha)];
    }

    // ── The second circle and the radical axis ───────────────────────────
    const h2 = clamp(s.h2, ...CIRCLE_LINE_RANGES.h2);
    const k2 = clamp(s.k2, ...CIRCLE_LINE_RANGES.k2);
    const r2 = clamp(s.r2, ...CIRCLE_LINE_RANGES.r2);
    const g2 = -h2;
    const f2 = -k2;
    const cc2 = h2 * h2 + k2 * k2 - r2 * r2;
    const centreGap = Math.hypot(h2 - h, k2 - k);
    let circlesRelation = 0;
    let commonTangents = 0;
    let radicalExists = 0;
    let radicalA = 0;
    let radicalB = 0;
    let radicalC = 0;
    let radicalX = 0;
    let commonChord = 0;
    if (real) {
      const sum = r + r2;
      const diff = Math.abs(r - r2);
      if (centreGap <= EPS && diff <= EPS) circlesRelation = 5;
      else if (centreGap > sum + EPS) circlesRelation = 0;
      else if (centreGap >= sum - EPS) circlesRelation = 1;
      else if (centreGap > diff + EPS) circlesRelation = 2;
      else if (centreGap >= diff - EPS) circlesRelation = 3;
      else circlesRelation = 4;
      commonTangents = [4, 3, 2, 1, 0, 0][circlesRelation]!;
      radicalA = 2 * (circle.g - g2);
      radicalB = 2 * (circle.f - f2);
      radicalC = circle.c - cc2;
      radicalExists = Math.abs(radicalA) + Math.abs(radicalB) > EPS ? 1 : 0;
      if (radicalExists && Math.abs(radicalA) > EPS) radicalX = -radicalC / radicalA;
      if (circlesRelation === 2) {
        const d1 = Math.abs(radicalA * h + radicalB * k + radicalC) / Math.hypot(radicalA, radicalB);
        commonChord = 2 * Math.sqrt(Math.max(rSq - d1 * d1, 0));
      }
    }

    // ── S + λL₁ = 0 ──────────────────────────────────────────────────────
    const G = circle.g + (lam * a1) / 2;
    const F = circle.f + (lam * b1) / 2;
    const famConst = circle.c + lam * c1;
    const famRSquared = G * G + F * F - famConst;
    const famKind = famRSquared > EPS ? 1 : famRSquared >= -EPS ? 0 : -1;

    // ── The line through A and B, in all its forms ─────────────────────────
    const ax = clamp(s.ax, ...CIRCLE_LINE_RANGES.ax);
    const ay = clamp(s.ay, ...CIRCLE_LINE_RANGES.ay);
    const bx = clamp(s.bx, ...CIRCLE_LINE_RANGES.bx);
    const by = clamp(s.by, ...CIRCLE_LINE_RANGES.by);
    const run = bx - ax;
    const rise = by - ay;
    const abValid = Math.abs(run) > EPS || Math.abs(rise) > EPS;
    const abVertical = abValid && Math.abs(run) <= EPS;
    let abInclination = 0;
    if (abValid) {
      abInclination = (Math.atan2(rise, run) * 180) / Math.PI;
      if (abInclination < 0) abInclination += 180;
      if (abInclination >= 180 - 1e-9) abInclination = 0;
    }
    const [abA, abB, abC] = abValid ? tidyLine(rise, -run, bx * ay - ax * by) : [0, 0, 0];
    const abHasX = abValid && Math.abs(abA) > EPS;
    const abHasY = abValid && Math.abs(abB) > EPS;
    let abNormalP = 0;
    let abNormalDeg = 0;
    let nCos = 0;
    let nSin = 0;
    if (abValid) {
      const n = Math.hypot(abA, abB);
      // Divide by ±√(A² + B²) so the right-hand side p = −C/(±n) is not negative.
      let signed = abC > EPS ? -1 : abC < -EPS ? 1 : 0;
      if (signed === 0) signed = abB > EPS || (Math.abs(abB) <= EPS && abA > 0) ? 1 : -1;
      nCos = clean((signed * abA) / n);
      nSin = clean((signed * abB) / n);
      abNormalP = Math.abs(abC) / n;
      abNormalDeg = (Math.atan2(nSin, nCos) * 180) / Math.PI;
      if (abNormalDeg < 0) abNormalDeg += 360;
    }
    const pCross = run * (py - ay) - rise * (px - ax);

    const tidy = (v: number) => clean(v) || 0;
    return {
      a1: a1 || 0,
      b1: b1 || 0,
      c1: c1 || 0,
      a2: a2 || 0,
      b2: b2 || 0,
      c2: c2 || 0,
      line1Valid: valid1 ? 1 : 0,
      line2Valid: valid2 ? 1 : 0,
      m1: tidy(m1),
      m2: tidy(m2),
      vertical1: vertical1 ? 1 : 0,
      vertical2: vertical2 ? 1 : 0,
      intercept1: valid1 && !vertical1 ? tidy(-c1 / b1) : 0,
      slopeProduct: valid1 && valid2 && !vertical1 && !vertical2 ? tidy(m1 * m2) : 0,
      angle,
      angleDeg: (angle * 180) / Math.PI,
      tanAngle,
      lineRelation,
      meets,
      meetX: tidy(meetX),
      meetY: tidy(meetY),
      px,
      py,
      distance,
      footX: tidy(px - a1 * t),
      footY: tidy(py - b1 * t),
      side: valid1 ? sign(value1) || 0 : 0,
      parallelDistance,
      lam,
      famA: tidy(famA),
      famB: tidy(famB),
      famC: tidy(famC),
      famValid: famValid ? 1 : 0,
      famVertical: famVertical ? 1 : 0,
      famSlope: famValid && !famVertical ? tidy(-famA / famB) : 0,
      form: form === "general" ? 1 : 0,
      cx: tidy(h),
      cy: tidy(k),
      radius: r,
      rSquared: tidy(rSq),
      circleKind,
      circleG: tidy(circle.g),
      circleF: tidy(circle.f),
      circleC: tidy(circle.c),
      centreDistance,
      meetCount,
      chord,
      discriminant: tidy(discriminant),
      cut1x: tidy(cut1x),
      cut1y: tidy(cut1y),
      cut2x: tidy(cut2x),
      cut2y: tidy(cut2y),
      phi,
      tx: tidy(tx),
      ty: tidy(ty),
      tangentA: real ? tidy(r * cos) : 0,
      tangentB: real ? tidy(r * sin) : 0,
      tangentC: real ? tidy(circle.g * tx + circle.f * ty + circle.c) : 0,
      tangentVertical: tangentVertical ? 1 : 0,
      tangentSlope: real && !tangentVertical ? tidy(-cos / sin) : 0,
      normalVertical: normalVertical ? 1 : 0,
      normalSlope: real && !normalVertical ? tidy(sin / cos) : 0,
      s1: tidy(s1),
      pointPosition: pointPosition || 0,
      tangentLength: outside ? Math.sqrt(s1) : 0,
      contact1x: tidy(contacts[0]!),
      contact1y: tidy(contacts[1]!),
      contact2x: tidy(contacts[2]!),
      contact2y: tidy(contacts[3]!),
      cx2: tidy(h2),
      cy2: tidy(k2),
      radius2: r2,
      centreGap,
      circlesRelation,
      commonTangents,
      radicalExists,
      radicalA: tidy(radicalA),
      radicalB: tidy(radicalB),
      radicalC: tidy(radicalC),
      radicalX: tidy(radicalX),
      commonChord,
      famCx: tidy(-G),
      famCy: tidy(-F),
      famRSquared: tidy(famRSquared),
      famR: famKind === 1 ? Math.sqrt(famRSquared) : 0,
      famKind,
      famConst: tidy(famConst),
      ax: ax || 0,
      ay: ay || 0,
      bx: bx || 0,
      by: by || 0,
      abValid: abValid ? 1 : 0,
      abVertical: abVertical ? 1 : 0,
      abSlope: abValid && !abVertical ? tidy(rise / run) : 0,
      abInclination: tidy(abInclination),
      abA: tidy(abA),
      abB: tidy(abB),
      abC: tidy(abC),
      abXIntercept: abHasX ? tidy(-abC / abA) : 0,
      abHasXIntercept: abHasX ? 1 : 0,
      abYIntercept: abHasY ? tidy(-abC / abB) : 0,
      abHasYIntercept: abHasY ? 1 : 0,
      abNormalP: tidy(abNormalP),
      abNormalDeg: tidy(abNormalDeg),
      abFootX: tidy(abNormalP * nCos),
      abFootY: tidy(abNormalP * nSin),
      abCollinear: abValid && Math.abs(pCross) <= EPS ? 1 : 0,
      abpArea: tidy(Math.abs(pCross) / 2),
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof CircleLineState] : undefined;
  },

  setVariable(state, id, value) {
    if (!(id in CIRCLE_LINE_RANGES)) return state;
    const key = id as keyof CircleLineState;
    return { ...state, [key]: clamp(value, ...CIRCLE_LINE_RANGES[key]) };
  },
};
