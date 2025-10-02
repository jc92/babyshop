"use client";

import { useMemo, useState } from "react";
import {
  defaultProfile,
  type BudgetTier,
  type PreferenceProfile,
} from "@/data/preferences";
import {
  categories,
  milestones,
  products,
  type CategoryId,
  type MilestoneId,
  type ProductSummary,
} from "@/data/catalog";
import { rankProducts } from "@/lib/recommendation";

type TimelineFilter = "all" | MilestoneId;
type ActiveView = "profile" | "timeline";

const timelineBarStyles = [
  {
    gradient: "linear-gradient(90deg, #6366F1, #8B5CF6)",
    glow: "0 18px 35px -18px rgba(99, 102, 241, 0.6)",
  },
  {
    gradient: "linear-gradient(90deg, #0EA5E9, #38BDF8)",
    glow: "0 18px 35px -18px rgba(14, 165, 233, 0.55)",
  },
  {
    gradient: "linear-gradient(90deg, #10B981, #34D399)",
    glow: "0 18px 35px -18px rgba(16, 185, 129, 0.55)",
  },
  {
    gradient: "linear-gradient(90deg, #F59E0B, #F97316)",
    glow: "0 18px 35px -18px rgba(249, 115, 22, 0.55)",
  },
  {
    gradient: "linear-gradient(90deg, #F43F5E, #EC4899)",
    glow: "0 18px 35px -18px rgba(244, 63, 94, 0.55)",
  },
];

export default function Home() {
  const [profile, setProfile] = useState<PreferenceProfile>(defaultProfile);
  const [selectedCategories, setSelectedCategories] = useState<CategoryId[]>([
    "nursing",
    "sleeping",
    "feeding",
  ]);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
  const [activeMilestoneId, setActiveMilestoneId] =
    useState<MilestoneId>("prenatal");
  const [activeView, setActiveView] = useState<ActiveView>("profile");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const minTimelineMonth = milestones.reduce(
    (acc, milestone) => Math.min(acc, milestone.monthRange[0]),
    Infinity,
  );
  const maxTimelineMonth = milestones.reduce(
    (acc, milestone) => Math.max(acc, milestone.monthRange[1]),
    -Infinity,
  );
  const totalTimelineMonths = Math.max(
    maxTimelineMonth - minTimelineMonth,
    1,
  );

  const axisMarks = useMemo(() => {
    const candidates = [
      minTimelineMonth,
      0,
      6,
      12,
      18,
      24,
      30,
      36,
    ].filter(
      (mark) => mark >= minTimelineMonth && mark <= maxTimelineMonth,
    );
    const unique = Array.from(new Set(candidates)).sort((a, b) => a - b);
    return unique;
  }, [maxTimelineMonth, minTimelineMonth]);

  const timelineMilestones = useMemo(() => {
    if (timelineFilter === "all") {
      return milestones;
    }
    return milestones.filter((milestone) => milestone.id === timelineFilter);
  }, [timelineFilter]);

  const recommended = useMemo(
    () =>
      rankProducts(products, {
        ...profile,
        preferredCategories: selectedCategories,
      }),
    [profile, selectedCategories],
  );

  const budgetCopy: Record<BudgetTier, string> = {
    essentials: "Focus on core necessities under $120/mo.",
    balanced: "Balanced mix of essentials and a few premium splurges.",
    premium: "Curated premium gear with room for upgrades.",
  };

  const activeMilestone = useMemo(
    () =>
      milestones.find((milestone) => milestone.id === activeMilestoneId) ??
      milestones[0],
    [activeMilestoneId],
  );

  const activeMilestoneProducts = useMemo(() => {
    if (!activeMilestone) {
      return [] as ProductSummary[];
    }
    return products
      .filter((product) => product.milestoneIds.includes(activeMilestone.id))
      .sort((a, b) => b.rating - a.rating);
  }, [activeMilestone]);

  const sidebarViews: {
    id: ActiveView;
    label: string;
    description: string;
  }[] = [
    {
      id: "profile",
      label: "Profile overview",
      description: "Plan settings and baby details",
    },
    {
      id: "timeline",
      label: "Timeline & curation",
      description: "Roadmap, insights, curated picks",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/75 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">
              Nestlings Monthly
            </h1>
            <p className="text-sm text-slate-600">
              Intelligent baby essentials subscription planner for new parents.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            <p className="font-medium">Current plan: {profile.budget}</p>
            <p className="text-xs text-slate-500">{budgetCopy[profile.budget]}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 lg:flex-row">
        {isSidebarOpen && (
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-sm lg:hidden"
            aria-label="Close navigation overlay"
          />
        )}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-72 transform bg-white/95 shadow-xl transition-transform duration-300 ease-in-out ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:static lg:inset-auto lg:block lg:w-72 lg:transform-none lg:shadow-none`}
        >
          <nav
            className="flex h-full flex-col gap-6 border-slate-200 bg-white/90 px-5 py-6 backdrop-blur lg:rounded-2xl lg:border lg:shadow-sm lg:px-4 lg:py-5"
            aria-label="Primary"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Navigation
              </p>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="rounded-full border border-slate-200 px-2 py-1 text-xs font-medium text-slate-500 transition hover:border-indigo-200 hover:text-indigo-600 lg:hidden"
                aria-label="Close navigation"
              >
                Close
              </button>
            </div>
            <div className="space-y-2">
              {sidebarViews.map((view) => {
                const isActive = activeView === view.id;
                return (
                  <button
                    key={view.id}
                    type="button"
                    onClick={() => {
                      setActiveView(view.id);
                      setIsSidebarOpen(false);
                    }}
                    aria-current={isActive ? "page" : undefined}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                      isActive
                        ? "border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
                    }`}
                  >
                    <span className="block text-sm font-semibold text-slate-900">
                      {view.label}
                    </span>
                    <span className="block text-xs text-slate-500">{view.description}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </aside>

        <div className="flex-1 space-y-8 lg:pl-8">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600 lg:hidden"
            aria-label="Open navigation"
            aria-expanded={isSidebarOpen}
          >
            Menu
          </button>

          {activeView === "profile" && (
            <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-slate-900">Plan settings</h2>
                <p className="text-sm text-slate-600">
                  Adjust your subscription budget, timeline, and sustainability preferences at any time.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-[1.1fr_1fr]">
                <form className="grid gap-4 text-sm md:grid-cols-2">
                  <label className="flex flex-col gap-2">
                    <span className="text-slate-700">Due date</span>
                    <input
                      type="date"
                      value={profile.dueDate}
                      onChange={(event) =>
                        setProfile((current) => ({
                          ...current,
                          dueDate: event.target.value,
                        }))
                      }
                      className="rounded-md border border-slate-200 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-slate-700">Baby gender</span>
                    <select
                      value={profile.babyGender}
                      onChange={(event) =>
                        setProfile((current) => ({
                          ...current,
                          babyGender: event.target.value as PreferenceProfile["babyGender"],
                        }))
                      }
                      className="rounded-md border border-slate-200 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="surprise">We’ll find out at birth</option>
                      <option value="girl">Girl</option>
                      <option value="boy">Boy</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-slate-700">Monthly budget</span>
                    <select
                      value={profile.budget}
                      onChange={(event) =>
                        setProfile((current) => ({
                          ...current,
                          budget: event.target.value as PreferenceProfile["budget"],
                        }))
                      }
                      className="rounded-md border border-slate-200 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="essentials">Essentials</option>
                      <option value="balanced">Balanced</option>
                      <option value="premium">Premium</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-slate-700">Color palette</span>
                    <select
                      value={profile.colorPalette}
                      onChange={(event) =>
                        setProfile((current) => ({
                          ...current,
                          colorPalette: event.target.value as PreferenceProfile["colorPalette"],
                        }))
                      }
                      className="rounded-md border border-slate-200 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="neutral">Cozy neutrals</option>
                      <option value="pastel">Soft pastels</option>
                      <option value="bold">Bold, modern pops</option>
                      <option value="warm">Sunset warm tones</option>
                      <option value="cool">Coastal cool tones</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-slate-700">Material focus</span>
                    <select
                      value={profile.materialFocus}
                      onChange={(event) =>
                        setProfile((current) => ({
                          ...current,
                          materialFocus: event.target.value as PreferenceProfile["materialFocus"],
                        }))
                      }
                      className="rounded-md border border-slate-200 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="organic">Organic & natural fibers</option>
                      <option value="performance">Performance & easy clean</option>
                      <option value="recycled">Recycled & low-waste</option>
                      <option value="classic">Classic mix</option>
                    </select>
                  </label>

                  <label className="flex flex-row items-center gap-3 rounded-md border border-slate-200 px-4 py-3 shadow-sm">
                    <input
                      type="checkbox"
                      checked={profile.ecoPriority}
                      onChange={(event) =>
                        setProfile((current) => ({
                          ...current,
                          ecoPriority: event.target.checked,
                        }))
                      }
                      className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        Prioritize eco-friendly picks
                      </p>
                      <p className="text-xs text-slate-500">
                        Highlight products with verified sustainable materials and packaging.
                      </p>
                    </div>
                  </label>
                </form>

                <aside className="space-y-4 rounded-lg border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-indigo-900">
                  <h3 className="text-base font-semibold text-indigo-950">
                    Monthly subscription snapshot
                  </h3>
                  <p>
                    We assemble a monthly shipment covering essentials for your upcoming
                    milestone. Every box includes digital guidance, reorder reminders, and
                    affiliate-exclusive discounts.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-3">
                      <span className="mt-[2px] inline-flex size-2 rounded-full bg-indigo-500" />
                      <div>
                        <p className="font-medium">Dynamic curation</p>
                        <p className="text-xs text-indigo-700">
                          Agent re-evaluates reviews daily to ensure top-rated safety gear.
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-[2px] inline-flex size-2 rounded-full bg-indigo-500" />
                      <div>
                        <p className="font-medium">Affordability guardrails</p>
                        <p className="text-xs text-indigo-700">
                          Bundles stay within your target monthly spend, factoring in upcoming big-ticket buys.
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-[2px] inline-flex size-2 rounded-full bg-indigo-500" />
                      <div>
                        <p className="font-medium">At-a-glance timeline</p>
                        <p className="text-xs text-indigo-700">
                          Your dashboard calendar shows when each product should arrive and why it matters for that milestone.
                        </p>
                      </div>
                    </li>
                  </ul>
                </aside>
              </div>
            </section>
          )}

          {activeView === "profile" && (
            <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-6">
              <h2 className="text-xl font-semibold text-slate-900">Baby profile</h2>
              <p className="mt-2 text-sm text-slate-600">
                Capture details once during onboarding. We use these fields to tailor developmental milestones, sizing, and care reminders.
              </p>
              <div className="mt-6 grid gap-4 text-sm md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-slate-700">Baby nickname</span>
                  <input
                    type="text"
                    placeholder="Baby Bee"
                    className="rounded-md border border-slate-200 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-slate-700">Birth hospital</span>
                  <input
                    type="text"
                    placeholder="City Women’s Hospital"
                    className="rounded-md border border-slate-200 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-slate-700">Provider / pediatrician</span>
                  <input
                    type="text"
                    placeholder="Dr. Rivera"
                    className="rounded-md border border-slate-200 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-slate-700">Household setup</span>
                  <select className="rounded-md border border-slate-200 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200">
                    <option>Apartment</option>
                    <option>Single-family home</option>
                    <option>Shared housing</option>
                  </select>
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-slate-700">Care network</span>
                  <select className="rounded-md border border-slate-200 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200">
                    <option>Parents only</option>
                    <option>Parents + grandparents</option>
                    <option>Parents + nanny</option>
                    <option>Other caregivers</option>
                  </select>
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-slate-700">Medical notes</span>
                  <textarea
                    rows={3}
                    placeholder="Allergies, birth considerations, or safety concerns"
                    className="rounded-md border border-slate-200 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </label>
              </div>
              <p className="mt-4 text-xs text-slate-500">
                These details stay private—we use them only to tailor the onboarding checklist, reminder cadence, and sizing recommendations.
              </p>
            </section>
          )}

          {activeView === "timeline" && (
            <div className="space-y-8">
              <section className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg/20">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Timeline roadmap</h2>
              <p className="text-sm text-slate-600">
                Track upcoming needs from prenatal prep through age three. Filter milestones or scan the Gantt-style view for sequencing.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-medium">
              <button
                type="button"
                onClick={() => setTimelineFilter("all")}
                className={`rounded-full border px-3 py-1 transition ${timelineFilter === "all" ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-200 bg-white text-slate-600"}`}
              >
                All milestones
              </button>
              {milestones.map((milestone) => (
                <button
                  key={milestone.id}
                  type="button"
                  onClick={() => setTimelineFilter(milestone.id)}
                  className={`rounded-full border px-3 py-1 transition ${timelineFilter === milestone.id ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-200 bg-white text-slate-600"}`}
                >
                  {milestone.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[920px] space-y-6">
              <div className="relative h-6">
                {axisMarks.map((mark, index) => {
                  const position =
                    ((mark - minTimelineMonth) / totalTimelineMonths) * 100;
                  const label = mark < 0 ? "Prenatal" : `${mark} mo`;
                  const transform =
                    index === 0
                      ? "translateX(0)"
                      : index === axisMarks.length - 1
                        ? "translateX(-100%)"
                        : "translateX(-50%)";
                  return (
                    <span
                      key={mark}
                      className="absolute text-[11px] font-medium uppercase tracking-wide text-slate-500"
                      style={{ left: `${position}%`, transform }}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>

              <div className="max-h-[640px] space-y-5 overflow-y-auto pr-3">
                {timelineMilestones.map((milestone, index) => {
                  const span = Math.max(
                    milestone.monthRange[1] - milestone.monthRange[0],
                    1,
                  );
                  const offsetPercentage =
                    ((milestone.monthRange[0] - minTimelineMonth) /
                      totalTimelineMonths) *
                    100;
                  const baseWidth = (span / totalTimelineMonths) * 100;
                  const fadeWidth = Math.min(baseWidth * 0.15 + 3, 10);
                  const overlapBoost = Math.min(baseWidth * 0.25 + 6, 18);
                  const adjustedOffset = Math.max(offsetPercentage - fadeWidth, 0);
                  const maxAllowedWidth = Math.max(100 - adjustedOffset, 12);
                  const normalizedWidth = Math.min(
                    Math.max(baseWidth + overlapBoost, 18),
                    maxAllowedWidth,
                  );
                  const productCount = products.filter((item) =>
                    item.milestoneIds.includes(milestone.id),
                  ).length;
                  const palette =
                    timelineBarStyles[index % timelineBarStyles.length];

                  return (
                    <div
                      key={milestone.id}
                      onMouseEnter={() => setActiveMilestoneId(milestone.id)}
                      onFocus={() => setActiveMilestoneId(milestone.id)}
                      className={`grid cursor-pointer items-center gap-6 rounded-2xl border border-slate-200/70 bg-gradient-to-r from-white via-slate-50/70 to-white p-5 shadow-sm transition hover:shadow-lg/50 focus-within:shadow-lg/50 md:grid-cols-[240px_1fr] ${
                        activeMilestoneId === milestone.id
                          ? "border-indigo-300/70"
                          : ""
                      }`}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-sm font-semibold text-slate-900">
                            {milestone.label}
                          </h3>
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
                            {productCount} items
                          </span>
                        </div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          {milestone.monthRange[0]} to {milestone.monthRange[1]} months
                        </p>
                        <p className="text-sm text-slate-600">{milestone.description}</p>
                      </div>
                      <div className="relative h-16 overflow-hidden rounded-xl border border-slate-200/60 bg-white/80">
                        <div
                          className="pointer-events-none absolute inset-0"
                          style={{
                            backgroundImage:
                              axisMarks.length > 1
                                ? "linear-gradient(to right, rgba(148, 163, 184, 0.12) 1px, transparent 1px)"
                                : undefined,
                            backgroundSize:
                              axisMarks.length > 1
                                ? `${100 / (axisMarks.length - 1)}% 100%`
                                : undefined,
                          }}
                          aria-hidden
                        />
                        <div className="relative flex h-full items-center">
                          <div
                            className="absolute inset-y-2 flex items-center"
                            style={{
                              left: `${adjustedOffset}%`,
                              width: `${normalizedWidth}%`,
                            }}
                          >
                            <div className="relative h-12 w-full">
                              <div
                                className="absolute inset-0 rounded-full"
                                style={{
                                  background: palette.gradient,
                                  boxShadow: palette.glow,
                                }}
                              />
                              <div
                                className="absolute inset-y-0 left-0 w-[18%] rounded-l-full"
                                style={{
                                  background:
                                    "linear-gradient(90deg, rgba(255,255,255,0.85), rgba(255,255,255,0))",
                                }}
                              />
                              <div
                                className="absolute inset-y-0 right-0 w-[18%] rounded-r-full"
                                style={{
                                  background:
                                    "linear-gradient(270deg, rgba(255,255,255,0.85), rgba(255,255,255,0))",
                                }}
                              />
                              <div className="relative flex h-full items-center justify-between gap-3 px-4 text-xs font-medium text-white">
                                <span className="text-[10px] uppercase tracking-wide text-white/80">
                                  Start: {milestone.monthRange[0]} mo
                                </span>
                                <span className="text-xs font-semibold text-white">
                                  Core window
                                </span>
                                <span className="text-[10px] uppercase tracking-wide text-white/80">
                                  Phase out: {milestone.monthRange[1]} mo
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
              <section className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg/20">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Milestone insights</h2>
              <p className="text-sm text-slate-600">
                Dive deeper into the selected milestone with curated products, timeline notes, and agent rationale.
              </p>
            </div>
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-600">
              {activeMilestone.label}
            </span>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
                <h3 className="text-base font-semibold text-slate-900">What to expect</h3>
                <p className="mt-2 text-sm text-slate-600">{activeMilestone.description}</p>
                <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Time frame
                    </p>
                    <p className="mt-1 font-medium text-slate-900">
                      {activeMilestone.monthRange[0]}–{activeMilestone.monthRange[1]} months
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Upcoming delivery
                    </p>
                    <p className="mt-1 font-medium text-slate-900">
                      {activeMilestoneProducts.length} curated items queued
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900">
                    Recommended items
                  </h3>
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Sorted by rating
                  </span>
                </div>
                <ul className="mt-4 space-y-3">
                  {activeMilestoneProducts.map((product) => (
                    <li
                      key={product.id}
                      className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-600 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-slate-900">
                          {product.name}
                        </p>
                        <span className="text-xs font-semibold text-slate-500">
                          {product.rating.toFixed(1)} ★
                        </span>
                      </div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        {product.category} · ${product.price}
                      </p>
                      <p className="mt-2 text-sm">
                        {product.reviewSummary}
                      </p>
          </li>
                  ))}
                </ul>
              </div>
            </div>

            <aside className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Agent rationale
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Our curation agent weighs developmental needs, budget, safety reviews, and your aesthetic preferences when recommending items for this milestone.
                </p>
              </div>
              <div className="space-y-3 text-sm text-slate-600">
                <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3">
                  <p className="text-xs uppercase tracking-wide text-indigo-500">
                    Safety & timing checks
                  </p>
                  <p className="mt-1">Alerts you when to schedule installs or recall checks ahead of baby reaching a new stage.</p>
                </div>
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
                  <p className="text-xs uppercase tracking-wide text-emerald-500">
                    Budget guardrails
                  </p>
                  <p className="mt-1">Balances monthly spend with upcoming major purchases like car seats or nursery furniture upgrades.</p>
                </div>
                <div className="rounded-lg border border-sky-100 bg-sky-50/60 p-3">
                  <p className="text-xs uppercase tracking-wide text-sky-500">
                    Style fidelity
                  </p>
                  <p className="mt-1">Keeps to your chosen palette and materials, suggesting swaps if the perfect match is out of stock.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveView("timeline");
                  const curatedSection = document.getElementById("curated");
                  curatedSection?.scrollIntoView({ behavior: "smooth" });
                }}
                className="inline-flex items-center justify-center rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-600 shadow-sm transition hover:border-indigo-400 hover:text-indigo-700"
              >
                Jump to curated picks
              </button>
            </aside>
          </div>
        </section>
            </div>
          )}

          {activeView === "timeline" && (
            <section
              id="curated"
              className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg/20"
            >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Curated picks</h2>
              <p className="text-sm text-slate-600">
                Agent-ranked products tuned to your preferences. Swap categories to adapt the subscription mix.
              </p>
            </div>
            <div className="grid gap-2 text-sm md:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => {
                const isActive = selectedCategories.includes(category.id);
                return (
                  <label
                    key={category.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/60"
                  >
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={() =>
                        setSelectedCategories((current) =>
                          isActive
                            ? current.filter((item) => item !== category.id)
                            : [...current, category.id],
                        )
                      }
                      className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-slate-700">{category.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recommended.map((item) => (
              <article
                key={item.product.id}
                className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {item.product.brand}
                    </p>
                    <h3 className="text-base font-semibold text-slate-900">
                      {item.product.name}
                    </h3>
                  </div>
                  <span className="rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                    ${item.product.price}
                  </span>
                </div>
                <p className="text-sm text-slate-700">{item.product.reviewSummary}</p>
                <div className="text-xs text-slate-500">
                  <p className="font-semibold text-slate-600">Why it’s here</p>
                  <p>{item.rationale}</p>
                </div>
                <div className="mt-auto flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-500">
                    Milestones: {item.product.milestoneIds.map((id) => id.replace("month", "Month ")).join(", ")}
                  </span>
                  <a
                    href={item.product.affiliateUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-indigo-200 px-3 py-1 text-indigo-600 transition hover:bg-indigo-50"
                  >
                    View offer
                  </a>
        </div>
              </article>
            ))}
          </div>
        </section>
          )}
        </div>
      </main>
    </div>
  );
}
