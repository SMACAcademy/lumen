import {
  STATIC_ITEM_ORDER,
  STATIC_PARTNER_ORDER,
  STATIC_PLACE_ORDER,
  staticSchoolModel,
  type StaticSchoolParams,
} from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeStaticSchoolLayout, staticSchoolRenderer, staticSigned } from "./staticschool/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const results = (over: Partial<StaticSchoolParams> = {}, stormTime = 0) =>
  staticSchoolModel.derive({ stormTime }, { ...staticSchoolModel.defaultParams, ...over });

/** Draws, also noting each text's alignment so its extent can be checked. */
const render = (r: ReturnType<typeof results>, scene: string, width = 800, labels = true) => {
  const rec = recordingContext();
  const placed: { text: string; x: number; y: number; align: string }[] = [];
  const fillText = rec.ctx.fillText.bind(rec.ctx);
  (rec.ctx as unknown as Record<string, unknown>).fillText = (text: string, x: number, y: number) => {
    placed.push({ text, x, y, align: String(rec.ctx.textAlign ?? "left") });
    fillText(text, x, y);
  };
  const layout = computeStaticSchoolLayout(width);
  const layers = new Set(labels ? [scene, "labels"] : [scene]);
  staticSchoolRenderer.draw(rec.ctx, layout, { results: r, trace: null, layers, highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { rec, placed, layout, text: placed.map((p) => p.text).join(" | ") };
};

describe("what the charges renderer draws", () => {
  it("rubs a balloon, counts the charge both ways, and lifts paper", () => {
    const { text, rec } = render(results({ item: "balloon", rubs: 9 }), "rub");
    expect(text).toContain("Balloon rubbed with wool, 9 times");
    expect(text).toContain("Balloon −18 units · Wool +18 units");
    expect(text).toContain("It picks up 4 bits of paper");
    // 18 units: 5 marks of each kind.
    expect(rec.texts().filter((t) => t === "−")).toHaveLength(5);
    expect(rec.texts().filter((t) => t === "+")).toHaveLength(5);
    expect(render(results({ item: "comb", rubs: 1 }), "rub").text).toContain("Plastic comb run through dry hair, 1 time");
    expect(render(results({ item: "balloon", rubs: 1 }), "rub").text).toContain("It picks up no paper");
  });

  it("lets a steel spoon's charge flow away", () => {
    const { text } = render(results({ item: "spoon", rubs: 10 }), "rub");
    expect(text).toContain("Charge flows away through your hand");
    expect(text).toContain("Steel spoon 0 units · Polythene −20 units");
  });

  it("says whether two hung things attract or repel", () => {
    expect(render(results({ item: "balloon", partner: "balloon" }), "pair").text).toContain("Like charges: they repel");
    expect(render(results({ item: "balloon", partner: "refill" }), "pair").text).toContain("Unlike charges: they attract");
    expect(render(results({ item: "glass", partner: "paper" }), "pair").text).toContain("A charged thing pulls an uncharged one");
    expect(render(results({ item: "spoon", partner: "paper" }), "pair").text).toContain("Neither is charged: nothing happens");
    expect(render(results({ item: "balloon", partner: "refill" }), "pair").text).toContain("Right: refill rubbed with polythene");
  });

  it("opens the electroscope, and hides the angle without labels", () => {
    const r = results({ item: "balloon", rubs: 12 });
    const { text, rec } = render(r, "electroscope");
    expect(text).toContain("Balloon rubbed 12 times touches the clip");
    expect(text).toContain("The strips open 48° with 12 units of charge");
    // The two strips end 48° apart.
    const strips = rec.of("lineTo").slice(-2).map((c) => c.args as number[]);
    const layout = computeStaticSchoolLayout(800);
    const [a, b] = strips.map(([x, y]) => Math.atan2(x! - layout.cx, y! - 190));
    expect(((a! - b!) * 180) / Math.PI).toBeCloseTo(-48, 6);
    const bare = render(r, "electroscope", 800, false).text;
    expect(bare).not.toContain("48");
    expect(render(results({ rubs: 12, earthed: "yes" }), "electroscope").text).toContain("The strips hang shut");
    expect(render(results({ rubs: 12, earthed: "yes" }), "electroscope").text).toContain("Your hand: the charge flows to the earth");
  });

  it("builds a storm, flashes, and hides the distance without labels", () => {
    const before = render(results({ stormStrength: 4, thunderDelay: 15 }, 16), "storm");
    expect(before.text).toContain("Storm 16 s in, building 4 units each second");
    expect(before.text).toContain("Cloud 64 of 100 units · Flashes so far 0");
    expect(before.text).toContain("Charge is building up in the cloud");
    expect(before.text).toContain("Thunder 15 s after the flash");
    expect(before.text).toContain("That flash was about 5.1 km away");
    const bare = render(results({ thunderDelay: 15 }, 16), "storm", 800, false).text;
    expect(bare).not.toContain("5.1");
    expect(bare).toContain("Thunder 15 s after the flash");
    expect(render(results({ stormStrength: 4, conductor: "yes" }, 25), "storm").text).toContain("It ran down the conductor into the earth");
    expect(render(results({ stormStrength: 4, conductor: "no" }, 50), "storm").text).toContain("It struck the building");
  });

  it("draws a bolt only just after a flash", () => {
    const lines = (time: number) => render(results({ stormStrength: 4 }, time), "storm").rec.of("lineTo").length;
    expect(lines(25)).toBeGreaterThan(lines(24));
    expect(lines(25) - lines(24)).toBe(6);
  });

  it("says whether a place is safe only with labels", () => {
    expect(render(results({ place: "house" }), "safety").text).toContain("Safe");
    expect(render(results({ place: "crouch" }), "safety").text).toContain("Safer than standing, but not safe");
    expect(render(results({ place: "tree" }), "safety").text).toContain("Not safe");
    expect(render(results({ place: "tree" }), "safety", 800, false).text).not.toContain("safe");
  });

  it("writes charges with a real minus sign", () => {
    expect([staticSigned(16), staticSigned(-16), staticSigned(0), staticSigned(-0.2)]).toEqual(["+16", "−16", "0", "0"]);
  });
});

describe("on a 325 px phone", () => {
  const width = 325;
  const cases: [string, string, Partial<StaticSchoolParams>, number][] = [
    ...STATIC_ITEM_ORDER.map((item) => [`rub ${item}`, "rub", { item, rubs: 20 }, 0] as [string, string, Partial<StaticSchoolParams>, number]),
    ...STATIC_ITEM_ORDER.flatMap((item) =>
      STATIC_PARTNER_ORDER.map((partner) => [`pair ${item} ${partner}`, "pair", { item, partner, rubs: 20 }, 0] as [string, string, Partial<StaticSchoolParams>, number]),
    ),
    ...STATIC_ITEM_ORDER.map((item) => [`electroscope ${item}`, "electroscope", { item, rubs: 20 }, 0] as [string, string, Partial<StaticSchoolParams>, number]),
    ["electroscope earthed", "electroscope", { rubs: 20, earthed: "yes" }, 0],
    ["storm with conductor", "storm", { stormStrength: 10, conductor: "yes", thunderDelay: 60 }, 120],
    ["storm without conductor", "storm", { stormStrength: 4, conductor: "no" }, 25],
    ...STATIC_PLACE_ORDER.map((place) => [`safety ${place}`, "safety", { place }, 0] as [string, string, Partial<StaticSchoolParams>, number]),
  ];

  it.each(cases)("keeps every word of %s on the canvas", (_name, scene, over, time) => {
    const { placed, layout } = render(results(over, time), scene, width);
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

  it.each(cases)("keeps every line and shape of %s inside", (_name, scene, over, time) => {
    const { rec, layout } = render(results(over, time), scene, width);
    for (const call of [...rec.of("moveTo"), ...rec.of("lineTo")]) {
      const [x, y] = call.args as number[];
      expect(x, call.method).toBeGreaterThanOrEqual(0);
      expect(x, call.method).toBeLessThanOrEqual(width);
      expect(y, call.method).toBeGreaterThanOrEqual(0);
      expect(y, call.method).toBeLessThanOrEqual(layout.height);
    }
    for (const call of rec.of("arc")) {
      const [x, y, r] = call.args as number[];
      expect(x! - r!, "arc left").toBeGreaterThanOrEqual(0);
      expect(x! + r!, "arc right").toBeLessThanOrEqual(width);
      expect(y! - r!, "arc top").toBeGreaterThanOrEqual(0);
      expect(y! + r!, "arc bottom").toBeLessThanOrEqual(layout.height);
    }
    for (const method of ["fillRect", "strokeRect"]) {
      for (const call of rec.of(method)) {
        const [x, y, w, h] = call.args as number[];
        expect(x, method).toBeGreaterThanOrEqual(0);
        expect(x! + w!, method).toBeLessThanOrEqual(width);
        expect(y, method).toBeGreaterThanOrEqual(0);
        expect(y! + h!, method).toBeLessThanOrEqual(layout.height);
      }
    }
  });
});
