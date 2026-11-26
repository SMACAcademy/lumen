/**
 * The p-block.
 *
 * Table: groups 13 to 18 across, periods 2 to 6 down, each element coloured
 * by the chosen property — metal, metalloid or non-metal; electronegativity;
 * the character of its oxide; or whether it prefers the lower oxidation state
 * — with the chosen element ringed.
 *
 * Hydrides: the boiling points of the hydrides of groups 14 to 17 against
 * period. Each group's line falls from period 3 to rises after it — except
 * that NH₃, H₂O and HF sit far up at period 2, lifted by hydrogen bonds.
 */

import { CHARACTER_NAMES, OXIDE_NAMES, P_BLOCK, P_GROUPS, P_PERIODS, P_PROPERTY_ORDER, pElement } from "@ise/chemistry-engine";
import { clamp, label, num } from "../shared/draw";
import { createPlane, drawPlane, type Plane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface PBlockLayout {
  width: number;
  height: number;
  compact: boolean;
  cell: number;
  gridX: number;
  gridY: number;
  plane: Plane;
}

export function computePBlockLayout(width: number): PBlockLayout {
  const compact = width < 560;
  const cell = Math.min(56, (width - 50) / 6);
  const gridX = (width - cell * 6) / 2 + 10;
  const height = compact ? 340 : 360;
  const left = compact ? 44 : 60;
  const plane = createPlane({ x: left, y: 16, width: width - left - 20, height: height - 80 }, [1.6, 6.4], [80, 400]);
  return { width, height, compact, cell, gridX, gridY: 30, plane };
}

/** The fill for an element's cell under the chosen property. */
export function cellColour(property: string, group: number, period: number, theme: LabTheme): { fill: string; alpha: number } {
  const e = pElement(group, period);
  if (property === "electronegativity") {
    if (e.en === null) return { fill: theme.surface, alpha: 1 };
    return { fill: theme.sine, alpha: clamp((e.en - 1.4) / 2.6, 0.12, 1) };
  }
  if (property === "oxide") {
    if (e.oxide === null) return { fill: theme.surface, alpha: 1 };
    return { fill: [theme.sine, theme.angle, theme.cosine][e.oxide]!, alpha: 0.7 };
  }
  if (property === "inert") return period === 6 && group <= 15 ? { fill: theme.cosine, alpha: 0.7 } : { fill: theme.surface, alpha: 1 };
  return { fill: [theme.neutral, theme.angle, theme.tangent][e.character]!, alpha: 0.6 };
}

const LEGEND: Record<string, (theme: LabTheme) => [string, string][]> = {
  character: (t) => [
    [t.neutral, "metal"],
    [t.angle, "metalloid"],
    [t.tangent, "non-metal"],
  ],
  electronegativity: (t) => [[t.sine, "darker = more electronegative"]],
  oxide: (t) => [
    [t.sine, "basic"],
    [t.angle, "amphoteric"],
    [t.cosine, "acidic"],
  ],
  inert: (t) => [[t.cosine, "lower state more stable"]],
};

export const pBlockRenderer: SimulationRenderer<PBlockLayout> = {
  id: "pblock",
  layout: (width) => computePBlockLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height, cell, gridX, gridY } = layout;
    ctx.clearRect(0, 0, width, height);

    const group = clamp(Math.round(num(results.group, 15)), 13, 18);
    const period = clamp(Math.round(num(results.period, 2)), 2, 6);
    const e = pElement(group, period);

    if (has("table")) {
      const property = P_PROPERTY_ORDER[Math.round(num(results.property))] ?? "character";
      P_GROUPS.forEach((g, gi) => {
        label(ctx, String(g), gridX + gi * cell + cell / 2, gridY - 12, { color: theme.muted, font: theme.font, align: "center" });
        P_PERIODS.forEach((p, pi) => {
          const x = gridX + gi * cell;
          const y = gridY + pi * cell;
          const { fill, alpha } = cellColour(property, g, p, theme);
          ctx.save();
          ctx.fillStyle = fill;
          ctx.globalAlpha = alpha;
          ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
          ctx.globalAlpha = 1;
          const on = g === group && p === period;
          ctx.strokeStyle = on ? theme.accent : theme.grid;
          ctx.lineWidth = on ? 3 : 1;
          ctx.strokeRect(x + 1, y + 1, cell - 2, cell - 2);
          ctx.restore();
          label(ctx, P_BLOCK[g]![pi]!.symbol, x + cell / 2, y + cell / 2, { color: theme.text, font: theme.fontStrong, align: "center" });
        });
      });
      P_PERIODS.forEach((p, pi) => label(ctx, String(p), gridX - 10, gridY + pi * cell + cell / 2, { color: theme.muted, font: theme.font, align: "right" }));

      const legendY = gridY + 5 * cell + 18;
      let lx = gridX;
      for (const [colour, text] of (LEGEND[property] ?? LEGEND.character!)(theme)) {
        ctx.save();
        ctx.fillStyle = colour;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(lx, legendY - 6, 12, 12);
        ctx.restore();
        label(ctx, text, lx + 16, legendY, { color: theme.muted, font: theme.font, align: "left" });
        ctx.font = theme.font;
        lx += 16 + ctx.measureText(text).width + 14;
      }
    }

    if (has("hydrides")) {
      const { plane } = layout;
      drawPlane(ctx, plane, theme, { xLabel: "period", yLabel: "bp / K" });
      const colours = [theme.neutral, theme.sine, theme.cosine, theme.tangent];
      [14, 15, 16, 17].forEach((g, i) => {
        const points = P_PERIODS.flatMap((p) => {
          const hy = pElement(g, p).hydride;
          return hy?.bp ? [{ p, bp: hy.bp, formula: hy.formula }] : [];
        });
        const on = g === group;
        ctx.save();
        ctx.strokeStyle = colours[i]!;
        ctx.lineWidth = on ? 3 : 1.5;
        ctx.globalAlpha = on ? 1 : 0.6;
        ctx.beginPath();
        points.forEach(({ p, bp }, k) => {
          const [x, y] = plane.toPx(p, bp);
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.restore();
        for (const { p, bp, formula } of points) {
          const [x, y] = plane.toPx(p, bp);
          const here = on && p === period;
          ctx.save();
          ctx.fillStyle = colours[i]!;
          ctx.beginPath();
          ctx.arc(x, y, here ? 7 : 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          if (on || p === 2) label(ctx, formula, x + 8, y - 8, { color: here ? theme.text : theme.muted, font: here ? theme.fontStrong : theme.font, align: "left" });
        }
      });
    }

    if (has("labels")) {
      let words: string;
      if (has("hydrides")) {
        const hy = e.hydride;
        if (!hy?.bp) words = `${e.name}: no stable hydride with a boiling point in NCERT's table`;
        else {
          const angle = hy.angle ? `, bond angle ${hy.angle}°` : "";
          const bond = hy.bond ? `, E–H ${hy.bond} kJ/mol` : "";
          words = `${hy.formula}: boils at ${hy.bp} K${angle}${bond}${num(results.hBonding) === 1 ? " — hydrogen bonded" : ""}`;
        }
      } else {
        const character = CHARACTER_NAMES[e.character];
        const en = e.en === null ? "" : ` · electronegativity ${e.en}`;
        const oxide = e.oxide === null ? "" : ` · ${OXIDE_NAMES[e.oxide]} oxide`;
        const inert = num(results.inertPair) === 1 ? ` · prefers +${num(results.lowerOx)} (inert pair)` : "";
        words = `${e.name}: ${character}${en}${oxide}${inert}`;
      }
      label(ctx, words, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
    }
  },
};
