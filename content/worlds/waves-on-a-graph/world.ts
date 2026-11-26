import { defineWorld } from "@ise/game-engine";

export const wavesOnAGraph = defineWorld({
  id: "waves-on-a-graph",
  title: "Waves on a Graph",
  tagline: "Four dials that stretch, squeeze, slide and lift a sine wave — and any graph.",
  color: "curve",
  levels: ["dials-of-a-wave", "shift-and-stretch"],
});
