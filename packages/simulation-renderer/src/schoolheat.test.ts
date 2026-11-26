import { SCHOOLHEAT_MATERIAL_ORDER, SCHOOLHEAT_SCENES, schoolHeatModel, type SchoolHeatParams, type SchoolHeatState } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeSchoolHeatLayout, schoolHeatClock, schoolHeatDegrees, schoolHeatRenderer } from "./schoolheat/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const ALL = ["scene", "flow", "labels"];
const S0 = schoolHeatModel.initialize(schoolHeatModel.defaultParams);
const results = (over: Partial<SchoolHeatParams> = {}, state: Partial<SchoolHeatState> = {}) =>
  schoolHeatModel.derive({ ...S0, ...state }, { ...schoolHeatModel.defaultParams, ...over });

/** Draws, also noting each text's alignment so its extent can be checked. */
const render = (r = results(), width = 800, layers = ALL) => {
  const rec = recordingContext();
  const placed: { text: string; x: number; y: number; align: string }[] = [];
  const fillText = rec.ctx.fillText.bind(rec.ctx);
  (rec.ctx as unknown as Record<string, unknown>).fillText = (text: string, x: number, y: number) => {
    placed.push({ text, x, y, align: String(rec.ctx.textAlign ?? "left") });
    fillText(text, x, y);
  };
  const layout = computeSchoolHeatLayout(width);
  schoolHeatRenderer.draw(rec.ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { rec, placed, layout, text: placed.map((p) => p.text).join(" | ") };
};

describe("what the school heat renderer draws", () => {
  it("says what each hand feels in the middle bowl", () => {
    const { text } = render(results({ scene: "touch", leftHand: 45, rightHand: 10 }, { bowlTemp: 27 }));
    expect(text).toContain("Left hand feels cold");
    expect(text).toContain("Right hand feels warm");
    expect(text).toContain("27 °C");
    expect(text).toContain("Same water, but the hands disagree");
  });

  it("reads a clinical thermometer, and hides the reading without labels", () => {
    const r = results({ scene: "thermometer", thermometer: "clinical" }, { temperature: 38.4 });
    const { text } = render(r);
    expect(text).toContain("Reading 38.4 °C");
    expect(text).toContain("Each small mark = 0.1 °C");
    expect(text).toContain("Above normal body temperature, 37 °C");
    // The magnified scale numbers whole degrees around the end of the mercury.
    expect(text).toContain("38");
    const bare = render(r, 800, ["scene", "flow"]).text;
    expect(bare).not.toContain("38.4");
    expect(bare).not.toContain("0.1 °C");
  });

  it("says the kink holds a clinical reading, and a laboratory one falls back", () => {
    expect(render(results({ scene: "thermometer", thermometer: "clinical", takenOut: 1 }, { temperature: 38.4 })).text).toContain("The kink holds the reading");
    const lab = render(results({ scene: "thermometer", thermometer: "laboratory", takenOut: 1 }, { temperature: 70 })).text;
    expect(lab).toContain("Reading 25 °C");
    expect(lab).toContain("Laboratory thermometer (taken out)");
  });

  it("warns when the temperature is off the scale", () => {
    expect(render(results({ scene: "thermometer", thermometer: "clinical" }, { temperature: 100 })).text).toContain("Off the scale!");
  });

  it("drops pins along the rod and counts them", () => {
    const { text, rec } = render(results({ scene: "conduction", material: "steel" }, { heatTime: 10 }));
    expect(text).toContain("Stainless steel rod in a flame");
    expect(text).toContain("Pins fallen: 3 of 5");
    expect(text).toContain("A metal: a good conductor of heat");
    // Two pins still hang on wax blobs (radius 4); three lie on the table.
    expect(rec.of("arc").filter((c) => c.args[2] === 4)).toHaveLength(2);
    expect(render(results({ scene: "conduction", material: "wood" }, { heatTime: 10 })).text).toContain("A poor conductor (an insulator)");
  });

  it("shows convection, the cans in the sun, and the breezes", () => {
    expect(render(results({ scene: "convection" }, { heatTime: 2 })).text).toContain("Water 40 °C");
    const sun = render(results({ scene: "radiation" }, { sunTime: 60 })).text;
    expect(sun).toContain("42.1 °C");
    expect(sun).toContain("28.8 °C");
    const day = render(results({ scene: "breeze" }, { hour: 14 })).text;
    expect(day).toContain("At the seaside, 2:00 pm");
    expect(day).toContain("Land 36 °C");
    expect(day).toContain("Sea 29 °C");
    expect(day).toContain("Sea breeze: cool air comes in from the sea");
    expect(render(results({ scene: "breeze" }, { hour: 2 })).text).toContain("Land breeze: air flows from land to sea");
    expect(render(results({ scene: "breeze" }, { hour: 2 }), 800, ["scene"]).text).not.toContain("20 °C");
  });

  it("formats clock times and temperatures", () => {
    expect([schoolHeatClock(0), schoolHeatClock(9.5), schoolHeatClock(12), schoolHeatClock(23.999), schoolHeatClock(24)]).toEqual([
      "12:00 am",
      "9:30 am",
      "12:00 pm",
      "12:00 am",
      "12:00 am",
    ]);
    expect(schoolHeatDegrees(36)).toBe("36 °C");
    expect(schoolHeatDegrees(-4.04)).toBe("−4 °C");
    expect(schoolHeatDegrees(42.104)).toBe("42.1 °C");
  });
});

describe("on a 325 px phone", () => {
  const width = 325;
  const cases: [string, Partial<SchoolHeatParams>, Partial<SchoolHeatState>][] = [
    ["touch", { scene: "touch" }, { bowlTemp: 50 }],
    ["clinical", { scene: "thermometer", thermometer: "clinical" }, { temperature: 41.9 }],
    ["laboratory", { scene: "thermometer", thermometer: "laboratory", takenOut: 1 }, { temperature: -15 }],
    ...SCHOOLHEAT_MATERIAL_ORDER.map((material) => [material, { scene: "conduction", material }, { heatTime: 10 }] as [string, Partial<SchoolHeatParams>, Partial<SchoolHeatState>]),
    ["convection", { scene: "convection" }, { heatTime: 1 }],
    ["radiation", { scene: "radiation" }, { sunTime: 60 }],
    ["sea breeze", { scene: "breeze" }, { hour: 14 }],
    ["land breeze", { scene: "breeze" }, { hour: 2 }],
    ["calm", { scene: "breeze" }, { hour: 8 }],
  ];

  it.each(cases)("keeps every word of %s on the canvas", (_name, over, state) => {
    const { placed, layout } = render(results(over, state), width);
    expect(layout.width).toBe(width);
    expect(layout.height).toBeGreaterThanOrEqual(330);
    expect(layout.height).toBeLessThanOrEqual(420);
    for (const p of placed) {
      // The test recorder measures 6 px a character.
      const w = p.text.length * 6;
      const left = p.align === "center" ? p.x - w / 2 : p.align === "right" ? p.x - w : p.x;
      expect(left, p.text).toBeGreaterThanOrEqual(0);
      expect(left + w, p.text).toBeLessThanOrEqual(width);
      expect(p.y, p.text).toBeGreaterThan(0);
      expect(p.y, p.text).toBeLessThan(layout.height);
      expect(p.text.length, p.text).toBeLessThanOrEqual(55);
    }
  });

  it("keeps every line and shape inside", () => {
    for (const scene of SCHOOLHEAT_SCENES) {
      const { rec, layout } = render(results({ scene }, { heatTime: 10, hour: 14, sunTime: 30 }), width);
      for (const call of [...rec.of("moveTo"), ...rec.of("lineTo"), ...rec.of("arc")]) {
        const [x, y] = call.args as number[];
        expect(x, `${scene} ${call.method}`).toBeGreaterThanOrEqual(0);
        expect(x, `${scene} ${call.method}`).toBeLessThanOrEqual(width);
        expect(y, `${scene} ${call.method}`).toBeGreaterThanOrEqual(0);
        expect(y, `${scene} ${call.method}`).toBeLessThanOrEqual(layout.height);
      }
      for (const call of rec.of("fillRect")) {
        const [x, , w] = call.args as number[];
        expect(x! + w!, `${scene} fillRect`).toBeLessThanOrEqual(width);
      }
    }
  });
});
