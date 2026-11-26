import { defineLevel } from "@ise/game-engine";

const PI = Math.PI;
const card = (id: string, label: string) => ({ id, label });
const angle = (id: string, label: string, theta: number) => ({ id, label, given: { theta } });

/** Circles & Waves, level 2: an angle measured by its arc, then the circle unrolled into sine and cosine. */
export const radiansAndWaves = defineLevel({
  schemaVersion: 1,
  id: "radians-and-waves",
  concept: "unit-circle-sine-cosine",
  title: "Radians and waves",
  summary: "Measure an angle by the arc it cuts off, then unroll the circle into the sine and cosine waves.",
  xp: 30,
  steps: [
    {
      id: "one-radian",
      kind: "target",
      prompt:
        "The thick arc **s** is how far the dot has travelled along the circle, measured in radii. Turn the dot until the arc is **exactly as long as the radius**: s = 1.",
      mode: "radians",
      given: { theta: PI / 6 },
      controls: ["theta"],
      goal: { type: "compare", quantity: "arcLength", op: "eq", value: 1, tolerance: 0.02 },
      success:
        "That angle is **1 radian**: the arc equals the radius. It is about 57.3°, a little less than 60°. An angle in radians is arc length ÷ radius.",
      retry: "Watch s at the top right: it should read 1.000, give or take 0.02.",
      hints: ["At 30° the arc is s = 0.524. Keep turning.", "One radian is just under 60°: try 57°."],
    },
    {
      id: "half-turn",
      kind: "estimate",
      prompt:
        "The dot has gone **half-way round**, to 180°. The whole circle is 2πr long and r = 1. How long is the arc s, so how many radians is 180°?",
      mode: "radians",
      given: { theta: PI },
      canvas: false,
      hideLabels: true,
      quantity: "arc",
      range: { min: 0, max: 6.5, step: 0.05 },
      tolerance: 0.1,
      explanation:
        "π ≈ 3.142. Half of the circumference 2π is π, so 180° = π rad and a full turn, 360°, is 2π ≈ 6.283 rad.",
      hints: ["The circumference of a circle of radius 1 is 2π ≈ 6.28. Half of it?"],
    },
    {
      id: "degrees-to-radians",
      kind: "match",
      prompt: "If 180° is π rad, then 1° is π/180 rad. **Match** each angle in degrees to the same angle in radians.",
      canvas: false,
      pairs: [
        { left: card("d30", "30°"), right: card("r30", "π/6") },
        { left: card("d45", "45°"), right: card("r45", "π/4") },
        { left: card("d60", "60°"), right: card("r60", "π/3") },
        { left: card("d90", "90°"), right: card("r90", "π/2") },
        { left: card("d270", "270°"), right: card("r270", "3π/2") },
        { left: card("d360", "360°"), right: card("r360", "2π") },
      ],
      explanation:
        "Multiply degrees by π/180: 30 × π/180 = π/6, 45 × π/180 = π/4, 60° = π/3, 90° = π/2, 270° = 3π/2, 360° = 2π. To go back, multiply radians by 180/π.",
      hints: ["Half a turn is π, so a quarter turn (90°) is π/2."],
    },
    {
      id: "unroll",
      kind: "explore",
      prompt:
        "Now unroll the circle. **Drag the dot once all the way round**, from 0 to 2π, and watch the height draw **sin θ** and the width draw **cos θ**.",
      mode: "both",
      given: { theta: 0 },
      goal: { type: "traceCoverage", min: 0.97 },
      success:
        "sin θ is 0 at 0, 1 at π/2, 0 at π, −1 at 3π/2 and 0 again at 2π. cos θ starts at 1, is 0 at π/2, −1 at π and back to 1 at 2π. Both stay between −1 and 1.",
      hints: ["Grab the dot and pull it round counter-clockwise until both graphs are complete."],
    },
    {
      id: "crossings",
      kind: "tap",
      prompt: "Read the sine wave. **Catch** every angle where the wave crosses the θ-axis, so sin θ = 0.",
      mode: "sine",
      rule: "sin θ = 0",
      when: { type: "compare", quantity: "sin", op: "eq", value: 0, tolerance: 1e-9 },
      cards: [
        angle("zero", "θ = 0", 0),
        angle("sixth", "θ = π/6", PI / 6),
        angle("half-pi", "θ = π/2", PI / 2),
        angle("pi", "θ = π", PI),
        angle("three-halves", "θ = 3π/2", (3 * PI) / 2),
        angle("two-pi", "θ = 2π", 2 * PI),
      ],
      explanation:
        "The dot is on the x-axis, at height 0, at 0, π and 2π. At π/2 the wave is at its peak (1) and at 3π/2 at its trough (−1); at π/6 it is 0.5.",
      hints: ["sin θ is the height of the dot. Where is the dot on the horizontal axis?"],
    },
    {
      id: "full-turn",
      kind: "predict",
      prompt: "The dot turns a full **2π**, from θ = 0 to θ = 2π. What happens to **cos θ**?",
      mode: "cosine",
      variable: "theta",
      from: 0,
      to: 2 * PI,
      quantity: "cos",
      options: ["increase", "decrease", "same"],
      tolerance: 1e-9,
      explanation:
        "After a full turn of 2π the dot is back where it started, so cos θ is 1 again. That is why both waves repeat every 2π: their **period** is 2π. cos(θ + 2π) = cos θ and sin(θ + 2π) = sin θ.",
    },
    {
      id: "law",
      kind: "discover",
      prompt: "You measured angles by their arcs and unrolled the circle into two waves.",
      mode: "radians",
      equation: "radian-definition",
      law: "An angle in radians is arc length ÷ radius. A full turn is 2π rad = 360°, so sin θ and cos θ repeat every 2π.",
    },
  ],
});
