import { hydrogenModel, lineWavelength } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { computeHydrogenLayout, hydrogenRenderer, levelY, SPECTRUM_NM, wavelengthColor, wavelengthX } from "./hydrogen/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const ALL = ["levels", "series", "transition", "atom", "spectrum", "labels"];
const layout = computeHydrogenLayout(900);
const results = (upper: number, lower: number, species: "H" | "He+" | "Li2+" = "H", t = 0) =>
  hydrogenModel.derive({ upper, lower, t }, { species });

const render = (r = results(3, 2), layers = ALL, at = layout) => {
  const rec = recordingContext();
  hydrogenRenderer.draw(rec.ctx, at, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};

describe("hydrogen layout", () => {
  it("puts the atom beside the levels on a desk, and stacks everything on a phone", () => {
    expect(layout.atom.x).toBeGreaterThan(layout.levels.x + layout.levels.width);
    expect(layout.spectrum.y).toBeGreaterThan(layout.levels.y + layout.levels.height);
    const phone = computeHydrogenLayout(375);
    expect(phone.compact).toBe(true);
    expect(phone.atom.y).toBeGreaterThan(phone.levels.y + phone.levels.height);
    expect(phone.spectrum.y).toBeGreaterThan(phone.atom.y + phone.atom.height);
    expect(phone.spectrum.x + phone.spectrum.width).toBeLessThanOrEqual(375);
  });

  it("gives the levels to the whole width when the atom is hidden", () => {
    const bare = computeHydrogenLayout(900, false);
    expect(bare.atom.width).toBe(0);
    expect(bare.levels.width).toBeGreaterThan(layout.levels.width);
  });

  it("stacks the levels in order, crowding towards zero, with n = 1 at the bottom", () => {
    const ys = [1, 2, 3, 4, 5, 6].map((n) => levelY(layout, n));
    expect(ys).toEqual([...ys].sort((a, b) => b - a));
    for (let i = 1; i < 5; i++) expect(ys[i]! - ys[i + 1]!).toBeLessThan(ys[i - 1]! - ys[i]!);
    // Even the most crowded pair stays far enough apart to read and to click.
    expect(ys[4]! - ys[5]!).toBeGreaterThan(10);
    expect(levelY(layout, 1)).toBeLessThan(layout.levels.y + layout.levels.height);
  });

  it("lays wavelengths out on a log scale across the strip", () => {
    expect(wavelengthX(layout, SPECTRUM_NM[0])).toBeCloseTo(layout.spectrum.x, 6);
    expect(wavelengthX(layout, SPECTRUM_NM[1])).toBeCloseTo(layout.spectrum.x + layout.spectrum.width, 6);
    // Equal ratios, equal distances.
    const d1 = wavelengthX(layout, 200) - wavelengthX(layout, 100);
    const d2 = wavelengthX(layout, 2000) - wavelengthX(layout, 1000);
    expect(d1).toBeCloseTo(d2, 6);
  });
});

describe("wavelengthColor", () => {
  it("paints visible light its own colour and labels the invisible with theme colours", () => {
    expect(wavelengthColor(656, fallbackTheme)).toBe("rgb(255, 0, 0)"); // H-α is red
    expect(wavelengthColor(530, fallbackTheme)).toMatch(/^rgb\(\d+, 255, 0\)$/);
    expect(wavelengthColor(450, fallbackTheme)).toMatch(/^rgb\(0, \d+, 255\)$/);
    expect(wavelengthColor(121, fallbackTheme)).toBe(fallbackTheme.curve);
    expect(wavelengthColor(1875, fallbackTheme)).toBe(fallbackTheme.secant);
  });
});

describe("what the hydrogen renderer draws", () => {
  it("names the series, the wavelength and the region", () => {
    const texts = render().texts().join(" ");
    expect(texts).toContain("Balmer series · 656.5 nm · visible");
    expect(texts).toContain("3 → 2");
    expect(texts).toContain("1.89 eV");
  });

  it("labels every level with its own energy, scaled by Z²", () => {
    expect(render().texts()).toContain("−13.60 eV");
    expect(render(results(3, 2, "He+")).texts()).toContain("−54.39 eV");
  });

  it("says when the light is ultraviolet or infrared, and switches to µm for long waves", () => {
    expect(render(results(2, 1)).texts().join(" ")).toContain("Lyman series · 121.6 nm · ultraviolet");
    expect(render(results(4, 3)).texts().join(" ")).toContain("Paschen series · 1.88 µm · infrared");
  });

  it("is honest about what is and is not to scale", () => {
    const texts = render().texts();
    expect(texts).toContain("levels spaced to be readable, not to scale");
    expect(texts).toContain("orbits to scale: r ∝ n²/Z");
    expect(texts).toContain("r3 is 2.25 × r2");
  });

  it("draws one line per member of the series on the spectrum", () => {
    // Balmer from n = 3…6 is four lines, the current one drawn thickest.
    const rec = render(results(4, 2), ["spectrum"]);
    const widths = rec.calls.filter((c) => c.method === "stroke").length;
    expect(widths).toBeGreaterThanOrEqual(4);
  });

  it("sends the photon off only after the electron has dropped", () => {
    const before = render(results(3, 2, "H", 0.5), ["atom"]).of("lineTo").length;
    const after = render(results(3, 2, "H", 2), ["atom"]).of("lineTo").length;
    expect(before).toBe(0);
    expect(after).toBeGreaterThan(10);
  });

  it("draws nothing it was not asked for", () => {
    expect(render(results(3, 2), []).texts()).toEqual([]);
  });
});

describe("hydrogenRenderer.pick", () => {
  const r = results(3, 2);
  const x = layout.levels.x + layout.levels.width / 2;

  it("grabs the nearer end of the jump and moves it to the nearest level", () => {
    const hit = hydrogenRenderer.pick!(layout, x, levelY(layout, 3) + 2, undefined, r);
    expect(hit).toMatchObject({ region: "upper", writes: [{ variable: "upper", value: 3 }] });
    const drag = hydrogenRenderer.pick!(layout, x, levelY(layout, 5), "upper", r);
    expect(drag!.writes[0]).toEqual({ variable: "upper", value: 5 });
    const low = hydrogenRenderer.pick!(layout, x, levelY(layout, 1) - 3, undefined, r);
    expect(low).toMatchObject({ region: "lower", writes: [{ variable: "lower", value: 1 }] });
  });

  it("picks the series line nearest a click on the spectrum", () => {
    const y = layout.spectrum.y + layout.spectrum.height / 2;
    const hit = hydrogenRenderer.pick!(layout, wavelengthX(layout, lineWavelength(5, 2)) + 1, y, undefined, r);
    expect(hit).toMatchObject({ region: "spectrum", writes: [{ variable: "upper", value: 5 }] });
  });

  it("ignores clicks on the atom", () => {
    expect(hydrogenRenderer.pick!(layout, layout.atom.x + layout.atom.width / 2, layout.atom.y + 40, undefined, r)).toBeNull();
  });
});
