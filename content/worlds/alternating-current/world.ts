import { defineWorld } from "@ise/game-engine";

export const alternatingCurrentWorld = defineWorld({
  id: "alternating-current",
  title: "Alternating Current",
  tagline: "Phasors, resonance, transformers — and the waves of E and B that carry light.",
  color: "sine",
  levels: ["ac-phase-and-rms", "ac-resonance-and-power", "em-waves-and-spectrum"],
});
