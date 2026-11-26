"use client";

import type { FormulaCard } from "@ise/content";
import Link from "next/link";

/**
 * One formula: the lead line big, what every symbol means, and where to see
 * it move. Younger classes lead with the words; later ones with the symbols.
 * `tools` is the card's footer slot (Try it, when the lab can run it).
 */
export function FormulaCardView({ card, tools }: { card: FormulaCard; tools?: React.ReactNode }) {
  const wordsFirst = card.stage === "foundation" && card.words !== null;
  const lead = wordsFirst ? card.words! : card.symbolic;
  const second = wordsFirst ? card.symbolic : card.words;
  const id = `formula-${card.id.replace(/[^a-z0-9-]/gi, "-")}`;

  return (
    <article aria-labelledby={id} className="formula-card rounded-2xl border border-line bg-surface p-4">
      <h3 id={id} className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
        {card.title}
      </h3>
      <p data-lead className={`mt-1.5 text-ink ${wordsFirst ? "font-display text-lg font-bold leading-snug" : "math text-2xl"}`}>
        {lead}
      </p>
      {second && <p className={`mt-0.5 text-muted ${wordsFirst ? "math text-base" : "text-sm"}`}>{second}</p>}

      {card.symbols.length > 0 && (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
          {card.symbols.map((s) => (
            <div key={s.symbol} className="contents">
              <dt className="math text-right text-ink">{s.symbol}</dt>
              <dd className="text-muted">
                {s.name}
                {s.unit && <span className="text-muted/80"> ({s.unit})</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {card.reading && <p className="mt-2 text-xs leading-relaxed text-muted">{card.reading}</p>}

      {(card.lab || tools) && (
        <div className="mt-3 flex flex-wrap items-center gap-3 print:hidden">
          {tools}
          {card.lab && (
            <Link href={`/lab/${card.lab.conceptId}`} className="text-sm font-semibold text-accent hover:underline">
              Open the lab
            </Link>
          )}
        </div>
      )}
    </article>
  );
}
