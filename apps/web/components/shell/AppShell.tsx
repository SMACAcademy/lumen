"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { useProgress } from "@/lib/progress";
import {
  AtomIcon,
  BookIcon,
  CompassIcon,
  FlaskIcon,
  HomeIcon,
  MapIcon,
  ReviseIcon,
  SigmaIcon,
  SparkIcon,
  TargetIcon,
} from "../icons";
import { Avatar } from "../ui/Bits";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;
interface NavItem {
  href: string;
  label: string;
  icon: Icon;
  /** A subject colour for the icon, when the item is a subject. */
  color?: string;
}

/** Where every learner goes most: on the phone tab bar and at the top of the rail. */
export const PRIMARY: readonly NavItem[] = [
  { href: "/home", label: "Home", icon: HomeIcon },
  { href: "/learn", label: "Learn", icon: MapIcon },
  { href: "/practice", label: "Practice", icon: TargetIcon },
  { href: "/revise", label: "Revise", icon: ReviseIcon },
];

export const SUBJECT_NAV: readonly NavItem[] = [
  { href: "/subjects/maths", label: "Maths", icon: SigmaIcon, color: "var(--subject-maths)" },
  { href: "/subjects/physics", label: "Physics", icon: AtomIcon, color: "var(--subject-physics)" },
  { href: "/subjects/chemistry", label: "Chemistry", icon: FlaskIcon, color: "var(--subject-chemistry)" },
];

const MORE: readonly NavItem[] = [
  { href: "/syllabus", label: "Syllabus", icon: CompassIcon },
  { href: "/journal", label: "Journal", icon: BookIcon },
];

/** Playing a level or an arcade round, or working in a lab, is full-screen: no navigation in the way. */
function isFocusMode(pathname: string): boolean {
  return pathname.startsWith("/play/") || pathname.startsWith("/lab/") || pathname.startsWith("/arcade/");
}

/**
 * The frame around every signed-in screen: a bottom tab bar on phones, a glass
 * side rail from `md` up. It knows nothing about the screens themselves.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/home";
  if (isFocusMode(pathname)) return <>{children}</>;

  return (
    <div className="md:flex">
      <SideRail pathname={pathname} />
      <div className="min-w-0 flex-1 pb-24 md:pb-0">{children}</div>
      <TabBar pathname={pathname} />
    </div>
  );
}

function active(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function RailLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const on = active(pathname, item.href);
  return (
    <Link
      href={item.href}
      aria-current={on ? "page" : undefined}
      className={`font-display flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${
        on ? "bg-accent/15 text-ink" : "text-muted hover:bg-surface-2/70 hover:text-ink"
      }`}
    >
      <item.icon width={18} height={18} style={{ color: item.color ?? (on ? "var(--lab-accent)" : undefined) }} />
      {item.label}
    </Link>
  );
}

function RailHeading({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted/80">{children}</p>;
}

function SideRail({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Sections" className="glass-strong sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-0.5 overflow-y-auto border-y-0 border-l-0 px-3 py-5 md:flex">
      <Link href="/home" className="font-display mb-3 px-3 text-lg font-extrabold tracking-tight text-ink">
        <SparkIcon className="mr-1.5 inline text-accent" width={18} height={18} />
        Lumen
      </Link>
      {PRIMARY.map((item) => (
        <RailLink key={item.href} item={item} pathname={pathname} />
      ))}
      <RailHeading>Subjects</RailHeading>
      {SUBJECT_NAV.map((item) => (
        <RailLink key={item.href} item={item} pathname={pathname} />
      ))}
      <RailHeading>More</RailHeading>
      {MORE.map((item) => (
        <RailLink key={item.href} item={item} pathname={pathname} />
      ))}
      <div className="mt-auto space-y-0.5 pt-4">
        <ProfileLink pathname={pathname} />
      </div>
    </nav>
  );
}

function ProfileLink({ pathname }: { pathname: string }) {
  const { snapshot } = useProgress();
  const on = active(pathname, "/profile");
  const name = snapshot.profile.name?.trim();
  return (
    <Link
      href="/profile"
      aria-current={on ? "page" : undefined}
      className={`font-display flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${
        on ? "bg-accent/15 text-ink" : "text-muted hover:bg-surface-2/70 hover:text-ink"
      }`}
    >
      <Avatar seed={snapshot.profile.avatarSeed + (name ?? "")} size={24} />
      {name || "Profile"}
    </Link>
  );
}

function TabBar({ pathname }: { pathname: string }) {
  const { snapshot } = useProgress();
  const name = snapshot.profile.name?.trim();
  return (
    <nav
      aria-label="Sections"
      className="glass-strong fixed inset-x-0 bottom-0 z-20 flex border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {PRIMARY.map((tab) => {
        const on = active(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={on ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition ${
              on ? "text-accent" : "text-muted"
            }`}
          >
            <tab.icon width={20} height={20} />
            {tab.label}
          </Link>
        );
      })}
      <Link
        href="/profile"
        aria-current={active(pathname, "/profile") ? "page" : undefined}
        className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition ${
          active(pathname, "/profile") ? "text-accent" : "text-muted"
        }`}
      >
        <Avatar seed={snapshot.profile.avatarSeed + (name ?? "")} size={20} />
        You
      </Link>
    </nav>
  );
}
