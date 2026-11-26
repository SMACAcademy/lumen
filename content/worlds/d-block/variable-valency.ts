import { defineLevel } from "@ise/game-engine";

const element = (id: string, label: string, Z: number) => ({ id, label, given: { Z, ox: 2 } });
const card = (id: string, label: string) => ({ id, label });

/** The d-block, level 2: oxidation states, the oxo-anions, and reactivity. */
export const variableValency = defineLevel({
  schemaVersion: 1,
  id: "variable-valency",
  concept: "transition-metals",
  title: "Variable valency",
  summary: "From scandium's single +3 to manganese's +7: why the middle of the row has the most oxidation states.",
  xp: 35,
  steps: [
    {
      id: "manganese",
      kind: "explore",
      prompt: "Manganese: press play to step through its **oxidation states**.",
      mode: "states",
      given: { Z: 25, ox: 0, walk: "states" },
      playback: true,
      canvas: false,
      goal: { type: "compare", quantity: "ox", op: "eq", value: 7 },
      success: "+2, +3, +4, +6 and +7: in MnO₄⁻ manganese has given up all five 3d and both 4s electrons.",
      hints: ["Press play."],
    },
    {
      id: "highest",
      kind: "target",
      prompt: "Find the **highest oxidation state** anywhere in the row.",
      mode: "states",
      given: { Z: 22, ox: 3 },
      controls: ["Z", "ox"],
      canvas: false,
      goal: { type: "compare", quantity: "ox", op: "eq", value: 7 },
      success: "Manganese, +7. Beyond it the d electrons pair up and hold on: iron manages +3, zinc only +2.",
      retry: "Not the highest yet.",
      hints: ["Look at the peak of the line.", "Mn: Z = 25."],
    },
    {
      id: "climb",
      kind: "order",
      prompt: "Put these in order of their **highest** oxidation state.",
      mode: "states",
      canvas: false,
      ends: ["lowest", "highest"],
      by: "maxOx",
      cards: [element("sc", "Scandium", 21), element("ti", "Titanium", 22), element("v", "Vanadium", 23), element("cr", "Chromium", 24), element("mn", "Manganese", 25)],
      explanation: "+3, +4, +5, +6, +7: up to manganese, the highest state is the number of 3d and 4s electrons together.",
      hints: ["Count the 3d and 4s electrons."],
    },
    {
      id: "compounds",
      kind: "match",
      prompt: "**Match** each compound to its metal's state and colour.",
      canvas: false,
      pairs: [
        { left: card("kmno4", "KMnO₄"), right: card("mn7", "Mn +7, purple") },
        { left: card("k2cr2o7", "K₂Cr₂O₇"), right: card("cr6", "Cr +6, orange") },
        { left: card("k2mno4", "K₂MnO₄"), right: card("mn6", "Mn +6, green") },
        { left: card("cu2o", "Cu₂O"), right: card("cu1", "Cu +1, d¹⁰") },
      ],
      explanation: "Permanganate and dichromate owe their colour to charge transfer, not d–d jumps: Mn(+7) and Cr(+6) have no d electrons left.",
      hints: ["O counts −2, K +1."],
    },
    {
      id: "acid",
      kind: "sort",
      prompt: "Which metals give **hydrogen** with dilute acid? (A negative E°(M²⁺/M) means yes.)",
      mode: "states",
      canvas: false,
      bins: [
        { id: "yes", label: "Gives H₂", when: { type: "compare", quantity: "e2", op: "lt", value: 0 } },
        { id: "no", label: "Does not", when: { type: "compare", quantity: "e2", op: "gte", value: 0 } },
      ],
      cards: [element("zn", "Zinc", 30), element("fe", "Iron", 26), element("ni", "Nickel", 28), element("cu", "Copper", 29), element("mn", "Manganese", 25), element("co", "Cobalt", 27)],
      explanation: "Every 3d metal but copper has a negative E°(M²⁺/M) and gives hydrogen with acid. Copper (+0.34 V) needs an oxidising acid like nitric acid.",
      hints: ["Only one of the row has a positive E°."],
    },
    {
      id: "law",
      kind: "discover",
      prompt: "Counting d electrons.",
      mode: "states",
      equation: "d-count",
      law: "A 3d ion keeps Z − 18 − n d electrons: 4s goes first. The highest oxidation state climbs with the number of 3d and 4s electrons, to Mn(+7), then falls.",
    },
  ],
});
