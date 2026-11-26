/**
 * A galvanic cell as it looks on the bench, beside the electrochemical
 * series that explains it.
 *
 * Two beakers, two metals, a salt bridge and a voltmeter. Electrons march
 * along the wire from the anode to the cathode as the cell runs, the blue of
 * copper ions fades as they are used up, and the needle falls to zero. On the
 * ladder beside it, the two electrodes' E° values are marked: the lower one
 * is always the anode, and the gap between them is E°cell.
 */

import { ELECTRODE_ORDER, ELECTRODES, type Electrode } from "@ise/chemistry-engine";
import type { Rect } from "@ise/graph-engine";
import type { Results } from "@ise/science-engine";
import { formatNumber, formatSignificant } from "@ise/units";
import { arrow, clamp, label, num, segment } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface CellLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The bench: beakers, wire, voltmeter, salt bridge. */
  bench: Rect;
  /** The electrochemical series. */
  ladder: Rect;
}

export function computeCellLayout(width: number): CellLayout {
  const compact = width < 620;
  const pad = compact ? 6 : 16;
  const inner = Math.max(240, width - 2 * pad);
  if (compact) {
    const bench = { x: pad, y: pad + 22, width: inner, height: 260 };
    const ladder = { x: pad + 64, y: bench.y + bench.height + 30, width: inner - 76, height: 230 };
    return { width, height: Math.ceil(ladder.y + ladder.height + 16), compact, bench, ladder };
  }
  const benchWidth = Math.round(inner * 0.62);
  const bench = { x: pad, y: pad + 24, width: benchWidth, height: 290 };
  const ladder = { x: pad + benchWidth + 90, y: pad + 30, width: inner - benchWidth - 110, height: 280 };
  return { width, height: Math.ceil(bench.y + bench.height + 20), compact, bench, ladder };
}

/** Where the beakers and the rods sit on the bench. */
export function benchGeometry(layout: CellLayout) {
  const { bench } = layout;
  const beakerWidth = Math.min(150, bench.width * 0.34);
  const beakerHeight = Math.min(130, bench.height * 0.45);
  const bottom = bench.y + bench.height - 36;
  const top = bottom - beakerHeight;
  const leftX = bench.x + bench.width * 0.25 - beakerWidth / 2;
  const rightX = bench.x + bench.width * 0.75 - beakerWidth / 2;
  const wireY = bench.y + 34;
  return { beakerWidth, beakerHeight, top, bottom, leftX, rightX, wireY, meterX: bench.x + bench.width / 2 };
}

/** What each metal looks like. */
const METAL: Record<string, string> = { mg: "#d4d4d8", zn: "#a1a1aa", fe: "#71717a", pb: "#64748b", cu: "#c2410c", ag: "#e5e7eb" };

/** How strongly an ion tints its solution: copper(II) is blue, the rest are colourless. */
function ionTint(e: Electrode, concentration: number, theme: LabTheme): { colour: string; alpha: number } {
  if (e.id === "cu") return { colour: "#3b82f6", alpha: clamp(concentration * 0.5, 0.03, 0.6) };
  return { colour: theme.sine, alpha: 0.12 };
}

function electrodeFrom(results: Results, key: "left" | "right"): Electrode {
  return ELECTRODES[ELECTRODE_ORDER[num(results[key])] ?? "zn"];
}

function formatConc(c: number): string {
  return c >= 0.001 ? formatNumber(c, c >= 0.1 ? 2 : 3) : formatSignificant(c, 2);
}

export const cellRenderer: SimulationRenderer<CellLayout> = {
  id: "cell",
  layout: (width) => computeCellLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results, highlight } = input;
    const has = (layer: string) => layers.has(layer);
    const dim = (layer: string) => (highlight && highlight !== layer ? 0.3 : 1);
    ctx.clearRect(0, 0, layout.width, layout.height);

    const L = electrodeFrom(results, "left");
    const R = electrodeFrom(results, "right");
    const cL = num(results.concLeft);
    const cR = num(results.concRight);
    const E = num(results.Ecell);
    const direction = Math.round(num(results.direction));
    const progress = clamp(num(results.progress), 0, 1);
    const g = benchGeometry(layout);
    const rodWidth = 16;
    const rods = [
      { e: L, x: g.leftX + g.beakerWidth / 2 - rodWidth / 2, c: cL, isAnode: direction >= 0 },
      { e: R, x: g.rightX + g.beakerWidth / 2 - rodWidth / 2, c: cR, isAnode: direction < 0 },
    ];

    if (has("labels")) {
      label(ctx, `${L.metal} | ${L.ion}(${formatConc(cL)} M) ‖ ${R.ion}(${formatConc(cR)} M) | ${R.metal}`, layout.bench.x, layout.bench.y - 14, {
        color: theme.text,
        font: theme.fontStrong,
      });
    }

    // ── Beakers and solutions ─────────────────────────────────────────────
    if (has("beakers")) {
      ctx.save();
      ctx.globalAlpha = dim("beakers");
      [
        { x: g.leftX, e: L, c: cL },
        { x: g.rightX, e: R, c: cR },
      ].forEach(({ x, e, c }) => {
        const tint = ionTint(e, c, theme);
        ctx.fillStyle = tint.colour;
        ctx.globalAlpha = tint.alpha * dim("beakers");
        ctx.fillRect(x + 2, g.top + g.beakerHeight * 0.2, g.beakerWidth - 4, g.beakerHeight * 0.8 - 2);
        ctx.globalAlpha = dim("beakers");
        ctx.strokeStyle = theme.neutral;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, g.top);
        ctx.lineTo(x, g.bottom);
        ctx.lineTo(x + g.beakerWidth, g.bottom);
        ctx.lineTo(x + g.beakerWidth, g.top);
        ctx.stroke();
      });
      ctx.restore();
    }

    // ── The salt bridge ───────────────────────────────────────────────────
    if (has("bridge")) {
      const inner = g.leftX + g.beakerWidth * 0.78;
      const outer = g.rightX + g.beakerWidth * 0.22;
      const bridgeTop = g.top - 26;
      ctx.save();
      ctx.globalAlpha = dim("bridge");
      ctx.strokeStyle = theme.reference;
      ctx.lineWidth = 12;
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(inner, g.top + g.beakerHeight * 0.45);
      ctx.lineTo(inner, bridgeTop);
      ctx.lineTo(outer, bridgeTop);
      ctx.lineTo(outer, g.top + g.beakerHeight * 0.45);
      ctx.stroke();
      ctx.restore();
      if (has("labels")) label(ctx, "salt bridge", (inner + outer) / 2, bridgeTop - 14, { color: theme.muted, font: theme.font, align: "center" });
    }

    // ── Electrodes, wire and voltmeter ────────────────────────────────────
    if (has("circuit")) {
      ctx.save();
      ctx.globalAlpha = dim("circuit");
      for (const rod of rods) {
        // The anode is eaten away as it dissolves; the cathode gains a coat.
        const wear = rod.isAnode ? progress * 0.25 : 0;
        const rodTop = g.top - 18;
        const rodBottom = g.bottom - 12 - (g.beakerHeight - 30) * wear;
        ctx.fillStyle = METAL[rod.e.id] ?? theme.neutral;
        ctx.fillRect(rod.x, rodTop, rodWidth, rodBottom - rodTop);
        ctx.strokeStyle = theme.surface2;
        ctx.lineWidth = 1;
        ctx.strokeRect(rod.x, rodTop, rodWidth, rodBottom - rodTop);
      }
      ctx.strokeStyle = theme.neutral;
      ctx.lineWidth = 2;
      const [a, b] = rods;
      const ax = a!.x + rodWidth / 2;
      const bx = b!.x + rodWidth / 2;
      segment(ctx, ax, g.top - 18, ax, g.wireY);
      segment(ctx, ax, g.wireY, bx, g.wireY);
      segment(ctx, bx, g.wireY, bx, g.top - 18);
      // The voltmeter.
      ctx.fillStyle = theme.surface2;
      ctx.beginPath();
      ctx.arc(g.meterX, g.wireY, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Electrons along the wire, from anode to cathode, marching as the cell runs.
      if (has("electrons") && direction !== 0) {
        const length = bx - ax;
        const spacing = 26;
        const count = Math.max(1, Math.floor(length / spacing));
        // Evenly spaced dots, all shifted along together as charge flows.
        const shift = progress * 400 * direction;
        ctx.save();
        ctx.globalAlpha = dim("electrons");
        ctx.fillStyle = theme.angle;
        for (let k = 0; k < count; k++) {
          const along = (((k * length) / count + shift) % length + length) % length;
          const x = ax + along;
          if (x < ax + 4 || x > bx - 4 || Math.abs(x - g.meterX) < 26) continue;
          ctx.beginPath();
          ctx.arc(x, g.wireY, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        const from = direction > 0 ? ax + 30 : bx - 30;
        const to = direction > 0 ? ax + 70 : bx - 70;
        arrow(ctx, from, g.wireY - 12, to, g.wireY - 12, { color: theme.angle, width: 2, head: 7, alpha: dim("electrons") });
      }

      if (has("labels")) {
        label(ctx, `${formatNumber(E, 3)} V`, g.meterX, g.wireY, { color: theme.text, font: theme.fontStrong, align: "center" });
        if (direction !== 0) label(ctx, "e⁻", direction > 0 ? ax + 50 : bx - 50, g.wireY - 24, { color: theme.angle, font: theme.font, align: "center" });
        rods.forEach((rod, i) => {
          const x = (i === 0 ? g.leftX : g.rightX) + g.beakerWidth / 2;
          const role = direction === 0 ? "no current" : rod.isAnode ? "anode (−) · oxidation" : "cathode (+) · reduction";
          label(ctx, role, x, g.bottom + 8, { color: direction === 0 ? theme.muted : rod.isAnode ? theme.cosine : theme.tangent, font: theme.font, align: "center", baseline: "top" });
          label(ctx, `${rod.e.ion} ${formatConc(rod.c)} M`, x, g.bottom + 22, { color: theme.muted, font: theme.font, align: "center", baseline: "top" });
        });
      }
    }

    // ── The electrochemical series ────────────────────────────────────────
    if (has("series")) {
      const { ladder } = layout;
      const lo = -2.6;
      const hi = 1.0;
      const y = (e0: number) => ladder.y + ((hi - e0) / (hi - lo)) * ladder.height;
      const x = ladder.x + 10;
      ctx.save();
      ctx.globalAlpha = dim("series");
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 2;
      segment(ctx, x, ladder.y, x, ladder.y + ladder.height);
      ctx.restore();
      for (const id of ELECTRODE_ORDER) {
        const e = ELECTRODES[id];
        const chosen = e.id === L.id || e.id === R.id;
        ctx.save();
        ctx.globalAlpha = dim("series");
        ctx.strokeStyle = chosen ? theme.point : theme.muted;
        ctx.lineWidth = chosen ? 3 : 1.5;
        segment(ctx, x - 8, y(e.E0), x + 8, y(e.E0));
        ctx.restore();
        if (has("labels")) {
          label(ctx, `${e.ion}/${e.metal}`, x + 14, y(e.E0), { color: chosen ? theme.text : theme.muted, font: chosen ? theme.fontStrong : theme.font });
          label(ctx, `${e.E0 > 0 ? "+" : ""}${formatNumber(e.E0, 2)} V`, x - 12, y(e.E0), { color: theme.muted, font: theme.font, align: "right" });
        }
      }
      if (L.id !== R.id) {
        const top = Math.max(L.E0, R.E0);
        const bottom = Math.min(L.E0, R.E0);
        arrow(ctx, x + ladder.width - 20, y(bottom), x + ladder.width - 20, y(top), { color: theme.tangent, width: 2.5, head: 9, alpha: dim("series") });
        if (has("labels")) {
          label(ctx, `E°cell ${formatNumber(Math.abs(num(results.Ecell0)), 2)} V`, x + ladder.width - 26, (y(top) + y(bottom)) / 2, {
            color: theme.tangent,
            font: theme.font,
            align: "right",
            background: theme.background,
          });
        }
      }
      if (has("labels")) {
        label(ctx, "stronger oxidising agents ↑", ladder.x - 60, ladder.y - 16, { color: theme.muted, font: theme.font });
      }
    }
  },
};
