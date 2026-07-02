import type {
  PriceBook,
  QuoteRequest,
  QuoteResult,
  PricingCategory,
  Technique,
} from "../types";

function chooseVolumeVariable(pb: PriceBook, Q: number): number {
  const tiers = pb.profitVariable || [];
  const norm = tiers.map((t) => ({
    min: typeof t.min === "number" ? t.min : 1,
    max: typeof t.max === "number" ? t.max : Number.POSITIVE_INFINITY,
    value: typeof t.value === "number" ? t.value : 2.0,
  }));

  let found = norm.find((r) => Q >= r.min && Q <= r.max);
  if (!found)
    found = norm.filter((r) => Q >= r.min).sort((a, b) => b.min - a.min)[0];
  return found ? found.value : 2.0;
}

function baseCostFor(pb: PriceBook, cat: PricingCategory, override?: number) {
  if (typeof override === "number") return override;
  return pb.baseCosts?.[cat] ?? 15;
}

function resolveZone(pb: PriceBook, country: "US" | "CA", postalCode: string) {
  const zr = pb.zoneRates || {};
  const code = (postalCode || "").trim().toUpperCase();
  const first = code[0] ?? "";

  const ratePct =
    country === "US"
      ? typeof zr.US === "number"
        ? zr.US
        : 0
      : typeof zr[first] === "number"
        ? zr[first]
        : typeof zr.default === "number"
          ? zr.default
          : 0;

  const multiplier = 1 + ratePct / 100;
  return { ratePct, multiplier };
}

function applyTechnique(pb: PriceBook, technique?: Technique) {
  const baseSetup = pb.setupCost ?? 40;
  const basePerUnit = pb.applicationPerUnit ?? 3;

  const rule = technique ? pb.techniqueRules?.[technique] : undefined;
  return {
    setupCost: baseSetup + (rule?.setupDelta ?? 0),
    applicationPerUnit: basePerUnit + (rule?.perUnitDelta ?? 0),
  };
}

export function computeQuote(pb: PriceBook, req: QuoteRequest): QuoteResult {
  const { ratePct, multiplier } = resolveZone(pb, req.country, req.postalCode);

  const items = req.items.map((it) => {
    const Q = Math.max(1, Math.floor(it.quantity || 1));
    const locations = Math.max(1, Math.floor(it.locations || 1));
    const addOnPerUnit = Math.max(0, Number(it.addOnPerUnit ?? 0));
    const addOnTotal = addOnPerUnit * Q;

    const V = chooseVolumeVariable(pb, Q);
    const C = baseCostFor(pb, it.pricingCategory, it.basePriceOverride);

    const { setupCost, applicationPerUnit } = applyTechnique(pb, it.technique);

    const blockOne = setupCost + Q * C * V + applicationPerUnit * Q;
    const extraBlock =
      locations > 1
        ? (setupCost + applicationPerUnit * Q) * (locations - 1)
        : 0;
    const prePostalTotal = blockOne + extraBlock + addOnTotal;

    const groupTotal = +(prePostalTotal * multiplier).toFixed(2);
    const unitPrice = +(groupTotal / Q).toFixed(2);

    return {
      lineId: it.lineId,
      unitPrice,
      groupTotal,
      breakdown: {
        setupCost,
        applicationPerUnit,
        quantity: Q,
        baseCost: C,
        volumeVariable: V,
        locations,
        extraLocationsBlock: +extraBlock.toFixed(2),
        postalRatePct: ratePct,
        postalMultiplier: multiplier,
        prePostalTotal: +prePostalTotal.toFixed(2),
        addOnPerUnit,
        addOnTotal: +addOnTotal.toFixed(2),
      },
    };
  });

  const subtotal = +items.reduce((s, i) => s + i.groupTotal, 0).toFixed(2);
  return { items, subtotal, total: subtotal };
}
