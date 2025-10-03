import { toProductSummaries } from '@/lib/mappers/productMapper';
import type {
  ProductListResponse,
  ProductQueryOptions,
  ProductSummaryAdapterInput,
  ProductRecord,
} from './types';

function serializeOptions(options: ProductQueryOptions = {}): string {
  const params = new URLSearchParams();

  if (options.page) params.set('page', String(options.page));
  if (options.limit) params.set('limit', String(options.limit));
  if (options.sortBy) params.set('sortBy', options.sortBy);
  if (options.sortOrder) params.set('sortOrder', options.sortOrder);
  if (options.includeReviews) params.set('includeReviews', 'true');
  if (options.includeAiCategories) params.set('includeAiCategories', 'true');

  const filters = options.filters ?? {};

  if (filters.category && typeof filters.category === 'string') {
    params.set('category', filters.category);
  }

  if (Array.isArray(filters.category)) {
    params.set('categories', filters.category.join(','));
  }

  if (typeof filters.ageMonths === 'number') params.set('ageMonths', String(filters.ageMonths));
  if (filters.budgetTier) params.set('budgetTier', filters.budgetTier);
  if (filters.ecoFriendly) params.set('ecoFriendly', 'true');
  if (typeof filters.premium === 'boolean') params.set('premium', String(filters.premium));
  if (typeof filters.inStock === 'boolean') params.set('inStock', String(filters.inStock));
  if (typeof filters.minPrice === 'number') params.set('minPrice', String(filters.minPrice));
  if (typeof filters.maxPrice === 'number') params.set('maxPrice', String(filters.maxPrice));
  if (typeof filters.minRating === 'number') params.set('minRating', String(filters.minRating));

  if (filters.milestoneIds && typeof filters.milestoneIds === 'string') {
    params.set('milestoneId', filters.milestoneIds);
  }

  if (Array.isArray(filters.milestoneIds)) {
    params.set('milestoneIds', filters.milestoneIds.join(','));
  }

  if (filters.search) params.set('search', filters.search);

  return params.toString();
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || response.statusText);
  }
  return response.json() as Promise<T>;
}

export class ProductService {
  private static baseUrl = '/api/products';

  static async query(options: ProductQueryOptions = {}): Promise<ProductListResponse> {
    const query = serializeOptions(options);
    const response = await fetch(`${this.baseUrl}${query ? `?${query}` : ''}`);
    return handleResponse<ProductListResponse>(response);
  }

  static async listSummaries(options: ProductQueryOptions = {}) {
    const result = await this.query(options);
    return toProductSummaries(result.products as ProductSummaryAdapterInput[]);
  }

  static async addProduct(payload: Record<string, unknown>): Promise<{ message: string; product: ProductRecord }> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<{ message: string; product: ProductRecord }>(response);
  }

  static async addProductFromUrl(payload: {
    sourceUrl: string;
    milestoneId?: string;
    aiCategoryIds?: string[];
  }): Promise<{ message: string; productId: string; product: ProductRecord }> {
    const response = await fetch(`${this.baseUrl}/add-from-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<{ message: string; productId: string; product: ProductRecord }>(response);
  }

  static async deleteProduct(productId: string): Promise<{ message: string; id: string }> {
    const response = await fetch(`${this.baseUrl}?id=${encodeURIComponent(productId)}`, {
      method: 'DELETE',
    });
    return handleResponse<{ message: string; id: string }>(response);
  }
}
