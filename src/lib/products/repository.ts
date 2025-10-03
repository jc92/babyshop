import { sql } from '@vercel/postgres';
import type {
  ProductCreatePayload,
  ProductQueryFilters,
  ProductQueryOptions,
  ProductQueryResult,
  ProductRecord,
  ProductQuerySortField,
  ProductQuerySortOrder,
} from './types';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

type QueryParam = string | number | boolean | string[] | null;

function normalizePagination(page?: number, limit?: number) {
  const normalizedPage = Math.max(page ?? DEFAULT_PAGE, 1);
  const normalizedLimit = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  return {
    page: normalizedPage,
    limit: normalizedLimit,
    offset: (normalizedPage - 1) * normalizedLimit,
  };
}

function normalizeFilters(filters: ProductQueryFilters = {}) {
  return {
    ...filters,
    milestoneIds: Array.isArray(filters.milestoneIds)
      ? filters.milestoneIds
      : filters.milestoneIds
        ? [filters.milestoneIds]
        : undefined,
    category: Array.isArray(filters.category)
      ? filters.category
      : filters.category
        ? [filters.category]
        : undefined,
  } satisfies ProductQueryFilters & {
    milestoneIds?: string[];
    category?: string[];
  };
}

function normalizeSort(sortBy?: string, sortOrder?: string): {
  field: ProductQuerySortField;
  direction: ProductQuerySortOrder;
} {
  const validSortFields: ProductQuerySortField[] = [
    'created_at',
    'updated_at',
    'name',
    'price_cents',
    'rating',
    'review_count',
  ];

  const validSortOrders: ProductQuerySortOrder[] = ['asc', 'desc'];

  const field = validSortFields.includes(sortBy as ProductQuerySortField)
    ? (sortBy as ProductQuerySortField)
    : 'created_at';

  const direction = validSortOrders.includes((sortOrder ?? '').toLowerCase() as ProductQuerySortOrder)
    ? ((sortOrder ?? '') as ProductQuerySortOrder)
    : 'desc';

  return { field, direction };
}

interface WhereClauseBuilder {
  conditions: string[];
  params: QueryParam[];
  nextIndex: number;
}

function buildWhereClause(
  filters: ReturnType<typeof normalizeFilters>,
  options: { enforceInStock: boolean }
): WhereClauseBuilder {
  const builder: WhereClauseBuilder = {
    conditions: [],
    params: [],
    nextIndex: 1,
  };

  if (options.enforceInStock) {
    builder.conditions.push('p.in_stock = true');
  }

  if (filters.category?.length) {
    builder.conditions.push(`p.category = ANY($${builder.nextIndex})`);
    builder.params.push(filters.category);
    builder.nextIndex += 1;
  }

  if (filters.ageMonths && filters.ageMonths > 0) {
    builder.conditions.push(`(p.age_range_months_min IS NULL OR p.age_range_months_min <= $${builder.nextIndex})`);
    builder.params.push(filters.ageMonths);
    builder.nextIndex += 1;

    builder.conditions.push(`(p.age_range_months_max IS NULL OR p.age_range_months_max >= $${builder.nextIndex})`);
    builder.params.push(filters.ageMonths);
    builder.nextIndex += 1;
  }

  if (filters.budgetTier) {
    if (['budget', 'standard'].includes(filters.budgetTier)) {
      builder.conditions.push('p.premium = false');
    }
    if (['premium', 'luxury'].includes(filters.budgetTier)) {
      builder.conditions.push('p.premium = true');
    }
  }

  if (filters.premium !== undefined) {
    builder.conditions.push(`p.premium = $${builder.nextIndex}`);
    builder.params.push(filters.premium);
    builder.nextIndex += 1;
  }

  if (filters.ecoFriendly) {
    builder.conditions.push('p.eco_friendly = true');
  }

  if (filters.inStock !== undefined) {
    builder.conditions.push(`p.in_stock = $${builder.nextIndex}`);
    builder.params.push(filters.inStock);
    builder.nextIndex += 1;
  }

  if (filters.minPrice && filters.minPrice > 0) {
    builder.conditions.push(`p.price_cents >= $${builder.nextIndex}`);
    builder.params.push(filters.minPrice * 100);
    builder.nextIndex += 1;
  }

  if (filters.maxPrice && filters.maxPrice > 0) {
    builder.conditions.push(`p.price_cents <= $${builder.nextIndex}`);
    builder.params.push(filters.maxPrice * 100);
    builder.nextIndex += 1;
  }

  if (filters.minRating && filters.minRating > 0) {
    builder.conditions.push(`p.rating >= $${builder.nextIndex}`);
    builder.params.push(filters.minRating);
    builder.nextIndex += 1;
  }

  if (filters.milestoneIds?.length) {
    builder.conditions.push(`p.milestone_ids && $${builder.nextIndex}`);
    builder.params.push(filters.milestoneIds);
    builder.nextIndex += 1;
  }

  if (filters.search) {
    builder.conditions.push(`(
      to_tsvector('english', p.name || ' ' || COALESCE(p.description, '') || ' ' || COALESCE(p.brand, ''))
      @@ plainto_tsquery('english', $${builder.nextIndex})
      OR p.name ILIKE $${builder.nextIndex + 1}
      OR p.brand ILIKE $${builder.nextIndex + 1}
    )`);
    builder.params.push(filters.search, `%${filters.search}%`);
    builder.nextIndex += 2;
  }

  return builder;
}

function buildJoins(options: ProductQueryOptions) {
  const joins: string[] = [];
  if (options.includeAiCategories) {
    joins.push('LEFT JOIN product_ai_categories pac ON pac.product_id = p.id');
  }
  if (options.includeReviews) {
    joins.push('LEFT JOIN product_reviews pr ON pr.product_id = p.id');
  }
  return joins.join(' ');
}

function buildSelect(options: ProductQueryOptions) {
  const fields = [
    'p.id',
    'p.name',
    'p.description',
    'p.category',
    'p.subcategory',
    'p.brand',
    'p.image_url',
    'p.price_cents',
    'p.currency',
    'p.start_date',
    'p.end_date',
    'p.age_range_months_min',
    'p.age_range_months_max',
    'p.milestone_ids',
    'p.tags',
    'p.eco_friendly',
    'p.premium',
    'p.rating',
    'p.review_count',
    'p.affiliate_url',
    'p.in_stock',
    'p.period_start_month',
    'p.period_end_month',
    'p.review_sources',
    'p.safety_notes',
    'p.external_review_urls',
    'p.source_url',
    'p.created_at',
    'p.updated_at',
  ];

  if (options.includeAiCategories) {
    fields.push(
      `COALESCE(json_agg(DISTINCT pac.ai_category_id) FILTER (WHERE pac.ai_category_id IS NOT NULL), '[]'::json) AS ai_category_ids`
    );
  }

  if (options.includeReviews) {
    fields.push(
      `COALESCE(json_agg(DISTINCT to_jsonb(pr)) FILTER (WHERE pr.id IS NOT NULL), '[]'::json) AS reviews`
    );
  }

  return fields.join(', ');
}

function buildWhere(builder: WhereClauseBuilder) {
  if (!builder.conditions.length) {
    return '';
  }
  return `WHERE ${builder.conditions.join(' AND ')}`;
}

async function executeQuery(
  selectClause: string,
  joinClause: string,
  whereClause: string,
  sort: ReturnType<typeof normalizeSort>,
  pagination: ReturnType<typeof normalizePagination>,
  params: QueryParam[],
  groupBy: boolean
): Promise<ProductRecord[]> {
  const limitParam = `$${params.length + 1}`;
  const offsetParam = `$${params.length + 2}`;

  const groupClause = groupBy ? 'GROUP BY p.id' : '';

  const rawQuery = `
    SELECT ${groupBy ? `${selectClause}, COUNT(*) OVER() as total_count` : selectClause}
    FROM products p
    ${joinClause}
    ${whereClause}
    ${groupClause}
    ORDER BY p.${sort.field} ${sort.direction.toUpperCase()}
    LIMIT ${limitParam} OFFSET ${offsetParam}
  `;

  const result = await sql.query<ProductRecord>(rawQuery, [...params, pagination.limit, pagination.offset]);
  return result.rows;
}

async function countProducts(whereClause: string, params: QueryParam[]): Promise<number> {
  const countQuery = `SELECT COUNT(*) as total FROM products p ${whereClause}`;
  const countResult = await sql.query<{ total: string }>(countQuery, params);
  return parseInt(countResult.rows[0]?.total ?? '0', 10);
}

export class ProductRepository {
  static async query(options: ProductQueryOptions = {}): Promise<ProductQueryResult<ProductRecord>> {
    const filters = normalizeFilters(options.filters);
    const pagination = normalizePagination(options.page, options.limit);
    const sort = normalizeSort(options.sortBy, options.sortOrder);

    const whereBuilder = buildWhereClause(filters, {
      enforceInStock: filters?.inStock === undefined,
    });

    const joinClause = buildJoins(options);
    const selectClause = buildSelect(options);
    const whereClause = buildWhere(whereBuilder);
    const groupBy = Boolean(options.includeAiCategories || options.includeReviews);

    const rows = await executeQuery(
      selectClause,
      joinClause,
      whereClause,
      sort,
      pagination,
      whereBuilder.params,
      groupBy
    );

    const total = groupBy
      ? Number((rows[0] as { total_count?: number | string } | undefined)?.total_count ?? 0)
      : await countProducts(whereClause, whereBuilder.params);

    return {
      data: rows,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
      filters,
    };
  }

  static async insert(payload: ProductCreatePayload): Promise<ProductRecord> {
    const milestoneIds = Array.isArray(payload.milestoneIds)
      ? payload.milestoneIds
      : [];
    const tags = Array.isArray(payload.tags) ? payload.tags : [];

    const toTextArrayLiteral = (values: string[]): string => {
      if (values.length === 0) {
        return '{}';
      }
      const escaped = values.map((value) =>
        `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
      );
      return `{${escaped.join(',')}}`;
    };

    const milestoneArrayLiteral = toTextArrayLiteral(milestoneIds);
    const tagsArrayLiteral = toTextArrayLiteral(tags);

    if (process.env.NODE_ENV !== 'production') {
      console.log('[ProductRepository.insert] Prepared arrays', {
        milestoneIds,
        tags,
        milestoneArrayLiteral,
        tagsArrayLiteral,
      });
    }

    const result = await sql<ProductRecord>`
      INSERT INTO products (
        name,
        description,
        category,
        subcategory,
        brand,
        image_url,
        price_cents,
        currency,
        start_date,
        end_date,
        age_range_months_min,
        age_range_months_max,
        milestone_ids,
        tags,
        eco_friendly,
        premium,
        rating,
        review_count,
        affiliate_url,
        in_stock,
        period_start_month,
        period_end_month,
        review_sources,
        safety_notes,
        external_review_urls,
        source_url
      ) VALUES (
        ${payload.name},
        ${payload.description ?? null},
        ${payload.category},
        ${payload.subcategory ?? null},
        ${payload.brand ?? null},
        ${payload.imageUrl ?? null},
        ${payload.priceCents ?? null},
        ${payload.currency ?? 'USD'},
        ${payload.startDate ?? null},
        ${payload.endDate ?? null},
        ${payload.ageRangeMonthsMin ?? null},
        ${payload.ageRangeMonthsMax ?? null},
        ${milestoneArrayLiteral}::text[],
        ${tagsArrayLiteral}::text[],
        ${payload.ecoFriendly ?? false},
        ${payload.premium ?? false},
        ${payload.rating ?? null},
        ${payload.reviewCount ?? 0},
        ${payload.affiliateUrl ?? null},
        ${payload.inStock ?? true},
        ${payload.periodStartMonth ?? null},
        ${payload.periodEndMonth ?? null},
        ${JSON.stringify(payload.reviewSources ?? [])}::jsonb,
        ${payload.safetyNotes ?? null},
        ${JSON.stringify(payload.externalReviewUrls ?? [])}::jsonb,
        ${payload.sourceUrl ?? null}
      )
      RETURNING *
    `;

    return result.rows[0];
  }

  static async assignAiCategories(productId: string, aiCategoryIds: string[] = []) {
    if (!aiCategoryIds.length) {
      return;
    }

    await Promise.all(
      aiCategoryIds.map((categoryId) =>
        sql`
          INSERT INTO product_ai_categories (product_id, ai_category_id)
          VALUES (${productId}, ${categoryId})
          ON CONFLICT (product_id, ai_category_id) DO NOTHING
        `
      )
    );
  }

  static async deleteById(productId: string) {
    await sql`DELETE FROM product_ai_categories WHERE product_id = ${productId}`;
    await sql`DELETE FROM product_reviews WHERE product_id = ${productId}`;

    const result = await sql`
      DELETE FROM products
      WHERE id = ${productId}
      RETURNING id
    `;

    await sql`DELETE FROM user_product_recommendations WHERE product_id = ${productId}`;
    await sql`DELETE FROM user_product_interactions WHERE product_id = ${productId}`;

    return result.rowCount ?? 0;
  }
}
