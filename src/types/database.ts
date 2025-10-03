// Database table interfaces matching the actual PostgreSQL schema

export interface DatabaseProduct {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  subcategory?: string | null;
  brand?: string | null;
  image_url?: string | null;
  price_cents?: number | null;
  currency?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  age_range_months_min?: number | null;
  age_range_months_max?: number | null;
  milestone_ids: string[]; // PostgreSQL TEXT[] array
  tags: string[]; // PostgreSQL TEXT[] array
  eco_friendly: boolean;
  premium: boolean;
  rating?: number | null;
  review_count?: number | null;
  affiliate_url?: string | null;
  in_stock: boolean;
  period_start_month?: number | null;
  period_end_month?: number | null;
  review_sources: Array<{ source: string; url?: string }>; // JSONB
  safety_notes?: string | null;
  external_review_urls: Array<{ source: string; url?: string }>; // JSONB
  source_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseAICategory {
  id: string;
  label: string;
  description: string;
  best_practices: string;
  created_at: string;
}

export interface DatabaseProductAICategory {
  product_id: string;
  ai_category_id: string;
}

export interface DatabaseProductReview {
  id: string;
  product_id: string;
  source: string;
  url?: string | null;
  headline?: string | null;
  summary?: string | null;
  rating?: number | null;
  author?: string | null;
  published_at?: string | null;
  created_at: string;
}

// API request/response interfaces
export interface AddProductRequest {
  sourceUrl: string;
  milestoneId?: string;
  aiCategoryIds?: string[];
}

export interface AddProductResponse {
  product: DatabaseProduct;
  message: string;
  productId: string;
}

export interface ProductListResponse {
  products: DatabaseProduct[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
