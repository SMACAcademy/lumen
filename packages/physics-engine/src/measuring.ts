import type { SimulationModel } from "@ise/science-engine";

/**
 * Measuring and moving, for classes 6 and 7.
 *
 * Five small benches share one model:
 *
 * - Units: a desk is measured in hand spans, foot lengths or cubits, by a
 *   child and by the teacher. Their hands are different sizes, so they get
 *   different numbers — but with a centimetre scale everyone gets the same.
 *   length = number of units × size of one unit.
 * - Ruler: a crayon (or a thread taken off a curved line) lies on a 15 cm
 *   ruler from some start mark. Its length is the far mark minus the near
 *   mark, read with the eye straight above the end. Looking from the side
 *   shifts the reading by 2 mm (a simplification: the marks are taken to be
 *   2 mm above the crayon's end and the eye at 45°).
 * - Motion: things moving in a straight line, round a circle, to and fro, or
 *   spinning on the spot.
 * - Pendulum: a bob on a string. One oscillation takes T = 2π√(L/g), with
 *   g = 9.8 m/s² — for small swings, whatever the bob's mass. The formula is
 *   used here, not taught: learners time 10 oscillations and divide by 10.
 * - Speed: distance ÷ time, in m/s and km/h (1 m/s = 3.6 km/h).
 */

// ── Units ────────────────────────────────────────────────────────────────────

export type MeasuringItem = "pencil" | "book" | "desk" | "blackboard" | "ribbon";

export const MEASURING_ITEM_ORDER: readonly MeasuringItem[] = ["pencil", "book", "desk", "blackboard", "ribbon"];

/** What is measured, and how long it really is, cm. The ribbon's length is set by the learner. */
export const MEASURING_ITEMS: Record<MeasuringItem, { label: string; length: number }> = {
  pencil: { label: "pencil", length: 18 },
  book: { label: "book", length: 30 },
  desk: { label: "desk", length: 120 },
  blackboard: { label: "blackboard", length: 240 },
  ribbon: { label: "ribbon", length: 0 },
};

/**
 * The units, by index: 0 hand span, 1 foot length, 2 cubit, 3 centimetre
 * scale. Sizes are rounded, typical ones, cm: a child's and the teacher's.
 */
export const MEASURING_UNITS: readonly { label: string; plural: string; child: number; teacher: number }[] = [
  { label: "hand span", plural: "hand spans", child: 15, teacher: 20 },
  { label: "foot length", plural: "foot lengths", child: 20, teacher: 24 },
  { label: "cubit", plural: "cubits", child: 40, teacher: 48 },
  { label: "centimetre", plural: "cm", child: 1, teacher: 1 },
];

/** Index of the centimetre scale in MEASURING_UNITS. */
export const MEASURING_SCALE_UNIT = 3;
/** The school scale laid down one length at a time, cm. */
export const MEASURING_SCALE_LENGTH = 30;
/** Time to lay down one span, foot, cubit or scale length, s. */
export const MEASURING_LAY_TIME = 0.5;
export const MEASURING_MEASURERS: readonly string[] = ["a child", "the teacher"];

// ── Ruler ────────────────────────────────────────────────────────────────────

export type MeasuringShape = "straight" | "curved";
export const MEASURING_SHAPE_ORDER: readonly MeasuringShape[] = ["straight", "curved"];
/** The ruler, cm. */
export const MEASURING_RULER_LENGTH = 15;
/** How far the reading shifts when the eye looks from the side, cm. */
export const MEASURING_PARALLAX = 0.2;
/** How far apart the two ends of the curved line are, cm. */
export const MEASURING_CURVE_GAP = 8;

// ── Motion ───────────────────────────────────────────────────────────────────

export type MeasuringMover = "train" | "apple" | "march" | "merry" | "clock" | "swing" | "pendulum" | "needle" | "top" | "wheel";

export const MEASURING_MOVER_ORDER: readonly MeasuringMover[] = ["train", "apple", "march", "merry", "clock", "swing", "pendulum", "needle", "top", "wheel"];

/** Kinds of motion: 0 straight line, 1 round a circle, 2 to and fro, 3 spinning on the spot. */
export const MEASURING_MOTION_KINDS: readonly string[] = ["straight-line", "circular", "to-and-fro", "spinning"];

export const MEASURING_MOVERS: Record<MeasuringMover, { label: string; kind: number }> = {
  train: { label: "A train on a straight track", kind: 0 },
  apple: { label: "An apple falling from a tree", kind: 0 },
  march: { label: "Children in a march-past", kind: 0 },
  merry: { label: "A child on a merry-go-round", kind: 1 },
  clock: { label: "The tip of a clock's hand", kind: 1 },
  swing: { label: "A child on a swing", kind: 2 },
  pendulum: { label: "A pendulum", kind: 2 },
  needle: { label: "A sewing-machine needle", kind: 2 },
  top: { label: "A spinning top", kind: 3 },
  wheel: { label: "A potter's wheel", kind: 3 },
};

// ── Pendulum and speed ───────────────────────────────────────────────────────

/** Acceleration due to gravity, m/s². */
export const MEASURING_G = 9.8;
/** Oscillations timed with the stopwatch. */
export const MEASURING_COUNT = 10;
const DEG = Math.PI / 180;
export const MEASURING_MIN_SWING = 2 * DEG;
export const MEASURING_MAX_SWING = 20 * DEG;
/** The clock stops here, s. */
export const MEASURING_MAX_T = 3600;

const LIMITS = {
  ribbon: [10, 300],
  size: [2, 12],
  start: [0, 3],
  bend: [0, 2],
  pendulumLength: [10, 200],
  distance: [10, 1000],
  tripTime: [5, 300],
  t: [0, MEASURING_MAX_T],
} as const;

export type MeasuringParams = {
  item: MeasuringItem;
  /** 0 hand span, 1 foot length, 2 cubit, 3 centimetre scale. */
  unit: number;
  /** 0 a child, 1 the teacher. */
  measurer: number;
  /** −1 eye to the left, 0 straight above, 1 to the right. */
  eye: number;
  shape: MeasuringShape;
  mover: MeasuringMover;
  /** Mass of the bob, g. */
  bobMass: number;
  /** How far the bob is pulled aside, rad. */
  swing: number;
};

export interface MeasuringState {
  /** Length of the ribbon, cm. */
  readonly ribbon: number;
  /** Length of the crayon on the ruler, cm. */
  readonly size: number;
  /** The ruler mark the crayon (or thread) starts at, cm. */
  readonly start: number;
  /** How high the curved line waves, cm. */
  readonly bend: number;
  /** Length of the pendulum's string, cm. */
  readonly pendulumLength: number;
  /** Length of the trip, m. */
  readonly distance: number;
  /** Time for the trip, s. */
  readonly tripTime: number;
  /** Clock, s. */
  readonly t: number;
}

export type MeasuringResults = {
  item: number;
  unit: number;
  measurer: number;
  objectLength: number;
  unitLength: number;
  count: number;
  childCount: number;
  teacherCount: number;
  agree: number;
  objectM: number;
  objectMm: number;
  laid: number;
  done: number;
  shape: number;
  eye: number;
  startMark: number;
  trueLength: number;
  endMark: number;
  seenEnd: number;
  reading: number;
  readingError: number;
  misread: number;
  trueMm: number;
  bend: number;
  gap: number;
  mover: number;
  motionKind: number;
  repeats: number;
  pendulumLength: number;
  bobMass: number;
  swing: number;
  period: number;
  tenSwings: number;
  oscillations: number;
  bobAngle: number;
  perMinute: number;
  distance: number;
  tripTime: number;
  speed: number;
  speedKmh: number;
  carAt: number;
  arrived: number;
  t: number;
};

const clampTo = (key: keyof typeof LIMITS, value: number) => {
  const [lo, hi] = LIMITS[key];
  return Number.isFinite(value) ? Math.min(hi, Math.max(lo, value)) : lo;
};
const round1 = (x: number) => Math.round(x * 10) / 10 || 0;

/** The size of one unit, cm, for a measurer (0 child, 1 teacher). */
export function measuringUnitSize(unit: number, measurer: number): number {
  const u = MEASURING_UNITS[Math.round(unit)] ?? MEASURING_UNITS[0]!;
  return Math.round(measurer) === 1 ? u.teacher : u.child;
}

/** Length of the curved line y = b sin(2πx / gap), from end to end, cm (Simpson's rule). */
export function measuringCurveLength(bend: number, gap = MEASURING_CURVE_GAP): number {
  const n = 600;
  const h = gap / n;
  const k = (2 * Math.PI) / gap;
  const f = (x: number) => Math.sqrt(1 + (bend * k * Math.cos(k * x)) ** 2);
  let sum = f(0) + f(gap);
  for (let i = 1; i < n; i++) sum += (i % 2 === 1 ? 4 : 2) * f(i * h);
  return (sum * h) / 3;
}

/** Time for one oscillation of a pendulum `lengthCm` long, s. */
export function measuringPeriod(lengthCm: number): number {
  return 2 * Math.PI * Math.sqrt(lengthCm / 100 / MEASURING_G);
}

const OUTPUTS = [
  "item", "unit", "measurer", "objectLength", "unitLength", "count", "childCount", "teacherCount", "agree", "objectM", "objectMm", "laid", "done",
  "shape", "eye", "startMark", "trueLength", "endMark", "seenEnd", "reading", "readingError", "misread", "trueMm", "bend", "gap",
  "mover", "motionKind", "repeats",
  "pendulumLength", "bobMass", "swing", "period", "tenSwings", "oscillations", "bobAngle", "perMinute",
  "distance", "tripTime", "speed", "speedKmh", "carAt", "arrived", "t",
] as const satisfies readonly (keyof MeasuringResults)[];

export const measuringModel: SimulationModel<MeasuringState, MeasuringParams, MeasuringResults> = {
  id: "measuring",
  defaultParams: { item: "desk", unit: 0, measurer: 0, eye: 0, shape: "straight", mover: "train", bobMass: 50, swing: 10 * DEG },
  outputs: OUTPUTS,
  stateVariables: ["ribbon", "size", "start", "bend", "pendulumLength", "distance", "tripTime", "t"],

  initialize() {
    return { ribbon: 60, size: 7.5, start: 0, bend: 1, pendulumLength: 100, distance: 100, tripTime: 20, t: 0 };
  },

  advance(state, dt) {
    return { ...state, t: clampTo("t", state.t + dt) };
  },

  /** Step the clock by half a second. */
  step(state, _params, sign) {
    return { ...state, t: clampTo("t", Math.round(state.t * 2) / 2 + 0.5 * sign) };
  },

  derive(state, params) {
    // Units
    const itemKey = MEASURING_ITEMS[params.item] ? params.item : "desk";
    const objectLength = itemKey === "ribbon" ? clampTo("ribbon", state.ribbon) : MEASURING_ITEMS[itemKey].length;
    const unit = Math.min(3, Math.max(0, Math.round(params.unit) || 0));
    const measurer = Math.round(params.measurer) === 1 ? 1 : 0;
    const unitLength = measuringUnitSize(unit, measurer);
    const count = objectLength / unitLength;
    const childCount = objectLength / measuringUnitSize(unit, 0);
    const teacherCount = objectLength / measuringUnitSize(unit, 1);
    const t = clampTo("t", state.t);
    const isScale = unit === MEASURING_SCALE_UNIT;
    // A body unit is laid down one at a time; the scale 30 cm at a time.
    const perPlacement = isScale ? MEASURING_SCALE_LENGTH : 1;
    const placements = Math.ceil(count / perPlacement - 1e-9);
    const laid = Math.min(count, Math.floor(t / MEASURING_LAY_TIME + 1e-9) * perPlacement);

    // Ruler
    const shape = params.shape === "curved" ? 1 : 0;
    const eye = Math.max(-1, Math.min(1, Math.round(params.eye) || 0));
    const start = clampTo("start", state.start);
    const bend = clampTo("bend", state.bend);
    const trueLength = shape === 1 ? measuringCurveLength(bend) : clampTo("size", state.size);
    const endMark = start + trueLength;
    const seenEnd = endMark + eye * MEASURING_PARALLAX;
    const reading = round1(round1(seenEnd) - start);
    const readingError = round1(reading - round1(trueLength));

    // Motion
    const mover = MEASURING_MOVERS[params.mover] ? params.mover : "train";
    const motionKind = MEASURING_MOVERS[mover].kind;

    // Pendulum
    const pendulumLength = clampTo("pendulumLength", state.pendulumLength);
    const period = measuringPeriod(pendulumLength);
    const swing = Math.min(MEASURING_MAX_SWING, Math.max(MEASURING_MIN_SWING, params.swing || MEASURING_MIN_SWING));

    // Speed
    const distance = clampTo("distance", state.distance);
    const tripTime = clampTo("tripTime", state.tripTime);
    const speed = distance / tripTime;

    return {
      item: MEASURING_ITEM_ORDER.indexOf(itemKey),
      unit,
      measurer,
      objectLength,
      unitLength,
      count,
      childCount,
      teacherCount,
      agree: Math.abs(childCount - teacherCount) < 1e-9 ? 1 : 0,
      objectM: objectLength / 100,
      objectMm: objectLength * 10,
      laid,
      done: t >= placements * MEASURING_LAY_TIME - 1e-9 ? 1 : 0,
      shape,
      eye,
      startMark: start,
      trueLength,
      endMark,
      seenEnd,
      reading,
      readingError,
      misread: Math.abs(readingError) > 0.05 ? 1 : 0,
      trueMm: trueLength * 10,
      bend: shape === 1 ? bend : 0,
      gap: shape === 1 ? MEASURING_CURVE_GAP : trueLength,
      mover: MEASURING_MOVER_ORDER.indexOf(mover),
      motionKind,
      repeats: motionKind === 0 ? 0 : 1,
      pendulumLength,
      bobMass: Math.min(200, Math.max(20, params.bobMass || 20)),
      swing,
      period,
      tenSwings: MEASURING_COUNT * period,
      oscillations: Math.floor(t / period + 1e-9),
      bobAngle: swing * Math.cos((2 * Math.PI * t) / period) || 0,
      perMinute: 60 / period,
      distance,
      tripTime,
      speed,
      speedKmh: speed * 3.6,
      carAt: (Math.min(t, tripTime) / tripTime) * distance,
      arrived: t >= tripTime ? 1 : 0,
      t,
    };
  },

  getVariable(state, id) {
    return id in LIMITS ? state[id as keyof MeasuringState] : undefined;
  },

  setVariable(state, id, value) {
    if (!(id in LIMITS)) return state;
    const key = id as keyof typeof LIMITS;
    const next = { ...state, [key]: clampTo(key, value) };
    // A new ribbon, string or trip starts the clock again.
    if (key === "ribbon" || key === "pendulumLength" || key === "distance" || key === "tripTime") return { ...next, t: 0 };
    return next;
  },
};
