import Image from "next/image";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { TrustCarousel } from "@/components/TrustCarousel";
import { heroCopy } from "@/lib/copy/hero";
import { trustSafeguards } from "@/lib/copy/trust";

const howItWorksSteps = [
  {
    title: "Answer a quick profile",
    description: "Share your due date, budget, and vibe—our agent tunes the plan in under two minutes.",
  },
  {
    title: "Preview each milestone",
    description: "See what to prep, swap, or skip before every developmental window arrives.",
  },
  {
    title: "Lock picks with confidence",
    description: "Compare curated gear, sustainability notes, and caregiver tips without endless tabs.",
  },
];

const userFeatureHighlights = [
  {
    title: "Timeline that adapts",
    description: "We auto-shift milestones based on due date or birth date so reminders land exactly when you need them.",
    emoji: "🗓️",
  },
  {
    title: "Personalized gear scoring",
    description: "Budget tier, eco preferences, and caregiver notes shape the AI rankings you see in curated lists.",
    emoji: "✨",
  },
  {
    title: "Care team friendly",
    description: "Export product picks, medical notes, and care routines to share with partners, doulas, or grandparents in seconds.",
    emoji: "🤝",
  },
  {
    title: "Always in stock",
    description: "We track availability and price movement so you only pin items that can ship when you’re ready.",
    emoji: "📦",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--baby-neutral-50)] text-[var(--dreambaby-text)]">
      <Navigation />

      <div>
        <header className="relative overflow-hidden border-b border-[rgba(207,210,198,0.4)] bg-white/95 pt-28 shadow-[0_16px_40px_rgba(111,144,153,0.12)] backdrop-blur">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white via-[rgba(229,239,255,0.35)] to-[rgba(252,245,233,0.5)]" />
          <div className="absolute -right-32 top-12 -z-10 hidden h-72 w-72 rounded-full bg-[rgba(161,180,192,0.18)] blur-3xl md:block" />

          <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 pb-14 pt-10 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start lg:gap-16">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--dreambaby-muted)] shadow-sm">
                {heroCopy.overline}
              </span>
              <h1 className="text-4xl font-semibold tracking-tight text-[var(--dreambaby-text)] sm:text-5xl">
                {heroCopy.title}
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-[var(--dreambaby-muted)]">
                {heroCopy.subtitle}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href={heroCopy.primaryCta.href} className="dreambaby-button">
                  <span>{heroCopy.primaryCta.label}</span>
                  <span aria-hidden>→</span>
                </Link>
                <Link href={heroCopy.secondaryCta.href} className="dreambaby-button-secondary">
                  <span>{heroCopy.secondaryCta.label}</span>
                  <span aria-hidden>↗</span>
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="rounded-3xl border border-[var(--baby-neutral-200)] bg-white/95 p-6 shadow-[0_16px_40px_rgba(111,144,153,0.1)] backdrop-blur lg:p-10">
                <p className="text-sm font-semibold uppercase tracking-wide text-[var(--dreambaby-muted)]">
                  We tackle these headaches
                </p>
                <div className="mt-6 grid gap-4">
                  {heroCopy.proofPoints.map((point) => (
                    <div
                      key={point.title}
                      className="flex items-start gap-3 rounded-2xl border border-[rgba(111,144,153,0.14)] bg-white/92 px-5 py-4"
                    >
                      <span className="mt-1 inline-flex size-8 items-center justify-center rounded-full bg-[rgba(111,144,153,0.12)] text-lg" aria-hidden>
                        {point.emoji ?? "✓"}
                      </span>
                      <div className="space-y-1">
                        <p className="font-semibold leading-snug text-[var(--dreambaby-text)]">{point.title}</p>
                        {point.description && (
                          <p className="text-xs leading-relaxed text-[var(--dreambaby-muted)]">{point.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-16">
        <section className="mx-auto mt-16 max-w-6xl rounded-3xl border border-[var(--baby-neutral-200)] bg-white p-8 shadow-sm">
          <header className="space-y-2 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--baby-primary-50)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--baby-primary-600)]">
              Designed for busy parents
            </span>
            <h2 className="text-2xl font-semibold text-[var(--dreambaby-text)]">What you’ll unlock inside Nestlings</h2>
            <p className="mx-auto max-w-2xl text-sm text-[var(--dreambaby-muted)]">
              Nestlings Planner keeps everyone aligned—from birth plans to toddler upgrades—so the right gear, guidance, and reminders appear without endless spreadsheets.
            </p>
          </header>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {userFeatureHighlights.map((feature) => (
              <article
                key={feature.title}
                className="flex gap-4 rounded-2xl border border-[var(--baby-neutral-200)] bg-[var(--baby-neutral-50)]/80 p-5"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-white text-xl">
                  {feature.emoji}
                </span>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-[var(--dreambaby-text)]">{feature.title}</h3>
                  <p className="text-sm text-[var(--dreambaby-muted)]">{feature.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-3xl bg-gradient-to-r from-[rgba(249,241,231,0.65)] via-white to-[rgba(229,239,255,0.7)] p-8 shadow-sm snap-start snap-always">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--dreambaby-muted)]">
                Guided walkthrough
              </span>
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--dreambaby-text)]">
                See how Nestlings plans every milestone for you
              </h2>
              <p className="text-sm leading-relaxed text-[var(--dreambaby-muted)]">
                The tour previews the AI recommendations, timeline highlights, and agent handoffs so you know exactly what happens before you connect your profile.
              </p>
              <Link
                href="/how-it-works"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--baby-primary-500)] hover:text-[var(--baby-primary-600)]"
              >
                Walk through the demo
                <span aria-hidden>→</span>
              </Link>
            </div>

            <div className="grid w-full gap-4 sm:grid-cols-3">
              {howItWorksSteps.map((step, index) => (
                <div
                  key={step.title}
                  className="space-y-2 rounded-2xl border border-[var(--baby-neutral-200)] bg-white/95 p-4 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--dreambaby-muted)]">
                      {step.title}
                    </p>
                    {index === 0 ? (
                      <Image src="/assets/advisor-abstract.svg" alt="Conversation bubble icon" width={48} height={28} />
                    ) : index === 1 ? (
                      <Image src="/assets/timeline-abstract.svg" alt="Milestone timeline icon" width={48} height={28} />
                    ) : (
                      <Image src="/assets/list-abstract.svg" alt="Curated checklist icon" width={48} height={28} />
                    )}
                  </div>
                  <p className="text-[var(--dreambaby-text)]">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-16 rounded-3xl border border-[var(--baby-neutral-200)] bg-white p-8 shadow-sm snap-start snap-always">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,1fr)] lg:items-start">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--baby-primary-50)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--baby-primary-600)]">
                Trust matters
              </span>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--dreambaby-text)]">Trust & safeguarding commitments</h2>
              <p className="mt-2 max-w-xl text-sm text-[var(--dreambaby-muted)]">
                We built Nestlings Planner to keep your family information private, product picks reliable, and AI guidance grounded. Explore the commitments that keep each dashboard interaction safe.
              </p>
            </div>
            <TrustCarousel items={trustSafeguards} />
          </div>
        </section>
      </main>
      </div>
    </div>
  );
}
