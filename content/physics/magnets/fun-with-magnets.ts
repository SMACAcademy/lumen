import { defineConcept } from "@ise/concept-schema";

/**
 * Magnets for class 6: what they pick up, how their poles behave, and why a
 * compass works.
 *
 * Only some materials are attracted, and only when close enough. Like poles
 * push apart and unlike poles pull together, more strongly the closer they
 * are. A compass needle is itself a small magnet, so it lines up with the
 * field around a bar magnet — and with the Earth's.
 */
export const funWithMagnets = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "fun-with-magnets",
    title: "Fun with Magnets",
    tagline: "What a magnet picks up, why like poles push apart, and how a compass finds north.",
    domain: "physics",
    category: "magnetism",
    grade: { min: 6, max: 6 },
    difficulty: "introductory",
    estimatedMinutes: 15,
    objective:
      "Sort materials into magnetic and non-magnetic, find that like poles repel and unlike poles attract, see the pull weaken with distance, and use a compass to trace a magnet's field.",
    tags: ["magnets", "poles", "compass", "magnetic materials", "class 6"],
  },

  connections: [
    {
      id: "magnetic-effects",
      title: "Magnetic effects of current (class 10)",
      domain: "physics",
      relation: "leads-to",
      note: "A current makes a magnetic field too — the idea behind electromagnets and motors.",
      available: false,
    },
  ],

  variables: [
    {
      id: "gap",
      symbol: "gap",
      name: "Gap",
      meaning: "How far apart the magnet and the other thing are.",
      binding: { kind: "state", key: "gap" },
      control: { type: "range", unit: "cm", min: 1, max: 20, step: 0.5 },
      group: "primary",
      color: "secant",
    },
    {
      id: "around",
      symbol: "compass",
      name: "Where the compass is",
      meaning: "How far round the magnet the compass sits, starting from its north end.",
      binding: { kind: "state", key: "around" },
      control: { type: "range", unit: "deg", min: 0, max: 355, step: 5 },
      group: "primary",
      color: "angle",
    },
    {
      id: "facing",
      symbol: "facing",
      name: "Which poles face each other",
      meaning: "Turn the second magnet round to change which pole faces the first.",
      binding: { kind: "param", key: "facing" },
      control: {
        type: "choice",
        options: [
          { value: "N-S", label: "N faces S" },
          { value: "N-N", label: "N faces N" },
          { value: "S-S", label: "S faces S" },
        ],
      },
      group: "primary",
      color: "cosine",
    },
    {
      id: "partner",
      symbol: "across the gap",
      name: "Across the gap",
      meaning: "A second magnet, or an object to test.",
      binding: { kind: "param", key: "partner" },
      control: {
        type: "choice",
        options: [
          { value: "magnet", label: "Another magnet" },
          { value: "object", label: "An object" },
        ],
      },
      group: "primary",
      color: "neutral",
    },
    {
      id: "material",
      symbol: "made of",
      name: "The object is made of",
      meaning: "Some materials are drawn to a magnet; most are not.",
      binding: { kind: "param", key: "material" },
      control: {
        type: "choice",
        options: [
          { value: "iron", label: "Iron" },
          { value: "steel", label: "Steel" },
          { value: "nickel", label: "Nickel" },
          { value: "cobalt", label: "Cobalt" },
          { value: "copper", label: "Copper" },
          { value: "aluminium", label: "Aluminium" },
          { value: "wood", label: "Wood" },
          { value: "plastic", label: "Plastic" },
          { value: "glass", label: "Glass" },
          { value: "rubber", label: "Rubber" },
        ],
      },
      group: "primary",
      color: "vector",
    },
  ],

  quantities: [
    {
      id: "attracts",
      symbol: "pull?",
      name: "Pulling together",
      meaning: "Whether the two magnets pull towards each other.",
      result: "attracts",
      format: { kind: "label", labels: { "0": "no — pushing apart", "1": "yes" } },
      color: "tangent",
      highlight: "partner",
      headline: true,
    },
    {
      id: "strength",
      symbol: "strength",
      name: "Strength of the pull or push",
      meaning: "How hard the magnets pull or push, in newtons.",
      result: "strength",
      format: { kind: "number", digits: 3 },
      unit: "N",
      color: "secant",
      highlight: "partner",
      headline: true,
    },
    {
      id: "magnetic",
      symbol: "magnetic?",
      name: "Magnetic material",
      meaning: "Whether the object is drawn to a magnet at all.",
      result: "magnetic",
      format: { kind: "label", labels: { "0": "no", "1": "yes" } },
      color: "vector",
      highlight: "partner",
      headline: true,
    },
    {
      id: "pulled",
      symbol: "jumps?",
      name: "Jumps to the magnet",
      meaning: "Whether the object is close enough to be pulled across.",
      result: "pulled",
      format: { kind: "label", labels: { "0": "no", "1": "yes" } },
      color: "tangent",
    },
    {
      id: "needle",
      symbol: "needle",
      name: "Needle direction",
      meaning: "Which way the red end of the compass needle points, along the magnet from S to N being 0°.",
      result: "needle",
      format: { kind: "number", digits: 0 },
      unit: "deg",
      color: "cosine",
      highlight: "compass",
    },
  ],

  equations: [
    {
      id: "poles-rule",
      topic: "magnet-poles",
      title: "Poles",
      words: "like poles push apart; unlike poles pull together",
      tokens: [
        { kind: "text", value: "N and S" },
        { kind: "op", value: "=" },
        { kind: "text", value: "pull together" },
      ],
      reading: "A north pole and a south pole pull towards each other; two norths, or two souths, push apart.",
      assumptions: ["Bar magnets"],
      discoverable: true,
    },
    {
      id: "magnetic-rule",
      topic: "magnetic-materials-school",
      title: "What a magnet picks up",
      words: "iron, steel, nickel and cobalt are magnetic; most other things are not",
      tokens: [
        { kind: "text", value: "iron, steel, nickel, cobalt" },
        { kind: "op", value: "=" },
        { kind: "text", value: "magnetic" },
      ],
      reading: "A magnet pulls on only a few metals. Copper, aluminium, wood, plastic and glass are not magnetic.",
      assumptions: ["Everyday materials"],
      discoverable: true,
    },
  ],

  simulation: {
    model: "magnets",
    params: { facing: "N-S", partner: "magnet", material: "iron" },
    playLabel: "Walk the compass round",
  },

  visualization: {
    renderer: "magnets",
    hint: "Change the gap, turn the second magnet round, or test an object.",
    layers: [
      { id: "magnet", label: "Magnet" },
      { id: "partner", label: "Across the gap" },
      { id: "field", label: "Field lines", optional: true },
      { id: "compass", label: "Compass", optional: true },
      { id: "labels", label: "Words", optional: true },
    ],
  },

  modes: [
    {
      id: "pair",
      label: "Magnet and partner",
      description: "Pull, push and what sticks",
      layers: ["magnet", "partner", "labels"],
      graphs: [],
      equations: ["poles-rule", "magnetic-rule"],
    },
    {
      id: "compass",
      label: "Compass",
      description: "The field round a bar magnet",
      layers: ["magnet", "field", "compass", "labels"],
      graphs: [],
      equations: ["poles-rule"],
    },
  ],
  defaultMode: "pair",
  graphs: [],

  activities: {
    observe: [
      {
        id: "repel",
        prompt: "Make the two magnets push apart.",
        condition: { type: "compare", quantity: "repels", op: "eq", value: 1 },
      },
      {
        id: "jump",
        prompt: "Test an iron object and make it jump to the magnet.",
        condition: { type: "compare", quantity: "pulled", op: "eq", value: 1 },
      },
    ],

    predict: [
      {
        id: "further",
        question: "The two magnets move from 3 cm apart to 10 cm apart. What happens to the pull?",
        variable: "gap",
        from: 3,
        to: 10,
        quantity: "strength",
        options: ["increase", "decrease", "same"],
        given: { partner: "magnet", facing: "N-S" },
        explanation: "It gets much weaker. A magnet's pull fades quickly with distance.",
      },
    ],

    experiment: {
      title: "Pull and distance",
      instructions: "Record the strength of the pull at 2, 4, 8 and 16 cm.",
      columns: ["strength", "attracts"],
      minRows: 3,
      discovery: {
        question: "Which poles pull together?",
        choices: [
          { id: "unlike", label: "Unlike poles: a north and a south", correct: true },
          { id: "like", label: "Like poles: two norths or two souths", correct: false },
          { id: "any", label: "Any two poles", correct: false },
          { id: "none", label: "Poles never pull", correct: false },
        ],
        reveals: "poles-rule",
        insight: "Unlike poles attract and like poles repel. That is also why a compass needle's north end turns towards the Earth's magnetic south pole, up in the Arctic.",
      },
    },

    explain: [
      {
        id: "poles",
        title: "Two poles",
        body: "Every magnet has a north pole and a south pole. Unlike poles pull together; like poles push apart.",
      },
      {
        id: "materials",
        title: "Magnetic materials",
        body: "Iron, steel, nickel and cobalt are attracted to magnets. Copper, aluminium, wood, plastic, glass and rubber are not.",
      },
      {
        id: "compass",
        title: "The compass",
        body: "A compass needle is a tiny magnet. It lines up with the field around a magnet — and, far from any magnet, with the Earth's field, pointing north.",
      },
    ],

    challenges: [
      {
        id: "strong-push",
        title: "A strong push",
        prompt: "Make two magnets push apart with a strength of at least 1 N.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "repels", op: "eq", value: 1 },
            { type: "compare", quantity: "strength", op: "gte", value: 1 },
          ],
        },
        hint: "Like poles, and close together.",
        success: "Like poles close up push hard — that is how some trains float above their tracks.",
      },
    ],
  },

  realWorld: [
    { title: "Fridge magnets", description: "They stick to the steel door, not to the plastic handle." },
    { title: "Recycling", description: "Big magnets pull steel cans out of rubbish, leaving aluminium ones behind." },
    { title: "The compass", description: "Sailors have found north with a magnetised needle for a thousand years." },
  ],
});
