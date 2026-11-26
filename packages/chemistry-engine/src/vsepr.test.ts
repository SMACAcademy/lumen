import { describe, expect, it } from "vitest";
import { angleBetween, geometry, HYBRIDISATION, MOLECULE_ORDER, MOLECULES, rotate, SHAPES, vseprModel, type MoleculeId } from "./vsepr";

const derive = (molecule: MoleculeId) => vseprModel.derive(vseprModel.initialize({ molecule }), { molecule });
const bondAngles = (id: MoleculeId) => {
  const { bonds } = geometry(MOLECULES[id]);
  const out: number[] = [];
  for (let i = 0; i < bonds.length; i++) for (let j = i + 1; j < bonds.length; j++) out.push(Math.round(angleBetween(bonds[i]!, bonds[j]!)));
  return out.sort((a, b) => a - b);
};

describe("the domains", () => {
  it("gives every molecule as many directions as it has electron pairs, all unit length", () => {
    for (const id of MOLECULE_ORDER) {
      const m = MOLECULES[id];
      const { bonds, lone } = geometry(m);
      expect(bonds).toHaveLength(m.bondPairs);
      expect(lone).toHaveLength(m.lonePairs);
      for (const v of [...bonds, ...lone]) expect(Math.hypot(...v)).toBeCloseTo(1, 12);
    }
  });

  it("spreads four pairs into a tetrahedron, 109.5° apart", () => {
    const { bonds } = geometry(MOLECULES.ch4);
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) expect(angleBetween(bonds[i]!, bonds[j]!)).toBeCloseTo(109.47, 2);
  });
});

describe("the shapes", () => {
  it("makes CO₂ and XeF₂ linear — XeF₂ because its three lone pairs take the equator", () => {
    expect(bondAngles("co2")).toEqual([180]);
    expect(bondAngles("xef2")).toEqual([180]);
    expect(SHAPES[derive("xef2").shape]).toBe("linear");
  });

  it("makes BF₃ flat at 120° and PCl₅ a trigonal bipyramid with 90° and 120°", () => {
    expect(bondAngles("bf3")).toEqual([120, 120, 120]);
    const pcl5 = bondAngles("pcl5");
    expect(pcl5).toContain(90);
    expect(pcl5).toContain(120);
    expect(pcl5).toContain(180);
  });

  it("puts XeF₄'s two lone pairs opposite each other, leaving a flat square", () => {
    const { lone, bonds } = geometry(MOLECULES.xef4);
    expect(angleBetween(lone[0]!, lone[1]!)).toBeCloseTo(180, 9);
    for (const b of bonds) expect(b[2]).toBeCloseTo(0, 12); // all four bonds in one plane
  });

  it("makes SF₆ an octahedron and BrF₅ a square pyramid", () => {
    expect(new Set(bondAngles("sf6"))).toEqual(new Set([90, 180]));
    expect(SHAPES[derive("brf5").shape]).toBe("square pyramidal");
  });

  it("names the hybridisation from the number of domains", () => {
    expect(HYBRIDISATION[derive("co2").hybridisation]).toBe("sp");
    expect(HYBRIDISATION[derive("bf3").hybridisation]).toBe("sp²");
    expect(HYBRIDISATION[derive("h2o").hybridisation]).toBe("sp³");
    expect(HYBRIDISATION[derive("sf4").hybridisation]).toBe("sp³d");
    expect(HYBRIDISATION[derive("xef4").hybridisation]).toBe("sp³d²");
  });

  it("quotes the squeezed angles: lone pairs push bonds together", () => {
    expect(derive("ch4").bondAngle).toBe(109.5);
    expect(derive("nh3").bondAngle).toBe(107);
    expect(derive("h2o").bondAngle).toBe(104.5);
    expect(derive("h2o").idealAngle).toBeCloseTo(109.5, 0);
  });

  it("knows which are polar: symmetry cancels the bond dipoles in the rest", () => {
    expect(derive("h2o").polar).toBe(1);
    expect(derive("nh3").polar).toBe(1);
    expect(derive("co2").polar).toBe(0);
    expect(derive("xef4").polar).toBe(0);
  });
});

describe("turning it", () => {
  it("keeps lengths and angles when rotated", () => {
    const [a, b] = geometry(MOLECULES.h2o).bonds;
    const ra = rotate(a!, 0.7, -0.4);
    const rb = rotate(b!, 0.7, -0.4);
    expect(Math.hypot(...ra)).toBeCloseTo(1, 12);
    expect(angleBetween(ra, rb)).toBeCloseTo(angleBetween(a!, b!), 9);
  });

  it("spins when played and lets the learner drag it round", () => {
    const s = vseprModel.initialize({ molecule: "ch4" });
    expect(vseprModel.advance(s, 1, { molecule: "ch4" }).yaw).toBeCloseTo(s.yaw + 0.8, 12);
    expect(vseprModel.setVariable(s, "pitch", 5, { molecule: "ch4" }).pitch).toBeCloseTo(Math.PI / 2, 12);
    expect(Math.abs(vseprModel.setVariable(s, "yaw", 7, { molecule: "ch4" }).yaw)).toBeLessThanOrEqual(Math.PI);
  });
});
