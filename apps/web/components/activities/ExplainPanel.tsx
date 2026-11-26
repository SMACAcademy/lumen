"use client";

import { evaluateCondition } from "@ise/science-engine";
import Link from "next/link";
import { useLab } from "@/lib/lab-context";
import { useLabSnapshot } from "@/lib/useLabSession";
import { RichText } from "./RichText";

const RELATION = { prerequisite: "← needs", "leads-to": "→ next:", related: "↔" } as const;

/** Context-sensitive explanation: sections appear when their condition holds. */
export function ExplainPanel() {
  const { concept, session, ui } = useLab();
  const snap = useLabSnapshot(session);
  const ctx = { results: snap.results, mode: ui.mode };
  const sections = concept.activities.explain.filter((s) => !s.when || evaluateCondition(s.when, ctx));

  return (
    <div className="space-y-3">
      <div aria-live="polite" className="space-y-3">
        {sections.map((s) => (
          <section key={s.id} className="rounded-xl bg-surface-2/50 p-3">
            <h3 className="text-sm font-semibold text-ink">{s.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              <RichText text={s.body} results={snap.results} angleUnit={ui.angleUnit} />
            </p>
          </section>
        ))}
      </div>

      {concept.realWorld.length > 0 && (
        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">In the real world</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {concept.realWorld.map((r) => (
              <li key={r.title} className="rounded-xl border border-line p-2.5">
                <p className="text-sm font-medium text-ink">{r.title}</p>
                <p className="text-xs text-muted">{r.description}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {concept.connections.length > 0 && (
        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Connections</h3>
          <ul className="flex flex-wrap gap-2">
            {concept.connections.map((c) => {
              const prefix = RELATION[c.relation];
              return (
                <li key={c.id} title={c.note}>
                  {c.available ? (
                    <Link
                      href={`/lab/${c.id}`}
                      className="inline-block rounded-full border border-accent/50 bg-accent/10 px-2.5 py-1 text-xs text-ink hover:bg-accent/20"
                    >
                      {prefix} {c.title}
                    </Link>
                  ) : (
                    <span className="inline-block rounded-full border border-dashed border-line px-2.5 py-1 text-xs text-muted">
                      {prefix} {c.title} <span className="text-muted/70">· soon</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
