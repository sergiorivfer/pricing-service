/**
 * Smoke tests for the legacy engine.
 *
 * The legacy engine is deprecated in favour of computeQuote,
 * so these tests only verify it still produces sensible output
 * with the built-in default pricing config.
 */

import { quoteEngine } from "./engine";

describe("quoteEngine (legacy)", () => {
  it("returns results for a basic request", () => {
    const result = quoteEngine({
      postal: "90210",
      items: [
        {
          productId: "p1",
          pricingCategory: "tshirt",
          technique: "screenprint",
          quantity: 50,
          printAreas: 1,
        },
      ],
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].productId).toBe("p1");
    expect(result.items[0].unitPrice).toBeGreaterThan(0);
    expect(result.subtotal).toBeGreaterThan(0);
    expect(result.total).toBe(result.subtotal);
  });

  it("applies CA postal zone rates", () => {
    const r = quoteEngine({
      postal: "M5A 1A1",
      items: [
        {
          productId: "p1",
          pricingCategory: "hoodie",
          technique: "screenprint",
          quantity: 100,
          printAreas: 2,
        },
      ],
    });

    expect(r.items[0].unitPrice).toBeGreaterThan(0);
  });

  it("produces increasing totals for more areas", () => {
    const oneArea = quoteEngine({
      postal: "10001",
      items: [
        {
          productId: "p1",
          pricingCategory: "tshirt",
          technique: "screenprint",
          quantity: 24,
          printAreas: 1,
        },
      ],
    });

    const twoAreas = quoteEngine({
      postal: "10001",
      items: [
        {
          productId: "p1",
          pricingCategory: "tshirt",
          technique: "screenprint",
          quantity: 24,
          printAreas: 2,
        },
      ],
    });

    expect(twoAreas.total).toBeGreaterThan(oneArea.total);
  });
});
