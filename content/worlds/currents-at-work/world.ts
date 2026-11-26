import { defineWorld } from "@ise/game-engine";

export const currentsAtWorkWorld = defineWorld({
  id: "currents-at-work",
  title: "Currents at Work",
  tagline: "Hot wires and fuses, electromagnets and field lines, motors and generators.",
  color: "angle",
  levels: ["heat-and-fuses", "magnets-from-current", "motors-and-generators"],
});
