import { defineWorld } from "@ise/game-engine";

export const forcesPressureGravityWorld = defineWorld({
  id: "forces-pressure-gravity",
  title: "Forces, Pressure and Gravity",
  tagline: "Pushes and friction, force spread over an area, and the pull of every mass.",
  color: "secant",
  levels: ["push-and-rub", "sharp-and-wide", "the-pull-of-gravity"],
});
