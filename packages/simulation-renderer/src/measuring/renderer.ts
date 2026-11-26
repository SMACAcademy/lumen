/**
 * Measuring and moving, for classes 6 and 7.
 *
 * Units: the thing measured as a long bar, with hand spans (or feet, cubits,
 * or a 30 cm scale) laid along it one after another, and underneath, the
 * child's and the teacher's unit side by side — why they get different
 * numbers.
 *
 * Ruler: a 15 cm ruler with a crayon (or a thread from a curved line) lying
 * along it from a start mark, and an eye looking down at the far end. Read
 * from the side, the sight line lands 2 mm off.
 *
 * Motion: one mover — along a line, round a circle, to and fro, or spinning.
 *
 * Pendulum: a bob on a string with a stopwatch counting oscillations.
 *
 * Speed: a car crossing a measured road against a clock.
 *
 * Answers asked for in the levels (the count, the reading, the period, the
 * speed) are written only with the "labels" layer on.
 */

import {
  MEASURING_CURVE_GAP,
  MEASURING_ITEM_ORDER,
  MEASURING_ITEMS,
  MEASURING_MEASURERS,
  MEASURING_MOVER_ORDER,
  MEASURING_MOVERS,
  MEASURING_RULER_LENGTH,
  MEASURING_SCALE_LENGTH,
  MEASURING_SCALE_UNIT,
  MEASURING_UNITS,
  measuringUnitSize,
} from "@ise/physics-engine";
import { clamp, label, num, segment } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface MeasuringLayout {
  width: number;
  height: number;
  compact: boolean;
  left: number;
  right: number;
  /** Ruler: where 0 cm is, px per cm, and the top edge. */
  ruler: { x0: number; perCm: number; top: number; depth: number };
  /** Pendulum pivot and px per cm of string. */
  pivot: { x: number; y: number; perCm: number };
  /** Centre of the motion stage. */
  stage: { x: number; y: number; r: number };
}

export function computeMeasuringLayout(width: number): MeasuringLayout {
  const compact = width < 560;
  const height = compact ? 360 : 380;
  const left = 16;
  const right = width - 16;
  // Kept to 28 px a centimetre on wide screens, so the curved line fits above.
  const perCm = Math.min(28, (right - left - 16) / MEASURING_RULER_LENGTH);
  const x0 = width / 2 - (MEASURING_RULER_LENGTH * perCm) / 2;
  const pivotY = 34;
  return {
    width,
    height,
    compact,
    left,
    right,
    ruler: { x0, perCm, top: height - 120, depth: 42 },
    pivot: { x: width / 2, y: pivotY, perCm: (height - 120 - pivotY) / 200 },
    stage: { x: width / 2, y: 160, r: compact ? 70 : 90 },
  };
}

/** A number with at most `digits` decimals and no trailing zeros. */
export function measuringFmt(x: number, digits = 1): string {
  const s = (Math.round(x * 10 ** digits) / 10 ** digits).toFixed(digits);
  return digits > 0 ? s.replace(/\.?0+$/, "") : s;
}

function caption(ctx: CanvasRenderingContext2D, layout: MeasuringLayout, text: string, theme: LabTheme) {
  label(ctx, text, layout.width / 2, layout.height - 16, { color: theme.text, font: theme.font, align: "center" });
}

function bracket(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, colour: string) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2.5;
  segment(ctx, x1 + 1, y, x2 - 1, y);
  ctx.lineWidth = 1.5;
  segment(ctx, x1 + 1, y - 7, x1 + 1, y + 1);
  segment(ctx, x2 - 1, y - 7, x2 - 1, y + 1);
  ctx.restore();
}

// ── Units ────────────────────────────────────────────────────────────────────

function drawUnits(ctx: CanvasRenderingContext2D, layout: MeasuringLayout, results: Record<string, unknown>, layers: ReadonlySet<string>, theme: LabTheme) {
  const { left, right, compact } = layout;
  const item = MEASURING_ITEM_ORDER[Math.round(num(results.item))] ?? "desk";
  const unit = Math.round(num(results.unit));
  const measurer = Math.round(num(results.measurer));
  const u = MEASURING_UNITS[unit] ?? MEASURING_UNITS[0]!;
  const length = num(results.objectLength, 120);
  const unitLength = num(results.unitLength, 15);
  const s = (right - left) / Math.max(1, length);
  const x = (cm: number) => left + cm * s;
  const isScale = unit === MEASURING_SCALE_UNIT;

  if (layers.has("object")) {
    label(ctx, `The ${MEASURING_ITEMS[item].label}, measured by ${MEASURING_MEASURERS[measurer] ?? "a child"}`, left, 22, { color: theme.text, font: theme.fontStrong });
    ctx.save();
    ctx.fillStyle = theme.secant;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(left, 44, right - left, 24);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = theme.secant;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(left, 44, right - left, 24);
    ctx.restore();
  }

  if (layers.has("units")) {
    const laid = clamp(num(results.laid), 0, num(results.count));
    const y = 90;
    if (isScale) {
      for (let from = 0; from < laid - 1e-9; from += MEASURING_SCALE_LENGTH) {
        const to = Math.min(laid, from + MEASURING_SCALE_LENGTH);
        ctx.save();
        ctx.fillStyle = theme.surface2;
        ctx.strokeStyle = theme.sine;
        ctx.lineWidth = 1.2;
        ctx.fillRect(x(from), y - 10, x(to) - x(from), 16);
        ctx.strokeRect(x(from), y - 10, x(to) - x(from), 16);
        ctx.strokeStyle = theme.axis;
        ctx.lineWidth = 1;
        const every = s >= 3 ? 1 : s >= 0.6 ? 5 : 10;
        for (let cm = from; cm <= to + 1e-9; cm += every) segment(ctx, x(cm), y - 10, x(cm), y - (cm % 10 === 0 ? 2 : 6));
        ctx.restore();
      }
    } else {
      for (let i = 0; i < laid - 1e-9; i++) {
        bracket(ctx, x(i * unitLength), x(Math.min(laid, i + 1) * unitLength), y, i % 2 === 0 ? theme.sine : theme.cosine);
      }
    }

    // The child's unit and the teacher's, drawn to one scale.
    const perCm = isScale ? 0 : Math.min(4, (right - left - 10) / u.teacher);
    const rows: [string, number][] = [
      ["child", 0],
      ["teacher", 1],
    ];
    rows.forEach(([who, m], k) => {
      const y2 = 136 + k * 34;
      const size = measuringUnitSize(unit, m);
      const colour = m === measurer ? theme.text : theme.muted;
      if (isScale) {
        label(ctx, `The ${who}'s scale: 1 cm = 10 mm`, left, y2, { color: colour, font: theme.font });
        return;
      }
      bracket(ctx, left, left + size * perCm, y2 + 6, m === measurer ? theme.angle : theme.reference);
      label(ctx, `The ${who}'s ${u.label}: ${size} cm`, left, y2 - 8, { color: colour, font: theme.font });
    });
  }

  if (layers.has("labels")) {
    const count = num(results.count);
    const done = num(results.done) === 1;
    const big = isScale ? `${measuringFmt(count)} cm = ${measuringFmt(num(results.objectM), 2)} m` : `${measuringFmt(count)} ${count === 1 ? u.label : u.plural}`;
    label(ctx, done ? big : "Laying them down…", layout.width / 2, 228, { color: theme.angle, font: theme.fontStrong, align: "center" });
    const words =
      num(results.agree) === 1
        ? `Everyone gets ${measuringFmt(length)} cm: a standard unit`
        : `Child: ${measuringFmt(num(results.childCount))}, teacher: ${measuringFmt(num(results.teacherCount))} ${u.plural}`;
    caption(ctx, layout, words, theme);
  } else if (!compact) {
    caption(ctx, layout, "Press play to lay the units along it", theme);
  }
}

// ── Ruler ────────────────────────────────────────────────────────────────────

function drawRuler(ctx: CanvasRenderingContext2D, layout: MeasuringLayout, results: Record<string, unknown>, layers: ReadonlySet<string>, theme: LabTheme) {
  const { x0, perCm, top, depth } = layout.ruler;
  const x = (cm: number) => x0 + cm * perCm;
  const start = num(results.startMark);
  const end = num(results.endMark);
  const curved = num(results.shape) === 1;
  const eye = Math.round(num(results.eye));

  if (layers.has("ruler")) {
    ctx.save();
    ctx.fillStyle = theme.surface2;
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1.2;
    ctx.fillRect(x0 - 6, top, x(MEASURING_RULER_LENGTH) - x0 + 12, depth);
    ctx.strokeRect(x0 - 6, top, x(MEASURING_RULER_LENGTH) - x0 + 12, depth);
    ctx.strokeStyle = theme.text;
    const mm = perCm >= 12;
    for (let k = 0; k <= MEASURING_RULER_LENGTH * 10; k++) {
      const whole = k % 10 === 0;
      const half = k % 5 === 0;
      if (!whole && !half && !mm) continue;
      ctx.lineWidth = whole ? 1.2 : 0.7;
      segment(ctx, x(k / 10), top, x(k / 10), top + (whole ? 14 : half ? 10 : 5));
    }
    ctx.restore();
    for (let cm = 0; cm <= MEASURING_RULER_LENGTH; cm++) {
      label(ctx, String(cm), x(cm), top + 25, { color: theme.text, font: theme.font, align: "center" });
    }
    label(ctx, "cm", x(MEASURING_RULER_LENGTH) - 2, top + depth - 6, { color: theme.muted, font: theme.font, align: "right" });

    // The thing measured, lying along the ruler's edge.
    const y = top - 16;
    ctx.save();
    if (curved) {
      ctx.strokeStyle = theme.cosine;
      ctx.lineWidth = 3;
      segment(ctx, x(start), top - 6, x(end), top - 6);
    } else {
      ctx.fillStyle = theme.secant;
      ctx.beginPath();
      ctx.moveTo(x(start), y - 6);
      ctx.lineTo(x(end) - 8, y - 6);
      ctx.lineTo(x(end), y);
      ctx.lineTo(x(end) - 8, y + 6);
      ctx.lineTo(x(start), y + 6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    if (curved) {
      // The curved line itself, above, and the thread taken off it.
      const bend = num(results.bend);
      const cy = 110;
      const k = (2 * Math.PI) / MEASURING_CURVE_GAP;
      ctx.save();
      ctx.strokeStyle = theme.curve;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i <= 80; i++) {
        const cm = (MEASURING_CURVE_GAP * i) / 80;
        const px = x(cm);
        const py = cy - bend * perCm * Math.sin(k * cm);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
      label(ctx, "A curved line: lay a thread along it,", layout.left, 22, { color: theme.muted, font: theme.font });
      label(ctx, "then straighten it on the ruler", layout.left, 38, { color: theme.muted, font: theme.font });
    }
  }

  if (layers.has("eye")) {
    const seenX = x(num(results.seenEnd));
    const eyeX = clamp(x(end) + eye * 45, layout.left + 12, layout.right - 12);
    const eyeY = top - 78;
    ctx.save();
    ctx.strokeStyle = eye === 0 ? theme.tangent : theme.cosine;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 3]);
    segment(ctx, eyeX, eyeY + 7, seenX, top + 2);
    ctx.setLineDash([]);
    ctx.fillStyle = theme.point;
    ctx.strokeStyle = theme.text;
    ctx.beginPath();
    ctx.ellipse(eyeX, eyeY, 11, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = theme.background;
    ctx.beginPath();
    ctx.arc(eyeX + eye * 2, eyeY + 1, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (layers.has("labels")) {
    const reading = num(results.reading);
    const seen = measuringFmt(num(results.seenEnd));
    const sum = `${seen} − ${measuringFmt(start)} = ${measuringFmt(reading)} cm`;
    let words: string;
    if (eye !== 0) words = `Eye to the ${eye < 0 ? "left" : "right"}: ${sum}, 2 mm out`;
    else if (curved) words = `Thread: ${sum}; ends ${MEASURING_CURVE_GAP} cm apart`;
    else words = `Far end − near end: ${sum}`;
    caption(ctx, layout, words, theme);
  }
}

// ── Motion ───────────────────────────────────────────────────────────────────

const KIND_WORDS = [
  "Straight-line motion",
  "Circular motion: round and round a centre",
  "To and fro: periodic motion",
  "Spinning on the spot",
];

function drawMotion(ctx: CanvasRenderingContext2D, layout: MeasuringLayout, results: Record<string, unknown>, layers: ReadonlySet<string>, theme: LabTheme) {
  const mover = MEASURING_MOVER_ORDER[Math.round(num(results.mover))] ?? "train";
  const kind = MEASURING_MOVERS[mover].kind;
  const t = num(results.t);
  const { x: cx, y: cy, r } = layout.stage;
  const path = layers.has("path");
  const dashed = (draw: () => void) => {
    if (!path) return;
    ctx.save();
    ctx.strokeStyle = theme.reference;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 4]);
    draw();
    ctx.restore();
  };
  const dot = (px: number, py: number, size = 9) => {
    ctx.save();
    ctx.fillStyle = theme.angle;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  label(ctx, MEASURING_MOVERS[mover].label, layout.width / 2, 22, { color: theme.text, font: theme.fontStrong, align: "center" });

  if (kind === 0 && mover === "apple") {
    const top = 50;
    const bottom = cy + r + 30;
    const f = (t % 1.5) / 1.5;
    dashed(() => segment(ctx, cx, top, cx, bottom));
    dot(cx, top + (bottom - top) * f * f, 9);
  } else if (kind === 0) {
    const f = (t % 4) / 4;
    const y = cy;
    dashed(() => segment(ctx, layout.left, y, layout.right, y));
    const x = layout.left + 20 + (layout.right - layout.left - 40) * f;
    ctx.save();
    ctx.fillStyle = theme.angle;
    ctx.fillRect(x - 18, y - 12, 36, 20);
    ctx.restore();
  } else if (kind === 1) {
    const a = (2 * Math.PI * t) / 4;
    dashed(() => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });
    const px = cx + r * Math.sin(a);
    const py = cy - r * Math.cos(a);
    ctx.save();
    ctx.strokeStyle = theme.neutral;
    ctx.lineWidth = mover === "clock" ? 3 : 1;
    segment(ctx, cx, cy, px, py);
    ctx.restore();
    dot(cx, cy, 3);
    dot(px, py, 8);
  } else if (kind === 2 && mover === "needle") {
    const y = cy + 30 * Math.sin(2 * Math.PI * t * 1.5);
    dashed(() => segment(ctx, cx, cy - 50, cx, cy + 50));
    ctx.save();
    ctx.strokeStyle = theme.angle;
    ctx.lineWidth = 3;
    segment(ctx, cx, y - 60, cx, y);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = theme.reference;
    segment(ctx, cx - 60, cy + 40, cx + 60, cy + 40);
    ctx.restore();
  } else if (kind === 2) {
    const len = r + 50;
    const top = cy - r + 10 - 40;
    const a = 0.5 * Math.cos((2 * Math.PI * t) / 2);
    dashed(() => {
      ctx.beginPath();
      ctx.arc(cx, top, len, Math.PI / 2 - 0.5, Math.PI / 2 + 0.5);
      ctx.stroke();
    });
    const px = cx + len * Math.sin(a);
    const py = top + len * Math.cos(a);
    ctx.save();
    ctx.strokeStyle = theme.neutral;
    ctx.lineWidth = 1.5;
    segment(ctx, cx, top, px, py);
    if (mover === "swing") segment(ctx, cx - 10, top, px - 10 * Math.cos(a), py + 10 * Math.sin(a));
    ctx.restore();
    if (mover === "swing") {
      ctx.save();
      ctx.fillStyle = theme.angle;
      ctx.fillRect(px - 16, py - 3, 24, 6);
      ctx.restore();
    } else dot(px, py, 10);
  } else {
    const a = 2 * Math.PI * t * 0.5;
    const rr = r * 0.75;
    ctx.save();
    ctx.strokeStyle = theme.angle;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    ctx.stroke();
    for (let k = 0; k < 4; k++) {
      const b = a + (k * Math.PI) / 2;
      segment(ctx, cx, cy, cx + rr * Math.cos(b), cy + rr * Math.sin(b));
    }
    ctx.restore();
    dashed(() => {
      ctx.beginPath();
      ctx.arc(cx, cy, rr + 12, -0.3, 1.2);
      ctx.stroke();
    });
  }

  if (layers.has("labels")) caption(ctx, layout, KIND_WORDS[kind] ?? KIND_WORDS[0]!, theme);
}

// ── Pendulum ─────────────────────────────────────────────────────────────────

function drawPendulum(ctx: CanvasRenderingContext2D, layout: MeasuringLayout, results: Record<string, unknown>, layers: ReadonlySet<string>, theme: LabTheme) {
  const { x: px, y: py, perCm } = layout.pivot;
  const lengthCm = num(results.pendulumLength, 100);
  const len = lengthCm * perCm;
  const angle = num(results.bobAngle);
  const swing = num(results.swing);
  const mass = num(results.bobMass, 50);

  if (layers.has("pendulum")) {
    ctx.save();
    ctx.strokeStyle = theme.reference;
    ctx.lineWidth = 3;
    segment(ctx, px - 40, py, px + 40, py);
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px, py, len, Math.PI / 2 - swing, Math.PI / 2 + swing);
    ctx.stroke();
    segment(ctx, px, py, px, py + len + 14);
    ctx.setLineDash([]);
    const bx = px + len * Math.sin(angle);
    const by = py + len * Math.cos(angle);
    ctx.strokeStyle = theme.neutral;
    ctx.lineWidth = 1.5;
    segment(ctx, px, py, bx, by);
    ctx.fillStyle = theme.angle;
    ctx.beginPath();
    ctx.arc(bx, by, 5 + 7 * Math.sqrt(mass / 200), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    label(ctx, `${Math.round(lengthCm)} cm`, px + 10, py + Math.max(14, len / 2), { color: theme.sine, font: theme.font });
    label(ctx, `${Math.round(mass)} g bob`, px + 40, py + 2, { color: theme.muted, font: theme.font, align: "left" });
  }

  if (layers.has("stopwatch")) {
    const y = layout.height - 70;
    const count = Math.round(num(results.oscillations));
    label(ctx, `Stopwatch: ${num(results.t).toFixed(1)} s`, layout.left, y, { color: theme.text, font: theme.fontStrong });
    label(ctx, `Oscillations: ${count}`, layout.right, y, { color: theme.text, font: theme.fontStrong, align: "right" });
    // Ten dots, one filled for each oscillation counted.
    const gap = Math.min(22, (layout.right - layout.left) / 10);
    const x0 = layout.width / 2 - gap * 4.5;
    ctx.save();
    for (let k = 0; k < 10; k++) {
      ctx.fillStyle = k < count ? theme.tangent : theme.grid;
      ctx.beginPath();
      ctx.arc(x0 + k * gap, y + 22, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  if (layers.has("labels")) {
    caption(ctx, layout, `One oscillation: ${num(results.period).toFixed(2)} s; ten: ${num(results.tenSwings).toFixed(1)} s`, theme);
  }
}

// ── Speed ────────────────────────────────────────────────────────────────────

function drawSpeed(ctx: CanvasRenderingContext2D, layout: MeasuringLayout, results: Record<string, unknown>, layers: ReadonlySet<string>, theme: LabTheme) {
  const { left, right } = layout;
  const d = num(results.distance, 100);
  const trip = num(results.tripTime, 20);
  const a = left + 10;
  const b = right - 10;
  const y = 170;

  if (layers.has("track")) {
    ctx.save();
    ctx.strokeStyle = theme.reference;
    ctx.lineWidth = 4;
    segment(ctx, a, y + 14, b, y + 14);
    ctx.lineWidth = 2;
    ctx.strokeStyle = theme.tangent;
    segment(ctx, a, y - 30, a, y + 14);
    ctx.strokeStyle = theme.cosine;
    segment(ctx, b, y - 30, b, y + 14);
    const cx = a + (b - a) * clamp(num(results.carAt) / Math.max(1, d), 0, 1);
    ctx.fillStyle = theme.angle;
    ctx.fillRect(cx - 16, y - 6, 32, 14);
    ctx.restore();
    label(ctx, "0 m", a, y + 32, { color: theme.text, font: theme.font, align: "left" });
    label(ctx, `${measuringFmt(d)} m`, b, y + 32, { color: theme.text, font: theme.font, align: "right" });
    label(ctx, `${measuringFmt(d)} m in ${measuringFmt(trip)} s`, layout.width / 2, 40, { color: theme.text, font: theme.fontStrong, align: "center" });
  }

  if (layers.has("stopwatch")) {
    label(ctx, `Stopwatch: ${Math.min(num(results.t), trip).toFixed(1)} s`, layout.width / 2, y + 70, { color: theme.text, font: theme.fontStrong, align: "center" });
  }

  if (layers.has("labels")) {
    caption(ctx, layout, `Speed = ${measuringFmt(d)} ÷ ${measuringFmt(trip)} = ${measuringFmt(num(results.speed), 2)} m/s = ${measuringFmt(num(results.speedKmh), 1)} km/h`, theme);
  }
}

export const measuringRenderer: SimulationRenderer<MeasuringLayout> = {
  id: "measuring",
  layout: (width) => computeMeasuringLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    ctx.clearRect(0, 0, layout.width, layout.height);
    const r = results as Record<string, unknown>;
    if (has("object") || has("units")) drawUnits(ctx, layout, r, layers, theme);
    else if (has("ruler") || has("eye")) drawRuler(ctx, layout, r, layers, theme);
    else if (has("movers")) drawMotion(ctx, layout, r, layers, theme);
    else if (has("pendulum")) drawPendulum(ctx, layout, r, layers, theme);
    else if (has("track")) drawSpeed(ctx, layout, r, layers, theme);
  },
};
