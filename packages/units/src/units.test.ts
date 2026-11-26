import { describe, expect, it } from "vitest";
import {
  TAU,
  convert,
  degToRad,
  DimensionMismatchError,
  formatAngle,
  formatNumber,
  formatSignificant,
  normalizeDegrees,
  normalizeRadians,
  piFraction,
  radToDeg,
  revolutions,
  shortestAngleDelta,
  snapZero,
} from "./index";

describe("angle conversion", () => {
  it("converts degrees to radians and back", () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI, 15);
    expect(degToRad(90)).toBeCloseTo(Math.PI / 2, 15);
    expect(radToDeg(Math.PI / 4)).toBeCloseTo(45, 12);
    for (const deg of [0, 1, 30, 45, 60, 90, 123.456, 270, 359.9, -90]) {
      expect(radToDeg(degToRad(deg))).toBeCloseTo(deg, 10);
    }
  });

  it("normalizes into [0, 2π)", () => {
    expect(normalizeRadians(0)).toBe(0);
    expect(normalizeRadians(TAU)).toBe(0);
    expect(normalizeRadians(-Math.PI / 2)).toBeCloseTo((3 * Math.PI) / 2, 12);
    expect(normalizeRadians(5 * Math.PI)).toBeCloseTo(Math.PI, 12);
    expect(normalizeDegrees(370)).toBeCloseTo(10, 10);
    expect(normalizeDegrees(-30)).toBeCloseTo(330, 10);
  });

  it("finds the shortest signed rotation between angles", () => {
    expect(shortestAngleDelta(degToRad(350), degToRad(10))).toBeCloseTo(degToRad(20), 12);
    expect(shortestAngleDelta(degToRad(10), degToRad(350))).toBeCloseTo(degToRad(-20), 12);
    expect(shortestAngleDelta(TAU * 3 + 0.1, 0.3)).toBeCloseTo(0.2, 12);
    expect(shortestAngleDelta(0, Math.PI)).toBeCloseTo(Math.PI, 12);
  });

  it("counts revolutions of an unwrapped angle", () => {
    expect(revolutions(0)).toBe(0);
    expect(revolutions(TAU - 0.01)).toBe(0);
    expect(revolutions(TAU)).toBe(1);
    expect(revolutions(-0.01)).toBe(-1);
    expect(revolutions(2.5 * TAU)).toBe(2);
  });

  it("expresses nice angles as fractions of π", () => {
    expect(piFraction(0)).toBe("0");
    expect(piFraction(Math.PI)).toBe("π");
    expect(piFraction(Math.PI / 4)).toBe("π/4");
    expect(piFraction((3 * Math.PI) / 2)).toBe("3π/2");
    expect(piFraction((5 * Math.PI) / 6)).toBe("5π/6");
    expect(piFraction(degToRad(15))).toBe("π/12");
    expect(piFraction(-Math.PI / 3)).toBe("−π/3");
    expect(piFraction(1)).toBeNull();
  });
});

describe("formatting", () => {
  it("snaps floating-point noise to zero", () => {
    expect(snapZero(Math.sin(Math.PI))).toBe(0);
    expect(snapZero(0.5)).toBe(0.5);
  });

  it("never prints negative zero", () => {
    expect(formatNumber(-0)).toBe("0.0000");
    expect(formatNumber(-1e-17)).toBe("0.0000");
    expect(formatNumber(-0.00001)).toBe("0.0000");
    expect(formatNumber(Math.cos(Math.PI / 2))).toBe("0.0000");
  });

  it("uses a typographic minus and fixed digits", () => {
    expect(formatNumber(Math.SQRT1_2)).toBe("0.7071");
    expect(formatNumber(-0.5)).toBe("−0.5000");
    expect(formatNumber(1, 2)).toBe("1.00");
    expect(formatNumber(Number.NaN)).toBe("undefined");
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe("∞");
  });

  it("formats angles in degrees and radians", () => {
    expect(formatAngle(Math.PI / 4, "deg")).toBe("45°");
    expect(formatAngle(degToRad(12.5), "deg")).toBe("12.5°");
    expect(formatAngle(Math.PI / 4, "rad")).toBe("π/4 rad");
    expect(formatAngle(1, "rad")).toBe("1.000 rad");
    expect(formatAngle(Math.PI / 4, "rad", { piForm: false })).toBe("0.785 rad");
  });
});

describe("unit registry", () => {
  it("converts within a dimension", () => {
    expect(convert(90, "deg", "rad")).toBeCloseTo(Math.PI / 2, 12);
    expect(convert(36, "km/h", "m/s")).toBeCloseTo(10, 12);
    expect(convert(250, "cm", "m")).toBeCloseTo(2.5, 12);
    expect(convert(500, "g", "kg")).toBeCloseTo(0.5, 12);
    expect(convert(180, "deg/s", "rad/s")).toBeCloseTo(Math.PI, 12);
  });

  it("rejects conversions across dimensions", () => {
    expect(() => convert(1, "m", "s")).toThrow(DimensionMismatchError);
  });
});

describe("formatSignificant", () => {
  it("keeps three significant figures across ordinary sizes", () => {
    expect(formatSignificant(0.0046)).toBe("0.00460");
    expect(formatSignificant(54)).toBe("54.0");
    expect(formatSignificant(487.2)).toBe("487");
    expect(formatSignificant(-1.5)).toBe("−1.50");
  });

  it("switches to powers of ten for the very small and the very large", () => {
    expect(formatSignificant(1.74e-5)).toBe("1.74 × 10⁻⁵");
    expect(formatSignificant(2.5e7)).toBe("2.50 × 10⁷");
  });

  it("handles zero and infinity", () => {
    expect(formatSignificant(0)).toBe("0");
    expect(formatSignificant(Number.POSITIVE_INFINITY)).toBe("∞");
  });
});
