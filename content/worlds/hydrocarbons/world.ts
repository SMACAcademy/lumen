import { defineWorld } from "@ise/game-engine";

export const hydrocarbonsWorld = defineWorld({
  id: "hydrocarbons",
  title: "Hydrocarbons",
  tagline: "Turn ethane, add across double and triple bonds, and attack the benzene ring.",
  color: "sine",
  levels: ["turning-ethane", "adding-across-double-bonds", "triple-bonds-and-rings", "attacking-the-ring"],
});
