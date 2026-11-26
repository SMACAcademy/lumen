import { cellModel, type CellParams } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { benchGeometry, cellRenderer, computeCellLayout } from "./cell/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const ALL = ["beakers", "bridge", "circuit", "electrons", "series", "labels"];
const DANIELL: CellParams = { left: "zn", right: "cu", cLeft: 1, cRight: 1 };
const layout = computeCellLayout(900);
const results = (params = DANIELL, progress = 0) => cellModel.derive({ ...cellModel.initialize(params), progress }, params);

const render = (r = results(), layers = ALL, at = layout) => {
  const rec = recordingContext();
  cellRenderer.draw(rec.ctx, at, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};

describe("cell layout", () => {
  it("puts the series beside the bench on a desk and below it on a phone", () => {
    expect(layout.ladder.x).toBeGreaterThan(layout.bench.x + layout.bench.width);
    const phone = computeCellLayout(375);
    expect(phone.ladder.y).toBeGreaterThan(phone.bench.y + phone.bench.height);
  });

  it("keeps the wire above both beakers and the beakers apart", () => {
    const g = benchGeometry(layout);
    expect(g.wireY).toBeLessThan(g.top);
    expect(g.rightX).toBeGreaterThan(g.leftX + g.beakerWidth);
  });
});

describe("what the cell renderer draws", () => {
  it("writes the cell in standard notation and reads the voltmeter", () => {
    const texts = render().texts().join(" ");
    expect(texts).toContain("Zn | Zn²⁺(1.00 M) ‖ Cu²⁺(1.00 M) | Cu");
    expect(texts).toContain("1.100 V");
  });

  it("names the anode and the cathode", () => {
    const texts = render().texts();
    expect(texts).toContain("anode (−) · oxidation");
    expect(texts).toContain("cathode (+) · reduction");
  });

  it("swaps anode and cathode when the cell is written the other way round", () => {
    const texts = render(results({ ...DANIELL, left: "cu", right: "zn" })).texts();
    expect(texts.indexOf("cathode (+) · reduction")).toBeLessThan(texts.indexOf("anode (−) · oxidation"));
  });

  it("shows the vanishing copper ions in powers of ten once the cell is flat", () => {
    const texts = render(results(DANIELL, 1)).texts().join(" ");
    expect(texts).toContain("0.000 V");
    expect(texts).toContain("no current");
    expect(texts).toMatch(/Cu²⁺\(\d\.\d × 10⁻[⁰¹²³⁴⁵⁶⁷⁸⁹]+ M\)/);
  });

  it("marks E°cell as the gap on the electrochemical series", () => {
    expect(render().texts().join(" ")).toContain("E°cell 1.10 V");
  });

  it("draws nothing it was not asked for", () => {
    expect(render(results(), []).texts()).toEqual([]);
  });
});
