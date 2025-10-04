import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const isAdminMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/auth/admin", () => ({
  isAdminUser: isAdminMock,
}));

const { default: AdminV2Page } = await import("@/app/admin-v2/page");

describe("Admin v2 page", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("shows an unavailable message when Clerk is not configured", async () => {
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    delete process.env.CLERK_SECRET_KEY;

    const view = await AdminV2Page();
    render(view);

    expect(screen.getByRole("heading", { name: /Admin console unavailable/i })).toBeVisible();
  });
});
