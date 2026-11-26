import { defineConcept } from "@ise/concept-schema";

/**
 * Whole numbers, fractions and decimals for classes 6 and 7, as points on a
 * number line.
 *
 * With one piece in a whole the line is the whole numbers: equally spaced
 * points, each one more than the last, so adding is hopping to the right.
 * Cut each whole into equal pieces and count some of them: that is where the
 * fraction lives. A fraction bar sits right above the line, cut into the same
 * pieces, so shading and position are one idea. A second line shows that
 * one point can have many names — 3/4 and 6/8 land in exactly the same place.
 * A decimal ruler below cuts each whole into tenths and each tenth into
 * hundredths, so 0.5 = 5/10 = 1/2 and 0.45 < 0.5 can be seen, not just said.
 */
export const fractionsOnALine = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "fractions-on-a-line",
    title: "Fractions on a Line",
    tagline: "Where whole numbers, fractions and decimals live on the number line, and why ½, 2⁄4 and 0.5 are the same point.",
    domain: "mathematics",
    category: "numbers",
    grade: { min: 6, max: 7 },
    difficulty: "introductory",
    estimatedMinutes: 15,
    objective:
      "Place whole numbers, fractions and decimals on a number line, see that more pieces make each piece smaller, compare and order fractions and decimals, find equivalent fractions that name the same point, and read a decimal's place value.",
    tags: ["whole numbers", "fractions", "decimals", "place value", "number line", "equivalent fractions", "comparing fractions", "class 6", "class 7"],
  },

  connections: [
    {
      id: "decimals",
      title: "Decimals",
      domain: "mathematics",
      relation: "leads-to",
      note: "Every point on the line also has a decimal name: 3/4 is 0.75.",
      available: false,
    },
  ],

  variables: [
    {
      id: "n",
      symbol: "n",
      name: "Pieces counted",
      meaning: "How many pieces of the top line you count from 0. Drag the point, or step it along.",
      binding: { kind: "state", key: "n" },
      control: { type: "range", unit: "1", min: 0, max: 36, step: 1 },
      group: "primary",
      color: "angle",
    },
    {
      id: "d",
      symbol: "d",
      name: "Pieces in a whole",
      meaning: "How many equal pieces each whole is cut into on the top line.",
      binding: { kind: "param", key: "d" },
      control: { type: "range", unit: "1", min: 1, max: 12, step: 1, presets: [2, 4, 8] },
      group: "primary",
      color: "sine",
    },
    {
      id: "n2",
      symbol: "n₂",
      name: "Pieces counted (bottom line)",
      meaning: "How many pieces of the bottom line you count.",
      binding: { kind: "state", key: "n2" },
      control: { type: "range", unit: "1", min: 0, max: 36, step: 1 },
      group: "primary",
      color: "cosine",
    },
    {
      id: "d2",
      symbol: "d₂",
      name: "Pieces in a whole (bottom line)",
      meaning: "How many pieces each whole is cut into on the bottom line.",
      binding: { kind: "param", key: "d2" },
      control: { type: "range", unit: "1", min: 1, max: 12, step: 1, presets: [3, 6, 12] },
      group: "primary",
      color: "cosine",
    },
    {
      id: "max",
      symbol: "wholes",
      name: "Wholes shown",
      meaning: "How far the line goes: to 1, 2, 3 … up to 10.",
      binding: { kind: "param", key: "max" },
      control: { type: "range", unit: "1", min: 1, max: 10, step: 1 },
      group: "motion",
      color: "neutral",
    },
    {
      id: "dec",
      symbol: "hundredths",
      name: "Decimal point (hundredths counted)",
      meaning: "How many hundredths from 0 the decimal ruler's point sits: 45 puts it at 0.45. Drag it along the ruler.",
      binding: { kind: "state", key: "dec" },
      control: { type: "range", unit: "1", min: 0, max: 300, step: 1 },
      group: "primary",
      color: "secant",
    },
  ],

  quantities: [
    {
      id: "value",
      symbol: "n/d",
      name: "Value",
      meaning: "Where the point sits: pieces counted ÷ pieces in a whole.",
      result: "value",
      format: { kind: "number", digits: 3 },
      color: "angle",
      highlight: "line",
      headline: true,
    },
    {
      id: "value2",
      symbol: "n₂/d₂",
      name: "Value (bottom line)",
      meaning: "Where the bottom point sits.",
      result: "value2",
      format: { kind: "number", digits: 3 },
      color: "cosine",
      highlight: "second",
    },
    {
      id: "equal",
      symbol: "same?",
      name: "Same point",
      meaning: "Whether the two fractions are the same number.",
      result: "equal",
      format: { kind: "label", labels: { "0": "no", "1": "yes" } },
      color: "tangent",
      highlight: "second",
      headline: true,
    },
    {
      id: "compare",
      symbol: "compare",
      name: "Top compared with bottom",
      meaning: "Whether the top fraction is smaller than, the same as, or bigger than the bottom one.",
      result: "compare",
      format: { kind: "label", labels: { "-1": "smaller", "0": "the same", "1": "bigger" } },
      color: "tangent",
    },
    {
      id: "simplestN",
      symbol: "simplest n",
      name: "Simplest top number",
      meaning: "The top number of the same fraction in its simplest form.",
      result: "simplestN",
      format: { kind: "number", digits: 0 },
      color: "vector",
    },
    {
      id: "simplestD",
      symbol: "simplest d",
      name: "Simplest bottom number",
      meaning: "The bottom number of the same fraction in its simplest form.",
      result: "simplestD",
      format: { kind: "number", digits: 0 },
      color: "vector",
    },
    {
      id: "percent",
      symbol: "%",
      name: "As a percentage",
      meaning: "The value out of 100.",
      result: "percent",
      format: { kind: "number", digits: 1 },
      color: "secant",
    },
    {
      id: "decimal",
      symbol: "decimal",
      name: "Decimal on the ruler",
      meaning: "Where the ruler's point sits: hundredths counted ÷ 100.",
      result: "decimal",
      format: { kind: "number", digits: 2 },
      color: "secant",
      highlight: "decimal",
      headline: true,
    },
    {
      id: "onesDigit",
      symbol: "ones",
      name: "Ones digit",
      meaning: "The whole number part of the decimal, before the point.",
      result: "onesDigit",
      format: { kind: "integer" },
      color: "secant",
      highlight: "decimal",
    },
    {
      id: "tenthsDigit",
      symbol: "tenths",
      name: "Tenths digit",
      meaning: "The first digit after the point: how many tenths.",
      result: "tenthsDigit",
      format: { kind: "integer" },
      color: "secant",
      highlight: "decimal",
    },
    {
      id: "hundredthsDigit",
      symbol: "hundredths",
      name: "Hundredths digit",
      meaning: "The second digit after the point: how many hundredths.",
      result: "hundredthsDigit",
      format: { kind: "integer" },
      color: "secant",
      highlight: "decimal",
    },
    {
      id: "decCompare",
      symbol: "n/d vs decimal",
      name: "Fraction compared with the decimal",
      meaning: "Whether the top line's fraction is smaller than, the same as, or bigger than the decimal on the ruler.",
      result: "decCompare",
      format: { kind: "label", labels: { "-1": "smaller", "0": "the same", "1": "bigger" } },
      color: "tangent",
      highlight: "decimal",
    },
  ],

  equations: [
    {
      id: "fraction-value",
      topic: "fraction-meaning",
      title: "Where a fraction lives",
      words: "value = pieces counted ÷ pieces in a whole",
      tokens: [
        { kind: "ref", id: "value" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "n" },
        { kind: "op", value: "/" },
        { kind: "ref", id: "d" },
      ],
      reading: "Cut each whole into d equal pieces and count n of them: the point lands at n ÷ d.",
      assumptions: ["The pieces are all equal"],
      discoverable: true,
    },
    {
      id: "equivalent",
      topic: "equivalent-fractions",
      title: "Same point, different names",
      words: "multiply the top and bottom by the same number and the point does not move",
      tokens: [
        { kind: "ref", id: "n" },
        { kind: "op", value: "/" },
        { kind: "ref", id: "d" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "n2" },
        { kind: "op", value: "/" },
        { kind: "ref", id: "d2" },
      ],
      reading: "Cutting every piece in two doubles both numbers — twice as many pieces, each half the size — and lands on the same point.",
      assumptions: ["n/d and n₂/d₂ name the same point"],
      discoverable: true,
    },
    {
      id: "decimal-place-value",
      topic: "decimals",
      title: "Place value after the point",
      words: "decimal = ones digit + tenths digit ÷ 10 + hundredths digit ÷ 100",
      tokens: [
        { kind: "ref", id: "decimal" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "onesDigit" },
        { kind: "op", value: "+" },
        { kind: "ref", id: "tenthsDigit" },
        { kind: "op", value: "/" },
        { kind: "text", value: "10" },
        { kind: "op", value: "+" },
        { kind: "ref", id: "hundredthsDigit" },
        { kind: "op", value: "/" },
        { kind: "text", value: "100" },
      ],
      reading: "Each place is ten times smaller than the one on its left: 0.45 is 4 tenths and 5 hundredths, which is 45/100.",
      assumptions: ["Decimals with up to two places"],
      discoverable: true,
    },
  ],

  simulation: {
    model: "number-line",
    params: { d: 4, d2: 8, max: 1 },
    playLabel: "Walk along",
  },

  visualization: {
    renderer: "number-line",
    hint: "Drag a point along its line: it snaps to the nearest piece.",
    layers: [
      { id: "bars", label: "Fraction bars", optional: true },
      { id: "line", label: "Number line" },
      { id: "second", label: "Second line", optional: true },
      { id: "decimal", label: "Decimal ruler", optional: true },
      { id: "labels", label: "Labels", optional: true },
    ],
  },

  modes: [
    {
      id: "one-line",
      label: "One line",
      description: "A fraction bar and its number line",
      layers: ["bars", "line", "labels"],
      graphs: [],
      equations: ["fraction-value"],
    },
    {
      id: "two-lines",
      label: "Two lines",
      description: "Compare two fractions",
      layers: ["bars", "line", "second", "labels"],
      graphs: [],
      equations: ["equivalent"],
    },
    {
      id: "line-only",
      label: "Just the line",
      description: "The number line without bars",
      layers: ["line", "labels"],
      graphs: [],
      equations: ["fraction-value"],
    },
    {
      id: "decimals",
      label: "Decimals",
      description: "A fraction line above a ruler of tenths and hundredths",
      layers: ["line", "decimal", "labels"],
      graphs: [],
      equations: ["decimal-place-value"],
    },
  ],
  defaultMode: "one-line",
  graphs: [],

  activities: {
    observe: [
      {
        id: "half",
        prompt: "Put the point at one half.",
        condition: { type: "compare", quantity: "value", op: "eq", value: 0.5, tolerance: 0.001 },
      },
      {
        id: "eighths",
        prompt: "Cut each whole into 8 pieces.",
        condition: { type: "compare", quantity: "d", op: "eq", value: 8 },
      },
      {
        id: "past-one",
        prompt: "Show two wholes, and go past 1.",
        condition: { type: "compare", quantity: "value", op: "gt", value: 1 },
      },
    ],

    predict: [
      {
        id: "smaller-pieces",
        question: "You count 1 piece. The whole is cut into 8 pieces instead of 4. What happens to the value?",
        variable: "d",
        from: 4,
        to: 8,
        quantity: "value",
        options: ["increase", "decrease", "same"],
        given: { n: 1 },
        explanation: "It goes down, 1/4 to 1/8. More pieces means each piece is smaller.",
      },
      {
        id: "more-pieces-counted",
        question: "Quarters: you count 3 pieces instead of 1. What happens to the value?",
        variable: "n",
        from: 1,
        to: 3,
        quantity: "value",
        options: ["increase", "decrease", "same"],
        given: { d: 4 },
        explanation: "It goes up, 1/4 to 3/4: counting more pieces moves the point further along.",
      },
    ],

    experiment: {
      title: "Many names for one half",
      instructions: "Put the top point at one half with 2, 4, 6 and 8 pieces in a whole, and record each.",
      columns: ["value", "simplestN", "simplestD", "percent"],
      minRows: 3,
      discovery: {
        question: "What do 1/2, 2/4, 3/6 and 4/8 have in common?",
        choices: [
          { id: "same", label: "They are the same point: the top is half the bottom every time", correct: true },
          { id: "bigger", label: "Each one is bigger than the last", correct: false },
          { id: "smaller", label: "Each one is smaller than the last", correct: false },
          { id: "none", label: "Nothing: they are different numbers", correct: false },
        ],
        reveals: "equivalent",
        insight: "Cutting each piece into more pieces multiplies the top and bottom by the same number — and the point stays put.",
      },
    },

    explain: [
      {
        id: "pieces",
        title: "Pieces of a whole",
        body: "The bottom number says how many equal pieces the whole is cut into; the top number says how many you count. The point is at {{value}}.",
      },
      {
        id: "bigger-bottom",
        title: "A bigger bottom number",
        body: "More pieces means smaller pieces. That is why 1/8 is less than 1/4, even though 8 is bigger than 4.",
      },
      {
        id: "names",
        title: "Many names",
        body: "Every point has many fraction names. Its simplest name uses the smallest numbers: here {{simplestN}}/{{simplestD}}.",
      },
      {
        id: "decimal",
        title: "Reading a decimal",
        body: "The ruler's point is at {{decimal}}: {{onesDigit}} ones, {{tenthsDigit}} tenths and {{hundredthsDigit}} hundredths. Compared with it, the top fraction is {{decCompare}}.",
      },
    ],

    challenges: [
      {
        id: "two-thirds",
        title: "Two thirds",
        prompt: "Put the top point at two thirds.",
        goal: { type: "compare", quantity: "value", op: "eq", value: 0.6667, tolerance: 0.001 },
        hint: "Cut the whole into 3 pieces and count 2.",
        success: "2/3: two of three equal pieces.",
      },
      {
        id: "same-as-three-quarters",
        title: "Another name for 3/4",
        prompt: "Make the bottom point land on 3/4 using twelfths.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "d2", op: "eq", value: 12 },
            { type: "compare", quantity: "value2", op: "eq", value: 0.75, tolerance: 0.001 },
          ],
        },
        hint: "Each quarter is three twelfths.",
        success: "9/12 = 3/4: three times as many pieces, each a third the size.",
      },
    ],
  },

  realWorld: [
    { title: "Sharing a roti", description: "Cut a roti into 4 and eat 3 pieces, or into 8 and eat 6: you have eaten the same amount." },
    { title: "A ruler", description: "The marks between centimetres are tenths: 3.5 cm is 3 and 5 tenths." },
    { title: "Cricket overs", description: "An over is 6 balls, so 3 balls is half an over — 3/6 = 1/2." },
    { title: "Rupees and paise", description: "100 paise make a rupee, so ₹2.45 is 2 rupees and 45 hundredths of a rupee: 45 paise." },
  ],
});
