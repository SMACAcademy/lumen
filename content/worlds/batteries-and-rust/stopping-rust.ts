import { defineLevel } from "@ise/game-engine";

type Given = Record<string, string | number>;
const nail = (id: string, label: string, given: Given) => ({ id, label, given });
const card = (id: string, label: string) => ({ id, label });
const rusts = { type: "compare", quantity: "rusts", op: "eq", value: 1 } as const;
const safe = { type: "compare", quantity: "rusts", op: "eq", value: 0 } as const;
const bare = { water: "yes", air: "yes", salt: "no", coating: "none", scratched: "no" };

/** Batteries and Rust, level 2: what rusting needs, and how to stop it. */
export const stoppingRust = defineLevel({
  schemaVersion: 1,
  id: "stopping-rust",
  concept: "batteries-and-corrosion",
  title: "Stopping rust",
  summary: "Rust needs water and oxygen. Paint, tin and zinc keep it off — but only zinc survives a scratch.",
  xp: 35,
  steps: [
    {
      id: "watch-it-rust",
      kind: "explore",
      prompt: "A bare iron nail in water, open to the air. Press play and let the **days** pass.",
      mode: "corrosion",
      given: { ...bare, days: 0 },
      playback: true,
      canvas: false,
      goal: { type: "compare", quantity: "rusted", op: "gte", value: 0.2 },
      success: "Rust spreads: iron is oxidised where water and oxygen meet it.",
      hints: ["Press play."],
    },
    {
      id: "conditions",
      kind: "sort",
      prompt: "**Sort** the nails: which ones rust?",
      mode: "corrosion",
      given: { days: 10 },
      canvas: false,
      bins: [
        { id: "rusts", label: "Rusts", when: rusts },
        { id: "shiny", label: "Stays shiny", when: safe },
      ],
      cards: [
        nail("open", "In water, open to air", bare),
        nail("dry", "In dry air, with a drying agent", { ...bare, water: "no" }),
        nail("oil", "In boiled water under oil", { ...bare, air: "no" }),
        nail("sea", "In salty water", { ...bare, salt: "yes" }),
        nail("painted", "Painted, in water and air", { ...bare, coating: "paint" }),
        nail("galvanised", "Galvanised and scratched", { ...bare, coating: "zinc", scratched: "yes" }),
      ],
      explanation: "Rust needs both water and oxygen at bare iron. Take either away, or cover the iron, and it stops. Galvanised iron is safe even scratched.",
      hints: ["Is there water, oxygen, and bare iron?"],
    },
    {
      id: "scratched",
      kind: "tap",
      prompt: "**Catch** the nails still safe from rust — every one of them in water and air.",
      mode: "corrosion",
      given: { days: 10 },
      canvas: false,
      rule: "safe from rust",
      when: safe,
      cards: [
        nail("tin-whole", "Tin plate, unbroken", { ...bare, coating: "tin" }),
        nail("tin-scratch", "Tin plate, scratched", { ...bare, coating: "tin", scratched: "yes" }),
        nail("zinc-whole", "Galvanised, unbroken", { ...bare, coating: "zinc" }),
        nail("zinc-scratch", "Galvanised, scratched", { ...bare, coating: "zinc", scratched: "yes" }),
        nail("paint-scratch", "Painted, scratched", { ...bare, coating: "paint", scratched: "yes" }),
        nail("paint-whole", "Painted, unbroken", { ...bare, coating: "paint" }),
      ],
      explanation: "An unbroken coat keeps water and air out. Once scratched, only zinc still protects — it is more reactive than iron, so it corrodes first. Scratched tin makes iron rust faster.",
      hints: ["Which metal is more reactive than iron?"],
    },
    {
      id: "salt-water",
      kind: "estimate",
      prompt: "In **salty** water a bare nail rusts at **6% a day**. What fraction has rusted after **5 days**?",
      mode: "corrosion",
      given: { ...bare, salt: "yes", days: 5 },
      canvas: false,
      hideLabels: true,
      quantity: "rusted",
      range: { min: 0, max: 1, step: 0.05 },
      tolerance: 0.03,
      explanation: "5 × 6% = 30%: three times as fast as in fresh water. Salt makes the water a better electrolyte for the little cells on the iron's surface.",
      hints: ["Rate × days."],
    },
    {
      id: "protection",
      kind: "match",
      prompt: "**Match** each way of fighting rust to how it works.",
      canvas: false,
      pairs: [
        { left: card("galvanise", "Galvanising (zinc)"), right: card("sacrifice", "corrodes first, protecting even when scratched") },
        { left: card("tin", "Tin plate"), right: card("unbroken", "protects only while unbroken") },
        { left: card("paint", "Paint or grease"), right: card("barrier", "keeps water and air off the iron") },
        { left: card("salt", "Salt on the roads"), right: card("faster", "makes cars rust faster") },
      ],
      explanation: "Barriers — paint, grease, tin — work until they break. Sacrificial zinc works because it gives up electrons more readily than iron.",
      hints: ["Which one works by being more reactive?"],
    },
    {
      id: "law",
      kind: "discover",
      prompt: "Why zinc protects.",
      mode: "corrosion",
      equation: "sacrificial",
      law: "Zinc is more reactive than iron (E° −0.76 V against −0.44 V), so it corrodes in iron's place: galvanised iron is protected even when scratched.",
    },
  ],
});
