import { defineConcept } from "@ise/concept-schema";

const coefficient = (n: number, which: string, color: "sine" | "cosine" | "tangent" | "angle") => ({
  id: `c${n}`,
  symbol: `n${n}`,
  name: `How many of the ${which} substance`,
  meaning: "The number in front of the formula.",
  binding: { kind: "state" as const, key: `c${n}` },
  control: { type: "range" as const, unit: "1" as const, min: 1, max: 6, step: 1 },
  group: "primary" as const,
  color,
});

/**
 * Redox reactions for class 11: oxidation numbers, balancing by electrons,
 * and which way a reaction goes.
 *
 * Each species shows the oxidation numbers of its elements. The element
 * whose number rises is oxidised and loses electrons; the one whose number
 * falls is reduced and gains them. The equation balances by making the
 * electrons lost equal the electrons gained, then the atoms and charge.
 * Electrode potentials say whether it runs.
 */
export const redoxReactions = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "redox-reactions",
    title: "Redox Reactions",
    tagline: "Oxidation numbers, electrons lost and gained, and which way a reaction runs.",
    domain: "chemistry",
    category: "electrochemistry",
    grade: { min: 11, max: 11 },
    difficulty: "core",
    estimatedMinutes: 20,
    objective:
      "Assign oxidation numbers, identify what is oxidised and reduced and the oxidising and reducing agents, balance redox equations by equating electrons lost and gained, and use standard electrode potentials to decide whether a redox reaction happens.",
    tags: ["redox", "oxidation number", "oxidising agent", "reducing agent", "balancing", "electrode potential", "class 11"],
  },

  connections: [
    {
      id: "chemical-equations",
      title: "Balancing Equations",
      domain: "chemistry",
      relation: "prerequisite",
      note: "Balancing by atoms first met in class 10; redox adds electrons and charge.",
      available: true,
    },
    {
      id: "galvanic-cells",
      title: "Galvanic Cells",
      domain: "chemistry",
      relation: "leads-to",
      note: "Split a redox reaction into two half-cells and the electrons flow through a wire.",
      available: true,
    },
  ],

  variables: [
    {
      id: "reaction",
      symbol: "reaction",
      name: "Reaction",
      meaning: "The redox reaction to study.",
      binding: { kind: "param", key: "reaction" },
      control: {
        type: "choice",
        options: [
          { value: "zinc-copper", label: "Zinc in copper sulfate" },
          { value: "copper-silver", label: "Copper in silver nitrate" },
          { value: "iron-iodide", label: "Iron(III) and iodide" },
          { value: "chlorine-bromide", label: "Chlorine and bromide" },
          { value: "magnesium-acid", label: "Magnesium in acid" },
          { value: "hydrogen-oxygen", label: "Hydrogen burns" },
          { value: "iron-ore", label: "Iron ore and carbon monoxide" },
          { value: "thermite", label: "Thermite" },
          { value: "copper-zinc", label: "Copper in zinc sulfate?" },
          { value: "bromine-chloride", label: "Bromine and chloride?" },
        ],
      },
      group: "primary",
      color: "neutral",
    },
    coefficient(1, "first", "sine"),
    coefficient(2, "second", "cosine"),
    coefficient(3, "third", "tangent"),
    coefficient(4, "fourth", "angle"),
  ],

  quantities: [
    {
      id: "electronsLost",
      symbol: "e⁻ lost",
      name: "Electrons lost",
      meaning: "By the element oxidised, with the numbers in front.",
      result: "electronsLost",
      format: { kind: "number", digits: 0 },
      color: "sine",
      highlight: "electrons",
      headline: true,
    },
    {
      id: "electronsGained",
      symbol: "e⁻ gained",
      name: "Electrons gained",
      meaning: "By the element reduced, with the numbers in front.",
      result: "electronsGained",
      format: { kind: "number", digits: 0 },
      color: "cosine",
      highlight: "electrons",
      headline: true,
    },
    {
      id: "balanced",
      symbol: "balanced?",
      name: "Balanced",
      meaning: "Atoms and charge both add up.",
      result: "balanced",
      format: { kind: "label", labels: { "0": "not yet", "1": "yes" } },
      color: "tangent",
      highlight: "tally",
      headline: true,
    },
    {
      id: "chargeLeft",
      symbol: "charge in",
      name: "Charge on the left",
      meaning: "The total charge of the reactants.",
      result: "chargeLeft",
      format: { kind: "number", digits: 0 },
      color: "neutral",
      highlight: "tally",
    },
    {
      id: "chargeRight",
      symbol: "charge out",
      name: "Charge on the right",
      meaning: "The total charge of the products.",
      result: "chargeRight",
      format: { kind: "number", digits: 0 },
      color: "neutral",
      highlight: "tally",
    },
    {
      id: "ecell",
      symbol: "E°cell",
      name: "Standard cell potential",
      meaning: "E° of the couple reduced minus E° of the couple oxidised. Positive: the reaction goes.",
      result: "ecell",
      format: { kind: "number", digits: 2 },
      unit: "V",
      color: "angle",
    },
    {
      id: "spontaneous",
      symbol: "goes?",
      name: "Does it happen?",
      meaning: "Whether the reaction runs by itself as written.",
      result: "spontaneous",
      format: { kind: "label", labels: { "0": "no", "1": "yes" } },
      color: "angle",
    },
  ],

  equations: [
    {
      id: "ox-sum",
      topic: "oxidation-number",
      title: "Oxidation numbers add up to the charge",
      words: "the oxidation numbers of the atoms in a species add up to its charge",
      tokens: [
        { kind: "text", value: "Σ oxidation numbers" },
        { kind: "op", value: "=" },
        { kind: "text", value: "charge" },
      ],
      reading: "In Fe₂O₃, 2 × (+3) + 3 × (−2) = 0. Start from the rules — O is −2, H is +1, an element on its own is 0 — and the rest follows.",
      assumptions: ["O is −2 except in peroxides; H is +1 except in metal hydrides"],
      discoverable: true,
    },
    {
      id: "electron-balance",
      topic: "balancing-redox",
      title: "Balancing a redox equation",
      words: "electrons lost = electrons gained",
      tokens: [
        { kind: "ref", id: "electronsLost" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "electronsGained" },
      ],
      reading: "Find how many electrons each atom loses or gains from the change in oxidation number, make the totals equal with the numbers in front, then balance the remaining atoms and check the charge.",
      assumptions: ["The oxidation number method"],
      discoverable: true,
    },
    {
      id: "cell-potential",
      topic: "redox-electrodes",
      title: "Will it go?",
      words: "E°cell = E°(couple reduced) − E°(couple oxidised); the reaction goes if E°cell > 0",
      tokens: [
        { kind: "ref", id: "ecell" },
        { kind: "op", value: "=" },
        { kind: "text", value: "E°(reduced)" },
        { kind: "op", value: "−" },
        { kind: "text", value: "E°(oxidised)" },
      ],
      reading: "Zinc (−0.76 V) gives its electrons to copper ions (+0.34 V): E°cell = 1.10 V, so zinc displaces copper. Copper cannot displace zinc.",
      assumptions: ["Standard conditions"],
      discoverable: true,
    },
  ],

  simulation: {
    model: "redox",
    params: { reaction: "zinc-copper" },
    playLabel: "Balance it",
  },

  visualization: {
    renderer: "redox",
    hint: "Pick a reaction and change the numbers in front: electrons first, then atoms and charge.",
    layers: [
      { id: "equation", label: "Equation" },
      { id: "ox", label: "Oxidation numbers" },
      { id: "electrons", label: "Electrons" },
      { id: "tally", label: "Tally" },
      { id: "labels", label: "Words", optional: true },
    ],
  },

  modes: [
    {
      id: "oxidation",
      label: "Oxidation numbers",
      description: "Who loses electrons, who gains them",
      layers: ["equation", "ox", "electrons", "labels"],
      graphs: [],
      equations: ["ox-sum", "cell-potential"],
    },
    {
      id: "balance",
      label: "Balance",
      description: "Electrons, atoms and charge",
      layers: ["equation", "ox", "electrons", "tally", "labels"],
      graphs: [],
      equations: ["electron-balance", "cell-potential"],
    },
  ],
  defaultMode: "oxidation",
  graphs: [],

  activities: {
    observe: [
      {
        id: "balance-one",
        prompt: "Balance any reaction completely.",
        condition: { type: "compare", quantity: "balanced", op: "eq", value: 1 },
      },
      {
        id: "no-go",
        prompt: "Find a reaction that does not happen.",
        condition: { type: "compare", quantity: "spontaneous", op: "eq", value: 0 },
      },
    ],

    predict: [
      {
        id: "more-silver",
        question: "Copper in silver nitrate: the number of Ag⁺ goes from 1 to 2. What happens to the electrons gained?",
        variable: "c2",
        from: 1,
        to: 2,
        quantity: "electronsGained",
        options: ["increase", "decrease", "same"],
        given: { reaction: "copper-silver", c1: 1 },
        explanation: "It doubles, from 1 to 2 — now matching the 2 electrons each copper atom loses.",
      },
    ],

    experiment: {
      title: "Electrons and balance",
      instructions: "Balance three reactions and record the electrons lost and gained.",
      columns: ["electronsLost", "electronsGained", "balanced"],
      minRows: 3,
      discovery: {
        question: "What is true of every balanced redox equation?",
        choices: [
          { id: "equal", label: "Electrons lost equal electrons gained", correct: true },
          { id: "more-lost", label: "More electrons are lost than gained", correct: false },
          { id: "zero", label: "No electrons change hands", correct: false },
          { id: "atoms", label: "Only the atoms need to match", correct: false },
        ],
        reveals: "electron-balance",
        insight: "Electrons are not made or destroyed: every one lost by the reducing agent is taken by the oxidising agent.",
      },
    },

    explain: [
      {
        id: "electrons",
        title: "Counting electrons",
        body: "{{electronsLost}} electrons lost and {{electronsGained}} gained. When the two are equal, the atoms and the charge can be made to add up.",
      },
      {
        id: "direction",
        title: "Which way?",
        body: "E°cell = {{ecell}} V. A positive E°cell means the reaction goes as written: {{spontaneous}}.",
      },
    ],

    challenges: [
      {
        id: "thermite",
        title: "Thermite",
        prompt: "Choose the thermite reaction and balance it: Al + Fe₂O₃ → Al₂O₃ + Fe.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "reaction", op: "eq", value: 7 },
            { type: "compare", quantity: "simplest", op: "eq", value: 1 },
          ],
        },
        hint: "Each Al loses 3 electrons; each Fe₂O₃ gains 6.",
        success: "2Al + Fe₂O₃ → Al₂O₃ + 2Fe: six electrons each way. It welds railway lines.",
      },
    ],
  },

  realWorld: [
    { title: "Rusting", description: "Iron is oxidised from 0 to +3 and oxygen reduced from 0 to −2 — a slow redox reaction." },
    { title: "Bleach", description: "Chlorine-based bleach is an oxidising agent: it takes electrons from coloured molecules." },
    { title: "Welding rails", description: "Thermite: aluminium reduces iron oxide so fiercely that the iron comes out molten." },
  ],
});
