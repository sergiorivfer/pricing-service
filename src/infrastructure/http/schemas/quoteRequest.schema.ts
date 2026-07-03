import { z } from "zod";

const techniqueSchema = z.enum(["screenprint", "embroidery", "dtf"], {
  errorMap: () => ({ message: "Must be 'screenprint', 'embroidery', or 'dtf'" }),
});

const quoteLineInputSchema = z.object({
  lineId: z.string().trim().min(1).optional(),
  pricingCategory: z.string().min(1, { message: "pricingCategory is required" }),
  technique: techniqueSchema.optional(),
  quantity: z
    .number()
    .int({ message: "quantity must be an integer" })
    .positive({ message: "quantity must be a positive integer" }),
  locations: z
    .number()
    .int({ message: "locations must be an integer" })
    .min(1, { message: "locations must be at least 1" }),
  addOnPerUnit: z
    .number()
    .min(0, { message: "addOnPerUnit must be >= 0" }),
  basePriceOverride: z
    .number()
    .positive({ message: "basePriceOverride must be positive" })
    .optional(),
});

export const quoteRequestSchema = z
  .object({
    country: z.enum(["US", "CA"], {
      errorMap: () => ({ message: "Must be 'US' or 'CA'" }),
    }),
    postalCode: z.string().trim().min(1).optional(),
    items: z.array(quoteLineInputSchema).nonempty({
      message: "At least one item is required",
    }),
  })
  .refine((r) => !(r.country === "CA" && !r.postalCode), {
    message: "postal_required",
    path: ["postalCode"],
  });

export type ValidatedQuoteRequest = z.infer<typeof quoteRequestSchema>;
