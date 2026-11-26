import { lewisModel, type LewisParams } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { computeLewisLayout, lewisRenderer, terminalDirections } from "./lewis/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const results = (molecule: LewisParams["molecule"], b: number[]) =>
  lewisModel.derive({ b1: b[0] ?? 1, b2: b[1] ?? 1, b3: b[2] ?? 1, clock: 0 }, { molecule });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  lewisRenderer.draw(rec.ctx, computeLewisLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const ALL = ["structure", "labels"];

describe("what the Lewis renderer draws", () => {
  it("places terminal atoms round the centre", () => {
    expect([terminalDirections(1), terminalDirections(2), terminalDirections(3)]).toEqual([["right"], ["left", "right"], ["left", "right", "up"]]);
  });

  it("draws a line per bond and two dots per lone pair", () => {
    // O=C=O: four bond lines; eight lone-pair dots on the two oxygens.
    const co2 = render(results("co2", [2, 2]), ["structure"]);
    expect(co2.of("lineTo")).toHaveLength(4);
    expect(co2.of("arc")).toHaveLength(8);
  });

  it("marks formal charges and says why a structure fails", () => {
    const co = render(results("co", [3]), ALL).texts();
    expect(co).toEqual(expect.arrayContaining(["−", "+"]));
    expect(co.join(" ")).toContain("✓ the best structure");
    expect(render(results("co2", [1, 1]), ALL).texts().join(" ")).toContain("make a multiple bond");
    expect(render(results("o3", [2, 2]), ALL).texts().join(" ")).toContain("more than an octet");
    expect(render(results("co2", [1, 3]), ALL).texts().join(" ")).toContain("formal charges total 2");
  });

  it("names resonance, and counts the electrons", () => {
    const texts = render(results("o3", [1, 2]), ALL).texts().join(" ");
    expect(texts).toContain("one of 2 resonance structures — bond order 1.5");
    expect(texts).toContain("18 valence electrons: 6 in bonds + 12 in lone pairs");
  });
});
