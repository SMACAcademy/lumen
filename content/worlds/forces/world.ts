import { defineWorld } from "@ise/game-engine";

export const forcesWorld = defineWorld({
  id: "forces",
  title: "Forces",
  tagline: "Why motion changes: pushes, weight, friction and Newton's second law.",
  color: "angle",
  levels: ["when-friction-gives-way", "the-tilted-table", "the-energy-ledger",
    "friction-takes-its-cut",
    "what-survives-a-crash",
    "bounce-and-rebound",
  ],
});
