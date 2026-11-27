# Contributing to Lumen

Thank you for helping. Lumen teaches maths, physics and chemistry to school students, so the most valuable contribution of all is a correction: **a wrong explanation is worse than a missing one.**

## Reporting a mistake

Lumen may contain mistakes (see the [disclaimer](DISCLAIMER.md)), and we fix them on the strength of the evidence. There are two ways in:

1. **Report it:** [open a correction issue](https://github.com/SMACAcademy/lumen/issues/new?template=correction.yml). The form asks for:
   - the level or lab (the address from your browser is perfect),
   - what it says, and what it should say,
   - your evidence: the NCERT book, class, chapter and page or table, or another reliable source.
2. **Fix it yourself:** open a pull request with the change, and put the same evidence in its description (the pull request template has a place for it). If a number changes, show the working.

A maintainer reviews every correction. It is merged once the evidence holds and the checks pass, and the site updates automatically.

## Working on the code

Requires Node ≥ 22.12 and pnpm 10.

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # everything must pass
pnpm typecheck
pnpm build        # the static site in apps/web/out
```

Every pull request runs the same checks. Keep changes focused: one fix or one feature per pull request.

## Adding or changing a lab

A lab has four parts, each with tests:

1. **A model** in `packages/<physics|mathematics|chemistry>-engine/src/`: pure functions, with a test file that checks hand-worked values.
2. **A renderer** in `packages/simulation-renderer/src/<name>/`: it must fit a 325 px phone screen and draw any answer a level asks for only when the "labels" layer is on.
3. **A concept** in `content/<subject>/<category>/`: controls, quantities, equations and explanations.
4. **Levels and a world** in `content/worlds/<world>/`.

Read [docs/concept-authoring.md](docs/concept-authoring.md) first. The content tests validate every level against its model: a prediction's answer must be what the model measures, and an estimate's answer must be in range. Every number quoted in the text must be what the model computes.

## Privacy

Lumen has no accounts, no server and no analytics, and it stays that way: do not add tracking scripts, third-party requests at runtime, or anything that sends a learner's data off their device.

## Licence

By contributing you agree that your work is released under the [MIT licence](LICENSE).
