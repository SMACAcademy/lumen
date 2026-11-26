# Landing page prompt: the glass-over-a-3D-world look

A reusable prompt for building a landing page (and a shared theme) that looks and moves like
[Lumen's home page](https://smacacademy.github.io/lumen/): a glass page floating over a 3D world
that the camera flies through as you scroll.

Fill in the parts in `{CURLY BRACES}` and keep the rest as it is. For an even closer match, attach
a screenshot of the Lumen home page alongside the prompt.

The implementation it describes lives in this repo:

- `apps/web/components/landing/Landing.tsx`: the page, its sections and their `data-world-z` stops
- `apps/web/components/landing/ScienceWorld.tsx`: the fixed canvas, scroll-to-camera mapping and fallbacks
- `apps/web/components/landing/scene.ts`: the three.js scene, objects, lights, fog and labels
- `apps/web/components/landing/objects.ts`: the object list, as plain data
- `apps/web/app/globals.css`: the colour tokens, themes and `.glass` panels

## The prompt

````text
Build a landing page (and a shared theme for the whole app) with this look and behaviour.

## Product
- Name: {PRODUCT NAME}
- One-line promise (the hero headline, 4–6 words, the last word or two in a gradient): {e.g. "Step inside the science world"}
- Short pitch under the headline (2–3 sentences): {PITCH}
- Main call to action: "{PRIMARY CTA}" → {ROUTE}; secondary: "{SECONDARY CTA}" → scrolls to the first section
- Three to five "zones" the page flies through, each with a colour and 4–6 representative 3D objects:
  {ZONE 1 name, colour, objects…}
  {ZONE 2 …}
  {ZONE 3 …}
- Extra sections after the zones: {e.g. "How it works" (3 steps), "Who it's for", "Final call to action"}
- Live numbers for the hero (3 big stats): {e.g. items, lessons, users}

## The core idea: a glass page floating over a 3D world you fly through
- A full-screen three.js scene sits fixed behind the page (position: fixed, inset 0, z-index 0, pointer-events none, aria-hidden). All page content sits above it (relative, z-10).
- Scrolling moves the camera forward along the z-axis through the world. Every section carries a `data-world-z` attribute: the camera reaches that depth when the section is centred on screen. Interpolate smoothly between stops, and let the camera glide (ease towards the target every frame, e.g. z += (target − z) × 0.08) instead of jumping.
- Each zone occupies its own stretch of depth, so scrolling feels like travelling from one zone to the next. Objects sit left and right of the path (pull them closer to the centre on narrow screens) at similar visual weight.
- Every object animates gently and continuously: slow rotation, swinging, orbiting, pulsing glow, never fast. Add slight parallax from the pointer (±a few degrees).
- A sparse starfield of small coloured points in the background (PointsMaterial, ~0.07 size, opacity 0.8).
- Fog in the background colour (start ~12, end ~38 units) so distant objects fade in out of the dark.
- Lighting: soft ambient light plus one directional "sun". Materials are MeshStandardMaterial in the zone colour with emissive set to the same colour (emissiveIntensity 0.2–0.75) so objects glow softly on the dark background; thin lines for wireframe-like parts.
- Each 3D object has a small floating HTML label (its name) projected onto it, fading with distance.
- A secondary "ambient" mode for pages that don't scroll: the camera drifts slowly there and back through the world (about 80 s each way). Use it behind the sign-in or empty states.

## Theme (dark first, with light and high-contrast versions)
- Colours as CSS custom properties on :root, overridden under :root[data-theme="light"] and a high-contrast variant:
  - background #070b17, surface #0e1528, surface-2 #141d35, text #e2e8f0, muted #8b98ad, border rgba(148,163,184,0.14), accent #818cf8
  - zone colours, e.g. violet #a78bfa, sky #38bdf8, emerald #34d399, plus amber #fbbf24, pink #f472b6 and lime #a3e635 for highlights
- Body background: the dark base plus two very soft radial glows fixed in place (accent at 12% in the top-left, sky at 8% in the top-right), using color-mix.
- Glass panels, used for the nav bar, the hero card, every section card and the final call to action:
  - background rgba(17,24,48,0.42), with a stronger rgba(14,21,40,0.68) variant
  - 1px border rgba(255,255,255,0.12) and an inset top highlight rgba(255,255,255,0.08)
  - backdrop-filter: blur(18px) saturate(150%)
  - big soft shadow: 0 20px 60px -20px rgba(0,0,0,0.55)
  - large radii (1.5–2rem); zone cards tint their border with the zone colour at 40%
  - solid fallback rgba(14,21,40,0.92) where backdrop-filter isn't supported
- Type: a geometric display face (e.g. Outfit, weights 500–800, self-hosted, no runtime font requests) for headings, buttons and big numbers; the system UI font for body text. Headlines extra-bold, tight tracking, line-height ~1.05; small uppercase labels with wide letter-spacing (0.18–0.22em).
- Buttons: the primary is solid accent with white text, a coloured glow shadow (shadow-lg in the accent at 25%) and brightness-110 on hover; the secondary is glass. Both lift slightly on hover (translateY −2px).
- Motion: short, springy entrances for cards and numbers. Everything respects prefers-reduced-motion: then the 3D world holds still and entrances become plain fades.
- The theme (dark/light, contrast, motion) is saved in localStorage and applied by a tiny inline script before first paint, so there is no flash.

## Page layout, top to bottom
1. A fixed glass nav bar floating 12px from the top: logo with a small spark icon, anchor links to each zone and "How it works", and the primary button on the right.
2. Hero (full viewport height, camera at the start of the world): a glass card holding a small uppercase eyebrow line, the big headline with the gradient words, the pitch, the two buttons, and a row of three big stats.
3. One section per zone (camera at that zone's depth): a glass card on one side, leaving the 3D objects visible on the other. It holds the zone's name and colour, a one-line promise, 3–4 bullet points and a link. The objects floating past are also listed in words, for accessibility.
4. The extra sections as rows of glass cards.
5. A final glass-strong call to action, then a small centred footer line (including a privacy note if relevant).

## Engineering requirements
- Load three.js dynamically, only on the landing page, so it never weighs on the rest of the app. Keep the scene and object definitions in their own modules; the object list is plain data (kind, zone, title, caption, position, scale) so it can be tested without WebGL.
- If WebGL is unavailable, show the still gradient background and the full page; the 3D world is decoration only.
- Resize the renderer and re-measure the `data-world-z` stops on resize. Clamp devicePixelRatio to 2. Pause the animation loop when the tab is hidden. Dispose everything on unmount.
- Mobile-first: works at 360 px wide with no horizontal scroll, objects pulled towards the centre, and a 16 px side gutter.
- Accessibility: proper heading order, aria-labelledby on sections, visible focus rings, AA contrast in every theme, and the canvas aria-hidden.
- Tests: the object list (positions inside the path, one stop per section, stops increasing in depth as you scroll down), and that the page renders every section and link without WebGL.

Stack: {e.g. Next.js + React + TypeScript + Tailwind CSS + three.js}. Match this design closely, but use my content above.
````
