import { defineWorld } from "@ise/game-engine";

export const spinWorld = defineWorld({
  id: "spin",
  title: "Spin",
  tagline: "Torque, moment of inertia and angular momentum: mechanics, for things that turn.",
  color: "tangent",
  levels: ["the-turning-effect", "where-the-mass-sits"],
});
