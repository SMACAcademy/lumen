"use client";

import type { Quantity } from "@ise/concept-schema";
import { useEffect, useState } from "react";
import { ROLE_BORDER, ROLE_TEXT } from "@/lib/colors";
import { useLab } from "@/lib/lab-context";
import { formatQuantity } from "@/lib/format";
import { useLabSelector, useLabSnapshot } from "@/lib/useLabSession";

export { ROLE_TEXT };

/** Hover/focus handlers that emphasise a quantity's layer in the simulation. */
export function useHighlight(quantity: Quantity | undefined) {
  const { dispatch } = useLab();
  const layer = quantity?.highlight ?? null;
  return {
    onMouseEnter: () => layer && dispatch({ type: "setHighlight", layer }),
    onMouseLeave: () => layer && dispatch({ type: "setHighlight", layer: null }),
    onFocus: () => layer && dispatch({ type: "setHighlight", layer }),
    onBlur: () => layer && dispatch({ type: "setHighlight", layer: null }),
  };
}

/** The big, always-visible readouts (θ, sin θ, cos θ). */
export function LiveValues() {
  const { concept } = useLab();
  const headline = concept.quantities.filter((q) => q.headline);
  return (
    <>
      <div className="grid grid-cols-3 gap-2" aria-label="Live values">
        {headline.map((q) => (
          <HeadlineValue key={q.id} quantity={q} />
        ))}
      </div>
      <ValueAnnouncer quantities={headline} />
    </>
  );
}

/**
 * Screen-reader announcement of the headline values. Silent while playing
 * (60 updates a second would be noise); speaks once the point comes to rest.
 */
function ValueAnnouncer({ quantities }: { quantities: Quantity[] }) {
  const { session, ui } = useLab();
  const message = useLabSelector(session, (snap) =>
    snap.playback.playing
      ? ""
      : quantities.map((q) => `${q.symbol} ${formatQuantity(q, snap.results, ui.angleUnit)}`).join(", "),
  );
  const [spoken, setSpoken] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setSpoken(message), 400);
    return () => clearTimeout(id);
  }, [message]);
  return (
    <p className="sr-only" aria-live="polite" aria-atomic="true">
      {spoken}
    </p>
  );
}

function HeadlineValue({ quantity }: { quantity: Quantity }) {
  const { session, ui, mode } = useLab();
  const snap = useLabSnapshot(session);
  const handlers = useHighlight(quantity);
  // Dim the projection that the current mode does not show.
  const hidden = quantity.highlight !== undefined && !mode.layers.includes(quantity.highlight);
  return (
    <div
      tabIndex={0}
      {...handlers}
      title={quantity.meaning}
      className={`rounded-xl border-l-4 bg-surface-2/70 px-3 py-2 outline-none transition ${ROLE_BORDER[quantity.color]} ${
        hidden ? "opacity-45" : ""
      } hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent`}
    >
      <div className={`math text-sm ${ROLE_TEXT[quantity.color]}`}>{quantity.symbol}</div>
      <div className="font-mono text-xl font-semibold tabular-nums text-ink sm:text-2xl">
        {formatQuantity(quantity, snap.results, ui.angleUnit)}
      </div>
    </div>
  );
}

/** Secondary measurements, generated from the concept's quantity list. */
export function ResultsPanel() {
  const { concept, session, ui } = useLab();
  const snap = useLabSnapshot(session);
  const others = concept.quantities.filter((q) => !q.headline);
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3" aria-label="Measurements">
      {others.map((q) => (
        <ResultRow key={q.id} quantity={q} value={formatQuantity(q, snap.results, ui.angleUnit)} />
      ))}
    </dl>
  );
}

function ResultRow({ quantity, value }: { quantity: Quantity; value: string }) {
  const handlers = useHighlight(quantity);
  return (
    <div
      tabIndex={0}
      {...handlers}
      title={quantity.meaning}
      className="flex items-baseline justify-between gap-2 rounded-lg px-2 py-1 outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent"
    >
      <dt className="truncate text-xs text-muted">
        <span className={`math mr-1 ${ROLE_TEXT[quantity.color]}`}>{quantity.symbol}</span>
        <span className="hidden sm:inline">{quantity.name}</span>
      </dt>
      <dd className="font-mono text-sm tabular-nums text-ink">{value}</dd>
    </div>
  );
}
