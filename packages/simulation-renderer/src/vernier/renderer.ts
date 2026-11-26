/**
 * A vernier calliper, drawn three times over: the whole instrument with an
 * object in its jaws; the scales at a scale that fits the entire vernier; and
 * a magnifier over the place where the marks line up.
 *
 * The magnifier matters. A 50-division vernier resolves 0.02 mm, and 0.02 mm
 * is well under a pixel at any zoom that shows the whole scale — exactly why
 * you reach for a lens at the bench. Here the lens is drawn for you.
 */

import type { Rect } from "@ise/graph-engine";
import { MAX_WIDTH } from "@ise/physics-engine";
import type { Results } from "@ise/science-engine";
import { formatNumber } from "@ise/units";
import { clamp, label, num, segment } from "../shared/draw";
import type { GraphDescriptor, SimulationRenderer } from "../types";

export interface VernierLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The whole instrument, seen from the side. */
  tool: Rect;
  /** Both scales, at a scale that fits the whole vernier. */
  zoom: Rect;
  /** The magnifier over the marks that line up. */
  detail: Rect;
}

export function computeVernierLayout(width: number): VernierLayout {
  const compact = width < 560;
  const pad = compact ? 6 : 16;
  const inner = Math.max(120, width - 2 * pad);
  const tool: Rect = { x: pad, y: pad + 10, width: inner, height: compact ? 92 : 110 };
  const zoom: Rect = { x: pad, y: tool.y + tool.height + (compact ? 30 : 38), width: inner, height: compact ? 128 : 150 };
  const detail: Rect = { x: pad, y: zoom.y + zoom.height + (compact ? 52 : 58), width: inner, height: compact ? 104 : 120 };
  return { width, height: Math.ceil(detail.y + detail.height + 40), compact, tool, zoom, detail };
}

/** Millimetres → pixels across the whole instrument. */
const toolScale = (layout: VernierLayout) => (layout.tool.width - 60) / MAX_WIDTH;

interface Window {
  from: number;
  to: number;
  scale: number;
}

/** The scales view: the whole vernier scale, plus a millimetre of lead-in. */
function zoomWindow(layout: VernierLayout, results: Results): Window {
  const msd = num(results.msd, 1);
  const vernierLength = Math.round(num(results.divisions, 10)) * num(results.vernierDivision, 0.9);
  const span = clamp(vernierLength + 2 * msd, 6, MAX_WIDTH);
  const from = clamp(num(results.scalePosition) - msd, 0, Math.max(0, MAX_WIDTH - span));
  return { from, to: from + span, scale: layout.zoom.width / span };
}

/**
 * The magnifier: a couple of millimetres around the marks that coincide, where
 * one least count is finally wide enough to see — a 50-division vernier
 * resolves 0.02 mm, which is sub-pixel at any zoom showing the whole scale.
 *
 * It sits over the alignment in every mode. What the "no help" mode withholds
 * is the highlight and the arithmetic: the learner still has to spot which
 * marks line up, read that division's number and multiply.
 */
function detailWindow(layout: VernierLayout, results: Results): Window {
  const msd = num(results.msd, 1);
  const span = 2.2 * msd;
  const centre = num(results.scalePosition) + Math.round(num(results.coincidence)) * num(results.vernierDivision, 0.9);
  const from = clamp(centre - span / 2, 0, Math.max(0, MAX_WIDTH - span));
  return { from, to: from + span, scale: layout.detail.width / span };
}

/** How often a vernier division gets a number printed under it. */
function labelEvery(divisions: number): number {
  return divisions >= 40 ? 10 : divisions >= 20 ? 5 : 2;
}

export const vernierRenderer: SimulationRenderer<VernierLayout> = {
  id: "vernier-calliper",
  layout: (width) => computeVernierLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results, highlight } = input;
    const has = (layer: string) => layers.has(layer);
    const dim = (layer: string) => (highlight && highlight !== layer ? 0.3 : 1);
    ctx.clearRect(0, 0, layout.width, layout.height);

    const msd = num(results.msd, 1);
    const lc = num(results.leastCount, 0.1);
    const divisions = Math.round(num(results.divisions, 10));
    const vsd = num(results.vernierDivision, 0.9);
    const widthMm = num(results.width);
    const scalePosition = num(results.scalePosition);
    const coincidence = Math.round(num(results.coincidence));
    const decimals = Math.round(num(results.decimals, 1));
    const showCoincidence = has("coincidence");
    const numbers = has("scaleNumbers");

    // ── The instrument, with the object between its jaws ──────────────────
    if (has("instrument")) {
      const { tool } = layout;
      const s = toolScale(layout);
      const beamY = tool.y + tool.height * 0.46;
      const jaw = tool.x + 30;
      const movable = jaw + widthMm * s;
      ctx.save();
      ctx.globalAlpha = dim("instrument");

      ctx.fillStyle = theme.surface;
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(tool.x, beamY - 10, tool.width, 20, 4);
      ctx.fill();
      ctx.stroke();

      const jawShape = (x: number, direction: 1 | -1) => {
        ctx.beginPath();
        ctx.moveTo(x, beamY - 10);
        ctx.lineTo(x, beamY - tool.height * 0.34);
        ctx.lineTo(x + direction * 10, beamY - tool.height * 0.34);
        ctx.lineTo(x + direction * 10, beamY - 10);
        ctx.closePath();
        ctx.fillStyle = theme.neutral;
        ctx.fill();
      };
      jawShape(jaw, -1);
      jawShape(movable, 1);

      if (has("object") && widthMm > 0.05) {
        ctx.fillStyle = theme.curve;
        ctx.globalAlpha = 0.35 * dim("object");
        ctx.beginPath();
        ctx.roundRect(jaw, beamY - tool.height * 0.28, movable - jaw, tool.height * 0.28 - 12, 3);
        ctx.fill();
        ctx.globalAlpha = dim("instrument");
      }

      ctx.fillStyle = theme.surface2;
      ctx.strokeStyle = theme.accent;
      ctx.beginPath();
      ctx.roundRect(jaw + scalePosition * s - 6, beamY + 8, 52, 18, 4);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // The true width is a worked value, not something printed on the tool:
      // showing it would hand over the answer whenever a reading is asked for.
      if (has("readout") && widthMm > 0.05) {
        label(ctx, `object: ${formatNumber(widthMm, 3)} mm`, (jaw + movable) / 2, beamY - layout.tool.height * 0.34 - 10, {
          color: theme.curve,
          font: theme.fontStrong,
          align: "center",
          background: theme.background,
        });
      }
    }

    // ── Both scales, whole ────────────────────────────────────────────────
    drawScales(ctx, layout.zoom, zoomWindow(layout, results), {
      theme,
      msd,
      vsd,
      divisions,
      scalePosition,
      coincidence,
      showCoincidence,
      numbers,
      labelStep: labelEvery(divisions),
      tickNumbers: numbers,
      caption: numbers ? `the scales — the vernier's ${divisions} divisions span ${formatNumber(divisions * vsd, 0)} mm` : null,
    });

    // ── The magnifier ─────────────────────────────────────────────────────
    if (has("detail")) {
      drawScales(ctx, layout.detail, detailWindow(layout, results), {
        theme,
        msd,
        vsd,
        divisions,
        scalePosition,
        coincidence,
        showCoincidence,
        numbers,
        labelStep: 1,
        tickNumbers: numbers,
        caption: numbers
          ? showCoincidence
            ? `under the magnifier: division ${coincidence} sits exactly on a main-scale mark`
            : "under the magnifier: which vernier mark sits exactly on a main-scale mark?"
          : null,
      });
    }

    // ── The working, in words ─────────────────────────────────────────────
    if (has("readout")) {
      const { detail } = layout;
      const lines = [
        `least count = ${formatNumber(lc, 3)} mm`,
        `main scale = ${formatNumber(num(results.mainReading), 1)} mm`,
        `division ${coincidence} lines up`,
        `reading = ${formatNumber(num(results.observedReading), decimals)} mm`,
      ];
      const columns = layout.compact ? 2 : 4;
      lines.forEach((line, i) => {
        const cellWidth = detail.width / columns;
        label(ctx, line, detail.x + (i % columns) * cellWidth + 2, detail.y + detail.height + 14 + Math.floor(i / columns) * 16, {
          color: i === 3 ? theme.angle : theme.muted,
          font: i === 3 ? theme.fontStrong : theme.font,
        });
      });
    }
  },

  pick(layout, x, y, locked, results) {
    const within = (rect: Rect, slack = 0) => y >= rect.y - slack && y <= rect.y + rect.height + slack;
    if (locked === "tool" || (!locked && within(layout.tool, 10))) {
      const s = toolScale(layout);
      return { writes: [{ variable: "width", value: clamp((x - layout.tool.x - 30) / s, 0, MAX_WIDTH) }], region: "tool" };
    }
    const drag = (region: "zoom" | "detail", rect: Rect, window: Window) => ({
      writes: [{ variable: "width", value: clamp(window.from + (x - rect.x) / window.scale - num(results.zeroError), 0, MAX_WIDTH) }],
      region,
    });
    if (locked === "zoom" || (!locked && within(layout.zoom))) {
      return drag("zoom", layout.zoom, zoomWindow(layout, results));
    }
    if (locked === "detail" || (!locked && within(layout.detail))) {
      // The magnifier is the finest adjustment there is: a pixel is a fraction of a least count.
      return drag("detail", layout.detail, detailWindow(layout, results));
    }
    return null;
  },
};

interface ScaleStyle {
  theme: import("../theme").LabTheme;
  msd: number;
  vsd: number;
  divisions: number;
  scalePosition: number;
  coincidence: number;
  showCoincidence: boolean;
  numbers: boolean;
  /** Print a number under every nth vernier division. */
  labelStep: number;
  tickNumbers: boolean;
  caption: string | null;
}

/** Draws a main scale with the vernier scale beneath it, over one window of millimetres. */
function drawScales(ctx: CanvasRenderingContext2D, rect: Rect, window: Window, style: ScaleStyle): void {
  const { theme, msd, vsd, divisions, scalePosition, coincidence, showCoincidence, labelStep } = style;
  const px = (mm: number) => rect.x + (mm - window.from) * window.scale;
  const mainY = rect.y + rect.height * 0.45;
  const vernierY = mainY + 8;

  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.width, rect.height);
  ctx.clip();

  // Main scale: millimetre marks, taller and numbered every centimetre.
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 2;
  segment(ctx, rect.x, mainY, rect.x + rect.width, mainY);
  const first = Math.ceil(window.from / msd) * msd;
  const mmSpacing = msd * window.scale;
  for (let mm = first; mm <= window.to + 1e-9; mm += msd) {
    const isCm = Math.abs(mm / 10 - Math.round(mm / 10)) < 1e-9;
    const height = isCm ? 24 : 13;
    ctx.strokeStyle = isCm ? theme.axis : theme.grid;
    ctx.lineWidth = isCm ? 2 : 1;
    segment(ctx, px(mm), mainY - height, px(mm), mainY);
    if (style.tickNumbers && (isCm || mmSpacing > 24)) {
      label(ctx, isCm ? `${Math.round(mm / 10)} cm` : `${Math.round(mm)}`, px(mm), mainY - height - 9, {
        color: isCm ? theme.neutral : theme.muted,
        font: isCm ? theme.fontStrong : theme.font,
        align: "center",
      });
    }
  }

  // Vernier scale: N divisions, each one least count shorter than a main division.
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 2;
  segment(ctx, px(scalePosition), vernierY + 30, px(scalePosition + divisions * vsd), vernierY + 30);
  for (let i = 0; i <= divisions; i++) {
    const atPx = px(scalePosition + i * vsd);
    if (atPx < rect.x - 20 || atPx > rect.x + rect.width + 20) continue;
    const isMatch = showCoincidence && i === coincidence;
    const numbered = i % labelStep === 0 || isMatch;
    ctx.strokeStyle = isMatch ? theme.angle : theme.neutral;
    ctx.lineWidth = isMatch ? 3 : 1;
    segment(ctx, atPx, vernierY + 30, atPx, vernierY + 30 - (numbered ? 26 : 16));
    if (style.tickNumbers && numbered && i < divisions) {
      label(ctx, `${i}`, atPx, vernierY + 40, {
        color: isMatch ? theme.angle : theme.muted,
        font: isMatch ? theme.fontStrong : theme.font,
        align: "center",
      });
    }
    if (isMatch) {
      ctx.save();
      ctx.strokeStyle = theme.angle;
      ctx.globalAlpha = 0.55;
      ctx.setLineDash([3, 4]);
      segment(ctx, atPx, vernierY + 4, atPx, mainY);
      ctx.restore();
    }
  }
  ctx.restore();

  if (style.caption) {
    label(ctx, style.caption, rect.x, rect.y - 2, { color: theme.muted, font: theme.font });
  }
}

/** The calliper has no graphs; this keeps the descriptor type referenced for clarity. */
export type VernierGraphs = readonly GraphDescriptor[];
