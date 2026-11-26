import { defineConcept } from "@ise/concept-schema";

/**
 * Orbitals for class 11: the quantum numbers, the shapes of s, p and d
 * orbitals, and the order electrons fill them in.
 *
 * Two views on one model. Filling builds an atom electron by electron on an
 * energy ladder — Aufbau for the order, Pauli for two to a box, Hund for
 * spreading out — up to krypton, with chromium and copper as the textbook
 * exceptions. Shapes picks one orbital by n, l and m and draws its lobes and
 * nodes.
 */
export const atomicOrbitals = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "atomic-orbitals",
    title: "Atomic Orbitals",
    tagline: "Quantum numbers, the shapes of s, p and d, and the order electrons move in.",
    domain: "chemistry",
    category: "atoms",
    grade: { min: 11, max: 11 },
    difficulty: "core",
    estimatedMinutes: 20,
    objective:
      "Use n, l and m to name an orbital and count its nodes, recognise the shapes of s, p and d orbitals, and write the electron configuration of the first 36 elements with the Aufbau principle, Pauli's exclusion principle and Hund's rule — including the exceptions of chromium and copper.",
    tags: ["orbitals", "quantum numbers", "electron configuration", "Aufbau", "Hund's rule", "Pauli", "class 11"],
  },

  connections: [
    {
      id: "hydrogen-spectrum",
      title: "The Hydrogen Spectrum",
      domain: "chemistry",
      relation: "prerequisite",
      note: "Bohr's shells are the n of an orbital; the orbital adds l and m.",
      available: true,
    },
    {
      id: "periodic-trends",
      title: "Periodic Trends",
      domain: "chemistry",
      relation: "leads-to",
      note: "The block an element sits in is the subshell its last electron entered.",
      available: true,
    },
  ],

  variables: [
    {
      id: "Z",
      symbol: "Z",
      name: "Atomic number",
      meaning: "How many electrons to place: one element after another, hydrogen to krypton.",
      binding: { kind: "state", key: "Z" },
      control: { type: "range", unit: "1", min: 1, max: 36, step: 1 },
      group: "primary",
      color: "angle",
    },
    {
      id: "n",
      symbol: "n",
      name: "Principal quantum number",
      meaning: "The shell: how big the orbital is and roughly its energy.",
      binding: { kind: "state", key: "n" },
      control: { type: "range", unit: "1", min: 1, max: 4, step: 1 },
      group: "primary",
      color: "sine",
    },
    {
      id: "l",
      symbol: "l",
      name: "Azimuthal quantum number",
      meaning: "The subshell and its shape: 0 is s, 1 is p, 2 is d, 3 is f. It runs from 0 to n − 1.",
      binding: { kind: "state", key: "l" },
      control: { type: "range", unit: "1", min: 0, max: 3, step: 1 },
      group: "primary",
      color: "cosine",
    },
    {
      id: "m",
      symbol: "m",
      name: "Magnetic quantum number",
      meaning: "Which way the orbital points: from −l to +l.",
      binding: { kind: "state", key: "m" },
      control: { type: "range", unit: "1", min: -3, max: 3, step: 1 },
      group: "primary",
      color: "tangent",
    },
    {
      id: "direction",
      symbol: "play",
      name: "Play goes",
      meaning: "Up the periodic table adding electrons, or back down.",
      binding: { kind: "param", key: "direction" },
      control: {
        type: "choice",
        options: [
          { value: "up", label: "Up: add electrons" },
          { value: "down", label: "Down: take them away" },
        ],
      },
      group: "primary",
      color: "neutral",
    },
  ],

  quantities: [
    {
      id: "unpaired",
      symbol: "unpaired",
      name: "Unpaired electrons",
      meaning: "Electrons alone in their orbital.",
      result: "unpaired",
      format: { kind: "number", digits: 0 },
      color: "sine",
      highlight: "ladder",
      headline: true,
    },
    {
      id: "paramagnetic",
      symbol: "magnet?",
      name: "Magnetic behaviour",
      meaning: "Unpaired electrons make a substance attracted to a magnet: paramagnetic.",
      result: "paramagnetic",
      format: { kind: "label", labels: { "0": "diamagnetic", "1": "paramagnetic" } },
      color: "cosine",
    },
    {
      id: "block",
      symbol: "block",
      name: "Block",
      meaning: "The subshell the last electron went into.",
      result: "block",
      format: { kind: "label", labels: { "0": "s-block", "1": "p-block", "2": "d-block", "3": "f-block" } },
      color: "angle",
      headline: true,
    },
    {
      id: "exception",
      symbol: "exception?",
      name: "Breaks the order",
      meaning: "Chromium and copper move a 4s electron into 3d.",
      result: "exception",
      format: { kind: "label", labels: { "0": "no", "1": "yes" } },
      color: "angle",
    },
    {
      id: "radialNodes",
      symbol: "radial",
      name: "Radial nodes",
      meaning: "Spheres round the nucleus where the electron is never found: n − l − 1.",
      result: "radialNodes",
      format: { kind: "number", digits: 0 },
      color: "angle",
      highlight: "nodes",
      headline: true,
    },
    {
      id: "angularNodes",
      symbol: "angular",
      name: "Angular nodes",
      meaning: "Planes or cones through the nucleus with no electron density: l of them.",
      result: "angularNodes",
      format: { kind: "number", digits: 0 },
      color: "angle",
      highlight: "nodes",
      headline: true,
    },
    {
      id: "nodes",
      symbol: "nodes",
      name: "All nodes",
      meaning: "Radial and angular together: n − 1.",
      result: "nodes",
      format: { kind: "number", digits: 0 },
      color: "neutral",
    },
    {
      id: "subshellCapacity",
      symbol: "2(2l + 1)",
      name: "Electrons the subshell holds",
      meaning: "2l + 1 orbitals, two electrons each.",
      result: "subshellCapacity",
      format: { kind: "number", digits: 0 },
      color: "cosine",
    },
    {
      id: "shellCapacity",
      symbol: "2n²",
      name: "Electrons the shell holds",
      meaning: "n² orbitals in the shell, two electrons each.",
      result: "shellCapacity",
      format: { kind: "number", digits: 0 },
      color: "sine",
    },
    {
      id: "nPlusL",
      symbol: "n + l",
      name: "n + l",
      meaning: "Lower n + l fills first; for a tie, the lower n.",
      result: "nPlusL",
      format: { kind: "number", digits: 0 },
      color: "tangent",
    },
  ],

  equations: [
    {
      id: "node-count",
      topic: "orbital-shapes",
      title: "Nodes of an orbital",
      words: "radial nodes = n − l − 1; angular nodes = l",
      tokens: [
        { kind: "ref", id: "radialNodes" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "n" },
        { kind: "op", value: "−" },
        { kind: "ref", id: "l" },
        { kind: "op", value: "−" },
        { kind: "text", value: "1" },
      ],
      reading: "A 3p orbital has one radial node and one angular node — two in all, n − 1, like every orbital of the third shell.",
      assumptions: ["Hydrogen-like orbitals"],
      discoverable: true,
    },
    {
      id: "shell-capacity",
      topic: "quantum-numbers",
      title: "Electrons in a shell",
      words: "a shell holds 2n² electrons",
      tokens: [
        { kind: "ref", id: "shellCapacity" },
        { kind: "op", value: "=" },
        { kind: "text", value: "2" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "n", power: 2 },
      ],
      reading: "Shell n has n subshells, l = 0 to n − 1, with 2l + 1 orbitals each: n² orbitals, two electrons in each.",
      assumptions: ["Pauli: no two electrons share all four quantum numbers"],
    },
    {
      id: "n-plus-l",
      topic: "electron-configuration",
      title: "The (n + l) rule",
      words: "the subshell with the lower n + l fills first; for a tie, the lower n",
      tokens: [
        { kind: "ref", id: "nPlusL" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "n" },
        { kind: "op", value: "+" },
        { kind: "ref", id: "l" },
      ],
      reading: "4s has n + l = 4 and 3d has 5, so 4s fills before 3d — which is why potassium is 4s¹.",
      assumptions: ["Neutral atoms in their ground state"],
      discoverable: true,
    },
    {
      id: "hunds-rule",
      topic: "electron-configuration",
      title: "Hund's rule",
      words: "in a subshell, electrons go one to an orbital, spins parallel, before any pair up",
      tokens: [
        { kind: "text", value: "2p³" },
        { kind: "op", value: "=" },
        { kind: "text", value: "↑ ↑ ↑" },
      ],
      reading: "Electrons repel, so they spread out: nitrogen has three unpaired 2p electrons, not a pair and a single.",
      assumptions: ["Orbitals of one subshell have equal energy"],
      discoverable: true,
    },
  ],

  simulation: {
    model: "orbitals",
    params: { direction: "up" },
    playLabel: "Add electrons",
  },

  visualization: {
    renderer: "orbitals",
    hint: "Filling: step through the elements. Shapes: pick n, l and m.",
    layers: [
      { id: "config", label: "Configuration" },
      { id: "ladder", label: "Energy ladder" },
      { id: "axes", label: "Axes" },
      { id: "orbital", label: "Orbital" },
      { id: "nodes", label: "Nodes", optional: true },
      { id: "labels", label: "Words", optional: true },
    ],
  },

  modes: [
    {
      id: "filling",
      label: "Filling",
      description: "Electrons into boxes, element by element",
      layers: ["config", "ladder", "labels"],
      graphs: [],
      equations: ["n-plus-l", "hunds-rule"],
    },
    {
      id: "shapes",
      label: "Shapes",
      description: "One orbital, its lobes and its nodes",
      layers: ["axes", "orbital", "nodes", "labels"],
      graphs: [],
      equations: ["node-count", "shell-capacity"],
    },
  ],
  defaultMode: "filling",
  graphs: [],

  activities: {
    observe: [
      {
        id: "most-unpaired",
        prompt: "Find the element with the most unpaired electrons.",
        condition: { type: "compare", quantity: "unpaired", op: "eq", value: 6 },
      },
      {
        id: "a-d-orbital",
        prompt: "In Shapes, show a d orbital.",
        condition: { type: "compare", quantity: "l", op: "eq", value: 2 },
      },
    ],

    predict: [
      {
        id: "across-p",
        question: "From boron (Z = 5) to nitrogen (Z = 7), what happens to the number of unpaired electrons?",
        variable: "Z",
        from: 5,
        to: 7,
        quantity: "unpaired",
        options: ["increase", "decrease", "same"],
        explanation: "It goes from 1 to 3: each new 2p electron takes an empty orbital before any pair up.",
      },
    ],

    experiment: {
      title: "Counting nodes",
      instructions: "Record the radial and angular nodes of 2s, 2p, 3s, 3p and 3d.",
      columns: ["n", "l", "radialNodes", "angularNodes", "nodes"],
      minRows: 3,
      discovery: {
        question: "How many radial nodes does an orbital have?",
        choices: [
          { id: "nl1", label: "n − l − 1", correct: true },
          { id: "n", label: "n", correct: false },
          { id: "l", label: "l", correct: false },
          { id: "nl", label: "n + l", correct: false },
        ],
        reveals: "node-count",
        insight: "Every orbital of shell n has n − 1 nodes in all; l of them are angular, the rest radial.",
      },
    },

    explain: [
      {
        id: "filling",
        title: "Filling the boxes",
        body: "This atom has {{unpaired}} unpaired electrons and sits in the {{block}}. Electrons fill by n + l, two to a box with opposite spins, singly before they pair.",
      },
      {
        id: "shape",
        title: "The orbital",
        body: "It has {{radialNodes}} radial and {{angularNodes}} angular nodes. Its subshell holds {{subshellCapacity}} electrons and its shell {{shellCapacity}}.",
      },
    ],

    challenges: [
      {
        id: "iron",
        title: "Four unpaired",
        prompt: "Find a d-block element with exactly four unpaired electrons.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "block", op: "eq", value: 2 },
            { type: "compare", quantity: "unpaired", op: "eq", value: 4 },
          ],
        },
        hint: "3d⁴ or 3d⁶ both leave four alone.",
        success: "Iron, 3d⁶: one pair and four singles — which is why iron is so magnetic.",
      },
    ],
  },

  realWorld: [
    { title: "Liquid oxygen sticks to a magnet", description: "Its two unpaired electrons make oxygen paramagnetic; liquid nitrogen, with none, just pours past." },
    { title: "Copper's colour and conductivity", description: "Copper's filled 3d and single 4s electron — the exception — shape how it conducts and why its compounds are coloured." },
    { title: "MRI", description: "Hospital scanners read the spin of electrons and nuclei: the same up and down as the arrows in the boxes." },
  ],
});
