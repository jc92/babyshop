"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { sectionNavItems } from "@/lib/navigation";
import type { AuthSnapshot } from "@/components/navigation/AuthControls";

const AuthControls = dynamic(() => import("@/components/navigation/AuthControls").then((mod) => mod.AuthControls), {
  ssr: false,
  loading: () => (
    <div className="flex items-center gap-3" aria-hidden>
      <span className="hidden h-9 w-24 rounded-full bg-[var(--baby-neutral-200)] md:block" />
    </div>
  ),
});

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authSnapshot, setAuthSnapshot] = useState<AuthSnapshot>({
    isLoaded: false,
    isSignedIn: false,
    firstName: null,
    email: null,
  });

  const handleAuthSnapshot = useCallback((snapshot: AuthSnapshot) => {
    setAuthSnapshot((previous) => {
      if (
        previous.isLoaded === snapshot.isLoaded &&
        previous.isSignedIn === snapshot.isSignedIn &&
        previous.firstName === snapshot.firstName &&
        previous.email === snapshot.email
      ) {
        return previous;
      }
      return snapshot;
    });
  }, []);

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
            NP
          </span>
          <span className="hidden sm:block">Nestlings Planner</span>
        </button>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {sectionNavItems.map((section) => {
            const active = isActive(section.href);
            const emphasizeProfile = section.id === "profile";
            const profileBadgeLabel = authSnapshot.isSignedIn ? "Update" : "Start here";
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
          <AuthControls
            onNavigate={handleNavigate}
            onAuthStateChange={handleAuthSnapshot}
          />
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
              const profileBadgeLabel = authSnapshot.isSignedIn ? "Update" : "Start here";
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
          <AuthControls
            variant="mobile"
            onNavigate={handleNavigate}
            onAuthStateChange={handleAuthSnapshot}
          />
        </div>
      )}
    </header>
  );
}
