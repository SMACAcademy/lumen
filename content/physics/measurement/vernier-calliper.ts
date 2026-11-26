import { defineConcept } from "@ise/concept-schema";

/**
 * Units and measurement, made concrete: a vernier calliper you read yourself.
 * Least count, main-scale reading, coinciding division, zero correction and
 * percentage error all come from one model, so a reading can never disagree
 * with the scales drawn beside it.
 */
export const vernierCalliper = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "vernier-calliper",
    title: "Measuring with a Vernier Calliper",
    tagline: "Least count, zero error and the division that lines up.",
    domain: "physics",
    category: "units and measurement",
    grade: { min: 11, max: 12 },
    difficulty: "introductory",
    estimatedMinutes: 15,
    objective:
      "Read a vernier calliper, work out its least count, correct a zero error, and say how precise the answer really is.",
    tags: ["measurement", "instruments", "errors", "jee", "class 11"],
  },

  connections: [
    {
      id: "motion-in-a-straight-line",
      title: "Motion in a Straight Line",
      domain: "physics",
      relation: "leads-to",
      note: "Every measured length carries an uncertainty into whatever you calculate with it.",
      available: true,
    },
    {
      id: "graphs-and-rates",
      title: "Graphs, slopes and areas",
      domain: "mathematics",
      relation: "related",
      note: "Measurements are the points a graph is drawn through.",
      available: true,
    },
  ],

  variables: [
    {
      id: "width",
      symbol: "w",
      name: "Object width",
      meaning: "The true width of the object between the jaws. Drag the calliper to open or close it.",
      binding: { kind: "state", key: "width" },
      control: { type: "range", unit: "mm", min: 0, max: 60, step: 0.01, presets: [2.5, 12.4, 24.85, 41.2] },
      group: "primary",
      color: "curve",
    },
    {
      id: "divisions",
      symbol: "N",
      name: "Vernier divisions",
      meaning: "How many divisions the vernier scale carries. More divisions means a finer least count.",
      binding: { kind: "param", key: "divisions" },
      control: {
        type: "choice",
        options: [
          { value: 10, label: "10" },
          { value: 20, label: "20" },
          { value: 50, label: "50" },
        ],
      },
      group: "primary",
    },
    {
      id: "zeroError",
      symbol: "e",
      name: "Zero error",
      meaning: "What the instrument reads when its jaws are shut. A worn or bent calliper is not at zero.",
      binding: { kind: "param", key: "zeroError" },
      control: { type: "range", unit: "mm", min: -0.5, max: 0.5, step: 0.02, presets: [-0.2, 0, 0.2] },
      group: "motion",
      color: "secant",
    },
  ],

  quantities: [
    {
      id: "leastCount",
      symbol: "LC",
      name: "Least count",
      meaning: "The smallest difference the instrument can resolve: one main division divided by the number of vernier divisions.",
      result: "leastCount",
      format: { kind: "number", digits: 3 },
      unit: "mm",
      color: "angle",
      headline: true,
    },
    {
      id: "mainReading",
      symbol: "MSR",
      name: "Main-scale reading",
      meaning: "The last main-scale mark before the vernier zero.",
      result: "mainReading",
      format: { kind: "number", digits: 1 },
      unit: "mm",
      color: "neutral",
      highlight: "mainScale",
      headline: true,
    },
    {
      id: "coincidence",
      symbol: "VSR",
      name: "Coinciding division",
      meaning: "The vernier division that lines up with a main-scale mark.",
      result: "coincidence",
      format: { kind: "integer" },
      color: "angle",
      highlight: "vernierScale",
      headline: true,
    },
    {
      id: "observedReading",
      symbol: "R",
      name: "Observed reading",
      meaning: "Main-scale reading plus the coinciding division times the least count.",
      result: "observedReading",
      format: { kind: "number", digits: 2 },
      unit: "mm",
      color: "point",
      headline: true,
    },
    {
      id: "zeroErrorValue",
      symbol: "e",
      name: "Zero error",
      meaning: "Subtract it from every reading this instrument gives.",
      result: "zeroError",
      format: { kind: "number", digits: 2 },
      unit: "mm",
      color: "secant",
    },
    {
      id: "correctedReading",
      symbol: "R′",
      name: "Corrected reading",
      meaning: "The observed reading with the zero error taken out.",
      result: "correctedReading",
      format: { kind: "number", digits: 2 },
      unit: "mm",
      color: "sine",
      headline: true,
    },
    {
      id: "trueWidth",
      symbol: "w",
      name: "True width",
      meaning: "What the object actually measures — which a real instrument never quite tells you.",
      result: "width",
      format: { kind: "number", digits: 3 },
      unit: "mm",
      color: "curve",
    },
    {
      id: "absoluteError",
      symbol: "Δw",
      name: "Absolute error",
      meaning: "How far the corrected reading is from the truth. It can never exceed half a least count.",
      result: "absoluteError",
      format: { kind: "number", digits: 3 },
      unit: "mm",
      color: "cosine",
    },
    {
      id: "percentError",
      symbol: "%",
      name: "Percentage error",
      meaning: "The absolute error as a percentage of the measurement — which is why you measure big things with small instruments.",
      result: "percentError",
      format: { kind: "number", digits: 2 },
      color: "tangent",
    },
  ],

  equations: [
    {
      id: "least-count",
      topic: "vernier-screw-gauge",
      title: "Least count",
      tokens: [
        { kind: "ref", id: "leastCount" },
        { kind: "op", value: "=" },
        { kind: "text", value: "1 main division" },
        { kind: "op", value: "/" },
        { kind: "ref", id: "divisions" },
      ],
      reading: "One main-scale division divided by the number of vernier divisions.",
      assumptions: ["The vernier's N divisions span N − 1 main divisions"],
    },
    {
      id: "reading",
      topic: "vernier-screw-gauge",
      title: "Taking a reading",
      tokens: [
        { kind: "ref", id: "observedReading" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "mainReading" },
        { kind: "op", value: "+" },
        { kind: "ref", id: "coincidence" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "leastCount" },
      ],
      reading: "Main-scale reading plus the coinciding division multiplied by the least count.",
      assumptions: [],
    },
    {
      id: "zero-correction",
      topic: "vernier-screw-gauge",
      title: "Correcting a zero error",
      tokens: [
        { kind: "ref", id: "correctedReading" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "observedReading" },
        { kind: "op", value: "−" },
        { kind: "ref", id: "zeroErrorValue" },
      ],
      reading: "Always subtract the zero error, with its sign.",
      assumptions: [],
      discoverable: true,
    },
  ],

  simulation: { model: "vernier-calliper", params: { msd: 1, divisions: 10, zeroError: 0 }, playLabel: "Open the jaws" },

  visualization: {
    renderer: "vernier-calliper",
    hint: "Drag the calliper to open the jaws; the scales below are the fine adjustment, and the magnifier is finer still.",
    layers: [
      { id: "instrument", label: "The instrument" },
      { id: "object", label: "Object in the jaws", optional: true },
      { id: "mainScale", label: "Main scale" },
      { id: "vernierScale", label: "Vernier scale" },
      { id: "detail", label: "Magnifier", optional: true },
      { id: "coincidence", label: "Coinciding division", optional: true },
      { id: "scaleNumbers", label: "Numbers on the scales", optional: true },
      { id: "readout", label: "The working", optional: true },
    ],
  },

  modes: [
    {
      id: "read",
      label: "Read it",
      description: "Take a reading from the scales",
      layers: ["instrument", "object", "mainScale", "vernierScale", "detail", "coincidence", "scaleNumbers", "readout"],
      graphs: [],
      equations: ["least-count", "reading"],
    },
    {
      id: "blind",
      label: "No help",
      description: "The coinciding division is not marked, and nor is the answer",
      layers: ["instrument", "object", "mainScale", "vernierScale", "detail", "scaleNumbers"],
      graphs: [],
      equations: ["reading"],
    },
    {
      id: "zero-error",
      label: "Zero error",
      description: "A bent instrument, and the correction it needs",
      layers: ["instrument", "object", "mainScale", "vernierScale", "detail", "coincidence", "scaleNumbers", "readout"],
      graphs: [],
      equations: ["reading", "zero-correction"],
    },
  ],
  defaultMode: "read",
  graphs: [],

  activities: {
    observe: [
      {
        id: "open-the-jaws",
        prompt: "Drag the calliper open and watch the vernier scale slide along the main scale.",
        condition: { type: "compare", quantity: "width", op: "gt", value: 20 },
      },
      {
        id: "finer-instrument",
        prompt: "Switch to 50 vernier divisions and see the least count fall to 0.02 mm.",
        hint: "More divisions on the same length means a finer instrument.",
        condition: { type: "compare", quantity: "leastCount", op: "lt", value: 0.03 },
      },
      {
        id: "meet-zero-error",
        prompt: "Give the instrument a zero error and watch every reading shift by the same amount.",
        condition: { type: "compare", quantity: "zeroError", op: "neq", value: 0, tolerance: 0.001 },
      },
      {
        id: "small-object",
        prompt: "Measure something tiny — under 3 mm — and look at the percentage error.",
        hint: "The same 0.05 mm of uncertainty matters far more on a small object.",
        condition: { type: "compare", quantity: "percentError", op: "gt", value: 1 },
      },
    ],

    predict: [
      {
        id: "more-divisions",
        question: "The vernier scale is changed from 10 divisions to 50. What happens to the least count?",
        variable: "divisions",
        from: 10,
        to: 50,
        quantity: "leastCount",
        options: ["increase", "decrease", "same"],
        given: { width: 12.43 },
        explanation: "Least count is one main division divided by the number of vernier divisions, so more divisions means a finer instrument.",
      },
      {
        id: "zero-error-reading",
        question: "The same object is measured with a calliper whose zero error changes from 0 to +0.2 mm. What happens to the observed reading?",
        variable: "zeroError",
        from: 0,
        to: 0.2,
        quantity: "observedReading",
        options: ["increase", "decrease", "same"],
        given: { width: 12.4 },
        explanation: "A positive zero error adds itself to every reading. Subtract it to recover the true width.",
      },
      {
        id: "zero-error-corrected",
        question: "With that same zero error, what happens to the **corrected** reading?",
        variable: "zeroError",
        from: 0,
        to: 0.2,
        quantity: "correctedReading",
        options: ["increase", "decrease", "same"],
        given: { width: 12.4 },
        explanation: "That is the whole point of the correction: it takes the instrument's fault back out.",
      },
      {
        id: "bigger-object",
        question: "The same calliper measures a bigger object: the width goes from 4 mm to 40 mm. What happens to the percentage error?",
        variable: "width",
        from: 4.03,
        to: 40.03,
        quantity: "percentError",
        options: ["increase", "decrease", "same"],
        given: { divisions: 10, zeroError: 0 },
        explanation: "The uncertainty stays at a fraction of a millimetre, but it is a much smaller fraction of a bigger length.",
      },
    ],

    experiment: {
      title: "How fine is fine enough?",
      instructions:
        "Keep one object between the jaws and change the number of vernier divisions. Record the least count, the reading and the error each time.",
      columns: ["leastCount", "observedReading", "absoluteError", "percentError"],
      minRows: 3,
      discovery: {
        question: "What limits how close the reading gets to the truth?",
        choices: [
          { id: "half-lc", label: "The error never exceeds half a least count", correct: true },
          { id: "always-exact", label: "A calliper always gives the exact width", correct: false },
          { id: "object-size", label: "Only the size of the object matters", correct: false },
          { id: "zero-error-only", label: "Only the zero error matters", correct: false },
        ],
        reveals: "zero-correction",
        insight:
          "An instrument can only place a reading on its own scale, so the error is at most half a least count — before any zero error is added on top.",
      },
    },

    explain: [
      {
        id: "how-it-works",
        title: "Why the vernier works",
        body: "Each vernier division is one least count shorter than a main division, so only one of them can line up. The one that does tells you the fraction: here it is division {{coincidence}}, giving {{observedReading}}.",
      },
      {
        id: "zero-error-note",
        title: "This instrument is biased",
        body: "It reads {{zeroErrorValue}} with its jaws shut, so every reading is that much out. Corrected, this one is {{correctedReading}}.",
        when: { type: "compare", quantity: "zeroError", op: "neq", value: 0, tolerance: 0.001 },
      },
      {
        id: "exam-note",
        title: "In the exam",
        body: "Least count = pitch ÷ divisions on the circular or vernier scale. Reading = main scale + division × least count. Then subtract the zero error, with its sign — that sign is where most marks are lost.",
      },
    ],

    challenges: [
      {
        id: "read-12-70",
        title: "Set it to 12.70 mm",
        prompt: "Open the jaws until the calliper reads exactly 12.70 mm.",
        goal: { type: "compare", quantity: "observedReading", op: "eq", value: 12.7, tolerance: 0.001 },
        hint: "Main scale at 12 mm, then the seventh vernier division lines up.",
        success: "12 mm on the main scale, plus 7 × 0.1 mm from the vernier.",
      },
      {
        id: "fine-instrument",
        title: "Measure to a hundredth",
        prompt: "Get the least count down to 0.02 mm and measure an object wider than 20 mm.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "leastCount", op: "lt", value: 0.03 },
            { type: "compare", quantity: "width", op: "gt", value: 20 },
          ],
        },
        hint: "Fifty divisions on the vernier scale.",
        success: "With 50 divisions the calliper resolves 0.02 mm — a fiftieth of a millimetre.",
      },
      {
        id: "beat-the-bias",
        title: "Correct a bent calliper",
        prompt: "Set a zero error of −0.2 mm, then find an object whose corrected reading is 20.0 mm.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "zeroError", op: "eq", value: -0.2, tolerance: 0.001 },
            { type: "compare", quantity: "correctedReading", op: "eq", value: 20, tolerance: 0.001 },
          ],
        },
        hint: "With a negative zero error the instrument under-reads, so the observed reading will be 19.8 mm.",
        success: "Observed 19.8 mm, minus the −0.2 mm error, gives the true 20.0 mm.",
      },
    ],
  },

  realWorld: [
    { title: "Engine workshops", description: "Piston and bearing clearances are quoted to hundredths of a millimetre, measured exactly this way." },
    { title: "Lab practicals", description: "The vernier and the screw gauge are the two instruments every physics practical exam asks about." },
    { title: "3D printing", description: "Checking a printed part against its design is a calliper job — and a lesson in tolerances." },
  ],
});
