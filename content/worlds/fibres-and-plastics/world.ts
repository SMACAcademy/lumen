import { defineWorld } from "@ise/game-engine";

export const fibresAndPlasticsWorld = defineWorld({
  id: "fibres-and-plastics",
  title: "Fibres and Plastics",
  tagline: "Join small units into long chains, test threads, heat plastics, and see what rots away.",
  color: "tangent",
  levels: ["chains-and-threads", "soften-or-set", "rot-or-remain"],
});
