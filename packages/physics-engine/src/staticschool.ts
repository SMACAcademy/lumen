import type { SimulationModel } from "@ise/science-engine";

/**
 * Charges and lightning, for class 8 (NCERT "Some Natural Phenomena"), in
 * five small scenes.
 *
 * Rub: rubbing two things together moves charge from one to the other. One
 * ends up negative and the other positive, by the same amount. A balloon
 * rubbed with wool becomes negative; a glass rod rubbed with silk becomes
 * positive (that is the old convention that names the two kinds); a plastic
 * comb run through dry hair becomes negative; a pen refill rubbed with
 * polythene becomes positive. A steel spoon held in the hand does not stay
 * charged: metal lets the charge flow away through the hand to the earth. A
 * charged thing picks up small bits of paper.
 *
 * Pair: like charges repel and unlike charges attract. A charged thing also
 * pulls an uncharged light thing, such as a bit of paper.
 *
 * Electroscope: touch a charged thing to the paper clip of a jar electroscope
 * and charge passes to its two thin foil strips. Both strips get the same
 * kind of charge, so they push apart; more charge, wider apart. Touch the
 * clip with your hand and the charge flows through you to the earth
 * (earthing), and the strips close.
 *
 * Storm: in a thunderstorm, moving air and water drops separate charge. The
 * bottom of the cloud gathers negative charge and the ground below gathers
 * positive charge. When there is too much for the air to hold apart, a giant
 * spark jumps: lightning, with thunder as its sound. A lightning conductor,
 * a metal rod taller than the building and joined to a plate deep in the
 * ground, gives the charge an easy path to the earth. Light arrives almost
 * at once but sound travels about 343 m each second, so each second between
 * the flash and the thunder puts the storm about 0.343 km farther away.
 *
 * Safety: NCERT's list of safe and unsafe places in a thunderstorm.
 *
 * Simplifications, said plainly: charge is counted in simple units, not
 * coulombs; each rub moves 2 units; the charged thing picks up one bit of
 * paper for every 4 units, up to 10 bits; touching the electroscope passes
 * half the charge to the strips, which open 4° for every unit, up to 80°;
 * the cloud flashes each time 100 units have built up and the flash empties
 * it; a lightning conductor catches every flash.
 */

/** Units of charge moved by one rub. */
export const STATIC_CHARGE_PER_RUB = 2;
/** Units of charge needed for each bit of paper picked up. */
export const STATIC_CHARGE_PER_BIT = 4;
/** Bits of paper on the table. */
export const STATIC_PAPER_BITS = 10;
/** Share of the charge that passes to the electroscope's strips when touched. */
export const STATIC_FOIL_SHARE = 0.5;
/** How far the strips open for each unit of charge on them, degrees. */
export const STATIC_DEG_PER_UNIT = 4;
export const STATIC_MAX_SPREAD = 80;
/** Charge the cloud builds up before it flashes, units. */
export const STATIC_FLASH_CHARGE = 100;
/** Speed of sound in air at about 20 °C, m/s. */
export const STATIC_SOUND_SPEED = 343;

export const STATIC_MAX_RUBS = 20;
export const STATIC_MAX_STORM_TIME = 120;
export const STATIC_MIN_STORM_STRENGTH = 1;
export const STATIC_MAX_STORM_STRENGTH = 10;
export const STATIC_MAX_THUNDER_DELAY = 60;

export type StaticItem = "balloon" | "refill" | "glass" | "comb" | "spoon";
export type StaticPartner = "balloon" | "refill" | "glass" | "comb" | "paper";
export type StaticPlace = "house" | "car" | "crouch" | "field" | "tree" | "bike" | "umbrella" | "water" | "wiredPhone" | "mobile";

export const STATIC_ITEM_ORDER: readonly StaticItem[] = ["balloon", "refill", "glass", "comb", "spoon"];
export const STATIC_PARTNER_ORDER: readonly StaticPartner[] = ["balloon", "refill", "glass", "comb", "paper"];
export const STATIC_PLACE_ORDER: readonly StaticPlace[] = ["house", "car", "crouch", "field", "tree", "bike", "umbrella", "water", "wiredPhone", "mobile"];

/** What is rubbed, what it is rubbed with, and which kind of charge it gets. */
export const STATIC_ITEMS: Record<StaticItem, { label: string; cloth: string; sign: 1 | -1; leaks: boolean }> = {
  balloon: { label: "Balloon", cloth: "wool", sign: -1, leaks: false },
  refill: { label: "Pen refill", cloth: "polythene", sign: 1, leaks: false },
  glass: { label: "Glass rod", cloth: "silk", sign: 1, leaks: false },
  comb: { label: "Plastic comb", cloth: "dry hair", sign: -1, leaks: false },
  spoon: { label: "Steel spoon", cloth: "polythene", sign: 1, leaks: true },
};

/** The thing hung up beside it: each charged one has been rubbed as above. */
export const STATIC_PARTNERS: Record<StaticPartner, { label: string; sign: -1 | 0 | 1 }> = {
  balloon: { label: "Balloon rubbed with wool", sign: -1 },
  refill: { label: "Refill rubbed with polythene", sign: 1 },
  glass: { label: "Glass rod rubbed with silk", sign: 1 },
  comb: { label: "Comb run through dry hair", sign: -1 },
  paper: { label: "Bit of paper (uncharged)", sign: 0 },
};

/** 2 safe, 1 safer than standing but not safe, 0 not safe. */
export const STATIC_PLACES: Record<StaticPlace, { label: string; safety: 0 | 1 | 2; reason: string }> = {
  house: { label: "Inside a house", safety: 2, reason: "A house or building is a safe place" },
  car: { label: "In a car or bus, windows shut", safety: 2, reason: "Stay inside with the doors and windows shut" },
  crouch: { label: "Squatting low in an open field", safety: 1, reason: "Smallest target, if there is no shelter" },
  field: { label: "Standing in an open field", safety: 0, reason: "You are the tallest thing around" },
  tree: { label: "Under a tall tree", safety: 0, reason: "Lightning often strikes tall trees" },
  bike: { label: "On an open motorbike", safety: 0, reason: "Open vehicles give no protection" },
  umbrella: { label: "Under an umbrella", safety: 0, reason: "An umbrella is not a good idea" },
  water: { label: "Swimming or bathing", safety: 0, reason: "Keep away from water" },
  wiredPhone: { label: "On a wired phone", safety: 0, reason: "Keep away from cords, wires and pipes" },
  mobile: { label: "On a mobile phone indoors", safety: 2, reason: "Mobile and cordless phones are fine" },
};

export type StaticSchoolParams = {
  item: StaticItem;
  /** Times the item is rubbed. */
  rubs: number;
  partner: StaticPartner;
  /** Whether a hand touches the electroscope's clip. */
  earthed: "no" | "yes";
  /** Charge the storm builds up in the cloud each second, units. */
  stormStrength: number;
  conductor: "yes" | "no";
  /** Seconds from a flash to its thunder. */
  thunderDelay: number;
  place: StaticPlace;
};

export interface StaticSchoolState {
  /** Seconds since the storm began. */
  readonly stormTime: number;
}

export type StaticSchoolResults = {
  item: number;
  rubs: number;
  /** Units of charge moved from one to the other. */
  chargeMoved: number;
  /** Charge left on the item, units (+ or −). */
  itemCharge: number;
  /** Charge on what it was rubbed with, units. */
  clothCharge: number;
  /** −1 negative, 0 uncharged, +1 positive. */
  itemSign: number;
  charged: number;
  /** 1 when the item is metal held in the hand, so its charge flows away. */
  leaks: number;
  paperBits: number;
  partner: number;
  partnerSign: number;
  /** +1 attract, −1 repel, 0 nothing happens. */
  interaction: number;
  earthed: number;
  /** Charge on the electroscope's strips, units (how much, either kind). */
  foilCharge: number;
  foilSign: number;
  /** Angle between the two strips, degrees. */
  foilSpread: number;
  foilOpen: number;
  stormTime: number;
  stormStrength: number;
  /** Charge built up in the cloud since the last flash, units. */
  cloudCharge: number;
  flashes: number;
  /** 1 within a second of a flash. */
  sparkNow: number;
  conductor: number;
  /** 0 no strike yet, 1 struck the building, 2 ran down the conductor to the earth. */
  strikeResult: number;
  thunderDelay: number;
  /** How far away the flash was, km. */
  stormDistance: number;
  place: number;
  /** 2 safe, 1 safer but not safe, 0 not safe. */
  safety: number;
};

const finite = (x: number, fallback = 0) => (Number.isFinite(x) ? x : fallback);
const clampTo = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, finite(x, lo)));
const whole = (x: number, lo: number, hi: number) => Math.round(clampTo(x, lo, hi));
const clean = (x: number) => (Math.abs(x) < 1e-9 ? 0 : x) || 0;
const clampTime = (t: number) => clampTo(t, 0, STATIC_MAX_STORM_TIME);

/** Charge on the item and on its cloth after some rubs, units. */
export function staticRub(item: StaticItem, rubs: number) {
  const info = STATIC_ITEMS[item] ?? STATIC_ITEMS.balloon;
  const moved = STATIC_CHARGE_PER_RUB * whole(rubs, 0, STATIC_MAX_RUBS);
  return {
    moved,
    item: clean(info.leaks ? 0 : info.sign * moved),
    cloth: clean(-info.sign * moved),
  };
}

/** Bits of paper a charge of this size picks up. */
export function staticPaperBits(charge: number): number {
  return Math.min(STATIC_PAPER_BITS, Math.floor(Math.abs(finite(charge)) / STATIC_CHARGE_PER_BIT + 1e-9));
}

/** +1 attract, −1 repel, 0 nothing, for two things with these kinds of charge. */
export function staticInteraction(a: number, b: number): number {
  const sa = Math.sign(a);
  const sb = Math.sign(b);
  if (sa === 0 && sb === 0) return 0;
  if (sa === 0 || sb === 0) return 1;
  return sa === sb ? -1 : 1;
}

/** Angle between the electroscope's strips, degrees, for this much charge on them. */
export function staticFoilSpread(charge: number): number {
  return Math.min(STATIC_MAX_SPREAD, STATIC_DEG_PER_UNIT * Math.abs(finite(charge)));
}

/** Flashes so far and the charge left in the cloud. */
export function staticStorm(strength: number, seconds: number) {
  const built = clampTo(strength, STATIC_MIN_STORM_STRENGTH, STATIC_MAX_STORM_STRENGTH) * clampTime(seconds);
  const flashes = Math.floor(built / STATIC_FLASH_CHARGE + 1e-9);
  return { built, flashes, cloud: clean(Math.max(0, built - flashes * STATIC_FLASH_CHARGE)) };
}

/** How far away a flash is, km, from the seconds before its thunder. */
export function staticStormDistance(delay: number): number {
  return (STATIC_SOUND_SPEED * clampTo(delay, 0, STATIC_MAX_THUNDER_DELAY)) / 1000;
}

const OUTPUTS = [
  "item", "rubs", "chargeMoved", "itemCharge", "clothCharge", "itemSign", "charged", "leaks", "paperBits",
  "partner", "partnerSign", "interaction",
  "earthed", "foilCharge", "foilSign", "foilSpread", "foilOpen",
  "stormTime", "stormStrength", "cloudCharge", "flashes", "sparkNow", "conductor", "strikeResult", "thunderDelay", "stormDistance",
  "place", "safety",
] as const satisfies readonly (keyof StaticSchoolResults)[];

export const staticSchoolModel: SimulationModel<StaticSchoolState, StaticSchoolParams, StaticSchoolResults> = {
  id: "staticschool",
  defaultParams: {
    item: "balloon",
    rubs: 8,
    partner: "balloon",
    earthed: "no",
    stormStrength: 4,
    conductor: "yes",
    thunderDelay: 15,
    place: "house",
  },
  outputs: OUTPUTS,
  stateVariables: ["stormTime"],

  initialize() {
    return { stormTime: 0 };
  },

  /** Play: the storm builds up charge. */
  advance(state, dt) {
    if (!(dt > 0)) return state;
    return { stormTime: clampTime(state.stormTime + dt) };
  },

  step(state, _params, sign) {
    return { stormTime: clampTime(Math.round(finite(state.stormTime) / 5) * 5 + 5 * sign) };
  },

  derive(state, params) {
    const itemId: StaticItem = STATIC_ITEMS[params.item] ? params.item : "balloon";
    const partnerId: StaticPartner = STATIC_PARTNERS[params.partner] ? params.partner : "balloon";
    const placeId: StaticPlace = STATIC_PLACES[params.place] ? params.place : "house";
    const info = STATIC_ITEMS[itemId];
    const rubs = whole(params.rubs, 0, STATIC_MAX_RUBS);
    const rub = staticRub(itemId, rubs);
    const itemSign = Math.sign(rub.item) || 0;
    const partnerSign = STATIC_PARTNERS[partnerId].sign;

    const earthed = params.earthed === "yes";
    const foilCharge = earthed ? 0 : Math.abs(rub.item) * STATIC_FOIL_SHARE;
    const foilSpread = staticFoilSpread(foilCharge);

    const stormStrength = clampTo(params.stormStrength, STATIC_MIN_STORM_STRENGTH, STATIC_MAX_STORM_STRENGTH);
    const stormTime = clampTime(state.stormTime);
    const storm = staticStorm(stormStrength, stormTime);
    const conductor = params.conductor !== "no";
    const thunderDelay = clampTo(params.thunderDelay, 0, STATIC_MAX_THUNDER_DELAY);

    return {
      item: Math.max(0, STATIC_ITEM_ORDER.indexOf(itemId)),
      rubs,
      chargeMoved: rub.moved,
      itemCharge: rub.item,
      clothCharge: rub.cloth,
      itemSign,
      charged: itemSign === 0 ? 0 : 1,
      leaks: info.leaks ? 1 : 0,
      paperBits: staticPaperBits(rub.item),
      partner: Math.max(0, STATIC_PARTNER_ORDER.indexOf(partnerId)),
      partnerSign,
      interaction: staticInteraction(rub.item, partnerSign),
      earthed: earthed ? 1 : 0,
      foilCharge,
      foilSign: foilCharge > 0 ? itemSign : 0,
      foilSpread,
      foilOpen: foilSpread > 0 ? 1 : 0,
      stormTime,
      stormStrength,
      cloudCharge: storm.cloud,
      flashes: storm.flashes,
      sparkNow: storm.flashes > 0 && storm.cloud < stormStrength ? 1 : 0,
      conductor: conductor ? 1 : 0,
      strikeResult: storm.flashes === 0 ? 0 : conductor ? 2 : 1,
      thunderDelay,
      stormDistance: staticStormDistance(thunderDelay),
      place: Math.max(0, STATIC_PLACE_ORDER.indexOf(placeId)),
      safety: STATIC_PLACES[placeId].safety,
    };
  },

  getVariable(state, id) {
    return id === "stormTime" ? state.stormTime : undefined;
  },

  setVariable(state, id, value) {
    if (id === "stormTime") return { stormTime: clampTime(value) };
    return state;
  },
};
