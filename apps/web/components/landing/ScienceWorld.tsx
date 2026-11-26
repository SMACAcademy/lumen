"use client";

import { useEffect, useRef, useState } from "react";
import { SUBJECT_INFO } from "@/lib/subjects";
import { CAMERA_END_Z, CAMERA_START_Z, cameraZAt, WORLD_OBJECTS } from "./objects";
import type { ScenePalette, ScienceScene } from "./scene";

/**
 * The 3D science world behind the front door. In "scroll" mode the camera
 * flies through it as the page scrolls: any element with `data-world-z` is a
 * stop, and the camera reaches that depth when the element is centred. In
 * "ambient" mode it drifts through on its own, for pages that do not scroll.
 *
 * It is decoration, so it is hidden from assistive technology, and it steps
 * aside entirely — leaving a still gradient — when WebGL is unavailable.
 * Page content goes above it with `relative z-10`.
 */
export function ScienceWorld({ mode = "scroll" }: { mode?: "scroll" | "ambient" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRefs = useRef<(HTMLElement | null)[]>([]);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const theme = useThemeKey();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !theme) return;
    if (!hasWebGL()) {
      setFailed(true);
      return;
    }
    const still = prefersStillness();
    let scene: ScienceScene | null = null;
    let raf = 0;
    let stops: { at: number; z: number }[] = [];
    let cancelled = false;

    const measure = () => {
      stops = Array.from(document.querySelectorAll<HTMLElement>("[data-world-z]")).map((el) => {
        const rect = el.getBoundingClientRect();
        const top = rect.top + window.scrollY;
        return { at: Math.max(0, top + rect.height / 2 - window.innerHeight / 2), z: Number(el.dataset.worldZ) };
      });
      scene?.resize(window.innerWidth, window.innerHeight);
    };

    const targetZ = (time: number) =>
      mode === "ambient"
        ? // A slow there-and-back through the whole world, about eighty seconds each way.
          CAMERA_START_Z + (CAMERA_END_Z - CAMERA_START_Z) * (0.5 - 0.5 * Math.cos(time * 0.00004))
        : cameraZAt(window.scrollY, stops);

    const draw = (time: number) => {
      if (!scene) return;
      scene.setCameraZ(still && mode === "ambient" ? CAMERA_START_Z : targetZ(time));
      scene.frame(time);
      scene.placeLabels(labelRefs.current);
    };

    const loop = (time: number) => {
      raf = requestAnimationFrame(loop);
      if (!document.hidden) draw(time);
    };

    // In stillness mode nothing moves on its own: redraw only when the page does.
    let settle = 0;
    const redraw = () => {
      window.clearTimeout(settle);
      settle = window.setTimeout(() => draw(performance.now()), 120);
    };
    const onResize = () => {
      measure();
      if (still) redraw();
    };
    const onPointer = (event: PointerEvent) => {
      scene?.setPointer((event.clientX / window.innerWidth) * 2 - 1, -((event.clientY / window.innerHeight) * 2 - 1));
    };

    import("./scene")
      .then(({ createScienceScene }) => {
        if (cancelled) return;
        scene = createScienceScene(canvas, { palette: readPalette(), still });
        measure();
        setReady(true);
        if (still) draw(performance.now());
        else raf = requestAnimationFrame(loop);
      })
      .catch(() => setFailed(true));

    window.addEventListener("resize", onResize);
    if (still) window.addEventListener("scroll", redraw, { passive: true });
    else window.addEventListener("pointermove", onPointer, { passive: true });
    // Layout shifts (fonts arriving, sections growing) move the stops.
    const observer = new ResizeObserver(() => measure());
    observer.observe(document.body);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", redraw);
      window.removeEventListener("pointermove", onPointer);
      observer.disconnect();
      scene?.dispose();
      setReady(false);
    };
  }, [mode, theme]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* The still backdrop: all there is without WebGL, and what shows while the scene loads. */}
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_20%_20%,color-mix(in_srgb,var(--subject-maths)_22%,transparent),transparent),radial-gradient(50%_45%_at_85%_35%,color-mix(in_srgb,var(--subject-physics)_20%,transparent),transparent),radial-gradient(55%_50%_at_50%_95%,color-mix(in_srgb,var(--subject-chemistry)_18%,transparent),transparent)]" />
      {!failed && (
        <canvas
          key={theme}
          ref={canvasRef}
          className={`absolute inset-0 h-full w-full transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}
        />
      )}
      {!failed &&
        WORLD_OBJECTS.map((o, i) => (
          <span
            key={o.kind}
            ref={(el) => {
              labelRefs.current[i] = el;
            }}
            className="glass absolute left-0 top-0 whitespace-nowrap rounded-2xl px-3 py-1.5 text-left will-change-transform"
            style={{ opacity: 0, visibility: "hidden" }}
          >
            <span className="font-display flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: SUBJECT_INFO[o.subject].color }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: SUBJECT_INFO[o.subject].color }} />
              {SUBJECT_INFO[o.subject].title}
            </span>
            <span className="font-display block text-sm font-bold text-ink">{o.title}</span>
            <span className="hidden text-xs text-muted sm:block">{o.caption}</span>
          </span>
        ))}
    </div>
  );
}

function hasWebGL(): boolean {
  try {
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
    // Give the probe's context straight back; browsers allow only a few at once.
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

function prefersStillness(): boolean {
  return document.documentElement.dataset.motion === "reduced" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function readPalette(): ScenePalette {
  const css = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    maths: get("--subject-maths", "#a78bfa"),
    physics: get("--subject-physics", "#38bdf8"),
    chemistry: get("--subject-chemistry", "#34d399"),
    ink: get("--lab-text", "#e2e8f0"),
    muted: get("--lab-muted", "#8b98ad"),
    bg: get("--lab-bg", "#070b17"),
  };
}

/** Changes whenever the theme does, so the scene can be rebuilt in the new colours. */
function useThemeKey(): string {
  const [key, setKey] = useState("");
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setKey(`${root.dataset.theme ?? ""}-${root.dataset.contrast ?? ""}-${root.dataset.motion ?? ""}`);
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme", "data-contrast", "data-motion"] });
    return () => observer.disconnect();
  }, []);
  return key;
}
