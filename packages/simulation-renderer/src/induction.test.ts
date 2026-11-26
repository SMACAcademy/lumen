import { inductionModel, type InductionParams, type InductionState } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeInductionLayout, inductionRenderer } from "./induction/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base: InductionState = inductionModel.initialize(inductionModel.defaultParams);
const results = (params: Partial<InductionParams> = {}, state: Partial<InductionState> = {}) =>
  inductionModel.derive({ ...base, ...state }, { ...inductionModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  inductionRenderer.draw(rec.ctx, computeInductionLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const words = (r: ReturnType<typeof results>, layers: string[]) => render(r, layers).texts().join(" | ");

const MODES: Record<string, string[]> = {
  flux: ["field", "labels"],
  magnet: ["magnet", "graphs", "labels"],
  rod: ["rails", "labels"],
  eddy: ["pendulum", "labels"],
  self: ["solenoid", "labels"],
  mutual: ["solenoid", "secondary", "labels"],
  generator: ["generator", "graphs", "labels"],
};

describe("the flux view", () => {
  it("gives Φ = BA cos θ with the words, and hides it without", () => {
    const r = results({ field: 0.5, area: 100, tilt: 60 });
    expect(words(r, MODES.flux!)).toContain("Φ = BA cos θ = 2.50 mWb per turn");
    expect(words(r, MODES.flux!)).toContain("flux linkage NΦ = 0.250 Wb");
    expect(words(r, ["field"])).not.toContain("mWb");
    expect(render(r, ["field"]).texts()).toEqual(expect.arrayContaining(["θ = 60°", "A cos θ", "n", "B"]));
  });

  it("threads fewer field lines through the coil as it turns edge on to the field", () => {
    // Bright lines through the coil are drawn 2 px wide; the rest 1.2 px.
    const bright = (tilt: number) => {
      const rec = recordingContext();
      const widths: number[] = [];
      const ctx = rec.ctx as unknown as Record<string, unknown>;
      const stroke = () => widths.push(Number(ctx.lineWidth));
      ctx.stroke = stroke;
      inductionRenderer.draw(rec.ctx, computeInductionLayout(800), { results: results({ tilt }), trace: null, layers: new Set(["field"]), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
      return widths.filter((w) => w === 2).length;
    };
    expect(bright(0)).toBeGreaterThan(bright(60));
    expect(bright(90)).toBe(0);
  });
});

describe("the magnet view", () => {
  it("says which way the current makes the near face, and that it opposes the motion", () => {
    expect(words(results({ pole: "north", motion: "in", magnetSpeed: 0.5 }, { d: 3 }), MODES.magnet!)).toContain("ε = −16.9 mV · near face N: it repels the magnet");
    expect(words(results({ pole: "north", motion: "out" }, { d: 5 }), MODES.magnet!)).toContain("near face S: it attracts the magnet");
    expect(words(results({ pole: "south", motion: "in" }, { d: 5 }), MODES.magnet!)).toContain("near face S: it repels the magnet");
    expect(words(results({ motion: "in" }, { d: 0 }), MODES.magnet!)).toContain("magnet at rest: flux steady, so no EMF");
  });

  it("labels the coil's face with the induced pole and draws the push on the magnet", () => {
    const texts = render(results({ pole: "north", motion: "in" }, { d: 10 }), ["magnet"]).texts();
    expect(texts).toEqual(expect.arrayContaining(["N", "S", "I", "v", "F", "G"]));
    const still = render(results({ motion: "in" }, { d: 0 }), ["magnet"]).texts();
    expect(still).not.toContain("I");
    expect(still).not.toContain("F");
  });

  it("plots the flux and the EMF against time, and hides the EMF value without the words", () => {
    const r = results({ magnetSpeed: 0.5 }, { d: 10 });
    const texts = render(r, ["magnet", "graphs"]).texts();
    expect(texts).toEqual(expect.arrayContaining(["flux linkage NΦ against time", "EMF ε = −N dΦ/dt against time", "3 s"]));
    expect(texts.join(" ")).not.toContain("mV");
  });
});

describe("the rod view", () => {
  it("gives ε = Bvl, the current, the force and the power", () => {
    const text = words(results({ field: 0.5, rodLength: 0.5, rodVelocity: 2, resistance: 1 }), MODES.rod!);
    expect(text).toContain("ε = Bvl = 0.500 V · I = 0.500 A");
    expect(text).toContain("F = BIl = 0.125 N · power to push 0.250 W");
    expect(words(results({ rodVelocity: 0 }), MODES.rod!)).toContain("rod at rest");
    expect(words(results(), ["rails"])).not.toMatch(/ V |W$/);
  });

  it("marks the top of the rod + when it moves right, the bottom when it moves left", () => {
    const plus = (v: number) => render(results({ rodVelocity: v }), ["rails"]).of("fillText").find((c) => c.args[0] === "+")!.args[2] as number;
    expect(plus(2)).toBeLessThan(plus(-2));
  });
});

describe("the eddy view", () => {
  it("names the braking and how fast the swing dies", () => {
    expect(words(results({ plate: "solid", field: 0.5 }), MODES.eddy!)).toContain("large eddy currents: strong braking");
    expect(words(results({ plate: "solid", field: 0.5 }), MODES.eddy!)).toContain("swing 30.0° · it halves every 0.680 s");
    expect(words(results({ plate: "slotted", field: 0.5 }), MODES.eddy!)).toContain("small eddy currents");
    expect(words(results({ plate: "plastic" }), MODES.eddy!)).toContain("no eddy currents");
  });

  it("cuts slots in the slotted plate", () => {
    const fills = (plate: InductionParams["plate"]) => render(results({ plate }), ["pendulum"]).of("fillRect").length;
    expect(fills("slotted")).toBeGreaterThan(fills("solid"));
  });
});

describe("the inductance views", () => {
  it("gives L, the back EMF and the energy", () => {
    const r = results({ solTurns: 1000, solLength: 25, solArea: 20, rampRate: 10 }, { current: 2 });
    const text = words(r, MODES.self!);
    expect(text).toContain("L = 10.1 mH · I = 2.00 A, rising at 10 A/s");
    expect(text).toContain("ε = −L dI/dt = −0.101 V · ½LI² = 0.0201 J");
    expect(text).toContain("back EMF opposes the rise");
    expect(words(results({ rampRate: -10 }, { current: 2 }), MODES.self!)).toContain("back EMF opposes the fall");
    expect(words(r, ["solenoid"])).not.toContain("mH");
  });

  it("gives M and the EMF in the second coil", () => {
    const text = words(results({ solTurns: 1000, solLength: 25, solArea: 20, turns: 100, rampRate: 10 }, { current: 2 }), MODES.mutual!);
    expect(text).toContain("M = 1.01 mH · current rising at 10 A/s");
    expect(text).toContain("ε₂ = −M dI/dt = −10.1 mV");
    expect(text).not.toContain("back EMF");
  });
});

describe("the generator view", () => {
  it("shows the EMF at its peak when the coil lies along the field", () => {
    const r = results({ turns: 100, area: 100, field: 0.5, spin: 1 }, { t: 0.25 });
    const rec = render(r, MODES.generator!);
    expect(rec.texts()).toEqual(expect.arrayContaining(["θ = 90°", "N", "S", "ε against time · dashed: ωNΦ"]));
    expect(rec.texts().join(" ")).toContain("ε = 3.14 V · peak NBAω = 3.14 V");
    expect(render(r, ["generator", "graphs"]).texts().join(" ")).not.toContain("peak");
  });
});

describe("on a phone", () => {
  it("keeps every word on a 325 px canvas, and captions short", () => {
    const cases: [ReturnType<typeof results>, string[]][] = [
      [results({ tilt: 0, area: 400, field: 1 }), MODES.flux!],
      [results({ tilt: 150, area: 10 }), MODES.flux!],
      ...[0, 2, 15, 30].map((d) => [results({ pole: "south", motion: "out", area: 400, turns: 500 }, { d }), MODES.magnet!] as [ReturnType<typeof results>, string[]]),
      ...[0, 15, 30].map((d) => [results({ motion: "in" }, { d }), MODES.magnet!] as [ReturnType<typeof results>, string[]]),
      ...[0.1, 0.5, 1].flatMap((rodX) => [2, -2].map((rodVelocity) => [results({ rodVelocity, rodLength: 1 }, { rodX }), MODES.rod!] as [ReturnType<typeof results>, string[]])),
      ...(["solid", "slotted", "plastic"] as const).map((plate) => [results({ plate }, { t: 0.3 }), MODES.eddy!] as [ReturnType<typeof results>, string[]]),
      [results({ solLength: 50, solArea: 50, rampRate: -20 }, { current: 3 }), MODES.self!],
      [results({ solLength: 50, solArea: 50, area: 10, rampRate: 20 }, { current: 3 }), MODES.mutual!],
      ...[0.1, 0.3, 0.7, 1.9].map((t) => [results({ spin: 5, turns: 500, area: 400, field: 1 }, { t }), MODES.generator!] as [ReturnType<typeof results>, string[]]),
    ];
    for (const [r, layers] of cases) {
      const rec = recordingContext();
      const ctx = rec.ctx as unknown as Record<string, unknown>;
      const spans: { text: string; left: number; right: number; y: number }[] = [];
      ctx.fillText = (text: string, x: number, y: number) => {
        const w = text.length * 6;
        const align = ctx.textAlign;
        const left = align === "center" ? x - w / 2 : align === "right" || align === "end" ? x - w : x;
        spans.push({ text, left, right: left + w, y });
      };
      const layout = computeInductionLayout(325);
      inductionRenderer.draw(rec.ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
      expect(spans.length, layers.join()).toBeGreaterThan(0);
      for (const s of spans) {
        expect(s.left, `${s.text} (${layers[0]})`).toBeGreaterThanOrEqual(0);
        expect(s.right, `${s.text} (${layers[0]})`).toBeLessThanOrEqual(325);
        expect(s.y, s.text).toBeGreaterThanOrEqual(0);
        expect(s.y, s.text).toBeLessThanOrEqual(layout.height);
        expect(s.text.length, s.text).toBeLessThanOrEqual(55);
      }
    }
  });

  it("keeps the magnet's journey, the rod and the generator inside the canvas", () => {
    const layout = computeInductionLayout(325);
    for (const d of [0, 30]) {
      const rec = render(results({ area: 400 }, { d }), ["magnet"], 325);
      for (const call of rec.of("fillRect")) {
        const [x, , w] = call.args as number[];
        expect(x!).toBeGreaterThanOrEqual(0);
        expect(x! + w!).toBeLessThanOrEqual(325);
      }
    }
    const rods = render(results({ rodLength: 1 }, { rodX: 1 }), ["rails"], 325);
    for (const call of rods.of("lineTo")) {
      const [x, y] = call.args as number[];
      expect(x!).toBeLessThanOrEqual(325);
      expect(y!).toBeLessThanOrEqual(layout.height);
    }
    const gen = render(results({}, { t: 0.1 }), ["generator", "graphs"], 325);
    for (const call of gen.of("fillRect")) {
      const [x, , w] = call.args as number[];
      expect(x!).toBeGreaterThanOrEqual(0);
      expect(x! + w!).toBeLessThanOrEqual(325);
    }
  });
});
