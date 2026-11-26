/**
 * Molecules you can count, bars you can compare, and a balance that never
 * moves.
 *
 * The flask draws every molecule from its atoms (hydrogen white, oxygen red,
 * nitrogen blue, carbon grey), in proportion to the moles the model reports,
 * so the limiting reagent visibly runs out while the other is left over. The
 * bars show each species' moles against what was weighed out, and the
 * balance shows the total mass, which is the same at every stage.
 */

import { STOICH_ORDER, STOICH_REACTIONS, type StoichReaction } from "@ise/chemistry-engine";
import type { Rect } from "@ise/graph-engine";
import type { Results } from "@ise/science-engine";
import { formatNumber } from "@ise/units";
import { label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface StoichLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The molecules. */
  flask: Rect;
  /** Moles of each species. */
  bars: Rect;
}

export function computeStoichLayout(width: number): StoichLayout {
  const compact = width < 620;
  const pad = compact ? 6 : 16;
  const inner = Math.max(240, width - 2 * pad);
  if (compact) {
    const flask = { x: pad, y: pad + 22, width: inner, height: 220 };
    const bars = { x: pad + 8, y: flask.y + flask.height + 26, width: inner - 16, height: 170 };
    return { width, height: Math.ceil(bars.y + bars.height + 64), compact, flask, bars };
  }
  const flaskWidth = Math.round(inner * 0.52);
  const flask = { x: pad, y: pad + 24, width: flaskWidth, height: 260 };
  const bars = { x: pad + flaskWidth + 30, y: pad + 30, width: inner - flaskWidth - 40, height: 210 };
  return { width, height: Math.ceil(flask.y + flask.height + 22), compact, flask, bars };
}

/** Atoms in each molecule, central atom first. */
export const ATOMS: Record<string, readonly string[]> = {
  "H₂": ["H", "H"],
  "O₂": ["O", "O"],
  "N₂": ["N", "N"],
  "H₂O": ["O", "H", "H"],
  "NH₃": ["N", "H", "H", "H"],
  "CH₄": ["C", "H", "H", "H", "H"],
  "CO₂": ["C", "O", "O"],
};

const ATOM_COLOUR: Record<string, string> = { H: "#f1f5f9", O: "#ef4444", N: "#3b82f6", C: "#64748b" };
const ATOM_RADIUS: Record<string, number> = { H: 3, O: 4.5, N: 4.5, C: 4.5 };

/** Molecules drawn per mole, so the reactants weighed out show as about two dozen molecules. */
export function moleculesPerMole(results: Results): number {
  const start = num(results.molesAStart) + num(results.molesBStart);
  return start > 0 ? 24 / start : 0;
}

function drawMolecule(ctx: CanvasRenderingContext2D, formula: string, x: number, y: number) {
  const atoms = ATOMS[formula] ?? ["C"];
  const [centre, ...rest] = atoms;
  if (atoms.length === 2) {
    // A diatomic: two atoms side by side.
    atoms.forEach((a, i) => {
      ctx.fillStyle = ATOM_COLOUR[a] ?? "#94a3b8";
      ctx.beginPath();
      ctx.arc(x + (i === 0 ? -3 : 3), y, ATOM_RADIUS[a] ?? 4, 0, Math.PI * 2);
      ctx.fill();
    });
    return;
  }
  rest.forEach((a, i) => {
    const angle = (i / rest.length) * Math.PI * 2 - Math.PI / 2;
    ctx.fillStyle = ATOM_COLOUR[a] ?? "#94a3b8";
    ctx.beginPath();
    ctx.arc(x + Math.cos(angle) * 6, y + Math.sin(angle) * 6, ATOM_RADIUS[a] ?? 3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = ATOM_COLOUR[centre!] ?? "#94a3b8";
  ctx.beginPath();
  ctx.arc(x, y, ATOM_RADIUS[centre!] ?? 4.5, 0, Math.PI * 2);
  ctx.fill();
}

function reactionFrom(results: Results): StoichReaction {
  return STOICH_REACTIONS[STOICH_ORDER[num(results.reaction)] ?? "water"];
}

function speciesRows(reaction: StoichReaction, results: Results) {
  const [a, b] = reaction.reactants;
  const [c, d] = reaction.products;
  const rows = [
    { formula: a.formula, now: num(results.molesA), start: num(results.molesAStart), reactant: true, index: 0 },
    { formula: b.formula, now: num(results.molesB), start: num(results.molesBStart), reactant: true, index: 1 },
  ];
  if (c) rows.push({ formula: c.formula, now: num(results.molesC), start: 0, reactant: false, index: 2 });
  if (d) rows.push({ formula: d.formula, now: num(results.molesD), start: 0, reactant: false, index: 3 });
  return rows;
}

export const stoichiometryRenderer: SimulationRenderer<StoichLayout> = {
  id: "stoichiometry",
  layout: (width) => computeStoichLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results, highlight } = input;
    const has = (layer: string) => layers.has(layer);
    const dim = (layer: string) => (highlight && highlight !== layer ? 0.3 : 1);
    ctx.clearRect(0, 0, layout.width, layout.height);

    const reaction = reactionFrom(results);
    const rows = speciesRows(reaction, results);
    const limiting = Math.round(num(results.limiting, -1));

    if (has("labels")) {
      label(ctx, reaction.label, layout.flask.x, layout.flask.y - 14, { color: theme.text, font: theme.fontStrong });
    }

    // ── The molecules ─────────────────────────────────────────────────────
    if (has("molecules")) {
      const { flask } = layout;
      ctx.save();
      ctx.globalAlpha = dim("molecules");
      ctx.strokeStyle = theme.neutral;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(flask.x, flask.y, flask.width, flask.height, 14);
      ctx.stroke();
      const perMole = moleculesPerMole(results);
      const cell = 24;
      const columns = Math.max(1, Math.floor((flask.width - 16) / cell));
      let slot = 0;
      for (const row of rows) {
        const count = Math.min(60, Math.round(row.now * perMole));
        for (let k = 0; k < count; k++, slot++) {
          const cx = flask.x + 8 + cell / 2 + (slot % columns) * cell;
          const cy = flask.y + 10 + cell / 2 + Math.floor(slot / columns) * cell;
          if (cy > flask.y + flask.height - 8) break;
          drawMolecule(ctx, row.formula, cx, cy);
        }
      }
      ctx.restore();
    }

    // ── Moles of each species, weighed out and now ────────────────────────
    if (has("bars")) {
      const { bars } = layout;
      const top = Math.max(1e-9, ...rows.map((r) => Math.max(r.now, r.start)));
      const rowHeight = bars.height / rows.length;
      const labelWidth = 46;
      const barWidth = bars.width - labelWidth - 96;
      ctx.save();
      ctx.globalAlpha = dim("bars");
      rows.forEach((row, i) => {
        const y = bars.y + i * rowHeight + rowHeight * 0.18;
        const h = rowHeight * 0.64;
        ctx.fillStyle = row.reactant ? theme.sine : theme.tangent;
        ctx.fillRect(bars.x + labelWidth, y, (barWidth * row.now) / top, h);
        if (row.reactant) {
          ctx.strokeStyle = theme.point;
          ctx.setLineDash([4, 3]);
          ctx.lineWidth = 1.5;
          ctx.strokeRect(bars.x + labelWidth, y, (barWidth * row.start) / top, h);
          ctx.setLineDash([]);
        }
        if (has("labels")) {
          label(ctx, row.formula, bars.x, y + h / 2, { color: theme.text, font: theme.fontStrong });
          const tag = row.reactant && (limiting === row.index || limiting === 2) ? (limiting === 2 ? " · exact ratio" : " · limiting") : "";
          label(ctx, `${formatNumber(row.now, 2)} mol${tag}`, bars.x + labelWidth + barWidth + 6, y + h / 2, {
            color: tag ? theme.angle : theme.muted,
            font: theme.font,
          });
        }
      });
      ctx.restore();
      if (has("labels")) {
        label(ctx, "dashed: weighed out", bars.x + bars.width, bars.y + bars.height + 2, { color: theme.muted, font: theme.font, align: "right", baseline: "top" });
      }
    }

    // ── Conservation of mass ──────────────────────────────────────────────
    if (has("mass")) {
      const { bars } = layout;
      const y = bars.y + bars.height + 36;
      drawBalance(ctx, bars.x + 40, y, theme, dim("mass"));
      if (has("labels")) {
        label(ctx, `total mass ${formatNumber(num(results.totalMass), 2)} g — the same at every stage`, bars.x + 80, y, { color: theme.text, font: theme.font });
      }
    }
  },
};

/** A small, level balance. */
function drawBalance(ctx: CanvasRenderingContext2D, x: number, y: number, theme: LabTheme, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = theme.neutral;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + 12);
  ctx.lineTo(x, y - 8);
  ctx.moveTo(x - 22, y - 8);
  ctx.lineTo(x + 22, y - 8);
  ctx.moveTo(x - 30, y + 2);
  ctx.lineTo(x - 14, y + 2);
  ctx.moveTo(x + 14, y + 2);
  ctx.lineTo(x + 30, y + 2);
  ctx.moveTo(x - 10, y + 12);
  ctx.lineTo(x + 10, y + 12);
  ctx.stroke();
  ctx.restore();
}
