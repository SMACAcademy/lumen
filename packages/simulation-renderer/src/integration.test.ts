import { integrationModel, type IntegrationParams, type IntegrationState } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { computeIntegrationLayout, integrationRenderer } from "./integration/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base: IntegrationState = { upper: 1, strips: 4, probe: 0.5, sweep: 1, fracUpper: 1 };
const results = (params: Partial<IntegrationParams> = {}, state: Partial<IntegrationState> = {}) =>
  integrationModel.derive({ ...base, ...state }, { ...integrationModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  integrationRenderer.draw(rec.ctx, computeIntegrationLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "rad", graphs: [] });
  return rec;
};
const joined = (rec: ReturnType<typeof render>) => rec.texts().join(" | ");

describe("the substitution view", () => {
  it("draws each strip twice, once on each axis, and names both integrands", () => {
    const rec = render(results({ substitution: "exp-square" }, { strips: 4 }), ["substitution"]);
    expect(rec.of("fillRect")).toHaveLength(8);
    expect(rec.texts()).toEqual(expect.arrayContaining(["∫ 2x·e^(x²) dx", "in x: y = 2x·e^(x²)", "in u, with u = x²: y = eᵘ"]));
  });

  it("makes each strip g′ times as wide on the u-axis, and g′ times as low", () => {
    // u = 2x stretches every strip by exactly 2, and the two planes share one scale.
    const rec = render(results({ substitution: "double" }, { strips: 2, upper: 1.6 }), ["substitution"]);
    const rects = rec.of("fillRect").map((c) => c.args as [number, number, number, number]);
    // Strips are drawn in pairs: the x strip, then its image on the u-axis.
    const onX = rects[0]!;
    const onU = rects[1]!;
    expect(onU[2]).toBeCloseTo(2 * onX[2], 6);
    expect(onU[3]).toBeCloseTo(onX[3] / 2, 6);
  });

  it("gives the sums, the exact value and the stretch only with the words", () => {
    const shown = joined(render(results({ substitution: "exp-square" }, { strips: 32, probe: 0.75 }), ["substitution", "labels"]));
    expect(shown).toContain("x strips 1.718 · u strips 1.718 · exact 1.718");
    expect(shown).toContain("u from 0.00 to 1.00 · picked strip stretched ×1.50");
    const log = joined(render(results({ substitution: "log" }, { strips: 4 }), ["substitution", "labels"]));
    expect(log).toContain("exact 0.347");
    expect(log).toContain("u from 1.00 to 2.00");
    const hidden = joined(render(results({ substitution: "sin-cos" }, { upper: 1.6 }), ["substitution"]));
    expect(hidden).not.toMatch(/exact|0\.500|strips/);
  });
});

describe("the parts view", () => {
  it("fills the two regions and outlines the rectangle", () => {
    const rec = render(results({ pair: "x-exp" }, { sweep: 1 }), ["parts"]);
    expect(rec.of("fill").length).toBeGreaterThanOrEqual(3);
    expect(rec.of("strokeRect")).toHaveLength(1);
    expect(rec.texts()).toEqual(expect.arrayContaining(["∫₀¹ x eˣ dx: u = x, dv = eˣ dx", "∫v du below", "∫u dv to the left"]));
  });

  it("splits [uv] into the two integrals, with the words", () => {
    const shown = joined(render(results({ pair: "x-exp" }, { sweep: 1 }), ["parts", "labels"]));
    expect(shown).toContain("[uv] 2.718 = ∫u dv 1.000 + ∫v du 1.718");
    expect(shown).toContain("so ∫u dv = [uv] − ∫v du = 1.000");
    expect(joined(render(results({ pair: "x-cos" }, { sweep: 1 }), ["parts", "labels"]))).toContain("∫u dv 0.571 + ∫v du 1.000");
    expect(joined(render(results({ pair: "log" }, { sweep: 1 }), ["parts"]))).not.toMatch(/1\.000|2\.718/);
  });

  it("draws no regions before the curve has started", () => {
    expect(render(results({ pair: "x-exp" }, { sweep: 0 }), ["parts"]).of("strokeRect")).toHaveLength(0);
  });
});

describe("the partial-fractions view", () => {
  it("shows the whole and its two pieces, and gives the split only with the words", () => {
    const shown = joined(render(results({ fraction: "one-two" }, { fracUpper: 1 }), ["fractions", "labels"]));
    expect(shown).toContain("split: y = 1/(x + 1) − 1/(x + 2)");
    expect(shown).toContain("area 0.288 = 0.693 + (−0.405)");
    expect(shown).toContain("A = 1.0, B = −1.0");
    const hidden = joined(render(results({ fraction: "one-two" }, { fracUpper: 1 }), ["fractions"]));
    expect(hidden).toContain("split into two simple fractions");
    expect(hidden).not.toMatch(/0\.288|B =|− 1\/\(x \+ 2\)/);
  });
});

describe("on a phone", () => {
  it("keeps every word and every strip inside a 325 px canvas", () => {
    const layout = computeIntegrationLayout(325);
    expect(layout.height).toBeGreaterThanOrEqual(330);
    expect(layout.height).toBeLessThanOrEqual(420);
    const cases: [Partial<IntegrationParams>, Partial<IntegrationState>, string][] = [
      ...(["double", "exp-square", "sin-cos", "log"] as const).map((substitution) => [{ substitution }, { upper: 1.6, strips: 64, probe: 1.6 }, "substitution"] as [Partial<IntegrationParams>, Partial<IntegrationState>, string]),
      ...(["x-exp", "x-cos", "log", "x-log"] as const).map((pair) => [{ pair }, { sweep: 1 }, "parts"] as [Partial<IntegrationParams>, Partial<IntegrationState>, string]),
      ...(["one-two", "one-three", "with-x"] as const).map((fraction) => [{ fraction }, { fracUpper: 4 }, "fractions"] as [Partial<IntegrationParams>, Partial<IntegrationState>, string]),
    ];
    for (const [params, state, layer] of cases) {
      const rec = render(results(params, state), [layer, "labels"], 325);
      for (const call of rec.of("fillText")) {
        const [text, x, y] = call.args as [string, number, number];
        const w = text.length * 6;
        // Titles and captions are centred on the canvas; the rest are left-aligned headers and
        // tick labels, or right-aligned at the plot's right edge.
        const fits = x === 325 / 2 ? x - w / 2 >= 0 && x + w / 2 <= 325 : (x >= 0 && x + w <= 325) || (x - w >= 0 && x <= 325);
        expect(fits, `${layer} "${text}" at ${x}`).toBe(true);
        expect(text.length, text).toBeLessThanOrEqual(55);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(layout.height);
      }
      for (const call of rec.of("fillRect")) {
        const [x, y, w, h] = call.args as [number, number, number, number];
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x + w).toBeLessThanOrEqual(325 + 1e-9);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y + h).toBeLessThanOrEqual(layout.height);
      }
    }
  });
});
