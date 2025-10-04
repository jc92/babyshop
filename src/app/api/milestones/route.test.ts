import { describe, expect, it, vi } from "vitest";

const { getMilestonesMock } = vi.hoisted(() => ({
  getMilestonesMock: vi.fn(),
}));

vi.mock("@/lib/milestones/repository", async () => {
  const actual = await vi.importActual<typeof import("@/lib/milestones/repository")>(
    "@/lib/milestones/repository",
  );
  return {
    ...actual,
    getMilestones: getMilestonesMock,
  };
});

import { GET } from "./route";

describe("GET /api/milestones", () => {
  it("returns milestone data when the repository succeeds", async () => {
    const milestones = [{ id: "prenatal", label: "Prenatal" }];
    getMilestonesMock.mockResolvedValue(milestones);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ data: milestones });
  });

  it("returns a 503 when milestone table is missing", async () => {
    const { MilestonesTableMissingError } = await vi.importActual<typeof import("@/lib/milestones/repository")>(
      "@/lib/milestones/repository",
    );
    getMilestonesMock.mockRejectedValue(new MilestonesTableMissingError("Seed milestones"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("Milestones are not seeded");
  });

  it("returns a 500 error when an unknown error occurs", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getMilestonesMock.mockRejectedValue(new Error("Database offline"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to fetch milestones");
    expect(body.details).toBe("Database offline");

    consoleSpy.mockRestore();
  });
});
