import { defineConcept } from "@ise/concept-schema";

/**
 * Solutions for class 12: Raoult's law for mixtures of two volatile
 * liquids, ideal and non-ideal behaviour and azeotropes, and Henry's law for
 * gases dissolving in water.
 */
export const liquidMixtures = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "liquid-mixtures",
    title: "Raoult's Law and Solutions",
    tagline: "Mix two liquids and read their vapour pressure — straight line, bulge or sag — and see how gases dissolve under pressure.",
    domain: "chemistry",
    category: "solutions",
    grade: { min: 12, max: 12 },
    difficulty: "core",
    estimatedMinutes: 20,
    objective:
      "Apply Raoult's law to a mixture of two volatile liquids, find the vapour's composition, distinguish ideal solutions from those with positive and negative deviations and explain azeotropes, and use Henry's law for the solubility of a gas.",
    tags: ["Raoult's law", "vapour pressure", "ideal solution", "azeotrope", "Henry's law", "class 12"],
  },

  connections: [
    {
      id: "colligative-properties",
      title: "Colligative Properties",
      domain: "chemistry",
      relation: "leads-to",
      note: "Make B a non-volatile solute and Raoult's law gives the lowering of vapour pressure.",
      available: true,
    },
  ],

  variables: [
    {
      id: "pair",
      symbol: "A + B",
      name: "Liquids",
      meaning: "The two liquids mixed, the more volatile first.",
      binding: { kind: "param", key: "pair" },
      control: {
        type: "choice",
        options: [
          { value: "benzene-toluene", label: "Benzene + toluene" },
          { value: "hexane-heptane", label: "Hexane + heptane" },
          { value: "acetone-chloroform", label: "Acetone + chloroform" },
          { value: "ethanol-water", label: "Ethanol + water" },
        ],
      },
      group: "primary",
      color: "neutral",
    },
    {
      id: "xA",
      symbol: "x_A",
      name: "Mole fraction of A",
      meaning: "0 is pure B, 1 pure A.",
      binding: { kind: "state", key: "xA" },
      control: { type: "range", unit: "1", min: 0, max: 1, step: 0.05 },
      group: "primary",
      color: "sine",
    },
    {
      id: "gas",
      symbol: "gas",
      name: "Gas over the water",
      meaning: "For Henry's law.",
      binding: { kind: "param", key: "gas" },
      control: {
        type: "choice",
        options: [
          { value: "he", label: "Helium" },
          { value: "n2", label: "Nitrogen" },
          { value: "o2", label: "Oxygen" },
          { value: "co2", label: "Carbon dioxide" },
        ],
      },
      group: "primary",
      color: "neutral",
    },
    {
      id: "pressure",
      symbol: "p",
      name: "Gas pressure",
      meaning: "The partial pressure of the gas above the water.",
      binding: { kind: "state", key: "pressure" },
      control: { type: "range", unit: "bar", min: 0.1, max: 10, step: 0.1 },
      group: "primary",
      color: "angle",
    },
  ],

  quantities: [
    {
      id: "pTotal",
      symbol: "p",
      name: "Total vapour pressure",
      meaning: "Of the mixture: p_A + p_B.",
      result: "pTotal",
      format: { kind: "number", digits: 2 },
      unit: "kPa",
      color: "angle",
      highlight: "curves",
      headline: true,
    },
    {
      id: "pA",
      symbol: "p_A",
      name: "Partial pressure of A",
      meaning: "x_A times A's pure vapour pressure, in an ideal mixture.",
      result: "pA",
      format: { kind: "number", digits: 2 },
      unit: "kPa",
      color: "sine",
    },
    {
      id: "pB",
      symbol: "p_B",
      name: "Partial pressure of B",
      meaning: "x_B times B's pure vapour pressure, in an ideal mixture.",
      result: "pB",
      format: { kind: "number", digits: 2 },
      unit: "kPa",
      color: "cosine",
    },
    {
      id: "pAStar",
      symbol: "p_A*",
      name: "Pure A's vapour pressure",
      meaning: "At 298 K.",
      result: "pAStar",
      format: { kind: "number", digits: 1 },
      unit: "kPa",
      color: "sine",
    },
    {
      id: "idealTotal",
      symbol: "p (ideal)",
      name: "Raoult's law prediction",
      meaning: "What an ideal mixture of these two would give.",
      result: "idealTotal",
      format: { kind: "number", digits: 2 },
      unit: "kPa",
      color: "neutral",
    },
    {
      id: "deviationSign",
      symbol: "deviation",
      name: "Deviation from Raoult's law",
      meaning: "Above the ideal line, below it, or on it.",
      result: "deviationSign",
      format: { kind: "label", labels: { "-1": "negative", "0": "none — ideal", "1": "positive" } },
      color: "angle",
      headline: true,
    },
    {
      id: "yA",
      symbol: "y_A",
      name: "Mole fraction of A in the vapour",
      meaning: "p_A ÷ p: richer in the more volatile liquid.",
      result: "yA",
      format: { kind: "number", digits: 2 },
      color: "sine",
    },
    {
      id: "azeotrope",
      symbol: "azeotrope?",
      name: "Forms an azeotrope",
      meaning: "Whether the total vapour pressure has a maximum or minimum between the pure liquids.",
      result: "azeotrope",
      format: { kind: "label", labels: { "0": "no", "1": "yes" } },
      color: "angle",
    },
    {
      id: "mmolPerL",
      symbol: "c",
      name: "Gas dissolved",
      meaning: "Millimoles of gas per litre of water, from Henry's law.",
      result: "mmolPerL",
      format: { kind: "number", digits: 2 },
      color: "angle",
      highlight: "flask",
      headline: true,
    },
  ],

  equations: [
    {
      id: "raoult",
      topic: "raoults-law",
      title: "Raoult's law",
      words: "partial vapour pressure = mole fraction × pure vapour pressure",
      tokens: [
        { kind: "ref", id: "pA" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "xA" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "pAStar" },
      ],
      reading: "In an ideal mixture each liquid escapes in proportion to how much of it there is. The total is a straight line from pure B to pure A.",
      assumptions: ["An ideal solution"],
      discoverable: true,
    },
    {
      id: "vapour",
      topic: "raoults-law",
      title: "The vapour's composition",
      words: "y_A = p_A ÷ p — the vapour is richer in the more volatile liquid",
      tokens: [
        { kind: "ref", id: "yA" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "pA" },
        { kind: "op", value: "/" },
        { kind: "ref", id: "pTotal" },
      ],
      reading: "Which is why fractional distillation works: each boil-and-condense enriches the more volatile liquid.",
      assumptions: ["Dalton's law of partial pressures"],
    },
    {
      id: "deviation",
      topic: "ideal-nonideal",
      title: "Ideal and non-ideal solutions",
      words: "A–B attractions weaker than A–A and B–B: positive deviation; stronger: negative deviation; the same: ideal",
      tokens: [
        { kind: "text", value: "A–B weaker" },
        { kind: "op", value: "=" },
        { kind: "text", value: "positive deviation" },
      ],
      reading: "Ethanol breaks up water's hydrogen bonds, so both escape more easily (positive). Chloroform hydrogen-bonds to acetone, so both escape less easily (negative). Deviate enough and you get an azeotrope that boils without changing composition.",
      assumptions: ["Two volatile liquids"],
      discoverable: true,
    },
    {
      id: "henry",
      topic: "solubility",
      title: "Henry's law",
      words: "mole fraction of a gas dissolved = its partial pressure ÷ K_H",
      tokens: [
        { kind: "text", value: "x" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "pressure" },
        { kind: "op", value: "/" },
        { kind: "text", value: "K_H" },
      ],
      reading: "Double the pressure, double the gas dissolved. A small K_H means a very soluble gas: CO₂'s is 1.67 kbar, N₂'s 76.5.",
      assumptions: ["Dilute solutions", "Gases that do not react with water much"],
      discoverable: true,
    },
  ],

  simulation: {
    model: "raoult",
    params: { pair: "benzene-toluene", gas: "o2" },
    playLabel: "Sweep the mixture",
  },

  visualization: {
    renderer: "raoult",
    hint: "Raoult: pick two liquids and a composition. Henry: pick a gas and a pressure.",
    layers: [
      { id: "curves", label: "Vapour pressure" },
      { id: "flask", label: "Gas and water" },
      { id: "labels", label: "Words", optional: true },
    ],
  },

  modes: [
    {
      id: "raoult",
      label: "Raoult's law",
      description: "Vapour pressure against composition",
      layers: ["curves", "labels"],
      graphs: [],
      equations: ["raoult", "vapour", "deviation"],
    },
    {
      id: "henry",
      label: "Henry's law",
      description: "A gas dissolving under pressure",
      layers: ["flask", "labels"],
      graphs: [],
      equations: ["henry"],
    },
  ],
  defaultMode: "raoult",
  graphs: [],

  activities: {
    observe: [
      {
        id: "sag",
        prompt: "Find a mixture below Raoult's line.",
        condition: { type: "compare", quantity: "deviationSign", op: "eq", value: -1 },
      },
      {
        id: "fizz",
        prompt: "Dissolve more than 100 mmol of gas per litre.",
        condition: { type: "compare", quantity: "mmolPerL", op: "gt", value: 100 },
      },
    ],

    predict: [
      {
        id: "more-benzene",
        question: "Benzene + toluene: the benzene fraction goes from 0.2 to 0.8. What happens to the vapour pressure?",
        variable: "xA",
        from: 0.2,
        to: 0.8,
        quantity: "pTotal",
        options: ["increase", "decrease", "same"],
        given: { pair: "benzene-toluene" },
        explanation: "It rises in a straight line, from 5.6 to 10.9 kPa: benzene is the more volatile liquid.",
      },
    ],

    experiment: {
      title: "Partial pressures",
      instructions: "For benzene + toluene, record x_A and p_A at four compositions.",
      columns: ["xA", "pA", "pTotal"],
      minRows: 3,
      discovery: {
        question: "How does benzene's partial pressure depend on its mole fraction?",
        choices: [
          { id: "proportional", label: "p_A = x_A × p_A*: in proportion", correct: true },
          { id: "constant", label: "It is always p_A*", correct: false },
          { id: "square", label: "It grows with x_A squared", correct: false },
          { id: "inverse", label: "It falls as x_A rises", correct: false },
        ],
        reveals: "raoult",
        insight: "Half the molecules at the surface are benzene, so benzene escapes at half its pure rate.",
      },
    },

    explain: [
      {
        id: "mixture",
        title: "The mixture",
        body: "p = {{pTotal}} kPa against Raoult's {{idealTotal}} kPa: deviation {{deviationSign}}. The vapour is {{yA}} A.",
      },
      {
        id: "gas",
        title: "The gas",
        body: "{{mmolPerL}} mmol of gas dissolve in each litre of water — in proportion to the pressure.",
      },
    ],

    challenges: [
      {
        id: "richest",
        title: "Strongest vapour",
        prompt: "Ethanol + water: find the mixture with the highest vapour pressure.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "pair", op: "eq", value: 3 },
            { type: "compare", quantity: "pTotal", op: "gte", value: 8.02 },
          ],
        },
        hint: "It is not pure ethanol.",
        success: "The azeotrope, near 90% ethanol: it boils lowest, without changing composition — so distillation cannot pass it.",
      },
    ],
  },

  realWorld: [
    { title: "Petrol refining", description: "Fractional distillation separates hydrocarbons because each vapour is richer in the more volatile ones." },
    { title: "95% alcohol", description: "Distilling ethanol stops at about 95%: the azeotrope. Going further needs other tricks." },
    { title: "Soda and the bends", description: "Fizzy drinks are CO₂ forced in under pressure; divers get the bends when nitrogen, dissolved at depth, comes out too fast." },
  ],
});
