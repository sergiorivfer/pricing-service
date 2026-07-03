import { createPool } from "../src/infrastructure/db/pool";

// Matches the characterization test's PriceBook exactly so
// `npm run smoke` asserts subtotal === 275.4.
const SEED: Record<string, unknown> = {
  version: "test.v1",
  setup_cost: 40,
  application_per_unit: 3,
  base_costs: { tshirt: 6, hoodie: 14, hat: 10 },
  zone_rates: { M: 0, V: 0, P: 0, E: 2, R: 2, default: 0, US: 0 },
  profit_variable: [
    { max: 49, value: 2.0 },
    { min: 50, max: 99, value: 1.9 },
    { min: 100, value: 1.8 },
  ],
  technique_rules: {},
};

async function seed() {
  const pool = createPool();

  // Deactivate any existing active book
  await pool.query("UPDATE price_books SET is_active = false WHERE is_active = true");

  const { rows } = await pool.query(
    `INSERT INTO price_books
       (version, setup_cost, application_per_unit, base_costs, zone_rates,
        profit_variable, technique_rules, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true)
     RETURNING id`,
    [
      SEED.version,
      SEED.setup_cost,
      SEED.application_per_unit,
      JSON.stringify(SEED.base_costs),
      JSON.stringify(SEED.zone_rates),
      JSON.stringify(SEED.profit_variable),
      JSON.stringify(SEED.technique_rules),
    ],
  );

  console.log("Seeded price_book id=%d with version=%s", rows[0].id, SEED.version);
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
