import { type MirrorAngleParams, type MirrorAngleState, mirrorAngleModel } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeMirrorAngleLayout, kaleidoscopeTiles, mirrorAngleRenderer, mirrorImageMaps } from "./mirrorangle/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const ALL = ["scene", "rays", "labels"];
const start = mirrorAngleModel.initialize(mirrorAngleModel.defaultParams);
const results = (scene: MirrorAngleParams["scene"], over: Partial<MirrorAngleState> = {}) => mirrorAngleModel.derive({ ...start, ...over }, { scene });
const render = (r: ReturnType<typeof results>, layers = ALL, width = 800) => {
  const rec = recordingContext();
  mirrorAngleRenderer.draw(rec.ctx, computeMirrorAngleLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const text = (rec: ReturnType<typeof render>) => rec.texts().join(" | ");

describe("regular and diffuse reflection", () => {
  it("names regular reflection off a smooth surface", () => {
    const t = text(render(results("surface", { incidence: 30, roughness: 0 })));
    expect(t).toContain("Regular reflection: rays stay parallel");
    expect(t).toContain("Marked bit: i = 30°, r = 30° from its normal");
  });

  it("gives the model's spread for a rough one, and equal angles at the marked bit", () => {
    const r = results("surface", { incidence: 30, roughness: 100 });
    const t = text(render(r));
    expect(t).toContain("Diffuse reflection: rays spread over 68°");
    expect(t).toContain("Marked bit: i = 41°, r = 41° from its normal");
  });

  it("draws seven rays in and seven out", () => {
    // Each arrow is one stroke for the shaft and one fill for the head.
    const rec = render(results("surface", { roughness: 50 }), ["rays"]);
    expect(rec.of("fill")).toHaveLength(14);
  });

  it("hides the numbers without the words layer", () => {
    expect(render(results("surface", { roughness: 60 }), ["scene", "rays"]).texts()).toEqual([]);
  });
});

describe("mirrors at an angle", () => {
  it("counts the model's images with NCERT's rule", () => {
    expect(text(render(results("angle", { mirrorAngle: 90 })))).toContain("3 images: 360° ÷ 90° − 1 = 3");
    expect(text(render(results("angle", { mirrorAngle: 60 })))).toContain("5 images: 360° ÷ 60° − 1 = 5");
    expect(text(render(results("angle", { mirrorAngle: 45 })))).toContain("7 images: 360° ÷ 45° − 1 = 7");
    expect(text(render(results("angle", { mirrorAngle: 100 })))).toContain("4 images (360° ÷ 100° is not whole)");
    expect(text(render(results("angle", { mirrorAngle: 90 })))).toContain("2 reversed, 1 the right way round");
  });

  it("puts each image where the model traced it, flipped when the reflections are odd", () => {
    for (const theta of [45, 60, 90, 120, 180]) {
      for (const { image, map } of mirrorImageMaps(theta)) {
        // The object stands on the bisector at 90°; the model measures from the first mirror at 90° − θ/2.
        const p = { x: map[1], y: map[3] };
        const angle = (((Math.atan2(p.y, p.x) * 180) / Math.PI - (90 - theta / 2)) % 360 + 360) % 360;
        expect(Math.abs(((angle - image.angle + 540) % 360) - 180), `${theta}° image at ${image.angle}`).toBeLessThan(1e-6);
        const determinant = map[0] * map[3] - map[1] * map[2];
        expect(determinant).toBeCloseTo(image.reflections % 2 === 1 ? -1 : 1, 9);
      }
    }
  });

  it("draws one letter for the object and one for each image", () => {
    // The F is two strokes; each mirror is one segment plus its hatching.
    const strokes = (theta: number) => render(results("angle", { mirrorAngle: theta }), ["scene"]).of("beginPath").length;
    const hatching = (theta: number) => strokes(theta) - 2 * (1 + mirrorAngleModel.derive({ ...start, mirrorAngle: theta }, { scene: "angle" }).images);
    expect(hatching(90)).toBe(hatching(60));
    expect(strokes(60) - strokes(90)).toBe(2 * (5 - 3));
  });
});

describe("the kaleidoscope", () => {
  it("names the 5 images round each corner", () => {
    expect(text(render(results("kaleidoscope")))).toContain("Three mirrors at 60°: 5 images round each corner");
  });

  it("tiles with triangles that are reflections of the first", () => {
    const tiles = kaleidoscopeTiles({ x: 0, y: 0 }, 60, 160);
    expect(tiles.length).toBeGreaterThan(12);
    for (const tile of tiles) {
      const det = tile.map[0] * tile.map[3] - tile.map[1] * tile.map[2];
      expect(Math.abs(det)).toBeCloseTo(1, 9);
      // The map carries the first triangle's corners onto this one's (in some order).
      const moved = tiles[0]!.corners.map((c) => ({ x: tile.map[0] * c.x + tile.map[1] * c.y + tile.shift.x, y: tile.map[2] * c.x + tile.map[3] * c.y + tile.shift.y }));
      for (const m of moved) expect(tile.corners.some((c) => Math.hypot(c.x - m.x, c.y - m.y) < 1e-6)).toBe(true);
    }
  });
});

describe("the periscope", () => {
  it("lifts your sight by the tube's height when the mirrors are at 45°", () => {
    const t = text(render(results("periscope", { tilt: 45, tubeHeight: 60 })));
    expect(t).toContain("You see over the wall, 60 cm higher");
    expect(t).toContain("turns 90°");
  });

  it("says when the light hits the tube instead", () => {
    expect(text(render(results("periscope", { tilt: 52, tubeHeight: 60 })))).toContain("The light hits the side of the tube");
  });
});

describe("on a phone", () => {
  const width = 325;
  const cases: [MirrorAngleParams["scene"], Partial<MirrorAngleState>][] = [
    ["surface", { incidence: 50, roughness: 100 }],
    ["surface", { incidence: 0, roughness: 0 }],
    ["angle", { mirrorAngle: 30 }],
    ["angle", { mirrorAngle: 180 }],
    ["angle", { mirrorAngle: 100 }],
    ["kaleidoscope", { turn: 2 }],
    ["periscope", { tubeHeight: 100, tilt: 45 }],
    ["periscope", { tubeHeight: 20, tilt: 30 }],
    ["periscope", { tubeHeight: 100, tilt: 60 }],
  ];

  it.each(cases)("keeps %s inside the canvas", (scene, over) => {
    const layout = computeMirrorAngleLayout(width);
    expect(layout.height).toBeGreaterThanOrEqual(330);
    expect(layout.height).toBeLessThanOrEqual(420);
    const rec = render(results(scene, over), ALL, width);
    const inside = (x: number, y: number) => {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(width);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(layout.height);
    };
    for (const call of [...rec.of("moveTo"), ...rec.of("lineTo"), ...rec.of("arc")]) inside(call.args[0] as number, call.args[1] as number);
    for (const call of rec.of("fillText")) {
      const [words, x, y] = call.args as [string, number, number];
      expect(words.length, words).toBeLessThanOrEqual(55);
      inside(x, y);
    }
  });

  it("fits every centred caption across the width", () => {
    for (const [scene, over] of cases) {
      const rec = render(results(scene, over), ALL, width);
      const layout = computeMirrorAngleLayout(width);
      for (const call of rec.of("fillText")) {
        const [words, x, y] = call.args as [string, number, number];
        if (y < layout.caption[0] - 1) continue;
        expect(x - (words.length * 6) / 2, words).toBeGreaterThanOrEqual(0);
        expect(x + (words.length * 6) / 2, words).toBeLessThanOrEqual(width);
      }
    }
  });
});
