import { defineWorld } from "@ise/game-engine";

export const identitiesAndPolynomialsWorld = defineWorld({
  id: "identities-and-polynomials",
  title: "Identities, Factors and Polynomials",
  tagline: "Squares cut into pieces, tiles that close into rectangles, and the remainder that is always p(a).",
  color: "tangent",
  levels: ["squares-of-tiles", "tiles-into-rectangles", "zeroes-and-remainders"],
});
