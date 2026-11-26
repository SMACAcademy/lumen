/**
 * Complexes: their names, and their isomers.
 *
 * Naming: the formula, then its IUPAC name built from coloured parts —
 * ligands, the metal (ending -ate in an anion), its oxidation state, and the
 * counter ion — with the arithmetic that gives the oxidation state.
 *
 * Isomers: the octahedron (or square) in perspective with ligand A in grey,
 * B in pink and each chelate drawn as a band joining its two corners. When
 * the isomer is chiral its mirror image stands beside it across a dashed
 * mirror.
 */

import {
  type Arrangement,
  ARRANGEMENT_NAMES,
  classesOf,
  COMPLEX_TYPE_LABELS,
  COMPLEX_TYPE_ORDER,
  COMPOUND_ORDER,
  COMPOUNDS,
  coordinationNumber,
  metalOxidationState,
  NAMING_LIGANDS,
  nameParts,
  SITE_VECTORS,
} from "@ise/chemistry-engine";
import { clamp, label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface IsomersLayout {
  width: number;
  height: number;
  compact: boolean;
}

export function computeIsomersLayout(width: number): IsomersLayout {
  const compact = width < 560;
  return { width, height: compact ? 320 : 340, compact };
}

/** Screen position of an octahedral site, in perspective: x right, z up, y towards the viewer (down-left). */
export function sitePoint(site: number, cx: number, cy: number, r: number, mirror = false): [number, number] {
  const [x, y, z] = SITE_VECTORS[site]!;
  const sx = (mirror ? -x : x) - 0.45 * y;
  const sy = -z + 0.35 * y;
  return [cx + sx * r, cy + sy * r];
}

const signed = (q: number) => (q > 0 ? `+${q}` : q < 0 ? `−${-q}` : "0");

function drawComplex(ctx: CanvasRenderingContext2D, a: Arrangement, cx: number, cy: number, r: number, mirror: boolean, theme: LabTheme) {
  const used = a.sites.map((s, i) => (s === "·" ? -1 : i)).filter((i) => i >= 0);
  // Skeleton: every cis pair of sites in use.
  ctx.save();
  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 1;
  for (const i of used)
    for (const j of used) {
      if (j <= i || Math.floor(i / 2) === Math.floor(j / 2)) continue;
      const [x1, y1] = sitePoint(i, cx, cy, r, mirror);
      const [x2, y2] = sitePoint(j, cx, cy, r, mirror);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  // Bonds from the metal.
  ctx.strokeStyle = theme.axis;
  for (const i of used) {
    const [x, y] = sitePoint(i, cx, cy, r, mirror);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  // Chelates: a band between their two corners.
  ctx.strokeStyle = theme.angle;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  for (const [i, j] of a.chelates) {
    const [x1, y1] = sitePoint(i, cx, cy, r, mirror);
    const [x2, y2] = sitePoint(j, cx, cy, r, mirror);
    // Bow the band outwards, away from the metal.
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const bx = mx + (mx - cx) * 0.35;
    const by = my + (my - cy) * 0.35;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(bx, by, x2, y2);
    ctx.stroke();
  }
  ctx.restore();
  // The metal and the ligand atoms, back to front.
  ctx.save();
  ctx.fillStyle = theme.accent;
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const order = [...used].sort((i, j) => SITE_VECTORS[i]![1] - SITE_VECTORS[j]![1]);
  for (const i of order) {
    const [x, y] = sitePoint(i, cx, cy, r, mirror);
    const s = a.sites[i];
    ctx.save();
    ctx.fillStyle = s === "B" ? theme.cosine : a.chelates.length ? theme.angle : theme.neutral;
    ctx.strokeStyle = theme.background;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    label(ctx, s === "B" ? "B" : "A", x, y, { color: theme.background, font: theme.fontStrong, align: "center" });
  }
}

export const isomersRenderer: SimulationRenderer<IsomersLayout> = {
  id: "isomers",
  layout: (width) => computeIsomersLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height, compact } = layout;
    ctx.clearRect(0, 0, width, height);

    if (has("naming")) {
      const compound = COMPOUNDS[COMPOUND_ORDER[Math.round(num(results.compound))] ?? "hexaamminecobalt"];
      label(ctx, compound.formula, width / 2, 40, { color: theme.text, font: "700 24px ui-sans-serif, system-ui, sans-serif", align: "center" });
      // The name, part by part, centred and wrapped if it must be.
      const parts = nameParts(compound);
      const colour = { ligand: theme.sine, metal: theme.cosine, state: theme.angle, counter: theme.muted, space: theme.text } as const;
      const font = compact ? theme.fontStrong : "600 16px ui-sans-serif, system-ui, sans-serif";
      ctx.font = font;
      const widths = parts.map((p) => ctx.measureText(p.text).width);
      const total = widths.reduce((a, b) => a + b, 0);
      const maxLine = width - 24;
      let x = total <= maxLine ? (width - total) / 2 : 12;
      let y = 88;
      parts.forEach((p, i) => {
        if (x + widths[i]! > width - 12) {
          x = 12;
          y += 22;
        }
        label(ctx, p.text, x, y, { color: colour[p.kind], font, align: "left" });
        x += widths[i]!;
      });

      if (has("working")) {
        const charge = num(results.complexCharge);
        const ligandCharge = compound.ligands.reduce((s, l) => s + NAMING_LIGANDS[l.id]!.charge * l.n, 0);
        const lines = [
          `Ligands: ${compound.ligands.map((l) => `${l.n} × ${NAMING_LIGANDS[l.id]!.formula} (${NAMING_LIGANDS[l.id]!.name}, ${signed(NAMING_LIGANDS[l.id]!.charge)})`).join(", ")}`,
          `Complex charge ${signed(charge)}${compound.counter ? `, from ${compound.counter.count} ${compound.counter.name}` : ""}`,
          `Metal: ${signed(charge)} − (${signed(ligandCharge)}) = ${signed(metalOxidationState(compound))} · coordination number ${coordinationNumber(compound)}`,
        ];
        lines.forEach((line, i) => label(ctx, line, width / 2, y + 44 + i * 24, { color: theme.text, font: theme.font, align: "center" }));
      }
    }

    if (has("isomers")) {
      const type = COMPLEX_TYPE_ORDER[Math.round(num(results.type))] ?? "ma4b2";
      const classes = classesOf(type);
      const cls = classes[clamp(Math.round(num(results.isomer)), 0, classes.length - 1)]!;
      const chiral = num(results.chiral) === 1;
      const r = compact ? 62 : 80;
      const cy = height / 2 - 6;
      if (chiral) {
        drawComplex(ctx, cls.arrangement, width * 0.27, cy, r * 0.85, false, theme);
        drawComplex(ctx, cls.arrangement, width * 0.73, cy, r * 0.85, true, theme);
        ctx.save();
        ctx.strokeStyle = theme.muted;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(width / 2, cy - r - 10);
        ctx.lineTo(width / 2, cy + r + 10);
        ctx.stroke();
        ctx.restore();
        label(ctx, "mirror", width / 2, cy + r + 22, { color: theme.muted, font: theme.font, align: "center" });
      } else drawComplex(ctx, cls.arrangement, width / 2, cy, r, false, theme);
      const name = ARRANGEMENT_NAMES[Math.round(num(results.arrangement))] ?? "";
      const title = `${name ? `${name}-` : ""}${COMPLEX_TYPE_LABELS[type]}`;
      label(ctx, title, 12, 18, { color: theme.text, font: theme.fontStrong, align: "left" });
      // The count is an estimate's answer, so only with the words on.
      if (has("labels")) label(ctx, `isomer ${Math.round(num(results.isomer)) + 1} of ${classes.length}`, width - 12, 18, { color: theme.muted, font: theme.font, align: "right" });

      if (has("labels")) {
        const geometric = num(results.geometricCount);
        const stereo = num(results.stereoCount);
        // Short enough for a phone.
        const words = chiral
          ? `Chiral — ${geometric} geometric, ${stereo} stereoisomers`
          : `Not chiral — ${geometric} geometric, ${stereo} stereoisomer${stereo === 1 ? "" : "s"}`;
        label(ctx, words, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
      }
    }
  },
};
