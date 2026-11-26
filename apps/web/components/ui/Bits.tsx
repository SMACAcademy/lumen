"use client";

import { roleVar } from "@/lib/colors";
import { StarIcon } from "../icons";

/** A progress ring, used for the daily goal. */
export function Ring({
  value,
  size = 64,
  stroke = 7,
  color = "var(--lab-accent)",
  children,
}: {
  /** 0 to 1. */
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--lab-surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.max(0, Math.min(1, value)))}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

/** Stars earned out of three. */
export function Stars({ count, size = 14 }: { count: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${count} of 3 stars`}>
      {[1, 2, 3].map((n) => (
        <StarIcon
          key={n}
          width={size}
          height={size}
          strokeWidth={1.5}
          className={n <= count ? "fill-angle text-angle" : "fill-transparent text-line"}
        />
      ))}
    </span>
  );
}

/** A horizontal progress bar in a world's colour. */
export function Bar({ value, color = "var(--lab-accent)" }: { value: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`, background: color }}
      />
    </div>
  );
}

/**
 * An avatar generated from a seed: an orbiting point, which is also the first
 * thing the learner ever touched. No image, no upload, no personal data.
 */
export function Avatar({ seed, size = 44 }: { seed: string; size?: number }) {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const angle = (hash % 360) * (Math.PI / 180);
  const hue = ["sine", "cosine", "tangent", "vector", "curve", "angle"][hash % 6]!;
  const color = roleVar(hue as Parameters<typeof roleVar>[0]);
  const r = size / 2;
  const orbit = r * 0.62;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="shrink-0">
      <circle cx={r} cy={r} r={r - 1} fill="var(--lab-surface-2)" stroke="var(--lab-border)" />
      <circle cx={r} cy={r} r={orbit} fill="none" stroke={color} strokeOpacity={0.45} strokeWidth={1.5} />
      <circle cx={r + orbit * Math.cos(angle)} cy={r - orbit * Math.sin(angle)} r={size * 0.11} fill={color} />
    </svg>
  );
}

/** A labelled on/off switch. */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-8 w-14 shrink-0 rounded-full border transition ${
        checked ? "border-transparent bg-accent" : "border-line bg-surface-2"
      }`}
    >
      <span
        className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow ring-1 ring-black/10 transition-[left] duration-200 ${checked ? "left-7" : "left-1"}`}
        aria-hidden
      />
    </button>
  );
}

/** A small set of mutually exclusive choices. */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-xl border border-line bg-surface-2 p-0.5">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`font-display h-9 rounded-lg px-3 text-sm font-semibold transition ${
            value === option.value ? "bg-surface text-ink shadow" : "text-muted hover:text-ink"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
