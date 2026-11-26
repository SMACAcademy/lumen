import { branch, c, chapter } from "./schema";

/**
 * Chemistry, class 11 and 12, as NEET and JEE both examine it.
 *
 * The first two labs are built — the hydrogen spectrum and reaction rates —
 * and the rest is catalogued so the app can be honest about all three
 * subjects from the first screen, and so the kits it will need are visible
 * early: several are shared with physics (the gas kit that
 * kinetic theory needs is the same one gas laws and chemical kinetics use),
 * and the 3D molecule viewer serves bonding, shapes and every organic chapter.
 */

export const physicalChemistry = branch(
  "physical-chemistry",
  "Physical chemistry",
  "Moles, atoms, energy, equilibrium and rates — chemistry with numbers.",
  [
    chapter(
      "basic-concepts",
      "Some basic concepts of chemistry",
      { grade: 11, kit: "reactions", wave: 24, blurb: "The mole: counting particles by weighing them." },
      [
        c("mole-concept", "The mole and Avogadro's number", { buildsOn: ["mole-school"], status: "ready", built: { lab: "moles-and-reactions", level: "counting-by-weighing" } }),
        c("atomic-molecular-mass", "Atomic and molecular masses", { buildsOn: ["atoms-molecules"], status: "ready", built: { lab: "formulae-and-concentration", level: "whats-in-a-formula" } }),
        c("empirical-formula", "Percentage composition, empirical and molecular formulae", { status: "ready", built: { lab: "formulae-and-concentration", level: "whats-in-a-formula" } }),
        c("stoichiometry", "Stoichiometry and balanced equations", { buildsOn: ["balancing-equations"], status: "ready", built: { lab: "moles-and-reactions", level: "counting-by-weighing" } }),
        c("limiting-reagent", "The limiting reagent", { status: "ready", built: { lab: "moles-and-reactions", level: "the-limiting-reagent" } }),
        c("concentration-terms", "Molarity, molality and mole fraction", { status: "ready", built: { lab: "formulae-and-concentration", level: "how-strong-is-it" } }),
      ],
    ),
    chapter(
      "atomic-structure",
      "Structure of the atom",
      { grade: 11, kit: "atoms", wave: 22, blurb: "From Bohr's circles to orbitals you can turn in your hand." },
      [
        c("atomic-models", "Discovery of the electron, proton and nucleus", { buildsOn: ["subatomic-particles"], status: "ready", built: { lab: "nucleus-and-matter-waves", level: "finding-the-nucleus" } }),
        c("bohr-model-chem", "The Bohr model and the hydrogen spectrum", { buildsOn: ["bohr-shells"], status: "ready", built: { lab: "hydrogen-spectrum", level: "the-red-line" } }),
        c("dual-nature-matter", "Dual nature of matter and the uncertainty principle", { status: "ready", built: { lab: "nucleus-and-matter-waves", level: "matter-waves" } }),
        c("quantum-numbers", "Quantum numbers", { status: "ready", built: { lab: "atomic-orbitals", level: "shapes-and-nodes" } }),
        c("orbital-shapes", "Shapes of s, p and d orbitals", { status: "ready", built: { lab: "atomic-orbitals", level: "shapes-and-nodes" } }),
        c("electron-configuration", "Aufbau, Pauli and Hund: filling the orbitals", { status: "ready", built: { lab: "atomic-orbitals", level: "filling-the-boxes" } }),
      ],
    ),
    chapter(
      "chemical-thermodynamics",
      "Thermodynamics",
      { grade: 11, kit: "reactions", wave: 24, blurb: "Which reactions give out heat, and which ones happen at all." },
      [
        c("system-surroundings", "Systems, surroundings and state functions", { status: "ready", built: { lab: "enthalpy-and-hess", level: "hot-and-cold" } }),
        c("enthalpy", "The first law and enthalpy change", { status: "ready", built: { lab: "enthalpy-and-hess", level: "hot-and-cold" } }),
        c("hess-law", "Hess's law and enthalpies of reaction", { status: "ready", built: { lab: "enthalpy-and-hess", level: "hess-cycles" } }),
        c("entropy", "Entropy and the second law", { status: "ready", built: { lab: "gibbs-energy", level: "four-kinds-of-reaction" } }),
        c("gibbs-energy", "Gibbs energy and spontaneity", { status: "ready", built: { lab: "gibbs-energy", level: "why-ice-melts" } }),
      ],
    ),
    chapter(
      "equilibrium",
      "Equilibrium",
      { grade: 11, kit: "reactions", wave: 24, blurb: "Reactions that run both ways, and the balance they settle into." },
      [
        c("dynamic-equilibrium", "Dynamic equilibrium and the law of mass action", { status: "ready", built: { lab: "chemical-equilibrium", level: "push-and-it-pushes-back" } }),
        c("kc-kp", "Equilibrium constants Kc and Kp", { status: "ready", built: { lab: "chemical-equilibrium", level: "the-haber-compromise" } }),
        c("le-chatelier", "Le Chatelier's principle", { status: "ready", built: { lab: "chemical-equilibrium", level: "push-and-it-pushes-back" } }),
        c("acids-bases", "Acids, bases and the pH scale", { buildsOn: ["ph-scale-school"], status: "ready", built: { lab: "acids-and-bases", level: "one-drop" } }),
        c("ionisation-constants", "Ionisation of weak acids and bases", { status: "ready", built: { lab: "acids-and-bases", level: "weak-acids-and-buffers" } }),
        c("buffers", "Buffer solutions", { status: "ready", built: { lab: "acids-and-bases", level: "weak-acids-and-buffers" } }),
        c("solubility-product", "Solubility product and precipitation", { status: "ready", built: { lab: "solubility-product", level: "will-it-precipitate" } }),
        c("common-ion-effect", "The common-ion effect", { status: "ready", built: { lab: "solubility-product", level: "the-common-ion" } }),
      ],
    ),
    chapter(
      "redox",
      "Redox reactions",
      { grade: 11, kit: "electrochem", wave: 25, blurb: "Electrons changing hands, and how to keep count of them." },
      [
        c("oxidation-number", "Oxidation and reduction, and oxidation numbers", { status: "ready", built: { lab: "redox-reactions", level: "oxidation-numbers" }, buildsOn: ["oxidation-reduction-school"] }),
        c("balancing-redox", "Balancing redox equations", { status: "ready", built: { lab: "redox-reactions", level: "balance-the-electrons" } }),
        c("redox-electrodes", "Redox reactions and electrode processes", { status: "ready", built: { lab: "redox-reactions", level: "balance-the-electrons" } }),
      ],
    ),
    chapter(
      "solutions",
      "Solutions",
      { grade: 12, kit: "solutions", wave: 25, blurb: "What dissolving does to boiling, freezing and vapour pressure." },
      [
        c("solubility", "Types of solution and solubility", { status: "ready", built: { lab: "liquid-mixtures", level: "ideal-or-not" } }),
        c("raoults-law", "Vapour pressure and Raoult's law", { status: "ready", built: { lab: "liquid-mixtures", level: "vapour-over-mixtures" } }),
        c("ideal-nonideal", "Ideal and non-ideal solutions", { status: "ready", built: { lab: "liquid-mixtures", level: "ideal-or-not" } }),
        c("colligative-properties", "Colligative properties: boiling and freezing points", { status: "ready", built: { lab: "colligative-properties", level: "salt-on-the-road" } }),
        c("osmotic-pressure", "Osmosis and osmotic pressure", { status: "ready", built: { lab: "colligative-properties", level: "pasta-water-and-pairs" } }),
        c("vant-hoff-factor", "Abnormal molar masses and the van't Hoff factor", { status: "ready", built: { lab: "colligative-properties", level: "pasta-water-and-pairs" } }),
      ],
    ),
    chapter(
      "electrochemistry",
      "Electrochemistry",
      { grade: 12, kit: "electrochem", wave: 25, blurb: "Batteries, electrolysis, and the voltage a reaction can deliver." },
      [
        c("galvanic-cells", "Galvanic cells", { status: "ready", built: { lab: "galvanic-cells", level: "the-daniell-cell" } }),
        c("electrode-potentials", "Standard electrode potentials and cell EMF", { status: "ready", built: { lab: "galvanic-cells", level: "the-daniell-cell" } }),
        c("nernst-equation", "The Nernst equation", { status: "ready", built: { lab: "galvanic-cells", level: "why-batteries-go-flat" } }),
        c("gibbs-emf", "Gibbs energy and cell EMF", { status: "ready", built: { lab: "batteries-and-corrosion", level: "cells-and-energy" } }),
        c("conductance", "Conductance, molar conductivity and Kohlrausch's law", { status: "ready", built: { lab: "electrolysis-and-conductance", level: "ions-on-the-move" } }),
        c("electrolysis", "Electrolysis and Faraday's laws", { status: "ready", built: { lab: "electrolysis-and-conductance", level: "faradays-laws" } }),
        c("batteries-corrosion", "Batteries, fuel cells and corrosion", { status: "ready", built: { lab: "batteries-and-corrosion", level: "stopping-rust" } }),
      ],
    ),
    chapter(
      "chemical-kinetics",
      "Chemical kinetics",
      { grade: 12, kit: "reactions", wave: 24, blurb: "How fast reactions go, and what speeds them up." },
      [
        c("reaction-rate", "Rate of a reaction", { status: "ready", built: { lab: "reaction-rates", level: "half-and-half-again" } }),
        c("rate-law-order", "Rate law, order and molecularity", { status: "ready", built: { lab: "rate-laws", level: "finding-the-order" } }),
        c("integrated-rate-laws", "Integrated rate laws for zero and first order", { status: "ready", built: { lab: "rate-laws", level: "straight-line-plots" } }),
        c("half-life", "Half-life", { status: "ready", built: { lab: "reaction-rates", level: "half-and-half-again" } }),
        c("arrhenius", "Temperature, activation energy and the Arrhenius equation", { status: "ready", built: { lab: "reaction-rates", level: "ten-degrees-hotter" } }),
        c("collision-theory", "Collision theory", { status: "ready", built: { lab: "rate-laws", level: "collisions-that-count" } }),
      ],
    ),
  ],
  "chemistry",
);

export const inorganicChemistry = branch(
  "inorganic-chemistry",
  "Inorganic chemistry",
  "The periodic table, bonding, and the elements block by block.",
  [
    chapter(
      "periodicity",
      "Classification of elements and periodicity",
      { grade: 11, kit: "atoms", wave: 22, blurb: "Why the periodic table is shaped the way it is, and the trends across it." },
      [
        c("periodic-table", "The modern periodic law and table", { buildsOn: ["modern-periodic-school"], status: "ready", built: { lab: "periodic-trends", level: "groups-and-valency" } }),
        c("atomic-radius-trend", "Trends in atomic and ionic radius", { buildsOn: ["trends-school"], status: "ready", built: { lab: "periodic-trends", level: "across-and-down" } }),
        c("ionisation-enthalpy", "Ionisation enthalpy", { status: "ready", built: { lab: "periodic-trends", level: "the-exceptions" } }),
        c("electron-gain", "Electron gain enthalpy and electronegativity", { status: "ready", built: { lab: "periodic-trends", level: "the-exceptions" } }),
        c("valency-trends", "Valency and trends in chemical reactivity", { status: "ready", built: { lab: "periodic-trends", level: "groups-and-valency" } }),
      ],
    ),
    chapter(
      "chemical-bonding",
      "Chemical bonding and molecular structure",
      { grade: 11, kit: "molecules", wave: 23, blurb: "Why atoms stick together, and the shapes the molecules take." },
      [
        c("ionic-covalent", "Ionic and covalent bonds, and Lewis structures", { status: "ready", built: { lab: "lewis-structures", level: "counting-electrons" } }),
        c("formal-charge-resonance", "Formal charge and resonance", { buildsOn: ["ionic-covalent"], status: "ready", built: { lab: "lewis-structures", level: "formal-charge-and-resonance" } }),
        c("bond-parameters", "Bond length, angle, enthalpy and order", { status: "ready", built: { lab: "molecular-orbitals", level: "why-oxygen-is-magnetic" } }),
        c("vsepr", "VSEPR theory and the shapes of molecules", { status: "ready", built: { lab: "molecular-shapes", level: "pairs-push-apart" } }),
        c("hybridisation", "Hybridisation", { status: "ready", built: { lab: "molecular-shapes", level: "beyond-eight" } }),
        c("valence-bond", "Valence bond theory", { status: "ready", built: { lab: "valence-bond-theory", level: "overlapping-orbitals" } }),
        c("sigma-pi-bonds", "Sigma and pi bonds", { buildsOn: ["valence-bond"], status: "ready", built: { lab: "valence-bond-theory", level: "sigma-and-pi" } }),
        c("molecular-orbital", "Molecular orbital theory", { status: "ready", built: { lab: "molecular-orbitals", level: "filling-the-mos" } }),
        c("hydrogen-bonding", "Hydrogen bonding", { status: "ready", built: { lab: "p-block", level: "the-hydrides" } }),
      ],
    ),
    chapter(
      "p-block",
      "The p-block elements",
      { grade: 12, kit: "atoms", wave: 27, blurb: "Groups 13 to 18: from boron to the noble gases." },
      [
        c("p-block-trends", "Trends across groups 13 to 18", { status: "ready", built: { lab: "p-block", level: "down-the-group" } }),
        c("nitrogen-family", "Nitrogen, phosphorus and their compounds", { status: "ready", built: { lab: "p-block", level: "the-hydrides" } }),
        c("oxygen-family", "Oxygen, sulphur and their compounds", { status: "ready", built: { lab: "p-block", level: "the-hydrides" } }),
        c("halogens", "The halogens and interhalogen compounds", { status: "ready", built: { lab: "halogens-and-noble-gases", level: "the-halogens" } }),
        c("noble-gases", "The noble gases", { status: "ready", built: { lab: "halogens-and-noble-gases", level: "the-noble-gases" } }),
      ],
    ),
    chapter(
      "d-f-block",
      "The d- and f-block elements",
      { grade: 12, kit: "atoms", wave: 27, blurb: "Transition metals: colour, magnetism and variable valency." },
      [
        c("transition-properties", "General properties of the transition elements", { status: "ready", built: { lab: "transition-metals", level: "variable-valency" } }),
        c("colour-magnetism", "Colour and magnetic behaviour", { status: "ready", built: { lab: "transition-metals", level: "colour-and-magnetism" } }),
        c("important-compounds", "Potassium permanganate and dichromate", { status: "ready", built: { lab: "transition-metals", level: "variable-valency" } }),
        c("lanthanoids", "The lanthanoids and lanthanoid contraction", { status: "ready", built: { lab: "lanthanoids-and-actinoids", level: "the-lanthanoid-contraction" } }),
        c("actinoids", "The actinoids", { status: "ready", built: { lab: "lanthanoids-and-actinoids", level: "the-actinoids" } }),
      ],
    ),
    chapter(
      "coordination-compounds",
      "Coordination compounds",
      { grade: 12, kit: "molecules", wave: 23, blurb: "A metal surrounded by ligands, and the colours that result." },
      [
        c("werner-nomenclature", "Werner's theory and naming complexes", { status: "ready", built: { lab: "complex-isomers", level: "naming-complexes" } }),
        c("complex-isomerism", "Isomerism in coordination compounds", { status: "ready", built: { lab: "complex-isomers", level: "cis-trans-and-mirrors" } }),
        c("vbt-complexes", "Valence bond theory for complexes", { status: "ready", built: { lab: "coordination-compounds", level: "high-spin-low-spin" } }),
        c("crystal-field", "Crystal field theory, colour and magnetism", { status: "ready", built: { lab: "coordination-compounds", level: "splitting-the-d-orbitals" } }),
      ],
    ),
  ],
  "chemistry",
);

export const organicChemistry = branch(
  "organic-chemistry",
  "Organic chemistry",
  "Carbon compounds: their shapes, their names and how they react.",
  [
    chapter(
      "goc",
      "Organic chemistry: basic principles",
      { grade: 11, kit: "molecules", wave: 23, blurb: "Naming, isomers, and where the electrons are pushed." },
      [
        c("iupac-naming", "Classification and IUPAC naming", { status: "ready", built: { lab: "organic-basics", level: "naming-carbon-chains" }, buildsOn: ["functional-groups-school"] }),
        c("organic-isomerism", "Structural and stereoisomerism", { status: "ready", built: { lab: "organic-basics", level: "same-formula-new-molecule" } }),
        c("electronic-effects", "Inductive, resonance and hyperconjugation effects", { status: "ready", built: { lab: "organic-basics", level: "pushing-electrons" } }),
        c("reactive-intermediates", "Carbocations, carbanions and free radicals", { status: "ready", built: { lab: "organic-basics", level: "pushing-electrons" } }),
        c("reaction-types", "Types of organic reaction", { status: "ready", built: { lab: "organic-basics", level: "breaking-and-making-bonds" } }),
        c("purification-analysis", "Purification and qualitative analysis", { status: "ready", built: { lab: "organic-basics", level: "breaking-and-making-bonds" } }),
      ],
    ),
    chapter(
      "hydrocarbons",
      "Hydrocarbons",
      { grade: 11, kit: "molecules", wave: 26, blurb: "Alkanes, alkenes, alkynes and the special stability of benzene." },
      [
        c("alkanes-conformations", "Alkanes and their conformations", { status: "ready", built: { lab: "hydrocarbons", level: "turning-ethane" }, buildsOn: ["hydrocarbons-school"] }),
        c("alkenes-addition", "Alkenes and addition reactions", { status: "ready", built: { lab: "hydrocarbons", level: "adding-across-double-bonds" } }),
        c("alkynes", "Alkynes", { status: "ready", built: { lab: "hydrocarbons", level: "triple-bonds-and-rings" } }),
        c("aromaticity", "Benzene and aromaticity", { status: "ready", built: { lab: "hydrocarbons", level: "triple-bonds-and-rings" } }),
        c("electrophilic-substitution", "Electrophilic aromatic substitution", { status: "ready", built: { lab: "hydrocarbons", level: "attacking-the-ring" } }),
      ],
    ),
    chapter(
      "haloalkanes",
      "Haloalkanes and haloarenes",
      { grade: 12, kit: "molecules", wave: 26, blurb: "Substitution and elimination, and a first look at chirality." },
      [
        c("c-x-bond", "The carbon–halogen bond", { status: "ready", built: { lab: "haloalkanes", level: "carbon-halogen-bond" } }),
        c("sn1-sn2", "SN1 and SN2 substitution", { status: "ready", built: { lab: "haloalkanes", level: "sn1-and-sn2" } }),
        c("elimination", "Elimination reactions", { status: "ready", built: { lab: "haloalkanes", level: "when-substitution-loses" } }),
        c("chirality", "Optical isomerism and chirality", { status: "ready", built: { lab: "haloalkanes", level: "mirror-image-molecules" } }),
        c("haloarenes", "Haloarenes and their reactions", { status: "ready", built: { lab: "haloalkanes", level: "when-substitution-loses" } }),
      ],
    ),
    chapter(
      "alcohols-phenols-ethers",
      "Alcohols, phenols and ethers",
      { grade: 12, kit: "molecules", wave: 26, blurb: "The –OH group, and why phenol is an acid." },
      [
        c("alcohols", "Preparation and properties of alcohols", { status: "ready", built: { lab: "oxygen-compounds", level: "alcohols-by-degree" } }),
        c("phenols", "Phenols and their acidity", { status: "ready", built: { lab: "oxygen-compounds", level: "phenols-and-ethers" } }),
        c("ethers", "Ethers", { status: "ready", built: { lab: "oxygen-compounds", level: "phenols-and-ethers" } }),
      ],
    ),
    chapter(
      "carbonyl-compounds",
      "Aldehydes, ketones and carboxylic acids",
      { grade: 12, kit: "molecules", wave: 26, blurb: "The carbonyl group and the reactions it invites." },
      [
        c("nucleophilic-addition", "Nucleophilic addition to the carbonyl group", { status: "ready", built: { lab: "oxygen-compounds", level: "the-carbonyl-attacked" } }),
        c("named-reactions", "Aldol, Cannizzaro and other named reactions", { status: "ready", built: { lab: "oxygen-compounds", level: "mirrors-and-acids" } }),
        c("carboxylic-acids", "Carboxylic acids and their acidity", { status: "ready", built: { lab: "oxygen-compounds", level: "mirrors-and-acids" } }),
      ],
    ),
    chapter(
      "amines",
      "Amines",
      { grade: 12, kit: "molecules", wave: 26, blurb: "Organic bases, and the diazonium salts that make dyes." },
      [
        c("amine-basicity", "Classification and basicity of amines", { status: "ready", built: { lab: "amines-and-biomolecules", level: "how-basic-is-an-amine" } }),
        c("amine-preparation", "Preparation and reactions of amines", { status: "ready", built: { lab: "amines-and-biomolecules", level: "from-nitro-to-azo-dyes" } }),
        c("diazonium-salts", "Diazonium salts", { status: "ready", built: { lab: "amines-and-biomolecules", level: "from-nitro-to-azo-dyes" } }),
      ],
    ),
    chapter(
      "biomolecules",
      "Biomolecules",
      { grade: 12, kit: "molecules", wave: 26, blurb: "The chemistry of carbohydrates, proteins and DNA." },
      [
        c("carbohydrates", "Carbohydrates", { status: "ready", built: { lab: "amines-and-biomolecules", level: "sugars-and-starches" } }),
        c("proteins", "Amino acids and proteins", { status: "ready", built: { lab: "amines-and-biomolecules", level: "proteins-vitamins-and-dna" } }),
        c("enzymes-vitamins", "Enzymes and vitamins", { status: "ready", built: { lab: "amines-and-biomolecules", level: "proteins-vitamins-and-dna" } }),
        c("nucleic-acids", "Nucleic acids", { status: "ready", built: { lab: "amines-and-biomolecules", level: "proteins-vitamins-and-dna" } }),
      ],
    ),
    chapter(
      "practical-chemistry",
      "Principles of practical chemistry",
      { grade: 12, kit: "reactions", wave: 27, blurb: "Tests, titrations and salt analysis, done safely on screen first." },
      [
        c("element-detection", "Detecting elements and functional groups", { status: "ready", built: { lab: "practical-chemistry", level: "fusion-and-tube-tests" } }),
        c("titrations", "Acid–base and redox titrations", { status: "ready", built: { lab: "practical-chemistry", level: "burette-and-flask" } }),
        c("salt-analysis", "Identifying cations and anions", { status: "ready", built: { lab: "practical-chemistry", level: "mystery-salt" } }),
      ],
    ),
  ],
  "chemistry",
);

/** Every chemistry branch, in teaching order. */
export const chemistryBranches = [physicalChemistry, inorganicChemistry, organicChemistry] as const;
