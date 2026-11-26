import type { Pictogram as PictogramName } from "@ise/game-engine";
import type { SVGProps } from "react";

/**
 * The pictures cards can carry: simple line drawings in the same style as the
 * app's icons, so every device shows the same thing (emoji do not).
 */
const SHAPES: Record<PictogramName, React.ReactNode> = {
  magnet: (
    <>
      <path d="M6 4v8a6 6 0 0 0 12 0V4" />
      <path d="M6 4h3.5v8a2.5 2.5 0 0 0 5 0V4H18" />
      <path d="M6 8h3.5M14.5 8H18" />
    </>
  ),
  nail: (
    <>
      <path d="M8 4h8" />
      <path d="M12 4v13l-1 3M12 17l1 3" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="5" />
    </>
  ),
  eraser: (
    <>
      <path d="M4 15l8-8 7 7-5 5H9z" />
      <path d="M9 10l7 7M9 19h11" />
    </>
  ),
  "paper-clip": <path d="M9 7v9a3 3 0 0 0 6 0V6a2 2 0 0 0-4 0v9a1 1 0 0 0 2 0V8" />,
  spoon: (
    <>
      <ellipse cx="12" cy="7" rx="3.5" ry="4" />
      <path d="M12 11v9" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="12" r="4" />
      <path d="M12 12h9M18 12v3M21 12v2" />
    </>
  ),
  wood: (
    <>
      <rect x="3" y="8" width="18" height="8" rx="1.5" />
      <path d="M7 8v8M3 12h4M11 10.5c2 1 4 1 7 0M11 13.5c2 1 4 1 7 0" />
    </>
  ),
  glass: (
    <>
      <path d="M7 4h10l-1.5 16h-7z" />
      <path d="M7.6 10h8.8" />
    </>
  ),
  lemon: (
    <>
      <ellipse cx="12" cy="12" rx="8" ry="6" />
      <path d="M4 12h-1M21 12h-1M12 6v12M8 8l8 8M16 8l-8 8" />
    </>
  ),
  soap: (
    <>
      <rect x="4" y="10" width="16" height="9" rx="3" />
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="14" cy="5" r="2" />
    </>
  ),
  ice: (
    <>
      <path d="M5 8l7-4 7 4v8l-7 4-7-4z" />
      <path d="M5 8l7 4 7-4M12 12v8" />
    </>
  ),
  water: <path d="M12 3c3 4.5 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-6.5 6-11z" />,
  steam: (
    <>
      <path d="M8 20c-2-2 2-4 0-6s2-4 0-6" />
      <path d="M13 20c-2-2 2-4 0-6s2-4 0-6" />
      <path d="M18 20c-2-2 2-4 0-6s2-4 0-6" />
    </>
  ),
  flame: <path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 1 1 2 2 2 3 0-3 1-5 1-7z" />,
  bulb: (
    <>
      <path d="M9 17h6M10 20h4" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.5.4.5 1.1.5 1.6V17h6v-1.5c0-.5 0-1.2.5-1.6A6 6 0 0 0 12 3z" />
    </>
  ),
  battery: (
    <>
      <rect x="3" y="8" width="16" height="8" rx="1.5" />
      <path d="M21 11v2M7 12h4M9 10v4" />
    </>
  ),
  cork: (
    <>
      <path d="M8 6h8l-1.5 13h-5z" />
      <path d="M8 6a4 1.5 0 0 0 8 0M11 11h.01M13 14h.01M11 16h.01" />
    </>
  ),
  rock: <path d="M4 16l3-7 5-3 5 2 3 6-2 4H6z" />,
  feather: (
    <>
      <path d="M20 4C11 4 6 9 6 18l0 2" />
      <path d="M20 4c0 8-5 13-14 14M11 9l3 3M9 13l3 2" />
    </>
  ),
};

export function Pictogram({ name, ...props }: { name: PictogramName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={28}
      height={28}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      data-pictogram={name}
      {...props}
    >
      {SHAPES[name]}
    </svg>
  );
}
