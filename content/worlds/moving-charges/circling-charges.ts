import { defineLevel } from "@ise/game-engine";
import { degToRad as deg } from "@ise/units";

const shot = (id: string, label: string, particle: string, fieldDirection: string) => ({ id, label, given: { particle, fieldDirection } });

/** Moving Charges, level 1: the magnetic force on a moving charge, circles and helices, the velocity selector and the cyclotron. */
export const circlingCharges = defineLevel({
  schemaVersion: 1,
  id: "circling-charges",
  concept: "moving-charges-and-magnetism",
  title: "Charges that circle",
  summary: "A magnetic field pushes a moving charge sideways, so it goes round — and every turn takes the same time, however fast it goes.",
  xp: 40,
  steps: [
    {
      id: "which-way",
      kind: "sort",
      prompt: "Each charge enters the field moving to the **right**. Will it go round **anticlockwise** or **clockwise**?",
      mode: "orbit",
      given: { speed: 1000, field: 100, pitchAngle: deg(90) },
      canvas: false,
      bins: [
        { id: "anticlockwise", label: "Anticlockwise", when: { type: "compare", quantity: "sense", op: "eq", value: 1 } },
        { id: "clockwise", label: "Clockwise", when: { type: "compare", quantity: "sense", op: "eq", value: -1 } },
      ],
      cards: [
        shot("proton-in", "Proton, B into the page ⊗", "proton", "into"),
        shot("electron-in", "Electron, B into the page ⊗", "electron", "into"),
        shot("proton-out", "Proton, B out of the page ⊙", "proton", "out"),
        shot("electron-out", "Electron, B out of the page ⊙", "electron", "out"),
        shot("alpha-in", "Alpha particle, B into the page ⊗", "alpha", "into"),
        shot("alpha-out", "Alpha particle, B out of the page ⊙", "alpha", "out"),
      ],
      explanation:
        "F = q v × B. With v to the right and B into the page, v × B points up the page, so a positive charge is pushed up and curls anticlockwise. A negative charge, or a field the other way, reverses the push and the turn.",
      hints: ["Right hand: fingers along v, curl them towards B. The thumb gives the force on a positive charge."],
    },
    {
      id: "faster",
      kind: "predict",
      prompt: "A proton circles in a **100 mT** field. Its speed goes up from **1000 km/s** to **3000 km/s**. What happens to the **time for one turn**?",
      mode: "orbit",
      variable: "speed",
      from: 1000,
      to: 3000,
      quantity: "period",
      options: ["increase", "decrease", "same"],
      given: { particle: "proton", fieldDirection: "into", field: 100, pitchAngle: deg(90) },
      explanation:
        "It stays 0.656 µs. Three times as fast, the proton goes round a circle three times as big — 10.4 cm becomes 31.3 cm — so each lap takes the same time. T = 2πm/qB has no v in it.",
    },
    {
      id: "five-centimetres",
      kind: "target",
      prompt: "A proton at **1000 km/s** crosses a field into the page. Set **B** so that it goes round a circle of radius **5 cm**.",
      mode: "orbit",
      given: { particle: "proton", fieldDirection: "into", speed: 1000, pitchAngle: deg(90), field: 50 },
      controls: ["field"],
      canvas: false,
      goal: { type: "compare", quantity: "radius", op: "eq", value: 5, tolerance: 0.1 },
      success:
        "About 209 mT. From r = mv/qB, B = mv/qr = (1.67 × 10⁻²⁷ × 10⁶) / (1.6 × 10⁻¹⁹ × 0.05) ≈ 0.21 T. A stronger field bends the proton into a tighter circle.",
      retry: "Not 5 cm yet. A stronger field makes the circle smaller.",
      hints: ["The circle is 10.4 cm at 100 mT, and r is proportional to 1/B."],
    },
    {
      id: "helix",
      kind: "target",
      prompt: "Now tilt the proton's velocity away from 90° to B. Find the angle at which each turn of its **helix** moves **40 cm** along the field.",
      mode: "helix",
      given: { particle: "proton", speed: 1000, field: 100, pitchAngle: deg(90) },
      controls: ["pitchAngle"],
      canvas: false,
      goal: { type: "compare", quantity: "pitch", op: "eq", value: 40, tolerance: 1.5 },
      success:
        "About 52°. The part of v along B, v cos θ ≈ 6.2 × 10⁵ m/s, carries the proton about 40 cm in each 0.656 µs turn, while the part across B, v sin θ, sets the radius: 8.2 cm.",
      retry: "Not 40 cm a turn yet. The more v leans along B, the longer the pitch.",
      hints: ["At 90° there is no drift along B at all; at 0° there is no circle."],
    },
    {
      id: "selector",
      kind: "target",
      prompt: "Protons at **1000 km/s** enter crossed fields, with **B = 100 mT** into the page and E down it. Set **E** so they pass **straight through** the slit.",
      mode: "selector",
      given: { particle: "proton", speed: 1000, field: 100, efield: 20 },
      controls: ["efield"],
      canvas: false,
      goal: { type: "compare", quantity: "selectorDeflect", op: "eq", value: 0 },
      success:
        "E = 100 kV/m. Then qE = qvB and the two pushes cancel. Only charges with v = E/B = 10⁶ m/s get through — whatever their charge or mass, so electrons at that speed would pass too.",
      retry: "They still bend. Which push is bigger, qE or qvB?",
      hints: ["The forces balance when qE = qvB, so E = vB."],
    },
    {
      id: "cyclotron-frequency",
      kind: "estimate",
      prompt: "A cyclotron accelerates **protons** in a field of **0.66 T**. How often, in **MHz**, must the voltage across the dees reverse? (f = qB / 2πm)",
      mode: "cyclotron",
      given: { ion: "proton", cycField: 0.66, deeRadius: 60, gapVoltage: 50 },
      canvas: false,
      hideLabels: true,
      quantity: "cycFrequency",
      range: { min: 0, max: 30, step: 0.5 },
      tolerance: 0.5,
      explanation:
        "f = (1.6 × 10⁻¹⁹ × 0.66) / (2π × 1.67 × 10⁻²⁷) ≈ 1.0 × 10⁷ Hz = 10 MHz. Because each half-turn takes the same time at any speed, this one frequency stays in step as the protons spiral out. With 60 cm dees they leave with K = q²B²R²/2m ≈ 7.5 MeV (NCERT's worked example with these numbers rounds it to 7 MeV).",
      hints: ["Put q = 1.6 × 10⁻¹⁹ C and m = 1.67 × 10⁻²⁷ kg into qB / 2πm."],
    },
    {
      id: "law",
      kind: "discover",
      prompt: "The time to go round.",
      mode: "orbit",
      equation: "orbit-period",
      law: "A magnetic field bends a charge into a circle of radius r = mv/qB, but the time for one turn, T = 2πm/qB, is the same at every speed.",
    },
  ],
});
