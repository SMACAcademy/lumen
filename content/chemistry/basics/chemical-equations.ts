import { defineConcept } from "@ise/concept-schema";

const coefficient = (n: number, which: string, color: "sine" | "cosine" | "tangent" | "angle") => ({
  id: `c${n}`,
  symbol: `n${n}`,
  name: `How many of the ${which} substance`,
  meaning: "The number written in front of the formula. Change this — never the formula itself.",
  binding: { kind: "state" as const, key: `c${n}` },
  control: { type: "range" as const, unit: "1" as const, min: 1, max: 6, step: 1 },
  group: "primary" as const,
  color,
});

/**
 * Chemical equations for class 9 and 10: atoms are only rearranged, so they
 * must add up.
 *
 * The learner changes the numbers in front of the substances until every
 * element has as many atoms on the right as on the left — and finds the
 * masses then match as well. The same reactions sort into the class 10
 * types: combination, decomposition, displacement and double displacement.
 */
export const chemicalEquations = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "chemical-equations",
    title: "Balancing Equations",
    tagline: "Atoms in, atoms out: make every element add up, and the mass does too.",
    domain: "chemistry",
    category: "reactions",
    grade: { min: 9, max: 10 },
    difficulty: "introductory",
    estimatedMinutes: 15,
    objective:
      "Balance a chemical equation by changing only the numbers in front of each substance, see that a balanced equation conserves mass, and name combination, decomposition, displacement and double displacement reactions.",
    tags: ["chemical equations", "balancing", "conservation of mass", "reaction types", "class 9", "class 10"],
  },

  connections: [
    {
      id: "moles-and-reactions",
      title: "Moles and Reactions",
      domain: "chemistry",
      relation: "leads-to",
      note: "A balanced equation tells you how many moles react — and so how many grams.",
      available: true,
    },
  ],

  variables: [
    {
      id: "reaction",
      symbol: "reaction",
      name: "Reaction",
      meaning: "The equation to balance.",
      binding: { kind: "param", key: "reaction" },
      control: {
        type: "choice",
        options: [
          { value: "water", label: "Hydrogen burns to water" },
          { value: "ammonia", label: "Making ammonia" },
          { value: "magnesium-oxide", label: "Magnesium ribbon burns" },
          { value: "rust", label: "Iron rusts" },
          { value: "methane", label: "Methane burns" },
          { value: "limestone", label: "Heating limestone" },
          { value: "electrolysis", label: "Splitting water" },
          { value: "zinc-acid", label: "Zinc in acid" },
          { value: "iron-copper", label: "Iron nail in copper sulfate" },
          { value: "barium-sulfate", label: "Barium chloride + sodium sulfate" },
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
      id: "balanced",
      symbol: "balanced?",
      name: "Balanced",
      meaning: "Whether every element has the same number of atoms on both sides.",
      result: "balanced",
      format: { kind: "label", labels: { "0": "not yet", "1": "yes" } },
      color: "tangent",
      highlight: "tally",
      headline: true,
    },
    {
      id: "unbalanced",
      symbol: "out",
      name: "Elements that do not add up",
      meaning: "How many elements still have different numbers of atoms on the two sides.",
      result: "unbalanced",
      format: { kind: "number", digits: 0 },
      color: "secant",
      highlight: "tally",
    },
    {
      id: "atomsLeft",
      symbol: "atoms in",
      name: "Atoms on the left",
      meaning: "Every atom in the reactants.",
      result: "atomsLeft",
      format: { kind: "number", digits: 0 },
      color: "sine",
      highlight: "molecules",
    },
    {
      id: "atomsRight",
      symbol: "atoms out",
      name: "Atoms on the right",
      meaning: "Every atom in the products.",
      result: "atomsRight",
      format: { kind: "number", digits: 0 },
      color: "cosine",
      highlight: "molecules",
    },
    {
      id: "massLeft",
      symbol: "mass in",
      name: "Mass of the reactants",
      meaning: "If each number were that many moles: the grams going in.",
      result: "massLeft",
      format: { kind: "number", digits: 1 },
      unit: "g",
      color: "sine",
      headline: true,
    },
    {
      id: "massRight",
      symbol: "mass out",
      name: "Mass of the products",
      meaning: "The grams coming out.",
      result: "massRight",
      format: { kind: "number", digits: 1 },
      unit: "g",
      color: "cosine",
      headline: true,
    },
    {
      id: "type",
      symbol: "type",
      name: "Type of reaction",
      meaning: "What kind of change the reaction is.",
      result: "type",
      format: { kind: "label", labels: { "0": "combination", "1": "decomposition", "2": "displacement", "3": "double displacement", "4": "combustion" } },
      color: "neutral",
    },
  ],

  equations: [
    {
      id: "atoms-balance",
      topic: "balancing-equations",
      title: "A balanced equation",
      words: "atoms of each element on the left = atoms of that element on the right",
      tokens: [
        { kind: "ref", id: "atomsLeft" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "atomsRight" },
      ],
      reading: "A reaction rearranges atoms; it never makes or destroys them. Balance by changing the numbers in front, never the formulas.",
      assumptions: ["Element by element, not just the totals"],
      discoverable: true,
    },
    {
      id: "conservation-of-mass",
      topic: "laws-of-combination",
      title: "Conservation of mass",
      words: "mass of the reactants = mass of the products",
      tokens: [
        { kind: "ref", id: "massLeft" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "massRight" },
      ],
      reading: "The same atoms are there before and after, so the mass does not change in a reaction.",
      assumptions: ["Nothing escapes: a closed flask"],
      discoverable: true,
    },
    {
      id: "reaction-types",
      topic: "reaction-types-school",
      title: "Types of reaction",
      words: "combination: A + B → AB; decomposition: AB → A + B; displacement: A + BC → AC + B; double displacement: AB + CD → AD + CB",
      tokens: [
        { kind: "text", value: "A + BC" },
        { kind: "op", value: "=" },
        { kind: "text", value: "AC + B" },
      ],
      reading: "Things join, one thing splits, a more reactive element pushes another out, or two compounds swap partners.",
      assumptions: ["The four class 10 types"],
    },
  ],

  simulation: {
    model: "balancing",
    params: { reaction: "water" },
    playLabel: "Watch it balance",
  },

  visualization: {
    renderer: "balancing",
    hint: "Change the numbers in front of each substance until every row of the tally is ticked.",
    layers: [
      { id: "equation", label: "Equation" },
      { id: "molecules", label: "Molecules" },
      { id: "tally", label: "Atom tally" },
      { id: "labels", label: "Words", optional: true },
    ],
  },

  modes: [
    {
      id: "balance",
      label: "Molecules",
      description: "See every molecule and count the atoms",
      layers: ["equation", "molecules", "tally", "labels"],
      graphs: [],
      equations: ["atoms-balance", "conservation-of-mass"],
    },
    {
      id: "numbers",
      label: "Just the tally",
      description: "Balance from the counts alone",
      layers: ["equation", "tally", "labels"],
      graphs: [],
      equations: ["atoms-balance", "reaction-types"],
    },
  ],
  defaultMode: "balance",
  graphs: [],

  activities: {
    observe: [
      {
        id: "water",
        prompt: "Balance the equation for water.",
        condition: { type: "compare", quantity: "balanced", op: "eq", value: 1 },
      },
      {
        id: "masses",
        prompt: "Make the mass going in match the mass coming out.",
        condition: { type: "compareQuantities", left: "massLeft", op: "eq", right: "massRight", tolerance: 0.01 },
      },
    ],

    predict: [
      {
        id: "more-water",
        question: "2 H₂ + O₂ → 1 H₂O. Now make two water molecules instead of one. What happens to the atoms on the right?",
        variable: "c3",
        from: 1,
        to: 2,
        quantity: "atomsRight",
        options: ["increase", "decrease", "same"],
        given: { reaction: "water", c1: 2, c2: 1 },
        explanation: "They double, from 3 to 6. The number in front multiplies every atom in the formula.",
      },
    ],

    experiment: {
      title: "Mass before and after",
      instructions: "Balance three different reactions and record the mass on each side.",
      columns: ["massLeft", "massRight", "balanced"],
      minRows: 3,
      discovery: {
        question: "What is true of every balanced equation?",
        choices: [
          { id: "same", label: "The mass going in equals the mass coming out", correct: true },
          { id: "more", label: "The products weigh more", correct: false },
          { id: "less", label: "The products weigh less", correct: false },
          { id: "molecules", label: "There are as many molecules on each side", correct: false },
        ],
        reveals: "conservation-of-mass",
        insight: "Molecules can change in number — 2 H₂ + O₂ is three molecules, 2 H₂O is two — but the atoms, and so the mass, stay the same.",
      },
    },

    explain: [
      {
        id: "count",
        title: "Count the atoms",
        body: "There are {{atomsLeft}} atoms on the left and {{atomsRight}} on the right. Every element must match, one by one.",
      },
      {
        id: "mass",
        title: "Mass is conserved",
        body: "{{massLeft}} g goes in and {{massRight}} g comes out. When the equation balances, the two are always equal.",
      },
      {
        id: "type",
        title: "What kind of reaction?",
        body: "This one is a {{type}} reaction.",
      },
    ],

    challenges: [
      {
        id: "rust",
        title: "Rust",
        prompt: "Choose “Iron rusts” and balance Fe + O₂ → Fe₂O₃ in the smallest whole numbers.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "reaction", op: "eq", value: 3 },
            { type: "compare", quantity: "simplest", op: "eq", value: 1 },
          ],
        },
        hint: "Oxygen comes in twos but leaves in threes: find a number both go into.",
        success: "4 Fe + 3 O₂ → 2 Fe₂O₃: six oxygen atoms on each side.",
      },
    ],
  },

  realWorld: [
    { title: "A candle burns away", description: "It seems to lose mass — but the carbon dioxide and water vapour it makes weigh exactly what it lost, plus the oxygen it used." },
    { title: "Cooking gas", description: "Every molecule of methane needs two of oxygen: CH₄ + 2 O₂ → CO₂ + 2 H₂O. Too little air, and a flame turns sooty." },
    { title: "Whitewash", description: "Lime, CaO, made by heating limestone, reacts with water and then with carbon dioxide to form a shiny coat on walls." },
  ],
});
