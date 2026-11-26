# From laboratory to app — product plan and roadmap

Status: proposal, 2026-09-22. It replaces the phase list in the PRD (§90 onward).
The physics curriculum and the order chapters get built is in
[curriculum-roadmap.md](curriculum-roadmap.md), which replaces the provisional world list in §2.4.
How the application itself is designed — look, personalisation, data, offline — is in
[app-design.md](app-design.md), which also breaks Phase 2 into slices. The PRD's
philosophy still applies: learn by touching, predicting and discovering, with one model as the
single source of truth.

## 1. Where we are

The feasibility study worked. Four maths labs (unit circle, sinusoid, vectors,
secant → tangent) run on one shared engine:

- A **model** computes everything. Rendering, graphs, formulas and feedback all read its results.
- **Concepts are data.** Adding a lab means writing a model, a renderer and a content file. No new
  pages are needed.
- A **condition language** checks goals automatically, and **predictions are measured** by running
  the model, so content can never contradict the maths.

That is a strong engine. What we have is still a *lab*, though: a rich page with five tabs that a
motivated student explores once. It has no reason to come back tomorrow, no sense of progress, no
path, and nothing to get better at.

## 2. The product we should build

> **A science game you get better at.** Short, satisfying puzzles where you *play* with the real
> maths and physics, discover the laws yourself, and collect them as you go.

We borrow the proven parts of three products and combine them in a way none of them has:

| From | We take | We avoid |
|---|---|---|
| Duolingo | Bite-sized sessions, streaks, XP, a visible path, daily habit | Shallow tap-the-answer drills |
| Brilliant | Interactive problems, "aha" moments, learning by doing | A paywall at step two, static diagrams |
| PhET | Real simulations, open exploration | No goals, no progression, no feedback |

**Our unfair advantage** is that every puzzle is scored by the real model. That lets us
**generate infinite puzzles**, **measure predictions instead of authoring them**, and let
students *draw* their prediction and see it checked against reality. None of the three
products above can do that.

### 2.1 The core loop (a 3–7 minute session)

```
 Hook ──► Play ──► Predict ──► Reveal ──► Discover ──► Apply ──► Reward
 a puzzle  touch    commit to   the model  name the     solve a    stars, XP,
 you can't the sim  a guess     answers    law (card!)  challenge  streak, unlock
 solve yet
```

- **Hook:** open with a puzzle the student can't quite solve yet. For example: "Make the dot's
  shadow touch the top of the wall."
- **Play:** direct manipulation with instant, juicy feedback (snap, sound, glow).
- **Predict:** commit to a guess by picking, estimating on a slider, or **sketching the graph**.
- **Reveal:** the model plays out on top of the guess, and a score shows how close it was.
- **Discover:** the student names the pattern and earns a **Law Card**
  (e.g. *sin²θ + cos²θ = 1*, dated the day they found it).
- **Apply:** a short challenge that uses the law.
- **Reward:** 1–3 stars, XP, streak progress, and the next level unlocks.

### 2.2 What makes it addictive (in a healthy way)

1. **Progress you can see.** A world map of connected skills, with levels that light up.
2. **Mastery, not just completion.** Each skill has a mastery ring. Mastery decays over time,
   and short **review puzzles** restore it (spaced repetition).
3. **Collection.** Law Cards, badges, and cosmetic unlocks such as trail colours and themes.
4. **Daily habit.** A daily streak (with streak freezes), plus a **Daily Puzzle** that everyone
   gets with the same seed, so friends can compare scores.
5. **Flow.** Adaptive difficulty keeps puzzles at a 70–85% success rate.
6. **Juice.** Snappy animation, sound, haptics on mobile and celebration moments. It must feel good
   to drag a point.
7. **Creative play.** An unlocked Sandbox for every world, plus "make a puzzle for a friend"
   (a shareable seed link).
8. **Social** (later). Weekly leagues, friend challenges and class leaderboards.

Guardrails: no pay-to-win, no punishing loss mechanics, age-appropriate, a daily goal the student
chooses, and an optional "you've done great today, come back tomorrow" nudge.

### 2.3 App structure

A mobile-first app shell with five destinations:

| Tab | Purpose |
|---|---|
| **Learn** | The world map. Worlds hold units, and units hold levels. This is where students continue their path. |
| **Practice** | Infinite, adaptive puzzles drawn from mastered skills. Review queue and Daily Puzzle. |
| **Sandbox** | The current open labs, unlocked per world. Free exploration. |
| **Journal** | Collected Law Cards, formulas, records and achievements. |
| **Profile** | Streak, XP, level, goals, settings, theme. Later: friends and leagues. |

### 2.4 Content map (worlds)

The worlds deliberately bridge maths and physics, because that connection is the PRD's
central idea.

| # | World | Levels built on | Bridge |
|---|---|---|---|
| 1 | **Circles & Waves** | unit circle, sine/cosine, sinusoid | → SHM, waves |
| 2 | **Arrows (Vectors)** | vector components, addition, dot product | → forces, projectiles |
| 3 | **Change (Slope & Rates)** | slope, secant → tangent, area under a curve | → velocity, acceleration |
| 4 | **Motion** | displacement, velocity, acceleration, motion graphs | uses World 3 |
| 5 | **Projectiles** | 2D motion, range, launch angle | uses Worlds 2 and 4 |
| 6 | **Forces** | Newton's laws, friction, inclines | uses World 2 |
| 7 | **Energy** | KE/PE, conservation, work, power | |
| 8 | **Oscillations** | springs, pendulum, SHM | closes the loop back to World 1 |
| 9+ | Waves & sound, circuits, optics, gravitation and orbits | | |

Each world has about 10–15 levels, a boss challenge, a sandbox and 4–8 Law Cards.

## 3. Game mechanics, precisely

### 3.1 Puzzle types (all scored by the model)

| Type | The student… | Scored by |
|---|---|---|
| **Hit the target** | sets variables so that a condition holds ("make sin θ = −0.5") | existing `Condition` |
| **Match the ghost** | tunes parameters until the curve matches a ghost curve | curve distance |
| **Estimate** | drags a slider to guess a value, then sees the reveal | closeness → stars |
| **Sketch the graph** | draws the curve they expect before it is generated | area between curves |
| **Predict the change** | increase / decrease / same (already built) | `measurePrediction` |
| **Spot the error** | finds the wrong value or wrong graph among several | model check |
| **Speed round** | 60 seconds of quick targets | count × accuracy |
| **Boss** | a multi-step, multi-concept challenge at the end of a world | compound conditions |

Every type implements one interface:
`generate(seed, difficulty) → { setup, goal, scoring, hints }`. That gives **infinite, reproducible
puzzles**, which the Daily Puzzle and friend challenges rely on (they share a seed).

### 3.2 Scoring and progression

- **Stars per level (1–3):** based on accuracy, hints used and attempts. Speed only counts in
  speed rounds.
- **XP:** earned by completing levels, practice and reviews. Account levels unlock cosmetics.
- **Mastery per skill (0–100%):** a simple knowledge-tracing estimate updated after each puzzle.
  It decays on a forgetting curve. Review puzzles are scheduled when predicted recall falls
  below about 80%.
- **Unlocks:** a level unlocks when the previous one is cleared. A world unlocks when the
  prerequisite skill reaches the mastery threshold (the PRD's prerequisite graph, finally enforced).
- **Hints:** a three-step ladder: nudge, visual highlight, worked step. Each step used lowers the
  star cap.

## 4. Architecture changes

What stays exactly as it is: the models, `LabSession`, renderers, the graph engine, the condition
language, measured predictions and the concept schema.

What we add:

```
content/
  concepts/…            (existing lab definitions, which become Sandboxes)
  worlds/<world>.ts     world → units → levels (new schema)
packages/
  game-engine/          NEW: puzzle generators, scoring, stars, XP, mastery, spaced review,
                        seeded RNG, achievements. Pure TS, fully unit-tested.
  progress-store/       NEW: local-first persistence (IndexedDB) behind a sync-ready interface
  physics-engine/       NEW (Phase 4): kinematics, projectile, forces, energy, SHM models
  ui/                   NEW: design system (tokens, buttons, cards, sheets, celebration FX)
  audio/                NEW (small): sound effects and haptics, respecting user settings
apps/web/               app shell (Learn / Practice / Sandbox / Journal / Profile), level player
```

Key technical decisions (my recommendations):

1. **Level = a sequence of steps** over an existing concept. Step kinds include `intro`, `play`,
   `predict`, `sketch`, `target`, `match`, `discover`, `boss` and `reward`. Levels are data
   (Zod-validated), and the existing integrity checker is extended to cover them.
2. **Local-first progress.** Everything works offline with no account, and there is no sign-in:
   progress stays on the device.
3. **PWA early (Phase 2).** Installable on phones, offline, and cheap to do. A Capacitor wrap for
   the app stores comes later.
4. **No backend.** Lumen is a static site on GitHub Pages, with no server and no database.
5. **No analytics or tracking.** Difficulty is tuned from feedback in GitHub issues and
   Discussions, not from watching learners.
6. **AI tutor (Phase 7):** Claude answers "why?" grounded in the *live model state* (the current
   results), so explanations are always true for what's on screen. The same integrity checker
   guards AI-assisted content authoring.
7. **Quality bar:** ESLint, Playwright end-to-end tests of the level flows, visual regression on
   the renderers, a 60 fps budget on a mid-range phone, and WCAG 2.2 AA.

## 5. Phases

Each phase ends with something shippable and playable, not just infrastructure.

### Phase 2 — The game loop (make World 1 fun)

Goal: a student opens the app on a phone, plays World 1 for 10 minutes, and wants to come back.

- **Foundation:** ESLint, Playwright, a design-system package, sound and haptics, a
  performance budget.
- **App shell:** bottom navigation, and the Learn world map with animated unlocks.
- **Level schema and level player:** step sequence, progress bar, hearts-free retries, hint ladder.
- **Puzzle types:** hit the target, estimate, predict (reusing what exists), match the ghost.
- **Rewards:** stars, XP, daily streak, level-complete celebration.
- **Progress store:** IndexedDB, with a streak that survives reloads.
- **Onboarding:** the first 60 seconds are a single magic interaction (drag a dot, watch a wave
  appear), then the first star.
- **Content:** **World 1 "Circles & Waves"**, 12 levels plus a boss. The four existing labs
  become Sandboxes.
- **PWA:** installable and offline.

Exit criteria: World 1 is fully playable on mobile and desktop, a new user earns a first star in
under 90 seconds, level flows are covered by Playwright, and everything holds 60 fps on a
mid-range phone.

### Phase 3 — Infinite practice and mastery

- Seeded puzzle generators for every existing model, with adaptive difficulty.
- Mastery rings, forgetting-curve decay and a review queue.
- The **Practice** tab, the **Daily Puzzle** and speed rounds.
- **Sketch the graph** (the signature mechanic).
- **Journal:** Law Cards, records and achievements (about 30 badges).
- **Content:** World 2 "Arrows" and World 3 "Change", built mostly from the existing labs plus
  vector addition and area under a curve.
- A first difficulty tuning pass, from learners' feedback.

### Phase 4 — Physics worlds

- `physics-engine` package: kinematics, projectiles (reusing vectors), forces, energy.
- New renderers: a motion track with a live position/velocity/time graph, a projectile field, and
  free-body diagrams.
- **Content:** World 4 "Motion", World 5 "Projectiles" and World 6 "Forces", each with a sandbox
  and a boss.
- Cross-world bridges, e.g. "velocity *is* the slope you discovered in World 3".

### Phase 5 — Launch readiness

Lumen has no accounts: it is a static site and progress stays in the browser (export and import
move it between devices). This phase is about polish for a public launch.

- Profile, goals, notification reminders (opt-in) and streak-freeze economy.
- Settings: accessibility (reduced motion, high contrast, dyslexia-friendly font), sound, language
  groundwork.
- Public beta: landing page, SEO for concept pages, error monitoring.

### Phase 6 — Social and classroom

- Friends, **friend challenges** (share a seed) and weekly leagues.
- **Teacher mode:** classes, assign worlds or levels, a class progress dashboard, and a
  leaderboard that can be turned off.
- Sandbox sharing: "look what I built" links.

### Phase 7 — AI tutor and creator tools

- **"Ask why"** tutor grounded in live model state, plus personalised hints.
- AI-assisted content authoring (levels and puzzles), validated by the integrity checker.
- A puzzle editor so teachers and students can create levels.
- Remaining content: World 7 Energy, World 8 Oscillations, and the start of Waves, Circuits and
  Optics.

### Phase 8 — Scale

- Native wrappers (Capacitor) for the iOS and Android stores.
- Localization, starting with Hindi and Tamil given the audience.
- Monetisation (below), plus content expansion toward the full PRD curriculum.

## 6. Monetisation (suggested; decide later)

The core path is free forever. **Plus** (subscription) adds unlimited practice and review, all
cosmetics, advanced sandboxes, the AI tutor and offline downloads of every world. **Schools**
are sold per seat for teacher mode. Nothing in Plus is required to learn.

## 7. How we'll know it works

| Metric | Target (beta) |
|---|---|
| Time to first "aha" / first star | < 90 s |
| Level completion rate | > 80% |
| Day-1 / Day-7 retention | > 40% / > 20% |
| Sessions per active user per week | ≥ 4 |
| Prediction accuracy improvement within a skill | measurable upward trend |
| Frame rate on a mid-range phone | 60 fps |

## 8. Decisions needed from you

Each item has my recommendation; I'll proceed with it unless you say otherwise.

1. **Audience:** ages 13–18 (high school), with World 1 also suitable for motivated 11–12 year olds.
2. **Name and brand:** keep a working name for now. Candidate names: *Lumen*, *Discovr*,
   *Axiom Play*.
3. **Backend:** none. Lumen is a static site.
4. **Platform:** web plus an installable PWA first; app stores in Phase 8.
5. **Visual style:** a playful but clean, dark-first look with vivid neon accents for the
   simulations, matching what exists today but with more polish and motion.

## 9. Execution approach

Same discipline as Phase 1: each vertical slice is runnable, tested, verified in the browser and
committed. Phase 2 starts with the level schema and level player, using one real level from World 1
as the tracer bullet, before building the map and the reward systems around it.
