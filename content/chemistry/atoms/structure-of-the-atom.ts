import { defineConcept } from "@ise/concept-schema";

/**
 * The atom for class 9 and 10: protons and neutrons in the nucleus,
 * electrons in shells filled 2, 8, 8, and the periodic table read from them.
 *
 * Built on the periodic-trends lab: the same first twenty elements, with an
 * atom diagram in place of the trend plot. The outer shell sets the valency;
 * the number of shells is the period; the outer electrons set the group.
 *
 * The isotope view adds a mass-number control: the same element (same Z)
 * with a different number of neutrons. Simplification, as NCERT class 9 does
 * it: a sample's average atomic mass is worked out from mass numbers
 * (35 and 37 for chlorine), not from the exact isotopic masses.
 */
export const structureOfTheAtom = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "structure-of-the-atom",
    title: "Structure of the Atom",
    tagline: "Protons, neutrons and electrons in shells — and why the periodic table is shaped the way it is.",
    domain: "chemistry",
    category: "atoms",
    grade: { min: 9, max: 10 },
    difficulty: "introductory",
    estimatedMinutes: 20,
    objective:
      "Describe an atom's protons, neutrons and electrons, fill electron shells 2, 8, 8, work out valency from the outer shell, read an element's period and group from its electrons, and tell isotopes from isobars.",
    tags: ["atom", "shells", "valency", "periodic table", "isotopes", "isobars", "class 9", "class 10"],
  },

  connections: [
    {
      id: "periodic-trends",
      title: "Periodic Trends",
      domain: "chemistry",
      relation: "leads-to",
      note: "The shells explain the trends: more protons pulling on the same shell shrink the atom across a period.",
      available: true,
    },
  ],

  variables: [
    {
      id: "Z",
      symbol: "Z",
      name: "Atomic number",
      meaning: "The number of protons. Click an element in the table, or step through them.",
      binding: { kind: "state", key: "Z" },
      control: { type: "range", unit: "1", min: 1, max: 20, step: 1 },
      group: "primary",
      color: "cosine",
    },
    {
      id: "A",
      symbol: "A",
      name: "Mass number (isotope)",
      meaning: "Protons plus neutrons in the isotope you are looking at. It snaps to the element's real isotopes.",
      binding: { kind: "state", key: "A" },
      control: { type: "range", unit: "1", min: 1, max: 48, step: 1 },
      group: "primary",
      color: "neutral",
    },
    {
      id: "mix",
      symbol: "share",
      name: "Share of the common isotope",
      meaning: "In a sample of the element: the percentage that is its most common isotope. The rest is the isotope you chose.",
      binding: { kind: "param", key: "mix" },
      control: { type: "range", unit: "%", min: 0, max: 100, step: 1, presets: [50, 75, 100] },
      group: "primary",
      color: "cosine",
    },
  ],

  quantities: [
    {
      id: "protons",
      symbol: "p",
      name: "Protons",
      meaning: "Positive particles in the nucleus: the atomic number.",
      result: "protons",
      format: { kind: "number", digits: 0 },
      color: "cosine",
      highlight: "atom",
      headline: true,
    },
    {
      id: "neutrons",
      symbol: "n",
      name: "Neutrons",
      meaning: "Neutral particles in the nucleus of the most common isotope.",
      result: "neutrons",
      format: { kind: "number", digits: 0 },
      color: "neutral",
      highlight: "atom",
      headline: true,
    },
    {
      id: "massNumber",
      symbol: "A",
      name: "Mass number",
      meaning: "Protons plus neutrons.",
      result: "massNumber",
      format: { kind: "number", digits: 0 },
      color: "neutral",
    },
    {
      id: "isotopeNeutrons",
      symbol: "A − Z",
      name: "Neutrons in this isotope",
      meaning: "Mass number minus atomic number.",
      result: "isotopeNeutrons",
      format: { kind: "number", digits: 0 },
      color: "neutral",
      highlight: "isotope",
    },
    {
      id: "isotopeMass",
      symbol: "A",
      name: "Mass number of this isotope",
      meaning: "Protons plus neutrons in the isotope in view.",
      result: "isotopeMass",
      format: { kind: "number", digits: 0 },
      color: "neutral",
      highlight: "isotope",
    },
    {
      id: "averageMass",
      symbol: "average mass",
      name: "Average atomic mass of the sample",
      meaning: "The mass numbers of the two isotopes, each weighted by its share of the sample.",
      result: "averageMass",
      format: { kind: "number", digits: 2 },
      unit: "u",
      color: "angle",
      highlight: "isotope",
    },
    {
      id: "radioactive",
      symbol: "radioactive?",
      name: "Radioactive",
      meaning: "Whether this isotope's nucleus breaks down over time.",
      result: "radioactive",
      format: { kind: "label", labels: { "0": "no", "1": "yes" } },
      color: "secant",
    },
    {
      id: "valenceElectrons",
      symbol: "outer",
      name: "Electrons in the outer shell",
      meaning: "The valence electrons, which decide how the element reacts.",
      result: "valenceElectrons",
      format: { kind: "number", digits: 0 },
      color: "angle",
      highlight: "atom",
      headline: true,
    },
    {
      id: "valency",
      symbol: "valency",
      name: "Valency",
      meaning: "How many electrons it gives, takes or shares to fill its outer shell.",
      result: "valency",
      format: { kind: "number", digits: 0 },
      color: "angle",
      headline: true,
    },
    {
      id: "shells",
      symbol: "shells",
      name: "Shells in use",
      meaning: "How many electron shells the atom has.",
      result: "shells",
      format: { kind: "number", digits: 0 },
      color: "sine",
    },
    {
      id: "period",
      symbol: "period",
      name: "Period",
      meaning: "The row of the periodic table.",
      result: "period",
      format: { kind: "number", digits: 0 },
      color: "sine",
      highlight: "table",
    },
    {
      id: "group",
      symbol: "group",
      name: "Group",
      meaning: "The column of the periodic table.",
      result: "group",
      format: { kind: "number", digits: 0 },
      color: "sine",
      highlight: "table",
    },
  ],

  equations: [
    {
      id: "mass-number",
      topic: "subatomic-particles",
      title: "Mass number",
      words: "mass number = protons + neutrons",
      tokens: [
        { kind: "ref", id: "massNumber" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "protons" },
        { kind: "op", value: "+" },
        { kind: "ref", id: "neutrons" },
      ],
      reading: "Electrons weigh almost nothing, so an atom's mass is its protons and neutrons.",
      assumptions: ["The most common isotope"],
    },
    {
      id: "outer-shell",
      topic: "valency-school",
      title: "Valency",
      words: "valency = electrons to lose, gain or share to fill the outer shell",
      tokens: [
        { kind: "ref", id: "valency" },
        { kind: "op", value: "=" },
        { kind: "text", value: "electrons to fill the outer shell" },
      ],
      reading: "Up to four outer electrons: that many to give or share. Five to seven: the ones missing from eight. A full shell: valency 0.",
      assumptions: ["Shells filled 2, 8, 8"],
      discoverable: true,
    },
    {
      id: "period-is-shells",
      topic: "modern-periodic-school",
      title: "Reading the table",
      words: "period = number of shells; group = outer electrons (plus 10 from group 13 on)",
      tokens: [
        { kind: "ref", id: "period" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "shells" },
      ],
      reading: "Each new row starts a new shell, and elements in a column share the same number of outer electrons — so they react alike.",
      assumptions: ["The first twenty elements"],
      discoverable: true,
    },
    {
      id: "neutron-count",
      topic: "isotopes",
      title: "Neutrons from A and Z",
      words: "neutrons = mass number − atomic number",
      tokens: [
        { kind: "ref", id: "isotopeNeutrons" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "isotopeMass" },
        { kind: "op", value: "−" },
        { kind: "ref", id: "protons" },
      ],
      reading: "An atom written with mass number A on top and atomic number Z below its symbol has Z protons and A − Z neutrons. Isotopes share Z, so they are the same element; only A differs.",
      assumptions: ["Electrons are not counted in the mass number"],
      discoverable: true,
    },
    {
      id: "average-mass",
      topic: "isotopes",
      title: "Average atomic mass",
      words: "average mass = (share × A of one isotope + rest × A of the other) ÷ 100",
      tokens: [
        { kind: "ref", id: "averageMass" },
        { kind: "op", value: "=" },
        { kind: "text", value: "(share × A₁ + rest × A₂) ÷ 100" },
      ],
      reading: "Chlorine is 75% chlorine-35 and 25% chlorine-37: 35 × 75/100 + 37 × 25/100 = 35.5 u.",
      assumptions: ["Mass numbers stand in for the exact isotopic masses, as in NCERT class 9"],
    },
  ],

  simulation: {
    model: "periodic",
    params: { property: "radius", mix: 100 },
    playLabel: "Walk through the elements",
  },

  visualization: {
    renderer: "periodic",
    hint: "Click an element in the table to see its atom.",
    layers: [
      { id: "table", label: "Periodic table" },
      { id: "atom", label: "Atom" },
      { id: "isotope", label: "Isotope" },
      { id: "labels", label: "Labels", optional: true },
    ],
  },

  modes: [
    {
      id: "atom",
      label: "Atom",
      description: "The table and the atom's shells",
      layers: ["table", "atom", "labels"],
      graphs: [],
      equations: ["outer-shell", "mass-number"],
    },
    {
      id: "table-only",
      label: "Just the table",
      description: "The first twenty elements",
      layers: ["table", "labels"],
      graphs: [],
      equations: ["period-is-shells"],
    },
    {
      id: "isotopes",
      label: "Isotopes",
      description: "One element's nucleus, neutron by neutron",
      layers: ["table", "isotope", "labels"],
      graphs: [],
      equations: ["neutron-count", "average-mass"],
    },
  ],
  defaultMode: "atom",
  graphs: [],

  activities: {
    observe: [
      {
        id: "neon",
        prompt: "Find an atom with a full second shell.",
        condition: { type: "compare", quantity: "Z", op: "eq", value: 10 },
      },
      {
        id: "fourth",
        prompt: "Find the first atom to use a fourth shell.",
        condition: { type: "compare", quantity: "shells", op: "eq", value: 4 },
      },
    ],

    predict: [
      {
        id: "across",
        question: "From sodium (Z = 11) to chlorine (Z = 17), what happens to the number of outer electrons?",
        variable: "Z",
        from: 11,
        to: 17,
        quantity: "valenceElectrons",
        options: ["increase", "decrease", "same"],
        explanation: "It rises from 1 to 7: across a period, each element adds one electron to the same shell.",
      },
    ],

    experiment: {
      title: "Shells and periods",
      instructions: "Record the shells and the period of H, Li, Na and K.",
      columns: ["shells", "period", "valenceElectrons", "valency"],
      minRows: 3,
      discovery: {
        question: "What is the period of an element?",
        choices: [
          { id: "shells", label: "The number of shells its electrons use", correct: true },
          { id: "outer", label: "The number of outer electrons", correct: false },
          { id: "protons", label: "The number of protons", correct: false },
          { id: "neutrons", label: "The number of neutrons", correct: false },
        ],
        reveals: "period-is-shells",
        insight: "Every new row of the table starts a new shell.",
      },
    },

    explain: [
      {
        id: "inside",
        title: "Inside the atom",
        body: "The nucleus holds {{protons}} protons and {{neutrons}} neutrons. Around it, {{protons}} electrons fill shells from the inside out: 2, then 8, then 8.",
      },
      {
        id: "valency",
        title: "Valency",
        body: "Atoms react to fill their outer shell. This one has {{valenceElectrons}} outer electrons, so its valency is {{valency}}.",
      },
      {
        id: "isotope",
        title: "Isotopes",
        body: "This isotope has {{protons}} protons and {{isotopeNeutrons}} neutrons, so its mass number is {{isotopeMass}}. Other isotopes of the element keep the {{protons}} protons and the electrons, so they react the same way.",
      },
    ],

    challenges: [
      {
        id: "argon",
        title: "Full up",
        prompt: "Find the element with three full shells.",
        goal: { type: "compare", quantity: "Z", op: "eq", value: 18 },
        hint: "2 + 8 + 8.",
        success: "Argon, 2, 8, 8: a noble gas, which hardly reacts at all.",
      },
    ],
  },

  realWorld: [
    { title: "Neon signs", description: "Neon's outer shell is full, so it does not react — it just glows when electricity passes through it." },
    { title: "Table salt", description: "Sodium gives its one outer electron to chlorine, which needs one: both end up with full shells." },
    { title: "Isotopes at work", description: "Uranium-235 is the fuel of nuclear reactors, cobalt-60 is used to treat cancer, and iodine-131 to treat goitre." },
  ],
});
