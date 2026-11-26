import type { SimulationModel } from "@ise/science-engine";

/**
 * Ratios, percentages and powers, for classes 6 to 8.
 *
 * Ratio: share sweets in the ratio a : b. The total is cut into a + b equal
 * parts; one part is total ÷ (a + b), and each person gets their number of
 * parts. Two ratios a : b and c : d are in proportion when a × d = b × c
 * (product of extremes = product of means); the unitary method finds the
 * missing term, d = c × (b ÷ a).
 *
 * Percentage: per cent means "out of 100", shaded on a 10 × 10 grid. A
 * change of r % turns an amount P into P × (1 + r/100); a discount is a
 * negative change. Profit or loss per cent is always on the cost price.
 * Simple interest is SI = P × R × T ÷ 100; compound interest (class 8)
 * gives the amount A = P × (1 + R/100)ⁿ for n whole years.
 *
 * Powers: aᵐ is a multiplied by itself m times; a⁰ = 1 and a⁻ⁿ = 1/aⁿ. The
 * laws aᵐ × aⁿ = aᵐ⁺ⁿ, aᵐ ÷ aⁿ = aᵐ⁻ⁿ and (aᵐ)ⁿ = aᵐⁿ come from counting
 * the factors. Very large and very small numbers are written in standard
 * form, k × 10ⁿ with 1 ≤ k < 10. A number of tiles makes a square when it
 * is a perfect square; prime factors in pairs give its square root.
 *
 * Every output is a finite number; −0 is turned into 0.
 */

// ── Standard form: real sizes, from the NCERT class 8 chapter ──────────────

export interface RatioPowerThing {
  label: string;
  /** The significant digits, first digit before the point: "1496" is 1.496. */
  digits: string;
  /** The power of ten in standard form. */
  exponent: number;
  unit: string;
}

export type RatioPowerThingId = "sun" | "light" | "earth" | "plant-cell" | "blood-cell";
export const RATIO_POWER_THING_ORDER: readonly RatioPowerThingId[] = ["sun", "light", "earth", "plant-cell", "blood-cell"];

export const RATIO_POWER_THINGS: Record<RatioPowerThingId, RatioPowerThing> = {
  /** 149,600,000,000 m. */
  sun: { label: "Earth to the Sun", digits: "1496", exponent: 11, unit: "m" },
  /** 300,000,000 m/s. */
  light: { label: "Speed of light", digits: "3", exponent: 8, unit: "m/s" },
  /** 12,756,000 m. */
  earth: { label: "Width of the Earth", digits: "12756", exponent: 7, unit: "m" },
  /** 0.00001275 m. */
  "plant-cell": { label: "A plant cell", digits: "1275", exponent: -5, unit: "m" },
  /** 0.000007 m. */
  "blood-cell": { label: "A red blood cell", digits: "7", exponent: -6, unit: "m" },
};

/** k in k × 10ⁿ: "1496" → 1.496. */
export function ratioPowerMantissa(digits: string): number {
  return Number(`${digits[0] ?? "1"}.${digits.slice(1) || "0"}`);
}

// ── Limits of the controls ──────────────────────────────────────────────────

export const RATIO_POWER_LIMITS = {
  part: [1, 20],
  total: [0, 100],
  c: [1, 100],
  d: [1, 200],
  pct: [0, 100],
  price: [100, 20000],
  change: [-90, 100],
  sell: [0, 25000],
  rate: [1, 20],
  years: [0, 10],
  base: [1, 10],
  exponent: [-5, 8],
  se: [-8, 12],
  tiles: [1, 400],
} as const;

/** Play moves one year on every second. */
const YEARS_PER_SECOND = 1;

export type RatioPowerParams = {
  /** Parts for the first and second person (a : b), and the sweets shared. */
  a: number;
  b: number;
  total: number;
  /** The second ratio of the proportion a : b = c : d. */
  c: number;
  d: number;
  /** ₹: the cost price, marked price or principal. */
  price: number;
  /** Percentage change: + an increase, − a decrease or discount. */
  change: number;
  /** ₹: the selling price. */
  sell: number;
  /** Rate of interest, per cent per year. */
  rate: number;
  /** Powers: the base a and two powers m and n. */
  base: number;
  m: number;
  n: number;
  /** Which real size is written in standard form. */
  thing: RatioPowerThingId;
};

export interface RatioPowerState {
  /** Squares shaded on the 10 × 10 grid. */
  readonly pct: number;
  /** Whole years the money is lent for. */
  readonly years: number;
  /** The power of ten the learner writes. */
  readonly se: number;
  /** Square tiles to arrange. */
  readonly tiles: number;
}

export type RatioPowerResults = {
  a: number;
  b: number;
  total: number;
  parts: number;
  partSize: number;
  shareA: number;
  shareB: number;
  /** 1 when every share is a whole number of sweets. */
  fair: number;
  simpleA: number;
  simpleB: number;
  c: number;
  d: number;
  /** a × d and b × c. */
  extremes: number;
  means: number;
  /** 1 when a : b = c : d. */
  proportional: number;
  /** b ÷ a: how much of the second goes with one of the first. */
  unitValue: number;
  /** The d that makes a : b = c : d. */
  missingD: number;

  pct: number;
  pctDecimal: number;
  pctN: number;
  pctD: number;
  pctOfPrice: number;

  price: number;
  change: number;
  changeAmount: number;
  changed: number;
  sell: number;
  profit: number;
  profitPercent: number;
  /** 1 profit, −1 loss, 0 neither. */
  gain: number;

  rate: number;
  years: number;
  si: number;
  amountSI: number;
  amountCI: number;
  ci: number;
  /** How much more compound interest earns than simple. */
  ciMore: number;
  /** A ÷ P under compound interest. */
  ciGrowth: number;

  base: number;
  m: number;
  n: number;
  powerM: number;
  powerN: number;
  sumMN: number;
  product: number;
  diffMN: number;
  quotient: number;
  productMN: number;
  powerPower: number;

  thing: number;
  thingMantissa: number;
  thingExponent: number;
  thingValue: number;
  se: number;
  builtValue: number;
  /** 1 when the power written is the right one. */
  match: number;

  tiles: number;
  root: number;
  rootFloor: number;
  isPerfect: number;
  leftover: number;
  toNext: number;
  /** The smallest whole number to multiply the tiles by to make a perfect square, and that square's root. */
  multiplier: number;
  madeSquare: number;
  madeRoot: number;
};

const OUTPUTS = [
  "a", "b", "total", "parts", "partSize", "shareA", "shareB", "fair", "simpleA", "simpleB",
  "c", "d", "extremes", "means", "proportional", "unitValue", "missingD",
  "pct", "pctDecimal", "pctN", "pctD", "pctOfPrice",
  "price", "change", "changeAmount", "changed", "sell", "profit", "profitPercent", "gain",
  "rate", "years", "si", "amountSI", "amountCI", "ci", "ciMore", "ciGrowth",
  "base", "m", "n", "powerM", "powerN", "sumMN", "product", "diffMN", "quotient", "productMN", "powerPower",
  "thing", "thingMantissa", "thingExponent", "thingValue", "se", "builtValue", "match",
  "tiles", "root", "rootFloor", "isPerfect", "leftover", "toNext", "multiplier", "madeSquare", "madeRoot",
] as const satisfies readonly (keyof RatioPowerResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
const whole = (v: number, [lo, hi]: readonly [number, number]) => clamp(Math.round(v), lo, hi);
const within = (v: number, [lo, hi]: readonly [number, number]) => clamp(v, lo, hi);
/** Money and percentages to the paisa, so 0.1 + 0.2 shows as 0.3. */
const paise = (v: number) => Math.round(v * 100) / 100;

export function ratioPowerGcd(p: number, q: number): number {
  let x = Math.abs(Math.round(p));
  let y = Math.abs(Math.round(q));
  while (y) [x, y] = [y, x % y];
  return x;
}

/** Prime factors in ascending order: 72 → [2, 2, 2, 3, 3]. */
export function ratioPowerPrimeFactors(value: number): number[] {
  const factors: number[] = [];
  let rest = Math.abs(Math.round(value));
  for (let p = 2; p * p <= rest; p++) {
    while (rest % p === 0) {
      factors.push(p);
      rest /= p;
    }
  }
  if (rest > 1) factors.push(rest);
  return factors;
}

/** The product of the primes that appear an odd number of times: multiply by it to make a perfect square. */
export function ratioPowerSquareMaker(value: number): number {
  const counts = new Map<number, number>();
  for (const p of ratioPowerPrimeFactors(value)) counts.set(p, (counts.get(p) ?? 0) + 1);
  let maker = 1;
  for (const [p, k] of counts) if (k % 2 === 1) maker *= p;
  return maker;
}

export function ratioPowerFloorRoot(value: number): number {
  let r = Math.floor(Math.sqrt(Math.max(0, value)));
  while ((r + 1) * (r + 1) <= value) r++;
  while (r * r > value) r--;
  return r;
}

const thingOf = (params: RatioPowerParams): RatioPowerThingId => (RATIO_POWER_THING_ORDER.includes(params.thing) ? params.thing : "sun");

/** Every output finite, and no −0. */
function tidy(results: RatioPowerResults): RatioPowerResults {
  const out = { ...results } as Record<string, number>;
  for (const key of OUTPUTS) {
    const v = out[key]!;
    out[key] = Number.isFinite(v) ? v || 0 : 0;
  }
  return out as RatioPowerResults;
}

export const ratioPowerModel: SimulationModel<RatioPowerState, RatioPowerParams, RatioPowerResults> = {
  id: "ratiopower",
  defaultParams: { a: 2, b: 3, total: 20, c: 4, d: 6, price: 500, change: 20, sell: 600, rate: 10, base: 2, m: 3, n: 2, thing: "sun" },
  outputs: OUTPUTS,
  stateVariables: ["pct", "years", "se", "tiles"],

  initialize() {
    return { pct: 35, years: 2, se: 0, tiles: 36 };
  },

  /** Play lets the years go by, up to 10. */
  advance(state, dt) {
    return { ...state, years: within(state.years + YEARS_PER_SECOND * dt, RATIO_POWER_LIMITS.years) };
  },

  step(state, _params, sign) {
    return { ...state, years: whole(Math.floor(state.years) + sign, RATIO_POWER_LIMITS.years) };
  },

  derive(state, params) {
    const L = RATIO_POWER_LIMITS;

    // Ratio and proportion.
    const a = whole(params.a, L.part);
    const b = whole(params.b, L.part);
    const total = whole(params.total, L.total);
    const parts = a + b;
    const partSize = total / parts;
    const g = ratioPowerGcd(a, b) || 1;
    const c = whole(params.c, L.c);
    const d = whole(params.d, L.d);
    const extremes = a * d;
    const means = b * c;

    // Percentages and money.
    const pct = whole(state.pct, L.pct);
    const pg = ratioPowerGcd(pct, 100) || 100;
    const price = within(params.price, L.price);
    const change = within(params.change, L.change);
    const sell = within(params.sell, L.sell);
    const profit = paise(sell - price);
    const rate = within(params.rate, L.rate);
    const years = clamp(Math.floor(state.years + 1e-9), L.years[0], L.years[1]);
    const si = paise((price * rate * years) / 100);
    const amountCI = paise(price * (1 + rate / 100) ** years);
    const ci = paise(amountCI - price);

    // Powers.
    const base = whole(params.base, L.base);
    const m = whole(params.m, L.exponent);
    const n = whole(params.n, L.exponent);

    // Standard form.
    const thingId = thingOf(params);
    const thing = RATIO_POWER_THINGS[thingId];
    const mantissa = ratioPowerMantissa(thing.digits);
    const se = whole(state.se, L.se);

    // Squares.
    const tiles = whole(state.tiles, L.tiles);
    const rootFloor = ratioPowerFloorRoot(tiles);
    const multiplier = ratioPowerSquareMaker(tiles);
    const madeSquare = tiles * multiplier;

    return tidy({
      a,
      b,
      total,
      parts,
      partSize,
      shareA: partSize * a,
      shareB: partSize * b,
      fair: total % parts === 0 ? 1 : 0,
      simpleA: a / g,
      simpleB: b / g,
      c,
      d,
      extremes,
      means,
      proportional: extremes === means ? 1 : 0,
      unitValue: b / a,
      missingD: (b * c) / a,

      pct,
      pctDecimal: pct / 100,
      pctN: pct === 0 ? 0 : pct / pg,
      pctD: pct === 0 ? 1 : 100 / pg,
      pctOfPrice: paise((pct / 100) * price),

      price,
      change,
      changeAmount: paise((price * change) / 100),
      changed: paise(price * (1 + change / 100)),
      sell,
      profit,
      profitPercent: paise((profit / price) * 100),
      gain: Math.sign(profit),

      rate,
      years,
      si,
      amountSI: paise(price + si),
      amountCI,
      ci,
      ciMore: paise(ci - si),
      ciGrowth: amountCI / price,

      base,
      m,
      n,
      powerM: base ** m,
      powerN: base ** n,
      sumMN: m + n,
      product: base ** (m + n),
      diffMN: m - n,
      quotient: base ** (m - n),
      productMN: m * n,
      powerPower: base ** (m * n),

      thing: RATIO_POWER_THING_ORDER.indexOf(thingId),
      thingMantissa: mantissa,
      thingExponent: thing.exponent,
      thingValue: mantissa * 10 ** thing.exponent,
      se,
      builtValue: mantissa * 10 ** se,
      match: se === thing.exponent ? 1 : 0,

      tiles,
      root: Math.sqrt(tiles),
      rootFloor,
      isPerfect: rootFloor * rootFloor === tiles ? 1 : 0,
      leftover: tiles - rootFloor * rootFloor,
      toNext: (rootFloor + 1) ** 2 - tiles,
      multiplier,
      madeSquare,
      madeRoot: ratioPowerFloorRoot(madeSquare),
    });
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof RatioPowerState] : undefined;
  },

  setVariable(state, id, value) {
    const L = RATIO_POWER_LIMITS;
    switch (id) {
      case "pct": return { ...state, pct: whole(value, L.pct) };
      case "years": return { ...state, years: whole(value, L.years) };
      case "se": return { ...state, se: whole(value, L.se) };
      case "tiles": return { ...state, tiles: whole(value, L.tiles) };
      default: return state;
    }
  },
};
