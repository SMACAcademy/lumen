import { defineWorld } from "@ise/game-engine";

export const measureWorld = defineWorld({
  id: "measure",
  title: "Measure",
  tagline: "Instruments, least counts and how wrong a number can quietly be.",
  color: "secant",
  levels: ["read-the-calliper", "the-bent-calliper"],
});
