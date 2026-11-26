import { defineLevel } from "@ise/game-engine";

const card = (id: string, label: string) => ({ id, label });

/** Magnets, level 2: like poles repel, unlike poles attract, and a compass follows the field. */
export const polesApart = defineLevel({
  schemaVersion: 1,
  id: "poles-apart",
  concept: "fun-with-magnets",
  title: "Poles apart",
  summary: "Two magnets can pull together or push apart. Find the rule, then follow a compass round a magnet.",
  xp: 30,
  steps: [
    {
      id: "turn-it-round",
      kind: "explore",
      prompt: "These two magnets pull together. **Turn the second one round** so that its **N** faces the first magnet's **N**.",
      mode: "pair",
      given: { partner: "magnet", facing: "N-S", gap: 6 },
      controls: ["facing"],
      canvas: false,
      goal: { type: "compare", quantity: "repels", op: "eq", value: 1 },
      success: "They push apart! Two norths repel each other — and so do two souths.",
      hints: ["Choose N faces N."],
    },
    {
      id: "closer-push",
      kind: "predict",
      prompt: "Two **N** poles push apart from **8 cm**. They are pushed closer, to **3 cm**. What happens to the push?",
      variable: "gap",
      from: 8,
      to: 3,
      quantity: "strength",
      options: ["increase", "decrease", "same"],
      given: { partner: "magnet", facing: "N-N" },
      explanation: "It gets much stronger. The closer two like poles are, the harder they push — try squeezing two magnets together.",
    },
    {
      id: "magnet-facts",
      kind: "match",
      prompt: "**Match** each start to its ending.",
      canvas: false,
      pairs: [
        { left: card("unlike", "Unlike poles"), right: card("pull", "pull together") },
        { left: card("like", "Like poles"), right: card("push", "push apart") },
        { left: card("hanging", "A magnet hung from a thread"), right: card("settles", "settles pointing north–south") },
        { left: card("needle", "A compass needle"), right: card("tiny", "is a tiny magnet") },
      ],
      explanation: "Unlike poles attract and like poles repel. A freely hanging magnet — like a compass needle — turns until it points north–south.",
      hints: ["N and S: unlike. N and N: like."],
    },
    {
      id: "round-the-magnet",
      kind: "explore",
      prompt: "Press play to **walk the compass round** the magnet, and watch which way its red end points.",
      mode: "compass",
      given: { around: 0 },
      playback: true,
      canvas: false,
      goal: { type: "compare", quantity: "around", op: "gte", value: 170 },
      success: "Near the north pole the needle points away from the magnet; near the south pole it points towards it; along the side it points from N back to S.",
      hints: ["Press play."],
    },
    {
      id: "law",
      kind: "discover",
      prompt: "The rule for poles.",
      mode: "pair",
      equation: "poles-rule",
      law: "Unlike poles pull together; like poles push apart — harder the closer they are. A compass needle is a small magnet, so it lines up with the field around a magnet.",
    },
  ],
});
