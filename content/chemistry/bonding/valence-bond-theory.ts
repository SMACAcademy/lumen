import { defineConcept } from "@ise/concept-schema";

/**
 * Valence bond theory for class 11: a covalent bond as the overlap of two
 * half-filled orbitals, the energy curve of H₂, and the sigma and pi bonds
 * that head-on and sideways overlap give.
 */
export const valenceBondTheory = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "valence-bond-theory",
    title: "Valence Bond Theory",
    tagline: "Bring two atoms together until their orbitals overlap, and see why some bonds lie along the line between the nuclei and others beside it.",
    domain: "chemistry",
    category: "bonding",
    grade: { min: 11, max: 11 },
    difficulty: "core",
    estimatedMinutes: 20,
    objective:
      "Explain a covalent bond as the overlap of half-filled atomic orbitals, read bond length and bond enthalpy off the energy curve of H₂, tell sigma from pi overlap, and count the sigma and pi bonds in a molecule.",
    tags: ["valence bond theory", "orbital overlap", "sigma bond", "pi bond", "bond enthalpy", "class 11"],
  },

  connections: [
    {
      id: "atomic-orbitals",
      title: "Atomic Orbitals",
      domain: "chemistry",
      relation: "prerequisite",
      note: "The s and p orbitals that do the overlapping.",
      available: true,
    },
    {
      id: "molecular-shapes",
      title: "Molecular Shapes",
      domain: "chemistry",
      relation: "leads-to",
      note: "Hybrid orbitals make the sigma bonds, and their directions give the shape.",
      available: true,
    },
    {
      id: "molecular-orbitals",
      title: "Molecular Orbitals",
      domain: "chemistry",
      relation: "related",
      note: "The other theory of bonding: it explains what this one cannot, such as why oxygen is magnetic.",
      available: true,
    },
  ],

  variables: [
    {
      id: "distance",
      symbol: "r",
      name: "Distance between the nuclei",
      meaning: "How far apart the two hydrogen atoms are.",
      binding: { kind: "state", key: "distance" },
      control: { type: "range", unit: "pm", min: 30, max: 400, step: 2, presets: [74, 150, 300] },
      group: "primary",
      color: "angle",
    },
    {
      id: "overlapType",
      symbol: "overlap",
      name: "Which orbitals overlap, and how",
      meaning: "Head-on along the line of the nuclei, or side by side.",
      binding: { kind: "param", key: "overlapType" },
      control: {
        type: "choice",
        options: [
          { value: "ss", label: "s with s" },
          { value: "sp", label: "s with p, end-on" },
          { value: "pp-head", label: "p with p, end-on" },
          { value: "pp-side", label: "p with p, side by side" },
          { value: "sp-side", label: "s with p, sideways" },
        ],
      },
      group: "primary",
      color: "neutral",
    },
    {
      id: "molecule",
      symbol: "molecule",
      name: "Molecule",
      meaning: "A molecule whose sigma and pi bonds to count.",
      binding: { kind: "param", key: "molecule" },
      control: {
        type: "choice",
        options: [
          { value: "h2", label: "Hydrogen, H₂" },
          { value: "ethane", label: "Ethane, C₂H₆" },
          { value: "ethene", label: "Ethene, C₂H₄" },
          { value: "ethyne", label: "Ethyne, C₂H₂" },
          { value: "n2", label: "Nitrogen, N₂" },
          { value: "o2", label: "Oxygen, O₂" },
          { value: "co2", label: "Carbon dioxide, CO₂" },
          { value: "hcn", label: "Hydrogen cyanide, HCN" },
          { value: "methanal", label: "Methanal, HCHO" },
          { value: "benzene", label: "Benzene, C₆H₆" },
        ],
      },
      group: "primary",
      color: "neutral",
    },
  ],

  quantities: [
    {
      id: "energy",
      symbol: "E",
      name: "Energy of the pair",
      meaning: "Compared with two separate atoms. Negative means more stable together.",
      result: "energy",
      format: { kind: "integer" },
      unit: "kJ/mol",
      color: "angle",
      highlight: "curve",
      headline: true,
    },
    {
      id: "overlap",
      symbol: "S",
      name: "Overlap of the two 1s orbitals",
      meaning: "0 when far apart, 1 if they sat on top of each other.",
      result: "overlap",
      format: { kind: "number", digits: 2 },
      color: "sine",
    },
    {
      id: "atMinimum",
      symbol: "bonded?",
      name: "At the bond length",
      meaning: "Whether the atoms sit at the bottom of the energy well.",
      result: "atMinimum",
      format: { kind: "label", labels: { "0": "no", "1": "yes" } },
      color: "angle",
    },
    {
      id: "sigma",
      symbol: "σ?",
      name: "Makes a sigma bond",
      meaning: "Head-on overlap, with the electrons on the line joining the nuclei.",
      result: "sigma",
      format: { kind: "label", labels: { "0": "no", "1": "yes" } },
      color: "sine",
      highlight: "orbitals",
    },
    {
      id: "pi",
      symbol: "π?",
      name: "Makes a pi bond",
      meaning: "Sideways overlap, with the electrons above and below that line.",
      result: "pi",
      format: { kind: "label", labels: { "0": "no", "1": "yes" } },
      color: "cosine",
    },
    {
      id: "sigmaBonds",
      symbol: "σ bonds",
      name: "Sigma bonds in the molecule",
      meaning: "One for every pair of bonded atoms.",
      result: "sigmaBonds",
      format: { kind: "integer" },
      color: "sine",
      highlight: "structure",
      headline: true,
    },
    {
      id: "piBonds",
      symbol: "π bonds",
      name: "Pi bonds in the molecule",
      meaning: "One in each double bond, two in each triple bond.",
      result: "piBonds",
      format: { kind: "integer" },
      color: "cosine",
      headline: true,
    },
    {
      id: "doubleBonds",
      symbol: "double bonds",
      name: "Double bonds",
      meaning: "Each is one sigma and one pi.",
      result: "doubleBonds",
      format: { kind: "integer" },
      color: "neutral",
    },
    {
      id: "tripleBonds",
      symbol: "triple bonds",
      name: "Triple bonds",
      meaning: "Each is one sigma and two pi.",
      result: "tripleBonds",
      format: { kind: "integer" },
      color: "neutral",
    },
  ],

  equations: [
    {
      id: "bond-formation",
      topic: "valence-bond",
      title: "A bond is an energy minimum",
      words: "two half-filled orbitals overlap; the energy is lowest at the bond length",
      tokens: [
        { kind: "text", value: "lowest energy" },
        { kind: "op", value: "=" },
        { kind: "text", value: "bond length (74 pm for H₂)" },
      ],
      reading: "As the atoms approach, each nucleus attracts the other's electron and the energy falls. Too close and the nuclei repel. The depth of the well, 435.8 kJ/mol, is the bond enthalpy.",
      assumptions: ["The curve is a Morse-shaped model through H₂'s bond length and enthalpy"],
      discoverable: true,
    },
    {
      id: "sigma-pi",
      topic: "sigma-pi-bonds",
      title: "Sigma and pi",
      words: "head-on overlap makes a sigma bond; sideways overlap makes a pi bond",
      tokens: [
        { kind: "text", value: "head-on → σ" },
        { kind: "op", value: "+" },
        { kind: "text", value: "sideways → π" },
      ],
      reading: "A sigma bond's electrons lie on the line between the nuclei, so the atoms can turn about it. A pi bond's lie above and below, so turning would break it — and it overlaps less, so it is weaker.",
      assumptions: ["s and p orbitals"],
    },
    {
      id: "counting",
      topic: "sigma-pi-bonds",
      title: "Counting the bonds",
      words: "π bonds = double bonds + 2 × triple bonds; σ bonds = pairs of bonded atoms",
      tokens: [
        { kind: "ref", id: "piBonds" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "doubleBonds" },
        { kind: "op", value: "+" },
        { kind: "text", value: "2" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "tripleBonds" },
      ],
      reading: "Between any two bonded atoms there is exactly one sigma bond. A double bond adds one pi bond to it; a triple bond adds two.",
      assumptions: ["Structures drawn with localised bonds: benzene's three double bonds are really shared round the ring"],
      discoverable: true,
    },
  ],

  simulation: {
    model: "overlap",
    params: { overlapType: "ss", molecule: "ethene" },
    playLabel: "Bring the atoms together",
  },

  visualization: {
    renderer: "overlap",
    hint: "Energy: move the atoms, or press play. Overlap: pick how two orbitals meet. Count: pick a molecule.",
    layers: [
      { id: "atoms", label: "Two atoms" },
      { id: "curve", label: "Energy curve" },
      { id: "orbitals", label: "Orbitals" },
      { id: "structure", label: "Structure" },
      { id: "labels", label: "Words", optional: true },
    ],
  },

  modes: [
    {
      id: "curve",
      label: "Energy",
      description: "Two hydrogen atoms and the energy between them",
      layers: ["atoms", "curve", "labels"],
      graphs: [],
      equations: ["bond-formation"],
    },
    {
      id: "overlap",
      label: "Overlap",
      description: "Head-on or sideways",
      layers: ["orbitals", "labels"],
      graphs: [],
      equations: ["sigma-pi"],
    },
    {
      id: "count",
      label: "Count",
      description: "Sigma and pi bonds in a molecule",
      layers: ["structure", "labels"],
      graphs: [],
      equations: ["counting", "sigma-pi"],
    },
  ],
  defaultMode: "curve",
  graphs: [],

  activities: {
    observe: [
      {
        id: "bond",
        prompt: "Bring the two atoms to the bottom of the energy well.",
        condition: { type: "compare", quantity: "atMinimum", op: "eq", value: 1 },
      },
      {
        id: "repel",
        prompt: "Push the atoms so close that the energy rises above zero.",
        condition: { type: "compare", quantity: "energy", op: "gt", value: 0 },
      },
    ],

    predict: [
      {
        id: "closer",
        question: "The atoms move from 300 pm apart to 100 pm. What happens to the energy of the pair?",
        variable: "distance",
        from: 300,
        to: 100,
        quantity: "energy",
        options: ["increase", "decrease", "same"],
        explanation: "It falls, from about −11 to −367 kJ/mol: the orbitals overlap more and each nucleus pulls on both electrons.",
      },
    ],

    experiment: {
      title: "Mapping the well",
      instructions: "Record the energy at five distances — try 300, 150, 100, 74 and 50 pm.",
      columns: ["distance", "energy", "overlap"],
      minRows: 4,
      discovery: {
        question: "Where is the energy lowest?",
        choices: [
          { id: "seventy-four", label: "At about 74 pm: closer or further both cost energy", correct: true },
          { id: "closest", label: "As close as possible", correct: false },
          { id: "furthest", label: "As far apart as possible", correct: false },
          { id: "everywhere", label: "It is the same everywhere", correct: false },
        ],
        reveals: "bond-formation",
        insight: "More overlap is not always better: past 74 pm the two nuclei repel faster than the overlap helps. The balance point is the bond length.",
      },
    },

    explain: [
      {
        id: "pair",
        title: "The pair of atoms",
        body: "The energy is {{energy}} kJ/mol and the orbitals overlap by {{overlap}}. At the bond length? {{atMinimum}}.",
      },
      {
        id: "kind",
        title: "This overlap",
        body: "A sigma bond? {{sigma}}. A pi bond? {{pi}}.",
      },
      {
        id: "molecule",
        title: "This molecule",
        body: "{{sigmaBonds}} sigma bonds and {{piBonds}} pi bonds, from {{doubleBonds}} double and {{tripleBonds}} triple bonds.",
      },
    ],

    challenges: [
      {
        id: "half-way-down",
        title: "Half-way down the well",
        prompt: "Stretch the H₂ bond until the energy is −218 kJ/mol, half the bond enthalpy, give or take 10.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "energy", op: "eq", value: -218, tolerance: 10 },
            { type: "compare", quantity: "distance", op: "gt", value: 74 },
          ],
        },
        hint: "Further apart than 74 pm, on the gentle side of the well.",
        success: "About 137 pm. The well is lopsided: steep where the nuclei repel, gentle where the atoms drift apart.",
      },
    ],
  },

  realWorld: [
    { title: "Why ethene makes plastics", description: "Its pi bond is weaker than its sigma bond, so it opens up and links molecules into polythene." },
    { title: "Cis and trans fats", description: "A C=C double bond cannot rotate, so the two arrangements round it are different molecules." },
    { title: "Nitrogen's stubbornness", description: "N≡N is one sigma and two pi bonds, 946 kJ/mol in all: why air's nitrogen is so hard to use." },
  ],
});
