import { defineWorld } from "@ise/game-engine";

export const skyWorld = defineWorld({
  id: "sky",
  title: "Sky",
  tagline: "Gravitation: the two speeds that decide whether you come back, and Kepler's laws that follow.",
  color: "sine",
  levels: ["newtons-cannonball", "the-long-way-round"],
});
