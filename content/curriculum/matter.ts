import { advanced, branch, c, chapter, jee } from "./schema";

/** Matter in bulk: how it stretches, flows, warms and does work. */
export const matter = branch("matter", "Matter and heat", "Solids, fluids, temperature and the engines that use them.", [
  chapter(
    "properties-of-solids",
    "Mechanical properties of solids",
    { grade: 11, kit: "materials", wave: 5, blurb: "Stretch a bar and watch stress, strain and the limits of elasticity." },
    [
      c("stress-strain", "Stress and strain", { status: "ready", built: { lab: "properties-of-solids", level: "the-wire-that-stretches" } }),
      c("hookes-law", "Hooke's law and Young's modulus", {
        status: "ready",
        built: { lab: "properties-of-solids", level: "the-wire-that-stretches" },
      }),
      c("stress-strain-curve", "The stress–strain curve: elastic limit and breaking point", {
        status: "ready",
        built: { lab: "properties-of-solids", level: "where-it-gives-way" },
      }),
      c("bulk-shear-modulus", "Bulk modulus and shear modulus", { status: "ready", built: { lab: "elastic-moduli", level: "squeeze-and-shear" } }),
      c("elastic-energy", "Energy stored in a stretched wire", {
        status: "ready",
        built: { lab: "properties-of-solids", level: "where-it-gives-way" },
      }),
      jee("poissons-ratio", "Poisson's ratio", { status: "ready", built: { lab: "elastic-moduli", level: "thinner-as-it-stretches" } }),
    ],
  ),
  chapter(
    "properties-of-fluids",
    "Mechanical properties of fluids",
    { grade: 11, kit: "fluids", wave: 5, blurb: "Pressure, floating, flow — and why a fast stream has low pressure." },
    [
      c("pressure-depth", "Pressure in a fluid and its variation with depth", {
        buildsOn: ["liquid-pressure-school"],
        status: "ready",
        built: { lab: "properties-of-fluids", level: "how-deep-is-deep" },
      }),
      c("pascals-law", "Pascal's law and the hydraulic lift", { status: "ready", built: { lab: "fluids-in-motion", level: "push-and-flow" } }),
      c("archimedes", "Buoyancy, Archimedes' principle and floating", {
        buildsOn: ["upthrust-school"],
        status: "ready",
        built: { lab: "properties-of-fluids", level: "what-floats" },
      }),
      c("continuity", "Streamline flow and the equation of continuity", { status: "ready", built: { lab: "fluids-in-motion", level: "push-and-flow" } }),
      c("bernoulli", "Bernoulli's principle and its applications", { status: "ready", built: { lab: "fluids-in-motion", level: "push-and-flow" } }),
      c("viscosity", "Viscosity and Stokes' law", { status: "ready", built: { lab: "fluids-in-motion", level: "thick-and-thin" } }),
      c("terminal-velocity", "Terminal velocity", { status: "ready", built: { lab: "fluids-in-motion", level: "thick-and-thin" } }),
      c("surface-tension", "Surface tension, drops and bubbles", { status: "ready", built: { lab: "fluids-in-motion", level: "drops-and-tubes" } }),
      c("capillarity", "Capillary rise and the angle of contact", { status: "ready", built: { lab: "fluids-in-motion", level: "drops-and-tubes" } }),
      jee("reynolds-number", "Reynolds number and turbulence", { status: "ready", built: { lab: "fluids-in-motion", level: "thick-and-thin" } }),
    ],
  ),
  chapter(
    "thermal-properties",
    "Thermal properties of matter",
    { grade: 11, kit: "thermal", wave: 5, blurb: "Expansion, heat capacity, phase change and the three ways heat travels." },
    [
      c("temperature-scales", "Temperature and its scales", { status: "ready", built: { lab: "heat-transfer", level: "stretch-and-scale" }, buildsOn: ["hot-cold-thermometer"] }),
      c("thermal-expansion", "Linear, area and volume expansion", { status: "ready", built: { lab: "heat-transfer", level: "stretch-and-scale" } }),
      c("specific-heat", "Specific heat capacity and calorimetry", {
        status: "ready",
        built: { lab: "thermal-properties", level: "the-stubborn-thermometer" },
      }),
      c("latent-heat", "Latent heat and phase change", {
        buildsOn: ["changes-of-state"],
        status: "ready",
        built: { lab: "thermal-properties", level: "where-the-heat-hides" },
      }),
      c("conduction", "Conduction and thermal resistance", { status: "ready", built: { lab: "heat-transfer", level: "down-the-rod" }, buildsOn: ["heat-transfer-school"] }),
      c("convection-radiation", "Convection and radiation", { status: "ready", built: { lab: "heat-transfer", level: "glow-and-cool" } }),
      c("newtons-cooling", "Newton's law of cooling", { status: "ready", built: { lab: "heat-transfer", level: "glow-and-cool" } }),
      c("stefan-wien", "Stefan–Boltzmann law and Wien's displacement law", { status: "ready", built: { lab: "heat-transfer", level: "glow-and-cool" } }),
      jee("composite-slabs", "Composite slabs and rods in series and parallel", { status: "ready", built: { lab: "heat-transfer", level: "down-the-rod" } }),
    ],
  ),
  chapter(
    "thermodynamics",
    "Thermodynamics",
    { grade: 11, kit: "gas", wave: 6, blurb: "Push a piston and account for every joule, on a PV diagram." },
    [
      c("thermal-equilibrium", "Thermal equilibrium and the zeroth law", { status: "ready", built: { lab: "thermodynamics", level: "first-law" } }),
      c("internal-energy-first-law", "Internal energy and the first law", { status: "ready", built: { lab: "thermodynamics", level: "first-law" } }),
      c("pv-work", "Work done as area under a PV curve", { status: "ready", built: { lab: "thermodynamics", level: "four-processes" } }),
      c("isothermal-adiabatic", "Isothermal, adiabatic, isobaric and isochoric processes", { status: "ready", built: { lab: "thermodynamics", level: "four-processes" } }),
      c("cyclic-processes", "Cyclic processes and net work", { status: "ready", built: { lab: "thermodynamics", level: "engines-and-fridges" } }),
      c("second-law-thermo", "The second law and reversibility", { status: "ready", built: { lab: "thermodynamics", level: "engines-and-fridges" } }),
      c("heat-engines", "Heat engines and efficiency", { status: "ready", built: { lab: "thermodynamics", level: "engines-and-fridges" } }),
      c("carnot", "The Carnot cycle", { status: "ready", built: { lab: "thermodynamics", level: "engines-and-fridges" } }),
      c("refrigerator", "Refrigerators and coefficient of performance", { status: "ready", built: { lab: "thermodynamics", level: "engines-and-fridges" } }),
    ],
  ),
  chapter(
    "kinetic-theory",
    "Kinetic theory of gases",
    { grade: 11, kit: "gas", wave: 6, blurb: "A box of bouncing molecules, and where pressure and temperature come from." },
    [
      c("ideal-gas-law", "The ideal gas equation", { status: "ready", built: { lab: "kinetic-theory", level: "molecules-in-a-box" } }),
      c("pressure-from-molecules", "Pressure from molecular collisions", { status: "ready", built: { lab: "kinetic-theory", level: "molecules-in-a-box" }, buildsOn: ["particle-model"] }),
      c("temperature-kinetic", "Temperature as average kinetic energy", { status: "ready", built: { lab: "kinetic-theory", level: "molecules-in-a-box" } }),
      c("molecular-speeds", "RMS, average and most probable speeds", { status: "ready", built: { lab: "kinetic-theory", level: "how-fast-molecules-move" } }),
      c("degrees-of-freedom", "Degrees of freedom and equipartition", { status: "ready", built: { lab: "kinetic-theory", level: "heat-capacities-of-gases" } }),
      c("specific-heats-gases", "Cp, Cv and γ for gases", { status: "ready", built: { lab: "kinetic-theory", level: "heat-capacities-of-gases" } }),
      c("mean-free-path", "Mean free path", { status: "ready", built: { lab: "kinetic-theory", level: "how-fast-molecules-move" } }),
      advanced("maxwell-distribution", "The Maxwell speed distribution", { status: "ready", built: { lab: "kinetic-theory", level: "how-fast-molecules-move" } }),
    ],
  ),
]);

/** Repeating motion, and the travelling disturbances it creates. */
export const waves = branch("waves", "Oscillations and waves", "Things that repeat, and the disturbances they send out.", [
  chapter(
    "oscillations",
    "Oscillations",
    { grade: 11, kit: "oscillator", wave: 7, blurb: "Simple harmonic motion: the circle's shadow, now with a mass on a spring." },
    [
      c("shm-definition", "What makes motion simple harmonic", { status: "ready", built: { lab: "oscillations", level: "springs-and-pendulums" } }),
      c("shm-equation", "Displacement, velocity and acceleration in SHM", { status: "ready", built: { lab: "oscillations", level: "springs-and-pendulums" } }),
      c("shm-phase", "Phase, phase difference and initial conditions", { status: "ready", built: { lab: "oscillations", level: "springs-and-pendulums" } }),
      c("spring-mass", "The spring–mass system and its period", { status: "ready", built: { lab: "oscillations", level: "springs-and-pendulums" } }),
      c("simple-pendulum", "The simple pendulum", { status: "ready", built: { lab: "oscillations", level: "springs-and-pendulums" }, buildsOn: ["time-pendulum"] }),
      c("shm-energy", "Kinetic and potential energy in SHM", { status: "ready", built: { lab: "oscillations", level: "energy-in-shm" } }),
      c("spring-combinations", "Springs in series and parallel", { status: "ready", built: { lab: "oscillations", level: "energy-in-shm" } }),
      c("damped-forced", "Damped and forced oscillations, and resonance", { status: "ready", built: { lab: "oscillations", level: "damped-and-driven" } }),
      advanced("angular-shm", "Angular SHM and the physical pendulum", { status: "ready", built: { lab: "oscillations", level: "damped-and-driven" } }),
    ],
  ),
  chapter(
    "waves-and-sound",
    "Waves and sound",
    { grade: 11, kit: "waves", wave: 7, blurb: "Superposition, standing waves, beats and the Doppler shift." },
    [
      c("wave-types", "Transverse and longitudinal waves", { status: "ready", built: { lab: "waves-and-sound", level: "travelling-waves" }, buildsOn: ["sound-needs-medium"] }),
      c("wave-equation", "The travelling wave y(x, t)", { status: "ready", built: { lab: "waves-and-sound", level: "travelling-waves" } }),
      c("wave-speed-string", "Speed of a wave on a string", { status: "ready", built: { lab: "waves-and-sound", level: "travelling-waves" } }),
      c("speed-of-sound", "Speed of sound in a medium", { status: "ready", built: { lab: "waves-and-sound", level: "travelling-waves" }, buildsOn: ["echo"] }),
      c("superposition", "Superposition and interference of waves", { status: "ready", built: { lab: "waves-and-sound", level: "standing-waves" } }),
      c("reflection-of-waves", "Reflection at fixed and free ends", { status: "ready", built: { lab: "waves-and-sound", level: "standing-waves" } }),
      c("standing-waves-strings", "Standing waves on a string and harmonics", { status: "ready", built: { lab: "waves-and-sound", level: "standing-waves" } }),
      c("air-columns", "Open and closed air columns", { status: "ready", built: { lab: "waves-and-sound", level: "standing-waves" } }),
      c("beats", "Beats", { status: "ready", built: { lab: "waves-and-sound", level: "beats-and-doppler" } }),
      c("doppler-sound", "The Doppler effect for sound", { status: "ready", built: { lab: "waves-and-sound", level: "beats-and-doppler" } }),
      c("intensity-loudness", "Intensity, loudness and the decibel", { status: "ready", built: { lab: "waves-and-sound", level: "beats-and-doppler" }, buildsOn: ["pitch-loudness"], exams: ["neet", "jee-main"] }),
    ],
  ),
]);
