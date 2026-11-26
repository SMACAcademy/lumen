import { defineConcept } from "@ise/concept-schema";

/**
 * Molecular orbital theory for class 11: homonuclear diatomic molecules and
 * their ions, H₂ to Ne₂ — bond order, existence, magnetism and bond strength.
 */
export const molecularOrbitals = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "molecular-orbitals",
    title: "Molecular Orbitals",
    tagline: "Bonding and antibonding orbitals: why He₂ does not exist and O₂ sticks to a magnet.",
    domain: "chemistry",
    category: "bonding",
    grade: { min: 11, max: 11 },
    difficulty: "advanced",
    estimatedMinutes: 20,
    objective:
      "Fill the molecular orbitals of homonuclear diatomic molecules and ions from H₂ to Ne₂ in the right order, work out bond order and magnetic behaviour, and relate bond order to bond length and bond enthalpy.",
    tags: ["molecular orbital theory", "bond order", "paramagnetism", "O₂", "bond length", "class 11"],
  },

  connections: [
    {
      id: "atomic-orbitals",
      title: "Atomic Orbitals",
      domain: "chemistry",
      relation: "prerequisite",
      note: "The atoms' 1s, 2s and 2p orbitals are what combine.",
      available: true,
    },
    {
      id: "lewis-structures",
      title: "Lewis Structures",
      domain: "chemistry",
      relation: "related",
      note: "Lewis draws O₂ with every electron paired; molecular orbitals show why it is magnetic.",
      available: true,
    },
  ],

  variables: [
    {
      id: "Z",
      symbol: "Z",
      name: "Element",
      meaning: "The atoms making X₂: 1 hydrogen … 10 neon.",
      binding: { kind: "state", key: "Z" },
      control: { type: "range", unit: "1", min: 1, max: 10, step: 1 },
      group: "primary",
      color: "angle",
    },
    {
      id: "charge",
      symbol: "charge",
      name: "Charge",
      meaning: "Take electrons away (+) or add them (−).",
      binding: { kind: "state", key: "charge" },
      control: { type: "range", unit: "1", min: -2, max: 2, step: 1 },
      group: "primary",
      color: "cosine",
    },
    {
      id: "walk",
      symbol: "play",
      name: "Play steps through",
      meaning: "The elements, or the charge on one molecule.",
      binding: { kind: "param", key: "walk" },
      control: {
        type: "choice",
        options: [
          { value: "elements", label: "The elements" },
          { value: "charge", label: "The charge" },
        ],
      },
      group: "primary",
      color: "neutral",
    },
  ],

  quantities: [
    {
      id: "bondOrder",
      symbol: "bond order",
      name: "Bond order",
      meaning: "Half of (bonding − antibonding electrons).",
      result: "bondOrder",
      format: { kind: "number", digits: 1 },
      color: "tangent",
      highlight: "diagram",
      headline: true,
    },
    {
      id: "bonding",
      symbol: "N_b",
      name: "Bonding electrons",
      meaning: "Electrons in bonding orbitals.",
      result: "bonding",
      format: { kind: "number", digits: 0 },
      color: "tangent",
    },
    {
      id: "antibonding",
      symbol: "N_a",
      name: "Antibonding electrons",
      meaning: "Electrons in antibonding orbitals.",
      result: "antibonding",
      format: { kind: "number", digits: 0 },
      color: "secant",
    },
    {
      id: "unpaired",
      symbol: "unpaired",
      name: "Unpaired electrons",
      meaning: "Electrons alone in a molecular orbital.",
      result: "unpaired",
      format: { kind: "number", digits: 0 },
      color: "sine",
      headline: true,
    },
    {
      id: "paramagnetic",
      symbol: "magnet?",
      name: "Magnetic behaviour",
      meaning: "Unpaired electrons: drawn into a magnetic field.",
      result: "paramagnetic",
      format: { kind: "label", labels: { "0": "diamagnetic", "1": "paramagnetic" } },
      color: "cosine",
    },
    {
      id: "exists",
      symbol: "exists?",
      name: "A stable molecule",
      meaning: "A bond order above zero.",
      result: "exists",
      format: { kind: "label", labels: { "0": "no", "1": "yes" } },
      color: "angle",
    },
    {
      id: "bondLength",
      symbol: "r",
      name: "Bond length",
      meaning: "For the neutral molecule, from textbook tables.",
      result: "bondLength",
      format: { kind: "number", digits: 0 },
      unit: "pm",
      color: "neutral",
    },
    {
      id: "bondEnthalpy",
      symbol: "D",
      name: "Bond enthalpy",
      meaning: "Energy to break one mole of bonds, for the neutral molecule.",
      result: "bondEnthalpy",
      format: { kind: "number", digits: 0 },
      unit: "kJ/mol",
      color: "neutral",
    },
  ],

  equations: [
    {
      id: "bond-order",
      topic: "molecular-orbital",
      title: "Bond order",
      words: "bond order = (bonding electrons − antibonding electrons) ÷ 2",
      tokens: [
        { kind: "ref", id: "bondOrder" },
        { kind: "op", value: "=" },
        { kind: "text", value: "(" },
        { kind: "ref", id: "bonding" },
        { kind: "op", value: "−" },
        { kind: "ref", id: "antibonding" },
        { kind: "text", value: ")" },
        { kind: "op", value: "/" },
        { kind: "text", value: "2" },
      ],
      reading: "Each antibonding electron cancels a bonding one. N₂: (10 − 4)/2 = 3, a triple bond. He₂: (2 − 2)/2 = 0, no molecule at all.",
      assumptions: ["Homonuclear diatomic molecules"],
      discoverable: true,
    },
    {
      id: "order-and-strength",
      topic: "bond-parameters",
      title: "Bond order, length and strength",
      words: "the higher the bond order, the shorter and stronger the bond",
      tokens: [
        { kind: "ref", id: "bondOrder" },
        { kind: "text", value: "↑" },
        { kind: "op", value: "=" },
        { kind: "text", value: "length ↓, enthalpy ↑" },
      ],
      reading: "N₂ (3): 110 pm, 946 kJ/mol. O₂ (2): 121 pm, 498. F₂ (1): 142 pm, 158.",
      assumptions: ["Neutral molecules from textbook tables"],
      discoverable: true,
    },
    {
      id: "mo-order",
      topic: "molecular-orbital",
      title: "The order they fill",
      words: "up to N₂: σ1s < σ*1s < σ2s < σ*2s < π2p < σ2p < π*2p < σ*2p; from O₂: σ2p comes below π2p",
      tokens: [
        { kind: "text", value: "B₂, C₂, N₂: π2p" },
        { kind: "op", value: "=" },
        { kind: "text", value: "below σ2p" },
      ],
      reading: "In the lighter atoms 2s and 2p mix, pushing σ2p up above π2p — which is why B₂ is paramagnetic.",
      assumptions: ["Second-period elements"],
    },
  ],

  simulation: {
    model: "mo",
    params: { walk: "elements" },
    playLabel: "Step through",
  },

  visualization: {
    renderer: "mo",
    hint: "Pick an element and a charge; the electrons fill the molecular orbitals.",
    layers: [
      { id: "diagram", label: "MO diagram" },
      { id: "labels", label: "Words", optional: true },
    ],
  },

  modes: [
    {
      id: "diagram",
      label: "MO diagram",
      description: "Atomic orbitals in, molecular orbitals out",
      layers: ["diagram", "labels"],
      graphs: [],
      equations: ["bond-order", "order-and-strength", "mo-order"],
    },
  ],
  defaultMode: "diagram",
  graphs: [],

  activities: {
    observe: [
      {
        id: "triple",
        prompt: "Find the molecule with a bond order of 3.",
        condition: { type: "compare", quantity: "bondOrder", op: "eq", value: 3 },
      },
      {
        id: "nothing",
        prompt: "Find a molecule that cannot exist.",
        condition: { type: "compare", quantity: "exists", op: "eq", value: 0 },
      },
    ],

    predict: [
      {
        id: "oxygen-ions",
        question: "O₂ gains two electrons to become the peroxide ion O₂²⁻. What happens to the bond order?",
        variable: "charge",
        from: 0,
        to: -2,
        quantity: "bondOrder",
        options: ["increase", "decrease", "same"],
        given: { Z: 8 },
        explanation: "It falls from 2 to 1: both extra electrons go into antibonding π* orbitals.",
      },
    ],

    experiment: {
      title: "Bond order and bond strength",
      instructions: "Record the bond order, length and enthalpy of Li₂, B₂, C₂, N₂, O₂ and F₂.",
      columns: ["bondOrder", "bondLength", "bondEnthalpy"],
      minRows: 4,
      discovery: {
        question: "How does bond order relate to the bond?",
        choices: [
          { id: "stronger", label: "Higher bond order: shorter and stronger", correct: true },
          { id: "longer", label: "Higher bond order: longer and weaker", correct: false },
          { id: "none", label: "No link", correct: false },
          { id: "length", label: "Only the length changes", correct: false },
        ],
        reveals: "order-and-strength",
        insight: "N₂'s triple bond is one of the strongest in chemistry — which is why nitrogen gas is so unreactive.",
      },
    },

    explain: [
      {
        id: "order",
        title: "Counting",
        body: "{{bonding}} bonding and {{antibonding}} antibonding electrons: bond order {{bondOrder}}.",
      },
      {
        id: "magnet",
        title: "Magnetism",
        body: "{{unpaired}} unpaired electrons, so it is {{paramagnetic}}.",
      },
    ],

    challenges: [
      {
        id: "two-and-a-half",
        title: "Bond order 2.5",
        prompt: "Make a species with a bond order of 2.5.",
        goal: { type: "compare", quantity: "bondOrder", op: "eq", value: 2.5 },
        hint: "Take one electron from N₂, or from O₂.",
        success: "N₂⁺ loses a bonding electron; O₂⁺ loses an antibonding one — both end at 2.5.",
      },
    ],
  },

  realWorld: [
    { title: "Liquid oxygen and a magnet", description: "Pour liquid oxygen between the poles of a magnet and it hangs there — its two unpaired electrons at work." },
    { title: "Inert nitrogen", description: "N₂'s bond order of 3 makes it hard to break; plants need bacteria to fix it." },
    { title: "Superoxide in cells", description: "O₂⁻ (bond order 1.5) is a reactive radical our cells work hard to mop up." },
  ],
});
