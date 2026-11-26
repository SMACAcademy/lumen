import { gibbsModel, type GibbsParams } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { computeGibbsLayout, gibbsPlane, gibbsRenderer } from "./gibbs/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const ALL = ["chart", "terms", "quadrants", "labels"];
const ICE: GibbsParams = { dH: 6.01, dS: 22 };
const HABER: GibbsParams = { dH: -92.2, dS: -198.7 };
const layout = computeGibbsLayout(900);
const results = (params = ICE, T = 250) => gibbsModel.derive({ T }, params);

const render = (r = results(), layers = ALL, at = layout) => {
  const rec = recordingContext();
  gibbsRenderer.draw(rec.ctx, at, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};

describe("gibbs layout", () => {
  it("puts the bars and the quadrants beside the plot on a desk, below it on a phone", () => {
    expect(layout.terms.x).toBeGreaterThan(layout.chart.x + layout.chart.width);
    const phone = computeGibbsLayout(375);
    expect(phone.terms.y).toBeGreaterThan(phone.chart.y + phone.chart.height);
    expect(phone.quadrants.y).toBeGreaterThan(phone.terms.y + phone.terms.height);
  });

  it("leaves room for the verdict under the grid", () => {
    for (const w of [375, 900]) {
      const l = computeGibbsLayout(w);
      expect(l.height).toBeGreaterThanOrEqual(l.quadrants.y + l.quadrants.height + 30);
    }
  });

  it("always keeps zero, ΔH and the far end of the line on the plot", () => {
    for (const p of [ICE, HABER, { dH: -890, dS: -243 }, { dH: 178, dS: 161 }]) {
      const plane = gibbsPlane(layout, results(p));
      expect(plane.yDomain[0]).toBeLessThan(Math.min(0, p.dH));
      expect(plane.yDomain[1]).toBeGreaterThan(Math.max(0, p.dH));
    }
  });
});

describe("what the gibbs renderer draws", () => {
  it("marks where ice starts to melt", () => {
    expect(render().texts().join(" ")).toContain("ΔG = 0 at 273 K");
  });

  it("says in words which kind of reaction this is", () => {
    expect(render().texts().join(" ")).toContain("This reaction goes only above 273 K.");
    expect(render(results(HABER)).texts().join(" ")).toContain("This reaction goes only below 464 K.");
    expect(render(results({ dH: -890, dS: 50 })).texts().join(" ")).toContain("This reaction goes at every temperature.");
    expect(render(results({ dH: 50, dS: -50 })).texts().join(" ")).toContain("This reaction never goes by itself.");
  });

  it("breaks ΔG into ΔH and −TΔS", () => {
    const texts = render(results(ICE, 300)).texts();
    expect(texts).toEqual(expect.arrayContaining(["ΔH", "−TΔS", "ΔG", "6.0", "−6.6", "−0.6"]));
  });

  it("draws nothing it was not asked for", () => {
    expect(render(results(), []).texts()).toEqual([]);
  });
});

describe("gibbsRenderer.pick", () => {
  it("sets the temperature from a click on the plot", () => {
    const plane = gibbsPlane(layout, results());
    const [x, y] = plane.toPx(1000, 0);
    const hit = gibbsRenderer.pick!(layout, x, y, undefined, results());
    expect(hit!.writes[0]).toEqual({ variable: "T", value: expect.closeTo(1000, 6) });
  });
});
