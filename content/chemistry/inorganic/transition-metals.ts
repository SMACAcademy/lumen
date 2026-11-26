import { defineConcept } from "@ise/concept-schema";

/**
 * The 3d transition metals for class 12: variable oxidation states, colour
 * and magnetism, and the famous oxo-anions.
 *
 * One model, two views. Ions: an element in one oxidation state, its d
 * electrons in five boxes, and the colour of its solution. States: every
 * oxidation state of the row, rising to manganese's +7.
 */
export const transitionMetals = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "transition-metals",
    title: "Transition Metals",
    tagline: "Scandium to zinc: variable oxidation states, coloured ions and magnetic moments.",
    domain: "chemistry",
    category: "inorganic",
    grade: { min: 12, max: 12 },
    difficulty: "core",
    estimatedMinutes: 20,
    objective:
      "Work out the d-electron count of a 3d ion, its unpaired electrons and spin-only magnetic moment, explain why most transition-metal ions are coloured but d⁰ and d¹⁰ ions are not, and trace the oxidation states across the series, including KMnO₄ and K₂Cr₂O₇.",
    tags: ["transition metals", "d-block", "oxidation states", "magnetic moment", "colour", "permanganate", "dichromate", "class 12"],
  },

  connections: [
    {
      id: "atomic-orbitals",
      title: "Atomic Orbitals",
      domain: "chemistry",
      relation: "prerequisite",
      note: "Filling 4s before 3d, and emptying it first again, sets every d count here.",
      available: true,
    },
    {
      id: "coordination-compounds",
      title: "Coordination Compounds",
      domain: "chemistry",
      relation: "leads-to",
      note: "Put ligands round the ion and the d orbitals split: that is where the colour comes from.",
      available: true,
    },
  ],

  variables: [
    {
      id: "Z",
      symbol: "Z",
      name: "Element",
      meaning: "Atomic number, from scandium (21) to zinc (30).",
      binding: { kind: "state", key: "Z" },
      control: { type: "range", unit: "1", min: 21, max: 30, step: 1 },
      group: "primary",
      color: "angle",
    },
    {
      id: "ox",
      symbol: "ox",
      name: "Oxidation state",
      meaning: "0 is the metal; the rest snap to the states the element really shows.",
      binding: { kind: "state", key: "ox" },
      control: { type: "range", unit: "1", min: 0, max: 7, step: 1 },
      group: "primary",
      color: "sine",
    },
    {
      id: "walk",
      symbol: "play",
      name: "Play walks through",
      meaning: "The row of elements, or one element's oxidation states.",
      binding: { kind: "param", key: "walk" },
      control: {
        type: "choice",
        options: [
          { value: "elements", label: "The elements" },
          { value: "states", label: "One element's states" },
        ],
      },
      group: "primary",
      color: "neutral",
    },
  ],

  quantities: [
    {
      id: "dCount",
      symbol: "d",
      name: "d electrons",
      meaning: "Electrons left in the 3d orbitals.",
      result: "dCount",
      format: { kind: "number", digits: 0 },
      color: "sine",
      highlight: "dboxes",
      headline: true,
    },
    {
      id: "unpaired",
      symbol: "n",
      name: "Unpaired electrons",
      meaning: "Electrons alone in an orbital.",
      result: "unpaired",
      format: { kind: "number", digits: 0 },
      color: "cosine",
      highlight: "dboxes",
      headline: true,
    },
    {
      id: "moment",
      symbol: "μ",
      name: "Magnetic moment (BM)",
      meaning: "Spin-only moment in Bohr magnetons, √(n(n + 2)).",
      result: "moment",
      format: { kind: "number", digits: 2 },
      color: "cosine",
      headline: true,
    },
    {
      id: "coloured",
      symbol: "coloured?",
      name: "Coloured in solution",
      meaning: "Whether the species absorbs visible light.",
      result: "coloured",
      format: { kind: "label", labels: { "0": "no", "1": "yes" } },
      color: "angle",
      highlight: "solution",
    },
    {
      id: "chargeTransfer",
      symbol: "charge transfer?",
      name: "Colour from charge transfer",
      meaning: "Colour from an electron moving between oxygen and the metal, not from d–d jumps.",
      result: "chargeTransfer",
      format: { kind: "label", labels: { "0": "no", "1": "yes" } },
      color: "angle",
    },
    {
      id: "maxOx",
      symbol: "max ox",
      name: "Highest oxidation state",
      meaning: "The most this element shows.",
      result: "maxOx",
      format: { kind: "number", digits: 0 },
      color: "sine",
      highlight: "states",
    },
    {
      id: "e2",
      symbol: "E°(M²⁺/M)",
      name: "Standard electrode potential",
      meaning: "For M²⁺ + 2e⁻ → M. Negative: the metal gives hydrogen with dilute acid.",
      result: "e2",
      format: { kind: "number", digits: 2 },
      unit: "V",
      color: "neutral",
    },
  ],

  equations: [
    {
      id: "d-count",
      topic: "transition-properties",
      title: "d electrons in an ion",
      words: "d electrons = Z − 18 − oxidation state (4s is lost first)",
      tokens: [
        { kind: "ref", id: "dCount" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "Z" },
        { kind: "op", value: "−" },
        { kind: "text", value: "18" },
        { kind: "op", value: "−" },
        { kind: "ref", id: "ox" },
      ],
      reading: "Argon's 18 electrons are the core. Iron is [Ar] 3d⁶ 4s²; Fe²⁺ loses the two 4s electrons and keeps 3d⁶, Fe³⁺ loses one more: 3d⁵.",
      assumptions: ["The 3d series, as ions"],
      discoverable: true,
    },
    {
      id: "spin-only",
      topic: "colour-magnetism",
      title: "Spin-only magnetic moment",
      words: "μ = √(n(n + 2)) BM, n unpaired electrons",
      tokens: [
        { kind: "ref", id: "moment" },
        { kind: "op", value: "=" },
        { kind: "text", value: "√(n(n + 2))" },
      ],
      reading: "Mn²⁺ (3d⁵, five unpaired) has μ = √35 = 5.92 BM, the largest of the row; Zn²⁺ (3d¹⁰) has none and is diamagnetic.",
      assumptions: ["Spin only: orbital motion ignored"],
      discoverable: true,
    },
    {
      id: "colour-rule",
      topic: "colour-magnetism",
      title: "Why the ions are coloured",
      words: "d¹ to d⁹ ions absorb light by d–d jumps; d⁰ and d¹⁰ ions have no jump to make",
      tokens: [
        { kind: "text", value: "d¹–d⁹" },
        { kind: "op", value: "=" },
        { kind: "text", value: "coloured" },
      ],
      reading: "The colour we see is what is left of white light once the jump's colour is absorbed. Sc³⁺, Ti⁴⁺, Cu⁺ and Zn²⁺ are colourless.",
      assumptions: ["Ions in water"],
    },
    {
      id: "oxo-anions",
      topic: "important-compounds",
      title: "Permanganate and dichromate",
      words: "MnO₄⁻ (Mn +7, purple) and Cr₂O₇²⁻ (Cr +6, orange) are coloured by charge transfer",
      tokens: [
        { kind: "text", value: "MnO₄⁻, Cr₂O₇²⁻" },
        { kind: "op", value: "=" },
        { kind: "text", value: "charge-transfer colour" },
      ],
      reading: "With no d electrons left, the colour comes from an electron hopping from oxygen to the metal. Both are strong oxidising agents because the metal is so high in oxidation state.",
      assumptions: ["In acid solution"],
    },
  ],

  simulation: {
    model: "transition",
    params: { walk: "elements" },
    playLabel: "Walk along",
  },

  visualization: {
    renderer: "transition",
    hint: "Pick an element and an oxidation state; see its d electrons, magnetism and colour.",
    layers: [
      { id: "strip", label: "The 3d row" },
      { id: "ion", label: "Species" },
      { id: "dboxes", label: "d electrons" },
      { id: "solution", label: "Solution" },
      { id: "states", label: "Oxidation states" },
      { id: "labels", label: "Words", optional: true },
    ],
  },

  modes: [
    {
      id: "ions",
      label: "Ions",
      description: "d electrons, magnetism and colour",
      layers: ["strip", "ion", "dboxes", "solution", "labels"],
      graphs: [],
      equations: ["d-count", "spin-only", "colour-rule"],
    },
    {
      id: "states",
      label: "Oxidation states",
      description: "Every state across the row",
      layers: ["strip", "states", "labels"],
      graphs: [],
      equations: ["oxo-anions", "d-count"],
    },
  ],
  defaultMode: "ions",
  graphs: [],

  activities: {
    observe: [
      {
        id: "most-magnetic",
        prompt: "Find an ion with five unpaired electrons.",
        condition: { type: "compare", quantity: "unpaired", op: "eq", value: 5 },
      },
      {
        id: "purple",
        prompt: "Find permanganate.",
        condition: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "Z", op: "eq", value: 25 },
            { type: "compare", quantity: "ox", op: "eq", value: 7 },
          ],
        },
      },
    ],

    predict: [
      {
        id: "towards-zinc",
        question: "M²⁺ ions from manganese (Z = 25) to zinc (Z = 30): what happens to the number of unpaired electrons?",
        variable: "Z",
        from: 25,
        to: 30,
        quantity: "unpaired",
        options: ["increase", "decrease", "same"],
        given: { ox: 2 },
        explanation: "It falls from 5 to 0: past d⁵ each new electron pairs up, until Zn²⁺ is 3d¹⁰.",
      },
    ],

    experiment: {
      title: "Unpaired electrons and moment",
      instructions: "Record the d count, unpaired electrons and moment of four M²⁺ ions.",
      columns: ["dCount", "unpaired", "moment"],
      minRows: 3,
      discovery: {
        question: "How does the magnetic moment depend on the unpaired electrons n?",
        choices: [
          { id: "sqrt", label: "μ = √(n(n + 2))", correct: true },
          { id: "n", label: "μ = n", correct: false },
          { id: "d", label: "It depends on all the d electrons, paired or not", correct: false },
          { id: "none", label: "It does not depend on n", correct: false },
        ],
        reveals: "spin-only",
        insight: "Only unpaired electrons make a magnet; paired spins cancel.",
      },
    },

    explain: [
      {
        id: "ion",
        title: "The ion",
        body: "It has {{dCount}} d electrons, {{unpaired}} of them unpaired: μ = {{moment}} BM.",
      },
      {
        id: "states",
        title: "Oxidation states",
        body: "This element reaches +{{maxOx}}. The row climbs to manganese's +7 — every 3d and 4s electron — then falls as the d electrons pair up and hold on.",
      },
    ],

    challenges: [
      {
        id: "same-d",
        title: "Same d count",
        prompt: "Fe³⁺ is 3d⁵. Find a different ion with the same d count.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "dCount", op: "eq", value: 5 },
            { type: "compare", quantity: "Z", op: "neq", value: 26 },
            { type: "compare", quantity: "ox", op: "gt", value: 0 },
          ],
        },
        hint: "One element before iron, one charge fewer.",
        success: "Mn²⁺: also 3d⁵, also five unpaired — and very pale pink, like Fe³⁺ is pale.",
      },
    ],
  },

  realWorld: [
    { title: "Purple permanganate", description: "KMnO₄ disinfects water and titrates iron: its purple vanishes as Mn(+7) becomes almost colourless Mn²⁺." },
    { title: "Breathalysers", description: "Orange dichromate turns green as alcohol reduces Cr(+6) to Cr³⁺." },
    { title: "Coloured glass", description: "Cobalt ions make glass blue, chromium green, manganese violet." },
  ],
});
