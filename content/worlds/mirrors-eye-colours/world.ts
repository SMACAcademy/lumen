import { defineWorld } from "@ise/game-engine";

export const mirrorsEyeColoursWorld = defineWorld({
  id: "mirrors-eye-colours",
  title: "Mirrors, the Eye and Colours",
  tagline: "Curved mirrors, the eye and its spectacles, and the colours of a prism, a rainbow and the sky.",
  color: "angle",
  levels: ["curved-mirrors", "seeing-clearly", "rainbow-and-sky"],
});
