import { PRODUCT_PAIR_ORDER, PRODUCT_PAIRS, rulesModel, type RulesParams, type RulesState } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { computeRulesLayout, lineX, rectangleScale, rulesRenderer } from "./rules/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base: RulesState = { x: 1.5, cx: 0.5, dx: 0.5, angle: 53.13 };
const results = (params: Partial<RulesParams> = {}, state: Partial<RulesState> = {}) =>
  rulesModel.derive({ ...base, ...state }, { ...rulesModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  rulesRenderer.draw(rec.ctx, computeRulesLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};

describe("the growing rectangle", () => {
  it("draws the rectangle, two strips and a corner, and names them", () => {
    const rec = render(results({ pair: "x-square" }, { x: 2, dx: 0.5 }), ["rectangle", "labels"]);
    expect(rec.of("fillRect")).toHaveLength(4);
    expect(rec.texts()).toEqual(expect.arrayContaining(["u · v = x · x²", "u = x", "v = x²", "v·Δu", "u·Δv"]));
    expect(rec.texts().join(" ")).toContain("Δ(uv)/Δx = 15.25 → u′v + uv′ = 12.00 · corner");
  });

  it("shrinks the corner faster than the strips", () => {
    const corner = (dx: number) => {
      const boxes = render(results({ pair: "x-square" }, { x: 2, dx }), ["rectangle"]).of("fillRect");
      const [strip, cornerBox] = [boxes[1]!, boxes[3]!];
      return ((cornerBox.args[2] as number) * (cornerBox.args[3] as number)) / ((strip.args[2] as number) * (strip.args[3] as number));
    };
    expect(corner(0.1)).toBeLessThan(corner(0.5));
  });

  it("keeps the answers off the drawing when the words are hidden", () => {
    expect(render(results({ pair: "line-line" }, { x: 1 }), ["rectangle"]).texts().join(" ")).not.toMatch(/u′v|corner/);
  });

  it("fits every pair's largest rectangle inside a phone's canvas", () => {
    const layout = computeRulesLayout(325);
    for (const id of PRODUCT_PAIR_ORDER) {
      const scale = rectangleScale(layout, id);
      expect(layout.origin.x + PRODUCT_PAIRS[id].u(3) * scale.u, id).toBeLessThanOrEqual(325 - 50);
      expect(layout.origin.y - PRODUCT_PAIRS[id].v(3) * scale.v, id).toBeGreaterThanOrEqual(40);
    }
  });
});

describe("the chain", () => {
  it("draws three number lines and the two stretch factors", () => {
    const rec = render(results({ composition: "square-linear" }, { cx: 1, dx: 0.1 }), ["chain", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["y = (3x + 1)²: u = 3x + 1, y = u²", "x", "u", "y", "× 3.00", "× 8.00"]));
    expect(rec.texts().join(" ")).toContain("dy/dx = 3.00 × 8.00 = 24.00 · measured 24.90");
  });

  it("stretches the interval on the way down, and flips it when a rate is negative", () => {
    const layout = computeRulesLayout(375);
    const r = results({ composition: "exp-square" }, { cx: -1, dx: 0.2 });
    // u = x² falls as x rises from −1: the interval on the u line runs backwards.
    expect(lineX(layout, r.inner + r.innerChange, [0, 4])).toBeLessThan(lineX(layout, r.inner, [0, 4]));
    expect(lineX(layout, 99, [0, 4])).toBe(layout.lines.x2);
    expect(render(r, ["chain"]).texts().join(" ")).not.toContain("dy/dx");
  });
});

describe("the curve", () => {
  it("gives the slope as a ratio of the two rates", () => {
    const texts = render(results({ shape: "circle" }, { angle: (Math.atan2(4, 3) * 180) / Math.PI }), ["curve", "labels"]).texts();
    expect(texts).toContain("x² + y² = 25");
    expect(texts.join(" ")).toContain("(3.0, 4.0): dy/dt ÷ dx/dt = 3.00 ÷ −4.00 = −0.75");
  });

  it("says when the tangent is vertical, and draws the ellipse as an ellipse", () => {
    expect(render(results({ shape: "circle" }, { angle: 0 }), ["curve", "labels"]).texts().join(" ")).toContain("(5.0, 0.0): the tangent is vertical");
    const circle = render(results({ shape: "circle" }), ["curve"]).of("ellipse")[0]!.args as number[];
    const ellipse = render(results({ shape: "ellipse" }), ["curve"]).of("ellipse")[0]!.args as number[];
    expect(circle[2]).toBeCloseTo(circle[3]!, 8);
    expect(ellipse[3]! / ellipse[2]!).toBeCloseTo(0.6, 8);
  });
});
