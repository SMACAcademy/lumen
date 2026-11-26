import { describe, expect, it } from "vitest";
import {
  centralLonePairs,
  compoundGeometry,
  HALIDE_ORDER,
  HALOGEN_COMPOUND_ORDER,
  HALOGEN_COMPOUNDS,
  HALOGEN_ELEMENTS,
  HALOGEN_ORDER,
  HALOGEN_SHAPES,
  halogensModel as model,
  NOBLE_GASES,
  type HalogensParams,
} from "./halogens";

const derive = (params: Partial<HalogensParams> = {}, position = 1) => model.derive({ position, yaw: 0 }, { ...model.defaultParams, ...params });
const down = (family: HalogensParams["family"], property: HalogensParams["property"]) =>
  (family === "noble" ? NOBLE_GASES : HALOGEN_ELEMENTS).map((_, i) => derive({ family, property }, i + 1).value);

describe("down group 17", () => {
  it("grows the atoms, raises the boiling point and lowers the ionisation enthalpy", () => {
    const rising = (xs: number[]) => xs.every((x, i) => i === 0 || x > xs[i - 1]!);
    expect(rising(down("halogens", "radius"))).toBe(true);
    expect(rising(down("halogens", "boiling"))).toBe(true);
    expect(rising(down("halogens", "ionisation").reverse())).toBe(true);
    expect(rising(down("halogens", "potential").reverse())).toBe(true);
    expect(derive({ family: "halogens" }, 1).phase).toBe(0);
    expect(derive({ family: "halogens" }, 3).phase).toBe(1);
    expect(derive({ family: "halogens" }, 4).phase).toBe(2);
  });

  it("gives chlorine, not fluorine, the most negative electron gain enthalpy", () => {
    expect(down("halogens", "gain")).toEqual([-333, -349, -325, -296]);
    expect(Math.min(...down("halogens", "gain"))).toBe(derive({ family: "halogens", property: "gain" }, 2).value);
  });

  it("makes the F–F bond weaker than Cl–Cl and Br–Br", () => {
    const [f, cl, br, i] = down("halogens", "bond") as [number, number, number, number];
    expect(f).toBeLessThan(br);
    expect(br).toBeLessThan(cl);
    expect(i).toBeLessThan(f);
  });

  it("makes HX a stronger acid down the group", () => {
    expect(down("halogens", "pKa")).toEqual([3.2, -7, -9.5, -10]);
  });
});

describe("down group 18", () => {
  it("raises the boiling point from 4.2 K and lowers the ionisation enthalpy to near oxygen's", () => {
    expect(down("noble", "boiling")).toEqual([4.2, 27.1, 87.2, 119.7, 165, 211]);
    expect(derive({ family: "noble", property: "ionisation" }, 5).value).toBe(1170);
    expect(down("noble", "gain").every((v) => v > 0)).toBe(true);
  });

  it("flags what NCERT does not give, rather than inventing it", () => {
    expect(derive({ family: "noble", property: "radius" }, 6)).toMatchObject({ value: 0, known: 0, Z: 86 });
    expect(derive({ family: "noble", property: "bond" }, 3)).toMatchObject({ value: 0, known: 0 });
    expect(derive({ family: "noble", property: "radius" }, 5)).toMatchObject({ value: 220, known: 1 });
  });

  it("holds the place within the group", () => {
    expect(derive({ family: "halogens" }, 6)).toMatchObject({ position: 4, Z: 53 });
    expect(model.setVariable({ position: 1, yaw: 0 }, "position", 9, model.defaultParams).position).toBe(6);
    expect(model.step({ position: 4, yaw: 0 }, model.defaultParams, 1).position).toBe(4);
  });
});

describe("displacement", () => {
  it("lets each halogen free only the halogens below it", () => {
    for (const [i, oxidant] of HALOGEN_ORDER.entries()) {
      for (const [j, halide] of HALIDE_ORDER.entries()) {
        expect(derive({ oxidant, halide }).displaces, `${oxidant} ${halide}`).toBe(i < j ? 1 : 0);
      }
    }
  });

  it("gives E°cell as the difference of the two couples", () => {
    expect(derive({ oxidant: "cl2", halide: "bromide" }).emf).toBe(0.27);
    expect(derive({ oxidant: "cl2", halide: "iodide" }).emf).toBe(0.82);
    expect(derive({ oxidant: "br2", halide: "chloride" }).emf).toBe(-0.27);
    expect(derive({ oxidant: "i2", halide: "iodide" }).emf).toBe(0);
  });
});

describe("interhalogens and xenon compounds", () => {
  it("counts the lone pairs left on the central atom", () => {
    const pairs = Object.fromEntries(HALOGEN_COMPOUND_ORDER.map((id) => [id, centralLonePairs(HALOGEN_COMPOUNDS[id])]));
    expect(pairs).toEqual({ clf3: 2, brf5: 1, if7: 0, xef2: 3, xef4: 2, xef6: 1, xeo3: 1, xeof4: 1 });
  });

  it("names the shape and hybridisation from the domains", () => {
    const of = (compound: HalogensParams["compound"]) => {
      const r = derive({ compound });
      return [r.domains, HALOGEN_SHAPES[r.shape], r.xenon];
    };
    expect(of("xef2")).toEqual([5, "linear", 1]);
    expect(of("xef4")).toEqual([6, "square planar", 1]);
    expect(of("xef6")).toEqual([7, "distorted octahedral", 1]);
    expect(of("xeo3")).toEqual([4, "pyramidal", 1]);
    expect(of("clf3")).toEqual([5, "T-shaped", 0]);
    expect(of("if7")).toEqual([7, "pentagonal bipyramidal", 0]);
  });

  it("builds a geometry with a unit vector for every atom and lone pair", () => {
    for (const id of HALOGEN_COMPOUND_ORDER) {
      const { bonds, lone } = compoundGeometry(id);
      expect(bonds, id).toHaveLength(HALOGEN_COMPOUNDS[id].atoms.length);
      expect(lone, id).toHaveLength(centralLonePairs(HALOGEN_COMPOUNDS[id]));
      for (const v of [...bonds, ...lone]) expect(Math.hypot(...v), id).toBeCloseTo(1, 10);
    }
  });

  it("puts XeF₂'s fluorines opposite each other and XeF₄'s in one plane", () => {
    const xef2 = compoundGeometry("xef2").bonds;
    expect(xef2[0]!.map((c, i) => c + xef2[1]![i]!)).toEqual([0, 0, 0]);
    expect(compoundGeometry("xef4").bonds.every((v) => Math.abs(v[2]) < 1e-12)).toBe(true);
  });
});

describe("the model", () => {
  it("turns the molecule on play and numbers every output", () => {
    const s = model.advance(model.initialize(model.defaultParams), 1, model.defaultParams);
    expect(s.yaw).toBeCloseTo(1.4, 10);
    for (const family of ["halogens", "noble"] as const) {
      for (const compound of HALOGEN_COMPOUND_ORDER) {
        const r = model.derive({ position: 6, yaw: 1 }, { ...model.defaultParams, family, compound, property: "pKa" });
        for (const key of model.outputs) expect(Number.isFinite(r[key]), `${family} ${compound} ${key}`).toBe(true);
      }
    }
  });
});
