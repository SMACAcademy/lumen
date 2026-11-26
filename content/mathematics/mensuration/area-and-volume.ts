import { defineConcept } from "@ise/concept-schema";

/**
 * Mensuration for class 6 to 8: area, perimeter and volume you can count.
 *
 * Area is the unit squares a shape covers and perimeter the walk round its
 * edge — two different things, which is why the same area can have very
 * different perimeters. Triangles are half their rectangle, parallelograms
 * keep their base and height, circles cover about three radius-squares. A
 * box is layers of unit cubes, and its surface unfolds into a net of six
 * rectangles in three matching pairs: 2(lb + bh + hl) squares.
 */
export const areaAndVolume = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "area-and-volume",
    title: "Area and Volume",
    tagline: "Count the squares a shape covers and the cubes a box holds — and see where the formulas come from.",
    domain: "mathematics",
    category: "mensuration",
    grade: { min: 6, max: 8 },
    difficulty: "introductory",
    estimatedMinutes: 15,
    objective:
      "Find area by counting unit squares and as length × breadth, tell area from perimeter, see a triangle as half its rectangle, find a cuboid's volume as layers of unit cubes, and its surface area by unfolding its net.",
    tags: ["area", "perimeter", "volume", "surface area", "net", "mensuration", "class 6", "class 7", "class 8"],
  },

  connections: [
    {
      id: "round-solids-and-similarity",
      title: "Round Solids and Similar Shapes",
      domain: "mathematics",
      relation: "leads-to",
      note: "Cylinders, cones and spheres follow the same counting idea.",
      available: true,
    },
  ],

  variables: [
    {
      id: "length",
      symbol: "l",
      name: "Length",
      meaning: "How many units along. Drag the shape's corner, or use the slider.",
      binding: { kind: "state", key: "length" },
      control: { type: "range", unit: "cm", min: 1, max: 12, step: 1 },
      group: "primary",
      color: "sine",
    },
    {
      id: "breadth",
      symbol: "b",
      name: "Breadth (or height of a triangle)",
      meaning: "How many units up — or, for a box, how many deep.",
      binding: { kind: "state", key: "breadth" },
      control: { type: "range", unit: "cm", min: 1, max: 12, step: 1 },
      group: "primary",
      color: "cosine",
    },
    {
      id: "height",
      symbol: "h",
      name: "Height of the box",
      meaning: "How many layers of cubes the box has.",
      binding: { kind: "state", key: "height" },
      control: { type: "range", unit: "cm", min: 1, max: 10, step: 1 },
      group: "primary",
      color: "tangent",
    },
    {
      id: "radius",
      symbol: "r",
      name: "Radius",
      meaning: "From the centre of the circle to its edge.",
      binding: { kind: "state", key: "radius" },
      control: { type: "range", unit: "cm", min: 1, max: 6, step: 1 },
      group: "primary",
      color: "angle",
    },
    {
      id: "shape",
      symbol: "shape",
      name: "Shape",
      meaning: "Which shape to measure.",
      binding: { kind: "param", key: "shape" },
      control: {
        type: "choice",
        options: [
          { value: "rectangle", label: "Rectangle" },
          { value: "triangle", label: "Triangle" },
          { value: "parallelogram", label: "Parallelogram" },
          { value: "circle", label: "Circle" },
          { value: "cuboid", label: "Box (cuboid)" },
        ],
      },
      group: "primary",
      color: "neutral",
    },
  ],

  quantities: [
    {
      id: "area",
      symbol: "A",
      name: "Area",
      meaning: "How many unit squares the shape covers.",
      result: "area",
      format: { kind: "number", digits: 1 },
      unit: "cm2",
      color: "sine",
      highlight: "shape",
      headline: true,
    },
    {
      id: "perimeter",
      symbol: "P",
      name: "Perimeter",
      meaning: "How far it is all the way round the edge.",
      result: "perimeter",
      format: { kind: "number", digits: 1 },
      unit: "cm",
      color: "cosine",
      highlight: "shape",
      headline: true,
    },
    {
      id: "volume",
      symbol: "V",
      name: "Volume",
      meaning: "How many unit cubes the box holds.",
      result: "volume",
      format: { kind: "number", digits: 0 },
      unit: "cm3",
      color: "tangent",
      highlight: "shape",
      headline: true,
    },
    {
      id: "surfaceArea",
      symbol: "S",
      name: "Surface area",
      meaning: "How many unit squares would cover every face of the box.",
      result: "surfaceArea",
      format: { kind: "number", digits: 0 },
      unit: "cm2",
      color: "vector",
      highlight: "shape",
    },
    {
      id: "squares",
      symbol: "whole squares",
      name: "Whole squares inside",
      meaning: "Unit squares lying completely inside the shape.",
      result: "squares",
      format: { kind: "number", digits: 0 },
      color: "angle",
      highlight: "grid",
    },
    {
      id: "faceLB",
      symbol: "lb",
      name: "Top (and bottom) face",
      meaning: "Length × breadth: the top of the box, and the bottom is the same.",
      result: "faceLB",
      format: { kind: "number", digits: 0 },
      unit: "cm2",
      color: "sine",
      highlight: "net",
    },
    {
      id: "faceLH",
      symbol: "hl",
      name: "Front (and back) face",
      meaning: "Length × height: the front of the box, and the back is the same.",
      result: "faceLH",
      format: { kind: "number", digits: 0 },
      unit: "cm2",
      color: "cosine",
      highlight: "net",
    },
    {
      id: "faceBH",
      symbol: "bh",
      name: "End face (two of them)",
      meaning: "Breadth × height: each end of the box.",
      result: "faceBH",
      format: { kind: "number", digits: 0 },
      unit: "cm2",
      color: "tangent",
      highlight: "net",
    },
  ],

  equations: [
    {
      id: "rect-area",
      topic: "area-rectangle",
      title: "Area of a rectangle",
      words: "area = length × breadth",
      tokens: [
        { kind: "ref", id: "area" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "length" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "breadth" },
      ],
      reading: "A rectangle is rows of unit squares: breadth rows, each length squares long.",
      assumptions: ["A rectangle"],
      discoverable: true,
    },
    {
      id: "rect-perimeter",
      topic: "perimeter",
      title: "Perimeter of a rectangle",
      words: "perimeter = 2 × (length + breadth)",
      tokens: [
        { kind: "ref", id: "perimeter" },
        { kind: "op", value: "=" },
        { kind: "text", value: "2 × (" },
        { kind: "ref", id: "length" },
        { kind: "op", value: "+" },
        { kind: "ref", id: "breadth" },
        { kind: "text", value: ")" },
      ],
      reading: "Walk round the edge: two lengths and two breadths.",
      assumptions: ["A rectangle"],
    },
    {
      id: "cuboid-volume",
      topic: "volume-cuboid",
      title: "Volume of a box",
      words: "volume = length × breadth × height",
      tokens: [
        { kind: "ref", id: "volume" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "length" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "breadth" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "height" },
      ],
      reading: "The bottom layer holds length × breadth cubes, and there are height layers.",
      assumptions: ["A cuboid"],
      discoverable: true,
    },
    {
      id: "cuboid-surface",
      topic: "surface-area-cuboid",
      title: "Surface area of a box",
      words: "surface area = 2 × (length × breadth + breadth × height + height × length)",
      tokens: [
        { kind: "ref", id: "surfaceArea" },
        { kind: "op", value: "=" },
        { kind: "text", value: "2 × (" },
        { kind: "ref", id: "length" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "breadth" },
        { kind: "op", value: "+" },
        { kind: "ref", id: "breadth" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "height" },
        { kind: "op", value: "+" },
        { kind: "ref", id: "height" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "length" },
        { kind: "text", value: ")" },
      ],
      reading: "Unfold the box and its net is six rectangles in three matching pairs: top and bottom, front and back, the two ends. A cube has six equal square faces: 6a².",
      assumptions: ["A cuboid, every face counted"],
      discoverable: true,
    },
  ],

  simulation: {
    model: "shapes",
    params: { shape: "rectangle" },
    playLabel: "Grow it",
  },

  visualization: {
    renderer: "shapes",
    hint: "Drag the shape's corner to change its size, or pick another shape.",
    layers: [
      { id: "grid", label: "Unit squares", optional: true },
      { id: "shape", label: "Shape" },
      { id: "net", label: "Net of the box", optional: true },
      { id: "labels", label: "Measurements", optional: true },
    ],
  },

  modes: [
    {
      id: "flat",
      label: "On the grid",
      description: "Shapes on unit squares",
      layers: ["grid", "shape", "labels"],
      graphs: [],
      equations: ["rect-area", "rect-perimeter"],
    },
    {
      id: "box",
      label: "Boxes",
      description: "Cuboids of unit cubes",
      layers: ["shape", "labels"],
      graphs: [],
      equations: ["cuboid-volume"],
    },
    {
      id: "net",
      label: "Unfolded box",
      description: "A cuboid's net of six faces",
      layers: ["net", "labels"],
      graphs: [],
      equations: ["cuboid-surface"],
    },
  ],
  defaultMode: "flat",
  graphs: [],

  activities: {
    observe: [
      {
        id: "twelve",
        prompt: "Make a rectangle of 12 squares.",
        condition: { type: "compare", quantity: "area", op: "eq", value: 12 },
      },
      {
        id: "box",
        prompt: "Switch to a box and make it hold 24 cubes.",
        condition: { type: "compare", quantity: "volume", op: "eq", value: 24 },
      },
    ],

    predict: [
      {
        id: "double-breadth",
        question: "A rectangle 4 long has its breadth doubled from 3 to 6. What happens to its area?",
        variable: "breadth",
        from: 3,
        to: 6,
        quantity: "area",
        options: ["increase", "decrease", "same"],
        given: { shape: "rectangle", length: 4 },
        explanation: "It doubles, from 12 to 24 squares: twice as many rows.",
      },
    ],

    experiment: {
      title: "Rectangles of area 24",
      instructions: "Make rectangles of area 24 in as many ways as you can — 24 × 1, 12 × 2, 8 × 3, 6 × 4 — and record their perimeters.",
      columns: ["area", "perimeter", "squares"],
      minRows: 3,
      discovery: {
        question: "What do you notice about the perimeters of rectangles with the same area?",
        choices: [
          { id: "differ", label: "They differ: long, thin ones have longer perimeters", correct: true },
          { id: "same", label: "They are all the same", correct: false },
          { id: "equal-area", label: "The perimeter always equals the area", correct: false },
          { id: "shorter", label: "Long, thin ones have shorter perimeters", correct: false },
        ],
        reveals: "rect-area",
        insight: "Area counts the squares inside; perimeter measures the edge. Squarer shapes wrap the same area in less edge.",
      },
    },

    explain: [
      {
        id: "area-perimeter",
        title: "Area and perimeter",
        body: "Area is how many squares a shape covers: here {{area}}. Perimeter is how far round its edge: here {{perimeter}}. They are different — a long, thin rectangle can have a small area and a big perimeter.",
      },
      {
        id: "triangle",
        title: "Half a rectangle",
        body: "Cut a rectangle corner to corner and you get two equal triangles. So a triangle's area is half its base times its height.",
      },
      {
        id: "volume",
        title: "Layers of cubes",
        body: "A box's bottom layer holds length × breadth cubes, and it has height layers: volume = length × breadth × height.",
      },
      {
        id: "net",
        title: "Unfold the box",
        body: "Its net has two faces of {{faceLB}}, two of {{faceLH}} and two of {{faceBH}}: {{surfaceArea}} in all. It holds {{volume}}.",
      },
    ],

    challenges: [
      {
        id: "square",
        title: "The squarest one",
        prompt: "Make a rectangle of area 36 with the smallest perimeter you can.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "area", op: "eq", value: 36 },
            { type: "compare", quantity: "perimeter", op: "eq", value: 24 },
          ],
        },
        hint: "Make it a square.",
        success: "6 × 6: a square wraps its area in the least edge.",
      },
    ],
  },

  realWorld: [
    { title: "Tiling a floor", description: "Count the tiles: a 4 m × 3 m floor needs 12 square-metre tiles." },
    { title: "Fencing a garden", description: "The fence is the perimeter; the grass is the area." },
    { title: "Packing boxes", description: "A carton 4 × 3 × 2 holds 24 small cubes — its volume." },
    { title: "Wrapping a gift", description: "The paper must cover the box's net: a 4 × 3 × 2 box needs at least 2(12 + 6 + 8) = 52 square units." },
  ],
});
