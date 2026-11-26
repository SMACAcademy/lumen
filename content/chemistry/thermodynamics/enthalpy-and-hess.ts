import { defineConcept } from "@ise/concept-schema";

/**
 * Enthalpy and Hess's law for class 11: the sign of ΔH, heat as an
 * extensive quantity, enthalpies of reaction from enthalpies of formation,
 * and estimates from bond enthalpies.
 */
export const enthalpyAndHess = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "enthalpy-and-hess",
    title: "Enthalpy and Hess's Law",
    tagline: "Which reactions give out heat, how much, and why any route between the same start and end gives the same ΔH.",
    domain: "chemistry",
    category: "thermodynamics",
    grade: { min: 11, max: 11 },
    difficulty: "core",
    estimatedMinutes: 20,
    objective:
      "Tell exothermic from endothermic reactions by the sign of ΔH, scale the heat with the amount of reaction, calculate ΔrH from standard enthalpies of formation using Hess's law, and estimate ΔrH for gas reactions from bond enthalpies.",
    tags: ["enthalpy", "Hess's law", "exothermic", "endothermic", "enthalpy of formation", "bond enthalpy", "class 11"],
  },

  connections: [
    {
      id: "gibbs-energy",
      title: "Gibbs Energy",
      domain: "chemistry",
      relation: "leads-to",
      note: "ΔH is half of ΔG = ΔH − TΔS: whether a reaction goes also depends on entropy.",
      available: true,
    },
    {
      id: "molecular-orbitals",
      title: "Molecular Orbitals",
      domain: "chemistry",
      relation: "related",
      note: "Bond enthalpies are what the bond orders predict: N≡N 946 kJ/mol against F–F 158.",
      available: true,
    },
  ],

  variables: [
    {
      id: "reaction",
      symbol: "reaction",
      name: "Reaction",
      meaning: "The reaction, as written.",
      binding: { kind: "param", key: "reaction" },
      control: {
        type: "choice",
        options: [
          { value: "hcl", label: "H₂ + Cl₂ → 2HCl" },
          { value: "methane-liquid", label: "Methane burns (liquid water)" },
          { value: "methane-gas", label: "Methane burns (steam)" },
          { value: "ammonia", label: "N₂ + 3H₂ → 2NH₃" },
          { value: "carbon-monoxide", label: "C + ½O₂ → CO" },
          { value: "limestone", label: "CaCO₃ → CaO + CO₂" },
          { value: "water", label: "H₂ + ½O₂ → H₂O(l)" },
          { value: "ethene", label: "C₂H₄ + H₂ → C₂H₆" },
          { value: "nitric-oxide", label: "N₂ + O₂ → 2NO" },
        ],
      },
      group: "primary",
      color: "neutral",
    },
    {
      id: "n",
      symbol: "n",
      name: "Moles of reaction",
      meaning: "How many times the reaction as written happens.",
      binding: { kind: "state", key: "n" },
      control: { type: "range", unit: "mol", min: 0.5, max: 4, step: 0.5 },
      group: "primary",
      color: "sine",
    },
  ],

  quantities: [
    {
      id: "deltaH",
      symbol: "ΔH",
      name: "Enthalpy of reaction",
      meaning: "Per mole of reaction as written. Negative: heat given out.",
      result: "deltaH",
      format: { kind: "number", digits: 1 },
      unit: "kJ/mol",
      color: "angle",
      highlight: "hess",
      headline: true,
    },
    {
      id: "exothermic",
      symbol: "exo?",
      name: "Heat flows",
      meaning: "Out of the system (exothermic) or into it (endothermic).",
      result: "exothermic",
      format: { kind: "label", labels: { "0": "in: endothermic", "1": "out: exothermic" } },
      color: "angle",
      headline: true,
    },
    {
      id: "heat",
      symbol: "q",
      name: "Heat released",
      meaning: "By n moles of reaction; negative means heat taken in.",
      result: "heat",
      format: { kind: "number", digits: 1 },
      unit: "kJ",
      color: "secant",
      headline: true,
    },
    {
      id: "reactantsH",
      symbol: "ΣΔfH(reactants)",
      name: "Reactants' enthalpy of formation",
      meaning: "Their total, the elements counting zero.",
      result: "reactantsH",
      format: { kind: "number", digits: 1 },
      unit: "kJ/mol",
      color: "sine",
    },
    {
      id: "productsH",
      symbol: "ΣΔfH(products)",
      name: "Products' enthalpy of formation",
      meaning: "Their total.",
      result: "productsH",
      format: { kind: "number", digits: 1 },
      unit: "kJ/mol",
      color: "cosine",
    },
    {
      id: "bondsBroken",
      symbol: "broken",
      name: "Bonds broken",
      meaning: "Energy to break every bond in the reactants (gases only).",
      result: "bondsBroken",
      format: { kind: "number", digits: 1 },
      unit: "kJ/mol",
      color: "secant",
      highlight: "bonds",
    },
    {
      id: "bondsFormed",
      symbol: "formed",
      name: "Bonds formed",
      meaning: "Energy released forming every bond in the products.",
      result: "bondsFormed",
      format: { kind: "number", digits: 1 },
      unit: "kJ/mol",
      color: "tangent",
      highlight: "bonds",
    },
    {
      id: "bondEstimate",
      symbol: "ΔH (bonds)",
      name: "Estimate from bond enthalpies",
      meaning: "Bonds broken − bonds formed: close, not exact, because bond enthalpies are averages.",
      result: "bondEstimate",
      format: { kind: "number", digits: 1 },
      unit: "kJ/mol",
      color: "angle",
      highlight: "bonds",
    },
  ],

  equations: [
    {
      id: "formation-route",
      topic: "hess-law",
      title: "Hess's law with enthalpies of formation",
      words: "ΔrH = ΣΔfH(products) − ΣΔfH(reactants)",
      tokens: [
        { kind: "ref", id: "deltaH" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "productsH" },
        { kind: "op", value: "−" },
        { kind: "ref", id: "reactantsH" },
      ],
      reading: "Break the reactants down into their elements and build the products back up: the total is ΔH whatever route is taken, because enthalpy is a state function.",
      assumptions: ["Standard conditions, 298 K"],
      discoverable: true,
    },
    {
      id: "sign-convention",
      topic: "system-surroundings",
      title: "The sign of ΔH",
      words: "ΔH < 0: heat leaves the system (exothermic); ΔH > 0: heat enters it (endothermic)",
      tokens: [
        { kind: "text", value: "ΔH < 0" },
        { kind: "op", value: "=" },
        { kind: "text", value: "exothermic" },
      ],
      reading: "The system is the reacting chemicals; everything else is the surroundings. An exothermic reaction warms its surroundings, an endothermic one cools them.",
      assumptions: ["Constant pressure"],
      discoverable: true,
    },
    {
      id: "extensive",
      topic: "enthalpy",
      title: "Heat and amount",
      words: "heat released = −ΔH × moles of reaction",
      tokens: [
        { kind: "ref", id: "heat" },
        { kind: "op", value: "=" },
        { kind: "text", value: "−" },
        { kind: "ref", id: "deltaH" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "n" },
      ],
      reading: "Enthalpy is extensive: burn twice the methane, get twice the heat. And reversing a reaction reverses the sign of ΔH.",
      assumptions: ["ΔH per mole of reaction as written"],
    },
    {
      id: "bond-estimate",
      topic: "enthalpy",
      title: "ΔH from bond enthalpies",
      words: "ΔH ≈ Σ bond enthalpies broken − Σ bond enthalpies formed",
      tokens: [
        { kind: "ref", id: "bondEstimate" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "bondsBroken" },
        { kind: "op", value: "−" },
        { kind: "ref", id: "bondsFormed" },
      ],
      reading: "Breaking bonds takes energy; making them gives it out. With average bond enthalpies this is an estimate, and only for gases.",
      assumptions: ["Gas-phase reactions", "Average bond enthalpies"],
    },
  ],

  simulation: {
    model: "enthalpy",
    params: { reaction: "methane-liquid" },
    playLabel: "Run more of it",
  },

  visualization: {
    renderer: "enthalpy",
    hint: "Pick a reaction; see its energy diagram and the route through the elements.",
    layers: [
      { id: "hess", label: "Hess diagram" },
      { id: "bonds", label: "Bond energies" },
      { id: "labels", label: "Words", optional: true },
    ],
  },

  modes: [
    {
      id: "hess",
      label: "Hess's law",
      description: "Direct, or through the elements",
      layers: ["hess", "labels"],
      graphs: [],
      equations: ["formation-route", "sign-convention", "extensive"],
    },
    {
      id: "bonds",
      label: "Bond enthalpies",
      description: "Break every bond, then form new ones",
      layers: ["bonds", "labels"],
      graphs: [],
      equations: ["bond-estimate"],
    },
  ],
  defaultMode: "hess",
  graphs: [],

  activities: {
    observe: [
      {
        id: "endo",
        prompt: "Find an endothermic reaction.",
        condition: { type: "compare", quantity: "exothermic", op: "eq", value: 0 },
      },
      {
        id: "thousand",
        prompt: "Release more than 2000 kJ.",
        condition: { type: "compare", quantity: "heat", op: "gt", value: 2000 },
      },
    ],

    predict: [
      {
        id: "more",
        question: "Methane burns: from 1 mole of reaction to 3. What happens to the heat released?",
        variable: "n",
        from: 1,
        to: 3,
        quantity: "heat",
        options: ["increase", "decrease", "same"],
        given: { reaction: "methane-liquid" },
        explanation: "It triples, from 890 to 2671 kJ: enthalpy is extensive.",
      },
    ],

    experiment: {
      title: "Hess's law",
      instructions: "For several reactions, record ΣΔfH of the reactants and products, and ΔH.",
      columns: ["reactantsH", "productsH", "deltaH"],
      minRows: 3,
      discovery: {
        question: "How is ΔH related to the enthalpies of formation?",
        choices: [
          { id: "difference", label: "ΔH = ΣΔfH(products) − ΣΔfH(reactants)", correct: true },
          { id: "sum", label: "ΔH = ΣΔfH(products) + ΣΔfH(reactants)", correct: false },
          { id: "products", label: "ΔH = ΣΔfH(products) only", correct: false },
          { id: "none", label: "They are unrelated", correct: false },
        ],
        reveals: "formation-route",
        insight: "Any route between the same reactants and products gives the same ΔH — so going through the elements works.",
      },
    },

    explain: [
      {
        id: "sign",
        title: "Which way heat flows",
        body: "ΔH = {{deltaH}} kJ/mol: heat flows {{exothermic}}. At this amount of reaction, {{heat}} kJ is released.",
      },
      {
        id: "route",
        title: "Through the elements",
        body: "Down from the reactants ({{reactantsH}} kJ/mol) to the elements, up to the products ({{productsH}}): the difference is ΔH.",
      },
    ],

    challenges: [
      {
        id: "endothermic-two",
        title: "Take in 350 kJ",
        prompt: "Choose an endothermic reaction and run enough of it to take in at least 350 kJ.",
        goal: { type: "compare", quantity: "heat", op: "lte", value: -350 },
        hint: "Heating limestone takes in 178 kJ per mole.",
        success: "Two moles of limestone decomposing: why lime kilns need so much fuel.",
      },
    ],
  },

  realWorld: [
    { title: "Cooking gas", description: "Methane's −890 kJ/mol is why LPG and natural gas heat kitchens." },
    { title: "Cold packs", description: "Dissolving ammonium nitrate is endothermic: it draws heat from an injury." },
    { title: "Lime kilns", description: "Turning limestone into lime takes in 178 kJ for every mole — a lot of fuel." },
  ],
});
