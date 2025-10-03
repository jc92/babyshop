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

import { Navigation } from "@/components/Navigation";

describe("Navigation", () => {
  beforeEach(() => {
    routerMock.push.mockClear();
    navigationState.useSafeUser.mockReset();
    navigationState.pathname = "/overview";
    navigationState.clerkEnabled = true;
  });

  it("renders signed-in controls when the user is authenticated", () => {
    navigationState.useSafeUser.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: { firstName: "Jamie" },
    });

    render(<Navigation />);

    expect(screen.getByText("Manage profile")).toBeVisible();
    expect(screen.getByText("Hi, Jamie")).toBeVisible();
    expect(screen.getByTestId("user-button")).toBeInTheDocument();
  });

  it("renders a sign-in call to action when the user is signed out", () => {
    navigationState.useSafeUser.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      user: null,
    });

    render(<Navigation />);

    expect(screen.getAllByText("Sign in / create account")).not.toHaveLength(0);
  });

  it("toggles the mobile navigation", async () => {
    navigationState.useSafeUser.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      user: null,
    });

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
