import Fastify, { FastifyInstance } from "fastify";
import type { PriceBook, QuoteLineInput } from "../../../domain/pricing/types";
import type { PriceBookRepository } from "../../../application/ports/PriceBookRepository";
import { quoteRoute } from "./quote.route";

/* ---------- helpers ---------- */

function createFakePriceBook(overrides?: Partial<PriceBook>): PriceBook {
  return {
    version: "v1",
    setupCost: 40,
    applicationPerUnit: 3,
    baseCosts: { tshirt: 8, hoodie: 12, hat: 6 },
    zoneRates: { US: 0, default: 0 },
    profitVariable: [
      { min: 1, max: 50, value: 2 },
      { min: 51, max: 200, value: 1.5 },
      { min: 201, value: 1.2 },
    ],
    ...overrides,
  };
}

class FakePriceBookRepository implements PriceBookRepository {
  constructor(private readonly priceBook: PriceBook | null) {}

  async getActivePriceBook(): Promise<PriceBook | null> {
    return this.priceBook;
  }
}

function validItem(overrides?: Partial<QuoteLineInput>): QuoteLineInput {
  return {
    pricingCategory: "tshirt",
    quantity: 10,
    locations: 1,
    addOnPerUnit: 0,
    ...overrides,
  };
}

/* ---------- setup ---------- */

let app: FastifyInstance;

async function buildApp(repo: PriceBookRepository): Promise<FastifyInstance> {
  const instance = Fastify();
  await instance.register(quoteRoute, {
    prefix: "/api/v1",
    priceBookRepository: repo,
  });
  await instance.ready();
  return instance;
}

afterEach(async () => {
  if (app) await app.close();
});

/* ---------- happy path ---------- */

describe("POST /api/v1/quote", () => {
  it("returns 200 with quote for a valid request (US, no postal)", async () => {
    const repo = new FakePriceBookRepository(createFakePriceBook());
    app = await buildApp(repo);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/quote",
      body: {
        country: "US",
        items: [validItem()],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toMatchObject({
      items: expect.any(Array),
      subtotal: expect.any(Number),
      total: expect.any(Number),
      priceBookVersion: "v1",
    });
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      unitPrice: expect.any(Number),
      groupTotal: expect.any(Number),
      breakdown: expect.any(Object),
    });
  });

  it("returns 200 for a valid request (CA, with postal)", async () => {
    const repo = new FakePriceBookRepository(createFakePriceBook());
    app = await buildApp(repo);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/quote",
      body: {
        country: "CA",
        postalCode: "M5A",
        items: [validItem()],
      },
    });

    expect(res.statusCode).toBe(200);
  });

  it("returns 200 with multiple items", async () => {
    const repo = new FakePriceBookRepository(createFakePriceBook());
    app = await buildApp(repo);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/quote",
      body: {
        country: "US",
        items: [
          validItem({ pricingCategory: "tshirt", quantity: 10 }),
          validItem({ pricingCategory: "hoodie", quantity: 5 }),
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.items).toHaveLength(2);
  });
});

/* ---------- validation errors → 400 ---------- */

describe("validation → 400", () => {
  it("rejects missing country", async () => {
    const repo = new FakePriceBookRepository(createFakePriceBook());
    app = await buildApp(repo);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/quote",
      body: {
        items: [validItem()],
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("ValidationError");
    expect(body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: ["country"] }),
      ]),
    );
  });

  it("rejects invalid country value", async () => {
    const repo = new FakePriceBookRepository(createFakePriceBook());
    app = await buildApp(repo);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/quote",
      body: {
        country: "MX",
        items: [validItem()],
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it("rejects CA without postalCode with postal_required", async () => {
    const repo = new FakePriceBookRepository(createFakePriceBook());
    app = await buildApp(repo);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/quote",
      body: {
        country: "CA",
        items: [validItem()],
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("ValidationError");
    expect(body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["postalCode"],
          message: "postal_required",
        }),
      ]),
    );
  });

  it("rejects CA with empty postalCode", async () => {
    const repo = new FakePriceBookRepository(createFakePriceBook());
    app = await buildApp(repo);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/quote",
      body: {
        country: "CA",
        postalCode: "",
        items: [validItem()],
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it("rejects empty items", async () => {
    const repo = new FakePriceBookRepository(createFakePriceBook());
    app = await buildApp(repo);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/quote",
      body: {
        country: "US",
        items: [],
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it("rejects missing items", async () => {
    const repo = new FakePriceBookRepository(createFakePriceBook());
    app = await buildApp(repo);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/quote",
      body: { country: "US" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("rejects non-integer quantity", async () => {
    const repo = new FakePriceBookRepository(createFakePriceBook());
    app = await buildApp(repo);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/quote",
      body: {
        country: "US",
        items: [validItem({ quantity: 10.5 })],
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it("rejects zero locations", async () => {
    const repo = new FakePriceBookRepository(createFakePriceBook());
    app = await buildApp(repo);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/quote",
      body: {
        country: "US",
        items: [validItem({ locations: 0 })],
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it("rejects negative addOnPerUnit", async () => {
    const repo = new FakePriceBookRepository(createFakePriceBook());
    app = await buildApp(repo);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/quote",
      body: {
        country: "US",
        items: [validItem({ addOnPerUnit: -1 })],
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it("rejects empty pricingCategory", async () => {
    const repo = new FakePriceBookRepository(createFakePriceBook());
    app = await buildApp(repo);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/quote",
      body: {
        country: "US",
        items: [
          {
            pricingCategory: "",
            quantity: 10,
            locations: 1,
            addOnPerUnit: 0,
          },
        ],
      },
    });

    expect(res.statusCode).toBe(400);
  });
});

/* ---------- no pricebook → 409 ---------- */

describe("no pricebook → 409", () => {
  it("returns 409 Conflict when no active price book exists", async () => {
    const repo = new FakePriceBookRepository(null);
    app = await buildApp(repo);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/quote",
      body: {
        country: "US",
        items: [validItem()],
      },
    });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("Conflict");
  });
});
