import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const sqlMock = vi.hoisted(() =>
  vi.fn(async (strings: TemplateStringsArray) => {
    const query = strings.join(" ");

    if (query.includes("FROM user_profiles")) {
      return {
        rows: [
          {
            user_id: "user_123",
            due_date: "2025-05-15",
            baby_gender: "surprise",
            budget_tier: "balanced",
            color_palette: "neutral",
            material_focus: "organic",
            eco_priority: true,
            location: "Brooklyn",
            baby_name: "Juniper",
            baby_nickname: "Juni",
            hospital: null,
            provider: null,
            household_setup: "Apartment",
            care_network: "Parents only",
            medical_notes: null,
            birth_date: null,
            parent_one_name: "Alex",
            parent_two_name: "Taylor",
            created_at: "2024-01-01T00:00:00.000Z",
            updated_at: "2024-01-02T00:00:00.000Z",
          },
        ],
      };
    }

    if (query.includes("FROM profile_overviews")) {
      return { rows: [] };
    }

    return { rows: [] };
  }),
);

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@vercel/postgres", () => ({
  sql: sqlMock,
}));

const { GET, POST } = await import("./route");

describe("/api/profile route", () => {
  beforeEach(() => {
    authMock.mockReset();
    sqlMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects GET requests without an authenticated user", async () => {
    authMock.mockResolvedValue({ userId: null });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns the persisted profile for the signed-in user", async () => {
    authMock.mockResolvedValue({ userId: "user_123" });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.plan.dueDate).toBe("2025-05-15");
    expect(body.data.baby.nickname).toBe("Juni");
    expect(sqlMock).toHaveBeenCalled();
  });

  it("rejects POST requests when unauthenticated", async () => {
    authMock.mockResolvedValue({ userId: null });

    const request = new Request("http://localhost/api/profile", {
      method: "POST",
      body: JSON.stringify({ plan: {}, baby: {} }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("persists profile details for the authenticated user", async () => {
    authMock.mockResolvedValue({ userId: "user_123" });

    const payload = {
      plan: {
        dueDate: "2025-05-15",
        budget: "balanced",
        ecoPriority: true,
      },
      baby: {
        nickname: "Sprout",
      },
    };

    const request = new Request("http://localhost/api/profile", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "saved" });
    expect(sqlMock).toHaveBeenCalled();
  });
});
