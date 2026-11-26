import { describe, expect, it } from "vitest";
import {
  DESIGN_PROBLEM_ORDER,
  DESIGN_PROBLEMS,
  optimiseModel as model,
  RATE_SCENE_ORDER,
  RATE_SCENES,
  STUDY_CURVE_ORDER,
  STUDY_CURVES,
  type OptimiseParams,
  type OptimiseState,
} from "./optimise";

const base: OptimiseState = { x: 1, px: -2, a: 0, b: 2, size: 1 };
const derive = (params: Partial<OptimiseParams> = {}, state: Partial<OptimiseState> = {}) => model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });
const H = 1e-5;

describe("the design problems", () => {
  it("store derivatives that agree with numerical differences", () => {
    for (const id of DESIGN_PROBLEM_ORDER) {
      const p = DESIGN_PROBLEMS[id];
      for (const t of [0.2, 0.5, 0.8]) {
        const x = p.x[0] + (p.x[1] - p.x[0]) * t;
        expect(p.df(x), `${id} f′`).toBeCloseTo((p.f(x + H) - p.f(x - H)) / (2 * H), 4);
        expect(p.d2f(x), `${id} f″`).toBeCloseTo((p.df(x + H) - p.df(x - H)) / (2 * H), 4);
      }
    }
  });

  it("put the best where the slope is zero, and nowhere in the window does better", () => {
    for (const id of DESIGN_PROBLEM_ORDER) {
      const p = DESIGN_PROBLEMS[id];
      expect(p.df(p.best), id).toBeCloseTo(0, 8);
      expect(p.d2f(p.best) < 0, id).toBe(p.maximum);
      for (let i = 0; i <= 100; i++) {
        const x = p.x[0] + ((p.x[1] - p.x[0]) * i) / 100;
        if (p.maximum) expect(p.f(x), `${id} at ${x}`).toBeLessThanOrEqual(p.f(p.best) + 1e-9);
        else expect(p.f(x), `${id} at ${x}`).toBeGreaterThanOrEqual(p.f(p.best) - 1e-9);
      }
    }
  });

  it("makes the best box 128 cm³ with a 2 cm cut, and the best pen 200 m² at 10 m wide", () => {
    expect(derive({ problem: "box" }, { x: 2 })).toMatchObject({ value: 128, other: 8, slope: 0, atBest: 1, isMaximum: 1, bestValue: 128 });
    expect(derive({ problem: "fence" }, { x: 10 })).toMatchObject({ value: 200, other: 20, slope: 0, atBest: 1, bestValue: 200 });
    expect(derive({ problem: "box" }, { x: 3 }).atBest).toBe(0);
  });

  it("makes the best can as tall as it is wide", () => {
    const r = derive({ problem: "can" }, { x: DESIGN_PROBLEMS.can.best });
    expect(r.other).toBeCloseTo(2 * r.x, 8);
    expect(r).toMatchObject({ isMaximum: 0, atBest: 1 });
    expect(r.best).toBeCloseTo(5.419, 3);
    expect(r.value).toBeCloseTo(553.58, 2);
    expect(derive({ problem: "can" }, { x: 5.4 }).atBest).toBe(1);
  });
});

describe("rising and falling", () => {
  it("stores derivatives and critical points that check out", () => {
    for (const id of STUDY_CURVE_ORDER) {
      const c = STUDY_CURVES[id];
      for (const x of [c.x[0] + 0.3, 0.4, c.x[1] - 0.3]) {
        expect(c.df(x), `${id} f′`).toBeCloseTo((c.f(x + H) - c.f(x - H)) / (2 * H), 5);
        expect(c.d2f(x), `${id} f″`).toBeCloseTo((c.df(x + H) - c.df(x - H)) / (2 * H), 5);
      }
      for (const x of c.critical) expect(c.df(x), `${id} critical ${x}`).toBeCloseTo(0, 10);
    }
  });

  it("has x³ − 3x climb outside ±1 and fall between, with a maximum at −1 and a minimum at +1", () => {
    const rising = (px: number) => derive({ curve: "cubic" }, { px }).rising;
    expect([-2, -1.5, 1.5, 2].map(rising)).toEqual([1, 1, 1, 1]);
    expect([-0.5, 0, 0.5].map(rising)).toEqual([-1, -1, -1]);
    expect(derive({ curve: "cubic" }, { px: -1 })).toMatchObject({ rising: 0, turning: 1, py: 2 });
    expect(derive({ curve: "cubic" }, { px: 1 })).toMatchObject({ rising: 0, turning: 2, py: -2 });
  });

  it("gives the tangent's equation, and a normal perpendicular to it", () => {
    const r = derive({ curve: "cubic" }, { px: 2 });
    expect(r).toMatchObject({ py: 2, curveSlope: 9, tangentIntercept: -16 });
    expect(r.normalSlope * r.curveSlope).toBeCloseTo(-1, 12);
    expect(derive({ curve: "cubic" }, { px: 0 }).normalSlope).toBeCloseTo(1 / 3, 12);
    expect(derive({ curve: "cubic" }, { px: 1 }).normalSlope).toBe(0);
  });
});

describe("the mean value theorem", () => {
  it("finds the tangent parallel to the chord of x³ − 3x on [0, 2] at 2/√3", () => {
    const c = 2 / Math.sqrt(3);
    expect(derive({ curve: "cubic" }, { a: 0, b: 2 }).chordSlope).toBe(1);
    expect(derive({ curve: "cubic" }, { a: 0, b: 2, px: c })).toMatchObject({ parallel: 1 });
    expect(derive({ curve: "cubic" }, { a: 0, b: 2, px: 1.15 }).parallel).toBe(1);
    expect(derive({ curve: "cubic" }, { a: 0, b: 2, px: 0.5 }).parallel).toBe(0);
  });

  it("does not count a parallel tangent outside the interval, and takes the ends in either order", () => {
    expect(derive({ curve: "cubic" }, { a: 0, b: 2, px: -2 / Math.sqrt(3) }).parallel).toBe(0);
    expect(derive({ curve: "cubic" }, { a: 2, b: 0 })).toMatchObject({ a: 0, b: 2, chordSlope: 1 });
  });

  it("has a flat chord when the ends are level, as in Rolle's theorem", () => {
    const r = derive({ curve: "cubic" }, { a: -Math.sqrt(3), b: Math.sqrt(3), px: 1 });
    expect(r.chordSlope).toBeCloseTo(0, 10);
    expect(r.parallel).toBe(1);
  });
});

describe("related rates", () => {
  it("drops the ladder's top at 0.75 m/s when the foot is 3 m out", () => {
    expect(derive({ scene: "ladder" }, { size: 3 })).toMatchObject({ linked: 4, linkedRate: -0.75, linkedSpeed: 0.75 });
    expect(derive({ scene: "ladder" }, { size: 4 }).linkedSpeed).toBeCloseTo(4 / 3, 12);
  });

  it("grows a balloon's radius four times slower at twice the radius", () => {
    expect(derive({ scene: "balloon" }, { size: 4 }).linkedRate).toBeCloseTo(derive({ scene: "balloon" }, { size: 2 }).linkedRate / 4, 12);
    expect(derive({ scene: "balloon" }, { size: 5 }).linkedRate).toBeCloseTo(1 / Math.PI, 12);
  });

  it("spreads a ripple's area at πr m²/s", () => {
    expect(derive({ scene: "ripple" }, { size: 4 }).linkedRate).toBeCloseTo(4 * Math.PI, 12);
  });

  it("keeps each scene's link true as time runs on", () => {
    let ladder: OptimiseState = { ...base, size: 1 };
    for (let i = 0; i < 20; i++) ladder = model.advance(ladder, 0.1, { ...model.defaultParams, scene: "ladder" });
    const r = derive({ scene: "ladder" }, ladder);
    expect(r.size).toBeCloseTo(3, 10);
    expect(r.size ** 2 + r.linked ** 2).toBeCloseTo(25, 10);
    // One second of filling adds 100 cm³.
    const before = derive({ scene: "balloon" }, { size: 3 }).linked;
    const after = derive({ scene: "balloon" }, model.advance({ ...base, size: 3 }, 1, { ...model.defaultParams, scene: "balloon" })).linked;
    expect(after - before).toBeCloseTo(100, 8);
  });

  it("agrees with a numerical rate in every scene", () => {
    for (const id of RATE_SCENE_ORDER) {
      const scene = RATE_SCENES[id];
      const size = (scene.size[0] + scene.size[1]) / 2;
      const numerical = (scene.linked(scene.later(size, H)) - scene.linked(size)) / H;
      // The balloon's driven quantity is its volume, so there the linked rate is the radius's.
      if (id === "balloon") expect(scene.linkedRate(size)).toBeCloseTo((scene.later(size, H) - size) / H, 4);
      else expect(scene.linkedRate(size), id).toBeCloseTo(numerical, 3);
    }
  });
});

describe("the model", () => {
  it("stops each scene at the end of its window and numbers every output", () => {
    for (const scene of RATE_SCENE_ORDER) {
      let s = model.initialize(model.defaultParams);
      for (let i = 0; i < 4000; i++) s = model.advance(s, 0.1, { ...model.defaultParams, scene });
      expect(s.size, scene).toBe(RATE_SCENES[scene].size[1]);
      for (const problem of DESIGN_PROBLEM_ORDER) {
        for (const curve of STUDY_CURVE_ORDER) {
          const r = model.derive({ x: 99, px: -99, a: 5, b: 5, size: 99 }, { problem, curve, scene });
          for (const key of model.outputs) expect(Number.isFinite(r[key]), `${problem} ${curve} ${scene} ${key}`).toBe(true);
        }
      }
    }
  });
});
