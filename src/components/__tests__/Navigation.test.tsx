import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
}));

const navigationState = vi.hoisted(() => ({
  pathname: "/overview",
  clerkEnabled: true,
  useSafeUser: vi.fn(),
  authSnapshot: {
    isSignedIn: false,
    isLoaded: true,
    firstName: null as string | null,
    email: null as string | null,
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
  useRouter: () => routerMock,
}));

vi.mock("@clerk/nextjs", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  const { createElement, Fragment } = ReactModule;
  return {
    SignInButton: ({ children }: { children?: React.ReactNode }) =>
      createElement(Fragment, null, children ?? null),
    UserButton: (props: { afterSignOutUrl?: string }) =>
      createElement("div", {
        "data-testid": "user-button",
        "data-after-sign-out": props.afterSignOutUrl,
      }),
  };
});

vi.mock("@/lib/clerkClient", () => ({
  get clerkEnabled() {
    return navigationState.clerkEnabled;
  },
  useSafeUser: navigationState.useSafeUser,
}));

vi.mock("@/components/navigation/AuthControls", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  const { useEffect } = ReactModule;

  const AuthControls = ({
    onNavigate,
    onAuthStateChange,
  }: {
    onNavigate: (href: string) => void;
    onAuthStateChange?: (snapshot: unknown) => void;
  }) => {
    const snapshot = navigationState.authSnapshot;

    useEffect(() => {
      onAuthStateChange?.(snapshot);
    }, [snapshot, onAuthStateChange]);

    return (
      <div data-testid="auth-controls">
        {snapshot.isSignedIn ? (
          <>
            <span>Hi, {snapshot.firstName ?? "Account"}</span>
            <div data-testid="user-button" />
          </>
        ) : (
          <button type="button">Sign in / create account</button>
        )}
      </div>
    );
  };

  return { AuthControls };
});

import { Navigation } from "@/components/Navigation";

describe("Navigation", () => {
  beforeEach(() => {
    routerMock.push.mockClear();
    navigationState.useSafeUser.mockReset();
    navigationState.pathname = "/overview";
    navigationState.clerkEnabled = true;
    navigationState.authSnapshot = {
      isSignedIn: false,
      isLoaded: true,
      firstName: null,
      email: null,
    };
  });

  it("renders signed-in controls when the user is authenticated", async () => {
    navigationState.useSafeUser.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: { firstName: "Jamie" },
    });
    navigationState.authSnapshot = {
      isSignedIn: true,
      isLoaded: true,
      firstName: "Jamie",
      email: "jamie@example.com",
    };

    render(<Navigation />);

    expect(await screen.findByText("Hi, Jamie")).toBeVisible();
    expect(screen.getByTestId("user-button")).toBeInTheDocument();
  });

  it("renders a sign-in call to action when the user is signed out", async () => {
    navigationState.useSafeUser.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      user: null,
    });
    navigationState.authSnapshot = {
      isSignedIn: false,
      isLoaded: true,
      firstName: null,
      email: null,
    };

    render(<Navigation />);

    expect(await screen.findAllByText("Sign in / create account")).not.toHaveLength(0);
  });

  it("toggles the mobile navigation", async () => {
    navigationState.useSafeUser.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      user: null,
    });
    navigationState.authSnapshot = {
      isSignedIn: false,
      isLoaded: true,
      firstName: null,
      email: null,
    };

    render(<Navigation />);

    const user = userEvent.setup();
    const toggle = screen.getByRole("button", { name: "Toggle navigation" });
    expect(screen.queryByRole("navigation", { name: "Mobile" })).toBeNull();

    await user.click(toggle);
    const mobileNav = screen.getByRole("navigation", { name: "Mobile" });
    expect(mobileNav).toBeVisible();

    await user.click(within(mobileNav).getByRole("button", { name: /Overview/ }));
    expect(routerMock.push).toHaveBeenCalledWith("/overview");
  });
});
