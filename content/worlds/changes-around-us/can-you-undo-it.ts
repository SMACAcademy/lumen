import { defineLevel } from "@ise/game-engine";

const change = (id: string, label: string, bin: "physical" | "chemical", icon?: "ice" | "steam" | "flame" | "nail") => ({
  id,
  label,
  bin,
  ...(icon ? { icon } : {}),
});
const card = (id: string, label: string) => ({ id, label });

/** Changes Around Us, level 2: physical changes can be undone; chemical changes make something new. */
export const canYouUndoIt = defineLevel({
  schemaVersion: 1,
  id: "can-you-undo-it",
  concept: "thermal-properties",
  title: "Can you undo it?",
  summary: "Melted ice freezes again, but burnt paper never comes back. Two kinds of change, and how to tell them apart.",
  xp: 25,
  steps: [
    {
      id: "freeze-it-back",
      kind: "explore",
      prompt: "This cup holds **water** that was once ice. Take the heat away — slide it back — until it **freezes** again.",
      mode: "heating",
      given: { substance: "water", mass: 0.1, heat: 58500 },
      controls: ["heat"],
      goal: { type: "compare", quantity: "phase", op: "eq", value: 0 },
      success: "Ice again. Melting and freezing undo each other: no new substance was made, only the state changed. That is a physical change.",
      hints: ["Slide the heat all the way back down."],
    },
    {
      id: "two-kinds",
      kind: "sort",
      prompt: "A **physical** change can be undone and makes nothing new. A **chemical** change makes a new substance. **Sort** these.",
      canvas: false,
      bins: [
        { id: "physical", label: "Physical" },
        { id: "chemical", label: "Chemical" },
      ],
      cards: [
        change("melting", "Ice melting", "physical", "ice"),
        change("boiling", "Water boiling", "physical", "steam"),
        change("dissolving", "Sugar dissolving", "physical"),
        change("folding", "Folding paper", "physical"),
        change("burning", "Paper burning", "chemical", "flame"),
        change("rusting", "A nail rusting", "chemical", "nail"),
        change("cooking", "An egg cooking", "chemical"),
        change("curd", "Milk turning to curd", "chemical"),
      ],
      explanation: "You can refreeze water, condense steam, dry sugar out and unfold paper. You can never unburn paper, unrust a nail, uncook an egg or turn curd back into milk.",
      hints: ["Could you get back exactly what you started with?"],
    },
    {
      id: "signs",
      kind: "match",
      prompt: "Chemical changes leave clues. **Match** each change to the sign that gives it away.",
      canvas: false,
      pairs: [
        { left: card("wood", "Wood burning"), right: card("heat-light", "Heat and light given out") },
        { left: card("rust", "Iron rusting"), right: card("colour", "A new colour: reddish-brown") },
        { left: card("fizz", "Vinegar on baking soda"), right: card("gas", "Bubbles of a gas") },
        { left: card("curd", "Milk turning to curd"), right: card("taste", "A new smell and taste") },
      ],
      explanation: "Heat or light, a new colour, a gas, or a new smell or taste: each is a clue that a new substance has been made.",
      hints: ["What would you see, hear or smell?"],
    },
  ],
});
