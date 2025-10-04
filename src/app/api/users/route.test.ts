import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const sqlMock = vi.hoisted(() => vi.fn(async () => ({ rows: [] })));
const isAdminUserMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@vercel/postgres", () => ({
  sql: sqlMock,
}));

vi.mock("@/lib/auth/admin", () => ({
  isAdminUser: isAdminUserMock,
}));

const { GET, DELETE } = await import("./route");

describe("/api/users route", () => {
  beforeEach(() => {
    authMock.mockReset();
    sqlMock.mockReset();
    isAdminUserMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects GET when unauthenticated", async () => {
    authMock.mockResolvedValue({ userId: null });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("forbids GET for non-admin users", async () => {
    authMock.mockResolvedValue({ userId: "user_123" });
    isAdminUserMock.mockReturnValue(false);

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
  });

  it("returns user profiles when tables exist", async () => {
    authMock.mockResolvedValue({ userId: "admin_1" });
    isAdminUserMock.mockReturnValue(true);
    sqlMock.mockResolvedValueOnce({
      rows: [
        {
          user_id: "admin_1",
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-02T00:00:00.000Z",
          due_date: "2024-06-01",
          budget_tier: "balanced",
          baby_gender: "surprise",
          baby_nickname: "Sprout",
          hospital: "City Hospital",
        },
      ],
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.users[0].budget).toBeNull();
    expect(body.current_user).toBe("admin_1");
  });

  it("falls back to legacy table when user_profiles is missing", async () => {
    authMock.mockResolvedValue({ userId: "admin_1" });
    isAdminUserMock.mockReturnValue(true);

    const missingTableError = new Error("relation \"user_profiles\" does not exist");
    sqlMock.mockRejectedValueOnce(missingTableError);
    sqlMock.mockResolvedValueOnce({ rows: [{ user_id: "legacy", created_at: "2023", updated_at: "2023" }] });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.users[0].user_id).toBe("legacy");
  });

  it("clears user data on DELETE for admins", async () => {
    authMock.mockResolvedValue({ userId: "admin_1" });
    isAdminUserMock.mockReturnValue(true);

    const response = await DELETE();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toMatch(/All user data cleared/);
  });
});
