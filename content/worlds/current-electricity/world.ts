import { defineWorld } from "@ise/game-engine";

export const currentElectricityWorld = defineWorld({
  id: "current-electricity",
  title: "Current Electricity",
  tagline: "Drifting electrons, cells that lose volts inside, Kirchhoff's loops and bridges that balance.",
  color: "angle",
  levels: ["drift-and-resistance", "cells-and-power", "loops-and-bridges"],
});
