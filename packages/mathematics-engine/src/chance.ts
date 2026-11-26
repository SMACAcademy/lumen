import type { SimulationModel } from "@ise/science-engine";

/**
 * Data and chance for classes 6 to 10.
 *
 * Tally: a class answers one question (favourite fruit, shoe size, how they
 * come to school). The answers are counted one by one into tally marks,
 * in groups of five, and the totals make a frequency table.
 *
 * Pictures and bars: the same counts as a pictograph, where one picture
 * stands for several students (the key), and as a bar graph whose grid
 * lines go up in steps of the same size (the scale).
 *
 * Chance words: an event sits on a line from impossible (0) to certain (1).
 *
 * Experiment: a coin is tossed, or a die rolled, many times. The share of
 * heads (or sixes) is the experimental probability; it wanders at first and
 * settles near the theoretical value as the trials pile up. The tosses come
 * from a seeded generator, so the same number of trials always gives the
 * same counts.
 *
 * Theory: when all outcomes are equally likely, P(E) = favourable ÷ all.
 * A ball from a bag, a card from a deck of 52, a number on a die.
 */

// ── Surveys ──────────────────────────────────────────────────────────────────

export interface ChanceSurvey {
  label: string;
  /** What each student was asked. */
  question: string;
  /** Who answered, e.g. "students". */
  unit: string;
  categories: readonly string[];
  /** A short code for each category, as written in the raw list. */
  short: readonly string[];
  /** The final count of each category. */
  counts: readonly number[];
  /** The order the answers came in. */
  order: readonly number[];
}

export type ChanceSurveyId = "fruits" | "shoes" | "travel";
export const CHANCE_SURVEY_ORDER: readonly ChanceSurveyId[] = ["fruits", "shoes", "travel"];

/** A small seeded generator (mulberry32), so every answer list and every run of tosses can be replayed exactly. */
function chanceGenerator(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Every answer, category by category, then shuffled into the order the class gave them. */
function answerOrder(counts: readonly number[], seed: number): number[] {
  const list = counts.flatMap((c, i) => Array.from({ length: c }, () => i));
  const random = chanceGenerator(seed);
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j]!, list[i]!];
  }
  return list;
}

const survey = (s: Omit<ChanceSurvey, "order">, seed: number): ChanceSurvey => ({ ...s, order: answerOrder(s.counts, seed) });

export const CHANCE_SURVEYS: Record<ChanceSurveyId, ChanceSurvey> = {
  fruits: survey(
    {
      label: "Favourite fruits of 40 students",
      question: "Which fruit do you like best?",
      unit: "students",
      categories: ["Mango", "Banana", "Apple", "Orange", "Grapes"],
      short: ["M", "B", "A", "O", "G"],
      counts: [12, 8, 6, 10, 4],
    },
    11,
  ),
  shoes: survey(
    {
      label: "Shoe sizes of 30 students",
      question: "What is your shoe size?",
      unit: "students",
      categories: ["Size 3", "Size 4", "Size 5", "Size 6", "Size 7"],
      short: ["3", "4", "5", "6", "7"],
      counts: [4, 7, 10, 6, 3],
    },
    23,
  ),
  travel: survey(
    {
      label: "How 75 students come to school",
      question: "How do you come to school?",
      unit: "students",
      categories: ["Walk", "Bus", "Cycle", "Car", "Auto"],
      short: ["Wa", "Bu", "Cy", "Ca", "Au"],
      counts: [15, 25, 10, 5, 20],
    },
    37,
  ),
};

/** The largest class; the counting control runs this far. */
export const CHANCE_SURVEY_MAX = 75;
/** Answers counted per second while playing. */
export const CHANCE_COUNT_RATE = 4;
export const CHANCE_KEY_MAX = 10;

// ── Chance words ─────────────────────────────────────────────────────────────

export interface ChanceEvent {
  label: string;
  favourable: number;
  possible: number;
}

export type ChanceEventId =
  | "sun-east"
  | "seven"
  | "six"
  | "head"
  | "not-six"
  | "under-seven"
  | "red-card"
  | "ace"
  | "not-ace"
  | "sunday"
  | "not-sunday"
  | "month-32";

export const CHANCE_EVENT_ORDER: readonly ChanceEventId[] = [
  "sun-east", "seven", "six", "head", "not-six", "under-seven", "red-card", "ace", "not-ace", "sunday", "not-sunday", "month-32",
];

/** Each event with its chance as an exact fraction. A die is an ordinary one, faces 1 to 6; a deck has 52 cards. */
export const CHANCE_EVENTS: Record<ChanceEventId, ChanceEvent> = {
  "sun-east": { label: "The sun rises in the east tomorrow", favourable: 1, possible: 1 },
  seven: { label: "A die shows 7", favourable: 0, possible: 6 },
  six: { label: "A die shows 6", favourable: 1, possible: 6 },
  head: { label: "A coin shows heads", favourable: 1, possible: 2 },
  "not-six": { label: "A die does not show 6", favourable: 5, possible: 6 },
  "under-seven": { label: "A die shows a number less than 7", favourable: 6, possible: 6 },
  "red-card": { label: "A card from a deck is red", favourable: 26, possible: 52 },
  ace: { label: "A card from a deck is an ace", favourable: 4, possible: 52 },
  "not-ace": { label: "A card from a deck is not an ace", favourable: 48, possible: 52 },
  sunday: { label: "A day picked from a week is a Sunday", favourable: 1, possible: 7 },
  "not-sunday": { label: "A day picked from a week is not a Sunday", favourable: 6, possible: 7 },
  "month-32": { label: "A month has 32 days", favourable: 0, possible: 1 },
};

/** 0 impossible, 1 unlikely, 2 even chance, 3 likely, 4 certain. */
export function chanceLikelihood(favourable: number, possible: number): number {
  if (possible <= 0 || favourable <= 0) return 0;
  if (favourable >= possible) return 4;
  if (2 * favourable === possible) return 2;
  return 2 * favourable < possible ? 1 : 3;
}

// ── Experiment ───────────────────────────────────────────────────────────────

export interface ChanceExperiment {
  label: string;
  /** The faces that can come up. */
  faces: readonly string[];
  /** Which face counts as a hit, and its name. */
  hit: number;
  hitName: string;
  seed: number;
}

export type ChanceExperimentId = "coin" | "die";
export const CHANCE_EXPERIMENT_ORDER: readonly ChanceExperimentId[] = ["coin", "die"];
export const CHANCE_EXPERIMENTS: Record<ChanceExperimentId, ChanceExperiment> = {
  coin: { label: "Tossing a coin", faces: ["H", "T"], hit: 0, hitName: "heads", seed: 283 },
  die: { label: "Rolling a die", faces: ["1", "2", "3", "4", "5", "6"], hit: 5, hitName: "sixes", seed: 70 },
};

export const CHANCE_TRIALS_MAX = 1000;
/** Trials per second while playing. */
export const CHANCE_TRIAL_RATE = 50;

const outcomeCache = new Map<ChanceExperimentId, number[]>();

/** The face of every trial, 0-based, for the whole run of CHANCE_TRIALS_MAX. The first n trials of a longer run are the same as a run of n. */
export function chanceOutcomes(id: ChanceExperimentId): readonly number[] {
  const cached = outcomeCache.get(id);
  if (cached) return cached;
  const experiment = CHANCE_EXPERIMENTS[id];
  const random = chanceGenerator(experiment.seed);
  const n = experiment.faces.length;
  const list = Array.from({ length: CHANCE_TRIALS_MAX }, () => Math.min(n - 1, Math.floor(random() * n)));
  outcomeCache.set(id, list);
  return list;
}

/** How many times each face came up in the first `trials` trials. */
export function chanceFaceCounts(id: ChanceExperimentId, trials: number): number[] {
  const experiment = CHANCE_EXPERIMENTS[id];
  const counts = experiment.faces.map(() => 0);
  const outcomes = chanceOutcomes(id);
  const n = Math.max(0, Math.min(CHANCE_TRIALS_MAX, Math.floor(trials)));
  for (let i = 0; i < n; i++) counts[outcomes[i]!]! += 1;
  return counts;
}

// ── Theory ───────────────────────────────────────────────────────────────────

export interface ChanceTheoryEvent {
  label: string;
  /** Where the outcome comes from. */
  source: "bag" | "cards" | "die";
  /** For the bag, the colour wanted; for cards and the die, which outcomes count. */
  colour?: "red" | "blue" | "green";
  fits?: (outcome: number) => boolean;
}

/** Suits in the deck's order; hearts and diamonds are red. Ranks run A, 2 … 10, J, Q, K. */
export const CHANCE_SUITS = ["♠", "♥", "♦", "♣"] as const;
export const CHANCE_RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;
const suitOf = (card: number) => Math.floor(card / 13);
const rankOf = (card: number) => card % 13;

export type ChanceTheoryId =
  | "bag-red"
  | "bag-blue"
  | "bag-green"
  | "card-red"
  | "card-heart"
  | "card-king"
  | "card-face"
  | "card-ace-spades"
  | "die-even"
  | "die-prime"
  | "die-over-4";

export const CHANCE_THEORY_ORDER: readonly ChanceTheoryId[] = [
  "bag-red", "bag-blue", "bag-green", "card-red", "card-heart", "card-king", "card-face", "card-ace-spades", "die-even", "die-prime", "die-over-4",
];

/** Die outcomes are 0-based: outcome k is the face k + 1. */
export const CHANCE_THEORY: Record<ChanceTheoryId, ChanceTheoryEvent> = {
  "bag-red": { label: "A red ball from the bag", source: "bag", colour: "red" },
  "bag-blue": { label: "A blue ball from the bag", source: "bag", colour: "blue" },
  "bag-green": { label: "A green ball from the bag", source: "bag", colour: "green" },
  "card-red": { label: "A red card", source: "cards", fits: (c) => suitOf(c) === 1 || suitOf(c) === 2 },
  "card-heart": { label: "A heart", source: "cards", fits: (c) => suitOf(c) === 1 },
  "card-king": { label: "A king", source: "cards", fits: (c) => rankOf(c) === 12 },
  "card-face": { label: "A face card (J, Q or K)", source: "cards", fits: (c) => rankOf(c) >= 10 },
  "card-ace-spades": { label: "The ace of spades", source: "cards", fits: (c) => c === 0 },
  "die-even": { label: "An even number on a die", source: "die", fits: (k) => (k + 1) % 2 === 0 },
  "die-prime": { label: "A prime number on a die", source: "die", fits: (k) => [2, 3, 5].includes(k + 1) },
  "die-over-4": { label: "A number more than 4 on a die", source: "die", fits: (k) => k + 1 > 4 },
};

export const CHANCE_BALLS_MAX = 10;

// ── The model ────────────────────────────────────────────────────────────────

export type ChanceParams = { survey: ChanceSurveyId; event: ChanceEventId; experiment: ChanceExperimentId; theory: ChanceTheoryId };

export interface ChanceState {
  /** How many answers have been counted into the tally. */
  readonly counted: number;
  /** The row being read, 1 to 5. */
  readonly row: number;
  /** How many students one picture (or one grid step) stands for. */
  readonly key: number;
  readonly trials: number;
  /** Balls in the bag. */
  readonly red: number;
  readonly blue: number;
  readonly green: number;
}

export type ChanceResults = {
  survey: number;
  total: number;
  counted: number;
  done: number;
  c1: number;
  c2: number;
  c3: number;
  c4: number;
  c5: number;
  row: number;
  rowCount: number;
  /** Complete groups of five in the row's tally, and the strokes left over. */
  rowGroups: number;
  rowLeft: number;
  /** The row with the most answers so far (the first, on a tie); 0 before any are counted. */
  mostRow: number;
  mostCount: number;
  leastCount: number;
  /** How many more chose the most popular answer than the least popular. */
  difference: number;
  key: number;
  /** Pictures in the row being read: its count ÷ the key. */
  rowPictures: number;
  /** 1 when every row is a whole number of pictures. */
  allWhole: number;
  /** The top of the bar graph's scale: the first multiple of the key at or above the largest count. */
  scaleTop: number;
  event: number;
  eventChance: number;
  likelihood: number;
  experiment: number;
  trials: number;
  hits: number;
  experimental: number;
  theoretical: number;
  /** How far the experiment is from the theory. */
  gap: number;
  theory: number;
  /** 0 bag, 1 cards, 2 die. */
  source: number;
  red: number;
  blue: number;
  green: number;
  favourable: number;
  possible: number;
  notFavourable: number;
  pEvent: number;
  pNot: number;
  /** 1 when the bag is empty, so nothing can be drawn. */
  empty: number;
};

const OUTPUTS = [
  "survey", "total", "counted", "done", "c1", "c2", "c3", "c4", "c5", "row", "rowCount", "rowGroups", "rowLeft", "mostRow", "mostCount", "leastCount", "difference",
  "key", "rowPictures", "allWhole", "scaleTop",
  "event", "eventChance", "likelihood",
  "experiment", "trials", "hits", "experimental", "theoretical", "gap",
  "theory", "source", "red", "blue", "green", "favourable", "possible", "notFavourable", "pEvent", "pNot", "empty",
] as const satisfies readonly (keyof ChanceResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const whole = (v: number, lo: number, hi: number) => clamp(Math.round(Number.isFinite(v) ? v : lo), lo, hi);

const pick = <T extends string>(order: readonly T[], value: unknown, fallback: T): T => (order.includes(value as T) ? (value as T) : fallback);
const surveyOf = (p: ChanceParams) => pick(CHANCE_SURVEY_ORDER, p.survey, "fruits");
const eventOf = (p: ChanceParams) => pick(CHANCE_EVENT_ORDER, p.event, "head");
const experimentOf = (p: ChanceParams) => pick(CHANCE_EXPERIMENT_ORDER, p.experiment, "coin");
const theoryOf = (p: ChanceParams) => pick(CHANCE_THEORY_ORDER, p.theory, "bag-red");

/** The counts of each category among the first `counted` answers. */
export function chanceTallyCounts(id: ChanceSurveyId, counted: number): number[] {
  const s = CHANCE_SURVEYS[id];
  const counts = s.categories.map(() => 0);
  const n = whole(counted, 0, s.order.length);
  for (let i = 0; i < n; i++) counts[s.order[i]!]! += 1;
  return counts;
}

/** Favourable and possible outcomes of a theory event, given the bag's balls. */
export function chanceTheoryCount(id: ChanceTheoryId, bag: { red: number; blue: number; green: number }): { favourable: number; possible: number } {
  const e = CHANCE_THEORY[id];
  if (e.source === "bag") return { favourable: bag[e.colour ?? "red"], possible: bag.red + bag.blue + bag.green };
  const possible = e.source === "cards" ? 52 : 6;
  let favourable = 0;
  for (let k = 0; k < possible; k++) if (e.fits?.(k)) favourable++;
  return { favourable, possible };
}

export const chanceModel: SimulationModel<ChanceState, ChanceParams, ChanceResults> = {
  id: "chance",
  defaultParams: { survey: "fruits", event: "head", experiment: "coin", theory: "bag-red" },
  outputs: OUTPUTS,
  stateVariables: ["counted", "row", "key", "trials", "red", "blue", "green"],

  initialize() {
    return { counted: 0, row: 1, key: 1, trials: 0, red: 3, blue: 5, green: 2 };
  },

  /** Play counts the answers into the tally and runs the experiment on, each up to its end. */
  advance(state, dt) {
    return {
      ...state,
      counted: clamp(state.counted + CHANCE_COUNT_RATE * dt, 0, CHANCE_SURVEY_MAX),
      trials: clamp(state.trials + CHANCE_TRIAL_RATE * dt, 0, CHANCE_TRIALS_MAX),
    };
  },

  step(state, _params, sign) {
    return {
      ...state,
      counted: whole(state.counted + sign, 0, CHANCE_SURVEY_MAX),
      trials: clamp(Math.round(state.trials / 10) * 10 + 10 * sign, 0, CHANCE_TRIALS_MAX),
    };
  },

  derive(state, params) {
    const surveyId = surveyOf(params);
    const s = CHANCE_SURVEYS[surveyId];
    const total = s.order.length;
    const counted = whole(state.counted, 0, total);
    const counts = chanceTallyCounts(surveyId, counted);
    const row = whole(state.row, 1, 5);
    const rowCount = counts[row - 1] ?? 0;
    const mostCount = Math.max(...counts);
    const leastCount = Math.min(...counts);
    const key = whole(state.key, 1, CHANCE_KEY_MAX);

    const eventId = eventOf(params);
    const event = CHANCE_EVENTS[eventId];

    const experimentId = experimentOf(params);
    const experiment = CHANCE_EXPERIMENTS[experimentId];
    const trials = whole(Math.floor(state.trials), 0, CHANCE_TRIALS_MAX);
    const hits = chanceFaceCounts(experimentId, trials)[experiment.hit] ?? 0;
    const experimental = trials > 0 ? hits / trials : 0;
    const theoretical = 1 / experiment.faces.length;

    const theoryId = theoryOf(params);
    const bag = { red: whole(state.red, 0, CHANCE_BALLS_MAX), blue: whole(state.blue, 0, CHANCE_BALLS_MAX), green: whole(state.green, 0, CHANCE_BALLS_MAX) };
    const { favourable, possible } = chanceTheoryCount(theoryId, bag);
    const pEvent = possible > 0 ? favourable / possible : 0;
    const source = CHANCE_THEORY[theoryId].source;

    return {
      survey: CHANCE_SURVEY_ORDER.indexOf(surveyId),
      total,
      counted,
      done: counted === total ? 1 : 0,
      c1: counts[0]!,
      c2: counts[1]!,
      c3: counts[2]!,
      c4: counts[3]!,
      c5: counts[4]!,
      row,
      rowCount,
      rowGroups: Math.floor(rowCount / 5),
      rowLeft: rowCount % 5,
      mostRow: counted > 0 ? counts.indexOf(mostCount) + 1 : 0,
      mostCount,
      leastCount,
      difference: mostCount - leastCount,
      key,
      rowPictures: rowCount / key,
      allWhole: counts.every((c) => c % key === 0) ? 1 : 0,
      scaleTop: Math.max(key, Math.ceil(mostCount / key) * key),
      event: CHANCE_EVENT_ORDER.indexOf(eventId),
      eventChance: event.possible > 0 ? event.favourable / event.possible : 0,
      likelihood: chanceLikelihood(event.favourable, event.possible),
      experiment: CHANCE_EXPERIMENT_ORDER.indexOf(experimentId),
      trials,
      hits,
      experimental,
      theoretical,
      gap: trials > 0 ? Math.abs(experimental - theoretical) : theoretical,
      theory: CHANCE_THEORY_ORDER.indexOf(theoryId),
      source: source === "bag" ? 0 : source === "cards" ? 1 : 2,
      red: bag.red,
      blue: bag.blue,
      green: bag.green,
      favourable,
      possible,
      notFavourable: possible - favourable,
      pEvent,
      pNot: possible > 0 ? 1 - pEvent || 0 : 0,
      empty: possible > 0 ? 0 : 1,
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof ChanceState] : undefined;
  },

  setVariable(state, id, value) {
    switch (id) {
      case "counted": return { ...state, counted: clamp(value, 0, CHANCE_SURVEY_MAX) };
      case "row": return { ...state, row: whole(value, 1, 5) };
      case "key": return { ...state, key: whole(value, 1, CHANCE_KEY_MAX) };
      case "trials": return { ...state, trials: clamp(value, 0, CHANCE_TRIALS_MAX) };
      case "red": return { ...state, red: whole(value, 0, CHANCE_BALLS_MAX) };
      case "blue": return { ...state, blue: whole(value, 0, CHANCE_BALLS_MAX) };
      case "green": return { ...state, green: whole(value, 0, CHANCE_BALLS_MAX) };
      default: return state;
    }
  },
};
