import { defineLevel } from "@ise/game-engine";

const atom = (id: string, Z: number, A: number) => ({ id, label: `${Z} protons, ${A - Z} neutrons`, given: { Z, A } });
const card = (id: string, label: string) => ({ id, label });

/** Inside the Atom, level 3: atomic number, mass number, isotopes and isobars (NCERT class 9, ch. 4). */
export const isotopesAndIsobars = defineLevel({
  schemaVersion: 1,
  id: "isotopes-and-isobars",
  concept: "structure-of-the-atom",
  title: "Isotopes and isobars",
  summary: "Same protons, different neutrons: isotopes. Same mass number, different elements: isobars.",
  xp: 30,
  steps: [
    {
      id: "make-deuterium",
      kind: "target",
      prompt:
        "Hydrogen-1 has **1 proton** and no neutrons: Z = 1, A = 1. Raise the **mass number** to make the hydrogen atom with **one neutron**.",
      mode: "isotopes",
      given: { Z: 1, A: 1 },
      controls: ["A"],
      canvas: false,
      goal: { type: "compare", quantity: "isotopeNeutrons", op: "eq", value: 1 },
      success: "Deuterium, ²₁H: A = 2 and Z = 1, so it has 2 − 1 = 1 neutron. Still hydrogen, because it still has one proton.",
      retry: "Count the grey neutrons: you want exactly one.",
      hints: ["The mass number counts protons and neutrons together.", "One proton plus one neutron: A = 2."],
    },
    {
      id: "carbon-isotopes",
      kind: "tap",
      prompt: "**Catch** every atom of **carbon** (atomic number 6).",
      canvas: false,
      rule: "6 protons",
      when: { type: "compare", quantity: "protons", op: "eq", value: 6 },
      cards: [
        atom("carbon-12", 6, 12),
        atom("nitrogen-14", 7, 14),
        atom("carbon-14", 6, 14),
        atom("boron-11", 5, 11),
        atom("carbon-13", 6, 13),
        atom("nitrogen-15", 7, 15),
        atom("oxygen-16", 8, 16),
      ],
      explanation:
        "Protons decide the element. Any atom with 6 protons is carbon, however many neutrons it has: ¹²C, ¹³C and ¹⁴C are isotopes of carbon. 7 protons is nitrogen — even ¹⁴N, which has the same mass number as ¹⁴C.",
      hints: ["Look only at the protons."],
    },
    {
      id: "same-chemistry",
      kind: "predict",
      prompt:
        "Chlorine-35 has 18 neutrons; chlorine-37 has 20. Going from ³⁵Cl to ³⁷Cl, what happens to chlorine's **valency**?",
      mode: "isotopes",
      variable: "A",
      from: 35,
      to: 37,
      quantity: "valency",
      options: ["increase", "decrease", "same"],
      given: { Z: 17 },
      explanation:
        "It stays 1. Both isotopes have 17 protons and 17 electrons arranged 2, 8, 7 — and electrons decide how an atom reacts. Isotopes have the same chemical properties; only their masses differ.",
    },
    {
      id: "chlorine-average",
      kind: "estimate",
      prompt: "Natural chlorine is **75%** ³⁵Cl and **25%** ³⁷Cl. Estimate its **average atomic mass**.",
      mode: "isotopes",
      given: { Z: 17, A: 37, mix: 75 },
      canvas: false,
      hideLabels: true,
      quantity: "averageMass",
      range: { min: 35, max: 37, step: 0.1 },
      tolerance: 0.1,
      explanation:
        "35 × 75/100 + 37 × 25/100 = 26.25 + 9.25 = 35.5 u. It sits nearer 35 because three atoms in four are chlorine-35 — which is why chlorine's atomic mass is not a whole number.",
      hints: ["Three atoms in every four are chlorine-35.", "Weight each mass number by its share: 35 × 0.75 + 37 × 0.25."],
    },
    {
      id: "isotope-uses",
      kind: "match",
      prompt: "Some isotopes are radioactive, and useful. **Match** each to its use.",
      canvas: false,
      pairs: [
        { left: card("uranium", "Uranium-235"), right: card("fuel", "Fuel in nuclear reactors") },
        { left: card("cobalt", "Cobalt-60"), right: card("cancer", "Treating cancer") },
        { left: card("iodine", "Iodine-131"), right: card("goitre", "Treating goitre") },
      ],
      explanation:
        "An isotope of uranium fuels nuclear reactors, an isotope of cobalt is used to treat cancer, and an isotope of iodine to treat goitre — the three uses NCERT lists.",
      hints: ["Goitre is a disease of the thyroid, which needs iodine."],
    },
    {
      id: "find-an-isobar",
      kind: "target",
      prompt:
        "Argon-40 has 18 protons and 22 neutrons. Click the element whose common atom has the **same mass number, 40**, but **different protons**.",
      mode: "isotopes",
      given: { Z: 18 },
      goal: {
        type: "all",
        conditions: [
          { type: "compare", quantity: "isotopeMass", op: "eq", value: 40 },
          { type: "compare", quantity: "protons", op: "neq", value: 18 },
        ],
      },
      success:
        "Calcium-40: 20 protons and 20 neutrons, against argon's 18 and 22. Same mass number, different elements — ⁴⁰Ca and ⁴⁰Ar are isobars.",
      retry: "That atom's mass number is not 40.",
      hints: ["It is in period 4.", "Calcium, Z = 20: 20 protons + 20 neutrons."],
    },
    {
      id: "law",
      kind: "discover",
      prompt: "Reading an atom's symbol.",
      mode: "isotopes",
      equation: "neutron-count",
      law: "An atom written with A on top and Z below has Z protons and A − Z neutrons. Isotopes have the same Z and different A (¹H, ²H, ³H; ³⁵Cl, ³⁷Cl): one element, one chemistry. Isobars have the same A and different Z (⁴⁰Ca, ⁴⁰Ar): different elements.",
    },
  ],
});
