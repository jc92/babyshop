import Link from "next/link";
import { Navigation } from "@/components/Navigation";

export const metadata = {
  title: "How Nestlings Planner Works",
  description:
    "See how Nestlings Planner combines your family profile, milestone science, and AI-assisted research to surface trusted baby gear recommendations.",
};

const milestones = [
  {
    title: "1. Learn about your family",
    description:
      "We start with a lightweight intake that captures due dates, household setup, budget guardrails, and style preferences. The answers only live in your Nestlings Planner account and never leave our Postgres database.",
  },
  {
    title: "2. Map the milestone journey",
    description:
      "Next we align your details with our 36-month milestone timeline, pre-populated with developmental prompts, caregiver tasks, and purchase timing windows vetted by pediatric professionals.",
  },
  {
    title: "3. Curate product candidates",
    description:
      "Our sourcing service pulls structured data from manufacturers, verified retailers, and parent community reviews. We cache scores for quality, safety, eco merits, and price bands so results stay fresh without re-scraping everything.",
  },
  {
    title: "4. Rank with responsible AI",
    description:
      "We feed your profile plus the milestone context into our recommendation engine. It uses OpenAI models with hard-coded guardrails to prioritize safety certifications, verified reviews, and availability before anything else.",
  },
  {
    title: "5. Explain every suggestion",
    description:
      "Each recommendation surfaces the score breakdown, key pros, and sourcing notes so you can understand why it appears. Prefer organic fabrics or under-$200 gear? Those filters stay sticky across sessions.",
  },
  {
    title: "6. Keep humans in the loop",
    description:
      "Our team reviews new AI-suggested products before they hit curated bundles. You can always flag an item, request alternatives, or export checklists to share with caregivers.",
  },
];

const safeguards = [
  {
    title: "Transparent data handling",
    description:
      "Family details stay in an encrypted Postgres instance hosted on Vercel. We never sell or share data with advertisers, and you can delete your profile anytime from the Family Profile page.",
  },
  {
    title: "Human review on new listings",
    description:
      "AI might propose a candidate, but it does not publish anything without a Nestlings Planner curator verifying safety recalls, price accuracy, and retailer reputation.",
  },
  {
    title: "Model guardrails",
    description:
      "Prompts are structured to block medical advice, unsafe DIY hacks, or unverified seller links. When the AI has low confidence it will simply say so and ask for clarification.",
  },
  {
    title: "You stay in control",
    description:
      "Download your plans, edit preferences whenever life changes, and pause recommendations for a season. Sign in from any device to pick up right where you left off.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[var(--baby-neutral-50)] text-[var(--dreambaby-text)]">
      <Navigation />

      <main className="mx-auto w-full max-w-6xl px-6 pt-28 pb-20">
        <header className="rounded-3xl border border-[var(--baby-neutral-200)] bg-white/90 p-10 shadow-[0_24px_60px_rgba(111,144,153,0.12)] backdrop-blur">
          <span className="theme-pill theme-pill--primary">See how it works</span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[var(--dreambaby-text)] sm:text-5xl">
            Built to make baby planning calmer, clearer, and more trustworthy
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-[var(--dreambaby-muted)]">
            Nestlings Planner blends evidence-based milestone planning, responsible AI, and human curation. Here’s exactly what happens behind the scenes so you know how every recommendation reaches your dashboard.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-[var(--dreambaby-muted)]">
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--baby-primary-100)] px-4 py-2 font-semibold text-[var(--baby-primary-600)]">
              🔐 Transparent by design
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--baby-secondary-100)] px-4 py-2 font-semibold text-[var(--baby-secondary-600)]">
              🤖 AI with human review
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--baby-neutral-100)] px-4 py-2 font-semibold text-[var(--dreambaby-muted)]">
              ✅ Preferences stay in sync
            </span>
          </div>
        </header>

        <section className="mt-16">
          <h2 className="text-2xl font-semibold text-[var(--dreambaby-text)]">From profile to curated plan</h2>
          <p className="mt-2 max-w-3xl text-sm text-[var(--dreambaby-muted)]">
            Every new account runs through the same careful pipeline. It keeps your information scoped to trusted sources and makes it easy to understand why each product appears.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {milestones.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-[var(--baby-neutral-200)] bg-white/95 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-[0_24px_40px_rgba(111,144,153,0.15)]"
              >
                <h3 className="text-lg font-semibold text-[var(--dreambaby-text)]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--dreambaby-muted)]">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-3xl border border-[var(--baby-neutral-200)] bg-white/95 p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="lg:w-1/2">
              <h2 className="text-2xl font-semibold text-[var(--dreambaby-text)]">Trust & safeguarding commitments</h2>
              <p className="mt-2 text-sm text-[var(--dreambaby-muted)]">
                We designed Nestlings Planner for busy caregivers who need clarity and confidence—not surprises. Here are the guardrails that keep your plan reliable and your data safe.
              </p>
            </div>
            <div className="grid flex-1 gap-5 md:grid-cols-2">
              {safeguards.map((item) => (
                <article key={item.title} className="rounded-2xl border border-[var(--baby-neutral-200)] bg-[var(--baby-neutral-50)] p-5">
                  <h3 className="text-base font-semibold text-[var(--dreambaby-text)]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--dreambaby-muted)]">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-16 rounded-3xl bg-gradient-to-br from-[var(--baby-primary-500)] to-[var(--baby-secondary-400)] px-8 py-10 text-white shadow-[0_24px_50px_rgba(111,144,153,0.25)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <h2 className="text-2xl font-semibold">Ready to see your personalized dashboard?</h2>
              <p className="text-sm text-white/80">
                Create a free profile to unlock milestone timelines, product bundles, and AI-assisted shopping lists tailored to your family.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/overview"
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[var(--baby-primary-600)] transition hover:bg-[var(--baby-neutral-100)]"
              >
                Explore the dashboard
              </Link>
              <Link
                href="/profile"
                className="rounded-full border border-white/60 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Set up your profile
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
