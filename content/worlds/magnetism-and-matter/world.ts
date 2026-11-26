import { defineWorld } from "@ise/game-engine";

export const magnetismAndMatterWorld = defineWorld({
  id: "magnetism-and-matter",
  title: "Magnetism and Matter",
  tagline: "A bar magnet's loops, the Earth's dip, and why iron remembers.",
  color: "vector",
  levels: ["dipole-and-lines", "the-earths-field", "magnetic-matter"],
});
