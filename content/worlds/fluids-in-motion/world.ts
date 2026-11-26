import { defineWorld } from "@ise/game-engine";

export const fluidsInMotionWorld = defineWorld({
  id: "fluids-in-motion",
  title: "Fluids in Motion",
  tagline: "A hydraulic lift, a pipe that narrows, a ball sinking through glycerine, and water climbing a thin tube.",
  color: "sine",
  levels: ["push-and-flow", "thick-and-thin", "drops-and-tubes"],
});
