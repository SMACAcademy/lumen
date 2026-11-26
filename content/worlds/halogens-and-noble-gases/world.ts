import { defineWorld } from "@ise/game-engine";

export const halogensAndNobleGasesWorld = defineWorld({
  id: "halogens-and-noble-gases",
  title: "Halogens and Noble Gases",
  tagline: "Group 17 grabs electrons; group 18 keeps to itself — except xenon, sometimes.",
  color: "tangent",
  levels: ["the-halogens", "the-noble-gases"],
});
