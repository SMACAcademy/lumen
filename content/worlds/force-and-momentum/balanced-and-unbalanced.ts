import { defineLevel } from "@ise/game-engine";

const balanced = { type: "compare", quantity: "netForce", op: "eq", value: 0, tolerance: 0.01 } as const;

/** Force and Momentum, level 1: balanced forces, inertia and F = ma. */
export const balancedAndUnbalanced = defineLevel({
  schemaVersion: 1,
  id: "balanced-and-unbalanced",
  concept: "laws-of-motion",
  title: "Balanced and unbalanced",
  summary: "A push does not always make something move. What matters is the force left over.",
  xp: 30,
  steps: [
    {
      id: "friction-pushes-back",
      kind: "explore",
      prompt: "Push this 2 kg box **gently**, with at least 4 N. Friction pushes back — does it move?",
      mode: "push",
      given: { mass: 2, applied: 0, incline: 0, muStatic: 0.4, muKinetic: 0.3, s: 0 },
      controls: ["applied"],
      canvas: false,
      goal: {
        type: "all",
        conditions: [
          { type: "compare", quantity: "applied", op: "gte", value: 4 },
          balanced,
        ],
      },
      success: "It stays put: friction pushes back exactly as hard as you push. The forces are balanced, so nothing changes — that is inertia.",
      hints: ["Slide the push up to about 5 N."],
    },
    {
      id: "two-metres-per-second",
      kind: "target",
      prompt: "On slippery ice (no friction), make the 2 kg box accelerate at **2 m/s²**.",
      mode: "push",
      given: { mass: 2, applied: 0, incline: 0, muStatic: 0, muKinetic: 0, s: 0 },
      controls: ["applied"],
      canvas: false,
      goal: { type: "compare", quantity: "a", op: "eq", value: 2, tolerance: 0.05 },
      success: "4 N: F = ma = 2 × 2. The unbalanced force is what makes it speed up.",
      retry: "Not 2 m/s² yet. Force = mass × acceleration.",
      hints: ["F = m × a = 2 × 2."],
    },
    {
      id: "heavier-box",
      kind: "predict",
      prompt: "The same 8 N push, on ice. The box's mass goes from **2 kg** to **4 kg**. What happens to its acceleration?",
      variable: "mass",
      from: 2,
      to: 4,
      quantity: "a",
      options: ["increase", "decrease", "same"],
      given: { applied: 8, incline: 0, muStatic: 0, muKinetic: 0 },
      explanation: "It halves, from 4 to 2 m/s². Twice the mass needs twice the force for the same acceleration.",
    },
    {
      id: "balanced-or-not",
      kind: "sort",
      prompt: "**Sort** these: are the forces on the box balanced, or not?",
      mode: "push",
      given: { incline: 0, s: 0 },
      canvas: false,
      bins: [
        { id: "balanced", label: "Balanced — no change", when: balanced },
        { id: "unbalanced", label: "Unbalanced — it speeds up", when: { type: "not", condition: balanced } },
      ],
      cards: [
        { id: "gentle", label: "A gentle push on a heavy box", given: { applied: 3, mass: 4, muStatic: 0.4, muKinetic: 0.3 } },
        { id: "ice", label: "A hard push on ice", given: { applied: 10, mass: 2, muStatic: 0, muKinetic: 0 } },
        { id: "none", label: "No push at all", given: { applied: 0, mass: 2, muStatic: 0.4, muKinetic: 0.3 } },
        { id: "strong", label: "A strong push on a light box", given: { applied: 20, mass: 1, muStatic: 0.4, muKinetic: 0.3 } },
        { id: "rough", label: "A push that cannot beat a rough floor", given: { applied: 6, mass: 2, muStatic: 0.5, muKinetic: 0.4 } },
      ],
      explanation: "When friction can match the push, the forces balance and the box stays still. When the push wins, the leftover force makes it accelerate.",
      hints: ["Can friction push back as hard as the push?"],
    },
    {
      id: "law",
      kind: "discover",
      prompt: "Newton's second law.",
      mode: "push",
      equation: "second-law",
      law: "Balanced forces change nothing (the first law). An unbalanced force makes a mass accelerate: F = ma (the second law).",
    },
  ],
});
