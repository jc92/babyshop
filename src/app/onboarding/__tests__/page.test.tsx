import React from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/Navigation", () => ({
  Navigation: () => <nav aria-label="Primary" />,
}));

vi.mock("@clerk/nextjs", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  const { createElement, Fragment } = ReactModule;
  const passthrough = ({ children }: { children?: React.ReactNode }) =>
    createElement(Fragment, null, children ?? null);
  return {
    SignInButton: passthrough,
    SignUpButton: passthrough,
  };
});

vi.mock("@/lib/clerkClient", () => ({
  clerkEnabled: true,
  useSafeUser: () => ({ isSignedIn: false, isLoaded: true, user: null }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

describe("OnboardingPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("enforces required basics before moving forward", async () => {
    const { default: OnboardingPage } = await import("@/app/onboarding/page");
    const user = userEvent.setup();

    render(<OnboardingPage />);

    expect(screen.getByRole("heading", { name: /baby basics/i })).toBeVisible();

    const continueButton = screen.getByRole("button", { name: /continue/i });
    expect(continueButton).toBeDisabled();

    await user.type(screen.getByLabelText(/Baby nickname/i), "Sprout");
    await user.type(screen.getByLabelText(/Due date/i), "2025-05-15");

    expect(continueButton).toBeEnabled();

    await user.click(continueButton);

    expect(await screen.findByRole("heading", { name: /plan preferences/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /continue/i })).toBeEnabled();
  });

  it("reaches the review step and enables account creation", async () => {
    const { default: OnboardingPage } = await import("@/app/onboarding/page");
    const user = userEvent.setup();

    render(<OnboardingPage />);

    await user.type(screen.getByLabelText(/Baby nickname/i), "Sprout");
    await user.type(screen.getByLabelText(/Due date/i), "2025-05-15");

    // Step 1 → 2
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // Step 2 uses defaults; advance.
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // Step 3 is optional care team; advance.
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByRole("heading", { name: /Home setup/i })).toBeVisible();

    const createAccountButton = screen.getByRole("button", { name: /Create my account/i });
    expect(createAccountButton).toBeEnabled();

    await act(async () => {
      await user.click(createAccountButton);
    });

    expect(screen.getByText(/Preview/i)).toBeVisible();
    expect(screen.getByText(/Sprout · Arriving/i)).toBeInTheDocument();
  });
});
