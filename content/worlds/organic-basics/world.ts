import { defineWorld } from "@ise/game-engine";

export const organicBasicsWorld = defineWorld({
  id: "organic-basics",
  title: "Organic Basics",
  tagline: "Name carbon compounds, tell their isomers apart, and follow the electrons through a reaction.",
  color: "tangent",
  levels: ["naming-carbon-chains", "same-formula-new-molecule", "pushing-electrons", "breaking-and-making-bonds"],
});
