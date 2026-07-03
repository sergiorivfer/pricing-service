import type { PriceBook, QuoteRequest, QuoteResult } from "../domain/pricing/types";
import { computeQuote } from "../domain/pricing/engine/computeQuote";
import type { PriceBookRepository } from "./ports/PriceBookRepository";

export type GetQuoteResult =
  | { ok: true; quote: QuoteResult; priceBookVersion: string }
  | { ok: false; error: "no_pricebook" };

export async function getQuote(
  request: QuoteRequest,
  repo: PriceBookRepository,
): Promise<GetQuoteResult> {
  const priceBook: PriceBook | null = await repo.getActivePriceBook();

  if (!priceBook) {
    return { ok: false, error: "no_pricebook" };
  }

  const quote = computeQuote(priceBook, request);
  return { ok: true, quote, priceBookVersion: priceBook.version };
}
