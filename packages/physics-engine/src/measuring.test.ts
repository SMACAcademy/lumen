import { describe, expect, it } from "vitest";
import { MEASURING_RULER_LENGTH, measuringCurveLength, measuringModel as model, measuringPeriod, measuringUnitSize, type MeasuringState } from "./measuring";

const P = model.defaultParams;
const S0 = model.initialize(P);
const derive = (over: Partial<typeof P> = {}, state: Partial<MeasuringState> = {}) => model.derive({ ...S0, ...state }, { ...P, ...over });

describe("measuring with body units", () => {
  it("counts how many units fit: length = count × size of one unit", () => {
    // The desk is 120 cm. A child's span is 15 cm, the teacher's 20 cm.
    expect(derive({ item: "desk", unit: 0, measurer: 0 }).count).toBeCloseTo(8, 12);
    expect(derive({ item: "desk", unit: 0, measurer: 1 }).count).toBeCloseTo(6, 12);
    expect(derive({ item: "desk", unit: 2, measurer: 0 }).count).toBeCloseTo(3, 12);
    expect(derive({ item: "desk", unit: 2, measurer: 1 }).count).toBeCloseTo(2.5, 12);
    expect(derive({ item: "blackboard", unit: 1, measurer: 1 }).count).toBeCloseTo(10, 12);
    expect(measuringUnitSize(1, 0)).toBe(20);
  });

  it("gives different numbers to different people, except with a centimetre scale", () => {
    const span = derive({ item: "desk", unit: 0 });
    expect(span).toMatchObject({ childCount: 8, teacherCount: 6, agree: 0 });
    const scale = derive({ item: "desk", unit: 3, measurer: 1 });
    expect(scale).toMatchObject({ count: 120, childCount: 120, teacherCount: 120, agree: 1, objectM: 1.2, objectMm: 1200 });
  });

  it("measures a ribbon the learner cuts: 5 of the teacher's spans is 100 cm", () => {
    expect(derive({ item: "ribbon", unit: 0, measurer: 1 }, { ribbon: 100 }).count).toBeCloseTo(5, 12);
  });

  it("lays the units down one at a time, the scale 30 cm at a time", () => {
    expect(derive({ item: "desk", unit: 0 }, { t: 1.6 })).toMatchObject({ laid: 3, done: 0 });
    expect(derive({ item: "desk", unit: 0 }, { t: 4 })).toMatchObject({ laid: 8, done: 1 });
    // 18 cm pencil, 15 cm span: two placements, the second partly over the end.
    expect(derive({ item: "pencil", unit: 0 }, { t: 1 })).toMatchObject({ laid: 1.2, done: 1 });
    expect(derive({ item: "desk", unit: 3 }, { t: 1 })).toMatchObject({ laid: 60, done: 0 });
    expect(derive({ item: "desk", unit: 3 }, { t: 2 })).toMatchObject({ laid: 120, done: 1 });
  });
});

describe("reading a ruler", () => {
  it("is the far mark minus the near mark", () => {
    const r = derive({}, { size: 7.5, start: 2 });
    expect(r).toMatchObject({ startMark: 2, endMark: 9.5, reading: 7.5, readingError: 0, misread: 0, trueMm: 75 });
  });

  it("is 2 mm out when the eye is not straight above the end", () => {
    expect(derive({ eye: -1 }, { size: 7.5, start: 2 })).toMatchObject({ reading: 7.3, readingError: -0.2, misread: 1 });
    expect(derive({ eye: 1 }, { size: 7.5, start: 2 })).toMatchObject({ reading: 7.7, readingError: 0.2, misread: 1 });
  });

  it("measures a curved line with a thread: longer than the gap between its ends", () => {
    expect(measuringCurveLength(0)).toBeCloseTo(8, 9);
    expect(measuringCurveLength(2)).toBeCloseTo(11.71, 2);
    const r = derive({ shape: "curved" }, { bend: 2, start: 0 });
    expect(r.gap).toBe(8);
    expect(r.trueLength).toBeCloseTo(11.71, 2);
    expect(r.reading).toBe(11.7);
    // The longest thread from the furthest start still fits the ruler.
    expect(derive({ shape: "curved" }, { bend: 2, start: 3 }).endMark).toBeLessThanOrEqual(MEASURING_RULER_LENGTH);
    expect(derive({}, { size: 12, start: 3 }).endMark).toBeLessThanOrEqual(MEASURING_RULER_LENGTH);
  });
});

describe("kinds of motion", () => {
  it("sorts each mover into one kind", () => {
    const kind = (mover: typeof P.mover) => derive({ mover }).motionKind;
    expect([kind("train"), kind("apple"), kind("march")]).toEqual([0, 0, 0]);
    expect([kind("merry"), kind("clock")]).toEqual([1, 1]);
    expect([kind("swing"), kind("pendulum"), kind("needle")]).toEqual([2, 2, 2]);
    expect([kind("top"), kind("wheel")]).toEqual([3, 3]);
    expect(derive({ mover: "train" }).repeats).toBe(0);
    expect(derive({ mover: "clock" }).repeats).toBe(1);
  });
});

describe("the pendulum", () => {
  it("takes about 2 s per oscillation at 1 m, and about 1 s at 25 cm", () => {
    // T = 2π √(1 / 9.8) = 2.007 s; 2π √(0.25 / 9.8) = 1.0035 s
    expect(measuringPeriod(100)).toBeCloseTo(2.0071, 4);
    expect(measuringPeriod(25)).toBeCloseTo(1.0035, 4);
    expect(derive({}, { pendulumLength: 50 }).tenSwings).toBeCloseTo(14.19, 2);
  });

  it("does not care about the bob's mass or a small swing", () => {
    const a = derive({ bobMass: 50, swing: 0.1 }, { pendulumLength: 50 });
    const b = derive({ bobMass: 200, swing: 0.3 }, { pendulumLength: 50 });
    expect(a.period).toBe(b.period);
  });

  it("counts whole oscillations as the clock runs", () => {
    expect(derive({}, { pendulumLength: 100, t: 10.1 }).oscillations).toBe(5);
    expect(derive({}, { pendulumLength: 100, t: 9.9 }).oscillations).toBe(4);
    expect(derive({ swing: 0.2 }, { pendulumLength: 100, t: 0 }).bobAngle).toBeCloseTo(0.2, 12);
  });
});

describe("speed", () => {
  it("is distance ÷ time, in m/s and km/h", () => {
    const r = derive({}, { distance: 100, tripTime: 20 });
    expect(r.speed).toBe(5);
    expect(r.speedKmh).toBeCloseTo(18, 12);
    expect(derive({}, { distance: 100, tripTime: 20, t: 10 })).toMatchObject({ carAt: 50, arrived: 0 });
    expect(derive({}, { distance: 100, tripTime: 20, t: 25 })).toMatchObject({ carAt: 100, arrived: 1 });
  });
});

describe("the model", () => {
  it("clamps every variable to its control's range, and restarts the clock for a new string", () => {
    expect(model.setVariable(S0, "pendulumLength", 5000, P).pendulumLength).toBe(200);
    expect(model.setVariable(S0, "start", -1, P).start).toBe(0);
    expect(model.setVariable({ ...S0, t: 5 }, "pendulumLength", 50, P).t).toBe(0);
    expect(model.setVariable({ ...S0, t: 5 }, "size", 5, P).t).toBe(5);
    expect(model.setVariable(S0, "nonsense", 5, P)).toBe(S0);
    expect(model.getVariable(S0, "ribbon")).toBe(60);
  });

  it("advances and steps the clock", () => {
    expect(model.advance(S0, 0.25, P).t).toBe(0.25);
    expect(model.step(S0, P, 1).t).toBe(0.5);
    expect(model.step(S0, P, -1).t).toBe(0);
  });

  it("gives a finite number for every output", () => {
    for (const r of [derive(), derive({ item: "ribbon", unit: 3, shape: "curved", mover: "wheel", eye: 1 }, { t: 100 })]) {
      for (const key of model.outputs) expect(Number.isFinite(r[key]), key).toBe(true);
    }
  });
});
