import { defineWorld } from "@ise/game-engine";

export const floatOrSinkWorld = defineWorld({
  id: "float-or-sink",
  title: "Float or Sink",
  tagline: "Why a ship floats and a pin sinks, and the push of water that holds things up.",
  color: "sine",
  levels: ["heavy-is-not-the-question", "the-push-of-water"],
});
