import { defineWorld } from "@ise/game-engine";

export const changesAroundUsWorld = defineWorld({
  id: "changes-around-us",
  title: "Changes Around Us",
  tagline: "Solids, liquids and gases — and the difference between a change you can undo and one you cannot.",
  color: "tangent",
  levels: ["melt-boil-change-back", "can-you-undo-it"],
});
