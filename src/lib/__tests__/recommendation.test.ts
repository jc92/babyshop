import { describe, expect, test } from "vitest";
import type { ProductSummary } from "@/data/catalog";
import { rankProducts, scoreProduct, type RecommendationInput } from "@/lib/recommendation";

function buildProduct(overrides: Partial<ProductSummary> = {}): ProductSummary {
  return {
    id: "prod-1",
    name: "Eco Nursing Pillow",
    brand: "Nest",
    price: 99,
    category: "nursing",
    milestoneIds: ["prenatal"],
    affiliateUrl: "https://example.com",
    colors: ["neutral"],
    materials: ["organic-cotton"],
    isEcoFriendly: true,
    rating: 4,
    reviewSummary: "Supportive and washable",
    checklistNotes: "",
    ...overrides,
  };
}

const basePreferences: RecommendationInput = {
  budget: "balanced",
  babyGender: "surprise",
  dueDate: "2024-09-01",
  colorPalette: "neutral",
  materialFocus: "organic",
  ecoPriority: true,
  location: "NY",
  preferredCategories: ["nursing"],
};

describe("recommendation scoring", () => {
  test("scoreProduct rewards aligned preferences", () => {
    const result = scoreProduct(buildProduct(), basePreferences);

    expect(result.score).toBeGreaterThan(7);
    expect(result.rationale).toContain("Matches category focus");
    expect(result.rationale).toContain("Within monthly budget");
  });

  test("scoreProduct penalizes items above the budget range", () => {
    const priceyProduct = buildProduct({ price: 500 });
    const result = scoreProduct(priceyProduct, basePreferences);

    expect(result.score).toBeLessThan(9);
    expect(result.rationale).toContain("Exceeds target monthly spend");
  });

  test("rankProducts sorts by descending score", () => {
    const ecoFriendly = buildProduct({ id: "eco", rating: 4.5 });
    const offCategory = buildProduct({
      id: "off",
      category: "play",
      colors: ["bold"],
      materials: ["plastic"],
      isEcoFriendly: false,
      price: 300,
      rating: 4.9,
    });

    const [topRecommendation] = rankProducts([offCategory, ecoFriendly], basePreferences);

    expect(topRecommendation.product.id).toBe("eco");
    expect(topRecommendation.score).toBeGreaterThan(0);
  });

  test("rankProducts keeps only the highest-scoring duplicate", () => {
    const duplicateLow = buildProduct({ id: "dup", rating: 4.1 });
    const duplicateHigh = buildProduct({ id: "dup", rating: 4.9 });
    const another = buildProduct({ id: "another", category: "feeding", rating: 4.4 });

    const results = rankProducts([duplicateLow, duplicateHigh, another], {
      ...basePreferences,
      preferredCategories: ["nursing", "feeding"],
    });

    const duplicateMatches = results.filter((item) => item.product.id === "dup");

    expect(duplicateMatches).toHaveLength(1);
    expect(duplicateMatches[0]?.score).toBeGreaterThanOrEqual(duplicateHigh.rating);
  });

  test("rankProducts prioritizes preferred categories when available", () => {
    const nursing = buildProduct({ id: "nursing", category: "nursing", rating: 4.2 });
    const safety = buildProduct({ id: "safety", category: "safety", rating: 4.1 });
    const travel = buildProduct({ id: "travel", category: "travel", rating: 4.7 });

    const [first, second] = rankProducts([nursing, safety, travel], {
      ...basePreferences,
      preferredCategories: ["safety", "nursing"],
    });

    expect([first.product.category, second.product.category]).toEqual([
      "safety",
      "nursing",
    ]);
  });
});
