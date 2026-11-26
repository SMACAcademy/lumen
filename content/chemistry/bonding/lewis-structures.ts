import { defineConcept } from "@ise/concept-schema";

const bond = (n: number) => ({
  id: `b${n}`,
  symbol: `bond ${n}`,
  name: `Bond ${n}`,
  meaning: `Single, double or triple: the bond from the central atom to terminal atom ${n}.`,
  binding: { kind: "state" as const, key: `b${n}` },
  control: { type: "range" as const, unit: "1" as const, min: 1, max: 3, step: 1 },
  group: "primary" as const,
  color: (["sine", "cosine", "tangent"] as const)[n - 1],
});

/**
 * Lewis structures for class 11: count the valence electrons, share some as
 * bonds, place the rest as lone pairs, and check the octets and the formal
 * charges. When more than one structure is equally good, the molecule is a
 * resonance hybrid of them.
 */
export const lewisStructures = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "lewis-structures",
    title: "Lewis Structures",
    tagline: "Count the electrons, give every atom an octet, and let formal charge pick the best structure.",
    domain: "chemistry",
    category: "bonding",
    grade: { min: 11, max: 11 },
    difficulty: "core",
    estimatedMinutes: 20,
    objective:
      "Draw Lewis structures by counting valence electrons, forming single, double or triple bonds and placing lone pairs so every atom has an octet, use formal charge to choose between structures, and recognise resonance and its average bond order.",
    tags: ["Lewis structures", "octet rule", "formal charge", "resonance", "covalent bond", "class 11"],
  },

  connections: [
    {
      id: "molecular-shapes",
      title: "Molecular Shapes",
      domain: "chemistry",
      relation: "leads-to",
      note: "The bonds and lone pairs of a Lewis structure set the molecule's shape.",
      available: true,
    },
    {
      id: "molecular-orbitals",
      title: "Molecular Orbitals",
      domain: "chemistry",
      relation: "leads-to",
      note: "Lewis pairs every electron in O₂; molecular orbitals show two are unpaired.",
      available: true,
    },
  ],

  variables: [
    {
      id: "molecule",
      symbol: "molecule",
      name: "Molecule or ion",
      meaning: "A central atom with its terminal atoms.",
      binding: { kind: "param", key: "molecule" },
      control: {
        type: "choice",
        options: [
          { value: "co2", label: "CO₂" },
          { value: "o3", label: "O₃" },
          { value: "no3", label: "NO₃⁻" },
          { value: "co3", label: "CO₃²⁻" },
          { value: "hcn", label: "HCN" },
          { value: "no2", label: "NO₂⁻" },
          { value: "co", label: "CO" },
          { value: "n2", label: "N₂" },
          { value: "cn", label: "CN⁻" },
          { value: "h2o", label: "H₂O" },
          { value: "nh3", label: "NH₃" },
        ],
      },
      group: "primary",
      color: "neutral",
    },
    bond(1),
    bond(2),
    bond(3),
  ],

  quantities: [
    {
      id: "valenceElectrons",
      symbol: "V",
      name: "Valence electrons",
      meaning: "Every atom's outer electrons, plus one for each negative charge (minus one for each positive).",
      result: "valenceElectrons",
      format: { kind: "number", digits: 0 },
      color: "angle",
      headline: true,
    },
    {
      id: "bondElectrons",
      symbol: "in bonds",
      name: "Electrons in bonds",
      meaning: "Two for every bond line.",
      result: "bondElectrons",
      format: { kind: "number", digits: 0 },
      color: "sine",
    },
    {
      id: "loneElectrons",
      symbol: "in lone pairs",
      name: "Electrons in lone pairs",
      meaning: "Placed to complete octets, terminal atoms first.",
      result: "loneElectrons",
      format: { kind: "number", digits: 0 },
      color: "angle",
    },
    {
      id: "valid",
      symbol: "octets?",
      name: "Every atom has an octet",
      meaning: "Eight electrons round each atom (two round H), none spare.",
      result: "valid",
      format: { kind: "label", labels: { "0": "not yet", "1": "yes" } },
      color: "tangent",
      headline: true,
    },
    {
      id: "fcCentral",
      symbol: "FC",
      name: "Formal charge on the central atom",
      meaning: "Valence electrons − lone-pair electrons − bonds.",
      result: "fcCentral",
      format: { kind: "number", digits: 0 },
      color: "cosine",
    },
    {
      id: "totalFormalCharge",
      symbol: "Σ|FC|",
      name: "Total formal charge",
      meaning: "Add up every atom's formal charge, ignoring sign. Lower is better.",
      result: "totalFormalCharge",
      format: { kind: "number", digits: 0 },
      color: "cosine",
      headline: true,
    },
    {
      id: "best",
      symbol: "best?",
      name: "A best structure",
      meaning: "Octets everywhere, with the least formal charge possible.",
      result: "best",
      format: { kind: "label", labels: { "0": "no", "1": "yes" } },
      color: "tangent",
    },
    {
      id: "resonance",
      symbol: "forms",
      name: "Resonance structures",
      meaning: "How many equally good structures there are.",
      result: "resonance",
      format: { kind: "number", digits: 0 },
      color: "sine",
    },
    {
      id: "averageBondOrder",
      symbol: "bond order",
      name: "Average bond order",
      meaning: "Of the bonds to the non-hydrogen atoms, averaged over the resonance structures.",
      result: "averageBondOrder",
      format: { kind: "number", digits: 2 },
      color: "sine",
    },
  ],

  equations: [
    {
      id: "electron-count",
      topic: "ionic-covalent",
      title: "Counting electrons",
      words: "valence electrons = electrons in bonds + electrons in lone pairs",
      tokens: [
        { kind: "ref", id: "valenceElectrons" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "bondElectrons" },
        { kind: "op", value: "+" },
        { kind: "ref", id: "loneElectrons" },
      ],
      reading: "Every valence electron is either shared in a bond or sits in a lone pair. CO₂ has 16: 8 in two double bonds, 8 in four lone pairs.",
      assumptions: ["Main-group atoms obeying the octet rule"],
      discoverable: true,
    },
    {
      id: "formal-charge",
      topic: "ionic-covalent",
      title: "Formal charge",
      words: "formal charge = valence electrons − lone-pair electrons − bonds",
      tokens: [
        { kind: "ref", id: "fcCentral" },
        { kind: "op", value: "=" },
        { kind: "text", value: "V" },
        { kind: "op", value: "−" },
        { kind: "text", value: "L" },
        { kind: "op", value: "−" },
        { kind: "text", value: "B" },
      ],
      reading: "The best structure has the smallest formal charges. For CO₂, O=C=O (all zero) beats O≡C–O (+1 and −1).",
      assumptions: ["The bonding electrons split evenly"],
      discoverable: true,
    },
    {
      id: "resonance",
      topic: "ionic-covalent",
      title: "Resonance",
      words: "when several structures are equally good, the molecule is their average: O₃'s two bonds are each 1.5",
      tokens: [
        { kind: "ref", id: "averageBondOrder" },
        { kind: "op", value: "=" },
        { kind: "text", value: "average over resonance structures" },
      ],
      reading: "Ozone's two O–O bonds are the same length, between a single and a double bond. In nitrate and carbonate each bond is 1⅓.",
      assumptions: ["Equivalent structures"],
    },
  ],

  simulation: {
    model: "lewis",
    params: { molecule: "co2" },
    playLabel: "Show resonance",
  },

  visualization: {
    renderer: "lewis",
    hint: "Pick a molecule and set each bond; the lone pairs fill themselves in.",
    layers: [
      { id: "structure", label: "Structure" },
      { id: "labels", label: "Words", optional: true },
    ],
  },

  modes: [
    {
      id: "structure",
      label: "Lewis structure",
      description: "Bonds, lone pairs and formal charges",
      layers: ["structure", "labels"],
      graphs: [],
      equations: ["electron-count", "formal-charge", "resonance"],
    },
  ],
  defaultMode: "structure",
  graphs: [],

  activities: {
    observe: [
      {
        id: "octets",
        prompt: "Make a structure where every atom has an octet.",
        condition: { type: "compare", quantity: "valid", op: "eq", value: 1 },
      },
      {
        id: "best",
        prompt: "Find a best structure.",
        condition: { type: "compare", quantity: "best", op: "eq", value: 1 },
      },
    ],

    predict: [
      {
        id: "double",
        question: "CO₂: the first bond goes from single to double. What happens to the electrons in bonds?",
        variable: "b1",
        from: 1,
        to: 2,
        quantity: "bondElectrons",
        options: ["increase", "decrease", "same"],
        given: { molecule: "co2", b2: 2 },
        explanation: "Two more: each extra bond line shares one more pair — taken from the lone pairs.",
      },
    ],

    experiment: {
      title: "Where the electrons go",
      instructions: "For several molecules, record the valence electrons and how many are in bonds and lone pairs.",
      columns: ["valenceElectrons", "bondElectrons", "loneElectrons"],
      minRows: 3,
      discovery: {
        question: "What is always true?",
        choices: [
          { id: "sum", label: "Bond electrons + lone-pair electrons = valence electrons", correct: true },
          { id: "equal", label: "There are as many in bonds as in lone pairs", correct: false },
          { id: "eight", label: "There are always eight in all", correct: false },
          { id: "none", label: "Nothing in particular", correct: false },
        ],
        reveals: "electron-count",
        insight: "Electrons are only rearranged between bonds and lone pairs: the total is fixed by the atoms and the charge.",
      },
    },

    explain: [
      {
        id: "count",
        title: "The count",
        body: "{{valenceElectrons}} valence electrons: {{bondElectrons}} in bonds and {{loneElectrons}} in lone pairs.",
      },
      {
        id: "choice",
        title: "Choosing",
        body: "Formal charges total {{totalFormalCharge}}. There are {{resonance}} best structures; the average bond order is {{averageBondOrder}}.",
      },
    ],

    challenges: [
      {
        id: "carbonate",
        title: "Carbonate",
        prompt: "Draw a best structure for the carbonate ion, CO₃²⁻.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "molecule", op: "eq", value: 3 },
            { type: "compare", quantity: "best", op: "eq", value: 1 },
          ],
        },
        hint: "One double bond, two single — and the negative charges on the single-bonded oxygens.",
        success: "Any of the three is right: carbonate is a resonance hybrid, each C–O bond 1⅓.",
      },
    ],
  },

  realWorld: [
    { title: "The ozone layer", description: "O₃'s resonance leaves both bonds equal — and just weak enough to be split by UV light, which is how it shields us." },
    { title: "Carbon monoxide", description: "CO's triple bond, with carbon's lone pair and −1 formal charge, is what grips the iron in haemoglobin." },
    { title: "Chalk and limestone", description: "The carbonate ion's three equal bonds make CaCO₃ — marble, chalk and seashells." },
  ],
});
