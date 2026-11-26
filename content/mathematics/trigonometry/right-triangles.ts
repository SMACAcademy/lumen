import { defineConcept } from "@ise/concept-schema";

/**
 * Right triangles for class 10: Pythagoras, then sine, cosine and tangent.
 *
 * The learner sets the base and the height. Squares on the sides show
 * a² + b² = c² as area you can count. Named from the angle θ, the sides give
 * the three ratios — the same for every triangle of that shape — and the
 * ratios turn a distance and an angle into a height.
 */
export const rightTriangles = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "right-triangles",
    title: "Right Triangles",
    tagline: "Squares on the sides, and the three ratios that measure heights you cannot climb.",
    domain: "mathematics",
    category: "trigonometry",
    grade: { min: 10, max: 10 },
    difficulty: "introductory",
    estimatedMinutes: 15,
    objective:
      "See Pythagoras' theorem as the squares on the legs filling the square on the hypotenuse, define sin θ, cos θ and tan θ from the sides of a right triangle, know their values at 30°, 45° and 60°, and use them to find heights and distances.",
    tags: ["pythagoras", "trigonometry", "sine", "cosine", "tangent", "heights and distances", "class 10"],
  },

  connections: [
    {
      id: "unit-circle-sine-cosine",
      title: "Unit Circle → Sine & Cosine",
      domain: "mathematics",
      relation: "leads-to",
      note: "Make the hypotenuse 1 and swing it round a circle: sin and cos carry on past 90°.",
      available: true,
    },
  ],

  variables: [
    {
      id: "a",
      symbol: "a",
      name: "Base",
      meaning: "The side along the ground, next to the angle θ.",
      binding: { kind: "state", key: "a" },
      control: { type: "range", unit: "1", min: 0.5, max: 20, step: 0.5 },
      group: "primary",
      color: "sine",
    },
    {
      id: "b",
      symbol: "b",
      name: "Height",
      meaning: "The side standing up at the right angle, across from θ.",
      binding: { kind: "state", key: "b" },
      control: { type: "range", unit: "1", min: 0.5, max: 20, step: 0.5 },
      group: "primary",
      color: "cosine",
    },
    {
      id: "sweep",
      symbol: "play",
      name: "Play changes",
      meaning: "Which side grows when you press play.",
      binding: { kind: "param", key: "sweep" },
      control: {
        type: "choice",
        options: [
          { value: "height", label: "The height" },
          { value: "base", label: "The base" },
        ],
      },
      group: "primary",
      color: "neutral",
    },
  ],

  quantities: [
    {
      id: "c",
      symbol: "c",
      name: "Hypotenuse",
      meaning: "The longest side, across from the right angle.",
      result: "c",
      format: { kind: "number", digits: 2 },
      color: "tangent",
      highlight: "triangle",
      headline: true,
    },
    {
      id: "height",
      symbol: "h",
      name: "Height",
      meaning: "How tall the triangle stands.",
      result: "b",
      format: { kind: "number", digits: 2 },
      color: "cosine",
    },
    {
      id: "squareA",
      symbol: "a²",
      name: "Square on the base",
      meaning: "The area of the square drawn on the base.",
      result: "squareA",
      format: { kind: "number", digits: 2 },
      color: "sine",
      highlight: "squares",
    },
    {
      id: "squareB",
      symbol: "b²",
      name: "Square on the height",
      meaning: "The area of the square drawn on the height.",
      result: "squareB",
      format: { kind: "number", digits: 2 },
      color: "cosine",
      highlight: "squares",
    },
    {
      id: "squareC",
      symbol: "c²",
      name: "Square on the hypotenuse",
      meaning: "The area of the square drawn on the hypotenuse.",
      result: "squareC",
      format: { kind: "number", digits: 2 },
      color: "tangent",
      highlight: "squares",
      headline: true,
    },
    {
      id: "theta",
      symbol: "θ",
      name: "Angle θ",
      meaning: "The angle between the base and the hypotenuse.",
      result: "theta",
      format: { kind: "number", digits: 1 },
      unit: "deg",
      color: "angle",
      highlight: "ratios",
      headline: true,
    },
    {
      id: "sin",
      symbol: "sin θ",
      name: "Sine",
      meaning: "Opposite ÷ hypotenuse.",
      result: "sin",
      format: { kind: "number", digits: 3 },
      color: "cosine",
      highlight: "ratios",
      headline: true,
    },
    {
      id: "cos",
      symbol: "cos θ",
      name: "Cosine",
      meaning: "Adjacent ÷ hypotenuse.",
      result: "cos",
      format: { kind: "number", digits: 3 },
      color: "sine",
      highlight: "ratios",
      headline: true,
    },
    {
      id: "tan",
      symbol: "tan θ",
      name: "Tangent",
      meaning: "Opposite ÷ adjacent.",
      result: "tan",
      format: { kind: "number", digits: 3 },
      color: "tangent",
      highlight: "ratios",
    },
    {
      id: "identity",
      symbol: "sin²θ + cos²θ",
      name: "sin²θ + cos²θ",
      meaning: "Always 1 — Pythagoras divided through by c².",
      result: "identity",
      format: { kind: "number", digits: 3 },
      color: "neutral",
    },
  ],

  equations: [
    {
      id: "pythagoras",
      topic: "pythagoras",
      title: "Pythagoras' theorem",
      words: "square on the hypotenuse = square on the base + square on the height",
      tokens: [
        { kind: "ref", id: "squareC" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "squareA" },
        { kind: "op", value: "+" },
        { kind: "ref", id: "squareB" },
      ],
      reading: "In a right triangle, c² = a² + b²: the two smaller squares exactly fill the big one.",
      assumptions: ["A right angle between a and b"],
      discoverable: true,
    },
    {
      id: "sine-ratio",
      topic: "trig-ratios",
      title: "Sine",
      words: "sin θ = opposite ÷ hypotenuse",
      tokens: [
        { kind: "ref", id: "sin" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "b" },
        { kind: "op", value: "/" },
        { kind: "ref", id: "c" },
      ],
      reading: "Also cos θ = adjacent ÷ hypotenuse and tan θ = opposite ÷ adjacent. They depend only on θ, not on how big the triangle is.",
      assumptions: ["θ is one of the two acute angles"],
      discoverable: true,
    },
    {
      id: "tangent-ratio",
      topic: "heights-distances-school",
      title: "Height from a distance",
      words: "height = distance × tan θ",
      tokens: [
        { kind: "ref", id: "height" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "a" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "tan" },
      ],
      reading: "Stand a known distance away, measure the angle up to the top, and tan θ gives the height — no climbing needed.",
      assumptions: ["Level ground; angle measured from the ground"],
    },
    {
      id: "special-values",
      topic: "special-angle-values",
      title: "Special angles",
      words: "sin 30° = 1/2, sin 45° = 1/√2, sin 60° = √3/2; tan 45° = 1",
      tokens: [
        { kind: "text", value: "sin 30°" },
        { kind: "op", value: "=" },
        { kind: "text", value: "1/2" },
      ],
      reading: "Half an equilateral triangle gives 30° and 60°; half a square gives 45°. cos runs the same values backwards.",
      assumptions: ["Angles in degrees"],
    },
    {
      id: "trig-identity",
      topic: "trig-identity-school",
      title: "The identity",
      words: "sin²θ + cos²θ = 1",
      tokens: [
        { kind: "ref", id: "identity" },
        { kind: "op", value: "=" },
        { kind: "text", value: "1" },
      ],
      reading: "Divide a² + b² = c² by c²: (a/c)² + (b/c)² = 1.",
      assumptions: ["Any angle θ"],
    },
  ],

  simulation: {
    model: "triangle",
    params: { sweep: "height" },
    playLabel: "Grow the triangle",
  },

  visualization: {
    renderer: "triangle",
    hint: "Change the base and the height. Switch views to see the squares, or the ratios.",
    layers: [
      { id: "triangle", label: "Triangle" },
      { id: "squares", label: "Squares on the sides" },
      { id: "ratios", label: "Sides named from θ" },
      { id: "labels", label: "Words", optional: true },
    ],
  },

  modes: [
    {
      id: "squares",
      label: "Pythagoras",
      description: "Squares on the three sides",
      layers: ["triangle", "squares", "labels"],
      graphs: [],
      equations: ["pythagoras"],
    },
    {
      id: "ratios",
      label: "Trig ratios",
      description: "Opposite, adjacent, hypotenuse",
      layers: ["triangle", "ratios", "labels"],
      graphs: [],
      equations: ["sine-ratio", "tangent-ratio", "special-values", "trig-identity"],
    },
  ],
  defaultMode: "squares",
  graphs: [],

  activities: {
    observe: [
      {
        id: "triple",
        prompt: "Find a triangle, other than 3-4-5, whose hypotenuse is a whole number.",
        condition: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "whole", op: "eq", value: 1 },
            { type: "compare", quantity: "c", op: "neq", value: 5 },
          ],
        },
      },
      {
        id: "forty-five",
        prompt: "Make θ exactly 45°.",
        condition: { type: "compare", quantity: "theta", op: "eq", value: 45, tolerance: 0.01 },
      },
    ],

    predict: [
      {
        id: "steeper",
        question: "Keep the base at 4 and raise the height from 3 to 8. What happens to sin θ?",
        variable: "b",
        from: 3,
        to: 8,
        quantity: "sin",
        options: ["increase", "decrease", "same"],
        given: { a: 4 },
        explanation: "It increases, from 0.6 to about 0.89. A steeper triangle has a bigger angle, and the opposite side takes up more of the hypotenuse.",
      },
    ],

    experiment: {
      title: "Squares on the sides",
      instructions: "Record the three squares for four different right triangles.",
      columns: ["squareA", "squareB", "squareC"],
      minRows: 3,
      discovery: {
        question: "How are the three squares related?",
        choices: [
          { id: "sum", label: "The two small squares add up to the big one", correct: true },
          { id: "double", label: "The big square is twice the smaller ones", correct: false },
          { id: "sides", label: "c = a + b", correct: false },
          { id: "none", label: "There is no pattern", correct: false },
        ],
        reveals: "pythagoras",
        insight: "a² + b² = c² in every right triangle — which is how builders check a corner is square with a 3-4-5 rope.",
      },
    },

    explain: [
      {
        id: "squares",
        title: "Pythagoras",
        body: "The squares on the base and the height are {{squareA}} and {{squareB}}; together they make {{squareC}}, the square on the hypotenuse, which is {{c}} long.",
      },
      {
        id: "ratios",
        title: "The three ratios",
        body: "At θ = {{theta}}°, the opposite side is {{sin}} of the hypotenuse and the adjacent side {{cos}} of it. The height is {{tan}} times the base.",
      },
    ],

    challenges: [
      {
        id: "thirteen",
        title: "Hypotenuse 13",
        prompt: "Make a right triangle whose hypotenuse is exactly 13.",
        goal: { type: "compare", quantity: "c", op: "eq", value: 13, tolerance: 0.001 },
        hint: "169 = 144 + 25.",
        success: "5 and 12 — another Pythagorean triple.",
      },
      {
        id: "sixty",
        title: "Sixty degrees",
        prompt: "Make θ as close to 60° as you can, within a degree.",
        goal: { type: "compare", quantity: "theta", op: "eq", value: 60, tolerance: 1 },
        hint: "tan 60° ≈ 1.73: the height is about 1.73 times the base.",
        success: "The height is √3 times the base: tan 60° = √3.",
      },
    ],
  },

  realWorld: [
    { title: "A square corner", description: "Builders peg out a rope with sides 3, 4 and 5 to set out a perfect right angle." },
    { title: "Ramps and ladders", description: "A ladder's length is the hypotenuse; how high it reaches depends on sin of its angle." },
    { title: "Measuring a tower", description: "From 50 m away the top of a tower is 30° up: it is 50 × tan 30° ≈ 29 m tall." },
  ],
});
