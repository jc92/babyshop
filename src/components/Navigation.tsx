"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { UserButton, SignInButton } from "@clerk/nextjs";
import { sectionNavItems } from "@/lib/navigation";
import { clerkEnabled, useSafeUser } from "@/lib/clerkClient";

export function Navigation() {
  const { isLoaded, isSignedIn, user } = useSafeUser();
  const pathname = usePathname();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 48);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleNavigate = (href: string) => {
    setMobileOpen(false);
    router.push(href);
  };

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 border-b transition-all duration-300 ${
        isScrolled
          ? "border-[rgba(161,180,192,0.35)] bg-white/80 backdrop-blur"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-semibold text-[var(--dreambaby-text)]"
          onClick={() => handleNavigate("/")}
        >
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[var(--baby-primary-200)] to-[var(--baby-secondary-200)] text-sm font-bold text-[var(--dreambaby-text)]">
            BB
          </span>
          <span className="hidden sm:block">Nestlings Planner</span>
        </button>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {sectionNavItems.map((section) => {
            const active = isActive(section.href);
            const emphasizeProfile = section.id === "profile";
            const profileBadgeLabel = isSignedIn ? "Update" : "Start here";
            const buttonClasses = `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              active
                ? "bg-[var(--baby-primary-100)] text-[var(--dreambaby-text)]"
                : emphasizeProfile
                  ? "border border-[var(--baby-primary-200)] bg-[var(--baby-primary-50)] text-[var(--baby-primary-700)] hover:border-[var(--baby-primary-300)]"
                  : "text-[var(--dreambaby-muted)] hover:bg-[var(--baby-neutral-50)] hover:text-[var(--dreambaby-text)]"
            }`;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => handleNavigate(section.href)}
                aria-current={active ? "page" : undefined}
                className={buttonClasses}
              >
                <span>{section.label}</span>
                {emphasizeProfile && !active && (
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--baby-primary-600)]">
                    {profileBadgeLabel}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {!isSignedIn && (
            <button
              type="button"
              className="hidden rounded-full border border-[var(--baby-primary-200)] bg-white px-4 py-2 text-sm font-semibold text-[var(--baby-primary-600)] shadow-sm transition hover:border-[var(--baby-primary-300)] hover:bg-[var(--baby-primary-50)] md:block"
              onClick={() => handleNavigate("/onboarding")}
            >
              Start onboarding
            </button>
          )}
          {clerkEnabled ? (
            isSignedIn ? (
              isLoaded ? (
                <>
                  <button
                    type="button"
                    className="hidden rounded-full bg-[var(--baby-primary-500)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--baby-primary-600)] md:block"
                    onClick={() => handleNavigate("/profile")}
                  >
                    Manage profile
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="hidden text-sm font-medium text-[var(--dreambaby-muted)] md:inline">
                      {user?.firstName ? `Hi, ${user.firstName}` : "Account"}
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
                </>
              ) : null
            ) : isLoaded ? (
              <SignInButton
                mode="modal"
                afterSignInUrl="/overview"
                afterSignUpUrl="/onboarding"
              >
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
            )
          ) : (
            <button
              type="button"
              disabled
              className="hidden rounded-full bg-[var(--baby-neutral-300)] px-4 py-2 text-sm font-semibold text-white shadow-sm md:block"
            >
              Sign-in unavailable
            </button>
          )}

          <button
            type="button"
            className="md:hidden rounded-full border border-[var(--baby-neutral-300)] px-3 py-1.5 text-sm font-medium text-[var(--dreambaby-text)]"
            onClick={() => setMobileOpen((previous) => !previous)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label="Toggle navigation"
          >
            Menu
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          id="mobile-nav"
          className="border-t border-[var(--baby-neutral-300)] bg-white/95 px-6 pb-6 pt-4 md:hidden"
        >
          <nav className="flex flex-col gap-2 text-sm" aria-label="Mobile">
            {sectionNavItems.map((section) => {
              const active = isActive(section.href);
              const emphasizeProfile = section.id === "profile";
              const profileBadgeLabel = isSignedIn ? "Update" : "Start here";
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => handleNavigate(section.href)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center justify-between rounded-lg border px-4 py-2 font-medium transition ${
                    active
                      ? "border-[var(--baby-primary-200)] bg-[var(--baby-primary-50)] text-[var(--dreambaby-text)]"
                      : emphasizeProfile
                        ? "border-[var(--baby-primary-200)] bg-[var(--baby-primary-50)] text-[var(--baby-primary-700)]"
                        : "border-transparent text-[var(--dreambaby-muted)] hover:border-[var(--baby-neutral-300)] hover:bg-[var(--baby-neutral-50)] hover:text-[var(--dreambaby-text)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {section.label}
                    {emphasizeProfile && !active && (
                      <span className="rounded-full bg-[var(--baby-primary-100)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--baby-primary-600)]">
                        {profileBadgeLabel}
                      </span>
                    )}
                  </span>
                  <span aria-hidden="true">→</span>
                </button>
              );
            })}
          </nav>
          {!isSignedIn && (
            <button
              type="button"
              className="mt-4 w-full rounded-full bg-[var(--baby-primary-500)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--baby-primary-600)]"
              onClick={() => handleNavigate("/onboarding")}
            >
              Start onboarding
            </button>
          )}
          {clerkEnabled ? (
            isSignedIn ? (
              isLoaded ? (
                <div className="mt-5 flex items-center justify-between rounded-2xl border border-[var(--baby-neutral-300)] bg-[var(--baby-neutral-50)] px-4 py-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--dreambaby-muted)]">
                      Signed in
                    </p>
                    <p className="text-sm font-medium text-[var(--dreambaby-text)]">
                      {user?.firstName || user?.primaryEmailAddress?.emailAddress || "Account"}
                    </p>
                  </div>
                  <UserButton afterSignOutUrl="/" />
                </div>
              ) : null
            ) : isLoaded ? (
              <div className="mt-5">
                <SignInButton
                  mode="modal"
                  afterSignInUrl="/overview"
                  afterSignUpUrl="/onboarding"
                >
                  <button className="w-full rounded-full bg-[var(--baby-primary-500)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--baby-primary-600)]">
                    Sign in / create account
                  </button>
                </SignInButton>
              </div>
            ) : (
              <p className="mt-5 text-xs text-[var(--dreambaby-muted)]">
                Preparing sign-in…
              </p>
            )
          ) : (
            <p className="mt-5 text-xs text-[var(--dreambaby-muted)]">
              Sign-in is disabled in this build.
            </p>
          )}
        </div>
      )}
    </header>
  );
}
