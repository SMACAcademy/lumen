import { magnetsModel, type MagnetsParams } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeMagnetsLayout, magnetsRenderer } from "./magnets/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const results = (over: Partial<MagnetsParams> = {}, gap = 8, around = 0) => magnetsModel.derive({ gap, around }, { ...magnetsModel.defaultParams, ...over });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  magnetsRenderer.draw(rec.ctx, computeMagnetsLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const PAIR = ["magnet", "partner", "labels"];

describe("what the magnets renderer draws", () => {
  it("says whether the two magnets pull or push", () => {
    expect(render(results({ facing: "N-S" }), PAIR).texts().join(" ")).toContain("they pull together");
    expect(render(results({ facing: "N-N" }), PAIR).texts().join(" ")).toContain("N faces N: they push apart");
  });

  it("says what happens to an object", () => {
    expect(render(results({ partner: "object", material: "wood" }, 2), PAIR).texts().join(" ")).toContain("Wood is not magnetic");
    expect(render(results({ partner: "object", material: "iron" }, 2), PAIR).texts().join(" ")).toContain("jumps to the magnet");
    expect(render(results({ partner: "object", material: "iron" }, 15), PAIR).texts().join(" ")).toContain("too far away");
  });

  it("draws a compass and the field loops only when asked", () => {
    expect(render(results(), ["magnet"]).of("arc")).toHaveLength(0);
    expect(render(results(), ["magnet", "compass"]).of("arc").length).toBeGreaterThan(0);
    expect(render(results(), ["magnet", "field"]).of("bezierCurveTo")).toHaveLength(6);
  });

  it("keeps both magnets on a phone even at the widest gap", () => {
    const phone = computeMagnetsLayout(375);
    const farEnd = phone.center.x + phone.length / 2 + 20 * phone.scale + phone.length;
    expect(farEnd).toBeLessThanOrEqual(375);
  });
});
