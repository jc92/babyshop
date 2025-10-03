import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defaultMilestones, type ProductSummary } from "@/data/catalog";
import { useDashboardData } from "./useDashboardData";
import { useSafeUser } from "@/lib/clerkClient";
import { MilestoneService } from "@/lib/milestones/service";
import { ProductService } from "@/lib/products/service";

vi.mock("@/lib/clerkClient", () => ({
  useSafeUser: vi.fn(),
}));

vi.mock("@/lib/milestones/service", () => ({
  MilestoneService: {
    list: vi.fn(),
  },
}));

vi.mock("@/lib/products/service", () => ({
  ProductService: {
    listSummaries: vi.fn(),
  },
}));

function buildProduct(overrides: Partial<ProductSummary> = {}): ProductSummary {
  return {
    id: "prod-1",
    name: "Cozy Crib",
    brand: "DreamBaby",
    price: 199,
    category: "sleeping",
    milestoneIds: ["prenatal"],
    affiliateUrl: "https://example.com/crib",
    colors: ["white"],
    materials: ["pine"],
    isEcoFriendly: true,
    rating: 4.8,
    reviewSummary: "Parents love the build quality.",
    checklistNotes: "Fits standard nursery layouts.",
    ...overrides,
  } satisfies ProductSummary;
}

function jsonResponse(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("useDashboardData", () => {
  const mockUser = {
    id: "user_123",
    fullName: "Baby Prepper",
  } as unknown as ReturnType<typeof useSafeUser>["user"];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSafeUser).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      isSignedOut: false,
      user: mockUser,
    } as ReturnType<typeof useSafeUser>);

    vi.mocked(MilestoneService.list).mockResolvedValue(defaultMilestones.slice(0, 2));
    vi.mocked(ProductService.listSummaries).mockResolvedValue([buildProduct()]);

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { plan: {}, baby: {} } }));
    global.fetch = fetchMock as unknown as typeof global.fetch;
  });

  it("loads milestones, profile, and products for an authenticated user", async () => {
    const profileResponse = {
      data: {
        plan: {
          dueDate: "2024-02-10",
          budget: "premium",
          ecoPriority: true,
        },
        baby: {
          birthDate: "2023-12-01",
          nickname: "Sprout",
        },
      },
    };

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(profileResponse));
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const product = buildProduct({ rating: 4.2 });
    vi.mocked(ProductService.listSummaries).mockResolvedValue([product]);

    const sampleMilestones = defaultMilestones.slice(0, 2);
    vi.mocked(MilestoneService.list).mockResolvedValue(sampleMilestones);

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.milestonesLoading).toBe(false));
    await waitFor(() => expect(result.current.productsLoading).toBe(false));

    expect(fetchMock).toHaveBeenCalledWith("/api/profile", { method: "GET" });
    expect(result.current.timelineMilestones).toEqual(sampleMilestones);
    expect(result.current.profile.budget).toBe("premium");
    expect(result.current.profile.dueDate).toBe("2024-02-10");
    expect(result.current.babyProfile.nickname).toBe("Sprout");
    expect(result.current.babyProfile.birthDate).toBe("2023-12-01");

    expect(ProductService.listSummaries).toHaveBeenCalledTimes(1);
    expect(result.current.products).toEqual([product]);

    expect(result.current.activeMilestoneProducts).toHaveLength(1);
    expect(result.current.activeMilestoneProducts[0].id).toBe(product.id);

    expect(result.current.recommended.length).toBeGreaterThan(0);
  });

  it("toggles selected categories on demand", async () => {
    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.milestonesLoading).toBe(false));

    expect(result.current.selectedCategories).toContain("nursing");

    act(() => {
      result.current.handleToggleCategory("nursing");
    });
    expect(result.current.selectedCategories).not.toContain("nursing");

    act(() => {
      result.current.handleToggleCategory("nursing");
    });
    expect(result.current.selectedCategories).toContain("nursing");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("saves profile successfully and clears the status message", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: { plan: {}, baby: {} } }))
      .mockResolvedValueOnce(jsonResponse({ message: "saved" }));
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.milestonesLoading).toBe(false));
    await waitFor(() => expect(result.current.productsLoading).toBe(false));

    vi.useFakeTimers();

    await act(async () => {
      await result.current.handleSaveProfile();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.isSaving).toBe(false);
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/profile", expect.objectContaining({ method: "POST" }));
    expect(result.current.saveMessage).toBe("Profile saved");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(result.current.saveMessage).toBeNull();
  });

  it("handles save failures gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: { plan: {}, baby: {} } }))
      .mockResolvedValueOnce(
        jsonResponse({ error: "Server exploded" }, { status: 500, statusText: "Server Error" }),
      );

    global.fetch = fetchMock as unknown as typeof global.fetch;

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.milestonesLoading).toBe(false));
    await waitFor(() => expect(result.current.productsLoading).toBe(false));

    vi.useFakeTimers();

    await act(async () => {
      await result.current.handleSaveProfile();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.saveMessage).toBe("Unable to save profile right now");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    consoleSpy.mockRestore();
  });

  it("formats currency and truncates copy helpers", async () => {
    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.milestonesLoading).toBe(false));

    expect(result.current.formatCurrency(123.45)).toBe("$123");
    expect(result.current.formatCurrency(null)).toBe("—");

    const longNote = "a".repeat(160);
    expect(result.current.truncateText(longNote)).toHaveLength(141);
    expect(result.current.truncateText("short")).toBe("short");
  });
});
