import { orbitFieldModel, type OrbitFieldParams } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeOrbitFieldLayout, orbitFieldArrowLength, orbitFieldRenderer, orbitFieldSci } from "./orbitfield/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const results = (params: Partial<OrbitFieldParams> = {}, t = 0) => orbitFieldModel.derive({ t }, { ...orbitFieldModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  orbitFieldRenderer.draw(rec.ctx, computeOrbitFieldLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const words = (r: ReturnType<typeof results>, layers: string[], width = 800) => render(r, layers, width).texts().join(" | ");

/** Every text drawn lies inside the canvas, assuming 6 px a character as the recorder measures. */
function expectInside(rec: ReturnType<typeof recordingContext>, width: number, height: number) {
  for (const call of rec.of("fillText")) {
    const [text, x, y] = call.args as [string, number, number];
    expect(y, text).toBeGreaterThanOrEqual(0);
    expect(y, text).toBeLessThanOrEqual(height);
    expect(x, text).toBeGreaterThanOrEqual(0);
    expect(x, text).toBeLessThanOrEqual(width);
    expect(text.length, text).toBeLessThanOrEqual(55);
    // Titles and captions are centred on the canvas: they must fit across it.
    if (x === width / 2) expect(text.length * 6, text).toBeLessThanOrEqual(width);
  }
  for (const call of rec.of("arc")) {
    const [x, y] = call.args as [number, number];
    // Discs and rings are centred on the canvas (the station's limb is centred far below, and checked separately).
    if (y < height) expect(x, "arc centre").toBeGreaterThanOrEqual(0);
    if (y < height) expect(x, "arc centre").toBeLessThanOrEqual(width);
  }
}

describe("number formatting", () => {
  it("writes powers of ten for very large and very small numbers", () => {
    expect(orbitFieldSci(3.136e9)).toBe("3.14 × 10⁹");
    expect(orbitFieldSci(-6.272e9)).toBe("−6.27 × 10⁹");
    expect(orbitFieldSci(2.338e-3)).toBe("2.34 × 10⁻³");
    expect(orbitFieldSci(9.999e9)).toBe("1.00 × 10¹⁰");
    expect(orbitFieldSci(4.36)).toBe("4.36");
    expect(orbitFieldSci(0)).toBe("0");
  });

  it("draws field arrows on a log scale, longer for a stronger field", () => {
    expect(orbitFieldArrowLength(1)).toBeGreaterThan(orbitFieldArrowLength(1e-3));
    expect(orbitFieldArrowLength(1e-3)).toBeGreaterThan(orbitFieldArrowLength(1e-5));
    expect(orbitFieldArrowLength(0)).toBe(0);
  });
});

describe("the distance view", () => {
  it("gives g at a height, and how badly the small-h formula does there", () => {
    const text = words(results({ probeR: 9600 }), ["gcurve", "approx", "labels"]);
    expect(text).toContain("g against distance from the Earth's centre");
    expect(text).toContain("h = 3 200 km · g = 4.36 m/s² (0.444 g₀)");
    expect(text).toContain("small-h formula: 0.00 m/s² (−100.0 %)");
    expect(text).toContain("g₀(1 − 2h/R)");
  });

  it("gives g at a depth, without the small-h line", () => {
    const text = words(results({ probeR: 3200 }), ["gcurve", "approx", "labels"]);
    expect(text).toContain("d = 3 200 km · g = 4.90 m/s² (0.500 g₀)");
    expect(text).not.toContain("small-h formula");
  });

  it("writes no value of g without the labels", () => {
    expect(words(results({ probeR: 9600 }), ["gcurve", "approx"])).not.toMatch(/4\.36|m\/s²/);
  });
});

describe("the latitude view", () => {
  it("gives the spin's share of g, only with the labels", () => {
    expect(words(results({ latitude: 0 }), ["globe", "labels"])).toContain("ω²R cos²λ = 0.0338 m/s² · g′ = 9.766 m/s²");
    expect(words(results({ latitude: 0 }), ["globe"])).not.toContain("0.0338");
    expect(words(results({ latitude: 60 }), ["globe"])).toContain("λ = 60°");
  });
});

describe("the field view", () => {
  it("names the pull on a kilogram and which way it points", () => {
    expect(words(results({ fieldX: 200000 }), ["field", "labels"])).toMatch(/x = 200 000 km · \d\.\d\d × 10⁻³ N\/kg to Earth/);
    expect(words(results({ fieldX: 370000 }), ["field", "labels"])).toContain("N/kg to Moon");
    expect(words(results({ fieldX: 346000 }), ["field", "labels"])).toContain("x = 346 000 km · no net pull: the null point");
  });

  it("marks the null point only with the labels", () => {
    expect(words(results(), ["field", "labels"])).toContain("null point");
    expect(words(results(), ["field"])).not.toContain("null point");
    expect(words(results({ partnerMass: 4 }), ["field"])).toContain("Moon × 4.0");
  });

  it("draws field arrows all around the two bodies", () => {
    // Two discs and the probe, plus arrow heads: many fills.
    expect(render(results(), ["field"], 325).of("fill").length).toBeGreaterThan(20);
  });
});

describe("the weighing machine", () => {
  it("reads mg on the ground and zero in an orbiting station", () => {
    expect(words(results({ frame: "ground", bodyMass: 60 }), ["balance", "labels"])).toContain("scale reads 588 N (60.0 kg)");
    const station = words(results({ frame: "station", orbitHeight: 400 }), ["balance", "labels"]);
    expect(station).toContain("In a station 400 km up");
    expect(station).toContain("scale reads 0 N (0.0 kg)");
    expect(station).toContain("gravity here 8.68 m/s² · floor falls at 8.68 m/s²");
  });

  it("reads m(g + a) in a lift, and hides it without the labels", () => {
    expect(words(results({ frame: "lift", liftAccel: 2, bodyMass: 60 }), ["balance", "labels"])).toContain("scale reads 708 N (72.2 kg)");
    expect(words(results({ frame: "station" }), ["balance"])).not.toMatch(/8\.68|scale reads/);
  });
});

describe("the energy view", () => {
  it("draws KE, PE, E and E′, and gives the cost of climbing from 2R to 4R", () => {
    const text = words(results({ orbitHeight: 6400, targetHeight: 19200, satMass: 400 }), ["orbit", "bars", "labels"]);
    expect(text).toContain("An orbit 6 400 km up, and one 19 200 km up");
    expect(text).toContain("ΔE = 3.14 × 10⁹ J · binding 6.27 × 10⁹ J");
    for (const name of ["KE", "PE", "E", "E′"]) expect(text.split(" | ")).toContain(name);
  });

  it("makes PE twice as deep as KE is tall", () => {
    const rec = render(results({ orbitHeight: 6400, targetHeight: 6400 }), ["bars"]);
    const heights = rec.of("fillRect").map((c) => Math.abs((c.args as number[])[3]!));
    expect(heights[1]! / heights[0]!).toBeCloseTo(2, 9);
    expect(heights[2]! / heights[0]!).toBeCloseTo(1, 9);
  });

  it("hides the energies without the labels", () => {
    expect(words(results(), ["orbit", "bars"])).not.toMatch(/ΔE|binding|km\/s/);
  });
});

describe("on a phone", () => {
  it("keeps every view inside a 325 px canvas", () => {
    const layout = computeOrbitFieldLayout(325);
    expect(layout.height).toBeGreaterThanOrEqual(330);
    expect(layout.height).toBeLessThanOrEqual(420);
    const cases: [Partial<OrbitFieldParams>, string[]][] = [
      [{ probeR: 25600 }, ["gcurve", "approx", "labels"]],
      [{ probeR: 6464 }, ["gcurve", "approx", "labels"]],
      [{ latitude: 0 }, ["globe", "labels"]],
      [{ latitude: 89 }, ["globe", "labels"]],
      [{ fieldX: 7000, partnerMass: 82 }, ["field", "labels"]],
      [{ fieldX: 380000, partnerMass: 0.5 }, ["field", "labels"]],
      [{ frame: "ground" }, ["balance", "labels"]],
      [{ frame: "lift", liftAccel: 4.9 }, ["balance", "labels"]],
      [{ frame: "station", orbitHeight: 35800 }, ["balance", "labels"]],
      [{ orbitHeight: 200, targetHeight: 40000 }, ["orbit", "bars", "labels"]],
      [{ orbitHeight: 40000, targetHeight: 200 }, ["orbit", "bars", "labels"]],
    ];
    for (const [params, layers] of cases) expectInside(render(results(params), layers, 325), 325, layout.height);
  });

  it("keeps the energy bars and orbit inside their boxes", () => {
    const layout = computeOrbitFieldLayout(325);
    const rec = render(results({ orbitHeight: 200, targetHeight: 40000 }), ["orbit", "bars"], 325);
    for (const call of rec.of("fillRect")) {
      const [x, y, w, h] = call.args as number[];
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x! + w!).toBeLessThanOrEqual(325);
      expect(y).toBeGreaterThanOrEqual(layout.bars.y - 1);
      expect(y! + h!).toBeLessThanOrEqual(layout.bars.y + layout.bars.height + 1);
    }
    for (const call of rec.of("arc")) {
      const [x, y, r] = call.args as number[];
      expect(x! - r!).toBeGreaterThanOrEqual(0);
      expect(x! + r!).toBeLessThanOrEqual(325);
      expect(y! - r!).toBeGreaterThanOrEqual(layout.sky.y - 1);
    }
  });
});
