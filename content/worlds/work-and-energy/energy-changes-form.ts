import { defineLevel } from "@ise/game-engine";

const card = (id: string, label: string) => ({ id, label });

/** Work and Energy, level 2: energy changes form, but the total is never lost. */
export const energyChangesForm = defineLevel({
  schemaVersion: 1,
  id: "energy-changes-form",
  concept: "work-energy",
  title: "Energy changes form",
  summary: "Energy moves from kinetic to potential to heat — and not a joule of it disappears.",
  xp: 30,
  steps: [
    {
      id: "total-stays",
      kind: "explore",
      prompt: "No friction this time. Press play and watch the **total** energy while the block slides up and stops.",
      mode: "energy",
      given: { mass: 2, v0: 6, incline: 0.349, muKinetic: 0, applied: 0 },
      playback: true,
      canvas: false,
      goal: { type: "compare", quantity: "kinetic", op: "lte", value: 1 },
      success: "The total stayed 36 J the whole way: all the kinetic energy became potential energy. Energy changes form, but is never lost.",
      hints: ["Press play."],
    },
    {
      id: "thirty-six-joules",
      kind: "target",
      prompt: "Launch the 2 kg block with exactly **36 J** of kinetic energy.",
      mode: "energy",
      given: { mass: 2, incline: 0.349, muKinetic: 0, applied: 0, v0: 2 },
      controls: ["v0"],
      canvas: false,
      goal: { type: "compare", quantity: "kineticStart", op: "eq", value: 36, tolerance: 0.5 },
      success: "6 m/s: ½ × 2 × 6² = 36 J.",
      retry: "Not 36 J yet. KE = ½mv².",
      hints: ["½ × 2 × v² = 36, so v² = 36."],
    },
    {
      id: "kept-or-lost",
      kind: "sort",
      prompt: "Each block has slid 2 m up its slope. **Sort** them: was all the energy kept, or did some become heat?",
      canvas: false,
      bins: [
        { id: "kept", label: "All kept" },
        { id: "heat", label: "Some became heat" },
      ],
      cards: [
        { id: "ice", label: "An ice slope", bin: "kept" },
        { id: "rough", label: "A rough wooden slope", bin: "heat" },
        { id: "sandpaper", label: "A sandpaper slope", bin: "heat" },
        { id: "polished", label: "A polished, frictionless ramp", bin: "kept" },
        { id: "carpet", label: "A carpet ramp", bin: "heat" },
      ],
      explanation: "Friction turns some kinetic energy into heat. It is not lost — it just warms the slope and the block.",
      hints: ["Where is there friction?"],
    },
    {
      id: "energy-changes",
      kind: "match",
      prompt: "**Match** each event to the energy change in it.",
      canvas: false,
      pairs: [
        { left: card("apple", "An apple falling"), right: card("pe-ke", "Potential → kinetic") },
        { left: card("brakes", "A bicycle braking"), right: card("ke-heat", "Kinetic → heat") },
        { left: card("throw", "A ball thrown straight up"), right: card("ke-pe", "Kinetic → potential") },
        { left: card("torch", "A torch switched on"), right: card("chem-light", "Chemical → light") },
      ],
      explanation: "Energy is always being changed from one form to another, and the total stays the same.",
      hints: ["Falling gains speed; rising loses it."],
    },
    {
      id: "law",
      kind: "discover",
      prompt: "Where the energy goes.",
      mode: "energy",
      equation: "work-energy-theorem",
      law: "Energy can change form — kinetic, potential, heat — but it is never created or destroyed. The work done on something changes its energy by exactly that much.",
    },
  ],
});
