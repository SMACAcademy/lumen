import { defineWorld } from "@ise/game-engine";

export const aminesAndBiomoleculesWorld = defineWorld({
  id: "amines-and-biomolecules",
  title: "Amines and Biomolecules",
  tagline: "Organic bases and the dyes made from them, then the sugars, proteins and DNA of living things.",
  color: "cosine",
  levels: ["how-basic-is-an-amine", "from-nitro-to-azo-dyes", "sugars-and-starches", "proteins-vitamins-and-dna"],
});
