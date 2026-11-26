import { defineWorld } from "@ise/game-engine";

export const movingChargesWorld = defineWorld({
  id: "moving-charges",
  title: "Moving Charges and Magnetism",
  tagline: "Charges that circle, currents that push on each other, and the fields that currents make.",
  color: "curve",
  levels: ["circling-charges", "pushes-on-currents", "fields-of-currents"],
});
