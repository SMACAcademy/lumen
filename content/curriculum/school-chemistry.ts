import { branch, chapter, s } from "./schema";

/**
 * Chemistry, class 6 to 10, from NCERT science.
 *
 * Materials and how they change, then atoms, equations, acids and the
 * periodic table — the ground the class 11 physical, inorganic and organic
 * chapters are built on.
 */

export const materialsAndChange = branch(
  "materials-and-change",
  "Materials and change",
  "What things are made of, how to separate them, and how they change.",
  [
    chapter(
      "materials-school",
      "Materials and mixtures",
      { grade: 6, kit: "cards", wave: 31, blurb: "Sorting materials by what they are like, and pulling mixtures apart." },
      [
        s("materials-properties", "Materials and their properties", { status: "ready", built: { lab: "materials-and-particles", level: "sort-and-dissolve" } }),
        s("soluble-insoluble", "Soluble and insoluble", { status: "ready", built: { lab: "materials-and-particles", level: "sort-and-dissolve" }, buildsOn: ["materials-properties"] }),
        s("separation-methods", "Separating mixtures: sieving, filtering and evaporating", { status: "ready", built: { lab: "materials-and-particles", level: "separate-and-protect" }, buildsOn: ["soluble-insoluble"] }),
      ],
    ),
    chapter(
      "physical-chemical-change",
      "Physical and chemical changes",
      { grade: 7, kit: "cards", wave: 30, blurb: "Melting ice comes back; burnt paper does not." },
      [
        s("physical-change", "Physical changes can be undone", { status: "ready", built: { lab: "thermal-properties", level: "can-you-undo-it" }, buildsOn: ["materials-properties"] }),
        s("chemical-change", "Chemical changes make new substances", { status: "ready", built: { lab: "thermal-properties", level: "can-you-undo-it" }, buildsOn: ["physical-change"] }),
        s("signs-of-reaction", "Signs of a chemical change: gas, colour and heat", { status: "ready", built: { lab: "thermal-properties", level: "can-you-undo-it" }, buildsOn: ["chemical-change"] }),
        s("rusting", "Rusting, and how to stop it", { status: "ready", built: { lab: "materials-and-particles", level: "separate-and-protect" }, buildsOn: ["chemical-change"] }),
      ],
    ),
    chapter(
      "acids-bases-school",
      "Acids, bases and indicators",
      { grade: 7, kit: "solutions", wave: 30, blurb: "Sour, bitter or neither — and the flower and spice colours that tell you which." },
      [
        s("acid-base-taste", "Sour, bitter or neither: acids and bases at home", { status: "ready", built: { lab: "acids-and-bases", level: "sour-bitter-or-neither" } }),
        s("indicators-school", "Natural indicators: litmus, turmeric and china rose", { status: "ready", built: { lab: "acids-and-bases", level: "sour-bitter-or-neither" }, buildsOn: ["acid-base-taste"] }),
        s("neutralisation-school", "Neutralisation", { status: "ready", built: { lab: "acids-and-bases", level: "neutralise-it" }, buildsOn: ["indicators-school"] }),
      ],
    ),
    chapter(
      "particles-and-states",
      "Particles and states of matter",
      { grade: 8, kit: "thermal", wave: 30, blurb: "Everything is made of tiny moving particles, and heating changes how they move." },
      [
        s("particle-model", "Everything is made of particles", { status: "ready", built: { lab: "materials-and-particles", level: "particles-on-the-move" } }),
        s("three-states", "Solid, liquid and gas", { status: "ready", built: { lab: "thermal-properties", level: "melt-boil-change-back" }, buildsOn: ["particle-model"] }),
        s("changes-of-state", "Melting, boiling and condensing", { status: "ready", built: { lab: "thermal-properties", level: "melt-boil-change-back" }, buildsOn: ["three-states"] }),
        s("evaporation-cooling", "Evaporation, and why it cools", { status: "ready", built: { lab: "materials-and-particles", level: "particles-on-the-move" }, buildsOn: ["changes-of-state"] }),
      ],
    ),
    chapter(
      "metals-non-metals",
      "Metals and non-metals",
      { grade: 8, kit: "cards", wave: 31, blurb: "Shiny, bendy and ringing — or dull and brittle — and which metal wins a swap." },
      [
        s("metal-properties", "Metals and non-metals: how they differ", { status: "ready", built: { lab: "metals-acids-salts", level: "metal-or-non-metal" }, buildsOn: ["materials-properties"] }),
        s("reactivity-series", "The reactivity series", { status: "ready", built: { lab: "metals-acids-salts", level: "which-metal-wins" }, buildsOn: ["metal-properties"] }),
        s("displacement-school", "Displacement: the more reactive metal wins", { status: "ready", built: { lab: "metals-acids-salts", level: "which-metal-wins" }, buildsOn: ["reactivity-series"] }),
        s("corrosion-school", "Corrosion", { status: "ready", built: { lab: "metals-acids-salts", level: "metal-or-non-metal" }, buildsOn: ["rusting", "metal-properties"] }),
      ],
    ),
  ],
  "chemistry",
);

export const atomsAndReactions = branch(
  "atoms-and-reactions",
  "Atoms and reactions",
  "Atoms, molecules, equations and the periodic table.",
  [
    chapter(
      "atoms-molecules-school",
      "Atoms and molecules",
      { grade: 9, kit: "reactions", wave: 32, blurb: "Atoms join into molecules in fixed amounts — and a mole lets you count them by weighing." },
      [
        s("laws-of-combination", "Mass is conserved and proportions are fixed", { status: "ready", built: { lab: "chemical-equations", level: "atoms-in-atoms-out" }, buildsOn: ["chemical-change"] }),
        s("atoms-molecules", "Atoms and molecules", { status: "ready", built: { lab: "atoms-and-the-table", level: "atoms-to-formulae" }, buildsOn: ["particle-model"] }),
        s("chemical-formulae", "Writing chemical formulae from valency", { status: "ready", built: { lab: "atoms-and-the-table", level: "atoms-to-formulae" }, buildsOn: ["atoms-molecules"] }),
        s("mole-school", "The mole: counting by weighing", { status: "ready", built: { lab: "atoms-and-the-table", level: "counting-in-moles" }, buildsOn: ["atoms-molecules"] }),
      ],
    ),
    chapter(
      "structure-of-atom-school",
      "Structure of the atom",
      { grade: 9, kit: "atoms", wave: 32, blurb: "Inside the atom: a tiny nucleus, and electrons in shells." },
      [
        s("subatomic-particles", "Electrons, protons and neutrons", { status: "ready", built: { lab: "structure-of-the-atom", level: "electron-shells" }, buildsOn: ["atoms-molecules"] }),
        s("bohr-shells", "Shells: Bohr's model and 2, 8, 8", { status: "ready", built: { lab: "structure-of-the-atom", level: "electron-shells" }, buildsOn: ["subatomic-particles"] }),
        s("valency-school", "Valency from the outer shell", { status: "ready", built: { lab: "structure-of-the-atom", level: "electron-shells" }, buildsOn: ["bohr-shells"] }),
        s("isotopes", "Atomic number, mass number and isotopes", { status: "ready", built: { lab: "structure-of-the-atom", level: "isotopes-and-isobars" }, buildsOn: ["subatomic-particles"] }),
      ],
    ),
    chapter(
      "reactions-equations",
      "Chemical reactions and equations",
      { grade: 10, kit: "reactions", wave: 32, blurb: "Writing what happens in a reaction, and making the atoms add up." },
      [
        s("balancing-equations", "Balancing chemical equations", { status: "ready", built: { lab: "chemical-equations", level: "balance-it" }, buildsOn: ["chemical-formulae", "laws-of-combination"] }),
        s("reaction-types-school", "Combination, decomposition, displacement and double displacement", { status: "ready", built: { lab: "chemical-equations", level: "balance-it" }, buildsOn: ["balancing-equations"] }),
        s("oxidation-reduction-school", "Oxidation and reduction: gaining and losing oxygen", { status: "ready", built: { lab: "metals-acids-salts", level: "which-metal-wins" }, buildsOn: ["reaction-types-school"] }),
      ],
    ),
    chapter(
      "acids-bases-salts-10",
      "Acids, bases and salts",
      { grade: 10, kit: "solutions", wave: 32, blurb: "The pH scale, what acids do to metals, and the salts in the kitchen." },
      [
        s("ph-scale-school", "The pH scale", { status: "ready", built: { lab: "metals-acids-salts", level: "fizz-ph-and-salts" }, buildsOn: ["neutralisation-school"] }),
        s("acid-reactions", "How acids react with metals and carbonates", { status: "ready", built: { lab: "metals-acids-salts", level: "fizz-ph-and-salts" }, buildsOn: ["acid-base-taste"] }),
        s("salts", "Salts at home: baking soda, washing soda and more", { status: "ready", built: { lab: "metals-acids-salts", level: "fizz-ph-and-salts" }, buildsOn: ["neutralisation-school"] }),
      ],
    ),
    chapter(
      "carbon-compounds",
      "Carbon and its compounds",
      { grade: 10, kit: "molecules", wave: 32, blurb: "Why carbon makes millions of compounds, and how they are named." },
      [
        s("carbon-bonding-school", "Carbon's covalent bonds", { status: "ready", built: { lab: "carbon-compounds", level: "sharing-electrons" }, buildsOn: ["valency-school"] }),
        s("hydrocarbons-school", "Saturated and unsaturated hydrocarbons", { status: "ready", built: { lab: "carbon-compounds", level: "chains-and-families" }, buildsOn: ["carbon-bonding-school"] }),
        s("functional-groups-school", "Functional groups and homologous series", { status: "ready", built: { lab: "carbon-compounds", level: "chains-and-families" }, buildsOn: ["hydrocarbons-school"] }),
        s("soaps", "Soaps and detergents", { status: "ready", built: { lab: "carbon-compounds", level: "burn-change-and-clean" }, buildsOn: ["functional-groups-school"] }),
      ],
    ),
    chapter(
      "periodic-school",
      "Periodic classification",
      { grade: 10, kit: "atoms", wave: 32, blurb: "How chemists put the elements in order, and the patterns that appeared." },
      [
        s("early-periodic", "Döbereiner, Newlands and Mendeleev", { status: "ready", built: { lab: "atoms-and-the-table", level: "ordering-the-elements" }, buildsOn: ["atoms-molecules"] }),
        s("modern-periodic-school", "The modern periodic table", { status: "ready", built: { lab: "structure-of-the-atom", level: "the-modern-table" }, buildsOn: ["early-periodic", "bohr-shells"] }),
        s("trends-school", "Trends in size and metallic character", { status: "ready", built: { lab: "atoms-and-the-table", level: "ordering-the-elements" }, buildsOn: ["modern-periodic-school"] }),
      ],
    ),
  ],
  "chemistry",
);

export const schoolChemistryBranches = [materialsAndChange, atomsAndReactions];
