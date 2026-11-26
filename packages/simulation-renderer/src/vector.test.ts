import { type VectorParams, type VectorState, vectorModel } from "@ise/mathematics-engine";
import { degToRad as deg } from "@ise/units";
import { describe, expect, it } from "vitest";
import { createPlane } from "./shared/plane";
import { computeVectorLayout, vectorRenderer } from "./vector/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

describe("plane mapping", () => {
  const plane = createPlane({ x: 10, y: 20, width: 120, height: 120 }, [-6, 6], [-6, 6]);
  it("maps the origin to the centre with y up", () => {
    expect(plane.toPx(0, 0)).toEqual([70, 80]);
    expect(plane.toPx(6, 6)).toEqual([130, 20]);
  });
  it("inverts pixels to coordinates", () => {
    const [x, y] = plane.fromPx(...plane.toPx(1.5, -2));
    expect(x).toBeCloseTo(1.5, 12);
    expect(y).toBeCloseTo(-2, 12);
  });
});

describe("vector layout and picking", () => {
  it("uses a square plane with the concept's extent, fitting the width", () => {
    for (const width of [343, 800]) {
      const l = computeVectorLayout(width, [], new Set(), { extent: 5 });
      expect(l.plane.rect.width).toBe(l.plane.rect.height);
      expect(l.plane.xDomain).toEqual([-5, 5]);
      expect(l.plane.rect.x + l.plane.rect.width).toBeLessThanOrEqual(width);
    }
  });

  it("clicking the plane writes snapped components", () => {
    const l = computeVectorLayout(800, [], new Set(), { extent: 6 });
    const [x, y] = l.plane.toPx(3.04, 3.97);
    const hit = vectorRenderer.pick!(l, x, y, undefined, {});
    expect(hit?.writes.map((w) => w.variable)).toEqual(["vx", "vy"]);
    expect(hit?.writes[0]?.value).toBeCloseTo(3, 12);
    expect(hit?.writes[1]?.value).toBeCloseTo(4, 12);
    expect(vectorRenderer.pick!(l, 1, 1, undefined, {})).toBeNull();
  });
});

describe("adding, resolving and rates views", () => {
  const P = vectorModel.defaultParams;
  const results = (state: Partial<VectorState> = {}, params: Partial<VectorParams> = {}) =>
    vectorModel.derive({ ...vectorModel.initialize(P), ...state }, { ...P, ...params });
  /** Renders, and notes where each piece of text lands (the recorder measures 6 px a character). */
  const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
    const rec = recordingContext();
    const spans: { text: string; left: number; right: number; y: number }[] = [];
    const target = rec.ctx as unknown as Record<string, unknown>;
    const ctx = new Proxy(target, {
      get(t, key: string) {
        if (key === "fillText") {
          return (text: string, x: number, y: number) => {
            const w = text.length * 6;
            const align = t.textAlign;
            const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
            spans.push({ text, left, right: left + w, y });
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
    const set = new Set(layers);
    const layout = computeVectorLayout(width, [], set, { extent: 6 });
    vectorRenderer.draw(ctx, layout, { results: r, trace: null, layers: set, highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
    return { rec, layout, spans };
  };
  const ADD = ["vector", "triangle", "resultant", "between", "handle", "labels"];
  const SLOPE = ["incline", "labels"];
  const AXES = ["vector", "tiltedAxes", "handle", "labels"];
  const RATES = ["vector", "path", "velocity", "chord", "acceleration", "labels"];
  const fortyFive = { r: 4, theta: 0, b: 3, bTheta: deg(60) };

  it("zooms out to ±10 for adding, and adds a caption band", () => {
    const l = computeVectorLayout(325, [], new Set(ADD), { extent: 6 });
    expect(l.plane.xDomain).toEqual([-10, 10]);
    expect(l.addView).toBe("triangle");
    expect(l.caption).not.toBeNull();
    expect(l.height).toBeGreaterThanOrEqual(330);
    expect(l.height).toBeLessThanOrEqual(420);
    expect(computeVectorLayout(325, [], new Set(["vector", "components"]), { extent: 6 }).caption).toBeNull();
  });

  it("names B and R, and gives |R| and its direction only with labels", () => {
    const words = render(results(fortyFive), ADD).rec.texts().join(" | ");
    expect(words).toContain("|A + B| = 6.08, φ = 60°");
    expect(words).toContain("R is 25.3° anticlockwise from A");
    const hidden = render(results(fortyFive), ADD.filter((l) => l !== "labels")).rec.texts().join(" | ");
    expect(hidden).toContain("|A + B| = √(A² + B² + 2AB cos φ)");
    expect(hidden).not.toMatch(/6\.08|25\.3/);
    const minus = render(results(fortyFive, { operation: "subtract" }), ADD).rec.texts().join(" | ");
    expect(minus).toContain("|A − B| = 3.61");
    expect(minus).toContain("−B");
  });

  it("dragging near B's head moves B, elsewhere moves A within ±6", () => {
    const set = new Set(["vector", "parallelogram", "resultant"]);
    const l = computeVectorLayout(800, [], set, { extent: 6 });
    const r = results(fortyFive);
    const [bx, by] = l.plane.toPx(r.bx, r.by);
    const hit = vectorRenderer.pick!(l, bx + 2, by, undefined, r);
    expect(hit?.region).toBe("b");
    expect(hit?.writes.map((w) => w.variable)).toEqual(["bx", "by"]);
    const [fx, fy] = l.plane.toPx(9, -9);
    const far = vectorRenderer.pick!(l, fx, fy, undefined, r);
    expect(far?.writes.map((w) => w.value)).toEqual([6, -6]);
  });

  it("splits the weight on the slope, numbers only with labels", () => {
    const words = render(results({ mass: 2, tilt: deg(30) }), SLOPE).rec.texts().join(" | ");
    expect(words).toContain("mg sin α = 9.80 N, mg cos α = 16.97 N");
    expect(words).toContain("mg = 19.6 N");
    const hidden = render(results({ mass: 2, tilt: deg(30) }), ["incline"]).rec.texts().join(" | ");
    expect(hidden).toContain("mg sin α");
    expect(hidden).not.toMatch(/9\.80|16\.97|19\.6/);
  });

  it("resolves along turned axes", () => {
    const words = render(results({ r: 4, theta: deg(60), tilt: deg(30) }), AXES).rec.texts().join(" | ");
    expect(words).toContain("along x′: r cos(θ − α) = 3.46");
    expect(words).toContain("along y′: r sin(θ − α) = 2.00");
  });

  it("gives |v|, |Δr|/Δt and |a| for a turning position vector", () => {
    const words = render(results({ r: 4, theta: 0 }, { omega: Math.PI / 2, deltaT: 0.1 }), RATES).rec.texts().join(" | ");
    expect(words).toContain("|v| = rω = 6.28; |Δr|/Δt = 6.28 (Δt = 0.10 s)");
    expect(words).toContain("|a| = rω² = 9.87, pointing to the centre");
    const hidden = render(results({ r: 4, theta: 0 }, { omega: Math.PI / 2 }), RATES.filter((l) => l !== "labels")).rec.texts().join(" | ");
    expect(hidden).not.toMatch(/6\.28|9\.87/);
  });

  it("keeps every word inside a 325 px canvas", () => {
    const cases: [Partial<VectorState>, Partial<VectorParams>, string[]][] = [
      [fortyFive, {}, ADD],
      [{ r: 6, theta: deg(135), b: 4, bTheta: deg(150) }, {}, ADD],
      [{ r: 6, theta: deg(300), b: 4, bTheta: deg(10) }, { operation: "subtract" }, ["vector", "parallelogram", "resultant", "between", "labels"]],
      [{ mass: 10, tilt: deg(0) }, {}, SLOPE],
      [{ mass: 10, tilt: deg(30) }, {}, SLOPE],
      [{ mass: 10, tilt: deg(60) }, {}, SLOPE],
      [{ mass: 10, tilt: deg(90) }, {}, SLOPE],
      [{ r: 6, theta: deg(200), tilt: deg(75) }, {}, AXES],
      [{ r: 6, theta: deg(45) }, { omega: Math.PI, deltaT: 2 }, RATES],
      [{ r: 1, theta: deg(270) }, { omega: Math.PI / 4, direction: "cw" }, RATES],
    ];
    for (const [state, params, layers] of cases) {
      const { rec, layout, spans } = render(results(state, params), layers, 325);
      for (const s of spans) {
        expect(s.left, `${s.text} (${layers[1]})`).toBeGreaterThanOrEqual(0);
        expect(s.right, `${s.text} (${layers[1]})`).toBeLessThanOrEqual(325);
        expect(s.y, s.text).toBeGreaterThan(0);
        expect(s.y, s.text).toBeLessThan(layout.height);
      }
      for (const call of [...rec.of("moveTo"), ...rec.of("lineTo")]) {
        const [x, y] = call.args as [number, number];
        if (layers.includes("incline")) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(325);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(layout.height);
        }
      }
    }
  });
});
