import { advanced, branch, c, chapter, jee } from "./schema";

/** Light: first as rays, then as waves. */
export const optics = branch("optics", "Optics", "Light as rays and as waves — the most drawable chapter in the book.", [
  chapter(
    "ray-optics",
    "Ray optics and optical instruments",
    { grade: 12, kit: "rays", wave: 12, blurb: "Drag an object in front of a mirror or lens and watch the image move." },
    [
      c("reflection-plane-mirror", "Reflection and plane mirrors", { status: "ready", built: { lab: "ray-optics", level: "mirror-images" }, buildsOn: ["laws-of-reflection-school"] }),
      c("spherical-mirrors", "Concave and convex mirrors, and the mirror formula", { status: "ready", built: { lab: "ray-optics", level: "mirror-images" }, buildsOn: ["spherical-mirrors-school"] }),
      c("magnification", "Magnification and the nature of an image", { status: "ready", built: { lab: "ray-optics", level: "mirror-images" } }),
      c("refraction-snell", "Refraction and Snell's law", { status: "ready", built: { lab: "ray-optics", level: "trapped-light" }, buildsOn: ["refraction-school"] }),
      c("total-internal-reflection", "Total internal reflection and optical fibres", { status: "ready", built: { lab: "ray-optics", level: "trapped-light" } }),
      c("refraction-spherical-surface", "Refraction at a spherical surface", { status: "ready", built: { lab: "ray-optics", level: "lens-images" } }),
      c("lens-maker", "The lens maker's formula", { status: "ready", built: { lab: "ray-optics", level: "lens-images" } }),
      c("thin-lens", "The thin lens formula and ray diagrams", { status: "ready", built: { lab: "ray-optics", level: "lens-images" }, buildsOn: ["lenses-school"] }),
      c("lens-combinations", "Lenses in combination and power", { status: "ready", built: { lab: "ray-optics", level: "lens-images" } }),
      c("prism", "Refraction through a prism and minimum deviation", { status: "ready", built: { lab: "ray-optics", level: "trapped-light" } }),
      c("dispersion", "Dispersion and the spectrum", { status: "ready", built: { lab: "ray-optics", level: "trapped-light" }, buildsOn: ["dispersion-school"] }),
      c("scattering", "Scattering: why the sky is blue", { status: "ready", built: { lab: "ray-optics", level: "looking-closer" }, exams: ["neet", "jee-main"] }),
      c("eye-defects", "The human eye and its defects", { status: "ready", built: { lab: "ray-optics", level: "looking-closer" }, buildsOn: ["human-eye"], exams: ["neet", "jee-main"] }),
      c("microscope-telescope", "Microscope and telescope", { status: "ready", built: { lab: "ray-optics", level: "looking-closer" } }),
    ],
  ),
  chapter(
    "wave-optics",
    "Wave optics",
    { grade: 12, kit: "waveoptics", wave: 13, blurb: "Two slits, one screen, and proof that light is a wave." },
    [
      c("huygens", "Huygens' principle", { status: "ready", built: { lab: "wave-optics", level: "wavefronts-and-fringes" } }),
      c("coherence-interference", "Coherence and interference", { status: "ready", built: { lab: "wave-optics", level: "wavefronts-and-fringes" } }),
      c("youngs-double-slit", "Young's double-slit experiment", { status: "ready", built: { lab: "wave-optics", level: "wavefronts-and-fringes" } }),
      c("fringe-width", "Fringe width and what changes it", { status: "ready", built: { lab: "wave-optics", level: "wavefronts-and-fringes" } }),
      c("intensity-distribution", "Intensity in an interference pattern", { status: "ready", built: { lab: "wave-optics", level: "diffraction-and-resolution" } }),
      c("single-slit-diffraction", "Single-slit diffraction", { status: "ready", built: { lab: "wave-optics", level: "diffraction-and-resolution" } }),
      c("resolving-power", "Resolving power of instruments", { status: "ready", built: { lab: "wave-optics", level: "diffraction-and-resolution" }, exams: ["jee-main", "jee-adv"] }),
      c("polarisation", "Polarisation and Malus's law", { status: "ready", built: { lab: "wave-optics", level: "polaroids-and-films" } }),
      c("brewster", "Brewster's angle", { status: "ready", built: { lab: "wave-optics", level: "polaroids-and-films" } }),
      advanced("thin-film-interference", "Thin-film interference", { status: "ready", built: { lab: "wave-optics", level: "polaroids-and-films" } }),
    ],
  ),
]);

/** Where classical physics runs out. */
export const modern = branch("modern", "Modern physics", "Photons, atoms, nuclei and the devices built from them.", [
  chapter(
    "dual-nature",
    "Dual nature of radiation and matter",
    { grade: 12, kit: "quantum", wave: 13, blurb: "Shine light on a metal; the graph that broke classical physics." },
    [
      c("photoelectric-effect", "The photoelectric effect", { status: "ready", built: { lab: "photoelectric-effect", level: "light-on-a-metal" } }),
      c("work-function-threshold", "Work function and threshold frequency", { status: "ready", built: { lab: "photoelectric-effect", level: "light-on-a-metal" } }),
      c("stopping-potential", "Stopping potential and the I–V graph", { status: "ready", built: { lab: "photoelectric-effect", level: "stopping-the-electrons" } }),
      c("einstein-equation", "Einstein's photoelectric equation", { status: "ready", built: { lab: "photoelectric-effect", level: "stopping-the-electrons" } }),
      c("photon-momentum", "The photon: energy and momentum", { status: "ready", built: { lab: "photoelectric-effect", level: "photons-and-electron-waves" } }),
      c("de-broglie", "De Broglie wavelength of matter", { status: "ready", built: { lab: "nucleus-and-matter-waves", level: "matter-waves" } }),
      c("davisson-germer", "The Davisson–Germer experiment", { status: "ready", built: { lab: "photoelectric-effect", level: "photons-and-electron-waves" } }),
    ],
  ),
  chapter(
    "atoms",
    "Atoms",
    { grade: 12, kit: "quantum", wave: 14, blurb: "Energy levels you can climb, and the spectrum they emit." },
    [
      c("rutherford", "Rutherford scattering and the nuclear atom", { status: "ready", built: { lab: "nucleus-and-matter-waves", level: "finding-the-nucleus" } }),
      c("bohr-model", "Bohr's postulates and allowed orbits", { status: "ready", built: { lab: "hydrogen-spectrum", level: "the-red-line" } }),
      c("energy-levels", "Energy levels of hydrogen", { status: "ready", built: { lab: "hydrogen-spectrum", level: "the-red-line" } }),
      c("spectral-series", "Spectral series: Lyman, Balmer and the rest", { status: "ready", built: { lab: "hydrogen-spectrum", level: "series-and-limits" } }),
      c("excitation-ionisation", "Excitation and ionisation energy", { status: "ready", built: { lab: "hydrogen-spectrum", level: "series-and-limits" } }),
      advanced("hydrogen-like-ions", "Hydrogen-like ions and the Z dependence", { status: "ready", built: { lab: "hydrogen-spectrum", level: "series-and-limits" } }),
    ],
  ),
  chapter(
    "nuclei",
    "Nuclei",
    { grade: 12, kit: "nuclear", wave: 14, blurb: "Mass that turns into energy, and decay you can only predict on average." },
    [
      c("nuclear-size-density", "Nuclear size, mass number and density", { status: "ready", built: { lab: "nuclei", level: "tiny-and-dense" } }),
      c("mass-defect-binding", "Mass defect and binding energy", { status: "ready", built: { lab: "nuclei", level: "tiny-and-dense" } }),
      c("binding-energy-curve", "The binding-energy curve and stability", { status: "ready", built: { lab: "nuclei", level: "towards-iron" } }),
      c("radioactivity", "Alpha, beta and gamma decay", { status: "ready", built: { lab: "nuclei", level: "a-half-at-a-time" } }),
      c("decay-law", "The decay law, half-life and mean life", { status: "ready", built: { lab: "nuclei", level: "a-half-at-a-time" } }),
      c("fission", "Nuclear fission and chain reactions", { status: "ready", built: { lab: "nuclei", level: "towards-iron" } }),
      c("fusion", "Nuclear fusion and stellar energy", { status: "ready", built: { lab: "nuclei", level: "towards-iron" } }),
    ],
  ),
  chapter(
    "semiconductors",
    "Semiconductor electronics",
    { grade: 12, kit: "semiconductor", wave: 15, blurb: "Bands, junctions and the diode that only lets current one way." },
    [
      c("energy-bands", "Energy bands in solids", { status: "ready", built: { lab: "semiconductors", level: "bands-and-holes" } }),
      c("intrinsic-extrinsic", "Intrinsic and extrinsic semiconductors, n-type and p-type", { status: "ready", built: { lab: "semiconductors", level: "bands-and-holes" } }),
      c("pn-junction", "The p–n junction and the depletion layer", { status: "ready", built: { lab: "semiconductors", level: "bands-and-holes" } }),
      c("diode-iv", "Diode characteristics in forward and reverse bias", { status: "ready", built: { lab: "semiconductors", level: "one-way-street" } }),
      c("rectifiers", "Half-wave and full-wave rectifiers", { status: "ready", built: { lab: "semiconductors", level: "one-way-street" } }),
      c("zener", "The Zener diode as a voltage regulator", { status: "ready", built: { lab: "semiconductors", level: "one-way-street" } }),
      c("optoelectronic", "LED, photodiode and solar cell", { status: "ready", built: { lab: "semiconductors", level: "light-and-logic" } }),
      jee("transistor", "Transistor action and amplification", { status: "ready", built: { lab: "semiconductors", level: "light-and-logic" } }),
      jee("logic-gates", "Logic gates", { status: "ready", built: { lab: "semiconductors", level: "light-and-logic" } }),
    ],
  ),
  chapter(
    "experimental-skills",
    "Experimental skills",
    { grade: 12, kit: "measurement", wave: 15, blurb: "The practical questions: instruments, readings and their errors." },
    [
      jee("vernier-practical", "Vernier callipers and screw gauge readings", { status: "ready", built: { lab: "units-and-measurement", level: "how-many-figures" } }),
      jee("pendulum-experiment", "Finding g with a simple pendulum", { status: "ready", built: { lab: "oscillations", level: "springs-and-pendulums" } }),
      jee("resistivity-experiment", "Resistivity with a metre bridge", { status: "ready", built: { lab: "current-electricity", level: "loops-and-bridges" } }),
      jee("focal-length-experiment", "Focal length of a mirror and a lens", { status: "ready", built: { lab: "ray-optics", level: "mirror-images" } }),
      jee("viscosity-experiment", "Terminal velocity and coefficient of viscosity", { status: "ready", built: { lab: "fluids-in-motion", level: "thick-and-thin" } }),
      jee("resonance-tube", "Speed of sound with a resonance tube", { status: "ready", built: { lab: "waves-and-sound", level: "standing-waves" } }),
    ],
  ),
]);
