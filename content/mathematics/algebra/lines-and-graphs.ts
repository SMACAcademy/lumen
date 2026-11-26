import { defineConcept } from "@ise/concept-schema";

const range = (min: number, max: number, step: number) => ({ type: "range" as const, unit: "1" as const, min, max, step });

/**
 * Coordinates and straight lines for class 9 and 10.
 *
 * Points on the plane, then the line y = mx + c as every point whose
 * coordinates make the equation true — a slope and a starting height. Two
 * lines meet at the one point on both, the solution of the pair, unless they
 * share a slope: parallel lines never meet, and a line with itself meets
 * everywhere.
 */
export const linesAndGraphs = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "lines-and-graphs",
    title: "Lines and Graphs",
    tagline: "Points on a plane, the line y = mx + c, and where two lines meet.",
    domain: "mathematics",
    category: "algebra",
    grade: { min: 9, max: 10 },
    difficulty: "introductory",
    estimatedMinutes: 15,
    objective:
      "Plot points in the four quadrants, see the graph of y = mx + c as the points that satisfy it, read slope and intercept, and solve a pair of linear equations as the point where their lines meet — or see why there is no solution, or infinitely many.",
    tags: ["coordinates", "straight line", "slope", "intercept", "pair of linear equations", "class 9", "class 10"],
  },

  connections: [
    {
      id: "secant-to-tangent",
      title: "Secant to Tangent",
      domain: "mathematics",
      relation: "leads-to",
      note: "The slope of a straight line becomes the slope of a curve at a point: the start of calculus.",
      available: true,
    },
  ],

  variables: [
    {
      id: "m",
      symbol: "m",
      name: "Slope",
      meaning: "How far the line climbs for every 1 across.",
      binding: { kind: "state", key: "m" },
      control: range(-5, 5, 0.5),
      group: "primary",
      color: "sine",
    },
    {
      id: "c",
      symbol: "c",
      name: "Where it crosses the y-axis",
      meaning: "The line's height at x = 0.",
      binding: { kind: "state", key: "c" },
      control: range(-8, 8, 0.5),
      group: "primary",
      color: "sine",
    },
    {
      id: "m2",
      symbol: "m₂",
      name: "Second line's slope",
      meaning: "How steep the second line is.",
      binding: { kind: "state", key: "m2" },
      control: range(-5, 5, 0.5),
      group: "primary",
      color: "cosine",
    },
    {
      id: "c2",
      symbol: "c₂",
      name: "Second line's y-axis crossing",
      meaning: "The second line's height at x = 0.",
      binding: { kind: "state", key: "c2" },
      control: range(-8, 8, 0.5),
      group: "primary",
      color: "cosine",
    },
    {
      id: "x",
      symbol: "x",
      name: "Point: x",
      meaning: "How far right (or left, if negative) the point is.",
      binding: { kind: "state", key: "x" },
      control: range(-8, 8, 0.5),
      group: "primary",
      color: "point",
    },
    {
      id: "y",
      symbol: "y",
      name: "Point: y",
      meaning: "How far up (or down, if negative) the point is.",
      binding: { kind: "state", key: "y" },
      control: range(-8, 8, 0.5),
      group: "primary",
      color: "point",
    },
    {
      id: "walk",
      symbol: "play",
      name: "Play moves the point",
      meaning: "Along the line, or straight across.",
      binding: { kind: "param", key: "walk" },
      control: {
        type: "choice",
        options: [
          { value: "line", label: "Along the line" },
          { value: "free", label: "Straight across" },
        ],
      },
      group: "primary",
      color: "neutral",
    },
  ],

  quantities: [
    {
      id: "onLine",
      symbol: "on it?",
      name: "Point on the line",
      meaning: "Whether the point's coordinates make y = mx + c true.",
      result: "onLine",
      format: { kind: "label", labels: { "0": "no", "1": "yes" } },
      color: "tangent",
      highlight: "point",
      headline: true,
    },
    {
      id: "lineY",
      symbol: "mx + c",
      name: "The line's height at the point's x",
      meaning: "Where the line is, straight above or below the point.",
      result: "lineY",
      format: { kind: "number", digits: 2 },
      color: "sine",
      highlight: "line",
      headline: true,
    },
    {
      id: "quadrant",
      symbol: "quadrant",
      name: "Quadrant",
      meaning: "Which quarter of the plane the point is in.",
      result: "quadrant",
      format: { kind: "label", labels: { "0": "on an axis", "1": "I (+, +)", "2": "II (−, +)", "3": "III (−, −)", "4": "IV (+, −)" } },
      color: "point",
      highlight: "point",
    },
    {
      id: "xIntercept",
      symbol: "x-crossing",
      name: "Where it crosses the x-axis",
      meaning: "The x where the line's height is 0: −c ÷ m.",
      result: "xIntercept",
      format: { kind: "number", digits: 2 },
      color: "sine",
    },
    {
      id: "solutions",
      symbol: "solutions",
      name: "Solutions of the pair",
      meaning: "How many points are on both lines.",
      result: "solutions",
      format: { kind: "label", labels: { "0": "none — parallel", "1": "one", "2": "infinitely many — the same line" } },
      color: "angle",
      highlight: "second",
      headline: true,
    },
    {
      id: "meetX",
      symbol: "x",
      name: "Meeting point: x",
      meaning: "The x of the point on both lines.",
      result: "meetX",
      format: { kind: "number", digits: 2 },
      color: "angle",
      highlight: "second",
    },
    {
      id: "meetY",
      symbol: "y",
      name: "Meeting point: y",
      meaning: "The y of the point on both lines.",
      result: "meetY",
      format: { kind: "number", digits: 2 },
      color: "angle",
      highlight: "second",
    },
  ],

  equations: [
    {
      id: "slope-intercept",
      topic: "straight-line-graph",
      title: "A straight line",
      words: "y = slope × x + where it crosses the y-axis",
      tokens: [
        { kind: "ref", id: "y" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "m" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "x" },
        { kind: "op", value: "+" },
        { kind: "ref", id: "c" },
      ],
      reading: "The graph of a linear equation is a straight line: every point whose x and y make the equation true, and no others.",
      assumptions: ["Not a vertical line"],
      discoverable: true,
    },
    {
      id: "pair-rule",
      topic: "pair-of-lines",
      title: "Two lines",
      words: "different slopes: one solution; same slope, different c: none; the same line: infinitely many",
      tokens: [
        { kind: "ref", id: "m" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "m2" },
        { kind: "text", value: "→ parallel" },
      ],
      reading: "Solving a pair of equations is finding the point on both lines. Lines with different slopes always cross once; lines with the same slope never do, unless they are the same line.",
      assumptions: ["Straight lines on a plane"],
      discoverable: true,
    },
    {
      id: "quadrants",
      topic: "cartesian-plane",
      title: "Quadrants",
      words: "(+, +) is I, (−, +) is II, (−, −) is III, (+, −) is IV",
      tokens: [
        { kind: "text", value: "(x, y)" },
        { kind: "op", value: "=" },
        { kind: "text", value: "across, then up" },
      ],
      reading: "The axes cut the plane into four quadrants, numbered anticlockwise from the top right.",
      assumptions: ["x to the right, y up"],
    },
    {
      id: "on-the-line",
      topic: "linear-equation-two-variables",
      title: "A solution of y = mx + c",
      words: "(x, y) is a solution when m × x + c works out to y",
      tokens: [
        { kind: "ref", id: "lineY" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "y" },
      ],
      reading: "A linear equation in two variables has infinitely many solutions — one for every point of its line.",
      assumptions: ["Any x you like"],
    },
  ],

  simulation: {
    model: "line",
    params: { walk: "line" },
    playLabel: "Walk the point",
  },

  visualization: {
    renderer: "line",
    hint: "Drag the point, or change the slope and where the line crosses the y-axis.",
    layers: [
      { id: "plane", label: "Plane" },
      { id: "line", label: "Line" },
      { id: "second", label: "Second line" },
      { id: "point", label: "Point" },
      { id: "labels", label: "Words", optional: true },
    ],
  },

  modes: [
    {
      id: "plot",
      label: "Points",
      description: "Plot points in the four quadrants",
      layers: ["plane", "point", "labels"],
      graphs: [],
      equations: ["quadrants"],
    },
    {
      id: "point",
      label: "A line",
      description: "y = mx + c and the points on it",
      layers: ["plane", "line", "point", "labels"],
      graphs: [],
      equations: ["slope-intercept", "on-the-line"],
    },
    {
      id: "pair",
      label: "Two lines",
      description: "Where two lines meet",
      layers: ["plane", "line", "second", "labels"],
      graphs: [],
      equations: ["pair-rule"],
    },
  ],
  defaultMode: "point",
  graphs: [],

  activities: {
    observe: [
      {
        id: "third",
        prompt: "Put the point in the third quadrant.",
        condition: { type: "compare", quantity: "quadrant", op: "eq", value: 3 },
      },
      {
        id: "on",
        prompt: "Put the point on the line.",
        condition: { type: "compare", quantity: "onLine", op: "eq", value: 1 },
      },
    ],

    predict: [
      {
        id: "steeper",
        question: "The slope goes up from 1 to 3. At x = 2, what happens to the line's height?",
        variable: "m",
        from: 1,
        to: 3,
        quantity: "lineY",
        options: ["increase", "decrease", "same"],
        given: { c: 0, x: 2 },
        explanation: "It rises from 2 to 6: a steeper line climbs more for every step right.",
      },
    ],

    experiment: {
      title: "Points on y = 2x + 1",
      instructions: "Find four points on the line y = 2x + 1 and record them.",
      columns: ["x", "y", "lineY", "onLine"],
      minRows: 3,
      discovery: {
        question: "What do the points on the line have in common?",
        choices: [
          { id: "equation", label: "Their y is always 2 × x + 1", correct: true },
          { id: "same-x", label: "They all have the same x", correct: false },
          { id: "same-y", label: "They all have the same y", correct: false },
          { id: "positive", label: "They are all in the first quadrant", correct: false },
        ],
        reveals: "slope-intercept",
        insight: "The line is every solution of the equation drawn at once.",
      },
    },

    explain: [
      {
        id: "line",
        title: "Slope and crossing",
        body: "At the point's x, the line is at height {{lineY}}. The point is on the line: {{onLine}}.",
      },
      {
        id: "pair",
        title: "Two lines",
        body: "The pair has {{solutions}} solution(s). Where they cross: ({{meetX}}, {{meetY}}).",
      },
    ],

    challenges: [
      {
        id: "meet-at",
        title: "Meet at (2, 3)",
        prompt: "Change the two lines so that they meet at (2, 3).",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "solutions", op: "eq", value: 1 },
            { type: "compare", quantity: "meetX", op: "eq", value: 2, tolerance: 0.001 },
            { type: "compare", quantity: "meetY", op: "eq", value: 3, tolerance: 0.001 },
          ],
        },
        hint: "Make each line pass through (2, 3): 3 = m × 2 + c.",
        success: "Both equations are true at (2, 3), so it is the solution of the pair.",
      },
    ],
  },

  realWorld: [
    { title: "Taxi fares", description: "A fixed charge plus so much per kilometre: c is the charge, m the rate, and the fare is a straight line." },
    { title: "Which plan is cheaper?", description: "Two phone plans are two lines. Where they cross, they cost the same; either side, one is cheaper." },
    { title: "Maps", description: "A grid reference is a pair of coordinates: across, then up." },
  ],
});
