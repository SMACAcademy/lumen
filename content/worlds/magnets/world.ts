import { defineWorld } from "@ise/game-engine";

export const magnetsWorld = defineWorld({
  id: "magnets",
  title: "Magnets",
  tagline: "What a magnet picks up, why like poles push apart, and how a compass finds its way.",
  color: "cosine",
  levels: ["what-sticks", "poles-apart"],
});
