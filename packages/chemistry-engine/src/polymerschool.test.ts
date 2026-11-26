import { describe, expect, it } from "vitest";
import {
  POLYMER_FIBRE_ORDER,
  POLYMER_FIBRES,
  POLYMER_ORDER,
  POLYMER_PLASTIC_ORDER,
  POLYMER_PLASTICS,
  POLYMER_ROT_TIMES,
  POLYMER_WASTE_ORDER,
  POLYMER_WASTES,
  POLYMERS,
  polymerLeft,
  polymerSchoolModel as model,
  polymerUnitAtoms,
  type PolymerSchoolParams,
  type PolymerSchoolState,
} from "./polymerschool";

const base = model.initialize(model.defaultParams);
const derive = (state: Partial<PolymerSchoolState> = {}, params: Partial<PolymerSchoolParams> = {}) =>
  model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });

const SUBS = "₀₁₂₃₄₅₆₇₈₉";

/** Atoms in a plain formula like "C₁₂H₂₂N₂O₂". */
function atomsOf(formula: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of formula.matchAll(/([A-Z][a-z]?)([₀-₉]*)/g)) {
    const n = m[2] ? Number([...m[2]].map((c) => SUBS.indexOf(c)).join("")) : 1;
    out[m[1]!] = (out[m[1]!] ?? 0) + n;
  }
  return out;
}

describe("polymer repeat units", () => {
  it("has formulas that match the atom counts", () => {
    for (const id of POLYMER_ORDER) expect(atomsOf(POLYMERS[id].formula), id).toEqual(POLYMERS[id].atoms);
  });

  it("builds each unit correctly from its monomers", () => {
    // Addition polymers: the unit is the whole monomer.
    expect(POLYMERS.polythene.atoms).toEqual({ C: 2, H: 4 }); // CH₂=CH₂
    expect(POLYMERS.pvc.atoms).toEqual({ C: 2, H: 3, Cl: 1 }); // CH₂=CHCl
    expect(POLYMERS.acrylic.atoms).toEqual({ C: 3, H: 3, N: 1 }); // CH₂=CHCN
    // Nylon 6,6: H₂N(CH₂)₆NH₂ (C₆H₁₆N₂) + HOOC(CH₂)₄COOH (C₆H₁₀O₄) − 2H₂O.
    expect(POLYMERS.nylon.atoms).toEqual({ C: 6 + 6, H: 16 + 10 - 4, N: 2, O: 4 - 2 });
    // PET: HOCH₂CH₂OH (C₂H₆O₂) + C₆H₄(COOH)₂ (C₈H₆O₄) − 2H₂O.
    expect(POLYMERS.polyester.atoms).toEqual({ C: 2 + 8, H: 6 + 6 - 4, O: 2 + 4 - 2 });
    // Cellulose: glucose C₆H₁₂O₆ − H₂O.
    expect(POLYMERS.cellulose.atoms).toEqual({ C: 6, H: 10, O: 5 });
  });

  it("counts the carbons in the condensed unit too", () => {
    const carbons = (s: string) => {
      let n = 0;
      for (const m of s.matchAll(/\(([^)]*)\)([₀-₉]*)|C(?![l])([₀-₉]*)/g)) {
        if (m[1] !== undefined) n += (m[1].match(/C(?!l)/g)?.length ?? 0) * (m[2] ? SUBS.indexOf(m[2]) : 1);
        else n += m[3] ? SUBS.indexOf(m[3]) : 1;
      }
      return n;
    };
    for (const id of POLYMER_ORDER) expect(carbons(POLYMERS[id].condensed), id).toBe(POLYMERS[id].atoms.C);
  });

  it("multiplies the unit by the number of units", () => {
    const r = derive({ units: 500 }, { polymer: "polythene" });
    expect(r.unitCarbons).toBe(2);
    expect(r.unitAtoms).toBe(6);
    expect(r.chainCarbons).toBe(1000);
    expect(r.chainAtoms).toBe(3000);
    const nylon = derive({ units: 100 }, { polymer: "nylon" });
    expect(nylon.chainCarbons).toBe(1200);
    expect(nylon.chainAtoms).toBe(3800);
    for (const id of POLYMER_ORDER) expect(derive({ units: 7 }, { polymer: id }).chainAtoms).toBe(7 * polymerUnitAtoms(POLYMERS[id]));
  });

  it("marks only cellulose as natural", () => {
    expect(POLYMER_ORDER.filter((id) => derive({}, { polymer: id }).polymerNatural === 1)).toEqual(["cellulose"]);
  });
});

describe("fibres", () => {
  it("puts the fibres in NCERT's order of strength: wool < cotton < silk < nylon", () => {
    const b = (id: keyof typeof POLYMER_FIBRES) => derive({}, { fibre: id }).breakingLoad;
    expect(b("wool")).toBeLessThan(b("cotton"));
    expect(b("cotton")).toBeLessThan(b("silk"));
    expect(b("silk")).toBeLessThan(b("nylon"));
    // Nylon is the strongest of all.
    for (const id of POLYMER_FIBRE_ORDER) if (id !== "nylon") expect(b(id), id).toBeLessThan(b("nylon"));
  });

  it("snaps only when the load is more than the thread can hold", () => {
    expect(derive({ load: 350 }, { fibre: "cotton" }).snapped).toBe(0);
    expect(derive({ load: 360 }, { fibre: "cotton" }).snapped).toBe(1);
    expect(derive({ load: 600 }, { fibre: "nylon" }).snapped).toBe(0);
    expect(derive({ load: 300 }, { fibre: "wool" }).snapped).toBe(1);
  });

  it("knows which fibres are natural, man-made and from petrochemicals", () => {
    const natural = POLYMER_FIBRE_ORDER.filter((id) => derive({}, { fibre: id }).fibreNatural === 1);
    expect(natural).toEqual(["cotton", "wool", "silk"]);
    expect(derive({}, { fibre: "rayon" }).fibreSource).toBe(2); // wood pulp
    for (const id of ["nylon", "polyester", "acrylic"] as const) expect(derive({}, { fibre: id }).fibreSource).toBe(3);
  });

  it("says the petrochemical fibres melt, soak up little water and dry quickly", () => {
    for (const id of POLYMER_FIBRE_ORDER) {
      const r = derive({}, { fibre: id });
      const petro = r.fibreSource === 3;
      expect(r.meltsOnHeating, id).toBe(petro ? 1 : 0);
      expect(r.absorbsWater, id).toBe(petro ? 0 : 1);
      expect(r.driesQuickly, id).toBe(petro ? 1 : 0);
    }
  });
});

describe("plastics", () => {
  it("softens thermoplastics above their softening point and never thermosets", () => {
    expect(derive({ heat: 85 }, { plastic: "polythene" }).soft).toBe(0);
    expect(derive({ heat: 90 }, { plastic: "polythene" }).soft).toBe(1);
    expect(derive({ heat: 80 }, { plastic: "pvc" }).soft).toBe(1);
    for (const id of ["bakelite", "melamine"] as const) {
      const r = derive({ heat: 250 }, { plastic: id });
      expect(r.soft, id).toBe(0);
      expect(r.crossLinked, id).toBe(1);
      expect(r.canReshape, id).toBe(0);
      expect(r.softensAt, id).toBe(0);
    }
  });

  it("calls polythene, PVC and PET thermoplastics", () => {
    expect(POLYMER_PLASTIC_ORDER.filter((id) => POLYMER_PLASTICS[id].thermoplastic)).toEqual(["polythene", "pvc", "pet"]);
  });
});

describe("waste", () => {
  it("keeps NCERT's approximate times", () => {
    const words = (id: keyof typeof POLYMER_WASTES) => POLYMER_ROT_TIMES[POLYMER_WASTES[id].time];
    expect(words("peels")).toBe("1 to 2 weeks");
    expect(words("paper")).toBe("10 to 30 days");
    expect(words("cotton")).toBe("2 to 5 months");
    expect(words("wool")).toBe("about a year");
    expect(words("wood")).toBe("10 to 15 years");
    expect(words("can")).toBe("100 to 500 years");
    expect(words("bag")).toBe("several years");
  });

  it("sorts the waste into biodegradable and not", () => {
    const bio = POLYMER_WASTE_ORDER.filter((id) => derive({}, { waste: id }).biodegradable === 1);
    expect(bio).toEqual(["peels", "paper", "cotton", "wool", "wood"]);
  });

  it("rots biodegradable waste away by the middle of NCERT's range", () => {
    expect(derive({ days: 0 }, { waste: "peels" }).left).toBe(100);
    expect(derive({ days: 10.5 }, { waste: "peels" }).gone).toBe(1);
    expect(derive({ days: 10 }, { waste: "peels" }).gone).toBe(0);
    expect(derive({}, { waste: "paper" }).rotMidDays).toBe(20);
    expect(derive({ days: 10 }, { waste: "paper" }).left).toBeCloseTo(50, 9);
    expect(derive({}, { waste: "cotton" }).rotMidDays).toBe(105);
    expect(derive({ days: 730 }, { waste: "wood" }).left).toBeCloseTo(84, 9);
    expect(derive({ days: 730 }, { waste: "wool" }).gone).toBe(1);
  });

  it("leaves non-biodegradable waste whole", () => {
    for (const id of ["can", "bag", "bottle"] as const) {
      const r = derive({ days: 730 }, { waste: id });
      expect(r.left, id).toBe(100);
      expect(r.gone, id).toBe(0);
    }
    expect(derive({}, { waste: "bag" }).rotKnown).toBe(0);
    expect(derive({}, { waste: "can" }).rotMidDays).toBe(300 * 365);
  });

  it("orders the rotting times from peels to cans", () => {
    const mids = ["peels", "paper", "cotton", "wool", "wood", "can"].map((id) => derive({}, { waste: id as never }).rotMidDays);
    for (let i = 1; i < mids.length; i++) expect(mids[i]).toBeGreaterThan(mids[i - 1]!);
  });

  it("never returns −0 or a non-finite number", () => {
    expect(Object.is(polymerLeft(POLYMER_WASTES.peels, 100), 0)).toBe(true);
    expect(polymerLeft(POLYMER_WASTES.peels, Number.NaN)).toBe(100);
  });
});

describe("model plumbing", () => {
  it("derives every output as a finite number in every choice", () => {
    for (const polymer of POLYMER_ORDER)
      for (const fibre of POLYMER_FIBRE_ORDER)
        for (const plastic of POLYMER_PLASTIC_ORDER)
          for (const waste of POLYMER_WASTE_ORDER) {
            const r = model.derive({ units: 1000, load: 800, heat: 250, days: 730 }, { polymer, fibre, plastic, waste });
            for (const key of model.outputs) {
              expect(Number.isFinite(r[key]), key).toBe(true);
              expect(Object.is(r[key], -0), key).toBe(false);
            }
          }
  });

  it("clamps every variable to its control's range", () => {
    let s = model.setVariable(base, "units", 5000, model.defaultParams);
    expect(s.units).toBe(1000);
    s = model.setVariable(s, "units", 0.2, model.defaultParams);
    expect(s.units).toBe(1);
    expect(model.setVariable(base, "load", -5, model.defaultParams).load).toBe(0);
    expect(model.setVariable(base, "heat", 900, model.defaultParams).heat).toBe(250);
    expect(model.setVariable(base, "days", Number.NaN, model.defaultParams).days).toBe(0);
    expect(model.setVariable(base, "nothing", 3, model.defaultParams)).toBe(base);
  });

  it("plays: adds weights, heat and days, and stops at the ends", () => {
    const s = model.advance(base, 2, model.defaultParams);
    expect(s.load).toBe(100);
    expect(s.heat).toBe(65);
    expect(s.days).toBe(30);
    const end = model.advance(base, 1e6, model.defaultParams);
    expect(end).toMatchObject({ load: 800, heat: 250, days: 730 });
  });

  it("steps by a weight, 10 °C and a week", () => {
    const s = model.step(base, model.defaultParams, 1);
    expect(s).toMatchObject({ load: 50, heat: 40, days: 7 });
    expect(model.step(base, model.defaultParams, -1)).toMatchObject({ load: 0, heat: 20, days: 0 });
  });
});
