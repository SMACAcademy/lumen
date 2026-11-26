/**
 * Groups 17 and 18 in three pictures.
 *
 * Trends: a bar for each element down the group, from a zero line (electron
 * gain enthalpies and pKa go below it). A value NCERT does not give is a
 * dashed outline, not a bar.
 *
 * Displacement: a tube of halide solution before, and after the halogen is
 * added — the colour of whichever halogen ends up free.
 *
 * Shapes: the interhalogen or xenon compound turned in 3D, with the central
 * atom's lone pairs as lobes.
 */

import {
  compoundGeometry,
  GROUP_FAMILY_ORDER,
  GROUP_PROPERTIES,
  GROUP_PROPERTY_ORDER,
  groupElements,
  HALOGEN_COMPOUND_ORDER,
  HALOGEN_COMPOUNDS,
  HALOGEN_ELEMENTS,
  HALOGEN_HYBRIDS,
  HALOGEN_SHAPES,
  rotate,
} from "@ise/chemistry-engine";
import { arrow, clamp, label, num } from "../shared/draw";
import type { SimulationRenderer } from "../types";

export interface HalogensLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The bar chart: left and right edges, top, and the line the symbols sit under. */
  plot: { x1: number; x2: number; top: number; bottom: number };
}

export function computeHalogensLayout(width: number): HalogensLayout {
  const compact = width < 560;
  const height = compact ? 330 : 360;
  return { width, height, compact, plot: { x1: 24, x2: width - 24, top: 50, bottom: height - 74 } };
}

/** Space kept under a downward bar for its value, px. */
export const BELOW_ROOM = 18;

/** The y of a value, on a scale that always includes zero. */
export function barScale(layout: HalogensLayout, values: readonly number[]): (v: number) => number {
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  const span = Math.max(hi - lo, 1e-9);
  // Bars that hang below zero need room for their numbers above the symbols.
  const floor = layout.plot.bottom - (lo < 0 ? BELOW_ROOM : 0);
  return (v) => floor - ((v - lo) / span) * (floor - layout.plot.top);
}

/** Halogens dissolved in water, as they look. */
export const HALOGEN_WATER: readonly { colour: string; name: string }[] = [
  { colour: "#f3f0b0", name: "pale yellow" },
  { colour: "#d6e56c", name: "pale green" },
  { colour: "#d9822b", name: "orange" },
  { colour: "#8a4b2a", name: "brown" },
];

const ATOM_FILL: Record<string, string> = { F: "#86efac", O: "#ef4444", Cl: "#22c55e", Br: "#b45309", I: "#a855f7", Xe: "#22d3ee" };
const LIGHT = new Set(["F", "Cl", "Xe"]);
const minus = (v: number) => (v < 0 ? `−${Math.abs(v)}` : String(v));
const signed = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(2)}`;
/** The view the molecule is tilted to. */
const PITCH = 0.35;

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, alpha = 1) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export const halogensRenderer: SimulationRenderer<HalogensLayout> = {
  id: "halogens",
  layout: (width) => computeHalogensLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height, plot } = layout;
    ctx.clearRect(0, 0, width, height);
    const caption = (words: string) => label(ctx, words, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });

    if (has("bars")) {
      const family = GROUP_FAMILY_ORDER[Math.round(num(results.family))] ?? "halogens";
      const elements = groupElements(family);
      const property = GROUP_PROPERTY_ORDER[Math.round(num(results.property))] ?? "boiling";
      const info = GROUP_PROPERTIES[property];
      const values = elements.map((e) => e[property]);
      const known = values.filter((v): v is number => v !== null);
      const y = barScale(layout, known.length > 0 ? known : [1]);
      const slot = (plot.x2 - plot.x1) / elements.length;
      const barWidth = Math.min(46, slot * 0.6);
      const chosen = clamp(Math.round(num(results.position, 1)), 1, elements.length) - 1;
      label(ctx, info.unit ? `${info.name} / ${info.unit}` : info.name, width / 2, 18, { color: theme.text, font: theme.fontStrong, align: "center" });
      elements.forEach((e, i) => {
        const cx = plot.x1 + slot * (i + 0.5);
        const v = values[i] ?? null;
        const colour = i === chosen ? theme.angle : theme.sine;
        if (v === null) {
          ctx.save();
          ctx.strokeStyle = theme.muted;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(cx - barWidth / 2, y(0) - 26, barWidth, 26);
          ctx.restore();
          if (has("labels")) label(ctx, "not given", cx, y(0) - 36, { color: theme.muted, font: theme.font, align: "center" });
        } else {
          const end = y(v);
          ctx.save();
          ctx.fillStyle = colour;
          ctx.globalAlpha = i === chosen ? 1 : 0.6;
          ctx.fillRect(cx - barWidth / 2, Math.min(end, y(0)), barWidth, Math.max(2, Math.abs(end - y(0))));
          ctx.restore();
          if (has("labels")) label(ctx, minus(v), cx, end + (v < 0 ? 11 : -10), { color: colour, font: theme.font, align: "center" });
        }
        label(ctx, e.symbol, cx, plot.bottom + 22, { color: i === chosen ? theme.angle : theme.text, font: theme.fontStrong, align: "center" });
      });
      ctx.save();
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(plot.x1, y(0));
      ctx.lineTo(plot.x2, y(0));
      ctx.stroke();
      ctx.restore();
      if (has("labels")) {
        const e = elements[chosen]!;
        const v = values[chosen] ?? null;
        const what = info.name.charAt(0).toLowerCase() + info.name.slice(1);
        caption(v === null ? `${e.name}: NCERT gives no ${what}` : `${e.name}: ${what} ${minus(v)}${info.unit ? ` ${info.unit}` : ""}`);
      }
    }

    if (has("tubes")) {
      const oxidant = clamp(Math.round(num(results.oxidant)), 0, 3);
      const halide = clamp(Math.round(num(results.halide)), 0, 3);
      const displaces = num(results.displaces) === 1;
      const ox = HALOGEN_ELEMENTS[oxidant]!;
      const hal = HALOGEN_ELEMENTS[halide]!;
      const tw = 56;
      const top = 62;
      const bottom = height - 96;
      const leftX = width / 2 - 86 - tw / 2;
      const rightX = width / 2 + 86 - tw / 2;
      const tube = (x: number, fill: string, alpha: number) => {
        ctx.save();
        ctx.fillStyle = fill;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(x, top + 26);
        ctx.lineTo(x, bottom - tw / 2);
        ctx.arc(x + tw / 2, bottom - tw / 2, tw / 2, Math.PI, 0, true);
        ctx.lineTo(x + tw, top + 26);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = theme.axis;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom - tw / 2);
        ctx.arc(x + tw / 2, bottom - tw / 2, tw / 2, Math.PI, 0, true);
        ctx.lineTo(x + tw, top);
        ctx.stroke();
        ctx.restore();
      };
      label(ctx, `K${hal.symbol} solution`, leftX + tw / 2, top - 18, { color: theme.text, font: theme.fontStrong, align: "center" });
      tube(leftX, theme.sine, 0.14);
      label(ctx, "colourless", leftX + tw / 2, bottom + 16, { color: theme.muted, font: theme.font, align: "center" });
      arrow(ctx, leftX + tw + 14, (top + bottom) / 2, rightX - 14, (top + bottom) / 2, { color: theme.muted, width: 2, head: 8 });
      label(ctx, `+ ${ox.symbol}₂`, width / 2, (top + bottom) / 2 - 14, { color: theme.text, font: theme.fontStrong, align: "center" });
      if (has("labels")) {
        const shown = HALOGEN_WATER[displaces ? halide : oxidant]!;
        tube(rightX, shown.colour, 0.85);
        label(ctx, displaces ? `${hal.symbol}₂ set free` : "no reaction", rightX + tw / 2, top - 18, { color: theme.angle, font: theme.fontStrong, align: "center" });
        label(ctx, shown.name, rightX + tw / 2, bottom + 16, { color: theme.muted, font: theme.font, align: "center" });
        const eOx = ox.potential ?? 0;
        const eHal = hal.potential ?? 0;
        if (oxidant === halide) caption("No reaction: it is the same halogen");
        else if (displaces) caption(`${ox.symbol}₂ + 2${hal.symbol}⁻ → 2${ox.symbol}⁻ + ${hal.symbol}₂ · E° = ${eOx.toFixed(2)} − ${eHal.toFixed(2)} = ${signed(num(results.emf))} V`);
        else caption(`No reaction: E° = ${eOx.toFixed(2)} − ${eHal.toFixed(2)} = ${signed(num(results.emf))} V`);
      } else {
        tube(rightX, theme.sine, 0.05);
        label(ctx, "?", rightX + tw / 2, (top + bottom) / 2, { color: theme.muted, font: theme.fontStrong, align: "center" });
      }
    }

    if (has("shape")) {
      const id = HALOGEN_COMPOUND_ORDER[Math.round(num(results.compound))] ?? "xef4";
      const compound = HALOGEN_COMPOUNDS[id];
      const { bonds, lone } = compoundGeometry(id);
      const yaw = num(results.yaw, 0.6);
      const cx = width / 2;
      const cy = (height - 40) / 2 + 14;
      const reach = Math.min(width, height - 60) * 0.3;
      // After turning: across, depth (larger is further away), up.
      const place = (v: readonly [number, number, number], length: number) => {
        const [x, depth, up] = rotate(v, yaw, PITCH);
        const scale = 1 - 0.16 * depth;
        return { x: cx + x * length * scale, y: cy - up * length * scale, scale, depth };
      };
      label(ctx, compound.formula, width / 2, 18, { color: theme.text, font: theme.fontStrong, align: "center" });
      const items: { depth: number; draw: () => void }[] = [];
      if (has("labels")) {
        for (const v of lone) {
          const tip = place(v, reach * 0.62);
          const angle = Math.atan2(tip.y - cy, tip.x - cx);
          const along = Math.hypot(tip.x - cx, tip.y - cy);
          items.push({
            depth: tip.depth * 0.62,
            draw: () => {
              ctx.save();
              ctx.fillStyle = theme.angle;
              ctx.globalAlpha = 0.28;
              ctx.beginPath();
              // The lobe starts clear of the central atom, so its symbol stays readable.
              ctx.ellipse(cx + (tip.x - cx) * 0.7, cy + (tip.y - cy) * 0.7, Math.max(8, along * 0.3 + 6), reach * 0.17 * tip.scale, angle, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
              for (const side of [-1, 1]) disc(ctx, tip.x + Math.cos(angle + Math.PI / 2) * side * 4, tip.y + Math.sin(angle + Math.PI / 2) * side * 4, 2.5, theme.angle, 0.9);
            },
          });
        }
      }
      bonds.forEach((v, i) => {
        const end = place(v, reach);
        const atom = compound.atoms[i] ?? "F";
        items.push({
          depth: end.depth + 0.001,
          draw: () => {
            ctx.save();
            ctx.strokeStyle = theme.neutral;
            ctx.lineWidth = 4 * end.scale;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            ctx.restore();
            disc(ctx, end.x, end.y, 12 * end.scale, ATOM_FILL[atom] ?? theme.neutral);
            label(ctx, atom, end.x, end.y, { color: LIGHT.has(atom) ? "#0b1020" : "#ffffff", font: theme.fontStrong, align: "center" });
          },
        });
      });
      items.push({
        depth: 0,
        draw: () => {
          disc(ctx, cx, cy, 17, ATOM_FILL[compound.central] ?? theme.neutral);
          label(ctx, compound.central, cx, cy, { color: LIGHT.has(compound.central) ? "#0b1020" : "#ffffff", font: theme.fontStrong, align: "center" });
        },
      });
      items.sort((a, b) => b.depth - a.depth).forEach((item) => item.draw());
      if (has("labels")) {
        const pairs = Math.round(num(results.lonePairs));
        const atoms = Math.round(num(results.bondPairs));
        const shape = HALOGEN_SHAPES[Math.round(num(results.shape))] ?? "";
        const hybrid = HALOGEN_HYBRIDS[Math.round(num(results.hybrid))] ?? "";
        caption(`${atoms} bonds + ${pairs} lone pair${pairs === 1 ? "" : "s"}: ${hybrid}, ${shape}`);
      }
    }
  },
};
