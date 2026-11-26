"use client";

import type { VariableWriteMode } from "@ise/science-engine";
import {
  type GraphDescriptor,
  type LabTheme,
  type PickResult,
  colorForRole,
  fallbackTheme,
  fitCanvas,
  readTheme,
} from "@ise/simulation-renderer";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { formatQuantity } from "@/lib/format";
import { useLab } from "@/lib/lab-context";
import { useLabSelector } from "@/lib/useLabSession";

/** Re-read canvas colours whenever the theme attributes change. */
export function useCanvasTheme(): LabTheme {
  const [theme, setTheme] = useState<LabTheme>(fallbackTheme);
  useEffect(() => {
    const root = document.documentElement;
    const update = () => setTheme(readTheme(root));
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme", "data-contrast"] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** `interactive={false}` turns off direct manipulation (e.g. while estimating). */
export function SimulationStage({ interactive = true }: { interactive?: boolean } = {}) {
  const { concept, session, renderer, ui, mode, emit, quantities } = useLab();
  const theme = useCanvasTheme();
  const [containerRef, width] = useElementWidth<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRegion = useRef<string | null>(null);
  const [cursor, setCursor] = useState("default");

  const graphs: GraphDescriptor[] = useMemo(
    () =>
      mode.graphs.flatMap((id) => {
        const g = concept.graphs.find((graph) => graph.id === id);
        if (!g) return [];
        return [
          {
            id: g.id,
            role: g.role,
            orientation: g.orientation,
            xLabel: g.xLabel,
            yLabel: g.yLabel,
            xDomain: g.xDomain,
            xAxis: g.xAxis,
            yDomain: g.yDomain,
            traceOffset: g.traceOffset,
            guides: (g.guides ?? []).flatMap((guide) => {
              const q = quantities.get(guide.quantity);
              return q ? [{ result: q.result, label: guide.label, color: colorForRole(theme, guide.color) }] : [];
            }),
            connector: g.connector,
            series: g.series.map((s) => ({ ...s, color: colorForRole(theme, s.color) })),
          },
        ];
      }),
    [concept.graphs, mode.graphs, theme, quantities],
  );

  const layers = useMemo(() => {
    const set = new Set(mode.layers);
    if (!ui.showLabels) set.delete("labels");
    return set;
  }, [mode.layers, ui.showLabels]);

  const options = concept.visualization.options;
  const layout = useMemo(
    () => (width > 0 ? renderer.layout(width, graphs, layers, options ?? {}) : null),
    [renderer, width, graphs, layers, options],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layout) return;
    const ctx = fitCanvas(canvas, layout.width, layout.height);
    if (!ctx) return;
    const snap = session.getSnapshot();
    renderer.draw(ctx, layout, {
      results: snap.results,
      trace: snap.trace,
      layers,
      highlight: ui.highlight,
      theme,
      angleUnit: ui.angleUnit,
      graphs,
    });
  }, [layout, session, renderer, layers, ui.highlight, ui.angleUnit, theme, graphs]);

  // Redraw on every engine change, coalesced to one draw per animation frame.
  useEffect(() => {
    let raf = 0;
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(() => ((raf = 0), draw()));
    };
    draw();
    const unsubscribe = session.subscribe(schedule);
    return () => {
      unsubscribe();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [session, draw]);

  const localPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top] as const;
  };

  const pick = (x: number, y: number, locked?: string) =>
    interactive && layout && renderer.pick ? renderer.pick(layout, x, y, locked, session.getSnapshot().results) : null;

  const apply = (hit: PickResult, mode: VariableWriteMode) => {
    for (const w of hit.writes) session.setVariable(w.variable, w.value, mode);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const [x, y] = localPoint(event);
    const hit = pick(x, y);
    if (!hit) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRegion.current = hit.region;
    session.pause();
    apply(hit, hit.press ?? "sweep");
    emit("drag");
    setCursor("grabbing");
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const [x, y] = localPoint(event);
    if (dragRegion.current) {
      const hit = pick(x, y, dragRegion.current);
      if (hit) apply(hit, "sweep");
      return;
    }
    setCursor(pick(x, y) ? "grab" : "default");
  };

  const endDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRegion.current) return;
    dragRegion.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setCursor("grab");
  };

  // Text alternative for screen readers, updated at a readable granularity.
  const headline = useMemo(() => concept.quantities.filter((q) => q.headline), [concept.quantities]);
  const summary = useLabSelector(session, (snap) => {
    const values = headline.map((q) => `${q.symbol} = ${formatQuantity(q, snap.results, ui.angleUnit)}`).join(", ");
    return `${mode.label} mode. ${values}.`;
  });

  return (
    <div ref={containerRef} className="relative w-full">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`${concept.meta.title}. ${summary} ${concept.visualization.hint ?? ""}`.trim()}
        className="block touch-none select-none"
        style={{ cursor, height: layout?.height ?? 360 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={() => !dragRegion.current && setCursor("default")}
      />
    </div>
  );
}
