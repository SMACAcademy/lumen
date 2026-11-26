import { pulleysModel, type PulleysParams } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computePulleysLayout, pulleysRenderer } from "./pulleys/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const deg = (d: number) => (d * Math.PI) / 180;
const results = (over: Partial<PulleysParams> = {}, t = 0) => pulleysModel.derive({ t }, { ...pulleysModel.defaultParams, ...over });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  pulleysRenderer.draw(rec.ctx, computePulleysLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const text = (r: ReturnType<typeof results>, layers: string[]) => render(r, layers).texts().join(" | ");

const RIG = ["rig", "forces", "pairs", "labels"];

describe("the rigs", () => {
  it("gives the Atwood machine's a and T from the model", () => {
    const t = text(results({ rig: "atwood", m1: 3, m2: 2 }), RIG);
    expect(t).toContain("An Atwood machine");
    expect(t).toContain("a = 1.96 m/s² · T = 23.52 N");
    expect(t).toContain("T 23.5 N");
    expect(t).toContain("m₁g 29.4 N");
    expect(text(results({ m1: 3, m2: 3 }), RIG)).toContain("balanced: a = 0 · T = 29.40 N");
  });

  it("says when friction holds the table's block", () => {
    expect(text(results({ rig: "table", m1: 4, m2: 2, mu: 0.25 }), RIG)).toContain("a = 1.63 m/s² · T = 16.33 N · f = 9.80 N");
    expect(text(results({ rig: "table", m1: 4, m2: 2, mu: 0.6 }), RIG)).toContain("held by friction · T = 19.60 N · f = 19.60 N");
  });

  it("shows the movable pulley's constraint, x₂ = x₁/2", () => {
    const t = text(results({ rig: "movable", m1: 2, m2: 2 }, 0.5), RIG);
    expect(t).toContain("a₁ = 3.92, a₂ = 1.96 m/s² · T = 11.76 N");
    expect(t).toContain("moved: x₁ = 0.49 m, x₂ = 0.25 m");
    expect(t).toContain("2T 23.5 N");
  });

  it("draws the reactions dashed only with the pairs layer", () => {
    const r = results({ rig: "table", m1: 4, m2: 2, mu: 0.25 });
    const dashed = (layers: string[]) => render(r, layers).of("setLineDash").filter((c) => (c.args[0] as number[]).length > 0).length;
    expect(dashed(["rig", "forces", "pairs"])).toBe(dashed(["rig", "forces"]) + 4);
    expect(text(r, ["rig", "forces", "pairs"])).toContain("Dashed: each reaction, acting on the other body");
  });

  it("names forces without numbers when the words are off", () => {
    const t = render(results({ rig: "atwood", m1: 4, m2: 1 }), ["rig", "forces", "pairs"]).texts();
    expect(t).toEqual(expect.arrayContaining(["T", "m₁g", "m₂g"]));
    expect(t.join(" ")).not.toMatch(/\d\.\d/);
    expect(render(results({ rig: "movable", m1: 2, m2: 2 }), ["rig", "forces"]).texts().join(" ")).not.toMatch(/\d\.\d/);
  });
});

describe("frames", () => {
  it("reads the lift's scale", () => {
    const t = text(results({ personMass: 60, liftAccel: 2 }), ["lift", "forces", "labels"]);
    expect(t).toContain("N = 708.0 N · Mg = 588.0 N (M = 60 kg)");
    expect(t).toContain("72.2 kg");
    expect(t).toContain("accelerating up: feels heavier");
    expect(text(results({ liftAccel: -9.8 }), ["lift", "forces", "labels"])).toContain("free fall: N = 0, weightless");
    expect(render(results({ personMass: 60, liftAccel: 2 }), ["lift", "forces"]).texts().join(" ")).not.toMatch(/708|72\.2/);
  });

  it("explains the tilted bob in each frame", () => {
    const ground = text(results({ carAccel: 9.8, view: "ground" }), ["car", "forces", "labels"]);
    expect(ground).toContain("θ = 45.0° · T = 6.93 N · ma = 4.90 N");
    expect(ground).toContain("ma (net)");
    const inside = text(results({ carAccel: 9.8, view: "car" }), ["car", "forces", "labels"]);
    expect(inside).toContain("−ma");
    expect(inside).toContain("Car frame: pseudo force −ma balances T and mg");
  });
});

describe("circles", () => {
  it("gives the banked road's speeds and a verdict", () => {
    const t = text(results({ radius: 50, bank: 0, roadMu: 0.4, speed: 14 }), ["road", "forces", "labels"]);
    expect(t).toContain("v = 14.0 · v₀ = 0.0 · v_max = 14.0 m/s");
    expect(t).toContain("holds the road: needs μ ≥ 0.40");
    expect(text(results({ radius: 50, bank: 0, roadMu: 0.4, speed: 20 }), ["road", "forces", "labels"])).toContain("too fast: skids outwards");
    const v0 = Math.sqrt(50 * 9.8 * Math.tan(deg(20)));
    expect(text(results({ radius: 50, bank: deg(20), speed: v0 }), ["road", "forces", "labels"])).toContain("no friction needed: this is v₀");
    expect(render(results({ radius: 40, bank: deg(45 * 0.8) }), ["road", "forces"]).texts().join(" ")).not.toContain("v₀");
  });

  it("gives the conical pendulum's period only with the words", () => {
    const r = results({ stringLength: 1, coneAngle: deg(60) });
    expect(text(r, ["cone", "forces", "labels"])).toContain("r = 0.87 m · v = 3.83 m/s · period 1.42 s");
    expect(render(r, ["cone", "forces"]).texts().join(" ")).not.toContain("1.42");
  });
});

describe("on a phone", () => {
  const scenes: [Partial<PulleysParams>, string[], number][] = [
    [{ rig: "atwood", m1: 10, m2: 0.5 }, RIG, 100],
    [{ rig: "atwood", m1: 0.5, m2: 10 }, RIG, 100],
    [{ rig: "table", m1: 10, m2: 10, mu: 0.3 }, RIG, 100],
    [{ rig: "table", m1: 0.5, m2: 10, mu: 0 }, RIG, 0],
    [{ rig: "table", m1: 10, m2: 1, mu: 1 }, RIG, 0],
    [{ rig: "movable", m1: 10, m2: 0.5 }, RIG, 100],
    [{ rig: "movable", m1: 0.5, m2: 10 }, RIG, 100],
    [{ personMass: 120, liftAccel: 5 }, ["lift", "forces", "pairs", "labels"], 0],
    [{ personMass: 120, liftAccel: -9.8 }, ["lift", "forces", "pairs", "labels"], 0],
    [{ carAccel: 10, view: "car" }, ["car", "forces", "labels"], 0],
    [{ carAccel: 10, view: "ground" }, ["car", "forces", "labels"], 0],
    [{ bank: deg(40), speed: 50, roadMu: 1, radius: 10 }, ["road", "forces", "labels"], 0],
    [{ bank: deg(40), speed: 0, roadMu: 0, radius: 200 }, ["road", "forces", "labels"], 0],
    [{ stringLength: 2, coneAngle: deg(80) }, ["cone", "forces", "labels"], 0],
    [{ stringLength: 2, coneAngle: deg(80) }, ["cone", "forces", "labels"], 0.4],
    [{ stringLength: 2, coneAngle: deg(5) }, ["cone", "forces", "labels"], 0],
  ];

  it.each(scenes.map((s, i) => [i, ...s] as const))("keeps scene %i on a 325 px canvas", (_i, over, layers, t) => {
    const width = 325;
    const { height } = computePulleysLayout(width);
    const rec = render(results(over, t), layers, width);
    for (const call of rec.of("fillText")) {
      const [words, x, y] = call.args as [string, number, number];
      expect(words.length, words).toBeLessThanOrEqual(55);
      // The recorder measures 6 px a character; alignment is not recorded, so allow either side.
      expect(x, words).toBeGreaterThanOrEqual(0);
      expect(x, words).toBeLessThanOrEqual(width);
      expect(y, words).toBeGreaterThanOrEqual(0);
      expect(y, words).toBeLessThanOrEqual(height);
    }
    for (const call of [...rec.of("moveTo"), ...rec.of("lineTo"), ...rec.of("arc")]) {
      const [x, y] = call.args as [number, number];
      expect(x).toBeGreaterThanOrEqual(-1);
      expect(x).toBeLessThanOrEqual(width + 1);
      expect(y).toBeGreaterThanOrEqual(-1);
      expect(y).toBeLessThanOrEqual(height + 1);
    }
  });

  it("keeps left- and right-aligned labels inside the canvas", () => {
    const width = 325;
    for (const [over, layers, t] of scenes) {
      const rec = recordingContext();
      const aligns: string[] = [];
      const ctx = new Proxy(rec.ctx, {
        get(target, key) {
          const value = Reflect.get(target, key);
          if (key === "fillText") return (s: string, x: number, y: number) => {
            const align = Reflect.get(target, "textAlign") as string;
            aligns.push(align);
            const w = s.length * 6;
            const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
            expect(left, s).toBeGreaterThanOrEqual(-1);
            expect(left + w, s).toBeLessThanOrEqual(width + 1);
          };
          return value;
        },
        set(target, key, value) {
          return Reflect.set(target, key, value);
        },
      });
      pulleysRenderer.draw(ctx, computePulleysLayout(width), { results: results(over, t), trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
      expect(aligns.length).toBeGreaterThan(0);
    }
  });
});
