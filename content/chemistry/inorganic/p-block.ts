import { defineConcept } from "@ise/concept-schema";

/**
 * The p-block for class 12 (and hydrogen bonding from class 11).
 *
 * NCERT's measured data for groups 13 to 18, shown not derived: how metallic
 * each element is, its electronegativity, its oxide, the inert pair effect,
 * and the hydrides — whose boiling points give away hydrogen bonding.
 */
export const pBlock = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "p-block",
    title: "The p-block",
    tagline: "Groups 13 to 18: non-metals turning to metals, the inert pair, and hydrides that hydrogen-bond.",
    domain: "chemistry",
    category: "inorganic",
    grade: { min: 11, max: 12 },
    difficulty: "core",
    estimatedMinutes: 20,
    objective:
      "Trace metallic character, electronegativity and oxide character down the p-block groups, explain the inert pair effect in Tl, Pb and Bi, and use the boiling points, bond angles and bond enthalpies of the hydrides of groups 14 to 17 to explain hydrogen bonding and the trends in the nitrogen and oxygen families.",
    tags: ["p-block", "inert pair effect", "hydrides", "hydrogen bonding", "nitrogen family", "oxygen family", "class 12"],
  },

  connections: [
    {
      id: "periodic-trends",
      title: "Periodic Trends",
      domain: "chemistry",
      relation: "prerequisite",
      note: "The same trends in size and electronegativity, now read group by group.",
      available: true,
    },
    {
      id: "molecular-shapes",
      title: "Molecular Shapes",
      domain: "chemistry",
      relation: "related",
      note: "NH₃ and H₂O are bent by their lone pairs; heavier hydrides close towards 90°.",
      available: true,
    },
  ],

  variables: [
    {
      id: "group",
      symbol: "group",
      name: "Group",
      meaning: "13 (boron) to 18 (the noble gases).",
      binding: { kind: "state", key: "group" },
      control: { type: "range", unit: "1", min: 13, max: 18, step: 1 },
      group: "primary",
      color: "sine",
    },
    {
      id: "period",
      symbol: "period",
      name: "Period",
      meaning: "2 at the top to 6 at the bottom.",
      binding: { kind: "state", key: "period" },
      control: { type: "range", unit: "1", min: 2, max: 6, step: 1 },
      group: "primary",
      color: "cosine",
    },
    {
      id: "property",
      symbol: "colour by",
      name: "Colour the table by",
      meaning: "Which property the cells show.",
      binding: { kind: "param", key: "property" },
      control: {
        type: "choice",
        options: [
          { value: "character", label: "Metal or non-metal" },
          { value: "electronegativity", label: "Electronegativity" },
          { value: "oxide", label: "Oxide" },
          { value: "inert", label: "Inert pair" },
        ],
      },
      group: "primary",
      color: "neutral",
    },
  ],

  quantities: [
    {
      id: "character",
      symbol: "type",
      name: "Metal or non-metal",
      meaning: "As NCERT classes the element.",
      result: "character",
      format: { kind: "label", labels: { "0": "metal", "1": "metalloid", "2": "non-metal" } },
      color: "tangent",
      highlight: "table",
      headline: true,
    },
    {
      id: "en",
      symbol: "EN",
      name: "Electronegativity",
      meaning: "Pauling scale (NCERT); not given for the noble gases.",
      result: "en",
      format: { kind: "number", digits: 2 },
      color: "sine",
      headline: true,
    },
    {
      id: "oxide",
      symbol: "oxide",
      name: "Oxide",
      meaning: "Whether its common oxide is basic, amphoteric or acidic.",
      result: "oxide",
      format: { kind: "label", labels: { "0": "basic", "1": "amphoteric", "2": "acidic", "3": "neutral" } },
      color: "angle",
    },
    {
      id: "groupOx",
      symbol: "group state",
      name: "Group oxidation state",
      meaning: "Using all its s and p electrons.",
      result: "groupOx",
      format: { kind: "number", digits: 0 },
      color: "sine",
    },
    {
      id: "inertPair",
      symbol: "inert pair?",
      name: "Prefers the lower state",
      meaning: "Whether its s² pair holds back, making the state two lower the more stable.",
      result: "inertPair",
      format: { kind: "label", labels: { "0": "no", "1": "yes" } },
      color: "cosine",
    },
    {
      id: "hydrideBp",
      symbol: "bp",
      name: "Hydride boiling point",
      meaning: "Of its hydride (groups 14–17), from NCERT's tables.",
      result: "hydrideBp",
      format: { kind: "number", digits: 1 },
      unit: "K",
      color: "angle",
      highlight: "hydrides",
      headline: true,
    },
    {
      id: "hydrideAngle",
      symbol: "H–E–H",
      name: "Hydride bond angle (°)",
      meaning: "For the hydrides of groups 15 and 16.",
      result: "hydrideAngle",
      format: { kind: "number", digits: 1 },
      color: "angle",
    },
    {
      id: "bondEnthalpy",
      symbol: "E–H",
      name: "E–H bond enthalpy",
      meaning: "How strongly hydrogen is held; it falls down each group.",
      result: "bondEnthalpy",
      format: { kind: "number", digits: 0 },
      unit: "kJ/mol",
      color: "cosine",
    },
    {
      id: "hBonding",
      symbol: "H-bonds?",
      name: "Hydrogen bonded",
      meaning: "Whether the hydride's molecules hold each other by hydrogen bonds.",
      result: "hBonding",
      format: { kind: "label", labels: { "0": "no", "1": "yes" } },
      color: "tangent",
      highlight: "hydrides",
    },
  ],

  equations: [
    {
      id: "inert-pair",
      topic: "p-block-trends",
      title: "The inert pair effect",
      words: "down groups 13–15 the ns² pair holds back: the lower state (group − 2) becomes the stable one",
      tokens: [
        { kind: "text", value: "Tl⁺, Pb²⁺, Bi³⁺" },
        { kind: "op", value: "=" },
        { kind: "text", value: "more stable than Tl³⁺, Pb⁴⁺, Bi⁵⁺" },
      ],
      reading: "The heaviest elements' s electrons are held tightly and poorly shielded, so they are reluctant to bond: PbO₂ is a strong oxidising agent, falling back to Pb²⁺.",
      assumptions: ["Groups 13 to 15"],
      discoverable: true,
    },
    {
      id: "hydrogen-bond",
      topic: "hydrogen-bonding",
      title: "Hydrogen bonding",
      words: "H bonded to N, O or F is attracted to a lone pair on another N, O or F: NH₃, H₂O and HF boil far above their groups",
      tokens: [
        { kind: "text", value: "N–H, O–H, F–H ··· N, O, F" },
        { kind: "op", value: "=" },
        { kind: "text", value: "hydrogen bond" },
      ],
      reading: "Water should boil near 200 K if it followed H₂S, H₂Se and H₂Te; hydrogen bonds hold it together until 373 K.",
      assumptions: ["Small, very electronegative atoms"],
      discoverable: true,
    },
    {
      id: "hydride-angles",
      topic: "nitrogen-family",
      title: "Hydride bond angles",
      words: "NH₃ 107.8° → PH₃ 93.6° → AsH₃ 91.8° → SbH₃ 91.3° → BiH₃ 90°",
      tokens: [
        { kind: "ref", id: "hydrideAngle" },
        { kind: "op", value: "≈" },
        { kind: "text", value: "90° for heavy hydrides" },
      ],
      reading: "Bigger, less electronegative central atoms let the bonding pairs sit further apart and nearer to pure p orbitals, so the angle closes towards 90°.",
      assumptions: ["Groups 15 and 16"],
    },
    {
      id: "hydride-stability",
      topic: "oxygen-family",
      title: "Hydride stability and acidity",
      words: "down a group the E–H bond weakens: H₂O < H₂S < H₂Se < H₂Te in acid strength, and thermal stability falls",
      tokens: [
        { kind: "ref", id: "bondEnthalpy" },
        { kind: "op", value: "=" },
        { kind: "text", value: "falls down the group" },
      ],
      reading: "A weaker bond gives up its H⁺ more easily and breaks more easily on heating: H₂Te is the strongest acid of the oxygen family's hydrides and the least stable.",
      assumptions: ["Groups 15 to 17"],
    },
  ],

  simulation: {
    model: "pblock",
    params: { property: "character" },
    playLabel: "Walk down the group",
  },

  visualization: {
    renderer: "pblock",
    hint: "Pick an element, and colour the table by a property — or look at the hydrides.",
    layers: [
      { id: "table", label: "p-block table" },
      { id: "hydrides", label: "Hydride boiling points" },
      { id: "labels", label: "Words", optional: true },
    ],
  },

  modes: [
    {
      id: "table",
      label: "Table",
      description: "Trends down the groups",
      layers: ["table", "labels"],
      graphs: [],
      equations: ["inert-pair"],
    },
    {
      id: "hydrides",
      label: "Hydrides",
      description: "Boiling points, angles and bonds",
      layers: ["hydrides", "labels"],
      graphs: [],
      equations: ["hydrogen-bond", "hydride-angles", "hydride-stability"],
    },
  ],
  defaultMode: "table",
  graphs: [],

  activities: {
    observe: [
      {
        id: "metalloid",
        prompt: "Find a metalloid in group 15.",
        condition: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "group", op: "eq", value: 15 },
            { type: "compare", quantity: "character", op: "eq", value: 1 },
          ],
        },
      },
      {
        id: "water",
        prompt: "Find the hydride with the highest boiling point.",
        condition: { type: "compare", quantity: "hydrideBp", op: "eq", value: 373 },
      },
    ],

    predict: [
      {
        id: "halogens",
        question: "Down the halogens from fluorine to iodine, what happens to electronegativity?",
        variable: "period",
        from: 2,
        to: 5,
        quantity: "en",
        options: ["increase", "decrease", "same"],
        given: { group: 17 },
        explanation: "It falls, from 4.0 to 2.7: bigger atoms hold bonding electrons less tightly.",
      },
    ],

    experiment: {
      title: "Hydride boiling points",
      instructions: "Record the boiling points of the hydrides of group 16, then group 17.",
      columns: ["period", "hydrideBp", "hBonding"],
      minRows: 4,
      discovery: {
        question: "Why do H₂O and HF boil so much higher than the rest of their groups?",
        choices: [
          { id: "hbond", label: "Hydrogen bonds hold their molecules together", correct: true },
          { id: "heavier", label: "They are the heaviest", correct: false },
          { id: "ionic", label: "They are ionic", correct: false },
          { id: "angle", label: "Their bond angles are larger", correct: false },
        ],
        reveals: "hydrogen-bond",
        insight: "Without hydrogen bonds, water would be a gas at room temperature.",
      },
    },

    explain: [
      {
        id: "element",
        title: "The element",
        body: "A {{character}} with electronegativity {{en}}; its group state is +{{groupOx}}, and it prefers a lower state: {{inertPair}}.",
      },
      {
        id: "hydride",
        title: "Its hydride",
        body: "Boils at {{hydrideBp}} K with an E–H bond of {{bondEnthalpy}} kJ/mol. Hydrogen bonded: {{hBonding}}.",
      },
    ],

    challenges: [
      {
        id: "strongest-bond",
        title: "The strongest E–H bond",
        prompt: "Find the hydride with the strongest bond to hydrogen.",
        goal: { type: "compare", quantity: "bondEnthalpy", op: "eq", value: 574 },
        hint: "The smallest, most electronegative atom.",
        success: "H–F, 574 kJ/mol — which is why HF is the weakest of the hydrogen halide acids.",
      },
    ],
  },

  realWorld: [
    { title: "Lead batteries", description: "PbO₂ is eager to become Pb²⁺ — the inert pair effect drives the car battery's reaction." },
    { title: "Ice floats", description: "Hydrogen bonds hold water molecules in an open lattice, so ice is less dense than water." },
    { title: "Semiconductors", description: "The metalloids silicon and germanium sit on the border between metal and non-metal — just right for chips." },
  ],
});
