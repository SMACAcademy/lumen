import { defineWorld } from "@ise/game-engine";

export const chargesAndLightningWorld = defineWorld({
  id: "charges-and-lightning",
  title: "Charges and Lightning",
  tagline: "Rub a balloon, open an electroscope, and see why lightning strikes — and where to shelter.",
  color: "curve",
  levels: ["rub-and-attract", "foil-electroscope", "thunder-and-lightning"],
});
