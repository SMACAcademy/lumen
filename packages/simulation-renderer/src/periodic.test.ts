import { ELEMENTS, periodicModel, type PropertyId } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { cellRect, columnOf, computePeriodicLayout, isotopeArea, isotopeName, nucleonPositions, periodicRenderer, propertyPlane, propertyRange } from "./periodic/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const ALL = ["table", "chart", "labels"];
const layout = computePeriodicLayout(900);
const results = (Z = 11, property: PropertyId = "radius") => periodicModel.derive({ Z }, { property });

const render = (r = results(), layers = ALL, at = layout) => {
  const rec = recordingContext();
  periodicRenderer.draw(rec.ctx, at, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};

describe("periodic layout", () => {
  it("packs groups 1, 2 and 13–18 into eight columns", () => {
    expect([1, 2, 13, 18].map(columnOf)).toEqual([0, 1, 2, 7]);
  });

  it("gives every element its own cell, inside the table", () => {
    const seen = new Set<string>();
    for (const e of ELEMENTS) {
      const r = cellRect(layout, e.period, e.group);
      seen.add(`${r.x},${r.y}`);
      expect(r.x + r.width).toBeLessThanOrEqual(layout.table.x + layout.table.width);
      expect(r.y + r.height).toBeLessThanOrEqual(layout.table.y + layout.table.height);
    }
    expect(seen.size).toBe(ELEMENTS.length);
  });

  it("scales the plot to the values that exist", () => {
    expect(propertyRange("radius")).toEqual([37, 231]);
    expect(propertyRange("electronGain")[0]).toBe(-349);
  });
});

describe("what the periodic renderer draws", () => {
  it("labels every element, with the chosen property's value", () => {
    const texts = render().texts();
    for (const e of ELEMENTS) expect(texts).toContain(e.symbol);
    expect(texts).toContain("186"); // sodium's radius
    expect(texts).toContain("Sodium (Z = 11): 186 pm");
  });

  it("shows a dash where a value is not defined", () => {
    const texts = render(results(10, "electronegativity")).texts();
    expect(texts).toContain("—");
    expect(texts).toContain("Neon (Z = 10): not defined");
  });

  it("draws nothing it was not asked for", () => {
    expect(render(results(), []).texts()).toEqual([]);
  });
});

describe("periodicRenderer.pick", () => {
  it("focuses the element whose cell is clicked", () => {
    const r = cellRect(layout, 3, 17);
    const hit = periodicRenderer.pick!(layout, r.x + 5, r.y + 5, undefined, results());
    expect(hit).toMatchObject({ region: "table", writes: [{ variable: "Z", value: 17 }] });
  });

  it("focuses the nearest element on the plot", () => {
    const plane = propertyPlane(layout, "radius");
    const [x, y] = plane.toPx(19.2, 100);
    expect(periodicRenderer.pick!(layout, x, y, undefined, results())!.writes[0]!.value).toBe(19);
  });
});

describe("the atom layer", () => {
  it("draws the shells and names the configuration and valency", () => {
    const rec = recordingContext();
    const r = periodicModel.derive({ Z: 11 }, periodicModel.defaultParams);
    periodicRenderer.draw(rec.ctx, computePeriodicLayout(900), { results: r, trace: null, layers: new Set(["table", "atom", "labels"]), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
    const text = rec.texts().join(" ");
    expect(text).toContain("Sodium: 2, 8, 1");
    expect(text).toContain("1 in the outer shell · valency 1");
    expect(text).toContain("11p");
    expect(text).toContain("12n");
  });
});

describe("the isotope layer", () => {
  const iso = (Z: number, A?: number, mix = 100) => periodicModel.derive(A === undefined ? { Z } : { Z, A }, { property: "radius", mix });
  const draw = (r: ReturnType<typeof iso>, layers = ["table", "isotope", "labels"], width = 900) => {
    const rec = recordingContext();
    const at = computePeriodicLayout(width);
    periodicRenderer.draw(rec.ctx, at, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
    return { rec, at };
  };

  it("writes isotopes the way a book does", () => {
    expect(isotopeName(35, "Cl")).toBe("³⁵Cl");
    expect(isotopeName(2, "H")).toBe("²H");
  });

  it("counts the nucleus out: one disc per proton and neutron", () => {
    const { rec } = draw(iso(17, 37));
    const texts = rec.texts();
    expect(texts).toEqual(expect.arrayContaining(["37", "17", "Cl", "Chlorine-37", "17 protons + 20 neutrons"]));
    // The table draws rectangles, so every arc is the nucleus: its dashed outline and 37 nucleons.
    expect(rec.of("arc").length).toBe(1 + 37);
  });

  it("names hydrogen's isotopes and flags the radioactive ones", () => {
    expect(draw(iso(1, 2)).rec.texts()).toContain("Hydrogen-2 (deuterium)");
    const t = draw(iso(1, 3)).rec.texts();
    expect(t).toContain("Hydrogen-3 (tritium)");
    expect(t).toContain("radioactive");
    expect(draw(iso(6, 12)).rec.texts()).not.toContain("radioactive");
  });

  it("shows the chlorine sample, and its average mass only with labels on", () => {
    const withLabels = draw(iso(17, 37, 75)).rec.texts();
    expect(withLabels).toEqual(expect.arrayContaining(["75% ³⁵Cl", "25% ³⁷Cl", "Average atomic mass = 35.5 u"]));
    const hidden = draw(iso(17, 37, 75), ["table", "isotope"]).rec.texts();
    expect(hidden).toContain("75% ³⁵Cl");
    expect(hidden.some((t) => t.includes("Average"))).toBe(false);
    expect(hidden.some((t) => t.includes("35.5"))).toBe(false);
  });

  it("calls a sample of the common isotope 100% of it", () => {
    const texts = draw(iso(20, undefined, 60)).rec.texts();
    expect(texts).toContain("100% ⁴⁰Ca");
    expect(texts.some((t) => t.startsWith("40%"))).toBe(false);
    expect(texts).toContain("Average atomic mass = 40 u");
  });

  it("packs even calcium-48's 48 nucleons inside the nucleus without overlap", () => {
    const pts = nucleonPositions(48, 44);
    for (const p of pts) expect(Math.hypot(p.x, p.y) + p.r).toBeLessThanOrEqual(44);
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++) expect(Math.hypot(pts[i]!.x - pts[j]!.x, pts[i]!.y - pts[j]!.y)).toBeGreaterThan(pts[i]!.r * 1.6);
  });

  it("fits a 325 px phone canvas", () => {
    const { rec, at } = draw(iso(1, 2, 75), ["table", "isotope", "labels"], 325);
    const area = isotopeArea(at);
    expect(area.x).toBeGreaterThanOrEqual(0);
    expect(area.x + area.width).toBeLessThanOrEqual(325);
    expect(area.y + area.height).toBeLessThanOrEqual(at.height);
    for (const c of rec.of("fillText")) {
      const [text, x, y] = c.args as [string, number, number];
      expect(y, text).toBeGreaterThan(0);
      expect(y, text).toBeLessThan(at.height);
      expect(x, text).toBeGreaterThanOrEqual(0);
      expect(x, text).toBeLessThanOrEqual(325);
      expect(text.length, text).toBeLessThanOrEqual(55);
    }
    // The longest left-aligned line, at ~7.5 px a character, still ends inside the canvas.
    const name = rec.of("fillText").find((c) => c.args[0] === "Hydrogen-2 (deuterium)")!;
    expect((name.args[1] as number) + 22 * 7.5).toBeLessThanOrEqual(325);
    for (const c of rec.of("fillRect")) {
      const [x, , w] = c.args as number[];
      expect(x! + w!).toBeLessThanOrEqual(325);
    }
  });
});
