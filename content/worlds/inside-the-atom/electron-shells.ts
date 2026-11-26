import { defineLevel } from "@ise/game-engine";

const el = (Z: number, name: string) => ({ id: name.toLowerCase(), label: name, given: { Z } });
const card = (id: string, label: string) => ({ id, label });

/** Inside the Atom, level 1: electron shells, outer electrons and valency. */
export const electronShells = defineLevel({
  schemaVersion: 1,
  id: "electron-shells",
  concept: "structure-of-the-atom",
  title: "Electron shells",
  summary: "Electrons fill shells 2, 8, 8 — and the outer shell decides how an atom reacts.",
  xp: 30,
  steps: [
    {
      id: "fill-up",
      kind: "explore",
      prompt: "Press play to walk from hydrogen up, and watch the electrons fill the shells.",
      mode: "atom",
      given: { Z: 1 },
      playback: true,
      canvas: false,
      goal: { type: "compare", quantity: "Z", op: "gte", value: 11 },
      success: "The first shell holds 2, the second 8; sodium's eleventh electron has to start a third shell.",
      hints: ["Press play."],
    },
    {
      id: "outer-sort",
      kind: "sort",
      prompt: "**Sort** these atoms by their **outer shell**.",
      mode: "atom",
      canvas: false,
      bins: [
        { id: "one", label: "1 outer electron", when: { type: "compare", quantity: "valenceElectrons", op: "eq", value: 1 } },
        { id: "seven", label: "7 outer electrons", when: { type: "compare", quantity: "valenceElectrons", op: "eq", value: 7 } },
        { id: "full", label: "Full outer shell", when: { type: "compare", quantity: "nobleGas", op: "eq", value: 1 } },
      ],
      cards: [el(3, "Lithium"), el(11, "Sodium"), el(19, "Potassium"), el(9, "Fluorine"), el(17, "Chlorine"), el(10, "Neon"), el(18, "Argon")],
      explanation: "Lithium, sodium and potassium have one outer electron; fluorine and chlorine have seven; neon and argon have full shells.",
      hints: ["Count what is left after 2, then 8, then 8."],
    },
    {
      id: "configurations",
      kind: "match",
      prompt: "**Match** each element to how its electrons are arranged.",
      canvas: false,
      pairs: [
        { left: card("carbon", "Carbon (6)"), right: card("c", "2, 4") },
        { left: card("oxygen", "Oxygen (8)"), right: card("o", "2, 6") },
        { left: card("sodium", "Sodium (11)"), right: card("na", "2, 8, 1") },
        { left: card("calcium", "Calcium (20)"), right: card("ca", "2, 8, 8, 2") },
      ],
      explanation: "Fill 2, then 8, then 8, then the rest: 6 is 2 + 4, 8 is 2 + 6, 11 is 2 + 8 + 1, 20 is 2 + 8 + 8 + 2.",
      hints: ["The first shell holds 2, the next 8."],
    },
    {
      id: "across",
      kind: "predict",
      prompt: "From **sodium** (Z = 11) to **chlorine** (Z = 17), what happens to the number of **outer electrons**?",
      variable: "Z",
      from: 11,
      to: 17,
      quantity: "valenceElectrons",
      options: ["increase", "decrease", "same"],
      given: {},
      explanation: "It rises from 1 to 7. Across a row, each element adds one more electron to the same outer shell.",
    },
    {
      id: "law",
      kind: "discover",
      prompt: "What the outer shell decides.",
      mode: "atom",
      equation: "outer-shell",
      law: "Atoms react to fill their outer shell. The electrons they give, take or share to do it are their valency — 1 for sodium and chlorine, 4 for carbon, 0 for neon.",
    },
  ],
});
