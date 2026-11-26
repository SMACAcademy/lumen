/**
 * A cylinder of reacting gas, and three ways of reading it.
 *
 * The cylinder: its piston sits where the volume says, the molecules are
 * counted from the model's moles, and a brown or violet gas tints the whole
 * cylinder as strongly as its concentration. Beside it: a Q-against-K gauge
 * (which way will it shift?), bars for each concentration with a ghost of
 * where it is heading, and the forward and backward rates — equal, not zero,
 * once it gets there.
 */

import { type EquilibriumReaction, REACTION_ORDER, REACTIONS } from "@ise/chemistry-engine";
import type { Rect } from "@ise/graph-engine";
import type { Results } from "@ise/science-engine";
import { formatNumber } from "@ise/units";
import { arrow, clamp, label, num, segment } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface EquilibriumLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The cylinder and piston. */
  cylinder: Rect;
  /** Q against K. */
  gauge: Rect;
  /** Concentration bars. */
  bars: Rect;
  /** Forward and backward rates. */
  rates: Rect;
}

/** The largest volume the cylinder is drawn for, in litres. */
export const MAX_VOLUME = 5;

export function computeEquilibriumLayout(width: number): EquilibriumLayout {
  const compact = width < 620;
  const pad = compact ? 6 : 14;
  const inner = Math.max(220, width - 2 * pad);
  if (compact) {
    const cylinder = { x: pad, y: pad + 20, width: inner, height: 150 };
    const gauge = { x: pad + 8, y: cylinder.y + cylinder.height + 34, width: inner - 16, height: 58 };
    const bars = { x: pad + 8, y: gauge.y + gauge.height + 18, width: inner - 16, height: 140 };
    const rates = { x: pad + 8, y: bars.y + bars.height + 16, width: inner - 16, height: 70 };
    return { width, height: Math.ceil(rates.y + rates.height + 10), compact, cylinder, gauge, bars, rates };
  }
  const left = Math.round(inner * 0.46);
  const cylinder = { x: pad, y: pad + 26, width: left, height: 210 };
  const rx = pad + left + 26;
  const rw = inner - left - 26;
  const gauge = { x: rx, y: pad + 26, width: rw, height: 58 };
  const bars = { x: rx, y: gauge.y + gauge.height + 20, width: rw, height: 130 };
  const rates = { x: pad, y: cylinder.y + cylinder.height + 18, width: left, height: 64 };
  const height = Math.max(rates.y + rates.height, bars.y + bars.height) + 16;
  return { width, height: Math.ceil(height), compact, cylinder, gauge, bars, rates };
}

/** The inside of the cylinder, with the piston face where the volume puts it. */
export function cylinderGeometry(layout: EquilibriumLayout, volume: number) {
  const { cylinder } = layout;
  const left = cylinder.x + 6;
  const fullLength = cylinder.width - 40;
  const length = Math.max(24, fullLength * clamp(volume / MAX_VOLUME, 0.02, 1));
  const top = cylinder.y + 10;
  const bottom = cylinder.y + cylinder.height - 10;
  return { left, right: left + length, top, bottom, fullRight: left + fullLength };
}

/** Molecules drawn per mole for a reaction: about forty for the starting mixture, whatever its size. */
export function moleculesPerMole(reaction: EquilibriumReaction): number {
  const start = reaction.start[0] + reaction.start[1] + reaction.start[2];
  return 40 / Math.max(1e-9, start);
}

/** Most molecules of one species the cylinder will show. */
export const MAX_SHOWN = 70;

function hash(i: number, c: number): number {
  const x = Math.sin(i * 12.9898 + c * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** The colours of the gases as they really look, where they have one; the rest take theme colours. */
function speciesColours(reaction: EquilibriumReaction, theme: LabTheme): [string, string, string] {
  const base: [string, string, string] = [theme.sine, theme.angle, theme.tangent];
  if (reaction.id === "n2o4") base[2] = "#c2410c"; // brown NO₂
  if (reaction.id === "hi") base[1] = "#8b5cf6"; // violet iodine vapour
  return base;
}

/** Which reaction the results describe. */
export function reactionFrom(results: Results): EquilibriumReaction {
  return REACTIONS[REACTION_ORDER[num(results.reaction)] ?? "n2o4"];
}

export const equilibriumRenderer: SimulationRenderer<EquilibriumLayout> = {
  id: "equilibrium",
  layout: (width) => computeEquilibriumLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results, highlight } = input;
    const has = (layer: string) => layers.has(layer);
    const dim = (layer: string) => (highlight && highlight !== layer ? 0.3 : 1);
    ctx.clearRect(0, 0, layout.width, layout.height);

    const reaction = reactionFrom(results);
    const [nameA, nameB, nameC] = reaction.species;
    const colours = speciesColours(reaction, theme);
    const V = num(results.V, 1);
    const direction = Math.round(num(results.direction));
    const g = cylinderGeometry(layout, V);

    if (has("labels")) {
      const endo = reaction.deltaH > 0;
      label(ctx, `${reaction.label} · ${formatNumber(num(results.T), 0)} K · ${formatNumber(V, 2)} L · ${formatNumber(num(results.pressure), 2)} atm`, layout.cylinder.x, layout.cylinder.y - 14, {
        color: theme.text,
        font: theme.fontStrong,
      });
      if (!layout.compact) {
        label(ctx, `ΔH = ${endo ? "+" : "−"}${formatNumber(Math.abs(reaction.deltaH), 1)} kJ/mol (${endo ? "endothermic" : "exothermic"}) · Δn = ${num(results.deltaN) > 0 ? "+" : ""}${formatNumber(num(results.deltaN), 0)}`, layout.gauge.x, layout.cylinder.y - 14, {
          color: theme.muted,
          font: theme.font,
        });
      }
    }

    // ── The cylinder ──────────────────────────────────────────────────────
    if (has("cylinder")) {
      ctx.save();
      ctx.globalAlpha = dim("cylinder");
      // A coloured gas tints the whole space, as strongly as there is of it.
      if (reaction.coloured >= 0) {
        ctx.fillStyle = colours[reaction.coloured]!;
        ctx.globalAlpha = clamp(num(results.colourConc) * 3, 0, 0.55) * dim("cylinder");
        ctx.fillRect(g.left, g.top, g.right - g.left, g.bottom - g.top);
        ctx.globalAlpha = dim("cylinder");
      }
      ctx.strokeStyle = theme.neutral;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(g.fullRight + 20, g.top);
      ctx.lineTo(g.left, g.top);
      ctx.lineTo(g.left, g.bottom);
      ctx.lineTo(g.fullRight + 20, g.bottom);
      ctx.stroke();
      // The piston, and its rod out to the right.
      ctx.fillStyle = theme.surface2;
      ctx.fillRect(g.right, g.top + 2, 10, g.bottom - g.top - 4);
      ctx.strokeRect(g.right, g.top + 2, 10, g.bottom - g.top - 4);
      ctx.lineWidth = 4;
      segment(ctx, g.right + 10, (g.top + g.bottom) / 2, g.fullRight + 34, (g.top + g.bottom) / 2);
      ctx.restore();
    }

    if (has("molecules")) {
      const perMole = moleculesPerMole(reaction);
      const amounts = [num(results.nA), num(results.nB), num(results.nC)];
      ctx.save();
      ctx.globalAlpha = dim("molecules");
      let index = 0;
      amounts.forEach((moles, species) => {
        if (species === 1 && !nameB) return;
        const count = Math.min(MAX_SHOWN, Math.round(moles * perMole));
        // Diatomic and bigger molecules as joined pairs, so N₂O₄ looks bigger than NO₂.
        const big = species === 0 && reaction.id === "n2o4";
        for (let k = 0; k < count; k++, index++) {
          const x = g.left + 8 + hash(index, 1) * (g.right - g.left - 16);
          const y = g.top + 8 + hash(index, 2) * (g.bottom - g.top - 16);
          ctx.fillStyle = colours[species]!;
          ctx.beginPath();
          ctx.arc(x, y, big ? 4.5 : 3.5, 0, Math.PI * 2);
          if (big) ctx.arc(x + 6, y, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.restore();
    }

    // ── Q against K ───────────────────────────────────────────────────────
    if (has("gauge")) {
      const { gauge } = layout;
      const logK = num(results.logK);
      const span = 3;
      const x = (logv: number) => gauge.x + ((clamp(logv, logK - span, logK + span) - (logK - span)) / (2 * span)) * gauge.width;
      const axisY = gauge.y + gauge.height - 16;
      ctx.save();
      ctx.globalAlpha = dim("gauge");
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 1.5;
      segment(ctx, gauge.x, axisY, gauge.x + gauge.width, axisY);
      ctx.strokeStyle = theme.angle;
      ctx.lineWidth = 3;
      segment(ctx, x(logK), axisY - 14, x(logK), axisY + 6);
      const logQ = num(results.logQ, -300);
      const qx = x(logQ);
      ctx.fillStyle = theme.point;
      ctx.beginPath();
      ctx.arc(qx, axisY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (direction !== 0) {
        const to = x(logK);
        arrow(ctx, qx, axisY - 22, to + (direction > 0 ? -6 : 6), axisY - 22, { color: theme.secant, width: 2.5, head: 9, alpha: dim("gauge") });
      }
      if (has("labels")) {
        label(ctx, "K", x(logK), gauge.y + 2, { color: theme.angle, font: theme.fontStrong, align: "center", baseline: "top" });
        const qText = num(results.Q) === 0 ? "Q = 0" : logQ < logK - span ? "Q ≪ K" : logQ > logK + span ? "Q ≫ K" : "Q";
        label(ctx, qText, clamp(qx, gauge.x + 22, gauge.x + gauge.width - 22), axisY + 10, { color: theme.text, font: theme.font, align: "center", baseline: "top" });
        const verdict =
          direction > 0 ? `Q < K: shifts forward, making more ${nameC}` : direction < 0 ? `Q > K: shifts back, making more ${nameA}` : "Q = K: at equilibrium";
        label(ctx, verdict, gauge.x + gauge.width, gauge.y + 2, {
          color: direction === 0 ? theme.tangent : theme.secant,
          font: theme.font,
          align: "right",
          baseline: "top",
        });
      }
    }

    // ── Concentrations now, and where they are heading ────────────────────
    if (has("bars")) {
      const { bars } = layout;
      const rows: [string, number, number, string][] = [
        [nameA, num(results.concA), num(results.eqA), colours[0]],
        ...(nameB ? ([[nameB, num(results.concB), num(results.eqB), colours[1]]] as [string, number, number, string][]) : []),
        [nameC, num(results.concC), num(results.eqC), colours[2]],
      ];
      const top = Math.max(1e-9, ...rows.map(([, now, eq]) => Math.max(now, eq)));
      const rowHeight = bars.height / rows.length;
      const labelWidth = 44;
      const barLeft = bars.x + labelWidth;
      const barWidth = bars.width - labelWidth - 78;
      ctx.save();
      ctx.globalAlpha = dim("bars");
      rows.forEach(([name, now, eq, colour], i) => {
        const y = bars.y + i * rowHeight + rowHeight * 0.2;
        const h = rowHeight * 0.6;
        ctx.fillStyle = colour;
        ctx.fillRect(barLeft, y, (barWidth * now) / top, h);
        // Ghost: the equilibrium this mixture is heading for.
        ctx.strokeStyle = theme.point;
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 1.5;
        ctx.strokeRect(barLeft, y, (barWidth * eq) / top, h);
        ctx.setLineDash([]);
        if (has("labels")) {
          label(ctx, name, bars.x, y + h / 2, { color: theme.text, font: theme.fontStrong });
          label(ctx, `${formatNumber(now, 3)} M`, barLeft + barWidth + 8, y + h / 2, { color: theme.text, font: theme.font });
        }
      });
      ctx.restore();
      if (has("labels")) {
        label(ctx, "dashed: where it is heading", bars.x + bars.width, bars.y + bars.height + 2, { color: theme.muted, font: theme.font, align: "right", baseline: "top" });
      }
    }

    // ── Forward and backward rates ────────────────────────────────────────
    if (has("rates")) {
      const { rates } = layout;
      const mid = rates.x + rates.width / 2;
      const full = rates.width * 0.42;
      const forward = clamp(num(results.forwardRate), 0, 1);
      const backward = clamp(num(results.backwardRate), 0, 1);
      const y1 = rates.y + rates.height * 0.3;
      const y2 = rates.y + rates.height * 0.72;
      if (forward > 0.005) arrow(ctx, mid - (full * forward) / 2, y1, mid + (full * forward) / 2, y1, { color: theme.tangent, width: 3, head: 10, alpha: dim("rates") });
      if (backward > 0.005) arrow(ctx, mid + (full * backward) / 2, y2, mid - (full * backward) / 2, y2, { color: theme.cosine, width: 3, head: 10, alpha: dim("rates") });
      if (has("labels")) {
        label(ctx, "forward", rates.x, y1, { color: theme.tangent, font: theme.font });
        label(ctx, "backward", rates.x, y2, { color: theme.cosine, font: theme.font });
        if (num(results.atEquilibrium) > 0.5) {
          label(ctx, "equal, and still going", rates.x + rates.width, (y1 + y2) / 2, { color: theme.muted, font: theme.font, align: "right" });
        }
      }
    }
  },
};
