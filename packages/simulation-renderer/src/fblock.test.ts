import { fBlockModel, type FBlockParams } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { columnX, computeFBlockLayout, fBlockRenderer, ionName, radiusY, stateY } from "./fblock/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const results = (series: FBlockParams["series"], index: number, charge = 3) => fBlockModel.derive({ index, charge, clock: 0 }, { series });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  fBlockRenderer.draw(rec.ctx, computeFBlockLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};

describe("the radii view", () => {
  it("plots a point for every radius NCERT gives, and none for lutetium", () => {
    const rec = render(results("lanthanoids", 8), ["radii", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["The lanthanoids: ionic radius / pm", "La", "Gd", "Lu", "M³⁺"]));
    // Fourteen points and one in the legend.
    expect(rec.of("arc")).toHaveLength(15);
    expect(rec.texts().join(" ")).toContain("Gadolinium: Gd³⁺ 94 pm");
    expect(render(results("lanthanoids", 15), ["radii", "labels"]).texts().join(" ")).toContain("Lutetium: Lu³⁺: no radius given");
  });

  it("adds the M⁴⁺ series for the actinoids", () => {
    const rec = render(results("actinoids", 4), ["radii", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["M³⁺", "M⁴⁺", "U"]));
    // Eight M³⁺ and nine M⁴⁺ radii, and two legend dots.
    expect(rec.of("arc")).toHaveLength(19);
    expect(rec.texts().join(" ")).toContain("Uranium: U³⁺ 103 pm · U⁴⁺ 93 pm");
  });

  it("puts smaller ions lower, and fits fifteen columns on a phone", () => {
    const layout = computeFBlockLayout(325);
    expect(radiusY(layout, 86)).toBeGreaterThan(radiusY(layout, 106));
    expect(radiusY(layout, 111)).toBeGreaterThan(layout.plot.top);
    expect(columnX(layout, 15) + 8).toBeLessThanOrEqual(325);
    expect(columnX(layout, 2) - columnX(layout, 1)).toBeGreaterThanOrEqual(18);
  });
});

describe("the states view", () => {
  it("draws a dot for every oxidation state and lists the chosen element's", () => {
    const lanthanoids = render(results("lanthanoids", 2), ["states", "labels"]);
    // Fifteen +3, five +4 and three +2.
    expect(lanthanoids.of("arc")).toHaveLength(23);
    expect(lanthanoids.texts().join(" ")).toContain("Cerium: +3, +4");
    const actinoids = render(results("actinoids", 5), ["states", "labels"]);
    expect(actinoids.of("arc")).toHaveLength(33);
    expect(actinoids.texts().join(" ")).toContain("Neptunium: +3, +4, +5, +6, +7 · radioactive");
    expect(actinoids.texts()).toEqual(expect.arrayContaining(["+2", "+7"]));
  });

  it("puts higher states higher up", () => {
    const layout = computeFBlockLayout(375);
    expect(stateY(layout, 7)).toBeLessThan(stateY(layout, 3));
    expect(stateY(layout, 2)).toBeLessThan(layout.plot.bottom);
    expect(stateY(layout, 7)).toBeGreaterThan(layout.plot.top);
  });
});

describe("the electrons view", () => {
  it("fills seven boxes by Hund's rule and names the ion", () => {
    expect(ionName("Gd", 3)).toBe("Gd³⁺");
    const rec = render(results("lanthanoids", 8, 3), ["boxes", "labels"]);
    expect(rec.of("strokeRect")).toHaveLength(7);
    expect(rec.texts()).toEqual(expect.arrayContaining(["Gadolinium: Gd³⁺", "atom: [Xe] 4f⁷5d¹6s²", "Gd³⁺: [Xe] 4f⁷", "the seven 4f orbitals"]));
    expect(rec.texts().join(" ")).toContain("7 unpaired electrons: paramagnetic");
    const full = render(results("lanthanoids", 14, 2), ["boxes", "labels"]).texts().join(" ");
    expect(full).toContain("Yb²⁺: [Xe] 4f¹⁴");
    expect(full).toContain("No unpaired electrons: diamagnetic");
  });

  it("says when the ion is not one the element forms", () => {
    expect(render(results("lanthanoids", 8, 4), ["boxes", "labels"]).texts()).toContain("not an oxidation state gadolinium shows");
    expect(render(results("actinoids", 4, 6), ["boxes", "labels"]).texts().join(" ")).toContain("U⁶⁺: [Rn] 5f⁰");
  });

  it("leaves the boxes empty when the words are hidden", () => {
    const rec = render(results("lanthanoids", 8, 3), ["boxes"]);
    expect(rec.of("strokeRect")).toHaveLength(7);
    expect(rec.texts().join(" ")).not.toMatch(/unpaired|Gd³⁺: \[Xe\]/);
    // Only the box outlines are stroked.
    expect(rec.of("stroke")).toHaveLength(0);
  });
});
