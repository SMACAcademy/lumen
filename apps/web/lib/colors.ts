import type { ColorRole } from "@ise/concept-schema";

/** Semantic colour roles → Tailwind classes and CSS variables (defined in globals.css). */

export const ROLE_TEXT: Record<ColorRole, string> = {
  sine: "text-sine",
  cosine: "text-cosine",
  tangent: "text-tangent",
  angle: "text-angle",
  point: "text-point",
  neutral: "text-neutral",
  curve: "text-curve",
  secant: "text-secant",
  reference: "text-reference",
  vector: "text-vector",
};

export const ROLE_BORDER: Record<ColorRole, string> = {
  sine: "border-sine",
  cosine: "border-cosine",
  tangent: "border-tangent",
  angle: "border-angle",
  point: "border-point",
  neutral: "border-neutral",
  curve: "border-curve",
  secant: "border-secant",
  reference: "border-reference",
  vector: "border-vector",
};

export function roleVar(role: ColorRole): string {
  return `var(--lab-${role})`;
}
