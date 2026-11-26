import { defineLevel } from "@ise/game-engine";

const item = (id: string, label: string, bin: string, icon?: "lemon" | "soap" | "water") => ({ id, label, bin, ...(icon ? { icon } : {}) });
const thing = (id: string, label: string, correct: boolean, icon?: "lemon" | "soap" | "water") => ({ id, label, correct, ...(icon ? { icon } : {}) });

/** Sour, Bitter or Neither, level 1: acids, bases and neutral things at home, and the indicators that tell them apart. */
export const sourBitterOrNeither = defineLevel({
  schemaVersion: 1,
  id: "sour-bitter-or-neither",
  concept: "acids-and-bases",
  title: "Sour, bitter or neither",
  summary: "Lemons are sour, soap is bitter, water is neither. Sort the kitchen, and meet the colours that tell you which is which.",
  xp: 25,
  steps: [
    {
      id: "kitchen-sort",
      kind: "sort",
      prompt: "Acids taste **sour**, bases taste **bitter** and feel soapy, and neutral things are neither. **Sort** these. (Never taste anything in a lab!)",
      canvas: false,
      bins: [
        { id: "acid", label: "Acid" },
        { id: "base", label: "Base" },
        { id: "neutral", label: "Neutral" },
      ],
      cards: [
        item("lemon", "Lemon juice", "acid", "lemon"),
        item("vinegar", "Vinegar", "acid"),
        item("tamarind", "Tamarind", "acid"),
        item("soap", "Soap water", "base", "soap"),
        item("baking-soda", "Baking soda", "base"),
        item("magnesia", "Milk of magnesia", "base"),
        item("water", "Tap water", "neutral", "water"),
        item("sugar", "Sugar water", "neutral"),
      ],
      explanation: "Lemon, vinegar and tamarind are acids. Soap, baking soda and milk of magnesia are bases. Pure water and sugar water are neutral.",
      hints: ["Which ones taste sour?"],
    },
    {
      id: "litmus-in-vinegar",
      kind: "explore",
      prompt: "The flask holds **vinegar**, an acid. Choose **litmus** as the indicator and see what colour it turns.",
      mode: "flask",
      given: { acid: "ethanoic", indicator: "phenolphthalein", Vb: 0 },
      controls: ["indicator"],
      canvas: false,
      goal: { type: "compare", quantity: "indicator", op: "eq", value: 3 },
      success: "Red. Litmus turns red in an acid — that is how you can tell an acid without tasting it.",
      hints: ["Pick Litmus from the indicators."],
    },
    {
      id: "indicator-colours",
      kind: "match",
      prompt: "Every indicator has its own colour in an acid. **Match** each one to it.",
      canvas: false,
      pairs: [
        { left: { id: "litmus", label: "Litmus" }, right: { id: "red", label: "Red" } },
        { left: { id: "turmeric", label: "Turmeric" }, right: { id: "yellow", label: "Yellow" } },
        { left: { id: "china-rose", label: "China rose" }, right: { id: "magenta", label: "Dark pink" } },
        { left: { id: "phenolphthalein", label: "Phenolphthalein" }, right: { id: "colourless", label: "No colour" } },
      ],
      explanation: "In a base they change: litmus to blue, turmeric to reddish-brown, china rose to green and phenolphthalein to pink.",
      hints: ["Litmus in acid is the colour of a stop sign."],
    },
    {
      id: "catch-bases",
      kind: "tap",
      prompt: "Red litmus turns **blue** in a base. **Catch** everything that would turn red litmus blue.",
      canvas: false,
      rule: "turns red litmus blue",
      cards: [
        thing("soap", "Soap water", true, "soap"),
        thing("lemon", "Lemon juice", false, "lemon"),
        thing("baking-soda", "Baking soda", true),
        thing("water", "Tap water", false, "water"),
        thing("lime-water", "Lime water", true),
        thing("vinegar", "Vinegar", false),
        thing("magnesia", "Milk of magnesia", true),
        thing("sugar", "Sugar water", false),
      ],
      explanation: "Only bases turn red litmus blue: soap, baking soda, lime water and milk of magnesia.",
      hints: ["Which ones are bases?"],
    },
  ],
});
