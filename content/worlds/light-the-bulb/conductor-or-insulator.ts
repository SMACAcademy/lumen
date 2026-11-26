import { defineLevel } from "@ise/game-engine";

const conducts = { type: "compare", quantity: "conducts", op: "eq", value: 1 } as const;
const insulates = { type: "compare", quantity: "conducts", op: "eq", value: 0 } as const;

/** Light the Bulb, level 2: testing things in the gap — conductors and insulators. */
export const conductorOrInsulator = defineLevel({
  schemaVersion: 1,
  id: "conductor-or-insulator",
  concept: "simple-circuits",
  title: "Conductor or insulator?",
  summary: "Put things in the gap and see which ones let electricity through.",
  xp: 25,
  steps: [
    {
      id: "test-the-key",
      kind: "explore",
      prompt: "The gap is empty, so the loop is broken. Put the **iron key** in the gap.",
      mode: "tester",
      given: { cells: 1, bulbs: 1, switchClosed: "closed", gap: "air" },
      controls: ["gap"],
      canvas: false,
      goal: { type: "compare", quantity: "gap", op: "eq", value: 2 },
      success: "The bulb lights: iron lets electricity through. Things that do are called conductors.",
      hints: ["Choose Iron key for the gap."],
    },
    {
      id: "sort-them",
      kind: "sort",
      prompt: "**Sort** these into things that let electricity through, and things that do not.",
      mode: "tester",
      given: { cells: 1, bulbs: 1, switchClosed: "closed" },
      canvas: false,
      bins: [
        { id: "conductor", label: "Conductor", when: conducts },
        { id: "insulator", label: "Insulator", when: insulates },
      ],
      cards: [
        { id: "key", label: "Iron key", icon: "key", given: { gap: "iron" } },
        { id: "coin", label: "Copper coin", icon: "coin", given: { gap: "copper" } },
        { id: "eraser", label: "Eraser", icon: "eraser", given: { gap: "rubber" } },
        { id: "foil", label: "Foil", icon: "spoon", given: { gap: "aluminium" } },
        { id: "stick", label: "Wooden stick", icon: "wood", given: { gap: "wood" } },
        { id: "glass", label: "Glass rod", icon: "glass", given: { gap: "glass" } },
        { id: "ruler", label: "Plastic ruler", given: { gap: "plastic" } },
      ],
      explanation: "Metals — iron, copper, aluminium — are conductors. Rubber, wood, glass and plastic are insulators.",
      hints: ["Is it a metal?"],
    },
    {
      id: "pencil-lead",
      kind: "target",
      prompt: "Pencil lead is a surprise: it conducts, but the bulb is dim. Make the bulb **as bright as one bulb on one cell** again.",
      mode: "tester",
      given: { cells: 1, bulbs: 1, switchClosed: "closed", gap: "graphite" },
      controls: ["cells"],
      canvas: false,
      goal: { type: "compare", quantity: "brightness", op: "gte", value: 0.99 },
      success: "Two cells. Pencil lead conducts, but it holds the current back as much as a whole extra bulb.",
      retry: "Still dim. Give it a bigger push.",
      hints: ["Pencil lead holds the current back. Add a cell."],
    },
    {
      id: "catch-conductors",
      kind: "tap",
      prompt: "**Catch** everything that would make the bulb light if it sat in the gap.",
      given: { cells: 1, bulbs: 1, switchClosed: "closed" },
      canvas: false,
      rule: "lights the bulb",
      when: { type: "compare", quantity: "lit", op: "eq", value: 1 },
      cards: [
        { id: "nail", label: "Iron nail", icon: "nail", given: { gap: "iron" } },
        { id: "eraser", label: "Eraser", icon: "eraser", given: { gap: "rubber" } },
        { id: "coin", label: "Coin", icon: "coin", given: { gap: "copper" } },
        { id: "lead", label: "Pencil lead", given: { gap: "graphite" } },
        { id: "wood", label: "Wood", icon: "wood", given: { gap: "wood" } },
        { id: "nothing", label: "Nothing at all", given: { gap: "air" } },
        { id: "foil", label: "Foil", given: { gap: "aluminium" } },
        { id: "glass", label: "Glass", icon: "glass", given: { gap: "glass" } },
      ],
      explanation:
        "Nail, coin, pencil lead and foil are conductors. Eraser, wood and glass are insulators — and an empty gap is air, which does not conduct either.",
      hints: ["Metals, and one thing you write with."],
    },
    {
      id: "law",
      kind: "discover",
      prompt: "Why wires are made the way they are.",
      mode: "tester",
      equation: "circuit-rule",
      law: "Conductors, like metals and pencil lead, close the loop; insulators, like rubber, plastic, wood and glass, break it. Wires are metal inside and plastic outside.",
    },
  ],
});
