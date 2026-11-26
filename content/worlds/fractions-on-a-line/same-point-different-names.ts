import { defineLevel } from "@ise/game-engine";

const frac = (n: number, d: number) => ({ id: `f${n}-${d}`, label: `${n}/${d}`, given: { n, d } });
const card = (id: string, label: string) => ({ id, label });

/** Fractions on a Line, level 2: equivalent fractions — one point, many names. */
export const samePointDifferentNames = defineLevel({
  schemaVersion: 1,
  id: "same-point-different-names",
  concept: "fractions-on-a-line",
  title: "Same point, different names",
  summary: "3/4 and 6/8 land in exactly the same place. Find out why, and spot fractions that are secretly equal.",
  xp: 30,
  steps: [
    {
      id: "land-on-it",
      kind: "target",
      prompt: "The top point is at **3/4**. The bottom line is cut into **eighths**. Drag the bottom point to the **same place**.",
      mode: "two-lines",
      given: { n: 3, d: 4, d2: 8, n2: 0, max: 1 },
      goal: { type: "compare", quantity: "equal", op: "eq", value: 1 },
      success: "6/8 lands on 3/4. Each quarter is two eighths, so three quarters is six eighths.",
      retry: "Not the same place yet. Line the two points up.",
      hints: ["Each quarter is cut into two eighths.", "Count six eighths."],
    },
    {
      id: "pairs",
      kind: "match",
      prompt: "**Match** each fraction with another name for the same point.",
      canvas: false,
      pairs: [
        { left: card("half", "1/2"), right: card("two-quarters", "2/4") },
        { left: card("third", "1/3"), right: card("two-sixths", "2/6") },
        { left: card("three-quarters", "3/4"), right: card("six-eighths", "6/8") },
        { left: card("two-fifths", "2/5"), right: card("four-tenths", "4/10") },
      ],
      explanation: "Each pair is the same fraction with its top and bottom multiplied by 2.",
      hints: ["Double the top and the bottom."],
    },
    {
      id: "half-sort",
      kind: "sort",
      prompt: "**Sort** these: less than a half, or more than a half?",
      mode: "one-line",
      given: { max: 1 },
      canvas: false,
      bins: [
        { id: "less", label: "Less than ½", when: { type: "compare", quantity: "value", op: "lt", value: 0.5 } },
        { id: "more", label: "More than ½", when: { type: "compare", quantity: "value", op: "gt", value: 0.5 } },
      ],
      cards: [frac(1, 3), frac(3, 8), frac(2, 5), frac(2, 3), frac(5, 8), frac(4, 5)],
      explanation: "A fraction is more than a half when its top number is more than half its bottom number: 5/8 is more, because 5 is more than 4.",
      hints: ["What is half of the bottom number?"],
    },
    {
      id: "catch-halves",
      kind: "tap",
      prompt: "**Catch** every fraction that is exactly one half.",
      given: { max: 1 },
      canvas: false,
      rule: "equal to ½",
      when: { type: "compare", quantity: "value", op: "eq", value: 0.5, tolerance: 0.0001 },
      cards: [frac(2, 4), frac(1, 3), frac(3, 6), frac(4, 8), frac(2, 3), frac(5, 10), frac(3, 5), frac(6, 12)],
      explanation: "2/4, 3/6, 4/8, 5/10 and 6/12 are all one half: the top is exactly half the bottom.",
      hints: ["Is the top number exactly half of the bottom one?"],
    },
    {
      id: "law",
      kind: "discover",
      prompt: "Why one point has many names.",
      mode: "two-lines",
      equation: "equivalent",
      law: "Multiply the top and the bottom of a fraction by the same number and it lands on the same point: more pieces, each one smaller.",
    },
  ],
});
