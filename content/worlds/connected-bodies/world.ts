import { defineWorld } from "@ise/game-engine";

export const connectedBodiesWorld = defineWorld({
  id: "connected-bodies",
  title: "Connected Bodies",
  tagline: "Blocks on strings, a scale in a lift, a bob in a car, and a car on a banked curve.",
  color: "tangent",
  levels: ["pulled-by-a-string", "lifts-and-moving-frames", "round-the-bend"],
});
