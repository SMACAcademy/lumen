import { defineLevel } from "@ise/game-engine";

/** A card for the point (x, y), with an id like "p-2-m5" for (2, −5). */
const coord = (v: number) => (v < 0 ? `m${-v}` : `${v}`);
const at = (x: number, y: number) => ({ id: `p-${coord(x)}-${coord(y)}`, label: `(${x}, ${y})`.replace(/-/g, "−"), given: { x, y } });

/** Lines and Graphs, level 1: coordinates, and a line as the points that fit its equation. */
export const pointsAndLines = defineLevel({
  schemaVersion: 1,
  id: "points-and-lines",
  concept: "lines-and-graphs",
  title: "Points and lines",
  summary: "Plot points in all four quadrants, then find the ones that sit on y = 2x + 1.",
  xp: 30,
  steps: [
    {
      id: "plot",
      kind: "explore",
      prompt: "**Drag** the point to **(3, −2)**: 3 across, then 2 down.",
      mode: "plot",
      given: { x: 0, y: 0 },
      controls: ["x", "y"],
      goal: {
        type: "all",
        conditions: [
          { type: "compare", quantity: "x", op: "eq", value: 3 },
          { type: "compare", quantity: "y", op: "eq", value: -2 },
        ],
      },
      success: "(3, −2): right 3, down 2 — in the fourth quadrant, where x is positive and y negative.",
      hints: ["x first: across. Then y: up or down.", "Negative y is below the x-axis."],
    },
    {
      id: "quadrants",
      kind: "sort",
      prompt: "**Sort** the points into their quadrants.",
      mode: "plot",
      canvas: false,
      bins: [
        { id: "one", label: "I (+, +)", when: { type: "compare", quantity: "quadrant", op: "eq", value: 1 } },
        { id: "two", label: "II (−, +)", when: { type: "compare", quantity: "quadrant", op: "eq", value: 2 } },
        { id: "three", label: "III (−, −)", when: { type: "compare", quantity: "quadrant", op: "eq", value: 3 } },
        { id: "four", label: "IV (+, −)", when: { type: "compare", quantity: "quadrant", op: "eq", value: 4 } },
      ],
      cards: [at(2, 3), at(-4, 1), at(-2, -5), at(3, -1), at(5, 5), at(-1, 6), at(-3, -3), at(6, -2)],
      explanation: "The signs decide: (+, +) is I, (−, +) is II, (−, −) is III and (+, −) is IV — anticlockwise from the top right.",
      hints: ["Look at the signs of x and y."],
    },
    {
      id: "onto-the-line",
      kind: "explore",
      prompt: "Here is the line **y = 2x + 1**. Drag the point onto the line **at x = 3**.",
      mode: "point",
      given: { m: 2, c: 1, x: 0, y: 0 },
      controls: ["x", "y"],
      goal: {
        type: "all",
        conditions: [
          { type: "compare", quantity: "x", op: "eq", value: 3 },
          { type: "compare", quantity: "onLine", op: "eq", value: 1 },
        ],
      },
      success: "(3, 7): 2 × 3 + 1 = 7. The point is on the line because it makes the equation true.",
      hints: ["At x = 3, y = 2 × 3 + 1."],
    },
    {
      id: "steeper",
      kind: "predict",
      prompt: "The slope of **y = mx** goes up from **1** to **3**. At **x = 2**, what happens to the line's height?",
      mode: "point",
      variable: "m",
      from: 1,
      to: 3,
      quantity: "lineY",
      options: ["increase", "decrease", "same"],
      given: { c: 0, x: 2, y: 0 },
      explanation: "It goes from 2 to 6. The slope is how much the line climbs for every 1 across.",
    },
    {
      id: "on-or-off",
      kind: "sort",
      prompt: "Which points are **on y = 2x + 1**?",
      mode: "point",
      given: { m: 2, c: 1 },
      canvas: false,
      bins: [
        { id: "on", label: "On the line", when: { type: "compare", quantity: "onLine", op: "eq", value: 1 } },
        { id: "off", label: "Off the line", when: { type: "compare", quantity: "onLine", op: "eq", value: 0 } },
      ],
      cards: [at(1, 3), at(2, 5), at(0, 1), at(-1, -1), at(2, 4), at(3, 6), at(0, 0), at(-2, 3)],
      explanation: "Put x in: 2 × 1 + 1 = 3, 2 × 2 + 1 = 5, 2 × 0 + 1 = 1, 2 × (−1) + 1 = −1. The other points miss.",
      hints: ["Work out 2x + 1 and compare with y."],
    },
    {
      id: "law",
      kind: "discover",
      prompt: "What the line is.",
      mode: "point",
      equation: "slope-intercept",
      law: "The graph of y = mx + c is a straight line of every point that makes it true: m is the slope, and c is where it crosses the y-axis.",
    },
  ],
});
