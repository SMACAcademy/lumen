import { describe, expect, it } from "vitest";
import {
  WAVE_CLOCK_LOOP,
  WAVE_LIMITS,
  WAVE_SYSTEM_ORDER,
  waveAirDensity,
  waveDopplerFrequency,
  waveLoudnessBand,
  waveMotionModel as model,
  waveSoundLevel,
  waveSoundSpeed,
  waveStringSpeed,
  type WaveMotionParams,
  type WaveMotionState,
} from "./wavemotion";

const P = model.defaultParams;
const derive = (state: Partial<WaveMotionState> = {}, params: Partial<WaveMotionParams> = {}) =>
  model.derive({ ...model.initialize(P), ...state }, { ...P, ...params });

describe("a travelling wave", () => {
  it("runs along a string at v = √(T/μ)", () => {
    expect(waveStringSpeed(100, 10)).toBeCloseTo(100, 12);
    expect(derive({ tension: 400 }).stringSpeed).toBeCloseTo(200, 12);
    expect(derive({ tension: 100, density: 40 }).stringSpeed).toBeCloseTo(50, 12);
  });

  it("has v = fλ, k = 2π/λ and ω = 2πf", () => {
    const r = derive({ tension: 100, density: 10, frequency: 50 });
    expect(r).toMatchObject({ speed: 100, wavelength: 2, period: 0.02 });
    expect(r.wavenumber).toBeCloseTo(Math.PI, 12);
    expect(r.angularFrequency).toBeCloseTo(100 * Math.PI, 12);
    expect(r.speed / r.wavelength).toBeCloseTo(r.frequency, 12);
    // The particles move far slower than the wave: Aω = 0.010 × 100π ≈ 3.1 m/s.
    expect(r.maxParticleSpeed).toBeCloseTo(Math.PI, 12);
  });

  it("is transverse on a string and longitudinal in air, where it moves at the speed of sound", () => {
    expect(derive({}, { medium: "string" }).transverse).toBe(1);
    const air = derive({ frequency: 343 }, { medium: "air" });
    expect(air.transverse).toBe(0);
    expect(air.speed).toBe(air.soundSpeed);
    expect(air.wavelength).toBeCloseTo(1, 2);
  });
});

describe("the speed of sound in air", () => {
  it("is 331 m/s at 0 °C and 343 m/s at 20 °C (Laplace)", () => {
    expect(waveSoundSpeed(0)).toBeCloseTo(331.3, 1);
    expect(waveSoundSpeed(20)).toBeCloseTo(343.2, 1);
    expect(derive({ temperature: 0 }).soundSpeed).toBeCloseTo(331.3, 1);
  });

  it("would be only 280 m/s at 0 °C by Newton's isothermal formula, γ = 1.4 times too small squared", () => {
    const r = derive({ temperature: 0 });
    expect(r.newtonSpeed).toBeCloseTo(280.0, 1);
    expect((r.soundSpeed / r.newtonSpeed) ** 2).toBeCloseTo(1.4, 10);
  });

  it("does not depend on the pressure, because ρ rises with P", () => {
    expect(derive({ pressure: 200 }).soundSpeed).toBeCloseTo(derive({ pressure: 100 }).soundSpeed, 10);
    expect(derive({ pressure: 200 }).airDensity).toBeCloseTo(2 * derive({ pressure: 100 }).airDensity, 10);
    expect(waveAirDensity(101.3, 0)).toBeCloseTo(1.29, 2);
  });

  it("rises as √T with the absolute temperature", () => {
    const ratio = derive({ temperature: 50 }).soundSpeed / derive({ temperature: -20 }).soundSpeed;
    expect(ratio).toBeCloseTo(Math.sqrt(323.15 / 253.15), 10);
  });
});

describe("superposition and reflection", () => {
  it("adds two equal waves to an amplitude 2A|cos(φ/2)|", () => {
    expect(derive({ amplitude: 10, phaseDifference: 0 })).toMatchObject({ resultant: 20, interference: 2 });
    expect(derive({ amplitude: 10, phaseDifference: 360 })).toMatchObject({ resultant: 20, interference: 2 });
    expect(derive({ amplitude: 10, phaseDifference: 180 })).toMatchObject({ resultant: 0, interference: 0 });
    expect(derive({ amplitude: 10, phaseDifference: 90 }).resultant).toBeCloseTo(10 * Math.SQRT2, 12);
    expect(derive({ amplitude: 10, phaseDifference: 90 }).interference).toBe(1);
  });

  it("turns the pulse upside down at a fixed end, a phase change of π, and not at a free end", () => {
    expect(derive({}, { end: "fixed" })).toMatchObject({ reflectedSign: -1, phaseChange: 180 });
    expect(derive({}, { end: "free" })).toMatchObject({ reflectedSign: 1, phaseChange: 0 });
  });

  it("sends the pulse out, then back after it reaches the end", () => {
    expect(derive({ clock: 0 })).toMatchObject({ reflected: 0 });
    expect(derive({ clock: 0 }).pulseCentre).toBeCloseTo(-0.1, 12);
    expect(derive({ clock: 3 }).pulseCentre).toBeCloseTo(1, 12);
    expect(derive({ clock: 4 })).toMatchObject({ reflected: 1 });
    let s = model.initialize(P);
    for (let i = 0; i < 80; i++) s = model.advance(s, 0.05, P);
    expect(model.derive(s, P).reflected).toBe(1);
  });
});

describe("standing waves", () => {
  it("on a string fixed at both ends have f = nv/2L, with n + 1 nodes", () => {
    const r = derive({ tension: 100, density: 10, length: 1, harmonic: 3 }, { system: "string" });
    expect(r).toMatchObject({ standingFrequency: 150, fundamental: 50, harmonicNumber: 3, nodes: 4, antinodes: 3 });
    expect(r.standingWavelength).toBeCloseTo(2 / 3, 12);
  });

  it("in a pipe closed at one end have only odd harmonics, f = (2n − 1)v/4L", () => {
    const v = waveSoundSpeed(20);
    const closed = (n: number) => derive({ length: 0.5, harmonic: n }, { system: "closed" });
    expect(closed(1).standingFrequency).toBeCloseTo(v / 2, 10);
    expect(closed(2)).toMatchObject({ harmonicNumber: 3, nodes: 2, antinodes: 2 });
    expect(closed(2).standingFrequency / closed(1).standingFrequency).toBeCloseTo(3, 12);
    expect(closed(3).standingWavelength).toBeCloseTo((4 * 0.5) / 5, 12);
  });

  it("in a pipe open at both ends have every harmonic, starting an octave above the closed pipe", () => {
    const open = derive({ length: 0.5, harmonic: 1 }, { system: "open" });
    const closed = derive({ length: 0.5, harmonic: 1 }, { system: "closed" });
    expect(open.standingFrequency / closed.standingFrequency).toBeCloseTo(2, 12);
    expect(derive({ length: 0.5, harmonic: 2 }, { system: "open" })).toMatchObject({ harmonicNumber: 2, nodes: 2, antinodes: 3 });
  });

  it("orders the notes of a 50 cm pipe", () => {
    const f = (system: WaveMotionParams["system"], harmonic: number) => derive({ length: 0.5, harmonic }, { system }).standingFrequency;
    const notes = [f("closed", 1), f("open", 1), f("closed", 2), f("open", 2), f("closed", 3)];
    for (let i = 1; i < notes.length; i++) expect(notes[i]).toBeGreaterThan(notes[i - 1]!);
    expect(notes[0]).toBeCloseTo(171.6, 1);
  });

  it("steps to the next mode, and keeps the mode whole", () => {
    expect(model.step(model.initialize(P), P, 1).harmonic).toBe(2);
    expect(model.step({ ...model.initialize(P), harmonic: 6 }, P, 1).harmonic).toBe(6);
    expect(model.setVariable(model.initialize(P), "harmonic", 2.6, P).harmonic).toBe(3);
  });
});

describe("the resonance tube", () => {
  it("resonates at L + e = λ/4 and 3λ/4, with e = 0.3d", () => {
    const r = derive({ frequency: 512, temperature: 20, diameter: 3 });
    const lambda = waveSoundSpeed(20) / 512;
    expect(r.endCorrection).toBeCloseTo(0.9, 12);
    expect(r.firstResonance).toBeCloseTo(lambda * 25 - 0.9, 10);
    expect(r.firstResonance).toBeCloseTo(15.86, 2);
    expect(r.secondResonance).toBeCloseTo(49.37, 2);
    expect(r.secondResonance - r.firstResonance).toBeCloseTo(lambda * 50, 10);
  });

  it("gives v = 2f(l₂ − l₁), free of the end correction", () => {
    expect(derive({ frequency: 512, diameter: 6 }).tubeSpeed).toBeCloseTo(waveSoundSpeed(20), 10);
  });

  it("names the resonance the column is at", () => {
    expect(derive({ frequency: 512, column: 15.9 })).toMatchObject({ resonanceOrder: 1 });
    expect(derive({ frequency: 512, column: 49.4 })).toMatchObject({ resonanceOrder: 2 });
    expect(derive({ frequency: 512, column: 30 })).toMatchObject({ resonanceOrder: 0 });
    expect(derive({ frequency: 512, column: 15.9 }).response).toBeGreaterThan(0.99);
    expect(derive({ frequency: 512, column: 30 }).response).toBeLessThan(0.01);
  });
});

describe("beats", () => {
  it("come |f₁ − f₂| times a second", () => {
    expect(derive({ frequency: 256, frequency2: 260 })).toMatchObject({ beatFrequency: 4, beatPeriod: 0.25, averageFrequency: 258 });
    expect(derive({ frequency: 260, frequency2: 258 }).beatFrequency).toBe(derive({ frequency: 260, frequency2: 262 }).beatFrequency);
    expect(derive({ frequency: 300, frequency2: 300 })).toMatchObject({ beatFrequency: 0, beatPeriod: 0 });
  });
});

describe("the Doppler effect", () => {
  it("raises the pitch of an approaching source: f′ = f v/(v − v_s)", () => {
    const v = waveSoundSpeed(20);
    const r = derive({ frequency: 500, sourceSpeed: 30 });
    expect(r.observedFrequency).toBeCloseTo((500 * v) / (v - 30), 10);
    expect(r.observedFrequency).toBeCloseTo(547.9, 1);
    expect(r).toMatchObject({ pitchChange: 1 });
    expect(r.wavelengthAhead).toBeCloseTo((v - 30) / 500, 12);
  });

  it("lowers it for a receding source or observer, and uses f′ = f(v + v_o)/v for a moving observer", () => {
    const v = waveSoundSpeed(20);
    expect(derive({ frequency: 500, sourceSpeed: -30 }).pitchChange).toBe(-1);
    expect(derive({ frequency: 500, observerSpeed: -50 }).observedFrequency).toBeCloseTo((500 * (v - 50)) / v, 10);
    expect(waveDopplerFrequency(500, 340, 34, 0)).toBeCloseTo(550, 10);
  });

  it("leaves the pitch alone when both move the same way at the same speed", () => {
    expect(derive({ frequency: 500, sourceSpeed: 20, observerSpeed: -20 })).toMatchObject({ observedFrequency: 500, dopplerShift: 0, pitchChange: 0 });
    expect(derive({ frequency: 500 })).toMatchObject({ dopplerShift: 0, pitchChange: 0, mach: 0 });
  });
});

describe("intensity and decibels", () => {
  it("spreads the power over a sphere, I = P/4πr², and measures β = 10 log₁₀(I/I₀)", () => {
    const r = derive({ power: 1, distance: 10 });
    expect(r.intensity).toBeCloseTo(1 / (400 * Math.PI), 15);
    expect(r.level).toBeCloseTo(89.0, 1);
    expect(derive({ power: 1, distance: 1 }).level).toBeCloseTo(109.0, 1);
    expect(waveSoundLevel(1e-12)).toBeCloseTo(0, 12);
    expect(waveSoundLevel(1)).toBeCloseTo(120, 12);
  });

  it("drops 6 dB each time the distance doubles, and gains 10 dB for ten times the power", () => {
    expect(derive({ distance: 2 }).level - derive({ distance: 4 }).level).toBeCloseTo(6.02, 2);
    expect(derive({ power: 5 }).level - derive({ power: 0.5 }).level).toBeCloseTo(10, 10);
  });

  it("names how loud it is", () => {
    expect([10, 45, 70, 100, 130].map(waveLoudnessBand)).toEqual([0, 1, 2, 3, 4]);
  });
});

describe("the model", () => {
  it("loops the clock and clamps every control", () => {
    expect(model.advance({ ...model.initialize(P), clock: WAVE_CLOCK_LOOP - 0.01 }, 0.02, P).clock).toBeCloseTo(0.01, 10);
    for (const [id, [lo, hi]] of Object.entries(WAVE_LIMITS)) {
      expect(model.setVariable(model.initialize(P), id, hi + 1000, P)[id as keyof WaveMotionState], id).toBe(hi);
      expect(model.setVariable(model.initialize(P), id, lo - 1000, P)[id as keyof WaveMotionState], id).toBe(lo);
    }
    expect(model.setVariable(model.initialize(P), "nonsense", 5, P)).toEqual(model.initialize(P));
  });

  it("numbers every output, at the ends of every range", () => {
    for (const system of WAVE_SYSTEM_ORDER) {
      for (const edge of [0, 1] as const) {
        const state = Object.fromEntries(Object.entries(WAVE_LIMITS).map(([id, range]) => [id, range[edge]])) as unknown as WaveMotionState;
        for (const medium of ["string", "air"] as const) {
          const r = model.derive(state, { medium, end: "free", system });
          for (const key of model.outputs) {
            expect(Number.isFinite(r[key]), `${system} ${edge} ${medium} ${key}`).toBe(true);
            expect(Object.is(r[key], -0), `${key} is −0`).toBe(false);
          }
        }
      }
    }
  });
});
