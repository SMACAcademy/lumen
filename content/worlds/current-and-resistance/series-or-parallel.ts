import { defineLevel } from "@ise/game-engine";

const full = { type: "compare", quantity: "brightness", op: "gte", value: 0.99 } as const;
const circuit = (cells: number, bulbs: number, arrangement: "series" | "parallel") => ({
  id: `c${cells}-b${bulbs}-${arrangement}`,
  label: `${cells} cell${cells > 1 ? "s" : ""}, ${bulbs} bulb${bulbs > 1 ? "s" : ""}${bulbs > 1 ? ` in ${arrangement}` : ""}`,
  given: { cells, bulbs, arrangement },
});

/** Current and Resistance, level 2: series and parallel, and electrical power. */
export const seriesOrParallel = defineLevel({
  schemaVersion: 1,
  id: "series-or-parallel",
  concept: "current-and-resistance",
  title: "Series or parallel?",
  summary: "Join bulbs one after another and they dim; side by side, each shines fully. That is why houses are wired in parallel.",
  xp: 30,
  steps: [
    {
      id: "side-by-side",
      kind: "explore",
      prompt: "Two bulbs **in series** share one cell and glow dimly. Join them **in parallel** instead.",
      mode: "numbers",
      given: { cells: 1, bulbs: 2, arrangement: "series", switchClosed: "closed" },
      controls: ["arrangement"],
      canvas: false,
      goal: { type: "compare", quantity: "arrangement", op: "eq", value: 1 },
      success: "Both at full brightness! In parallel, each bulb gets the whole 1.5 V.",
      hints: ["Choose Parallel."],
    },
    {
      id: "a-third-bulb",
      kind: "predict",
      prompt: "Bulbs **in parallel**, one cell. You add bulbs, from **1 to 3**. What happens to **each bulb's brightness**?",
      variable: "bulbs",
      from: 1,
      to: 3,
      quantity: "brightness",
      options: ["increase", "decrease", "same"],
      given: { cells: 1, arrangement: "parallel" },
      explanation: "It stays the same: every branch gets the full push. The cell just has to supply more current in total.",
    },
    {
      id: "dim-or-full",
      kind: "sort",
      prompt: "**Sort** these: does each bulb glow at full brightness, or dimly?",
      mode: "numbers",
      given: { switchClosed: "closed" },
      canvas: false,
      bins: [
        { id: "full", label: "Full brightness", when: full },
        { id: "dim", label: "Dim", when: { type: "not", condition: full } },
      ],
      cards: [circuit(1, 2, "series"), circuit(1, 2, "parallel"), circuit(1, 3, "series"), circuit(1, 3, "parallel"), circuit(1, 1, "series"), circuit(2, 2, "series")],
      explanation: "In parallel every bulb gets the full push. In series they share it — unless you add cells to match: 2 cells for 2 bulbs in series gets them back to full.",
      hints: ["Series shares the push; parallel does not."],
    },
    {
      id: "more-than-a-watt",
      kind: "tap",
      prompt: "Power = V × I. **Catch** every circuit that uses **more than 1 W**.",
      given: { switchClosed: "closed" },
      canvas: false,
      rule: "power more than 1 W",
      when: { type: "compare", quantity: "power", op: "gt", value: 1 },
      cards: [
        circuit(1, 1, "series"),
        circuit(2, 1, "series"),
        circuit(1, 3, "parallel"),
        circuit(1, 2, "series"),
        circuit(3, 1, "series"),
        circuit(1, 2, "parallel"),
        circuit(2, 2, "parallel"),
        circuit(2, 2, "series"),
      ],
      explanation: "2 cells on 1 bulb (1.5 W), 3 bulbs in parallel on 1 cell (1.1 W), 3 cells on 1 bulb (3.4 W) and 2 bulbs in parallel on 2 cells (3 W).",
      hints: ["Work out V, then I = V ÷ R, then P = V × I."],
    },
    {
      id: "law",
      kind: "discover",
      prompt: "How fast a circuit uses energy.",
      mode: "numbers",
      equation: "electric-power",
      law: "Power = V × I. In parallel each branch gets the full voltage, so more branches draw more current and more power from the same cells.",
    },
  ],
});
