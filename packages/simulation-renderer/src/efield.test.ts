import { efieldModel, type EfieldParams, type EfieldState } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeEfieldLayout, efieldNumber, efieldRenderer } from "./efield/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const start = efieldModel.initialize(efieldModel.defaultParams);
const results = (state: Partial<EfieldState> = {}, params: Partial<EfieldParams> = {}) =>
  efieldModel.derive({ ...start, ...state }, { ...efieldModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  efieldRenderer.draw(rec.ctx, computeEfieldLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const text = (r: ReturnType<typeof results>, layers: string[], width = 800) => render(r, layers, width).texts().join(" | ");

/** Every text drawn lies on the canvas, judged by its anchor and the recorder's 6 px a character. */
function expectTextsInside(rec: ReturnType<typeof render>, width: number, height: number) {
  for (const call of rec.of("fillText")) {
    const [words, x, y] = call.args as [string, number, number];
    expect(y, words).toBeGreaterThanOrEqual(0);
    expect(y, words).toBeLessThanOrEqual(height);
    // Alignment is not recorded, so allow the widest case either side of the anchor.
    expect(x - words.length * 6, words).toBeGreaterThanOrEqual(-words.length * 6);
    expect(x, words).toBeGreaterThanOrEqual(0);
    expect(x, words).toBeLessThanOrEqual(width);
  }
}

describe("numbers in captions", () => {
  it("writes everyday sizes plainly and the rest in powers of ten", () => {
    expect(efieldNumber(5.4)).toBe("5.40");
    expect(efieldNumber(0.636)).toBe("0.636");
    expect(efieldNumber(225886)).toBe("2.26 × 10⁵");
    expect(efieldNumber(-8.66e-4)).toBe("−8.66 × 10⁻⁴");
    expect(efieldNumber(9.996e5)).toBe("1.00 × 10⁶");
    expect(efieldNumber(0)).toBe("0");
  });
});

describe("the forces view", () => {
  it("names the pair force and the net force on q₃", () => {
    const words = text(results({ q1: 1, q2: 1, q3: 1, sep: 20, px: 0, py: 10 }), ["charges", "forces", "labels"]);
    expect(words).toContain("Coulomb forces");
    expect(words).toContain("q₁ +1 µC");
    expect(words).toContain("q₃ +1 µC");
    expect(words).toContain("q₁ and q₂: 0.225 N, repel");
    expect(words).toContain("net force on q₃: 0.636 N at 90°");
    expect(text(results({ q1: 2, q2: -3, sep: 10 }), ["charges", "forces", "labels"])).toContain("q₁ and q₂: 5.40 N, attract");
  });

  it("hides the numbers with the words", () => {
    expect(text(results({ q1: 1, q2: 1, q3: 1, sep: 20, px: 0, py: 10 }), ["charges", "forces"])).not.toMatch(/ N/);
  });

  it("draws the net force as the diagonal of the parallelogram", () => {
    const rec = render(results({ q1: 1, q2: 1, q3: 1, sep: 20, px: 0, py: 10 }), ["charges", "forces"]);
    // Pair arrows (2) and three on q₃, each a shaft and a head.
    expect(rec.of("fill").length).toBeGreaterThanOrEqual(5);
    expect(rec.of("setLineDash").length).toBeGreaterThan(0);
  });
});

describe("the field view", () => {
  it("draws field lines and gives the field at P", () => {
    const rec = render(results({ q1: 1, q2: 0, sep: 20, px: 0, py: 0 }), ["charges", "lines", "probe", "labels"]);
    expect(rec.texts().join(" ")).toContain("E at P: 9.00 × 10⁵ N/C at 0°");
    expect(rec.of("lineTo").length).toBeGreaterThan(100);
  });

  it("names a dipole's moment", () => {
    expect(text(results({ q1: -1, q2: 1, sep: 2, px: 0, py: 10 }), ["charges", "lines", "probe", "labels"])).toContain("a dipole: p = 2.00 × 10⁻⁸ C m");
  });

  it("maps the field with arrows", () => {
    const rec = render(results({ q1: 2, q2: -2 }), ["charges", "arrows"], 325);
    expect(rec.of("fill").length).toBeGreaterThan(40);
  });
});

describe("the dipole view", () => {
  it("gives the torque and energy only with the words", () => {
    const r = results({ dipoleCharge: 1, dipoleLength: 2, fieldE: 50000, theta: 30 });
    const words = text(r, ["dipole", "labels"]);
    expect(words).toContain("θ = 30°");
    expect(words).toContain("τ = 5.00 × 10⁻⁴ N m · U = −8.66 × 10⁻⁴ J");
    expect(text(r, ["dipole"])).not.toContain("τ =");
  });
});

describe("the flux view", () => {
  it("gives Φ = EA cos θ only with the words", () => {
    const r = results({ fieldE: 3000, area: 100, tilt: 60 });
    expect(text(r, ["flux", "labels"])).toContain("Φ = EA cos θ = 15.0 N m²/C");
    expect(text(r, ["flux"])).not.toContain("Φ");
  });
});

describe("the Gauss view", () => {
  it("counts the charge inside the sphere", () => {
    const words = text(results({ q1: 2, q2: -2, q3: 0, sep: 10, gaussR: 4 }), ["charges", "gauss", "labels"]);
    expect(words).toContain("A Gaussian sphere around q₁");
    expect(words).toContain("charges inside: 1 · q_enc = 2.00 µC");
    expect(words).toContain("Φ = q_enc / ε₀ = 2.26 × 10⁵ N m²/C");
    expect(text(results({ q1: 2, q2: -2, q3: 0, sep: 10, gaussR: 12 }), ["charges", "gauss", "labels"])).toContain("Φ = q_enc / ε₀ = 0 N m²/C");
  });
});

describe("the sources view", () => {
  it("draws each source with the right law", () => {
    expect(text(results({ amount: 1, dist: 10 }, { source: "line" }), ["sources", "labels"])).toContain("E = λ/2πε₀r = 1.80 × 10⁵ N/C");
    expect(text(results({ amount: 1, dist: 10 }, { source: "sheet" }), ["sources", "labels"])).toContain("E = σ/2ε₀ = 5.65 × 10⁴ N/C");
    expect(text(results({ amount: 1, dist: 20 }, { source: "shell" }), ["sources", "labels"])).toContain("E = kQ/r² = 2.25 × 10⁵ N/C");
    expect(text(results({ amount: 1, dist: 5 }, { source: "shell" }), ["sources", "labels"])).toContain("inside: E = 0 = 0 N/C");
  });
});

describe("the plates view", () => {
  it("gives the deflection only with the words", () => {
    const r = results({ fieldE: 1000, speed: 10000, progress: 1 });
    expect(text(r, ["plates", "labels"])).toContain("leaves 2.20 mm off line, after 5.00 ns");
    expect(text(r, ["plates"])).not.toContain("mm");
    expect(text(results({ fieldE: 10000, speed: 10000 }), ["plates", "labels"])).toContain("hits the + plate 3.37 cm in");
    expect(text(results({ fieldE: 1000, speed: 300 }, { particle: "proton" }), ["plates", "labels"])).toContain("A proton between charged plates");
  });
});

describe("on a phone", () => {
  const W = 325;
  const layout = computeEfieldLayout(W);

  it("fits the charges' window and the plates on the canvas", () => {
    expect(layout.cx + 25 * layout.scale).toBeLessThanOrEqual(W);
    expect(layout.cx - 25 * layout.scale).toBeGreaterThanOrEqual(0);
    expect(layout.cy + 20 * layout.scale).toBeLessThanOrEqual(layout.height);
    expect(layout.height).toBeGreaterThanOrEqual(330);
    expect(layout.height).toBeLessThanOrEqual(420);
  });

  it("keeps every word on the canvas in every view", () => {
    const cases: [ReturnType<typeof results>, string[]][] = [
      [results({ q1: 10, q2: -10, q3: 5, sep: 30, px: 25, py: 20 }), ["charges", "forces", "labels"]],
      [results({ q1: 10, q2: -10, q3: 5, sep: 30, px: -25, py: -20 }), ["charges", "forces", "labels"]],
      [results({ q1: -1, q2: 1, sep: 2, px: 25, py: -20 }), ["charges", "lines", "probe", "labels"]],
      [results({ q1: 2, q2: -2, q3: 1, gaussR: 40 }), ["charges", "gauss", "labels"]],
      [results({ dipoleLength: 10, theta: 0 }), ["dipole", "labels"]],
      [results({ dipoleLength: 10, theta: 180 }), ["dipole", "labels"]],
      [results({ area: 400, tilt: 90 }), ["flux", "labels"]],
      [results({ dist: 40 }, { source: "shell" }), ["sources", "labels"]],
      [results({ dist: 0.5 }, { source: "line" }), ["sources", "labels"]],
      [results({ fieldE: 100000, speed: 100, progress: 1 }), ["plates", "labels"]],
      [results({ fieldE: 0, speed: 30000, progress: 1 }, { particle: "proton" }), ["plates", "labels"]],
    ];
    for (const [r, layers] of cases) {
      const rec = render(r, layers, W);
      expectTextsInside(rec, W, layout.height);
      for (const t of rec.texts()) expect(t.length, t).toBeLessThanOrEqual(55);
    }
  });

  it("keeps the dipole and its force arrows inside", () => {
    for (const theta of [0, 90, 180]) {
      const rec = render(results({ dipoleLength: 10, theta }), ["dipole"], W);
      for (const call of rec.of("arc")) {
        const [x, y] = call.args as [number, number];
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(W);
        expect(y).toBeLessThanOrEqual(layout.height);
      }
      for (const call of [...rec.of("moveTo"), ...rec.of("lineTo")]) {
        const [x, y] = call.args as [number, number];
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(W);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(layout.height);
      }
    }
  });
});
