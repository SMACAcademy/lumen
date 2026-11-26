import { defineConcept } from "@ise/concept-schema";

/**
 * Chemical bonding and molecular structure, taught from molecules you turn
 * in your hand.
 *
 * VSEPR in one sentence: electron pairs round a central atom push as far
 * apart as they can. Count the pairs, and the arrangement follows; the shape
 * is what the atoms alone trace out. Lone pairs take up room without being
 * seen — they squeeze water's angle to 104.5° and flatten XeF₄ into a
 * square — and symmetry decides which molecules are polar.
 */
export const molecularShapes = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "molecular-shapes",
    title: "Molecular Shapes",
    tagline: "Turn twelve molecules in your hand and see why electron pairs decide every shape.",
    domain: "chemistry",
    category: "chemical bonding",
    grade: { min: 11, max: 11 },
    difficulty: "core",
    estimatedMinutes: 25,
    objective:
      "Use VSEPR theory to predict a molecule's shape and bond angle from its bond pairs and lone pairs, name its hybridisation, and say whether it is polar.",
    tags: ["vsepr", "molecular shape", "hybridisation", "lone pairs", "bond angle", "polarity", "jee", "neet", "class 11"],
  },

  connections: [
    {
      id: "hydrogen-spectrum",
      title: "The Hydrogen Spectrum",
      domain: "chemistry",
      relation: "prerequisite",
      note: "Electrons live in levels around a nucleus; bonding is what the outermost of them do between atoms.",
      available: true,
    },
    {
      id: "periodic-trends",
      title: "Periodic Trends",
      domain: "chemistry",
      relation: "related",
      note: "Electronegativity differences make bonds polar; the shape decides whether the molecule is.",
      available: true,
    },
  ],

  variables: [
    {
      id: "yaw",
      symbol: "turn",
      name: "Turn round",
      meaning: "Drag across the molecule, or press play to spin it.",
      binding: { kind: "state", key: "yaw" },
      control: { type: "range", unit: "rad", min: -3.14, max: 3.14, step: 0.01 },
      group: "primary",
      color: "angle",
    },
    {
      id: "pitch",
      symbol: "tip",
      name: "Tip forward",
      meaning: "Drag up or down to look from above or below.",
      binding: { kind: "state", key: "pitch" },
      control: { type: "range", unit: "rad", min: -1.57, max: 1.57, step: 0.01 },
      group: "primary",
      color: "angle",
    },
    {
      id: "molecule",
      symbol: "molecule",
      name: "Molecule",
      meaning: "From two electron pairs to six, with and without lone pairs.",
      binding: { kind: "param", key: "molecule" },
      control: {
        type: "choice",
        options: [
          { value: "co2", label: "CO₂" },
          { value: "bf3", label: "BF₃" },
          { value: "ch4", label: "CH₄" },
          { value: "nh3", label: "NH₃" },
          { value: "h2o", label: "H₂O" },
          { value: "pcl5", label: "PCl₅" },
          { value: "sf4", label: "SF₄" },
          { value: "clf3", label: "ClF₃" },
          { value: "xef2", label: "XeF₂" },
          { value: "sf6", label: "SF₆" },
          { value: "brf5", label: "BrF₅" },
          { value: "xef4", label: "XeF₄" },
        ],
      },
      group: "primary",
      color: "curve",
    },
  ],

  quantities: [
    {
      id: "shape",
      symbol: "shape",
      name: "Shape",
      meaning: "What the atoms trace out — lone pairs are there but not part of the name.",
      result: "shape",
      format: {
        kind: "label",
        labels: {
          "0": "linear",
          "1": "trigonal planar",
          "2": "tetrahedral",
          "3": "trigonal pyramidal",
          "4": "bent",
          "5": "trigonal bipyramidal",
          "6": "see-saw",
          "7": "T-shaped",
          "8": "octahedral",
          "9": "square pyramidal",
          "10": "square planar",
        },
      },
      color: "angle",
      highlight: "atoms",
      headline: true,
    },
    {
      id: "bondAngle",
      symbol: "angle",
      name: "Bond angle",
      meaning: "The angle between two bonds, as textbooks quote it.",
      result: "bondAngle",
      format: { kind: "number", digits: 1 },
      unit: "deg",
      color: "angle",
      highlight: "angle",
      headline: true,
    },
    {
      id: "bondPairs",
      symbol: "bp",
      name: "Bond pairs",
      meaning: "Pairs of electrons shared with an outer atom.",
      result: "bondPairs",
      format: { kind: "integer" },
      color: "neutral",
      highlight: "atoms",
      headline: true,
    },
    {
      id: "lonePairs",
      symbol: "lp",
      name: "Lone pairs",
      meaning: "Pairs on the central atom that are not bonding — invisible in the shape, but taking up room.",
      result: "lonePairs",
      format: { kind: "integer" },
      color: "angle",
      highlight: "lonepairs",
      headline: true,
    },
    {
      id: "stericNumber",
      symbol: "SN",
      name: "Electron pairs",
      meaning: "Bond pairs plus lone pairs. This alone decides the arrangement.",
      result: "stericNumber",
      format: { kind: "integer" },
      color: "curve",
    },
    {
      id: "arrangement",
      symbol: "arrangement",
      name: "Electron-pair arrangement",
      meaning: "How all the pairs, bonding and lone, are spread out.",
      result: "arrangement",
      format: { kind: "label", labels: { "2": "linear", "3": "trigonal planar", "4": "tetrahedral", "5": "trigonal bipyramidal", "6": "octahedral" } },
      color: "curve",
    },
    {
      id: "hybridisation",
      symbol: "hybrid",
      name: "Hybridisation",
      meaning: "One hybrid orbital per electron pair on the central atom.",
      result: "hybridisation",
      format: { kind: "label", labels: { "2": "sp", "3": "sp²", "4": "sp³", "5": "sp³d", "6": "sp³d²" } },
      color: "vector",
    },
    {
      id: "polar",
      symbol: "polar?",
      name: "Polar",
      meaning: "Whether the bond dipoles add up to a net dipole, or cancel by symmetry.",
      result: "polar",
      format: { kind: "label", labels: { "0": "non-polar", "1": "polar" } },
      color: "cosine",
    },
  ],

  equations: [
    {
      id: "vsepr-count",
      topic: "vsepr",
      title: "Count the pairs",
      tokens: [
        { kind: "ref", id: "stericNumber" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "bondPairs" },
        { kind: "op", value: "+" },
        { kind: "ref", id: "lonePairs" },
      ],
      reading: "The number of electron pairs decides the arrangement: 2 linear, 3 trigonal, 4 tetrahedral, 5 trigonal bipyramidal, 6 octahedral.",
      assumptions: ["A double bond counts as one pair here"],
      discoverable: true,
    },
    {
      id: "repulsion",
      topic: "vsepr",
      title: "Lone pairs push hardest",
      tokens: [
        { kind: "text", value: "lp–lp" },
        { kind: "op", value: "·" },
        { kind: "text", value: "> lp–bp > bp–bp" },
      ],
      reading: "Lone pairs sit closer to the central atom and spread wider, so they squeeze the bonds together: 109.5° in CH₄, 107° in NH₃, 104.5° in H₂O.",
      assumptions: ["Qualitative ordering"],
      discoverable: true,
    },
  ],

  simulation: {
    model: "vsepr",
    params: { molecule: "ch4" },
    playLabel: "Spin it",
  },

  visualization: {
    renderer: "vsepr",
    hint: "Drag across the molecule to turn it; choose another molecule to compare.",
    layers: [
      { id: "atoms", label: "Atoms and bonds" },
      { id: "lonepairs", label: "Lone pairs", optional: true },
      { id: "angle", label: "Bond angle", optional: true },
      { id: "facts", label: "Facts", optional: true },
      { id: "labels", label: "Labels", optional: true },
    ],
  },

  modes: [
    {
      id: "full",
      label: "Molecule",
      description: "Atoms, lone pairs, the angle and the facts",
      layers: ["atoms", "lonepairs", "angle", "facts", "labels"],
      graphs: [],
      equations: ["vsepr-count", "repulsion"],
    },
    {
      id: "atoms-only",
      label: "Atoms only",
      description: "The shape as the name describes it",
      layers: ["atoms", "angle", "labels"],
      graphs: [],
      equations: ["vsepr-count"],
    },
    {
      id: "pairs",
      label: "Where the pairs go",
      description: "Lone pairs shown, facts hidden — work it out first",
      layers: ["atoms", "lonepairs", "labels"],
      graphs: [],
      equations: ["repulsion"],
    },
  ],
  defaultMode: "full",
  graphs: [],

  activities: {
    observe: [
      {
        id: "spin",
        prompt: "Spin methane. From every side the four hydrogens sit the same distance apart — a tetrahedron.",
        condition: { type: "compare", quantity: "yaw", op: "gte", value: 2 },
      },
      {
        id: "lone-pair",
        prompt: "Switch to ammonia. One pair is a lone pair: the shape becomes a pyramid, and the angle closes to 107°.",
        condition: { type: "compare", quantity: "lonePairs", op: "eq", value: 1 },
      },
      {
        id: "expanded",
        prompt: "Try SF₆. Six pairs round sulfur — more than eight electrons — spread to the corners of an octahedron.",
        condition: { type: "compare", quantity: "stericNumber", op: "eq", value: 6 },
      },
    ],

    predict: [],

    experiment: {
      title: "What do lone pairs do to the angle?",
      instructions: "Look at CH₄, NH₃ and H₂O in turn. Record the lone pairs and the bond angle of each.",
      columns: ["lonePairs", "bondAngle", "stericNumber", "shape"],
      minRows: 3,
      discovery: {
        question: "All three have four electron pairs. What happens to the angle as lone pairs replace bonds?",
        choices: [
          { id: "squeeze", label: "It closes up: lone pairs push the bonds together", correct: true },
          { id: "open", label: "It opens out", correct: false },
          { id: "same", label: "It stays at 109.5°", correct: false },
          { id: "random", label: "It changes, but not in any order", correct: false },
        ],
        reveals: "repulsion",
        insight: "Lone pairs are held only by the central atom, so they bulge wider than bonding pairs and push the bonds closer: 109.5° → 107° → 104.5°.",
      },
    },

    explain: [
      {
        id: "count-first",
        title: "Count first, then look",
        body: "Add the bond pairs and lone pairs. That number fixes the arrangement; the shape is the arrangement with the lone pairs rubbed out. This one is {{shape}}.",
      },
      {
        id: "where-lone-pairs-go",
        title: "Where the lone pairs go",
        body: "With five pairs, lone pairs take the equator, where they have the most room — which is why XeF₂ ends up linear. With six, two lone pairs sit opposite each other, leaving XeF₄ square planar.",
      },
      {
        id: "polarity",
        title: "Polar or not",
        body: "Every bond to fluorine is polar, but in a symmetrical shape the pulls cancel. CO₂ and XeF₄ are non-polar; H₂O and NH₃ are not symmetrical and are polar.",
      },
      {
        id: "exam-note",
        title: "In the exam",
        body: "Expect: predict shape and angle from a formula, compare bond angles (CH₄ > NH₃ > H₂O), hybridisation of the central atom, dipole moments, and the expanded-octet molecules of groups 15–18.",
      },
    ],

    challenges: [
      {
        id: "square",
        title: "A flat square",
        prompt: "Find the molecule whose atoms make a flat square.",
        goal: { type: "compare", quantity: "shape", op: "eq", value: 10 },
        hint: "Six electron pairs, two of them lone pairs.",
        success: "XeF₄: the two lone pairs sit above and below, leaving the four fluorines in a square.",
      },
      {
        id: "polar-expanded",
        title: "Polar, with an expanded octet",
        prompt: "Find a polar molecule with five or more electron pairs on the central atom.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "polar", op: "eq", value: 1 },
            { type: "compare", quantity: "stericNumber", op: "gte", value: 5 },
          ],
        },
        hint: "A lone pair breaks the symmetry.",
        success: "SF₄, ClF₃ or BrF₅: each has a lone pair that leaves the fluorines lopsided.",
      },
    ],
  },

  realWorld: [
    { title: "Why ice floats", description: "Water's bent shape and polarity let it hydrogen-bond into an open lattice, less dense than the liquid." },
    { title: "Greenhouse gases", description: "CO₂ is non-polar at rest, but its bending vibrations make a changing dipole — which is how it absorbs infrared." },
    { title: "Drug design", description: "Medicines fit their targets like keys; a molecule's shape decides what it can bind to." },
  ],
});
