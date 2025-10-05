"use client";

import { useEffect } from "react";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { clerkEnabled, useSafeUser } from "@/lib/clerkClient";

type AuthSnapshot = {
  isSignedIn: boolean;
  isLoaded: boolean;
  firstName: string | null;
  email: string | null;
};

type AuthControlsProps = {
  onNavigate: (href: string) => void;
  onAuthStateChange?: (snapshot: AuthSnapshot) => void;
  variant?: "desktop" | "mobile";
};

export function AuthControls({ onNavigate, onAuthStateChange, variant = "desktop" }: AuthControlsProps) {
  const { isLoaded, isSignedIn, user } = useSafeUser();
  const loaded = Boolean(isLoaded);
  const signedIn = Boolean(isSignedIn && loaded);
  const firstName = user?.firstName ?? null;
  const email = user?.primaryEmailAddress?.emailAddress ?? null;

  useEffect(() => {
    onAuthStateChange?.({
      isLoaded: loaded,
      isSignedIn: signedIn,
      firstName,
      email,
    });
  }, [email, firstName, loaded, signedIn, onAuthStateChange]);

  if (!clerkEnabled) {
    if (variant === "desktop") {
      return (
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled
            className="hidden rounded-full bg-[var(--baby-neutral-300)] px-4 py-2 text-sm font-semibold text-white shadow-sm md:block"
          >
            Sign-in unavailable
          </button>
        </div>
      );
    }

    return (
      <p className="mt-5 text-xs text-[var(--dreambaby-muted)]">
        Sign-in is disabled in this build.
      </p>
    );
  }

  if (variant === "mobile") {
    return (
      <div className="mt-4 space-y-5">
        {!signedIn && (
          <button
            type="button"
            className="w-full rounded-full bg-[var(--baby-primary-500)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--baby-primary-600)]"
            onClick={() => onNavigate("/onboarding")}
          >
            Start onboarding
          </button>
        )}

        {signedIn ? (
          loaded ? (
            <div className="flex items-center justify-between rounded-2xl border border-[var(--baby-neutral-300)] bg-[var(--baby-neutral-50)] px-4 py-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--dreambaby-muted)]">
                  Signed in
                </p>
                <p className="text-sm font-medium text-[var(--dreambaby-text)]">
                  {firstName || email || "Account"}
                </p>
              </div>
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-9 h-9 border border-[var(--baby-neutral-300)]",
                  },
                }}
              />
            </div>
          ) : (
            <p className="text-xs text-[var(--dreambaby-muted)]">Preparing sign-in…</p>
          )
        ) : loaded ? (
          <SignInButton mode="modal">
            <button className="w-full rounded-full bg-[var(--baby-primary-500)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--baby-primary-600)]">
              Sign in / create account
            </button>
          </SignInButton>
        ) : (
          <p className="text-xs text-[var(--dreambaby-muted)]">Preparing sign-in…</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {!signedIn && (
        <button
          type="button"
          className="hidden rounded-full border border-[var(--baby-primary-200)] bg-white px-4 py-2 text-sm font-semibold text-[var(--baby-primary-600)] shadow-sm transition hover:border-[var(--baby-primary-300)] hover:bg-[var(--baby-primary-50)] md:block"
          onClick={() => onNavigate("/onboarding")}
        >
          Start onboarding
        </button>
      )}

      {signedIn ? (
        loaded ? (
          <div className="flex items-center gap-2">
            <span className="hidden text-sm font-medium text-[var(--dreambaby-muted)] md:inline">
              {firstName ? `Hi, ${firstName}` : "Account"}
            </span>
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9 border border-[var(--baby-neutral-300)]",
                },
              }}
            />
          </div>
        ) : null
      ) : loaded ? (
        <SignInButton mode="modal">
          <button
            type="button"
            className="hidden rounded-full bg-[var(--baby-primary-500)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--baby-primary-600)] md:block"
          >
            Sign in / create account
          </button>
        </SignInButton>
      ) : (
        <button
          type="button"
          disabled
          className="hidden rounded-full bg-[var(--baby-neutral-300)] px-4 py-2 text-sm font-semibold text-white shadow-sm md:block"
        >
          Preparing sign-in…
        </button>
      )}
    </div>
  );
}

export type { AuthSnapshot };
