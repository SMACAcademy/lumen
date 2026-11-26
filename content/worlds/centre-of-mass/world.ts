import { defineWorld } from "@ise/game-engine";

export const centreOfMassWorld = defineWorld({
  id: "centre-of-mass",
  title: "Centre of Mass and Energy",
  tagline: "A rod that balances, a shell that bursts, a rocket, a loop and an energy curve.",
  color: "curve",
  levels: ["balance-and-break-up", "glancing-blows-and-rockets", "the-area-and-the-rate", "loops-and-hollows"],
});
