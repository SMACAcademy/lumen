# ADR 0001: Monorepo, rendering pipeline and content format

- **Status:** accepted (Phase 1)
- **Date:** 2026-09-22

## Context

Phase 1 must deliver a polished, correct, responsive unit-circle laboratory. It must also establish an architecture where mathematics and physics concepts are data-driven and share one simulation contract.

## Decisions

1. **pnpm workspaces; packages consumed as TypeScript source.** Next.js compiles them via `transpilePackages`, so there's no per-package build step. Turborepo/Nx are not justified yet.
2. **TypeScript 5.9 (strict, `noUncheckedIndexedAccess`).** TypeScript 7 (the native port) exists, but Next.js's build-time type checking relies on the TS 5 JavaScript API. Revisit when Next supports it.
3. **Next.js 16 App Router, React 19, Tailwind v4.** Per the PRD. Routes are statically generated (`generateStaticParams`), which keeps a future static export / PWA straightforward.
4. **Canvas for simulations and graphs; `d3-scale` only from D3.** One DPR-aware canvas draws the whole construction, so the circle and graphs can share scales exactly and connectors cross panel boundaries. Full D3 and SVG graphs would add weight and a second rendering path without an educational gain here.
5. **Colours as CSS custom properties** read by both Tailwind and the canvas. Themes (dark/light/high contrast) are defined once.
6. **Concepts authored as typed TS objects validated by Zod** (chosen with the product owner). Authoring mistakes surface at compile time, and the same schema can validate JSON from the future authoring backend. The schema avoids transforms and defaults so authored and parsed shapes are identical.
7. **Framework-free `LabSession` store** subscribed through `useSyncExternalStore`. Tests, future teacher/projector views and an AI context builder can all drive or read the same session.
8. **Predictions are measured, not answered.** Content declares the experiment; the model decides the outcome.

## Consequences

- Adding a concept on an existing model is data-only; a new model family adds one model, one renderer and two registry lines.
- ESLint is not configured yet; strict TypeScript and tests are the quality gates for Phase 1.
- No backend, auth, DB, Docker or PWA exists yet, by design (PRD Phase 1: "No authentication required").
