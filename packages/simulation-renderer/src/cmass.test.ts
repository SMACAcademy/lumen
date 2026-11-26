import { CMASS_INITIAL, cmassModel, type CmassParams, type CmassState } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { cmassRenderer, computeCmassLayout } from "./cmass/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const deg = (d: number) => (d * Math.PI) / 180;
const results = (state: Partial<CmassState> = {}, params: Partial<CmassParams> = {}) =>
  cmassModel.derive({ ...CMASS_INITIAL, ...state }, { ...cmassModel.defaultParams, ...params });

/** Renders, and also notes each text's alignment so its extent can be checked. */
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  const placed: { text: string; x: number; y: number; align: string }[] = [];
  const target = rec.ctx as unknown as Record<string, unknown>;
  const ctx = new Proxy(target, {
    get(t, key: string) {
      if (key === "fillText") {
        return (text: string, x: number, y: number) => {
          placed.push({ text: String(text), x, y, align: String(t.textAlign ?? "left") });
          (t.fillText as (...a: unknown[]) => void)(text, x, y);
        };
      }
      return t[key];
    },
    set(t, key: string, value) {
      t[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  const layout = computeCmassLayout(width);
  cmassRenderer.draw(ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { ...rec, placed, layout, words: () => rec.texts().join(" ") };
};

/** Every text drawn lies on the canvas, at about 6 px a character. */
const onCanvas = (out: ReturnType<typeof render>) => {
  const { width, height } = out.layout;
  for (const { text, x, y, align } of out.placed) {
    const w = text.length * 6;
    const leftEdge = align === "center" ? x - w / 2 : align === "right" || align === "end" ? x - w : x;
    expect(leftEdge, `"${text}" left`).toBeGreaterThanOrEqual(-1);
    expect(leftEdge + w, `"${text}" right`).toBeLessThanOrEqual(width + 1);
    expect(y, `"${text}" y`).toBeGreaterThanOrEqual(0);
    expect(y, `"${text}" y`).toBeLessThanOrEqual(height);
  }
  for (const text of out.texts()) expect(text.length, text).toBeLessThanOrEqual(56);
};

describe("the rod", () => {
  it("names the masses and gives x_cm only with the words", () => {
    const shown = render(results({ mA: 1, mB: 2, mC: 1, xB: 0.3 }), ["rod", "labels"]);
    expect(shown.texts()).toEqual(expect.arrayContaining(["Masses on a light 1 m rod", "A 1.0 kg", "B 2.0 kg", "C 1.0 kg", "1 m"]));
    expect(shown.words()).toContain("x_cm = Σmx ÷ Σm = 1.60 ÷ 4.0 = 0.40 m");
    const hidden = render(results({ mA: 2, mB: 0, mC: 3 }), ["rod"]);
    expect(hidden.words()).not.toContain("0.60");
    expect(hidden.texts()).not.toContain("B 0.0 kg");
  });
});

describe("the shell", () => {
  it("says where the pieces land once they are down, and that the CM lands at R", () => {
    const flight = results().shellFlight;
    const landed = render(results({ t: flight + 0.5 }), ["shell", "labels"]).words();
    expect(landed).toContain("pieces land at 20.4 m and 61.2 m");
    expect(landed).toContain("their centre of mass lands at 40.8 m = R");
    expect(render(results({ t: flight + 0.5 }), ["shell"]).words()).not.toContain("61.2");
  });
});

describe("the pucks", () => {
  it("gives the energy lost and the angles", () => {
    const out = render(results({ puckOffset: 0.5, puckE: 1 }), ["pucks", "labels"]).words();
    expect(out).toContain("puck 1 at 60.0°, puck 2 at −30.0°: 90.0° apart");
    expect(render(results({ puckOffset: 0.6, puckE: 0.5 }), ["pucks", "labels"]).words()).toContain("KE 2.00 J → 1.52 J: 0.48 J lost");
    expect(render(results({ puckOffset: 0, puckE: 0.5 }), ["pucks", "labels"]).words()).toContain("head on: puck 1 at 0.50 m/s, puck 2 at 1.50 m/s");
    expect(render(results({ puckOffset: 0.6, puckE: 0.5 }), ["pucks"]).words()).not.toContain("lost");
  });

  it("draws the momentum triangle: three arrows", () => {
    const out = render(results({ puckOffset: 0.5 }), ["pucks"]);
    expect(out.texts()).toEqual(expect.arrayContaining(["p", "p₁′", "p₂′"]));
  });
});

describe("the rocket", () => {
  it("gives thrust and burn-out speed only with the words", () => {
    const out = render(results({ fuel: 750 }), ["rocket", "labels"]).words();
    expect(out).toContain("thrust u·dm/dt = 100.0 kN · burn-out 2773 m/s");
    expect(render(results({ fuel: 750 }), ["rocket"]).words()).not.toMatch(/kN|2773/);
  });
});

describe("the spring", () => {
  it("gives the work both ways", () => {
    expect(render(results({ springX1: 0, springX2: 0.2 }), ["spring", "labels"]).words()).toContain("by the spring −4.00 J · by your hand 4.00 J");
    expect(render(results({ springX1: 0.1, springX2: 0.3 }), ["spring"]).words()).not.toContain("8.00");
  });

  it("shades the work as an area", () => {
    expect(render(results({ springX2: 0.2 }), ["spring"]).of("fill").length).toBeGreaterThan(0);
  });
});

describe("the car", () => {
  it("gives P = Fv climbing, and the average when speeding up", () => {
    expect(render(results({ carMass: 1000, slope: Math.asin(0.1), carSpeed: 20, resistance: 500 }), ["car", "labels"]).words()).toContain("F = mg sin θ + f = 1480 N · P = Fv = 29.6 kW");
    const speeding = render(results({ driveForce: 2000, t: 10 }, { drive: "speeding" }), ["car", "labels"]).words();
    expect(speeding).toContain("P = Fv = 40.0 kW");
    expect(speeding).toContain("average so far = W ÷ t = 20.0 kW");
    expect(render(results({ t: 10 }, { drive: "speeding" }), ["car"]).words()).not.toContain("kW");
  });
});

describe("the vertical circle", () => {
  it("states 6mg when it loops, and where it goes slack when it does not", () => {
    expect(render(results({ loopV0: 8 }), ["loop", "labels"]).words()).toContain("T bottom 36.9 N − T top 7.5 N = 29.4 N = 6mg");
    const slack = render(results({ loopV0: 6 }), ["loop", "labels"]);
    expect(slack.words()).toContain("slack 1.56 m above the bottom");
    expect(slack.texts()).toContain("slack");
    expect(render(results({ loopV0: 8 }), ["loop"]).words()).not.toContain("7.5");
  });
});

describe("the potential-energy curve", () => {
  it("names the equilibria and the turning points only with the words", () => {
    const out = render(results({ ballX0: -0.5 }), ["well", "labels"]);
    expect(out.texts()).toEqual(expect.arrayContaining(["stable", "unstable", "E"]));
    expect(out.words()).toContain("turns at −1.32 m and −0.50 m");
    const hidden = render(results({ ballX0: -0.5 }), ["well"]).texts();
    expect(hidden).not.toContain("stable");
    expect(hidden.join(" ")).not.toContain("1.32");
  });
});

describe("on a phone", () => {
  it("keeps every label of every scene on a 325 px canvas", () => {
    const flight = results().shellFlight;
    const cases: [string, ReturnType<typeof results>][] = [
      ["rod", results({ mA: 4, mB: 4, mC: 4, xB: 0 })],
      ["rod", results({ mA: 0.5, mB: 4, mC: 4, xB: 1 })],
      ["shell", results({ t: 0.5 })],
      ["shell", results({ t: flight, fragShare: 0.9, fragVelocity: -20 })],
      ["pucks", results({ puckOffset: 0.9, puckM1: 0.5, puckM2: 4, t: 3 })],
      ["pucks", results({ puckOffset: 0, puckE: 0 })],
      ["rocket", results({ t: 5 })],
      ["rocket", results({ t: 20, fuel: 900, exhaust: 3000, burnRate: 50 }, { gravity: "on" })],
      ["spring", results({ springK: 500, springX1: -0.4, springX2: 0.4 })],
      ["spring", results({ springX1: 0.4, springX2: -0.4 })],
      ["car", results({ slope: deg(30), carMass: 2000, resistance: 2000, carSpeed: 30, t: 7 })],
      ["car", results({ slope: 0, resistance: 0, t: 0 })],
      ["car", results({ driveForce: 5000, carMass: 500, t: 20 }, { drive: "speeding" })],
      ["loop", results({ loopV0: 6, loopR: 2, t: 2 })],
      ["loop", results({ loopV0: 10, loopR: 2, loopMass: 0.1, t: 1 })],
      ["loop", results({ loopV0: 7.5, loopR: 1.5, t: 1.1 })],
      ["loop", results({ loopV0: 2, loopR: 0.5, t: 0.3 })],
      ["well", results({ ballX0: -1.7 })],
      ["well", results({ ballX0: 1.7, t: 3 })],
      ["well", results({ ballX0: 0.5 })],
    ];
    for (const [layer, r] of cases) {
      const out = render(r, [layer, "labels"], 325);
      expect(out.texts().length, layer).toBeGreaterThan(2);
      onCanvas(out);
    }
  });

  it("keeps the loop's ball inside the canvas", () => {
    for (const t of [0, 0.4, 0.9, 1.6]) {
      const out = render(results({ loopV0: 10, loopR: 2, t }), ["loop"], 325);
      for (const call of out.of("arc")) {
        const [x, y] = call.args as [number, number];
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(325);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(out.layout.height);
      }
    }
  });
});
