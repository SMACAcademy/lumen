import { defineLevel } from "@ise/game-engine";

const nail = (id: string, label: string, coilTurns: number, magnetCurrent: number, switchOn = "on", core = "iron") => ({
  id,
  label,
  given: { coilTurns, magnetCurrent, switchOn, core },
});
const coil = (id: string, label: string, fieldSource: string, currentDirection: string) => ({
  id,
  label,
  given: { fieldSource, currentDirection, wireCurrent: 5 },
});

/** Currents at Work, level 2: the electromagnet, and field lines round magnets and currents. */
export const magnetsFromCurrent = defineLevel({
  schemaVersion: 1,
  id: "magnets-from-current",
  concept: "currents-at-work",
  title: "Magnets from a current",
  summary: "A coil round a nail becomes a magnet. Field lines circle a wire and run through a solenoid like a bar magnet.",
  xp: 30,
  steps: [
    {
      id: "lift-pins",
      kind: "explore",
      prompt: "Wind wire round an iron nail and switch on. Change the **turns** and the **current** until it holds **10 pins**.",
      mode: "nail",
      given: { coilTurns: 20, magnetCurrent: 1, core: "iron", switchOn: "on", currentDirection: "forward" },
      controls: ["coilTurns", "magnetCurrent"],
      canvas: false,
      goal: { type: "compare", quantity: "pinsHeld", op: "gte", value: 10 },
      success: "Turns × current of 200 or more, like 100 turns × 2 A, holds 10 pins. More turns or more current make a stronger magnet.",
      hints: ["Add turns and current together.", "Try 100 turns and 2 A."],
    },
    {
      id: "more-turns",
      kind: "predict",
      prompt: "**2 A** flows. The turns go from **20 to 60**. What happens to the **pins** the nail holds?",
      mode: "nail",
      variable: "coilTurns",
      from: 20,
      to: 60,
      quantity: "pinsHeld",
      options: ["increase", "decrease", "same"],
      given: { magnetCurrent: 2, core: "iron", switchOn: "on" },
      explanation: "From 2 pins to 6: three times the turns make a magnet three times as strong.",
    },
    {
      id: "magnet-or-not",
      kind: "sort",
      prompt: "**Sort** these: does the nail pick up any pins?",
      mode: "nail",
      canvas: false,
      bins: [
        { id: "picks-up", label: "Picks up pins", when: { type: "compare", quantity: "pinsHeld", op: "gte", value: 1 } },
        { id: "none", label: "Picks up none", when: { type: "compare", quantity: "pinsHeld", op: "eq", value: 0 } },
      ],
      cards: [
        nail("fifty-two", "50 turns, 2 A", 50, 2),
        nail("switched-off", "100 turns, 3 A, switch off", 100, 3, "off"),
        nail("no-nail", "100 turns, 3 A, no nail inside", 100, 3, "on", "none"),
        nail("hundred-one", "100 turns, 1 A", 100, 1),
        nail("ten-one", "10 turns, 1 A", 10, 1),
        nail("twenty-three", "20 turns, 3 A", 20, 3),
      ],
      explanation:
        "Switched off, it is no magnet at all and drops the pins. Without the iron nail the coil is far weaker. 10 turns × 1 A is too weak to lift even one pin.",
      hints: ["Is the current on? Is the iron nail in? Is turns × current big enough?"],
    },
    {
      id: "patterns",
      kind: "match",
      prompt: "**Match** each thing to the pattern of its field lines.",
      mode: "field",
      canvas: false,
      pairs: [
        { left: { id: "bar-magnet", label: "A bar magnet", icon: "magnet" }, right: { id: "n-to-s", label: "Out of N, round to S, never crossing" } },
        { left: { id: "straight-wire", label: "A straight wire" }, right: { id: "circles", label: "Circles round the wire" } },
        { left: { id: "loop", label: "A loop of wire" }, right: { id: "through-middle", label: "Circles near each side, straight through the middle" } },
        { left: { id: "solenoid", label: "A solenoid" }, right: { id: "like-a-magnet", label: "Straight inside, like a bar magnet outside" } },
      ],
      explanation: "Field lines never cross: if they did, a compass there would point two ways at once. Where they crowd together the field is strongest.",
    },
    {
      id: "which-end",
      kind: "sort",
      prompt: "Look at the **right-hand end** of each coil. **Sort** them: is that end a **north** or a **south** pole?",
      mode: "field",
      canvas: false,
      bins: [
        { id: "north", label: "Right end is N", when: { type: "compare", quantity: "rightPole", op: "eq", value: 1 } },
        { id: "south", label: "Right end is S", when: { type: "compare", quantity: "rightPole", op: "eq", value: -1 } },
      ],
      cards: [
        coil("sol-anti", "Solenoid: anticlockwise seen from the right end", "solenoid", "forward"),
        coil("sol-clock", "Solenoid: clockwise seen from the right end", "solenoid", "reverse"),
        coil("loop-anti", "Loop: anticlockwise seen from the right", "loop", "forward"),
        coil("loop-clock", "Loop: clockwise seen from the right", "loop", "reverse"),
        { id: "bar", label: "A bar magnet with its N end on the right", given: { fieldSource: "magnet" } },
      ],
      explanation: "Look at a face of the coil: where the current goes anticlockwise it is a north pole, clockwise a south pole. A solenoid is a bar magnet you can switch off.",
      hints: ["Anticlockwise: N. Clockwise: S."],
    },
    {
      id: "more-current",
      kind: "predict",
      prompt: "A compass is **2 cm** from a straight wire. The current goes from **2 A to 4 A**. What happens to the **field** at the compass?",
      mode: "field",
      variable: "wireCurrent",
      from: 2,
      to: 4,
      quantity: "wireField",
      options: ["increase", "decrease", "same"],
      given: { fieldSource: "wire", distance: 2, currentDirection: "forward" },
      explanation:
        "It doubles, from 20 μT to 40 μT. Its direction comes from the right-hand thumb rule: grip the wire with your thumb along the current, and your fingers curl the way the field goes.",
    },
    {
      id: "law",
      kind: "discover",
      prompt: "What makes an electromagnet strong.",
      mode: "nail",
      equation: "magnet-strength",
      law: "An electromagnet is stronger with more turns and more current, and much stronger with an iron core. Switch off and it lets go.",
    },
  ],
});
