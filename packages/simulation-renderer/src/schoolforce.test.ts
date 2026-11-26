import { schoolForceModel, type SchoolForceParams, type SchoolForceState } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeSchoolForceLayout, patchWidth, schoolForceRenderer, sfNumber, sfScientific, sinkDepth } from "./schoolforce/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const S0 = schoolForceModel.initialize(schoolForceModel.defaultParams);
const results = (params: Partial<SchoolForceParams> = {}, state: Partial<SchoolForceState> = {}) =>
  schoolForceModel.derive({ ...S0, ...state }, { ...schoolForceModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  schoolForceRenderer.draw(rec.ctx, computeSchoolForceLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const PUSH = ["box", "forces", "friction", "labels"];
const PRESS = ["press", "labels"];
const MASSES = ["masses", "labels"];
const DROP = ["drop", "labels"];
const BALANCE = ["balance", "labels"];

describe("number formats", () => {
  it("writes small and big numbers simply", () => {
    expect(sfScientific(1.6675e-7)).toBe("1.67 × 10⁻⁷");
    expect(sfScientific(2e7)).toBe("2.00 × 10⁷");
    expect(sfNumber(20000)).toBe("20 000");
    expect(sfNumber(9.8)).toBe("9.8");
    expect(sfNumber(24.5)).toBe("24.5");
    expect(sfNumber(0.01)).toBe("0.01");
  });
});

describe("the push scene", () => {
  it("draws A and B, the combined push, friction, and says what happens", () => {
    const held = render(results({ surface: "glass", forceA: 9 }), PUSH).texts();
    expect(held).toEqual(expect.arrayContaining(["A 9 N", "5 kg", "Glass floor", "combined 9 N"]));
    expect(held.join(" ")).toContain("friction 9 N (holds up to 9.8 N)");
    expect(held.join(" ")).toContain("Friction holds it");
    expect(render(results({ surface: "glass", forceA: 20 }), PUSH).texts().join(" ")).toContain("it starts to move");
    expect(render(results({ surface: "wood" }, { startSpeed: 3, v: 3 }), PUSH).texts().join(" ")).toContain("it stops after 1.15 m");
    expect(render(results({ surface: "glass", forceB: 40, together: "opposite" }, { startSpeed: 2, v: 2 }), PUSH).texts().join(" ")).toContain("goes back");
  });

  it("puts B on the far side when it pushes the other way", () => {
    const rec = render(results({ forceA: 20, forceB: 10, together: "opposite" }), PUSH);
    const b = rec.of("fillText").find((c) => c.args[0] === "B 10 N")!;
    const a = rec.of("fillText").find((c) => c.args[0] === "A 20 N")!;
    expect(b.args[1] as number).toBeGreaterThan(a.args[1] as number);
  });

  it("draws wheels as two circles, and hides friction numbers without words", () => {
    expect(render(results({ wheels: "wheels" }), ["box"]).of("arc")).toHaveLength(2);
    expect(render(results({ forceA: 9 }), ["box", "forces", "friction"]).texts().join(" ")).not.toContain("friction");
  });
});

describe("the pressure scene", () => {
  it("narrows to a point for a small area and sinks deeper for a big pressure", () => {
    expect(patchWidth(0.01, 800)).toBeCloseTo(3, 9);
    expect(patchWidth(5000, 800)).toBeCloseTo(576, 6);
    expect(sinkDepth(2e7)).toBeGreaterThan(sinkDepth(2000));
  });

  it("gives the pressure only with the words on", () => {
    const shown = render(results({ pressForce: 500, area: 5000 }), PRESS).texts();
    expect(shown).toEqual(expect.arrayContaining(["force 500 N", "area 5 000 cm²"]));
    expect(shown.join(" ")).toContain("= 1 000 Pa");
    expect(render(results({ pressForce: 500, area: 5000 }), ["press"]).texts().join(" ")).not.toContain("Pa");
  });
});

describe("the gravity scene", () => {
  it("labels both masses, the distance and the tiny pull", () => {
    const texts = render(results({ massA: 100, massB: 100, distance: 2 }), MASSES).texts();
    expect(texts).toEqual(expect.arrayContaining(["100 kg", "d = 2 m", "pull F = 1.67 × 10⁻⁷ N"]));
    expect(texts.join(" ")).toContain("Earth pulls the 100 kg ball with 980 N");
    expect(render(results(), ["masses"]).texts().join(" ")).not.toContain("pull F");
  });
});

describe("the falling scene", () => {
  it("says the feather lags in air, and they land together without it", () => {
    expect(render(results({ air: "air" }, { dropHeight: 2 }), DROP).texts().join(" ")).toContain("Coin lands after 0.64 s, feather after 4.05 s");
    expect(render(results({ air: "vacuum" }, { dropHeight: 4.9 }), DROP).texts().join(" ")).toContain("Both land together after 1.00 s");
    expect(render(results({ air: "air", gravity: 1.63 }), DROP).texts()).toContain("On the Moon: there is no air");
  });

  it("hides the clock and the times without words", () => {
    const hidden = render(results({ air: "vacuum" }, { dropHeight: 4.9 }), ["drop"]).texts().join(" ");
    expect(hidden).not.toMatch(/ s\b|t =/);
  });
});

describe("the weighing scene", () => {
  it("reads m g on the Earth and on the Moon", () => {
    expect(render(results({ mass: 60 }), BALANCE).texts().join(" ")).toContain("weight = 60 kg × 9.8 m/s² = 588 N");
    expect(render(results({ mass: 60, gravity: 1.63 }), BALANCE).texts().join(" ")).toContain("= 97.8 N");
    expect(render(results({ mass: 60 }), ["balance"]).texts().join(" ")).not.toContain("588");
  });
});

describe("on a phone", () => {
  const W = 325;
  const inside = (rec: ReturnType<typeof render>) => {
    for (const call of rec.of("fillText")) {
      const [text, x] = call.args as [string, number];
      expect(x, text).toBeGreaterThanOrEqual(0);
      expect(x, text).toBeLessThanOrEqual(W);
      expect(text.length, text).toBeLessThanOrEqual(55);
    }
    for (const call of rec.of("arc")) {
      const [x] = call.args as [number];
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(W);
    }
    for (const call of [...rec.of("moveTo"), ...rec.of("lineTo")]) {
      const [x] = call.args as [number];
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(W);
    }
  };

  it("keeps every scene on a 325 px canvas", () => {
    const layout = computeSchoolForceLayout(W);
    expect(layout.height).toBeGreaterThanOrEqual(330);
    expect(layout.height).toBeLessThanOrEqual(420);
    for (const x of [0, 4.99, 9.99]) {
      inside(render(results({ forceA: 60, forceB: 60, together: "opposite" }, { x }), PUSH, W));
      inside(render(results({ forceA: 60, forceB: 60, together: "same", wheels: "wheels" }, { x }), PUSH, W));
    }
    inside(render(results({ pressForce: 1000, area: 5000 }), PRESS, W));
    inside(render(results({ pressForce: 1000, area: 0.01 }), PRESS, W));
    inside(render(results({ massA: 1000, massB: 1000, distance: 10 }), MASSES, W));
    inside(render(results({ massA: 1000, massB: 1000, distance: 0.5 }), MASSES, W));
    inside(render(results({ air: "air" }, { dropHeight: 20, t: 3 }), DROP, W));
    inside(render(results({ mass: 100 }), BALANCE, W));
  });

  it("right-aligns text near the right edge so it does not run off", () => {
    const rec = render(results({ forceA: 10, forceB: 60, together: "opposite" }, { x: 9.99 }), PUSH, W);
    const b = rec.of("fillText").find((c) => c.args[0] === "B 60 N")!;
    expect(b.args[1] as number).toBeLessThanOrEqual(W - 4);
  });
});
