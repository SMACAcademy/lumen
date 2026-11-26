import { defineLevel } from "@ise/game-engine";

const box = (length: number, breadth: number, height: number) => ({
  id: `b${length}-${breadth}-${height}`,
  label: `${length} × ${breadth} × ${height}`,
  given: { length, breadth, height },
});
const card = (id: string, label: string) => ({ id, label });

/** Area and Volume, level 2: a box is layers of unit cubes. */
export const fillingBoxes = defineLevel({
  schemaVersion: 1,
  id: "filling-boxes",
  concept: "area-and-volume",
  title: "Filling boxes",
  summary: "How many cubes fit in a box? Build it layer by layer and the volume formula writes itself.",
  xp: 30,
  steps: [
    {
      id: "stack-layers",
      kind: "explore",
      prompt: "The bottom layer of this box holds **4 × 3 = 12** cubes. Stack layers until it is **2 layers tall**.",
      mode: "box",
      given: { shape: "cuboid", length: 4, breadth: 3, height: 1 },
      controls: ["height"],
      canvas: false,
      goal: { type: "compare", quantity: "height", op: "eq", value: 2 },
      success: "Two layers of 12: 24 cubes. That is the box's volume — length × breadth × height.",
      hints: ["Slide the height up to 2."],
    },
    {
      id: "count-the-cubes",
      kind: "estimate",
      prompt: "A box is **5 long, 4 wide and 3 tall**. How many unit cubes fill it?",
      mode: "box",
      given: { shape: "cuboid", length: 5, breadth: 4, height: 3 },
      canvas: false,
      hideLabels: true,
      quantity: "volume",
      range: { min: 0, max: 120, step: 2 },
      tolerance: 3,
      explanation: "60: each layer holds 5 × 4 = 20 cubes, and there are 3 layers.",
      hints: ["How many cubes in one layer? How many layers?"],
    },
    {
      id: "formulas",
      kind: "match",
      prompt: "**Match** each shape to how you find its size.",
      canvas: false,
      pairs: [
        { left: card("rectangle", "Area of a rectangle"), right: card("lb", "length × breadth") },
        { left: card("triangle", "Area of a triangle"), right: card("half", "½ × base × height") },
        { left: card("box", "Volume of a box"), right: card("lbh", "length × breadth × height") },
        { left: card("circle", "Area of a circle"), right: card("pi", "π × radius × radius") },
      ],
      explanation: "Rectangles are rows of squares, triangles are half of them, boxes are layers of cubes, and a circle covers π — a little more than 3 — radius-squares.",
      hints: ["A volume needs three measurements."],
    },
    {
      id: "catch-24",
      kind: "tap",
      prompt: "**Catch** every box that holds exactly **24** cubes.",
      given: { shape: "cuboid" },
      canvas: false,
      rule: "holds 24 cubes",
      when: { type: "compare", quantity: "volume", op: "eq", value: 24 },
      cards: [box(4, 3, 2), box(2, 3, 4), box(3, 3, 3), box(6, 2, 2), box(5, 5, 1), box(8, 3, 1), box(2, 2, 5), box(12, 2, 1)],
      explanation: "4 × 3 × 2, 2 × 3 × 4, 6 × 2 × 2, 8 × 3 × 1 and 12 × 2 × 1 all make 24. The order you multiply in does not matter.",
      hints: ["Multiply the three numbers."],
    },
    {
      id: "law",
      kind: "discover",
      prompt: "Where the volume formula comes from.",
      mode: "box",
      equation: "cuboid-volume",
      law: "A box is layers of unit cubes: each layer holds length × breadth, and there are height layers. Volume = length × breadth × height.",
    },
  ],
});
