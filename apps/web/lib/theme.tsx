"use client";

import { useEffect } from "react";
import { useProgress } from "./progress";

/**
 * Appearance lives in the learner's preferences, but the page has to be dressed
 * before the first paint — and reading stored progress is asynchronous. So the
 * chosen theme is mirrored into localStorage, where the small script in the
 * document head can find it immediately, and this component keeps the two in
 * step afterwards.
 */
export function ThemeSync() {
  const { snapshot, loaded } = useProgress();
  const { theme, highContrast, reducedMotion } = snapshot.preferences;

  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)").matches ?? false;
    const resolved = theme === "system" ? (prefersLight ? "light" : "dark") : theme;
    root.dataset.theme = resolved;
    root.dataset.contrast = highContrast ? "high" : "normal";
    root.dataset.motion = reducedMotion ? "reduced" : "full";
    try {
      localStorage.setItem("lab-theme", resolved);
      localStorage.setItem("lab-contrast", highContrast ? "high" : "normal");
      localStorage.setItem("lab-motion", reducedMotion ? "reduced" : "full");
    } catch {
      /* storage blocked: the theme still applies for this session */
    }
  }, [loaded, theme, highContrast, reducedMotion]);

  // Following the system theme means following it as it changes.
  useEffect(() => {
    if (!loaded || theme !== "system") return;
    const query = window.matchMedia?.("(prefers-color-scheme: light)");
    if (!query) return;
    const apply = () => {
      document.documentElement.dataset.theme = query.matches ? "light" : "dark";
    };
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [loaded, theme]);

  return null;
}
