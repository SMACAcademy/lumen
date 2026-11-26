import { defineLevel } from "@ise/game-engine";

const el = (Z: number, name: string) => ({ id: name.toLowerCase(), label: name, given: { Z } });

/** Inside the Atom, level 2: the modern periodic table, read from the electrons. */
export const theModernTable = defineLevel({
  schemaVersion: 1,
  id: "the-modern-table",
  concept: "structure-of-the-atom",
  title: "The modern table",
  summary: "Rows are shells, columns are outer electrons. Read the periodic table straight from the atom.",
  xp: 30,
  steps: [
    {
      id: "two-and-seven",
      kind: "target",
      prompt: "Find the element with **two shells** and **seven outer electrons**. Click it in the table.",
      mode: "atom",
      given: { Z: 1 },
      goal: {
        type: "all",
        conditions: [
          { type: "compare", quantity: "shells", op: "eq", value: 2 },
          { type: "compare", quantity: "valenceElectrons", op: "eq", value: 7 },
        ],
      },
      success: "Fluorine, 2, 7: period 2 (two shells), group 17 (seven outer electrons).",
      retry: "Not that one. Two shells means row 2.",
      hints: ["Row 2 of the table.", "One short of a full shell."],
    },
    {
      id: "shells-order",
      kind: "order",
      prompt: "Put these in order of **how many shells** they use, fewest first.",
      mode: "atom",
      canvas: false,
      ends: ["fewest shells", "most shells"],
      by: "shells",
      cards: [el(1, "Hydrogen"), el(3, "Lithium"), el(11, "Sodium"), el(19, "Potassium")],
      explanation: "1, 2, 3 and 4 shells: going down a group adds a shell each row.",
      hints: ["Which row is each in?"],
    },
    {
      id: "noble-gases",
      kind: "tap",
      prompt: "**Catch** every noble gas — the ones with a full outer shell.",
      canvas: false,
      rule: "full outer shell",
      when: { type: "compare", quantity: "nobleGas", op: "eq", value: 1 },
      cards: [el(2, "Helium"), el(11, "Sodium"), el(10, "Neon"), el(17, "Chlorine"), el(8, "Oxygen"), el(18, "Argon"), el(12, "Magnesium"), el(7, "Nitrogen")],
      explanation: "Helium, neon and argon have full outer shells, so they hardly react: the noble gases, group 18.",
      hints: ["The last column of the table."],
    },
    {
      id: "down-a-group",
      kind: "predict",
      prompt: "Down group 1, from **lithium** (Z = 3) to **sodium** (Z = 11). What happens to the number of **shells**?",
      variable: "Z",
      from: 3,
      to: 11,
      quantity: "shells",
      options: ["increase", "decrease", "same"],
      given: {},
      explanation: "It goes from 2 to 3. Each row down starts a new shell — while the outer electrons stay the same, which is why a group reacts alike.",
    },
    {
      id: "law",
      kind: "discover",
      prompt: "How to read the table.",
      mode: "table-only",
      equation: "period-is-shells",
      law: "The period is the number of shells; the group comes from the outer electrons. Elements in one group have the same outer shell, so they react in the same way.",
    },
  ],
});
