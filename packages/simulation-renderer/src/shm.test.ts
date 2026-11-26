import { type ShmParams, shmModel } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeShmLayout, shmRenderer } from "./shm/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const DEG = Math.PI / 180;
const results = (params: Partial<ShmParams> = {}, t = 0) => shmModel.derive({ t }, { ...shmModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  shmRenderer.draw(rec.ctx, computeShmLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const text = (r: ReturnType<typeof results>, layers: string[], width = 800) => render(r, layers, width).texts().join(" | ");

const MODES: Record<string, string[]> = {
  spring: ["spring", "phasor", "trace", "labels"],
  pendulum: ["pendulum", "trace", "labels"],
  energy: ["spring", "energy", "labels"],
  combine: ["spring", "trace", "labels"],
  damped: ["spring", "trace", "envelope", "labels"],
  driven: ["spring", "resonance", "labels"],
  angular: ["angular", "trace", "labels"],
  experiment: ["pendulum", "tsquared", "labels"],
};

describe("the spring", () => {
  it("names the system and, with the words, gives T, x and v", () => {
    const words = text(results({}, 0.3), MODES.spring!);
    expect(words).toContain("Mass on a spring");
    expect(words).toContain("T = 0.628 s · x = −0.099 m · v = −0.14 m/s");
    expect(words).toContain("ωt + φ");
  });

  it("hides every number without the words", () => {
    for (const [mode, layers] of Object.entries(MODES)) {
      // Axis tick numbers stay: reading the graph is the point. Nothing else may carry a number.
      const words = render(results({ damping: 0.2, driveOmega: 10 }, 0.7), layers.filter((l) => l !== "labels"), 800)
        .texts()
        .filter((w) => !/^−?\d+(\.\d+)?$/.test(w))
        .join(" | ");
      expect(words, mode).not.toMatch(/\d\.\d|= \d/);
    }
  });

  it("draws the block where x is, its shadow on the reference circle above", () => {
    const layout = computeShmLayout(800);
    const rec = render(results({ phase: Math.PI / 2 }), MODES.spring!);
    const block = rec.of("fillRect").find((c) => (c.args[2] as number) === 30)!;
    // φ = π/2: the block is at the centre, the phasor points straight up.
    expect(block.args[0]).toBeCloseTo(layout.rest - 15, 9);
    const centre = rec.of("arc").find((c) => (c.args[2] as number) === 4.5 && Math.abs((c.args[0] as number) - layout.rest) < 1e-9);
    expect(centre?.args[1]).toBeCloseTo(28 + layout.reach - (0.1 * layout.reach) / 0.2, 9);
  });

  it("puts two springs end to end in series and side by side in parallel", () => {
    expect(text(results({ arrangement: "series" }), MODES.combine!)).toContain("in series: k_eff = 25.0 N/m · T = 0.889 s");
    expect(text(results({ arrangement: "parallel" }), MODES.combine!)).toContain("in parallel: k_eff = 100.0 N/m · T = 0.444 s");
    expect(render(results({ arrangement: "series" }), MODES.combine!).texts()).toEqual(expect.arrayContaining(["k₁", "k₂"]));
  });
});

describe("energy", () => {
  it("shares ½kA² between KE and PE", () => {
    const words = text(results({}, 0), MODES.energy!);
    expect(words).toContain("KE 0.000 J + PE 0.250 J = 0.250 J");
    expect(render(results(), MODES.energy!).texts()).toEqual(expect.arrayContaining(["KE", "PE", "E", "−A", "+A"]));
  });
});

describe("damped and driven", () => {
  it("says how quickly a damped swing dies away, and draws its envelope", () => {
    expect(text(results({ damping: 0.2 }), MODES.damped!)).toContain("amplitude halves every 3.47 s");
    expect(text(results({ damping: 0.2 }), MODES.damped!)).toContain("oil");
    expect(text(results({ damping: 0 }), MODES.damped!)).toContain("no damping: the amplitude stays 0.10 m");
  });

  it("finds resonance on the amplitude curve", () => {
    expect(text(results({ damping: 0.2, driveOmega: 10 }), MODES.driven!)).toContain("ω_d = 10.0 rad/s · A = 25.0 cm · resonance");
    expect(text(results({ damping: 0.2, driveOmega: 5 }), MODES.driven!)).not.toContain("resonance");
    expect(text(results({ damping: 0, driveOmega: 10 }), MODES.driven!)).toContain("no damping: A grows without limit");
    expect(text(results(), MODES.driven!)).toContain("ω₀");
  });
});

describe("pendulums", () => {
  it("compares the small-angle period with the true one", () => {
    expect(text(results(), MODES.pendulum!)).toContain("2π√(L/g) = 2.007 s · true T 2.011 s (+0.2%)");
    expect(text(results({ swing: 60 * DEG }), MODES.pendulum!)).toContain("true T 2.154 s (+7.3%)");
  });

  it("draws a small-angle ghost only when it would differ", () => {
    const dashedRings = (r: ReturnType<typeof results>) => render(r, MODES.pendulum!).of("arc").filter((c) => c.args[2] === 7).length;
    expect(dashedRings(results({ swing: 10 * DEG }, 1))).toBe(0);
    expect(dashedRings(results({ swing: 60 * DEG }, 1))).toBe(1);
  });

  it("plots T² against L and works out g", () => {
    expect(text(results(), MODES.experiment!)).toContain("T = 2.011 s · g = 4π²L/T² = 9.76 m/s²");
    expect(text(results(), MODES.experiment!)).toContain("T² / s², against L / m");
  });

  it("twists a disc and swings a rod", () => {
    expect(text(results({ kappa: 0.04 }), MODES.angular!)).toContain("T = 2π√(I/κ) = 3.14 s");
    expect(text(results({ body: "rod" }), MODES.angular!)).toContain("rod T = 1.64 s · pendulum T = 2.01 s");
  });
});

describe("on a phone", () => {
  const W = 325;
  const layout = computeShmLayout(W);
  const states = [
    results({}, 0),
    results({ amplitude: 0.2, phase: Math.PI }, 0.4),
    results({ amplitude: 0.2, arrangement: "series", k: 5, k2: 5, mass: 4 }, 3),
    results({ amplitude: 0.2, arrangement: "parallel", damping: 1, mass: 0.1 }, 1.3),
    results({ damping: 0, driveOmega: 10, force: 2 }, 2.2),
    results({ swing: 80 * DEG, length: 2.5, body: "rod" }, 0),
    results({ swing: 80 * DEG, length: 2.5, body: "rod" }, 1.1),
    results({ swing: 80 * DEG, length: 0.1, g: 1.6 }, 7.7),
    results({ swing: 80 * DEG, kappa: 0.02, inertia: 0.05 }, 4),
  ];

  it("keeps every shape and word on the canvas", () => {
    for (const [mode, layers] of Object.entries(MODES)) {
      for (const [i, r] of states.entries()) {
        const rec = render(r, layers, W);
        for (const call of rec.calls) {
          const [x, y] = call.args as number[];
          if (["moveTo", "lineTo", "fillRect", "fillText", "ellipse"].includes(call.method)) {
            const px = call.method === "fillText" ? (call.args[1] as number) : x!;
            const py = call.method === "fillText" ? (call.args[2] as number) : y!;
            expect(px, `${mode} #${i} ${call.method}`).toBeGreaterThanOrEqual(0);
            expect(px, `${mode} #${i} ${call.method}`).toBeLessThanOrEqual(W);
            expect(py, `${mode} #${i} ${call.method}`).toBeGreaterThanOrEqual(0);
            expect(py, `${mode} #${i} ${call.method}`).toBeLessThanOrEqual(layout.height);
          }
          if (call.method === "arc") {
            const r0 = call.args[2] as number;
            expect(x! - r0, `${mode} #${i} arc`).toBeGreaterThanOrEqual(0);
            expect(x! + r0, `${mode} #${i} arc`).toBeLessThanOrEqual(W);
          }
        }
      }
    }
  });

  it("keeps captions short enough to fit", () => {
    for (const layers of Object.values(MODES)) {
      for (const r of states) {
        const rec = render(r, layers, W);
        for (const call of rec.of("fillText")) {
          const [words, x, y] = call.args as [string, number, number];
          if (y === layout.height - 12) {
            expect(words.length, words).toBeLessThanOrEqual(52);
            expect(x - (words.length * 6) / 2).toBeGreaterThanOrEqual(0);
          }
        }
      }
    }
  });
});
