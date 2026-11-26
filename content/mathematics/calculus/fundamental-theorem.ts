import { defineConcept } from "@ise/concept-schema";

/**
 * The fundamental theorem of calculus, the slope graph run backwards: sweep
 * a line along f and plot the area collected so far. That area graph's slope
 * is f, so it is an antiderivative; starting somewhere else only adds a
 * constant; and the area from a to b is F(b) − F(a). On a velocity–time
 * graph the same picture turns speed into distance.
 */
export const fundamentalTheorem = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "fundamental-theorem",
    title: "The Fundamental Theorem",
    tagline: "Sweep a line along a curve and plot the area it collects: the new graph's slope is the curve you started with.",
    domain: "mathematics",
    category: "calculus",
    grade: { min: 12, max: 12 },
    difficulty: "core",
    estimatedMinutes: 30,
    objective:
      "See the area function A(x) = ∫ₐˣ f(t) dt grow as a line sweeps along f, recognise that its slope is f(x) so that it is an antiderivative, understand the + C as the choice of starting point, evaluate a definite integral as F(b) − F(a), and read displacement, distance and acceleration from a velocity–time graph.",
    tags: ["integration", "antiderivative", "fundamental theorem", "definite integral", "area function", "velocity-time graph", "displacement", "class 12"],
  },

  connections: [
    {
      id: "slope-graph",
      title: "The Slope Graph",
      domain: "mathematics",
      relation: "prerequisite",
      note: "The derivative as a function — this lab runs it backwards.",
      available: true,
    },
    {
      id: "rules-of-differentiation",
      title: "Rules of Differentiation",
      domain: "mathematics",
      relation: "prerequisite",
      note: "Every antiderivative is a derivative read the other way round.",
      available: true,
    },
    {
      id: "motion-in-a-straight-line",
      title: "Motion in a Straight Line",
      domain: "physics",
      relation: "related",
      note: "Displacement is the area under the v–t graph; acceleration is its slope.",
      available: true,
    },
  ],

  variables: [
    {
      id: "function",
      symbol: "f",
      name: "Curve",
      meaning: "The function whose area is collected. The last is a car's velocity against time.",
      binding: { kind: "param", key: "function" },
      control: {
        type: "choice",
        options: [
          { value: "linear", label: "2x" },
          { value: "square", label: "3x²" },
          { value: "cosine", label: "cos x" },
          { value: "exp", label: "eˣ" },
          { value: "reciprocal", label: "1/x" },
          { value: "velocity", label: "Velocity of a car" },
        ],
      },
      group: "primary",
      color: "curve",
    },
    {
      id: "x",
      symbol: "x",
      name: "Where the sweep line is",
      meaning: "Drag it, or press play: the area from a to here is collected and plotted below. For the car it is the time t, in s.",
      binding: { kind: "state", key: "x" },
      control: { type: "range", unit: "1", min: -2, max: 8, step: 0.05 },
      group: "primary",
      color: "angle",
    },
    {
      id: "a",
      symbol: "a",
      name: "Where the collecting starts",
      meaning: "The lower limit of the integral. Moving it shifts the whole area graph up or down.",
      binding: { kind: "state", key: "a" },
      control: { type: "range", unit: "1", min: -2, max: 8, step: 0.05 },
      group: "primary",
      color: "secant",
    },
  ],

  quantities: [
    {
      id: "area",
      symbol: "A(x)",
      name: "Area collected so far",
      meaning: "∫ₐˣ f(t) dt: area above the axis counts positive, below it negative. For the car, the displacement in m.",
      result: "area",
      format: { kind: "number", digits: 2 },
      color: "secant",
      highlight: "accumulated",
      headline: true,
    },
    {
      id: "fx",
      symbol: "f(x)",
      name: "Height of the curve at the line",
      meaning: "For the car, the velocity in m/s.",
      result: "fx",
      format: { kind: "number", digits: 2 },
      color: "curve",
      highlight: "function",
      headline: true,
    },
    {
      id: "areaSlope",
      symbol: "A′(x)",
      name: "Slope of the area graph",
      meaning: "Measured from the area graph itself, at the line.",
      result: "areaSlope",
      format: { kind: "number", digits: 2 },
      color: "tangent",
      highlight: "tangent",
      headline: true,
    },
    {
      id: "sum",
      symbol: "Σ f·Δx",
      name: "The same area as a sum of 200 thin strips",
      meaning: "Each strip's height times its width, added up. It agrees with A(x) to two decimals.",
      result: "sum",
      format: { kind: "number", digits: 2 },
      color: "neutral",
    },
    {
      id: "constant",
      symbol: "C",
      name: "The constant in A(x) = F(x) + C",
      meaning: "C = −F(a): set by where the collecting starts.",
      result: "constant",
      format: { kind: "number", digits: 2 },
      color: "secant",
      highlight: "family",
    },
    {
      id: "antiderivative",
      symbol: "F(x)",
      name: "The antiderivative with no constant",
      meaning: "x² for 2x, x³ for 3x², sin x for cos x, eˣ for eˣ, ln x for 1/x.",
      result: "antiderivative",
      format: { kind: "number", digits: 2 },
      color: "neutral",
    },
    {
      id: "rising",
      symbol: "A is",
      name: "Rising or falling",
      meaning: "The sign of f(x).",
      result: "rising",
      format: { kind: "label", labels: { "-1": "falling", "0": "level", "1": "rising" } },
      color: "tangent",
    },
    {
      id: "totalArea",
      symbol: "∫|f|",
      name: "Area counted without sign",
      meaning: "Every bit of area counted positive. For the car, the distance travelled in m.",
      result: "totalArea",
      format: { kind: "number", digits: 2 },
      color: "sine",
      highlight: "area",
    },
    {
      id: "accel",
      symbol: "f′(x)",
      name: "Slope of the curve",
      meaning: "For the car, the acceleration in m/s².",
      result: "accel",
      format: { kind: "number", digits: 2 },
      color: "curve",
      highlight: "track",
    },
  ],

  equations: [
    {
      id: "accumulation",
      topic: "fundamental-theorem",
      title: "The first fundamental theorem",
      tokens: [
        { kind: "text", value: "d/dx ∫ₐˣ f(t) dt" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "fx" },
      ],
      reading: "NCERT's first fundamental theorem: if A(x) = ∫ₐˣ f(t) dt, then A′(x) = f(x). Push the line a little further, by Δx, and the area grows by a thin strip about f(x) tall: ΔA ≈ f(x)·Δx. So the slope of the area graph is f(x) — wherever the line is.",
      assumptions: ["f continuous on the interval", "Area below the axis counts negative"],
      discoverable: true,
    },
    {
      id: "antiderivative",
      topic: "antiderivatives",
      title: "Antiderivatives",
      tokens: [
        { kind: "text", value: "∫ f(x) dx" },
        { kind: "op", value: "=" },
        { kind: "text", value: "F(x)" },
        { kind: "op", value: "+" },
        { kind: "ref", id: "constant" },
      ],
      reading: "Any F with F′ = f is an antiderivative, and so is F + C for every constant C: a shift up or down changes no slope. ∫2x dx = x² + C, ∫3x² dx = x³ + C, ∫cos x dx = sin x + C, ∫eˣ dx = eˣ + C, ∫dx/x = ln|x| + C (NCERT writes log|x|).",
      assumptions: ["On an interval where f is continuous"],
      discoverable: true,
    },
    {
      id: "evaluation",
      topic: "fundamental-theorem",
      title: "The second fundamental theorem",
      tokens: [
        { kind: "text", value: "∫ₐᵇ f(x) dx" },
        { kind: "op", value: "=" },
        { kind: "text", value: "F(b)" },
        { kind: "op", value: "−" },
        { kind: "text", value: "F(a)" },
      ],
      reading: "NCERT's second fundamental theorem, for evaluating a definite integral. Find any antiderivative F, then subtract its value at the lower limit from its value at the upper. The + C cancels, so it does not matter which F you use: ∫₁² 3x² dx = 2³ − 1³ = 7.",
      assumptions: ["f continuous on [a, b]"],
    },
    {
      id: "displacement",
      topic: "derivatives-for-physics",
      title: "Displacement from a velocity–time graph",
      tokens: [
        { kind: "ref", id: "area" },
        { kind: "op", value: "=" },
        { kind: "text", value: "∫ v dt, the area under the v–t graph" },
      ],
      reading: "Velocity is the rate of change of displacement, so displacement is the area under the v–t graph: s = ∫ v dt. Area below the time axis is motion backwards; counting it positive instead gives the distance travelled.",
      words: "displacement = area under the velocity–time graph",
      assumptions: ["Motion along a straight line", "Displacement measured from where the object was at the start time"],
      discoverable: true,
    },
    {
      id: "acceleration",
      topic: "derivatives-for-physics",
      title: "Acceleration from a velocity–time graph",
      tokens: [
        { kind: "ref", id: "accel" },
        { kind: "op", value: "=" },
        { kind: "text", value: "dv/dt, the slope of the v–t graph" },
      ],
      reading: "A straight rising segment is a steady acceleration, a flat one steady velocity, a falling one a deceleration. At a corner the acceleration changes suddenly; the lab shows the value just after it.",
      words: "acceleration = slope of the velocity–time graph",
      assumptions: ["Motion along a straight line"],
    },
  ],

  simulation: {
    model: "accumulate",
    params: { function: "linear" },
    playLabel: "Sweep the line",
  },

  visualization: {
    renderer: "accumulate",
    hint: "Press play: the line sweeps right and the area it collects is plotted underneath. Move a to start the collecting somewhere else.",
    layers: [
      { id: "function", label: "Curve f" },
      { id: "area", label: "Shaded area" },
      { id: "accumulated", label: "Area graph A(x)" },
      { id: "tangent", label: "Tangent to A" },
      { id: "family", label: "Other antiderivatives" },
      { id: "track", label: "Track" },
      { id: "labels", label: "Words", optional: true },
    ],
  },

  modes: [
    {
      id: "sweep",
      label: "Area so far",
      description: "Collect the area under f and plot it as you go",
      layers: ["function", "area", "accumulated", "tangent", "labels"],
      graphs: [],
      equations: ["accumulation", "evaluation"],
    },
    {
      id: "family",
      label: "+ C",
      description: "Start somewhere else: the area graph shifts, its shape does not",
      layers: ["function", "area", "accumulated", "tangent", "family", "labels"],
      graphs: [],
      equations: ["antiderivative", "evaluation"],
    },
    {
      id: "motion",
      label: "Distance from speed",
      description: "A velocity–time graph filling up into displacement",
      layers: ["function", "area", "accumulated", "tangent", "track", "labels"],
      graphs: [],
      equations: ["displacement", "acceleration"],
    },
  ],
  defaultMode: "sweep",
  graphs: [],

  activities: {
    observe: [
      {
        id: "sweep-across",
        prompt: "Sweep the line all the way across.",
        condition: { type: "compare", quantity: "progress", op: "gte", value: 0.99 },
      },
      {
        id: "level-off",
        prompt: "Find a place where the area graph is level.",
        condition: { type: "compare", quantity: "rising", op: "eq", value: 0 },
      },
    ],

    predict: [
      {
        id: "cancelling",
        question: "f(x) = 2x, collected from a = −2. The line moves from x = −1 to x = 1. What happens to the area so far?",
        variable: "x",
        from: -1,
        to: 1,
        quantity: "area",
        options: ["increase", "decrease", "same"],
        given: { function: "linear", a: -2 },
        explanation: "It stays at −3. From −1 to 0 the strip is below the axis and takes away 1; from 0 to 1 the strip above the axis puts exactly 1 back.",
      },
    ],

    experiment: {
      title: "How steep is the area graph?",
      instructions: "Choose any curve. At five places, record f(x) and the slope of the area graph.",
      columns: ["x", "fx", "areaSlope"],
      minRows: 4,
      discovery: {
        question: "How does the slope of the area graph compare with f(x)?",
        choices: [
          { id: "equal", label: "They are equal", correct: true },
          { id: "double", label: "The slope is twice f(x)", correct: false },
          { id: "area", label: "The slope equals the area", correct: false },
          { id: "unrelated", label: "No pattern", correct: false },
        ],
        reveals: "accumulation",
        insight: "Each small step Δx adds a strip of area about f(x)·Δx, so the area graph rises by f(x) for every unit of x: its slope is f(x).",
      },
    },

    explain: [
      {
        id: "sweep",
        title: "Area so far",
        body: "The area from a to the line is {{area}}; 200 thin strips add up to {{sum}}. Here f(x) = {{fx}} and the area graph's slope is {{areaSlope}}, so A is {{rising}}.",
      },
      {
        id: "family",
        title: "Which antiderivative",
        body: "A(x) = F(x) + C with F(x) = {{antiderivative}} and C = {{constant}}. Moving a changes C, not the slope {{areaSlope}}.",
      },
      {
        id: "motion",
        title: "For the car",
        body: "Displacement {{area}} m and distance travelled {{totalArea}} m. Velocity {{fx}} m/s, acceleration {{accel}} m/s².",
        when: { type: "compare", quantity: "function", op: "eq", value: 5 },
      },
    ],

    challenges: [
      {
        id: "back-to-zero",
        title: "Back to zero",
        prompt: "On cos x, collecting from a = 0, find the next place where the area so far is zero again.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "function", op: "eq", value: 2 },
            { type: "compare", quantity: "a", op: "eq", value: 0, tolerance: 0.01 },
            { type: "compare", quantity: "x", op: "gt", value: 1 },
            { type: "compare", quantity: "area", op: "eq", value: 0, tolerance: 0.02 },
          ],
        },
        hint: "The area above the axis must be paid back by area below it.",
        success: "x = π: sin π − sin 0 = 0. The hump above the axis from 0 to π/2 is exactly cancelled by the dip below it from π/2 to π.",
      },
    ],
  },

  realWorld: [
    { title: "Odometer and speedometer", description: "A car's odometer adds up the area under its speedometer reading against time; the speedometer is the odometer's slope." },
    { title: "Filling a tank", description: "With the flow rate in litres per minute plotted against time, the water in the tank is the area so far." },
    { title: "Electricity bills", description: "Energy is the area under a power–time graph: a meter adds up kilowatts × hours into kilowatt-hours." },
  ],
});
