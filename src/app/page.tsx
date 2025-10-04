import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { products } from "@/data/catalog";
import { defaultMilestones } from "@/data/defaultMilestones";
import { heroCopy } from "@/lib/copy/hero";
import { sectionNavItems } from "@/lib/navigation";

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

const spotlightProducts = products
  .slice()
  .sort((a, b) => b.rating - a.rating)
  .slice(0, 3);

const milestonePreview = defaultMilestones.slice(0, 3);

export default function Home() {
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
                    : section.id === "profile"
                      ? "Keep your family preferences, due dates, and caregiver notes in sync."
                      : "Tour the workflow in minutes with guided highlights before you sign in."}
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

        <section className="mt-16 rounded-3xl border border-[var(--baby-neutral-200)] bg-white p-8 shadow-sm">
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

        <section className="mt-16 rounded-3xl bg-gradient-to-r from-[rgba(249,241,231,0.65)] via-white to-[rgba(229,239,255,0.7)] p-8 shadow-sm">
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

            <div className="grid gap-4 sm:grid-cols-3">
              {howItWorksSteps.map((step) => (
                <div
                  key={step.title}
                  className="space-y-2 rounded-2xl border border-[var(--baby-neutral-200)] bg-white/90 p-4 text-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--dreambaby-muted)]">
                    {step.title}
                  </p>
                  <p className="text-[var(--dreambaby-text)]">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {spotlightProducts.length > 0 && (
          <section className="mt-16 rounded-3xl border border-[var(--baby-neutral-300)] bg-white p-8 shadow-sm">
            <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[var(--dreambaby-text)]">Product spotlight</h2>
                <p className="text-sm text-[var(--dreambaby-muted)]">
                  Freshly recommended gear pulled from our curated catalog.
                </p>
              </div>
              <Link
                href="/curated"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--baby-primary-200)] px-4 py-2 text-sm font-semibold text-[var(--baby-primary-500)] hover:border-[var(--baby-primary-300)] hover:text-[var(--baby-primary-600)]"
              >
                View curated lists
                <span aria-hidden>→</span>
              </Link>
            </header>

            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {spotlightProducts.map((product) => {
                const milestone = product.milestoneIds[0]
                  ? defaultMilestones.find((item) => item.id === product.milestoneIds[0])
                  : undefined;

                return (
                  <article
                    key={product.id}
                    className="space-y-3 rounded-2xl border border-[var(--baby-neutral-200)] bg-[var(--baby-neutral-50)]/70 p-5 shadow-sm"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--dreambaby-muted)]">
                      {milestone ? milestone.label : "All milestones"}
                    </p>
                    <h3 className="text-lg font-semibold text-[var(--dreambaby-text)]">{product.name}</h3>
                    <p className="text-sm text-[var(--dreambaby-muted)]">
                      {product.brand} · ${product.price.toFixed(0)}
                    </p>
                    <p className="text-sm text-[var(--dreambaby-text)]">{product.reviewSummary}</p>
                    <div className="flex items-center gap-3 text-xs text-[var(--dreambaby-muted)]">
                      <span>⭐ {product.rating.toFixed(1)}</span>
                      <span>•</span>
                      <span>{product.category}</span>
                      {product.isEcoFriendly && (
                        <span className="rounded-full bg-[var(--baby-primary-100)] px-2 py-0.5 text-[var(--baby-primary-600)]">
                          Eco
                        </span>
                      )}
                    </div>
                    <Link
                      href={product.affiliateUrl || "/curated"}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--baby-primary-500)] hover:text-[var(--baby-primary-600)]"
                    >
                      View details
                      <span aria-hidden>→</span>
                    </Link>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <section className="mt-16 rounded-3xl border border-[var(--baby-neutral-200)] bg-[rgba(248,252,255,0.85)] p-8 shadow-sm">
          <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[var(--dreambaby-text)]">Upcoming milestone preview</h2>
              <p className="text-sm text-[var(--dreambaby-muted)]">
                A quick look at the guidance you will see inside the planner.
              </p>
            </div>
            <Link
              href="/overview"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--baby-primary-500)] hover:text-[var(--baby-primary-600)]"
            >
              Open the timeline
              <span aria-hidden>→</span>
            </Link>
          </header>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {milestonePreview.map((milestone) => (
              <article
                key={milestone.id}
                className="space-y-3 rounded-2xl border border-[var(--baby-neutral-200)] bg-white/85 p-5"
              >
                <span className="inline-flex items-center gap-2 rounded-full bg-[var(--baby-primary-50)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--baby-primary-600)]">
                  {milestone.monthRange[0]}–{milestone.monthRange[1]} months
                </span>
                <h3 className="text-lg font-semibold text-[var(--dreambaby-text)]">{milestone.label}</h3>
                <p className="text-sm text-[var(--dreambaby-muted)]">{milestone.description}</p>
                {milestone.planningTips?.[0] && (
                  <p className="text-sm text-[var(--dreambaby-text)]">
                    Tip: {milestone.planningTips[0]}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
