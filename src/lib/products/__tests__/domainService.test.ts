import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cacheServiceMock = {
  get: vi.fn(),
  set: vi.fn(),
  invalidateProductCache: vi.fn(),
};

vi.mock("@/lib/cacheService", () => ({
  cacheService: cacheServiceMock,
}));

const productRepositoryMock = {
  query: vi.fn(),
  insert: vi.fn(),
  assignAiCategories: vi.fn(),
  deleteById: vi.fn(),
  recordUserInteraction: vi.fn(),
  getUserKnownProductIds: vi.fn(),
  saveUserRecommendations: vi.fn(),
  getUserProductList: vi.fn(),
};

vi.mock("@/lib/products/repository", () => ({
  ProductRepository: productRepositoryMock,
}));

const toProductSummariesMock = vi.fn();

vi.mock("@/lib/mappers/productMapper", () => ({
  toProductSummaries: toProductSummariesMock,
}));

const { ProductDomainService, ProductNotFoundError } = await import("@/lib/products/domainService");

describe("ProductDomainService", () => {
  beforeEach(() => {
    Object.values(cacheServiceMock).forEach((fn) => (fn as vi.Mock).mockReset());
    Object.values(productRepositoryMock).forEach((fn) => (fn as vi.Mock).mockReset());
    toProductSummariesMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses cached results when present", async () => {
    const payload = { products: [{ id: "p1" }], pagination: {}, filters: {} };
    cacheServiceMock.get.mockReturnValue(payload);

    const result = await ProductDomainService.query({ category: "sleep" });

    expect(result).toBe(payload);
    expect(productRepositoryMock.query).not.toHaveBeenCalled();
  });

  it("queries repository and caches when cache miss", async () => {
    cacheServiceMock.get.mockReturnValue(null);
    productRepositoryMock.query.mockResolvedValue({
      data: [{ id: "p1" }],
      pagination: { total: 1 },
      filters: { category: "sleep" },
    });

    const result = await ProductDomainService.query({ category: "sleep" });

    expect(productRepositoryMock.query).toHaveBeenCalledWith({ category: "sleep" });
    expect(cacheServiceMock.set).toHaveBeenCalled();
    expect(result.pagination.total).toBe(1);
  });

  it("converts products to summaries", async () => {
    cacheServiceMock.get.mockReturnValue(null);
    productRepositoryMock.query.mockResolvedValue({ data: [{ id: "p1" }], pagination: {}, filters: {} });
    toProductSummariesMock.mockReturnValue([{ id: "p1", name: "Bassinet" }]);

    const summaries = await ProductDomainService.listSummaries();

    expect(toProductSummariesMock).toHaveBeenCalled();
    expect(summaries[0]).toEqual({ id: "p1", name: "Bassinet" });
  });

  it("normalizes payload before insert and assigns AI categories", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    productRepositoryMock.insert.mockResolvedValue({ id: "prod-1" });

    await ProductDomainService.addProduct({
      name: "Monitor",
      category: "monitoring",
      aiCategoryIds: ["safety"],
      milestoneIds: ["third-trimester"],
      tags: ["audio"],
    });

    expect(productRepositoryMock.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewCount: 0,
        milestoneIds: ["third-trimester"],
        tags: ["audio"],
      }),
    );
    expect(productRepositoryMock.assignAiCategories).toHaveBeenCalledWith("prod-1", ["safety"]);
    expect(cacheServiceMock.invalidateProductCache).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("skips AI assignment when no AI categories provided", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    productRepositoryMock.insert.mockResolvedValue({ id: "prod-2" });

    await ProductDomainService.addProduct({
      name: "Bottle",
      category: "feeding",
      milestoneIds: [],
    });

    expect(productRepositoryMock.assignAiCategories).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("throws ProductNotFoundError when deleteById returns false", async () => {
    productRepositoryMock.deleteById.mockResolvedValue(false);

    await expect(ProductDomainService.deleteProduct("missing"))
      .rejects.toBeInstanceOf(ProductNotFoundError);
  });

  it("invalidates cache after successful deletion", async () => {
    productRepositoryMock.deleteById.mockResolvedValue(true);

    const result = await ProductDomainService.deleteProduct("prod-3");

    expect(result).toEqual({ message: "Product removed", id: "prod-3" });
    expect(cacheServiceMock.invalidateProductCache).toHaveBeenCalled();
  });

  it("returns saved products for a user", async () => {
    productRepositoryMock.getUserProductList.mockResolvedValue([
      { productId: "prod-1", name: "Monitor" },
    ]);

    const list = await ProductDomainService.getUserProductList("user-1");

    expect(productRepositoryMock.getUserProductList).toHaveBeenCalledWith("user-1", undefined);
    expect(list).toEqual([{ productId: "prod-1", name: "Monitor" }]);
  });

  it("returns empty list when user id missing", async () => {
    const list = await ProductDomainService.getUserProductList("");
    expect(list).toEqual([]);
    expect(productRepositoryMock.getUserProductList).not.toHaveBeenCalled();
  });
});
