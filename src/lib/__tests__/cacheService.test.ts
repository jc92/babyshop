import { afterEach, describe, expect, test, vi } from "vitest";
import { cacheService, withCache } from "@/lib/cacheService";

afterEach(() => {
  cacheService.clear();
  vi.useRealTimers();
});

describe("cacheService", () => {
  test("stores and retrieves values until ttl expires", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));

    cacheService.set("ttl", "value", 100);
    expect(cacheService.get("ttl")).toBe("value");

    vi.advanceTimersByTime(150);
    expect(cacheService.get("ttl")).toBeNull();
  });

  test("invalidateProductCache removes only product-prefixed keys", () => {
    cacheService.set("products:list", [1, 2, 3]);
    cacheService.set("misc:data", { ok: true });

    cacheService.invalidateProductCache();

    expect(cacheService.get("products:list")).toBeNull();
    expect(cacheService.get("misc:data")).toEqual({ ok: true });
  });
});

describe("withCache", () => {
  test("memoizes async function results by generated key", async () => {
    const worker = vi.fn(async (value: number) => value * 2);
    const cachedWorker = withCache(worker, (value: number) => `double:${value}`);

    await expect(cachedWorker(3)).resolves.toBe(6);
    await expect(cachedWorker(3)).resolves.toBe(6);
    await expect(cachedWorker(4)).resolves.toBe(8);

    expect(worker).toHaveBeenCalledTimes(2);
  });
});
