import { defineWorld } from "@ise/game-engine";

export const shadowsAndMirrorsWorld = defineWorld({
  id: "shadows-and-mirrors",
  title: "Shadows and Mirrors",
  tagline: "Light goes in straight lines — so it makes shadows, flips pinhole pictures and bounces off mirrors.",
  color: "angle",
  levels: ["shadow-play", "mirror-mirror"],
});
