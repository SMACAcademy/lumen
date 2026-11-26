# Application design

Status: proposal, 2026-09-23. Companion to [app-roadmap.md](app-roadmap.md), which says *what* we
are building and in what order. This says *how the application is put together*: the look, the
personal experience, where data lives (in the learner's browser), and how it works as an installable
app.

Working name: **Lumen**. Everything below survives a rename.

## 1. Where we are today

| | |
|---|---|
| **Built** | Four simulation labs (unit circle, sinusoid, vectors, secant→tangent). One shared engine: models compute, everything else reads. A level format and a playable level, `/play/shadow-of-a-dot`, with six step kinds, hints, stars and XP. |
| **Quality** | 181 tests, clean typecheck, production build with every route pre-rendered as static HTML. |
| **Missing** | Nothing is remembered between visits. No home for a learner. No map, one level. Not installable, no offline. Visually plain: the simulations look good, the app around them does not. |

Static pre-rendering matters more than it sounds: every page is a static file, so the whole app can
be cached and played offline, and later hosted on a CDN with no server.

## 2. Three principles

1. **The simulation is the hero.** Chrome is quiet; colour and motion belong to the physics.
2. **Local-first.** The app is fully usable with no account and no network. There is no sign-in
   and no server: progress lives on the device, and export/import moves it between devices.
3. **One source of truth, extended.** Models already drive the labs. Progress, mastery and the
   profile become a second such source: a single event log that every screen reads from.

## 3. Design language

### 3.1 Colour

Today's `--lab-*` tokens stay (canvas renderers read them directly). Three additions:

- **Brand ramp:** `--brand-50…900` (indigo → violet). Primary actions, focus rings, progress fills.
- **Per-world accent:** each world carries a colour role (Circles & Waves = sine blue, Arrows =
  vector fuchsia, Change = secant orange, Motion = tangent lime). It tints that world's map
  section, level nodes and the level player's progress bar, so the app feels like it has places.
- **Feedback:** success emerald, surprise amber, retry rose — never colour alone; always an icon
  and words too.

Personalisation rides on the same tokens: a learner's chosen accent writes `--lab-accent`, and the
theme (dark, light, high contrast) writes the whole set. Canvas and DOM stay in step automatically.

### 3.2 Type

| Role | Face | Use |
|---|---|---|
| Display | **Outfit** (Google, 600/800), the only web font | Screen titles, big numbers, stars, XP |
| Body/UI | System stack | Everything else — instant, no layout shift |
| Mono | System mono | Live values, tables |
| Math | Existing serif math stack | Symbols and equations |

One web font, `font-display: swap`, preconnected. Numbers are always tabular so live values don't
jitter.

### 3.3 Shape, depth, motion, sound

- **Radii** 12 / 16 / 24 / full. **Elevation** as soft ambient shadow plus a coloured glow on
  primary actions. Primary buttons keep their 4px "pressable" bottom edge.
- **Motion:** 120ms micro, 320ms entrance, springy pop for rewards, shake for retry. All of it
  collapses under `prefers-reduced-motion`.
- **Sound:** a tiny synthesised set (correct, wrong, star, tap, level-up) generated with WebAudio —
  no audio files, a few hundred bytes of code. Off by default on desktop, on for mobile taps,
  always toggleable. Haptics on supported phones via `navigator.vibrate`.

### 3.4 Layout

Mobile-first. Below `lg`, a bottom tab bar and a single column; at `lg` and above, a left rail and
a two-column content area. The level player is deliberately chrome-free: progress bar, simulation,
task card.

### 3.5 Component library

Built in `apps/web/components/ui`: Button (one chunky button in four tones), Ring, Bar, Stars,
Avatar, Toggle, Segmented. Tokens live in CSS custom properties and components carry no colour
literals, so a world's colour reaches them by setting `--lab-accent` on an ancestor.

It was planned as an `@ise/ui` package. With a single application consuming it, a package would add
only a Tailwind source path and a build boundary, so it stays in the app until a second surface — a
teacher view, say — needs it. Moving it then is a file move.

## 4. Personalisation

"Personalised" means the app knows this learner and shows them their own next step — not that it
asks for personal data. Everything here works anonymously.

| Layer | What it holds |
|---|---|
| **Profile** | Display name (optional), generated orbit avatar, school year, daily XP goal, joined date |
| **Preferences** | Theme, accent, sound, haptics, reduced motion, degrees/radians, language (later) |
| **Progress** | Stars and best score per level, XP total, streak, unlocked worlds |
| **Mastery** | A 0–100% estimate per skill, decaying over time, driving the review queue |
| **Collection** | Law Cards with the date each was discovered, achievements, personal records |
| **History** | Every answer, hint and run — the raw material for insights and for sync |

What the learner actually sees:

- **Today** greets them by name with their streak, their goal ring, one **Continue** card (exactly
  where they stopped), a review chip ("3 quick reviews") and the Daily Puzzle.
- **The map** highlights the single recommended next level; everything else stays available.
- **Difficulty adapts** within a level type once Phase 3 generators land.
- **Insights** ("strongest: reading graphs; shakiest: signs below the axis") come from the same
  history, on the Profile screen.
- **The Journal** is the emotional payoff: their own laws, dated, in their own order.

## 5. Data architecture

### 5.1 Shape

One append-only **event log** plus a derived **snapshot**:

```
UI action ─► ProgressEvent ─► append to log ─┬─► reduce into Snapshot ─► screens read this
                                             └─► (later) push to server
```

Events are small, immutable and idempotent: `{id, at, type, payload}` with types like
`level-completed`, `step-answered`, `hint-used`, `law-discovered`, `review-answered`,
`day-active`, `setting-changed`. The snapshot (profile, preferences, per-level bests, mastery,
streak, XP, collection) is a pure reduction of the log, so it can always be rebuilt.

Why events rather than "just save the numbers": sync between devices becomes a union of two logs
rather than a conflict; the Journal timeline and the insights come free; and a bug in a derived
number is fixable by re-reducing rather than by data repair.

### 5.2 Packages

```
packages/progress-store/
  types.ts      ProgressEvent, Snapshot, Preferences, Profile
  reduce.ts     pure reducer: events → snapshot (fully unit-tested)
  mastery.ts    knowledge estimate + forgetting curve + review scheduling
  store.ts      ProgressStore interface: append(event), read(), subscribe(), export(), import()
  indexeddb.ts  browser adapter (~100 lines, no dependency)
  memory.ts     test/SSR adapter
  remote.ts     LATER: sync adapter
```

The web app talks only to the interface, so the later server changes one file.

### 5.3 Storage rules

- IndexedDB (not localStorage): room to grow, transactional, async.
- One transaction per action: append the event and write the new snapshot together.
- A schema `version` on the database, with forward migrations; unknown event types are ignored, so
  an older build never chokes on newer data.
- **Export / import JSON** from the Profile screen from day one: the learner owns their data, and
  it doubles as a manual device transfer until sync exists.
- A random `deviceId` is generated locally. No personal data, no network, no analytics until the
  learner opts in.

### 5.4 No accounts, no server

Lumen is a static site with no backend and no database. There is no sign-in, no cloud sync
and no analytics. Progress stays in the learner's browser; the profile's export and import are
how it moves between devices.

## 6. Installable app (PWA)

The whole app is static, so offline is mostly a matter of caching it.

| Piece | Decision |
|---|---|
| **Manifest** | `name`, `short_name`, `display: standalone`, theme and background colours per theme, portrait-primary preferred but rotation allowed, maskable 192/512 icons, shortcuts to Today and the Daily Puzzle |
| **Service worker** | Hand-written, ~120 lines, no build plugin. Precache the app shell and every level route at install; cache-first for hashed assets, stale-while-revalidate for pages, offline fallback page |
| **Offline** | Everything already built works offline: simulations compute locally, progress writes to IndexedDB, XP and streak accrue |
| **Updates** | The worker reports a new version; a toast offers "Refresh to update" rather than reloading under the learner |
| **Install** | A quiet "Add to home screen" card after the second session, using `beforeinstallprompt`; iOS gets a short instruction sheet instead, plus `apple-touch-icon` and status-bar meta |
| **Later** | Badging API for the review count, Capacitor wrappers for the stores (Phase 8) |

Budgets: first load under 200KB of JavaScript over the wire, interactive in under 2s on a mid-range
phone over 4G, 60fps during simulation.

## 7. Screens

The app has a front door and an inside. They are two route groups sharing one root layout:
`app/(public)` and `app/(app)`. There are no accounts: everything is open to every visitor, and
progress is kept in the visitor's own browser.

| Route | Screen | Notes |
|---|---|---|
| `/` | **Landing** | Public. A glass page over a scroll-driven three.js "science world" (§7.1) |
| `/home` | **Home** | The day (greeting, streak, goal ring, next level), then the three subject cards, then Practice and Revise |
| `/subjects/[subject]` | **Subject** | Maths, physics or chemistry whole: worlds to play, open labs, and the full syllabus by branch and chapter |
| `/learn` | **Learning map** | Every world as a winding trail of level nodes, filterable by subject. The next level pulses |
| `/practice` | **Practice** | Quick challenge (a random open level) and free play in every lab. Generated puzzles arrive in Phase 3 |
| `/revise` | **Revise** | Laws discovered, levels worth another go (lowest stars first), mastered levels. The spaced review queue arrives in Phase 3 |
| `/play/[levelId]` | **Level player** | Focus mode: no navigation |
| `/lab/[conceptId]` | **Sandbox** | Focus mode: no navigation |
| `/syllabus` | **Syllabus** | All three subjects, filterable by subject, exam, year and status |
| `/journal` | **Journal** | Law Cards and records |
| `/profile` | **Profile** | Name, preferences, data export/import, account and sign-out |

Navigation: a glass side rail on desktop (Home, Learn, Practice, Revise; then Maths, Physics,
Chemistry; then Syllabus and Journal), and bottom tabs on phones (Home, Learn, Practice, Revise, You).

**Unlock rule.** The first level of every world is open, and later levels open one at a time as
the one before is finished. The earlier rule opened only World 1 and nothing ever opened the rest,
so a new learner could reach 1 of 23 levels. `lib/journey.ts` holds the rule, and
`lib/journey.test.ts` pins it.

### 7.1 The science world

Fifteen objects float along a flight path, five per subject. Each stands for a real syllabus concept
(`components/landing/objects.ts` names the concept id, and a test checks that it exists and is in the
right subject):

- **Maths:** sine helix and its shadow, a cone cut into an ellipse, vectors in 3D, Riemann slices
  under a curve, a d20.
- **Physics:** a Bohr atom, a Kepler orbit (solved with Kepler's equation, so it is fastest at
  perigee), a pendulum, a prism dispersing white light, and a bar magnet with dipole field lines.
- **Chemistry:** water at 104.5°, benzene with its π ring, an NaCl lattice, DNA, and tetrahedral
  methane.

Sections carry `data-world-z`. The camera eases to that depth as each section reaches the middle of
the screen. Objects get glass DOM labels projected from 3D, fading with distance. The page's own
text lists the same objects, so the canvas can stay `aria-hidden`.

Guard rails:

- three.js is imported dynamically, so the app itself never loads it.
- Pixel ratio is capped at 1.75.
- Only objects near the camera animate, and nothing draws while the tab is hidden.
- With reduced motion, objects hold still and the scene redraws only when the page scrolls.
- Without WebGL, a still gradient stands in.
- The scene rebuilds in the new colours when the theme changes, and everything is disposed on unmount.

### 7.2 No accounts

Lumen has no sign-in. Progress, the learner's name and settings live in the browser (IndexedDB and
local storage) and never leave the device; the profile screen exports them to a file and imports
them back, which is how a learner moves to another device.

## 8. Phase 2, in slices

Each slice ends runnable, tested, verified in a browser and committed.

| Slice | Content | Done when |
|---|---|---|
| **2.1** ✅ | Level format, game engine, level player, first level | Shipped as `f063ceb` |
| **2.2** ✅ | `progress-store` (events, reducer, IndexedDB), profile and preferences, streak and XP, saved level results, **Today** screen | Shipped as `d834cc2` |
| **2.3** ✅ | Design system, Outfit, world colours, sound and haptics, appearance preferences, the visual pass | Shipped as slice 2.3 |
| **2.4a** ✅ | Subjects in the catalogue: maths (7 branches) and chemistry (3 branches) join physics | Syllabus, Home and coverage count all three |
| **2.4b** ✅ | Front door: landing with the 3D science world, public/app route split (the demo sign-in was later removed) | A visitor lands, flies through, signs in and is returned where they were going |
| **2.4c** ✅ | Home hub, subject pages, Practice and Revise, glass shell | Content is reachable by subject, and by practise and revise |
| **2.4d** ✅ | Learning map and unlock rules (fixes the locked-worlds bug) | Every world's first level is open; trails show the way |
| **2.5** | PWA (manifest, service worker, install, update toast), Playwright end-to-end tests, ESLint, performance budget | Installs on a phone, plays offline, CI-checkable |

Then Phase 3 (generated practice, mastery, the spaced review queue behind Revise), content waves
(wave 6 onward, with the chemistry kits reusing the landing's three.js work for molecules), and
as the roadmap sets out.

## 9. Assumptions

Stated rather than asked; say the word and any of them changes.

1. Audience 13–18, phone-first, English first with translation later.
2. No account, no server and no analytics: Lumen is a static site, and progress stays in the
   learner's browser.
3. No backend: Lumen stays a static site.
4. Dark-first visual identity with a light theme of equal quality.
5. One web font, no UI framework, no state library: the dependency list stays short.
