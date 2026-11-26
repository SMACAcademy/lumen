import { defineWorld } from "@ise/game-engine";

export const lewisWorld = defineWorld({
  id: "lewis",
  title: "Lewis Structures",
  tagline: "Count the electrons, give every atom an octet, and let formal charge decide.",
  color: "angle",
  levels: ["counting-electrons", "formal-charge-and-resonance"],
});
