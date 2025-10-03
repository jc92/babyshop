import { beforeEach, describe, expect, it, vi } from "vitest";

import { MilestoneService } from "@/lib/milestones/service";

function jsonResponse(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("MilestoneService.list", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns milestones when the API responds with a bare array", async () => {
    const payload = [
      { id: "prenatal", label: "Prenatal" },
      { id: "newborn", label: "Newborn" },
    ];

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(payload));
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const result = await MilestoneService.list();

    expect(fetchMock).toHaveBeenCalledWith("/api/milestones", { method: "GET" });
    expect(result).toEqual(payload);
  });

  it("uses the data envelope when provided", async () => {
    const payload = { data: [{ id: "prenatal", label: "Prenatal" }] };
    global.fetch = vi.fn().mockResolvedValue(jsonResponse(payload)) as unknown as typeof fetch;

    const result = await MilestoneService.list();

    expect(result).toEqual(payload.data);
  });

  it("returns an empty array when the payload is unexpected", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ unexpected: true })) as unknown as typeof fetch;

    const result = await MilestoneService.list();

    expect(result).toEqual([]);
  });

  it("throws when the response is not ok", async () => {
    const response = jsonResponse({ error: "nope" }, { status: 500, statusText: "Server Error" });
    global.fetch = vi.fn().mockResolvedValue(response) as unknown as typeof fetch;

    await expect(MilestoneService.list()).rejects.toThrow("nope");
  });
});
