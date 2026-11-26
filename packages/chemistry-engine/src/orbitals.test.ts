import { describe, expect, it } from "vitest";
import { boxesFor, configurationOf, configurationText, legalOrbital, orbitalsModel as model, type OrbitalsState } from "./orbitals";

const P = model.defaultParams;
const at = (Z: number, over: Partial<OrbitalsState> = {}) => model.derive({ ...model.initialize(P), Z, ...over }, P);

describe("filling the orbitals", () => {
  it("follows the Aufbau order, 4s before 3d", () => {
    expect(configurationText(11)).toBe("1s² 2s² 2p⁶ 3s¹");
    expect(configurationText(19)).toBe("1s² 2s² 2p⁶ 3s² 3p⁶ 4s¹");
    expect(configurationText(26)).toBe("1s² 2s² 2p⁶ 3s² 3p⁶ 4s² 3d⁶");
    expect(configurationText(36)).toBe("1s² 2s² 2p⁶ 3s² 3p⁶ 4s² 3d¹⁰ 4p⁶");
  });

  it("makes the two exceptions: chromium and copper borrow a 4s electron", () => {
    expect(configurationOf(24)).toMatchObject({ "4s": 1, "3d": 5 });
    expect(configurationOf(29)).toMatchObject({ "4s": 1, "3d": 10 });
    expect(at(24)).toMatchObject({ exception: 1, unpaired: 6 });
    expect(at(25).exception).toBe(0);
  });

  it("spreads electrons out before pairing them (Hund)", () => {
    expect(boxesFor(1, 3)).toEqual([[true, false], [true, false], [true, false]]);
    expect(boxesFor(1, 4)).toEqual([[true, true], [true, false], [true, false]]);
    expect(at(7).unpaired).toBe(3);
    expect(at(8).unpaired).toBe(2);
    expect(at(26).unpaired).toBe(4);
  });

  it("knows noble gases are diamagnetic, and oxygen is not", () => {
    for (const Z of [2, 10, 18, 36]) expect(at(Z).paramagnetic, String(Z)).toBe(0);
    expect(at(8).paramagnetic).toBe(1);
  });

  it("names the block by the subshell the last electron went into", () => {
    expect([at(11).block, at(17).block, at(26).block, at(29).block]).toEqual([0, 1, 2, 2]);
    expect(at(26)).toMatchObject({ lastN: 3, lastL: 2, valenceShell: 4 });
  });
});

describe("one orbital", () => {
  it("counts its nodes", () => {
    const nodes = (n: number, l: number) => at(1, { n, l, m: 0 });
    expect(nodes(1, 0)).toMatchObject({ radialNodes: 0, angularNodes: 0, nodes: 0 });
    expect(nodes(2, 1)).toMatchObject({ radialNodes: 0, angularNodes: 1 });
    expect(nodes(3, 2)).toMatchObject({ radialNodes: 0, angularNodes: 2 });
    expect(nodes(4, 0)).toMatchObject({ radialNodes: 3, nodes: 3 });
  });

  it("holds 2(2l + 1) in a subshell and 2n² in a shell", () => {
    expect(at(1, { n: 3, l: 2 })).toMatchObject({ subshellCapacity: 10, shellCapacity: 18, orbitalsInShell: 9, nPlusL: 5 });
  });

  it("keeps the quantum numbers legal", () => {
    expect(legalOrbital(2, 3, 3)).toEqual({ n: 2, l: 1, m: 1 });
    expect(legalOrbital(1, 1, -1)).toEqual({ n: 1, l: 0, m: 0 });
    expect(model.setVariable({ ...model.initialize(P), n: 3, l: 2, m: 2 }, "n", 2, P)).toMatchObject({ n: 2, l: 1, m: 1 });
  });
});

describe("the model", () => {
  it("adds an electron each beat of Play, and wraps after krypton", () => {
    const s = model.advance({ ...model.initialize(P), Z: 5, clock: 0.7 }, 0.2, P);
    expect(s).toMatchObject({ Z: 6, clock: 0 });
    expect(model.advance({ ...model.initialize(P), Z: 36, clock: 0.8 }, 0.1, P).Z).toBe(1);
    const r = at(20);
    for (const key of model.outputs) expect(Number.isFinite(r[key]), key).toBe(true);
  });
});
