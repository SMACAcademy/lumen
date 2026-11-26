import { describe, expect, it } from "vitest";
import { echoTimeOf, pitchOf, soundModel as model } from "./sound";

const P = model.defaultParams;
const derive = (over: Partial<typeof P> = {}, wallDistance = 170, t = 0) => model.derive({ wallDistance, t }, { ...P, ...over });

describe("how sound travels", () => {
  it("is fastest in steel, then water, then air, and cannot cross a vacuum", () => {
    const [air, water, steel, vacuum] = [derive({ medium: "air" }), derive({ medium: "water" }), derive({ medium: "steel" }), derive({ medium: "vacuum" })];
    expect(air.speed).toBe(343);
    expect(steel.speed).toBeGreaterThan(water.speed);
    expect(water.speed).toBeGreaterThan(air.speed);
    expect(vacuum).toMatchObject({ speed: 0, travels: 0, echoHeard: 0, returned: 0 });
  });

  it("stretches one vibration to a wavelength v / f", () => {
    const r = derive({ frequency: 343 });
    expect(r.wavelength).toBeCloseTo(1, 12);
    expect(r.period).toBeCloseTo(1 / 343, 12);
    expect(derive({ frequency: 686 }).wavelength).toBeCloseTo(0.5, 12);
  });
});

describe("pitch and loudness", () => {
  it("hears a higher pitch for a higher frequency", () => {
    expect([pitchOf(100), pitchOf(300), pitchOf(800)]).toEqual([0, 1, 2]);
    expect(derive({ frequency: 800 }).pitch).toBe(2);
  });

  it("grows louder with the square of the amplitude", () => {
    expect(derive({ amplitude: 6 }).loudness / derive({ amplitude: 3 }).loudness).toBeCloseTo(4, 12);
  });
});

describe("echoes", () => {
  it("come back after t = 2d / v", () => {
    expect(echoTimeOf(171.5, 343)).toBeCloseTo(1, 12);
    expect(derive({}, 171.5).echoTime).toBeCloseTo(1, 12);
    expect(derive({ medium: "vacuum" }).echoTime).toBe(0);
  });

  it("are heard apart from the clap only from a wall at least about 17 m away", () => {
    expect(derive({}, 10).echoHeard).toBe(0);
    expect(derive({}, 20).echoHeard).toBe(1);
  });

  it("follow the clap out to the wall and home again", () => {
    expect(derive({}, 343, 0.5)).toMatchObject({ heading: 1, returned: 0 });
    expect(derive({}, 343, 0.5).pulse).toBeCloseTo(171.5, 9);
    expect(derive({}, 343, 1.5)).toMatchObject({ heading: -1, returned: 0 });
    expect(derive({}, 343, 1.5).pulse).toBeCloseTo(171.5, 9);
    expect(derive({}, 343, 2.1)).toMatchObject({ heading: 0, returned: 1, pulse: 0 });
  });

  it("claps again after the echo is home, and a new wall starts a new clap", () => {
    const s = model.advance({ wallDistance: 171.5, t: 1.49 }, 0.02, P);
    expect(s.t).toBe(0);
    expect(model.setVariable({ wallDistance: 100, t: 0.4 }, "wallDistance", 200, P)).toEqual({ wallDistance: 200, t: 0 });
  });

  it("numbers every output", () => {
    const r = derive();
    for (const key of model.outputs) expect(Number.isFinite(r[key]), key).toBe(true);
  });
});
