import { derivePricingFromProduct } from "./productPricing.resolver";
import type { SelectedArea } from "../types";

const mockProduct = {
  pricingCategory: "t-shirt",
  areas: {
    front: [
      { id: "chest", price: 2.5 },
      { id: "pocket", price: 1.0 },
    ],
    back: [{ id: "full-back", price: 4.0 }],
  },
};

describe("derivePricingFromProduct", () => {
  it("maps 't-shirt' string to 'tshirt' category", () => {
    const result = derivePricingFromProduct(mockProduct);
    expect(result.pricingCategory).toBe("tshirt");
  });

  it("counts unique views as locations", () => {
    const areas: SelectedArea[] = [
      { view: "front", areaId: "chest" },
      { view: "back", areaId: "full-back" },
    ];
    const result = derivePricingFromProduct(mockProduct, areas);
    expect(result.locations).toBe(2);
  });

  it("treats same view as one location even with multiple areas", () => {
    const areas: SelectedArea[] = [
      { view: "front", areaId: "chest" },
      { view: "front", areaId: "pocket" },
    ];
    const result = derivePricingFromProduct(mockProduct, areas);
    expect(result.locations).toBe(1);
  });

  it("sums prices of unique areas for addOnPerUnit", () => {
    const areas: SelectedArea[] = [
      { view: "front", areaId: "chest" },
      { view: "back", areaId: "full-back" },
    ];
    const result = derivePricingFromProduct(mockProduct, areas);
    expect(result.addOnPerUnit).toBe(6.5); // 2.5 + 4.0
  });

  it("deduplicates same area on same view", () => {
    const areas: SelectedArea[] = [
      { view: "front", areaId: "chest" },
      { view: "front", areaId: "chest" },
    ];
    const result = derivePricingFromProduct(mockProduct, areas);
    expect(result.addOnPerUnit).toBe(2.5);
  });

  it("defaults locations=1 when no areas provided", () => {
    const result = derivePricingFromProduct(mockProduct);
    expect(result.locations).toBe(1);
    expect(result.addOnPerUnit).toBe(0);
  });

  it("throws on unknown pricing category", () => {
    expect(() =>
      derivePricingFromProduct({ pricingCategory: "bike" }),
    ).toThrow("unknown_pricing_category");
  });

  it("throws when pricingCategory is missing", () => {
    expect(() => derivePricingFromProduct({})).toThrow(
      "product_missing_pricingCategory",
    );
  });
});
