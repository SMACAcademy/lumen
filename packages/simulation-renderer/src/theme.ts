/**
 * Colours used by canvas renderers. They are read from CSS custom properties
 * (--lab-*) so light/dark/high-contrast themes are defined once, in CSS.
 */

export interface LabTheme {
  background: string;
  grid: string;
  axis: string;
  text: string;
  muted: string;
  sine: string;
  cosine: string;
  tangent: string;
  angle: string;
  point: string;
  neutral: string;
  curve: string;
  secant: string;
  reference: string;
  vector: string;
  /** Panel colours, for instruments drawn on the canvas. */
  surface: string;
  surface2: string;
  accent: string;
  font: string;
  fontStrong: string;
}

export const fallbackTheme: LabTheme = {
  background: "#0b1020",
  grid: "rgba(148,163,184,0.12)",
  axis: "rgba(203,213,225,0.55)",
  text: "#e2e8f0",
  muted: "#94a3b8",
  sine: "#38bdf8",
  cosine: "#f472b6",
  tangent: "#a3e635",
  angle: "#fbbf24",
  point: "#f8fafc",
  neutral: "#cbd5e1",
  curve: "#a78bfa",
  secant: "#fb923c",
  reference: "#64748b",
  vector: "#e879f9",
  surface: "#0e1528",
  surface2: "#141d35",
  accent: "#818cf8",
  font: "12px ui-sans-serif, system-ui, sans-serif",
  fontStrong: "600 13px ui-sans-serif, system-ui, sans-serif",
};

const VARS: Record<Exclude<keyof LabTheme, "font" | "fontStrong">, string> = {
  background: "--lab-canvas",
  grid: "--lab-grid",
  axis: "--lab-axis",
  text: "--lab-text",
  muted: "--lab-muted",
  sine: "--lab-sine",
  cosine: "--lab-cosine",
  tangent: "--lab-tangent",
  angle: "--lab-angle",
  point: "--lab-point",
  neutral: "--lab-neutral",
  curve: "--lab-curve",
  secant: "--lab-secant",
  reference: "--lab-reference",
  surface: "--lab-surface",
  surface2: "--lab-surface-2",
  accent: "--lab-accent",
  vector: "--lab-vector",
};

export function readTheme(element: Element): LabTheme {
  const style = getComputedStyle(element);
  const theme = { ...fallbackTheme };
  for (const [key, cssVar] of Object.entries(VARS) as [keyof typeof VARS, string][]) {
    const value = style.getPropertyValue(cssVar).trim();
    if (value) theme[key] = value;
  }
  const family = style.getPropertyValue("--lab-font").trim();
  if (family) {
    theme.font = `12px ${family}`;
    theme.fontStrong = `600 13px ${family}`;
  }
  return theme;
}

/** Resolve a semantic colour role (from a concept definition) to a theme colour. */
export function colorForRole(theme: LabTheme, role: string): string {
  switch (role) {
    case "sine":
      return theme.sine;
    case "cosine":
      return theme.cosine;
    case "tangent":
      return theme.tangent;
    case "angle":
      return theme.angle;
    case "curve":
      return theme.curve;
    case "secant":
      return theme.secant;
    case "reference":
      return theme.reference;
    case "vector":
      return theme.vector;
    case "point":
      return theme.point;
    default:
      return theme.neutral;
  }
}
