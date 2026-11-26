import { defineWorld } from "@ise/game-engine";

export const batteriesAndRustWorld = defineWorld({
  id: "batteries-and-rust",
  title: "Batteries and Rust",
  tagline: "The cells we carry around, their energy — and the slow redox that eats iron.",
  color: "tangent",
  levels: ["cells-and-energy", "stopping-rust"],
});
