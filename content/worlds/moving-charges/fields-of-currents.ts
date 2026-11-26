import { defineLevel } from "@ise/game-engine";
import { degToRad as deg } from "@ise/units";

const point = (id: string, label: string, degrees: number, flow = "forward") => ({ id, label, given: { angle: deg(degrees), flow } });

/** Moving Charges, level 3: the Biot–Savart law, the wire and the loop, Ampère's law, the solenoid and the toroid. */
export const fieldsOfCurrents = defineLevel({
  schemaVersion: 1,
  id: "fields-of-currents",
  concept: "moving-charges-and-magnetism",
  title: "Fields from currents",
  summary: "Every bit of current makes a field. Add them up — or use Ampère's law — for a wire, a loop, a solenoid and a toroid.",
  xp: 40,
  steps: [
    {
      id: "element-field",
      kind: "sort",
      prompt: "A short piece of current, **I dl**, points **up the page**. Is its field at P **into** the page, **out** of it, or **zero**? (θ is measured from dl round to P.)",
      mode: "field",
      given: { source: "element", current: 10, distance: 10 },
      canvas: false,
      bins: [
        { id: "into", label: "Into the page ⊗", when: { type: "compare", quantity: "fieldDir", op: "eq", value: 2 } },
        { id: "out", label: "Out of the page ⊙", when: { type: "compare", quantity: "fieldDir", op: "eq", value: 1 } },
        { id: "zero", label: "No field", when: { type: "compare", quantity: "fieldDir", op: "eq", value: 0 } },
      ],
      cards: [
        point("right", "P to the right (θ = 90°)", 90),
        point("left", "P to the left (θ = 270°)", 270),
        point("up-right", "P up and to the right (θ = 45°)", 45),
        point("down-left", "P down and to the left (θ = 225°)", 225),
        point("ahead", "P straight ahead, along dl (θ = 0°)", 0),
        point("behind", "P straight behind (θ = 180°)", 180),
        point("reversed", "Current reversed, P to the right", 90, "reverse"),
      ],
      explanation:
        "dB = (μ₀/4π) I dl × r̂ / r². With dl up the page and P to its right, dl × r̂ points into the page; to its left, out. Along the line of the element sin θ = 0, so it makes no field there at all.",
      hints: ["Fingers along dl, curl them towards P: the thumb gives the field."],
    },
    {
      id: "wire-field",
      kind: "estimate",
      prompt: "A long straight wire carries **10 A**. How strong is its field **5 cm** away, in **µT**? (B = μ₀I / 2πr)",
      mode: "field",
      given: { source: "wire", flow: "forward", current: 10, distance: 5 },
      canvas: false,
      hideLabels: true,
      quantity: "sourceField",
      range: { min: 0, max: 200, step: 1 },
      tolerance: 2,
      explanation:
        "B = (4π × 10⁻⁷ × 10) / (2π × 0.05) = 4 × 10⁻⁵ T = 40 µT — close to the strength of the Earth's field. The lines are circles round the wire, anticlockwise round a current coming out of the page.",
      hints: ["μ₀ / 2π = 2 × 10⁻⁷ T m/A."],
    },
    {
      id: "bigger-circle",
      kind: "predict",
      prompt: "Round the same **10 A** wire, the Amperian circle grows from **5 cm** to **10 cm**. What happens to **∮B·dl ÷ μ₀**, the field added up all the way round?",
      mode: "field",
      variable: "distance",
      from: 5,
      to: 10,
      quantity: "lineIntegral",
      options: ["increase", "decrease", "same"],
      given: { source: "wire", flow: "forward", current: 10 },
      explanation:
        "It stays 10 A. On the bigger circle B is half as strong, 20 µT instead of 40 µT, but the circle is twice as long, so B × 2πr = μ₀I either way. That is Ampère's circuital law.",
    },
    {
      id: "loop-centre",
      kind: "estimate",
      prompt: "A flat coil of **50 turns** and radius **10 cm** carries **2 A**. What is the field at its **centre**, in **µT**? (B = μ₀NI / 2R)",
      mode: "field",
      given: { source: "loop", flow: "forward", turns: 50, current: 2, distance: 10, axial: 0 },
      canvas: false,
      hideLabels: true,
      quantity: "centreField",
      range: { min: 0, max: 2000, step: 10 },
      tolerance: 20,
      explanation:
        "B = (4π × 10⁻⁷ × 50 × 2) / (2 × 0.1) = 2π × 10⁻⁴ T ≈ 628 µT. Every element of the loop is R from the centre and at right angles to the line to it, so their Biot–Savart fields all point the same way along the axis and simply add.",
      hints: ["Radius in metres: 10 cm = 0.1 m."],
    },
    {
      id: "solenoid",
      kind: "target",
      prompt: "A solenoid **50 cm** long has **1000 turns**. Set the **current** to make a field of **5 mT** (5000 µT) inside it.",
      mode: "field",
      given: { source: "solenoid", flow: "forward", turns: 1000, length: 50, current: 0.5 },
      controls: ["current"],
      canvas: false,
      goal: { type: "compare", quantity: "sourceField", op: "eq", value: 5000, tolerance: 100 },
      success:
        "2 A. n = 1000 / 0.5 m = 2000 turns per metre, and B = μ₀nI = 4π × 10⁻⁷ × 2000 × 2 ≈ 5.0 × 10⁻³ T. Inside a long solenoid the field is the same everywhere, along the axis; outside it is almost zero.",
      retry: "Not 5 mT yet. B = μ₀nI grows in step with the current.",
      hints: ["Work out n = N/L in turns per metre first."],
    },
    {
      id: "out-of-the-core",
      kind: "predict",
      prompt: "A toroid of **100 turns** carries **10 A**; its core runs from 15 cm to 25 cm from the centre. The Amperian circle grows from **20 cm** (in the core) to **30 cm** (outside). What happens to **B** on it?",
      mode: "field",
      variable: "distance",
      from: 20,
      to: 30,
      quantity: "sourceField",
      options: ["increase", "decrease", "same"],
      given: { source: "toroid", flow: "forward", turns: 100, current: 10 },
      explanation:
        "It drops to zero. In the core the circle is threaded by all 100 turns, NI = 1000 A, so B = μ₀NI / 2πr = 1000 µT at 20 cm. Outside, every turn threads it twice, once each way: no net current, no field.",
    },
    {
      id: "law",
      kind: "discover",
      prompt: "Adding up the field round a loop.",
      mode: "field",
      equation: "ampere-law",
      law: "Round any closed loop, B·dl added all the way round equals μ₀ times the current threading the loop: ∮B·dl = μ₀I.",
    },
  ],
});
