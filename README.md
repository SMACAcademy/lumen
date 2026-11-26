# Lumen

[![Live site](https://img.shields.io/badge/live-smacacademy.github.io%2Flumen-6d5dfc)](https://smacacademy.github.io/lumen/)
[![Stars](https://img.shields.io/github/stars/SMACAcademy/lumen?style=social)](https://github.com/SMACAcademy/lumen/stargazers)
[![Level of the week](https://img.shields.io/badge/level%20of%20the%20week-join%20in-6f42c1)](https://github.com/SMACAcademy/lumen/discussions/categories/q-a)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Deploy](https://github.com/SMACAcademy/lumen/actions/workflows/pages.yml/badge.svg)](https://github.com/SMACAcademy/lumen/actions/workflows/pages.yml)

**Maths, physics and chemistry you can touch.** Lumen is a science world for class 6 to 12 (NCERT, and on to JEE and NEET) where every idea is a live simulation: you predict, experiment and discover the law yourself, instead of memorising it.

> "I don't have to memorise physics. I can experiment with it."

**[Open Lumen →](https://smacacademy.github.io/lumen/)**

- **No account, no server, no tracking.** Your progress, name and settings stay in your own browser. Export them from your profile to keep a copy.
- **Every concept of the syllabus is playable:** 716 concepts across maths, physics and chemistry, in 137 labs, 388 levels and 139 worlds.
- **Learn by doing:** drag on the canvas or move the sliders; predict what will happen, then let the simulation measure it; estimate, sort, match and order; collect the law at the end of each level.
- **Built for phones first,** with light, dark and high-contrast themes, keyboard shortcuts and screen-reader announcements.

## What is inside

| Subject | Class 6–10 | Class 11–12 |
|---|---|---|
| **Maths** | numbers, fractions and decimals, integers and rationals, ratio and percentage, powers, patterns, angles and triangles, mensuration, data and chance | functions, trigonometry, complex numbers, sequences, counting and the binomial theorem, coordinate geometry and conics, limits, derivatives, integrals, differential equations, matrices, vectors and 3D, probability and statistics |
| **Physics** | measuring and motion, force and pressure, gravity, heat, light and the eye, sound, current and magnetism, work and energy | kinematics, laws of motion, energy, rotation, gravitation, matter, heat and thermodynamics, oscillations and waves, electrostatics, current, magnetism, induction and AC, optics, modern physics, semiconductors |
| **Chemistry** | materials and particles, changes, atoms and molecules, metals and acids, carbon compounds, the periodic table | atomic structure, bonding, states, thermodynamics, equilibrium, redox and electrochemistry, kinetics, the blocks of the periodic table, coordination compounds, organic chemistry from naming to biomolecules, practical chemistry |

Every lab was checked against NCERT by an independent review: formulas, sign conventions, constants and every number quoted in the text are what the model computes.

## Join in

- **Level of the week:** every Monday a level is posted in [Discussions](https://github.com/SMACAcademy/lumen/discussions/categories/q-a). Play it and say what you predicted.
- **Found a mistake?** [Open an issue](https://github.com/SMACAcademy/lumen/issues). A wrong explanation is worse than a missing one, so these matter most.
- **Want to build a lab?** See [CONTRIBUTING.md](CONTRIBUTING.md).

## Run it yourself

Requires Node ≥ 22.12 and pnpm 10.

```bash
pnpm install
pnpm dev            # http://localhost:3000
pnpm test           # unit, component and content tests
pnpm typecheck      # strict TypeScript across every package
pnpm build          # the whole site as static files in apps/web/out
```

The build is plain files: any static host can serve it. GitHub Pages builds it on every push to `main` (see `.github/workflows/pages.yml`).

## How it is built

```
apps/web/                    Next.js app (static export): screens, lab and level players
packages/
  science-engine/            the SimulationModel contract, lab sessions, playback, conditions
  physics-engine/            physics models (pure functions, tested against hand-worked values)
  mathematics-engine/        maths models
  chemistry-engine/          chemistry models
  simulation-renderer/       canvas renderers, one per model, plus shared drawing helpers
  concept-schema/            the schema every concept definition is validated against
  game-engine/               levels, worlds and the step types (predict, estimate, sort, …)
  graph-engine/, units/      graphs, units and number formatting
  progress-store/            progress saved in the browser (IndexedDB); nothing leaves the device
content/                     concepts, levels, worlds and the curriculum catalogue (typed TypeScript)
docs/                        architecture, authoring guide, design notes and the curriculum roadmap
```

See [docs/architecture.md](docs/architecture.md) and [docs/concept-authoring.md](docs/concept-authoring.md).

## Licence

[MIT](LICENSE).
