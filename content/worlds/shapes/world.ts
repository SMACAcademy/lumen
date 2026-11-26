import { defineWorld } from "@ise/game-engine";

export const shapesWorld = defineWorld({
  id: "shapes",
  title: "Shapes",
  tagline: "Molecules you can turn in your hand, and why electron pairs decide every shape.",
  color: "tangent",
  levels: ["pairs-push-apart", "beyond-eight"],
});
