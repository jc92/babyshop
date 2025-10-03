import type { CategoryId, MilestoneId, ProductSummary } from '@/data/catalog';
import type { ProductSummaryAdapterInput } from '@/lib/products/types';

const categoryMap: Record<string, CategoryId> = {
  clothing: 'nursing',
  feeding: 'feeding',
  sleeping: 'sleeping',
  safety: 'safety',
  travel: 'travel',
  play: 'play',
  monitoring: 'safety',
  accessories: 'travel',
  transportation: 'travel',
  bathing: 'bathing',
  nursing: 'nursing',
};

function mapCategory(category: string): CategoryId {
  return categoryMap[category] ?? 'nursing';
}

const ALLOWED_MILESTONES: MilestoneId[] = ['prenatal', 'newborn', 'month3', 'month6', 'month9', 'year1', 'year2', 'year3'];

function coerceMilestoneIds(milestoneIds: string[] | null | undefined): MilestoneId[] {
  if (!Array.isArray(milestoneIds)) {
    return [];
  }

  return milestoneIds.filter((id): id is MilestoneId => ALLOWED_MILESTONES.includes(id as MilestoneId));
}

export function toProductSummary(backendProduct: ProductSummaryAdapterInput): ProductSummary {
  return {
    id: backendProduct.id,
    name: backendProduct.name,
    brand: backendProduct.brand ?? '',
    price: backendProduct.price_cents ? backendProduct.price_cents / 100 : 0,
    category: mapCategory(backendProduct.category),
    milestoneIds: coerceMilestoneIds(backendProduct.milestone_ids),
    affiliateUrl: backendProduct.affiliate_url ?? backendProduct.source_url ?? '',
    imageUrl: backendProduct.image_url ?? undefined,
    colors: [],
    materials: [],
    isEcoFriendly: backendProduct.eco_friendly ?? false,
    rating: typeof backendProduct.rating === 'number' ? backendProduct.rating : 0,
    reviewSummary: backendProduct.description ?? 'No description available',
    checklistNotes: '',
    periodStartMonth: backendProduct.period_start_month ?? null,
    periodEndMonth: backendProduct.period_end_month ?? null,
    safetyNotes: backendProduct.safety_notes ?? null,
    aiCategories: backendProduct.ai_category_ids ?? [],
    reviewSources: backendProduct.review_sources ?? [],
    externalReviewUrls: backendProduct.external_review_urls ?? [],
    reviews: backendProduct.reviews ?? [],
  } satisfies ProductSummary;
}

export function toProductSummaries(products: ProductSummaryAdapterInput[]): ProductSummary[] {
  return products.map(toProductSummary);
}


