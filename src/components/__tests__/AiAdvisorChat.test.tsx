import React from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const milestoneListMock = vi.hoisted(() => vi.fn());
const useSafeUserMock = vi.hoisted(() => vi.fn());

vi.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("remark-gfm", () => ({
  default: () => null,
}));

vi.mock("@clerk/nextjs", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  const { createElement, Fragment } = ReactModule;
  return {
    SignInButton: ({ children }: { children?: React.ReactNode }) =>
      createElement(Fragment, null, children ?? null),
  };
});

vi.mock("@/lib/milestones/service", () => ({
  MilestoneService: {
    list: milestoneListMock,
  },
}));

vi.mock("@/lib/clerkClient", () => ({
  clerkEnabled: true,
  useSafeUser: useSafeUserMock,
}));

import { defaultMilestones } from "@/data/catalog";
import AiAdvisorChat from "@/components/AiAdvisorChat";

describe("AiAdvisorChat", () => {
  beforeEach(() => {
    milestoneListMock.mockResolvedValue(defaultMilestones.slice(0, 2));
    useSafeUserMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      user: null,
    });
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("renders the proactive prompt bubble while closed", async () => {
    render(<AiAdvisorChat />);

    expect(await screen.findByText(/Need help building your registry/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /Ask Baby Advisor/i })).toHaveAttribute(
      "aria-label",
      expect.stringContaining("Need help building your registry"),
    );
    expect(milestoneListMock).toHaveBeenCalled();
  });

  it("opens the advisor panel and hides the prompt bubble", async () => {
    render(<AiAdvisorChat />);
    const user = userEvent.setup({ delay: null });

    const toggleButton = await screen.findByRole("button", { name: /Ask Baby Advisor/i });
    await user.click(toggleButton);

    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText(/Sign in to chat with the advisor/i)).toBeVisible();
  });

  it("rotates the prompt copy over time", async () => {
    vi.useFakeTimers();
    render(<AiAdvisorChat />);

    const initial = screen.getByRole("status");
    expect(initial).toHaveTextContent(/Need help building your registry/i);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(7000);
    });

    const updated = screen.getByRole("status");
    expect(updated.textContent).not.toBe(initial.textContent);
  });
});
