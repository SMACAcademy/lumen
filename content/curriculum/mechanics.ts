import { advanced, branch, c, chapter, jee } from "./schema";

/** Kinematics: describing motion before explaining it. */
export const motion = branch("motion", "Motion", "Describing how things move, in a line and in a plane.", [
  chapter(
    "motion-straight-line",
    "Motion in a straight line",
    { grade: 11, kit: "kinematics", wave: 1, blurb: "Position, velocity and acceleration, and the graphs that hold them." },
    [
      c("distance-displacement", "Distance and displacement", {
        status: "ready",
        built: { lab: "motion-in-a-straight-line", level: "distance-and-displacement" },
      }),
      c("speed-velocity", "Speed, average velocity and instantaneous velocity", {
        buildsOn: ["speed-school", "uniform-motion"],
        status: "ready",
        built: { lab: "motion-in-a-straight-line", level: "distance-and-displacement" },
      }),
      c("acceleration", "Acceleration as the rate of change of velocity", { status: "ready", built: { lab: "relative-and-circular-motion", level: "up-and-down" }, buildsOn: ["velocity-acceleration-school"] }),
      c("position-time-graphs", "Position–time graphs and their slopes", {
        buildsOn: ["distance-time-graph-school"],
        status: "ready",
        built: { lab: "motion-in-a-straight-line", level: "distance-and-displacement" },
      }),
      c("velocity-time-graphs", "Velocity–time graphs: slope and area", {
        buildsOn: ["motion-graphs-school"],
        status: "ready",
        built: { lab: "motion-in-a-straight-line", level: "reading-motion-graphs" },
      }),
      c("equations-of-motion", "The equations of uniformly accelerated motion", {
        buildsOn: ["equations-school"],
        status: "ready",
        built: { lab: "motion-in-a-straight-line", level: "reading-motion-graphs" },
      }),
      c("free-fall", "Free fall under gravity", { status: "ready", built: { lab: "relative-and-circular-motion", level: "up-and-down" }, buildsOn: ["free-fall-school"] }),
      c("relative-velocity-1d", "Relative velocity along a line", { status: "ready", built: { lab: "relative-and-circular-motion", level: "along-the-road" } }),
      advanced("non-uniform-acceleration", "Motion with changing acceleration", { status: "ready", built: { lab: "relative-and-circular-motion", level: "along-the-road" } }),
    ],
  ),
  chapter(
    "motion-in-a-plane",
    "Motion in a plane",
    { grade: 11, kit: "kinematics", wave: 2, blurb: "Two directions at once: projectiles, rivers and circles." },
    [
      c("projectile-motion", "Projectile motion: independent horizontal and vertical motion", {
        status: "ready",
        built: { lab: "projectile-motion", level: "two-motions-at-once" },
      }),
      c("range-height-time", "Range, maximum height and time of flight", {
        status: "ready",
        built: { lab: "projectile-motion", level: "two-motions-at-once" },
      }),
      c("projectile-from-height", "Projectiles launched from a height or at a target", {
        status: "ready",
        built: { lab: "projectile-motion", level: "fired-from-a-cliff" },
      }),
      c("relative-velocity-2d", "Relative velocity in a plane: boats and rain", { status: "ready", built: { lab: "relative-and-circular-motion", level: "rivers-and-rain" } }),
      c("uniform-circular-motion", "Uniform circular motion: period, speed and centripetal acceleration", { status: "ready", built: { lab: "relative-and-circular-motion", level: "circles-and-slopes" } }),
      jee("projectile-on-incline", "Projectiles on an inclined plane", { status: "ready", built: { lab: "relative-and-circular-motion", level: "circles-and-slopes" } }),
      advanced("non-uniform-circular", "Non-uniform circular motion and tangential acceleration", { status: "ready", built: { lab: "relative-and-circular-motion", level: "circles-and-slopes" } }),
    ],
  ),
]);

/** Dynamics: why motion changes, and what it costs. */
export const forces = branch("forces", "Forces and energy", "Why motion changes, and the bookkeeping of energy and momentum.", [
  chapter(
    "laws-of-motion",
    "Laws of motion",
    { grade: 11, kit: "forces", wave: 2, blurb: "Newton's three laws, free-body diagrams and friction." },
    [
      c("inertia", "Inertia and Newton's first law", { buildsOn: ["inertia-school"], status: "ready", built: { lab: "laws-of-motion", level: "when-friction-gives-way" } }),
      c("second-law", "Newton's second law: F = ma", { buildsOn: ["momentum-school"], status: "ready", built: { lab: "laws-of-motion", level: "when-friction-gives-way" } }),
      c("third-law", "Newton's third law and action–reaction pairs", { status: "ready", built: { lab: "connected-bodies", level: "pulled-by-a-string" }, buildsOn: ["action-reaction-school"] }),
      c("free-body-diagrams", "Free-body diagrams", { status: "ready", built: { lab: "laws-of-motion", level: "when-friction-gives-way" } }),
      c("tension-pulleys", "Tension, strings and pulley systems", { status: "ready", built: { lab: "connected-bodies", level: "pulled-by-a-string" } }),
      c("normal-force-lift", "Normal force and apparent weight in a lift", { status: "ready", built: { lab: "connected-bodies", level: "lifts-and-moving-frames" } }),
      c("friction", "Static and kinetic friction", { buildsOn: ["friction-school"], status: "ready", built: { lab: "laws-of-motion", level: "when-friction-gives-way" } }),
      c("inclined-plane", "Motion on an inclined plane", { status: "ready", built: { lab: "laws-of-motion", level: "the-tilted-table" } }),
      c("circular-dynamics", "Circular motion: centripetal force, banking and the conical pendulum", { status: "ready", built: { lab: "connected-bodies", level: "round-the-bend" } }),
      jee("pseudo-forces", "Pseudo forces in accelerating frames", { status: "ready", built: { lab: "connected-bodies", level: "lifts-and-moving-frames" } }),
      advanced("constraint-relations", "Constraint relations in connected bodies", { status: "ready", built: { lab: "connected-bodies", level: "pulled-by-a-string" } }),
    ],
  ),
  chapter(
    "work-energy-power",
    "Work, energy and power",
    { grade: 11, kit: "forces", wave: 3, blurb: "Work changes energy; energy is conserved; power is the rate of it." },
    [
      c("work-constant-force", "Work done by a constant force", { buildsOn: ["work-school"], status: "ready", built: { lab: "work-energy", level: "friction-takes-its-cut" } }),
      c("work-variable-force", "Work done by a variable force as an area", { status: "ready", built: { lab: "centre-of-mass", level: "the-area-and-the-rate" } }),
      c("kinetic-energy-theorem", "Kinetic energy and the work–energy theorem", { status: "ready", built: { lab: "work-energy", level: "friction-takes-its-cut" } }),
      c("potential-energy", "Gravitational and elastic potential energy", { buildsOn: ["kinetic-potential-school"], status: "ready", built: { lab: "work-energy", level: "the-energy-ledger" } }),
      c("conservation-of-energy", "Conservation of mechanical energy", { buildsOn: ["energy-conservation-school"], status: "ready", built: { lab: "work-energy", level: "the-energy-ledger" } }),
      c("conservative-forces", "Conservative and non-conservative forces", { status: "ready", built: { lab: "work-energy", level: "friction-takes-its-cut" } }),
      c("power", "Power, average and instantaneous", { status: "ready", built: { lab: "centre-of-mass", level: "the-area-and-the-rate" }, buildsOn: ["power-school"] }),
      c("vertical-circle", "The vertical circle and critical speed", { status: "ready", built: { lab: "centre-of-mass", level: "loops-and-hollows" } }),
      jee("potential-energy-curves", "Reading potential-energy curves and equilibrium", { status: "ready", built: { lab: "centre-of-mass", level: "loops-and-hollows" } }),
    ],
  ),
  chapter(
    "momentum-collisions",
    "Momentum and collisions",
    { grade: 11, kit: "collisions", wave: 3, blurb: "Centre of mass, impulse, and what survives a collision." },
    [
      c("linear-momentum", "Linear momentum and impulse", { status: "ready", built: { lab: "momentum-collisions", level: "bounce-and-rebound" } }),
      c("momentum-conservation", "Conservation of momentum", { status: "ready", built: { lab: "momentum-collisions", level: "what-survives-a-crash" } }),
      c("centre-of-mass", "Centre of mass and its motion", { status: "ready", built: { lab: "centre-of-mass", level: "balance-and-break-up" } }),
      c("elastic-collisions", "Elastic collisions in one dimension", { status: "ready", built: { lab: "momentum-collisions", level: "bounce-and-rebound" } }),
      c("inelastic-collisions", "Inelastic collisions and lost energy", { status: "ready", built: { lab: "momentum-collisions", level: "what-survives-a-crash" } }),
      c("restitution", "Coefficient of restitution", { status: "ready", built: { lab: "momentum-collisions", level: "bounce-and-rebound" } }),
      jee("collisions-2d", "Collisions in two dimensions", { status: "ready", built: { lab: "centre-of-mass", level: "glancing-blows-and-rockets" } }),
      advanced("variable-mass", "Variable-mass systems and the rocket equation", { status: "ready", built: { lab: "centre-of-mass", level: "glancing-blows-and-rockets" } }),
    ],
  ),
]);

/** Extended bodies and the force that holds the solar system together. */
export const rotation = branch("rotation", "Rotation and gravitation", "Spinning bodies, and the law that runs the sky.", [
  chapter(
    "rotational-motion",
    "System of particles and rotational motion",
    { grade: 11, kit: "rotation", wave: 4, blurb: "Everything linear, again, for things that turn." },
    [
      c("angular-kinematics", "Angular displacement, velocity and acceleration", { status: "ready", built: { lab: "rotational-motion", level: "the-turning-effect" } }),
      c("torque", "Torque as the turning effect of a force", { status: "ready", built: { lab: "rotational-motion", level: "the-turning-effect" } }),
      c("moment-of-inertia", "Moment of inertia and radius of gyration", { status: "ready", built: { lab: "rotational-motion", level: "where-the-mass-sits" } }),
      c("parallel-perpendicular-axes", "Parallel and perpendicular axis theorems", { status: "ready", built: { lab: "rolling-and-equilibrium", level: "shifting-the-axis" } }),
      c("rotational-dynamics", "Newton's second law for rotation", { status: "ready", built: { lab: "rotational-motion", level: "the-turning-effect" } }),
      c("angular-momentum", "Angular momentum and its conservation", { status: "ready", built: { lab: "rotational-motion", level: "where-the-mass-sits" } }),
      c("rolling", "Rolling without slipping: energy and acceleration", { status: "ready", built: { lab: "rolling-and-equilibrium", level: "the-rolling-race" } }),
      c("rigid-body-equilibrium", "Equilibrium of rigid bodies and couples", { status: "ready", built: { lab: "rolling-and-equilibrium", level: "balancing-act" } }),
      advanced("combined-motion", "Combined translation and rotation", { status: "ready", built: { lab: "rolling-and-equilibrium", level: "the-rolling-race" } }),
    ],
  ),
  chapter(
    "gravitation",
    "Gravitation",
    { grade: 11, kit: "orbits", wave: 4, blurb: "One inverse-square law, from a dropped stone to a satellite." },
    [
      c("universal-gravitation", "Newton's law of universal gravitation", {
        buildsOn: ["universal-gravitation-school"],
        status: "ready",
        built: { lab: "gravitation", level: "newtons-cannonball" },
      }),
      c("variation-of-g", "How g varies with height, depth and latitude", { status: "ready", built: { lab: "field-and-orbits", level: "how-g-changes" } }),
      c("gravitational-field", "Gravitational field strength", { status: "ready", built: { lab: "field-and-orbits", level: "falling-together" } }),
      c("gravitational-potential", "Gravitational potential and potential energy", {
        status: "ready",
        built: { lab: "gravitation", level: "the-long-way-round" },
      }),
      c("escape-velocity", "Escape velocity", { status: "ready", built: { lab: "gravitation", level: "newtons-cannonball" } }),
      c("satellites", "Orbital velocity, period and geostationary satellites", {
        status: "ready",
        built: { lab: "gravitation", level: "newtons-cannonball" },
      }),
      c("keplers-laws", "Kepler's three laws", { status: "ready", built: { lab: "gravitation", level: "the-long-way-round" } }),
      c("weightlessness", "Weightlessness in orbit", { status: "ready", built: { lab: "field-and-orbits", level: "falling-together" } }),
      advanced("binding-energy-orbit", "Binding energy of an orbit and orbit changes", { status: "ready", built: { lab: "field-and-orbits", level: "the-cost-of-climbing" } }),
    ],
  ),
]);
