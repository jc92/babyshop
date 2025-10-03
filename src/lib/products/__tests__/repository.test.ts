import { beforeEach, describe, expect, test, vi } from "vitest";
import type {
  ProductQueryFilters,
  ProductQueryOptions,
  ProductRecord,
} from "@/lib/products/types";

type SqlResult = { rows: unknown[]; rowCount?: number };

type DataShape = {
  products: ProductRecord[];
  productAiCategories: Array<{ product_id: string; ai_category_id: string }>;
  productReviews: Array<{ id: string; product_id: string }>;
  userProductRecommendations: Array<{ id: string; product_id: string }>;
  userProductInteractions: Array<{ id: string; product_id: string }>;
};

const db: DataShape = {
  products: [],
  productAiCategories: [],
  productReviews: [],
  userProductRecommendations: [],
  userProductInteractions: [],
};

let currentOptions: ProductQueryOptions | undefined;

function resetDb() {
  db.products = [];
  db.productAiCategories = [];
  db.productReviews = [];
  db.userProductRecommendations = [];
  db.userProductInteractions = [];
}

function normalizeSql(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function buildSqlText(strings: TemplateStringsArray, values: unknown[]) {
  let text = "";
  strings.forEach((part, index) => {
    text += part;
    if (index < values.length) {
      text += `$${index + 1}`;
    }
  });
  return text;
}

type SqlTag = {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<SqlResult>;
  query: (text: string, params?: unknown[]) => Promise<SqlResult>;
};

async function executeQuery(text: string, params: unknown[] = []): Promise<SqlResult> {
  const normalized = normalizeSql(text);

  if (normalized.startsWith("SELECT COUNT(*) as total FROM products")) {
    const { rows } = getFilteredProducts();
    return { rows: [{ total: String(rows.length) }], rowCount: 1 };
  }

  if (normalized.startsWith("SELECT") && normalized.includes("FROM products p")) {
    const includeWindowCount = normalized.includes("COUNT(*) OVER() as total_count");
    const rows = buildSelectRows(params, includeWindowCount);
    return { rows, rowCount: rows.length };
  }

  if (normalized.startsWith("DELETE FROM product_ai_categories")) {
    const productId = params[0] as string;
    const removed = removeWhere(db.productAiCategories, (entry) => entry.product_id === productId);
    return { rows: [], rowCount: removed };
  }

  if (normalized.startsWith("DELETE FROM product_reviews")) {
    const productId = params[0] as string;
    const removed = removeWhere(db.productReviews, (entry) => entry.product_id === productId);
    return { rows: [], rowCount: removed };
  }

  if (normalized.startsWith("DELETE FROM products")) {
    const productId = params[0] as string;
    const removedRows: Array<{ id: string }> = [];
    removeWhere(db.products, (product) => {
      if (product.id === productId) {
        removedRows.push({ id: productId });
        return true;
      }
      return false;
    });
    return { rows: removedRows, rowCount: removedRows.length };
  }

  if (normalized.startsWith("DELETE FROM user_product_recommendations")) {
    const productId = params[0] as string;
    const removed = removeWhere(
      db.userProductRecommendations,
      (entry) => entry.product_id === productId,
    );
    return { rows: [], rowCount: removed };
  }

  if (normalized.startsWith("DELETE FROM user_product_interactions")) {
    const productId = params[0] as string;
    const removed = removeWhere(
      db.userProductInteractions,
      (entry) => entry.product_id === productId,
    );
    return { rows: [], rowCount: removed };
  }

  throw new Error(`Unhandled SQL: ${normalized}`);
}

const sql: SqlTag = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
  const text = buildSqlText(strings, values);
  return executeQuery(text, values);
}) as SqlTag;

sql.query = (text: string, params: unknown[] = []) => executeQuery(text, params);

vi.mock("@vercel/postgres", () => ({ sql }));

const { ProductRepository } = await import("@/lib/products/repository");

function runQuery(options: ProductQueryOptions = {}) {
  currentOptions = options;
  return ProductRepository.query(options).finally(() => {
    currentOptions = undefined;
  });
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

function normalizeSort(sortBy?: string, sortOrder?: string) {
  const validSortFields = [
    "created_at",
    "updated_at",
    "name",
    "price_cents",
    "rating",
    "review_count",
  ] as const;

  const validDirections = ["asc", "desc"] as const;
  const field = validSortFields.includes(sortBy as (typeof validSortFields)[number])
    ? (sortBy as (typeof validSortFields)[number])
    : "created_at";

  const direction = validDirections.includes((sortOrder ?? "").toLowerCase() as (typeof validDirections)[number])
    ? ((sortOrder ?? "") as (typeof validDirections)[number])
    : "desc";

  return { field, direction };
}

function compareValues(a: unknown, b: unknown) {
  if (a === b) {
    return 0;
  }

  if (a === null || a === undefined) {
    return -1;
  }

  if (b === null || b === undefined) {
    return 1;
  }

  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }

  const aString = a instanceof Date ? a.getTime() : String(a).toLowerCase();
  const bString = b instanceof Date ? b.getTime() : String(b).toLowerCase();
  return aString < bString ? -1 : aString > bString ? 1 : 0;
}

function extractField(product: ProductRecord, field: string) {
  switch (field) {
    case "created_at":
    case "updated_at":
      return product[field] ? new Date(product[field] as string) : null;
    default:
      return product[field as keyof ProductRecord] ?? null;
  }
}

function getFilteredProducts() {
  const filters = normalizeFilters(currentOptions?.filters ?? {});
  let rows = [...db.products];

  if (filters.inStock !== undefined) {
    rows = rows.filter((product) => product.in_stock === filters.inStock);
  } else {
    rows = rows.filter((product) => product.in_stock === true);
  }

  if (filters.category?.length) {
    rows = rows.filter((product) => filters.category?.includes(product.category));
  }

  if (typeof filters.ageMonths === "number") {
    rows = rows.filter((product) => {
      const min = product.age_range_months_min;
      const max = product.age_range_months_max;
      return (min === null || min === undefined || min <= filters.ageMonths!) &&
        (max === null || max === undefined || max >= filters.ageMonths!);
    });
  }

  if (filters.budgetTier) {
    if (["budget", "standard"].includes(filters.budgetTier)) {
      rows = rows.filter((product) => product.premium === false);
    }
    if (["premium", "luxury"].includes(filters.budgetTier)) {
      rows = rows.filter((product) => product.premium === true);
    }
  }

  if (typeof filters.premium === "boolean") {
    rows = rows.filter((product) => product.premium === filters.premium);
  }

  if (filters.ecoFriendly) {
    rows = rows.filter((product) => product.eco_friendly === true);
  }

  if (typeof filters.inStock === "boolean") {
    rows = rows.filter((product) => product.in_stock === filters.inStock);
  }

  if (typeof filters.minPrice === "number") {
    rows = rows.filter(
      (product) => (product.price_cents ?? 0) >= Math.round(filters.minPrice! * 100),
    );
  }

  if (typeof filters.maxPrice === "number") {
    rows = rows.filter(
      (product) => (product.price_cents ?? Number.MAX_SAFE_INTEGER) <= Math.round(filters.maxPrice! * 100),
    );
  }

  if (typeof filters.minRating === "number") {
    rows = rows.filter((product) => (product.rating ?? 0) >= filters.minRating!);
  }

  if (filters.milestoneIds?.length) {
    rows = rows.filter((product) => {
      const ids = product.milestone_ids ?? [];
      return ids.some((id) => filters.milestoneIds?.includes(id));
    });
  }

  if (filters.search) {
    const term = filters.search.toLowerCase();
    rows = rows.filter((product) => {
      const haystack = `${product.name ?? ""} ${product.description ?? ""} ${product.brand ?? ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }

  return { filters, rows };
}

function buildSelectRows(params: unknown[], includeWindowCount: boolean) {
  const { rows } = getFilteredProducts();
  const { field, direction } = normalizeSort(currentOptions?.sortBy, currentOptions?.sortOrder);
  const sortedRows = [...rows].sort((a, b) => {
    const comparison = compareValues(extractField(a, field), extractField(b, field));
    return direction === "asc" ? comparison : -comparison;
  });

  const limit = Number(params[params.length - 2] ?? 20);
  const offset = Number(params[params.length - 1] ?? 0);
  const paginated = sortedRows.slice(offset, offset + limit).map((row) => ({ ...row }));

  if (currentOptions?.includeAiCategories) {
    paginated.forEach((row) => {
      const aiIds = db.productAiCategories
        .filter((entry) => entry.product_id === row.id)
        .map((entry) => entry.ai_category_id);
      (row as Record<string, unknown>).ai_category_ids = aiIds;
    });
  }

  if (includeWindowCount && paginated[0]) {
    (paginated[0] as Record<string, unknown>).total_count = rows.length;
  }

  return paginated;
}

function removeWhere<T>(items: T[], predicate: (item: T) => boolean) {
  let removed = 0;
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index])) {
      items.splice(index, 1);
      removed += 1;
    }
  }
  return removed;
}

function seedProducts(...products: ProductRecord[]) {
  db.products.push(...products);
}

function seedAiCategories(entries: Array<{ product_id: string; ai_category_id: string }>) {
  db.productAiCategories.push(...entries);
}

function seedRecommendations(entries: Array<{ id: string; product_id: string }>) {
  db.userProductRecommendations.push(...entries);
}

function seedInteractions(entries: Array<{ id: string; product_id: string }>) {
  db.userProductInteractions.push(...entries);
}

function seedReviews(entries: Array<{ id: string; product_id: string }>) {
  db.productReviews.push(...entries);
}

const baseProduct: ProductRecord = {
  id: "prod-1",
  name: "Organic Sleep Gown",
  description: "Soft organic cotton sleep gown",
  category: "sleeping",
  subcategory: null,
  brand: "Moon Baby",
  image_url: null,
  price_cents: 4500,
  currency: "USD",
  start_date: null,
  end_date: null,
  age_range_months_min: 0,
  age_range_months_max: 6,
  milestone_ids: ["newborn"],
  tags: ["sleep", "organic"],
  eco_friendly: true,
  premium: false,
  rating: 4.6,
  review_count: 120,
  affiliate_url: "https://example.com/sleep-gown",
  in_stock: true,
  period_start_month: null,
  period_end_month: null,
  review_sources: [],
  safety_notes: null,
  external_review_urls: [],
  source_url: "https://example.com/product",
  created_at: "2024-01-03T00:00:00.000Z",
  updated_at: "2024-01-03T00:00:00.000Z",
};

const premiumProduct: ProductRecord = {
  ...baseProduct,
  id: "prod-2",
  name: "Convertible Travel System",
  category: "travel",
  milestone_ids: ["month6", "month9"],
  tags: ["travel"],
  eco_friendly: false,
  premium: true,
  rating: 4.9,
  review_count: 80,
  price_cents: 89900,
  created_at: "2024-01-05T00:00:00.000Z",
  updated_at: "2024-01-05T00:00:00.000Z",
};

const outOfStockProduct: ProductRecord = {
  ...baseProduct,
  id: "prod-3",
  name: "Retired Feeding Set",
  category: "feeding",
  milestone_ids: ["month3"],
  eco_friendly: false,
  premium: false,
  rating: 4,
  review_count: 40,
  in_stock: false,
  created_at: "2023-12-15T00:00:00.000Z",
  updated_at: "2023-12-15T00:00:00.000Z",
};

beforeEach(() => {
  resetDb();
});

describe("ProductRepository.query", () => {
  test("returns paginated results and enforces in-stock by default", async () => {
    seedProducts(baseProduct, premiumProduct, outOfStockProduct);

    const result = await runQuery();

    expect(result.data).toHaveLength(2);
    expect(result.data.map((product) => product.id)).toEqual(["prod-2", "prod-1"]);
    expect(result.pagination).toMatchObject({ total: 2, page: 1, limit: 20, totalPages: 1 });
  });

  test("filters by category when provided", async () => {
    seedProducts(baseProduct, premiumProduct, outOfStockProduct);

    const result = await runQuery({ filters: { category: "sleeping" } });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.id).toBe("prod-1");
  });

  test("attaches AI category aggregates when requested", async () => {
    seedProducts(baseProduct, premiumProduct);
    seedAiCategories([
      { product_id: "prod-1", ai_category_id: "sleep-support" },
      { product_id: "prod-1", ai_category_id: "care-organization" },
    ]);

    const result = await runQuery({ includeAiCategories: true, limit: 10 });

    const firstProduct = result.data.find((product) => product.id === "prod-1");
    expect(firstProduct?.ai_category_ids).toEqual(["sleep-support", "care-organization"]);
    expect(result.pagination.total).toBe(2);
  });
});

describe("ProductRepository.deleteById", () => {
  test("removes product and related records", async () => {
    seedProducts(baseProduct, premiumProduct);
    seedAiCategories([{ product_id: "prod-1", ai_category_id: "sleep-support" }]);
    seedReviews([{ id: "review-1", product_id: "prod-1" }]);
    seedRecommendations([{ id: "rec-1", product_id: "prod-1" }]);
    seedInteractions([{ id: "interaction-1", product_id: "prod-1" }]);

    const removed = await ProductRepository.deleteById("prod-1");

    expect(removed).toBe(1);
    expect(db.products.map((product) => product.id)).toEqual(["prod-2"]);
    expect(db.productAiCategories).toHaveLength(0);
    expect(db.productReviews).toHaveLength(0);
    expect(db.userProductRecommendations).toHaveLength(0);
    expect(db.userProductInteractions).toHaveLength(0);
  });
});
