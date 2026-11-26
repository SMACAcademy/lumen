import { type AngleUnit, fromRadians, piFraction } from "./angle";

/** Snap floating-point noise (e.g. sin π = 1.22e-16) to exactly zero. */
export function snapZero(value: number, epsilon = 1e-12): number {
  return Math.abs(value) < epsilon ? 0 : value;
}

/**
 * Format a number with fixed decimals, never producing "-0.0000".
 * Uses the typographic minus sign for negative values.
 */
export function formatNumber(value: number, digits = 4): string {
  if (!Number.isFinite(value)) {
    if (Number.isNaN(value)) return "undefined";
    return value > 0 ? "∞" : "−∞";
  }
  const fixed = snapZero(value, 0.5 * 10 ** -digits).toFixed(digits);
  if (/^-0\.?0*$/.test(fixed)) return fixed.slice(1);
  return fixed.startsWith("-") ? `−${fixed.slice(1)}` : fixed;
}

const SUPERSCRIPT: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻" };

/**
 * A number to a few significant figures, the way a chemist writes it:
 * 0.00460, 54.0, 487 — and 1.74 × 10⁻⁵ once it gets too small or too large
 * to read as a plain decimal.
 */
export function formatSignificant(value: number, figures = 3): string {
  if (!Number.isFinite(value)) return formatNumber(value);
  if (value === 0) return "0";
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  if (exponent < -3 || exponent >= 5) {
    const mantissa = value / 10 ** exponent;
    const power = String(exponent)
      .split("")
      .map((c) => SUPERSCRIPT[c] ?? c)
      .join("");
    return `${formatNumber(mantissa, figures - 1)} × 10${power}`;
  }
  return formatNumber(value, Math.max(0, figures - 1 - exponent));
}

export interface FormatAngleOptions {
  digits?: number;
  /** For radians, prefer "π/4" style output when the angle is a nice multiple of π. */
  piForm?: boolean;
}

export function formatAngle(rad: number, unit: AngleUnit, options: FormatAngleOptions = {}): string {
  const { piForm = true } = options;
  if (unit === "deg") {
    const deg = fromRadians(rad, "deg");
    const isWhole = Math.abs(deg - Math.round(deg)) < 1e-6;
    return `${formatNumber(deg, options.digits ?? (isWhole ? 0 : 1))}°`;
  }
  if (piForm) {
    const fraction = piFraction(rad);
    if (fraction !== null) return `${fraction} rad`;
  }
  return `${formatNumber(rad, options.digits ?? 3)} rad`;
}
