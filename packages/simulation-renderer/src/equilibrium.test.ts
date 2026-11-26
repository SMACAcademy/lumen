import { equilibriumModel, REACTIONS, type EquilibriumParams } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { computeEquilibriumLayout, cylinderGeometry, equilibriumRenderer, MAX_VOLUME, moleculesPerMole, reactionFrom } from "./equilibrium/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const ALL = ["cylinder", "molecules", "gauge", "bars", "rates", "labels"];
const layout = computeEquilibriumLayout(900);
const N2O4: EquilibriumParams = { reaction: "n2o4", V: 1, T: 298 };
const settled = (p: EquilibriumParams) => equilibriumModel.derive(equilibriumModel.advance(equilibriumModel.initialize(p), 60, p), p);
const fresh = (p: EquilibriumParams) => equilibriumModel.derive(equilibriumModel.initialize(p), p);

const render = (results = fresh(N2O4), layers = ALL, at = layout) => {
  const rec = recordingContext();
  equilibriumRenderer.draw(rec.ctx, at, { results, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};

describe("equilibrium layout", () => {
  it("puts the gauges beside the cylinder on a desk and below it on a phone", () => {
    expect(layout.gauge.x).toBeGreaterThan(layout.cylinder.x + layout.cylinder.width);
    const phone = computeEquilibriumLayout(375);
    expect(phone.gauge.y).toBeGreaterThan(phone.cylinder.y + phone.cylinder.height);
    expect(phone.rates.y).toBeGreaterThan(phone.bars.y + phone.bars.height);
  });

  it("moves the piston with the volume", () => {
    const small = cylinderGeometry(layout, 0.5);
    const big = cylinderGeometry(layout, MAX_VOLUME);
    expect(big.right).toBeGreaterThan(small.right);
    expect(big.right).toBeCloseTo(big.fullRight, 6);
  });

  it("shows about forty molecules for any reaction's starting mixture", () => {
    for (const r of Object.values(REACTIONS)) {
      const start = r.start[0] + r.start[1] + r.start[2];
      expect(start * moleculesPerMole(r)).toBeCloseTo(40, 9);
    }
  });

  it("reads back which reaction the results describe", () => {
    expect(reactionFrom(fresh({ reaction: "haber", V: 5, T: 700 })).id).toBe("haber");
  });
});

describe("what the equilibrium renderer draws", () => {
  it("heads with the reaction and the conditions", () => {
    const texts = render().texts().join(" ");
    expect(texts).toContain("N₂O₄ ⇌ 2NO₂ · 298 K · 1.00 L");
    expect(texts).toContain("ΔH = +57.2 kJ/mol (endothermic) · Δn = +1");
  });

  it("says which way it will shift, and when it has arrived", () => {
    expect(render().texts().join(" ")).toContain("Q < K: shifts forward, making more NO₂");
    const done = render(settled(N2O4)).texts().join(" ");
    expect(done).toContain("Q = K: at equilibrium");
    expect(done).toContain("equal, and still going");
  });

  it("names both reactants when there are two", () => {
    const texts = render(fresh({ reaction: "hi", V: 1, T: 700 })).texts();
    expect(texts).toEqual(expect.arrayContaining(["H₂", "I₂", "HI"]));
  });

  it("counts molecules from the moles, drawing N₂O₄ as a joined pair", () => {
    const only = (nA: number, nC: number) =>
      render(equilibriumModel.derive({ reaction: "n2o4", nA, nB: 0, nC }, N2O4), ["molecules"]).of("arc").length;
    expect(only(0, 0.1)).toBe(40); // forty NO₂
    expect(only(0.1, 0)).toBe(80); // forty N₂O₄, two dots each
  });

  it("draws nothing it was not asked for", () => {
    expect(render(fresh(N2O4), []).texts()).toEqual([]);
  });
});
