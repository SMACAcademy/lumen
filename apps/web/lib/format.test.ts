import type { Quantity, RangeControl } from "@ise/concept-schema";
import { describe, expect, it } from "vitest";
import { displayUnitFor, formatControlValue, formatQuantity, fromDisplay, splitSymbolForPower, toDisplay } from "./format";

const omega: RangeControl = { type: "range", unit: "rad/s", min: 0.1, max: 3, step: Math.PI / 36 };
const theta: RangeControl = { type: "range", unit: "rad", min: 0, max: 2 * Math.PI, step: Math.PI / 180 };

describe("display units", () => {
  it("follows the learner's angle preference", () => {
    expect(displayUnitFor("rad", "deg")).toBe("deg");
    expect(displayUnitFor("rad/s", "deg")).toBe("deg/s");
    expect(displayUnitFor("rad/s", "rad")).toBe("rad/s");
    expect(displayUnitFor("m", "deg")).toBe("m");
  });

  it("round-trips values through the display unit", () => {
    expect(toDisplay(Math.PI / 4, omega, "deg")).toBeCloseTo(45, 10);
    expect(fromDisplay(45, omega, "deg")).toBeCloseTo(Math.PI / 4, 10);
    expect(toDisplay(1, theta, "rad")).toBe(1);
  });

  it("formats control values with units", () => {
    expect(formatControlValue(Math.PI / 4, omega, "deg")).toBe("45 °/s");
    expect(formatControlValue(Math.PI / 2, theta, "deg")).toBe("90°");
    expect(formatControlValue(Math.PI / 2, theta, "rad")).toBe("π/2 rad");
  });
});

describe("formatQuantity", () => {
  const base = { id: "q", symbol: "q", name: "q", meaning: "m", color: "neutral" as const };
  it("formats numbers, angles, integers and labels", () => {
    const results = { sin: -0.5, thetaNorm: Math.PI, revolutions: 2, quadrant: 0, tan: Number.NaN };
    expect(formatQuantity({ ...base, result: "sin", format: { kind: "number", digits: 4 } } as Quantity, results, "deg")).toBe("−0.5000");
    expect(formatQuantity({ ...base, result: "thetaNorm", format: { kind: "angle" } } as Quantity, results, "rad")).toBe("π rad");
    expect(formatQuantity({ ...base, result: "revolutions", format: { kind: "integer" } } as Quantity, results, "deg")).toBe("2");
    expect(
      formatQuantity({ ...base, result: "quadrant", format: { kind: "label", labels: { "0": "on an axis" } } } as Quantity, results, "deg"),
    ).toBe("on an axis");
    expect(formatQuantity({ ...base, result: "tan", format: { kind: "number", digits: 4 } } as Quantity, results, "deg")).toBe("undefined");
  });

  it("splits function symbols for powers", () => {
    expect(splitSymbolForPower("sin θ")).toEqual({ head: "sin", tail: "θ" });
    expect(splitSymbolForPower("x")).toEqual({ head: "x", tail: "" });
  });
});
