import { describe, expect, it } from "vitest";
import {
  arrangementName,
  classesOf,
  COMPOUNDS,
  complexName,
  coordinationNumber,
  isomersModel as model,
  type IsomersParams,
  metalOxidationState,
  octahedralRotations,
  stereoClasses,
} from "./isomers";

describe("naming", () => {
  it("builds the IUPAC names NCERT gives", () => {
    expect(complexName(COMPOUNDS.hexaamminecobalt)).toBe("hexaamminecobalt(III) chloride");
    expect(complexName(COMPOUNDS.ferricyanide)).toBe("potassium hexacyanidoferrate(III)");
    expect(complexName(COMPOUNDS.cisplatin)).toBe("diamminedichloridoplatinum(II)");
    expect(complexName(COMPOUNDS.chloridocobalt)).toBe("pentaamminechloridocobalt(III) chloride");
    expect(complexName(COMPOUNDS["nickel-carbonyl"])).toBe("tetracarbonylnickel(0)");
    expect(complexName(COMPOUNDS["tris-en"])).toBe("tris(ethane-1,2-diamine)cobalt(III) chloride");
    expect(complexName(COMPOUNDS.tetraamminecopper)).toBe("tetraamminecopper(II) sulfate");
    expect(complexName(COMPOUNDS.hexachloridoplatinate)).toBe("potassium hexachloridoplatinate(IV)");
    expect(complexName(COMPOUNDS.diamminesilver)).toBe("diamminesilver(I) chloride");
  });

  it("works out the oxidation state and coordination number from the formula", () => {
    expect(metalOxidationState(COMPOUNDS.ferrocyanide)).toBe(2);
    expect(metalOxidationState(COMPOUNDS.ferricyanide)).toBe(3);
    expect(coordinationNumber(COMPOUNDS["tris-en"])).toBe(6);
    expect(coordinationNumber(COMPOUNDS["nickel-carbonyl"])).toBe(4);
  });
});

describe("isomers, counted by symmetry", () => {
  it("uses the 24 rotations of the octahedron", () => {
    expect(octahedralRotations()).toHaveLength(24);
  });

  const count = (type: IsomersParams["type"]) => {
    const classes = stereoClasses(type);
    return { stereo: classes.length, geometric: new Set(classes.map((c) => c.geometricKey)).size, chiral: classes.filter((c) => c.chiral).length };
  };

  it("finds cis and trans for MA₄B₂ and square-planar MA₂B₂, fac and mer for MA₃B₃ — none chiral", () => {
    expect(count("ma4b2")).toEqual({ stereo: 2, geometric: 2, chiral: 0 });
    expect(count("ma2b2-square")).toEqual({ stereo: 2, geometric: 2, chiral: 0 });
    expect(count("ma3b3")).toEqual({ stereo: 2, geometric: 2, chiral: 0 });
    expect(classesOf("ma4b2").map((c) => arrangementName("ma4b2", c.arrangement)).sort()).toEqual(["cis", "trans"]);
    expect(classesOf("ma3b3").map((c) => arrangementName("ma3b3", c.arrangement)).sort()).toEqual(["fac", "mer"]);
  });

  it("makes [M(AA)₃] one geometric isomer that is chiral: a mirror-image pair", () => {
    expect(count("maa3")).toEqual({ stereo: 2, geometric: 1, chiral: 2 });
  });

  it("makes [M(AA)₂B₂] cis and trans, with only cis chiral: three stereoisomers", () => {
    expect(count("maa2b2")).toEqual({ stereo: 3, geometric: 2, chiral: 2 });
    const trans = classesOf("maa2b2").find((c) => arrangementName("maa2b2", c.arrangement) === "trans")!;
    expect(trans.chiral).toBe(false);
  });
});

describe("the order isomers are listed in", () => {
  // Levels name cards by index (e.g. "cis-[Co(en)₂Cl₂]⁺" is isomer 1), so the order is part of the contract.
  it("puts trans before cis and mer before fac", () => {
    const names = (t: IsomersParams["type"]) => classesOf(t).map((c) => arrangementName(t, c.arrangement));
    expect(names("ma4b2")).toEqual(["trans", "cis"]);
    expect(names("ma2b2-square")).toEqual(["trans", "cis"]);
    expect(names("ma3b3")).toEqual(["mer", "fac"]);
    expect(names("maa2b2")).toEqual(["trans", "cis", "cis"]);
  });
});

describe("the model", () => {
  it("reports the isomer shown, and numbers every output", () => {
    const r = model.derive({ isomer: 0, clock: 0 }, { compound: "ferricyanide", type: "maa2b2" });
    expect(r).toMatchObject({ stereoCount: 3, geometricCount: 2, oxidationState: 3, complexCharge: -3, anionic: 1 });
    for (const key of model.outputs) expect(Number.isFinite(r[key]), key).toBe(true);
    const chiral = [0, 1, 2].map((i) => model.derive({ isomer: i, clock: 0 }, { compound: "cisplatin", type: "maa2b2" })).filter((x) => x.chiral === 1);
    expect(chiral.map((x) => x.enantiomer).sort()).toEqual([1, 2]);
  });

  it("steps through the isomers on Play", () => {
    expect(model.advance({ isomer: 1, clock: 1.2 }, 0.1, { compound: "cisplatin", type: "ma4b2" }).isomer).toBe(0);
  });
});
