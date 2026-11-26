import { describe, expect, it } from "vitest";
import {
  atomLabelText,
  chainMolecule,
  chargeText,
  curlyArrowPath,
  drawBondArrow,
  drawCurlyArrow,
  drawMolecule,
  implicitHydrogens,
  placeMolecule,
  splitElements,
  zigzagChain,
  type Molecule2D,
} from "./shared/molecule";
import { recordingContext } from "./testing/recorder";

const dist = (m: Molecule2D, i: number, j: number) => Math.hypot(m.atoms[i]!.x - m.atoms[j]!.x, m.atoms[i]!.y - m.atoms[j]!.y);
const angleAt = (m: Molecule2D, i: number, a: number, b: number) => {
  const u = { x: m.atoms[a]!.x - m.atoms[i]!.x, y: m.atoms[a]!.y - m.atoms[i]!.y };
  const v = { x: m.atoms[b]!.x - m.atoms[i]!.x, y: m.atoms[b]!.y - m.atoms[i]!.y };
  const cos = (u.x * v.x + u.y * v.y) / (Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y));
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
};
/** Which side of the line a→b a point lies: +1 or −1. */
const side = (m: Molecule2D, a: number, b: number, p: number) => {
  const A = m.atoms[a]!;
  const B = m.atoms[b]!;
  const P = m.atoms[p]!;
  return Math.sign((B.x - A.x) * (P.y - A.y) - (B.y - A.y) * (P.x - A.x));
};
const box = { x: 0, y: 0, width: 300, height: 160 };

describe("building chains", () => {
  it("lays a chain out as a 120° zig-zag of unit bonds", () => {
    const m = zigzagChain(5);
    expect(m.atoms).toHaveLength(5);
    expect(m.bonds).toHaveLength(4);
    for (let i = 0; i < 4; i++) expect(dist(m, i, i + 1)).toBeCloseTo(1, 6);
    for (let i = 1; i < 4; i++) expect(angleAt(m, i, i - 1, i + 1)).toBeCloseTo(120, 6);
  });

  it("keeps the carbons of a triple bond in a straight line", () => {
    const m = chainMolecule({ atoms: ["C", "C", "C", "C", "C"], orders: [1, 3, 1, 1] });
    expect(angleAt(m, 1, 0, 2)).toBeCloseTo(180, 6);
    expect(angleAt(m, 2, 1, 3)).toBeCloseTo(180, 6);
    expect(angleAt(m, 3, 2, 4)).toBeCloseTo(120, 6);
  });

  it("draws but-2-ene trans by default and cis on request", () => {
    const trans = chainMolecule({ atoms: ["C", "C", "C", "C"], orders: [1, 2, 1] });
    const cis = chainMolecule({ atoms: ["C", "C", "C", "C"], orders: [1, 2, 1], cisAt: 1 });
    expect(side(trans, 1, 2, 0)).toBe(-side(trans, 1, 2, 3));
    expect(side(cis, 1, 2, 0)).toBe(side(cis, 1, 2, 3));
    expect(dist(cis, 2, 3)).toBeCloseTo(1, 6);
  });

  it("numbers atoms chain first, then branches in order", () => {
    const m = chainMolecule({ atoms: ["C", "C", "C", "C"], branches: [{ at: 1, atoms: ["C"] }, { at: 2, atoms: ["C", "C"] }, { at: 3, atoms: ["O"], order: 2 }] });
    expect(m.atoms.map((a) => a.el)).toEqual(["C", "C", "C", "C", "C", "C", "C", "O"]);
    expect(m.bonds.slice(3)).toEqual([
      { a: 1, b: 4, order: 1 },
      { a: 2, b: 5, order: 1 },
      { a: 5, b: 6, order: 1 },
      { a: 3, b: 7, order: 2 },
    ]);
    for (const b of m.bonds) expect(dist(m, b.a, b.b)).toBeCloseTo(1, 6);
  });

  it("points a branch outward, and splays two on one carbon", () => {
    const one = zigzagChain(3, [{ at: 2, atoms: "C" }]);
    expect(angleAt(one, 1, 0, 3)).toBeCloseTo(120, 6);
    expect(angleAt(one, 1, 2, 3)).toBeCloseTo(120, 6);
    const two = zigzagChain(3, [{ at: 2, atoms: "C" }, { at: 2, atoms: "C" }]);
    expect(angleAt(two, 1, 3, 4)).toBeCloseTo(70, 6);
    expect(dist(two, 3, 4)).toBeGreaterThan(0.8);
  });

  it("hangs up to three groups off a chain end without overlap", () => {
    const m = chainMolecule({ atoms: ["C", "C"], branches: [{ at: 0, atoms: ["Cl"] }, { at: 0, atoms: ["Cl"] }, { at: 0, atoms: ["Cl"] }, { at: 1, atoms: ["O"], order: 2 }, { at: 1, atoms: ["O"] }] });
    for (let i = 0; i < m.atoms.length; i++) for (let j = i + 1; j < m.atoms.length; j++) expect(dist(m, i, j), `${i}-${j}`).toBeGreaterThan(0.9);
    expect(angleAt(m, 1, 5, 6)).toBeCloseTo(120, 6);
  });

  it("takes element strings", () => {
    expect(splitElements("CClOBr")).toEqual(["C", "Cl", "O", "Br"]);
    expect(zigzagChain(2, [{ at: 1, atoms: "OC" }]).atoms.map((a) => a.el)).toEqual(["C", "C", "O", "C"]);
  });
});

describe("hydrogens and labels", () => {
  it("fills each atom's valence with hydrogens", () => {
    const ethanol = chainMolecule({ atoms: ["C", "C", "O"] });
    expect([0, 1, 2].map((i) => implicitHydrogens(ethanol, i))).toEqual([3, 2, 1]);
    const ethene = chainMolecule({ atoms: ["C", "C"], orders: [2] });
    expect(implicitHydrogens(ethene, 0)).toBe(2);
    const nitrile = chainMolecule({ atoms: ["C", "C", "N"], orders: [1, 3] });
    expect(implicitHydrogens(nitrile, 2)).toBe(0);
  });

  it("takes charges and radicals into account", () => {
    const cation: Molecule2D = { atoms: [{ el: "C", x: 0, y: 0, charge: 1 }, { el: "C", x: 1, y: 0 }], bonds: [{ a: 0, b: 1, order: 1 }] };
    expect(implicitHydrogens(cation, 0)).toBe(2);
    const radical: Molecule2D = { atoms: [{ el: "C", x: 0, y: 0, radical: true }], bonds: [] };
    expect(implicitHydrogens(radical, 0)).toBe(3);
    const oxonium: Molecule2D = { atoms: [{ el: "O", x: 0, y: 0, charge: 1 }, { el: "C", x: 1, y: 0 }], bonds: [{ a: 0, b: 1, order: 1 }] };
    expect(implicitHydrogens(oxonium, 0)).toBe(2);
    const alkoxide: Molecule2D = { atoms: [{ el: "O", x: 0, y: 0, charge: -1 }, { el: "C", x: 1, y: 0 }], bonds: [{ a: 0, b: 1, order: 1 }] };
    expect(implicitHydrogens(alkoxide, 0)).toBe(0);
    expect([chargeText(1), chargeText(-1), chargeText(2), chargeText(0)]).toEqual(["⁺", "⁻", "²⁺", ""]);
  });

  it("labels heteroatoms in skeletal style, every atom in condensed, H away from the bonds", () => {
    const m = chainMolecule({ atoms: ["C", "C", "C", "O"] });
    expect([0, 1, 2, 3].map((i) => atomLabelText(m, i, "skeletal"))).toEqual([null, null, null, "OH"]);
    expect([0, 1, 2, 3].map((i) => atomLabelText(m, i, "condensed"))).toEqual(["H₃C", "CH₂", "CH₂", "OH"]);
    const reversed = chainMolecule({ atoms: ["O", "C"] });
    expect(atomLabelText(reversed, 0, "skeletal")).toBe("HO");
    expect(atomLabelText({ atoms: [{ el: "C", x: 0, y: 0 }], bonds: [] }, 0, "skeletal")).toBe("CH₄");
  });
});

describe("placing and drawing", () => {
  it("fits the molecule inside its box, no bond longer than the cap", () => {
    const m = zigzagChain(8, [{ at: 3, atoms: "CC" }]);
    const placed = placeMolecule(m, box, { maxBond: 40 });
    expect(placed.bond).toBeLessThanOrEqual(40);
    for (let i = 0; i < m.atoms.length; i++) {
      const p = placed.point(i);
      expect(p.x).toBeGreaterThanOrEqual(box.x);
      expect(p.x).toBeLessThanOrEqual(box.x + box.width);
      expect(p.y).toBeGreaterThanOrEqual(box.y);
      expect(p.y).toBeLessThanOrEqual(box.y + box.height);
    }
    const small = placeMolecule(zigzagChain(2), box, { maxBond: 30 });
    expect(small.bond).toBe(30);
    expect((small.bounds.left + small.bounds.right) / 2).toBeCloseTo(150, 6);
  });

  it("draws bonds as lines (two for a double bond) and labels as text", () => {
    const rec = recordingContext();
    drawMolecule(rec.ctx, chainMolecule({ atoms: ["C", "C", "C", "O"], orders: [2, 1, 1] }), box, { color: "#fff", font: "12px sans" });
    expect(rec.of("lineTo")).toHaveLength(4);
    expect(rec.texts()).toEqual(["O", "H"]);
    const condensed = recordingContext();
    drawMolecule(condensed.ctx, chainMolecule({ atoms: ["C", "C"] }), box, { color: "#fff", font: "12px sans", style: "condensed" });
    expect(condensed.texts()).toEqual(["C", "H₃", "C", "H₃"]);
  });

  it("stops bonds short of a label", () => {
    const rec = recordingContext();
    const m = chainMolecule({ atoms: ["C", "O"] });
    const placed = drawMolecule(rec.ctx, m, box, { color: "#fff", font: "12px sans" });
    const end = rec.of("lineTo")[0]!.args as number[];
    const o = placed.point(1);
    expect(Math.hypot(end[0]! - o.x, end[1]! - o.y)).toBeCloseTo(8, 6);
  });

  it("draws wedges filled and dashes as hashes, charges and lone pairs as marks", () => {
    const rec = recordingContext();
    const m: Molecule2D = {
      atoms: [{ el: "C", x: 0, y: 0, charge: -1, lonePairs: 1 }, { el: "H", x: -1, y: 0.3 }, { el: "H", x: 0.8, y: 0.5 }, { el: "H", x: 0.8, y: -0.2 }],
      bonds: [{ a: 0, b: 1, order: 1 }, { a: 0, b: 2, order: 1, stereo: "wedge" }, { a: 0, b: 3, order: 1, stereo: "dash" }],
    };
    const placed = drawMolecule(rec.ctx, m, box, { color: "#fff", font: "12px sans", style: "condensed" });
    expect(rec.of("fill").length).toBeGreaterThanOrEqual(3); // wedge + two lone-pair dots
    expect(rec.of("arc")).toHaveLength(2);
    expect(rec.texts()).toContain("⁻");
    // The lone pair points away from all three bonds — here, upward.
    expect(placed.lonePair(0).y).toBeLessThan(placed.point(0).y);
  });
});

describe("curly arrows", () => {
  const vinyl = chainMolecule({ atoms: ["C", "C", "O"], orders: [2, 1] });
  vinyl.atoms[2]!.lonePairs = 2;

  it("runs from a lone pair or bond to a bond or atom, bowing outward", () => {
    const placed = placeMolecule(vinyl, box, { style: "condensed" });
    const { start, end, control } = curlyArrowPath(placed, { lonePair: 2 }, { bond: [1, 2] });
    expect(start).toEqual(placed.lonePair(2));
    expect(end).toEqual(placed.bondMid(1, 2));
    const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    expect(Math.hypot(control.x - placed.centre.x, control.y - placed.centre.y)).toBeGreaterThan(Math.hypot(mid.x - placed.centre.x, mid.y - placed.centre.y));
    const toAtom = curlyArrowPath(placed, { bond: [0, 1] }, { atom: 0 });
    expect(Math.hypot(toAtom.end.x - placed.point(0).x, toAtom.end.y - placed.point(0).y)).toBeCloseTo(10, 6);
  });

  it("draws a curve and a head; a fishhook has one barb", () => {
    const rec = recordingContext();
    const placed = placeMolecule(vinyl, box);
    drawCurlyArrow(rec.ctx, placed, { bond: [0, 1] }, { atom: 0 }, { color: "#f00" });
    expect(rec.of("quadraticCurveTo")).toHaveLength(1);
    expect(rec.of("lineTo")).toHaveLength(2);
    const hook = recordingContext();
    drawCurlyArrow(hook.ctx, placed, { bond: [0, 1] }, { atom: 0 }, { color: "#f00", fishhook: true });
    const tips = hook.of("lineTo").map((c) => c.args as number[]);
    const full = rec.of("lineTo").map((c) => c.args as number[]);
    expect(tips[1]).not.toEqual(full[1]);
  });

  it("marks the inductive pull on a bond", () => {
    const rec = recordingContext();
    const m = chainMolecule({ atoms: ["C", "Cl"] });
    const placed = placeMolecule(m, box);
    drawBondArrow(rec.ctx, placed, 0, 1, { color: "#fff" });
    const tip = rec.of("moveTo")[0]!.args as number[];
    const mid = placed.bondMid(0, 1);
    const toCl = { x: placed.point(1).x - mid.x, y: placed.point(1).y - mid.y };
    // The tip lies beyond the midpoint, towards Cl.
    expect((tip[0]! - mid.x) * toCl.x + (tip[1]! - mid.y) * toCl.y).toBeGreaterThan(0);
  });
});
