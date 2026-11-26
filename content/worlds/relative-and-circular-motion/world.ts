import { defineWorld } from "@ise/game-engine";

export const relativeAndCircularMotionWorld = defineWorld({
  id: "relative-and-circular-motion",
  title: "Relative and Circular Motion",
  tagline: "A ball thrown up, two cars, a river, the rain, a circle and a slope.",
  color: "sine",
  levels: ["up-and-down", "along-the-road", "rivers-and-rain", "circles-and-slopes"],
});
