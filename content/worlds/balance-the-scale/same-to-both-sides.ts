import { defineLevel } from "@ise/game-engine";

const eq = (id: string, label: string, a: number, b: number, c: number, d: number) => ({ id, label, given: { a, b, c, d } });
const card = (id: string, label: string) => ({ id, label });

/** Balance the Scale, level 2: solving by doing the same to both sides. */
export const sameToBothSides = defineLevel({
  schemaVersion: 1,
  id: "same-to-both-sides",
  concept: "balance-the-scale",
  title: "Same to both sides",
  summary: "No more guessing: take the same off both pans and the scale stays level — until the box is alone.",
  xp: 30,
  steps: [
    {
      id: "units-off",
      kind: "build",
      prompt: "**2x + 3 = 11** is balanced. Take units off **both sides at once** until the boxes are alone on their pan.",
      mode: "scale",
      given: { a: 2, b: 3, c: 0, d: 11, x: 4, take: 0, takeX: 0 },
      canvas: false,
      parts: [{ variable: "take", label: "Units off both sides" }],
      goal: { type: "compare", quantity: "isolated", op: "eq", value: 1 },
      success: "2x = 8. The scale never moved — and now two boxes weigh 8, so one weighs 4.",
      retry: "The boxes still have units with them.",
      hints: ["There are 3 units with the boxes.", "Take 3 off both sides."],
    },
    {
      id: "boxes-both-sides",
      kind: "target",
      prompt: "**3x + 2 = x + 10** has boxes on both sides. Take boxes and units off both sides until **boxes are alone** on one side.",
      mode: "scale",
      given: { a: 3, b: 2, c: 1, d: 10, x: 4, take: 0, takeX: 0 },
      controls: ["takeX", "take"],
      canvas: false,
      goal: { type: "compare", quantity: "isolated", op: "eq", value: 1 },
      success: "Take one box and 2 units off each side: 2x = 8, so x = 4.",
      retry: "Not alone yet. Clear the boxes off one side and the units off the other.",
      hints: ["Take one box off both sides first.", "Then take 2 units off both sides."],
    },
    {
      id: "smallest-answer",
      kind: "order",
      prompt: "Put these equations in order of their answer, **smallest first**.",
      mode: "scale",
      canvas: false,
      ends: ["smallest x", "largest x"],
      by: "solution",
      cards: [eq("two", "x + 1 = 3", 1, 1, 0, 3), eq("three", "2x = 6", 2, 0, 0, 6), eq("five", "x + 2 = 7", 1, 2, 0, 7), eq("seven", "3x = 21", 3, 0, 0, 21)],
      explanation: "x + 1 = 3 gives 2; 2x = 6 gives 3; x + 2 = 7 gives 5; 3x = 21 gives 7.",
      hints: ["Take the units away, then share out what is left."],
    },
    {
      id: "word-problems",
      kind: "match",
      prompt: "**Match** each story to its equation.",
      canvas: false,
      pairs: [
        { left: card("age", "Riya's age plus 5 is 12"), right: card("plus-five", "x + 5 = 12") },
        { left: card("pens", "Three pens cost ₹24"), right: card("three-x", "3x = 24") },
        { left: card("double", "Double a number, add 1, and get 9"), right: card("two-x-one", "2x + 1 = 9") },
        { left: card("minus", "A number take away 4 is 10"), right: card("minus-four", "x − 4 = 10") },
      ],
      explanation: "The unknown becomes x; 'plus' is +, 'times' or 'three of' is a number in front of x, and 'is' is =.",
      hints: ["Which story has three of something?"],
    },
    {
      id: "law",
      kind: "discover",
      prompt: "How to solve without guessing.",
      mode: "scale-only",
      equation: "same-both-sides",
      law: "Do the same to both sides and an equation stays balanced. Take away until the unknown is alone, then share out: that is its value.",
    },
  ],
});
