import { defineWorld } from "@ise/game-engine";

export const potentialAndCapacitanceWorld = defineWorld({
  id: "potential-and-capacitance",
  title: "Potential and Capacitance",
  tagline: "Hills of potential around charges, a metal shield, and two plates that store charge and energy.",
  color: "angle",
  levels: ["hills-of-potential", "storing-charge", "capacitors-together"],
});
