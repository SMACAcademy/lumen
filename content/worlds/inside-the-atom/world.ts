import { defineWorld } from "@ise/game-engine";

export const insideTheAtomWorld = defineWorld({
  id: "inside-the-atom",
  title: "Inside the Atom",
  tagline: "Protons, neutrons and electron shells, the periodic table they build — and isotopes.",
  color: "cosine",
  levels: ["electron-shells", "the-modern-table", "isotopes-and-isobars"],
});
