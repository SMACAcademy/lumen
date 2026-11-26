import { defineLevel } from "@ise/game-engine";

const PI = Math.PI;
const card = (id: string, label: string) => ({ id, label });
/** The plain wave y = sin x, before any dial is turned. */
const SINE = { A: 1, omega: 1, phi: 0, d: 0 };

/** Waves on a Graph, level 1: what each dial of y = A sin(ωx + φ) + d does, and the shapes of the trig graphs. */
export const dialsOfAWave = defineLevel({
  schemaVersion: 1,
  id: "dials-of-a-wave",
  concept: "sinusoidal-functions",
  title: "Dials of a wave",
  summary: "Amplitude, period, phase and midline: turn one dial at a time and see what it does to y = sin x.",
  xp: 30,
  steps: [
    {
      id: "taller",
      kind: "target",
      prompt:
        "The thick wave is y = A sin(ωx + φ) + d, starting as plain **sin x**. Turn the **amplitude A** until the wave reaches **2** at its peaks and **−2** at its troughs.",
      mode: "explore",
      given: SINE,
      controls: ["A"],
      canvas: false,
      goal: {
        type: "all",
        conditions: [
          { type: "compare", quantity: "max", op: "eq", value: 2, tolerance: 0.01 },
          { type: "compare", quantity: "min", op: "eq", value: -2, tolerance: 0.01 },
        ],
      },
      success:
        "|A| = 2: the wave now runs 2 above and 2 below its midline. A stretches the graph vertically, but look at the width: one cycle still takes 2π. Amplitude never changes the period.",
      retry: "The peak should be at exactly 2. Watch the |A| arrow.",
      hints: ["The amplitude is the height of a peak above the midline.", "Set A = 2."],
    },
    {
      id: "read-period",
      kind: "estimate",
      prompt:
        "Now ω = 2: y = sin 2x. Read the graph: how far along x does it take to complete **one full cycle**, peak to peak? Estimate the **period T**.",
      mode: "explore",
      given: { ...SINE, omega: 2 },
      canvas: false,
      hideLabels: true,
      quantity: "period",
      range: { min: 0, max: 7, step: 0.05 },
      tolerance: 0.15,
      explanation:
        "T = π ≈ 3.14. The phase 2x turns twice as fast as x, so a full turn of 2π takes only π: T = 2π/ω = 2π/2. Two cycles now fit where sin x had one.",
      hints: ["The x-axis is marked in multiples of π (or of 90°). Count from one peak to the next."],
    },
    {
      id: "three-cycles",
      kind: "target",
      prompt: "Squeeze the wave so that **three** full cycles fit into every 2π: make the period **T = 2π/3**.",
      mode: "explore",
      given: SINE,
      controls: ["omega"],
      canvas: false,
      goal: { type: "compare", quantity: "period", op: "eq", value: (2 * PI) / 3, tolerance: 0.01 },
      success: "ω = 3, so T = 2π/3 ≈ 2.09. The bigger ω, the shorter the period: T = 2π/ω.",
      retry: "Not yet. Which ω makes 2π/ω equal 2π/3?",
      hints: ["Only ω changes the period.", "T = 2π/ω, so you need ω = 3."],
    },
    {
      id: "lift",
      kind: "target",
      prompt:
        "Make the wave run from a lowest value of **0** up to a highest value of **2**. You have the amplitude **A** and the vertical shift **d**.",
      mode: "explore",
      given: { ...SINE, A: 0.5 },
      controls: ["A", "d"],
      canvas: false,
      goal: {
        type: "all",
        conditions: [
          { type: "compare", quantity: "max", op: "eq", value: 2, tolerance: 0.01 },
          { type: "compare", quantity: "min", op: "eq", value: 0, tolerance: 0.01 },
        ],
      },
      success:
        "d = 1 and |A| = 1. The midline y = d sits half-way between the lowest and highest values, and the wave reaches |A| above and below it: from d − |A| = 0 to d + |A| = 2.",
      retry: "Find the midline first: half-way between 0 and 2.",
      hints: ["The midline is half-way between 0 and 2.", "d = 1 puts the midline at y = 1; then the wave needs to reach 1 above and below it."],
    },
    {
      id: "make-cosine",
      kind: "target",
      prompt:
        "The cosine graph starts at its **peak**, 1, at x = 0. Turn the **phase φ** until the sine wave becomes exactly **y = cos x**.",
      mode: "explore",
      given: SINE,
      controls: ["phi"],
      canvas: false,
      goal: {
        type: "any",
        conditions: [
          { type: "compare", quantity: "phi", op: "eq", value: PI / 2, tolerance: 0.01 },
          { type: "compare", quantity: "phi", op: "eq", value: -1.5 * PI, tolerance: 0.01 },
        ],
      },
      success:
        "φ = π/2: sin(x + π/2) = cos x. The cosine graph is the sine graph slid π/2 to the left, so it is the same shape with the same amplitude 1 and period 2π.",
      retry: "Look at x = 0: the wave should be at its peak there.",
      hints: ["sin x reaches its peak at x = π/2. You need that peak at x = 0.", "Try φ = π/2 (90°)."],
    },
    {
      id: "shapes",
      kind: "match",
      prompt: "**Match** each graph to its shape.",
      canvas: false,
      pairs: [
        { left: card("sin", "y = sin x"), right: card("sin-shape", "0 at x = 0, peak 1 at π/2, period 2π") },
        { left: card("cos", "y = cos x"), right: card("cos-shape", "peak 1 at x = 0, 0 at π/2, period 2π") },
        { left: card("tan", "y = tan x"), right: card("tan-shape", "0 at x = 0, breaks at x = ±π/2, period π") },
        { left: card("stretched", "y = 2 sin 3x"), right: card("stretched-shape", "between −2 and 2, period 2π/3") },
      ],
      explanation:
        "sin and cos are the same wave, π/2 apart, always between −1 and 1. tan x = sin x ÷ cos x has no maximum: it shoots off to ±∞ wherever cos x = 0 (x = ±π/2, ±3π/2 …), which are vertical asymptotes, and it repeats every π. In 2 sin 3x the 2 sets the amplitude and the 3 sets the period 2π/3.",
      hints: ["Only one of these graphs is not trapped between two horizontal lines."],
    },
    {
      id: "law",
      kind: "discover",
      prompt: "Four dials, four jobs: A stretches up and down, ω squeezes sideways, φ slides, d lifts.",
      mode: "explore",
      equation: "period-equation",
      law: "In y = A sin(ωx + φ) + d the amplitude is |A|, the midline is y = d, and the period is T = 2π/ω — the amplitude never changes it.",
    },
  ],
});
