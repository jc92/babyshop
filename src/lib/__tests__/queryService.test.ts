import { beforeEach, describe, expect, it, vi } from "vitest";

const productRepositoryQuery = vi.fn();

const sqlMock = vi.fn();
sqlMock.query = vi.fn();

vi.mock("@vercel/postgres", () => ({
  sql: sqlMock,
}));

vi.mock("@/lib/products/repository", () => ({
  ProductRepository: {
    query: productRepositoryQuery,
  },
}));

const { QueryService } = await import("@/lib/queryService");

function mockSqlResponses(responses: Array<{ rows: unknown[] }>) {
  let callIndex = 0;
  sqlMock.mockImplementation(() => Promise.resolve(responses[callIndex++] ?? { rows: [] }));
  sqlMock.query.mockImplementation(() => Promise.resolve(responses[callIndex++] ?? { rows: [] }));
}

describe("QueryService", () => {
  beforeEach(() => {
    productRepositoryQuery.mockReset();
    sqlMock.mockReset();
    sqlMock.query.mockReset();
  });

  it("delegates product queries to the repository", async () => {
    const expected = { data: [], pagination: { total: 0 } };
    productRepositoryQuery.mockResolvedValue(expected);

    const options = { page: 2 };
    const result = await QueryService.queryProducts(options);

    expect(productRepositoryQuery).toHaveBeenCalledWith(options);
    expect(result).toBe(expected);
  });

  it("aggregates product stats from SQL queries", async () => {
    mockSqlResponses([
      { rows: [{ total: "5" }] },
      { rows: [{ category: "sleeping", count: 3 }] },
      { rows: [{ range: "$20-$50", count: 2 }] },
      { rows: [{ avg_rating: "4.5" }] },
      { rows: [{ eco_count: "2" }] },
    ]);

    const stats = await QueryService.getProductStats();

    expect(stats).toEqual({
      totalProducts: 5,
      categories: [{ category: "sleeping", count: 3 }],
      priceRanges: [{ range: "$20-$50", count: 2 }],
      averageRating: 4.5,
      ecoFriendlyCount: 2,
    });
  });

  it("returns trending products from the past week", async () => {
    const trending = [{ id: "prod_1" }];
    mockSqlResponses([{ rows: trending }]);

    const result = await QueryService.getTrendingProducts(3);

    expect(sqlMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual(trending);
  });

  it("builds recommended product queries with dynamic clauses", async () => {
    const rows = [{ id: "recommended" }];
    mockSqlResponses([{ rows }]);

    const result = await QueryService.getRecommendedProducts("user_123", {
      limit: 5,
      excludePurchased: true,
      category: "travel",
    });

    expect(sqlMock.query).toHaveBeenCalledTimes(1);
    const [queryText, params] = sqlMock.query.mock.calls[0];
    expect(queryText).toContain("NOT EXISTS");
    expect(queryText).toContain("p.category = $2");
    expect(params).toEqual(["user_123", "travel"]);
    expect(result).toEqual(rows);
  });
});
