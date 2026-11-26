import { describe, expect, it } from "vitest";
import {
  STATIC_ITEM_ORDER,
  STATIC_PARTNER_ORDER,
  STATIC_PLACE_ORDER,
  staticInteraction,
  staticSchoolModel as model,
  staticStormDistance,
  type StaticSchoolParams,
} from "./staticschool";

const P = model.defaultParams;
const derive = (over: Partial<StaticSchoolParams> = {}, stormTime = 0) => model.derive({ stormTime }, { ...P, ...over });

describe("charging by rubbing", () => {
  it("moves the same charge onto the item and, the other kind, onto its cloth", () => {
    const r = derive({ item: "balloon", rubs: 9 });
    expect(r).toMatchObject({ chargeMoved: 18, itemCharge: -18, clothCharge: 18, itemSign: -1, charged: 1 });
    expect(derive({ item: "glass", rubs: 5 })).toMatchObject({ itemCharge: 10, clothCharge: -10, itemSign: 1 });
    expect(derive({ item: "refill", rubs: 5 }).itemSign).toBe(1);
    expect(derive({ item: "comb", rubs: 5 }).itemSign).toBe(-1);
  });

  it("leaves nothing on a steel spoon held in the hand", () => {
    expect(derive({ item: "spoon", rubs: 20 })).toMatchObject({ chargeMoved: 40, itemCharge: 0, charged: 0, leaks: 1, paperBits: 0 });
    expect(derive({ item: "balloon", rubs: 0 })).toMatchObject({ itemCharge: 0, itemSign: 0, charged: 0, paperBits: 0 });
    expect(Object.is(derive({ item: "balloon", rubs: 0 }).itemCharge, -0)).toBe(false);
  });

  it("picks up more paper for more rubs, one bit for every 4 units, up to 10", () => {
    expect([1, 2, 4, 9, 12, 20].map((rubs) => derive({ rubs }).paperBits)).toEqual([0, 1, 2, 4, 6, 10]);
  });
});

describe("like and unlike charges", () => {
  it("repel when alike, attract when unlike, and pull an uncharged thing", () => {
    expect(derive({ item: "balloon", partner: "balloon" }).interaction).toBe(-1);
    expect(derive({ item: "refill", partner: "refill" }).interaction).toBe(-1);
    expect(derive({ item: "balloon", partner: "refill" }).interaction).toBe(1);
    expect(derive({ item: "glass", partner: "balloon" }).interaction).toBe(1);
    expect(derive({ item: "comb", partner: "balloon" }).interaction).toBe(-1);
    expect(derive({ item: "balloon", partner: "paper" }).interaction).toBe(1);
    expect(derive({ item: "spoon", partner: "paper" }).interaction).toBe(0);
    expect(staticInteraction(0, 0)).toBe(0);
    expect(staticInteraction(0, -1)).toBe(1);
  });
});

describe("the electroscope", () => {
  it("opens 4° for each unit passed to the strips, and closes when earthed", () => {
    expect(derive({ item: "refill", rubs: 10 })).toMatchObject({ foilCharge: 10, foilSpread: 40, foilOpen: 1, foilSign: 1 });
    expect(derive({ item: "balloon", rubs: 12 })).toMatchObject({ foilSpread: 48, foilSign: -1 });
    expect(derive({ rubs: 20 }).foilSpread).toBe(80);
    expect(derive({ rubs: 15, earthed: "yes" })).toMatchObject({ foilCharge: 0, foilSpread: 0, foilOpen: 0, foilSign: 0 });
    expect(derive({ item: "spoon", rubs: 20 }).foilOpen).toBe(0);
  });
});

describe("the storm", () => {
  it("flashes each time 100 units build up", () => {
    expect(derive({ stormStrength: 4 }, 24)).toMatchObject({ flashes: 0, cloudCharge: 96, strikeResult: 0, sparkNow: 0 });
    expect(derive({ stormStrength: 4 }, 25)).toMatchObject({ flashes: 1, cloudCharge: 0, sparkNow: 1 });
    expect(derive({ stormStrength: 2 }, 60).flashes).toBe(1);
    expect(derive({ stormStrength: 6 }, 60).flashes).toBe(3);
    expect(derive({ stormStrength: 7 }, 100 / 7).flashes).toBe(1);
  });

  it("sends the strike down a conductor, or into the building without one", () => {
    expect(derive({ conductor: "yes", stormStrength: 4 }, 60).strikeResult).toBe(2);
    expect(derive({ conductor: "no", stormStrength: 4 }, 60).strikeResult).toBe(1);
  });

  it("puts the flash 0.343 km away for every second before the thunder", () => {
    expect(staticStormDistance(15)).toBeCloseTo(5.145, 12);
    expect(derive({ thunderDelay: 30 }).stormDistance).toBeCloseTo(10.29, 12);
    expect(derive({ thunderDelay: 29 }).stormDistance).toBeLessThan(10);
  });

  it("plays and steps the storm clock inside its range", () => {
    expect(model.advance({ stormTime: 119 }, 5, P).stormTime).toBe(120);
    expect(model.step({ stormTime: 12 }, P, 1).stormTime).toBe(15);
    expect(model.step({ stormTime: 0 }, P, -1).stormTime).toBe(0);
    expect(model.setVariable({ stormTime: 0 }, "stormTime", 500, P).stormTime).toBe(120);
    expect(model.setVariable({ stormTime: 0 }, "stormTime", -3, P).stormTime).toBe(0);
  });
});

describe("safety in a thunderstorm", () => {
  it("follows NCERT's list", () => {
    const safety = (place: StaticSchoolParams["place"]) => derive({ place }).safety;
    for (const place of ["house", "car", "mobile"] as const) expect(safety(place), place).toBe(2);
    expect(safety("crouch")).toBe(1);
    for (const place of ["field", "tree", "bike", "umbrella", "water", "wiredPhone"] as const) expect(safety(place), place).toBe(0);
  });
});

describe("every output", () => {
  it("is a finite number in every scene", () => {
    for (const item of STATIC_ITEM_ORDER)
      for (const partner of STATIC_PARTNER_ORDER)
        for (const place of STATIC_PLACE_ORDER) {
          const r = derive({ item, partner, place, rubs: 7, earthed: "no", conductor: "no" }, 77);
          for (const key of model.outputs) expect(Number.isFinite(r[key]), `${item} ${partner} ${place} ${key}`).toBe(true);
        }
    const wild = model.derive({ stormTime: Number.NaN }, { ...P, rubs: Number.NaN, stormStrength: Infinity, thunderDelay: -5 });
    for (const key of model.outputs) expect(Number.isFinite(wild[key]), key).toBe(true);
  });
});
