import { defineLevel } from "@ise/game-engine";

const twelve = { type: "compare", quantity: "area", op: "eq", value: 12, tolerance: 0.001 } as const;
const rect = (id: string, label: string, length: number, breadth: number) => ({ id, label, given: { shape: "rectangle", length, breadth } });

/** Area and Volume, level 1: area as squares covered, perimeter as the walk round, and the triangle as half a rectangle. */
export const countingSquares = defineLevel({
  schemaVersion: 1,
  id: "counting-squares",
  concept: "area-and-volume",
  title: "Counting squares",
  summary: "Area is how many squares a shape covers; perimeter is the walk round its edge. They are not the same thing.",
  xp: 25,
  steps: [
    {
      id: "four-by-three",
      kind: "explore",
      prompt: "Make a rectangle **4 squares long** and **3 squares tall**. Drag its corner, or use the sliders.",
      mode: "flat",
      given: { shape: "rectangle", length: 1, breadth: 1 },
      controls: ["length", "breadth"],
      goal: {
        type: "all",
        conditions: [
          { type: "compare", quantity: "length", op: "eq", value: 4 },
          { type: "compare", quantity: "breadth", op: "eq", value: 3 },
        ],
      },
      success: "12 squares: 3 rows of 4. That is its area — length × breadth.",
      hints: ["4 along the bottom, 3 up the side."],
    },
    {
      id: "area-and-perimeter",
      kind: "target",
      prompt: "Make a rectangle with an **area of 24** squares and a **perimeter of 20**.",
      mode: "flat",
      given: { shape: "rectangle", length: 1, breadth: 1 },
      controls: ["length", "breadth"],
      goal: {
        type: "all",
        conditions: [
          { type: "compare", quantity: "area", op: "eq", value: 24 },
          { type: "compare", quantity: "perimeter", op: "eq", value: 20 },
        ],
      },
      success: "6 × 4: 24 squares, and 6 + 4 + 6 + 4 = 20 round the edge. 12 × 2 also covers 24 squares, but its edge is 28.",
      retry: "Not both yet. Area counts the squares; perimeter walks the edge.",
      hints: ["Which two numbers multiply to 24 and add to 10?", "Try 6 and 4."],
    },
    {
      id: "double-breadth",
      kind: "predict",
      prompt: "A rectangle **4 long** has its breadth doubled, from **3 to 6**. What happens to its **area**?",
      variable: "breadth",
      from: 3,
      to: 6,
      quantity: "area",
      options: ["increase", "decrease", "same"],
      given: { shape: "rectangle", length: 4 },
      explanation: "It doubles, from 12 to 24 squares: twice as many rows of 4.",
    },
    {
      id: "area-twelve",
      kind: "sort",
      prompt: "**Sort** these shapes: area 12, or not?",
      mode: "flat",
      canvas: false,
      bins: [
        { id: "twelve", label: "Area 12", when: twelve },
        { id: "not", label: "Not 12", when: { type: "not", condition: twelve } },
      ],
      cards: [
        rect("r34", "Rectangle 4 × 3", 4, 3),
        rect("r26", "Rectangle 6 × 2", 6, 2),
        rect("r44", "Rectangle 4 × 4", 4, 4),
        rect("r52", "Rectangle 5 × 2", 5, 2),
        { id: "t64", label: "Triangle, base 6, height 4", given: { shape: "triangle", length: 6, breadth: 4 } },
        { id: "t43", label: "Triangle, base 4, height 3", given: { shape: "triangle", length: 4, breadth: 3 } },
        { id: "p43", label: "Parallelogram, base 4, height 3", given: { shape: "parallelogram", length: 4, breadth: 3 } },
      ],
      explanation: "4 × 3, 6 × 2, the 6-by-4 triangle (half of 24) and the parallelogram (4 × 3, leaning) all cover 12 squares.",
      hints: ["A triangle is half the rectangle around it."],
    },
    {
      id: "smallest-first",
      kind: "order",
      prompt: "Put these shapes in order of **area**, smallest first.",
      mode: "flat",
      canvas: false,
      ends: ["smallest", "largest"],
      by: "area",
      cards: [
        { id: "triangle", label: "Triangle, base 4, height 3", given: { shape: "triangle", length: 4, breadth: 3 } },
        rect("square", "Square 3 × 3", 3, 3),
        { id: "parallelogram", label: "Parallelogram, base 5, height 2", given: { shape: "parallelogram", length: 5, breadth: 2 } },
        { id: "circle", label: "Circle, radius 2", given: { shape: "circle", radius: 2 } },
        rect("big-square", "Square 4 × 4", 4, 4),
      ],
      explanation: "6, 9, 10, about 12.6 and 16 squares. A circle of radius 2 covers a bit more than three 2 × 2 squares.",
      hints: ["Work each one out: a triangle is half its rectangle."],
    },
    {
      id: "law",
      kind: "discover",
      prompt: "Where the area formula comes from.",
      mode: "flat",
      equation: "rect-area",
      law: "A rectangle is rows of unit squares, so its area is length × breadth. A triangle is half of its rectangle; a parallelogram has the area of a rectangle with the same base and height.",
    },
  ],
});
