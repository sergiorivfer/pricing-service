import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { getQuote } from "../../../application/getQuote.usecase";
import type { PriceBookRepository } from "../../../application/ports/PriceBookRepository";
import type { QuoteRequest } from "../../../domain/pricing/types";
import { quoteRequestSchema } from "../schemas/quoteRequest.schema";

type ValidationIssue = {
  path: string[];
  message: string;
};

function formatZodError(err: ZodError): ValidationIssue[] {
  return err.issues.map((issue) => ({
    path: issue.path.map(String),
    message: issue.message,
  }));
}

export async function quoteRoute(
  app: FastifyInstance,
  opts: { readonly priceBookRepository: PriceBookRepository },
): Promise<void> {
  app.post(
    "/quote",
    async (
      request: FastifyRequest,
      reply: FastifyReply,
    ): Promise<void> => {
      const parsed = quoteRequestSchema.safeParse(request.body);

      if (!parsed.success) {
        await reply.status(400).send({
          error: "ValidationError",
          message: "Request body validation failed",
          details: formatZodError(parsed.error),
        });
        return;
      }

      const result = await getQuote(
        { ...parsed.data, postalCode: parsed.data.postalCode ?? "" } as QuoteRequest,
        opts.priceBookRepository,
      );

      if (!result.ok) {
        await reply.status(409).send({
          error: "Conflict",
          message:
            "No active price book available. A price book must be configured before quoting.",
        });
        return;
      }

      await reply.status(200).send({
        items: result.quote.items,
        subtotal: result.quote.subtotal,
        total: result.quote.total,
        priceBookVersion: result.priceBookVersion,
      });
    },
  );
}
