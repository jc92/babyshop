"use client";

import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { heroCopy } from "@/lib/copy/hero";
import { sectionNavItems } from "@/lib/navigation";
import { useDashboardData } from "@/hooks/useDashboardData";

export default function Home() {
  const { isLoaded, isSignedIn } = useDashboardData();

  const primaryCtaHref = isLoaded && isSignedIn ? "/overview" : "/overview";
  const secondaryCtaHref = isLoaded && isSignedIn ? "/curated" : "/curated";

  return (
    <div className="min-h-screen bg-[var(--baby-neutral-50)] text-[var(--dreambaby-text)]">
      <Navigation />

      <header className="relative overflow-hidden border-b border-[rgba(207,210,198,0.4)] pt-28">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white via-[rgba(229,239,255,0.4)] to-[rgba(252,245,233,0.6)]" />
        <div className="absolute -right-32 top-12 -z-10 hidden h-72 w-72 rounded-full bg-[rgba(161,180,192,0.18)] blur-3xl md:block" />

        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-14 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
          <div className="space-y-7">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--dreambaby-muted)] shadow-sm">
              {heroCopy.overline}
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-[var(--dreambaby-text)] sm:text-5xl">
              {heroCopy.title}
            </h1>
            <p className="text-lg leading-relaxed text-[var(--dreambaby-muted)]">
              {heroCopy.subtitle}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href={primaryCtaHref} className="dreambaby-button">
                {heroCopy.primaryCta.label}
              </Link>
              <Link href={secondaryCtaHref} className="dreambaby-button-secondary">
                {heroCopy.secondaryCta.label}
              </Link>
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-[var(--baby-neutral-200)] bg-white/90 p-6 shadow-[0_24px_60px_rgba(111,144,153,0.12)] backdrop-blur">
            <p className="text-sm font-semibold text-[var(--dreambaby-text)]">How it helps</p>
            <ul className="space-y-4 text-sm text-[var(--dreambaby-text)]">
              {heroCopy.proofPoints.map((point) => (
                <li key={point.title} className="flex gap-3">
                  <span className="mt-[6px] inline-flex size-2 rounded-full bg-[var(--baby-primary-500)]" aria-hidden />
                  <div className="space-y-1">
                    <p className="font-semibold">{point.title}</p>
                    <p className="text-[var(--dreambaby-muted)]">{point.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <section className="grid gap-6 rounded-3xl border border-[var(--baby-neutral-300)] bg-white p-8 shadow-sm md:grid-cols-3">
          {sectionNavItems.map((section) => (
            <article key={section.id} className="space-y-3">
              <h2 className="text-lg font-semibold text-[var(--dreambaby-text)]">{section.label}</h2>
              <p className="text-sm text-[var(--dreambaby-muted)]">
                {section.id === "overview"
                  ? "Track every milestone and know exactly what to prepare next."
                  : section.id === "curated"
                    ? "Compare AI-curated gear lists that match your budget and style."
                    : "Keep your family preferences, due dates, and caregiver notes in sync."}
              </p>
              <Link
                href={section.href}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--baby-primary-500)] hover:text-[var(--baby-primary-600)]"
              >
                Explore {section.label.toLowerCase()}
                <span aria-hidden>→</span>
              </Link>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
