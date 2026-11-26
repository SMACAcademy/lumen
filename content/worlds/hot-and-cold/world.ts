import { defineWorld } from "@ise/game-engine";

export const hotAndColdWorld = defineWorld({
  id: "hot-and-cold",
  title: "Hot and Cold",
  tagline: "Touch fools you, thermometers don't — and heat always flows from hot to cold.",
  color: "secant",
  levels: ["feel-it-read-it", "heat-on-the-move", "breeze-by-the-sea"],
});
