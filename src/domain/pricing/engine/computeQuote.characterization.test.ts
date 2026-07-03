import { computeQuote } from "./computeQuote";
import type { PriceBook } from "../types";

const pb: PriceBook = {
  version: "test.v1",
  setupCost: 40,
  applicationPerUnit: 3,
  baseCosts: { tshirt: 6, hoodie: 14, hat: 10 },
  zoneRates: { M: 0, V: 0, P: 0, E: 2, R: 2, default: 0, US: 0 },
  profitVariable: [
    { max: 49, value: 2.0 },
    { min: 50, max: 99, value: 1.9 },
    { min: 100, value: 1.8 },
  ],
  techniqueRules: {},
};

test("computeQuote calculates totals and unit price", () => {
  const res = computeQuote(pb, {
    country: "CA",
    postalCode: "E1A1A1", // E => 2%
    items: [
      {
        lineId: "line-1",
        pricingCategory: "tshirt",
        quantity: 10,
        locations: 2,
        addOnPerUnit: 1,
        technique: "screenprint",
      },
    ],
  });

  expect(res.items).toHaveLength(1);
  expect(res.subtotal).toBeGreaterThan(0);
  expect(res.items[0].unitPrice).toBeGreaterThan(0);
  expect(res.items[0].breakdown.postalRatePct).toBe(2);
  expect(res.subtotal).toBeCloseTo(275.4);
  expect(res.total).toBeCloseTo(275.4);
  expect(res.items[0].unitPrice).toBeCloseTo(27.54);
});
