import { defineWorld } from "@ise/game-engine";

export const ionsAndOresWorld = defineWorld({
  id: "ions-and-ores",
  title: "Ionic Compounds and Extracting Metals",
  tagline: "Metals give electrons, ores give metals, and metals mix into alloys.",
  color: "secant",
  levels: ["giving-electrons", "out-of-the-ore", "mixing-metals"],
});
