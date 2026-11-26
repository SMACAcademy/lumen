import { schoolWorkModel, type SchoolWorkParams, type SchoolWorkState } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeSchoolWorkLayout, schoolWorkRenderer, swDecimal, swNumber, swRupees, swScientific } from "./schoolwork/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const S0 = schoolWorkModel.initialize(schoolWorkModel.defaultParams);
const results = (params: Partial<SchoolWorkParams> = {}, state: Partial<SchoolWorkState> = {}) =>
  schoolWorkModel.derive({ ...S0, ...state }, { ...schoolWorkModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  schoolWorkRenderer.draw(rec.ctx, computeSchoolWorkLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const all = (rec: ReturnType<typeof render>) => rec.texts().join(" | ");
const PUSH = ["push", "labels"];
const LOAD = ["load", "labels"];
const STAIRS = ["stairs", "labels"];
const METER = ["meter", "labels"];

describe("number formats", () => {
  it("writes numbers simply, with a true minus sign", () => {
    expect(swNumber(1470.0000000000002)).toBe("1 470");
    expect(swNumber(147.00000000000003)).toBe("147");
    expect(swNumber(9.8)).toBe("9.8");
    expect(swNumber(0.36)).toBe("0.36");
    expect(swNumber(-30)).toBe("−30");
    expect(swNumber(-0)).toBe("0");
    expect(swNumber(3.6e6)).toBe("3.60 × 10⁶");
    expect(swScientific(1.08e8)).toBe("1.08 × 10⁸");
    expect(swDecimal(0.0025)).toBe("0.0025");
    expect(swDecimal(0.36)).toBe("0.36");
    expect(swRupees(5)).toBe("₹5");
    expect(swRupees(112.5)).toBe("₹112.5");
  });
});

describe("the work scene", () => {
  it("works out W = F × s along the motion", () => {
    const texts = all(render(results({ force: 5, distance: 2 }), PUSH));
    expect(texts).toContain("F = 5 N");
    expect(texts).toContain("s = 2 m");
    expect(texts).toContain("W = F × s = 5 N × 2 m = 10 J");
    expect(texts).toContain("Positive work");
  });

  it("gives friction negative work, and zero for a force across the motion or no motion", () => {
    const against = all(render(results({ force: 10, distance: 3, direction: "against" }), PUSH));
    expect(against).toContain("friction 10 N");
    expect(against).toContain("W = −F × s = −(10 N × 3 m) = −30 J");
    expect(against).toContain("Negative work");
    const across = all(render(results({ force: 40, distance: 10, direction: "across" }), PUSH));
    expect(across).toContain("Carrying a bag along level ground");
    expect(across).toContain("Force at right angles to the motion: W = 0 J");
    const wall = all(render(results({ force: 80, distance: 0 }), PUSH));
    expect(wall).toContain("Nothing moves: W = 80 N × 0 m = 0 J");
  });

  it("shows the work so far as the box moves", () => {
    expect(all(render(results({ force: 5, distance: 2 }, { t: 1 }), PUSH))).toContain("work so far 5 J");
  });

  it("hides the work without labels", () => {
    const hidden = all(render(results({ force: 30, distance: 2 }), ["push"]));
    expect(hidden).not.toMatch(/ J\b/);
    expect(hidden).toContain("F = 30 N");
  });
});

describe("the lifting scene", () => {
  it("works out m g h for a 10 kg bag lifted 1.5 m", () => {
    const texts = all(render(results({ mass: 10, height: 1.5 }), LOAD));
    expect(texts).toContain("10 kg");
    expect(texts).toContain("h = 1.5 m");
    expect(texts).toContain("m g = 98 N");
    expect(texts).toContain("W = m g h = 10 × 9.8 × 1.5 = 147 J");
  });

  it("keeps the answer hidden without labels", () => {
    const hidden = all(render(results({ mass: 10, height: 1.5 }), ["load"]));
    expect(hidden).not.toContain("147");
    expect(hidden).not.toContain("98");
  });
});

describe("the stairs scene", () => {
  it("gives the same work but different powers to A and B", () => {
    const texts = all(render(results({ mass: 50, height: 3, timeA: 5, timeB: 15 }), STAIRS));
    expect(texts).toContain("Each climber: 50 kg, up 3 m");
    expect(texts).toContain("A takes 5 s, B takes 15 s");
    expect(texts).toContain("Same work for each: m g h = 1 470 J");
    expect(texts).toContain("A: 1 470 J ÷ 5 s = 294 W");
    expect(texts).toContain("B: 1 470 J ÷ 15 s = 98 W");
  });

  it("moves the faster climber higher, and hides the powers without labels", () => {
    const rec = render(results({ height: 3, timeA: 5, timeB: 15 }, { t: 3 }), ["stairs"]);
    const a = rec.of("fillText").find((c) => c.args[0] === "A")!;
    const b = rec.of("fillText").find((c) => c.args[0] === "B")!;
    expect(a.args[2] as number).toBeLessThan(b.args[2] as number); // higher up the canvas
    expect(all(rec)).not.toMatch(/ W\b|294|1 470/);
  });
});

describe("the meter scene", () => {
  it("reads 1 kWh for a 100 W bulb on for 10 hours, with the joules and the bill", () => {
    const texts = all(render(results({ appliance: 100, hours: 10, days: 1, rate: 5 }), METER));
    expect(texts).toContain("100 W");
    expect(texts).toContain("1 kWh");
    expect(texts).toContain("0.1 kW × 10 h = 1 kWh = 1 unit");
    expect(texts).toContain("= 3.60 × 10⁶ J, as 1 kWh = 3.6 × 10⁶ J");
    expect(texts).toContain("Bill: 1 unit × ₹5 = ₹5");
  });

  it("adds up a month", () => {
    const texts = all(render(results({ appliance: 1000, hours: 1, days: 30, rate: 5 }), METER));
    expect(texts).toContain("for 30 days");
    expect(texts).toContain("1 kW × 30 h = 30 kWh = 30 units");
    expect(texts).toContain("Bill: 30 units × ₹5 = ₹150");
  });

  it("hides the reading without labels", () => {
    const hidden = all(render(results({ appliance: 100, hours: 10 }), ["meter"]));
    expect(hidden).toContain("? kWh");
    expect(hidden).not.toContain("1 kWh =  ");
    expect(hidden).not.toMatch(/units? ×|10⁶ J/);
  });
});

describe("on a phone", () => {
  const W = 325;
  const inside = (rec: ReturnType<typeof render>) => {
    for (const call of rec.of("fillText")) {
      const [text, x, y] = call.args as [string, number, number];
      expect(x, text).toBeGreaterThanOrEqual(0);
      expect(x, text).toBeLessThanOrEqual(W);
      expect(y, text).toBeGreaterThanOrEqual(0);
      expect(y, text).toBeLessThanOrEqual(360);
      expect(text.length, text).toBeLessThanOrEqual(55);
    }
    for (const call of [...rec.of("moveTo"), ...rec.of("lineTo"), ...rec.of("arc")]) {
      const [x, y] = call.args as [number, number];
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(W);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(360);
    }
    for (const call of rec.of("fillRect")) {
      const [x, y, w, h] = call.args as [number, number, number, number];
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(W);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y + h).toBeLessThanOrEqual(360);
    }
  };

  it("keeps every scene on a 325 px canvas", () => {
    const layout = computeSchoolWorkLayout(W);
    expect(layout.height).toBeGreaterThanOrEqual(330);
    expect(layout.height).toBeLessThanOrEqual(420);
    for (const direction of ["along", "against", "across"] as const) {
      for (const t of [0, 10, 30]) {
        inside(render(results({ force: 100, distance: 20, direction }, { t }), PUSH, W));
        inside(render(results({ force: 100, distance: 0.5, direction }, { t }), PUSH, W));
      }
    }
    for (const t of [0, 1, 60]) {
      inside(render(results({ mass: 100, height: 20 }, { t }), LOAD, W));
      inside(render(results({ mass: 1, height: 0.5 }, { t }), LOAD, W));
      inside(render(results({ mass: 100, height: 20, timeA: 1, timeB: 60 }, { t }), STAIRS, W));
    }
    inside(render(results({ appliance: 3000, hours: 24, days: 31, rate: 20 }), METER, W));
    inside(render(results({ appliance: 5, hours: 0.5, days: 1, rate: 1 }), METER, W));
  });

  it("keeps the longest captions narrow enough for a phone", () => {
    const long = [
      render(results({ force: 100, distance: 20, direction: "against" }), PUSH, W),
      render(results({ mass: 100, height: 12.5 }), LOAD, W),
      render(results({ mass: 100, height: 20, timeA: 1, timeB: 60 }), STAIRS, W),
      render(results({ appliance: 3000, hours: 24, days: 31, rate: 20 }), METER, W),
    ];
    for (const rec of long) for (const text of rec.texts()) expect(text.length * 6, text).toBeLessThanOrEqual(W - 8);
  });
});
