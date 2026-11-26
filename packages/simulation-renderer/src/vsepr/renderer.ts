/**
 * A molecule you can turn in your hand, drawn on a flat canvas.
 *
 * The model supplies the directions of the bonds and lone pairs; this
 * rotates them by the learner's yaw and pitch, puts them in perspective and
 * draws back to front, so near atoms overlap far ones. Lone pairs are soft
 * lobes — invisible to the shape's name but plainly taking up room — and an
 * arc marks the bond angle. Dragging across the view turns the molecule.
 */

import { angleBetween, ARRANGEMENTS, geometry, HYBRIDISATION, MOLECULE_ORDER, MOLECULES, type Molecule, rotate, SHAPES, type Vec3 } from "@ise/chemistry-engine";
import type { Rect } from "@ise/graph-engine";
import type { Results } from "@ise/science-engine";
import { formatNumber } from "@ise/units";
import { clamp, label, num, segment } from "../shared/draw";
import type { SimulationRenderer } from "../types";

export interface VseprLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Where the molecule turns. */
  view: Rect;
  /** Its facts, in words. */
  facts: Rect;
}

export function computeVseprLayout(width: number): VseprLayout {
  const compact = width < 620;
  const pad = compact ? 6 : 16;
  const inner = Math.max(240, width - 2 * pad);
  if (compact) {
    const size = Math.min(inner, 360);
    const view = { x: pad + (inner - size) / 2, y: pad, width: size, height: size };
    const facts = { x: pad + 8, y: view.y + view.height + 10, width: inner - 16, height: 150 };
    return { width, height: Math.ceil(facts.y + facts.height + 8), compact, view, facts };
  }
  const size = Math.min(Math.round(inner * 0.6), 420);
  const view = { x: pad, y: pad, width: size, height: size };
  const facts = { x: pad + size + 30, y: pad + 20, width: inner - size - 40, height: size - 40 };
  return { width, height: Math.ceil(size + 2 * pad), compact, view, facts };
}

/** Element colours, as molecular models paint them. */
const ELEMENT_COLOUR: Record<string, string> = {
  H: "#f1f5f9",
  B: "#fda4af",
  C: "#64748b",
  N: "#3b82f6",
  O: "#ef4444",
  F: "#86efac",
  P: "#fb923c",
  S: "#facc15",
  Cl: "#22c55e",
  Br: "#b91c1c",
  Xe: "#22d3ee",
};

/** Dark text on light atoms, white on dark ones, so every symbol can be read. */
export function inkFor(fill: string): string {
  const hex = fill.replace("#", "");
  if (hex.length !== 6) return "#0f172a";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const luminance = 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  return luminance > 0.5 ? "#0f172a" : "#f8fafc";
}

function moleculeFrom(results: Results): Molecule {
  return MOLECULES[MOLECULE_ORDER[num(results.molecule)] ?? "ch4"];
}

/** Project a rotated point: +z comes towards the viewer and is drawn larger. */
export function project(layout: VseprLayout, v: Vec3, reach: number): { x: number; y: number; scale: number; depth: number } {
  const { view } = layout;
  const cx = view.x + view.width / 2;
  const cy = view.y + view.height / 2;
  const scale = 1 + v[2] * 0.18;
  return { x: cx + v[0] * reach * scale, y: cy - v[1] * reach * scale, scale, depth: v[2] };
}

/** A unit vector at right angles to v, lying in the plane of the screen where it can. */
export function perpendicular(v: Vec3): Vec3 {
  // v × ẑ is in the screen plane; if v points straight out of the screen, use ŷ instead.
  let p: Vec3 = [v[1], -v[0], 0];
  if (Math.hypot(...p) < 1e-6) p = [0, 1, 0];
  const n = Math.hypot(...p);
  return [p[0] / n, p[1] / n, p[2] / n];
}

/** The two bonds whose angle the textbook quotes: for five domains, two equatorial ones. */
function quotedPair(m: Molecule, bonds: readonly Vec3[]): [Vec3, Vec3] | null {
  if (bonds.length < 2) return null;
  let best: [Vec3, Vec3] = [bonds[0]!, bonds[1]!];
  let bestGap = Number.POSITIVE_INFINITY;
  for (let i = 0; i < bonds.length; i++) {
    for (let j = i + 1; j < bonds.length; j++) {
      const gap = Math.abs(angleBetween(bonds[i]!, bonds[j]!) - m.bondAngle);
      if (gap < bestGap) {
        bestGap = gap;
        best = [bonds[i]!, bonds[j]!];
      }
    }
  }
  return best;
}

export const vseprRenderer: SimulationRenderer<VseprLayout> = {
  id: "vsepr",
  layout: (width) => computeVseprLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results, highlight } = input;
    const has = (layer: string) => layers.has(layer);
    const dim = (layer: string) => (highlight && highlight !== layer ? 0.3 : 1);
    ctx.clearRect(0, 0, layout.width, layout.height);

    const m = moleculeFrom(results);
    const yaw = num(results.yaw);
    const pitch = num(results.pitch);
    const { bonds, lone } = geometry(m);
    const reach = Math.min(layout.view.width, layout.view.height) * 0.34;
    const centre = project(layout, [0, 0, 0], reach);

    // Everything to draw, as items with a depth, so they can go back to front.
    type Item = { depth: number; draw: () => void };
    const items: Item[] = [];

    if (has("lonepairs")) {
      for (const d of lone) {
        const v = rotate(d, yaw, pitch);
        const tip = project(layout, v, reach * 0.62);
        const angle = Math.atan2(tip.y - centre.y, tip.x - centre.x);
        const along = Math.hypot(tip.x - centre.x, tip.y - centre.y);
        items.push({
          depth: v[2] * 0.62,
          draw: () => {
            ctx.save();
            ctx.globalAlpha = 0.28 * dim("lonepairs");
            ctx.fillStyle = theme.angle;
            ctx.beginPath();
            ctx.ellipse((centre.x + tip.x) / 2, (centre.y + tip.y) / 2, Math.max(10, along / 2 + 6), reach * 0.17 * tip.scale, angle, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 0.9 * dim("lonepairs");
            ctx.fillStyle = theme.angle;
            for (const side of [-1, 1]) {
              ctx.beginPath();
              ctx.arc(tip.x + Math.cos(angle + Math.PI / 2) * side * 4, tip.y + Math.sin(angle + Math.PI / 2) * side * 4, 2.5, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          },
        });
      }
    }

    if (has("atoms")) {
      for (const d of bonds) {
        const v = rotate(d, yaw, pitch);
        const end = project(layout, v, reach);
        items.push({
          depth: v[2] / 2,
          draw: () => {
            ctx.save();
            ctx.globalAlpha = dim("atoms");
            ctx.strokeStyle = theme.neutral;
            ctx.lineWidth = 5 * end.scale;
            ctx.lineCap = "round";
            segment(ctx, centre.x, centre.y, end.x, end.y);
            ctx.restore();
          },
        });
        items.push({
          depth: v[2],
          draw: () => {
            const r = (m.ligand === "H" ? 9 : 13) * end.scale;
            ctx.save();
            ctx.globalAlpha = dim("atoms");
            ctx.fillStyle = ELEMENT_COLOUR[m.ligand] ?? theme.neutral;
            ctx.beginPath();
            ctx.arc(end.x, end.y, r, 0, Math.PI * 2);
            ctx.fill();
            // A small highlight, so the spheres read as round.
            ctx.globalAlpha = 0.35 * dim("atoms");
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(end.x - r * 0.35, end.y - r * 0.35, r * 0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            if (has("labels")) label(ctx, m.ligand, end.x, end.y, { color: inkFor(ELEMENT_COLOUR[m.ligand] ?? theme.neutral), font: theme.fontStrong, align: "center" });
          },
        });
      }
      items.push({
        depth: 0,
        draw: () => {
          ctx.save();
          ctx.globalAlpha = dim("atoms");
          ctx.fillStyle = ELEMENT_COLOUR[m.central] ?? theme.neutral;
          ctx.beginPath();
          ctx.arc(centre.x, centre.y, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          if (has("labels")) label(ctx, m.central, centre.x, centre.y, { color: inkFor(ELEMENT_COLOUR[m.central] ?? theme.neutral), font: theme.fontStrong, align: "center" });
        },
      });
    }

    items.sort((a, b) => a.depth - b.depth).forEach((item) => item.draw());

    // ── The bond angle ────────────────────────────────────────────────────
    if (has("angle")) {
      const pair = quotedPair(m, bonds);
      if (pair) {
        const [a, b] = pair.map((d) => rotate(d, yaw, pitch)) as [Vec3, Vec3];
        const theta = (angleBetween(a, b) * Math.PI) / 180;
        // A straight molecule has no plane of its own: swing the arc round in the plane of the screen.
        const straight = theta > Math.PI - 1e-6;
        const side = perpendicular(a);
        ctx.save();
        ctx.globalAlpha = dim("angle");
        ctx.strokeStyle = theme.angle;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const steps = 24;
        let mid: { x: number; y: number } = centre;
        for (let s = 0; s <= steps; s++) {
          // Spherical interpolation between the two bond directions.
          const t = s / steps;
          const w1 = Math.sin((1 - t) * theta) / Math.sin(theta || 1e-9);
          const w2 = Math.sin(t * theta) / Math.sin(theta || 1e-9);
          const v: Vec3 = straight
            ? [a[0] * Math.cos(t * Math.PI) + side[0] * Math.sin(t * Math.PI), a[1] * Math.cos(t * Math.PI) + side[1] * Math.sin(t * Math.PI), a[2] * Math.cos(t * Math.PI) + side[2] * Math.sin(t * Math.PI)]
            : [a[0] * w1 + b[0] * w2, a[1] * w1 + b[1] * w2, a[2] * w1 + b[2] * w2];
          const p = project(layout, v, reach * 0.36);
          if (s === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
          if (s === steps / 2) mid = p;
        }
        ctx.stroke();
        ctx.restore();
        if (has("labels")) {
          const dx = mid.x - centre.x;
          const dy = mid.y - centre.y;
          const len = Math.hypot(dx, dy) || 1;
          label(ctx, `${formatNumber(m.bondAngle, m.bondAngle % 1 ? 1 : 0)}°`, mid.x + (dx / len) * 18, mid.y + (dy / len) * 18, {
            color: theme.angle,
            font: theme.fontStrong,
            align: "center",
            background: theme.background,
          });
        }
      }
    }

    // ── The facts ─────────────────────────────────────────────────────────
    if (has("facts")) {
      const { facts } = layout;
      const steric = m.bondPairs + m.lonePairs;
      const lines: [string, string, string][] = [
        [m.formula, theme.text, "big"],
        [SHAPES[m.shape] ?? "", theme.angle, "strong"],
        [`${m.bondPairs} bond pair${m.bondPairs === 1 ? "" : "s"} · ${m.lonePairs} lone pair${m.lonePairs === 1 ? "" : "s"}`, theme.text, ""],
        [`electron pairs arranged ${ARRANGEMENTS[steric] ?? ""}`, theme.muted, ""],
        [`${HYBRIDISATION[steric] ?? ""} hybridised`, theme.muted, ""],
        [`bond angle ${formatNumber(m.bondAngle, m.bondAngle % 1 ? 1 : 0)}°`, theme.angle, ""],
        [m.polar ? "polar: the bond dipoles do not cancel" : "non-polar: the bond dipoles cancel", m.polar ? theme.cosine : theme.tangent, ""],
      ];
      if (has("labels")) {
        let y = facts.y;
        for (const [text, colour, style] of lines) {
          const font = style === "big" ? `700 ${layout.compact ? 20 : 26}px ${theme.font.split(" ").slice(1).join(" ")}` : style === "strong" ? theme.fontStrong : theme.font;
          label(ctx, text, facts.x, y, { color: colour, font, baseline: "top" });
          y += style === "big" ? (layout.compact ? 28 : 36) : 20;
        }
      }
    }
  },

  /** Drag across the view to turn the molecule: left–right turns it round, up–down tips it. */
  pick(layout, x, y, locked) {
    const { view } = layout;
    const inside = x >= view.x && x <= view.x + view.width && y >= view.y && y <= view.y + view.height;
    if (locked !== "view" && (locked || !inside)) return null;
    const u = clamp((x - view.x) / view.width, 0, 1);
    const w = clamp((y - view.y) / view.height, 0, 1);
    return {
      writes: [
        { variable: "yaw", value: (u - 0.5) * 2 * Math.PI },
        { variable: "pitch", value: (w - 0.5) * Math.PI },
      ],
      region: "view",
      press: "sweep",
    };
  },
};
