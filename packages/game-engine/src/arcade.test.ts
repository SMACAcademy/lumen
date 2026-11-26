import { funWithMagnets, getLevel } from "@ise/content";
import { magnetsModel } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import {
  ARCADE_LIVES,
  type ArcadeAction,
  type ArcadeQuestion,
  type ArcadeState,
  arcadeStart,
  arcadeStep,
  arcadeXp,
  formulaShape,
  isQuizzable,
  pointsFor,
  type RushFormula,
  rushQuestions,
  sprintQuestions,
} from "./arcade";

const question = (id: string): ArcadeQuestion => ({
  id,
  prompt: "Which?",
  item: id,
  itemStyle: "words",
  source: "Test",
  options: [
    { id: "a", label: "A" },
    { id: "b", label: "B" },
  ],
  optionStyle: "words",
  answer: "a",
});
const deck = Array.from({ length: 10 }, (_, i) => question(`q${i}`));
const run = (actions: ArcadeAction[], d: readonly ArcadeQuestion[] = deck): ArcadeState => actions.reduce((s, a) => arcadeStep(s, a, d), arcadeStart());
const right: ArcadeAction = { type: "answer", optionId: "a" };
const wrong: ArcadeAction = { type: "answer", optionId: "b" };
const start: ArcadeAction = { type: "start" };

describe("a round", () => {
  it("scores more the longer the streak", () => {
    expect([1, 2, 3, 4, 5, 6].map(pointsFor)).toEqual([10, 15, 20, 25, 30, 30]);
    expect(run([start, right, right, right])).toMatchObject({ score: 45, streak: 3, correct: 3, index: 3 });
  });

  it("costs a life and the streak for a wrong answer, and ends on the last life", () => {
    const s = run([start, right, right, wrong]);
    expect(s).toMatchObject({ lives: ARCADE_LIVES - 1, streak: 0, bestStreak: 2, wrong: 1, phase: "playing" });
    expect(run([start, right, right, wrong, right])).toMatchObject({ score: 35 });
    expect(run([start, wrong, wrong, wrong])).toMatchObject({ phase: "over", ended: "lives", lives: 0 });
  });

  it("ends when the clock runs out, or the questions do", () => {
    expect(run([start, { type: "tick", dt: 30 }])).toMatchObject({ phase: "playing", timeLeft: 30 });
    expect(run([start, { type: "tick", dt: 30 }, { type: "tick", dt: 31 }])).toMatchObject({ phase: "over", ended: "time", timeLeft: 0 });
    expect(run([start, right, right], [question("x"), question("y")])).toMatchObject({ phase: "over", ended: "deck" });
    expect(run([start], [])).toMatchObject({ phase: "over", ended: "deck" });
  });

  it("ignores answers and ticks before the start and after the end", () => {
    expect(run([right, { type: "tick", dt: 5 }])).toEqual(arcadeStart());
    const over = run([start, wrong, wrong, wrong]);
    expect(arcadeStep(over, right, deck)).toBe(over);
  });

  it("earns one XP per right answer, up to 20", () => {
    expect(arcadeXp(run([start, right, right, wrong]))).toBe(2);
    expect(arcadeXp({ ...arcadeStart(), correct: 35 })).toBe(20);
  });
});

describe("Sort Sprint", () => {
  const level = getLevel("what-sticks")!;
  const questions = sprintQuestions([{ level, concept: funWithMagnets, model: magnetsModel }], "seed");

  it("asks every sort card with the model's bin, in the bins' own order", () => {
    const nail = questions.find((q) => q.id === "what-sticks:sort-them:nail")!;
    expect(nail).toMatchObject({ item: "Iron nail", icon: "nail", answer: "magnetic", source: level.title });
    expect(nail.options.map((o) => o.id)).toEqual(["magnetic", "not"]);
    expect(questions.find((q) => q.id === "what-sticks:sort-them:coin")?.answer).toBe("not");
  });

  it("turns a tap step into yes or no", () => {
    const key = questions.find((q) => q.id === "what-sticks:catch-magnetic:key")!;
    expect(key).toMatchObject({ prompt: "Picked up by a magnet?", answer: "yes" });
    expect(questions.find((q) => q.id === "what-sticks:catch-magnetic:ruler")?.answer).toBe("no");
  });

  it("deals the same deck for the same seed, and another for another", () => {
    const again = sprintQuestions([{ level, concept: funWithMagnets, model: magnetsModel }], "seed");
    expect(again.map((q) => q.id)).toEqual(questions.map((q) => q.id));
    const other = sprintQuestions([{ level, concept: funWithMagnets, model: magnetsModel }], "other");
    expect(other.map((q) => q.id)).not.toEqual(questions.map((q) => q.id));
  });
});

describe("Formula Rush", () => {
  const f = (id: string, title: string, symbolic: string, subject = "physics", grade = 9, topic = id): RushFormula => ({ id, title, symbolic, subject, grade, topic, chapter: "Motion" });
  const bank = [
    f("speed", "Speed", "v = d / t"),
    f("force", "Force", "F = m · a"),
    f("momentum", "Momentum", "p = m · v"),
    f("weight", "Weight", "W = m · g"),
    f("power", "Power", "P = W / t"),
    f("density", "Density", "ρ = m / V", "physics", 8),
    f("area", "Area of a rectangle", "A = l · b", "maths", 6),
    f("words", "Poles", "unlike poles = pull together"),
    f("speed-again", "Speed (again)", "v = d/t"),
  ];
  const questions = rushQuestions(bank, "seed");

  it("skips sentences, and asks each formula once", () => {
    expect(isQuizzable(bank[7]!)).toBe(false);
    expect(isQuizzable(bank[0]!)).toBe(true);
    expect(questions).toHaveLength(7);
    expect(questions.some((q) => q.answer === "speed-again")).toBe(false);
  });

  it("offers four different options, one of them right", () => {
    for (const q of questions) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options.map((o) => o.label)).size).toBe(4);
      expect(q.options.some((o) => o.id === q.answer)).toBe(true);
    }
  });

  it("asks both ways round", () => {
    const byName = questions.find((q) => q.prompt === "Which is the formula?")!;
    expect(byName).toMatchObject({ itemStyle: "words", optionStyle: "formula" });
    expect(byName.options.find((o) => o.id === byName.answer)?.label).toBe(bank.find((b) => b.id === byName.answer)?.symbolic);
    const byFormula = questions.find((q) => q.prompt === "What is this formula?")!;
    expect(byFormula).toMatchObject({ itemStyle: "formula", optionStyle: "words" });
  });

  it("treats the same formula written differently as one", () => {
    expect(formulaShape("V = l · b · h")).toBe(formulaShape("V = l × b × h"));
    expect(formulaShape("1⁄f = 1⁄v − 1⁄u")).toBe(formulaShape("1/ v − 1/u = 1/ f"));
    expect(formulaShape("v = 2 · d / t")).toBe(formulaShape("v = 2d ÷ t"));
    expect(isQuizzable(f("frac", "A fraction", "n/d = n / d"))).toBe(false);
  });

  it("never offers the same law rearranged as a wrong answer", () => {
    const ohm = [f("vir", "Ohm's law", "V = IR", "physics", 10, "ohms-law"), f("ivr", "How much current flows", "I = V / R", "physics", 10, "ohms-law"), ...bank.slice(0, 7)];
    for (const q of rushQuestions(ohm, "o").filter((q) => q.answer === "vir" || q.answer === "ivr")) {
      expect(q.options.map((o) => o.id).filter((id) => id === "vir" || id === "ivr")).toHaveLength(1);
    }
  });

  it("picks wrong answers from the same subject first", () => {
    const speed = rushQuestions(bank.slice(0, 7), "s").find((q) => q.answer === "speed")!;
    expect(speed.options.map((o) => o.id)).not.toContain("area");
  });
});
