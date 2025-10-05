import React from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const milestoneListMock = vi.hoisted(() => vi.fn());
const useSafeUserMock = vi.hoisted(() => vi.fn());

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

import { defaultMilestones } from "@/data/defaultMilestones";
import AiAdvisorChat, { __resetAdvisorChatCacheForTests } from "@/components/AiAdvisorChat";

describe("AiAdvisorChat", () => {
  beforeEach(() => {
    window.localStorage.clear();
    milestoneListMock.mockResolvedValue(defaultMilestones.slice(0, 2));
    useSafeUserMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      user: null,
    });
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ data: {} }) }));
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
    __resetAdvisorChatCacheForTests();
  });

  afterEach(() => {
    window.localStorage.clear();
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

  it("restores the last conversation for signed-in users", async () => {
    const storageKey = "nestlings:advisor-chat:user:user_123";
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        isOpen: true,
        inputValue: "",
        milestoneId: defaultMilestones[0].id,
        messages: [
          {
            id: "assistant-initial",
            role: "assistant",
            content: "Welcome back!",
          },
        ],
      }),
    );

    useSafeUserMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: { id: "user_123" },
    });

    render(<AiAdvisorChat />);

    expect(await screen.findByText("Welcome back!")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Ask Baby Advisor/i })).toBeNull();
  });

  it("reuses the in-memory cache across route-level remounts", async () => {
    const storageKey = "nestlings:advisor-chat:user:user_123";
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        isOpen: true,
        inputValue: "hello advisor",
        milestoneId: defaultMilestones[1].id,
        messages: [
          {
            id: "assistant-initial",
            role: "assistant",
            content: "Welcome back!",
          },
        ],
      }),
    );

    useSafeUserMock.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: { id: "user_123" },
    });

    const { unmount } = render(<AiAdvisorChat />);

    expect(await screen.findByText("Welcome back!")).toBeVisible();

    window.localStorage.clear();

    unmount();

    render(<AiAdvisorChat />);

    expect(await screen.findByText("Welcome back!")).toBeVisible();
  });
});
