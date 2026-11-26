/**
 * A torch circuit on the table: cells on the left, bulbs along the top, the
 * switch on the right and the tester gap along the bottom, all joined by one
 * loop of wire.
 *
 * When the loop is closed the bulbs glow — brighter with more cells, dimmer
 * with more bulbs in the line — and charges creep round the wire at a pace
 * set by the current. When it is open, nothing moves, and the break is
 * named: the switch, or what sits in the gap.
 */

import { GAP_MATERIALS, GAP_ORDER, MAX_BULBS } from "@ise/physics-engine";
import type { Rect } from "@ise/graph-engine";
import { formatNumber } from "@ise/units";
import { label, num, segment } from "../shared/draw";
import type { SimulationRenderer } from "../types";

export interface CircuitLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The loop of wire. */
  loop: Rect;
}

export function computeCircuitLayout(width: number): CircuitLayout {
  const compact = width < 560;
  const side = compact ? 44 : 90;
  const loopWidth = Math.max(220, width - 2 * side);
  // Room above the top wire for a bright bulb's glow (up to about 80 px).
  const loop = { x: (width - loopWidth) / 2, y: 84, width: loopWidth, height: compact ? 210 : 240 };
  return { width, height: Math.ceil(loop.y + loop.height + 78), compact, loop };
}

/** A point `s` pixels along the loop, clockwise from the top-left corner. */
export function pointOnLoop(loop: Rect, s: number): [number, number] {
  const { x, y, width: w, height: h } = loop;
  const p = 2 * (w + h);
  let d = ((s % p) + p) % p;
  if (d < w) return [x + d, y];
  d -= w;
  if (d < h) return [x + w, y + d];
  d -= h;
  if (d < w) return [x + w - d, y + h];
  d -= w;
  return [x, y + h - d];
}

/** Where each bulb sits along the top wire. */
export function bulbPositions(loop: Rect, bulbs: number): number[] {
  const n = Math.max(1, Math.min(MAX_BULBS, Math.round(bulbs)));
  return Array.from({ length: n }, (_, i) => loop.x + (loop.width * (i + 1)) / (n + 1));
}

const CHIP: Record<string, string> = {
  copper: "#c2703d",
  iron: "#94a3b8",
  aluminium: "#d4d8de",
  graphite: "#4b5563",
  rubber: "#f472b6",
  plastic: "#38bdf8",
  wood: "#a16207",
  glass: "rgba(186, 230, 253, 0.55)",
};

/** Spacing of the drawn charges, and how fast they go for one cell and one bulb. */
const CHARGE_SPACING = 30;
const SPEED_PER_AMP = 240;

export const circuitRenderer: SimulationRenderer<CircuitLayout> = {
  id: "circuit",
  layout: (width) => computeCircuitLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { loop } = layout;
    ctx.clearRect(0, 0, layout.width, layout.height);

    const cells = Math.round(num(results.cells, 1));
    const bulbs = Math.round(num(results.bulbs, 1));
    const closed = num(results.closed) === 1;
    const switchClosed = num(results.switchClosed, 1) === 1;
    const current = num(results.current);
    const brightness = num(results.brightness);
    const lit = num(results.lit) === 1;
    const gapId = GAP_ORDER[Math.round(num(results.gap))] ?? "wire";
    const gap = GAP_MATERIALS[gapId];
    const midY = loop.y + loop.height / 2;
    const gapX = loop.x + loop.width / 2;
    const bulbXs = bulbPositions(loop, bulbs);
    const bulbR = layout.compact ? 15 : 18;
    const cellsTop = midY - (cells * 22) / 2;
    const gapHalf = 34;
    const switchHalf = 20;
    // Side by side, the bulbs sit on rungs between the top wire and a lower rail.
    const parallel = num(results.arrangement) === 1;
    const rail = loop.y + 60;
    const bulbY = parallel ? (loop.y + rail) / 2 : loop.y;
    const firstBulb = bulbXs[0]!;
    const lastBulb = bulbXs[bulbXs.length - 1]!;

    // ── The wire, with breaks where the parts sit ─────────────────────────
    ctx.save();
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    if (parallel) {
      // The top wire feeds every rung; the rail below collects them and carries on to the switch.
      segment(ctx, loop.x, loop.y, lastBulb, loop.y);
      for (const bx of bulbXs) {
        segment(ctx, bx, loop.y, bx, bulbY - bulbR);
        segment(ctx, bx, bulbY + bulbR, bx, rail);
      }
      segment(ctx, firstBulb, rail, loop.x + loop.width, rail);
      segment(ctx, loop.x + loop.width, rail, loop.x + loop.width, midY - switchHalf);
    } else {
      // Top, between bulbs.
      let x = loop.x;
      for (const bx of bulbXs) {
        segment(ctx, x, loop.y, bx - bulbR, loop.y);
        x = bx + bulbR;
      }
      segment(ctx, x, loop.y, loop.x + loop.width, loop.y);
      segment(ctx, loop.x + loop.width, loop.y, loop.x + loop.width, midY - switchHalf);
    }
    // Right, below the switch.
    segment(ctx, loop.x + loop.width, midY + switchHalf, loop.x + loop.width, loop.y + loop.height);
    // Bottom, around the gap (a plain wire joins it when the gap holds wire).
    segment(ctx, loop.x + loop.width, loop.y + loop.height, gapX + gapHalf, loop.y + loop.height);
    segment(ctx, gapX - gapHalf, loop.y + loop.height, loop.x, loop.y + loop.height);
    if (gapId === "wire") segment(ctx, gapX - gapHalf, loop.y + loop.height, gapX + gapHalf, loop.y + loop.height);
    // Left, around the cells.
    segment(ctx, loop.x, loop.y + loop.height, loop.x, cells > 0 ? cellsTop + cells * 22 : midY);
    segment(ctx, loop.x, cells > 0 ? cellsTop : midY, loop.x, loop.y);
    if (cells === 0) segment(ctx, loop.x, midY - 1, loop.x, midY + 1);
    ctx.restore();

    // ── Charges creeping round the wire, behind the parts ──────────────────────────────────
    if (has("flow") && closed && current > 0) {
      const perimeter = 2 * (loop.width + loop.height);
      const offset = (num(results.t) * SPEED_PER_AMP * current) % CHARGE_SPACING;
      ctx.save();
      ctx.fillStyle = theme.sine;
      for (let s = offset; s < perimeter; s += CHARGE_SPACING) {
        const [px, py] = pointOnLoop(loop, s);
        // In parallel the loop's top-right corner is not wired: the current goes down the rungs instead.
        if (parallel && ((py === loop.y && px > lastBulb) || (px === loop.x + loop.width && py < rail))) continue;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (has("circuit")) {
      // ── Cells: long thin plate +, short thick plate − ──────────────────
      ctx.save();
      ctx.strokeStyle = theme.text;
      for (let i = 0; i < cells; i++) {
        const top = cellsTop + i * 22 + 4;
        ctx.lineWidth = 2;
        segment(ctx, loop.x - 16, top, loop.x + 16, top);
        ctx.lineWidth = 5;
        segment(ctx, loop.x - 8, top + 10, loop.x + 8, top + 10);
      }
      ctx.restore();
      if (cells > 0) {
        label(ctx, "+", loop.x + 22, cellsTop + 4, { color: theme.muted, font: theme.fontStrong });
        label(ctx, "−", loop.x + 22, cellsTop + cells * 22 - 6, { color: theme.muted, font: theme.fontStrong });
      }

      // ── Bulbs: a glow when lit, the glass, the filament ────────────────
      for (const bx of bulbXs) {
        if (lit) {
          ctx.save();
          const glow = Math.min(2.2, Math.sqrt(brightness));
          for (let ring = 3; ring >= 1; ring--) {
            ctx.globalAlpha = Math.min(0.5, 0.12 * glow) * (4 - ring) * 0.5;
            ctx.fillStyle = theme.angle;
            ctx.beginPath();
            ctx.arc(bx, bulbY, bulbR + ring * 9 * glow, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
        ctx.save();
        ctx.fillStyle = lit ? theme.angle : theme.surface2;
        ctx.globalAlpha = lit ? Math.min(1, 0.35 + 0.3 * brightness) : 1;
        ctx.beginPath();
        ctx.arc(bx, bulbY, bulbR, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = theme.muted;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = lit ? theme.text : theme.muted;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx - bulbR, bulbY);
        const zig = bulbR * 0.55;
        for (let k = -2; k <= 2; k++) ctx.lineTo(bx + k * (zig / 2), bulbY + (k % 2 === 0 ? -5 : 5));
        ctx.lineTo(bx + bulbR, bulbY);
        ctx.stroke();
        ctx.restore();
      }

      // ── The switch: a lever between two terminals ──────────────────────
      const sx = loop.x + loop.width;
      ctx.save();
      ctx.fillStyle = theme.text;
      for (const ty of [midY - switchHalf, midY + switchHalf]) {
        ctx.beginPath();
        ctx.arc(sx, ty, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = switchClosed ? theme.tangent : theme.cosine;
      ctx.lineWidth = 3.5;
      if (switchClosed) segment(ctx, sx, midY + switchHalf, sx, midY - switchHalf);
      else segment(ctx, sx, midY + switchHalf, sx + 26, midY - switchHalf + 4);
      ctx.restore();

      // ── The tester gap: two clips and whatever sits between them ───────
      const gy = loop.y + loop.height;
      ctx.save();
      ctx.fillStyle = theme.text;
      for (const cx of [gapX - gapHalf, gapX + gapHalf]) {
        ctx.beginPath();
        ctx.arc(cx, gy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (gapId !== "wire" && gapId !== "air") {
        ctx.fillStyle = CHIP[gapId] ?? theme.neutral;
        ctx.beginPath();
        ctx.roundRect(gapX - gapHalf + 6, gy - 9, 2 * gapHalf - 12, 18, 5);
        ctx.fill();
      }
      ctx.restore();
      if (gapId !== "wire") {
        label(ctx, gap.label, gapX, gy + 22, { color: theme.text, font: theme.fontStrong, align: "center" });
      }
    }

    // ── Words ─────────────────────────────────────────────────────────────
    if (has("labels")) {
      const volts = `${formatNumber(num(results.voltage), 1)} V`;
      // Beside the cells: outside the loop on a desk, inside it on a phone where there is no room to the left.
      const voltsX = layout.compact ? loop.x + 34 : loop.x - 24;
      label(ctx, cells === 0 ? "no cell" : volts, voltsX, midY, { color: theme.muted, font: theme.font, align: layout.compact ? "left" : "right" });
      if (!switchClosed) label(ctx, "switch open", loop.x + loop.width - 8, midY - switchHalf - 16, { color: theme.cosine, font: theme.fontStrong, align: "right" });
      const status = closed
        ? `The loop is closed: ${formatNumber(current, 2)} A flows, and the bulb${bulbs > 1 ? "s" : ""} ${lit ? (bulbs > 1 ? "glow" : "glows") : "barely glow"}${parallel && bulbs > 1 ? " — each with the full push" : ""}.`
        : !switchClosed
          ? "The switch breaks the loop, so nothing flows."
          : cells === 0
            ? "No cell, so nothing pushes the current."
            : `The ${gap.label.toLowerCase()} does not conduct, so the loop is broken.`;
      label(ctx, status, layout.width / 2, layout.height - 16, { color: closed ? theme.tangent : theme.muted, font: theme.font, align: "center" });
    }
  },
};
