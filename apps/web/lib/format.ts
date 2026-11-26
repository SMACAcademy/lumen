import type { Quantity, RangeControl } from "@ise/concept-schema";
import type { Results } from "@ise/science-engine";
import { type AngleUnit, type UnitId, UNITS, convert, formatAngle, formatNumber, formatSignificant } from "@ise/units";

/** Unit a range control is displayed in, given the learner's angle preference. */
export function displayUnitFor(unit: UnitId, angleUnit: AngleUnit): UnitId {
  const dimension = UNITS[unit].dimension;
  if (dimension === "angle") return angleUnit === "deg" ? "deg" : "rad";
  if (dimension === "angular-velocity") return angleUnit === "deg" ? "deg/s" : "rad/s";
  return unit;
}

export function toDisplay(value: number, control: RangeControl, angleUnit: AngleUnit): number {
  return convert(value, control.unit, displayUnitFor(control.unit, angleUnit));
}

export function fromDisplay(value: number, control: RangeControl, angleUnit: AngleUnit): number {
  return convert(value, displayUnitFor(control.unit, angleUnit), control.unit);
}

/** Decimal places that make sense for a control's step in the display unit. */
export function displayDigits(control: RangeControl, angleUnit: AngleUnit): number {
  const step = toDisplay(control.step, control, angleUnit);
  if (step >= 1) return 0;
  return Math.min(4, Math.max(1, Math.ceil(-Math.log10(step))));
}

export function formatControlValue(value: number, control: RangeControl, angleUnit: AngleUnit): string {
  const unit = displayUnitFor(control.unit, angleUnit);
  if (UNITS[unit].dimension === "angle") return formatAngle(value, angleUnit === "deg" ? "deg" : "rad");
  const shown = formatNumber(toDisplay(value, control, angleUnit), displayDigits(control, angleUnit));
  return `${shown} ${UNITS[unit].symbol}`.trim();
}

export function formatQuantity(quantity: Quantity, results: Results, angleUnit: AngleUnit): string {
  const raw = results[quantity.result];
  const format = quantity.format;
  if (typeof raw !== "number") return String(raw ?? "—");
  switch (format.kind) {
    case "number":
      return formatNumber(raw, format.digits);
    case "angle":
      return formatAngle(raw, angleUnit);
    case "integer":
      return formatNumber(raw, 0);
    case "sig":
      return formatSignificant(raw, format.figures);
    case "label":
      return format.labels[String(raw)] ?? String(raw);
  }
}

/** Numeric value of a quantity (for tables and comparisons). */
export function quantityValue(quantity: Quantity, results: Results): number {
  const raw = results[quantity.result];
  return typeof raw === "number" ? raw : Number.NaN;
}

/** Render "sin θ" with a power as "sin²θ"; plain symbols get a trailing superscript. */
export function splitSymbolForPower(symbol: string): { head: string; tail: string } {
  const space = symbol.indexOf(" ");
  if (space === -1) return { head: symbol, tail: "" };
  return { head: symbol.slice(0, space), tail: symbol.slice(space + 1) };
}

export function superscript(n: number): string {
  const map: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "-": "⁻" };
  return String(n)
    .split("")
    .map((c) => map[c] ?? c)
    .join("");
}
