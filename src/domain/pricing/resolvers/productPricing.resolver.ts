import type {
  PricingCategory,
  SelectedArea,
  View,
} from "../types";

function mapPricingCategory(raw: any): PricingCategory {
  const v = String(raw || "")
    .toLowerCase()
    .trim();

  const map: Record<string, PricingCategory> = {
    tshirt: "tshirt",
    "t-shirt": "tshirt",
    tee: "tshirt",
    hoodie: "hoodie",
    hat: "hat",
  };

  const out = map[v];
  if (!out) throw new Error(`unknown_pricing_category:${v}`);
  return out;
}

export function derivePricingFromProduct(
  product: any,
  selectedAreas?: SelectedArea[],
) {
  // 1) categoría pricing
  const raw = (product as any).pricingCategory;
  if (!raw) throw new Error("product_missing_pricingCategory");
  const pricingCategory = mapPricingCategory(raw);

  // 2) locations = views únicas
  const viewsUsed = new Set<View>();
  for (const a of selectedAreas ?? []) viewsUsed.add(a.view);
  const locations = Math.max(1, viewsUsed.size || 1);

  // 3) addOnPerUnit = suma de áreas seleccionadas (únicas)
  const uniq = new Set(
    (selectedAreas ?? []).map((a) => `${a.view}:${a.areaId}`),
  );
  let addOnPerUnit = 0;

  for (const key of uniq) {
    const [view, areaId] = key.split(":") as [View, string];
    const list = (product as any)?.areas?.[view] ?? [];
    const found = list.find((x: any) => String(x.id) === String(areaId));
    if (found?.price) addOnPerUnit += Number(found.price);
  }

  return { pricingCategory, locations, addOnPerUnit };
}
