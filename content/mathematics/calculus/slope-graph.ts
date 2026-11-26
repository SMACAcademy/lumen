import { defineConcept } from "@ise/concept-schema";

/**
 * The derivative as a function: the slope of a curve, plotted at every x,
 * is a graph of its own. From it come the standard derivatives, the power
 * rule, and — taking the slope of the slope — the second derivative.
 */
export const slopeGraph = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "slope-graph",
    title: "The Slope Graph",
    tagline: "Ride a point along a curve and let its slope draw a second graph underneath: x² draws a line, sin x draws cos x, eˣ draws itself.",
    domain: "mathematics",
    category: "calculus",
    grade: { min: 11, max: 12 },
    difficulty: "core",
    estimatedMinutes: 25,
    objective:
      "See the derivative as a function made of the slopes at every point, recognise the derivatives of the standard functions and the power rule, and use the second derivative to tell which way a curve bends and whether a stationary point is a maximum or a minimum.",
    tags: ["derivative", "slope", "power rule", "second derivative", "concavity", "class 11", "class 12"],
  },

  connections: [
    {
      id: "secant-to-tangent",
      title: "Slope: secant → tangent",
      domain: "mathematics",
      relation: "prerequisite",
      note: "Where the slope at one point comes from.",
      available: true,
    },
    {
      id: "limits-and-continuity",
      title: "Limits and Continuity",
      domain: "mathematics",
      relation: "prerequisite",
      note: "A slope exists only where the curve is differentiable.",
      available: true,
    },
    {
      id: "motion-in-a-straight-line",
      title: "Motion in a Straight Line",
      domain: "physics",
      relation: "related",
      note: "Velocity is the slope graph of position, and acceleration the slope graph of velocity.",
      available: true,
    },
  ],

  variables: [
    {
      id: "function",
      symbol: "f",
      name: "Curve",
      meaning: "The function whose slope is being graphed.",
      binding: { kind: "param", key: "function" },
      control: {
        type: "choice",
        options: [
          { value: "square", label: "x²" },
          { value: "cubic", label: "x³/3 − x" },
          { value: "sine", label: "sin x" },
          { value: "cosine", label: "cos x" },
          { value: "exp", label: "eˣ" },
          { value: "log", label: "ln x" },
          { value: "power", label: "xⁿ" },
        ],
      },
      group: "primary",
      color: "curve",
    },
    {
      id: "x",
      symbol: "x",
      name: "Where the point is",
      meaning: "Drag it, or press play, and the slope leaves a trail on the lower graph.",
      binding: { kind: "state", key: "x" },
      control: { type: "range", unit: "1", min: -6.3, max: 6.3, step: 0.05 },
      group: "primary",
      color: "angle",
    },
    {
      id: "n",
      symbol: "n",
      name: "The power, for xⁿ",
      meaning: "Only the xⁿ curve uses it.",
      binding: { kind: "state", key: "n" },
      control: { type: "range", unit: "1", min: 1, max: 5, step: 1 },
      group: "primary",
      color: "neutral",
    },
  ],

  quantities: [
    {
      id: "slope",
      symbol: "f′(x)",
      name: "Slope of the tangent",
      meaning: "How steeply the curve is rising at the point. Negative means falling.",
      result: "slope",
      format: { kind: "number", digits: 2 },
      color: "tangent",
      highlight: "slope",
      headline: true,
    },
    {
      id: "y",
      symbol: "f(x)",
      name: "Height of the curve",
      meaning: "The function's value at the point.",
      result: "y",
      format: { kind: "number", digits: 2 },
      color: "curve",
    },
    {
      id: "second",
      symbol: "f″(x)",
      name: "Second derivative",
      meaning: "The slope of the slope graph: how fast the slope itself is changing.",
      result: "second",
      format: { kind: "number", digits: 2 },
      color: "sine",
      highlight: "bend",
      headline: true,
    },
    {
      id: "direction",
      symbol: "curve is",
      name: "Rising or falling",
      meaning: "The sign of the slope.",
      result: "direction",
      format: { kind: "label", labels: { "-1": "falling", "0": "flat", "1": "rising" } },
      color: "tangent",
    },
    {
      id: "concavity",
      symbol: "bends",
      name: "Which way the curve bends",
      meaning: "Up where the slope is rising, down where it is falling.",
      result: "concavity",
      format: { kind: "label", labels: { "-1": "downward", "0": "neither way", "1": "upward" } },
      color: "sine",
    },
    {
      id: "turning",
      symbol: "here",
      name: "Kind of stationary point",
      meaning: "Where the slope is zero: a maximum if the curve bends down, a minimum if it bends up.",
      result: "turning",
      format: { kind: "label", labels: { "0": "not stationary", "1": "a maximum", "2": "a minimum", "3": "flat, neither" } },
      color: "angle",
    },
    {
      id: "slopeAtOne",
      symbol: "f′(1)",
      name: "Slope at x = 1",
      meaning: "For xⁿ this is the power itself.",
      result: "slopeAtOne",
      format: { kind: "number", digits: 2 },
      color: "neutral",
    },
    {
      id: "coverage",
      symbol: "trail",
      name: "How much of the trail is drawn",
      meaning: "0 is none, 1 is the whole window.",
      result: "coverage",
      format: { kind: "number", digits: 2 },
      color: "neutral",
    },
  ],

  equations: [
    {
      id: "derivative-function",
      topic: "standard-derivatives",
      title: "The derivative is a function",
      tokens: [
        { kind: "text", value: "f′(x)" },
        { kind: "op", value: "=" },
        { kind: "text", value: "slope of f at x" },
      ],
      reading: "Take the slope at every x and you have a new function. For x² it is 2x; for sin x it is cos x; for eˣ it is eˣ again; for ln x it is 1/x.",
      assumptions: ["x in radians for sin and cos"],
      discoverable: true,
    },
    {
      id: "power-rule",
      topic: "standard-derivatives",
      title: "The power rule",
      tokens: [
        { kind: "text", value: "d/dx xⁿ" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "n" },
        { kind: "op", value: "·" },
        { kind: "text", value: "xⁿ⁻¹" },
      ],
      reading: "Bring the power down in front and take one off it. At x = 1 the slope of xⁿ is just n.",
      assumptions: ["Shown here for n = 1 to 5; it holds for every real n"],
      discoverable: true,
    },
    {
      id: "second-derivative",
      topic: "higher-derivatives",
      title: "The second derivative",
      tokens: [
        { kind: "ref", id: "second" },
        { kind: "op", value: "=" },
        { kind: "text", value: "slope of the slope graph" },
      ],
      reading: "f″ > 0: the slope is rising and the curve bends upward, like a cup. f″ < 0: it bends downward, like a cap. Where the slope is zero, a cup is a minimum and a cap a maximum.",
      assumptions: ["If f″ is also zero the test says nothing"],
      discoverable: true,
    },
  ],

  simulation: {
    model: "slopegraph",
    params: { function: "square" },
    playLabel: "Ride along the curve",
  },

  visualization: {
    renderer: "slopegraph",
    hint: "Pick a curve and press play: the slope draws its own graph underneath.",
    layers: [
      { id: "curve", label: "Curve" },
      { id: "tangent", label: "Tangent" },
      { id: "slope", label: "Slope graph" },
      { id: "bend", label: "Colour by bending" },
      { id: "labels", label: "Words", optional: true },
    ],
  },

  modes: [
    {
      id: "slope",
      label: "Slope graph",
      description: "The slope at every point, drawn as a graph",
      layers: ["curve", "tangent", "slope", "labels"],
      graphs: [],
      equations: ["derivative-function", "power-rule"],
    },
    {
      id: "bending",
      label: "Bending",
      description: "The second derivative: which way the curve bends",
      layers: ["curve", "tangent", "slope", "bend", "labels"],
      graphs: [],
      equations: ["second-derivative"],
    },
  ],
  defaultMode: "slope",
  graphs: [],

  activities: {
    observe: [
      {
        id: "whole-trail",
        prompt: "Draw the whole slope graph of a curve.",
        condition: { type: "compare", quantity: "coverage", op: "gte", value: 0.95 },
      },
      {
        id: "flat-spot",
        prompt: "Find a point where the tangent is flat.",
        condition: { type: "compare", quantity: "direction", op: "eq", value: 0 },
      },
    ],

    predict: [
      {
        id: "steeper",
        question: "On y = x², the point moves from x = 0.5 to x = 2.5. What happens to the slope?",
        variable: "x",
        from: 0.5,
        to: 2.5,
        quantity: "slope",
        options: ["increase", "decrease", "same"],
        given: { function: "square" },
        explanation: "It rises from 1 to 5: the slope of x² at x is 2x, so the slope graph is a straight line.",
      },
    ],

    experiment: {
      title: "The slope of xⁿ",
      instructions: "Choose xⁿ and put the point at x = 1. Record n and the slope for n = 1, 2, 3, 4 and 5.",
      columns: ["n", "slopeAtOne"],
      minRows: 4,
      discovery: {
        question: "What is the slope of xⁿ at x = 1?",
        choices: [
          { id: "n", label: "n itself", correct: true },
          { id: "one", label: "Always 1", correct: false },
          { id: "n-squared", label: "n²", correct: false },
          { id: "n-minus-one", label: "n − 1", correct: false },
        ],
        reveals: "power-rule",
        insight: "The power comes down as a multiplier: d/dx xⁿ = n·xⁿ⁻¹. At x = 1 the xⁿ⁻¹ is 1, leaving just n.",
      },
    },

    explain: [
      {
        id: "slope",
        title: "At this point",
        body: "The curve is {{direction}}, with slope {{slope}} at a height of {{y}}.",
      },
      {
        id: "bending",
        title: "The bending",
        body: "f″ is {{second}}, so the curve bends {{concavity}}. This point is {{turning}}.",
      },
    ],

    challenges: [
      {
        id: "top-of-the-hill",
        title: "Top of the hill",
        prompt: "On y = x³/3 − x, put the point exactly on the maximum.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "function", op: "eq", value: 1 },
            { type: "compare", quantity: "turning", op: "eq", value: 1 },
          ],
        },
        hint: "The slope graph x² − 1 crosses zero twice. Which crossing is the hilltop?",
        success: "x = −1: the slope is zero and f″ = −2, so the curve bends down there — a maximum. At x = +1 it bends up: a minimum.",
      },
    ],
  },

  realWorld: [
    { title: "Position, velocity, acceleration", description: "Velocity is the slope graph of position; acceleration is the slope graph of velocity — a second derivative you can feel." },
    { title: "Compound interest", description: "eˣ is the one curve whose slope equals its height: growth in proportion to what is already there." },
    { title: "Profit and marginal profit", description: "Economists call the slope graph the marginal curve; the best output is where it crosses zero." },
  ],
});
