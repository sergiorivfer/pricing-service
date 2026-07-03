import type { PriceBook } from "../../domain/pricing/types";
import type { PriceBookRepository } from "../ports/PriceBookRepository";

export class FakePriceBookRepository implements PriceBookRepository {
  constructor(private readonly priceBook: PriceBook | null) {}

  async getActivePriceBook(): Promise<PriceBook | null> {
    return this.priceBook;
  }
}
