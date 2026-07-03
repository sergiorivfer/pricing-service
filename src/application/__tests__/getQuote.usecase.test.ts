import { getQuote } from "../getQuote.usecase";
import { FakePriceBookRepository } from "../repositories/FakePriceBookRepository";
import type { PriceBook, QuoteRequest } from "../../domain/pricing/types";

/* ------------------------------------------------------------------ */
/*  Shared test data — anchored to the characterization values         */
/* ------------------------------------------------------------------ */

const testPriceBook: PriceBook = {
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

const testRequest: QuoteRequest = {
  country: "CA",
  postalCode: "E1A1A1",
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
};

/* ------------------------------------------------------------------ */
/*  Success path                                                       */
/* ------------------------------------------------------------------ */

describe("getQuote — success", () => {
  it("returns ok=true with a quote when a price book exists", async () => {
    const repo = new FakePriceBookRepository(testPriceBook);
    const result = await getQuote(testRequest, repo);

    expect(result.ok).toBe(true);
    if (!result.ok) return; // type guard

    expect(result.quote.items).toHaveLength(1);
    expect(result.quote.subtotal).toBeGreaterThan(0);
    expect(result.quote.total).toBeGreaterThan(0);
  });

  it("produces the anchored characterization values (275.4 / 27.54)", async () => {
    const repo = new FakePriceBookRepository(testPriceBook);
    const result = await getQuote(testRequest, repo);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.quote.subtotal).toBeCloseTo(275.4);
    expect(result.quote.total).toBeCloseTo(275.4);
    expect(result.quote.items[0].unitPrice).toBeCloseTo(27.54);
  });

  it("surfaces the priceBookVersion", async () => {
    const repo = new FakePriceBookRepository(testPriceBook);
    const result = await getQuote(testRequest, repo);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.priceBookVersion).toBe("test.v1");
  });
});

/* ------------------------------------------------------------------ */
/*  Failure path                                                       */
/* ------------------------------------------------------------------ */

describe("getQuote — no price book", () => {
  it("returns ok=false with error 'no_pricebook' when repo returns null", async () => {
    const repo = new FakePriceBookRepository(null);
    const result = await getQuote(testRequest, repo);

    expect(result.ok).toBe(false);
    if (result.ok) return; // type guard (never)

    expect(result.error).toBe("no_pricebook");
  });
});
