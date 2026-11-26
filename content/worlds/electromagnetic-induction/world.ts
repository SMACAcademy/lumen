import { defineWorld } from "@ise/game-engine";

export const electromagneticInductionWorld = defineWorld({
  id: "electromagnetic-induction",
  title: "Electromagnetic Induction",
  tagline: "A magnet pushed into a coil, a rod sliding on rails, a plate braked by eddy currents and a coil spinning into a generator.",
  color: "sine",
  levels: ["changing-flux", "rods-and-brakes", "coils-and-generators"],
});
