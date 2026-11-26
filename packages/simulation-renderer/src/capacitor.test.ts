import { capacitorModel, type CapacitorParams, type CapacitorState } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { capacitorRenderer, capEquipotentialLevels, capFieldLines, capFigures, computeCapacitorLayout } from "./capacitor/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const P = capacitorModel.defaultParams;
const results = (params: Partial<CapacitorParams> = {}, writes: [string, number][] = []) => {
  const p = { ...P, ...params };
  const state = writes.reduce<CapacitorState>((s, [id, v]) => capacitorModel.setVariable(s, id, v, p), capacitorModel.initialize(p));
  return capacitorModel.derive(state, p);
};
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  capacitorRenderer.draw(rec.ctx, computeCapacitorLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const FIELD = ["field", "equipotentials", "fieldLines", "probe"];

describe("numbers", () => {
  it("keeps three figures", () => {
    expect([capFigures(1800), capFigures(88.5), capFigures(8.85), capFigures(0.4425), capFigures(-450), capFigures(0)]).toEqual(["1800", "88.5", "8.85", "0.443", "−450", "0"]);
  });
});

describe("the field view", () => {
  it("names the charges and reads V, E and the work at the probe", () => {
    const texts = render(results(), [...FIELD, "labels"]).texts();
    expect(texts).toEqual(expect.arrayContaining(["One point charge", "q +10 nC", "A", "P"]));
    expect(texts).toContain("at P: V = 1800 V · E = 36.0 kV/m");
    expect(texts).toContain("W(A→P) = q₀ΔV = 0.900 µJ, any path");
  });

  it("gives the pair's potential energy for two charges", () => {
    const texts = render(results({ arrangement: "two" }, [["q2", 10], ["px", 0], ["py", 5]]), [...FIELD, "labels"]).texts();
    expect(texts).toEqual(expect.arrayContaining(["Two point charges", "q₁ +10 nC", "q₂ +10 nC"]));
    expect(texts.join(" ")).toContain("U = 15.0 µJ");
  });

  it("says the field is zero inside the conductor, and marks the induced charge", () => {
    const texts = render(results({ arrangement: "shell" }, [["q1", 0], ["px", 1], ["py", 1]]), [...FIELD, "labels"]).texts();
    expect(texts).toContain("inside the conductor: E = 0, V = 0 V");
    expect(texts.filter((t) => t === "+").length).toBeGreaterThan(0);
    expect(texts.filter((t) => t === "−").length).toBeGreaterThan(0);
  });

  it("hides every number without the words", () => {
    const texts = render(results(), FIELD).texts().join(" ");
    expect(texts).not.toMatch(/V =|kV\/m|µJ/);
  });

  it("draws the dipole's zero equipotential, and field lines from + to −", () => {
    const dipole = { arrangement: "two" as const, q1: 10, q2: -10, s: 6 };
    expect(capEquipotentialLevels(dipole)).toContain(0);
    expect(capEquipotentialLevels({ ...dipole, q2: 10 })).not.toContain(0);
    const lines = capFieldLines(dipole);
    expect(lines.length).toBeGreaterThanOrEqual(12);
    // Lines leave the positive charge on the left; some reach the negative one.
    const ends = lines.filter((l) => l.sign > 0).map((l) => l.points[l.points.length - 1]!);
    expect(ends.some(([x, y]) => Math.hypot(x - 3, y) < 0.5)).toBe(true);
  });

  it("keeps field lines out of the conductor", () => {
    for (const { points } of capFieldLines({ arrangement: "shell", q1: 2, q2: 0, s: 6 })) {
      for (const [x, y] of points.slice(1, -1)) expect(Math.hypot(x, y)).toBeGreaterThan(3.9);
    }
  });
});

describe("the plates view", () => {
  it("reads C, Q, V, E and U", () => {
    const texts = render(results(), ["plates", "fieldLines", "labels"]).texts();
    expect(texts).toEqual(expect.arrayContaining(["A parallel-plate capacitor", "100 V", "battery on", "A = 100 cm² · d = 1 mm · air"]));
    expect(texts).toContain("C = 88.5 pF · Q = 8.85 nC · V = 100 V");
    expect(texts).toContain("E = V/d = 100 kV/m · U = 0.443 µJ");
  });

  it("drops V when a dielectric goes in with the battery off", () => {
    const texts = render(results({}, [["battery", 0], ["k", 5]]), ["plates", "labels"]).texts();
    expect(texts).toEqual(expect.arrayContaining(["battery off", "A = 100 cm² · d = 1 mm · K = 5"]));
    expect(texts.join(" ")).toMatch(/C = 44[23] pF · Q = 8.85 nC · V = 20.0 V/);
  });

  it("hides the numbers without the words", () => {
    expect(render(results(), ["plates"]).texts().join(" ")).not.toMatch(/pF|nC|µJ/);
  });
});

describe("the network view", () => {
  it("puts one charge on every capacitor in series", () => {
    const texts = render(results({ network: "series" }, [["voltage", 12]]), ["network", "labels"]).texts();
    expect(texts).toEqual(expect.arrayContaining(["Capacitors in series", "C₁ 2 µF", "C₂ 3 µF", "C₃ 6 µF", "6.00 V", "4.00 V", "2.00 V"]));
    expect(texts.filter((t) => t === "12.0 µC")).toHaveLength(3);
    expect(texts).toContain("C_eq = 1.00 µF · Q = 12.0 µC");
    expect(texts).toContain("U = ½C_eq V² = 72.0 µJ");
  });

  it("shows the energy lost when charge is shared", () => {
    const texts = render(results({ network: "share" }, [["c1", 6], ["c2", 3], ["voltage", 12]]), ["network", "labels"]).texts();
    expect(texts).toContain("shared V = 8.00 V · total Q = 72.0 µC");
    expect(texts).toContain("U: 432 → 288 µJ, 144 µJ lost");
  });

  it("hides charges and voltages without the words", () => {
    const texts = render(results({ network: "mixed" }), ["network"]).texts().join(" ");
    expect(texts).not.toMatch(/µC|C_eq/);
  });
});

describe("a phone's canvas", () => {
  const inside = (rec: ReturnType<typeof render>, width: number, height: number) => {
    for (const call of rec.of("fillText")) {
      const [text, x, y] = call.args as [string, number, number];
      expect(x, text).toBeGreaterThanOrEqual(0);
      expect(x, text).toBeLessThanOrEqual(width);
      // Titles and captions are centred: the whole line must fit.
      if (text.length > 12) {
        expect(x - (text.length * 6) / 2, text).toBeGreaterThanOrEqual(0);
        expect(x + (text.length * 6) / 2, text).toBeLessThanOrEqual(width);
      }
      expect(y, text).toBeGreaterThanOrEqual(0);
      expect(y, text).toBeLessThanOrEqual(height);
    }
  };

  it("fits the field view, with the plot inside the canvas", () => {
    const layout = computeCapacitorLayout(325);
    expect(layout.plot.x).toBeGreaterThanOrEqual(0);
    expect(layout.plot.x + layout.plot.width).toBeLessThanOrEqual(325);
    expect(layout.plot.y + layout.plot.height).toBeLessThan(layout.captionY[0] - 10);
    for (const arrangement of ["one", "two", "shell"] as const) {
      inside(render(results({ arrangement }, [["px", 15], ["py", -10]]), [...FIELD, "labels"], 325), 325, layout.height);
    }
  });

  it("keeps captions short and the widest plates inside", () => {
    for (const [layers, params, writes] of [
      [["plates", "fieldLines", "equipotentials", "labels"], {}, [["area", 400], ["gap", 10], ["k", 10], ["voltage", 500]]],
      [["plates", "labels"], {}, [["area", 20], ["gap", 0.5]]],
      [["network", "labels"], { network: "parallel" }, [["voltage", 500]]],
      [["network", "labels"], { network: "mixed" }, [["voltage", 500]]],
      [["network", "labels"], { network: "share" }, [["voltage", 500]]],
      [["field", "probe", "labels"], { arrangement: "two" }, [["q1", -10], ["q2", -10]]],
    ] as [string[], Partial<CapacitorParams>, [string, number][]][]) {
      const rec = render(results(params, writes), layers, 325);
      for (const t of rec.texts()) expect(t.length, t).toBeLessThanOrEqual(55);
      inside(rec, 325, 390);
      for (const call of rec.of("fillRect")) {
        const [x, , w] = call.args as number[];
        expect(x!).toBeGreaterThanOrEqual(0);
        expect(x! + w!).toBeLessThanOrEqual(325);
      }
    }
  });
});
