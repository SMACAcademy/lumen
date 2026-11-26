/**
 * Data and chance, in six pictures.
 *
 * Tally: the class's answers as a list, crossed off one by one, and a table
 * of tally marks in groups of five beside each answer.
 *
 * Pictograph: one row of pictures for each answer, with a key saying how
 * many students one picture stands for. A part picture is a part of the key.
 *
 * Bars: the same counts as a bar graph, the grid going up in steps of the
 * chosen scale.
 *
 * Chance line: impossible at 0, even chance at ½, certain at 1, and the
 * event as a dot on it.
 *
 * Experiment: the share of heads (or sixes) after each toss, wandering at
 * first and settling on the theory's line, with a bar for each face.
 *
 * Theory: the bag of balls, the deck of 52 or the die, with the favourable
 * outcomes picked out.
 */

import {
  CHANCE_EVENT_ORDER,
  CHANCE_EVENTS,
  CHANCE_EXPERIMENT_ORDER,
  CHANCE_EXPERIMENTS,
  CHANCE_RANKS,
  CHANCE_SUITS,
  CHANCE_SURVEY_ORDER,
  CHANCE_SURVEYS,
  CHANCE_THEORY,
  CHANCE_THEORY_ORDER,
  CHANCE_TRIALS_MAX,
  chanceFaceCounts,
  chanceOutcomes,
} from "@ise/mathematics-engine";
import { label, num, segment } from "../shared/draw";
import { createPlane, drawPlane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface ChanceLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Left and right edges everything stays within. */
  left: number;
  right: number;
}

export function computeChanceLayout(width: number): ChanceLayout {
  const compact = width < 560;
  return { width, height: compact ? 400 : 420, compact, left: 16, right: width - 16 };
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
/** "4/52 = 1/13", or just "1/6" when it is already in lowest terms. */
export function chanceFraction(f: number, p: number): string {
  if (p <= 0) return "0";
  if (f === 0) return `0/${p} = 0`;
  if (f === p) return `${p}/${p} = 1`;
  const g = gcd(f, p);
  return g > 1 ? `${f}/${p} = ${f / g}/${p / g}` : `${f}/${p}`;
}
const decimal = (v: number) => {
  const text = v.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  return Number(text) === v ? `= ${text}` : `≈ ${v.toFixed(2)}`;
};

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, colour: string, width = 1.5, dash?: number[]) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  if (dash) ctx.setLineDash(dash);
  segment(ctx, x1, y1, x2, y2);
  ctx.restore();
}

/** Tally marks: four upright strokes and a fifth across them, then the strokes left over. */
function tally(ctx: CanvasRenderingContext2D, x: number, y: number, count: number, colour: string): number {
  const gap = 5;
  const tall = 16;
  let cx = x;
  for (let done = 0; done < count; done += 5) {
    const strokes = Math.min(4, count - done);
    for (let i = 0; i < strokes; i++) line(ctx, cx + i * gap, y - tall / 2, cx + i * gap, y + tall / 2, colour, 1.8);
    if (count - done >= 5) line(ctx, cx - 3, y + tall / 2 - 2, cx + 3 * gap + 3, y - tall / 2 + 2, colour, 1.8);
    cx += 4 * gap + 10;
  }
  return cx;
}

/** A person: a round head and shoulders. `part` (0–1) draws only the left part, for a part of the key. */
function person(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, colour: string, part = 1) {
  ctx.save();
  if (part < 1) {
    ctx.beginPath();
    ctx.rect(x - size / 2, y - size, size * part, size * 2);
    ctx.clip();
  }
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(x, y - size * 0.28, size * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x, y + size * 0.42, size * 0.42, size * 0.4, 0, Math.PI, 0);
  ctx.fill();
  ctx.restore();
}

const BALL: Record<"red" | "blue" | "green", keyof LabTheme> = { red: "cosine", blue: "sine", green: "tangent" };

/** Pips of a die face, on a 3 × 3 grid of positions. */
const PIPS: Record<number, readonly (readonly [number, number])[]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};

export const chanceRenderer: SimulationRenderer<ChanceLayout> = {
  id: "chance",
  layout: (width) => computeChanceLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height, left, right } = layout;
    ctx.clearRect(0, 0, width, height);
    const caption = (words: string) => label(ctx, words, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
    const title = (words: string) => label(ctx, words, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });

    const surveyId = CHANCE_SURVEY_ORDER[Math.round(num(results.survey))] ?? "fruits";
    const survey = CHANCE_SURVEYS[surveyId];
    const counts = [results.c1, results.c2, results.c3, results.c4, results.c5].map((c) => num(c));
    const row = Math.round(num(results.row, 1)) - 1;
    const rowName = survey.categories[row] ?? "";
    const rowCount = num(results.rowCount);
    const key = Math.max(1, Math.round(num(results.key, 1)));

    if (has("tally")) {
      title(survey.label);
      const total = survey.order.length;
      const counted = Math.round(num(results.counted));
      // The answers as they came in, crossed off once counted.
      const cols = total > 40 ? 15 : 10;
      const cell = (right - left) / cols;
      const top = 34;
      survey.order.forEach((answer, i) => {
        const cx = left + cell * (i % cols) + cell / 2;
        const cy = top + 17 * Math.floor(i / cols) + 8;
        const done = i < counted;
        if (i === counted) {
          ctx.save();
          ctx.strokeStyle = theme.angle;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(cx - cell / 2 + 1, cy - 8, cell - 2, 16);
          ctx.restore();
        }
        label(ctx, survey.short[answer]!, cx, cy, { color: done ? theme.muted : theme.text, font: theme.font, align: "center" });
        if (done) line(ctx, cx - 7, cy + 4, cx + 7, cy - 4, theme.muted, 1);
      });
      const tableTop = top + 17 * Math.ceil(total / cols) + 18;
      label(ctx, "Answer", left, tableTop, { color: theme.muted, font: theme.font });
      label(ctx, "Tally marks", left + 72, tableTop, { color: theme.muted, font: theme.font });
      label(ctx, "Number", right, tableTop, { color: theme.muted, font: theme.font, align: "right" });
      const rowHeight = Math.min(34, (height - 44 - tableTop - 14) / 5);
      survey.categories.forEach((name, i) => {
        const cy = tableTop + 14 + rowHeight * i + rowHeight / 2;
        if (i === row) {
          ctx.save();
          ctx.fillStyle = theme.angle;
          ctx.globalAlpha = 0.14;
          ctx.fillRect(left - 4, cy - rowHeight / 2 + 1, right - left + 8, rowHeight - 2);
          ctx.restore();
        }
        label(ctx, name, left, cy, { color: i === row ? theme.angle : theme.text, font: theme.font });
        tally(ctx, left + 76, cy, counts[i]!, i === row ? theme.angle : theme.sine);
        if (has("labels")) label(ctx, String(counts[i]), right, cy, { color: theme.text, font: theme.fontStrong, align: "right" });
      });
      if (has("labels")) {
        const fives = Array.from({ length: Math.floor(rowCount / 5) }, () => "5");
        if (rowCount % 5) fives.push(String(rowCount % 5));
        const sum = fives.length > 1 ? `${fives.join(" + ")} = ${rowCount}` : String(rowCount);
        caption(`${rowName}: ${sum} · ${counted} of ${total} counted`);
      }
    }

    if (has("pictograph")) {
      title(survey.label);
      const most = Math.max(1, ...counts);
      const nameWidth = 64;
      const x0 = left + nameWidth + 8;
      const spacing = Math.min(26, (right - x0) / Math.ceil(most / key));
      const size = Math.min(20, spacing * 0.9);
      const rowHeight = 48;
      survey.categories.forEach((name, i) => {
        const cy = 56 + rowHeight * i;
        if (i === row) {
          ctx.save();
          ctx.fillStyle = theme.angle;
          ctx.globalAlpha = 0.14;
          ctx.fillRect(left - 4, cy - rowHeight / 2 + 2, right - left + 8, rowHeight - 4);
          ctx.restore();
        }
        label(ctx, name, left, cy, { color: i === row ? theme.angle : theme.text, font: theme.font });
        const pictures = counts[i]! / key;
        for (let k = 0; k < Math.ceil(pictures - 1e-9); k++) {
          person(ctx, x0 + spacing * k + spacing / 2, cy, size, i === row ? theme.angle : theme.sine, Math.min(1, pictures - k));
        }
      });
      const keyY = 56 + rowHeight * 5 + 4;
      person(ctx, left + 10, keyY, 18, theme.sine);
      label(ctx, `Key: 1 picture = ${key} ${key === 1 ? "student" : "students"}`, left + 26, keyY, { color: theme.text, font: theme.fontStrong });
      if (has("labels")) {
        const pictures = num(results.rowPictures);
        const shown = Number.isInteger(pictures) ? String(pictures) : pictures.toFixed(2).replace(/0$/, "");
        const whole = num(results.allWhole) === 1 ? "every row whole" : "some part pictures";
        caption(`${rowName}: ${shown} × ${key} = ${rowCount} · ${whole}`);
      }
    }

    if (has("bars")) {
      title(survey.label);
      const scaleTop = Math.max(key, num(results.scaleTop, key));
      const plot = { x: left + 30, y: 44, width: right - left - 34, height: height - 44 - 96 };
      const per = plot.height / scaleTop;
      const bottom = plot.y + plot.height;
      // Grid lines every step of the scale; labels only as often as they fit.
      const labelEvery = Math.max(1, Math.ceil(16 / (key * per)));
      for (let s = 0, n = 0; s <= scaleTop + 1e-9; s += key, n++) {
        const y = bottom - s * per;
        line(ctx, plot.x, y, plot.x + plot.width, y, theme.grid, 1);
        if (n % labelEvery === 0) label(ctx, String(s), plot.x - 6, y, { color: theme.muted, font: theme.font, align: "right" });
      }
      line(ctx, plot.x, plot.y - 6, plot.x, bottom, theme.axis, 1.25);
      line(ctx, plot.x, bottom, plot.x + plot.width, bottom, theme.axis, 1.25);
      label(ctx, survey.unit, plot.x + 4, plot.y - 14, { color: theme.muted, font: theme.font });
      const slot = plot.width / 5;
      const barWidth = Math.min(40, slot * 0.6);
      survey.categories.forEach((name, i) => {
        const cx = plot.x + slot * i + slot / 2;
        const h = counts[i]! * per;
        ctx.save();
        ctx.fillStyle = i === row ? theme.angle : theme.sine;
        ctx.globalAlpha = 0.8;
        ctx.fillRect(cx - barWidth / 2, bottom - h, barWidth, h);
        ctx.restore();
        label(ctx, name, cx, bottom + 12, { color: i === row ? theme.angle : theme.text, font: theme.font, align: "center" });
        if (has("labels") && counts[i]! > 0) label(ctx, String(counts[i]), cx, bottom - h - 9, { color: theme.text, font: theme.fontStrong, align: "center" });
      });
      label(ctx, `Scale: 1 step = ${key} ${key === 1 ? "student" : "students"}`, width / 2, bottom + 34, { color: theme.text, font: theme.fontStrong, align: "center" });
      if (has("labels")) {
        const most = counts.indexOf(num(results.mostCount));
        const least = counts.indexOf(num(results.leastCount));
        caption(`${rowName} ${rowCount} · most: ${survey.categories[most] ?? ""} · least: ${survey.categories[least] ?? ""}`);
      }
    }

    if (has("line")) {
      const id = CHANCE_EVENT_ORDER[Math.round(num(results.event))] ?? "head";
      const event = CHANCE_EVENTS[id];
      title(event.label);
      const x0 = left + 12;
      const x1 = right - 12;
      const y = height / 2;
      const at = (p: number) => x0 + (x1 - x0) * p;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineWidth = 6;
      ctx.strokeStyle = theme.secant;
      segment(ctx, x0, y, at(0.5), y);
      ctx.strokeStyle = theme.tangent;
      segment(ctx, at(0.5), y, x1, y);
      ctx.restore();
      for (const [p, text] of [[0, "0"], [0.5, "½"], [1, "1"]] as const) {
        line(ctx, at(p), y - 10, at(p), y + 10, theme.axis, 1.5);
        label(ctx, text, at(p), y + 20, { color: theme.muted, font: theme.font, align: "center" });
      }
      label(ctx, "impossible", left, y + 40, { color: theme.text, font: theme.fontStrong });
      label(ctx, "even chance", width / 2, y + 40, { color: theme.text, font: theme.fontStrong, align: "center" });
      label(ctx, "certain", right, y + 40, { color: theme.text, font: theme.fontStrong, align: "right" });
      label(ctx, "unlikely", at(0.25), y - 24, { color: theme.secant, font: theme.font, align: "center" });
      label(ctx, "likely", at(0.75), y - 24, { color: theme.tangent, font: theme.font, align: "center" });
      const chance = num(results.eventChance);
      disc(ctx, at(chance), y, 9, theme.angle);
      disc(ctx, at(chance), y, 4, theme.background);
      if (has("labels")) {
        const words = ["impossible", "unlikely", "even chance", "likely", "certain"][Math.round(num(results.likelihood))] ?? "";
        caption(`${chanceFraction(event.favourable, event.possible)}: ${words}`);
      }
    }

    if (has("experiment")) {
      const id = CHANCE_EXPERIMENT_ORDER[Math.round(num(results.experiment))] ?? "coin";
      const experiment = CHANCE_EXPERIMENTS[id];
      const trials = Math.round(num(results.trials));
      const theory = num(results.theoretical, 0.5);
      title(experiment.label);
      const plot = { x: left + 30, y: 46, width: right - left - 40, height: 160 };
      const plane = createPlane(plot, [0, CHANCE_TRIALS_MAX], [0, 1]);
      drawPlane(ctx, plane, theme);
      label(ctx, `share of ${experiment.hitName}, against trials`, left, plot.y - 14, { color: theme.muted, font: theme.font });
      // The theory's line.
      const [, ty] = plane.toPx(0, theory);
      line(ctx, plot.x, ty, plot.x + plot.width, ty, theme.angle, 1.5, [5, 4]);
      label(ctx, "theory", plot.x + plot.width - 2, ty - 9, { color: theme.angle, font: theme.font, align: "right" });
      // The share after every trial so far.
      if (trials > 0) {
        const outcomes = chanceOutcomes(id);
        ctx.save();
        ctx.strokeStyle = theme.curve;
        ctx.lineWidth = 2;
        ctx.beginPath();
        let hits = 0;
        for (let t = 1; t <= trials; t++) {
          if (outcomes[t - 1] === experiment.hit) hits++;
          const [px, py] = plane.toPx(t, hits / t);
          if (t === 1) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
        const [px, py] = plane.toPx(trials, num(results.experimental));
        disc(ctx, px, py, 4.5, theme.curve);
      }
      // A bar for each face.
      const faces = chanceFaceCounts(id, trials);
      const most = Math.max(1, ...faces);
      const barsTop = plot.y + plot.height + 34;
      const barsBottom = height - 52;
      const slot = (right - left) / faces.length;
      const barWidth = Math.min(36, slot * 0.6);
      faces.forEach((count, i) => {
        const cx = left + slot * i + slot / 2;
        const h = ((barsBottom - barsTop) * count) / most;
        ctx.save();
        ctx.fillStyle = i === experiment.hit ? theme.curve : theme.neutral;
        ctx.globalAlpha = i === experiment.hit ? 0.85 : 0.45;
        ctx.fillRect(cx - barWidth / 2, barsBottom - h, barWidth, h);
        ctx.restore();
        label(ctx, experiment.faces[i]!, cx, barsBottom + 12, { color: i === experiment.hit ? theme.curve : theme.text, font: theme.fontStrong, align: "center" });
        if (has("labels") && trials > 0) label(ctx, String(count), cx, barsBottom - h - 9, { color: theme.text, font: theme.font, align: "center" });
      });
      if (has("labels")) {
        const theoryText = id === "coin" ? "1/2 = 0.5" : "1/6 ≈ 0.167";
        caption(
          trials > 0
            ? `${num(results.hits)} ${experiment.hitName} in ${trials} = ${num(results.experimental).toFixed(3)} · theory ${theoryText}`
            : `No trials yet · theory ${theoryText}`,
        );
      }
    }

    if (has("theory")) {
      const id = CHANCE_THEORY_ORDER[Math.round(num(results.theory))] ?? "bag-red";
      const event = CHANCE_THEORY[id];
      const favourable = Math.round(num(results.favourable));
      const possible = Math.round(num(results.possible));
      title(event.label);
      if (event.source === "bag") {
        const bag = { red: Math.round(num(results.red)), blue: Math.round(num(results.blue)), green: Math.round(num(results.green)) };
        const w = Math.min(240, right - left - 40);
        const bx = width / 2 - w / 2;
        const by = 60;
        const bh = 170;
        ctx.save();
        ctx.strokeStyle = theme.neutral;
        ctx.lineWidth = 2;
        ctx.fillStyle = theme.surface2;
        ctx.beginPath();
        ctx.roundRect(bx, by, w, bh, 22);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        line(ctx, bx + w * 0.3, by - 10, bx + w * 0.7, by - 10, theme.neutral, 3);
        const balls = (["red", "blue", "green"] as const).flatMap((colour) => Array.from({ length: bag[colour] }, () => colour));
        const cols = 6;
        const step = Math.min(30, (w - 20) / cols);
        const r = step * 0.38;
        balls.forEach((colour, i) => {
          const cx = bx + 10 + step * (i % cols) + step / 2 + (w - 20 - step * cols) / 2;
          const cy = by + 18 + step * Math.floor(i / cols) + step / 2;
          disc(ctx, cx, cy, r, theme[BALL[colour]] as string);
          if (colour === event.colour) {
            ctx.save();
            ctx.strokeStyle = theme.text;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, r + 2.5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        });
        label(ctx, `${bag.red} red · ${bag.blue} blue · ${bag.green} green`, width / 2, by + bh + 22, { color: theme.text, font: theme.fontStrong, align: "center" });
      } else if (event.source === "cards") {
        const head = 22;
        const cell = (right - left - head) / 13;
        const top = 64;
        const rowH = 30;
        CHANCE_RANKS.forEach((rank, k) => label(ctx, rank, left + head + cell * k + cell / 2, top - 12, { color: theme.muted, font: theme.font, align: "center" }));
        CHANCE_SUITS.forEach((suit, s) => {
          const cy = top + rowH * s + rowH / 2;
          label(ctx, suit, left + head / 2, cy, { color: s === 1 || s === 2 ? theme.cosine : theme.text, font: theme.fontStrong, align: "center" });
          for (let k = 0; k < 13; k++) {
            const x = left + head + cell * k + 1.5;
            const fits = event.fits?.(s * 13 + k) ?? false;
            ctx.save();
            ctx.fillStyle = fits ? theme.angle : theme.surface2;
            ctx.globalAlpha = fits ? 0.9 : 1;
            ctx.fillRect(x, cy - rowH / 2 + 2, cell - 3, rowH - 4);
            ctx.strokeStyle = theme.grid;
            ctx.strokeRect(x, cy - rowH / 2 + 2, cell - 3, rowH - 4);
            ctx.restore();
          }
        });
        label(ctx, "52 cards: 4 suits of 13", width / 2, top + rowH * 4 + 22, { color: theme.text, font: theme.fontStrong, align: "center" });
      } else {
        const size = Math.min(44, (right - left) / 6 - 10);
        const gap = (right - left - 6 * size) / 6;
        const cy = 120;
        for (let k = 0; k < 6; k++) {
          const x = left + gap / 2 + (size + gap) * k;
          const fits = event.fits?.(k) ?? false;
          ctx.save();
          ctx.fillStyle = fits ? theme.angle : theme.surface2;
          ctx.strokeStyle = theme.neutral;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(x, cy - size / 2, size, size, 6);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
          for (const [px, py] of PIPS[k + 1]!) disc(ctx, x + size * (0.22 + 0.28 * px), cy - size / 2 + size * (0.22 + 0.28 * py), size * 0.08, fits ? theme.background : theme.text);
          label(ctx, String(k + 1), x + size / 2, cy + size / 2 + 14, { color: theme.muted, font: theme.font, align: "center" });
        }
        label(ctx, "6 faces, each as likely as the others", width / 2, cy + size / 2 + 44, { color: theme.text, font: theme.fontStrong, align: "center" });
      }
      if (has("labels")) {
        if (possible === 0) caption("The bag is empty: nothing to draw");
        else {
          const p = num(results.pEvent);
          caption(`P(E) = ${chanceFraction(favourable, possible)} ${decimal(p)} · P(not E) = ${possible - favourable}/${possible}`);
        }
      }
    }
  },
};
