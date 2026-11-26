import { defineConcept } from "@ise/concept-schema";

/**
 * Chemical thermodynamics, taught from one straight line.
 *
 * ΔG = ΔH − TΔS, plotted against temperature, starts at ΔH and slopes down
 * by ΔS. Where it dips below zero, the reaction runs by itself. The signs of
 * ΔH and ΔS sort every reaction into four kinds — always, never, only when
 * hot, only when cold — and ΔG° = −RT ln K says how far it goes.
 */
export const gibbsEnergy = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "gibbs-energy",
    title: "Gibbs Energy",
    tagline: "Why ice melts above 0 °C, why limestone needs a furnace, and when any reaction will run by itself.",
    domain: "chemistry",
    category: "thermodynamics",
    grade: { min: 11, max: 11 },
    difficulty: "core",
    estimatedMinutes: 25,
    objective:
      "Use ΔG = ΔH − TΔS to decide whether a reaction is spontaneous, find the temperature at which it changes, classify reactions by the signs of ΔH and ΔS, and relate ΔG° to K.",
    tags: ["thermodynamics", "gibbs energy", "entropy", "enthalpy", "spontaneity", "jee", "neet", "class 11"],
  },

  connections: [
    {
      id: "thermal-properties",
      title: "Thermal Properties of Matter",
      domain: "physics",
      relation: "prerequisite",
      note: "Melting at 0 °C is where ΔG changes sign: the latent heat is ΔH, and it equals TΔS exactly there.",
      available: true,
    },
    {
      id: "chemical-equilibrium",
      title: "Chemical Equilibrium",
      domain: "chemistry",
      relation: "related",
      note: "ΔG° = −RT ln K: a negative ΔG° means K > 1, and products win.",
      available: true,
    },
    {
      id: "galvanic-cells",
      title: "Galvanic Cells",
      domain: "chemistry",
      relation: "related",
      note: "ΔG = −nFE: a cell's voltage is its Gibbs energy, per electron.",
      available: true,
    },
  ],

  variables: [
    {
      id: "T",
      symbol: "T",
      name: "Temperature",
      meaning: "Drag along the line, or press play to warm the reaction up.",
      binding: { kind: "state", key: "T" },
      control: { type: "range", unit: "K", min: 100, max: 2000, step: 1, presets: [273, 298, 1000] },
      group: "primary",
      color: "secant",
    },
    {
      id: "dH",
      symbol: "ΔH",
      name: "Enthalpy change",
      meaning: "Heat given out (negative) or taken in (positive). Where the line starts.",
      binding: { kind: "param", key: "dH" },
      control: { type: "range", unit: "kJ/mol", min: -1000, max: 1000, step: 0.01, presets: [-92.2, 6.01, 178] },
      group: "primary",
      color: "secant",
    },
    {
      id: "dS",
      symbol: "ΔS",
      name: "Entropy change",
      meaning: "More disorder (positive) or less. The line slopes down by this much per kelvin.",
      binding: { kind: "param", key: "dS" },
      control: { type: "range", unit: "J/molK", min: -300, max: 300, step: 0.1, presets: [-198.7, 22, 161] },
      group: "primary",
      color: "sine",
    },
  ],

  quantities: [
    {
      id: "dG",
      symbol: "ΔG",
      name: "Gibbs energy change",
      meaning: "ΔH − TΔS. Negative means the reaction runs by itself.",
      result: "dG",
      format: { kind: "number", digits: 2 },
      unit: "kJ/mol",
      color: "curve",
      highlight: "chart",
      headline: true,
    },
    {
      id: "spontaneous",
      symbol: "goes?",
      name: "Spontaneous",
      meaning: "Whether it runs by itself at this temperature.",
      result: "spontaneous",
      format: { kind: "label", labels: { "0": "no", "1": "yes" } },
      color: "tangent",
      highlight: "chart",
      headline: true,
    },
    {
      id: "crossoverT",
      symbol: "T*",
      name: "Crossover temperature",
      meaning: "ΔH/ΔS: where ΔG changes sign. −1 when it never does.",
      result: "crossoverT",
      format: { kind: "number", digits: 0 },
      unit: "K",
      color: "angle",
      highlight: "chart",
      headline: true,
    },
    {
      id: "quadrant",
      symbol: "kind",
      name: "Kind of reaction",
      meaning: "Set by the signs of ΔH and ΔS alone.",
      result: "quadrant",
      format: { kind: "label", labels: { "0": "goes at any temperature", "1": "never goes", "2": "goes when cold", "3": "goes when hot" } },
      color: "angle",
      highlight: "quadrants",
      headline: true,
    },
    {
      id: "TdS",
      symbol: "TΔS",
      name: "Entropy term",
      meaning: "T times ΔS, in kJ/mol so that it can be set against ΔH.",
      result: "TdS",
      format: { kind: "number", digits: 2 },
      unit: "kJ/mol",
      color: "sine",
      highlight: "terms",
    },
    {
      id: "log10K",
      symbol: "log K",
      name: "log₁₀ K",
      meaning: "From ΔG° = −RT ln K: each 5.7 kJ/mol more negative at room temperature is ten times more product.",
      result: "log10K",
      format: { kind: "number", digits: 2 },
      color: "vector",
    },
    {
      id: "K",
      symbol: "K",
      name: "Equilibrium constant",
      meaning: "e^(−ΔG°/RT).",
      result: "K",
      format: { kind: "sig", figures: 3 },
      color: "vector",
    },
    {
      id: "celsius",
      symbol: "θ",
      name: "Temperature in °C",
      meaning: "The same temperature on the everyday scale.",
      result: "celsius",
      format: { kind: "number", digits: 0 },
      unit: "degC",
      color: "secant",
    },
  ],

  equations: [
    {
      id: "gibbs",
      topic: "gibbs-energy",
      title: "Gibbs energy",
      tokens: [
        { kind: "ref", id: "dG" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "dH" },
        { kind: "op", value: "−" },
        { kind: "ref", id: "TdS" },
      ],
      reading: "Energy released, minus what the temperature makes of the change in disorder. Below zero, the reaction goes.",
      assumptions: ["Constant temperature and pressure", "ΔH and ΔS roughly constant with T"],
      discoverable: true,
    },
    {
      id: "crossover",
      topic: "gibbs-energy",
      title: "Where it changes its mind",
      tokens: [
        { kind: "ref", id: "crossoverT" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "dH" },
        { kind: "op", value: "/" },
        { kind: "ref", id: "dS" },
      ],
      reading: "Set ΔG = 0 and solve for T. It only exists when ΔH and ΔS have the same sign.",
      assumptions: ["ΔS in kJ/(mol K) here"],
    },
    {
      id: "gibbs-k",
      topic: "gibbs-energy",
      title: "Gibbs energy and K",
      tokens: [
        { kind: "text", value: "ΔG°" },
        { kind: "op", value: "=" },
        { kind: "text", value: "−RT ln" },
        { kind: "ref", id: "K" },
      ],
      reading: "A negative ΔG° means K > 1: at equilibrium there is more product than reactant.",
      assumptions: ["Standard states"],
      discoverable: true,
    },
  ],

  simulation: {
    model: "gibbs",
    params: { dH: 6.01, dS: 22 },
    playLabel: "Warm it up",
  },

  visualization: {
    renderer: "gibbs",
    hint: "Drag along the line to change the temperature, or change ΔH and ΔS and watch it tilt.",
    layers: [
      { id: "chart", label: "ΔG against T" },
      { id: "terms", label: "ΔH and TΔS", optional: true },
      { id: "quadrants", label: "Four kinds of reaction", optional: true },
      { id: "labels", label: "Labels", optional: true },
    ],
  },

  modes: [
    {
      id: "full",
      label: "Everything",
      description: "The line, its two terms and the four kinds",
      layers: ["chart", "terms", "quadrants", "labels"],
      graphs: [],
      equations: ["gibbs", "crossover"],
    },
    {
      id: "line",
      label: "Just the line",
      description: "ΔG against temperature",
      layers: ["chart", "labels"],
      graphs: [],
      equations: ["gibbs"],
    },
    {
      id: "kinds",
      label: "Four kinds",
      description: "The terms and the sign grid",
      layers: ["chart", "terms", "quadrants", "labels"],
      graphs: [],
      equations: ["gibbs-k"],
    },
  ],
  defaultMode: "full",
  graphs: [],

  activities: {
    observe: [
      {
        id: "melt-it",
        prompt: "This is ice melting: ΔH = +6.01 kJ/mol, ΔS = +22 J/(mol K). Warm it past 273 K and watch ΔG go negative.",
        condition: { type: "compare", quantity: "spontaneous", op: "eq", value: 1 },
      },
      {
        id: "haber",
        prompt: "Set ΔH = −92.2 and ΔS = −198.7: the Haber process. It goes only when cool.",
        condition: { type: "compare", quantity: "quadrant", op: "eq", value: 2 },
      },
      {
        id: "never",
        prompt: "Make a reaction that never goes: heat in, and less disorder.",
        condition: { type: "compare", quantity: "quadrant", op: "eq", value: 1 },
      },
    ],

    predict: [
      {
        id: "warmer-ice",
        question: "Ice at 250 K is warmed to 300 K. What happens to ΔG for melting?",
        variable: "T",
        from: 250,
        to: 300,
        quantity: "dG",
        options: ["increase", "decrease", "same"],
        given: { dH: 6.01, dS: 22 },
        explanation: "It falls, from +0.51 to −0.59 kJ/mol. With ΔS positive, every kelvin makes TΔS bigger and ΔG smaller.",
      },
      {
        id: "warmer-haber",
        question: "The Haber process (ΔS negative) is warmed from 400 K to 600 K. What happens to ΔG?",
        variable: "T",
        from: 400,
        to: 600,
        quantity: "dG",
        options: ["increase", "decrease", "same"],
        given: { dH: -92.2, dS: -198.7 },
        explanation: "It rises — past zero. With ΔS negative, heat works against the reaction.",
      },
      {
        id: "more-entropy",
        question: "A reaction with ΔH = +50 kJ/mol has its ΔS raised from 100 to 200 J/(mol K). What happens to its crossover temperature?",
        variable: "dS",
        from: 100,
        to: 200,
        quantity: "crossoverT",
        options: ["increase", "decrease", "same"],
        given: { dH: 50, T: 298 },
        explanation: "It halves, 500 K to 250 K. More disorder gained means a lower temperature is enough to pay for the heat taken in.",
      },
    ],

    experiment: {
      title: "When does ice melt?",
      instructions: "With ΔH = +6.01 kJ/mol and ΔS = +22 J/(mol K), record ΔG at 250 K, 270 K, 280 K and 300 K.",
      columns: ["dG", "TdS", "spontaneous", "crossoverT"],
      minRows: 4,
      discovery: {
        question: "What decides the temperature at which ice starts to melt?",
        choices: [
          { id: "ratio", label: "Where TΔS grows as big as ΔH: T = ΔH/ΔS", correct: true },
          { id: "zero", label: "Always 0 °C, whatever ΔH and ΔS are", correct: false },
          { id: "dh", label: "Only ΔH: the bigger it is, the sooner it melts", correct: false },
          { id: "never", label: "Nothing: melting is never spontaneous", correct: false },
        ],
        reveals: "gibbs",
        insight: "ΔG = ΔH − TΔS. Ice needs heat to melt (ΔH > 0) but gains disorder (ΔS > 0); above 6010 / 22 = 273 K the disorder wins.",
      },
    },

    explain: [
      {
        id: "two-drives",
        title: "Two drives",
        body: "Nature favours giving out heat (ΔH < 0) and gaining disorder (ΔS > 0). ΔG weighs one against the other, with temperature setting how much disorder counts. At this temperature ΔG is {{dG}} kJ/mol.",
      },
      {
        id: "four-kinds",
        title: "Four kinds of reaction",
        body: "Both drives favourable: always goes. Both unfavourable: never. Otherwise it depends on temperature — heat favours whichever direction gains entropy. This one {{quadrant}}.",
      },
      {
        id: "spontaneous-not-fast",
        title: "Spontaneous is not the same as fast",
        body: "ΔG says whether a reaction can go by itself, not how quickly. Diamond turning to graphite is spontaneous — and takes longer than the age of the universe.",
      },
      {
        id: "exam-note",
        title: "In the exam",
        body: "Expect: ΔG = ΔH − TΔS with unit conversion (J to kJ!), the crossover temperature, the four sign cases, ΔG° = −2.303RT log K, and ΔG = −nFE.",
      },
    ],

    challenges: [
      {
        id: "limestone",
        title: "The lime kiln",
        prompt: "Limestone: ΔH = +178 kJ/mol, ΔS = +161 J/(mol K). Find the lowest temperature at which it decomposes.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "dH", op: "eq", value: 178, tolerance: 0.5 },
            { type: "compare", quantity: "dS", op: "eq", value: 161, tolerance: 0.5 },
            { type: "compare", quantity: "dG", op: "eq", value: 0, tolerance: 0.5 },
          ],
        },
        hint: "T = ΔH/ΔS — remember ΔS is in joules.",
        success: "About 1106 K, or 830 °C: why lime kilns burn so hot.",
      },
      {
        id: "always",
        title: "Always spontaneous",
        prompt: "Choose a ΔH and ΔS that make a reaction spontaneous at every temperature.",
        goal: { type: "compare", quantity: "quadrant", op: "eq", value: 0 },
        hint: "Give heat out, and gain disorder.",
        success: "ΔH < 0 and ΔS > 0: a combustion that makes more gas molecules than it uses goes at any temperature.",
      },
    ],
  },

  realWorld: [
    { title: "Ice packs", description: "An instant cold pack dissolves a salt endothermically — it runs anyway because the disorder it gains outweighs the heat it takes in." },
    { title: "Lime kilns", description: "Limestone only breaks down into lime above about 830 °C, where TΔS finally beats ΔH." },
    { title: "Protein folding", description: "A protein folds when the ordering of its chain is paid for by the disorder it releases into the surrounding water." },
  ],
});
