import { defineWorld } from "@ise/game-engine";

export const enthalpyWorld = defineWorld({
  id: "enthalpy",
  title: "Enthalpy",
  tagline: "Heat in, heat out, and why every route between the same two points gives the same ΔH.",
  color: "secant",
  levels: ["hot-and-cold", "hess-cycles"],
});
