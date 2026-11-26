/**
 * Units and measurement, one bench per layer.
 *
 * Units: the seven base-unit tiles, and bars for the powers of kg, m and s in
 * the unit being built. Check: the [M L T] bars of every term of an equation,
 * side by side. Derive: the bars of mˣ lʸ gᶻ against the result's dimensions.
 * Reading: a rod on a metre scale, a vernier or a screw gauge, magnified.
 * Figures: a number with its significant digits picked out and rounded.
 * Calc: a sum aligned on the decimal point, or a product with its figures.
 * Errors: five readings on a line, their mean and spread. Propagate: each
 * input's percentage error, and its share of the result's.
 *
 * Anything a level asks the learner to work out is drawn only with "labels".
 */

import {
  MEASURE_BASE_UNITS,
  MEASURE_CALC_ORDER,
  MEASURE_CALCS,
  MEASURE_DERIVATION_ORDER,
  MEASURE_DERIVATIONS,
  MEASURE_EQUATION_ORDER,
  MEASURE_EQUATIONS,
  MEASURE_INSTRUMENT_NAMES,
  MEASURE_LAST_READING,
  MEASURE_NUMERAL_ORDER,
  MEASURE_NUMERALS,
  MEASURE_READINGS,
  MEASURE_RULE_ORDER,
  MEASURE_RULES,
  MEASURE_UNIT_ORDER,
  MEASURE_UNITS,
  countSignificantFigures,
  decimalPlacesOf,
  roundingCaseOf,
  roundToFigures,
  type MeasureDim,
} from "@ise/physics-engine";
import { label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface MeasureLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Left and right edges of the drawing. */
  left: number;
  right: number;
}

export function computeMeasureLayout(width: number): MeasureLayout {
  const compact = width < 560;
  return { width, height: compact ? 380 : 400, compact, left: 16, right: width - 16 };
}

const SUPER: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻" };

/** A power written as a superscript: 2 → ², −2 → ⁻², ½ → ½, −1.5 → ⁻³ᐟ². */
export function measureSup(power: number): string {
  if (Number.isInteger(power)) return String(power).split("").map((c) => SUPER[c] ?? c).join("");
  const sign = power < 0 ? "⁻" : "";
  const twice = Math.round(Math.abs(power) * 2);
  return twice === 1 ? `${sign}½` : `${sign}${measureSup(twice)}ᐟ²`;
}

/** [M L T⁻²], leaving out powers of zero. */
export function dimText(dim: MeasureDim): string {
  const parts = (["M", "L", "T"] as const).flatMap((s, i) => (dim[i] === 0 ? [] : [`${s}${dim[i] === 1 ? "" : measureSup(dim[i]!)}`]));
  return `[${parts.length ? parts.join(" ") : "M⁰ L⁰ T⁰"}]`;
}

/** kg m s⁻², leaving out powers of zero. */
export function baseUnitText(dim: MeasureDim): string {
  const parts = (["kg", "m", "s"] as const).flatMap((s, i) => (dim[i] === 0 ? [] : [`${s}${dim[i] === 1 ? "" : measureSup(dim[i]!)}`]));
  return parts.length ? parts.join(" ") : "no unit (a pure number)";
}

const fixed = (v: number, digits: number) => `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}`;
/** About three figures, for an error or a result. */
const about = (v: number) => (Math.abs(v) >= 100 ? fixed(v, 0) : Math.abs(v) >= 10 ? fixed(v, 1) : Math.abs(v) >= 1 ? fixed(v, 2) : fixed(v, 3));
const power10 = (n: number) => (n === 0 ? "1" : n === 1 ? "10" : `10${measureSup(n)}`);
const bigFont = (theme: LabTheme, px: number) => theme.fontStrong.replace(/\d+px/, `${px}px`);

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, colour: string, width = 1.5, dash?: number[]) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function outline(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, colour: string, dash?: number[]) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.5;
  if (dash) ctx.setLineDash(dash);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Three bars for the powers of M, L and T, centred on cx, growing up from
 * zeroY for a positive power and down for a negative one. A target, if
 * given, is a dashed outline.
 */
function dimBars(ctx: CanvasRenderingContext2D, theme: LabTheme, cx: number, zeroY: number, unit: number, dim: MeasureDim, opts: { bar?: number; gap?: number; target?: MeasureDim | null; letters?: boolean } = {}) {
  const bar = opts.bar ?? 14;
  const gap = opts.gap ?? 6;
  const colours = [theme.sine, theme.cosine, theme.angle];
  const start = cx - (3 * bar + 2 * gap) / 2;
  for (let i = 0; i < 3; i++) {
    const x = start + i * (bar + gap);
    const p = dim[i]!;
    if (p !== 0) box(ctx, x, p > 0 ? zeroY - p * unit : zeroY, bar, Math.abs(p) * unit, colours[i]!, 0.8);
    const t = opts.target?.[i];
    if (t !== undefined && t !== 0) outline(ctx, x - 2, t > 0 ? zeroY - t * unit : zeroY, bar + 4, Math.abs(t) * unit, theme.text, [4, 3]);
    const shown = Number.isInteger(p) ? (p < 0 ? `−${-p}` : String(p)) : `${p < 0 ? "−" : ""}${Math.abs(p) === 0.5 ? "½" : `${Math.round(Math.abs(p) * 2)}/2`}`;
    label(ctx, shown, x + bar / 2, p >= 0 ? zeroY - p * unit - 9 : zeroY - p * unit + 9, { color: colours[i]!, font: theme.font, align: "center" });
    if (opts.letters !== false) label(ctx, ["M", "L", "T"][i]!, x + bar / 2, zeroY + 3 * unit + 20, { color: colours[i]!, font: theme.fontStrong, align: "center" });
  }
  line(ctx, start - 6, zeroY, start + 3 * bar + 2 * gap + 6, zeroY, theme.axis, 1);
}

/** A number drawn digit by digit; with `mark`, significant digits in one colour and the rest muted. */
function digits(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, font: string, colour: string, muted: string, mark: boolean) {
  ctx.save();
  ctx.font = font;
  const width = ctx.measureText(text).width;
  ctx.restore();
  const roles = significantMask(text);
  let x = cx - width / 2;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    label(ctx, ch, x, y, { color: mark && !roles[i] ? muted : colour, font });
    ctx.save();
    ctx.font = font;
    x += ctx.measureText(ch).width;
    ctx.restore();
  }
}

/** Which characters of a written number (up to any "×") are significant digits. */
export function significantMask(text: string): boolean[] {
  const cut = text.indexOf("×");
  const mantissa = cut < 0 ? text : text.slice(0, cut);
  const hasPoint = mantissa.includes(".");
  const isDigit = (c: string) => c >= "0" && c <= "9";
  const first = [...mantissa].findIndex((c) => c >= "1" && c <= "9");
  let last = mantissa.length - 1;
  if (!hasPoint) while (last >= 0 && (!isDigit(mantissa[last]!) || mantissa[last] === "0")) last--;
  return [...text].map((c, i) => i < mantissa.length && isDigit(c) && first >= 0 && i >= first && i <= last);
}

export const measureRenderer: SimulationRenderer<MeasureLayout> = {
  id: "measure",
  layout: (width) => computeMeasureLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const words = has("labels");
    const { width, height, left, right } = layout;
    const span = right - left;
    ctx.clearRect(0, 0, width, height);
    const title = (text: string) => label(ctx, text, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
    const caption = (text: string, up = 0) => label(ctx, text, width / 2, height - 14 - up, { color: theme.text, font: theme.font, align: "center" });

    if (has("units")) {
      const unit = MEASURE_UNITS[MEASURE_UNIT_ORDER[Math.round(num(results.unit))] ?? "newton"];
      const built: MeasureDim = [num(results.mExp), num(results.lExp), num(results.tExp)];
      title("The seven SI base units");
      const tile = span / 7;
      MEASURE_BASE_UNITS.forEach((u, i) => {
        const used = i < 3;
        outline(ctx, left + i * tile + 2, 28, tile - 4, 24, used ? theme.text : theme.reference);
        label(ctx, u.symbol, left + i * tile + tile / 2, 40, { color: used ? [theme.cosine, theme.sine, theme.angle][i]! : theme.muted, font: theme.fontStrong, align: "center" });
      });
      label(ctx, `Build the ${unit.label}: ${unit.quantity}`, width / 2, 66, { color: theme.text, font: theme.fontStrong, align: "center" });
      label(ctx, `your tiles: ${baseUnitText(built)}`, width / 2, 86, { color: theme.muted, font: theme.font, align: "center" });
      dimBars(ctx, theme, width / 2, 190, 26, built, { bar: 30, gap: 22, target: words ? unit.dim : null });
      label(ctx, "kg", width / 2 - 52, 302, { color: theme.muted, font: theme.font, align: "center" });
      label(ctx, "m", width / 2, 302, { color: theme.muted, font: theme.font, align: "center" });
      label(ctx, "s", width / 2 + 52, 302, { color: theme.muted, font: theme.font, align: "center" });
      if (words) {
        const cgs = num(results.cgsPower);
        caption("1 kg = 10³ g and 1 m = 10² cm, so", 42);
        caption(`1 ${unit.symbol} = ${power10(cgs)} ${unit.cgs}`, 20);
        caption(num(results.unitMatches) === 1 ? `${baseUnitText(unit.dim)} is the ${unit.label}` : `not yet: the dashed bars are the ${unit.label}`);
      }
    }

    if (has("check")) {
      const id = MEASURE_EQUATION_ORDER[Math.round(num(results.equation))] ?? "velocity";
      const equation = MEASURE_EQUATIONS[id];
      title(equation.label);
      const n = equation.terms.length;
      const cell = span / n;
      const zeroY = 170;
      equation.terms.forEach((term, i) => {
        const cx = left + cell * (i + 0.5);
        dimBars(ctx, theme, cx, zeroY, 22, term.dim, { letters: true });
        label(ctx, term.label, cx, 262, { color: theme.text, font: theme.fontStrong, align: "center" });
        label(ctx, dimText(term.dim), cx, 280, { color: theme.muted, font: theme.font, align: "center" });
        if (i > 0) label(ctx, i === 1 ? "=" : "+", left + cell * i, zeroY, { color: theme.muted, font: theme.fontStrong, align: "center" });
      });
      if (words) {
        const bad = Math.round(num(results.badTerm));
        const lhs = equation.terms[0]!;
        if (bad > 0) {
          const term = equation.terms[bad]!;
          caption(`${term.label} is ${dimText(term.dim)}, not ${dimText(lhs.dim)}: wrong`);
        } else if (id === "fraction") {
          caption("consistent, yet wrong: the 3/16 has no dimensions");
        } else caption(`every term is ${dimText(lhs.dim)}: consistent`);
      }
    }

    if (has("derive")) {
      const d = MEASURE_DERIVATIONS[MEASURE_DERIVATION_ORDER[Math.round(num(results.derivation))] ?? "pendulum"];
      const powers = [num(results.powA), num(results.powB), num(results.powC)];
      const built: MeasureDim = [num(results.builtM), num(results.builtL), num(results.builtT)];
      title(d.label);
      const cell = span / 3;
      d.inputs.forEach((q, i) => {
        label(ctx, `${q.symbol} ${dimText(q.dim)}`, left + cell * (i + 0.5), 40, { color: theme.muted, font: theme.font, align: "center" });
      });
      const trial = `${d.result.symbol} = k · ${d.inputs.map((q, i) => `${q.symbol}${measureSup(powers[i]!)}`).join(" ")}`;
      label(ctx, trial, width / 2, 68, { color: theme.text, font: bigFont(theme, 16), align: "center" });
      dimBars(ctx, theme, width / 2, 180, 24, built, { bar: 30, gap: 22, target: d.result.dim });
      label(ctx, `dashed: ${d.result.symbol} is ${dimText(d.result.dim)}`, width / 2, 300, { color: theme.muted, font: theme.font, align: "center" });
      if (words) caption(num(results.derived) === 1 ? `powers match: ${d.formula}` : `you have ${dimText(built)}; match every bar`);
    }

    if (has("reading")) {
      const lc = num(results.leastCount, 0.01);
      const name = MEASURE_INSTRUMENT_NAMES[String(lc)] ?? "instrument";
      const length = num(results.length, 1);
      const reading = num(results.reading);
      const places = Math.round(num(results.readingPlaces, 2));
      const named = `${name[0]!.toUpperCase()}${name.slice(1)}`;
      title(words ? `${named}: least count ${lc} cm` : named);
      // The whole rod on a 0–10 cm scale.
      const sx = (cm: number) => left + (span * cm) / 10;
      box(ctx, sx(0), 34, sx(length) - sx(0), 10, theme.curve, 0.7);
      line(ctx, sx(0), 50, sx(10), 50, theme.axis, 1);
      for (let cm = 0; cm <= 10; cm++) {
        line(ctx, sx(cm), 50, sx(cm), 56, theme.axis, 1);
        if (cm % 2 === 0) label(ctx, String(cm), sx(cm), 64, { color: theme.muted, font: theme.font, align: "center" });
      }
      outline(ctx, sx(length) - 14, 30, 28, 40, theme.reference, [3, 3]);

      if (places === 1) {
        // A metre scale near the rod's end: millimetre marks.
        const from = Math.max(0, reading - 0.5);
        const x = (cm: number) => left + 10 + ((span - 20) * (cm - from)) / 1;
        const base = 200;
        box(ctx, left + 10, 140, Math.max(0, x(length) - left - 10), 22, theme.curve, 0.7);
        line(ctx, left + 10, base, right - 10, base, theme.axis, 1.5);
        for (let k = Math.ceil(from * 10 - 1e-9); k <= Math.floor((from + 1) * 10 + 1e-9); k++) {
          const tall = k % 10 === 0 ? 22 : k % 5 === 0 ? 15 : 9;
          line(ctx, x(k / 10), base, x(k / 10), base - tall, theme.text, 1);
          if (k % 10 === 0) label(ctx, `${k / 10} cm`, x(k / 10), base + 14, { color: theme.text, font: theme.font, align: "center" });
        }
        line(ctx, x(length), 132, x(length), base, theme.curve, 1.5, [3, 3]);
        if (words) line(ctx, x(reading), base - 26, x(reading), base, theme.tangent, 2.5);
      } else if (places === 2) {
        // A vernier: ten divisions spanning nine millimetres.
        const main = num(results.mainScale);
        const from = main - 0.2;
        const k = (span - 20) / 1.4;
        const x = (cm: number) => left + 10 + k * (cm - from);
        const base = 180;
        line(ctx, left + 10, base, right - 10, base, theme.axis, 1.5);
        for (let m = Math.ceil(from * 10 - 1e-9); m <= Math.floor((from + 1.4) * 10 + 1e-9); m++) {
          const tall = m % 10 === 0 ? 24 : m % 5 === 0 ? 16 : 10;
          line(ctx, x(m / 10), base, x(m / 10), base - tall, theme.text, 1);
          if (m % 10 === 0) label(ctx, `${m / 10}`, x(m / 10), base - 34, { color: theme.text, font: theme.font, align: "center" });
        }
        label(ctx, "main scale (cm)", left + 10, 120, { color: theme.muted, font: theme.font });
        const coincide = Math.round(num(results.division));
        for (let v = 0; v <= 10; v++) {
          const vx = x(length + v * 0.09);
          const hit = words && v === coincide;
          line(ctx, vx, base, vx, base + (v % 5 === 0 ? 22 : 14), hit ? theme.tangent : theme.sine, hit ? 2.5 : 1.2);
          if (v % 5 === 0) label(ctx, String(v), vx, base + 32, { color: theme.sine, font: theme.font, align: "center" });
        }
        label(ctx, "vernier: 10 divisions = 9 mm", left + 10, base + 52, { color: theme.muted, font: theme.font });
      } else {
        // A screw gauge: pitch 0.5 mm on the sleeve, 50 divisions round the thimble.
        const main = num(results.mainScale);
        const thimble = 84;
        const from = length - 0.35;
        const k = (span - 20 - thimble) / 0.35;
        const x = (cm: number) => left + 10 + k * (cm - from);
        const ref = 190;
        const edge = x(length);
        line(ctx, left + 10, ref, edge, ref, theme.axis, 1.5);
        for (let h = Math.ceil(from * 20 - 1e-9); h * 0.05 <= length + 1e-9; h++) {
          const upper = h % 2 === 0;
          line(ctx, x(h * 0.05), ref, x(h * 0.05), upper ? ref - 14 : ref + 10, theme.text, 1);
          if (upper) label(ctx, (h * 0.05).toFixed(1), x(h * 0.05), ref - 24, { color: theme.text, font: theme.font, align: "center" });
        }
        box(ctx, edge, ref - 70, thimble, 140, theme.neutral, 0.18);
        outline(ctx, edge, ref - 70, thimble, 140, theme.axis);
        const turn = (length - main) / 0.001;
        for (let dv = Math.floor(turn) - 5; dv <= Math.ceil(turn) + 5; dv++) {
          const y = ref - (dv - turn) * 12;
          if (y < ref - 64 || y > ref + 64) continue;
          const shown = ((dv % 50) + 50) % 50;
          const hit = words && shown === Math.round(num(results.division));
          line(ctx, edge, y, edge + (shown % 5 === 0 ? 18 : 10), y, hit ? theme.tangent : theme.sine, hit ? 2.5 : 1.2);
          if (shown % 5 === 0) label(ctx, String(shown), edge + 24, y, { color: theme.sine, font: theme.font });
        }
        label(ctx, "sleeve: 0.1 cm marks above, 0.05 cm below", left + 10, 290, { color: theme.muted, font: theme.font });
      }

      if (words) {
        const text = reading.toFixed(places);
        if (places > 1) {
          const division = Math.round(num(results.division));
          caption(`${fixed(num(results.mainScale), places === 2 ? 1 : 2)} cm + ${division} × ${lc} cm = ${text} cm`, 20);
        }
        caption(`reading ${text} cm · ${Math.round(num(results.readingFigures))} significant figures`);
      }
    }

    if (has("figures")) {
      const numeral = MEASURE_NUMERALS[MEASURE_NUMERAL_ORDER[Math.round(num(results.numeral))] ?? "a"];
      const keep = Math.round(num(results.keep, 3));
      title("How many figures are significant?");
      digits(ctx, numeral.label, width / 2, 100, bigFont(theme, 30), theme.text, theme.muted, words);
      label(ctx, numeral.unit, width / 2, 136, { color: theme.muted, font: theme.font, align: "center" });
      label(ctx, `keep ${keep} figure${keep === 1 ? "" : "s"}`, width / 2, 180, { color: theme.text, font: theme.fontStrong, align: "center" });
      if (words) {
        const rounded = roundToFigures(numeral.text, keep).replace(/e(-?\d+)$/, (_, e: string) => ` × 10${measureSup(Number(e))}`);
        label(ctx, `→ ${rounded}`, width / 2, 220, { color: theme.tangent, font: bigFont(theme, 24), align: "center" });
        const why = roundingCaseOf(numeral.text, keep);
        const reason =
          why === "none" ? "nothing to drop" : why === "raise" ? "dropped part over half: raise" : why === "leave" ? "dropped digit under 5: leave" : why === "odd" ? "dropped a 5 after an odd digit: raise" : "dropped a 5 after an even digit: leave";
        label(ctx, reason, width / 2, 254, { color: theme.muted, font: theme.font, align: "center" });
        caption(`${numeral.label} has ${countSignificantFigures(numeral.text)} significant figures`);
      }
    }

    if (has("calc")) {
      const calc = MEASURE_CALCS[MEASURE_CALC_ORDER[Math.round(num(results.calc))] ?? "masses"];
      const rule = Math.round(num(results.calcRule));
      if (calc.kind === "sum") {
        title("Adding measured values");
        const point = width / 2 + 16;
        ctx.save();
        ctx.font = bigFont(theme, 16);
        const fracWidth = (t: string) => ctx.measureText(t).width;
        const rows = calc.operands.map((t) => {
          const [whole, frac] = t.replace("-", "").split(".");
          return { sign: t.startsWith("-") ? "−" : "+", whole: whole ?? "", frac: frac ? `.${frac}` : "" };
        });
        const widest = Math.max(...rows.map((r) => fracWidth(r.frac)), fracWidth(`.${"0".repeat(decimalPlacesOf(String(num(results.calcRaw))) || 1)}`));
        const doubt = point + fracWidth(rule > 0 ? `.${"0".repeat(rule)}` : "");
        ctx.restore();
        box(ctx, doubt, 46, Math.max(0, point + widest - doubt + 4), 24 * rows.length + 40, theme.secant, 0.15);
        rows.forEach((r, i) => {
          const y = 60 + i * 24;
          if (i > 0) label(ctx, r.sign, point - 70, y, { color: theme.muted, font: bigFont(theme, 16), align: "right" });
          label(ctx, r.whole, point, y, { color: theme.text, font: bigFont(theme, 16), align: "right" });
          label(ctx, r.frac, point, y, { color: theme.text, font: bigFont(theme, 16) });
        });
        const bottom = 60 + rows.length * 24 - 10;
        line(ctx, point - 70, bottom, point + widest + 6, bottom, theme.axis, 1);
        label(ctx, calc.unit, point + widest + 14, 60, { color: theme.muted, font: theme.font });
        label(ctx, "shaded: decimal places not all values have", width / 2, bottom + 70, { color: theme.secant, font: theme.font, align: "center" });
        if (words) {
          const raw = String(num(results.calcRaw));
          const [whole, frac] = raw.split(".");
          label(ctx, whole ?? raw, point, bottom + 16, { color: theme.muted, font: bigFont(theme, 16), align: "right" });
          if (frac) label(ctx, `.${frac}`, point, bottom + 16, { color: theme.muted, font: bigFont(theme, 16) });
          caption(`fewest decimal places: ${rule} → ${num(results.calcResult).toFixed(rule)} ${calc.unit}`);
        }
      } else {
        title("Multiplying and dividing measured values");
        calc.operands.forEach((t, i) => {
          const y = 70 + i * 34;
          const op = i === 0 ? "" : calc.divide?.[i] ? "÷ " : "× ";
          label(ctx, `${op}${t}`, width / 2 + 10, y, { color: theme.text, font: bigFont(theme, 18), align: "right" });
          label(ctx, `${countSignificantFigures(t)} figures`, width / 2 + 22, y, { color: theme.muted, font: theme.font });
        });
        label(ctx, calc.unit, width / 2, 70 + calc.operands.length * 34, { color: theme.muted, font: theme.font, align: "center" });
        if (words) {
          label(ctx, `= ${num(results.calcRaw).toPrecision(7)}…`, width / 2, 190, { color: theme.muted, font: bigFont(theme, 16), align: "center" });
          caption(`fewest figures: ${rule} → ${num(results.calcResult).toPrecision(rule)} ${calc.unit}`);
        }
      }
    }

    if (has("errors")) {
      title("Five readings of a pendulum's period");
      const readings = [...MEASURE_READINGS.slice(0, -1), num(results.lastReading, 2.8)];
      const [lo, hi] = MEASURE_LAST_READING;
      const x0 = left + 56;
      const x = (t: number) => x0 + ((right - 8 - x0) * (t - lo)) / (hi - lo);
      const axis = 230;
      const mean = num(results.mean);
      const spread = num(results.meanAbsError);
      if (words) {
        box(ctx, x(mean - spread), 36, x(mean + spread) - x(mean - spread), axis - 40, theme.tangent, 0.14);
        line(ctx, x(mean), 36, x(mean), axis, theme.tangent, 2);
      }
      readings.forEach((r, i) => {
        const y = 52 + i * 36;
        label(ctx, `${r.toFixed(2)} s`, left, y, { color: i === 4 ? theme.angle : theme.text, font: theme.font });
        if (words) line(ctx, x(r), y, x(mean), y, theme.secant, 2);
        dot(ctx, x(r), y, 5, i === 4 ? theme.angle : theme.sine);
      });
      line(ctx, x0, axis, right - 8, axis, theme.axis, 1);
      for (let k = 0; k <= 7; k++) {
        const t = lo + k * 0.1;
        line(ctx, x(t), axis, x(t), axis + 5, theme.axis, 1);
        if (k % 2 === 1) label(ctx, t.toFixed(1), x(t), axis + 14, { color: theme.muted, font: theme.font, align: "center" });
      }
      if (words) {
        label(ctx, `mean ${mean.toFixed(2)} s · mean |Δ| ${spread.toFixed(3)} s`, width / 2, 272, { color: theme.text, font: theme.font, align: "center" });
        caption(`relative ${num(results.relativeError).toFixed(3)} → ${num(results.percentError).toFixed(1)} %`, 20);
        caption(`T = ${mean.toFixed(2)} s ± ${spread.toFixed(2)} s`);
      }
    }

    if (has("propagate")) {
      const rule = MEASURE_RULES[MEASURE_RULE_ORDER[Math.round(num(results.rule))] ?? "series"];
      const power = rule.kind === "power";
      const errA = num(results.errA);
      const errB = num(results.errB);
      const shareA = num(results.shareA);
      const shareB = num(results.shareB);
      title(rule.label);
      label(ctx, rule.formula, width / 2, 42, { color: theme.text, font: bigFont(theme, 16), align: "center" });
      label(ctx, `${rule.a.symbol} = ${rule.a.value} ${rule.a.unit} ± ${about(num(results.absA))} ${rule.a.unit} (${errA.toFixed(1)} %)`, width / 2, 72, { color: theme.sine, font: theme.font, align: "center" });
      label(ctx, `${rule.b.symbol} = ${rule.b.value} ${rule.b.unit} ± ${about(num(results.absB))} ${rule.b.unit} (${errB.toFixed(1)} %)`, width / 2, 92, { color: theme.cosine, font: theme.font, align: "center" });
      const x0 = left + 40;
      const most = Math.max(10, errA, errB, words ? shareA + shareB : 0);
      const k = (right - 50 - x0) / most;
      const rows = [
        { y: 136, name: rule.a.symbol, err: errA, share: shareA, times: Math.abs(rule.p), colour: theme.sine },
        { y: 176, name: rule.b.symbol, err: errB, share: shareB, times: Math.abs(rule.q), colour: theme.cosine },
      ];
      label(ctx, words ? "share of the error in the result, %" : "error in each measurement, %", x0, 112, { color: theme.muted, font: theme.font });
      for (const r of rows) {
        label(ctx, r.name, x0 - 8, r.y, { color: r.colour, font: theme.fontStrong, align: "right" });
        const shown = words ? r.share : r.err;
        box(ctx, x0, r.y - 9, shown * k, 18, r.colour, 0.75);
        if (words && power && r.times !== 1) outline(ctx, x0, r.y - 9, r.err * k, 18, theme.text, [3, 3]);
        const note = words && power && r.times !== 1 ? `×${r.times}` : `${shown.toFixed(1)}`;
        label(ctx, note, x0 + shown * k + 6, r.y, { color: theme.text, font: theme.font });
      }
      if (words) {
        const y = 222;
        label(ctx, rule.z.symbol, x0 - 8, y, { color: theme.angle, font: theme.fontStrong, align: "right" });
        box(ctx, x0, y - 9, shareA * k, 18, theme.sine, 0.75);
        box(ctx, x0 + shareA * k, y - 9, shareB * k, 18, theme.cosine, 0.75);
        label(ctx, `${num(results.zPercent).toFixed(1)} %`, x0 + (shareA + shareB) * k + 6, y, { color: theme.text, font: theme.font });
        label(ctx, power ? "ΔZ/Z = |p|ΔA/A + |q|ΔB/B" : "ΔZ = ΔA + ΔB", width / 2, 262, { color: theme.muted, font: theme.font, align: "center" });
        caption(`${rule.z.symbol} = ${about(num(results.zValue))} ± ${about(num(results.zError))} ${rule.z.unit} (${num(results.zPercent).toFixed(1)} %)`);
      }
    }
  },
};
