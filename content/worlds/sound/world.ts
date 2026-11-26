import { defineWorld } from "@ise/game-engine";

export const soundWorld = defineWorld({
  id: "sound",
  title: "Sound",
  tagline: "Vibrations passed on through stuff: pitch, loudness, speed — and echoes.",
  color: "sine",
  levels: ["making-waves", "echoes"],
});
