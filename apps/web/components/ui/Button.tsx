"use client";

import Link from "next/link";
import { useCues } from "@/lib/cues";

/**
 * The one button in the app. It is deliberately chunky: a coloured face with a
 * solid edge underneath that compresses when pressed. Colours come from
 * `--lab-accent`, so a level played inside a world takes the world's colour
 * without passing anything down.
 */
export type ButtonTone = "primary" | "success" | "quiet" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const FACE: Record<ButtonTone, string> = {
  primary: "var(--lab-accent)",
  success: "var(--lab-success)",
  quiet: "transparent",
  danger: "transparent",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm rounded-xl",
  md: "h-11 px-5 text-sm rounded-2xl",
  lg: "h-12 px-6 text-base rounded-2xl",
};

export interface ButtonProps {
  children: React.ReactNode;
  tone?: ButtonTone;
  size?: ButtonSize;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  full?: boolean;
  type?: "button" | "submit";
  className?: string;
  /** Play the tap cue on press (default true). */
  cue?: boolean;
  "aria-label"?: string;
  "aria-pressed"?: boolean;
}

export function Button({
  children,
  tone = "primary",
  size = "md",
  href,
  onClick,
  disabled,
  full,
  type = "button",
  className = "",
  cue = true,
  ...aria
}: ButtonProps) {
  const cues = useCues();
  const solid = tone === "primary" || tone === "success";
  const classes = [
    "font-display inline-flex items-center justify-center gap-2 font-bold uppercase tracking-wide transition",
    "active:translate-y-0.5 disabled:pointer-events-none",
    SIZES[size],
    full ? "w-full" : "",
    solid
      ? disabled
        ? "bg-surface-2 text-muted"
        : "text-white hover:brightness-110"
      : disabled
        ? "border-2 border-line text-muted"
        : tone === "danger"
        ? "border-2 border-cosine/50 text-cosine hover:bg-cosine/10"
        : "border-2 border-line text-ink hover:border-accent/60",
    className,
  ].join(" ");
  // A disabled button drops its colour and its edge: it must not look pressable.
  const style =
    solid && !disabled ? { background: FACE[tone], boxShadow: `0 4px 0 0 color-mix(in srgb, ${FACE[tone]} 45%, transparent)` } : undefined;

  const press = () => {
    if (cue) cues.play("tap");
    onClick?.();
  };

  if (href && !disabled) {
    return (
      <Link href={href} className={classes} style={style} onClick={press} {...aria}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={classes} style={style} onClick={press} disabled={disabled} {...aria}>
      {children}
    </button>
  );
}
