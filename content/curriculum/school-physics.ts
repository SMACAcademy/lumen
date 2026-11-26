import { branch, chapter, s } from "./schema";

/**
 * Physics, class 6 to 10, from NCERT science.
 *
 * The foundation the class 11 and 12 chapters stand on: measuring and
 * describing motion, forces and pressure, light and sound, and circuits and
 * magnets. Many of these will be played on the same simulations as their
 * class 11 versions, with fewer controls and plainer words.
 */

export const motionAndForce = branch(
  "motion-and-force",
  "Motion, force and energy",
  "How fast, how hard, and where the energy goes.",
  [
    chapter(
      "measuring-motion",
      "Measurement and motion",
      { grade: 6, kit: "measurement", wave: 31, blurb: "Measuring with the right unit, and the different ways things move." },
      [
        s("measuring-length", "Measuring length with the right unit", { status: "ready", built: { lab: "measuring-and-moving", level: "reading-a-ruler" } }),
        s("standard-units", "Why we need standard units", { status: "ready", built: { lab: "measuring-and-moving", level: "spans-and-scales" }, buildsOn: ["measuring-length"] }),
        s("types-of-motion", "Straight-line, circular and periodic motion", { status: "ready", built: { lab: "measuring-and-moving", level: "swings-and-spins" } }),
      ],
    ),
    chapter(
      "motion-and-time",
      "Motion and time",
      { grade: 7, kit: "kinematics", wave: 30, blurb: "Fast and slow: speed is how far you go in each second." },
      [
        s("speed-school", "Speed: distance ÷ time", { status: "ready", built: { lab: "motion-in-a-straight-line", level: "how-fast" }, buildsOn: ["measuring-length"] }),
        s("distance-time-graph-school", "Distance–time graphs", { status: "ready", built: { lab: "motion-in-a-straight-line", level: "the-journey-graph" }, buildsOn: ["speed-school"] }),
        s("time-pendulum", "Measuring time with a pendulum", { status: "ready", built: { lab: "measuring-and-moving", level: "swings-and-spins" }, buildsOn: ["types-of-motion"] }),
      ],
    ),
    chapter(
      "heat-school",
      "Heat",
      { grade: 7, kit: "thermal", wave: 31, blurb: "Hot and cold, how heat travels, and why the breeze turns round at night." },
      [
        s("hot-cold-thermometer", "Hot, cold and the thermometer", { status: "ready", built: { lab: "hot-and-cold", level: "feel-it-read-it" } }),
        s("heat-transfer-school", "Conduction, convection and radiation", { status: "ready", built: { lab: "hot-and-cold", level: "heat-on-the-move" }, buildsOn: ["hot-cold-thermometer"] }),
        s("sea-land-breeze", "Sea breezes and land breezes", { status: "ready", built: { lab: "hot-and-cold", level: "breeze-by-the-sea" }, buildsOn: ["heat-transfer-school"] }),
      ],
    ),
    chapter(
      "force-and-pressure",
      "Force and pressure",
      { grade: 8, kit: "forces", wave: 31, blurb: "Pushes, pulls, the friction that fights them, and force spread over an area." },
      [
        s("push-pull", "Force: a push or a pull", { status: "ready", built: { lab: "forces-pressure-gravity", level: "push-and-rub" } }),
        s("friction-school", "Friction: the force that resists sliding", { status: "ready", built: { lab: "forces-pressure-gravity", level: "push-and-rub" }, buildsOn: ["push-pull"] }),
        s("pressure-school", "Pressure: force spread over an area", { status: "ready", built: { lab: "forces-pressure-gravity", level: "sharp-and-wide" }, buildsOn: ["push-pull"] }),
        s("liquid-pressure-school", "Pressure in liquids grows with depth", { status: "ready", built: { lab: "properties-of-fluids", level: "the-push-of-water" }, buildsOn: ["pressure-school"] }),
      ],
    ),
    chapter(
      "floating-and-sinking",
      "Floating and sinking",
      { grade: 8, kit: "fluids", wave: 30, blurb: "Why a steel ship floats and a pebble sinks." },
      [
        s("density-school", "Density: how much stuff in each cm³", { status: "ready", built: { lab: "properties-of-fluids", level: "heavy-is-not-the-question" } }),
        s("float-or-sink", "Why some things float and others sink", { status: "ready", built: { lab: "properties-of-fluids", level: "heavy-is-not-the-question" }, buildsOn: ["density-school"] }),
        s("upthrust-school", "Upthrust and Archimedes' principle", { status: "ready", built: { lab: "properties-of-fluids", level: "the-push-of-water" }, buildsOn: ["float-or-sink", "liquid-pressure-school"] }),
      ],
    ),
    chapter(
      "motion-class-9",
      "Motion",
      { grade: 9, kit: "kinematics", wave: 32, blurb: "Velocity, acceleration, and the graphs that hold a whole journey." },
      [
        s("uniform-motion", "Uniform and non-uniform motion", { status: "ready", built: { lab: "motion-in-a-straight-line", level: "steady-or-speeding-up" }, buildsOn: ["speed-school"] }),
        s("velocity-acceleration-school", "Velocity and acceleration", { status: "ready", built: { lab: "motion-in-a-straight-line", level: "steady-or-speeding-up" }, buildsOn: ["uniform-motion"] }),
        s("motion-graphs-school", "Velocity–time graphs and the area under them", { status: "ready", built: { lab: "motion-in-a-straight-line", level: "area-under-the-graph" }, buildsOn: ["velocity-acceleration-school", "distance-time-graph-school"] }),
        s("equations-school", "The three equations of motion", { status: "ready", built: { lab: "motion-in-a-straight-line", level: "area-under-the-graph" }, buildsOn: ["motion-graphs-school"] }),
      ],
    ),
    chapter(
      "laws-of-motion-school",
      "Force and laws of motion",
      { grade: 9, kit: "forces", wave: 32, blurb: "Newton's three laws, met for the first time." },
      [
        s("balanced-forces", "Balanced and unbalanced forces", { status: "ready", built: { lab: "laws-of-motion", level: "balanced-and-unbalanced" }, buildsOn: ["push-pull"] }),
        s("inertia-school", "Inertia and the first law", { status: "ready", built: { lab: "laws-of-motion", level: "balanced-and-unbalanced" }, buildsOn: ["balanced-forces"] }),
        s("momentum-school", "Momentum and the second law", { status: "ready", built: { lab: "momentum-collisions", level: "bumps-and-bounces" }, buildsOn: ["inertia-school"] }),
        s("action-reaction-school", "Action and reaction", { status: "ready", built: { lab: "momentum-collisions", level: "bumps-and-bounces" }, buildsOn: ["balanced-forces"] }),
      ],
    ),
    chapter(
      "gravitation-school",
      "Gravitation",
      { grade: 9, kit: "orbits", wave: 32, blurb: "The pull that drops an apple and holds the Moon." },
      [
        s("universal-gravitation-school", "Every mass pulls on every other", { status: "ready", built: { lab: "forces-pressure-gravity", level: "the-pull-of-gravity" }, buildsOn: ["push-pull"] }),
        s("free-fall-school", "Free fall and g", { status: "ready", built: { lab: "forces-pressure-gravity", level: "the-pull-of-gravity" }, buildsOn: ["universal-gravitation-school"] }),
        s("mass-weight", "Mass and weight", { status: "ready", built: { lab: "forces-pressure-gravity", level: "the-pull-of-gravity" }, buildsOn: ["free-fall-school"] }),
      ],
    ),
    chapter(
      "work-energy-school",
      "Work and energy",
      { grade: 9, kit: "forces", wave: 32, blurb: "Work moves energy about; it changes form but never runs out." },
      [
        s("work-school", "Work: force times distance", { status: "ready", built: { lab: "work-and-power", level: "push-and-lift" }, buildsOn: ["push-pull"] }),
        s("kinetic-potential-school", "Kinetic and potential energy", { status: "ready", built: { lab: "work-energy", level: "lift-and-drop" }, buildsOn: ["work-school"] }),
        s("energy-conservation-school", "Energy changes form but is never lost", { status: "ready", built: { lab: "work-energy", level: "energy-changes-form" }, buildsOn: ["kinetic-potential-school"] }),
        s("power-school", "Power: how fast work is done", { status: "ready", built: { lab: "work-and-power", level: "watts-and-units" }, buildsOn: ["work-school"] }),
      ],
    ),
  ],
  "physics",
);

export const lightAndSound = branch(
  "light-and-sound",
  "Light and sound",
  "Shadows, mirrors, lenses and the things that make a noise.",
  [
    chapter(
      "light-and-shadows",
      "Light, shadows and reflections",
      { grade: 6, kit: "rays", wave: 31, blurb: "Light goes in straight lines — which is why shadows and pinhole cameras work." },
      [
        s("light-straight-lines", "Light travels in straight lines", { status: "ready", built: { lab: "light-and-shadows", level: "shadow-play" } }),
        s("shadows", "Shadows: opaque, translucent and transparent", { status: "ready", built: { lab: "light-and-shadows", level: "shadow-play" }, buildsOn: ["light-straight-lines"] }),
        s("pinhole-camera", "The pinhole camera", { status: "ready", built: { lab: "light-and-shadows", level: "mirror-mirror" }, buildsOn: ["light-straight-lines"] }),
        s("plane-mirror-school", "Reflections in a plane mirror", { status: "ready", built: { lab: "light-and-shadows", level: "mirror-mirror" }, buildsOn: ["light-straight-lines"] }),
      ],
    ),
    chapter(
      "sound-school",
      "Sound",
      { grade: 9, kit: "waves", wave: 32, blurb: "Every sound is something shaking, and the shake needs something to travel through." },
      [
        s("vibration-sound", "Sound comes from vibration", { status: "ready", built: { lab: "sound-and-echoes", level: "making-waves" } }),
        s("sound-needs-medium", "Sound needs a medium to travel", { status: "ready", built: { lab: "sound-and-echoes", level: "making-waves" }, buildsOn: ["vibration-sound"] }),
        s("pitch-loudness", "Pitch, loudness and the shape of the wave", { status: "ready", built: { lab: "sound-and-echoes", level: "making-waves" }, buildsOn: ["vibration-sound"] }),
        s("echo", "Echoes and the speed of sound", { status: "ready", built: { lab: "sound-and-echoes", level: "echoes" }, buildsOn: ["sound-needs-medium"] }),
      ],
    ),
    chapter(
      "light-class-10",
      "Reflection, refraction and the eye",
      { grade: 10, kit: "rays", wave: 32, blurb: "Curved mirrors, bending light, lenses — and the lens you are reading this with." },
      [
        s("laws-of-reflection-school", "The laws of reflection", { status: "ready", built: { lab: "bending-light", level: "into-the-water" }, buildsOn: ["plane-mirror-school"] }),
        s("spherical-mirrors-school", "Concave and convex mirrors", { status: "ready", built: { lab: "mirrors-eye-colours", level: "curved-mirrors" }, buildsOn: ["laws-of-reflection-school"] }),
        s("refraction-school", "Refraction: light bending at a surface", { status: "ready", built: { lab: "bending-light", level: "into-the-water" }, buildsOn: ["light-straight-lines"] }),
        s("lenses-school", "Convex and concave lenses", { status: "ready", built: { lab: "bending-light", level: "through-a-lens" }, buildsOn: ["refraction-school"] }),
        s("human-eye", "The human eye and its defects", { status: "ready", built: { lab: "mirrors-eye-colours", level: "seeing-clearly" }, buildsOn: ["lenses-school"] }),
        s("dispersion-school", "Prisms, rainbows and the blue sky", { status: "ready", built: { lab: "mirrors-eye-colours", level: "rainbow-and-sky" }, buildsOn: ["refraction-school"] }),
      ],
    ),
  ],
  "physics",
);

export const electricityAndMagnets = branch(
  "electricity-and-magnets",
  "Electricity and magnets",
  "Bulbs that light, magnets that pull, and the link between them.",
  [
    chapter(
      "circuits-school",
      "Electricity and circuits",
      { grade: 6, kit: "circuits", wave: 30, blurb: "Close the loop and the bulb lights; break it and it goes out." },
      [
        s("simple-circuit", "A closed circuit lights the bulb", { status: "ready", built: { lab: "simple-circuits", level: "close-the-loop" } }),
        s("conductors-insulators", "Conductors and insulators", { status: "ready", built: { lab: "simple-circuits", level: "conductor-or-insulator" }, buildsOn: ["simple-circuit"] }),
        s("switches", "Switches and circuit diagrams", { status: "ready", built: { lab: "simple-circuits", level: "close-the-loop" }, buildsOn: ["simple-circuit"] }),
        s("cells-batteries-school", "Cells joined into a battery", { status: "ready", built: { lab: "simple-circuits", level: "close-the-loop" }, buildsOn: ["simple-circuit"] }),
      ],
    ),
    chapter(
      "magnets-school",
      "Fun with magnets",
      { grade: 6, kit: "magnetics", wave: 31, blurb: "What a magnet picks up, which ends push apart, and why a compass points north." },
      [
        s("magnetic-materials-school", "Magnetic and non-magnetic materials", { status: "ready", built: { lab: "fun-with-magnets", level: "what-sticks" } }),
        s("magnet-poles", "Poles: like repel, unlike attract", { status: "ready", built: { lab: "fun-with-magnets", level: "poles-apart" }, buildsOn: ["magnetic-materials-school"] }),
        s("compass", "The compass, and the Earth as a magnet", { status: "ready", built: { lab: "fun-with-magnets", level: "poles-apart" }, buildsOn: ["magnet-poles"] }),
      ],
    ),
    chapter(
      "current-effects-school",
      "Effects of electric current",
      { grade: 7, kit: "circuits", wave: 31, blurb: "A current can warm a wire and turn a nail into a magnet." },
      [
        s("heating-effect", "The heating effect of current", { status: "ready", built: { lab: "currents-at-work", level: "heat-and-fuses" }, buildsOn: ["simple-circuit"] }),
        s("electromagnet", "The electromagnet", { status: "ready", built: { lab: "currents-at-work", level: "magnets-from-current" }, buildsOn: ["simple-circuit", "magnet-poles"] }),
        s("electric-safety", "Fuses and electrical safety", { status: "ready", built: { lab: "currents-at-work", level: "heat-and-fuses" }, buildsOn: ["heating-effect"] }),
      ],
    ),
    chapter(
      "electricity-class-10",
      "Electricity",
      { grade: 10, kit: "circuits", wave: 32, blurb: "Current, voltage and resistance, and the rule that ties them together." },
      [
        s("current-potential-school", "Current and potential difference", { status: "ready", built: { lab: "current-and-resistance", level: "ohms-law" }, buildsOn: ["cells-batteries-school"] }),
        s("ohms-law-school", "Ohm's law", { status: "ready", built: { lab: "current-and-resistance", level: "ohms-law" }, buildsOn: ["current-potential-school"] }),
        s("resistors-school", "Resistors in series and parallel", { status: "ready", built: { lab: "current-and-resistance", level: "series-or-parallel" }, buildsOn: ["ohms-law-school"] }),
        s("electric-power-school", "Electric power and the heating effect", { status: "ready", built: { lab: "current-and-resistance", level: "series-or-parallel" }, buildsOn: ["heating-effect", "ohms-law-school"] }),
      ],
    ),
    chapter(
      "magnetic-effects-school",
      "Magnetic effects of current",
      { grade: 10, kit: "magnetics", wave: 32, blurb: "The field around a wire, and the motors and generators built on it." },
      [
        s("field-lines-school", "Magnetic field lines around a magnet", { status: "ready", built: { lab: "currents-at-work", level: "magnets-from-current" }, buildsOn: ["magnet-poles"] }),
        s("field-of-current-school", "The field around a current-carrying wire", { status: "ready", built: { lab: "currents-at-work", level: "magnets-from-current" }, buildsOn: ["field-lines-school", "electromagnet"] }),
        s("motor-generator", "The motor and the generator", { status: "ready", built: { lab: "currents-at-work", level: "motors-and-generators" }, buildsOn: ["field-of-current-school"] }),
      ],
    ),
  ],
  "physics",
);

export const schoolPhysicsBranches = [motionAndForce, lightAndSound, electricityAndMagnets];
