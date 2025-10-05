import { cacheService } from '@/lib/cacheService';
import { toProductSummaries } from '@/lib/mappers/productMapper';
import { ProductRepository } from './repository';
import type {
  ProductQueryOptions,
  ProductListResponse,
  ProductCreateResult,
  ProductCreatePayload,
  ProductSummaryAdapterInput,
  ProductInteractionType,
  UserProductListItem,
} from './types';

const CACHE_TTL_MS = 5 * 60 * 1000;

function buildCacheKey(prefix: string, payload: unknown): string {
  return `${prefix}:${JSON.stringify(payload)}`;
}

function ensureStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function normalizePayload(payload: ProductCreatePayload): ProductCreatePayload {
  return {
    ...payload,
    milestoneIds: ensureStringArray(payload.milestoneIds),
    tags: ensureStringArray(payload.tags),
    aiCategoryIds: ensureStringArray(payload.aiCategoryIds),
    reviewSources: Array.isArray(payload.reviewSources) ? payload.reviewSources : [],
    externalReviewUrls: Array.isArray(payload.externalReviewUrls) ? payload.externalReviewUrls : [],
    reviewCount: payload.reviewCount ?? 0,
    ecoFriendly: payload.ecoFriendly ?? false,
    premium: payload.premium ?? false,
    inStock: payload.inStock ?? true,
    currency: payload.currency ?? 'USD',
  };
}

export class ProductNotFoundError extends Error {
  constructor(productId: string) {
    super(`Product ${productId} not found`);
    this.name = 'ProductNotFoundError';
  }
}

export class ProductDomainService {
  static async query(options: ProductQueryOptions = {}): Promise<ProductListResponse> {
    const cacheKey = buildCacheKey('products', options);
    const cached = cacheService.get<ProductListResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await ProductRepository.query(options);
    const payload: ProductListResponse = {
      products: result.data,
      pagination: result.pagination,
      filters: result.filters,
    };

    cacheService.set(cacheKey, payload, CACHE_TTL_MS);
    return payload;
  }

  static async listSummaries(options: ProductQueryOptions = {}) {
    const result = await this.query(options);
    return toProductSummaries(result.products as ProductSummaryAdapterInput[]);
  }

  static async addProduct(
    payload: ProductCreatePayload,
    options: { userId?: string; interactionType?: ProductInteractionType } = {},
  ): Promise<ProductCreateResult> {
    const normalized = normalizePayload(payload);
    if (process.env.NODE_ENV !== 'production') {
      console.log('[ProductDomainService.addProduct] Normalized payload', {
        name: normalized.name,
        category: normalized.category,
        milestoneCount: normalized.milestoneIds?.length ?? 0,
        tagCount: normalized.tags?.length ?? 0,
        aiCategoryCount: normalized.aiCategoryIds?.length ?? 0,
      });
    }
    const record = await ProductRepository.insert(normalized);

    if (normalized.aiCategoryIds && normalized.aiCategoryIds.length > 0) {
      await ProductRepository.assignAiCategories(record.id, normalized.aiCategoryIds);
    }

    if (options.userId && record.id) {
      const interactionType = options.interactionType ?? 'wishlist';
      await ProductRepository.recordUserInteraction(options.userId, record.id, interactionType);
    }
    cacheService.invalidateProductCache();

    return {
      product: record,
      message: 'Product created successfully',
    };
  }

  static async deleteProduct(productId: string) {
    const deleted = await ProductRepository.deleteById(productId);
    if (!deleted) {
      throw new ProductNotFoundError(productId);
    }

    cacheService.invalidateProductCache();
    return { message: 'Product removed', id: productId };
  }

  static async getUserKnownProductIds(userId: string): Promise<string[]> {
    if (!userId) {
      return [];
    }

    return ProductRepository.getUserKnownProductIds(userId);
  }

  static async getUserProductList(userId: string, limit?: number): Promise<UserProductListItem[]> {
    if (!userId) {
      return [];
    }

    return ProductRepository.getUserProductList(userId, limit);
  }

  static async rememberRecommendations(
    userId: string,
    items: Array<{ productId: string; reason?: string | null }>,
  ) {
    if (!userId) {
      return;
    }

    await ProductRepository.saveUserRecommendations(userId, items);
  }
}
