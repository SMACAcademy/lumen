import { describe, expect, it } from "vitest";
import { MAX_WIDTH, leastCountOf, readingOf, vernierModel as model } from "./vernier";

const P = model.defaultParams;
const derive = (width: number, over: Partial<typeof P> = {}) => model.derive({ width }, { ...P, ...over });

describe("least count", () => {
  it("is one main-scale division divided by the number of vernier divisions", () => {
    expect(leastCountOf({ msd: 1, divisions: 10 })).toBeCloseTo(0.1, 12);
    expect(leastCountOf({ msd: 1, divisions: 20 })).toBeCloseTo(0.05, 12);
    expect(leastCountOf({ msd: 1, divisions: 50 })).toBeCloseTo(0.02, 12);
  });

  it("sets how many decimal places a reading deserves", () => {
    expect(derive(10).decimals).toBe(1);
    expect(derive(10, { divisions: 20 }).decimals).toBe(2);
    expect(derive(10, { divisions: 50 }).decimals).toBe(2);
  });

  it("a vernier division is one least count shorter than a main division", () => {
    const r = derive(10, { divisions: 20 });
    expect(r.vernierDivision).toBeCloseTo(0.95, 12);
    expect(r.msd - r.vernierDivision).toBeCloseTo(r.leastCount, 12);
  });
});

describe("taking a reading", () => {
  it("splits into a main-scale reading and a coinciding division", () => {
    const r = derive(12.4);
    expect(r.mainReading).toBeCloseTo(12, 12);
    expect(r.coincidence).toBe(4);
    expect(r.observedReading).toBeCloseTo(12.4, 12);
  });

  it("rounds to the nearest least count, because nothing finer can be seen", () => {
    expect(derive(12.43).observedReading).toBeCloseTo(12.4, 12);
    expect(derive(12.47).observedReading).toBeCloseTo(12.5, 12);
    // With a least count of 0.02 mm, 12.43 sits exactly between two divisions and goes up.
    expect(derive(12.43, { divisions: 50 }).observedReading).toBeCloseTo(12.44, 12);
    expect(derive(12.409, { divisions: 50 }).observedReading).toBeCloseTo(12.4, 12);
  });

  it("carries over when the vernier zero passes the next main division", () => {
    const r = readingOf({ ...P, divisions: 10 }, 12.97);
    expect(r.mainReading).toBeCloseTo(13, 12);
    expect(r.coincidence).toBe(0);
    expect(r.observed).toBeCloseTo(13, 12);
  });

  it("a finer instrument measures the same object more accurately", () => {
    const coarse = derive(12.43);
    const fine = derive(12.43, { divisions: 50 });
    expect(fine.absoluteError).toBeLessThan(coarse.absoluteError);
    expect(fine.percentError).toBeLessThan(coarse.percentError);
    expect(coarse.absoluteError).toBeLessThanOrEqual(coarse.leastCount / 2 + 1e-9);
  });
});

describe("zero error", () => {
  it("shifts what the instrument shows, and is subtracted to correct it", () => {
    const r = derive(12.4, { zeroError: 0.2 });
    expect(r.observedReading).toBeCloseTo(12.6, 12);
    expect(r.correctedReading).toBeCloseTo(12.4, 12);
    expect(r.absoluteError).toBeLessThan(1e-9);
  });

  it("works the same for a negative zero error", () => {
    const r = derive(8, { zeroError: -0.3 });
    expect(r.observedReading).toBeCloseTo(7.7, 12);
    expect(r.correctedReading).toBeCloseTo(8, 12);
  });

  it("leaves the true width alone: only the reading moves", () => {
    expect(derive(8, { zeroError: 0.3 }).width).toBe(8);
  });
});

describe("the jaws", () => {
  it("open steadily while playing, and wrap round at the end of the scale", () => {
    let s = model.initialize(P);
    s = model.advance(s, 1, P);
    expect(s.width).toBeCloseTo(16.4, 9);
    s = model.advance(s, 100, P);
    expect(s.width).toBe(0);
  });

  it("step by exactly one least count", () => {
    expect(model.step({ width: 12.4 }, P, 1).width).toBeCloseTo(12.5, 12);
    expect(model.step({ width: 12.4 }, { ...P, divisions: 50 }, -1).width).toBeCloseTo(12.38, 12);
  });

  it("never open past the end of the scale or shut past zero", () => {
    expect(model.setVariable({ width: 0 }, "width", -5, P).width).toBe(0);
    expect(model.setVariable({ width: 0 }, "width", 999, P).width).toBe(MAX_WIDTH);
  });
});
