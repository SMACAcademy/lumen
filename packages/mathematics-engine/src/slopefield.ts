import type { SimulationModel } from "@ise/science-engine";

/**
 * Differential equations, as pictures.
 *
 * Slope field: dy/dx = f(x, y) says how steep a solution is at every point,
 * so a short line of slope f(x, y) can be drawn at each point of a grid.
 * A solution curve follows those little slopes. Pick a starting point
 * (x₀, y₀) and exactly one solution passes through it (a particular
 * solution); the arbitrary constant C of the general solution is fixed by
 * that point. Every exact solution below is entered by hand and checked in
 * the tests by putting it back into its equation.
 *
 * Euler's method: walk from (x₀, y₀) in steps of h, each time along the
 * slope where you stand: yₙ₊₁ = yₙ + h·f(xₙ, yₙ). Not in the NCERT syllabus,
 * but it is how a computer solves an equation it cannot solve by hand, and
 * it shows why smaller steps follow the curve more closely.
 *
 * Growth, decay and cooling: dN/dt = kN, dN/dt = −kN and Newton's law of
 * cooling dT/dt = −k(T − Tₛ), against a clock in minutes, with their
 * exact exponential solutions beside an Euler solution in time.
 *
 * Order and degree: a list of equations with their order (the highest
 * derivative that appears) and degree (the power of that derivative, defined
 * only when the equation is a polynomial in its derivatives).
 */

// ── The slope fields ─────────────────────────────────────────────────────────

export interface SlopeFieldEquation {
  /** The equation as written, e.g. "dy/dx = x + y". */
  label: string;
  /** Its general solution, with the arbitrary constant C. */
  general: string;
  /** The window it is drawn in. */
  x: readonly [number, number];
  y: readonly [number, number];
  /** The slope at (x, y); NaN or ±Infinity where the equation does not give one. */
  f(x: number, y: number): number;
  /** The constant C of the solution through (x₀, y₀); NaN when no member of the family passes through it. */
  constant(x0: number, y0: number): number;
  /** The exact solution through (x₀, y₀), NaN outside the interval on which it exists. */
  through(x0: number, y0: number): (x: number) => number;
  /** Points through which family members are drawn faintly. */
  family: readonly (readonly [number, number])[];
  /** Whether the variables separate, and whether the equation is linear in y. */
  separable: boolean;
  linear: boolean;
}

export type SlopeFieldEquationId = "growth" | "decay" | "parabolas" | "circles" | "sum" | "linear" | "logistic";
export const SLOPE_FIELD_EQUATION_ORDER: readonly SlopeFieldEquationId[] = ["growth", "decay", "parabolas", "circles", "sum", "linear", "logistic"];

const column = (values: readonly number[], x = 0) => values.map((y) => [x, y] as const);
const nothing = () => Number.NaN;

export const SLOPE_FIELD_EQUATIONS: Record<SlopeFieldEquationId, SlopeFieldEquation> = {
  growth: {
    label: "dy/dx = y",
    general: "y = Ceˣ",
    x: [-3, 2],
    y: [-3, 4],
    f: (_x, y) => y,
    constant: (x0, y0) => y0 * Math.exp(-x0),
    through: (x0, y0) => {
      const c = y0 * Math.exp(-x0);
      return (x) => c * Math.exp(x);
    },
    family: column([-2, -1, -0.5, 0, 0.5, 1, 2]),
    separable: true,
    linear: true,
  },
  decay: {
    label: "dy/dx = −y",
    general: "y = Ce⁻ˣ",
    x: [-2, 3],
    y: [-3, 4],
    f: (_x, y) => -y,
    constant: (x0, y0) => y0 * Math.exp(x0),
    through: (x0, y0) => {
      const c = y0 * Math.exp(x0);
      return (x) => c * Math.exp(-x);
    },
    family: column([-2, -1, -0.5, 0, 0.5, 1, 2]),
    separable: true,
    linear: true,
  },
  parabolas: {
    label: "dy/dx = x",
    general: "y = x²/2 + C",
    x: [-3, 3],
    y: [-3, 4],
    f: (x) => x,
    constant: (x0, y0) => y0 - (x0 * x0) / 2,
    through: (x0, y0) => {
      const c = y0 - (x0 * x0) / 2;
      return (x) => (x * x) / 2 + c;
    },
    family: column([-3, -2, -1, 0, 1, 2]),
    separable: true,
    linear: true,
  },
  circles: {
    label: "dy/dx = −x/y",
    general: "x² + y² = C",
    x: [-3.5, 3.5],
    y: [-3.5, 3.5],
    f: (x, y) => -x / y,
    constant: (x0, y0) => (y0 === 0 ? Number.NaN : x0 * x0 + y0 * y0),
    through: (x0, y0) => {
      if (y0 === 0) return nothing;
      const c = x0 * x0 + y0 * y0;
      const side = Math.sign(y0);
      return (x) => (x * x <= c ? side * Math.sqrt(c - x * x) : Number.NaN);
    },
    family: column([-3, -2, -1, 1, 2, 3]),
    separable: true,
    linear: false,
  },
  sum: {
    label: "dy/dx = x + y",
    general: "y = −x − 1 + Ceˣ",
    x: [-3, 2],
    y: [-3, 3],
    f: (x, y) => x + y,
    constant: (x0, y0) => (y0 + x0 + 1) * Math.exp(-x0),
    through: (x0, y0) => {
      const c = (y0 + x0 + 1) * Math.exp(-x0);
      return (x) => -x - 1 + c * Math.exp(x);
    },
    family: column([-2, -1.5, -1, -0.5, 0, 0.5]),
    separable: false,
    linear: true,
  },
  linear: {
    label: "dy/dx + y = x",
    general: "y = x − 1 + Ce⁻ˣ",
    x: [-2, 3],
    y: [-3, 3],
    f: (x, y) => x - y,
    constant: (x0, y0) => (y0 - x0 + 1) * Math.exp(x0),
    through: (x0, y0) => {
      const c = (y0 - x0 + 1) * Math.exp(x0);
      return (x) => x - 1 + c * Math.exp(-x);
    },
    family: column([-2, -1.5, -1, -0.5, 0, 0.5, 1]),
    separable: false,
    linear: true,
  },
  logistic: {
    label: "dy/dx = y(1 − y)",
    general: "y = 1/(1 + Ce⁻ˣ)",
    x: [-4, 4],
    y: [-0.5, 1.5],
    f: (_x, y) => y * (1 - y),
    constant: (x0, y0) => (y0 === 0 ? Number.NaN : (1 / y0 - 1) * Math.exp(x0)),
    through: (x0, y0) => {
      // y = 0 is a solution too, though no value of C gives it.
      if (y0 === 0) return () => 0;
      const c = (1 / y0 - 1) * Math.exp(x0);
      const side = Math.sign(y0);
      // The solution lives only where 1 + Ce⁻ˣ keeps the sign it has at x₀.
      return (x) => {
        const d = 1 + c * Math.exp(-x);
        return Math.sign(d) === side ? 1 / d : Number.NaN;
      };
    },
    family: column([-0.2, 0, 0.1, 0.3, 0.5, 0.7, 0.9, 1, 1.3]),
    separable: true,
    linear: false,
  },
};

export interface SlopeFieldEulerRun {
  /** The points visited, starting at (x₀, y₀). */
  points: [number, number][];
  /** The estimate at the end, and the number and size of the steps. */
  y: number;
  steps: number;
  step: number;
  /** False when a step landed where the equation gives no slope, or ran off to infinity. */
  ok: boolean;
}

/** Steps of about h (exactly |X − x₀|/n), so the walk ends on X. */
export function slopeFieldSteps(span: number, h: number): number {
  return Math.abs(span) < 1e-12 ? 0 : Math.max(1, Math.round(Math.abs(span) / h));
}

/** Euler's method for dy/dx = f(x, y) from (x₀, y₀) to x = X. */
export function slopeFieldEuler(equation: SlopeFieldEquation, x0: number, y0: number, X: number, h: number): SlopeFieldEulerRun {
  const n = slopeFieldSteps(X - x0, h);
  const dx = n === 0 ? 0 : (X - x0) / n;
  const points: [number, number][] = [[x0, y0]];
  let x = x0;
  let y = y0;
  for (let i = 0; i < n; i++) {
    const slope = equation.f(x, y);
    if (!Number.isFinite(slope)) return { points, y, steps: n, step: Math.abs(dx), ok: false };
    y += slope * dx;
    x = x0 + (i + 1) * dx;
    if (!Number.isFinite(y) || Math.abs(y) > 1e6) return { points, y: 0, steps: n, step: Math.abs(dx), ok: false };
    points.push([x, y]);
  }
  return { points, y, steps: n, step: Math.abs(dx), ok: true };
}

// ── Growth, decay and cooling ────────────────────────────────────────────────

export type SlopeFieldProcessId = "growth" | "decay" | "cooling";
export const SLOPE_FIELD_PROCESS_ORDER: readonly SlopeFieldProcessId[] = ["growth", "decay", "cooling"];
/** The clock runs to an hour; Play runs six minutes a second. */
export const SLOPE_FIELD_T_MAX = 60;
export const SLOPE_FIELD_CLOCK_SPEED = 6;

/** The rate of change: kN, −kN, or −k(T − Tₛ). */
export function slopeFieldRate(process: SlopeFieldProcessId, k: number, room: number, value: number): number {
  if (process === "growth") return k * value;
  if (process === "decay") return -k * value;
  return -k * (value - room);
}

/** The exact solution at time t: N₀eᵏᵗ, N₀e⁻ᵏᵗ, or Tₛ + (T₀ − Tₛ)e⁻ᵏᵗ. */
export function slopeFieldExact(process: SlopeFieldProcessId, start: number, room: number, k: number, t: number): number {
  if (process === "growth") return start * Math.exp(k * t);
  if (process === "decay") return start * Math.exp(-k * t);
  return room + (start - room) * Math.exp(-k * t);
}

/** Euler's method in time, steps of about h minutes ending exactly at t. */
export function slopeFieldTimeEuler(process: SlopeFieldProcessId, start: number, room: number, k: number, t: number, h: number): SlopeFieldEulerRun {
  const n = slopeFieldSteps(t, h);
  const dt = n === 0 ? 0 : t / n;
  const points: [number, number][] = [[0, start]];
  let value = start;
  for (let i = 0; i < n; i++) {
    value += slopeFieldRate(process, k, room, value) * dt;
    points.push([(i + 1) * dt, value]);
  }
  return { points, y: value, steps: n, step: dt, ok: true };
}

// ── Order and degree ─────────────────────────────────────────────────────────

export interface SlopeFieldExample {
  label: string;
  order: number;
  /** 0 when the degree is not defined (not a polynomial in the derivatives). */
  degree: number;
}

export type SlopeFieldExampleId =
  | "first-linear"
  | "slope-squared"
  | "forced"
  | "s-of-t"
  | "cos-of-slope"
  | "third"
  | "powers"
  | "sine-of-third"
  | "sine-of-y";
export const SLOPE_FIELD_EXAMPLE_ORDER: readonly SlopeFieldExampleId[] = [
  "first-linear",
  "slope-squared",
  "forced",
  "s-of-t",
  "cos-of-slope",
  "third",
  "powers",
  "sine-of-third",
  "sine-of-y",
];

export const SLOPE_FIELD_EXAMPLES: Record<SlopeFieldExampleId, SlopeFieldExample> = {
  "first-linear": { label: "y′ + 5y = 0", order: 1, degree: 1 },
  "slope-squared": { label: "(y′)² + y′ − sin²y = 0", order: 1, degree: 2 },
  forced: { label: "y″ = cos 3x + sin 3x", order: 2, degree: 1 },
  "s-of-t": { label: "(ds/dt)⁴ + 3s·d²s/dt² = 0", order: 2, degree: 1 },
  "cos-of-slope": { label: "(y″)² + cos(y′) = 0", order: 2, degree: 0 },
  third: { label: "y‴ + 2y″ + y′ = 0", order: 3, degree: 1 },
  powers: { label: "(y‴)² + (y″)³ + (y′)⁴ + y⁵ = 0", order: 3, degree: 2 },
  "sine-of-third": { label: "y⁗ + sin(y‴) = 0", order: 4, degree: 0 },
  "sine-of-y": { label: "y″ + 2y′ + sin y = 0", order: 2, degree: 1 },
};

// ── The model ────────────────────────────────────────────────────────────────

export type SlopeFieldParams = { equation: SlopeFieldEquationId; process: SlopeFieldProcessId; example: SlopeFieldExampleId };

export interface SlopeFieldState {
  /** The starting point, and where Euler's estimate is compared with the exact value. */
  readonly x0: number;
  readonly y0: number;
  readonly xEnd: number;
  /** Euler's step along x. */
  readonly h: number;
  /** The clock (min), the rate constant (per min), the starting amount or temperature, the room (°C), and Euler's step in time (min). */
  readonly t: number;
  readonly k: number;
  readonly start: number;
  readonly room: number;
  readonly tStep: number;
}

export type SlopeFieldResults = {
  equation: number;
  x0: number;
  y0: number;
  /** f(x₀, y₀); 0 with slopeDefined = 0 where the equation gives no slope. */
  slope: number;
  slopeDefined: number;
  /** C of the solution through the starting point; 0 with constantDefined = 0 when no C gives it. */
  constant: number;
  constantDefined: number;
  xEnd: number;
  /** The exact solution at xEnd; 0 with reaches = 0 when the solution does not reach that far. */
  yExact: number;
  reaches: number;
  yEuler: number;
  eulerOk: number;
  /** |Euler − exact| at xEnd, when both exist. */
  eulerError: number;
  h: number;
  steps: number;
  separable: number;
  linear: number;
  process: number;
  t: number;
  start: number;
  room: number;
  k: number;
  amount: number;
  amountEuler: number;
  timeError: number;
  /** dN/dt or dT/dt now, and its size. */
  rate: number;
  speed: number;
  /** ln 2 / k: doubling time, half-life, or the time for the difference from the room to halve. */
  halfTime: number;
  /** e^(kt) for growth, e^(−kt) for decay and cooling. */
  factor: number;
  tStep: number;
  timeSteps: number;
  example: number;
  order: number;
  degree: number;
};

const OUTPUTS = [
  "equation", "x0", "y0", "slope", "slopeDefined", "constant", "constantDefined", "xEnd", "yExact", "reaches", "yEuler", "eulerOk", "eulerError", "h", "steps", "separable", "linear",
  "process", "t", "start", "room", "k", "amount", "amountEuler", "timeError", "rate", "speed", "halfTime", "factor", "tStep", "timeSteps",
  "example", "order", "degree",
] as const satisfies readonly (keyof SlopeFieldResults)[];

/** The controls' ranges; setVariable clamps to these. */
export const SLOPE_FIELD_RANGES = {
  x0: [-4, 4],
  y0: [-4, 4],
  xEnd: [-4, 4],
  h: [0.05, 1],
  t: [0, SLOPE_FIELD_T_MAX],
  k: [0.01, 0.1],
  start: [1, 100],
  room: [0, 40],
  tStep: [1, 20],
} as const satisfies Record<keyof SlopeFieldState, readonly [number, number]>;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** A finite number, never −0. */
const tidy = (v: number) => (Number.isFinite(v) ? v || 0 : 0);

const equationOf = (params: SlopeFieldParams) => (SLOPE_FIELD_EQUATION_ORDER.includes(params.equation) ? params.equation : "growth");
const processOf = (params: SlopeFieldParams) => (SLOPE_FIELD_PROCESS_ORDER.includes(params.process) ? params.process : "cooling");
const exampleOf = (params: SlopeFieldParams) => (SLOPE_FIELD_EXAMPLE_ORDER.includes(params.example) ? params.example : "first-linear");

/** The starting point and end, kept inside the equation's window. */
export function slopeFieldWindowed(equation: SlopeFieldEquation, state: Pick<SlopeFieldState, "x0" | "y0" | "xEnd">) {
  return {
    x0: clamp(state.x0, equation.x[0], equation.x[1]),
    y0: clamp(state.y0, equation.y[0], equation.y[1]),
    xEnd: clamp(state.xEnd, equation.x[0], equation.x[1]),
  };
}

export const slopeFieldModel: SimulationModel<SlopeFieldState, SlopeFieldParams, SlopeFieldResults> = {
  id: "slopefield",
  defaultParams: { equation: "growth", process: "cooling", example: "first-linear" },
  outputs: OUTPUTS,
  stateVariables: ["x0", "y0", "xEnd", "h", "t", "k", "start", "room", "tStep"],

  initialize() {
    return { x0: 0, y0: 1, xEnd: 1, h: 0.5, t: 0, k: 0.05, start: 90, room: 25, tStep: 5 };
  },

  /** Play runs the clock, six minutes a second, and stops at the hour. */
  advance(state, dt) {
    return { ...state, t: clamp(state.t + dt * SLOPE_FIELD_CLOCK_SPEED, 0, SLOPE_FIELD_T_MAX) };
  },

  step(state, _params, sign) {
    return { ...state, t: clamp(Math.round(state.t / 5) * 5 + 5 * sign, 0, SLOPE_FIELD_T_MAX) };
  },

  derive(state, params) {
    const equationId = equationOf(params);
    const equation = SLOPE_FIELD_EQUATIONS[equationId];
    const { x0, y0, xEnd } = slopeFieldWindowed(equation, state);
    const h = clamp(state.h, SLOPE_FIELD_RANGES.h[0], SLOPE_FIELD_RANGES.h[1]);
    const slope = equation.f(x0, y0);
    const slopeDefined = Number.isFinite(slope);
    const constant = equation.constant(x0, y0);
    const exact = slopeDefined ? equation.through(x0, y0)(xEnd) : Number.NaN;
    const reaches = Number.isFinite(exact);
    const run = slopeFieldEuler(equation, x0, y0, xEnd, h);

    const processId = processOf(params);
    const t = clamp(state.t, SLOPE_FIELD_RANGES.t[0], SLOPE_FIELD_RANGES.t[1]);
    const k = clamp(state.k, SLOPE_FIELD_RANGES.k[0], SLOPE_FIELD_RANGES.k[1]);
    const start = clamp(state.start, SLOPE_FIELD_RANGES.start[0], SLOPE_FIELD_RANGES.start[1]);
    const room = clamp(state.room, SLOPE_FIELD_RANGES.room[0], SLOPE_FIELD_RANGES.room[1]);
    const tStep = clamp(state.tStep, SLOPE_FIELD_RANGES.tStep[0], SLOPE_FIELD_RANGES.tStep[1]);
    const amount = slopeFieldExact(processId, start, room, k, t);
    const timeRun = slopeFieldTimeEuler(processId, start, room, k, t, tStep);
    const rate = slopeFieldRate(processId, k, room, amount);

    const exampleId = exampleOf(params);
    const example = SLOPE_FIELD_EXAMPLES[exampleId];
    return {
      equation: SLOPE_FIELD_EQUATION_ORDER.indexOf(equationId),
      x0: tidy(x0),
      y0: tidy(y0),
      slope: slopeDefined ? tidy(slope) : 0,
      slopeDefined: slopeDefined ? 1 : 0,
      constant: Number.isFinite(constant) ? tidy(constant) : 0,
      constantDefined: Number.isFinite(constant) ? 1 : 0,
      xEnd: tidy(xEnd),
      yExact: reaches ? tidy(exact) : 0,
      reaches: reaches ? 1 : 0,
      yEuler: run.ok ? tidy(run.y) : 0,
      eulerOk: run.ok ? 1 : 0,
      eulerError: reaches && run.ok ? tidy(Math.abs(run.y - exact)) : 0,
      h,
      steps: run.steps,
      separable: equation.separable ? 1 : 0,
      linear: equation.linear ? 1 : 0,
      process: SLOPE_FIELD_PROCESS_ORDER.indexOf(processId),
      t,
      start,
      room,
      k,
      amount: tidy(amount),
      amountEuler: tidy(timeRun.y),
      timeError: tidy(Math.abs(timeRun.y - amount)),
      rate: tidy(rate),
      speed: tidy(Math.abs(rate)),
      halfTime: Math.LN2 / k,
      factor: tidy(Math.exp((processId === "growth" ? k : -k) * t)),
      tStep,
      timeSteps: timeRun.steps,
      example: SLOPE_FIELD_EXAMPLE_ORDER.indexOf(exampleId),
      order: example.order,
      degree: example.degree,
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof SlopeFieldState] : undefined;
  },

  setVariable(state, id, value) {
    if (!(id in SLOPE_FIELD_RANGES)) return state;
    const [lo, hi] = SLOPE_FIELD_RANGES[id as keyof SlopeFieldState];
    return { ...state, [id]: clamp(value, lo, hi) };
  },
};
