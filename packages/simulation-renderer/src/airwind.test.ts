import { AIRWIND_SCENES, airWindModel, type AirWindParams, type AirWindState } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { airWindNumber, airWindRenderer, airWindWhole, computeAirWindLayout } from "./airwind/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const ALL = ["scene", "arrows", "labels"];
const S0 = airWindModel.initialize(airWindModel.defaultParams);
const results = (over: Partial<AirWindParams> = {}, state: Partial<AirWindState> = {}) =>
  airWindModel.derive({ ...S0, ...state }, { ...airWindModel.defaultParams, ...over });

/** Draws, also noting each text's alignment so its extent can be checked. */
const render = (r = results(), width = 800, layers = ALL) => {
  const rec = recordingContext();
  const placed: { text: string; x: number; y: number; align: string }[] = [];
  const fillText = rec.ctx.fillText.bind(rec.ctx);
  (rec.ctx as unknown as Record<string, unknown>).fillText = (text: string, x: number, y: number) => {
    placed.push({ text, x, y, align: String(rec.ctx.textAlign ?? "left") });
    fillText(text, x, y);
  };
  const layout = computeAirWindLayout(width);
  airWindRenderer.draw(rec.ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { rec, placed, layout, text: placed.map((p) => p.text).join(" | ") };
};

describe("what the air and wind renderer draws", () => {
  it("crushes the can once enough air is out, with the pressures on the labels layer", () => {
    const half = render(results({ scene: "can" }, { airInside: 50 })).text;
    expect(half).toContain("Air left: 50 %");
    expect(half).toContain("Crushed!");
    expect(half).toContain("Outside 101.3 kPa");
    expect(half).toContain("Inside 50.7 kPa");
    expect(half).toContain("The outside wins by 50.7 kPa: crushed");
    const full = render(results({ scene: "can" }, { airInside: 100 })).text;
    expect(full).not.toContain("Crushed!");
    expect(full).toContain("Same push inside and out: nothing happens");
    expect(render(results({ scene: "can" }, { airInside: 90 })).text).toContain("Outside wins by 10.1 kPa: not enough yet");
  });

  it("draws the air pressing in from all four sides", () => {
    const { rec } = render(results({ scene: "can" }, { airInside: 0 }), 800, ["arrows"]);
    // Eight arrows from outside, none from inside (no air left), each with a filled head.
    expect(rec.of("fill")).toHaveLength(8);
  });

  it("gives the push on a patch in tonnes only with labels", () => {
    const r = results({ scene: "patch" }, { area: 1 });
    const { text } = render(r);
    expect(text).toContain("The air pressing on 1 m²");
    expect(text).toContain("Push 101.3 kN");
    expect(text).toContain("= weight of 10 339 kg");
    expect(text).toContain("About 10.3 tonnes pressing down");
    const bare = render(r, 800, ["scene", "arrows"]).text;
    expect(bare).not.toContain("10.3");
    expect(bare).not.toContain("10 339");
  });

  it("lifts the warm bag on the balance", () => {
    const { text } = render(results({ scene: "bag" }, { bagTemp: 60 }));
    expect(text).toContain("Air in the bag 60 °C, room 25 °C");
    expect(text).toContain("Bag 1.06 kg/m³");
    expect(text).toContain("Room 1.18 kg/m³");
    expect(text).toContain("Warm air is lighter: the bag goes up (2.5 g)");
    expect(render(results({ scene: "bag" }, { bagTemp: 0 })).text).toContain("Cold air is heavier: the bag goes down (2.2 g)");
    expect(render(results({ scene: "bag" }, { bagTemp: 25 })).text).toContain("Same air in both bags: the beam stays level");
  });

  it("moves the balloons together and lifts the strip and the roof, hiding the pressure drop without labels", () => {
    const balloons = render(results({ scene: "blow", setup: "balloons" }, { windSpeed: 36 })).text;
    expect(balloons).toContain("They move together!");
    expect(balloons).toContain("Pressure between them is 60 Pa lower");
    const strip = results({ scene: "blow", setup: "strip" }, { windSpeed: 72 });
    expect(render(strip).text).toContain("Pressure above the strip is 240 Pa lower");
    expect(render(strip, 800, ["scene", "arrows"]).text).not.toContain("240");
    expect(render(results({ scene: "blow", setup: "roof" }, { windSpeed: 79 })).text).not.toContain("The roof lifts off!");
    const roof = render(results({ scene: "blow", setup: "roof" }, { windSpeed: 80 })).text;
    expect(roof).toContain("The roof lifts off!");
    expect(roof).toContain("Push up 5 926 N");
    expect(render(results({ scene: "blow" }, { windSpeed: 0 })).text).toContain("No moving air, no pressure drop");
  });

  it("brings the monsoon rain in summer and a dry wind in winter", () => {
    const summer = render(results({ scene: "wind", map: "monsoon" }, { landLead: 10 }));
    expect(summer.text).toContain("Summer: the land is hotter than the sea");
    expect(summer.text).toContain("Land 100.3 kPa");
    expect(summer.text).toContain("Sea 101.3 kPa");
    expect(summer.text).toContain("Wind from the sea brings the monsoon rain");
    // The rain: five streaks under the cloud.
    const winter = render(results({ scene: "wind", map: "monsoon" }, { landLead: -8 })).text;
    expect(winter).toContain("Winter: the land is cooler than the sea");
    expect(winter).toContain("Land 101.3 kPa");
    expect(winter).toContain("Sea 100.5 kPa");
    expect(winter).toContain("A dry wind blows from the land out to sea");
  });

  it("sends the wind towards the warm equator", () => {
    const { text } = render(results({ scene: "wind", map: "earth" }, { equatorLead: 30 }));
    expect(text).toContain("Equator 98.3 kPa");
    expect(text).toContain("Poles 101.3 kPa");
    expect(text).toContain("Air flows in towards the low pressure at the equator");
    expect(render(results({ scene: "wind", map: "earth" }, { equatorLead: 0 })).text).toContain("Evenly heated: no wind");
  });

  it("shows the calm eye and the fierce eye wall, with the wind speed only on labels", () => {
    const eye = render(results({ scene: "cyclone" }, { centralDrop: 5, distance: 0 })).text;
    expect(eye).toContain("Inside a cyclone: centre 5 kPa lower");
    expect(eye).toContain("The eye: calm, clear, lowest pressure");
    expect(eye).toContain("Pressure 96.3 kPa");
    const wall = results({ scene: "cyclone" }, { centralDrop: 5, distance: 15 });
    expect(render(wall).text).toContain("Wind here 219 km/h");
    expect(render(wall).text).toContain("In the storm clouds: fierce wind and rain");
    expect(render(wall, 800, ["scene", "arrows"]).text).not.toContain("219");
    expect(render(results({ scene: "cyclone" }, { distance: 300 })).text).toContain("Outside the storm");
  });

  it("tracks the cyclone and says which warning is out", () => {
    const alert = render(results({ scene: "track" }, { coastDistance: 600, stormSpeed: 15 })).text;
    expect(alert).toContain("600 km from the coast");
    expect(alert).toContain("Cyclone alert (watch)");
    expect(alert).toContain("40 hours before it reaches the coast");
    expect(alert).toContain("24 h");
    expect(alert).toContain("48 h");
    expect(render(results({ scene: "track" }, { coastDistance: 360, stormSpeed: 15 })).text).toContain("Cyclone warning");
    expect(render(results({ scene: "track" }, { coastDistance: 900, stormSpeed: 15 })).text).toContain("No alert yet");
    expect(render(results({ scene: "track" }, { coastDistance: 0 })).text).toContain("It has reached the coast");
  });

  it("formats numbers plainly", () => {
    expect([airWindNumber(101.325), airWindNumber(1, 2), airWindNumber(0.01, 2), airWindNumber(1.0598, 2), airWindNumber(-2.17, 1)]).toEqual(["101.3", "1", "0.01", "1.06", "−2.2"]);
    expect([airWindWhole(10339.29), airWindWhole(5925.9), airWindWhole(60), airWindWhole(101325)]).toEqual(["10 339", "5 926", "60", "101 325"]);
  });
});

describe("on a 325 px phone", () => {
  const width = 325;
  type Case = [string, Partial<AirWindParams>, Partial<AirWindState>];
  const cases: Case[] = [
    ["full can", { scene: "can" }, { airInside: 100 }],
    ["crushed can", { scene: "can" }, { airInside: 0 }],
    ["small patch", { scene: "patch" }, { area: 0.01 }],
    ["big patch", { scene: "patch" }, { area: 25 }],
    ["warm bag", { scene: "bag" }, { bagTemp: 100 }],
    ["cold bag", { scene: "bag" }, { bagTemp: 0 }],
    ["balloons", { scene: "blow", setup: "balloons" }, { windSpeed: 200 }],
    ["strip", { scene: "blow", setup: "strip" }, { windSpeed: 200 }],
    ["roof", { scene: "blow", setup: "roof" }, { windSpeed: 200 }],
    ["still roof", { scene: "blow", setup: "roof" }, { windSpeed: 0 }],
    ["summer", { scene: "wind", map: "monsoon" }, { landLead: 15 }],
    ["winter", { scene: "wind", map: "monsoon" }, { landLead: -15 }],
    ["earth", { scene: "wind", map: "earth" }, { equatorLead: 60 }],
    ["eye", { scene: "cyclone" }, { distance: 0, centralDrop: 7 }],
    ["far out", { scene: "cyclone" }, { distance: 300, centralDrop: 0.5 }],
    ["far at sea", { scene: "track" }, { coastDistance: 1000, stormSpeed: 5 }],
    ["at the coast", { scene: "track" }, { coastDistance: 0, stormSpeed: 30 }],
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

  it.each(cases)("keeps every line and shape of %s inside", (_name, over, state) => {
    const { rec, layout } = render(results(over, state), width);
    for (const call of [...rec.of("moveTo"), ...rec.of("lineTo"), ...rec.of("arc"), ...rec.of("quadraticCurveTo")]) {
      const args = call.args as number[];
      for (let k = 0; k + 1 < (call.method === "arc" ? 2 : args.length); k += 2) {
        expect(args[k], `${call.method}`).toBeGreaterThanOrEqual(0);
        expect(args[k], `${call.method}`).toBeLessThanOrEqual(width);
        expect(args[k + 1], `${call.method}`).toBeGreaterThanOrEqual(0);
        expect(args[k + 1], `${call.method}`).toBeLessThanOrEqual(layout.height);
      }
    }
    for (const call of [...rec.of("fillRect"), ...rec.of("strokeRect")]) {
      const [x, y, w, h] = call.args as number[];
      expect(x!, "rect").toBeGreaterThanOrEqual(0);
      expect(x! + w!, "rect").toBeLessThanOrEqual(width);
      expect(y!, "rect").toBeGreaterThanOrEqual(0);
      expect(y! + h!, "rect").toBeLessThanOrEqual(layout.height);
    }
  });

  it("draws every scene without throwing", () => {
    for (const scene of AIRWIND_SCENES) expect(() => render(results({ scene }), width)).not.toThrow();
  });
});
