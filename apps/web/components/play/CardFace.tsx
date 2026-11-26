"use client";

import { type Card, type Step, cardResults } from "@ise/game-engine";
import { fitCanvas } from "@ise/simulation-renderer";
import { useEffect, useMemo, useRef } from "react";
import { useLab } from "@/lib/lab-context";
import { useCanvasTheme } from "../lab/SimulationStage";
import { Pictogram } from "./Pictogram";

const THUMB_WIDTH = 132;

/**
 * What a card shows: its picture, its words, and — when the step asks for it —
 * a small drawing of its state, made by the level's own renderer so it looks
 * like the simulation.
 */
export function CardFace({ card, step }: { card: Card; step: Step }) {
  return (
    <span className="flex flex-col items-center gap-1 text-center">
      {card.icon && <Pictogram name={card.icon} className="text-accent" />}
      {card.given && "drawCards" in step && step.drawCards && <Thumbnail card={card} step={step} />}
      <span className="font-display text-sm font-bold leading-tight">{card.label}</span>
    </span>
  );
}

function Thumbnail({ card, step }: { card: Card; step: Step }) {
  const { concept, model, renderer, mode, ui } = useLab();
  const theme = useCanvasTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const results = useMemo(() => cardResults(concept, model, step, card), [concept, model, step, card]);
  const layers = useMemo(() => {
    const set = new Set(mode.layers);
    set.delete("labels");
    return set;
  }, [mode.layers]);
  const layout = useMemo(() => renderer.layout(THUMB_WIDTH, [], layers, concept.visualization.options ?? {}), [renderer, layers, concept]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !results) return;
    const ctx = fitCanvas(canvas, layout.width, layout.height);
    if (!ctx) return;
    renderer.draw(ctx, layout, { results, trace: null, layers, highlight: null, theme, angleUnit: ui.angleUnit, graphs: [] });
  }, [renderer, layout, results, layers, theme, ui.angleUnit]);

  return <canvas ref={canvasRef} aria-hidden className="max-h-24 w-full max-w-[132px] rounded-lg" />;
}
