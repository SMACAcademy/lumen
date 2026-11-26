import { currentWorkModel, type CurrentWorkParams, type CurrentWorkState } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeCurrentWorkLayout, currentWorkRenderer, cwFieldAt, cwNumber, cwSolenoidCurrents, cwTrace } from "./currentwork/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const S0 = currentWorkModel.initialize(currentWorkModel.defaultParams);
const results = (params: Partial<CurrentWorkParams> = {}, state: Partial<CurrentWorkState> = {}) =>
  currentWorkModel.derive({ ...S0, ...state }, { ...currentWorkModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  currentWorkRenderer.draw(rec.ctx, computeCurrentWorkLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const text = (rec: ReturnType<typeof render>) => rec.texts().join(" | ");

describe("number format", () => {
  it("writes numbers simply", () => {
    expect(cwNumber(15000)).toBe("15 000");
    expect(cwNumber(9.090909)).toBe("9.09");
    expect(cwNumber(440)).toBe("440");
    expect(cwNumber(0.4545)).toBe("0.45");
    expect(cwNumber(20)).toBe("20");
  });
});

describe("the heat scene", () => {
  it("shows I, R and t, and gives the heat only with the words on", () => {
    const r = results({ heatCurrent: 5, coilResistance: 20 }, { seconds: 30 });
    const shown = text(render(r, ["heat", "labels"]));
    expect(shown).toContain("I = 5 A");
    expect(shown).toContain("R = 20 Ω");
    expect(shown).toContain("on for t = 30 s");
    expect(shown).toContain("P = I²R = 500 W");
    expect(shown).toContain("H = I²Rt = 15 000 J");
    const hidden = text(render(r, ["heat"]));
    expect(hidden).not.toContain("15 000");
    expect(hidden).not.toContain(" J");
  });

  it("says when the coil glows and when it is cold", () => {
    expect(text(render(results({ heatCurrent: 5, coilResistance: 20 }), ["heat"]))).toContain("The coil glows");
    expect(text(render(results({ heatCurrent: 0 }), ["heat"]))).toContain("No current: the coil stays cold");
  });
});

describe("the house scene", () => {
  it("names the mains, and melts a 5 A fuse under a 2 kW load", () => {
    const r = results({ bulbs: 0, heaters: 2, fuseRating: 5 });
    const shown = text(render(r, ["house", "labels"]));
    expect(shown).toContain("Mains 220 V, 50 Hz");
    expect(shown).toContain("5 A fuse");
    expect(shown).toContain("2000 W in all; current 9.09 A".replace("2000", "2 000"));
    expect(shown).toContain("the fuse melts");
    expect(text(render(r, ["house"]))).not.toContain("9.09");
  });

  it("trips an MCB instead, and warns of a shock without an earth wire", () => {
    expect(text(render(results({ fault: "short", protector: "mcb" }), ["house"]))).toContain("the MCB trips");
    expect(text(render(results({ fault: "short" }), ["house"]))).toContain("short");
    expect(text(render(results({ fault: "leak", earthed: "not", heaters: 1, bulbs: 0 }), ["house"]))).toContain("Danger");
    expect(text(render(results({ fault: "leak", earthed: "earthed", heaters: 1 }), ["house"]))).toContain("earth");
    expect(text(render(results({ bulbs: 3 }), ["house"]))).toContain("within the rating");
  });
});

describe("the electromagnet scene", () => {
  it("counts the pins with the words on, and drops them when switched off", () => {
    const on = text(render(results({ coilTurns: 60, magnetCurrent: 2 }), ["nail", "labels"]));
    expect(on).toContain("It holds 6 pins");
    expect(on).toContain("strength = turns × current = 120");
    expect(on).toContain("60 turns on an iron nail");
    expect(text(render(results({ switchOn: "off" }), ["nail"]))).toContain("the pins drop");
    expect(text(render(results({ core: "none", coilTurns: 100, magnetCurrent: 3 }), ["nail"]))).toContain("Without the iron nail");
  });

  it("marks the north end where the current runs anticlockwise", () => {
    const rec = render(results({ currentDirection: "forward" }), ["nail"]);
    const n = rec.of("fillText").find((c) => c.args[0] === "N")!;
    const s = rec.of("fillText").find((c) => c.args[0] === "S")!;
    expect(n.args[1] as number).toBeGreaterThan(s.args[1] as number);
  });
});

describe("field lines", () => {
  it("run anticlockwise round a current coming towards you", () => {
    const wire = [{ x: 100, y: 100, s: 1 }];
    const [bx, by] = cwFieldAt(wire, 120, 100);
    expect(bx).toBeCloseTo(0, 12);
    expect(by).toBeLessThan(0); // up the canvas, to the right of the wire
    const [ax] = cwFieldAt(wire, 100, 80);
    expect(ax).toBeLessThan(0); // leftwards above the wire
  });

  it("run left to right inside a forward solenoid, so its right end is N", () => {
    const [bx, by] = cwFieldAt(cwSolenoidCurrents(200, 200, 160, 18, 1), 200, 200);
    expect(bx).toBeGreaterThan(0);
    expect(by).toBeCloseTo(0, 9);
  });

  it("close on themselves round a loop", () => {
    const loop = [
      { x: 200, y: 140, s: 1 },
      { x: 200, y: 260, s: -1 },
    ];
    const box = { left: 0, right: 400, top: 0, bottom: 400 };
    expect(cwTrace(loop, 200, 160, box).closed).toBe(true);
    expect(cwTrace(loop, 200, 230, box).closed).toBe(true);
  });

  it("draws more circles round the wire for more current, and the field only with words", () => {
    const few = render(results({ fieldSource: "wire", wireCurrent: 2 }), ["field"]).of("arc").length;
    const many = render(results({ fieldSource: "wire", wireCurrent: 8 }), ["field"]).of("arc").length;
    expect(many).toBeGreaterThan(few);
    const r = results({ fieldSource: "wire", wireCurrent: 5, distance: 2 });
    expect(text(render(r, ["field", "labels"]))).toContain("B = 50 μT");
    expect(text(render(r, ["field"]))).not.toContain("μT");
    expect(text(render(r, ["field"]))).toContain("5 A towards you");
  });

  it("names the poles of a solenoid and the bar magnet", () => {
    expect(text(render(results({ fieldSource: "magnet" }), ["field"]))).toContain("never cross");
    const forward = render(results({ fieldSource: "solenoid", currentDirection: "forward" }), ["field"]);
    const n = forward.of("fillText").find((c) => c.args[0] === "N")!;
    const s = forward.of("fillText").find((c) => c.args[0] === "S")!;
    expect(n.args[1] as number).toBeGreaterThan(s.args[1] as number);
    expect(text(render(results({ fieldSource: "loop" }), ["field"]))).toContain("straight through the middle");
  });
});

describe("the motor", () => {
  it("says which way it turns, and what slip rings do", () => {
    expect(text(render(results({ motorRings: "split" }), ["motor"]))).toContain("Turns clockwise");
    expect(text(render(results({ motorRings: "split", poles: "nRight" }), ["motor"]))).toContain("Turns anticlockwise");
    expect(text(render(results({ motorRings: "slip" }), ["motor"]))).toContain("swings upright and stops");
    expect(text(render(results({ motorCurrent: 0 }), ["motor"]))).toContain("No current");
  });
});

describe("induction and the generator", () => {
  it("kicks the needle when the magnet moves", () => {
    expect(text(render(results({ magnetVelocity: 0 }), ["induction"]))).toContain("still: no current");
    expect(text(render(results({ magnetVelocity: 1 }), ["induction"]))).toContain("kicks right");
    expect(text(render(results({ magnetVelocity: -1 }), ["induction"]))).toContain("kicks left");
    expect(text(render(results({ coilTurns: 50, magnetVelocity: 2 }), ["induction", "labels"]))).toContain("5 div");
  });

  it("gives the reversals each second only with the words on", () => {
    const r = results({ genSpeed: 50, genRings: "slip" });
    expect(text(render(r, ["generator", "labels"]))).toContain("50 Hz: it reverses 100 times a second");
    expect(text(render(r, ["generator"]))).not.toContain("100");
    expect(text(render(results({ genRings: "split" }), ["generator"]))).toContain("always flows one way");
  });
});

describe("on a phone", () => {
  const W = 325;
  const inside = (rec: ReturnType<typeof render>) => {
    for (const call of rec.of("fillText")) {
      const [t, x] = call.args as [string, number];
      expect(x, t).toBeGreaterThanOrEqual(0);
      expect(x, t).toBeLessThanOrEqual(W);
      expect(t.length, t).toBeLessThanOrEqual(55);
    }
    for (const call of [...rec.of("arc"), ...rec.of("ellipse"), ...rec.of("moveTo"), ...rec.of("lineTo")]) {
      const [x, y] = call.args as [number, number];
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(W);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(computeCurrentWorkLayout(W).height);
    }
  };

  it("keeps every scene on a 325 px canvas", () => {
    const layout = computeCurrentWorkLayout(W);
    expect(layout.height).toBeGreaterThanOrEqual(330);
    expect(layout.height).toBeLessThanOrEqual(420);
    const all = (layer: string) => [layer, "labels"];
    inside(render(results({ heatCurrent: 10, coilResistance: 100 }, { seconds: 600 }), all("heat"), W));
    inside(render(results({ bulbs: 10, heaters: 3, fault: "leak", earthed: "earthed", protector: "mcb" }), all("house"), W));
    inside(render(results({ fault: "short" }), all("house"), W));
    inside(render(results({ coilTurns: 100, magnetCurrent: 3 }), all("nail"), W));
    inside(render(results({ coilTurns: 0, switchOn: "off", core: "none" }), all("nail"), W));
    for (const fieldSource of ["magnet", "wire", "loop", "solenoid"] as const) {
      inside(render(results({ fieldSource, wireCurrent: 10, distance: 10 }), all("field"), W));
      inside(render(results({ fieldSource, wireCurrent: 1, distance: 1, currentDirection: "reverse" }), all("field"), W));
    }
    for (const coilAngle of [0, 1, 2.5, 4]) {
      inside(render(results({ motorCurrent: 5, motorRings: "slip" }, { coilAngle }), all("motor"), W));
    }
    inside(render(results({ coilTurns: 100, magnetVelocity: -2, magnetPole: "S" }), all("induction"), W));
    for (const genAngle of [0, 2, 5]) inside(render(results({ genRings: "split" }, { genAngle }), all("generator"), W));
  });
});
