import { magmatterModel, type MagmatterParams, type MagmatterState } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeMagmatterLayout, magmatterRenderer, magmatterSig } from "./magmatter/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base = magmatterModel.initialize(magmatterModel.defaultParams);
const deg = (d: number) => (d * Math.PI) / 180;
const results = (params: Partial<MagmatterParams> = {}, state: Partial<MagmatterState> = {}) =>
  magmatterModel.derive({ ...base, ...state }, { ...magmatterModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  magmatterRenderer.draw(rec.ctx, computeMagmatterLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const text = (r: ReturnType<typeof results>, layers: string[]) => render(r, layers).texts().join(" | ");

describe("numbers", () => {
  it("writes small and large values with a power of ten", () => {
    expect(magmatterSig(0.045)).toBe("0.045");
    expect(magmatterSig(14.222)).toBe("14.2");
    expect(magmatterSig(-2.3e-5)).toBe("−2.30×10⁻⁵");
    expect(magmatterSig(1.628e6)).toBe("1.63×10⁶");
    expect(magmatterSig(9.996e-4)).toBe("1.00×10⁻³");
    expect(magmatterSig(0)).toBe("0");
  });
});

describe("the dipole view", () => {
  it("gives the field at the probe, and which way it points", () => {
    expect(text(results({ moment: 1, probe: "axis" }, { r: 20 }), ["dipole", "labels"])).toContain("B = 25 µT, along m (axis)");
    expect(text(results({ moment: 0.48, probe: "equator" }, { r: 15 }), ["dipole", "labels"])).toContain("B = 14.2 µT, against m (equator)");
  });

  it("hides the field's size with the words, but still names the distance", () => {
    const hidden = text(results({ moment: 0.48, probe: "equator" }, { r: 15 }), ["dipole"]);
    expect(hidden).not.toMatch(/µT/);
    expect(hidden).toContain("r = 15 cm");
    expect(hidden).toContain("magnet not to scale");
  });

  it("draws a closed surface for Gauss's law", () => {
    expect(text(results(), ["dipole", "gauss"])).toContain("net flux out = 0");
  });
});

describe("the torque view", () => {
  it("gives the torque, the energy and the period", () => {
    const t = text(results({ moment: 0.36, field: 250 }, { theta: deg(30) }), ["torque", "labels"]);
    expect(t).toContain("τ = 0.045 N m · U = −0.0779 J");
    expect(text(results({ moment: 0.067, field: 10 }), ["torque", "labels"])).toContain("small swings: T = 0.665 s");
    expect(text(results({ moment: 0.067, field: 10 }), ["torque"])).not.toContain("T = ");
  });

  it("drops the torque arrow when the magnet lies along the field", () => {
    expect(render(results({}, { theta: 0 }), ["torque"]).texts()).not.toContain("τ");
    expect(render(results({}, { theta: deg(60) }), ["torque"]).texts()).toContain("τ");
  });
});

describe("the Earth view", () => {
  it("names the place and splits the field", () => {
    const t = text(results({ place: "delhi" }), ["earth", "labels"]);
    expect(t).toContain("Delhi: the Earth's field is 47 µT");
    expect(t).toContain("B_H = 34.4 µT · B_V = 32.1 µT · dip 43.0°");
    expect(t).toContain("declination 0.7° E");
    expect(text(results({ place: "mumbai" }), ["earth", "labels"])).toContain("declination 1.0° W");
  });

  it("hides the components' sizes with the words", () => {
    const t = text(results({ place: "delhi" }), ["earth"]);
    expect(t).not.toMatch(/34\.4|32\.1|declination/);
    expect(t).toContain("circle in the magnetic meridian");
    expect(text(results({ place: "delhi" }, { tilt: deg(60) }), ["earth"])).toContain("circle turned 60° from the meridian");
  });

  it("has no compass direction at the magnetic pole", () => {
    expect(text(results({ place: "pole" }), ["earth", "labels"])).toContain("a compass cannot point");
  });
});

describe("the material view", () => {
  it("says what kind of material it is and gives χ, M and B", () => {
    const al = text(results({ material: "aluminium", current: 2 }), ["material", "labels"]);
    expect(al).toContain("paramagnetic");
    expect(al).toContain("H = 2000 A/m · M = 0.046 A/m");
    expect(al).toContain("χ = 2.30×10⁻⁵");
    expect(text(results({ material: "bismuth" }), ["material", "labels"])).toContain("diamagnetic");
    expect(text(results({ material: "iron", temperature: 1100 }), ["material", "labels"])).toContain("paramagnetic");
    expect(text(results({ material: "iron" }), ["material", "labels"])).toContain("ferromagnetic");
  });

  it("hides the kind and the numbers with the words", () => {
    expect(text(results({ material: "iron", current: 1.5 }), ["material"])).not.toMatch(/magnetic|1500|χ/);
  });
});

describe("the loop view", () => {
  it("marks the retentivity and coercivity", () => {
    const t = text(results({ core: "steel" }, { cycle: 0.25 }), ["loop", "compare", "labels"]);
    expect(t).toContain("B_r = 1.0 T");
    expect(t).toContain("−H_c = −4000 A/m");
    expect(t).toContain("H = 0 A/m · B = 1.00 T");
    expect(t).toContain("dashed: soft iron, same axes");
    expect(t).toContain("H falling");
    expect(text(results({ core: "soft-iron" }, { cycle: 0.75 }), ["loop", "labels"])).toContain("H rising");
  });

  it("hides them with the words", () => {
    expect(text(results({ core: "steel" }, { cycle: 0.28 }), ["loop"])).not.toMatch(/4000|B_r/);
  });
});

describe("on a phone", () => {
  const width = 325;
  const cases: [string, Partial<MagmatterParams>, Partial<MagmatterState>, string[]][] = [
    ["dipole axis far", { probe: "axis", moment: 0.01 }, { r: 50 }, ["dipole", "gauss", "labels"]],
    ["dipole axis near", { probe: "axis", moment: 2 }, { r: 10 }, ["dipole", "gauss", "labels"]],
    ["dipole equator far", { probe: "equator", moment: 2 }, { r: 50 }, ["dipole", "labels"]],
    ["torque upright", { moment: 0.067, field: 10 }, { theta: deg(90) }, ["torque", "labels"]],
    ["torque reversed", { moment: 2, field: 300 }, { theta: deg(170) }, ["torque", "labels"]],
    ["earth south", { place: "thiruvananthapuram" }, { tilt: deg(45) }, ["earth", "labels"]],
    ["earth pole", { place: "pole" }, { tilt: 0 }, ["earth", "labels"]],
    ["earth srinagar", { place: "srinagar" }, { tilt: deg(90) }, ["earth", "labels"]],
    ["oxygen hot", { material: "oxygen", temperature: 1500, current: 2 }, {}, ["material", "labels"]],
    ["iron", { material: "iron", current: 2 }, {}, ["material", "labels"]],
    ["bismuth", { material: "bismuth", current: 0.05 }, {}, ["material", "labels"]],
    ["steel loop", { core: "steel" }, { cycle: 0.28 }, ["loop", "compare", "labels"]],
    ["soft iron loop", { core: "soft-iron" }, { cycle: 0.6 }, ["loop", "compare", "labels"]],
  ];

  /** Every text drawn, with its left and right edges worked out from its alignment (6 px a character). */
  const spans = (params: Partial<MagmatterParams>, state: Partial<MagmatterState>, layers: string[]) => {
    const rec = recordingContext();
    const store = rec.ctx as unknown as Record<string, unknown>;
    const out: { words: string; left: number; right: number; y: number }[] = [];
    const ctx = new Proxy(store, {
      get(target, key: string) {
        if (key !== "fillText") return target[key];
        return (words: string, x: number, y: number) => {
          const w = words.length * 6;
          const align = (target.textAlign as string | undefined) ?? "left";
          const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
          out.push({ words, left, right: left + w, y });
        };
      },
      set(target, key: string, value) {
        target[key] = value;
        return true;
      },
    }) as unknown as CanvasRenderingContext2D;
    magmatterRenderer.draw(ctx, computeMagmatterLayout(width), { results: results(params, state), trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
    return { out, rec };
  };

  it.each(cases)("keeps every word of %s on the canvas", (_name, params, state, layers) => {
    const { height } = computeMagmatterLayout(width);
    const { out } = spans(params, state, layers);
    expect(out.length).toBeGreaterThan(3);
    for (const s of out) {
      expect(s.words.length, s.words).toBeLessThanOrEqual(55);
      expect(s.left, s.words).toBeGreaterThanOrEqual(0);
      expect(s.right, s.words).toBeLessThanOrEqual(width);
      expect(s.y, s.words).toBeGreaterThanOrEqual(0);
      expect(s.y, s.words).toBeLessThanOrEqual(height);
    }
  });

  it("keeps the probe, the needle's pivot and the loop's dot on the canvas", () => {
    const { height } = computeMagmatterLayout(width);
    for (const [, params, state, layers] of cases) {
      const { rec } = spans(params, state, layers);
      for (const call of rec.of("arc")) {
        const [ax, ay] = call.args as [number, number];
        expect(ax).toBeGreaterThanOrEqual(0);
        expect(ax).toBeLessThanOrEqual(width);
        expect(ay).toBeGreaterThanOrEqual(0);
        expect(ay).toBeLessThanOrEqual(height);
      }
    }
  });

  it("puts the probe 50 cm out, and its arrow, inside the picture", () => {
    const layout = computeMagmatterLayout(width);
    const { rec } = spans({ probe: "axis" }, { r: 50 }, ["dipole"]);
    const xs = rec.of("lineTo").map((c) => c.args[0] as number);
    expect(Math.max(...xs)).toBeLessThanOrEqual(layout.stage.x + layout.stage.width);
  });
});
