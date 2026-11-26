"use client";

import { type PreferenceValue, type Preferences, currentStreak } from "@ise/progress-store";
import Link from "next/link";
import { useRef, useState } from "react";
import { createCuePlayer } from "@/lib/cues";
import { learnerClass } from "@/lib/journey";
import { useProgress } from "@/lib/progress";
import { ArrowLeftIcon } from "../icons";
import { Button } from "../ui/Button";
import { Avatar, Segmented, Toggle } from "../ui/Bits";
import { ClassPicker } from "./ClassPicker";

const GOALS = [
  { value: 20, label: "20" },
  { value: 40, label: "40" },
  { value: 60, label: "60" },
  { value: 100, label: "100" },
] as const;

/**
 * The learner's own page: who they are, how the app should look and sound,
 * and their data — which they can take with them. Nothing here leaves the
 * device.
 */
export function ProfileScreen() {
  const { snapshot, loaded, store } = useProgress();
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string | null>(null);
  const shownName = name ?? snapshot.profile.name ?? "";
  const prefs = snapshot.preferences;

  const set = (key: keyof Preferences, value: PreferenceValue) => void store.append({ type: "preference-set", payload: { key, value } });

  const download = () => {
    const blob = new Blob([JSON.stringify(store.export(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Progress saved to a file.");
  };

  const upload = async (file: File) => {
    try {
      const added = await store.import(JSON.parse(await file.text()));
      setMessage(added === 0 ? "Nothing new in that file." : `Added ${added} record${added === 1 ? "" : "s"}.`);
    } catch {
      setMessage("That file could not be read.");
    }
  };

  const reset = () => {
    if (!window.confirm("Delete all progress on this device? This cannot be undone.")) return;
    void store.clear();
    setMessage("Progress deleted.");
  };

  if (!loaded) return <div className="mx-auto mt-10 h-72 max-w-2xl animate-pulse rounded-3xl border border-line bg-surface/60" aria-hidden />;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-20 pt-6 sm:px-6">
      <Link href="/home" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink">
        <ArrowLeftIcon width={16} height={16} />
        Home
      </Link>

      <header className="mt-4 flex items-center gap-4">
        <Avatar seed={snapshot.profile.avatarSeed + shownName} size={64} />
        <div className="min-w-0 flex-1">
          <label htmlFor="name" className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Your name
          </label>
          <input
            id="name"
            value={shownName}
            placeholder="Add a name"
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              if (name !== null && name !== (snapshot.profile.name ?? "")) {
                void store.append({ type: "profile-set", payload: { name: name.trim() || null } });
              }
            }}
            className="font-display mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-lg font-semibold text-ink outline-none focus:border-accent"
          />
        </div>
      </header>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Day streak" value={`${currentStreak(snapshot)}`} />
        <Stat label="Total XP" value={`${snapshot.xp}`} />
        <Stat label="Stars" value={`${snapshot.totals.stars}`} />
        <Stat label="Laws" value={`${Object.keys(snapshot.laws).length}`} />
      </dl>

      <Section title="Learning">
        <Row label="Your class" hint="Lumen leads with your class; everything else stays open.">
          <ClassPicker
            compact
            value={snapshot.profile.yearAsked ? learnerClass(snapshot) : undefined}
            onChoose={(year) => void store.append({ type: "profile-set", payload: { year } })}
          />
        </Row>
        <Row label="Daily goal" hint="How much XP you aim for each day.">
          <Segmented label="Daily goal" value={prefs.dailyGoalXp} options={GOALS} onChange={(v) => set("dailyGoalXp", v)} />
        </Row>
        <Row label="Angles" hint="How angles are shown in labs and levels.">
          <Segmented
            label="Angle unit"
            value={prefs.angleUnit}
            options={[
              { value: "deg", label: "Degrees" },
              { value: "rad", label: "Radians" },
            ]}
            onChange={(v) => set("angleUnit", v)}
          />
        </Row>
      </Section>

      <Section title="Appearance">
        <Row label="Theme" hint="Dark suits the simulations; light suits a bright room.">
          <Segmented
            label="Theme"
            value={prefs.theme}
            options={[
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" },
              { value: "system", label: "Auto" },
            ]}
            onChange={(v) => set("theme", v)}
          />
        </Row>
        <Row label="High contrast" hint="Stronger lines and brighter labels.">
          <Toggle label="High contrast" checked={prefs.highContrast} onChange={(v) => set("highContrast", v)} />
        </Row>
        <Row label="Less motion" hint="Turns off the animations, keeping the simulations.">
          <Toggle label="Less motion" checked={prefs.reducedMotion} onChange={(v) => set("reducedMotion", v)} />
        </Row>
      </Section>

      <Section title="Feedback">
        <Row label="Sound" hint="Short tones when you answer.">
          <Toggle
            label="Sound"
            checked={prefs.sound}
            onChange={(v) => {
              set("sound", v);
              // Play a note straight away, so the learner hears what they turned on.
              if (v) createCuePlayer(true, prefs.haptics).play("correct");
            }}
          />
        </Row>
        <Row label="Vibration" hint="A tap you can feel, on phones that support it.">
          <Toggle label="Vibration" checked={prefs.haptics} onChange={(v) => set("haptics", v)} />
        </Row>
      </Section>

      <Section title="Your data">
        <p className="text-sm text-muted">
          Progress is stored on this device only. Save a copy to move it to another device — accounts and automatic sync
          come later.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button tone="quiet" onClick={download}>
            Save a copy
          </Button>
          <Button tone="quiet" onClick={() => fileInput.current?.click()}>
            Load a copy
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="sr-only"
            aria-label="Progress file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = "";
            }}
          />
          <Button tone="danger" onClick={reset}>
            Delete everything
          </Button>
        </div>
        {message && (
          <p role="status" className="text-sm text-success">
            {message}
          </p>
        )}
      </Section>

      <Section title="Privacy">
        <p className="text-sm text-muted">
          Lumen has no accounts and no tracking. Your name, progress and settings are kept only in this browser, on this
          device; nothing is sent anywhere. Export your data above to keep a copy or move it to another device.
        </p>
      </Section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-3 py-3 text-center">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</dt>
      <dd className="font-display mt-0.5 text-2xl font-extrabold tabular-nums text-ink">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
      <div className="min-w-0">
        <p className="font-medium text-ink">{label}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      {children}
    </div>
  );
}
