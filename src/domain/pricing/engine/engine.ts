/**
 * ⚠️  LEGACY ENGINE  ⚠️
 *
 * Copied from the monolith for reference. Prefer `computeQuote` (computeQuote.ts)
 * instead — it accepts a typed PriceBook and produces a richer breakdown.
 *
 * This version reads directly from an inline default config (the pricing.json
 * the monolith had was a plain JS object; its shape matches PriceBook).
 */

import type { PriceBook } from "../types";

/* ------------------------------------------------------------------ */
/*  Inline default config — was loaded from @/config/pricing.json     */
/* ------------------------------------------------------------------ */
const defaultPricing: PriceBook = {
  version: "1.0",
  setupCost: 40,
  applicationPerUnit: 3,
  baseCosts: { tshirt: 15, hoodie: 22, hat: 12 },
  zoneRates: { US: 2, CA: 5, default: 0 },
  profitVariable: [
    { min: 1, max: 24, value: 2.8 },
    { min: 25, max: 49, value: 2.4 },
    { min: 50, max: 99, value: 1.8 },
    { min: 100, max: 249, value: 1.4 },
    { min: 250, value: 1.2 },
  ],
};

/* ------------------------------------------------------------------ */
/*  Types (local)                                                      */
/* ------------------------------------------------------------------ */

type ItemIn = {
  productId: string;
  pricingCategory: "tshirt" | "hoodie" | "hat";
  technique: "screenprint" | "embroidery" | "dtf";
  quantity: number; // Q
  printAreas: number; // locations
  basePriceOverride?: number;
  logoId?: string | null;
};

type QuoteReq = { postal: string; items: ItemIn[] };

type QuoteRes = {
  items: Array<{
    productId: string;
    unitPrice: number;
    subtotal: number;
    breakdown: {
      setup: number;
      baseCost: number;
      volumeVar: number;
      decorationPerUnit: number;
      zoneRatePercent: number;
      extraAreas: number;
    };
  }>;
  subtotal: number;
  total: number;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Aplica el recargo postal:
 * - Si el código parece US (empieza con dígito), usa zoneRates.US (porcentaje).
 * - Si es Canadá, usa la primera letra (M/V/P -> 0, E/R -> 2, etc.) o zoneRates.default.
 * - Devuelve fracción (0.02 para 2%).
 */
function zoneRate(postal: string, pb: PriceBook): number {
  const code = (postal || "").trim().toUpperCase();
  const first = code[0] ?? "";

  const zr = pb.zoneRates;
  const isUSLike = /^[0-9]/.test(code);

  if (isUSLike) {
    const usPct = typeof zr.US === "number" ? zr.US : 0;
    return usPct / 100;
  }

  const pct =
    typeof zr[first] === "number"
      ? zr[first]
      : typeof zr.default === "number"
        ? zr.default
        : 0;

  return pct / 100;
}

/**
 * Elige V (variable por volumen) tolerando múltiples formatos de tramo en pb.profitVariable.
 */
function volumeVar(q: number, pb: PriceBook): number {
  const tiers = pb.profitVariable || [];
  if (!Array.isArray(tiers) || tiers.length === 0) return 2.0;

  const norm = tiers.map((t) => ({
    min: typeof t.min === "number" ? t.min : 1,
    max:
      typeof t.max === "number"
        ? t.max
        : Number.POSITIVE_INFINITY,
    value: typeof t.value === "number" ? t.value : 2.0,
  }));

  let found = norm.find((r) => q >= r.min && q <= r.max);
  if (!found) {
    found = norm.filter((r) => q >= r.min).sort((a, b) => b.min - a.min)[0];
  }

  return found ? found.value : 2.0;
}

function baseCost(
  cat: "tshirt" | "hoodie" | "hat",
  pb: PriceBook,
  override?: number,
) {
  if (typeof override === "number") return override;
  return typeof pb.baseCosts[cat] === "number" ? pb.baseCosts[cat] : 15;
}

/* ------------------------------------------------------------------ */
/*  Engine                                                             */
/* ------------------------------------------------------------------ */

export function quoteEngine(req: QuoteReq, pb: PriceBook = defaultPricing): QuoteRes {
  const rate = zoneRate(req.postal, pb);
  const outItems = req.items.map((it) => {
    const Q = Math.max(0, it.quantity | 0);
    const C = baseCost(it.pricingCategory, pb, it.basePriceOverride);
    const V = volumeVar(Q, pb);
    const setup = pb.setupCost ?? 40;
    const decorationPerUnit = pb.applicationPerUnit ?? 3;

    const firstArea = setup + Q * C * V + decorationPerUnit * Q;
    const extraAreas =
      Math.max(0, (it.printAreas || 1) - 1) * (setup + decorationPerUnit * Q);
    const groupTotalBeforeZone = firstArea + extraAreas;

    const groupTotal = groupTotalBeforeZone * (1 + rate);
    const unitPrice = Q ? groupTotal / Q : 0;

    return {
      productId: it.productId,
      unitPrice: Number(unitPrice.toFixed(2)),
      subtotal: Number(groupTotal.toFixed(2)),
      breakdown: {
        setup,
        baseCost: C,
        volumeVar: V,
        decorationPerUnit,
        zoneRatePercent: rate * 100,
        extraAreas,
      },
    };
  });

  const subtotal = Number(
    outItems.reduce((s, i) => s + i.subtotal, 0).toFixed(2),
  );
  const total = subtotal;
  return { items: outItems, subtotal, total };
}
