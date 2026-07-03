import { createPool } from "../src/infrastructure/db/pool";
import { PostgresPriceBookRepository } from "../src/infrastructure/repositories/PostgresPriceBookRepository";
import { getQuote } from "../src/application/getQuote.usecase";
import type { QuoteRequest } from "../src/domain/pricing/types";

const request: QuoteRequest = {
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

async function smoke() {
  const pool = createPool();
  const repo = new PostgresPriceBookRepository(pool);

  const result = await getQuote(request, repo);

  if (!result.ok) {
    console.log("SMOKE FAIL: no_pricebook — run npm run seed first");
    await pool.end();
    process.exit(1);
  }

  const { quote, priceBookVersion } = result;

  console.log(JSON.stringify(quote, null, 2));
  console.log("version:", priceBookVersion);

  const pass = quote.subtotal === 275.4;
  console.log("\nassert: subtotal === 275.4 →", pass ? "✅ PASS" : "❌ FAIL");

  await pool.end();

  if (!pass) process.exit(1);
}

smoke().catch((err) => {
  console.error("Smoke failed:", err);
  process.exit(1);
});
