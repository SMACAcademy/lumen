import { soundModel, type SoundParams } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeSoundLayout, shownWavelength, soundRenderer } from "./sound/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const results = (over: Partial<SoundParams> = {}, wallDistance = 170, t = 0) => soundModel.derive({ wallDistance, t }, { ...soundModel.defaultParams, ...over });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  soundRenderer.draw(rec.ctx, computeSoundLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const WAVES = ["speaker", "particles", "trace", "labels"];
const ECHO = ["speaker", "wall", "labels"];

describe("what the sound renderer draws", () => {
  it("fills the medium with particles, and leaves a vacuum empty", () => {
    expect(render(results(), WAVES).of("arc").length).toBeGreaterThan(100);
    const vacuum = render(results({ medium: "vacuum" }), WAVES);
    expect(vacuum.of("arc")).toHaveLength(0);
    expect(vacuum.texts().join(" ")).toContain("cannot travel through a vacuum");
  });

  it("names the pitch and the wavelength", () => {
    expect(render(results({ frequency: 800 }), WAVES).texts().join(" ")).toContain("A high note, 800 Hz");
    expect(render(results({ frequency: 100 }), WAVES).texts().join(" ")).toContain("A low note");
  });

  it("draws a longer wave for a lower note, within bounds", () => {
    expect(shownWavelength(3.43)).toBeGreaterThan(shownWavelength(0.686));
    expect(shownWavelength(100)).toBe(260);
    expect(shownWavelength(0.01)).toBe(18);
  });

  it("sends the clap out, brings the echo home, and says when it arrives", () => {
    expect(render(results({}, 343, 0.5), ECHO).of("arc")).toHaveLength(3);
    expect(render(results({}, 343, 0.5), ECHO).texts().join(" ")).toContain("will be back after 2.00 s");
    expect(render(results({}, 343, 2.2), ECHO).texts().join(" ")).toContain("Echo! Back after 2.00 s");
    expect(render(results({}, 10, 0), ECHO).texts().join(" ")).toContain("Too close");
    expect(render(results({ medium: "vacuum" }, 170, 0.3), ECHO).texts().join(" ")).toContain("never leaves");
  });
});
