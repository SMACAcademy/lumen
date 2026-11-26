import type { SimulationModel } from "@ise/science-engine";

/**
 * Units and measurement (NCERT class 11, chapter 1), in seven small benches.
 *
 * Units: the seven SI base units, and derived units built from them. A
 * unit's dimensions are the powers of mass, length and time it is made of —
 * N = kg m s⁻² is [M L T⁻²] — and the same powers convert it to CGS:
 * n₂ = n₁ [M₁/M₂]ᵃ [L₁/L₂]ᵇ [T₁/T₂]ᶜ, so 1 J = 10³ × (10²)² = 10⁷ erg.
 *
 * Checking: every term of a correct equation has the same dimensions. The
 * test can only reject: a dimensionally consistent equation may still be
 * wrong (K = (3/16)mv² passes).
 *
 * Deriving: if T depends on m, l and g as T = k mˣ lʸ gᶻ, matching the powers
 * of M, L and T gives three linear equations for x, y and z, solved here
 * exactly. Mass drops out of the pendulum: T = k√(l/g).
 *
 * Reading: a rod against a metre scale, a vernier calliper or a screw gauge.
 * A reading is recorded to the instrument's least count, and so has as many
 * significant figures as that least count allows.
 *
 * Figures: NCERT's rules for counting significant figures and rounding
 * (an exactly-5 dropped digit rounds the preceding digit to even), and for
 * results — sums keep the fewest decimal places, products and quotients the
 * fewest significant figures. All of this is done on the written digits, not
 * on floating-point numbers, so 2.745 rounds to 2.74 and 2.735 to 2.74.
 *
 * Errors: repeated readings of a pendulum's period; the mean (recorded to the
 * readings' resolution, as NCERT does), each absolute error, the mean
 * absolute error, and the relative and percentage errors.
 *
 * Propagation: ΔZ = ΔA + ΔB for a sum or difference; ΔZ/Z = |p|ΔA/A + |q|ΔB/B
 * for Z = k Aᵖ Bᑫ — so a power multiplies its relative error, and the radius
 * of a sphere counts three times in its density.
 */

// ── Dimensions ───────────────────────────────────────────────────────────────

/** Powers of [M, L, T]. */
export type MeasureDim = readonly [number, number, number];

export const MEASURE_BASE_UNITS = [
  { quantity: "length", unit: "metre", symbol: "m" },
  { quantity: "mass", unit: "kilogram", symbol: "kg" },
  { quantity: "time", unit: "second", symbol: "s" },
  { quantity: "electric current", unit: "ampere", symbol: "A" },
  { quantity: "temperature", unit: "kelvin", symbol: "K" },
  { quantity: "amount of substance", unit: "mole", symbol: "mol" },
  { quantity: "luminous intensity", unit: "candela", symbol: "cd" },
] as const;

export interface MeasureUnit {
  label: string;
  quantity: string;
  /** Its symbol, and the same unit written in base units. */
  symbol: string;
  base: string;
  dim: MeasureDim;
  /** The CGS unit it converts to. */
  cgs: string;
}

export type MeasureUnitId = "newton" | "joule" | "watt" | "pascal" | "density";
export const MEASURE_UNIT_ORDER: readonly MeasureUnitId[] = ["newton", "joule", "watt", "pascal", "density"];
export const MEASURE_UNITS: Record<MeasureUnitId, MeasureUnit> = {
  newton: { label: "newton", quantity: "force", symbol: "N", base: "kg m s⁻²", dim: [1, 1, -2], cgs: "dyne" },
  joule: { label: "joule", quantity: "energy", symbol: "J", base: "kg m² s⁻²", dim: [1, 2, -2], cgs: "erg" },
  watt: { label: "watt", quantity: "power", symbol: "W", base: "kg m² s⁻³", dim: [1, 2, -3], cgs: "erg/s" },
  pascal: { label: "pascal", quantity: "pressure", symbol: "Pa", base: "kg m⁻¹ s⁻²", dim: [1, -1, -2], cgs: "dyne/cm²" },
  density: { label: "kg/m³", quantity: "density", symbol: "kg/m³", base: "kg m⁻³", dim: [1, -3, 0], cgs: "g/cm³" },
};

/** How many CGS units make one SI unit, as a power of ten: 1 kg = 10³ g, 1 m = 10² cm, the second is shared. */
export function cgsPowerOf(dim: MeasureDim): number {
  return 3 * dim[0] + 2 * dim[1];
}

export const sameMeasureDim = (a: MeasureDim, b: MeasureDim) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

export interface MeasureEquation {
  label: string;
  /** The left side first, then each term on the right. */
  terms: readonly { label: string; dim: MeasureDim }[];
}

const VELOCITY: MeasureDim = [0, 1, -1];
const LENGTH: MeasureDim = [0, 1, 0];
const ENERGY: MeasureDim = [1, 2, -2];

export type MeasureEquationId = "velocity" | "distance" | "squares" | "energy" | "pendulum" | "fraction" | "kinetic-cube" | "kinetic-ma" | "velocity-t2";
export const MEASURE_EQUATION_ORDER: readonly MeasureEquationId[] = ["velocity", "distance", "squares", "energy", "pendulum", "fraction", "kinetic-cube", "kinetic-ma", "velocity-t2"];
export const MEASURE_EQUATIONS: Record<MeasureEquationId, MeasureEquation> = {
  velocity: { label: "v = u + at", terms: [{ label: "v", dim: VELOCITY }, { label: "u", dim: VELOCITY }, { label: "at", dim: VELOCITY }] },
  distance: { label: "s = ut + ½at²", terms: [{ label: "s", dim: LENGTH }, { label: "ut", dim: LENGTH }, { label: "½at²", dim: LENGTH }] },
  squares: { label: "v² = u² + 2as", terms: [{ label: "v²", dim: [0, 2, -2] }, { label: "u²", dim: [0, 2, -2] }, { label: "2as", dim: [0, 2, -2] }] },
  energy: { label: "½mv² = mgh", terms: [{ label: "½mv²", dim: ENERGY }, { label: "mgh", dim: ENERGY }] },
  pendulum: { label: "T = 2π√(l/g)", terms: [{ label: "T", dim: [0, 0, 1] }, { label: "2π√(l/g)", dim: [0, 0, 1] }] },
  fraction: { label: "K = (3/16)mv²", terms: [{ label: "K", dim: ENERGY }, { label: "(3/16)mv²", dim: ENERGY }] },
  "kinetic-cube": { label: "K = m²v³", terms: [{ label: "K", dim: ENERGY }, { label: "m²v³", dim: [2, 3, -3] }] },
  "kinetic-ma": { label: "K = ½mv² + ma", terms: [{ label: "K", dim: ENERGY }, { label: "½mv²", dim: ENERGY }, { label: "ma", dim: [1, 1, -2] }] },
  "velocity-t2": { label: "v = u + at²", terms: [{ label: "v", dim: VELOCITY }, { label: "u", dim: VELOCITY }, { label: "at²", dim: LENGTH }] },
};

export interface MeasureDerivation {
  label: string;
  /** The quantity sought, and the three it might depend on. */
  result: { symbol: string; dim: MeasureDim };
  inputs: readonly [{ symbol: string; dim: MeasureDim }, { symbol: string; dim: MeasureDim }, { symbol: string; dim: MeasureDim }];
  /** The formula the powers lead to (the constant comes from experiment or theory, not dimensions). */
  formula: string;
}

export type MeasureDerivationId = "pendulum" | "spring" | "circle";
export const MEASURE_DERIVATION_ORDER: readonly MeasureDerivationId[] = ["pendulum", "spring", "circle"];
export const MEASURE_DERIVATIONS: Record<MeasureDerivationId, MeasureDerivation> = {
  pendulum: {
    label: "Period of a pendulum",
    result: { symbol: "T", dim: [0, 0, 1] },
    inputs: [{ symbol: "m", dim: [1, 0, 0] }, { symbol: "l", dim: [0, 1, 0] }, { symbol: "g", dim: [0, 1, -2] }],
    formula: "T = k√(l/g)",
  },
  spring: {
    label: "Period of a mass on a spring",
    result: { symbol: "T", dim: [0, 0, 1] },
    inputs: [{ symbol: "m", dim: [1, 0, 0] }, { symbol: "k", dim: [1, 0, -2] }, { symbol: "A", dim: [0, 1, 0] }],
    formula: "T = c√(m/k)",
  },
  circle: {
    label: "Force to keep a body on a circle",
    result: { symbol: "F", dim: [1, 1, -2] },
    inputs: [{ symbol: "m", dim: [1, 0, 0] }, { symbol: "v", dim: [0, 1, -1] }, { symbol: "r", dim: [0, 1, 0] }],
    formula: "F = k mv²/r",
  },
};

const det3 = (m: readonly (readonly number[])[]) =>
  m[0]![0]! * (m[1]![1]! * m[2]![2]! - m[1]![2]! * m[2]![1]!) -
  m[0]![1]! * (m[1]![0]! * m[2]![2]! - m[1]![2]! * m[2]![0]!) +
  m[0]![2]! * (m[1]![0]! * m[2]![1]! - m[1]![1]! * m[2]![0]!);

/**
 * The powers x, y, z with [a]ˣ[b]ʸ[c]ᶻ = [target], by Cramer's rule: one
 * equation for each of M, L and T. Null when the three inputs do not pin the
 * powers down (their dimensions are not independent).
 */
export function solveDimensions(inputs: readonly [MeasureDim, MeasureDim, MeasureDim], target: MeasureDim): [number, number, number] | null {
  // Row r is the power of M, L or T; column c is the input.
  const matrix = [0, 1, 2].map((r) => inputs.map((dim) => dim[r]!));
  const d = det3(matrix);
  if (Math.abs(d) < 1e-12) return null;
  const solve = (column: number) => det3(matrix.map((row, r) => row.map((v, c) => (c === column ? target[r]! : v)))) / d;
  return [solve(0) || 0, solve(1) || 0, solve(2) || 0];
}

/** The dimensions of aˣbʸcᶻ. */
export function combineDims(inputs: readonly [MeasureDim, MeasureDim, MeasureDim], powers: readonly [number, number, number]): MeasureDim {
  const out = [0, 1, 2].map((r) => inputs.reduce((sum, dim, i) => sum + dim[r]! * powers[i]!, 0) || 0);
  return [out[0]!, out[1]!, out[2]!];
}

// ── Significant figures, on the written digits ───────────────────────────────

/**
 * NCERT's rules: non-zero digits count; zeros between them count; leading
 * zeros never count; trailing zeros count only when there is a decimal point
 * (so 4700 has two, 4.700 four). A power of ten does not change the count.
 */
export function countSignificantFigures(text: string): number {
  const mantissa = text.trim().replace(/^[+\-−]/, "").split(/e/i)[0] ?? "";
  const hasPoint = mantissa.includes(".");
  let digits = mantissa.replace(".", "").replace(/^0+/, "");
  if (!hasPoint) digits = digits.replace(/0+$/, "");
  return digits.length;
}

/** Decimal places written in a number. */
export function decimalPlacesOf(text: string): number {
  const mantissa = text.trim().split(/e/i)[0] ?? "";
  const point = mantissa.indexOf(".");
  return point < 0 ? 0 : mantissa.length - point - 1;
}

interface Digits {
  negative: boolean;
  /** Significant digit string, from the first non-zero digit. */
  sig: string;
  /** Digits before the point once the leading zeros are gone (0.sig × 10^mag). */
  mag: number;
  /** The power of ten written after the number, if any. */
  exp: number;
}

function parseDigits(text: string): Digits {
  const trimmed = text.trim();
  const negative = /^[\-−]/.test(trimmed);
  const [mantissaRaw, expRaw] = trimmed.replace(/^[+\-−]/, "").split(/e/i);
  const mantissa = mantissaRaw ?? "0";
  const point = mantissa.indexOf(".");
  const all = mantissa.replace(".", "");
  const before = point < 0 ? all.length : point;
  const lead = all.length - all.replace(/^0+/, "").length;
  return { negative, sig: all.slice(lead), mag: before - lead, exp: expRaw ? Number(expRaw) : 0 };
}

function writeDigits(d: Digits): string {
  const { sig, mag } = d;
  if (!sig) return "0";
  const body = mag <= 0 ? `0.${"0".repeat(-mag)}${sig}` : mag >= sig.length ? sig + "0".repeat(mag - sig.length) : `${sig.slice(0, mag)}.${sig.slice(mag)}`;
  return `${d.negative ? "-" : ""}${body}${d.exp ? `e${d.exp}` : ""}`;
}

/** Add one to a digit string: "129" → "130", "999" → "1000". */
function increment(digits: string): string {
  const out = digits.split("");
  for (let i = out.length - 1; i >= 0; i--) {
    if (out[i] === "9") out[i] = "0";
    else {
      out[i] = String(Number(out[i]) + 1);
      return out.join("");
    }
  }
  return `1${out.join("")}`;
}

/** Keep `n` digits of `d`, rounding as NCERT does. */
function keepDigits(d: Digits, n: number): Digits {
  if (n >= d.sig.length) return d;
  if (n <= 0) return { ...d, sig: "" };
  const head = d.sig.slice(0, n);
  const tail = d.sig.slice(n);
  const first = Number(tail[0]);
  // More than 5: raise. Less than 5: leave. Exactly 5 (nothing after it): raise only an odd digit.
  const up = first > 5 || (first === 5 && (/[1-9]/.test(tail.slice(1)) || Number(head[n - 1]) % 2 === 1));
  if (!up) return { ...d, sig: head };
  const raised = increment(head);
  return raised.length > head.length ? { ...d, sig: raised.slice(0, n), mag: d.mag + 1 } : { ...d, sig: raised };
}

/**
 * Which of NCERT's rounding rules applies when a written number is cut to
 * `n` figures: nothing to drop; the dropped part is more than half (raise) or
 * less (leave); or it is exactly a 5, and the digit before it is odd (raise
 * it) or even (leave it).
 */
export function roundingCaseOf(text: string, n: number): "none" | "raise" | "leave" | "odd" | "even" {
  const d = parseDigits(text);
  const keep = Math.max(1, Math.round(n));
  if (keep >= d.sig.length) return "none";
  const tail = d.sig.slice(keep);
  const first = Number(tail[0]);
  if (first > 5 || (first === 5 && /[1-9]/.test(tail.slice(1)))) return "raise";
  if (first < 5) return "leave";
  return Number(d.sig[keep - 1]) % 2 === 1 ? "odd" : "even";
}

/** Round a written number to `n` significant figures:2.745 → 2.74, 2.735 → 2.74, 0.0006032 → 0.00060 (n = 2). */
export function roundToFigures(text: string, n: number): string {
  return writeDigits(keepDigits(parseDigits(text), Math.round(n)));
}

/** Round a written number to `places` decimal places: 663.821 → 663.8 (1 place). */
export function roundToPlaces(text: string, places: number): string {
  const d = parseDigits(text);
  const n = d.mag + d.exp + places;
  if (n <= 0) return (0).toFixed(Math.max(0, places));
  return writeDigits(keepDigits(d, n));
}

/** A number written out to 12 figures, so that the digit rules can work on it. */
const written = (value: number) => (Number.isFinite(value) ? value.toPrecision(12) : "0");

// ── The benches ──────────────────────────────────────────────────────────────

/** Least counts on offer, in cm: a metre scale (1 mm), a vernier calliper (0.1 mm) and a screw gauge (0.01 mm). */
export const MEASURE_INSTRUMENTS = [0.1, 0.01, 0.001] as const;
export const MEASURE_INSTRUMENT_NAMES: Record<string, string> = { "0.1": "metre scale", "0.01": "vernier calliper", "0.001": "screw gauge" };
/** A screw gauge's pitch (cm) and the divisions on its circular scale. */
export const MEASURE_PITCH = 0.05;
export const MEASURE_CIRCULAR_DIVISIONS = 50;
export const MEASURE_ROD: readonly [number, number] = [0.2, 9.8];

export interface MeasureNumeral {
  /** As read aloud, with a power of ten written as ×10ⁿ. */
  label: string;
  /** The digits as written, with any power of ten as e-notation. */
  text: string;
  unit: string;
}

export type MeasureNumeralId = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j";
export const MEASURE_NUMERAL_ORDER: readonly MeasureNumeralId[] = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
export const MEASURE_NUMERALS: Record<MeasureNumeralId, MeasureNumeral> = {
  a: { label: "0.007", text: "0.007", unit: "m²" },
  b: { label: "2.64 × 10²⁴", text: "2.64e24", unit: "kg" },
  c: { label: "0.2370", text: "0.2370", unit: "g cm⁻³" },
  d: { label: "6.320", text: "6.320", unit: "J" },
  e: { label: "6.032", text: "6.032", unit: "N m⁻²" },
  f: { label: "0.0006032", text: "0.0006032", unit: "m²" },
  g: { label: "4700", text: "4700", unit: "m" },
  h: { label: "4.700 × 10³", text: "4.700e3", unit: "m" },
  i: { label: "2.745", text: "2.745", unit: "m" },
  j: { label: "2.735", text: "2.735", unit: "m" },
};

export interface MeasureCalc {
  label: string;
  /** "sum" covers subtraction too: the operands carry their signs. */
  kind: "sum" | "product";
  operands: readonly string[];
  /** For a product: which operands divide. */
  divide?: readonly boolean[];
  unit: string;
}

export type MeasureCalcId = "masses" | "gold" | "box" | "density" | "sheet";
export const MEASURE_CALC_ORDER: readonly MeasureCalcId[] = ["masses", "gold", "box", "density", "sheet"];
export const MEASURE_CALCS: Record<MeasureCalcId, MeasureCalc> = {
  masses: { label: "436.32 g + 227.2 g + 0.301 g", kind: "sum", operands: ["436.32", "227.2", "0.301"], unit: "g" },
  gold: { label: "20.17 g − 20.15 g", kind: "sum", operands: ["20.17", "-20.15"], unit: "g" },
  box: { label: "2.3 kg + 0.02015 kg + 0.02017 kg", kind: "sum", operands: ["2.3", "0.02015", "0.02017"], unit: "kg" },
  density: { label: "4.237 g ÷ 2.51 cm³", kind: "product", operands: ["4.237", "2.51"], divide: [false, true], unit: "g/cm³" },
  sheet: { label: "4.234 m × 1.005 m", kind: "product", operands: ["4.234", "1.005"], unit: "m²" },
};

/** Exact sum of written decimals, by scaling to whole numbers: no floating-point crumbs. */
function exactSum(operands: readonly string[]): string {
  const places = Math.max(...operands.map(decimalPlacesOf));
  const scale = 10 ** places;
  const total = operands.reduce((sum, t) => sum + Math.round(Number(t.replace("−", "-")) * scale), 0);
  return (total / scale).toFixed(places);
}

/** The raw result of a calculation, written out, and the result as the rules allow it to be stated. */
export function calculateMeasured(calc: MeasureCalc): { raw: string; result: string; rule: number } {
  if (calc.kind === "sum") {
    const raw = exactSum(calc.operands);
    const rule = Math.min(...calc.operands.map(decimalPlacesOf));
    return { raw, result: roundToPlaces(raw, rule), rule };
  }
  const value = calc.operands.reduce((acc, t, i) => (calc.divide?.[i] ? acc / Number(t) : acc * Number(t)), 1);
  const rule = Math.min(...calc.operands.map(countSignificantFigures));
  const raw = written(value);
  return { raw, result: roundToFigures(raw, rule), rule };
}

/** NCERT's pendulum: five readings of the period, s. The last one is yours to change. */
export const MEASURE_READINGS: readonly number[] = [2.63, 2.56, 2.42, 2.71, 2.8];
export const MEASURE_LAST_READING: readonly [number, number] = [2.3, 3];
/** The readings' resolution, in decimal places. */
export const MEASURE_READING_PLACES = 2;

export interface MeasureRule {
  label: string;
  formula: string;
  /** Z = A + B, Z = A − B, or Z = k Aᵖ Bᑫ. */
  kind: "sum" | "difference" | "power";
  a: { symbol: string; value: number; unit: string };
  b: { symbol: string; value: number; unit: string };
  z: { symbol: string; unit: string };
  p: number;
  q: number;
  k: number;
}

export type MeasureRuleId = "series" | "difference" | "area" | "ohm" | "pendulum" | "sphere";
export const MEASURE_RULE_ORDER: readonly MeasureRuleId[] = ["series", "difference", "area", "ohm", "pendulum", "sphere"];
export const MEASURE_RULES: Record<MeasureRuleId, MeasureRule> = {
  series: { label: "Resistors in series", formula: "R = R₁ + R₂", kind: "sum", a: { symbol: "R₁", value: 100, unit: "Ω" }, b: { symbol: "R₂", value: 200, unit: "Ω" }, z: { symbol: "R", unit: "Ω" }, p: 1, q: 1, k: 1 },
  difference: { label: "A rise in temperature", formula: "θ = t₂ − t₁", kind: "difference", a: { symbol: "t₂", value: 50, unit: "°C" }, b: { symbol: "t₁", value: 20, unit: "°C" }, z: { symbol: "θ", unit: "°C" }, p: 1, q: 1, k: 1 },
  area: { label: "Area of a rectangle", formula: "A = l × b", kind: "power", a: { symbol: "l", value: 5.7, unit: "cm" }, b: { symbol: "b", value: 3.4, unit: "cm" }, z: { symbol: "A", unit: "cm²" }, p: 1, q: 1, k: 1 },
  ohm: { label: "Resistance from V and I", formula: "R = V / I", kind: "power", a: { symbol: "V", value: 100, unit: "V" }, b: { symbol: "I", value: 10, unit: "A" }, z: { symbol: "R", unit: "Ω" }, p: 1, q: -1, k: 1 },
  pendulum: { label: "g from a pendulum", formula: "g = 4π²L / T²", kind: "power", a: { symbol: "L", value: 0.2, unit: "m" }, b: { symbol: "T", value: 0.9, unit: "s" }, z: { symbol: "g", unit: "m/s²" }, p: 1, q: -2, k: 4 * Math.PI * Math.PI },
  sphere: { label: "Density of a steel ball", formula: "ρ = m / (4/3 πr³)", kind: "power", a: { symbol: "m", value: 263, unit: "g" }, b: { symbol: "r", value: 2, unit: "cm" }, z: { symbol: "ρ", unit: "g/cm³" }, p: 1, q: -3, k: 3 / (4 * Math.PI) },
};

/** Z, its absolute error, and each input's share of the percentage error in Z. */
export function propagateErrors(rule: MeasureRule, percentA: number, percentB: number) {
  const da = (rule.a.value * percentA) / 100;
  const db = (rule.b.value * percentB) / 100;
  if (rule.kind !== "power") {
    const z = rule.kind === "sum" ? rule.a.value + rule.b.value : rule.a.value - rule.b.value;
    const dz = da + db;
    const size = Math.abs(z) > 1e-12 ? Math.abs(z) : 1;
    return { z, da, db, dz, shareA: (100 * da) / size, shareB: (100 * db) / size, percent: (100 * dz) / size };
  }
  const z = rule.k * rule.a.value ** rule.p * rule.b.value ** rule.q;
  const shareA = Math.abs(rule.p) * percentA;
  const shareB = Math.abs(rule.q) * percentB;
  const percent = shareA + shareB;
  return { z, da, db, dz: (Math.abs(z) * percent) / 100, shareA, shareB, percent };
}

// ── The model ────────────────────────────────────────────────────────────────

export type MeasureParams = {
  unit: MeasureUnitId;
  equation: MeasureEquationId;
  derivation: MeasureDerivationId;
  /** Least count of the instrument, cm. */
  instrument: number;
  numeral: MeasureNumeralId;
  calc: MeasureCalcId;
  rule: MeasureRuleId;
};

export interface MeasureState {
  /** Powers of kg, m and s in the unit being built. */
  readonly mExp: number;
  readonly lExp: number;
  readonly tExp: number;
  /** Trial powers of the three quantities in a derivation. */
  readonly powA: number;
  readonly powB: number;
  readonly powC: number;
  /** True length of the rod, cm. */
  readonly length: number;
  /** Significant figures to keep when rounding. */
  readonly keep: number;
  /** The fifth reading of the period, s. */
  readonly lastReading: number;
  /** Percentage errors in A and B. */
  readonly errA: number;
  readonly errB: number;
}

export type MeasureResults = {
  unit: number;
  mExp: number;
  lExp: number;
  tExp: number;
  targetM: number;
  targetL: number;
  targetT: number;
  unitMatches: number;
  builtCgsPower: number;
  cgsPower: number;
  equation: number;
  termCount: number;
  consistent: number;
  /** Which term first disagrees with the left side (1, 2…), 0 if none. */
  badTerm: number;
  derivation: number;
  powA: number;
  powB: number;
  powC: number;
  builtM: number;
  builtL: number;
  builtT: number;
  derived: number;
  solA: number;
  solB: number;
  solC: number;
  instrument: number;
  length: number;
  leastCount: number;
  reading: number;
  readingFigures: number;
  readingPlaces: number;
  /** Main-scale reading, cm, and the vernier (or circular-scale) division that lines up. */
  mainScale: number;
  division: number;
  numeral: number;
  numeralFigures: number;
  keep: number;
  rounded: number;
  roundedFigures: number;
  calc: number;
  calcIsSum: number;
  calcRaw: number;
  calcResult: number;
  /** Decimal places (sum) or significant figures (product) the result keeps. */
  calcRule: number;
  lastReading: number;
  rawMean: number;
  mean: number;
  meanAbsError: number;
  relativeError: number;
  percentError: number;
  rule: number;
  ruleIsPower: number;
  errA: number;
  errB: number;
  valueA: number;
  valueB: number;
  absA: number;
  absB: number;
  zValue: number;
  zError: number;
  zPercent: number;
  shareA: number;
  shareB: number;
};

const OUTPUTS = [
  "unit", "mExp", "lExp", "tExp", "targetM", "targetL", "targetT", "unitMatches", "builtCgsPower", "cgsPower",
  "equation", "termCount", "consistent", "badTerm",
  "derivation", "powA", "powB", "powC", "builtM", "builtL", "builtT", "derived", "solA", "solB", "solC",
  "instrument", "length", "leastCount", "reading", "readingFigures", "readingPlaces", "mainScale", "division",
  "numeral", "numeralFigures", "keep", "rounded", "roundedFigures",
  "calc", "calcIsSum", "calcRaw", "calcResult", "calcRule",
  "lastReading", "rawMean", "mean", "meanAbsError", "relativeError", "percentError",
  "rule", "ruleIsPower", "errA", "errB", "valueA", "valueB", "absA", "absB", "zValue", "zError", "zPercent", "shareA", "shareB",
] as const satisfies readonly (keyof MeasureResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
const pick = <T extends string>(order: readonly T[], value: T): T => (order.includes(value) ? value : order[0]!);
const instrumentOf = (params: MeasureParams) => MEASURE_INSTRUMENTS.find((lc) => Math.abs(lc - Number(params.instrument)) < 1e-9) ?? 0.01;
const half = (v: number) => Math.round(v * 2) / 2 || 0;

/** A reading on the chosen instrument: the rod's length in whole least counts. */
export function readMeasureRod(length: number, leastCount: number) {
  const places = Math.round(-Math.log10(leastCount));
  const counts = Math.round(clamp(length, MEASURE_ROD[0], MEASURE_ROD[1]) * 10 ** places);
  const text = (counts / 10 ** places).toFixed(places);
  let mainScale = Number(text);
  let division = 0;
  if (places === 2) {
    // Vernier: 10 vernier divisions span 9 mm, so the least count is 0.1 mm.
    mainScale = Math.floor(counts / 10) / 10;
    division = counts % 10;
  } else if (places === 3) {
    // Screw gauge: a 0.5 mm pitch over 50 circular divisions.
    const perPitch = Math.round(MEASURE_PITCH * 1000);
    mainScale = (Math.floor(counts / perPitch) * perPitch) / 1000;
    division = counts % perPitch;
  }
  return { reading: Number(text), text, places, figures: countSignificantFigures(text), mainScale, division };
}

export const measureModel: SimulationModel<MeasureState, MeasureParams, MeasureResults> = {
  id: "measure",
  defaultParams: { unit: "newton", equation: "velocity", derivation: "pendulum", instrument: 0.01, numeral: "a", calc: "masses", rule: "series" },
  outputs: OUTPUTS,
  stateVariables: ["mExp", "lExp", "tExp", "powA", "powB", "powC", "length", "keep", "lastReading", "errA", "errB"],

  initialize() {
    return { mExp: 0, lExp: 0, tExp: 0, powA: 0, powB: 0, powC: 0, length: 4.273, keep: 3, lastReading: 2.8, errA: 3, errB: 2 };
  },

  /** Play slides the rod out slowly, so the reading can be watched ticking over one least count at a time. */
  advance(state, dt) {
    const next = state.length + dt * 0.05;
    return { ...state, length: next > MEASURE_ROD[1] ? MEASURE_ROD[0] : next };
  },

  /** A step moves the rod by exactly one least count. */
  step(state, params, sign) {
    return { ...state, length: clamp(state.length + sign * instrumentOf(params), MEASURE_ROD[0], MEASURE_ROD[1]) };
  },

  derive(state, params) {
    const unitId = pick(MEASURE_UNIT_ORDER, params.unit);
    const unit = MEASURE_UNITS[unitId];
    const built: MeasureDim = [Math.round(state.mExp) || 0, Math.round(state.lExp) || 0, Math.round(state.tExp) || 0];

    const equationId = pick(MEASURE_EQUATION_ORDER, params.equation);
    const equation = MEASURE_EQUATIONS[equationId];
    const left = equation.terms[0]!.dim;
    const badIndex = equation.terms.findIndex((t) => !sameMeasureDim(t.dim, left));

    const derivationId = pick(MEASURE_DERIVATION_ORDER, params.derivation);
    const derivation = MEASURE_DERIVATIONS[derivationId];
    const dims = derivation.inputs.map((i) => i.dim) as unknown as readonly [MeasureDim, MeasureDim, MeasureDim];
    const powers: [number, number, number] = [half(state.powA), half(state.powB), half(state.powC)];
    const product = combineDims(dims, powers);
    const solution = solveDimensions(dims, derivation.result.dim) ?? [0, 0, 0];

    const leastCount = instrumentOf(params);
    const rod = readMeasureRod(state.length, leastCount);

    const numeralId = pick(MEASURE_NUMERAL_ORDER, params.numeral);
    const numeral = MEASURE_NUMERALS[numeralId];
    const keep = clamp(Math.round(state.keep), 1, 6);
    const roundedText = roundToFigures(numeral.text, keep);

    const calcId = pick(MEASURE_CALC_ORDER, params.calc);
    const calc = MEASURE_CALCS[calcId];
    const worked = calculateMeasured(calc);

    const last = clamp(state.lastReading, MEASURE_LAST_READING[0], MEASURE_LAST_READING[1]);
    const readings = [...MEASURE_READINGS.slice(0, -1), last];
    const rawMean = readings.reduce((s, r) => s + r, 0) / readings.length;
    // The mean is recorded to the same resolution as the readings, then each reading's error is taken from it.
    const mean = Number(roundToPlaces(written(rawMean), MEASURE_READING_PLACES));
    const meanAbsError = readings.reduce((s, r) => s + Math.abs(r - mean), 0) / readings.length;
    const relativeError = mean > 0 ? meanAbsError / mean : 0;

    const ruleId = pick(MEASURE_RULE_ORDER, params.rule);
    const rule = MEASURE_RULES[ruleId];
    const errA = clamp(state.errA, 0, 10);
    const errB = clamp(state.errB, 0, 10);
    const spread = propagateErrors(rule, errA, errB);

    return {
      unit: MEASURE_UNIT_ORDER.indexOf(unitId),
      mExp: built[0],
      lExp: built[1],
      tExp: built[2],
      targetM: unit.dim[0],
      targetL: unit.dim[1],
      targetT: unit.dim[2],
      unitMatches: sameMeasureDim(built, unit.dim) ? 1 : 0,
      builtCgsPower: cgsPowerOf(built) || 0,
      cgsPower: cgsPowerOf(unit.dim),
      equation: MEASURE_EQUATION_ORDER.indexOf(equationId),
      termCount: equation.terms.length,
      consistent: badIndex < 0 ? 1 : 0,
      badTerm: badIndex < 0 ? 0 : badIndex,
      derivation: MEASURE_DERIVATION_ORDER.indexOf(derivationId),
      powA: powers[0],
      powB: powers[1],
      powC: powers[2],
      builtM: product[0],
      builtL: product[1],
      builtT: product[2],
      derived: sameMeasureDim(product, derivation.result.dim) ? 1 : 0,
      solA: solution[0],
      solB: solution[1],
      solC: solution[2],
      instrument: MEASURE_INSTRUMENTS.indexOf(leastCount as (typeof MEASURE_INSTRUMENTS)[number]),
      length: clamp(state.length, MEASURE_ROD[0], MEASURE_ROD[1]),
      leastCount,
      reading: rod.reading,
      readingFigures: rod.figures,
      readingPlaces: rod.places,
      mainScale: rod.mainScale,
      division: rod.division,
      numeral: MEASURE_NUMERAL_ORDER.indexOf(numeralId),
      numeralFigures: countSignificantFigures(numeral.text),
      keep,
      rounded: Number(roundedText),
      roundedFigures: countSignificantFigures(roundedText),
      calc: MEASURE_CALC_ORDER.indexOf(calcId),
      calcIsSum: calc.kind === "sum" ? 1 : 0,
      calcRaw: Number(worked.raw),
      calcResult: Number(worked.result),
      calcRule: worked.rule,
      lastReading: last,
      rawMean,
      mean,
      meanAbsError,
      relativeError,
      percentError: 100 * relativeError,
      rule: MEASURE_RULE_ORDER.indexOf(ruleId),
      ruleIsPower: rule.kind === "power" ? 1 : 0,
      errA,
      errB,
      valueA: rule.a.value,
      valueB: rule.b.value,
      absA: spread.da,
      absB: spread.db,
      zValue: spread.z,
      zError: spread.dz,
      zPercent: spread.percent,
      shareA: spread.shareA,
      shareB: spread.shareB,
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof MeasureState] : undefined;
  },

  setVariable(state, id, value) {
    switch (id) {
      case "mExp": return { ...state, mExp: clamp(Math.round(value), -3, 3) };
      case "lExp": return { ...state, lExp: clamp(Math.round(value), -3, 3) };
      case "tExp": return { ...state, tExp: clamp(Math.round(value), -3, 3) };
      case "powA": return { ...state, powA: clamp(half(value), -2, 2) };
      case "powB": return { ...state, powB: clamp(half(value), -2, 2) };
      case "powC": return { ...state, powC: clamp(half(value), -2, 2) };
      case "length": return { ...state, length: clamp(value, MEASURE_ROD[0], MEASURE_ROD[1]) };
      case "keep": return { ...state, keep: clamp(Math.round(value), 1, 6) };
      case "lastReading": return { ...state, lastReading: clamp(value, MEASURE_LAST_READING[0], MEASURE_LAST_READING[1]) };
      case "errA": return { ...state, errA: clamp(value, 0, 10) };
      case "errB": return { ...state, errB: clamp(value, 0, 10) };
      default: return state;
    }
  },
};
