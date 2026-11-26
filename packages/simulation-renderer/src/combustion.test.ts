import {
  COMBUST_AGENT_ORDER,
  COMBUST_CUP_ORDER,
  COMBUST_FIRE_ORDER,
  COMBUST_FUEL_ORDER,
  COMBUST_JAR_ORDER,
  COMBUST_MATERIAL_ORDER,
  COMBUST_PRODUCT_ORDER,
  combustionModel,
  type CombustParams,
  type CombustState,
} from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { combustionRenderer, combustThousands, computeCombustionLayout } from "./combustion/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const results = (params: Partial<CombustParams> = {}, state: Partial<CombustState> = {}) =>
  combustionModel.derive({ time: 0, ...state }, { ...combustionModel.defaultParams, ...params });

interface Placed {
  text: string;
  x: number;
  y: number;
  align: string;
  font: string;
}

/** Render, recording every text with the alignment and font it was drawn in. */
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  const placed: Placed[] = [];
  const target = rec.ctx as unknown as Record<string, unknown>;
  const ctx = new Proxy(target, {
    get(t, key: string) {
      if (key === "fillText") {
        return (text: string, x: number, y: number) => {
          placed.push({ text, x, y, align: String(t.textAlign ?? "left"), font: String(t.font ?? "") });
          (t.fillText as (...a: unknown[]) => void)(text, x, y);
        };
      }
      return t[key];
    },
    set(t, key: string, value) {
      t[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  const layout = computeCombustionLayout(width);
  combustionRenderer.draw(ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { rec, placed, layout, texts: rec.texts() };
};

const MODES: Record<string, string[]> = {
  burn: ["burn", "labels"],
  jar: ["jar", "labels"],
  cup: ["cup", "labels"],
  flame: ["flame", "labels"],
  fire: ["fire", "labels"],
  fuel: ["fuel", "labels"],
  products: ["products", "labels"],
};

/** Typical widths: 6.2 px a character for 12 px text, 7.2 for bold 13 px. */
const charWidth = (font: string) => (font.startsWith("600") ? 7.2 : 6.2);
function extent(p: Placed): [number, number] {
  const w = [...p.text].length * charWidth(p.font);
  if (p.align === "center") return [p.x - w / 2, p.x + w / 2];
  if (p.align === "right") return [p.x - w, p.x];
  return [p.x, p.x + w];
}

describe("what the combustion renderer draws", () => {
  it("shows the fire triangle and says which side is missing", () => {
    const cold = render(results({ material: "wood", temperature: 100 }), MODES.burn!);
    expect(cold.texts).toEqual(expect.arrayContaining(["Wood", "FUEL", "HEAT", "AIR", "Heated to 100 °C", "catches fire at 300 °C", "Too cold: it needs 300 °C"]));
    expect(render(results({ material: "wood", temperature: 300 }), MODES.burn!).texts).toContain("It burns: fuel, heat and air are all there");
    expect(render(results({ material: "wood", temperature: 400, oxygen: 12 }), MODES.burn!).texts).toContain("Too little oxygen: below 16 %");
    expect(render(results({ material: "stone" }), MODES.burn!).texts).toContain("Not a fuel: it cannot burn");
    expect(render(results({ material: "wood" }), ["burn"]).texts.join(" ")).not.toContain("300 °C");
  });

  it("puts the candle out when the jar's oxygen runs low", () => {
    const lit = render(results({ jar: "closed", jarVolume: 1 }, { time: 4 }), MODES.jar!);
    expect(lit.texts).toEqual(expect.arrayContaining(["Candle under a 1 L jar: 4 s", "19.0 %", "This jar keeps it alight for 10.0 s"]));
    expect(render(results({ jar: "closed", jarVolume: 1.5 }, { time: 20 }), MODES.jar!).texts).toContain("Out after 15.0 s: too little oxygen");
    expect(render(results({ jar: "open" }, { time: 20 }), MODES.jar!).texts).toContain("Fresh air keeps reaching the flame");
  });

  it("shows the paper's temperature only with labels", () => {
    const shown = render(results({ cup: "water" }, { time: 240 }), MODES.cup!);
    expect(shown.texts).toEqual(expect.arrayContaining(["100 °C", "230 °C", "Water boils at 100 °C: the paper stays cool"]));
    const hidden = render(results({ cup: "water" }, { time: 240 }), ["cup"]);
    expect(hidden.texts.join(" ")).not.toContain("°C");
    expect(render(results({ cup: "empty" }, { time: 12 }), MODES.cup!).texts).toContain("The paper reached 230 °C: it catches fire");
  });

  it("names the zone the probe is in", () => {
    expect(render(results({ probeX: 0, probeY: 5 }), MODES.flame!).texts).toEqual(
      expect.arrayContaining(["Probe: dark zone (innermost)", "no burning: unburnt wax vapour", "Wax vapour flows out of a glass tube"]),
    );
    expect(render(results({ probeX: 8, probeY: 22 }), MODES.flame!).texts).toEqual(expect.arrayContaining(["Probe: non-luminous zone (outer)", "A copper wire glows red hot"]));
    expect(render(results({ probeX: 0, probeY: 25 }), MODES.flame!).texts).toContain("Soot blackens a glass plate");
    expect(render(results({ probeX: 0, probeY: 25 }), MODES.flame!).rec.of("ellipse")).toHaveLength(3);
  });

  it("warns against water on an electrical fire", () => {
    const { texts } = render(results({ fire: "electrical", agent: "water" }), MODES.fire!);
    expect(texts).toEqual(expect.arrayContaining(["Electrical fire", "Water on this fire: never", "Never! Water conducts: you could get a shock", "Dangerous: the fire is not out"]));
    expect(render(results({ fire: "wood", agent: "water" }), MODES.fire!).texts).toEqual(expect.arrayContaining(["The fire is out", "It takes away the heat"]));
  });

  it("works out the heat only with labels", () => {
    const { texts } = render(results({ fuel: "petrol", mass: 2 }), MODES.fuel!);
    expect(texts).toEqual(expect.arrayContaining(["Cow dung cake", "Hydrogen", "Calorific value: 45 000 kJ/kg", "Heat = 2.0 × 45 000 = 90 000 kJ"]));
    expect(render(results({ fuel: "wood", mass: 2 }), MODES.fuel!).texts).toContain("Calorific value: 19 500 kJ/kg (middle)");
    const hidden = render(results({ fuel: "petrol", mass: 2 }), ["fuel"]);
    expect(hidden.texts.join(" ")).not.toContain("90 000");
    expect(hidden.texts.join(" ")).not.toContain("45 000");
    expect(combustThousands(150000)).toBe("150 000");
  });

  it("draws the refinery column and coal's products", () => {
    const tower = render(results({ product: "diesel" }), MODES.products!);
    expect(tower.texts).toEqual(expect.arrayContaining(["Refining petroleum", "LPG", "Bitumen", "Diesel", "Fuel for trucks, buses and generators"]));
    const coal = render(results({ product: "coal-tar" }), MODES.products!);
    expect(coal.texts).toEqual(expect.arrayContaining(["Coal heated without air", "Coke", "Coal tar", "Coal gas"]));
  });

  it("keeps every text and shape inside a 325 px phone canvas", () => {
    type Case = [Partial<CombustParams>, Partial<CombustState>, string[]];
    const cases: Case[] = [
      ...COMBUST_MATERIAL_ORDER.flatMap((material) => [20, 250, 500].map((temperature) => [{ material, temperature, oxygen: temperature === 250 ? 10 : 21 }, {}, MODES.burn!] as Case)),
      ...COMBUST_JAR_ORDER.flatMap((jar) => [0.25, 1, 1.75, 2].flatMap((jarVolume) => [0, 8, 300].map((time) => [{ jar, jarVolume }, { time }, MODES.jar!] as Case))),
      ...COMBUST_CUP_ORDER.flatMap((cup) => [0, 9, 12, 150, 300].map((time) => [{ cup }, { time }, MODES.cup!] as Case)),
      ...[-15, -8, 0, 8, 15].flatMap((probeX) => [0, 5, 25, 45, 60].map((probeY) => [{ probeX, probeY }, {}, MODES.flame!] as Case)),
      ...COMBUST_FIRE_ORDER.flatMap((fire) => COMBUST_AGENT_ORDER.map((agent) => [{ fire, agent }, {}, MODES.fire!] as Case)),
      ...COMBUST_FUEL_ORDER.flatMap((fuel) => [0, 7.9, 10].map((mass) => [{ fuel, mass }, {}, MODES.fuel!] as Case)),
      ...COMBUST_PRODUCT_ORDER.map((product) => [{ product }, {}, MODES.products!] as Case),
    ];
    for (const [params, state, layers] of cases) {
      const { placed, rec, layout } = render(results(params, state), layers, 325);
      const where = (t: string) => `${JSON.stringify(params)} ${JSON.stringify(state)} "${t}"`;
      expect(layout.height).toBeGreaterThanOrEqual(330);
      expect(layout.height).toBeLessThanOrEqual(420);
      for (const p of placed) {
        const [l, r] = extent(p);
        expect(l, where(p.text)).toBeGreaterThanOrEqual(0);
        expect(r, where(p.text)).toBeLessThanOrEqual(325);
        expect(p.y, where(p.text)).toBeGreaterThanOrEqual(0);
        expect(p.y, where(p.text)).toBeLessThanOrEqual(layout.height);
      }
      for (const call of [...rec.of("arc"), ...rec.of("ellipse")]) {
        const [x, y] = call.args as [number, number];
        expect(x, where("arc")).toBeGreaterThanOrEqual(0);
        expect(x, where("arc")).toBeLessThanOrEqual(325);
        expect(y, where("arc")).toBeGreaterThanOrEqual(0);
        expect(y, where("arc")).toBeLessThanOrEqual(layout.height);
      }
      for (const call of rec.of("roundRect")) {
        const [x, y, w, h] = call.args as [number, number, number, number];
        expect(x, where("box")).toBeGreaterThanOrEqual(0);
        expect(x + w, where("box")).toBeLessThanOrEqual(325);
        expect(y, where("box")).toBeGreaterThanOrEqual(0);
        expect(y + h, where("box")).toBeLessThanOrEqual(layout.height);
      }
      for (const p of placed.filter((q) => q.y === layout.captionY)) expect([...p.text].length, p.text).toBeLessThanOrEqual(55);
    }
  });
});
