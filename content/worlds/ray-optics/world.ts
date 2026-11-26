import { defineWorld } from "@ise/game-engine";

export const rayOpticsWorld = defineWorld({
  id: "ray-optics",
  title: "Ray Optics",
  tagline: "Mirrors and lenses with every sign in place, light trapped in glass, a prism's rainbow, and the instruments that see further.",
  color: "sine",
  levels: ["mirror-images", "lens-images", "trapped-light", "looking-closer"],
});
