import type { PriceBook } from "../../domain/pricing/types";

export interface PriceBookRepository {
  /**
   * Returns the currently active price book, or null if none exists.
   * Absence is a value, not an exception — the use case decides what it means.
   */
  getActivePriceBook(): Promise<PriceBook | null>;
}
