import { defineLevel } from "@ise/game-engine";

const moving = { type: "compare", quantity: "speed", op: "gt", value: 0.01 } as const;
const still = { type: "compare", quantity: "speed", op: "lte", value: 0.01 } as const;
const card = (id: string, label: string) => ({ id, label });

/** Fast and Slow, level 2: a distance–time graph tells the story of a journey. */
export const theJourneyGraph = defineLevel({
  schemaVersion: 1,
  id: "the-journey-graph",
  concept: "motion-in-a-straight-line",
  title: "The journey graph",
  summary: "A distance–time graph is a journey drawn as a line. Flat means stopped; steep means fast.",
  xp: 25,
  steps: [
    {
      id: "draw-it",
      kind: "explore",
      prompt: "Press play and watch the **distance–time graph** draw itself as she runs.",
      mode: "position",
      given: { u: 3, a: 0, t: 0 },
      playback: true,
      canvas: false,
      goal: { type: "compare", quantity: "t", op: "gte", value: 5 },
      success: "A straight line: she covers the same distance every second, so the graph climbs by the same amount every second.",
      hints: ["Press play."],
    },
    {
      id: "moving-or-still",
      kind: "sort",
      prompt: "**Sort** these: moving, or standing still?",
      mode: "position",
      given: { a: 0, t: 2 },
      canvas: false,
      bins: [
        { id: "moving", label: "Moving", when: moving },
        { id: "still", label: "Standing still", when: still },
      ],
      cards: [
        { id: "parked", label: "A parked car", given: { u: 0 } },
        { id: "walker", label: "Someone walking", given: { u: 1.5 } },
        { id: "cat", label: "A sleeping cat", given: { u: 0 } },
        { id: "bus", label: "A bus", given: { u: 6 } },
        { id: "statue", label: "A statue", given: { u: 0 } },
        { id: "cyclist", label: "A cyclist", given: { u: 4 } },
      ],
      explanation: "Anything standing still has a flat distance–time graph: time passes, but the distance does not change.",
      hints: ["Is the distance changing?"],
    },
    {
      id: "steeper",
      kind: "predict",
      prompt: "She runs **faster**. What happens to how **steep** her distance–time line is?",
      variable: "u",
      from: 2,
      to: 5,
      quantity: "speed",
      options: ["increase", "decrease", "same"],
      given: { a: 0, t: 2 },
      explanation: "It gets steeper. A faster runner covers more metres in each second, so the line climbs faster.",
    },
    {
      id: "story-and-shape",
      kind: "match",
      prompt: "**Match** each journey to the shape of its distance–time graph.",
      canvas: false,
      pairs: [
        { left: card("stopped", "Standing still"), right: card("flat", "A flat line") },
        { left: card("walk", "A steady walk"), right: card("gentle", "A gentle straight slope") },
        { left: card("run", "A steady run"), right: card("steep", "A steep straight slope") },
        { left: card("speeding", "Speeding up"), right: card("curve", "A curve getting steeper") },
      ],
      explanation: "Flat is stopped; straight is steady; the steeper the line, the faster; a curve that bends upwards is speeding up.",
      hints: ["Steeper means faster."],
    },
    {
      id: "law",
      kind: "discover",
      prompt: "How to read a journey graph.",
      mode: "position",
      equation: "average-velocity",
      law: "On a distance–time graph, a steeper line means a faster speed and a flat line means standing still — the slope is the speed.",
    },
  ],
});
