import { defineConcept } from "@ise/concept-schema";

/**
 * Classification of elements and periodicity, taught from the first twenty
 * elements.
 *
 * Measured values — not formulae — laid out twice: on the periodic table as
 * a heat map, and against atomic number as a line that rises and falls every
 * period. The trends (smaller and harder to ionise across, bigger and easier
 * down) and their exceptions (boron below beryllium, oxygen below nitrogen,
 * chlorine beating fluorine for electron gain) are there to be found, not
 * told.
 */
export const periodicTrends = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "periodic-trends",
    title: "Periodic Trends",
    tagline: "Walk through the first twenty elements and watch size, ionisation and electronegativity rise and fall.",
    domain: "chemistry",
    category: "periodicity",
    grade: { min: 11, max: 11 },
    difficulty: "introductory",
    estimatedMinutes: 20,
    objective:
      "Describe and explain the trends in atomic radius, ionisation enthalpy, electronegativity and electron gain enthalpy across a period and down a group, including the exceptions.",
    tags: ["periodic table", "periodicity", "atomic radius", "ionisation enthalpy", "electronegativity", "electron gain enthalpy", "jee", "neet", "class 11"],
  },

  connections: [
    {
      id: "hydrogen-spectrum",
      title: "The Hydrogen Spectrum",
      domain: "chemistry",
      relation: "prerequisite",
      note: "Ionisation enthalpy is hydrogen's 13.6 eV, per mole, for every element — and shells explain the periods.",
      available: true,
    },
    {
      id: "molecular-shapes",
      title: "Molecular Shapes",
      domain: "chemistry",
      relation: "leads-to",
      note: "Electronegativity differences make bonds polar.",
      available: true,
    },
  ],

  variables: [
    {
      id: "Z",
      symbol: "Z",
      name: "Element (atomic number)",
      meaning: "Click an element in the table or a point on the plot, or press play to walk through them.",
      binding: { kind: "state", key: "Z" },
      control: { type: "range", unit: "1", min: 1, max: 20, step: 1 },
      group: "primary",
      color: "angle",
    },
    {
      id: "property",
      symbol: "property",
      name: "Property shown",
      meaning: "Which measured value to colour the table by and plot.",
      binding: { kind: "param", key: "property" },
      control: {
        type: "choice",
        options: [
          { value: "radius", label: "Atomic radius" },
          { value: "ionisation", label: "Ionisation enthalpy" },
          { value: "electronegativity", label: "Electronegativity" },
          { value: "electronGain", label: "Electron gain enthalpy" },
        ],
      },
      group: "primary",
      color: "curve",
    },
  ],

  quantities: [
    {
      id: "radius",
      symbol: "r",
      name: "Atomic radius",
      meaning: "Metallic radius for metals, covalent for non-metals. Not quoted for the noble gases (shown as 0).",
      result: "radius",
      format: { kind: "number", digits: 0 },
      unit: "pm",
      color: "sine",
      headline: true,
    },
    {
      id: "ionisation",
      symbol: "IE₁",
      name: "First ionisation enthalpy",
      meaning: "Energy to pull the outermost electron off one mole of gaseous atoms.",
      result: "ionisation",
      format: { kind: "number", digits: 0 },
      unit: "kJ/mol",
      color: "cosine",
      headline: true,
    },
    {
      id: "electronegativity",
      symbol: "χ",
      name: "Electronegativity",
      meaning: "Pauling's scale of how strongly an atom pulls shared electrons. Not defined for the noble gases (shown as 0).",
      result: "electronegativity",
      format: { kind: "number", digits: 2 },
      color: "vector",
      headline: true,
    },
    {
      id: "electronGain",
      symbol: "ΔegH",
      name: "Electron gain enthalpy",
      meaning: "Energy change when a gaseous atom gains an electron; more negative means more eager. 0 where not quoted.",
      result: "electronGain",
      format: { kind: "number", digits: 0 },
      unit: "kJ/mol",
      color: "tangent",
      headline: true,
    },
    {
      id: "period",
      symbol: "period",
      name: "Period",
      meaning: "The row: how many electron shells the atom has.",
      result: "period",
      format: { kind: "integer" },
      color: "neutral",
      highlight: "table",
    },
    {
      id: "group",
      symbol: "group",
      name: "Group",
      meaning: "The column: how many outer electrons (for groups 1, 2 and 13–18).",
      result: "group",
      format: { kind: "integer" },
      color: "neutral",
      highlight: "table",
    },
    {
      id: "valenceElectrons",
      symbol: "outer e⁻",
      name: "Outer electrons",
      meaning: "Electrons in the outermost shell.",
      result: "valenceElectrons",
      format: { kind: "integer" },
      color: "neutral",
    },
    {
      id: "valency",
      symbol: "valency",
      name: "Valency",
      meaning: "Electrons lost, gained or shared to fill the outer shell: the outer electrons up to 4, then 8 minus them.",
      result: "valency",
      format: { kind: "integer" },
      color: "neutral",
    },
    {
      id: "metal",
      symbol: "metal?",
      name: "Metal or non-metal",
      meaning: "Metals sit to the left of the table.",
      result: "metal",
      format: { kind: "label", labels: { "0": "non-metal", "1": "metal" } },
      color: "neutral",
    },
  ],

  equations: [
    {
      id: "across",
      topic: "atomic-radius-trend",
      title: "Across a period",
      tokens: [
        { kind: "text", value: "Z ↑ in one shell" },
        { kind: "op", value: "=" },
        { kind: "text", value: "radius ↓, IE ↑, χ ↑" },
      ],
      reading: "More protons pull on the same shell, so atoms shrink and hold their electrons more tightly.",
      assumptions: ["Same period, main-group elements"],
      discoverable: true,
    },
    {
      id: "down",
      topic: "atomic-radius-trend",
      title: "Down a group",
      tokens: [
        { kind: "text", value: "one more shell" },
        { kind: "op", value: "=" },
        { kind: "text", value: "radius ↑, IE ↓, χ ↓" },
      ],
      reading: "Each new shell is further out and shielded by the ones inside, so atoms grow and let go more easily.",
      assumptions: ["Same group"],
      discoverable: true,
    },
    {
      id: "periodic-law",
      topic: "periodic-table",
      title: "The modern periodic law",
      tokens: [
        { kind: "text", value: "properties" },
        { kind: "op", value: "=" },
        { kind: "text", value: "a periodic function of Z" },
      ],
      reading: "Arrange the elements by atomic number and the same outer-electron arrangement comes round again and again. Periods are rows of filling shells; groups are columns of like outer electrons.",
      assumptions: ["Atomic number, not atomic mass, sets the order"],
      discoverable: true,
    },
    {
      id: "valency-rule",
      topic: "valency-trends",
      title: "Valency from the group",
      tokens: [
        { kind: "ref", id: "valency" },
        { kind: "op", value: "=" },
        { kind: "text", value: "outer electrons, or 8 − outer electrons" },
      ],
      reading: "Across a period the valency towards hydrogen rises to 4 and falls back to 1; towards oxygen it rises from 1 to 7. Reactivity is greatest at the two ends of a period.",
      assumptions: ["Main-group elements"],
    },
  ],

  simulation: {
    model: "periodic",
    params: { property: "radius" },
    playLabel: "Walk the table",
  },

  visualization: {
    renderer: "periodic",
    hint: "Click an element, or press play to walk from hydrogen to calcium.",
    layers: [
      { id: "table", label: "Periodic table" },
      { id: "chart", label: "Against atomic number", optional: true },
      { id: "labels", label: "Labels", optional: true },
    ],
  },

  modes: [
    {
      id: "both",
      label: "Table and plot",
      description: "The heat map and the sawtooth",
      layers: ["table", "chart", "labels"],
      graphs: [],
      equations: ["across", "down", "periodic-law"],
    },
    {
      id: "table-only",
      label: "Just the table",
      description: "The heat map",
      layers: ["table", "labels"],
      graphs: [],
      equations: ["across", "periodic-law", "valency-rule"],
    },
  ],
  defaultMode: "both",
  graphs: [],

  activities: {
    observe: [
      {
        id: "walk",
        prompt: "Press play and walk from hydrogen to calcium. The radius shrinks along each row, then jumps at every new period.",
        condition: { type: "compare", quantity: "Z", op: "gte", value: 19 },
      },
      {
        id: "ionisation",
        prompt: "Switch to ionisation enthalpy. It is the mirror image: highest at the noble gases, lowest at the alkali metals.",
        condition: { type: "compare", quantity: "property", op: "eq", value: 1 },
      },
      {
        id: "fluorine",
        prompt: "Find the most electronegative element of all.",
        condition: { type: "compare", quantity: "electronegativity", op: "gte", value: 3.9 },
      },
    ],

    predict: [
      {
        id: "across-radius",
        question: "Across period 3, from sodium (Z = 11) to chlorine (Z = 17). What happens to the atomic radius?",
        variable: "Z",
        from: 11,
        to: 17,
        quantity: "radius",
        options: ["increase", "decrease", "same"],
        given: { property: "radius" },
        explanation: "It shrinks, 186 → 99 pm. Six more protons pull on the same third shell.",
      },
      {
        id: "down-radius",
        question: "Down group 1, from lithium (Z = 3) to sodium (Z = 11). What happens to the atomic radius?",
        variable: "Z",
        from: 3,
        to: 11,
        quantity: "radius",
        options: ["increase", "decrease", "same"],
        given: { property: "radius" },
        explanation: "It grows, 152 → 186 pm: sodium has a whole extra shell.",
      },
      {
        id: "be-to-b",
        question: "From beryllium (Z = 4) to boron (Z = 5). What happens to the first ionisation enthalpy?",
        variable: "Z",
        from: 4,
        to: 5,
        quantity: "ionisation",
        options: ["increase", "decrease", "same"],
        given: { property: "ionisation" },
        explanation: "It falls, 899 → 801 kJ/mol — against the trend. Boron's fifth electron starts a new 2p subshell, higher in energy and easier to remove than beryllium's 2s pair.",
      },
    ],

    experiment: {
      title: "The sawtooth",
      instructions: "With ionisation enthalpy shown, record it for each element from lithium (3) to neon (10).",
      columns: ["ionisation", "radius", "period", "group"],
      minRows: 5,
      discovery: {
        question: "How does ionisation enthalpy change across period 2?",
        choices: [
          { id: "up-with-dips", label: "It rises overall, with two small dips (at boron and oxygen)", correct: true },
          { id: "smooth", label: "It rises smoothly, with no exceptions", correct: false },
          { id: "falls", label: "It falls across the period", correct: false },
          { id: "flat", label: "It barely changes", correct: false },
        ],
        reveals: "across",
        insight: "More protons in the same shell hold electrons tighter, so IE rises. The dips are subshell effects: boron starts 2p, and oxygen's fourth p electron has to pair up.",
      },
    },

    explain: [
      {
        id: "shells",
        title: "Shells and protons",
        body: "Across a row the protons increase but the shell stays the same, so the pull grows. Down a group each atom adds a shell further out. Almost every trend is one of these two ideas.",
      },
      {
        id: "exceptions",
        title: "The exceptions",
        body: "Boron and oxygen ionise more easily than the elements before them, and chlorine gains an electron more eagerly than fluorine — fluorine is so small that the extra electron is crowded.",
      },
      {
        id: "exam-note",
        title: "In the exam",
        body: "Expect: ordering elements by radius, IE, electronegativity or electron gain enthalpy; explaining the exceptions; isoelectronic ions; and the diagonal relationship.",
      },
    ],

    challenges: [
      {
        id: "biggest",
        title: "The biggest atom",
        prompt: "Find the largest atom in the first twenty elements.",
        goal: { type: "compare", quantity: "radius", op: "gte", value: 230 },
        hint: "Bottom left.",
        success: "Potassium, 231 pm: four shells, and only one electron in the outermost.",
      },
      {
        id: "eager",
        title: "The most eager for an electron",
        prompt: "Find the element with the most negative electron gain enthalpy.",
        goal: { type: "compare", quantity: "electronGain", op: "lte", value: -340 },
        hint: "It is a halogen — but not the one you might expect.",
        success: "Chlorine, −349 kJ/mol. Fluorine (−328) is so small that an extra electron is crowded by the ones already there.",
      },
    ],
  },

  realWorld: [
    { title: "Why sodium is kept in oil", description: "Its single outer electron is held so loosely (496 kJ/mol) that air and water pull it off at once." },
    { title: "Fluorine's reach", description: "The most electronegative element forms the strongest bonds to carbon — which is why non-stick coatings and many drugs contain it." },
    { title: "Mendeleev's gaps", description: "The pattern was so regular that Mendeleev left gaps for elements not yet found, and predicted their properties." },
  ],
});
