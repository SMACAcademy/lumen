import { defineWorld } from "@ise/game-engine";

export const airAndWindWorld = defineWorld({
  id: "air-and-wind",
  title: "Air Pressure, Winds and Storms",
  tagline: "Air presses on everything, fast air presses less, and uneven heating makes the wind.",
  color: "sine",
  levels: ["air-presses-all-round", "fast-air-low-pressure", "winds-and-cyclones"],
});
