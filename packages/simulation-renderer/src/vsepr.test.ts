import { vseprModel, type MoleculeId } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { computeVseprLayout, inkFor, perpendicular, vseprRenderer } from "./vsepr/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const ALL = ["atoms", "lonepairs", "angle", "facts", "labels"];
const layout = computeVseprLayout(900);
const results = (molecule: MoleculeId = "ch4") => vseprModel.derive(vseprModel.initialize({ molecule }), { molecule });

const render = (r = results(), layers = ALL, at = layout) => {
  const rec = recordingContext();
  vseprRenderer.draw(rec.ctx, at, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};

describe("vsepr layout", () => {
  it("puts the facts beside the molecule on a desk and below it on a phone", () => {
    expect(layout.facts.x).toBeGreaterThan(layout.view.x + layout.view.width);
    const phone = computeVseprLayout(375);
    expect(phone.facts.y).toBeGreaterThan(phone.view.y + phone.view.height);
    expect(phone.view.x + phone.view.width).toBeLessThanOrEqual(375);
  });

  it("writes symbols in a colour that can be read on the atom", () => {
    expect(inkFor("#f1f5f9")).toBe("#0f172a"); // hydrogen: light atom, dark letter
    expect(inkFor("#64748b")).toBe("#f8fafc"); // carbon: dark atom, light letter
  });

  it("finds a perpendicular for any direction, even one pointing out of the screen", () => {
    for (const v of [[1, 0, 0], [0, 0, 1], [0.6, 0.8, 0]] as const) {
      const p = perpendicular(v);
      expect(Math.hypot(...p)).toBeCloseTo(1, 12);
      expect(v[0] * p[0] + v[1] * p[1] + v[2] * p[2]).toBeCloseTo(0, 12);
    }
  });
});

describe("what the vsepr renderer draws", () => {
  it("names the molecule, its shape and its hybridisation", () => {
    const texts = render().texts();
    expect(texts).toEqual(expect.arrayContaining(["CH₄", "tetrahedral", "sp³ hybridised", "bond angle 109.5°", "109.5°"]));
  });

  it("draws one ligand per bond, and a lobe per lone pair", () => {
    expect(render(results("ch4"), ["atoms", "labels"]).texts().filter((t) => t === "H")).toHaveLength(4);
    expect(render(results("h2o"), ["lonepairs"]).of("ellipse")).toHaveLength(2);
    expect(render(results("xef2"), ["lonepairs"]).of("ellipse")).toHaveLength(3);
  });

  it("says whether the molecule is polar", () => {
    expect(render(results("h2o")).texts()).toContain("polar: the bond dipoles do not cancel");
    expect(render(results("co2")).texts()).toContain("non-polar: the bond dipoles cancel");
  });

  it("marks a straight molecule's 180° without trouble", () => {
    const texts = render(results("co2")).texts();
    expect(texts).toContain("180°");
    for (const call of render(results("co2"), ["angle"]).of("lineTo")) {
      expect(Number.isFinite(call.args[0])).toBe(true);
      expect(Number.isFinite(call.args[1])).toBe(true);
    }
  });

  it("draws nothing it was not asked for", () => {
    expect(render(results(), []).texts()).toEqual([]);
  });
});

describe("vseprRenderer.pick", () => {
  it("turns the molecule as the pointer moves across the view", () => {
    const { view } = layout;
    const middle = vseprRenderer.pick!(layout, view.x + view.width / 2, view.y + view.height / 2, undefined, results());
    expect(middle!.writes).toEqual([
      { variable: "yaw", value: expect.closeTo(0, 9) },
      { variable: "pitch", value: expect.closeTo(0, 9) },
    ]);
    const right = vseprRenderer.pick!(layout, view.x + view.width, view.y + view.height / 2, "view", results());
    expect(right!.writes[0]!.value).toBeCloseTo(Math.PI, 9);
  });

  it("ignores clicks on the facts", () => {
    expect(vseprRenderer.pick!(layout, layout.facts.x + 10, layout.facts.y + 10, undefined, results())).toBeNull();
  });
});
