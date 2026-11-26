import { circuitModel, type CircuitParams } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { bulbPositions, circuitRenderer, computeCircuitLayout, pointOnLoop } from "./circuit/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const ALL = ["circuit", "flow", "labels"];
const layout = computeCircuitLayout(800);
const results = (over: Partial<CircuitParams> = {}, t = 1) => circuitModel.derive({ t }, { ...circuitModel.defaultParams, ...over });
const render = (r = results(), layers = ALL, at = layout) => {
  const rec = recordingContext();
  circuitRenderer.draw(rec.ctx, at, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};

describe("circuit layout", () => {
  it("fits a phone and walks round the loop", () => {
    const phone = computeCircuitLayout(375);
    expect(phone.loop.x).toBeGreaterThan(20);
    expect(phone.loop.x + phone.loop.width).toBeLessThan(375 - 20);
    const { loop } = layout;
    expect(pointOnLoop(loop, 0)).toEqual([loop.x, loop.y]);
    expect(pointOnLoop(loop, loop.width)).toEqual([loop.x + loop.width, loop.y]);
    expect(pointOnLoop(loop, 2 * (loop.width + loop.height))).toEqual([loop.x, loop.y]);
  });

  it("leaves room above the top wire for the brightest glow", () => {
    expect(layout.loop.y).toBeGreaterThanOrEqual(18 + 3 * 9 * 2.2);
  });

  it("spaces the bulbs along the top", () => {
    const xs = bulbPositions(layout.loop, 3);
    expect(xs).toHaveLength(3);
    expect(xs[1]! - xs[0]!).toBeCloseTo(xs[2]! - xs[1]!, 9);
  });
});

describe("what the circuit renderer draws", () => {
  const arcs = (rec: ReturnType<typeof render>) => rec.of("arc").length;

  it("glows only when the bulb is lit", () => {
    const on = render(results(), ["circuit"]);
    const off = render(results({ switchClosed: "open" }), ["circuit"]);
    expect(arcs(on)).toBeGreaterThan(arcs(off));
  });

  it("names what sits in the gap, and says why the loop is broken", () => {
    const eraser = render(results({ gap: "rubber" })).texts().join(" ");
    expect(eraser).toContain("Eraser");
    expect(eraser).toContain("does not conduct");
    expect(render(results({ switchClosed: "open" })).texts().join(" ")).toContain("switch open");
    expect(render(results()).texts().join(" ")).toContain("The loop is closed");
  });

  it("draws parallel bulbs on rungs, each at full brightness", () => {
    const text = render(results({ bulbs: 3, arrangement: "parallel" })).texts().join(" ");
    expect(text).toContain("each with the full push");
    // On rungs the bulbs sit below the top wire, not on it.
    const ys = (r: ReturnType<typeof results>) => render(r, ["circuit"]).of("arc").map((c) => c.args[1] as number);
    expect(ys(results({ bulbs: 3, arrangement: "parallel" }))).toContain(layout.loop.y + 30);
    expect(ys(results({ bulbs: 3 }))).not.toContain(layout.loop.y + 30);
  });

  it("moves charges only when current flows", () => {
    const flowing = arcs(render(results(), ["flow"]));
    expect(flowing).toBeGreaterThan(10);
    expect(arcs(render(results({ gap: "wood" }), ["flow"]))).toBe(0);
  });
});
