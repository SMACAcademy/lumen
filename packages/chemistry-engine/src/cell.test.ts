import { describe, expect, it } from "vitest";
import { cellModel, cellVoltage, concentrationsAt, electrodePotential, ELECTRODES, electronsTransferred, flatMixture, RUN_DOWN_TIME, type CellParams } from "./cell";

const DANIELL: CellParams = { left: "zn", right: "cu", cLeft: 1, cRight: 1 };
const derive = (params: CellParams, progress = 0) => cellModel.derive({ ...cellModel.initialize(params), progress }, params);

describe("electrode potentials", () => {
  it("is E° itself at 1 mol/L", () => {
    expect(electrodePotential(ELECTRODES.cu, 1)).toBeCloseTo(0.34, 12);
  });

  it("falls by 0.0591/z volts for every tenfold dilution (Nernst)", () => {
    expect(electrodePotential(ELECTRODES.cu, 0.1)).toBeCloseTo(0.34 - 0.0591 / 2, 12);
    expect(electrodePotential(ELECTRODES.ag, 0.01)).toBeCloseTo(0.8 - 2 * 0.0591, 12);
  });
});

describe("the Daniell cell", () => {
  it("gives 1.10 V under standard conditions, with zinc as the anode", () => {
    const r = derive(DANIELL);
    expect(r.Ecell).toBeCloseTo(1.1, 9);
    expect(r.Ecell0).toBeCloseTo(1.1, 9);
    expect(r.direction).toBe(1);
    expect(r.spontaneous).toBe(1);
  });

  it("stores ΔG = −nFE: about −212 kJ per mole", () => {
    const r = derive(DANIELL);
    expect(r.n).toBe(2);
    expect(r.deltaG0).toBeCloseTo((-2 * 96485 * 1.1) / 1000, 6);
    expect(r.deltaG).toBeCloseTo(-212.3, 0);
  });

  it("has an enormous equilibrium constant, K = 10^(nE°/0.0591)", () => {
    expect(derive(DANIELL).log10K).toBeCloseTo((2 * 1.1) / 0.0591, 9);
  });

  it("follows the Nernst equation for the whole cell: E = E° − (0.0591/n) log Q", () => {
    const p = { ...DANIELL, cLeft: 0.01, cRight: 1 };
    const r = derive(p);
    expect(r.Ecell).toBeCloseTo(1.1 - (0.0591 / 2) * Math.log10(0.01 / 1), 6);
    expect(r.Q).toBeCloseTo(0.01, 9);
  });
});

describe("running it down", () => {
  it("falls steadily to zero volts, and at zero Q equals K", () => {
    const voltages = [0, 0.25, 0.5, 0.75, 1].map((p) => derive(DANIELL, p).Ecell);
    for (let i = 1; i < voltages.length; i++) expect(voltages[i]!).toBeLessThan(voltages[i - 1]!);
    const flat = derive(DANIELL, 1);
    expect(flat.Ecell).toBeCloseTo(0, 3);
    expect(flat.flat).toBe(1);
    expect(Math.log10(flat.Q)).toBeCloseTo(flat.log10K, 1);
  });

  it("uses up the copper ions and makes zinc ions, electron for electron", () => {
    const { left, right } = concentrationsAt(DANIELL, 1);
    expect(right).toBeLessThan(1e-30); // Cu²⁺ all but gone
    expect(left).toBeCloseTo(2, 9); // every Cu²⁺ reduced dissolved one Zn
  });

  it("finds the flat point for a silver cell, with one-electron ions", () => {
    const p: CellParams = { left: "cu", right: "ag", cLeft: 1, cRight: 1 };
    expect(electronsTransferred(2, 1)).toBe(2);
    expect(derive(p).Ecell).toBeCloseTo(0.46, 9);
    const end = concentrationsAt(p, 1);
    expect(cellVoltage(p, end.left, end.right)).toBeCloseTo(0, 6);
    expect(end.left).toBeCloseTo(1.5, 6); // two Ag⁺ reduced for each Cu²⁺ made (a trace of Ag⁺ remains)
  });

  it("runs backwards, depleting the left beaker, when the cell is written the wrong way round", () => {
    const p: CellParams = { left: "cu", right: "zn", cLeft: 1, cRight: 1 };
    const r = derive(p);
    expect(r.Ecell).toBeCloseTo(-1.1, 9);
    expect(r.direction).toBe(-1);
    expect(r.spontaneous).toBe(0);
    expect(flatMixture(p).side).toBe("left");
    expect(derive(p, 1).Ecell).toBeCloseTo(0, 3);
  });

  it("makes a concentration cell from one metal, which stops when the beakers match", () => {
    const p: CellParams = { left: "zn", right: "zn", cLeft: 0.01, cRight: 1 };
    const r = derive(p);
    expect(r.Ecell0).toBe(0);
    expect(r.Ecell).toBeCloseTo((0.0591 / 2) * 2, 9);
    const end = concentrationsAt(p, 1);
    expect(end.left).toBeCloseTo(end.right, 6);
    expect(end.left).toBeCloseTo(0.505, 6);
  });

  it("does nothing when the voltage is already zero", () => {
    const p: CellParams = { left: "zn", right: "zn", cLeft: 1, cRight: 1 };
    expect(flatMixture(p).side).toBeNull();
    expect(derive(p, 1).Ecell).toBe(0);
  });
});

describe("playing it", () => {
  it("runs a fresh cell flat in the run-down time, and steps a tenth at a time", () => {
    const s = cellModel.initialize(DANIELL);
    expect(cellModel.advance(s, RUN_DOWN_TIME / 2, DANIELL).progress).toBeCloseTo(0.5, 12);
    expect(cellModel.advance(s, RUN_DOWN_TIME * 3, DANIELL).progress).toBe(1);
    expect(cellModel.step(s, DANIELL, 1).progress).toBeCloseTo(0.1, 12);
    expect(cellModel.step(s, DANIELL, -1).progress).toBe(0);
  });

  it("starts afresh when the electrodes or concentrations change", () => {
    const run = cellModel.advance(cellModel.initialize(DANIELL), 4, DANIELL);
    expect(cellModel.derive(run, { ...DANIELL, right: "ag" }).progress).toBe(0);
    expect(cellModel.setVariable(run, "progress", 2, DANIELL).progress).toBe(1);
    expect(cellModel.getVariable(run, "progress")).toBeCloseTo(0.5, 12);
  });
});
