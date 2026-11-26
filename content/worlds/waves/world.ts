import { defineWorld } from "@ise/game-engine";

export const wavesWorld = defineWorld({
  id: "waves",
  title: "Waves",
  tagline: "A wave that travels, waves that add, notes that fit in a pipe — and a siren that drops in pitch.",
  color: "sine",
  levels: ["travelling-waves", "standing-waves", "beats-and-doppler"],
});
