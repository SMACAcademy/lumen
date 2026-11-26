import { flowModel, type FlowParams, type FlowState } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeFlowLayout, flowRenderer, flowSig } from "./flow/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base: FlowState = { stroke: 0, t: 0, clock: 0 };
const results = (params: Partial<FlowParams> = {}, state: Partial<FlowState> = {}) =>
  flowModel.derive({ ...base, ...state }, { ...flowModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  flowRenderer.draw(rec.ctx, computeFlowLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const words = (r: ReturnType<typeof results>, layers: string[], width = 800) => render(r, layers, width).texts().join(" | ");

describe("the lift", () => {
  it("names the forces and says whether the car goes up", () => {
    const yes = words(results({ effort: 100, smallArea: 10, largeArea: 1000 }, { stroke: 20 }), ["lift", "labels"]);
    expect(yes).toContain("F₁ = 100 N");
    expect(yes).toContain("F₂ = 10000 N, enough to lift the car");
    expect(yes).toContain("P = 100.0 kPa · pushed 20.0 cm, car up 0.20 cm");
    expect(words(results({ effort: 100, smallArea: 10, largeArea: 500 }), ["lift", "labels"])).toContain("F₂ = 5000 N, less than the car's 9800 N");
  });

  it("hides the output force without the words", () => {
    expect(words(results(), ["lift"])).not.toContain("F₂");
  });
});

describe("the venturi tube", () => {
  it("gives both speeds and the pressure drop only with the words", () => {
    const shown = words(results({ inletSpeed: 0.4, throatArea: 2 }), ["pipe", "streamlines", "labels"]);
    expect(shown).toContain("v₂ = 1.20 m/s");
    expect(shown).toContain("faster in the throat, so 640 Pa lower pressure");
    expect(shown).toContain("50.0 cm");
    const hidden = words(results({ inletSpeed: 0.4, throatArea: 2 }), ["pipe", "streamlines"]);
    expect(hidden).not.toMatch(/v₂|Pa|cm |m\/s/);
    expect(hidden).toContain("A₂ = 2.0 cm²");
  });

  it("stands the throat's water lower than the wide part's", () => {
    const rec = render(results({ inletSpeed: 1, throatArea: 2 }), ["pipe"]);
    const tubes = rec.of("fillText").filter((c) => c.args[0] === "h₁" || c.args[0] === "h₂");
    const [h1, h2] = tubes.map((c) => c.args[2] as number);
    expect(h2!).toBeGreaterThan(h1!);
  });
});

describe("the tank", () => {
  it("hides the speed of efflux without the words", () => {
    expect(words(results({ holeDepth: 0.45 }), ["tank", "labels"])).toContain("v = √(2gh) = 2.97 m/s, lands 0.99 m away");
    expect(words(results({ holeDepth: 0.45 }), ["tank"])).not.toContain("m/s");
  });
});

describe("the dragged plate", () => {
  it("gives the force F = ηA dv/dx", () => {
    expect(words(results({ liquid: "glycerine", plateSpeed: 10, gap: 2 }), ["shear", "labels"])).toContain("dv/dx = 50 /s · F = ηA dv/dx = 7.50 N");
    expect(words(results({ liquid: "water", plateSpeed: 10, gap: 2 }), ["shear", "labels"])).toContain("F = ηA dv/dx = 0.00500 N");
  });
});

describe("the falling ball", () => {
  it("draws the speed rising to v_t, and names it only with the words", () => {
    const r = results({ liquid: "glycerine", ball: "steel", ballRadius: 1 }, { t: 2 });
    const shown = words(r, ["fall", "graph", "labels"]);
    expect(shown).toContain("Steel ball, r = 1.0 mm, in glycerine");
    expect(shown).toContain("v_t = 0.95 cm/s; 99% of it within 5.3 ms");
    expect(shown).toContain("now 0.95 cm/s, 1.9 cm down");
    const hidden = words(r, ["fall", "graph"]);
    expect(hidden).not.toMatch(/cm\/s|0\.95|within/);
    expect(hidden).toContain("v_t");
  });

  it("warns when Stokes' law does not apply", () => {
    expect(words(results({ liquid: "water", ballRadius: 1 }), ["fall", "labels"])).toContain("but Re ≈ 30000: too fast for Stokes' law");
  });
});

describe("the dye streak", () => {
  it("names the kind of flow", () => {
    expect(words(results({ liquid: "water", pipeSpeed: 0.05, pipeDiameter: 10 }), ["reynolds", "labels"])).toContain("Re = ρvd/η = 500: streamline");
    expect(words(results({ liquid: "water", pipeSpeed: 0.5, pipeDiameter: 10 }), ["reynolds", "labels"])).toContain("Re = ρvd/η = 5000: turbulent");
    expect(words(results({ liquid: "water", pipeSpeed: 0.15, pipeDiameter: 10 }), ["reynolds", "labels"])).toContain(": unsteady");
  });

  it("draws one smooth strand for streamline flow and several for turbulent", () => {
    const strands = (speed: number) => render(results({ liquid: "water", pipeSpeed: speed, pipeDiameter: 10 }), ["reynolds"]).of("stroke").length;
    expect(strands(0.5) - strands(0.05)).toBe(3);
  });
});

describe("drops and bubbles", () => {
  it("doubles the excess pressure for a bubble's two surfaces", () => {
    expect(words(results({ film: "water", shape: "drop", dropRadius: 1 }), ["drops", "labels"])).toContain("P inside − P outside = 2S/r = 145.4 Pa");
    expect(words(results({ film: "soap", shape: "bubble", dropRadius: 10 }), ["drops", "labels"])).toContain("4S/r = 10.0 Pa");
    expect(words(results({ film: "soap", shape: "bubble", dropRadius: 10 }), ["drops"])).not.toContain("Pa");
  });
});

describe("the capillary tube", () => {
  it("lifts water and pushes mercury down", () => {
    expect(words(results({ film: "water", tubeRadius: 0.5 }), ["capillary", "labels"])).toContain("rises 2.97 cm");
    expect(words(results({ film: "mercury", tubeRadius: 1 }), ["capillary", "labels"])).toContain("pushed down 0.53 cm");
    expect(words(results({ film: "mercury", tubeRadius: 1 }), ["capillary"])).not.toContain("cm");
  });
});

describe("on a phone", () => {
  const scenes: [string[], Partial<FlowParams>, Partial<FlowState>][] = [
    [["lift", "labels"], { smallArea: 50, largeArea: 100 }, { stroke: 20 }],
    [["lift", "labels"], { smallArea: 1, largeArea: 2000 }, { stroke: 0 }],
    [["pipe", "streamlines", "labels"], { inletSpeed: 1, throatArea: 2 }, {}],
    [["tank", "labels"], { holeDepth: 0.5 }, {}],
    [["tank", "labels"], { holeDepth: 0.95 }, {}],
    [["shear", "labels"], { gap: 10, plateSpeed: 50 }, {}],
    [["fall", "graph", "labels"], { liquid: "castorOil", ballRadius: 3 }, { t: 60 }],
    [["fall", "graph", "labels"], { liquid: "water", ballRadius: 3 }, { t: 0 }],
    [["reynolds", "labels"], { liquid: "castorOil", pipeDiameter: 40, pipeSpeed: 1 }, {}],
    [["drops", "labels"], { shape: "bubble", film: "mercury", dropRadius: 10 }, {}],
    [["capillary", "labels"], { film: "water", tubeRadius: 0.1 }, {}],
    [["capillary", "labels"], { film: "mercury", tubeRadius: 0.1 }, {}],
  ];

  it.each(scenes)("keeps %s inside 325 px", (layers, params, state) => {
    const layout = computeFlowLayout(325);
    const rec = render(results(params, state), layers, 325);
    for (const call of rec.of("fillText")) {
      const [text, x, y] = call.args as [string, number, number];
      expect(text.length, text).toBeLessThanOrEqual(55);
      expect(y, text).toBeGreaterThanOrEqual(6);
      expect(y, text).toBeLessThanOrEqual(layout.height - 6);
      expect(x, text).toBeGreaterThanOrEqual(0);
      expect(x, text).toBeLessThanOrEqual(325);
    }
    for (const call of [...rec.of("lineTo"), ...rec.of("moveTo")]) {
      const [x, y] = call.args as [number, number];
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(325);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(layout.height);
    }
  });

  it("keeps centred captions from running off either side", () => {
    const rec = render(results({ liquid: "water", ballRadius: 3 }), ["fall", "graph", "labels"], 325);
    for (const call of rec.of("fillText")) {
      const [text] = call.args as [string];
      expect(text.length * 6, text).toBeLessThanOrEqual(325);
    }
  });
});

describe("numbers", () => {
  it("writes small and large values with three figures", () => {
    expect([flowSig(7.5), flowSig(0.005), flowSig(29618, 2), flowSig(1.2e-5), flowSig(0)]).toEqual(["7.50", "0.00500", "30000", "1.20 × 10⁻⁵", "0"]);
  });
});
