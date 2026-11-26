import { lineModel, type LineState } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { computeLineLayout, lineEquation, lineRenderer } from "./line/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base: LineState = { m: 2, c: 1, m2: -1, c2: 4, x: 2, y: 5 };
const results = (over: Partial<LineState> = {}) => lineModel.derive({ ...base, ...over }, lineModel.defaultParams);
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  lineRenderer.draw(rec.ctx, computeLineLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const POINT = ["plane", "line", "point", "labels"];
const PAIR = ["plane", "line", "second", "labels"];

describe("what the line renderer draws", () => {
  it("writes equations the way a textbook does", () => {
    expect([lineEquation(2, 1), lineEquation(1, -3), lineEquation(-1, 0), lineEquation(0, 4), lineEquation(0.5, -2.5)]).toEqual([
      "y = 2x + 1",
      "y = x − 3",
      "y = −x",
      "y = 4",
      "y = 0.5x − 2.5",
    ]);
  });

  it("says whether the point is on the line", () => {
    expect(render(results(), POINT).texts().join(" ")).toContain("(2, 5) is on the line: 2 × 2 + 1 = 5");
    expect(render(results({ y: 3 }), POINT).texts().join(" ")).toContain("(2, 3) is off the line: at x = 2 the line is at y = 5");
  });

  it("names the quadrant when there is no line", () => {
    expect(render(results({ x: 3, y: -2 }), ["plane", "point", "labels"]).texts().join(" ")).toContain("(3, −2) is in quadrant IV: right 3, down 2");
    expect(render(results({ x: 0, y: 4 }), ["plane", "point", "labels"]).texts().join(" ")).toContain("is on an axis");
  });

  it("rings the meeting point, and says when lines never meet", () => {
    const met = render(results(), PAIR);
    expect(met.texts()).toContain("(1, 3)");
    expect(met.texts().join(" ")).toContain("The lines meet at (1, 3)");
    expect(render(results({ m2: 2, c2: 5 }), PAIR).texts().join(" ")).toContain("parallel lines never meet");
    expect(render(results({ m2: 2, c2: 1 }), PAIR).texts().join(" ")).toContain("every point");
  });

  it("drags the point, snapped to halves, and fits a phone", () => {
    const layout = computeLineLayout(375);
    const [px, py] = layout.plane.toPx(2.3, -1.2);
    expect(lineRenderer.pick?.(layout, px, py, undefined, results())?.writes).toEqual([
      { variable: "x", value: 2.5 },
      { variable: "y", value: -1 },
    ]);
    expect(layout.plane.rect.x + layout.plane.rect.width).toBeLessThanOrEqual(375);
  });
});
