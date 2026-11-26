import { defineWorld } from "@ise/game-engine";

export const photoelectricEffectWorld = defineWorld({
  id: "photoelectric-effect",
  title: "Dual Nature",
  tagline: "Light that comes in photons, a threshold no brightness can beat, and electrons that diffract like waves.",
  color: "curve",
  levels: ["light-on-a-metal", "stopping-the-electrons", "photons-and-electron-waves"],
});
