import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const domainServiceMock = {
  query: vi.fn(),
  addProduct: vi.fn(),
  deleteProduct: vi.fn(),
};

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/products/domainService", () => ({
  ProductDomainService: domainServiceMock,
}));

const { GET, POST } = await import("./route");

describe("/api/products route", () => {
  beforeEach(() => {
    authMock.mockReset();
    Object.values(domainServiceMock).forEach((fn) => (fn as vi.Mock).mockReset());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns product listings for authenticated users", async () => {
    authMock.mockResolvedValue({ userId: "user_123" });
    domainServiceMock.query.mockResolvedValue({ products: [{ id: "p1" }], pagination: {}, filters: {} });

    const request = new Request("http://localhost/api/products?category=sleep");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(domainServiceMock.query).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({ category: "sleep" }),
      }),
    );
    expect(body.products?.[0]?.id).toBe("p1");
  });

  it("rejects GET when the user is not signed in", async () => {
    authMock.mockResolvedValue({ userId: null });
    const request = new Request("http://localhost/api/products");

    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("creates a product and returns the service result", async () => {
    authMock.mockResolvedValue({ userId: "user_123" });
    domainServiceMock.addProduct.mockResolvedValue({ message: "Product created successfully" });

    const request = new Request("http://localhost/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Monitor", category: "monitoring" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(domainServiceMock.addProduct).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Monitor", category: "monitoring" }),
    );
    expect(body.message).toMatch(/Product created/);
  });

  it("propagates service errors with 500 status", async () => {
    authMock.mockResolvedValue({ userId: "user_123" });
    const error = new Error("Database unavailable");
    domainServiceMock.query.mockRejectedValue(error);

    const request = new Request("http://localhost/api/products");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to fetch products");
    expect(body.details).toBe("Database unavailable");
  });
});
