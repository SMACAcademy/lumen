import { defineWorld } from "@ise/game-engine";

export const mirrorsAndImagesWorld = defineWorld({
  id: "mirrors-and-images",
  title: "Reflections and Images",
  tagline: "Smooth and rough surfaces, mirrors at an angle, a kaleidoscope and a periscope.",
  color: "sine",
  levels: ["smooth-and-rough", "mirrors-at-an-angle", "up-periscope"],
});
