/**
 * The f-block in three pictures.
 *
 * Radii: the M³⁺ radius of each element along the series (and M⁴⁺ for the
 * actinoids), falling steadily — the contraction. Where NCERT gives no
 * radius there is no point, and the line breaks.
 *
 * States: a grid of oxidation states, +2 to +7, a dot for each one an
 * element shows. The lanthanoids keep to one row; the early actinoids climb.
 *
 * Electrons: the seven f orbitals of the chosen ion, filled by Hund's rule.
 */

import { F_SERIES_LENGTH, F_SERIES_ORDER, fSeries } from "@ise/chemistry-engine";
import { clamp, label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface FBlockLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The chart shared by the radii and states views. */
  plot: { x1: number; x2: number; top: number; bottom: number };
}

export function computeFBlockLayout(width: number): FBlockLayout {
  const compact = width < 560;
  const height = compact ? 330 : 360;
  return { width, height, compact, plot: { x1: 32, x2: width - 8, top: 40, bottom: height - 78 } };
}

/** The centre of an element's column, for its place 1–15 along the series. */
export function columnX(layout: FBlockLayout, index: number): number {
  const slot = (layout.plot.x2 - layout.plot.x1) / F_SERIES_LENGTH;
  return layout.plot.x1 + slot * (index - 0.5);
}

/** Radii run from 84 to 114 pm; oxidation states from +2 to +7. */
export const RADIUS_RANGE: readonly [number, number] = [84, 114];
export const STATE_RANGE: readonly [number, number] = [2, 7];

export function radiusY(layout: FBlockLayout, pm: number): number {
  const f = (pm - RADIUS_RANGE[0]) / (RADIUS_RANGE[1] - RADIUS_RANGE[0]);
  return layout.plot.bottom - f * (layout.plot.bottom - layout.plot.top);
}

export function stateY(layout: FBlockLayout, state: number): number {
  const f = (state - STATE_RANGE[0] + 0.5) / (STATE_RANGE[1] - STATE_RANGE[0] + 1);
  return layout.plot.bottom - f * (layout.plot.bottom - layout.plot.top);
}

const SUPERSCRIPT = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const superscript = (n: number) => String(n).split("").map((d) => SUPERSCRIPT[Number(d)]).join("");
/** "Gd³⁺" */
export const ionName = (symbol: string, charge: number) => `${symbol}${superscript(charge)}⁺`;

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A half-arrow for one electron: up or down. */
function spin(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, up: boolean, colour: string) {
  const dir = up ? -1 : 1;
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - dir * size);
  ctx.lineTo(x, y + dir * size);
  ctx.lineTo(x + (up ? 4 : -4), y + dir * (size - 5));
  ctx.stroke();
  ctx.restore();
}

function columns(ctx: CanvasRenderingContext2D, layout: FBlockLayout, theme: LabTheme, symbols: readonly string[], chosen: number) {
  const slot = (layout.plot.x2 - layout.plot.x1) / F_SERIES_LENGTH;
  const x = columnX(layout, chosen);
  ctx.save();
  ctx.fillStyle = theme.angle;
  ctx.globalAlpha = 0.14;
  ctx.fillRect(x - slot / 2, layout.plot.top, slot, layout.plot.bottom - layout.plot.top + 26);
  ctx.restore();
  symbols.forEach((symbol, i) => {
    label(ctx, symbol, columnX(layout, i + 1), layout.plot.bottom + 14, { color: i + 1 === chosen ? theme.angle : theme.muted, font: theme.font, align: "center" });
  });
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(layout.plot.x1, layout.plot.top);
  ctx.lineTo(layout.plot.x1, layout.plot.bottom);
  ctx.lineTo(layout.plot.x2, layout.plot.bottom);
  ctx.stroke();
  ctx.restore();
}

export const fBlockRenderer: SimulationRenderer<FBlockLayout> = {
  id: "fblock",
  layout: (width) => computeFBlockLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height, plot } = layout;
    ctx.clearRect(0, 0, width, height);
    const caption = (words: string) => label(ctx, words, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });

    const seriesId = F_SERIES_ORDER[Math.round(num(results.series))] ?? "lanthanoids";
    const elements = fSeries(seriesId);
    const index = clamp(Math.round(num(results.index, 1)), 1, F_SERIES_LENGTH);
    const element = elements[index - 1]!;
    const symbols = elements.map((e) => e.symbol);
    const title = seriesId === "actinoids" ? "The actinoids" : "The lanthanoids";

    if (has("radii")) {
      label(ctx, `${title}: ionic radius / pm`, plot.x1, 18, { color: theme.text, font: theme.fontStrong });
      columns(ctx, layout, theme, symbols, index);
      for (const pm of [90, 100, 110]) {
        const y = radiusY(layout, pm);
        ctx.save();
        ctx.strokeStyle = theme.grid;
        ctx.beginPath();
        ctx.moveTo(plot.x1, y);
        ctx.lineTo(plot.x2, y);
        ctx.stroke();
        ctx.restore();
        label(ctx, String(pm), plot.x1 - 5, y, { color: theme.muted, font: theme.font, align: "right" });
      }
      const draw = (pick: (i: number) => number | null, colour: string) => {
        ctx.save();
        ctx.strokeStyle = colour;
        ctx.lineWidth = 2;
        ctx.beginPath();
        let pen = false;
        for (let i = 0; i < F_SERIES_LENGTH; i++) {
          const r = pick(i);
          if (r === null) {
            pen = false;
            continue;
          }
          const x = columnX(layout, i + 1);
          const y = radiusY(layout, r);
          if (pen) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
          pen = true;
        }
        ctx.stroke();
        ctx.restore();
        for (let i = 0; i < F_SERIES_LENGTH; i++) {
          const r = pick(i);
          if (r !== null) disc(ctx, columnX(layout, i + 1), radiusY(layout, r), i + 1 === index ? 5.5 : 3.5, i + 1 === index ? theme.angle : colour);
        }
      };
      draw((i) => elements[i]!.radius3, theme.sine);
      if (seriesId === "actinoids") draw((i) => elements[i]!.radius4, theme.cosine);
      disc(ctx, plot.x2 - 92, 52, 4, theme.sine);
      label(ctx, "M³⁺", plot.x2 - 84, 52, { color: theme.text, font: theme.font });
      if (seriesId === "actinoids") {
        disc(ctx, plot.x2 - 44, 52, 4, theme.cosine);
        label(ctx, "M⁴⁺", plot.x2 - 36, 52, { color: theme.text, font: theme.font });
      }
      if (has("labels")) {
        const three = element.radius3 === null ? `${ionName(element.symbol, 3)}: no radius given` : `${ionName(element.symbol, 3)} ${element.radius3} pm`;
        const four = element.radius4 === null ? "" : ` · ${ionName(element.symbol, 4)} ${element.radius4} pm`;
        caption(`${element.name}: ${three}${four}`);
      }
    }

    if (has("states")) {
      label(ctx, `${title}: oxidation states`, plot.x1, 18, { color: theme.text, font: theme.fontStrong });
      columns(ctx, layout, theme, symbols, index);
      for (let s = STATE_RANGE[0]; s <= STATE_RANGE[1]; s++) label(ctx, `+${s}`, plot.x1 - 5, stateY(layout, s), { color: theme.muted, font: theme.font, align: "right" });
      elements.forEach((e, i) => {
        for (const s of e.states) disc(ctx, columnX(layout, i + 1), stateY(layout, s), i + 1 === index ? 5.5 : 4, s === 3 ? theme.sine : theme.cosine);
      });
      if (has("labels")) caption(`${element.name}: ${element.states.map((s) => `+${s}`).join(", ")}${element.radioactive ? " · radioactive" : ""}`);
    }

    if (has("boxes")) {
      const charge = Math.round(num(results.charge, 3));
      const n = Math.round(num(results.fElectrons));
      const shell = seriesId === "actinoids" ? "5f" : "4f";
      const core = seriesId === "actinoids" ? "[Rn]" : "[Xe]";
      label(ctx, `${element.name}: ${ionName(element.symbol, charge)}`, width / 2, 24, { color: theme.text, font: theme.fontStrong, align: "center" });
      label(ctx, `atom: ${core} ${element.configuration}`, width / 2, 46, { color: theme.muted, font: theme.font, align: "center" });
      const box = Math.min(34, (width - 40) / 7 - 4);
      const x0 = width / 2 - (7 * (box + 4) - 4) / 2;
      const y = 118;
      for (let i = 0; i < 7; i++) {
        const bx = x0 + i * (box + 4);
        ctx.save();
        ctx.strokeStyle = theme.axis;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(bx, y - box / 2, box, box);
        ctx.restore();
        if (has("labels")) {
          if (i < Math.min(n, 7)) spin(ctx, bx + box * 0.34, y, box * 0.3, true, theme.sine);
          if (i < n - 7) spin(ctx, bx + box * 0.66, y, box * 0.3, false, theme.cosine);
        }
      }
      label(ctx, `the seven ${shell} orbitals`, width / 2, y + box / 2 + 16, { color: theme.muted, font: theme.font, align: "center" });
      if (has("labels")) {
        const unpaired = Math.round(num(results.unpaired));
        label(ctx, `${ionName(element.symbol, charge)}: ${core} ${shell}${superscript(n)}`, width / 2, y + box / 2 + 48, { color: theme.angle, font: theme.fontStrong, align: "center" });
        if (num(results.exists) !== 1) label(ctx, `not an oxidation state ${element.name.toLowerCase()} shows`, width / 2, y + box / 2 + 70, { color: theme.cosine, font: theme.font, align: "center" });
        caption(unpaired === 0 ? "No unpaired electrons: diamagnetic" : `${unpaired} unpaired electron${unpaired === 1 ? "" : "s"}: paramagnetic`);
      }
    }
  },
};
