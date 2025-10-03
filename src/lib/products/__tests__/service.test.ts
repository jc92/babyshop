import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { toProductSummariesMock } = vi.hoisted(() => ({
  toProductSummariesMock: vi.fn(),
}));

vi.mock("@/lib/mappers/productMapper", () => ({
  toProductSummaries: toProductSummariesMock,
}));

import { ProductService } from "@/lib/products/service";

function jsonResponse(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("ProductService", () => {
  beforeEach(() => {
    toProductSummariesMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("serializes query options into request parameters", async () => {
    const responsePayload = { products: [], pagination: { total: 0 } };
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(jsonResponse(responsePayload));
    global.fetch = fetchSpy as unknown as typeof global.fetch;

    const options = {
      page: 2,
      limit: 12,
      sortBy: "price",
      sortOrder: "asc",
      includeReviews: true,
      filters: {
        category: "sleeping",
        ageMonths: 4,
        ecoFriendly: true,
        milestoneIds: ["prenatal", "newborn"],
      },
    } as const;

    const result = await ProductService.query(options);

    expect(result).toEqual(responsePayload);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const requestedUrl = new URL(fetchSpy.mock.calls[0][0] as string, "https://example.com");
    expect(requestedUrl.pathname).toBe("/api/products");
    expect(requestedUrl.searchParams.get("page")).toBe("2");
    expect(requestedUrl.searchParams.get("limit")).toBe("12");
    expect(requestedUrl.searchParams.get("category")).toBe("sleeping");
    expect(requestedUrl.searchParams.get("milestoneIds")).toBe("prenatal,newborn");
    expect(requestedUrl.searchParams.get("includeReviews")).toBe("true");
  });

  it("maps list summaries through the adapter", async () => {
    const backendProducts = [{ id: "prod_1" }];
    const summaries = [{ id: "prod_1", name: "Adapter" }];

    toProductSummariesMock.mockReturnValue(summaries);

    global.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ products: backendProducts })) as unknown as typeof fetch;

    const result = await ProductService.listSummaries();

    expect(toProductSummariesMock).toHaveBeenCalledWith(backendProducts);
    expect(result).toEqual(summaries);
  });

  it("throws with API error payload when the request fails", async () => {
    const failingResponse = jsonResponse({ error: "Invalid request" }, {
      status: 422,
      statusText: "Unprocessable Entity",
    });
    global.fetch = vi.fn().mockResolvedValue(failingResponse) as unknown as typeof fetch;

    await expect(ProductService.query()).rejects.toThrow("Invalid request");
  });

  it("posts new products and returns the created record", async () => {
    const payload = { name: "Travel System" };
    const created = { message: "created", product: { id: "prod_9" } };
    global.fetch = vi.fn().mockResolvedValue(jsonResponse(created)) as unknown as typeof fetch;

    const result = await ProductService.addProduct(payload);

    expect(global.fetch).toHaveBeenCalledWith("/api/products", expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }));
    expect(result).toEqual(created);
  });

  it("submits add-from-url payloads to the correct endpoint", async () => {
    const payload = { sourceUrl: "https://example.com", milestoneId: "prenatal" };
    const response = { message: "queued", productId: "p_1", product: { id: "p_1" } };
    global.fetch = vi.fn().mockResolvedValue(jsonResponse(response)) as unknown as typeof fetch;

    const result = await ProductService.addProductFromUrl(payload);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/products/add-from-url",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
    expect(result).toEqual(response);
  });

  it("deletes products by id", async () => {
    const response = { message: "deleted", id: "prod_7" };
    global.fetch = vi.fn().mockResolvedValue(jsonResponse(response)) as unknown as typeof fetch;

    const result = await ProductService.deleteProduct("prod_7");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/products?id=prod_7",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(result).toEqual(response);
  });
});
