import { scaleLinear } from "d3-scale";
import { type AngleUnit, formatAngle, formatNumber } from "@ise/units";

export interface Tick {
  value: number;
  label: string;
  /** Major ticks get a grid line and a label; minor ticks only a mark. */
  major: boolean;
}

export type AxisKind = "angle" | "linear";

const QUARTER = Math.PI / 4;

/**
 * Ticks at every π/4 inside `domain`, major (labelled) at every π/2.
 * Labels follow the learner's unit: "90°" or "π/2".
 */
export function angleTicks(domain: readonly [number, number], unit: AngleUnit): Tick[] {
  const [lo, hi] = domain[0] <= domain[1] ? domain : [domain[1], domain[0]];
  const ticks: Tick[] = [];
  for (let i = Math.ceil(lo / QUARTER - 1e-9); i <= Math.floor(hi / QUARTER + 1e-9); i++) {
    const value = i * QUARTER;
    const label = unit === "deg" ? formatAngle(value, "deg") : formatAngle(value, "rad").replace(" rad", "");
    ticks.push({ value, label, major: i % 2 === 0 });
  }
  return ticks;
}

/** "Nice" round ticks for a numeric domain (via d3's tick algorithm). */
export function linearTicks(domain: readonly [number, number], count = 5): Tick[] {
  const values = scaleLinear().domain([...domain]).ticks(count);
  const step = values.length > 1 ? Math.abs(values[1]! - values[0]!) : 1;
  const digits = step >= 1 ? 0 : Math.min(4, Math.ceil(-Math.log10(step) - 1e-9));
  // "1.0" reads as "1"; "0.50" as "0.5".
  const trim = (s: string) => (s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s);
  return values.map((value) => ({ value, label: trim(formatNumber(value, digits)), major: true }));
}

export function axisTicks(kind: AxisKind, domain: readonly [number, number], unit: AngleUnit, count?: number): Tick[] {
  return kind === "angle" ? angleTicks(domain, unit) : linearTicks(domain, count);
}
