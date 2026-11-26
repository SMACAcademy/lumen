"use client";

import type { Results } from "@ise/science-engine";
import type { AngleUnit } from "@ise/units";
import { Fragment } from "react";
import { useLab } from "@/lib/lab-context";
import { formatQuantity } from "@/lib/format";

/**
 * Minimal rich text for concept content: **bold**, *italic* and {{quantityId}}, which
 * is replaced by the live, formatted model value.
 */
export function RichText({ text, results, angleUnit }: { text: string; results: Results; angleUnit: AngleUnit }) {
  const { quantities } = useLab();
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\{\{\w+\}\})/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-ink">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.length > 2 && part.startsWith("*") && part.endsWith("*")) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        const ref = /^\{\{(\w+)\}\}$/.exec(part)?.[1];
        if (ref) {
          const q = quantities.get(ref);
          return (
            <span key={i} className="rounded bg-surface-2 px-1 font-mono text-[0.95em] tabular-nums text-ink">
              {q ? formatQuantity(q, results, angleUnit) : part}
            </span>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
