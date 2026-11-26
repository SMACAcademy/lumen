import { defineConcept } from "@ise/concept-schema";

/**
 * The mole concept and stoichiometry, taught at the balance.
 *
 * Weigh out two reactants, turn grams into moles, and let the balanced
 * equation decide what happens. Whichever reactant runs out first — the
 * limiting reagent — sets how much product forms; the other is left over.
 * And however far the reaction goes, the total mass on the balance does not
 * change by a microgram.
 */
export const molesAndReactions = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "moles-and-reactions",
    title: "Moles and Reactions",
    tagline: "Weigh out the reactants, count them in moles, and find which one runs out first.",
    domain: "chemistry",
    category: "basic concepts",
    grade: { min: 11, max: 11 },
    difficulty: "introductory",
    estimatedMinutes: 20,
    objective:
      "Convert between grams and moles with n = m/M, use the mole ratio of a balanced equation, identify the limiting reagent, and calculate the theoretical yield and the excess left over.",
    tags: ["mole concept", "stoichiometry", "limiting reagent", "molar mass", "conservation of mass", "jee", "neet", "class 11"],
  },

  connections: [
    {
      id: "formulae-and-concentration",
      title: "Formulae and Concentration",
      domain: "chemistry",
      relation: "related",
      note: "Where atomic masses come from, what a formula is made of, and moles in solution.",
      available: true,
    },
    {
      id: "chemical-equilibrium",
      title: "Chemical Equilibrium",
      domain: "chemistry",
      relation: "leads-to",
      note: "Here reactions go to completion. In equilibrium they stop part-way — and the same mole ratios still hold.",
      available: true,
    },
    {
      id: "reaction-rates",
      title: "Reaction Rates",
      domain: "chemistry",
      relation: "leads-to",
      note: "How much product forms is stoichiometry; how fast it forms is kinetics.",
      available: true,
    },
  ],

  variables: [
    {
      id: "progress",
      symbol: "extent",
      name: "How far the reaction has gone",
      meaning: "0 before it starts, 1 when the limiting reagent is used up. Press play to let it run.",
      binding: { kind: "state", key: "progress" },
      control: { type: "range", unit: "1", min: 0, max: 1, step: 0.01 },
      group: "primary",
      color: "angle",
    },
    {
      id: "reaction",
      symbol: "reaction",
      name: "Reaction",
      meaning: "Each has its own mole ratio, from its balanced equation.",
      binding: { kind: "param", key: "reaction" },
      control: {
        type: "choice",
        options: [
          { value: "water", label: "2H₂ + O₂ → 2H₂O" },
          { value: "ammonia", label: "N₂ + 3H₂ → 2NH₃" },
          { value: "methane", label: "CH₄ + 2O₂ → CO₂ + 2H₂O" },
        ],
      },
      group: "primary",
      color: "curve",
    },
    {
      id: "massA",
      symbol: "m₁",
      name: "Mass of the first reactant",
      meaning: "H₂, N₂ or CH₄, in grams, as weighed on the balance.",
      binding: { kind: "param", key: "massA" },
      control: { type: "range", unit: "g", min: 0, max: 60, step: 0.5, presets: [4, 8, 28] },
      group: "primary",
      color: "sine",
    },
    {
      id: "massB",
      symbol: "m₂",
      name: "Mass of the second reactant",
      meaning: "O₂ or H₂, in grams.",
      binding: { kind: "param", key: "massB" },
      control: { type: "range", unit: "g", min: 0, max: 120, step: 1, presets: [6, 32, 64] },
      group: "primary",
      color: "cosine",
    },
  ],

  quantities: [
    {
      id: "limiting",
      symbol: "limiting",
      name: "Limiting reagent",
      meaning: "The reactant that runs out first, and so decides how much product forms.",
      result: "limiting",
      format: { kind: "label", labels: { "-1": "nothing to react", "0": "the first reactant", "1": "the second reactant", "2": "neither — exact proportions" } },
      color: "angle",
      highlight: "bars",
      headline: true,
    },
    {
      id: "theoreticalYield",
      symbol: "yield",
      name: "Theoretical yield",
      meaning: "Grams of the (first) product when the limiting reagent is used up.",
      result: "theoreticalYield",
      format: { kind: "number", digits: 2 },
      unit: "g",
      color: "tangent",
      highlight: "molecules",
      headline: true,
    },
    {
      id: "excessLeft",
      symbol: "excess",
      name: "Excess left over",
      meaning: "Grams of the other reactant still there at the end.",
      result: "excessLeft",
      format: { kind: "number", digits: 2 },
      unit: "g",
      color: "cosine",
      headline: true,
    },
    {
      id: "molesAStart",
      symbol: "n₁",
      name: "Moles of the first reactant",
      meaning: "n = m / M: its mass divided by its molar mass.",
      result: "molesAStart",
      format: { kind: "number", digits: 3 },
      unit: "mol",
      color: "sine",
      highlight: "bars",
      headline: true,
    },
    {
      id: "molesBStart",
      symbol: "n₂",
      name: "Moles of the second reactant",
      meaning: "Its mass divided by its molar mass.",
      result: "molesBStart",
      format: { kind: "number", digits: 3 },
      unit: "mol",
      color: "cosine",
      highlight: "bars",
    },
    {
      id: "massBNeeded",
      symbol: "m₂ needed",
      name: "Second reactant needed",
      meaning: "Grams of it that would use up all of the first reactant exactly.",
      result: "massBNeeded",
      format: { kind: "number", digits: 2 },
      unit: "g",
      color: "reference",
    },
    {
      id: "totalMass",
      symbol: "m_total",
      name: "Total mass",
      meaning: "Everything in the flask. It does not change as the reaction goes.",
      result: "totalMass",
      format: { kind: "number", digits: 2 },
      unit: "g",
      color: "neutral",
      highlight: "mass",
    },
    {
      id: "massC",
      symbol: "m(product)",
      name: "Product made so far",
      meaning: "Grams of the first product at this point in the reaction.",
      result: "massC",
      format: { kind: "number", digits: 2 },
      unit: "g",
      color: "tangent",
    },
  ],

  equations: [
    {
      id: "moles",
      topic: "mole-concept",
      words: "moles = mass ÷ molar mass",
      title: "Grams into moles",
      tokens: [
        { kind: "ref", id: "molesAStart" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "massA" },
        { kind: "op", value: "/" },
        { kind: "text", value: "M" },
      ],
      reading: "Divide the mass by the molar mass. 32 g of O₂ is one mole; so is 2 g of H₂.",
      assumptions: ["M from the periodic table: H 1, C 12, N 14, O 16"],
      discoverable: true,
    },
    {
      id: "limiting-rule",
      topic: "limiting-reagent",
      title: "The limiting reagent",
      tokens: [
        { kind: "text", value: "extent" },
        { kind: "op", value: "=" },
        { kind: "text", value: "smaller of n₁/ν₁ and n₂/ν₂" },
      ],
      reading: "Divide each reactant's moles by its coefficient; the smaller answer is how much reaction can happen, and that reactant is limiting.",
      assumptions: ["The reaction goes to completion"],
      discoverable: true,
    },
    {
      id: "conservation",
      topic: "stoichiometry",
      title: "Conservation of mass",
      tokens: [
        { kind: "ref", id: "totalMass" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "massA" },
        { kind: "op", value: "+" },
        { kind: "ref", id: "massB" },
      ],
      reading: "Atoms are rearranged, never made or destroyed, so the mass on the balance never changes.",
      assumptions: ["A closed flask"],
    },
  ],

  simulation: {
    model: "stoichiometry",
    params: { reaction: "water", massA: 4, massB: 32 },
    playLabel: "Let them react",
  },

  visualization: {
    renderer: "stoichiometry",
    hint: "Change the masses on the balance, then let the reaction run and see what is left.",
    layers: [
      { id: "molecules", label: "Molecules" },
      { id: "bars", label: "Moles of each" },
      { id: "mass", label: "Total mass", optional: true },
      { id: "labels", label: "Labels", optional: true },
    ],
  },

  modes: [
    {
      id: "flask",
      label: "Flask and moles",
      description: "The molecules and the mole bars",
      layers: ["molecules", "bars", "mass", "labels"],
      graphs: [],
      equations: ["moles", "limiting-rule"],
    },
    {
      id: "molecules",
      label: "Just the molecules",
      description: "Count them yourself",
      layers: ["molecules", "labels"],
      graphs: [],
      equations: ["moles"],
    },
    {
      id: "numbers",
      label: "Moles and mass",
      description: "The bars and the balance",
      layers: ["bars", "mass", "labels"],
      graphs: [],
      equations: ["limiting-rule", "conservation"],
    },
  ],
  defaultMode: "flask",
  graphs: [],

  activities: {
    observe: [
      {
        id: "let-them-react",
        prompt: "4 g of hydrogen and 32 g of oxygen. Let them react: every molecule is used, and 36 g of water forms.",
        condition: { type: "compare", quantity: "progress", op: "eq", value: 1 },
      },
      {
        id: "too-much-hydrogen",
        prompt: "Double the hydrogen to 8 g and react again. Oxygen runs out first; half the hydrogen is left.",
        condition: { type: "compare", quantity: "limiting", op: "eq", value: 1 },
      },
      {
        id: "methane",
        prompt: "Switch to burning methane: two products from one reaction.",
        condition: { type: "compare", quantity: "reaction", op: "eq", value: 2 },
      },
    ],

    predict: [
      {
        id: "more-excess",
        question: "4 g of hydrogen with 32 g of oxygen made 36 g of water. The oxygen is doubled to 64 g. What happens to the water that can form?",
        variable: "massB",
        from: 32,
        to: 64,
        quantity: "theoreticalYield",
        options: ["increase", "decrease", "same"],
        given: { reaction: "water", massA: 4, progress: 0 },
        explanation: "Nothing. Hydrogen is now the limiting reagent; the extra oxygen has nothing to react with and is simply left over.",
      },
      {
        id: "more-limiting",
        question: "With 32 g of oxygen, the hydrogen goes from 2 g to 4 g. What happens to the water that can form?",
        variable: "massA",
        from: 2,
        to: 4,
        quantity: "theoreticalYield",
        options: ["increase", "decrease", "same"],
        given: { reaction: "water", massB: 32, progress: 0 },
        explanation: "It doubles, 18 g to 36 g — hydrogen was limiting, so more of it means more water.",
      },
      {
        id: "mass-conserved",
        question: "The reaction runs from start to finish. What happens to the total mass in the flask?",
        variable: "progress",
        from: 0,
        to: 1,
        quantity: "totalMass",
        options: ["increase", "decrease", "same"],
        given: { reaction: "water", massA: 8, massB: 32 },
        tolerance: 1e-6,
        explanation: "It stays exactly the same — 40 g before and after. Atoms are only rearranged.",
      },
    ],

    experiment: {
      title: "Which one runs out?",
      instructions: "Keep 32 g of oxygen and try 2, 4, 6 and 8 g of hydrogen. Record the water that forms and what is left over.",
      columns: ["molesAStart", "theoreticalYield", "excessLeft", "limiting"],
      minRows: 4,
      discovery: {
        question: "Once there is more than 4 g of hydrogen, what decides how much water forms?",
        choices: [
          { id: "oxygen", label: "The oxygen — it has become the limiting reagent", correct: true },
          { id: "hydrogen", label: "The hydrogen, always", correct: false },
          { id: "total", label: "The total mass of both", correct: false },
          { id: "ratio", label: "Whichever there is more grams of", correct: false },
        ],
        reveals: "limiting-rule",
        insight: "Divide each reactant's moles by its coefficient; the smaller number wins. Grams can mislead — 8 g of hydrogen is four moles, far more than the one mole in 32 g of oxygen.",
      },
    },

    explain: [
      {
        id: "why-moles",
        title: "Why moles, not grams?",
        body: "Reactions count particles: two H₂ molecules for every O₂. A mole is a fixed number of particles (6.022 × 10²³), so moles let you count by weighing.",
      },
      {
        id: "limiting",
        title: "The limiting reagent",
        body: "It is not the one with less mass, but the one that runs out first given the equation's ratio. Here the limiting reagent is {{limiting}}.",
      },
      {
        id: "exam-note",
        title: "In the exam",
        body: "Expect: n = m/M, molar volume at STP, the mole ratio, limiting reagent and excess, theoretical and percentage yield, and empirical formulae from percentage composition.",
      },
    ],

    challenges: [
      {
        id: "exact-ammonia",
        title: "Exactly right",
        prompt: "For N₂ + 3H₂ → 2NH₃, weigh out 28 g of nitrogen and just enough hydrogen to use it all.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "reaction", op: "eq", value: 1 },
            { type: "compare", quantity: "limiting", op: "eq", value: 2 },
          ],
        },
        hint: "28 g of N₂ is one mole; it needs three moles of H₂.",
        success: "6 g of hydrogen: three moles, exactly — and 34 g of ammonia.",
      },
      {
        id: "most-water",
        title: "As much water as possible",
        prompt: "Make at least 50 g of water from hydrogen and oxygen.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "reaction", op: "eq", value: 0 },
            { type: "compare", quantity: "theoreticalYield", op: "gte", value: 50 },
          ],
        },
        hint: "Both reactants have to go up together, in a 1 : 8 ratio by mass.",
        success: "Water is one-ninth hydrogen by mass: 50 g needs about 5.6 g of H₂ and 44.4 g of O₂.",
      },
    ],
  },

  realWorld: [
    { title: "Rocket fuel", description: "Hydrogen–oxygen engines carry their two propellants in the exact mole ratio, so neither tank is wasted weight." },
    { title: "Medicine", description: "Drug manufacture uses a cheap reagent in excess so that the expensive one is fully used — it is made the limiting reagent on purpose." },
    { title: "Baking", description: "A recipe is stoichiometry: run out of eggs and the extra flour is simply left over." },
  ],
});
