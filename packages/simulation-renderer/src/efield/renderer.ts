/**
 * Electric charges and fields, in five pictures.
 *
 * Charges: q₁ and q₂ on a line with q₃ at P. Coulomb forces on q₁ and q₂
 * from each other, and on q₃ from each of them with their vector sum — all
 * drawn to one scale, so the net arrow is the diagonal of the parallelogram.
 * The same scene carries the field lines and a field-arrow map of q₁ and q₂,
 * the field at P, and a Gaussian sphere around q₁.
 *
 * Dipole: a dipole at angle θ in a uniform field, the force qE on each end,
 * and the turn the torque gives it.
 *
 * Flux: a flat surface seen edge-on in a uniform field, with its normal; the
 * field lines that pass through it are picked out.
 *
 * Sources: a line, a sheet or a shell with its Gaussian surface, over a graph
 * of E against distance.
 *
 * Plates: an electron or proton fired between charged plates, curving like a
 * thrown ball.
 */

import {
  EF_PARTICLE_ORDER,
  EF_PLATE_GAP,
  EF_PLATE_LENGTH,
  EF_SHELL_RADIUS,
  EF_SOURCE_ORDER,
  EF_X_LIMIT,
  EF_Y_LIMIT,
  efieldAt,
  efieldChargePositions,
  efieldFlight,
  efieldGaussField,
} from "@ise/physics-engine";
import { arrow, label, num } from "../shared/draw";
import { createPlane, drawPlane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface EfieldLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The drawing area, between the title and the caption. */
  scene: Box;
  /** The charges' window: its centre and pixels per centimetre. */
  cx: number;
  cy: number;
  scale: number;
  /** The sources view: the picture above and the E–r graph below. */
  picture: Box;
  graph: Box;
}

export function computeEfieldLayout(width: number): EfieldLayout {
  const compact = width < 560;
  const height = compact ? 390 : 420;
  const scene: Box = { x: 12, y: 30, width: width - 24, height: height - 30 - 34 };
  const scale = Math.min(scene.width / (2 * EF_X_LIMIT), scene.height / (2 * EF_Y_LIMIT));
  const left = compact ? 46 : 58;
  const pictureHeight = Math.round(scene.height * 0.48);
  return {
    width,
    height,
    compact,
    scene,
    cx: scene.x + scene.width / 2,
    cy: scene.y + scene.height / 2,
    scale,
    picture: { x: scene.x, y: scene.y, width: scene.width, height: pictureHeight },
    graph: { x: left, y: scene.y + pictureHeight + 22, width: width - left - 16, height: scene.height - pictureHeight - 40 },
  };
}

const SUPER: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
const minus = (text: string) => text.replace(/^-/, "−");

/** A number for a caption: plain when it is of everyday size, else a × 10ⁿ. */
export function efieldNumber(v: number, figures = 3): string {
  if (v === 0 || !Number.isFinite(v)) return "0";
  const a = Math.abs(v);
  if (a >= 0.01 && a < 1000) return minus(v.toFixed(Math.max(0, figures - 1 - Math.floor(Math.log10(a)))));
  const power = Math.floor(Math.log10(a));
  let mantissa = v / 10 ** power;
  let p = power;
  if (Math.abs(Number(mantissa.toFixed(figures - 1))) >= 10) {
    mantissa /= 10;
    p += 1;
  }
  const exponent = String(p).split("").map((c) => SUPER[c] ?? c).join("");
  return `${minus(mantissa.toFixed(figures - 1))} × 10${exponent}`;
}

const charge = (q: number) => (q === 0 ? "0" : `${q > 0 ? "+" : "−"}${Math.abs(q)} µC`);

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, alpha = 1) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, colour: string, lineWidth = 2, dash?: number[], alpha = 1) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  ctx.globalAlpha = alpha;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function clipTo(ctx: CanvasRenderingContext2D, box: Box) {
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.width, box.height);
  ctx.clip();
}

const chargeColour = (theme: LabTheme, q: number) => (q > 0 ? theme.secant : q < 0 ? theme.sine : theme.neutral);

/** A charge: a disc with its sign, or an empty ring when it carries nothing. */
function drawCharge(ctx: CanvasRenderingContext2D, x: number, y: number, q: number, theme: LabTheme, r = 10) {
  if (q === 0) {
    ctx.save();
    ctx.strokeStyle = theme.neutral;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(x, y, r - 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }
  disc(ctx, x, y, r, chargeColour(theme, q));
  label(ctx, q > 0 ? "+" : "−", x, y + 0.5, { color: theme.background, font: theme.fontStrong, align: "center" });
}

/** Arrow length on screen for a field of size e, N/C: grows with log E so a weak and a strong field both show. */
const fieldLength = (e: number, lo: number, hi: number) => (e <= 0 ? 0 : Math.min(hi, Math.max(lo, lo + ((hi - lo) * Math.log10(1 + e / 1e4)) / 3)));

export const efieldRenderer: SimulationRenderer<EfieldLayout> = {
  id: "efield",
  layout: (width) => computeEfieldLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height, scene } = layout;
    ctx.clearRect(0, 0, width, height);
    const title = (words: string) => label(ctx, words, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
    const caption = (words: string, row = 0) =>
      label(ctx, words, width / 2, height - 14 - row * 16, { color: theme.text, font: theme.font, align: "center" });

    const chargeScene = has("charges") || has("lines") || has("arrows") || has("probe") || has("forces") || has("gauss");
    if (chargeScene) drawCharges(ctx, layout, input.results, has, theme, title, caption);

    if (has("dipole")) {
      title("A dipole in a uniform field");
      const theta = num(results.theta);
      const t = (theta * Math.PI) / 180;
      drawUniformField(ctx, scene, theme, 7, 0.45);
      const cx = scene.x + scene.width / 2;
      const cy = scene.y + scene.height / 2;
      const half = Math.min(scene.width, scene.height) * (0.06 + 0.02 * num(results.dipoleLength, 2));
      const ux = Math.cos(t);
      const uy = -Math.sin(t);
      const [nx, ny] = [cx - ux * half, cy - uy * half];
      const [px, py] = [cx + ux * half, cy + uy * half];
      line(ctx, nx, ny, px, py, theme.neutral, 3);
      // Forces qE: along E on +q, against it on −q.
      arrow(ctx, px, py, px + 42, py, { color: theme.secant, width: 2.5, head: 8 });
      arrow(ctx, nx, ny, nx - 42, ny, { color: theme.sine, width: 2.5, head: 8 });
      drawCharge(ctx, px, py, 1, theme, 9);
      drawCharge(ctx, nx, ny, -1, theme, 9);
      // p, and the angle it makes with E.
      arrow(ctx, cx, cy, cx + ux * half * 0.6, cy + uy * half * 0.6, { color: theme.angle, width: 2.5, head: 8 });
      line(ctx, cx, cy, cx + half * 0.9, cy, theme.muted, 1, [3, 4]);
      if (theta > 0) {
        ctx.save();
        ctx.strokeStyle = theme.angle;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 26, -t, 0);
        ctx.stroke();
        ctx.restore();
      }
      const mid = -t / 2;
      label(ctx, `θ = ${Math.round(theta)}°`, cx + 34 * Math.cos(mid) + 4, cy + 34 * Math.sin(mid) - 4, { color: theme.angle, font: theme.fontStrong });
      label(ctx, "p", cx + ux * half * 0.6 - uy * 12, cy + uy * half * 0.6 + ux * 12, { color: theme.angle, font: theme.fontStrong, align: "center" });
      label(ctx, "+qE", px + 44, py - 12, { color: theme.secant, font: theme.font, align: "right" });
      label(ctx, "−qE", nx - 44, ny - 12, { color: theme.sine, font: theme.font });
      // The turn: back towards the field, clockwise on screen for 0 < θ < 180°.
      if (theta > 0 && theta < 180) {
        const r = half + 18;
        ctx.save();
        ctx.strokeStyle = theme.tangent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, -t, -t + 0.45);
        ctx.stroke();
        ctx.restore();
        const end = -t + 0.45;
        const ex = cx + r * Math.cos(end);
        const ey = cy + r * Math.sin(end);
        // The arc runs clockwise on screen; its direction there is (−sin, cos).
        arrow(ctx, ex + 6 * Math.sin(end), ey - 6 * Math.cos(end), ex, ey, { color: theme.tangent, width: 2, head: 7 });
      }
      if (has("labels")) {
        caption(`p = ${efieldNumber(num(results.dipoleP))} C m · E = ${efieldNumber(num(results.fieldE))} N/C`, 1);
        caption(`τ = ${efieldNumber(num(results.torque))} N m · U = ${efieldNumber(num(results.energy))} J`);
      }
    }

    if (has("flux")) {
      title("Flux through a flat surface");
      const tilt = num(results.tilt);
      const t = (tilt * Math.PI) / 180;
      const cx = scene.x + scene.width / 2;
      const cy = scene.y + scene.height / 2;
      const side = Math.sqrt(num(results.area, 100)); // cm
      const half = Math.min(scene.height * 0.42, 9 + side * Math.min(scene.height, scene.width) * 0.022);
      // The surface lies at right angles to its normal n̂, which makes θ with E.
      const nx = Math.cos(t);
      const ny = -Math.sin(t);
      const sx = -ny;
      const sy = nx;
      const reach = Math.abs(sy) * half;
      const rows = 9;
      for (let i = 0; i < rows; i++) {
        const y = scene.y + 14 + ((scene.height - 28) * i) / (rows - 1);
        const through = Math.abs(y - cy) < reach - 0.5;
        arrow(ctx, scene.x + 6, y, scene.x + scene.width - 6, y, { color: through ? theme.tangent : theme.muted, width: through ? 2 : 1.25, head: 7, alpha: through ? 1 : 0.5 });
      }
      line(ctx, cx - sx * half, cy - sy * half, cx + sx * half, cy + sy * half, theme.curve, 5);
      arrow(ctx, cx, cy, cx + nx * 52, cy + ny * 52, { color: theme.angle, width: 2.5, head: 8 });
      label(ctx, "n̂", cx + nx * 62, cy + ny * 62, { color: theme.angle, font: theme.fontStrong, align: "center" });
      label(ctx, `θ = ${Math.round(tilt)}°`, scene.x + 6, scene.y + 2, { color: theme.angle, font: theme.fontStrong });
      label(ctx, "E →", scene.x + scene.width - 6, scene.y + 2, { color: theme.muted, font: theme.font, align: "right" });
      if (has("labels")) {
        caption(`E = ${efieldNumber(num(results.fieldE))} N/C · A = ${efieldNumber(num(results.area))} cm²`, 1);
        caption(`Φ = EA cos θ = ${efieldNumber(num(results.flux))} N m²/C`);
      }
    }

    if (has("sources")) drawSources(ctx, layout, results, has, theme, title, caption);
    if (has("plates")) drawPlates(ctx, layout, results, has, theme, title, caption);
  },
};

function drawUniformField(ctx: CanvasRenderingContext2D, box: Box, theme: LabTheme, rows: number, alpha: number) {
  for (let i = 0; i < rows; i++) {
    const y = box.y + 12 + ((box.height - 24) * i) / (rows - 1);
    arrow(ctx, box.x + 6, y, box.x + box.width - 6, y, { color: theme.muted, width: 1.25, head: 7, alpha });
  }
  label(ctx, "E →", box.x + box.width - 6, box.y + 2, { color: theme.muted, font: theme.font, align: "right" });
}

type Has = (layer: string) => boolean;
type Say = (words: string, row?: number) => void;
type Results = Record<string, unknown>;

/** q₁, q₂ and q₃ with their forces, field lines, field arrows, the field at P and a Gaussian sphere. */
function drawCharges(ctx: CanvasRenderingContext2D, layout: EfieldLayout, results: Results, has: Has, theme: LabTheme, title: (w: string) => void, caption: Say) {
  const { scene, cx, cy, scale } = layout;
  const q1 = num(results.q1);
  const q2 = num(results.q2);
  const q3 = num(results.q3);
  const sep = num(results.sep, 10);
  const { a, b } = efieldChargePositions(sep);
  const toPx = (x: number, y: number): [number, number] => [cx + x * scale, cy - y * scale];
  const [ax, ay] = toPx(a[0], a[1]);
  const [bx, by] = toPx(b[0], b[1]);
  const [ppx, ppy] = toPx(num(results.px), num(results.py));
  const pair: [number, number, number][] = [
    [a[0], a[1], q1],
    [b[0], b[1], q2],
  ];
  const fieldPx = (x: number, y: number) => {
    const wx = (x - cx) / scale;
    const wy = (cy - y) / scale;
    const [ex, ey] = efieldAt(wx, wy, pair);
    return [ex, -ey] as const; // screen y runs down
  };

  const showQ3 = (has("forces") || has("gauss")) && q3 !== 0;
  title(has("gauss") ? "A Gaussian sphere around q₁" : has("forces") ? "Coulomb forces" : "The field of q₁ and q₂");

  ctx.save();
  clipTo(ctx, scene);

  if (has("arrows")) {
    const step = layout.compact ? 26 : 32;
    for (let y = scene.y + step / 2; y < scene.y + scene.height; y += step) {
      for (let x = scene.x + step / 2; x < scene.x + scene.width; x += step) {
        if (Math.hypot(x - ax, y - ay) < 14 || Math.hypot(x - bx, y - by) < 14) continue;
        const [ex, ey] = fieldPx(x, y);
        const e = Math.hypot(ex, ey);
        if (e === 0) continue;
        const len = fieldLength(e, 5, step * 0.7);
        arrow(ctx, x - (ex / e) * len / 2, y - (ey / e) * len / 2, x + (ex / e) * len / 2, y + (ey / e) * len / 2, { color: theme.curve, width: 1.25, head: 5, alpha: 0.8 });
      }
    }
  }

  if (has("lines")) {
    const charges = [
      { x: ax, y: ay, q: q1 },
      { x: bx, y: by, q: q2 },
    ];
    const biggest = Math.max(Math.abs(q1), Math.abs(q2));
    for (const from of charges) {
      if (from.q === 0) continue;
      // Lines start on + charges; from a − charge we draw only those that come in from far away.
      const n = Math.max(2, Math.round((12 * Math.abs(from.q)) / biggest));
      for (let k = 0; k < n; k++) {
        const angle = ((k + 0.5) * 2 * Math.PI) / n;
        const path = traceLine(from.x + 9 * Math.cos(angle), from.y + 9 * Math.sin(angle), from.q > 0 ? 1 : -1, fieldPx, scene, charges, from);
        if (from.q < 0 && path.endsOnCharge) continue;
        strokePath(ctx, path.points, theme.neutral, from.q > 0 ? 1 : -1);
      }
    }
  }

  if (has("gauss")) {
    const r = num(results.gaussR, 5) * scale;
    ctx.save();
    ctx.fillStyle = theme.tangent;
    ctx.globalAlpha = 0.1;
    ctx.beginPath();
    ctx.arc(ax, ay, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = theme.tangent;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  drawCharge(ctx, ax, ay, q1, theme);
  drawCharge(ctx, bx, by, q2, theme);
  label(ctx, `q₁ ${charge(q1)}`, ax, ay + 20, { color: chargeColour(theme, q1), font: theme.font, align: ax < scene.x + 40 ? "left" : "center", background: theme.background });
  label(ctx, `q₂ ${charge(q2)}`, bx, by + 38, { color: chargeColour(theme, q2), font: theme.font, align: bx > scene.x + scene.width - 40 ? "right" : "center", background: theme.background });

  ctx.save();
  clipTo(ctx, scene);
  if (has("forces")) {
    // q₁ and q₂ push or pull on each other: equal and opposite.
    const f12 = num(results.force12);
    const together = num(results.interaction) < 0;
    if (f12 > 0) {
      const len = 34;
      const dir = together ? 1 : -1;
      arrow(ctx, ax, ay, ax + dir * len, ay, { color: theme.angle, width: 2.5, head: 8 });
      arrow(ctx, bx, by, bx - dir * len, by, { color: theme.angle, width: 2.5, head: 8 });
    }
    if (q3 !== 0) {
      const f31 = [num(results.f31x), num(results.f31y)] as const;
      const f32 = [num(results.f32x), num(results.f32y)] as const;
      const net = [num(results.netX), num(results.netY)] as const;
      const biggest = Math.max(Math.hypot(...f31), Math.hypot(...f32), Math.hypot(...net));
      const k = biggest > 0 ? 64 / biggest : 0;
      const tip = (f: readonly [number, number]) => [ppx + f[0] * k, ppy - f[1] * k] as const;
      const [t1x, t1y] = tip(f31);
      const [t2x, t2y] = tip(f32);
      const [tnx, tny] = tip(net);
      // The parallelogram: the net force is its diagonal.
      line(ctx, t1x, t1y, tnx, tny, theme.muted, 1, [3, 3]);
      line(ctx, t2x, t2y, tnx, tny, theme.muted, 1, [3, 3]);
      arrow(ctx, ppx, ppy, t1x, t1y, { color: theme.secant, width: 1.75, head: 7 });
      arrow(ctx, ppx, ppy, t2x, t2y, { color: theme.sine, width: 1.75, head: 7 });
      arrow(ctx, ppx, ppy, tnx, tny, { color: theme.tangent, width: 3, head: 9 });
    }
  }
  ctx.restore();
  if (showQ3) {
    drawCharge(ctx, ppx, ppy, q3, theme, 8);
    label(ctx, `q₃ ${charge(q3)}`, ppx + 12, ppy - 14, { color: chargeColour(theme, q3), font: theme.font, align: ppx > scene.x + scene.width - 70 ? "right" : "left", background: theme.background });
  }

  if (has("probe")) {
    const ex = num(results.fieldX);
    const ey = num(results.fieldY);
    const e = Math.hypot(ex, ey);
    if (e > 0) {
      const len = fieldLength(e, 14, 64);
      ctx.save();
      clipTo(ctx, scene);
      arrow(ctx, ppx, ppy, ppx + (ex / e) * len, ppy - (ey / e) * len, { color: theme.tangent, width: 3, head: 9 });
      ctx.restore();
    }
    disc(ctx, ppx, ppy, 4, theme.point);
    label(ctx, "P", ppx - 8, ppy - 10, { color: theme.point, font: theme.fontStrong, align: "right" });
  }

  if (!has("labels")) return;
  if (has("gauss")) {
    caption(`charges inside: ${num(results.enclosedCount)} · q_enc = ${efieldNumber(num(results.qEnclosed))} µC`, 1);
    caption(`Φ = q_enc / ε₀ = ${efieldNumber(num(results.gaussFlux))} N m²/C`);
  } else if (has("forces")) {
    const f12 = num(results.force12);
    const kind = num(results.interaction) > 0 ? "repel" : num(results.interaction) < 0 ? "attract" : "no force";
    caption(`q₁ and q₂: ${efieldNumber(f12)} N, ${kind}`, 1);
    caption(q3 !== 0 ? `net force on q₃: ${efieldNumber(num(results.netForce))} N at ${Math.round(num(results.netAngle))}°` : "q₃ is uncharged: no force on it");
  } else if (has("probe")) {
    if (num(results.isDipole) === 1) caption(`a dipole: p = ${efieldNumber(num(results.pairMoment))} C m`, 1);
    caption(`E at P: ${efieldNumber(num(results.field))} N/C at ${Math.round(num(results.fieldAngle))}°`);
  }
}

/** Follow the field from (x, y), forwards (+1) or backwards (−1), until it leaves the scene or reaches a charge. */
function traceLine(
  x: number,
  y: number,
  sense: 1 | -1,
  field: (x: number, y: number) => readonly [number, number],
  box: Box,
  charges: readonly { x: number; y: number; q: number }[],
  from: { x: number; y: number },
) {
  const points: [number, number][] = [[x, y]];
  let endsOnCharge = false;
  for (let i = 0; i < 700; i++) {
    const [ex, ey] = field(x, y);
    const e = Math.hypot(ex, ey);
    if (e === 0) break;
    x += (sense * 3 * ex) / e;
    y += (sense * 3 * ey) / e;
    points.push([x, y]);
    if (x < box.x - 4 || x > box.x + box.width + 4 || y < box.y - 4 || y > box.y + box.height + 4) break;
    const hit = charges.find((c) => c.q !== 0 && c !== from && Math.hypot(x - c.x, y - c.y) < 7);
    if (hit) {
      endsOnCharge = true;
      break;
    }
  }
  return { points, endsOnCharge };
}

/** A field line, with an arrowhead part way along pointing the way E points. */
function strokePath(ctx: CanvasRenderingContext2D, points: readonly [number, number][], colour: string, sense: 1 | -1) {
  if (points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(points[0]![0], points[0]![1]);
  for (const [x, y] of points.slice(1)) ctx.lineTo(x, y);
  ctx.stroke();
  ctx.restore();
  const i = Math.min(points.length - 2, 14);
  const [x1, y1] = points[i]!;
  const [x2, y2] = points[i + 1]!;
  const [fx, fy, tx, ty] = sense > 0 ? [x1, y1, x2, y2] : [x2, y2, x1, y1];
  const d = Math.hypot(tx - fx, ty - fy) || 1;
  arrow(ctx, tx - ((tx - fx) / d) * 6, ty - ((ty - fy) / d) * 6, tx, ty, { color: colour, width: 1.25, head: 6, alpha: 0.85 });
}

/** A line, a sheet or a shell with its Gaussian surface, and E against r beneath. */
function drawSources(ctx: CanvasRenderingContext2D, layout: EfieldLayout, results: Results, has: Has, theme: LabTheme, title: (w: string) => void, caption: Say) {
  const { picture, graph } = layout;
  const id = EF_SOURCE_ORDER[Math.round(num(results.source))] ?? "line";
  const amount = num(results.amount, 1);
  const r = num(results.dist, 10);
  const field = num(results.appField);
  title(id === "line" ? "A long charged line" : id === "sheet" ? "A large charged sheet" : "A charged spherical shell");

  // The picture: distance runs to the right from the source, 0 to 40 cm.
  const x0 = picture.x + 22;
  const k = (picture.width - 36) / 42;
  const midY = picture.y + picture.height / 2;
  const px = x0 + r * k;
  ctx.save();
  clipTo(ctx, picture);
  if (id === "line" || id === "sheet") {
    line(ctx, x0, picture.y + 4, x0, picture.y + picture.height - 4, theme.secant, id === "sheet" ? 6 : 3);
    for (let y = picture.y + 12; y < picture.y + picture.height - 6; y += 16) label(ctx, "+", x0 - 9, y, { color: theme.secant, font: theme.font, align: "center" });
    // The Gaussian surface: a cylinder round the line, a pillbox through the sheet.
    const h = picture.height * 0.36;
    ctx.save();
    ctx.strokeStyle = theme.tangent;
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.75;
    if (id === "line") ctx.strokeRect(x0 - r * k, midY - h / 2, 2 * r * k, h);
    else ctx.strokeRect(x0 - r * k, midY - h / 4, 2 * r * k, h / 2);
    ctx.restore();
  } else {
    const radius = EF_SHELL_RADIUS * k;
    ctx.save();
    ctx.strokeStyle = theme.secant;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x0, midY, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.75;
    ctx.strokeStyle = theme.tangent;
    ctx.beginPath();
    ctx.arc(x0, midY, r * k, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  line(ctx, x0, midY, px, midY, theme.muted, 1, [3, 3]);
  if (field > 0) arrow(ctx, px, midY, px + fieldLength(field, 12, 46), midY, { color: theme.tangent, width: 2.5, head: 8 });
  disc(ctx, px, midY, 4, theme.point);
  label(ctx, `r = ${efieldNumber(r)} cm`, Math.min(Math.max(px, picture.x + 36), picture.x + picture.width - 36), midY + 14, { color: theme.text, font: theme.font, align: "center" });

  // The graph of E against r, in units of a round power of ten.
  const sample = (d: number) => efieldGaussField(id, amount, d);
  let peak = 0;
  for (let d = 2; d <= 40; d += 0.5) peak = Math.max(peak, sample(d));
  peak = Math.max(peak, field) * 1.1 || 1;
  const power = Math.floor(Math.log10(peak));
  const unit = 10 ** power;
  const plane = createPlane(graph, [0, 40], [0, peak / unit]);
  drawPlane(ctx, plane, theme);
  label(ctx, `E / 10${String(power).split("").map((c) => SUPER[c] ?? c).join("")} N/C, against r / cm`, graph.x + 4, graph.y - 9, { color: theme.muted, font: theme.font });
  ctx.save();
  clipTo(ctx, graph);
  ctx.strokeStyle = theme.curve;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i <= 200; i++) {
    const d = 0.5 + (39.5 * i) / 200;
    const [gx, gy] = plane.toPx(d, sample(d) / unit);
    // The shell's field jumps at its surface.
    if (i === 0 || (id === "shell" && Math.abs(d - EF_SHELL_RADIUS) < 0.2)) ctx.moveTo(gx, gy);
    else ctx.lineTo(gx, gy);
  }
  ctx.stroke();
  ctx.restore();
  const [dx, dy] = plane.toPx(r, field / unit);
  disc(ctx, dx, dy, 5, theme.angle);

  if (has("labels")) {
    const what = id === "line" ? "E = λ/2πε₀r" : id === "sheet" ? "E = σ/2ε₀" : num(results.insideShell) === 1 ? "inside: E = 0" : "E = kQ/r²";
    caption(`${what} = ${efieldNumber(field)} N/C`);
  }
}

/** Two plates, the field between them, and the charge's curved path. */
function drawPlates(ctx: CanvasRenderingContext2D, layout: EfieldLayout, results: Results, has: Has, theme: LabTheme, title: (w: string) => void, caption: Say) {
  const { scene } = layout;
  const particle = EF_PARTICLE_ORDER[Math.round(num(results.particle))] ?? "electron";
  title(`${particle === "electron" ? "An electron" : "A proton"} between charged plates`);
  const span = EF_PLATE_LENGTH + 2.5; // cm of path shown
  const k = Math.min((scene.width - 24) / span, (scene.height - 60) / (EF_PLATE_GAP + 2));
  const x0 = scene.x + (scene.width - span * k) / 2 + 0.5 * k;
  const midY = scene.y + scene.height / 2;
  const half = (EF_PLATE_GAP / 2) * k;
  const toPx = (xCm: number, yMm: number): [number, number] => [x0 + xCm * k, midY - (yMm / 10) * k];

  // Plates: + on top, − below; the field points down from + to −.
  const plateW = EF_PLATE_LENGTH * k;
  ctx.save();
  ctx.fillStyle = theme.secant;
  ctx.fillRect(x0, midY - half - 6, plateW, 6);
  ctx.fillStyle = theme.sine;
  ctx.fillRect(x0, midY + half, plateW, 6);
  ctx.restore();
  label(ctx, "+ + + + +", x0 + plateW / 2, midY - half - 16, { color: theme.secant, font: theme.fontStrong, align: "center" });
  label(ctx, "− − − − −", x0 + plateW / 2, midY + half + 18, { color: theme.sine, font: theme.fontStrong, align: "center" });
  for (let i = 1; i < 6; i++) {
    const x = x0 + (plateW * i) / 6;
    arrow(ctx, x, midY - half + 4, x, midY + half - 4, { color: theme.muted, width: 1, head: 6, alpha: 0.45 });
  }
  label(ctx, "E ↓", x0 + plateW + 8, midY - half + 8, { color: theme.muted, font: theme.font });

  // The path: a parabola between the plates, then a straight line once out of the field.
  const flight = efieldFlight(particle, num(results.fieldE), num(results.speed, 10000));
  const yAt = (xCm: number) => flight.up * flight.shift(xCm / 100) * 1000;
  const endCm = flight.end * 100;
  const points: [number, number][] = [toPx(-0.5, 0)];
  for (let i = 0; i <= 60; i++) {
    const x = (endCm * i) / 60;
    points.push(toPx(x, yAt(x)));
  }
  if (!flight.hits) {
    const slope = (flight.up * flight.accel * flight.length) / (flight.v * flight.v); // dy/dx, both in m
    const extra = span - 0.5 - EF_PLATE_LENGTH - 0.5;
    points.push(toPx(EF_PLATE_LENGTH + extra, yAt(EF_PLATE_LENGTH) + slope * extra * 10));
  }
  ctx.save();
  clipTo(ctx, scene);
  ctx.strokeStyle = theme.angle;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.stroke();
  ctx.restore();
  const [bx, by] = toPx(num(results.posX), num(results.posY));
  disc(ctx, bx, by, 6, particle === "electron" ? theme.sine : theme.secant);
  label(ctx, particle === "electron" ? "e⁻" : "p⁺", bx, by - 14, { color: theme.text, font: theme.fontStrong, align: "center" });
  arrow(ctx, toPx(-0.5, 0)[0] - 4, midY, toPx(-0.5, 0)[0] + 22, midY, { color: theme.text, width: 1.5, head: 6 });

  if (has("labels")) {
    caption(`v₀ = ${efieldNumber(num(results.speed))} km/s · E = ${efieldNumber(num(results.fieldE))} N/C`, 1);
    caption(
      num(results.hitsPlate) === 1
        ? `hits the ${flight.up > 0 ? "+" : "−"} plate ${efieldNumber(num(results.hitX))} cm in`
        : `leaves ${efieldNumber(num(results.exitDeflection))} mm off line, after ${efieldNumber(num(results.transit))} ns`,
    );
  }
}
