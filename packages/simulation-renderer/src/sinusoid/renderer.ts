/**
 * Renderer for y = A sin(ωx + φ) + d: a function plot with its key features
 * annotated, plus the generating circle of radius |A| sharing the plot's
 * vertical scale — so the horizontal connector shows the projection making
 * the wave, exactly as in the unit-circle construction.
 */

import { type GraphFrame, type Rect, createGraphFrame, drawAxes, drawFunctionCurve, drawMarker, drawTrace } from "@ise/graph-engine";
import { sinusoidAt } from "@ise/mathematics-engine";
import type { Results } from "@ise/science-engine";
import { TAU, formatAngle, formatNumber, shortestDelta } from "@ise/units";
import { arrow, clamp, graphStyle, label, num, segment } from "../shared/draw";
import type { GraphDescriptor, PickResult, SimulationRenderer } from "../types";

/** Largest |A| the circle panel is sized for (matches the amplitude slider range). */
export const MAX_AMPLITUDE = 2.5;

export interface SinusoidLayout {
  width: number;
  height: number;
  compact: boolean;
  plot: Rect;
  /** Whether the generating circle is shown (and pickable). */
  hasCircle: boolean;
  /** Horizontal centre of the generating circle; its vertical centre follows d. */
  circleCx: number;
  /** Pixels per unit on the value axis, shared by plot and circle. */
  ppu: number;
  graph: GraphDescriptor | null;
}

const DEFAULT_Y: readonly [number, number] = [-4, 4];

export function computeSinusoidLayout(
  width: number,
  graphs: readonly GraphDescriptor[],
  layers: ReadonlySet<string> = new Set(["phasor"]),
): SinusoidLayout {
  const compact = width < 560;
  const graph = graphs[0] ?? null;
  const [y0, y1] = graph?.yDomain ?? DEFAULT_Y;
  const pad = compact ? 4 : 16;
  const plotHeight = compact ? 220 : clamp(width * 0.34, 250, 340);
  const ppu = plotHeight / (y1 - y0);
  // The generating circle's panel is only reserved when the circle is shown.
  const maxR = layers.has("phasor") ? MAX_AMPLITUDE * ppu : 0;
  const circleCx = pad + (compact ? 6 : 12) + maxR;
  const plotX = maxR > 0 ? circleCx + maxR + (compact ? 30 : 48) : pad + (compact ? 28 : 40);
  const plot: Rect = { x: plotX, y: pad + 24, width: Math.max(80, width - plotX - pad - (compact ? 10 : 20)), height: plotHeight };
  return { width, height: Math.ceil(plot.y + plotHeight + 34), compact, plot, hasCircle: maxR > 0, circleCx, ppu, graph };
}

export function sinusoidFrame(layout: SinusoidLayout): GraphFrame {
  return createGraphFrame({
    rect: layout.plot,
    orientation: "right",
    coordinateDomain: layout.graph?.xDomain ?? [-TAU, TAU],
    valueDomain: layout.graph?.yDomain ?? DEFAULT_Y,
  });
}

function wave(results: Results) {
  return {
    amplitude: num(results.amplitudeSigned, 1),
    omega: num(results.omega, 1),
    phi: num(results.phi),
    offset: num(results.offset),
  };
}

const REFERENCE = { amplitude: 1, omega: 1, phi: 0, offset: 0 };

export const sinusoidRenderer: SimulationRenderer<SinusoidLayout> = {
  id: "sinusoid",
  layout: computeSinusoidLayout,

  draw(ctx, layout, input) {
    const { theme, layers, results, angleUnit, highlight } = input;
    const has = (layer: string) => layers.has(layer);
    const dim = (layer: string) => (highlight && highlight !== layer ? 0.4 : 1);
    ctx.clearRect(0, 0, layout.width, layout.height);

    const frame = sinusoidFrame(layout);
    const w = wave(results);
    const [xMin, xMax] = frame.coordinateDomain;
    const y = (v: number) => frame.valueToPixel(v);
    const xp = (x: number) => frame.coordinateToPixel(x);
    const small = theme.font;
    const strong = theme.fontStrong;
    const bg = theme.background;

    drawAxes(ctx, frame, {
      style: graphStyle(theme),
      angleUnit,
      xAxis: layout.graph?.xAxis ?? "angle",
      xLabel: layout.graph?.xLabel ?? "x",
      yLabel: layout.graph?.yLabel ?? "y",
    });

    // Reference y = sin x.
    if (has("reference")) {
      drawFunctionCurve(ctx, frame, (x) => sinusoidAt(x, REFERENCE), { color: theme.reference, dash: "dashed", width: 2, alpha: 0.9 * dim("reference") });
      if (has("labels")) {
        // Legend in the top-left corner: a dashed swatch and its name.
        const lx = layout.plot.x + 10;
        const ly = layout.plot.y + 12;
        ctx.save();
        ctx.strokeStyle = theme.reference;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        segment(ctx, lx, ly, lx + 22, ly);
        ctx.restore();
        label(ctx, "reference: sin x", lx + 28, ly, { color: theme.muted, font: small, background: bg });
      }
    }

    // Midline y = d.
    if (has("midline")) {
      ctx.save();
      ctx.strokeStyle = theme.angle;
      ctx.globalAlpha = 0.7 * dim("midline");
      ctx.setLineDash([4, 5]);
      ctx.lineWidth = 1.5;
      segment(ctx, layout.plot.x, y(w.offset), layout.plot.x + layout.plot.width, y(w.offset));
      ctx.restore();
      if (has("labels")) {
        label(ctx, `midline y = ${formatNumber(w.offset, 1)}`, layout.plot.x + layout.plot.width - 6, y(w.offset) + 11, {
          color: theme.angle,
          font: small,
          align: "right",
          background: bg,
        });
      }
    }

    // The wave itself: bright in explore mode, faint behind the trace in generate mode.
    if (has("curve")) drawFunctionCurve(ctx, frame, (x) => sinusoidAt(x, w), { color: theme.curve, width: 3.5, alpha: dim("curve") });
    if (has("ghostCurve")) drawFunctionCurve(ctx, frame, (x) => sinusoidAt(x, w), { color: theme.curve, width: 2, alpha: 0.22 });
    if (has("trace") && input.trace) {
      drawTrace(ctx, frame, input.trace, [{ channel: "y", label: "y", color: theme.curve, dash: "solid" }], layout.graph?.traceOffset ?? 0);
    }

    const period = num(results.period, Number.POSITIVE_INFINITY);
    const peakX = num(results.peakX, Number.NaN);
    const amplitude = num(results.amplitude);
    const max = num(results.max);

    // Amplitude: from the midline up to the first peak.
    if (has("amplitude") && Number.isFinite(peakX) && amplitude > 0.05) {
      arrow(ctx, xp(peakX), y(w.offset), xp(peakX), y(max), { color: theme.sine, width: 2.5, alpha: dim("amplitude"), double: true, head: 8 });
      if (has("labels")) label(ctx, `|A| = ${formatNumber(amplitude, 2)}`, xp(peakX) + 8, (y(w.offset) + y(max)) / 2, { color: theme.sine, font: strong, background: bg });
    }

    // Period: peak to next peak, drawn just above the wave.
    if (has("period") && Number.isFinite(peakX) && Number.isFinite(period)) {
      const start = peakX + period <= xMax + 1e-9 ? peakX : peakX - period;
      if (start >= xMin - 1e-9 && start + period <= xMax + 1e-9) {
        const by = clamp(y(max) - 16, layout.plot.y + 8, layout.plot.y + layout.plot.height);
        ctx.save();
        ctx.strokeStyle = theme.cosine;
        ctx.globalAlpha = 0.5 * dim("period");
        ctx.setLineDash([2, 4]);
        segment(ctx, xp(start), by, xp(start), y(max));
        segment(ctx, xp(start + period), by, xp(start + period), y(max));
        ctx.restore();
        arrow(ctx, xp(start), by, xp(start + period), by, { color: theme.cosine, width: 2, alpha: dim("period"), double: true, head: 8 });
        if (has("labels")) label(ctx, `T = ${formatAngle(period, angleUnit)}`, (xp(start) + xp(start + period)) / 2, by - 4, { color: theme.cosine, font: strong, align: "center", baseline: "bottom", background: bg });
      }
    }

    // Phase shift: how far the start of a cycle moved from x = 0.
    const shift = num(results.phaseShift, Number.NaN);
    if (has("phaseShift") && Number.isFinite(shift) && Math.abs(shift) > 0.01 && shift >= xMin && shift <= xMax) {
      const sy = y(w.offset);
      arrow(ctx, xp(0), sy, xp(shift), sy, { color: theme.tangent, width: 3, alpha: dim("phaseShift"), head: 9 });
      drawMarker(ctx, xp(shift), sy, theme.tangent, dim("phaseShift"), 4.5);
      if (has("labels")) label(ctx, `shift ${formatAngle(shift, angleUnit)}`, xp(shift), sy - 12, { color: theme.tangent, font: small, align: "center", baseline: "bottom", background: bg });
    }

    const xProbe = num(results.xProbe);
    const yProbe = num(results.y);
    const [px, py] = [xp(xProbe), y(yProbe)];

    // Generating circle: radius |A|, centred at height d, angle ωx + φ.
    if (has("phasor")) {
      const cy = y(w.offset);
      const r = amplitude * layout.ppu;
      const qx = layout.circleCx + num(results.phasorX) * layout.ppu;
      const qy = y(w.offset + num(results.phasorY));
      ctx.save();
      ctx.strokeStyle = theme.neutral;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(layout.circleCx, cy, Math.max(r, 0.5), 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = theme.axis;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 1;
      segment(ctx, layout.circleCx - MAX_AMPLITUDE * layout.ppu, cy, layout.circleCx + MAX_AMPLITUDE * layout.ppu, cy);
      ctx.restore();
      // Radius and vertical projection.
      ctx.save();
      ctx.strokeStyle = theme.point;
      ctx.lineWidth = 2.5;
      segment(ctx, layout.circleCx, cy, qx, qy);
      ctx.strokeStyle = theme.sine;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      segment(ctx, qx, cy, qx, qy);
      ctx.restore();
      // Connector from the circle to the wave at the probe.
      ctx.save();
      ctx.strokeStyle = theme.curve;
      ctx.globalAlpha = 0.7;
      ctx.setLineDash([4, 5]);
      ctx.lineWidth = 1.25;
      segment(ctx, qx, qy, px, py);
      ctx.restore();
      drawMarker(ctx, qx, qy, theme.angle);
      if (has("labels")) {
        label(ctx, "θ = ωx + φ", layout.circleCx, cy + Math.max(r, 12) + 14, { color: theme.angle, font: small, align: "center", background: bg });
      }
    }

    // Probe: where on the wave we are looking.
    if (has("probe")) {
      ctx.save();
      ctx.strokeStyle = theme.muted;
      ctx.setLineDash([2, 4]);
      segment(ctx, px, y(0), px, py);
      ctx.restore();
      drawMarker(ctx, px, py, theme.curve, 1, 6);
      if (has("labels")) {
        label(ctx, `y = ${formatNumber(yProbe, 3)}`, px + 10, py - 12, { color: theme.text, font: strong, background: bg });
      }
    }
  },

  pick(layout, x, y, locked, results): PickResult | null {
    const frame = sinusoidFrame(layout);
    const w = wave(results);
    const cy = frame.valueToPixel(w.offset);
    const nearCircle = layout.hasCircle && Math.hypot(x - layout.circleCx, y - cy) <= MAX_AMPLITUDE * layout.ppu + 12;
    if ((locked === "circle" && layout.hasCircle) || (!locked && nearCircle)) {
      if (w.omega === 0) return null;
      // Turn the circle to the pointer's angle; move x by the matching amount.
      const target = Math.atan2(cy - y, x - layout.circleCx) + (w.amplitude < 0 ? Math.PI : 0);
      const dx = shortestDelta(num(results.phase), target, TAU) / w.omega;
      return { writes: [{ variable: "x", value: num(results.xProbe) + dx }], region: "circle" };
    }
    const { rect } = frame;
    const inside = x >= rect.x - 10 && x <= rect.x + rect.width + 10 && y >= rect.y - 10 && y <= rect.y + rect.height + 10;
    if (locked === "plot" || (!locked && inside)) {
      const [, hi] = frame.coordinateDomain;
      return { writes: [{ variable: "x", value: Math.min(frame.coordinateAt(x, y), hi - 1e-9) }], region: "plot", press: "jump" };
    }
    return null;
  },
};
