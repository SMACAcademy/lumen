/** Angle utilities. Internally the engine always works in radians. */

export const TAU = Math.PI * 2;
export const DEG_PER_RAD = 180 / Math.PI;

export type AngleUnit = "deg" | "rad";

export function degToRad(deg: number): number {
  return deg / DEG_PER_RAD;
}

export function radToDeg(rad: number): number {
  return rad * DEG_PER_RAD;
}

export function toRadians(value: number, unit: AngleUnit): number {
  return unit === "deg" ? degToRad(value) : value;
}

export function fromRadians(rad: number, unit: AngleUnit): number {
  return unit === "deg" ? radToDeg(rad) : rad;
}

/** Wrap any angle into [0, 2π). */
export function normalizeRadians(rad: number): number {
  const wrapped = rad % TAU;
  const positive = wrapped < 0 ? wrapped + TAU : wrapped;
  // Values like 2π − 1e-16 should read as 0, not as "almost a full turn".
  return Math.abs(positive - TAU) < 1e-12 ? 0 : positive;
}

/** Wrap any angle into [0, 360). */
export function normalizeDegrees(deg: number): number {
  return radToDeg(normalizeRadians(degToRad(deg)));
}

/** Signed smallest rotation (in (−π, π]) that takes angle `from` to angle `to`. */
export function shortestAngleDelta(from: number, to: number): number {
  return shortestDelta(from, to, TAU);
}

/** Wrap `value` into [min, min + period). */
export function wrapInto(value: number, min: number, period: number): number {
  const wrapped = (((value - min) % period) + period) % period;
  return Math.abs(wrapped - period) < 1e-12 ? min : min + wrapped;
}

/** Signed smallest step (in (−period/2, period/2]) from `from` to an equivalent of `to`. */
export function shortestDelta(from: number, to: number, period: number): number {
  const delta = wrapInto(to - from, 0, period);
  return delta > period / 2 ? delta - period : delta;
}

/** Number of completed revolutions (signed, floor) for an unwrapped angle. */
export function revolutions(rad: number): number {
  return Math.floor(rad / TAU + 1e-12);
}

const PI_DENOMINATORS = [1, 2, 3, 4, 6, 12] as const;

/**
 * Express an angle as a rational multiple of π when it is (nearly) one of the
 * "nice" school angles, e.g. π/4, 3π/2. Returns null otherwise.
 */
export function piFraction(rad: number, tolerance = 1e-9): string | null {
  const multiple = rad / Math.PI;
  for (const den of PI_DENOMINATORS) {
    const num = Math.round(multiple * den);
    if (Math.abs(multiple * den - num) < tolerance * den) {
      if (num === 0) return "0";
      const g = gcd(Math.abs(num), den);
      const n = num / g;
      const d = den / g;
      const sign = n < 0 ? "−" : "";
      const absN = Math.abs(n);
      const numerator = absN === 1 ? "π" : `${absN}π`;
      return d === 1 ? `${sign}${numerator}` : `${sign}${numerator}/${d}`;
    }
  }
  return null;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
