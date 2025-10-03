import { describe, expect, it, vi } from "vitest";

const { getMilestonesMock } = vi.hoisted(() => ({
  getMilestonesMock: vi.fn(),
}));

vi.mock("@/lib/milestones/repository", () => ({
  getMilestones: getMilestonesMock,
}));

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

  it("returns a 500 error when the repository throws", async () => {
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
