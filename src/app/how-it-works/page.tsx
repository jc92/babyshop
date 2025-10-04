import Link from "next/link";
import { Navigation } from "@/components/Navigation";

export const metadata = {
  title: "How Nestlings Planner Works",
  description:
    "Learn how Nestlings Planner guides new parents from quick questions to calm, curated plans you can trust.",
};

const milestones = [
  {
    title: "1. Tell us about your family",
    description:
      "Answer a short set of questions—due date, who helps at home, budget comfort, and the vibe you’re going for. It takes two minutes and lives safely in your Nestlings Planner profile only.",
  },
  {
    title: "2. Build your milestone roadmap",
    description:
      "We turn those answers into a month-by-month plan, highlighting what to prep, book, or learn next. Each step is checked with pediatric guidance so reminders arrive right when you need them.",
  },
  {
    title: "3. Gather parent-loved picks",
    description:
      "Our team reviews trusted shops and real caregiver feedback to shortlist gear that fits your budget, space, and style. Safety notes, eco highlights, and price ranges are kept up to date for you.",
  },
  {
    title: "4. Personalize with smart sorting",
    description:
      "Nestlings Planner nudges the items that match your preferences to the top—think hypoallergenic fabrics, compact strollers, or under-$200 must-haves—while filtering out anything that doesn’t fit.",
  },
  {
    title: "5. Share the why behind every pick",
    description:
      "Each card explains why it’s recommended, the age window it supports, and simple pros to consider. You can pin favorites, swap in alternatives, or save ideas for later with one click.",
  },
  {
    title: "6. Stay supported the whole way",
    description:
      "Prefer a human gut check? Our curators review new additions, and you can message the Nestlings team, export checklists, or pause suggestions anytime. You stay in charge of the pace.",
  },
];

const safeguards = [
  {
    title: "Your details stay private",
    description:
      "We protect your family info and never sell it. Update or delete your profile whenever circumstances change—no questions asked.",
  },
  {
    title: "Every product is double-checked",
    description:
      "Before something lands in your plan, a Nestlings curator reviews safety recalls, stock status, and retailer reputation so you’re never chasing risky links.",
  },
  {
    title: "Friendly guardrails",
    description:
      "The Nestlings advisor keeps conversations supportive and practical. It avoids medical advice, unverified hacks, or anything that could put your family at risk.",
  },
  {
    title: "You call the shots",
    description:
      "Download checklists, tweak preferences as baby grows, or pause recommendations during busy seasons. Sign back in anytime to pick up exactly where you left off.",
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
            Nestlings Planner pairs gentle guidance with real-parent insight so you always know what to do next. Take a look at how we go from your first answers to a calm, trustworthy plan.
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
            We follow these steps for every family so you can relax, knowing the right help is on deck before each milestone arrives.
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
