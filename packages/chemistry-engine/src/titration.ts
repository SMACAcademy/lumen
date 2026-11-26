import type { SimulationModel } from "@ise/science-engine";
import { snapZero } from "@ise/units";

/**
 * An acid in a flask, sodium hydroxide from a burette, and the pH as it goes.
 *
 * The pH is not looked up from a formula for each region of the curve. It is
 * solved from the charge balance of the whole solution,
 *
 *   [H⁺] + [Na⁺] = [OH⁻] + [A⁻],   [A⁻] = C·Ka / (Ka + [H⁺]),   [OH⁻] = Kw/[H⁺]
 *
 * at every drop. The steep jump at the equivalence point, the buffer plateau
 * of a weak acid, pH = pKa at half-neutralisation and the basic equivalence
 * point of a weak acid all come out of that one equation.
 */

export type AcidId = "hcl" | "ethanoic" | "methanoic";
export type IndicatorId = "phenolphthalein" | "methyl-orange" | "bromothymol-blue" | "litmus" | "turmeric" | "china-rose";

export interface Acid {
  id: AcidId;
  label: string;
  /** Acid dissociation constant; Infinity for a strong acid. */
  Ka: number;
}

export const ACIDS: Record<AcidId, Acid> = {
  hcl: { id: "hcl", label: "Hydrochloric acid (strong)", Ka: Number.POSITIVE_INFINITY },
  ethanoic: { id: "ethanoic", label: "Ethanoic acid (weak, pKa 4.76)", Ka: 10 ** -4.76 },
  methanoic: { id: "methanoic", label: "Methanoic acid (weak, pKa 3.75)", Ka: 10 ** -3.75 },
};

export interface Indicator {
  id: IndicatorId;
  label: string;
  /** The pH range over which it changes colour. */
  range: readonly [number, number];
  /** Colours below, across and above the range — as words, for the renderer to paint. */
  colours: readonly [string, string, string];
}

export const INDICATORS: Record<IndicatorId, Indicator> = {
  phenolphthalein: { id: "phenolphthalein", label: "Phenolphthalein", range: [8.2, 10], colours: ["colourless", "pale pink", "pink"] },
  "methyl-orange": { id: "methyl-orange", label: "Methyl orange", range: [3.1, 4.4], colours: ["red", "orange", "yellow"] },
  "bromothymol-blue": { id: "bromothymol-blue", label: "Bromothymol blue", range: [6.0, 7.6], colours: ["yellow", "green", "blue"] },
  // NCERT's everyday indicators. Natural dyes vary; these ranges are typical.
  litmus: { id: "litmus", label: "Litmus", range: [4.5, 8.3], colours: ["red", "purple", "blue"] },
  turmeric: { id: "turmeric", label: "Turmeric", range: [7.4, 8.6], colours: ["yellow", "orange", "reddish-brown"] },
  "china-rose": { id: "china-rose", label: "China rose", range: [6.5, 8.0], colours: ["magenta", "purple", "green"] },
};

/** Indicators in a fixed order, so a result can name one with a number. */
/** Acids in a fixed order, so a result can name one with a number. */
export const ACID_ORDER: readonly AcidId[] = ["hcl", "ethanoic", "methanoic"];

export const INDICATOR_ORDER: readonly IndicatorId[] = ["phenolphthalein", "methyl-orange", "bromothymol-blue", "litmus", "turmeric", "china-rose"];

export const KW = 1e-14;
/** The acid in the flask, in mL, and the most the burette holds. */
export const ACID_VOLUME = 25;
export const BURETTE_MAX = 50;
/** How fast the burette runs while playing, in mL per second. */
export const DRIP_RATE = 2;

export type TitrationParams = {
  acid: AcidId;
  /** Concentration of the acid, and of the NaOH, in mol/L. */
  Ca: number;
  Cb: number;
  indicator: IndicatorId;
};

export interface TitrationState {
  /** Volume of NaOH added so far, in mL. */
  readonly Vb: number;
}

export type TitrationResults = {
  /** Which acid, as its place in ACID_ORDER. */
  acid: number;
  Vb: number;
  pH: number;
  pOH: number;
  /** [H⁺] and [OH⁻], in mol/L. */
  hydrogen: number;
  hydroxide: number;
  /** The volume of base that exactly neutralises the acid, and how far along we are. */
  equivalenceVolume: number;
  fractionNeutralised: number;
  /** The pH at the equivalence point and at half-neutralisation. */
  pHAtEquivalence: number;
  pHAtHalf: number;
  /** pKa of the acid (0 for a strong acid, which has none worth quoting). */
  pKa: number;
  strong: number;
  /** 1 while a weak acid and its salt are together in useful amounts: the buffer region. */
  buffer: number;
  /** Which indicator is in the flask (its place in INDICATOR_ORDER), and which colour it shows: 0 acid colour, 1 changing, 2 alkaline colour. */
  indicator: number;
  indicatorColour: number;
  /** Where the indicator changes colour (mid-range), in mL, and how far that is from the true equivalence point. */
  endpointVolume: number;
  titrationError: number;
  /** 1 when the endpoint falls within 0.5 % of the equivalence point — a good indicator for this titration. */
  indicatorSuitable: number;
  indicatorLow: number;
  indicatorHigh: number;
  /** Amounts left, in millimoles: acid not yet neutralised and hydroxide in excess. */
  acidLeft: number;
  excessBase: number;
  Ca: number;
  Cb: number;
};

export function acidOf(params: TitrationParams): Acid {
  return ACIDS[params.acid] ?? ACIDS.hcl;
}

export function indicatorOf(params: TitrationParams): Indicator {
  return INDICATORS[params.indicator] ?? INDICATORS.phenolphthalein;
}

export function equivalenceVolume(params: TitrationParams): number {
  return (params.Ca * ACID_VOLUME) / Math.max(1e-9, params.Cb);
}

/**
 * [H⁺] after Vb mL of base, from the charge balance. The balance is a
 * difference that falls steadily as [H⁺] rises, so bisection on log[H⁺]
 * finds the root without trouble however steep the curve.
 */
export function hydrogenIon(params: TitrationParams, Vb: number): number {
  const { Ka } = acidOf(params);
  const total = ACID_VOLUME + Math.max(0, Vb);
  const acid = (params.Ca * ACID_VOLUME) / total;
  const sodium = (params.Cb * Math.max(0, Vb)) / total;
  const balance = (h: number) => h + sodium - KW / h - (Number.isFinite(Ka) ? (acid * Ka) / (Ka + h) : acid);
  let lo = -16;
  let hi = 1;
  for (let i = 0; i < 120; i++) {
    const mid = (lo + hi) / 2;
    if (balance(10 ** mid) > 0) hi = mid;
    else lo = mid;
  }
  return 10 ** ((lo + hi) / 2);
}

export function pHAt(params: TitrationParams, Vb: number): number {
  return -Math.log10(hydrogenIon(params, Vb));
}

/** The volume at which the pH reaches a value — the pH only ever rises as base goes in. */
export function volumeAtPH(params: TitrationParams, pH: number): number {
  let lo = 0;
  let hi = BURETTE_MAX;
  if (pHAt(params, hi) < pH) return hi;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (pHAt(params, mid) < pH) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** An indicator is good enough when its colour change lands within this fraction of the equivalence volume. */
export const INDICATOR_TOLERANCE = 0.005;

const OUTPUTS = [
  "acid",
  "Vb",
  "pH",
  "pOH",
  "hydrogen",
  "hydroxide",
  "equivalenceVolume",
  "fractionNeutralised",
  "pHAtEquivalence",
  "pHAtHalf",
  "pKa",
  "strong",
  "buffer",
  "indicator",
  "indicatorColour",
  "endpointVolume",
  "titrationError",
  "indicatorSuitable",
  "indicatorLow",
  "indicatorHigh",
  "acidLeft",
  "excessBase",
  "Ca",
  "Cb",
] as const satisfies readonly (keyof TitrationResults)[];

const clampVolume = (v: number) => Math.min(BURETTE_MAX, Math.max(0, v));

export const titrationModel: SimulationModel<TitrationState, TitrationParams, TitrationResults> = {
  id: "titration",
  defaultParams: { acid: "hcl", Ca: 0.1, Cb: 0.1, indicator: "phenolphthalein" },
  outputs: OUTPUTS,
  stateVariables: ["Vb"],

  initialize() {
    return { Vb: 0 };
  },

  /** Play opens the tap: base runs in steadily until the burette is empty. */
  advance(state, dt) {
    return { Vb: clampVolume(state.Vb + DRIP_RATE * dt) };
  },

  /** A step is half a millilitre — ten drops. */
  step(state, _params, sign) {
    return { Vb: clampVolume(Math.round((state.Vb + sign * 0.5) * 2) / 2) };
  },

  derive(state, params) {
    const Vb = clampVolume(state.Vb);
    const { Ka } = acidOf(params);
    const strong = !Number.isFinite(Ka);
    const h = hydrogenIon(params, Vb);
    const pH = -Math.log10(h);
    const Veq = equivalenceVolume(params);
    const fraction = Vb / Veq;
    const indicator = indicatorOf(params);
    const [low, high] = indicator.range;
    const pHEq = pHAt(params, Veq);
    const endpoint = volumeAtPH(params, (low + high) / 2);
    const millimolesAcid = params.Ca * ACID_VOLUME;
    const millimolesBase = params.Cb * Vb;
    return {
      acid: ACID_ORDER.indexOf(acidOf(params).id),
      Vb,
      pH,
      pOH: 14 - pH,
      hydrogen: h,
      hydroxide: KW / h,
      equivalenceVolume: Veq,
      fractionNeutralised: fraction,
      pHAtEquivalence: pHEq,
      pHAtHalf: pHAt(params, Veq / 2),
      pKa: strong ? 0 : -Math.log10(Ka),
      strong: strong ? 1 : 0,
      buffer: !strong && fraction > 0.1 && fraction < 0.9 ? 1 : 0,
      indicator: Math.max(0, INDICATOR_ORDER.indexOf(indicator.id)),
      indicatorColour: pH < low ? 0 : pH > high ? 2 : 1,
      endpointVolume: endpoint,
      titrationError: endpoint - Veq,
      indicatorSuitable: Math.abs(endpoint - Veq) <= INDICATOR_TOLERANCE * Veq ? 1 : 0,
      indicatorLow: low,
      indicatorHigh: high,
      acidLeft: snapZero(Math.max(0, millimolesAcid - millimolesBase)),
      excessBase: snapZero(Math.max(0, millimolesBase - millimolesAcid)),
      Ca: params.Ca,
      Cb: params.Cb,
    };
  },

  getVariable(state, id) {
    return id === "Vb" ? state.Vb : undefined;
  },

  setVariable(state, id, value) {
    return id === "Vb" ? { Vb: clampVolume(value) } : state;
  },
};
