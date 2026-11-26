import { defineLevel } from "@ise/game-engine";

const PI = Math.PI;
const card = (id: string, label: string) => ({ id, label });
/** The plain wave y = sin x, before any dial is turned. */
const SINE = { A: 1, omega: 1, phi: 0, d: 0 };

/** Waves on a Graph, level 2: y = a·f(b(x − h)) + k, seen on the sine curve. */
export const shiftAndStretch = defineLevel({
  schemaVersion: 1,
  id: "shift-and-stretch",
  concept: "sinusoidal-functions",
  title: "Shift and stretch",
  summary: "Move a graph up, down, left and right, stretch it and flip it, and learn which way each change goes.",
  xp: 35,
  steps: [
    {
      id: "down-one",
      kind: "target",
      prompt:
        "Every graph y = f(x) can be moved and stretched the same few ways. Start with the dashed **y = sin x**. Move it **down by 1**, to y = sin x − 1.",
      mode: "explore",
      given: SINE,
      controls: ["d"],
      canvas: false,
      goal: { type: "compare", quantity: "offset", op: "eq", value: -1, tolerance: 0.01 },
      success:
        "d = −1. Adding a number k to f(x) moves every point up by k (down when k is negative). The midline is now y = −1 and the wave runs from −2 to 0.",
      retry: "The midline should sit at y = −1.",
      hints: ["The vertical shift is the d dial.", "Set d = −1."],
    },
    {
      id: "right-quarter",
      kind: "target",
      prompt:
        "Now move y = sin x **right by π/2**, to y = sin(x − π/2). Turn the **phase φ** and watch the shift arrow.",
      mode: "explore",
      given: SINE,
      controls: ["phi"],
      canvas: false,
      goal: { type: "compare", quantity: "phaseShift", op: "eq", value: PI / 2, tolerance: 0.01 },
      success:
        "φ = −π/2. Replacing x by x − h moves a graph **right** by h: the cycle that started at x = 0 now starts at x = π/2. (This wave happens to be −cos x.)",
      retry: "The arrow should point right and end at x = π/2.",
      hints: ["A minus sign inside the bracket: sin(x − π/2) has φ = −π/2.", "Set φ = −π/2 (−90°)."],
    },
    {
      id: "plus-goes-left",
      kind: "predict",
      prompt: "φ increases from 0 to **+π/2**, giving y = sin(x + π/2). Which way does the wave move — what happens to its **shift**?",
      mode: "explore",
      given: SINE,
      variable: "phi",
      from: 0,
      to: PI / 2,
      quantity: "phaseShift",
      options: ["increase", "decrease", "same"],
      explanation:
        "The shift falls from 0 to −π/2: the wave moves **left**. sin(x + π/2) reaches each value π/2 sooner than sin x. A plus inside the bracket shifts left; a minus shifts right.",
    },
    {
      id: "factor-first",
      kind: "estimate",
      prompt:
        "Here is y = sin(2x − π/2). How far **right** has it moved compared with sin 2x? Estimate the **shift**. (Careful: it is not π/2.)",
      mode: "explore",
      given: { ...SINE, omega: 2, phi: -PI / 2 },
      canvas: false,
      hideLabels: true,
      quantity: "phaseShift",
      range: { min: -3.2, max: 3.2, step: 0.05 },
      tolerance: 0.1,
      explanation:
        "π/4 ≈ 0.785. Take the 2 out first: sin(2x − π/2) = sin 2(x − π/4), so h = π/4. The shift of y = A sin(ωx + φ) is −φ/ω, not −φ.",
      hints: ["Write 2x − π/2 as 2(x − something)."],
    },
    {
      id: "flip",
      kind: "estimate",
      prompt:
        "Now y = **−2** sin x. At x = π/2, sin x is at its peak, 1. Estimate **y** at the probe there.",
      mode: "explore",
      given: { ...SINE, A: -2, x: PI / 2 },
      canvas: false,
      hideLabels: true,
      quantity: "y",
      range: { min: -3, max: 3, step: 0.1 },
      tolerance: 0.15,
      explanation:
        "y = −2. Multiplying by 2 stretches the wave vertically; the minus sign reflects it in the x-axis. So the peak of sin x at π/2 becomes a trough at −2.",
      hints: ["First stretch: 2 × 1. Then flip the sign."],
    },
    {
      id: "which-change",
      kind: "match",
      prompt: "**Match** each equation to what it does to the graph of y = sin x.",
      canvas: false,
      pairs: [
        { left: card("up", "y = sin x + 1"), right: card("up-one", "shifted up by 1") },
        { left: card("left", "y = sin(x + 1)"), right: card("left-one", "shifted left by 1") },
        { left: card("tall", "y = 3 sin x"), right: card("stretch-y", "stretched vertically by 3") },
        { left: card("squeeze", "y = sin 3x"), right: card("squeeze-x", "squeezed sideways to a third") },
        { left: card("flip", "y = −sin x"), right: card("reflect", "reflected in the x-axis") },
      ],
      explanation:
        "Changes outside the function act on y the way you expect: + 1 moves up, × 3 stretches up. Changes inside act on x the opposite way: + 1 moves left, × 3 squeezes to a third (period 2π/3).",
      hints: ["A change inside the bracket acts on x, and backwards."],
    },
    {
      id: "law",
      kind: "discover",
      prompt: "Every transformation of a graph, in one line.",
      mode: "explore",
      equation: "shift-equation",
      law: "y = a·f(b(x − h)) + k stretches f by a (and reflects it if a < 0), squeezes it sideways by b, moves it right by h and up by k. For a sine wave, h = −φ/ω.",
    },
  ],
});
