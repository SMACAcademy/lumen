import { defineLevel } from "@ise/game-engine";

const gap = (id: string, label: string, x0: number, h: number) => ({ id, label, given: { x0, h } });
const card = (id: string, label: string) => ({ id, label });

/** The Derivative, level 1: slope as rise ÷ run, with units — an average rate of change over an interval. */
export const riseOverRun = defineLevel({
  schemaVersion: 1,
  id: "rise-over-run",
  concept: "secant-to-tangent",
  title: "Rise over run",
  summary: "A slope is a rate: how much y changes for each unit of x. Measure average speeds off a distance–time graph.",
  xp: 30,
  steps: [
    {
      id: "rise",
      kind: "estimate",
      prompt:
        "Let y = x² be the **distance in metres** a ball has rolled after **x seconds**. P is at 1 s and Q at 3 s. How far does the ball roll between them? Estimate the **rise Δy**.",
      mode: "secant",
      given: { family: "quadratic", x0: 1, h: 2 },
      canvas: false,
      hideLabels: true,
      hideGraphs: true,
      quantity: "dy",
      range: { min: 0, max: 10, step: 0.1 },
      tolerance: 0.15,
      explanation:
        "8 m. After 3 s it has rolled 3² = 9 m and after 1 s 1² = 1 m, so Δy = 9 − 1 = 8 m, over a run of Δx = 3 − 1 = 2 s.",
      hints: ["Work out y at x = 3 and at x = 1, and subtract."],
    },
    {
      id: "average-speed",
      kind: "estimate",
      prompt:
        "A rise of 8 m over a run of 2 s. What is the **slope of the secant PQ**? In this story it is the ball's **average speed**, in m/s.",
      mode: "secant",
      given: { family: "quadratic", x0: 1, h: 2 },
      canvas: false,
      hideLabels: true,
      hideGraphs: true,
      quantity: "secantSlope",
      range: { min: 0, max: 9, step: 0.1 },
      tolerance: 0.15,
      explanation:
        "4 m/s. Slope = rise ÷ run = 8 m ÷ 2 s = 4 m/s. A slope always has units: units of y per unit of x. On a distance–time graph that is metres per second, a speed.",
      hints: ["Slope = Δy ÷ Δx."],
    },
    {
      id: "one-metre-per-second",
      kind: "target",
      prompt:
        "Now P is at the start, **t = 0**. Move Q (change the gap h) so that the ball's **average speed** from P to Q is exactly **1 m/s**.",
      mode: "secant",
      given: { family: "quadratic", x0: 0, h: 2 },
      controls: ["h"],
      canvas: false,
      goal: { type: "compare", quantity: "secantSlope", op: "eq", value: 1, tolerance: 0.02 },
      success:
        "h = 1: in the first second the ball rolls 1 m, so its average speed is 1 m ÷ 1 s = 1 m/s. Starting from 0 the average speed over h seconds is h² ÷ h = h.",
      retry: "Watch the secant slope: it should read 1.",
      hints: ["With P at 0, the secant slope is h²/h.", "Set h = 1."],
    },
    {
      id: "later-second",
      kind: "predict",
      prompt:
        "Keep a gap of **1 second**, but take it later: P moves from t = 0 to **t = 2**, so the interval is 2 s to 3 s. What happens to the **average speed** (the secant slope)?",
      mode: "secant",
      given: { family: "quadratic", h: 1 },
      variable: "x0",
      from: 0,
      to: 2,
      quantity: "secantSlope",
      options: ["increase", "decrease", "same"],
      explanation:
        "It rises from 1 m/s to 5 m/s: between 2 s and 3 s the ball rolls 9 − 4 = 5 m. The graph is getting steeper, so the ball is speeding up. On a curve the average rate depends on the interval; on a straight line it would be the same everywhere.",
    },
    {
      id: "rank-the-rates",
      kind: "order",
      prompt:
        "Leave the ball and look at the whole curve y = x². **Order** these intervals by their average rate of change Δy/Δx, lowest first.",
      mode: "secant",
      given: { family: "quadratic" },
      canvas: false,
      ends: ["lowest rate", "highest rate"],
      by: "secantSlope",
      cards: [
        gap("a", "from x = −2 to −1", -2, 1),
        gap("b", "from x = −1 to 0", -1, 1),
        gap("c", "from x = −1 to 1", -1, 2),
        gap("d", "from x = 0 to 1", 0, 1),
        gap("e", "from x = 1 to 3", 1, 2),
      ],
      explanation:
        "−3, −1, 0, 1 and 4. A negative rate means y falls as x grows. From −1 to 1 the rate is 0: y ends where it started (1), although it dipped to 0 in between — an average hides what happens inside the interval.",
      hints: ["Work out Δy ÷ Δx for each, e.g. from 0 to 1: (1 − 0) ÷ 1 = 1. Falling y gives a negative rate."],
    },
    {
      id: "units",
      kind: "match",
      prompt: "The units of a slope are **units of y per unit of x**. **Match** each graph to the units of its slope.",
      canvas: false,
      pairs: [
        { left: card("distance", "distance (m) against time (s)"), right: card("speed", "m/s, a speed") },
        { left: card("cost", "cost (₹) against mass (kg)"), right: card("price", "₹ per kg, a price") },
        { left: card("tank", "water in a tank (L) against time (min)"), right: card("flow", "L/min, a flow rate") },
        { left: card("temperature", "temperature (°C) against time (h)"), right: card("heating", "°C per hour, heating or cooling") },
        { left: card("velocity", "velocity (m/s) against time (s)"), right: card("acceleration", "m/s², an acceleration") },
      ],
      explanation:
        "Divide the unit up the side by the unit along the bottom. Onions at ₹40 per kg: the cost–mass graph is a straight line of slope 40, so every extra kilogram adds ₹40.",
      hints: ["Slope = Δy ÷ Δx, so its unit is (unit of y) ÷ (unit of x)."],
    },
    {
      id: "law",
      kind: "discover",
      prompt: "A slope is a rate.",
      mode: "secant",
      equation: "secant-slope",
      law: "The slope of the line through two points is rise ÷ run, Δy/Δx: the average rate of change of y over that interval, in units of y per unit of x.",
    },
  ],
});
