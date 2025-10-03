// Simple in-memory cache for product queries
// In production, you'd want to use Redis or similar

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CacheService {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached data
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cached data
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Delete cached data
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Generate cache key for product queries
   */
  generateProductQueryKey(params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = params[key];
        return result;
      }, {});

    return `products:${JSON.stringify(sortedParams)}`;
  }

  /**
   * Invalidate product-related cache entries
   */
  invalidateProductCache(): void {
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (key.startsWith('products:')) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    keys: string[];
    memoryUsage: number;
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      memoryUsage: JSON.stringify(Array.from(this.cache.entries())).length
    };
  }
}

export const cacheService = new CacheService();

/**
 * Higher-order function to add caching to any async function
 */
export function withCache<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  keyGenerator: (...args: T) => string,
  ttl?: number
) {
  return async (...args: T): Promise<R> => {
    const key = keyGenerator(...args);
    
    // Try to get from cache first
    const cached = cacheService.get<R>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn(...args);
    cacheService.set(key, result, ttl);
    
    return result;
  };
}

/**
 * Cache decorator for class methods
 */
export function cached(ttl?: number) {
  return function (target: Record<string, unknown>, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const className = target.constructor.name;

    descriptor.value = async function (...args: unknown[]) {
      const key = `${className}:${propertyName}:${JSON.stringify(args)}`;
      
      const cached = cacheService.get(key);
      if (cached !== null) {
        return cached;
      }

      const result = await method.apply(this, args);
      cacheService.set(key, result, ttl);
      
      return result;
    };
  };
}
