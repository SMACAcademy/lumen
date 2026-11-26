import { defineWorld } from "@ise/game-engine";

export const waveOpticsWorld = defineWorld({
  id: "wave-optics",
  title: "Wave Optics",
  tagline: "Two slits, one screen, and proof that light is a wave — then diffraction, polaroids and soap films.",
  color: "sine",
  levels: ["wavefronts-and-fringes", "diffraction-and-resolution", "polaroids-and-films"],
});
