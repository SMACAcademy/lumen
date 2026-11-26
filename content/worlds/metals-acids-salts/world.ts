import { defineWorld } from "@ise/game-engine";

export const metalsAcidsSaltsWorld = defineWorld({
  id: "metals-acids-salts",
  title: "Metals, Acids and Salts",
  tagline: "Which metal wins a swap, what acids do, and the salts left behind.",
  color: "tangent",
  levels: ["metal-or-non-metal", "which-metal-wins", "fizz-ph-and-salts"],
});
