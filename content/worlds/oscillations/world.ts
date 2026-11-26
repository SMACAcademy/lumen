import { defineWorld } from "@ise/game-engine";

export const oscillationsWorld = defineWorld({
  id: "oscillations",
  title: "Oscillations",
  tagline: "Springs, pendulums and the circle whose shadow they are — then damping, resonance and a twisting disc.",
  color: "cosine",
  levels: ["springs-and-pendulums", "energy-in-shm", "damped-and-driven"],
});
