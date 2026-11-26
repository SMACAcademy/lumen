import { propertiesOfFluids } from "@ise/content";
import { fluidsModel } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { seededShuffle, sortAnswer, tapAnswer } from "./cards";
import { checkLevelIntegrity } from "./integrity";
import { type Level, LevelSchema, type Step, isGraded } from "./level";
import { cardScore, tapScore } from "./scoring";

const block = (id: string, label: string, density: number) => ({ id, label, given: { blockDensity: density } });
const floatsBins = [
  { id: "floats", label: "Floats", when: { type: "compare" as const, quantity: "floats", op: "eq" as const, value: 1 } },
  { id: "sinks", label: "Sinks", when: { type: "compare" as const, quantity: "floats", op: "eq" as const, value: 0 } },
];

function levelWith(...steps: Step[]): Level {
  return LevelSchema.parse({ schemaVersion: 1, id: "cards", concept: "properties-of-fluids", title: "Cards", summary: "Card games.", xp: 20, steps });
}
const issues = (...steps: Step[]) => checkLevelIntegrity(levelWith(...steps), propertiesOfFluids, fluidsModel).map((i) => i.message);

const sort = (cards: object[]): Step =>
  ({ id: "sort", kind: "sort", prompt: "Float or sink?", given: { fluid: "water" }, bins: floatsBins, cards }) as Step;

describe("card game steps", () => {
  it("parse, and are graded", () => {
    const step = sort([block("cork", "Cork", 240), block("iron", "Iron", 7870)]);
    expect(isGraded(step)).toBe(true);
    expect(() => LevelSchema.parse({ ...levelWith(step), steps: [{ ...step, bins: [floatsBins[0]] }] })).toThrow();
    expect(() =>
      LevelSchema.parse({ ...levelWith(step), steps: [{ id: "m", kind: "match", prompt: "Pair them.", pairs: [{ left: { id: "a", label: "A" }, right: { id: "b", label: "B" } }] }] }),
    ).toThrow();
  });

  it("let the model decide where a card belongs", () => {
    const step = sort([block("cork", "Cork", 240), block("iron", "Iron", 7870)]) as Extract<Step, { kind: "sort" }>;
    expect(sortAnswer(propertiesOfFluids, fluidsModel, step)).toEqual({ cork: "floats", iron: "sinks" });
    expect(issues(step)).toEqual([]);
  });

  it("catch answer keys that contradict the model, or name no bin", () => {
    expect(issues(sort([{ ...block("cork", "Cork", 240), bin: "sinks" }, block("iron", "Iron", 7870)]))).toEqual([
      'card "cork" is typed into "sinks" but the model puts it in "floats"',
    ]);
    expect(issues(sort([{ id: "x", label: "X", bin: "bottom" }, block("iron", "Iron", 7870)]))).toEqual(['card "x" names unknown bin "bottom"']);
    expect(issues(sort([{ id: "x", label: "X" }, block("iron", "Iron", 7870)]))[0]).toMatch(/belongs in no bin/);
  });

  it("check an order against the model", () => {
    const order = (densities: number[]): Step =>
      ({
        id: "order",
        kind: "order",
        prompt: "Least dense first.",
        ends: ["least dense", "most dense"],
        by: "blockMass",
        given: { blockVolume: 20 },
        cards: densities.map((d, i) => block(`b${i}`, `Block ${i}`, d)),
      }) as Step;
    expect(issues(order([240, 900, 7870]))).toEqual([]);
    expect(issues(order([900, 240, 7870]))[0]).toMatch(/does not rise/);
  });

  it("check a tap step has something to catch, and agrees with the model", () => {
    const tap = (cards: object[]): Step =>
      ({ id: "tap", kind: "tap", prompt: "Catch the floaters.", rule: "Floats in water", given: { fluid: "water" }, when: floatsBins[0]!.when, cards }) as Step;
    const step = tap([block("cork", "Cork", 240), block("iron", "Iron", 7870), block("rock", "Rock", 2600)]);
    expect(tapAnswer(propertiesOfFluids, fluidsModel, step as Extract<Step, { kind: "tap" }>)).toEqual({ cork: true, iron: false, rock: false });
    expect(issues(step)).toEqual([]);
    expect(issues(tap([block("iron", "Iron", 7870), block("rock", "Rock", 2600), block("lead", "Lead", 11300)]))).toContain(
      "no card fits the rule, so there is nothing to catch",
    );
    expect(issues(tap([{ ...block("cork", "Cork", 240), correct: false }, block("iron", "Iron", 7870), block("rock", "Rock", 2600)]))[0]).toMatch(
      /typed false but the model says true/,
    );
  });

  it("check a build step's parts are real variables and can reach the goal", () => {
    const build = (variable: string): Step =>
      ({
        id: "build",
        kind: "build",
        prompt: "Make it sink.",
        given: { fluid: "water", blockDensity: 600 },
        goal: floatsBins[1]!.when,
        success: "It sinks.",
        hints: ["Make it denser."],
        parts: [{ variable, label: "Density" }],
      }) as Step;
    expect(issues(build("blockDensity"))).toEqual([]);
    expect(issues(build("nope"))).toContain('part "Density" names unknown variable "nope"');
  });
});

describe("shuffles and scores", () => {
  it("shuffles the same way every time, and never into the answer order", () => {
    const items = ["a", "b", "c", "d"];
    expect(seededShuffle(items, "seed")).toEqual(seededShuffle(items, "seed"));
    for (const seed of ["one", "two", "three", "four", "five", "six"]) {
      const shuffled = seededShuffle(items, seed);
      expect([...shuffled].sort()).toEqual(items);
      expect(shuffled).not.toEqual(items);
    }
  });

  it("scores card games by what was right first time", () => {
    expect(cardScore(3, 4)).toBe(0.75);
    expect(cardScore(0, 4)).toBe(0.3);
    expect(cardScore(4, 4, 1)).toBeCloseTo(0.8);
    expect(tapScore(3, 0, 3)).toBe(1);
    expect(tapScore(3, 1, 3)).toBeCloseTo(2 / 3);
    expect(tapScore(0, 4, 3)).toBe(0.2);
  });
});
