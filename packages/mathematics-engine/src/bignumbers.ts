import type { SimulationModel } from "@ise/science-engine";

/**
 * Large numbers (NCERT class 6, "Knowing Our Numbers") and direct and
 * inverse proportion (class 8).
 *
 * Place value: a number up to 99,99,99,999 is built from its Indian periods,
 * crores, lakhs, thousands and ones. The same digits are grouped two ways:
 * Indian commas after the hundreds and then every two digits (4,56,78,912),
 * international commas every three digits (45,678,912). 1 lakh = 100
 * thousand, 10 lakh = 1 million and 1 crore = 10 million.
 *
 * Rounding: to the nearest ten, hundred, …, crore, with a 5 or more rounding
 * up. Estimating: a sum is estimated by rounding both numbers to the same
 * place; a product by rounding each factor to its greatest place, as NCERT
 * does (63 × 182 ≈ 60 × 200).
 *
 * Roman numerals: I, V, X, L, C, D, M, written one place at a time with the
 * standard subtractive pairs IV, IX, XL, XC, CD and CM, from 1 to 3999.
 *
 * Proportion: pens at a fixed price (direct: cost ÷ pens stays the same) and
 * a fixed job shared by workers (inverse: workers × days stays the same).
 * Days are kept as an exact fraction as well as a decimal.
 *
 * All arithmetic is on whole numbers, exact far beyond these sizes. Every
 * output is a finite number; −0 is turned into 0.
 */

// ── The big units ───────────────────────────────────────────────────────────

export const BIG_NUMBERS_THOUSAND = 1_000;
export const BIG_NUMBERS_LAKH = 100_000;
export const BIG_NUMBERS_MILLION = 1_000_000;
export const BIG_NUMBERS_CRORE = 10_000_000;

/** Place names by power of ten: index 5 is a lakh. */
export const BIG_NUMBERS_PLACE_NAMES = ["one", "ten", "hundred", "thousand", "ten thousand", "lakh", "ten lakh", "crore", "ten crore"] as const;

// ── Limits of the controls ──────────────────────────────────────────────────

export const BIG_NUMBERS_LIMITS = {
  crores: [0, 99],
  lakhs: [0, 99],
  thousands: [0, 99],
  ones: [0, 999],
  /** The power of ten to round to: 1 is the nearest ten, 7 the nearest crore. */
  place: [1, 7],
  factor: [1, 99999],
  romanThousands: [0, 3],
  romanDigit: [0, 9],
  penPrice: [1, 100],
  pens: [0, 20],
  work: [1, 360],
  workers: [1, 30],
} as const;

/** Play adds one pen and one worker a second. */
const PER_SECOND = 1;

export type BigNumbersParams = {
  /** The Indian periods of the big number: crores, lakhs, thousands and ones. */
  crores: number;
  lakhs: number;
  thousands: number;
  ones: number;
  /** Round to the nearest 10^place. */
  place: number;
  /** Two numbers to add and multiply roughly. */
  p: number;
  q: number;
  /** The digits of the number written in Roman numerals. */
  rThousands: number;
  rHundreds: number;
  rTens: number;
  rOnes: number;
  /** ₹ for one pen. */
  penPrice: number;
  /** The whole job, in worker-days: how many days one worker alone would take. */
  work: number;
};

export interface BigNumbersState {
  /** Pens bought. */
  readonly pens: number;
  /** Workers sharing the job. */
  readonly workers: number;
}

export type BigNumbersResults = {
  number: number;
  crores: number;
  lakhs: number;
  thousands: number;
  ones: number;
  /** How many digits the number has (0 has one). */
  digits: number;
  /** The international periods: millions, thousands, ones. */
  millionsPeriod: number;
  thousandsIntl: number;
  /** The number counted in lakhs, millions and crores. */
  inLakhs: number;
  inMillions: number;
  inCrores: number;

  place: number;
  roundUnit: number;
  /** The multiples of the round unit just below and just above the number. */
  roundLow: number;
  roundHigh: number;
  rounded: number;
  /** How far the rounded number is from the number. */
  roundGap: number;
  /** 1 when rounding went up. */
  roundedUp: number;

  p: number;
  q: number;
  pRounded: number;
  qRounded: number;
  sumExact: number;
  sumEstimate: number;
  sumGap: number;
  pGreatest: number;
  qGreatest: number;
  productExact: number;
  productEstimate: number;
  productGap: number;

  romanValue: number;
  romanThousands: number;
  romanHundreds: number;
  romanTens: number;
  romanOnes: number;
  /** How many symbols the numeral uses. */
  romanSymbols: number;
  /** How many subtractive pairs (IV, IX, XL, XC, CD, CM) it uses. */
  romanPairs: number;
  /** 1 for 1 to 3999; the Romans had no numeral for 0. */
  romanValid: number;

  penPrice: number;
  pens: number;
  cost: number;
  /** cost ÷ pens: the same for any number of pens. */
  costPerPen: number;

  work: number;
  workers: number;
  days: number;
  /** days as a fraction in lowest terms. */
  daysN: number;
  daysD: number;
  /** 1 when the days come out whole. */
  daysWhole: number;
  /** workers × days: the same for any number of workers. */
  workerDays: number;
};

const OUTPUTS = [
  "number", "crores", "lakhs", "thousands", "ones", "digits", "millionsPeriod", "thousandsIntl", "inLakhs", "inMillions", "inCrores",
  "place", "roundUnit", "roundLow", "roundHigh", "rounded", "roundGap", "roundedUp",
  "p", "q", "pRounded", "qRounded", "sumExact", "sumEstimate", "sumGap", "pGreatest", "qGreatest", "productExact", "productEstimate", "productGap",
  "romanValue", "romanThousands", "romanHundreds", "romanTens", "romanOnes", "romanSymbols", "romanPairs", "romanValid",
  "penPrice", "pens", "cost", "costPerPen",
  "work", "workers", "days", "daysN", "daysD", "daysWhole", "workerDays",
] as const satisfies readonly (keyof BigNumbersResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
const whole = (v: number, [lo, hi]: readonly [number, number]) => clamp(Math.round(v), lo, hi);
/** Whole pens and workers, even while Play moves them smoothly. */
const counted = (v: number, [lo, hi]: readonly [number, number]) => clamp(Math.floor(v + 1e-9), lo, hi);

// ── Writing numbers ─────────────────────────────────────────────────────────

/** The Indian system: 3 digits, then groups of 2. 12345678 → "1,23,45,678". */
export function bigNumbersIndianCommas(n: number): string {
  const s = String(Math.abs(Math.round(n)));
  const sign = n < 0 && s !== "0" ? "−" : "";
  if (s.length <= 3) return sign + s;
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${sign}${rest},${s.slice(-3)}`;
}

/** The international system: groups of 3. 12345678 → "12,345,678". */
export function bigNumbersInternationalCommas(n: number): string {
  const s = String(Math.abs(Math.round(n)));
  const sign = n < 0 && s !== "0" ? "−" : "";
  return sign + s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const SMALL = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function below100(n: number): string {
  if (n < 20) return SMALL[n]!;
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o ? `${TENS[t]}-${SMALL[o]}` : TENS[t]!;
}

/** 1 to 999 in words; "" for 0. */
function below1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? `${SMALL[h]} hundred` : "", r ? below100(r) : ""].filter(Boolean).join(" ");
}

/** NCERT style, Indian: 12345678 → "one crore twenty-three lakh forty-five thousand six hundred seventy-eight". */
export function bigNumbersIndianWords(n: number): string {
  const v = Math.abs(Math.round(n));
  if (v === 0) return "zero";
  const crore = Math.floor(v / BIG_NUMBERS_CRORE);
  const lakh = Math.floor((v % BIG_NUMBERS_CRORE) / BIG_NUMBERS_LAKH);
  const thousand = Math.floor((v % BIG_NUMBERS_LAKH) / BIG_NUMBERS_THOUSAND);
  const rest = v % BIG_NUMBERS_THOUSAND;
  return [
    crore ? `${bigNumbersIndianWords(crore)} crore` : "",
    lakh ? `${below100(lakh)} lakh` : "",
    thousand ? `${below100(thousand)} thousand` : "",
    rest ? below1000(rest) : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** International: 12345678 → "twelve million three hundred forty-five thousand six hundred seventy-eight". */
export function bigNumbersInternationalWords(n: number): string {
  const v = Math.abs(Math.round(n));
  if (v === 0) return "zero";
  const billion = Math.floor(v / 1e9);
  const million = Math.floor((v % 1e9) / BIG_NUMBERS_MILLION);
  const thousand = Math.floor((v % BIG_NUMBERS_MILLION) / BIG_NUMBERS_THOUSAND);
  const rest = v % BIG_NUMBERS_THOUSAND;
  return [
    billion ? `${bigNumbersInternationalWords(billion)} billion` : "",
    million ? `${below1000(million)} million` : "",
    thousand ? `${below1000(thousand)} thousand` : "",
    rest ? below1000(rest) : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Digits in a whole number; 0 has one. */
export function bigNumbersDigitCount(n: number): number {
  return String(Math.abs(Math.round(n))).length;
}

// ── Rounding and estimating ─────────────────────────────────────────────────

/** Round a whole number to the nearest multiple of `unit`; 5 or more rounds up. 4,78,632 to a lakh → 5,00,000. */
export function bigNumbersRound(n: number, unit: number): number {
  const v = Math.round(n);
  const u = Math.max(1, Math.round(unit));
  const low = Math.floor(v / u) * u;
  return v - low >= u / 2 ? low + u : low;
}

/** The value of the first digit's place: 182 → 100, 5290 → 1000, 7 → 1. */
export function bigNumbersGreatestPlace(n: number): number {
  return 10 ** (bigNumbersDigitCount(n) - 1);
}

/** Round to the greatest place, NCERT's rule for estimating a product: 182 → 200, 63 → 60. */
export function bigNumbersRoundGreatest(n: number): number {
  return bigNumbersRound(n, bigNumbersGreatestPlace(n));
}

// ── Roman numerals ──────────────────────────────────────────────────────────

export const BIG_NUMBERS_ROMAN_SYMBOLS = [
  { symbol: "I", value: 1 },
  { symbol: "V", value: 5 },
  { symbol: "X", value: 10 },
  { symbol: "L", value: 50 },
  { symbol: "C", value: 100 },
  { symbol: "D", value: 500 },
  { symbol: "M", value: 1000 },
] as const;

const ROMAN_PLACES = [
  ["", "M", "MM", "MMM"],
  ["", "C", "CC", "CCC", "CD", "D", "DC", "DCC", "DCCC", "CM"],
  ["", "X", "XX", "XXX", "XL", "L", "LX", "LXX", "LXXX", "XC"],
  ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"],
] as const;

/** Each place written on its own: 1994 → ["M", "CM", "XC", "IV"]. Thousands, hundreds, tens, ones. */
export function bigNumbersRomanParts(n: number): [string, string, string, string] {
  const v = clamp(Math.round(n), 0, 3999);
  const digits = [Math.floor(v / 1000), Math.floor(v / 100) % 10, Math.floor(v / 10) % 10, v % 10];
  return digits.map((d, i) => ROMAN_PLACES[i]![d] ?? "") as [string, string, string, string];
}

/** 1 to 3999 in Roman numerals; "" for 0 or anything out of range. */
export function bigNumbersToRoman(n: number): string {
  const v = Math.round(n);
  if (!(v >= 1 && v <= 3999)) return "";
  return bigNumbersRomanParts(v).join("");
}

/**
 * Read a Roman numeral. A smaller symbol before a bigger one is taken away.
 * Only properly written numerals are accepted (IIII, VV, IC and VX are not):
 * anything else gives NaN.
 */
export function bigNumbersFromRoman(text: string): number {
  const s = text.trim().toUpperCase();
  if (!/^[IVXLCDM]+$/.test(s)) return Number.NaN;
  const value = (ch: string) => BIG_NUMBERS_ROMAN_SYMBOLS.find((r) => r.symbol === ch)!.value;
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const here = value(s[i]!);
    const next = i + 1 < s.length ? value(s[i + 1]!) : 0;
    total += here < next ? -here : here;
  }
  return bigNumbersToRoman(total) === s ? total : Number.NaN;
}

// ── Fractions, for the days ─────────────────────────────────────────────────

export function bigNumbersGcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y) [x, y] = [y, x % y];
  return x;
}

/** Every output finite, and no −0. */
function tidy(results: BigNumbersResults): BigNumbersResults {
  const out = { ...results } as Record<string, number>;
  for (const key of OUTPUTS) {
    const v = out[key]!;
    out[key] = Number.isFinite(v) ? v || 0 : 0;
  }
  return out as BigNumbersResults;
}

export const bigNumbersModel: SimulationModel<BigNumbersState, BigNumbersParams, BigNumbersResults> = {
  id: "bignumbers",
  defaultParams: {
    crores: 4,
    lakhs: 56,
    thousands: 78,
    ones: 912,
    place: 5,
    p: 5290,
    q: 17986,
    rThousands: 1,
    rHundreds: 9,
    rTens: 9,
    rOnes: 4,
    penPrice: 12,
    work: 60,
  },
  outputs: OUTPUTS,
  stateVariables: ["pens", "workers"],

  initialize() {
    return { pens: 5, workers: 6 };
  },

  /** Play adds a pen and a worker every second, up to the limits. */
  advance(state, dt) {
    const L = BIG_NUMBERS_LIMITS;
    return {
      pens: clamp(state.pens + PER_SECOND * dt, L.pens[0], L.pens[1]),
      workers: clamp(state.workers + PER_SECOND * dt, L.workers[0], L.workers[1]),
    };
  },

  step(state, _params, sign) {
    const L = BIG_NUMBERS_LIMITS;
    return {
      pens: whole(Math.floor(state.pens + 1e-9) + sign, L.pens),
      workers: whole(Math.floor(state.workers + 1e-9) + sign, L.workers),
    };
  },

  derive(state, params) {
    const L = BIG_NUMBERS_LIMITS;

    // Place value.
    const crores = whole(params.crores, L.crores);
    const lakhs = whole(params.lakhs, L.lakhs);
    const thousands = whole(params.thousands, L.thousands);
    const ones = whole(params.ones, L.ones);
    const number = crores * BIG_NUMBERS_CRORE + lakhs * BIG_NUMBERS_LAKH + thousands * BIG_NUMBERS_THOUSAND + ones;

    // Rounding.
    const place = whole(params.place, L.place);
    const roundUnit = 10 ** place;
    const roundLow = Math.floor(number / roundUnit) * roundUnit;
    const rounded = bigNumbersRound(number, roundUnit);

    // Estimating.
    const p = whole(params.p, L.factor);
    const q = whole(params.q, L.factor);
    const pRounded = bigNumbersRound(p, roundUnit);
    const qRounded = bigNumbersRound(q, roundUnit);
    const pGreatest = bigNumbersRoundGreatest(p);
    const qGreatest = bigNumbersRoundGreatest(q);

    // Roman numerals.
    const romanThousands = whole(params.rThousands, L.romanThousands);
    const romanHundreds = whole(params.rHundreds, L.romanDigit);
    const romanTens = whole(params.rTens, L.romanDigit);
    const romanOnes = whole(params.rOnes, L.romanDigit);
    const romanValue = romanThousands * 1000 + romanHundreds * 100 + romanTens * 10 + romanOnes;
    const pairs = [romanHundreds, romanTens, romanOnes].filter((d) => d === 4 || d === 9).length;

    // Direct proportion.
    const penPrice = whole(params.penPrice, L.penPrice);
    const pens = counted(state.pens, L.pens);
    const cost = penPrice * pens;

    // Inverse proportion.
    const work = whole(params.work, L.work);
    const workers = counted(state.workers, L.workers);
    const g = bigNumbersGcd(work, workers) || 1;
    const daysN = work / g;
    const daysD = workers / g;

    return tidy({
      number,
      crores,
      lakhs,
      thousands,
      ones,
      digits: bigNumbersDigitCount(number),
      millionsPeriod: Math.floor(number / BIG_NUMBERS_MILLION),
      thousandsIntl: Math.floor(number / BIG_NUMBERS_THOUSAND) % 1000,
      inLakhs: number / BIG_NUMBERS_LAKH,
      inMillions: number / BIG_NUMBERS_MILLION,
      inCrores: number / BIG_NUMBERS_CRORE,

      place,
      roundUnit,
      roundLow,
      roundHigh: roundLow + roundUnit,
      rounded,
      roundGap: Math.abs(rounded - number),
      roundedUp: rounded > number ? 1 : 0,

      p,
      q,
      pRounded,
      qRounded,
      sumExact: p + q,
      sumEstimate: pRounded + qRounded,
      sumGap: Math.abs(pRounded + qRounded - (p + q)),
      pGreatest,
      qGreatest,
      productExact: p * q,
      productEstimate: pGreatest * qGreatest,
      productGap: Math.abs(pGreatest * qGreatest - p * q),

      romanValue,
      romanThousands,
      romanHundreds,
      romanTens,
      romanOnes,
      romanSymbols: bigNumbersToRoman(romanValue).length,
      romanPairs: pairs,
      romanValid: romanValue >= 1 ? 1 : 0,

      penPrice,
      pens,
      cost,
      costPerPen: pens > 0 ? cost / pens : penPrice,

      work,
      workers,
      days: work / workers,
      daysN,
      daysD,
      daysWhole: daysD === 1 ? 1 : 0,
      // workers × (daysN ÷ daysD), worked in whole numbers: workers × daysN is a multiple of daysD.
      workerDays: (workers * daysN) / daysD,
    });
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof BigNumbersState] : undefined;
  },

  setVariable(state, id, value) {
    const L = BIG_NUMBERS_LIMITS;
    switch (id) {
      case "pens": return { ...state, pens: whole(value, L.pens) };
      case "workers": return { ...state, workers: whole(value, L.workers) };
      default: return state;
    }
  },
};
