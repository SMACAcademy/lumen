import type { SimulationModel } from "@ise/science-engine";

/**
 * Fluids in motion, and the skin on a liquid's surface (NCERT class 11, ch. 9).
 *
 * Eight small scenes share one model, each picked by the concept's mode:
 *
 * Lift: Pascal's law. A push F₁ on a small piston of area A₁ makes a pressure
 * P = F₁/A₁ that the oil hands on undiminished, so the large piston feels
 * F₂ = P·A₂. The oil pushed out of the small cylinder fills the large one, so
 * the large piston rises d₂ = d₁·A₁/A₂ — force multiplied, distance divided,
 * and the work in equals the work out.
 *
 * Pipe: a horizontal venturi tube carrying an ideal fluid (water with no
 * viscosity). Continuity, A₁v₁ = A₂v₂, speeds it up in the throat; Bernoulli,
 * P + ½ρv² = constant along the horizontal streamline, says its pressure must
 * drop there. Two open tubes standing on the pipe show each pressure as a
 * height of water, h = P/(ρg).
 *
 * Tank: Torricelli's speed of efflux, v = √(2gh), from a hole h below the
 * surface of a wide open tank. The tank holds 1 m of water and stands on the
 * ground, so the jet lands 2√(h(1 − h)) metres away.
 *
 * Shear: a plate dragged at speed v over a layer of liquid d thick. The layers
 * slide over one another with velocity gradient v/d, and the plate needs a
 * force F = ηA·v/d to keep it moving.
 *
 * Fall: a ball sinking through a liquid. Weight minus upthrust minus Stokes'
 * drag 6πηrv accelerates it; the speed rises as v = v_t(1 − e^(−t/τ)) to the
 * terminal velocity v_t = 2r²(ρ − σ)g / 9η, with τ = 2ρr²/9η. Stokes' law only
 * holds for slow, smooth flow round the ball (its Reynolds number below about
 * 1); the model flags when it does not, and ignores the liquid the ball drags
 * along with it.
 *
 * Reynolds: liquid flowing along a pipe. Re = ρvd/η decides the flow:
 * streamline below 1000, turbulent above 2000, unsteady in between (NCERT's
 * figures).
 *
 * Drops: the excess pressure inside a curved surface, 2S/r for a drop (or an
 * air bubble inside the liquid), 4S/r for a bubble in air, which has two
 * surfaces.
 *
 * Capillary: rise h = 2S cos θ / (ρgr) in a tube of radius r. Water wets clean
 * glass (θ ≈ 0) and climbs; mercury (θ ≈ 140°) is pushed down instead.
 */

/** g used throughout, m/s². */
export const FLOW_GRAVITY = 9.8;

// ── Lift ────────────────────────────────────────────────────────────────────

/** The car on the large piston, kg. */
export const FLOW_CAR_MASS = 1000;
/** Furthest the small piston can be pushed down, cm. */
export const FLOW_MAX_STROKE = 20;
/** How fast Play pushes the small piston, cm/s. */
export const FLOW_STROKE_RATE = 4;

// ── Pipe ────────────────────────────────────────────────────────────────────

/** Area of the wide part of the venturi tube, cm². */
export const FLOW_WIDE_AREA = 6;
/** Gauge pressure in the wide part, as the height of water it holds up: 0.5 m (4900 Pa). */
export const FLOW_WIDE_HEAD = 0.5;
export const FLOW_WATER_DENSITY = 1000;

// ── Tank ────────────────────────────────────────────────────────────────────

/** Depth of water in the tank, which stands on the ground, m. */
export const FLOW_TANK_HEIGHT = 1;

// ── Liquids for the shear, fall and Reynolds scenes ─────────────────────────

export type FlowLiquidId = "water" | "castorOil" | "glycerine";
export const FLOW_LIQUID_ORDER: readonly FlowLiquidId[] = ["water", "castorOil", "glycerine"];
/** Density (kg/m³) and viscosity (Pa s) at about 20 °C. */
export const FLOW_LIQUIDS: Record<FlowLiquidId, { label: string; density: number; viscosity: number }> = {
  water: { label: "Water", density: 1000, viscosity: 1.0e-3 },
  castorOil: { label: "Castor oil", density: 960, viscosity: 0.99 },
  glycerine: { label: "Glycerine", density: 1260, viscosity: 1.5 },
};

/** Area of the dragged plate, m². */
export const FLOW_PLATE_AREA = 0.1;

export type FlowBallId = "steel" | "glass";
export const FLOW_BALL_ORDER: readonly FlowBallId[] = ["steel", "glass"];
export const FLOW_BALLS: Record<FlowBallId, { label: string; density: number }> = {
  steel: { label: "Steel", density: 7800 },
  glass: { label: "Glass", density: 2500 },
};
/** Depth of the liquid column the ball falls through, m. */
export const FLOW_COLUMN_DEPTH = 0.3;
/** Above this Reynolds number round the ball, Stokes' law no longer holds. */
export const FLOW_STOKES_LIMIT = 1;
/** NCERT's limits: streamline below 1000, turbulent above 2000. */
export const FLOW_LAMINAR_LIMIT = 1000;
export const FLOW_TURBULENT_LIMIT = 2000;

// ── Surface tension ─────────────────────────────────────────────────────────

export type FlowFilmId = "water" | "soap" | "mercury";
export const FLOW_FILM_ORDER: readonly FlowFilmId[] = ["water", "soap", "mercury"];
/**
 * Surface tension (N/m) at about 20 °C, density (kg/m³), and angle of contact
 * with clean glass (degrees). Mercury's 0.465 N/m and 140° are NCERT's own
 * figures; the soap solution's 0.025 N/m is approximate.
 */
export const FLOW_FILMS: Record<FlowFilmId, { label: string; tension: number; density: number; contact: number }> = {
  water: { label: "Water", tension: 0.0727, density: 1000, contact: 0 },
  soap: { label: "Soap solution", tension: 0.025, density: 1000, contact: 0 },
  mercury: { label: "Mercury", tension: 0.465, density: 13600, contact: 140 },
};

export type FlowShape = "drop" | "bubble";
export const FLOW_SHAPE_ORDER: readonly FlowShape[] = ["drop", "bubble"];

// ── Params, state and results ───────────────────────────────────────────────

export type FlowParams = {
  /** Push on the small piston, N; the two piston areas, cm². */
  effort: number;
  smallArea: number;
  largeArea: number;
  /** Speed of the water in the wide part, m/s; area of the throat, cm². */
  inletSpeed: number;
  throatArea: number;
  /** How far the hole is below the water surface, m. */
  holeDepth: number;
  liquid: FlowLiquidId;
  /** Speed of the dragged plate, cm/s; thickness of the liquid layer, mm. */
  plateSpeed: number;
  gap: number;
  ball: FlowBallId;
  /** Radius of the falling ball, mm. */
  ballRadius: number;
  /** Speed (m/s) and diameter (mm) of the flow along the pipe. */
  pipeSpeed: number;
  pipeDiameter: number;
  film: FlowFilmId;
  shape: FlowShape;
  /** Radius of the drop or bubble, mm; radius of the capillary tube, mm. */
  dropRadius: number;
  tubeRadius: number;
};

export interface FlowState {
  /** How far the small piston has been pushed down, cm. */
  readonly stroke: number;
  /** Time since the ball was let go, s. */
  readonly t: number;
  /** A running clock that moves the drawn particles along, s. */
  readonly clock: number;
}

export type FlowResults = {
  effort: number;
  smallArea: number;
  largeArea: number;
  liftPressure: number;
  liftForce: number;
  advantage: number;
  carWeight: number;
  lifts: number;
  stroke: number;
  rise: number;
  workIn: number;
  workOut: number;

  wideArea: number;
  throatArea: number;
  inletSpeed: number;
  throatSpeed: number;
  flowRate: number;
  wideGauge: number;
  throatGauge: number;
  pressureDrop: number;
  wideHead: number;
  throatHead: number;
  headDrop: number;
  wideEnergy: number;
  throatEnergy: number;

  holeDepth: number;
  holeHeight: number;
  effluxSpeed: number;
  jetRange: number;

  liquid: number;
  liquidDensity: number;
  viscosity: number;
  plateArea: number;
  plateSpeed: number;
  gap: number;
  gradient: number;
  dragForce: number;

  ball: number;
  ballDensity: number;
  ballRadius: number;
  terminalVelocity: number;
  timeConstant: number;
  settleTime: number;
  t: number;
  fallSpeed: number;
  fallDepth: number;
  atBottom: number;
  weight: number;
  upthrust: number;
  stokesDrag: number;
  ballReynolds: number;
  stokesHolds: number;

  pipeSpeed: number;
  pipeDiameter: number;
  reynolds: number;
  regime: number;

  film: number;
  surfaceTension: number;
  shape: number;
  surfaces: number;
  dropRadius: number;
  excessPressure: number;
  tubeRadius: number;
  filmDensity: number;
  contactAngle: number;
  capillaryRise: number;
  climbs: number;

  clock: number;
};

const OUTPUTS = [
  "effort", "smallArea", "largeArea", "liftPressure", "liftForce", "advantage", "carWeight", "lifts", "stroke", "rise", "workIn", "workOut",
  "wideArea", "throatArea", "inletSpeed", "throatSpeed", "flowRate", "wideGauge", "throatGauge", "pressureDrop", "wideHead", "throatHead", "headDrop", "wideEnergy", "throatEnergy",
  "holeDepth", "holeHeight", "effluxSpeed", "jetRange",
  "liquid", "liquidDensity", "viscosity", "plateArea", "plateSpeed", "gap", "gradient", "dragForce",
  "ball", "ballDensity", "ballRadius", "terminalVelocity", "timeConstant", "settleTime", "t", "fallSpeed", "fallDepth", "atBottom", "weight", "upthrust", "stokesDrag", "ballReynolds", "stokesHolds",
  "pipeSpeed", "pipeDiameter", "reynolds", "regime",
  "film", "surfaceTension", "shape", "surfaces", "dropRadius", "excessPressure", "tubeRadius", "filmDensity", "contactAngle", "capillaryRise", "climbs",
  "clock",
] as const satisfies readonly (keyof FlowResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
/** Turn −0 (and anything within a whisker of 0) into a plain 0. */
const z = (v: number) => (Math.abs(v) < 1e-12 ? 0 : v);

/** The control ranges, which the model also enforces. */
export const FLOW_RANGES = {
  effort: [10, 500],
  smallArea: [1, 50],
  largeArea: [100, 2000],
  inletSpeed: [0.1, 1],
  throatArea: [2, 6],
  holeDepth: [0.05, 0.95],
  plateSpeed: [1, 50],
  gap: [1, 10],
  ballRadius: [0.5, 3],
  pipeSpeed: [0.01, 1],
  pipeDiameter: [2, 40],
  dropRadius: [0.5, 10],
  tubeRadius: [0.1, 2],
  stroke: [0, FLOW_MAX_STROKE],
  t: [0, 60],
} as const satisfies Record<string, readonly [number, number]>;

const range = (key: keyof typeof FLOW_RANGES, v: number) => clamp(v, FLOW_RANGES[key][0], FLOW_RANGES[key][1]);

/** v_t = 2r²(ρ − σ)g / 9η, all in SI units. */
export function flowTerminalVelocity(radius: number, ballDensity: number, liquidDensity: number, viscosity: number): number {
  return (2 * radius * radius * (ballDensity - liquidDensity) * FLOW_GRAVITY) / (9 * viscosity);
}

/** Re = ρvd/η. */
export function flowReynolds(density: number, speed: number, diameter: number, viscosity: number): number {
  return (density * speed * diameter) / viscosity;
}

/** 0 streamline (Re < 1000), 1 unsteady, 2 turbulent (Re > 2000). */
export function flowRegimeOf(reynolds: number): number {
  return reynolds < FLOW_LAMINAR_LIMIT ? 0 : reynolds > FLOW_TURBULENT_LIMIT ? 2 : 1;
}

/** Torricelli: v = √(2gh). */
export function flowEffluxSpeed(depth: number): number {
  return Math.sqrt(2 * FLOW_GRAVITY * Math.max(0, depth));
}

/** h = 2S cos θ / (ρgr), SI units, θ in degrees; negative is a fall. */
export function flowCapillaryRise(tension: number, contactDeg: number, density: number, radius: number): number {
  return (2 * tension * Math.cos((contactDeg * Math.PI) / 180)) / (density * FLOW_GRAVITY * radius);
}

const liquidOf = (p: FlowParams) => (FLOW_LIQUID_ORDER.includes(p.liquid) ? p.liquid : "glycerine");
const ballOf = (p: FlowParams) => (FLOW_BALL_ORDER.includes(p.ball) ? p.ball : "steel");
const filmOf = (p: FlowParams) => (FLOW_FILM_ORDER.includes(p.film) ? p.film : "water");
const shapeOf = (p: FlowParams) => (FLOW_SHAPE_ORDER.includes(p.shape) ? p.shape : "drop");

/** Where the ball is (m) and how fast it moves (m/s), t seconds after release. */
function fallAt(t: number, vt: number, tau: number): { speed: number; depth: number } {
  if (!(tau > 0) || !Number.isFinite(vt)) return { speed: 0, depth: 0 };
  const e = Math.exp(-t / tau);
  return { speed: vt * (1 - e), depth: vt * (t - tau * (1 - e)) };
}

export const flowModel: SimulationModel<FlowState, FlowParams, FlowResults> = {
  id: "flow",
  defaultParams: {
    effort: 100,
    smallArea: 10,
    largeArea: 500,
    inletSpeed: 0.4,
    throatArea: 3,
    holeDepth: 0.2,
    liquid: "glycerine",
    plateSpeed: 10,
    gap: 2,
    ball: "steel",
    ballRadius: 1,
    pipeSpeed: 0.05,
    pipeDiameter: 10,
    film: "water",
    shape: "drop",
    dropRadius: 1,
    tubeRadius: 0.5,
  },
  outputs: OUTPUTS,
  stateVariables: ["stroke", "t"],

  initialize() {
    return { stroke: 0, t: 0, clock: 0 };
  },

  /** Play pushes the small piston down, lets the ball fall, and keeps the fluids moving. */
  advance(state, dt) {
    return {
      stroke: range("stroke", state.stroke + FLOW_STROKE_RATE * dt),
      t: range("t", state.t + dt),
      clock: (state.clock + dt) % 600,
    };
  },

  /** A step pushes the piston a centimetre, and moves the fall on by a tenth of a second. */
  step(state, _params, sign) {
    return {
      ...state,
      stroke: range("stroke", Math.round(state.stroke) + sign),
      t: range("t", Math.round(state.t * 10) / 10 + 0.1 * sign),
    };
  },

  derive(state, params) {
    // Lift. Areas in cm², so the pressure picks up a factor 10⁴.
    const effort = range("effort", params.effort);
    const smallArea = range("smallArea", params.smallArea);
    const largeArea = range("largeArea", params.largeArea);
    const liftPressure = effort / (smallArea * 1e-4);
    const liftForce = liftPressure * largeArea * 1e-4;
    const carWeight = FLOW_CAR_MASS * FLOW_GRAVITY;
    const stroke = range("stroke", state.stroke);
    const rise = (stroke * smallArea) / largeArea;

    // Pipe.
    const rho = FLOW_WATER_DENSITY;
    const inletSpeed = range("inletSpeed", params.inletSpeed);
    const throatArea = range("throatArea", params.throatArea);
    const throatSpeed = (inletSpeed * FLOW_WIDE_AREA) / throatArea;
    const wideGauge = rho * FLOW_GRAVITY * FLOW_WIDE_HEAD;
    const pressureDrop = 0.5 * rho * (throatSpeed * throatSpeed - inletSpeed * inletSpeed);
    const throatGauge = wideGauge - pressureDrop;

    // Tank.
    const holeDepth = range("holeDepth", params.holeDepth);
    const holeHeight = FLOW_TANK_HEIGHT - holeDepth;
    const effluxSpeed = flowEffluxSpeed(holeDepth);

    // Shear.
    const liquidId = liquidOf(params);
    const liquid = FLOW_LIQUIDS[liquidId];
    const plateSpeed = range("plateSpeed", params.plateSpeed);
    const gap = range("gap", params.gap);
    const gradient = plateSpeed / 100 / (gap / 1000);

    // Fall.
    const ballId = ballOf(params);
    const ballDensity = FLOW_BALLS[ballId].density;
    const ballRadius = range("ballRadius", params.ballRadius);
    const r = ballRadius / 1000;
    const vt = flowTerminalVelocity(r, ballDensity, liquid.density, liquid.viscosity);
    const tau = (2 * ballDensity * r * r) / (9 * liquid.viscosity);
    const t = range("t", state.t);
    const reach = fallAt(t, vt, tau);
    const atBottom = reach.depth >= FLOW_COLUMN_DEPTH;
    // Once it is on the bottom it stops.
    const fallSpeed = atBottom ? 0 : reach.speed;
    const volume = (4 / 3) * Math.PI * r ** 3;
    const ballReynolds = flowReynolds(liquid.density, vt, 2 * r, liquid.viscosity);

    // Reynolds.
    const pipeSpeed = range("pipeSpeed", params.pipeSpeed);
    const pipeDiameter = range("pipeDiameter", params.pipeDiameter);
    const reynolds = flowReynolds(liquid.density, pipeSpeed, pipeDiameter / 1000, liquid.viscosity);

    // Drops and tubes.
    const filmId = filmOf(params);
    const film = FLOW_FILMS[filmId];
    const shapeId = shapeOf(params);
    const surfaces = shapeId === "bubble" ? 2 : 1;
    const dropRadius = range("dropRadius", params.dropRadius);
    const tubeRadius = range("tubeRadius", params.tubeRadius);
    const rise100 = flowCapillaryRise(film.tension, film.contact, film.density, tubeRadius / 1000) * 100;

    return {
      effort,
      smallArea,
      largeArea,
      liftPressure: liftPressure / 1000,
      liftForce,
      advantage: largeArea / smallArea,
      carWeight,
      lifts: liftForce >= carWeight - 1e-9 ? 1 : 0,
      stroke,
      rise,
      workIn: (effort * stroke) / 100,
      workOut: (liftForce * rise) / 100,

      wideArea: FLOW_WIDE_AREA,
      throatArea,
      inletSpeed,
      throatSpeed,
      flowRate: FLOW_WIDE_AREA * inletSpeed * 100,
      wideGauge,
      throatGauge,
      pressureDrop: z(pressureDrop),
      wideHead: FLOW_WIDE_HEAD * 100,
      throatHead: z((throatGauge / (rho * FLOW_GRAVITY)) * 100),
      headDrop: z((pressureDrop / (rho * FLOW_GRAVITY)) * 100),
      wideEnergy: wideGauge + 0.5 * rho * inletSpeed * inletSpeed,
      throatEnergy: throatGauge + 0.5 * rho * throatSpeed * throatSpeed,

      holeDepth,
      holeHeight,
      effluxSpeed,
      jetRange: 2 * Math.sqrt(holeDepth * holeHeight),

      liquid: FLOW_LIQUID_ORDER.indexOf(liquidId),
      liquidDensity: liquid.density,
      viscosity: liquid.viscosity,
      plateArea: FLOW_PLATE_AREA,
      plateSpeed,
      gap,
      gradient,
      dragForce: liquid.viscosity * FLOW_PLATE_AREA * gradient,

      ball: FLOW_BALL_ORDER.indexOf(ballId),
      ballDensity,
      ballRadius,
      terminalVelocity: vt * 100,
      timeConstant: tau * 1000,
      settleTime: tau * Math.log(100) * 1000,
      t,
      fallSpeed: z(fallSpeed * 100),
      fallDepth: z(Math.min(FLOW_COLUMN_DEPTH, reach.depth) * 100),
      atBottom: atBottom ? 1 : 0,
      weight: volume * ballDensity * FLOW_GRAVITY,
      upthrust: volume * liquid.density * FLOW_GRAVITY,
      stokesDrag: z(6 * Math.PI * liquid.viscosity * r * fallSpeed),
      ballReynolds,
      stokesHolds: ballReynolds < FLOW_STOKES_LIMIT ? 1 : 0,

      pipeSpeed,
      pipeDiameter,
      reynolds,
      regime: flowRegimeOf(reynolds),

      film: FLOW_FILM_ORDER.indexOf(filmId),
      surfaceTension: film.tension,
      shape: FLOW_SHAPE_ORDER.indexOf(shapeId),
      surfaces,
      dropRadius,
      excessPressure: (2 * surfaces * film.tension) / (dropRadius / 1000),
      tubeRadius,
      filmDensity: film.density,
      contactAngle: (film.contact * Math.PI) / 180,
      capillaryRise: z(rise100),
      climbs: rise100 > 0 ? 1 : 0,

      clock: Math.max(0, state.clock) || 0,
    };
  },

  getVariable(state, id) {
    return id === "stroke" ? state.stroke : id === "t" ? state.t : undefined;
  },

  setVariable(state, id, value) {
    if (id === "stroke") return { ...state, stroke: range("stroke", value) };
    if (id === "t") return { ...state, t: range("t", value) };
    return state;
  },
};
