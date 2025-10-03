import { sql } from "@vercel/postgres";
import { ProductRepository } from "./products/repository";
import type {
  ProductQueryOptions,
  ProductQueryResult,
  ProductRecord,
} from "./products/types";

export class QueryService {
  static async queryProducts(options: ProductQueryOptions = {}): Promise<ProductQueryResult<ProductRecord>> {
    return ProductRepository.query(options);
  }

  static async getProductStats(): Promise<{
    totalProducts: number;
    categories: Array<{ category: string; count: number }>;
    priceRanges: Array<{ range: string; count: number }>;
    averageRating: number;
    ecoFriendlyCount: number;
  }> {
    const [totalResult, categoryResult, priceResult, ratingResult, ecoResult] = await Promise.all([
      sql`SELECT COUNT(*) as total FROM products WHERE in_stock = true`,
      sql`
        SELECT category, COUNT(*) as count
        FROM products
        WHERE in_stock = true
        GROUP BY category
        ORDER BY count DESC
      `,
      sql`
        SELECT
          CASE
            WHEN price_cents < 2000 THEN 'Under $20'
            WHEN price_cents < 5000 THEN '$20-$50'
            WHEN price_cents < 10000 THEN '$50-$100'
            WHEN price_cents < 20000 THEN '$100-$200'
            ELSE 'Over $200'
          END as range,
          COUNT(*) as count
        FROM products
        WHERE in_stock = true AND price_cents IS NOT NULL
        GROUP BY range
        ORDER BY MIN(price_cents)
      `,
      sql`SELECT AVG(rating) as avg_rating FROM products WHERE in_stock = true AND rating IS NOT NULL`,
      sql`SELECT COUNT(*) as eco_count FROM products WHERE in_stock = true AND eco_friendly = true`
    ]);

    const categories = categoryResult.rows.map((row) => {
      const category = String((row as { category?: unknown }).category ?? "");
      const countValue = (row as { count?: unknown }).count;
      return {
        category,
        count: typeof countValue === "number" ? countValue : Number(countValue ?? 0),
      };
    });

    const priceRanges = priceResult.rows.map((row) => {
      const range = String((row as { range?: unknown }).range ?? "");
      const countValue = (row as { count?: unknown }).count;
      return {
        range,
        count: typeof countValue === "number" ? countValue : Number(countValue ?? 0),
      };
    });

    return {
      totalProducts: parseInt(totalResult.rows[0].total, 10),
      categories,
      priceRanges,
      averageRating: parseFloat(ratingResult.rows[0].avg_rating || '0'),
      ecoFriendlyCount: parseInt(ecoResult.rows[0].eco_count, 10)
    };
  }

  static async getTrendingProducts(limit: number = 10): Promise<ProductRecord[]> {
    const result = await sql<ProductRecord>`
      SELECT
        p.*,
        COALESCE(COUNT(upi.id), 0) as interaction_count
      FROM products p
      LEFT JOIN user_product_interactions upi ON upi.product_id = p.id
      WHERE p.in_stock = true
        AND (upi.created_at > NOW() - INTERVAL '7 days' OR upi.created_at IS NULL)
      GROUP BY p.id
      ORDER BY interaction_count DESC, p.rating DESC
      LIMIT ${limit}
    `;

    return result.rows;
  }

  static async getRecommendedProducts(
    userId: string,
    options: { limit?: number; excludePurchased?: boolean; category?: string } = {}
  ): Promise<ProductRecord[]> {
    const { limit = 10, excludePurchased = true, category } = options;

    const clauses = ['p.in_stock = true'];
    const params: Array<string | number | boolean> = [];

    if (excludePurchased) {
      clauses.push(`NOT EXISTS (
        SELECT 1 FROM user_product_interactions upi
        WHERE upi.product_id = p.id
          AND upi.user_id = $${params.length + 1}
          AND upi.interaction_type = 'purchased'
      )`);
      params.push(userId);
    }

    if (category) {
      clauses.push(`p.category = $${params.length + 1}`);
      params.push(category);
    }

    const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const query = `
      SELECT p.* FROM products p
      ${whereClause}
      ORDER BY COALESCE(p.rating, 0) DESC, p.created_at DESC
      LIMIT ${limit}
    `;

    const result = await sql.query<ProductRecord>(query, params);
    return result.rows;
  }
}
