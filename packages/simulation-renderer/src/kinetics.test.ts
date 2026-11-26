import { kineticsModel } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { computeKineticsLayout, flaskGeometry, kineticsRenderer, MOLECULES, moleculesShown, reactedMolecules } from "./kinetics/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const ALL = ["flask", "particles", "curve", "halflives", "tangent", "labels"];
const P = kineticsModel.defaultParams;
const results = (t: number, over: Partial<typeof P> = {}) => kineticsModel.derive({ t }, { ...P, ...over });
const layout = computeKineticsLayout(900);

const render = (r = results(0), layers = ALL, at = layout) => {
  const rec = recordingContext();
  kineticsRenderer.draw(rec.ctx, at, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};

describe("kinetics layout", () => {
  it("puts the graph beside the flask on a desk, and below it on a phone", () => {
    expect(layout.chart.x).toBeGreaterThan(layout.flask.x + layout.flask.width);
    const phone = computeKineticsLayout(375);
    expect(phone.chart.y).toBeGreaterThan(phone.flask.y + phone.flask.height);
    expect(phone.chart.x + phone.chart.width).toBeLessThanOrEqual(375);
  });

  it("makes room for the ln[A] plot only when it is shown", () => {
    expect(layout.log.height).toBe(0);
    const withLog = computeKineticsLayout(900, true);
    expect(withLog.log.height).toBeGreaterThan(0);
    expect(withLog.log.y).toBeGreaterThan(withLog.chart.y + withLog.chart.height);
  });

  it("keeps the readout above the flask's neck", () => {
    const g = flaskGeometry(layout);
    expect(g.neckTop).toBeGreaterThanOrEqual(layout.flask.y + 4 * 15);
    expect(g.bodyTop).toBeGreaterThan(g.neckTop);
    expect(g.bottom).toBeLessThan(layout.flask.y + layout.flask.height);
  });
});

describe("the molecules", () => {
  it("shows more molecules for a stronger solution", () => {
    expect(moleculesShown(2)).toBe(MOLECULES);
    expect(moleculesShown(1)).toBe(MOLECULES / 2);
    expect(moleculesShown(0.01)).toBe(8);
  });

  it("turns exactly the right number into B", () => {
    for (const f of [0, 0.25, 0.5, 0.875, 1]) {
      expect(reactedMolecules(40, f).filter(Boolean)).toHaveLength(Math.round(40 * f));
    }
  });

  it("never un-reacts a molecule as time runs on", () => {
    const early = reactedMolecules(40, 0.3);
    const later = reactedMolecules(40, 0.6);
    early.forEach((b, i) => b && expect(later[i]).toBe(true));
  });

  it("spreads the reacted molecules through the flask rather than filling it in order", () => {
    const half = reactedMolecules(40, 0.5);
    expect(half.slice(0, 20).filter(Boolean).length).toBeGreaterThan(4);
    expect(half.slice(20).filter(Boolean).length).toBeGreaterThan(4);
  });
});

describe("what the kinetics renderer draws", () => {
  it("reads out both concentrations, the clock and the rate constant", () => {
    const r = results(results(0).halfLife);
    const texts = render(r).texts().join(" ");
    expect(texts).toContain("A  0.500 mol/L");
    expect(texts).toContain("B  0.500 mol/L");
    expect(texts).toContain("1.00 half-lives");
    expect(texts).toContain("298 K · k = 0.100 min⁻¹");
  });

  it("marks one, two and three half-lives on the curve", () => {
    const texts = render().texts();
    expect(texts).toEqual(expect.arrayContaining(["t½", "2t½", "3t½"]));
  });

  it("labels the tangent with the rate at that moment", () => {
    expect(render(results(0)).texts().join(" ")).toContain("rate 0.100 mol L⁻¹ min⁻¹");
  });

  it("draws the ln[A] line with its slope, −k, when asked", () => {
    const withLog = computeKineticsLayout(900, true);
    const texts = render(results(3), [...ALL, "logplot"], withLog).texts().join(" ");
    expect(texts).toContain("slope = −k = −0.100 min⁻¹");
  });

  it("draws nothing it was not asked for", () => {
    expect(render(results(0), []).texts()).toEqual([]);
  });
});

describe("kineticsRenderer.pick", () => {
  it("moves the clock to where the graph was clicked", () => {
    const r = results(0);
    const x = layout.chart.x + layout.chart.width / 2;
    const hit = kineticsRenderer.pick!(layout, x, layout.chart.y + 20, undefined, r);
    expect(hit!.region).toBe("chart");
    expect(hit!.writes[0]!.value).toBeCloseTo(r.runEnd / 2, 6);
  });

  it("ignores clicks on the flask", () => {
    expect(kineticsRenderer.pick!(layout, layout.flask.x + 20, layout.flask.y + 100, undefined, results(0))).toBeNull();
  });
});
