import { PreferenceProfile } from "@/data/preferences";
import type { CategoryId, ProductSummary } from "@/data/catalog";

export interface RecommendationInput extends PreferenceProfile {
  preferredCategories: CategoryId[];
}

export interface RecommendationResult {
  product: ProductSummary;
  score: number;
  rationale: string;
}

const categoryWeights: Partial<Record<CategoryId, number>> = {
  nursing: 1.2,
  sleeping: 1.1,
  safety: 1.1,
};

const paletteMap: Record<string, string[]> = {
  neutral: ["neutral", "warm", "cool"],
  pastel: ["pastel", "neutral"],
  bold: ["bold", "cool", "warm"],
  warm: ["warm", "neutral"],
  cool: ["cool", "neutral"],
};

const materialMatch: Record<PreferenceProfile["materialFocus"], string[]> = {
  organic: ["organic-cotton", "bamboo", "wood"],
  performance: ["silicone", "plastic", "recycled-poly"],
  recycled: ["recycled-poly", "canvas", "steel"],
  classic: ["wood", "cotton", "plastic"],
};

const budgetThreshold: Record<PreferenceProfile["budget"], number> = {
  essentials: 120,
  balanced: 220,
  premium: 999,
};

export function scoreProduct(
  product: ProductSummary,
  input: RecommendationInput,
): RecommendationResult {
  let score = product.rating;
  const reasons: string[] = [];

  if (input.preferredCategories.includes(product.category)) {
    score += (categoryWeights[product.category] ?? 1) * 1.5;
    reasons.push(`Matches category focus on ${product.category}.`);
  }

  if (product.colors.some((c) => paletteMap[input.colorPalette].includes(c))) {
    score += 0.8;
    reasons.push("Aligned with preferred color palette.");
  }

  if (
    product.materials.some((material) =>
      materialMatch[input.materialFocus].includes(material),
    )
  ) {
    score += 0.8;
    reasons.push("Material choice fits style preferences.");
  }

  if (input.ecoPriority && product.isEcoFriendly) {
    score += 1;
    reasons.push("Eco-friendly option.");
  }

  if (product.price <= budgetThreshold[input.budget]) {
    score += 0.6;
    reasons.push("Within monthly budget comfort zone.");
  } else {
    score -= 0.4;
    reasons.push("Exceeds target monthly spend but adds long-term value.");
  }

  const rationale = reasons.length > 0 ? reasons.join(" ") : "Popular pick.";

  return {
    product,
    score,
    rationale,
  };
}

export function rankProducts(
  products: ProductSummary[],
  input: RecommendationInput,
): RecommendationResult[] {
  return products
    .map((product) => scoreProduct(product, input))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

