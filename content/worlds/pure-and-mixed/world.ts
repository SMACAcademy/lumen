import { defineWorld } from "@ise/game-engine";

export const pureAndMixedWorld = defineWorld({
  id: "pure-and-mixed",
  title: "Is Matter Around Us Pure?",
  tagline: "Elements, compounds and mixtures; how strong a solution is; and the colloids that catch a beam of light.",
  color: "tangent",
  levels: ["one-kind-or-many", "making-solutions", "light-through-liquids"],
});
