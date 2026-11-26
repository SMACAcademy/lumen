import { lightModel, type LightParams } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeLightLayout, lightRenderer } from "./light/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const ALL = ["scene", "rays", "labels"];
const results = (over: Partial<LightParams> = {}, objectDistance = 20, angle = 30) =>
  lightModel.derive({ objectDistance, angle }, { ...lightModel.defaultParams, ...over });
const render = (r = results(), width = 800) => {
  const rec = recordingContext();
  lightRenderer.draw(rec.ctx, computeLightLayout(width), { results: r, trace: null, layers: new Set(ALL), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};

describe("what the light renderer draws", () => {
  it("labels the shadow with the model's size, and none for a clear object", () => {
    expect(render(results({ objectHeight: 10, screenDistance: 80 })).texts().join(" ")).toContain("shadow 40 cm");
    expect(render(results({ material: "transparent" })).texts().join(" ")).toContain("no shadow");
  });

  it("says a pinhole image is upside down", () => {
    expect(render(results({ scene: "pinhole", objectHeight: 10, screenDistance: 60 })).texts().join(" ")).toContain("image upside down, 30 cm");
  });

  it("marks equal angles at the mirror, and equal distances each side", () => {
    const text = render(results({ scene: "mirror" }, 35, 50)).texts().join(" ");
    expect(text).toContain("i = 50°");
    expect(text).toContain("r = 50°");
    expect(text).toContain("object 35 cm in front · image 35 cm behind");
  });

  it("bends a ray into glass and names the angles", () => {
    const text = render(results({ scene: "refraction", medium: "glass" }, 30, 30)).texts().join(" ");
    expect(text).toContain("i = 30°");
    expect(text).toContain("r = 19°");
    expect(text).toContain("glass (n = 1.50)");
  });

  it("describes a lens image as real or virtual", () => {
    expect(render(results({ scene: "lens", focal: 10 }, 30)).texts().join(" ")).toContain("Real image, upside down, 15 cm behind the lens, smaller");
    expect(render(results({ scene: "lens", focal: 20 }, 10)).texts().join(" ")).toContain("Virtual image, upright and bigger");
  });

  it("fits a phone", () => {
    const phone = computeLightLayout(375);
    expect(phone.scene.x + phone.scene.width).toBeLessThanOrEqual(375);
    for (const scene of ["shadow", "pinhole", "mirror", "refraction", "lens"] as const) expect(() => render(results({ scene }), 375)).not.toThrow();
  });
});
