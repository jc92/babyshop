import type { ProductSummary, CategoryId, MilestoneId } from '@/data/catalog';
import type { ProductInput } from '@/schemas/product';

export type ProductInteractionType = 'view' | 'like' | 'dislike' | 'purchase' | 'wishlist';

export interface ProductRecord {
  id: string;
  name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  brand: string | null;
  image_url: string | null;
  price_cents: number | null;
  currency: string | null;
  start_date: string | null;
  end_date: string | null;
  age_range_months_min: number | null;
  age_range_months_max: number | null;
  milestone_ids: string[] | null;
  tags: string[] | null;
  eco_friendly: boolean | null;
  premium: boolean | null;
  rating: number | null;
  review_count: number | null;
  affiliate_url: string | null;
  in_stock: boolean | null;
  period_start_month: number | null;
  period_end_month: number | null;
  review_sources: Array<{ source: string; url?: string }> | null;
  safety_notes: string | null;
  external_review_urls: Array<{ source: string; url: string }> | null;
  source_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  ai_category_ids?: string[];
  reviews?: Array<{
    id: string;
    source: string;
    url?: string;
    headline?: string;
    summary?: string;
    rating?: number;
    author?: string;
    published_at?: string;
  }>;
}

export interface ProductListResponse {
  products: ProductRecord[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters?: ProductQueryFilters;
}

export interface ProductCreatePayload extends ProductInput {
  aiCategoryIds?: string[];
  milestoneIds?: string[] | null;
  tags?: string[] | null;
  sourceUrl?: string;
}

export interface ProductCreateResult {
  product: ProductRecord;
  message: string;
}

export type ProductQuerySortField =
  | 'created_at'
  | 'updated_at'
  | 'name'
  | 'price_cents'
  | 'rating'
  | 'review_count';

export type ProductQuerySortOrder = 'asc' | 'desc';

export interface ProductQueryFilters {
  category?: string | string[];
  ageMonths?: number;
  budgetTier?: string;
  ecoFriendly?: boolean;
  premium?: boolean;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  milestoneIds?: string | string[];
  search?: string;
}

export interface ProductQueryOptions {
  page?: number;
  limit?: number;
  filters?: ProductQueryFilters;
  sortBy?: ProductQuerySortField;
  sortOrder?: ProductQuerySortOrder;
  includeReviews?: boolean;
  includeAiCategories?: boolean;
}

export interface ProductQueryResult<T = ProductRecord> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters?: ProductQueryFilters;
}

export interface ProductSummaryAdapterInput extends ProductRecord {
  ai_category_ids?: string[];
}

export interface ProductSummaryAdapterOutput extends ProductSummary {
  aiCategories: string[];
  milestoneIds: MilestoneId[];
  category: CategoryId;
}

export type UserProductListSource = 'recommendation' | 'interaction';

export interface UserProductListItem {
  productId: string;
  name: string;
  category: string | null;
  brand: string | null;
  priceCents: number | null;
  currency: string | null;
  milestoneIds: string[];
  ecoFriendly: boolean | null;
  premium: boolean | null;
  affiliateUrl: string | null;
  imageUrl: string | null;
  recordedAt: string | null;
  source: UserProductListSource;
  reason?: string | null;
  recommendationScore?: number | null;
  interactionType?: ProductInteractionType | null;
}
