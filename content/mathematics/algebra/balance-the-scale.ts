import { defineConcept } from "@ise/concept-schema";

/**
 * Simple equations for class 7, as a balance.
 *
 * Mystery boxes of weight x and unit weights on two pans: the equation holds
 * exactly when the scale is level. Guessing x tips it one way or the other;
 * the algebra way keeps it level throughout — take the same from both pans —
 * until a box sits alone against its weight.
 */
export const balanceTheScale = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "balance-the-scale",
    title: "Balance the Scale",
    tagline: "An equation is a balance: keep both sides level and the mystery weight gives itself away.",
    domain: "mathematics",
    category: "algebra",
    grade: { min: 7, max: 8 },
    difficulty: "introductory",
    estimatedMinutes: 15,
    objective:
      "Read an equation as a balance, find an unknown by trying values, solve it by doing the same to both sides, and turn a word problem into an equation.",
    tags: ["algebra", "equations", "balance", "unknown", "class 7"],
  },

  connections: [
    {
      id: "linear-equations",
      title: "Linear equations and graphs (class 9)",
      domain: "mathematics",
      relation: "leads-to",
      note: "The same balancing solves every linear equation, and each one draws a straight line.",
      available: false,
    },
  ],

  variables: [
    {
      id: "x",
      symbol: "x",
      name: "Your guess for one box",
      meaning: "How much you think one mystery box weighs.",
      binding: { kind: "state", key: "x" },
      control: { type: "range", unit: "1", min: 0, max: 20, step: 1 },
      group: "primary",
      color: "curve",
    },
    {
      id: "take",
      symbol: "take",
      name: "Units off both sides",
      meaning: "Unit weights taken off both pans at once.",
      binding: { kind: "state", key: "take" },
      control: { type: "range", unit: "1", min: 0, max: 20, step: 1 },
      group: "primary",
      color: "angle",
    },
    {
      id: "takeX",
      symbol: "take x",
      name: "Boxes off both sides",
      meaning: "Mystery boxes taken off both pans at once.",
      binding: { kind: "state", key: "takeX" },
      control: { type: "range", unit: "1", min: 0, max: 5, step: 1 },
      group: "primary",
      color: "curve",
    },
    {
      id: "a",
      symbol: "a",
      name: "Boxes on the left",
      meaning: "How many mystery boxes start on the left pan.",
      binding: { kind: "param", key: "a" },
      control: { type: "range", unit: "1", min: 0, max: 5, step: 1 },
      group: "motion",
      color: "curve",
    },
    {
      id: "b",
      symbol: "b",
      name: "Units on the left",
      meaning: "How many unit weights start on the left pan.",
      binding: { kind: "param", key: "b" },
      control: { type: "range", unit: "1", min: 0, max: 20, step: 1 },
      group: "motion",
      color: "angle",
    },
    {
      id: "c",
      symbol: "c",
      name: "Boxes on the right",
      meaning: "How many mystery boxes start on the right pan.",
      binding: { kind: "param", key: "c" },
      control: { type: "range", unit: "1", min: 0, max: 5, step: 1 },
      group: "motion",
      color: "curve",
    },
    {
      id: "d",
      symbol: "d",
      name: "Units on the right",
      meaning: "How many unit weights start on the right pan.",
      binding: { kind: "param", key: "d" },
      control: { type: "range", unit: "1", min: 0, max: 20, step: 1 },
      group: "motion",
      color: "angle",
    },
  ],

  quantities: [
    {
      id: "leftWeight",
      symbol: "left",
      name: "Left pan weighs",
      meaning: "Boxes times your guess, plus the units.",
      result: "leftWeight",
      format: { kind: "number", digits: 0 },
      color: "sine",
      highlight: "weights",
      headline: true,
    },
    {
      id: "rightWeight",
      symbol: "right",
      name: "Right pan weighs",
      meaning: "Boxes times your guess, plus the units.",
      result: "rightWeight",
      format: { kind: "number", digits: 0 },
      color: "cosine",
      highlight: "weights",
      headline: true,
    },
    {
      id: "tilt",
      symbol: "scale",
      name: "The scale",
      meaning: "Which way it tips.",
      result: "tilt",
      format: { kind: "label", labels: { "-1": "right side down", "0": "level", "1": "left side down" } },
      color: "tangent",
      highlight: "scale",
      headline: true,
    },
    {
      id: "balanced",
      symbol: "balanced?",
      name: "Balanced",
      meaning: "Whether both pans weigh the same.",
      result: "balanced",
      format: { kind: "label", labels: { "0": "no", "1": "yes" } },
      color: "tangent",
      highlight: "scale",
    },
    {
      id: "solution",
      symbol: "answer",
      name: "The mystery weight",
      meaning: "The weight of one box that balances the scale (−1 when none does).",
      result: "solution",
      format: { kind: "number", digits: 2 },
      color: "curve",
    },
    {
      id: "perBox",
      symbol: "per box",
      name: "Each box weighs",
      meaning: "Once boxes sit alone against units: the units each box must weigh.",
      result: "perBox",
      format: { kind: "number", digits: 2 },
      color: "curve",
    },
  ],

  equations: [
    {
      id: "balance",
      topic: "equation-balance",
      title: "An equation is a balance",
      words: "boxes × x + units on the left = boxes × x + units on the right",
      tokens: [
        { kind: "ref", id: "a" },
        { kind: "text", value: "x" },
        { kind: "op", value: "+" },
        { kind: "ref", id: "b" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "c" },
        { kind: "text", value: "x" },
        { kind: "op", value: "+" },
        { kind: "ref", id: "d" },
      ],
      reading: "The two sides are equal exactly when the scale is level. Finding x means finding the weight that levels it.",
      assumptions: ["Every box weighs the same"],
      discoverable: true,
    },
    {
      id: "same-both-sides",
      topic: "solving-equations",
      title: "Do the same to both sides",
      words: "take the same off both sides and it stays balanced",
      tokens: [
        { kind: "ref", id: "leftWeight" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "rightWeight" },
      ],
      reading: "Take equal amounts off both pans — units or whole boxes — and a level scale stays level. Keep going until a box is alone.",
      assumptions: ["The scale was balanced to start with"],
      discoverable: true,
    },
  ],

  simulation: {
    model: "balance",
    params: { a: 2, b: 3, c: 0, d: 11 },
    playLabel: "Try bigger guesses",
  },

  visualization: {
    renderer: "balance",
    hint: "Guess the weight of a box, or take the same off both pans.",
    layers: [
      { id: "scale", label: "Scale" },
      { id: "weights", label: "Weights" },
      { id: "labels", label: "Equation", optional: true },
    ],
  },

  modes: [
    {
      id: "scale",
      label: "Scale and equation",
      description: "The pans with the equation underneath",
      layers: ["scale", "weights", "labels"],
      graphs: [],
      equations: ["balance"],
    },
    {
      id: "scale-only",
      label: "Just the scale",
      description: "Weights, no equation",
      layers: ["scale", "weights"],
      graphs: [],
      equations: ["same-both-sides"],
    },
  ],
  defaultMode: "scale",
  graphs: [],

  activities: {
    observe: [
      {
        id: "balance-it",
        prompt: "Find the guess that makes the scale level.",
        condition: { type: "compare", quantity: "balanced", op: "eq", value: 1 },
      },
      {
        id: "take-three",
        prompt: "Take 3 units off both sides.",
        condition: { type: "compare", quantity: "take", op: "eq", value: 3 },
      },
    ],

    predict: [
      {
        id: "heavier-guess",
        question: "You change your guess for a box from 3 to 5. What happens to the weight of the left pan?",
        variable: "x",
        from: 3,
        to: 5,
        quantity: "leftWeight",
        options: ["increase", "decrease", "same"],
        explanation: "It goes up by 4: there are two boxes on the left, and each is 2 heavier.",
      },
      {
        id: "take-both",
        question: "The scale is level. You take 2 units off both sides. What happens to the tilt?",
        variable: "take",
        from: 0,
        to: 2,
        quantity: "tilt",
        options: ["increase", "decrease", "same"],
        given: { x: 4 },
        explanation: "Nothing: it stays level. Taking the same from both sides keeps them equal.",
      },
    ],

    experiment: {
      title: "Guess and check",
      instructions: "For 2x + 3 = 11, record the pans' weights for guesses 2, 3, 4 and 5.",
      columns: ["leftWeight", "rightWeight", "tilt", "balanced"],
      minRows: 3,
      discovery: {
        question: "What does the answer to the equation do to the scale?",
        choices: [
          { id: "level", label: "It is the one guess that makes the scale level", correct: true },
          { id: "left", label: "It always tips the scale to the left", correct: false },
          { id: "biggest", label: "It is the biggest guess you can make", correct: false },
          { id: "none", label: "Nothing: the scale never moves", correct: false },
        ],
        reveals: "balance",
        insight: "Solving an equation means finding the weight that balances it: here x = 4.",
      },
    },

    explain: [
      {
        id: "balance",
        title: "An equation is a balance",
        body: "The = sign says both sides weigh the same. Right now the left pan weighs {{leftWeight}} and the right {{rightWeight}}: the scale is {{tilt}}.",
      },
      {
        id: "both-sides",
        title: "Do the same to both sides",
        body: "Take the same off both pans and a level scale stays level. Keep taking until a box sits alone — then you can read off what it weighs.",
      },
    ],

    challenges: [
      {
        id: "alone",
        title: "Box alone",
        prompt: "For 2x + 3 = 11, take units off both sides until the boxes are alone.",
        goal: { type: "compare", quantity: "isolated", op: "eq", value: 1 },
        hint: "Take off the 3 units from the left — and 3 from the right too.",
        success: "2x = 8: two boxes weigh 8, so one weighs 4.",
      },
    ],
  },

  realWorld: [
    { title: "A shopkeeper's scale", description: "Weights on one pan, rice on the other: level means equal, which is exactly what = means." },
    { title: "Sharing sweets", description: "Three friends share 24 sweets: 3x = 24, so each gets 8." },
  ],
});
