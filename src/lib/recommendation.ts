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
  const uniqueByProduct = new Map<string, RecommendationResult>();

  for (const product of products) {
    const scored = scoreProduct(product, input);
    const existing = uniqueByProduct.get(product.id);

    if (!existing || scored.score > existing.score) {
      uniqueByProduct.set(product.id, scored);
    }
  }

  const sorted = Array.from(uniqueByProduct.values()).sort((a, b) => b.score - a.score);

  const prioritized: RecommendationResult[] = [];
  const pickedProductIds = new Set<string>();

  for (const category of input.preferredCategories) {
    const match = sorted.find((item) =>
      item.product.category === category && !pickedProductIds.has(item.product.id),
    );

    if (match) {
      prioritized.push(match);
      pickedProductIds.add(match.product.id);
    }
  }

  const remaining = sorted.filter((item) => !pickedProductIds.has(item.product.id));

  return [...prioritized, ...remaining].slice(0, 8);
}
