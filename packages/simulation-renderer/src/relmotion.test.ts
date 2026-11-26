import { REL_INITIAL, relmotionModel, type RelMotionParams, type RelMotionState } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeRelmotionLayout, niceCeil, relmotionRenderer } from "./relmotion/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const DEG = Math.PI / 180;
const results = (state: Partial<RelMotionState> = {}, params: Partial<RelMotionParams> = {}) =>
  relmotionModel.derive({ ...REL_INITIAL, ...state }, { ...relmotionModel.defaultParams, ...params });

type Span = { text: string; x: number; y: number; align: string };

/** Render, and note where each text was drawn and how it was aligned. */
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  const spans: Span[] = [];
  const ctx = new Proxy(rec.ctx, {
    get(target, key: string) {
      if (key === "fillText")
        return (text: string, x: number, y: number) => {
          spans.push({ text, x, y, align: String((target as unknown as Record<string, unknown>).textAlign ?? "left") });
          return target.fillText(text, x, y);
        };
      return (target as unknown as Record<string, unknown>)[key];
    },
    set(target, key: string, value) {
      (target as unknown as Record<string, unknown>)[key] = value;
      return true;
    },
  });
  const layout = computeRelmotionLayout(width);
  relmotionRenderer.draw(ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { rec, spans, layout, text: rec.texts().join(" | ") };
};

describe("the fall view", () => {
  it("draws the ball with its graphs, and the numbers only with words", () => {
    const shown = render(results({ u: 20, h0: 0, t: 1 }), ["fall", "labels"]);
    expect(shown.rec.texts()).toEqual(expect.arrayContaining(["Thrown up, falling back", "v / m/s, against t / s", "height / m, against t / s", "slope −9.8 m/s²"]));
    expect(shown.text).toContain("t 1.00 s · v +10.2 m/s · a −9.8 · h 15.1 m");
    const hidden = render(results({ u: 20, h0: 0, t: 1 }), ["fall"]).text;
    expect(hidden).not.toMatch(/10\.2|15\.1|slope/);
  });

  it("says when and how fast the ball lands", () => {
    expect(render(results({ u: 0, h0: 44.1, t: 5 }), ["fall", "labels"]).text).toContain("landed at 29.4 m/s after 3.00 s");
  });

  it("draws no graph before the clock starts, so an estimate shows nothing away", () => {
    const start = render(results({ u: 0, h0: 44.1, t: 0 }), ["fall"]);
    expect(start.text).not.toMatch(/3\.00|29\.4/);
  });
});

describe("the cars view", () => {
  it("gives each car's velocity, and B's relative to A only with words", () => {
    const shown = render(results({ vA: 20, vB: 15, gap: 50, t: 10 }), ["cars", "labels"]);
    expect(shown.rec.texts()).toEqual(expect.arrayContaining(["A: +20 m/s", "B: +15 m/s", "A", "B"]));
    expect(shown.text).toContain("v_BA = v_B − v_A = −5.0 m/s · level at 10.0 s");
    expect(render(results({ vA: 20, vB: 15, gap: 50 }), ["cars"]).text).not.toContain("v_BA");
  });
});

describe("the push view", () => {
  it("shades the area under a–t and calls it Δv", () => {
    const shown = render(results({ k: 2, v0: 0, t: 3 }, { push: "ramp" }), ["push", "labels"]);
    expect(shown.text).toContain("A growing push: a = kt");
    expect(shown.text).toContain("area under a–t = Δv = +9.0 m/s");
    expect(shown.text).toContain("t 3.0 s · v 9.0 m/s · x 9.0 m");
    expect(shown.rec.of("fill").length).toBeGreaterThan(0);
    expect(render(results({ k: 2, v0: 0, t: 3 }, { push: "ramp" }), ["push"]).text).not.toMatch(/9\.0|Δv/);
    expect(render(results({ k: 0.5, v0: 10, t: 2 }, { push: "drag" }), ["push", "labels"]).text).toContain("Drag: a = −kv");
  });
});

describe("the river view", () => {
  it("names the heading and gives the drift only with words", () => {
    const across = render(results({ width: 100, vRiver: 2, vBoat: 4, heading: 0 }), ["river", "labels"]);
    expect(across.rec.texts()).toEqual(expect.arrayContaining(["heading straight across", "boat", "ground", "opposite"]));
    expect(across.text).toContain("crossing 25.0 s · drift 50.0 m downstream");
    expect(render(results({ width: 100, vRiver: 2, vBoat: 4, heading: 30 * DEG }), ["river", "labels"]).text).toContain("lands straight opposite");
    expect(render(results({ width: 100, vRiver: 2, vBoat: 4, heading: 30 * DEG }), ["river"]).text).toContain("heading 30° upstream");
    expect(render(results({ width: 100, vRiver: 2, vBoat: 4, heading: 0 }), ["river"]).text).not.toMatch(/drift|50\.0/);
  });
});

describe("the rain view", () => {
  it("shows the rain from the ground without words, and as the walker sees it with them", () => {
    const ground = render(results({ vRain: 30, vWalk: 10, vWind: 0 }), ["rain"]);
    expect(ground.text).toContain("rain as seen from the ground");
    expect(ground.text).not.toMatch(/18\.4/);
    const walker = render(results({ vRain: 30, vWalk: 10, vWind: 0 }), ["rain", "labels"]);
    expect(walker.text).toContain("rain as the walker sees it");
    expect(walker.text).toContain("tilt the umbrella 18.4° forward");
    expect(walker.text).toContain("rain at 31.6 m/s, 18.4° off vertical");
  });
});

describe("the circle view", () => {
  it("labels the arrows, and gives v, a_c and T with words", () => {
    const steady = render(results({ radius: 2, omega: 3, aT: 0, t: 0.5 }), ["circle", "labels"]);
    expect(steady.rec.texts()).toEqual(expect.arrayContaining(["v", "r = 2.0 m", "steady speed"]));
    expect(steady.text).toContain("v 6.0 m/s · a_c = v²/r = 18.00 m/s² · T 2.09 s");
    const speeding = render(results({ radius: 2, omega: 1, aT: 1.5, t: 0 }), ["circle", "labels"]);
    expect(speeding.text).toContain("a_t +1.5 · a 2.50 m/s², 36.9° off the radius");
    expect(speeding.text).toContain("speeding up");
    expect(render(results({ radius: 2, omega: 3, aT: 0 }), ["circle"]).text).not.toMatch(/18\.00|a_c =/);
  });
});

describe("the incline view", () => {
  it("draws the range only with words, and warns about a throw into the slope", () => {
    const shown = render(results({ speed: 20, launch: 60 * DEG, slope: 30 * DEG, t: 3 }), ["incline", "labels"]);
    expect(shown.rec.texts()).toEqual(expect.arrayContaining(["α 30°", "θ 60°", "thrown at 20 m/s from the foot of the slope"]));
    expect(shown.text).toContain("R 27.2 m up the slope · flight 2.36 s");
    expect(render(results({ speed: 20, launch: 60 * DEG, slope: 30 * DEG }), ["incline"]).text).not.toMatch(/27\.2|R /);
    expect(render(results({ launch: 20 * DEG, slope: 30 * DEG }), ["incline", "labels"]).text).toContain("aim above the slope");
  });
});

describe("on a phone", () => {
  const cases: [string, Partial<RelMotionState>, Partial<RelMotionParams>][] = [
    ["fall", { u: 30, h0: 50, t: 1 }, {}],
    ["fall", { u: 0, h0: 0, t: 0 }, {}],
    ["fall", { u: 20, h0: 0, t: 12 }, {}],
    ["cars", { vA: 30, vB: -30, gap: 200, t: 6 }, {}],
    ["cars", { vA: -30, vB: 30, gap: 0, t: 12 }, {}],
    ["push", { k: 3, v0: 20, t: 6 }, { push: "ramp" }],
    ["push", { k: 0.1, v0: 20, t: 6 }, { push: "drag" }],
    ["river", { width: 200, vRiver: 5, vBoat: 0.5, heading: 0, t: 12 }, {}],
    ["river", { width: 20, vRiver: 0, vBoat: 8, heading: 75 * DEG, t: 12 }, {}],
    ["river", { width: 100, vRiver: 2, vBoat: 4, heading: -75 * DEG, t: 0 }, {}],
    ["river", { width: 100, vRiver: 2, vBoat: 4, heading: 30 * DEG, t: 5 }, {}],
    ["river", { width: 100, vRiver: 5, vBoat: 8, heading: 20 * DEG, t: 0 }, {}],
    ["rain", { vRain: 2, vWalk: 15, vWind: -15, t: 3 }, {}],
    ["rain", { vRain: 40, vWalk: -15, vWind: 15, t: 7 }, {}],
    ["circle", { radius: 5, omega: 4, aT: 2, t: 0.3 }, {}],
    ["circle", { radius: 0.5, omega: 0.2, aT: -2, t: 4 }, {}],
    ["incline", { speed: 30, launch: 85 * DEG, slope: 40 * DEG, t: 2 }, {}],
    ["incline", { speed: 5, launch: 45 * DEG, slope: 0, t: 12 }, {}],
  ];

  it.each(cases)("keeps every word of the %s view on a 325 px canvas", (layer, state, params) => {
    for (const layers of [[layer], [layer, "labels"]]) {
      const { spans, layout, rec } = render(results(state, params), layers, 325);
      expect(spans.length).toBeGreaterThanOrEqual(3);
      expect(layout.height).toBeGreaterThanOrEqual(330);
      expect(layout.height).toBeLessThanOrEqual(420);
      for (const { text, x, y, align } of spans) {
        const w = text.length * 6;
        const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
        expect(text.length, text).toBeLessThanOrEqual(55);
        expect(left, `${text} starts at ${left}`).toBeGreaterThanOrEqual(0);
        expect(left + w, `${text} ends at ${left + w}`).toBeLessThanOrEqual(325);
        expect(y, text).toBeGreaterThanOrEqual(0);
        expect(y, text).toBeLessThanOrEqual(layout.height);
      }
      for (const call of rec.of("arc")) {
        const [cx, cy] = call.args as [number, number];
        expect(cx).toBeGreaterThanOrEqual(0);
        expect(cx).toBeLessThanOrEqual(325);
        expect(cy).toBeGreaterThanOrEqual(0);
        expect(cy).toBeLessThanOrEqual(layout.height);
      }
    }
  });
});

describe("helpers", () => {
  it("rounds axis tops up to a round number", () => {
    expect([niceCeil(0.7), niceCeil(9.6), niceCeil(20.4), niceCeil(103), niceCeil(0)]).toEqual([0.8, 10, 25, 150, 1]);
  });
});
