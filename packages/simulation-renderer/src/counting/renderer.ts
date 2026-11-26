/**
 * Counting and the binomial theorem, in six pictures.
 *
 * Tree: a root, then a branch for each shirt, each pair of trousers and each
 * pair of shoes; the leaves are the outfits.
 *
 * Slots: the pool of letters, and r slots with the number of choices left
 * for each written underneath. With the teams layer, one team and all the
 * orders of it, which the arrangements count separately.
 *
 * Seats: people in a row (A and B glued, or dropped into gaps), round a
 * table, as beads on a necklace, or the letters of a word coloured by
 * letter.
 *
 * Stars: identical sweets and the bars that split them among children.
 *
 * Triangle: Pascal's triangle down to row n, the chosen entry ringed and its
 * two parents marked. The last row is hidden unless the words are on.
 *
 * Expansion: the terms T₁ … Tₙ₊₁ of (px + q)ⁿ, the chosen one written out by
 * the general term, and the middle term(s).
 */

import {
  COUNTING_FORM_ORDER,
  COUNTING_RULE_ORDER,
  COUNTING_WORD_ORDER,
  COUNTING_WORDS,
  countingCombinations,
  countingExpansion,
  countingLetterTally,
  countingPascalRow,
} from "@ise/mathematics-engine";
import { label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface CountingLayout {
  width: number;
  height: number;
  compact: boolean;
}

export function computeCountingLayout(width: number): CountingLayout {
  const compact = width < 560;
  return { width, height: compact ? 380 : 400, compact };
}

const LETTERS = "ABCDEFGHIJ";
const SUPER = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const SUB = "₀₁₂₃₄₅₆₇₈₉";

/** Superscript digits, with a raised minus. */
export const countingSup = (v: number) => `${v < 0 ? "⁻" : ""}${[...String(Math.abs(v))].map((d) => SUPER[Number(d)]).join("")}`;
const sub = (v: number) => [...String(Math.abs(v))].map((d) => SUB[Number(d)]).join("");

/** A whole number with Indian grouping (34,650; 10,00,00,00,000) and a true minus sign. */
export function countingFormat(v: number): string {
  const digits = String(Math.abs(Math.round(v)));
  const last = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+$)/g, ",")},${last}` : last;
  return `${v < 0 && Math.round(v) !== 0 ? "−" : ""}${grouped}`;
}

const fmt = countingFormat;
const sup = countingSup;

/** p·x as written: x, −x, 2x. */
const xPart = (p: number) => `${p === 1 ? "" : p === -1 ? "−" : fmt(p)}x`;

/** The binomial being expanded, e.g. (2x + 3)⁵ or (x − 2/x)⁶. */
export function countingBinomial(power: number, p: number, q: number, reciprocal: boolean): string {
  const second = `${fmt(Math.abs(q))}${reciprocal ? "/x" : ""}`;
  return `(${xPart(p)} ${q < 0 ? "−" : "+"} ${second})${sup(power)}`;
}

/** c·xᵏ as written: 1080x², −x, 160. */
export function countingMonomial(c: number, k: number): string {
  if (c === 0) return "0";
  if (k === 0) return fmt(c);
  const lead = c === 1 ? "" : c === -1 ? "−" : fmt(c);
  return `${lead}x${k === 1 ? "" : sup(k)}`;
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string, lineWidth = 2, dash?: number[]) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, colour: string, lineWidth = 1.5, dash?: number[]) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, colour: string, fill?: string, dash?: number[]) {
  ctx.save();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.5;
  if (dash) ctx.setLineDash(dash);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

const centre = (theme: LabTheme, strong = false) => ({ color: theme.text, font: strong ? theme.fontStrong : theme.font, align: "center" as const });

function drawTree(ctx: CanvasRenderingContext2D, layout: CountingLayout, results: Record<string, unknown>, theme: LabTheme) {
  const { width } = layout;
  const counts = [num(results.shirts, 1), num(results.trousers, 1), num(results.shoes, 1)];
  const rows = [52, 124, 200, 284];
  const left = 16;
  const right = width - 16;
  const at = (count: number, i: number) => left + ((i + 0.5) * (right - left)) / count;
  const colours = [theme.sine, theme.cosine, theme.tangent];
  const names = [`${counts[0]} shirt${counts[0] === 1 ? "" : "s"}`, `${counts[1]} pair${counts[1] === 1 ? "" : "s"} of trousers for each`, `${counts[2]} pair${counts[2] === 1 ? "" : "s"} of shoes for each`];

  let above = 1;
  for (let level = 0; level < 3; level++) {
    const below = above * counts[level]!;
    const y = rows[level + 1]!;
    for (let i = 0; i < below; i++) line(ctx, at(above, Math.floor(i / counts[level]!)), rows[level]!, at(below, i), y, theme.axis, 1);
    const radius = Math.max(1.6, Math.min(7 - level * 1.5, (right - left) / below / 2.6));
    for (let i = 0; i < below; i++) disc(ctx, at(below, i), y, radius, colours[level]!);
    label(ctx, names[level]!, left, y - 18, { color: colours[level]!, font: theme.font });
    above = below;
  }
  disc(ctx, width / 2, rows[0]!, 6, theme.text);
  label(ctx, "start", width / 2 + 10, rows[0]!, { color: theme.muted, font: theme.font });
}

function drawSlots(ctx: CanvasRenderingContext2D, layout: CountingLayout, results: Record<string, unknown>, theme: LabTheme, words: boolean, teams: boolean) {
  const { width } = layout;
  const n = num(results.n, 1);
  const r = num(results.r, 1);
  const repeat = num(results.repeat) === 1;

  // The pool of letters.
  const tile = Math.min(26, (width - 32) / n - 4);
  const poolLeft = width / 2 - (n * (tile + 4) - 4) / 2;
  for (let i = 0; i < n; i++) {
    const x = poolLeft + i * (tile + 4);
    box(ctx, x, 36, tile, tile, theme.sine, theme.sine);
    label(ctx, LETTERS[i]!, x + tile / 2, 36 + tile / 2, centre(theme, true));
  }

  // The slots, an example filling, and the choices each slot had.
  const slot = Math.min(34, (width - 32) / r - 6);
  const slotLeft = width / 2 - (r * (slot + 6) - 6) / 2;
  const sy = 96;
  const factors: number[] = [];
  for (let i = 0; i < r; i++) {
    const x = slotLeft + i * (slot + 6);
    const choices = repeat ? n : n - i;
    factors.push(choices);
    const letter = repeat ? LETTERS[i === 1 ? 0 : i % n]! : LETTERS[i]!;
    box(ctx, x, sy, slot, slot, theme.axis);
    label(ctx, letter, x + slot / 2, sy + slot / 2, centre(theme, true));
    label(ctx, String(choices), x + slot / 2, sy + slot + 13, { color: theme.angle, font: theme.font, align: "center" });
  }
  const product = r <= 6 ? factors.join(" × ") : repeat ? `${n} × ${n} × … × ${n}  (${r} times)` : `${n} × ${n - 1} × … × ${n - r + 1}`;
  label(ctx, `choices: ${product}`, width / 2, sy + slot + 34, { color: theme.angle, font: theme.font, align: "center" });

  const arrangements = num(results.arrangements);
  if (!teams) {
    if (words) {
      const rule = repeat ? `${n}${sup(r)}` : `${sup(n)}P${sub(r)} = ${n}! ÷ ${n - r}!`;
      label(ctx, `${rule} = ${fmt(arrangements)} arrangements`, width / 2, layout.height - 14, centre(theme));
    }
    return;
  }

  // One team, and the r! orders of it that the arrangements count separately.
  const team = [...LETTERS.slice(0, r)];
  const orderings = num(results.orderings, 1);
  const ty = sy + slot + 66;
  const named = r <= 4 ? team.join(", ") : `A, B, …, ${team[r - 1]}`;
  label(ctx, `One team {${named}}: ${r}! = ${fmt(orderings)} orders`, width / 2, ty, centre(theme));
  const shown = firstOrders(team, r <= 3 ? 6 : r === 4 ? 5 : 2);
  label(ctx, shown.join("  ") + (shown.length < orderings ? "  …" : ""), width / 2, ty + 22, { color: theme.cosine, font: theme.fontStrong, align: "center" });
  box(ctx, 16, ty + 8, width - 32, 28, theme.cosine, undefined, [4, 4]);
  label(ctx, "all one team: order does not matter", width / 2, ty + 52, { color: theme.muted, font: theme.font, align: "center" });
  if (words) {
    const selections = num(results.selections);
    label(ctx, `${sup(n)}C${sub(r)} = ${fmt(arrangements)} ÷ ${r}! = ${fmt(selections)} team${selections === 1 ? "" : "s"}`, width / 2, layout.height - 14, centre(theme));
  }
}

/** The first `limit` orders of the letters, in dictionary order, without listing them all. */
function firstOrders(letters: readonly string[], limit: number): string[] {
  const out: string[] = [];
  const walk = (prefix: string, rest: readonly string[]) => {
    if (out.length >= limit) return;
    if (rest.length === 0) return void out.push(prefix);
    rest.forEach((l, i) => walk(prefix + l, [...rest.slice(0, i), ...rest.slice(i + 1)]));
  };
  walk("", letters);
  return out;
}

function person(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, name: string, special: boolean, theme: LabTheme) {
  disc(ctx, x, y, r, special ? theme.angle : theme.neutral, special ? 0.9 : 0.45);
  label(ctx, name, x, y, centre(theme, true));
}

function drawSeats(ctx: CanvasRenderingContext2D, layout: CountingLayout, results: Record<string, unknown>, theme: LabTheme, words: boolean) {
  const { width, height } = layout;
  const rule = COUNTING_RULE_ORDER[Math.round(num(results.rule))] ?? "line";
  const people = num(results.people, 3);
  const count = num(results.restricted);
  const title = (t: string) => label(ctx, t, width / 2, 14, centre(theme, true));
  const caption = (t: string) => words && label(ctx, t, width / 2, height - 14, centre(theme));
  const names = LETTERS.slice(0, people);
  const special = (name: string) => name === "A" || name === "B";
  const y = 150;

  if (rule === "word") {
    const word = COUNTING_WORDS[COUNTING_WORD_ORDER[Math.round(num(results.word))] ?? "banana"];
    title(`Arrange the letters of ${word}`);
    const tally = countingLetterTally(word);
    const palette = [theme.sine, theme.cosine, theme.tangent, theme.angle, theme.curve, theme.secant];
    const colourOf = (letter: string) => palette[tally.findIndex(([l]) => l === letter) % palette.length]!;
    const size = Math.min(30, (width - 32) / word.length - 4);
    const left = width / 2 - (word.length * (size + 4) - 4) / 2;
    [...word].forEach((letter, i) => {
      const x = left + i * (size + 4);
      box(ctx, x, y - size / 2, size, size, colourOf(letter), colourOf(letter));
      label(ctx, letter, x + size / 2, y, centre(theme, true));
    });
    const tallyText = tally.map(([l, k]) => `${l} × ${k}`).join(" · ");
    label(ctx, tallyText, width / 2, y + 44, centre(theme));
    label(ctx, "swapping two alike letters changes nothing", width / 2, y + 70, { color: theme.muted, font: theme.font, align: "center" });
    const repeats = tally.filter(([, k]) => k > 1).map(([, k]) => `${k}!`);
    caption(`${word.length}! ÷ (${repeats.join(" ")}) = ${fmt(count)} ways`);
    return;
  }

  if (rule === "circle" || rule === "necklace") {
    const necklace = rule === "necklace";
    title(necklace ? `A necklace of ${people} different beads` : `${people} people round a table`);
    const cx = width / 2;
    const cy = 168;
    const R = Math.min(96, (width - 90) / 2);
    ring(ctx, cx, cy, R, necklace ? theme.muted : theme.axis, necklace ? 1.5 : 10);
    for (let i = 0; i < people; i++) {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / people;
      person(ctx, cx + R * Math.cos(a), cy + R * Math.sin(a), necklace ? 11 : 14, names[i]!, i === 0, theme);
    }
    const note = necklace ? "turning it round or over: the same necklace" : "turning the table round: the same seating";
    label(ctx, note, width / 2, cy + R + 32, { color: theme.muted, font: theme.font, align: "center" });
    caption(necklace ? `(${people} − 1)! ÷ 2 = ${fmt(count)} ways` : `(${people} − 1)! = ${fmt(count)} ways`);
    return;
  }

  const r = Math.min(15, (width - 32) / (2 * people + 2));
  if (rule === "apart") {
    title(`${people} in a row, A and B never together`);
    // The others first, then A and B dropped into two of the gaps between and beside them.
    const others = names.slice(2);
    const gaps = others.length + 1;
    const step = (width - 32) / (others.length + gaps);
    const r = Math.min(15, step / 2 - 2);
    for (let g = 0; g < gaps; g++) {
      const x = 16 + step * (2 * g + 0.5);
      box(ctx, x - r, y - r, 2 * r, 2 * r, theme.angle, undefined, [3, 3]);
      if (g === 0) person(ctx, x, y, r - 2, "A", true, theme);
      if (g === 2) person(ctx, x, y, r - 2, "B", true, theme);
    }
    [...others].forEach((name, i) => person(ctx, 16 + step * (2 * i + 1.5), y, r, name, false, theme));
    label(ctx, `${others.length}! orders of the others, ${gaps} gaps for A and B`, width / 2, y + 48, centre(theme));
    caption(`${people}! − 2 × ${people - 1}! = ${fmt(count)} ways`);
    return;
  }

  const together = rule === "together";
  title(together ? `${people} in a row, A and B always together` : `${people} people in a row`);
  const step = (width - 32) / people;
  [...names].forEach((name, i) => person(ctx, 16 + step * (i + 0.5), y, r, name, together && special(name), theme));
  if (together) {
    box(ctx, 16 + step * 0.5 - r - 4, y - r - 4, step + 2 * r + 8, 2 * r + 8, theme.angle);
    label(ctx, "glued: 1 block, 2 orders (AB or BA)", width / 2, y + 48, centre(theme));
    label(ctx, `then ${people - 1} blocks to arrange in a row`, width / 2, y + 70, { color: theme.muted, font: theme.font, align: "center" });
    caption(`2 × ${people - 1}! = ${fmt(count)} ways`);
  } else {
    label(ctx, `${people} choices for the first seat, ${people - 1} for the next …`, width / 2, y + 48, centre(theme));
    caption(`${people}! = ${fmt(count)} ways`);
  }
}

function drawStars(ctx: CanvasRenderingContext2D, layout: CountingLayout, results: Record<string, unknown>, theme: LabTheme, words: boolean) {
  const { width, height } = layout;
  const objects = num(results.objects, 1);
  const groups = num(results.groups, 1);
  const allowed = num(results.emptyAllowed) === 1;
  const count = num(results.distributions);
  label(ctx, `${objects} sweets, ${groups} children${allowed ? "" : ", at least one each"}`, width / 2, 14, centre(theme, true));

  // One way to share them: as evenly as possible.
  if (!allowed && objects < groups) {
    label(ctx, "Not enough sweets for one each", width / 2, 150, centre(theme));
    if (words) label(ctx, "0 ways", width / 2, height - 14, centre(theme));
    return;
  }
  const shares = Array.from({ length: groups }, (_, g) => Math.floor(objects / groups) + (g < objects % groups ? 1 : 0));
  const symbols = objects + groups - 1;
  const step = Math.min(24, (width - 32) / symbols);
  const left = width / 2 - (symbols * step) / 2;
  const y = 130;
  let k = 0;
  shares.forEach((share, g) => {
    const start = left + k * step;
    for (let s = 0; s < share; s++) disc(ctx, left + (k++ + 0.5) * step, y, Math.min(8, step / 2.4), theme.secant);
    const middle = share > 0 ? (start + left + k * step) / 2 : start;
    label(ctx, String(share), middle, y + 30, { color: theme.secant, font: theme.font, align: "center" });
    if (g < groups - 1) {
      const bx = left + (k++ + 0.5) * step;
      line(ctx, bx, y - 18, bx, y + 14, theme.sine, 3);
    }
  });
  label(ctx, "a bar between one child's share and the next", width / 2, y + 62, { color: theme.sine, font: theme.font, align: "center" });
  const how = allowed
    ? `${objects} sweets + ${groups - 1} bars = ${objects + groups - 1} places`
    : `${objects - 1} gaps between sweets; pick ${groups - 1} for bars`;
  label(ctx, how, width / 2, y + 90, centre(theme));
  if (words) {
    label(ctx, allowed ? `C(${objects + groups - 1}, ${groups - 1}) = ${fmt(count)} ways` : `C(${objects - 1}, ${groups - 1}) = ${fmt(count)} ways`, width / 2, height - 14, centre(theme));
  }
}

function drawTriangle(ctx: CanvasRenderingContext2D, layout: CountingLayout, results: Record<string, unknown>, theme: LabTheme, words: boolean) {
  const { width, height } = layout;
  const power = num(results.power);
  const term = num(results.term);
  label(ctx, `Pascal's triangle down to row ${power}`, width / 2, 14, centre(theme, true));
  const top = 44;
  const dy = Math.min(28, (height - 60 - top) / Math.max(1, power));
  const dx = Math.min(36, (width - 24) / (power + 1));
  const at = (row: number, k: number): [number, number] => [width / 2 + (k - row / 2) * dx, top + row * dy];

  // The chosen entry and the two above it.
  const [hx, hy] = at(power, term);
  if (power > 0) {
    for (const k of [term - 1, term]) {
      if (k < 0 || k > power - 1) continue;
      const [px, py] = at(power - 1, k);
      line(ctx, px, py + 7, hx, hy - 7, theme.tangent, 1.5);
      ring(ctx, px, py, 11, theme.tangent);
    }
  }
  ring(ctx, hx, hy, 12, theme.angle, 2.5);

  for (let row = 0; row <= power; row++) {
    const values = countingPascalRow(row);
    values.forEach((v, k) => {
      const [x, y] = at(row, k);
      if (row === power && !words) {
        if (k === term) label(ctx, "?", x, y, { color: theme.angle, font: theme.fontStrong, align: "center" });
        else disc(ctx, x, y, 2, theme.muted);
      } else {
        label(ctx, String(v), x, y, { color: row === power ? theme.text : theme.muted, font: row === power ? theme.fontStrong : theme.font, align: "center" });
      }
    });
  }

  if (words) {
    const binomial = num(results.binomial, 1);
    const sum =
      term > 0 && term < power
        ? `C(${power}, ${term}) = ${countingCombinations(power - 1, term - 1)} + ${countingCombinations(power - 1, term)} = ${fmt(binomial)}`
        : `C(${power}, ${term}) = ${fmt(binomial)}`;
    label(ctx, `${sum} · row sum 2${sup(power)} = ${fmt(num(results.rowSum, 1))}`, width / 2, height - 14, centre(theme));
  }
}

function drawExpansion(ctx: CanvasRenderingContext2D, layout: CountingLayout, results: Record<string, unknown>, theme: LabTheme, words: boolean) {
  const { width, height } = layout;
  const power = num(results.power);
  const term = num(results.term);
  const p = num(results.p, 1);
  const q = num(results.q, 1);
  const reciprocal = COUNTING_FORM_ORDER[Math.round(num(results.form))] === "reciprocal";
  label(ctx, `Expanding ${countingBinomial(power, p, q, reciprocal)}`, width / 2, 14, centre(theme, true));

  // The terms T₁ … Tₙ₊₁, with their binomial coefficients underneath.
  const terms = countingExpansion(power, p, q, reciprocal ? "reciprocal" : "plain");
  const chip = Math.min(40, (width - 32) / (power + 1) - 3);
  const left = width / 2 - ((power + 1) * (chip + 3) - 3) / 2;
  const middle = num(results.middleTerm, 1);
  const two = num(results.middleCount, 1) === 2;
  terms.forEach((t, i) => {
    const x = left + i * (chip + 3);
    const chosen = i === term;
    box(ctx, x, 40, chip, 24, chosen ? theme.angle : theme.axis, chosen ? theme.angle : undefined);
    label(ctx, `T${sub(i + 1)}`, x + chip / 2, 52, { color: chosen ? theme.angle : theme.text, font: chosen ? theme.fontStrong : theme.font, align: "center" });
    label(ctx, String(t.binomial), x + chip / 2, 80, { color: theme.muted, font: theme.font, align: "center" });
    if (i + 1 === middle || (two && i + 1 === middle + 1)) disc(ctx, x + chip / 2, 96, 3, theme.curve);
  });
  label(ctx, `C(${power}, r) below; dot: middle term${two ? "s" : ""}`, width / 2, 114, { color: theme.muted, font: theme.font, align: "center" });

  // The chosen term, by the general term.
  const r = term;
  const factorA = power - r === 0 ? "" : p === 1 ? ` · x${power - r === 1 ? "" : sup(power - r)}` : ` · (${xPart(p)})${power - r === 1 ? "" : sup(power - r)}`;
  const qText = reciprocal ? `${fmt(q)}/x` : fmt(q);
  const factorB = r === 0 ? "" : ` · ${q < 0 || reciprocal ? `(${qText})` : qText}${r === 1 ? "" : sup(r)}`;
  label(ctx, `T${sub(r + 1)} = C(${power}, ${r})${factorA}${factorB}`, width / 2, 156, { color: theme.angle, font: theme.fontStrong, align: "center" });
  label(ctx, `general term C(n, r) aⁿ⁻ʳ bʳ, with r = ${r}`, width / 2, 182, { color: theme.muted, font: theme.font, align: "center" });
  const middleText = two ? `middle terms: T${sub(middle)} and T${sub(middle + 1)}` : `middle term: T${sub(middle)}`;
  label(ctx, `${power + 1} terms · ${middleText}`, width / 2, 214, centre(theme));

  if (words) {
    const coefficient = num(results.termCoefficient);
    const xPower = num(results.xPower);
    label(ctx, `= ${countingMonomial(coefficient, xPower)}`, width / 2, 248, { color: theme.angle, font: theme.fontStrong, align: "center" });
    label(ctx, `at x = 1 they add to (${fmt(p)} ${q < 0 ? "−" : "+"} ${fmt(Math.abs(q))})${sup(power)} = ${fmt(num(results.coefficientSum))}`, width / 2, height - 14, centre(theme));
  }
}

export const countingRenderer: SimulationRenderer<CountingLayout> = {
  id: "counting",
  layout: (width) => computeCountingLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const words = has("labels");
    const { width, height } = layout;
    ctx.clearRect(0, 0, width, height);

    if (has("tree")) {
      label(ctx, "Shirts, then trousers, then shoes", width / 2, 14, centre(theme, true));
      drawTree(ctx, layout, results, theme);
      if (words) {
        const outfits = num(results.outfits, 1);
        label(ctx, `${num(results.shirts, 1)} × ${num(results.trousers, 1)} × ${num(results.shoes, 1)} = ${outfits} outfits`, width / 2, height - 14, centre(theme));
      }
    }
    if (has("slots")) {
      const n = num(results.n, 1);
      const r = num(results.r, 1);
      const repeat = num(results.repeat) === 1;
      const title = has("teams") ? `Choose ${r} of ${n}: a team, not an order` : `Fill ${r} slot${r === 1 ? "" : "s"} from ${n} letters${repeat ? ", repeats allowed" : ""}`;
      label(ctx, title, width / 2, 14, centre(theme, true));
      drawSlots(ctx, layout, results, theme, words, has("teams"));
    }
    if (has("seats")) drawSeats(ctx, layout, results, theme, words);
    if (has("stars")) drawStars(ctx, layout, results, theme, words);
    if (has("triangle")) drawTriangle(ctx, layout, results, theme, words);
    if (has("expansion")) drawExpansion(ctx, layout, results, theme, words);
  },
};
