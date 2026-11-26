import { balanceModel, type BalanceParams } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { balanceRenderer, computeBalanceLayout, tiltAngle } from "./balance/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const EQ: BalanceParams = { a: 2, b: 3, c: 0, d: 11 };
const results = (x: number, take = 0, takeX = 0, params = EQ) => balanceModel.derive({ x, take, takeX }, params);
const render = (r: ReturnType<typeof results>, layers = ["scale", "weights", "labels"], width = 800) => {
  const rec = recordingContext();
  balanceRenderer.draw(rec.ctx, computeBalanceLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};

describe("the balance scale", () => {
  it("tips towards the heavier pan, and lies level when balanced", () => {
    expect(tiltAngle(11, 11)).toBe(0);
    expect(tiltAngle(15, 11)).toBeGreaterThan(0);
    expect(tiltAngle(0, 100)).toBeCloseTo(-0.175, 9);
  });

  it("writes the equation as the pans stand, and says when it balances", () => {
    expect(render(results(3)).texts()).toEqual(expect.arrayContaining(["2x + 3 = 11"]));
    expect(render(results(3)).texts().join(" ")).toContain("right side heavier");
    expect(render(results(4, 3)).texts()).toEqual(expect.arrayContaining(["2x = 8", "Balanced with x = 4"]));
  });

  it("puts a box on the pan for every x and a block for every unit", () => {
    const rec = render(results(4), ["weights"]);
    // Two boxes and three units on the left, eleven units on the right.
    expect(rec.of("fillRect")).toHaveLength(2 + 3 + 11);
  });

  it("fits a phone", () => {
    const phone = computeBalanceLayout(375);
    expect(phone.pivot.x + phone.beam / 2 + phone.pan / 2).toBeLessThanOrEqual(375 + 1);
  });
});
