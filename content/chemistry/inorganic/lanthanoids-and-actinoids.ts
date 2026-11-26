import { defineConcept } from "@ise/concept-schema";

/**
 * The f-block for class 12: the lanthanoids and their contraction, the
 * actinoids and their many oxidation states, and the f electrons behind both.
 */
export const lanthanoidsAndActinoids = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "lanthanoids-and-actinoids",
    title: "Lanthanoids and Actinoids",
    tagline: "Two rows of fifteen: watch the ions shrink across each, and see why one row keeps to +3 while the other climbs to +7.",
    domain: "chemistry",
    category: "inorganic",
    grade: { min: 12, max: 12 },
    difficulty: "core",
    estimatedMinutes: 20,
    objective:
      "Describe the lanthanoid and actinoid contractions and their cause and consequences, count the f electrons and unpaired electrons in an f-block ion, and compare the oxidation states of the lanthanoids with those of the actinoids.",
    tags: ["lanthanoids", "actinoids", "lanthanoid contraction", "f-block", "oxidation states", "class 12"],
  },

  connections: [
    {
      id: "transition-metals",
      title: "Transition Metals",
      domain: "chemistry",
      relation: "prerequisite",
      note: "The d-block: variable valency, colour and magnetism from unpaired electrons.",
      available: true,
    },
    {
      id: "atomic-orbitals",
      title: "Atomic Orbitals",
      domain: "chemistry",
      relation: "prerequisite",
      note: "Where the seven f orbitals come from, and Hund's rule for filling them.",
      available: true,
    },
    {
      id: "periodic-trends",
      title: "Periodic Trends",
      domain: "chemistry",
      relation: "related",
      note: "Radii usually fall across a period; here they fall across a whole inner row.",
      available: true,
    },
  ],

  variables: [
    {
      id: "series",
      symbol: "series",
      name: "Series",
      meaning: "The lanthanoids fill 4f; the actinoids fill 5f.",
      binding: { kind: "param", key: "series" },
      control: {
        type: "choice",
        options: [
          { value: "lanthanoids", label: "Lanthanoids (La–Lu)" },
          { value: "actinoids", label: "Actinoids (Ac–Lr)" },
        ],
      },
      group: "primary",
      color: "neutral",
    },
    {
      id: "index",
      symbol: "place",
      name: "Place along the series",
      meaning: "1 is lanthanum or actinium; 15 is lutetium or lawrencium.",
      binding: { kind: "state", key: "index" },
      control: { type: "range", unit: "1", min: 1, max: 15, step: 1 },
      group: "primary",
      color: "angle",
    },
    {
      id: "charge",
      symbol: "charge",
      name: "Charge of the ion",
      meaning: "The oxidation state to look at, +2 to +7.",
      binding: { kind: "state", key: "charge" },
      control: { type: "range", unit: "1", min: 2, max: 7, step: 1, presets: [2, 3, 4] },
      group: "primary",
      color: "cosine",
    },
  ],

  quantities: [
    {
      id: "Z",
      symbol: "Z",
      name: "Atomic number",
      meaning: "57 to 71 for the lanthanoids, 89 to 103 for the actinoids.",
      result: "Z",
      format: { kind: "integer" },
      color: "neutral",
    },
    {
      id: "radius3",
      symbol: "r (M³⁺)",
      name: "Radius of the 3+ ion",
      meaning: "NCERT's value; 0 where NCERT gives none.",
      result: "radius3",
      format: { kind: "integer" },
      unit: "pm",
      color: "sine",
      highlight: "radii",
      headline: true,
    },
    {
      id: "radius4",
      symbol: "r (M⁴⁺)",
      name: "Radius of the 4+ ion",
      meaning: "Given for the actinoids from thorium to californium; 0 otherwise.",
      result: "radius4",
      format: { kind: "integer" },
      unit: "pm",
      color: "cosine",
    },
    {
      id: "maxOx",
      symbol: "highest",
      name: "Highest oxidation state",
      meaning: "The largest charge the element reaches in its compounds.",
      result: "maxOx",
      format: { kind: "integer" },
      color: "cosine",
      highlight: "states",
      headline: true,
    },
    {
      id: "minOx",
      symbol: "lowest",
      name: "Lowest oxidation state",
      meaning: "The smallest charge it shows.",
      result: "minOx",
      format: { kind: "integer" },
      color: "neutral",
    },
    {
      id: "stateCount",
      symbol: "states",
      name: "Number of oxidation states",
      meaning: "How many different ones it shows.",
      result: "stateCount",
      format: { kind: "integer" },
      color: "neutral",
    },
    {
      id: "fElectrons",
      symbol: "f electrons",
      name: "f electrons in the ion",
      meaning: "What is left above the noble-gas core once the ion's charge is taken away.",
      result: "fElectrons",
      format: { kind: "integer" },
      color: "angle",
      highlight: "boxes",
      headline: true,
    },
    {
      id: "unpaired",
      symbol: "unpaired",
      name: "Unpaired electrons",
      meaning: "By Hund's rule over seven orbitals: at most seven, at f⁷.",
      result: "unpaired",
      format: { kind: "integer" },
      color: "sine",
    },
    {
      id: "paramagnetic",
      symbol: "magnetism",
      name: "Magnetic behaviour",
      meaning: "Any unpaired electron makes the ion paramagnetic.",
      result: "paramagnetic",
      format: { kind: "label", labels: { "0": "diamagnetic", "1": "paramagnetic" } },
      color: "sine",
    },
    {
      id: "exists",
      symbol: "known state?",
      name: "Is this ion one the element forms",
      meaning: "Whether the charge chosen is among the element's oxidation states.",
      result: "exists",
      format: { kind: "label", labels: { "0": "no", "1": "yes" } },
      color: "neutral",
    },
    {
      id: "radioactive",
      symbol: "radioactive?",
      name: "Radioactive",
      meaning: "Every actinoid is; among the lanthanoids only promethium.",
      result: "radioactive",
      format: { kind: "label", labels: { "0": "no", "1": "yes" } },
      color: "neutral",
    },
  ],

  equations: [
    {
      id: "contraction",
      topic: "lanthanoids",
      title: "The lanthanoid contraction",
      words: "across the series each added 4f electron shields the next poorly, so the ions shrink steadily",
      tokens: [
        { kind: "text", value: "poor 4f shielding" },
        { kind: "op", value: "=" },
        { kind: "text", value: "Ln³⁺ shrinks, La → Lu" },
      ],
      reading: "From La³⁺ at 106 pm to Yb³⁺ at 86 pm. The result reaches beyond the lanthanoids: hafnium, which follows them, is the same size as zirconium above it, and the two are very hard to separate.",
      assumptions: ["NCERT's radii"],
      discoverable: true,
    },
    {
      id: "f-count",
      topic: "lanthanoids",
      title: "f electrons in an ion",
      words: "f electrons = atomic number − core electrons (54 or 86) − charge",
      tokens: [
        { kind: "ref", id: "fElectrons" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "Z" },
        { kind: "op", value: "−" },
        { kind: "text", value: "core (54 or 86)" },
        { kind: "op", value: "−" },
        { kind: "ref", id: "charge" },
      ],
      reading: "The outer s and d electrons go first, so an ion keeps only f electrons above its noble-gas core. Empty, half-full and full shells — f⁰, f⁷, f¹⁴ — explain Ce⁴⁺, Eu²⁺ and Yb²⁺.",
      assumptions: ["For the oxidation states the element really shows"],
      discoverable: true,
    },
    {
      id: "actinoid-states",
      topic: "actinoids",
      title: "Why actinoids have more oxidation states",
      words: "5f, 6d and 7s are close in energy, so more electrons can take part in bonding",
      tokens: [
        { kind: "text", value: "5f ≈ 6d ≈ 7s in energy" },
        { kind: "op", value: "=" },
        { kind: "text", value: "+3 up to +7" },
      ],
      reading: "A lanthanoid's 4f electrons are buried and hardly join in, so +3 dominates. An early actinoid's 5f electrons reach further out: uranium shows +3 to +6, neptunium and plutonium up to +7.",
      assumptions: ["The early actinoids; the later ones settle to +3"],
      discoverable: true,
    },
  ],

  simulation: {
    model: "fblock",
    params: { series: "lanthanoids" },
    playLabel: "Walk along the series",
  },

  visualization: {
    renderer: "fblock",
    hint: "Radii and States: pick a series and step along it. Electrons: pick an element and a charge.",
    layers: [
      { id: "radii", label: "Ionic radii" },
      { id: "states", label: "Oxidation states" },
      { id: "boxes", label: "f orbitals" },
      { id: "labels", label: "Words", optional: true },
    ],
  },

  modes: [
    {
      id: "radii",
      label: "Radii",
      description: "The contraction across the series",
      layers: ["radii", "labels"],
      graphs: [],
      equations: ["contraction"],
    },
    {
      id: "states",
      label: "States",
      description: "Which oxidation states each element shows",
      layers: ["states", "labels"],
      graphs: [],
      equations: ["actinoid-states"],
    },
    {
      id: "electrons",
      label: "Electrons",
      description: "The f orbitals of an ion",
      layers: ["boxes", "labels"],
      graphs: [],
      equations: ["f-count"],
    },
  ],
  defaultMode: "radii",
  graphs: [],

  activities: {
    observe: [
      {
        id: "seven-unpaired",
        prompt: "Find an ion with seven unpaired electrons.",
        condition: { type: "compare", quantity: "unpaired", op: "eq", value: 7 },
      },
      {
        id: "five-states",
        prompt: "Find an element with five oxidation states.",
        condition: { type: "compare", quantity: "stateCount", op: "eq", value: 5 },
      },
    ],

    predict: [
      {
        id: "across",
        question: "From lanthanum to ytterbium, what happens to the radius of the 3+ ion?",
        variable: "index",
        from: 1,
        to: 14,
        quantity: "radius3",
        options: ["increase", "decrease", "same"],
        given: { series: "lanthanoids" },
        explanation: "It falls from 106 pm to 86 pm: the nuclear charge rises by one each step, and the 4f electrons added shield it poorly.",
      },
    ],

    experiment: {
      title: "Measuring the contraction",
      instructions: "With the lanthanoids, record the atomic number and the 3+ radius at four or five places along the series.",
      columns: ["index", "Z", "radius3"],
      minRows: 4,
      discovery: {
        question: "What happens to the 3+ ion as the atomic number rises?",
        choices: [
          { id: "shrinks", label: "It shrinks steadily, by a picometre or two each time", correct: true },
          { id: "grows", label: "It grows, as more electrons are added", correct: false },
          { id: "same", label: "It stays the same size", correct: false },
          { id: "zigzag", label: "It goes up and down", correct: false },
        ],
        reveals: "contraction",
        insight: "More electrons, yet a smaller ion: the 4f electrons do not screen the extra protons, so the whole cloud is pulled in.",
      },
    },

    explain: [
      {
        id: "size",
        title: "The ion's size",
        body: "Element {{Z}}: its 3+ ion is {{radius3}} pm across (0 means NCERT gives no value).",
      },
      {
        id: "states",
        title: "Its oxidation states",
        body: "It shows {{stateCount}} oxidation states, from +{{minOx}} to +{{maxOx}}. Radioactive? {{radioactive}}.",
      },
      {
        id: "electrons",
        title: "Its f electrons",
        body: "This ion has {{fElectrons}} f electrons, {{unpaired}} of them unpaired, so it is {{paramagnetic}}. A state the element really shows? {{exists}}.",
      },
    ],

    challenges: [
      {
        id: "half-full",
        title: "Half-full at +2",
        prompt: "Find the lanthanoid whose 2+ ion has a half-filled f shell — and really exists.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "series", op: "eq", value: 0 },
            { type: "compare", quantity: "charge", op: "eq", value: 2 },
            { type: "compare", quantity: "fElectrons", op: "eq", value: 7 },
            { type: "compare", quantity: "exists", op: "eq", value: 1 },
          ],
        },
        hint: "Seven f electrons after losing two: Z − 54 − 2 = 7.",
        success: "Europium, Z = 63. Eu²⁺ is f⁷, half-full and unusually stable — which is why europium, unlike its neighbours, is happy at +2.",
      },
    ],
  },

  realWorld: [
    { title: "Magnets in motors and headphones", description: "Neodymium magnets owe their strength to unpaired 4f electrons." },
    { title: "Lighter flints", description: "Mischmetal, about 95% lanthanoid metal with iron, sparks when struck." },
    { title: "Nuclear fuel", description: "Uranium and plutonium, both actinoids, power reactors; americium sits in smoke detectors." },
  ],
});
