import { rollingModel, type RollingParams, type RollingState } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeRollingLayout, rollingInertiaText, rollingRenderer } from "./rolling/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const DEG = Math.PI / 180;
const base: RollingState = { offset: 0, t: 0, vcm: 2, omega: 4, phi: 0, x: 0 };
const results = (params: Partial<RollingParams> = {}, state: Partial<RollingState> = {}) =>
  rollingModel.derive({ ...base, ...state }, { ...rollingModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  rollingRenderer.draw(rec.ctx, computeRollingLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const text = (r: ReturnType<typeof results>, layers: string[], width = 800) => render(r, layers, width).texts().join(" | ");

/** Every text inside the canvas (6 px a character, as the recorder measures), and every circle's centre too. */
function expectInside(rec: ReturnType<typeof recordingContext>, width: number, height: number, what: string) {
  for (const call of rec.of("fillText")) {
    const [words, x, y] = call.args as [string, number, number];
    const w = words.length * 6;
    // The recorder does not keep textAlign, so allow for any of the three.
    const fitsLeft = x >= 0 && x + w <= width;
    const fitsCentre = x - w / 2 >= 0 && x + w / 2 <= width;
    const fitsRight = x - w >= 0 && x <= width;
    expect(fitsLeft || fitsCentre || fitsRight, `${what}: "${words}" at ${x}`).toBe(true);
    expect(y, `${what}: "${words}"`).toBeGreaterThanOrEqual(0);
    expect(y, `${what}: "${words}"`).toBeLessThanOrEqual(height);
  }
  for (const call of rec.of("arc")) {
    const [x, y] = call.args as [number, number];
    expect(x, `${what}: arc`).toBeGreaterThanOrEqual(0);
    expect(x, `${what}: arc`).toBeLessThanOrEqual(width);
    expect(y, `${what}: arc`).toBeGreaterThanOrEqual(0);
    expect(y, `${what}: arc`).toBeLessThanOrEqual(height);
  }
}

describe("the axes view", () => {
  it("splits I into I_cm and Md² with the words on", () => {
    const words = text(results({ shape: "disc", axis: "z", mass: 2, radius: 0.5 }, { offset: 0.5 }), ["inertia", "labels"]);
    expect(words).toContain("Disc, axis perpendicular to its plane");
    expect(words).toContain("d = 0.50 m");
    expect(words).toContain("I = 0.25 + 0.5 = 0.75 kg m²");
    expect(words).toContain("I_x + I_y = 0.125 + 0.125 = 0.25 = I_z");
  });

  it("says the perpendicular-axis theorem fails for a sphere", () => {
    expect(text(results({ shape: "sphere", mass: 2, radius: 0.5 }), ["inertia", "labels"])).toContain("Not flat: I_x + I_y = 0.4 ≠ I_z = 0.2");
  });

  it("hides every value of I without the words", () => {
    const words = text(results({ shape: "rod", mass: 2, radius: 1 }, { offset: 0.5 }), ["inertia"]);
    expect(words).not.toMatch(/I =|I_cm|0\.667/);
    expect(words).toContain("d = 0.50 m");
  });

  it("writes I to sensible figures", () => {
    expect([rollingInertiaText(2 / 3), rollingInertiaText(0.000417), rollingInertiaText(1.5), rollingInertiaText(0)]).toEqual(["0.667", "0.000417", "1.50", "0"]);
  });
});

describe("the race view", () => {
  it("draws four rollers and names the chosen one", () => {
    const rec = render(results({ roller: "disc" }, { t: 0.5 }), ["race", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["Ring", "Hollow", "Disc", "Solid", "Let go from 1.0 m up a 30° slope"]));
    expect(rec.texts().join(" ")).toContain("a = 3.27 m/s² · at the bottom 3.61 m/s");
    expect(rec.texts().join(" ")).toContain("moving 67% · turning 33% of the KE");
    expect(rec.texts().join(" ")).toContain("Disc rolls: friction 3.3 N, needs μ ≥ 0.19");
  });

  it("says when the chosen roller slips", () => {
    expect(text(results({ roller: "ring", mu: 0.1 }), ["race", "labels"])).toContain("Ring slips: μ 0.10 < 0.29 needed");
  });

  it("hides the speeds and energies without the words", () => {
    expect(text(results({ roller: "disc" }, { t: 5 }), ["race"])).not.toMatch(/bottom|KE|m\/s/);
  });

  it("puts the solid sphere furthest down the slope at any moment", () => {
    // Without the words, the only circles of the race's radius (8 px) are the rollers: ring, hollow, disc, solid in lane order.
    const rec = render(results({}, { t: 0.8 }), ["race"]);
    const xs = rec.of("arc").filter((c) => c.args[2] === 8).map((c) => c.args[0] as number);
    // Ring and hollow sphere are drawn once (outline), disc and solid sphere twice (fill and outline).
    const [ring, hollow, disc, solid] = [xs[0]!, xs[1]!, xs[2]!, xs[4]!];
    expect(xs).toHaveLength(6);
    expect(hollow).toBeGreaterThan(ring);
    expect(disc).toBeGreaterThan(hollow);
    expect(solid).toBeGreaterThan(disc);
  });
});

describe("the wheel view", () => {
  it("gives the top twice the centre's speed and the contact point none when it rolls", () => {
    const words = text(results({ radius: 0.5 }, { vcm: 2, omega: 4, phi: Math.PI / 2 }), ["wheel", "labels"]);
    expect(words).toContain("top 4.0 m/s");
    expect(words).toContain("v = 2.0 m/s");
    expect(words).toContain("marked point 2.83 m/s");
    expect(words).toContain("Rolling: v = ωR, the contact point is at rest");
  });

  it("shows the contact point sliding, and friction against it", () => {
    const words = text(results({ radius: 0.5 }, { vcm: 2, omega: 0 }), ["wheel", "labels"]);
    expect(words).toContain("Contact point slides at 2.00 m/s");
    expect(words).toContain("f");
  });

  it("hides the speeds without the words", () => {
    expect(text(results({ radius: 0.5 }, { vcm: 2, omega: 4 }), ["wheel"])).not.toMatch(/m\/s/);
  });
});

describe("the balance view", () => {
  it("balances the see-saw at m₁x₁ = m₂x₂", () => {
    const words = text(results({ scene: "seesaw", m1: 30, x1: 2, m2: 40, x2: 1.5 }), ["balance", "labels"]);
    expect(words).toContain("Balanced: m₁x₁ = m₂x₂, Στ = 0");
    expect(words).toContain("left 588 N m · right 588 N m");
    expect(words).toContain("784 N");
    expect(text(results({ scene: "seesaw", m1: 30, x1: 2, m2: 40, x2: 1 }), ["balance", "labels"])).toContain("the left end goes down");
  });

  it("solves the ladder, and hides the forces without the words", () => {
    const words = text(results({ scene: "ladder", foot: 1, mu: 0.4 }), ["balance", "labels"]);
    expect(words).toContain("F₁ = 34.6 N · N = 196 N");
    expect(words).toContain("floor's total push 199 N");
    expect(words).toContain("Needs μ ≥ 0.18, floor has 0.40: it stands");
    expect(text(results({ scene: "ladder", foot: 2, mu: 0.2 }), ["balance", "labels"])).toContain("it slips");
    expect(text(results({ scene: "ladder", foot: 1 }), ["balance"])).not.toContain("34.6");
  });

  it("gives a couple its torque", () => {
    expect(text(results({ scene: "couple", force: 20, x1: 1, x2: 1 }), ["balance", "labels"])).toContain("τ = F × 2.0 m = 40 N m: it turns");
  });
});

describe("on a phone", () => {
  it("keeps every word and every circle on a 325 px canvas", () => {
    const width = 325;
    const { height } = computeRollingLayout(width);
    const cases: [string, Partial<RollingParams>, Partial<RollingState>, string][] = [
      ["rod at its end", { shape: "rod", radius: 1 }, { offset: 1 }, "inertia"],
      ["small disc far axis", { shape: "disc", radius: 0.1 }, { offset: 1 }, "inertia"],
      ["sphere", { shape: "sphere", radius: 1 }, { offset: 0 }, "inertia"],
      ["ring in plane", { shape: "ring", axis: "y", radius: 0.5 }, { offset: 0.5 }, "inertia"],
      ["shallow race start", { angle: 5 * DEG, height: 3, roller: "hollow", mu: 0 }, { t: 0 }, "race"],
      ["steep race end", { angle: 60 * DEG, height: 0.2, roller: "ring", mu: 0.05 }, { t: 15 }, "race"],
      ["wheel fast", { radius: 0.1 }, { vcm: 6, omega: 30, phi: 1, x: 7 }, "wheel"],
      ["wheel backspin", { radius: 1 }, { vcm: 0, omega: -20, phi: 4, x: 999 }, "wheel"],
      ["heavy see-saw", { scene: "seesaw", m1: 60, x1: 2, m2: 1, x2: 2 }, {}, "balance"],
      ["ladder far out", { scene: "ladder", foot: 2.5, mu: 0 }, {}, "balance"],
      ["ladder close in", { scene: "ladder", foot: 0.5, mu: 1 }, {}, "balance"],
      ["big couple", { scene: "couple", force: 100, x1: 2, x2: 2 }, {}, "balance"],
    ];
    for (const [what, params, state, layer] of cases) {
      const rec = render(results(params, state), [layer, "labels"], width);
      expectInside(rec, width, height, what);
      for (const words of rec.texts()) expect(words.length, `${what}: "${words}"`).toBeLessThanOrEqual(50);
    }
  });
});
