import { lorentzModel, type LorentzParams, type LorentzState } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeLorentzLayout, lorentzRenderer, lorentzSig } from "./lorentz/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base = lorentzModel.initialize(lorentzModel.defaultParams);
const deg = (d: number) => (d * Math.PI) / 180;
const results = (params: Partial<LorentzParams> = {}, state: Partial<LorentzState> = {}) =>
  lorentzModel.derive({ ...base, ...state }, { ...lorentzModel.defaultParams, ...params });
type Placed = { words: string; x: number; y: number; align: string };
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  // Note each text's alignment as it is drawn, to check it stays on the canvas.
  const placed: Placed[] = [];
  let align = "left";
  const ctx = new Proxy(rec.ctx, {
    get(target, key: string) {
      if (key === "fillText") return (words: string, x: number, y: number) => {
        placed.push({ words, x, y, align });
        target.fillText(words, x, y);
      };
      return (target as unknown as Record<string, unknown>)[key];
    },
    set(target, key: string, value) {
      if (key === "textAlign") align = value;
      (target as unknown as Record<string, unknown>)[key] = value;
      return true;
    },
  });
  lorentzRenderer.draw(ctx, computeLorentzLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return Object.assign(rec, { placed });
};
const text = (rec: ReturnType<typeof render>) => rec.texts().join(" | ");

/** Every label, line and circle stays on a 325 px canvas. */
function staysOnPhone(rec: ReturnType<typeof render>) {
  const { width, height } = computeLorentzLayout(325);
  for (const { words, x, y, align } of rec.placed) {
    // The test context measures 6 px a character.
    expect(words.length, words).toBeLessThanOrEqual(46);
    const w = words.length * 6;
    const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    expect(left, words).toBeGreaterThanOrEqual(0);
    expect(left + w, words).toBeLessThanOrEqual(width);
    expect(y, words).toBeGreaterThanOrEqual(4);
    expect(y, words).toBeLessThanOrEqual(height - 4);
  }
  for (const call of [...rec.of("lineTo"), ...rec.of("moveTo")]) {
    const [x, y] = call.args as [number, number];
    expect(x).toBeGreaterThanOrEqual(-1);
    expect(x).toBeLessThanOrEqual(width + 1);
    expect(y).toBeGreaterThanOrEqual(-1);
    expect(y).toBeLessThanOrEqual(height + 1);
  }
  for (const call of rec.of("arc")) {
    const [x, y, r, start, end, anticlockwise] = call.args as [number, number, number, number, number, boolean | undefined];
    // Points along the arc as drawn.
    let sweep = anticlockwise ? start - end : end - start;
    sweep = sweep >= 2 * Math.PI ? 2 * Math.PI : ((sweep % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) || 2 * Math.PI;
    for (let i = 0; i <= 24; i++) {
      const a = start + (anticlockwise ? -1 : 1) * (sweep * i) / 24;
      const px = x + r * Math.cos(a);
      const py = y + r * Math.sin(a);
      expect(px).toBeGreaterThanOrEqual(-1);
      expect(px).toBeLessThanOrEqual(width + 1);
      expect(py).toBeGreaterThanOrEqual(-1);
      expect(py).toBeLessThanOrEqual(height + 1);
    }
  }
}

describe("numbers", () => {
  it("writes small and large numbers with powers of ten", () => {
    expect(lorentzSig(1.6e-14)).toBe("1.60 × 10⁻¹⁴");
    expect(lorentzSig(10.4375)).toBe("10.4");
    expect(lorentzSig(0.656)).toBe("0.656");
    expect(lorentzSig(2e-7)).toBe("2.00 × 10⁻⁷");
    expect(lorentzSig(0)).toBe("0");
  });
});

describe("the orbit view", () => {
  it("names the particle and the field, and gives r, T and F with the words", () => {
    const words = text(render(results({}, { speed: 1000, field: 100 }), ["orbit", "labels"]));
    expect(words).toContain("Proton, B into page");
    expect(words).toContain("r = 10.4 cm · T = 0.656 µs");
    expect(words).toContain("F = 1.60 × 10⁻¹⁴ N · anticlockwise");
    expect(text(render(results({ particle: "electron" }), ["orbit", "labels"]))).toContain("clockwise");
  });

  it("hides the numbers without the words", () => {
    expect(text(render(results(), ["orbit"]))).not.toMatch(/cm|µs/);
  });

  it("starts a positive charge at the bottom of its circle moving right, with the force pointing up to the centre", () => {
    const rec = render(results({}, { turn: 0 }), ["orbit"]);
    const layout = computeLorentzLayout(800);
    const cy = layout.box.y + layout.box.height / 2;
    const plus = rec.of("fillText").find((c) => c.args[0] === "+")!;
    expect(plus.args[2] as number).toBeGreaterThan(cy);
    const v = rec.of("fillText").find((c) => c.args[0] === "v")!;
    expect(v.args[1] as number).toBeGreaterThan(plus.args[1] as number);
    const f = rec.of("fillText").find((c) => c.args[0] === "F")!;
    expect(f.args[2] as number).toBeLessThan(plus.args[2] as number);
  });

  it("draws ⊙ for a field out of the page and ⊗ for one into it", () => {
    // ⊙ marks are filled circles; ⊗ marks are crosses.
    const into = render(results({ fieldDirection: "into" }), ["orbit"]);
    const out = render(results({ fieldDirection: "out" }), ["orbit"]);
    expect(out.of("fill").length).toBeGreaterThan(into.of("fill").length);
  });

  it("says when the charge moves along B and feels nothing", () => {
    expect(text(render(results({}, { pitchAngle: 0 }), ["orbit"]))).toContain("moving along B: no force");
  });

  it("fits a phone", () => {
    for (const state of [{ speed: 100 }, { speed: 10000, field: 1 }, { turn: 0.3 }]) staysOnPhone(render(results({}, state), ["orbit", "labels"], 325));
  });
});

describe("the helix view", () => {
  it("gives the radius and pitch with the words", () => {
    const words = text(render(results({}, { pitchAngle: deg(60) }), ["helix", "labels"]));
    expect(words).toContain("r = 9.04 cm · pitch p = 32.8 cm");
    expect(words).toContain("θ = 60°");
    staysOnPhone(render(results({}, { pitchAngle: deg(30) }), ["helix", "labels"], 325));
    staysOnPhone(render(results({}, { pitchAngle: deg(90) }), ["helix", "labels"], 325));
  });
});

describe("the velocity selector", () => {
  it("says whether the charge goes straight through", () => {
    expect(text(render(results({}, { speed: 1000, field: 100, efield: 100 }), ["selector", "labels"]))).toContain("E/B = 1000 km/s · v = 1000 km/s: passes");
    expect(text(render(results({}, { speed: 2000, field: 100, efield: 100 }), ["selector", "labels"]))).toContain("bends up");
    expect(text(render(results({ particle: "electron" }, { speed: 2000, field: 100, efield: 100 }), ["selector", "labels"]))).toContain("bends down");
    staysOnPhone(render(results({}, { speed: 300, efield: 900 }), ["selector", "labels"], 325));
  });

  it("draws qE down and qvB up on a positive charge, and the reverse on a negative one", () => {
    const pos = render(results({}, { speed: 1000, field: 100, efield: 100 }), ["selector"]);
    const y = (rec: ReturnType<typeof render>, t: string) => rec.of("fillText").find((c) => c.args[0] === t)!.args[2] as number;
    expect(y(pos, "qE")).toBeGreaterThan(y(pos, "qvB"));
    const neg = render(results({ particle: "electron" }, { speed: 1000, field: 100, efield: 100 }), ["selector"]);
    expect(y(neg, "qE")).toBeLessThan(y(neg, "qvB"));
  });
});

describe("the cyclotron", () => {
  it("gives the frequency and energy only with the words", () => {
    const r = results({}, { cycField: 0.66, deeRadius: 60 });
    expect(text(render(r, ["cyclotron", "labels"]))).toContain("f = 10.1 MHz");
    expect(text(render(r, ["cyclotron"]))).not.toMatch(/MHz|MeV/);
  });

  it("draws one semicircle per crossing, at most forty", () => {
    const few = render(results({}, { crossings: 5 }), ["cyclotron"]);
    const many = render(results({}, { gapVoltage: 10, crossings: 1e6 }), ["cyclotron"]);
    const arcs = (rec: ReturnType<typeof render>) => rec.of("arc").length;
    expect(arcs(many) - arcs(few)).toBeGreaterThan(30);
    expect(text(many)).toContain("beam out");
    staysOnPhone(render(results({}, { crossings: 1e6 }), ["cyclotron", "labels"], 325));
  });
});

describe("force on a wire", () => {
  it("marks the force ⊗ into the page for 0–180°, ⊙ out of it beyond, and none along B", () => {
    expect(text(render(results({}, { current: 4, angle: deg(30) }), ["wire", "labels"]))).toContain("F = BIL sin θ = 0.500 N, into the page");
    expect(text(render(results({}, { angle: deg(270) }), ["wire", "labels"]))).toContain("out of the page");
    expect(text(render(results({}, { angle: 0 }), ["wire"]))).toContain("F = 0");
    staysOnPhone(render(results({}, { angle: deg(135), length: 100 }), ["wire", "labels"], 325));
  });
});

describe("parallel currents", () => {
  it("pulls like currents together and pushes unlike ones apart", () => {
    expect(text(render(results({}, { current: 1, current2: 1, separation: 100 }), ["parallel", "labels"]))).toContain("F/L = 2.00 × 10⁻⁷ N/m: attract");
    expect(text(render(results({ sense: "opposite" }), ["parallel", "labels"]))).toContain("repel");
    for (const separation of [1, 100]) staysOnPhone(render(results({}, { separation }), ["parallel", "labels"], 325));
  });

  it("points the force on wire 2 towards wire 1 when they attract", () => {
    const rec = render(results({}, { separation: 50 }), ["parallel"]);
    const f = rec.of("fillText").find((c) => c.args[0] === "F")!;
    const i2 = rec.of("fillText").find((c) => c.args[0] === "I₂")!;
    expect(f.args[1] as number).toBeLessThan(i2.args[1] as number);
  });
});

describe("the coil", () => {
  it("gives the moment and torque with the words, and hides the torque without", () => {
    const r = results({}, { turns: 100, current: 2, coilArea: 50, fieldT: 0.5, angle: deg(30) });
    const words = text(render(r, ["torque", "labels"]));
    expect(words).toContain("m = NIA = 1.00 A m²");
    expect(words).toContain("τ = NIAB sin θ = 0.250 N m");
    expect(text(render(r, ["torque"]))).not.toContain("N m");
    staysOnPhone(render(r, ["torque", "labels"], 325));
  });
});

describe("the galvanometer", () => {
  it("reads the current, deflection and sensitivity, and warns off the scale", () => {
    expect(text(render(results(), ["galvanometer", "labels"]))).toContain("I = 100 µA → φ = 23° · 0.229° per µA");
    expect(text(render(results({}, { meterCurrent: 300 }), ["galvanometer"]))).toContain("off the scale!");
    staysOnPhone(render(results({}, { meterCurrent: -300 }), ["galvanometer", "labels"], 325));
  });
});

describe("fields of currents", () => {
  it("gives the field of a wire and checks Ampère's law", () => {
    const words = text(render(results({ source: "wire" }, { current: 10, distance: 5 }), ["source", "labels"]));
    expect(words).toContain("B = 40.0 µT at r = 5.00 cm, anticlockwise");
    expect(words).toContain("∮B·dl ÷ μ₀ = 10.0 A = I enclosed");
    expect(text(render(results({ source: "wire" }, { current: 10, distance: 5 }), ["source"]))).not.toContain("µT");
  });

  it("names the direction for each source", () => {
    expect(text(render(results({ source: "element" }, { angle: deg(90) }), ["source", "labels"]))).toContain("into the page");
    expect(text(render(results({ source: "element" }, { angle: deg(270) }), ["source", "labels"]))).toContain("out of the page");
    expect(text(render(results({ source: "loop" }), ["source", "labels"]))).toContain("to the right");
    expect(text(render(results({ source: "loop", flow: "reverse" }), ["source", "labels"]))).toContain("to the left");
    expect(text(render(results({ source: "solenoid" }, { turns: 1000, length: 50, current: 2 }), ["source", "labels"]))).toContain("B = μ₀nI = 5027 µT, to the right");
    expect(text(render(results({ source: "toroid" }, { turns: 100, current: 10, distance: 20 }), ["source", "labels"]))).toContain("B = 1000 µT at r = 20.0 cm, anticlockwise");
    expect(text(render(results({ source: "toroid" }, { distance: 40 }), ["source", "labels"]))).toContain("B = 0 µT at r = 40.0 cm");
  });

  it("puts the solenoid's north pole at the end its field leaves from", () => {
    const rec = render(results({ source: "solenoid" }), ["source"]);
    const x = (t: string) => rec.of("fillText").find((c) => c.args[0] === t)!.args[1] as number;
    expect(x("N")).toBeGreaterThan(x("S"));
    const back = render(results({ source: "solenoid", flow: "reverse" }), ["source"]);
    const xb = (t: string) => back.of("fillText").find((c) => c.args[0] === t)!.args[1] as number;
    expect(xb("N")).toBeLessThan(xb("S"));
  });

  it("fits a phone for every source", () => {
    for (const source of ["element", "wire", "loop", "solenoid", "toroid"] as const) {
      for (const state of [{ distance: 50, axial: 50, angle: deg(200) }, { distance: 1, axial: 0 }]) {
        staysOnPhone(render(results({ source }, state), ["source", "labels"], 325));
      }
    }
  });
});
