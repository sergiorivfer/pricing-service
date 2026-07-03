import type { Pool } from "pg";
import type { PriceBook } from "../../domain/pricing/types";
import type { PriceBookRepository } from "../../application/ports/PriceBookRepository";

export class PostgresPriceBookRepository implements PriceBookRepository {
  constructor(private readonly pool: Pool) {}

  async getActivePriceBook(): Promise<PriceBook | null> {
    const { rows } = await this.pool.query(
      `SELECT version,
              setup_cost,
              application_per_unit,
              base_costs,
              zone_rates,
              profit_variable,
              technique_rules
       FROM price_books
       WHERE is_active = true
       LIMIT 1`,
    );

    if (rows.length === 0) return null;
    return this.toDomain(rows[0]);
  }

  private toDomain(row: {
    version: string;
    setup_cost: string;
    application_per_unit: string;
    base_costs: PriceBook["baseCosts"];
    zone_rates: PriceBook["zoneRates"];
    profit_variable: PriceBook["profitVariable"];
    technique_rules: PriceBook["techniqueRules"];
  }): PriceBook {
    return {
      version: row.version,
      setupCost: Number(row.setup_cost),
      applicationPerUnit: Number(row.application_per_unit),
      baseCosts: row.base_costs,
      zoneRates: row.zone_rates,
      profitVariable: row.profit_variable,
      techniqueRules: row.technique_rules,
    };
  }
}
