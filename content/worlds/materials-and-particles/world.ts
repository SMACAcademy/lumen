import { defineWorld } from "@ise/game-engine";

export const materialsAndParticlesWorld = defineWorld({
  id: "materials-and-particles",
  title: "Materials and Particles",
  tagline: "Sort materials, dissolve and separate them, stop iron rusting — and meet the tiny moving particles inside everything.",
  color: "sine",
  levels: ["sort-and-dissolve", "separate-and-protect", "particles-on-the-move"],
});
