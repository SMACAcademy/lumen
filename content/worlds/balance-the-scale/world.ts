import { defineWorld } from "@ise/game-engine";

export const balanceTheScaleWorld = defineWorld({
  id: "balance-the-scale",
  title: "Balance the Scale",
  tagline: "An equation is a balance — keep both sides level and the mystery weight gives itself away.",
  color: "curve",
  levels: ["find-the-mystery-weight", "same-to-both-sides"],
});
