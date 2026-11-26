import { createTrace, sweepTrace } from "@ise/science-engine";
import { describe, expect, it } from "vitest";
import { createGraphFrame } from "./frame";
import { tracePolylines } from "./paths";
import { angleTicks, linearTicks } from "./ticks";
import { functionPolylines } from "./paths";

const TAU = Math.PI * 2;
const rect = { x: 100, y: 50, width: 360, height: 200 };

describe("GraphFrame", () => {
  it("maps a rightward graph with the value axis pointing up", () => {
    const f = createGraphFrame({ rect, orientation: "right", coordinateDomain: [0, TAU], valueDomain: [-1, 1] });
    expect(f.point(0, 1)).toEqual([100, 50]);
    expect(f.point(TAU, -1)).toEqual([460, 250]);
    const [x, y] = f.point(Math.PI, 0);
    expect(x).toBeCloseTo(280, 9);
    expect(y).toBeCloseTo(150, 9);
  });

  it("maps a downward graph with the value axis pointing right", () => {
    const f = createGraphFrame({ rect, orientation: "down", coordinateDomain: [0, TAU], valueDomain: [-1, 1] });
    expect(f.point(0, -1)).toEqual([100, 50]);
    const [x, y] = f.point(TAU, 1);
    expect(x).toBeCloseTo(460, 9);
    expect(y).toBeCloseTo(250, 9);
  });

  it("accepts a shared value scale so connectors are exactly horizontal", () => {
    // Circle centred at y = 150 with radius 80: value v ↦ 150 − 80v.
    const f = createGraphFrame({
      rect,
      orientation: "right",
      coordinateDomain: [0, TAU],
      valueDomain: [-1, 1],
      valueRange: [230, 70],
    });
    expect(f.valueToPixel(0.5)).toBeCloseTo(110, 9);
    expect(f.valueToPixel(1)).toBeCloseTo(70, 9);
  });

  it("inverts pixels to coordinates and clamps", () => {
    const f = createGraphFrame({ rect, orientation: "right", coordinateDomain: [0, TAU], valueDomain: [-1, 1] });
    expect(f.coordinateAt(280, 0)).toBeCloseTo(Math.PI, 9);
    expect(f.coordinateAt(0, 0)).toBe(0);
    expect(f.coordinateAt(9999, 0)).toBe(TAU);
    expect(f.contains(150, 100)).toBe(true);
    expect(f.contains(50, 100)).toBe(false);
  });
});

describe("ticks", () => {
  it("labels angle ticks at every quarter turn in degrees or radians", () => {
    const deg = angleTicks([0, TAU], "deg").filter((t) => t.major);
    expect(deg.map((t) => t.label)).toEqual(["0°", "90°", "180°", "270°", "360°"]);
    const rad = angleTicks([0, TAU], "rad").filter((t) => t.major);
    expect(rad.map((t) => t.label)).toEqual(["0", "π/2", "π", "3π/2", "2π"]);
    expect(angleTicks([0, TAU], "deg")).toHaveLength(9);
  });

  it("produces value ticks with clean labels", () => {
    expect(linearTicks([-1, 1], 4).map((t) => t.label)).toEqual(["−1", "−0.5", "0", "0.5", "1"]);
  });
});

describe("tracePolylines", () => {
  it("turns visited bins into polylines using the recorded values", () => {
    const trace = createTrace(["sin"], TAU, 8);
    sweepTrace(trace, 0.1, Math.PI - 0.1, (x) => ({ sin: Math.sin(x) }));
    const f = createGraphFrame({ rect, orientation: "right", coordinateDomain: [0, TAU], valueDomain: [-1, 1] });
    const lines = tracePolylines(trace, "sin", f);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.points).toHaveLength(4); // bins 0..3 of 8
    const [x, y] = lines[0]!.points[1]!;
    const centre = (1.5 / 8) * TAU;
    expect(x).toBeCloseTo(f.coordinateToPixel(centre), 9);
    expect(y).toBeCloseTo(f.valueToPixel(Math.sin(centre)), 9);
    expect(tracePolylines(trace, "missing", f)).toEqual([]);
  });
});

describe("general axes", () => {
  it("places angle ticks across a symmetric domain", () => {
    const labels = angleTicks([-TAU, TAU], "rad").filter((t) => t.major).map((t) => t.label);
    expect(labels[0]).toBe("−2π");
    expect(labels).toContain("0");
    expect(labels[labels.length - 1]).toBe("2π");
  });

  it("chooses round linear ticks", () => {
    expect(linearTicks([-2, 2], 4).map((t) => t.value)).toEqual([-2, -1, 0, 1, 2]);
    expect(linearTicks([0, 0.5], 5).map((t) => t.label)).toEqual(["0", "0.1", "0.2", "0.3", "0.4", "0.5"]);
  });

  it("maps trace coordinates through an offset", () => {
    const trace = createTrace(["m"], 4, 8);
    sweepTrace(trace, 1.9, 2.1, () => ({ m: 1 })); // records around coordinate 2 ↔ h = 0
    const f = createGraphFrame({ rect, orientation: "right", coordinateDomain: [-2, 2], valueDomain: [-1, 1] });
    const [x] = tracePolylines(trace, "m", f, -2)[0]!.points[0]!;
    expect(f.coordinateAt(x, 0)).toBeCloseTo(-0.25, 9); // bin 3 centre 1.75 − 2
  });

  it("breaks sampled functions at undefined points", () => {
    const f = createGraphFrame({ rect, orientation: "right", coordinateDomain: [-1, 1], valueDomain: [-10, 10] });
    const lines = functionPolylines((x) => (Math.abs(x) < 1e-9 ? Number.NaN : 1 / x), f, 200);
    expect(lines).toHaveLength(2);
  });
});

describe("tick label trimming", () => {
  it("keeps significant digits", () => {
    expect(linearTicks([1, 1.6], 3).map((t) => t.label)).toEqual(["1", "1.2", "1.4", "1.6"]);
    expect(linearTicks([0, 40], 4).map((t) => t.label)).toEqual(["0", "10", "20", "30", "40"]);
  });
});
