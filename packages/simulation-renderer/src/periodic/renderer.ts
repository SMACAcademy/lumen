/**
 * The first twenty elements as a heat map, and the same property plotted
 * against atomic number.
 *
 * On the table, deeper colour means more of the property: radius pools in
 * the bottom left, ionisation enthalpy and electronegativity in the top
 * right. On the plot, the same values rise and fall period by period — the
 * sawtooth that gave the periodic table its name — with the exceptions
 * standing out as dips where the trend says there should be none.
 *
 * Two more views share the space under the table (class 9): the atom's
 * electron shells, and an isotope — its nucleus counted out in protons and
 * neutrons, written as ᴬ_Z X, with a bar for a sample mixing it with the
 * element's most common isotope.
 */

import { ELEMENTS, PROPERTY_LABELS, PROPERTY_ORDER, propertyOf, type PropertyId } from "@ise/chemistry-engine";
import type { Rect } from "@ise/graph-engine";
import type { Results } from "@ise/science-engine";
import { formatNumber } from "@ise/units";
import { clamp, label, num, segment } from "../shared/draw";
import { createPlane, drawPlane, type Plane } from "../shared/plane";
import type { SimulationRenderer } from "../types";

export interface PeriodicLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The table: eight columns (groups 1, 2, 13–18) by four periods. */
  table: Rect;
  /** The property against Z. */
  chart: Rect;
}

export function computePeriodicLayout(width: number): PeriodicLayout {
  const compact = width < 620;
  const pad = compact ? 6 : 16;
  const inner = Math.max(240, width - 2 * pad);
  const tableHeight = compact ? 190 : 230;
  const table = { x: pad, y: pad + 22, width: inner, height: tableHeight };
  const chart = { x: pad + 48, y: table.y + tableHeight + 30, width: inner - 60, height: compact ? 170 : 200 };
  return { width, height: Math.ceil(chart.y + chart.height + 30), compact, table, chart };
}

/** Column for a group in the short table: 1, 2, then 13–18 as columns 3–8. */
export function columnOf(group: number): number {
  return group <= 2 ? group - 1 : group - 11;
}

export function cellRect(layout: PeriodicLayout, period: number, group: number): Rect {
  const { table } = layout;
  const w = table.width / 8;
  const h = table.height / 4;
  return { x: table.x + columnOf(group) * w + 2, y: table.y + (period - 1) * h + 2, width: w - 4, height: h - 4 };
}

function propertyFrom(results: Results): PropertyId {
  return PROPERTY_ORDER[num(results.property)] ?? "radius";
}

/** Low and high of a property across the elements that have it. */
export function propertyRange(property: PropertyId): [number, number] {
  const values = ELEMENTS.map((e) => propertyOf(e, property)).filter((v): v is number => v !== null);
  return [Math.min(...values), Math.max(...values)];
}

export function propertyPlane(layout: PeriodicLayout, property: PropertyId): Plane {
  const [lo, hi] = propertyRange(property);
  const margin = (hi - lo) * 0.1;
  return createPlane(layout.chart, [0.5, ELEMENTS.length + 0.5], [Math.min(0, lo - margin), hi + margin]);
}

/** The panel the isotope view fills: the full width under the table. */
export function isotopeArea(layout: PeriodicLayout): Rect {
  const { table, chart } = layout;
  return { x: table.x, y: chart.y - 12, width: table.width, height: chart.height + 24 };
}

const SUPERSCRIPT = "⁰¹²³⁴⁵⁶⁷⁸⁹";
/** "³⁵Cl" — an isotope written the way a book prints it inline. */
export function isotopeName(A: number, symbol: string): string {
  return `${String(Math.round(A)).replace(/\d/g, (d) => SUPERSCRIPT[Number(d)]!)}${symbol}`;
}

/** Up to two decimals, without trailing zeros: 35.5, 36, 35.48. */
function trimmed(v: number): string {
  const text = formatNumber(v, 2);
  return text.includes(".") ? text.replace(/\.?0+$/, "") : text;
}

const HYDROGEN_NAMES: Record<number, string> = { 1: "protium", 2: "deuterium", 3: "tritium" };

/** Points packed in a disc (a sunflower spiral), centre first. */
export function nucleonPositions(count: number, radius: number): { x: number; y: number; r: number }[] {
  const r = Math.min(7, (radius - 2) / (1.18 * Math.sqrt(Math.max(1, count)) + 1));
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: count }, (_, i) => {
    const d = count === 1 ? 0 : 1.18 * r * Math.sqrt(i + 0.5);
    return { x: d * Math.cos(i * golden), y: d * Math.sin(i * golden), r };
  });
}

function valueText(property: PropertyId, v: number): string {
  return property === "electronegativity" ? formatNumber(v, 2) : formatNumber(v, 0);
}

export const periodicRenderer: SimulationRenderer<PeriodicLayout> = {
  id: "periodic",
  layout: (width) => computePeriodicLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results, highlight } = input;
    const has = (layer: string) => layers.has(layer);
    const dim = (layer: string) => (highlight && highlight !== layer ? 0.3 : 1);
    ctx.clearRect(0, 0, layout.width, layout.height);

    const property = propertyFrom(results);
    const Z = Math.round(num(results.Z, 1));
    const [lo, hi] = propertyRange(property);
    // Electron gain is "bigger" when more negative, so the heat map follows its size.
    const strength = (v: number) => (property === "electronGain" ? (hi - v) / (hi - lo || 1) : (v - lo) / (hi - lo || 1));

    if (has("labels")) {
      const { name, unit } = PROPERTY_LABELS[property];
      // With the atom showing, the table is for choosing an element, not for reading a trend.
      const heading = has("atom") ? "Click an element to see its atom" : `${name}${unit ? ` (${unit})` : ""}: deeper colour = more`;
      label(ctx, heading, layout.table.x, layout.table.y - 14, { color: theme.text, font: theme.fontStrong });
    }

    // ── The table ─────────────────────────────────────────────────────────
    if (has("table")) {
      for (const e of ELEMENTS) {
        const r = cellRect(layout, e.period, e.group);
        const v = propertyOf(e, property);
        ctx.save();
        ctx.globalAlpha = dim("table");
        ctx.fillStyle = theme.surface2;
        ctx.fillRect(r.x, r.y, r.width, r.height);
        if (v !== null) {
          ctx.globalAlpha = (0.12 + 0.78 * clamp(strength(v), 0, 1)) * dim("table");
          ctx.fillStyle = theme.curve;
          ctx.fillRect(r.x, r.y, r.width, r.height);
        }
        if (e.Z === Z) {
          ctx.globalAlpha = dim("table");
          ctx.strokeStyle = theme.angle;
          ctx.lineWidth = 3;
          ctx.strokeRect(r.x, r.y, r.width, r.height);
        }
        ctx.restore();
        if (has("labels")) {
          label(ctx, e.symbol, r.x + r.width / 2, r.y + r.height * 0.38, { color: theme.text, font: theme.fontStrong, align: "center" });
          // On the deepest cells muted text disappears, so strong values get full-contrast text.
          const deep = v !== null && strength(v) > 0.55;
          label(ctx, v === null ? "—" : valueText(property, v), r.x + r.width / 2, r.y + r.height * 0.74, { color: deep ? theme.text : theme.muted, font: theme.font, align: "center" });
        }
      }
    }

    // ── The property against atomic number ───────────────────────────────
    if (has("chart")) {
      const plane = propertyPlane(layout, property);
      drawPlane(ctx, plane, theme, { xLabel: "Z", yLabel: PROPERTY_LABELS[property].unit || "value" });
      ctx.save();
      ctx.globalAlpha = dim("chart");
      // Period boundaries.
      ctx.strokeStyle = theme.grid;
      ctx.setLineDash([4, 4]);
      for (const edge of [2.5, 10.5, 18.5]) {
        const [x] = plane.toPx(edge, 0);
        segment(ctx, x, plane.rect.y, x, plane.rect.y + plane.rect.height);
      }
      ctx.setLineDash([]);
      // The values, joined where both neighbours have one.
      ctx.strokeStyle = theme.curve;
      ctx.lineWidth = 2;
      let previous: [number, number] | null = null;
      for (const e of ELEMENTS) {
        const v = propertyOf(e, property);
        if (v === null) {
          previous = null;
          continue;
        }
        const [px, py] = plane.toPx(e.Z, v);
        if (previous) segment(ctx, previous[0], previous[1], px, py);
        previous = [px, py];
        ctx.fillStyle = e.Z === Z ? theme.angle : theme.curve;
        ctx.beginPath();
        ctx.arc(px, py, e.Z === Z ? 6 : 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      if (has("labels")) {
        const e = ELEMENTS[Z - 1]!;
        const v = propertyOf(e, property);
        label(ctx, `${e.name} (Z = ${e.Z}): ${v === null ? "not defined" : `${valueText(property, v)} ${PROPERTY_LABELS[property].unit}`.trim()}`, plane.rect.x + plane.rect.width, plane.rect.y - 16, {
          // Above the plot, where it can never sit on top of a point.
          color: theme.angle,
          font: theme.fontStrong,
          align: "right",
          background: theme.background,
        });
      }
    }

    // ── The atom: a nucleus and its shells of electrons (class 9) ─────────
    if (has("atom")) {
      const e = ELEMENTS[Z - 1]!;
      const area = layout.chart;
      const cx = area.x + area.width / 2 - (layout.compact ? 0 : 60);
      const cy = area.y + area.height / 2;
      const shells = [num(results.shellK), num(results.shellL), num(results.shellM), num(results.shellN)].filter((n) => n > 0);
      const step = Math.min(24, (area.height / 2 - 18) / Math.max(1, shells.length));
      const core = 16;
      ctx.save();
      ctx.fillStyle = theme.cosine;
      ctx.beginPath();
      ctx.arc(cx, cy, core, 0, Math.PI * 2);
      ctx.fill();
      shells.forEach((count, i) => {
        const r = core + step * (i + 1);
        ctx.strokeStyle = theme.muted;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = i === shells.length - 1 ? theme.angle : theme.sine;
        for (let k = 0; k < count; k++) {
          const a = (k / count) * Math.PI * 2 - Math.PI / 2;
          ctx.beginPath();
          ctx.arc(cx + r * Math.cos(a), cy + r * Math.sin(a), 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.restore();
      label(ctx, `${num(results.protons)}p`, cx, cy - 5, { color: "#ffffff", font: theme.fontStrong, align: "center" });
      label(ctx, `${num(results.neutrons)}n`, cx, cy + 7, { color: "#ffffff", font: theme.font, align: "center" });
      if (has("labels")) {
        const x = layout.compact ? area.x : cx + core + step * 4 + 16;
        const y = layout.compact ? area.y + area.height + 6 : cy - 24;
        label(ctx, `${e.name}: ${shells.join(", ")}`, x, y, { color: theme.text, font: theme.fontStrong });
        label(ctx, `${num(results.valenceElectrons)} in the outer shell · valency ${num(results.valency)}`, x, y + 18, { color: theme.angle, font: theme.font });
        if (!layout.compact) label(ctx, `mass number ${num(results.massNumber)} = ${num(results.protons)} protons + ${num(results.neutrons)} neutrons`, x, y + 36, { color: theme.muted, font: theme.font });
      }
    }

    // ── An isotope: its nucleus, its symbol ᴬ_Z X, and a mixed sample ────
    if (has("isotope")) {
      const e = ELEMENTS[Z - 1]!;
      const area = isotopeArea(layout);
      const p = Math.round(num(results.protons, Z));
      const n = Math.round(num(results.isotopeNeutrons));
      const A = Math.round(num(results.isotopeMass, p + n));
      const common = Math.round(num(results.massNumber, A));
      const R = layout.compact ? 44 : 56;
      const cx = area.x + R + 12;
      const cy = area.y + 12 + R;
      ctx.save();
      ctx.globalAlpha = dim("isotope");
      ctx.strokeStyle = theme.muted;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      // Protons spread evenly among the neutrons, as in a real nucleus.
      nucleonPositions(p + n, R).forEach((pt, i) => {
        const proton = Math.floor(((i + 1) * p) / (p + n)) > Math.floor((i * p) / (p + n));
        ctx.fillStyle = proton ? theme.cosine : theme.neutral;
        ctx.beginPath();
        ctx.arc(cx + pt.x, cy + pt.y, pt.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      // The symbol: mass number up, atomic number down, then the element.
      const x0 = cx + R + 22;
      const big = theme.fontStrong.replace(/\d+px/, "30px");
      const digits = Math.max(String(A).length, String(p).length);
      label(ctx, String(A), x0 + digits * 8, cy - 18, { color: theme.text, font: theme.fontStrong, align: "right" });
      label(ctx, String(p), x0 + digits * 8, cy + 8, { color: theme.cosine, font: theme.fontStrong, align: "right" });
      label(ctx, e.symbol, x0 + digits * 8 + 4, cy - 4, { color: theme.text, font: big });
      const nickname = e.Z === 1 ? HYDROGEN_NAMES[A] : undefined;
      label(ctx, `${e.name}-${A}${nickname ? ` (${nickname})` : ""}`, x0, cy + 32, { color: theme.text, font: theme.fontStrong });
      label(ctx, `${p} protons + ${n} neutrons`, x0, cy + 50, { color: theme.muted, font: theme.font });
      if (num(results.radioactive) === 1) label(ctx, "radioactive", x0, cy + 66, { color: theme.secant, font: theme.font });

      // A sample: mix % of the most common isotope, the rest this one.
      const mix = A === common ? 100 : clamp(num(results.mix, 100), 0, 100);
      const bar = { x: area.x, y: area.y + area.height - 46, width: area.width, height: 14 };
      const split = bar.x + (bar.width * mix) / 100;
      ctx.save();
      ctx.globalAlpha = dim("isotope");
      ctx.fillStyle = theme.cosine;
      ctx.fillRect(bar.x, bar.y, split - bar.x, bar.height);
      ctx.fillStyle = theme.angle;
      ctx.fillRect(split, bar.y, bar.x + bar.width - split, bar.height);
      ctx.restore();
      label(ctx, `${formatNumber(mix, 0)}% ${isotopeName(common, e.symbol)}`, bar.x, bar.y - 10, { color: theme.cosine, font: theme.fontStrong });
      if (mix < 100) label(ctx, `${formatNumber(100 - mix, 0)}% ${isotopeName(A, e.symbol)}`, bar.x + bar.width, bar.y - 10, { color: theme.angle, font: theme.fontStrong, align: "right" });
      if (has("labels")) {
        label(ctx, `Average atomic mass = ${trimmed(num(results.averageMass, common))} u`, bar.x, bar.y + bar.height + 14, { color: theme.text, font: theme.fontStrong });
      }
    }
  },

  /** Click an element in the table, or a point on the plot, to focus on it. */
  pick(layout, x, y, locked, results) {
    if (locked === "chart" || (!locked && x >= layout.chart.x && x <= layout.chart.x + layout.chart.width && y >= layout.chart.y - 8 && y <= layout.chart.y + layout.chart.height + 8)) {
      const plane = propertyPlane(layout, propertyFrom(results));
      const [z] = plane.fromPx(x, y);
      return { writes: [{ variable: "Z", value: clamp(Math.round(z), 1, ELEMENTS.length) }], region: "chart", press: "sweep" };
    }
    if (locked && locked !== "table") return null;
    for (const e of ELEMENTS) {
      const r = cellRect(layout, e.period, e.group);
      if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) {
        return { writes: [{ variable: "Z", value: e.Z }], region: "table", press: "jump" };
      }
    }
    return null;
  },
};
