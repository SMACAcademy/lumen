/**
 * A Lewis structure.
 *
 * The central atom in the middle, its terminal atoms around it (one to the
 * right; two left and right; three left, right and above), joined by one,
 * two or three lines. Lone pairs are pairs of dots on each atom's free
 * sides, and any formal charge sits beside its atom. The count of electrons
 * — in bonds, in lone pairs, against the total — is the verdict.
 */

import { LEWIS_MOLECULES, LEWIS_ORDER, lewisStructure } from "@ise/chemistry-engine";
import { label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface LewisLayout {
  width: number;
  height: number;
  compact: boolean;
  reach: number;
}

export function computeLewisLayout(width: number): LewisLayout {
  const compact = width < 560;
  return { width, height: compact ? 300 : 320, compact, reach: compact ? 88 : 110 };
}

type Dir = "left" | "right" | "up" | "down";
const VEC: Record<Dir, [number, number]> = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
const OPPOSITE: Record<Dir, Dir> = { left: "right", right: "left", up: "down", down: "up" };

/** Where the terminal atoms sit, by how many there are. */
export function terminalDirections(n: number): Dir[] {
  return n === 1 ? ["right"] : n === 2 ? ["left", "right"] : ["left", "right", "up"];
}

const signed = (q: number) => (q > 0 ? `+${q === 1 ? "" : q}` : q < 0 ? `−${q === -1 ? "" : -q}` : "");

function lonePairs(ctx: CanvasRenderingContext2D, x: number, y: number, pairs: number, taken: readonly Dir[], theme: LabTheme) {
  const free = (["up", "down", "left", "right"] as Dir[]).filter((d) => !taken.includes(d));
  for (let p = 0; p < Math.min(pairs, free.length); p++) {
    const [dx, dy] = VEC[free[p]!];
    const cx = x + dx * 17;
    const cy = y + dy * 15;
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.fillStyle = theme.angle;
      ctx.beginPath();
      ctx.arc(cx + (dy !== 0 ? s * 4 : 0), cy + (dx !== 0 ? s * 4 : 0), 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

function bond(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, order: number, theme: LabTheme) {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const px = -uy;
  const py = ux;
  const gap = 12;
  ctx.save();
  ctx.strokeStyle = theme.text;
  ctx.lineWidth = 2;
  for (let k = 0; k < order; k++) {
    const off = (k - (order - 1) / 2) * 5;
    ctx.beginPath();
    ctx.moveTo(x1 + ux * gap + px * off, y1 + uy * gap + py * off);
    ctx.lineTo(x2 - ux * gap + px * off, y2 - uy * gap + py * off);
    ctx.stroke();
  }
  ctx.restore();
}

export const lewisRenderer: SimulationRenderer<LewisLayout> = {
  id: "lewis",
  layout: (width) => computeLewisLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height, reach } = layout;
    ctx.clearRect(0, 0, width, height);

    const m = LEWIS_MOLECULES[LEWIS_ORDER[Math.round(num(results.molecule))] ?? "co2"];
    const s = lewisStructure(m, [num(results.b1, 1), num(results.b2, 1), num(results.b3, 1)]);
    const dirs = terminalDirections(m.terminals.length);
    const cx = width / 2;
    const cy = height / 2 + 6;
    const big = "700 22px ui-sans-serif, system-ui, sans-serif";

    label(ctx, m.formula, 14, 18, { color: theme.text, font: theme.fontStrong, align: "left" });

    if (has("structure")) {
      dirs.forEach((d, i) => {
        const [dx, dy] = VEC[d];
        bond(ctx, cx, cy, cx + dx * reach, cy + dy * reach, s.bonds[i]!, theme);
      });
      // Atoms, lone pairs and formal charges.
      label(ctx, m.central.symbol, cx, cy, { color: theme.text, font: big, align: "center" });
      lonePairs(ctx, cx, cy, s.centralLone / 2, dirs, theme);
      const fcC = signed(s.fcCentral);
      if (fcC) label(ctx, fcC, cx + 14, cy - 16, { color: s.fcCentral > 0 ? theme.cosine : theme.sine, font: theme.fontStrong, align: "left" });
      m.terminals.forEach((t, i) => {
        const d = dirs[i]!;
        const [dx, dy] = VEC[d];
        const x = cx + dx * reach;
        const y = cy + dy * reach;
        label(ctx, t.symbol, x, y, { color: theme.text, font: big, align: "center" });
        lonePairs(ctx, x, y, s.terminalLone[i]! / 2, [OPPOSITE[d]], theme);
        const fc = signed(s.fcTerminals[i]!);
        if (fc) label(ctx, fc, x + 14, y - 16, { color: s.fcTerminals[i]! > 0 ? theme.cosine : theme.sine, font: theme.fontStrong, align: "left" });
      });
    }

    if (has("labels")) {
      const lone = s.terminalLone.reduce((a, b) => a + b, 0) + s.centralLone;
      const tally = `${s.valenceElectrons} valence electrons: ${s.bondElectrons} in bonds + ${lone} in lone pairs`;
      let verdict: string;
      if (s.overfull) verdict = `✗ ${m.central.symbol} would hold ${s.centralElectrons} — more than an octet`;
      else if (!s.octets) verdict = `✗ ${m.central.symbol} has only ${s.centralElectrons} electrons — make a multiple bond`;
      else if (num(results.best) === 1) {
        const resonance = num(results.resonance);
        verdict = resonance > 1 ? `✓ one of ${resonance} resonance structures — bond order ${num(results.averageBondOrder)}` : "✓ the best structure";
      } else verdict = `Octets, but formal charges total ${s.totalFormalCharge}: try for less`;
      label(ctx, tally, width / 2, height - 34, { color: theme.muted, font: theme.font, align: "center" });
      label(ctx, verdict, width / 2, height - 14, { color: num(results.best) === 1 ? theme.tangent : theme.text, font: theme.font, align: "center" });
    }
  },
};
