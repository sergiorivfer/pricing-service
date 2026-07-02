import { computeQuote } from "./computeQuote";
import type { PriceBook, QuoteRequest } from "../types";

const defaultPB: PriceBook = {
  version: "1.0",
  setupCost: 40,
  applicationPerUnit: 3,
  baseCosts: { tshirt: 15, hoodie: 22, hat: 12 },
  zoneRates: { US: 2, default: 0 },
  profitVariable: [
    { min: 1, max: 24, value: 2.8 },
    { min: 25, max: 49, value: 2.4 },
    { min: 50, max: 99, value: 1.8 },
    { min: 100, max: 249, value: 1.4 },
    { min: 250, value: 1.2 },
  ],
};

function req(overrides?: Partial<QuoteRequest>): QuoteRequest {
  return {
    country: "US",
    postalCode: "90210",
    items: [
      {
        pricingCategory: "tshirt",
        quantity: 50,
        locations: 1,
        addOnPerUnit: 0,
      },
    ],
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  Smoke test                                                         */
/* ------------------------------------------------------------------ */

describe("computeQuote", () => {
  it("returns items, subtotal, and total", () => {
    const result = computeQuote(defaultPB, req());
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("subtotal");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(1);
  });

  it("subtotal === total (no tax)", () => {
    const result = computeQuote(defaultPB, req());
    expect(result.subtotal).toBe(result.total);
  });
});

/* ------------------------------------------------------------------ */
/*  Per-item breakdown                                                 */
/* ------------------------------------------------------------------ */

describe("breakdown fields", () => {
  it("includes all expected breakdown keys", () => {
    const result = computeQuote(defaultPB, req());
    const b = result.items[0].breakdown;

    expect(b).toHaveProperty("setupCost");
    expect(b).toHaveProperty("applicationPerUnit");
    expect(b).toHaveProperty("quantity");
    expect(b).toHaveProperty("baseCost");
    expect(b).toHaveProperty("volumeVariable");
    expect(b).toHaveProperty("locations");
    expect(b).toHaveProperty("extraLocationsBlock");
    expect(b).toHaveProperty("postalRatePct");
    expect(b).toHaveProperty("postalMultiplier");
    expect(b).toHaveProperty("prePostalTotal");
    expect(b).toHaveProperty("addOnPerUnit");
    expect(b).toHaveProperty("addOnTotal");
  });

  it("uses the correct volume tier (50 → tier 50‑99 value=1.8)", () => {
    const r = computeQuote(defaultPB, req({ items: [{ pricingCategory: "tshirt", quantity: 50, locations: 1, addOnPerUnit: 0 }] }));
    expect(r.items[0].breakdown.volumeVariable).toBe(1.8);
  });

  it("uses the first tier for qty=10", () => {
    const r = computeQuote(defaultPB, req({ items: [{ pricingCategory: "tshirt", quantity: 10, locations: 1, addOnPerUnit: 0 }] }));
    expect(r.items[0].breakdown.volumeVariable).toBe(2.8);
  });

  it("uses last tier for qty=500", () => {
    const r = computeQuote(defaultPB, req({ items: [{ pricingCategory: "tshirt", quantity: 500, locations: 1, addOnPerUnit: 0 }] }));
    expect(r.items[0].breakdown.volumeVariable).toBe(1.2);
  });
});

/* ------------------------------------------------------------------ */
/*  Zone / postal                                                      */
/* ------------------------------------------------------------------ */

describe("zone rates", () => {
  it("applies US zone multiplier (2% → 1.02)", () => {
    const r = computeQuote(defaultPB, req({ country: "US", postalCode: "90210" }));
    expect(r.items[0].breakdown.postalMultiplier).toBe(1.02);
    expect(r.items[0].breakdown.postalRatePct).toBe(2);
  });

  it("uses zoneRates[firstLetter] for Canadian postal codes", () => {
    const pb = { ...defaultPB, zoneRates: { K: 5, default: 0 } };
    const r = computeQuote(pb, req({ country: "CA", postalCode: "K1A 0B1" }));
    expect(r.items[0].breakdown.postalRatePct).toBe(5);
  });

  it("falls back to 0 % when zoneRates is empty", () => {
    const pb = { ...defaultPB, zoneRates: {} };
    const r = computeQuote(pb, req({ country: "US", postalCode: "90210" }));
    expect(r.items[0].breakdown.postalMultiplier).toBe(1);
    expect(r.items[0].breakdown.postalRatePct).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  Multiple locations                                                 */
/* ------------------------------------------------------------------ */

describe("multiple locations", () => {
  it("extraLocationsBlock > 0 when locations > 1", () => {
    const r = computeQuote(defaultPB, req({ items: [{ pricingCategory: "tshirt", quantity: 50, locations: 3, addOnPerUnit: 0 }] }));
    expect(r.items[0].breakdown.locations).toBe(3);
    expect(r.items[0].breakdown.extraLocationsBlock).toBeGreaterThan(0);
  });

  it("no extra block for single location", () => {
    const r = computeQuote(defaultPB, req({ items: [{ pricingCategory: "tshirt", quantity: 50, locations: 1, addOnPerUnit: 0 }] }));
    expect(r.items[0].breakdown.extraLocationsBlock).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  Technique                                                          */
/* ------------------------------------------------------------------ */

describe("technique deltas", () => {
  it("applies technique setupDelta and perUnitDelta", () => {
    const pb: PriceBook = {
      ...defaultPB,
      techniqueRules: {
        embroidery: { setupDelta: 20, perUnitDelta: 2 },
      },
    };
    const r = computeQuote(pb, req({ items: [{ pricingCategory: "hat", technique: "embroidery", quantity: 50, locations: 1, addOnPerUnit: 0 }] }));
    expect(r.items[0].breakdown.setupCost).toBe(60); // 40 + 20
    expect(r.items[0].breakdown.applicationPerUnit).toBe(5); // 3 + 2
  });

  it("defaults to base values when technique has no rules", () => {
    const r = computeQuote(defaultPB, req({ items: [{ pricingCategory: "tshirt", quantity: 50, locations: 1, addOnPerUnit: 0 }] }));
    expect(r.items[0].breakdown.setupCost).toBe(40);
    expect(r.items[0].breakdown.applicationPerUnit).toBe(3);
  });
});

/* ------------------------------------------------------------------ */
/*  Add‑on                                                             */
/* ------------------------------------------------------------------ */

describe("add-ons", () => {
  it("reflects addOnPerUnit in breakdown", () => {
    const r = computeQuote(defaultPB, req({ items: [{ pricingCategory: "tshirt", quantity: 50, locations: 1, addOnPerUnit: 2.5 }] }));
    expect(r.items[0].breakdown.addOnPerUnit).toBe(2.5);
    expect(r.items[0].breakdown.addOnTotal).toBe(125); // 2.5 × 50
  });
});

/* ------------------------------------------------------------------ */
/*  basePriceOverride                                                  */
/* ------------------------------------------------------------------ */

describe("basePriceOverride", () => {
  it("overrides the category base cost", () => {
    const r = computeQuote(defaultPB, req({ items: [{ pricingCategory: "tshirt", quantity: 50, locations: 1, addOnPerUnit: 0, basePriceOverride: 20 }] }));
    expect(r.items[0].breakdown.baseCost).toBe(20);
  });
});

/* ------------------------------------------------------------------ */
/*  Multiple items                                                     */
/* ------------------------------------------------------------------ */

describe("multiple items", () => {
  it("sums all item groupTotals into subtotal", () => {
    const r = computeQuote(defaultPB, {
      country: "US",
      postalCode: "90210",
      items: [
        { pricingCategory: "tshirt", quantity: 50, locations: 1, addOnPerUnit: 0 },
        { pricingCategory: "hoodie", quantity: 25, locations: 2, addOnPerUnit: 1 },
      ],
    });
    expect(r.items.length).toBe(2);
    const expectedSubtotal = +r.items
      .reduce((s, i) => s + i.groupTotal, 0)
      .toFixed(2);
    expect(r.subtotal).toBe(expectedSubtotal);
  });

  it("carries lineId through", () => {
    const r = computeQuote(defaultPB, req({ items: [{ pricingCategory: "tshirt", lineId: "line-1", quantity: 50, locations: 1, addOnPerUnit: 0 }] }));
    expect(r.items[0].lineId).toBe("line-1");
  });
});

/* ------------------------------------------------------------------ */
/*  Edge cases                                                         */
/* ------------------------------------------------------------------ */

describe("edge cases", () => {
  it("handles quantity = 1", () => {
    const r = computeQuote(defaultPB, req({ items: [{ pricingCategory: "tshirt", quantity: 1, locations: 1, addOnPerUnit: 0 }] }));
    expect(r.items[0].unitPrice).toBeGreaterThan(0);
    expect(r.items[0].breakdown.quantity).toBe(1);
  });

  it("clamps quantity to ≥ 1", () => {
    const r = computeQuote(defaultPB, req({ items: [{ pricingCategory: "tshirt", quantity: 0, locations: 1, addOnPerUnit: 0 }] }));
    expect(r.items[0].breakdown.quantity).toBe(1);
  });

  it("clamps locations to ≥ 1", () => {
    const r = computeQuote(defaultPB, req({ items: [{ pricingCategory: "tshirt", quantity: 50, locations: 0, addOnPerUnit: 0 }] }));
    expect(r.items[0].breakdown.locations).toBe(1);
  });
});
