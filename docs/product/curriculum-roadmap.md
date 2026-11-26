# Curriculum and build order

Status: 2026-11-19 — every concept in the catalogue is playable (see §8). This is the plan of record for *what the app teaches and in what order*.
Physics is the core and is built first; maths and chemistry are mapped in full alongside it.
It supersedes the provisional world list in [app-roadmap.md](app-roadmap.md); the game mechanics and
the phases in that document still stand, as does [app-design.md](app-design.md) for how the app is
put together.

The catalogue itself is code, not prose: `content/curriculum/`. The syllabus screen, the coverage
counts and this roadmap all read the same data, so nothing can drift.

## 1. Scope

Maths, physics and chemistry from class 6 to class 12, following NCERT. Class 6–10 is the school
foundation; class 11–12 is everything JEE Main, JEE Advanced and NEET examine. Each branch belongs
to one subject. The maths toolkit that physics leans on is maths (class 11), and units and
measurement is physics. Biology is out of scope for now.

Every chapter carries the class it is taught in, and the class decides its stage:

| Stage | Classes | Maths | Physics | Chemistry | All | Playable |
|---|---|---|---|---|---|---|
| Foundation | 6–8 | 58 | 42 | 26 | 126 | 126 |
| Bridge | 9–10 | 37 | 32 | 27 | 96 | 96 |
| Advanced | 11–12 | 128 | 259 | 107 | 494 | 494 |
| **All** | | **223** | **333** | **160** | **716** | **716** |

137 labs, 388 levels and 139 worlds are playable.

Concepts name the earlier concepts they grow from (`buildsOn`), so each class 11–12 idea points back
to its school roots — speed → velocity, the right triangle → the unit circle, Bohr's shells → the
Bohr model — and the app can say "you'll meet this again" and "warm up with this first". A test
keeps the spine sound: every link exists, points to the same or an earlier class, and never loops.

Class 11–12 in detail:

| | Maths | Physics | Chemistry | All |
|---|---|---|---|---|
| Branches | 7 | 9 | 3 | 19 |
| Chapters | 25 | 30 | 21 | 76 |
| Concepts | 128 | 259 | 107 | 494 |
| NEET | 11 | 226 | 107 | 344 |
| JEE Main / Advanced | 106 / 120 | 247 / 256 | 107 / 107 | 460 / 483 |
| Playable today | 128 | 259 | 107 | 494 |

Some maths concepts are "playable" because an existing lab already teaches them (radian measure
and the unit circle, the derivative as a slope and secant → tangent). NEET has no maths paper,
so only the toolkit is tagged NEET.

Maths waves 16–21 are provisional and follow the physics core. Chemistry came forward, in eleven
waves of two labs each. All twenty-two models live in `packages/chemistry-engine`:

| Wave | Labs | Kit (model) | Worlds |
|---|---|---|---|
| C1 ✅ | The Hydrogen Spectrum · Reaction Rates | `hydrogen`, `kinetics` | Atoms & Light · Reaction Rates |
| C2 ✅ | Chemical Equilibrium · Acids, Bases and Titration | `equilibrium`, `titration` | Balance · Acids & Bases |
| C3 ✅ | Galvanic Cells · Colligative Properties | `cell`, `colligative` | Batteries · Solutions |
| C4 ✅ | Moles and Reactions · Gibbs Energy | `stoichiometry`, `gibbs` | Moles · Will It Go? |
| C5 ✅ | Molecular Shapes · Periodic Trends | `vsepr`, `periodic` | Shapes · The Periodic Table |
| C6 ✅ | Atomic Orbitals · Electrolysis and Conductance | `orbitals`, `electrolysis` | Orbitals · Electrolysis |
| C7 ✅ | Redox Reactions · Batteries and Corrosion | `redox`, `batteries` | Redox · Batteries and Rust |
| C8 ✅ | Transition Metals · Coordination Compounds | `transition`, `crystal` | The d-block · Complexes |
| C9 ✅ | The p-block · Complex Isomers and Names | `pblock`, `isomers` | The p-block · Naming and Isomers |
| C10 ✅ | Molecular Orbitals · Lewis Structures | `mo`, `lewis` | Molecular Orbitals · Lewis Structures |
| C11 ✅ | Enthalpy and Hess's Law · Raoult's Law and Solutions | `enthalpy`, `raoult` | Enthalpy · Liquid Mixtures |
| C12 ✅ | Rate Laws and Collisions · Formulae and Concentration | `ratelaw`, `composition` | Rate Laws and Collisions · Formulae and Concentration |
| C13 ✅ | Solubility Product · The Nucleus and Matter Waves | `ksp`, `matterwave` | Sparingly Soluble · Toward the Quantum Atom |
| C14 ✅ | Halogens and Noble Gases · Lanthanoids and Actinoids | `halogens`, `fblock` | Halogens and Noble Gases · The f-block |
| C15 ✅ | Valence Bond Theory · a third Periodic Table level | `overlap` | Valence Bond Theory · The Periodic Table |

Each model is solved, not tabulated:

- Q = K by bisection on the extent.
- The titration pH from the full charge balance.
- The flat battery's ion concentration in log space (10⁻³⁷ M for a Daniell cell).
- The indicator's suitability from where its colour change actually lands.
- Orbital filling by the (n + l) rule, with Hund's spreading and the Cr and Cu exceptions.
- A weak electrolyte's degree of ionisation from Ostwald's dilution law.
- Redox equations balanced by electrons, with every oxidation number checked against its species' charge.
- Hess's law as ΣΔfH(products) − ΣΔfH(reactants), with bond-enthalpy estimates beside it; non-ideal mixtures from the one-parameter Margules model, azeotropes found by scanning.
- Lewis structures found by search: every bond-order combination tried, octets checked, the least formal charge kept, ties being resonance.
- Isomers of complexes counted by symmetry: every arrangement sorted under the octahedron's 24 rotations and its mirror.
- Crystal field splitting as Δo = f(ligand) × g(metal), with spin from Δo against the pairing energy; the factors are approximate and tuned so every textbook example the levels cite comes out right.

The periodic-trends, p-block, halogens and f-block labs are the exceptions. They are measured data (NCERT's values), shown rather than
derived, and values NCERT does not give are marked missing, not invented.

The hydrogen lab also makes most of physics' Atoms chapter (wave 14) playable. Still to come in
chemistry:

- **Physical:** complete — every class 11–12 physical-chemistry concept is playable.
- **Inorganic:** complete — every class 11–12 inorganic concept is playable.
- **Organic:** a larger 3D molecule viewer for isomers and mechanisms, built on the VSEPR renderer.

### The calculus waves

Calculus came forward too, as four waves of two labs each; the full plan, with what each simulation
shows. All of its concepts are playable.

| Wave | Labs | Models | Worlds |
|---|---|---|---|
| K1 ✅ | Limits and Continuity · The Slope Graph (and levels for Secant to Tangent) | `limit`, `slopegraph` | Limits and Continuity · The Derivative |
| K2 ✅ | Rules of Differentiation · Maxima, Minima and Rates | `rules`, `optimise` | Rules of Differentiation · Using Derivatives |
| K3 ✅ | Area by Strips · The Fundamental Theorem | `riemann`, `accumulate` | Area by Strips · Area So Far |
| K4 ✅ | Slope Fields and Differential Equations · Methods of Integration | `slopefield`, `integration` | Differential Equations · Methods of Integration |

### The school waves

Class 6–10 is catalogued in full and built next, ahead of the remaining chemistry waves. The design is
in the school foundation design.

| Wave | What ships |
|---|---|
| F0a ✅ | Grades 6–12, stages and the spine; the class 6–10 catalogue; syllabus and landing for class 6 to 12 |
| F0b ✅ | Class picker, "Your class / Warm-up / Peek ahead" on the learning map, the spine inside levels |
| F0c ✅ | Formula revision: the bank, try-it sliders, spaced recall, printable sheets |
| F0d ✅ | Game steps: sort, match, order, tap, build |
| F1 ✅ (wave 30) | Foundation I: Light the Bulb and Fractions on a Line on two new labs (a series circuit, a number line); Fast and Slow, Float or Sink, Sour, Bitter or Neither (with litmus, turmeric and china rose) and Changes Around Us on existing labs |
| F2 ✅ (wave 31) | Foundation II on four new labs: Shadows and Mirrors (light: shadows, pinhole, plane mirror), Balance the Scale (equations as a balance), Magnets (poles, materials, compass) and Area and Volume (unit squares and cubes) |
| F3 ✅ (wave 32) | Bridge: Motion Graphs, Force and Momentum and Work and Energy on existing labs; Bending Light, Current and Resistance and Inside the Atom on three new labs over extended models (refraction and lenses, parallel circuits, electron shells); Sound, Balancing Equations, Right Triangles and Lines and Graphs on four new labs with new models |
| F4 ✅ | The arcade on the Practice screen: Sort Sprint (cards from the sort and tap steps of levels played, answered by the model) and Formula Rush (formulas up to your class, both ways round) — 60 seconds, three lives, streak scoring, bests and XP |

Each concept is tagged with the exams that ask for it, so a NEET student never sees a JEE-only
topic unless they want to, and JEE Advanced extras are visible as exactly that.

## 2. What the four labs were for

Unit circle, sinusoid, vectors and secant→tangent proved the engine: one model drives the drawing,
the graphs, the formulas and the marking; concepts are data; predictions are measured, never
authored. That is the capability we needed. They now sit in the **Toolkit** branch, where they
belong — the maths every physics chapter leans on — and the build order below starts from physics
rather than continuing through trigonometry.

## 3. The organising idea: simulation kits

Chapters are not built one at a time from nothing. Each is built on a **kit** — a reusable model and
renderer family. A kit costs real work once; every chapter after that is mostly content.

| Kit | Serves | What it must do |
|---|---|---|
| `graphing` | toolkit, motion graphs, any x–y relationship | Plot, trace, drag a point, read slope and area |
| `vectors` | toolkit, forces, fields | Arrows, components, addition, angles |
| `kinematics` ✅ | straight-line motion, motion in a plane | A body moving under set acceleration, with live x–t, v–t, a–t graphs |
| `forces` ◐ | laws of motion, work and energy | Free-body diagrams, friction, inclines — pulleys and springs still to come |
| `collisions` ✅ | momentum, collisions | Two bodies, momentum and energy bookkeeping, restitution |
| `rotation` | rigid bodies | Torque, moment of inertia, rolling, angular momentum |
| `orbits` | gravitation | Central force, orbits, escape, Kepler |
| `materials` | solids | Stress, strain, the stress–strain curve |
| `fluids` | fluids | Pressure, buoyancy, streamlines, viscosity, surface tension |
| `thermal` | thermal properties | Expansion, calorimetry, conduction, cooling curves |
| `gas` | thermodynamics, kinetic theory | A piston and a molecular box, tied to one PV diagram |
| `oscillator` | oscillations | Spring, pendulum, damping, resonance — reusing the circle↔wave link |
| `waves` | waves and sound, EM waves | A medium, superposition, standing waves, beats, Doppler |
| `efield` | charges and fields, potential and capacitance | Charges, field vectors and lines, equipotentials, flux |
| `circuits` | current electricity, AC | Components on a board, meters, phasors |
| `magnetics` | moving charges, magnetism, induction | Fields from currents, forces, flux change |
| `rays` | ray optics | Mirrors, lenses, ray tracing, images |
| `waveoptics` | wave optics | Two-source interference, slits, intensity, polarisation |
| `quantum` | dual nature, atoms | Photon–electron interaction, energy-level ladders, spectra |
| `nuclear` | nuclei | Binding energy curve, decay with a half-life |
| `semiconductor` | semiconductor electronics | Bands, junction, I–V curves, rectification |
| `measurement` ✅ | units, experimental skills | Readable instruments, errors |

Twenty-two kits for 33 chapters. Building a kit is the expensive step; the chapters that follow it
are level-authoring.

## 4. What a finished chapter contains

1. **A sandbox lab** — the full simulation with every control, as the four maths labs are today.
2. **3–6 levels** of 3–7 minutes, in the existing level format.
3. **Law cards** for the relationships the student derives (F = ma, v = u + at, PV = nRT …).
4. **Exam-shaped practice** once Phase 3's generators exist: numerical answers, multiple choice in
   the JEE/NEET style, and previous-year-style problems built on the same models.

## 5. Build order

Waves, not chapters, are the unit of delivery. A wave is "build the kit, then the chapters that use
it". Each wave ends with something playable.

| Wave | Chapters | Kit work | Why here |
|---|---|---|---|
| 0 ✅ | Circles and sine, vectors, graphs and rates | `graphing`, `vectors` | Done: the engine proof |
| 1 ✅ | **Units and measurement** ✅ · **Motion in a straight line** ✅ | `measurement` ✅, `kinematics` ✅ | Physics starts here, and motion graphs reuse wave 0 directly |
| 2 ✅ | **Motion in a plane** ✅ · **Laws of motion** ✅ | `forces` ✅ | Projectiles need vectors; Newton's laws need free bodies |
| 3 ✅ | **Work, energy and power** ✅ · **Momentum and collisions** ✅ | `collisions` ✅ | Same bodies, new bookkeeping |
| 4 ✅ | **Rotational motion** ✅ · **Gravitation** ✅ | `rotation` ✅, `orbits` ✅ | Completes mechanics, the largest block in both exams |
| 5 ✅ | **Solids** ✅ · **Fluids** ✅ · **Thermal properties** ✅ | `materials` ✅, `fluids` ✅, `thermal` ✅ | Three smaller kits, heavily visual |
| 6 ○ | Thermodynamics · Kinetic theory | `gas` | One kit, two chapters, one PV diagram — **next** |
| 7 | Oscillations · Waves and sound | `oscillator`, `waves` | Closes the loop back to the circle |
| 8 | Charges and fields · Potential and capacitance | `efield` | Electrostatics opens class 12 |
| 9 | Current electricity | `circuits` | The most examined chapter in NEET |
| 10 | Moving charges and magnetism · Magnetism and matter | `magnetics` | |
| 11 | Electromagnetic induction · Alternating current | — (reuses `magnetics`, `circuits`) | AC reuses the sine machinery from wave 0 |
| 12 | Electromagnetic waves · Ray optics | `rays` | |
| 13 | Wave optics · Dual nature | `waveoptics`, `quantum` | |
| 14 | Atoms (mostly ✅ via chemistry C1) · Nuclei | `nuclear` | |
| 15 | Semiconductors · Experimental skills | `semiconductor` | Finishes the syllabus |

Mechanics (waves 1–4) is deliberately front-loaded: it is the largest share of marks, the hardest
for students, and the part where a simulation helps most.

## 6. How this meets the phases

The phase plan in [app-roadmap.md](app-roadmap.md) is about the *product*: progress, the map,
practice, accounts. This roadmap is about *content*. They interleave:

- **Phase 2** (game loop, in progress) finishes on wave 1 content instead of more trigonometry.
- **Phase 3** (generated practice and mastery) should land after wave 4, when there is enough
  mechanics for practice and revision to be meaningful.
- **Phase 4** onward continues the waves; accounts and sync (Phase 5) do not depend on content.

## 7. Status, and how it changes

Every concept is `planned`, `building` or `ready`, in the curriculum data. A test enforces the
honesty of that: anything marked ready or building must point at a lab or level that exists, and
every lab and level that exists must be listed. The syllabus screen shows the same three states as
Coming, Building now and Playable.

## 8. Completion, November 2026

The completion plan built everything left in the
catalogue, physics first, then maths, then chemistry, and reviewed every new lab for correctness.

- **Physics (class 11–12):** oscillations; waves and sound; kinetic theory; thermodynamics; electric
  charges and fields; potential and capacitance; current electricity; moving charges and magnetism;
  magnetism and matter; electromagnetic induction; alternating current and EM waves; ray optics; wave
  optics; the photoelectric effect; nuclei; semiconductors; units and measurement; fluids in motion;
  heat transfer; connected bodies and frames; relative and circular motion; centre of mass and 2D
  collisions; rolling and equilibrium; gravitational field and orbits; elastic moduli.
- **Physics (school):** measuring and moving; forces, pressure and gravity; hot and cold; currents at
  work; work and power; mirrors, the eye and colours (on the ray-optics model).
- **Maths (class 11–12):** area by strips; the fundamental theorem; methods of integration;
  differential equations; complex numbers and quadratics; sequences and series; counting and the
  binomial theorem; probability; statistics; matrices and determinants; vectors and 3D geometry;
  lines and circles; conic sections; compound angles, trigonometric equations and inverse functions;
  solving triangles; sets, relations and functions; vectors in a plane and small angles (new levels).
- **Maths (school):** integers and rationals; ratios, percentages and powers; angles, triangles and
  circles; round solids and similar shapes; numbers and patterns; data and chance; and new levels for
  whole numbers and decimals, the area of a circle, and nets and surface area.
- **Chemistry:** organic basics (with a shared structure drawer, `shared/molecule.ts`); hydrocarbons;
  haloalkanes and haloarenes; alcohols, phenols, ethers and carbonyl compounds; amines and
  biomolecules; practical chemistry. School: materials and particles; metals, acids and salts; atoms
  and the periodic table; carbon and its compounds; isotopes and isobars (a new level).

Each lab was built to one brief (model with hand-worked tests, phone-width renderer, concept, a world
of levels, a self-check against the validators) and then read by an independent reviewer against
NCERT, who fixed what was wrong: wrong numbers, explanations that taught a misconception, values
shown as 0 where none exists, and constants that differed from NCERT's tables.

### Filling the gaps, November 2026

A check of the catalogue against the NCERT books found topics it had never listed. They are now
catalogued and built, physics first, then maths, then chemistry:

- **Physics (school):** air pressure, winds and storms; chemical effects of electric current;
  charges and lightning; reflections and images (diffuse reflection, mirrors at an angle, the
  periscope).
- **Maths:** linear inequalities and linear programming (class 11–12); for school, symmetry,
  polygons and solid shapes; identities, factorisation and polynomials; large numbers, Roman
  numerals and direct and inverse proportion; tangents, sectors, the section formula and Heron's
  formula. Seven older concepts (radians, the sine and cosine graphs, the dials of a sinusoid,
  graph transformations, slope as a rate) gained levels of their own.
- **Chemistry (school):** combustion, fuels and flames; synthetic fibres and plastics; pure
  substances, solutions and colloids; ionic compounds, extracting metals and alloys.

