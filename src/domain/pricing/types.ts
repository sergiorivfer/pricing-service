export type PricingCategory = "tshirt" | "hoodie" | "hat";
export type Technique = "screenprint" | "embroidery" | "dtf";
export type Country = "US" | "CA";

export type PriceBook = {
  version: string;
  setupCost: number;
  applicationPerUnit: number;
  baseCosts: Record<PricingCategory, number>;
  zoneRates: Record<string, number>;
  profitVariable: Array<{ min?: number; max?: number; value: number }>;

  // Reglas de técnica (si ya quieres soportarlo)
  techniqueRules?: Partial<
    Record<Technique, { setupDelta?: number; perUnitDelta?: number }>
  >;
};

export type QuoteLineInput = {
  lineId?: string;
  pricingCategory: PricingCategory;
  technique?: Technique;
  quantity: number;
  locations: number; // >=1
  addOnPerUnit: number; // >=0
  basePriceOverride?: number;
};

export type QuoteRequest = {
  country: Country;
  postalCode: string;
  items: QuoteLineInput[];
};

export type QuoteLineResult = {
  lineId?: string;
  unitPrice: number;
  groupTotal: number;
  breakdown: {
    setupCost: number;
    applicationPerUnit: number;
    quantity: number;
    baseCost: number;
    volumeVariable: number;
    locations: number;
    extraLocationsBlock: number;
    postalRatePct: number;
    postalMultiplier: number;
    prePostalTotal: number;
    addOnPerUnit: number;
    addOnTotal: number;
  };
};

export type QuoteResult = {
  items: QuoteLineResult[];
  subtotal: number;
  total: number;
};

export type View = "front" | "back" | "left" | "right";

export type SelectedArea = {
  view: View;
  areaId: string;
};
