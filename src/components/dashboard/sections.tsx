"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { SignInButton } from "@clerk/nextjs";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { clerkEnabled, useSafeUser } from "@/lib/clerkClient";
import {
  type Milestone,
  type MilestoneId,
  type ProductSummary,
  type CategoryId,
} from "@/data/catalog";
import { type PreferenceProfile } from "@/data/preferences";
import { defaultBabyProfile, type RecommendedProduct } from "@/hooks/useDashboardData";
import { formatDateForDisplay } from "@/lib/dateCalculations";

type FocusSection = {
  title: string;
  items: readonly string[] | null | undefined;
};

const buildFocusSections = (milestone: Milestone): FocusSection[] => [
  { title: "Baby focus", items: milestone.babyFocus },
  { title: "Caregiver focus", items: milestone.caregiverFocus },
  { title: "Home setup", items: milestone.environmentFocus },
  { title: "Health checklist", items: milestone.healthChecklist },
  { title: "Planning tips", items: milestone.planningTips },
];

const focusEmojis: Record<string, string> = {
  "Baby focus": "👶",
  "Caregiver focus": "🤝",
  "Home setup": "🏡",
  "Health checklist": "🩺",
  "Planning tips": "🗒️",
};

type MilestoneFocusHighlightsProps = {
  sections: FocusSection[];
  summary?: string | null;
};

function MilestoneFocusHighlights({ sections, summary }: MilestoneFocusHighlightsProps) {
  const trimmedSummary = summary?.trim() ?? "";
  const focusEntries = sections
    .map((section) => {
      const items = section.items?.filter(Boolean) ?? [];
      if (items.length === 0) {
        return null;
      }

      return {
        title: section.title,
        items,
      };
    })
    .filter((entry): entry is { title: string; items: string[] } => entry !== null);

  const [activeTitle, setActiveTitle] = useState<string | null>(focusEntries[0]?.title ?? null);

  useEffect(() => {
    if (focusEntries.length === 0) {
      setActiveTitle(null);
      return;
    }

    if (!activeTitle || !focusEntries.some((entry) => entry.title === activeTitle)) {
      setActiveTitle(focusEntries[0]?.title ?? null);
    }
  }, [focusEntries, activeTitle]);

  if (!trimmedSummary && focusEntries.length === 0) {
    return null;
  }

  const activeEntry =
    focusEntries.find((entry) => entry.title === activeTitle) ?? focusEntries[0] ?? null;

  return (
    <div className="space-y-4 rounded-3xl border border-[rgba(207,210,198,0.35)] bg-white p-6 shadow-sm">
      <header className="space-y-2">
        <h3 className="text-lg font-semibold text-[var(--dreambaby-text)]">What to expect this stage</h3>
        <p className="text-sm text-[var(--dreambaby-muted)]">
          Highlights pulled directly from the milestone record so your prep work stays on track.
        </p>
      </header>

      {trimmedSummary ? (
        <p className="rounded-2xl border border-[var(--baby-neutral-300)] bg-[var(--baby-neutral-50)] p-6 text-base leading-relaxed text-[var(--dreambaby-text)]">
          {trimmedSummary}
        </p>
      ) : null}

      {focusEntries.length > 0 ? (
        <div className="flex flex-col gap-6 lg:flex-row">
          <nav
            className="flex gap-2 overflow-x-auto pb-1 text-sm text-[var(--dreambaby-muted)] lg:w-48 lg:flex-col lg:gap-3 lg:overflow-visible lg:pb-0"
            aria-label="Focus area navigation"
          >
            <p className="hidden text-xs font-medium uppercase tracking-[0.24em] text-[var(--dreambaby-muted)] lg:block">
              Click a focus area to explore ✨
            </p>
            {focusEntries.map((entry) => {
              const isActive = entry.title === activeEntry?.title;
              const emoji = focusEmojis[entry.title] ?? "⭐️";
              return (
                <button
                  key={entry.title}
                  type="button"
                  onClick={() => setActiveTitle(entry.title)}
                  className={`min-w-[160px] rounded-2xl border px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--baby-primary-400)] ${
                    isActive
                      ? "border-[var(--baby-primary-300)] bg-[var(--baby-primary-100)] text-[var(--dreambaby-text)] shadow-sm"
                      : "border-[var(--baby-neutral-300)] bg-white hover:border-[var(--baby-primary-200)] hover:text-[var(--dreambaby-text)]"
                  }`}
                  aria-pressed={isActive}
                >
                  <span className="mr-2" aria-hidden>
                    {emoji}
                  </span>
                  {entry.title}
                </button>
              );
            })}
          </nav>

          {activeEntry ? (
            <article className="flex-1 space-y-4 rounded-3xl border border-[var(--baby-neutral-300)] bg-[var(--baby-neutral-50)] p-8 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center rounded-full bg-[var(--baby-primary-100)] px-2 py-1 text-base" aria-hidden>
                  {focusEmojis[activeEntry.title] ?? "⭐️"}
                </span>
                <h4 className="text-lg font-semibold text-[var(--dreambaby-text)]">{activeEntry.title}</h4>
              </div>
              <ul className="space-y-3 text-base leading-7 text-[var(--dreambaby-text)]">
                {activeEntry.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 inline-block size-2 flex-shrink-0 rounded-full bg-[var(--baby-primary-300)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export type CurrentMilestoneCardProps = {
  milestone: Milestone;
  products: ProductSummary[];
  budgetLabel: string;
  budgetDescription: string;
  onSelectMilestone?: (id: MilestoneId) => void;
  previousMilestone?: Milestone | null;
  nextMilestone?: Milestone | null;
  babyLabel?: string | null;
  dueDateLabel?: string | null;
  disableSticky?: boolean;
};

export function CurrentMilestoneCard({
  milestone,
  products,
  budgetLabel,
  budgetDescription,
  onSelectMilestone,
  previousMilestone,
  nextMilestone,
  babyLabel,
  dueDateLabel,
  disableSticky = false,
}: CurrentMilestoneCardProps) {
  const queuedCount = products.length;
  const hasPrev = Boolean(previousMilestone && onSelectMilestone);
  const hasNext = Boolean(nextMilestone && onSelectMilestone);
  const topCategories = Array.from(new Set(products.map((product) => product.category))).slice(0, 3);
  const containerBase =
    "flex flex-col gap-4 rounded-3xl border border-[rgba(207,210,198,0.25)] bg-white/95 p-5 shadow-[0_18px_38px_-28px_rgba(30,52,70,0.4)]";
  const containerClass = disableSticky ? containerBase : `${containerBase} lg:sticky lg:top-6`;

  return (
    <section className={containerClass}>
      <header className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--dreambaby-muted)]">
          Current milestone
        </p>
        <h2 className="text-lg font-semibold text-[var(--dreambaby-text)]">{milestone.label}</h2>
        <p className="text-xs leading-relaxed text-[var(--dreambaby-muted)]">{milestone.description}</p>
        {(babyLabel || dueDateLabel) && (
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--baby-neutral-300)] bg-[var(--baby-neutral-100)] px-3 py-1 text-xs font-medium text-[var(--dreambaby-muted)]">
            <span className="inline-flex size-1.5 rounded-full bg-[var(--baby-primary-400)]" />
            {babyLabel || "Your baby"}
            {dueDateLabel && <span className="opacity-80">· {dueDateLabel}</span>}
          </div>
        )}
      </header>

      <div className="space-y-2 text-xs text-[var(--dreambaby-muted)]">
        <div className="rounded-xl border border-[var(--baby-neutral-300)] bg-[var(--baby-neutral-50)] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--dreambaby-muted)]">Timeline window</p>
          <p className="text-sm text-[var(--dreambaby-text)]">
            {milestone.monthRange[0]}–{milestone.monthRange[1]} months · {queuedCount} curated items queued
          </p>
        </div>
        <div className="rounded-xl border border-[var(--baby-neutral-300)] bg-[var(--baby-neutral-50)] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--dreambaby-muted)]">Top categories</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--dreambaby-muted)]">
            {topCategories.length > 0 ? (
              topCategories.map((area) => (
                <span
                  key={area}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--baby-neutral-300)] bg-white px-3 py-1 text-[var(--dreambaby-text)]"
                >
                  <span aria-hidden>•</span>
                  {area}
                </span>
              ))
            ) : (
              <span>No curated categories yet</span>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--baby-neutral-300)] bg-[var(--baby-neutral-50)] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--dreambaby-muted)]">Plan summary</p>
          <p className="text-sm text-[var(--dreambaby-text)]">{budgetLabel}</p>
          <p className="text-xs leading-relaxed">{budgetDescription}</p>
        </div>
      </div>

      {onSelectMilestone && (
        <div className="flex items-center justify-between text-xs font-semibold text-[var(--dreambaby-muted)]">
          <button
            type="button"
            onClick={() => previousMilestone && onSelectMilestone(previousMilestone.id)}
            disabled={!hasPrev}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--baby-neutral-300)] bg-white px-3 py-1 transition hover:border-[var(--baby-primary-200)] hover:text-[var(--dreambaby-text)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← {previousMilestone ? previousMilestone.label : "Start"}
          </button>
          <button
            type="button"
            onClick={() => nextMilestone && onSelectMilestone(nextMilestone.id)}
            disabled={!hasNext}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--baby-neutral-300)] bg-white px-3 py-1 transition hover:border-[var(--baby-primary-200)] hover:text-[var(--dreambaby-text)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {nextMilestone ? nextMilestone.label : "Complete"} →
          </button>
        </div>
      )}
    </section>
  );
}
type MilestoneSummarySectionProps = {
  milestone?: Milestone | null;
  products: ProductSummary[];
  productsLoading: boolean;
  formatCurrency: (value?: number | null) => string;
  budgetLabel: string;
  budgetDescription: string;
  onNavigateToCurated: () => void;
  milestones?: Milestone[];
  activeMilestoneId?: MilestoneId;
  onSelectMilestone?: (id: MilestoneId) => void;
  babyProfile?: typeof defaultBabyProfile;
  profile?: PreferenceProfile;
  showRecommendations?: boolean;
  showCurrentMilestoneCard?: boolean;
};

export function MilestoneSummarySection({
  milestone,
  products,
  productsLoading,
  formatCurrency,
  budgetLabel,
  budgetDescription,
  onNavigateToCurated,
  milestones: milestoneList,
  activeMilestoneId,
  onSelectMilestone,
  babyProfile,
  profile,
  showRecommendations = true,
  showCurrentMilestoneCard = true,
}: MilestoneSummarySectionProps) {
  const orderedMilestones = milestoneList ?? [];
  const currentIndex = activeMilestoneId
    ? orderedMilestones.findIndex((item) => item.id === activeMilestoneId)
    : -1;
  const previousMilestone = currentIndex > 0 ? orderedMilestones[currentIndex - 1] : null;
  const nextMilestone =
    currentIndex >= 0 && currentIndex < orderedMilestones.length - 1
      ? orderedMilestones[currentIndex + 1]
      : null;

  const babyDisplayName = babyProfile?.nickname?.trim() || babyProfile?.name?.trim() || null;
  const formattedPlanDueDate = formatDateForDisplay(profile?.dueDate);
  const formattedBirthDate = formatDateForDisplay(babyProfile?.birthDate);
  const formattedBabyDueDate = formatDateForDisplay(babyProfile?.dueDate);
  const dueDateLabel = formattedPlanDueDate
    ? `Due ${formattedPlanDueDate}`
    : formattedBirthDate
      ? `Born ${formattedBirthDate}`
      : formattedBabyDueDate;

  if (!milestone) {
    return (
      <section className="space-y-6">
        <div className="rounded-3xl border border-[rgba(207,210,198,0.35)] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--dreambaby-muted)]">
            Preparing your plan
          </p>
          <p className="mt-2 text-base font-medium text-[var(--dreambaby-text)]">
            We&apos;re syncing milestone guidance.
          </p>
          <p className="mt-2 text-sm text-[var(--dreambaby-muted)]">
            Once everything loads you&apos;ll see recommended focus areas, checklists, and curated products for each stage.
          </p>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onNavigateToCurated}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--baby-primary-200)] bg-white px-4 py-2 text-sm font-semibold text-[var(--baby-primary-500)] shadow-sm transition hover:border-[var(--baby-primary-300)] hover:text-[var(--baby-primary-600)]"
          >
            Explore curated picks →
          </button>
        </div>
      </section>
    );
  }

  const focusSections = buildFocusSections(milestone);

  const hasFocusContent = Boolean(
    (milestone.summary && milestone.summary.trim().length > 0) ||
      focusSections.some((section) => (section.items?.length ?? 0) > 0),
  );

  if (!showRecommendations) {
    return (
      <section className="space-y-8">
        <div
          className={`grid gap-8 ${showCurrentMilestoneCard ? "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start" : ""}`}
        >
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--dreambaby-muted)]">
              Dashboard overview
            </p>
            {hasFocusContent && (
              <MilestoneFocusHighlights sections={focusSections} summary={milestone.summary} />
            )}
          </div>

          {showCurrentMilestoneCard ? (
            <div className="lg:justify-self-end lg:w-full lg:max-w-[320px]">
              <CurrentMilestoneCard
                milestone={milestone}
                products={products}
                budgetLabel={budgetLabel}
                budgetDescription={budgetDescription}
                previousMilestone={previousMilestone ?? undefined}
                nextMilestone={nextMilestone ?? undefined}
                onSelectMilestone={onSelectMilestone}
                babyLabel={babyDisplayName}
                dueDateLabel={dueDateLabel}
                disableSticky
              />
            </div>
          ) : null}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onNavigateToCurated}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--baby-primary-200)] bg-white px-4 py-2 text-sm font-semibold text-[var(--baby-primary-500)] shadow-sm transition hover:border-[var(--baby-primary-300)] hover:text-[var(--baby-primary-600)]"
          >
            Explore curated picks →
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`grid gap-8 ${showCurrentMilestoneCard ? "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start" : ""}`}
    >
      <div className="space-y-6">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--dreambaby-muted)]">
          Dashboard overview
        </p>
        {hasFocusContent && (
          <MilestoneFocusHighlights sections={focusSections} summary={milestone.summary} />
        )}

        <section className="space-y-6 rounded-3xl border border-[rgba(207,210,198,0.35)] bg-white p-6 shadow-sm">
          <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-[var(--dreambaby-text)]">Milestone insights</h3>
              <p className="text-sm text-[var(--dreambaby-muted)]">
                Tailored picks, notes, and planning nudges for this stage.
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateToCurated}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--baby-primary-200)] bg-white px-4 py-2 text-sm font-semibold text-[var(--baby-primary-500)] shadow-sm transition hover:border-[var(--baby-primary-300)] hover:text-[var(--baby-primary-600)]"
            >
              Explore curated picks →
            </button>
          </header>

          <div className="rounded-2xl border border-[var(--baby-neutral-300)] bg-[var(--baby-neutral-50)] p-5">
            <h4 className="text-base font-semibold text-[var(--dreambaby-text)]">Recommended items</h4>
            <ul className="mt-4 space-y-3 text-sm text-[var(--dreambaby-text)]">
              {productsLoading ? (
                <li className="rounded-lg border border-[var(--baby-neutral-300)] bg-white p-3 text-center text-[var(--dreambaby-muted)]">
                  Loading products…
                </li>
              ) : products.length === 0 ? (
              <li className="rounded-lg border border-[var(--baby-neutral-300)] bg-white p-3 text-center text-[var(--dreambaby-muted)]">
                No products found for this milestone
              </li>
            ) : (
              products.slice(0, 5).map((product) => {
                const primaryMilestone = product.milestoneIds[0] as MilestoneId | undefined;
                const milestoneLabel = primaryMilestone
                  ? orderedMilestones.find((item) => item.id === primaryMilestone)?.label ?? null
                  : null;
                const badges = [
                  product.isEcoFriendly ? "Eco choice" : null,
                  milestoneLabel,
                  product.aiCategories?.[0],
                ].filter((badge): badge is string => Boolean(badge));

                return (
                  <li
                    key={product.id}
                    className="rounded-xl border border-[rgba(111,144,153,0.18)] bg-white px-4 py-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{product.name}</p>
                        <p className="text-xs text-[var(--dreambaby-muted)]">
                          {product.category} · {formatCurrency(product.price)}
                        </p>
                        {badges.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-wide text-[var(--dreambaby-muted)]">
                            {badges.map((badge) => (
                              <span key={badge} className="dreambaby-badge">
                                {badge}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {typeof product.rating === "number" && product.rating > 0 && (
                        <span className="text-xs font-semibold text-[var(--baby-primary-500)]">
                          {product.rating.toFixed(1)} ★
                        </span>
                      )}
                    </div>
                    {product.reviewSummary && (
                      <p className="mt-2 text-xs text-[var(--dreambaby-muted)] line-clamp-2">{product.reviewSummary}</p>
                    )}
                    {product.affiliateUrl && !product.affiliateUrl.includes("localhost") && (
                      <a
                        href={product.affiliateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--dreambaby-primary)] hover:text-[var(--dreambaby-secondary)]"
                      >
                        View offer →
                      </a>
                    )}
                  </li>
                );
              })
            )}
          </ul>
          </div>
        </section>
      </div>

      {showCurrentMilestoneCard ? (
        <div className="lg:justify-self-end lg:w-full lg:max-w-[320px]">
          <CurrentMilestoneCard
            milestone={milestone}
            products={products}
            budgetLabel={budgetLabel}
            budgetDescription={budgetDescription}
            previousMilestone={previousMilestone ?? undefined}
            nextMilestone={nextMilestone ?? undefined}
            onSelectMilestone={onSelectMilestone}
            babyLabel={babyDisplayName}
            dueDateLabel={dueDateLabel}
            disableSticky
          />
        </div>
      ) : null}
    </section>
  );
}
type CuratedSectionProps = {
  categoriesList: { id: CategoryId; label: string }[];
  selectedCategories: CategoryId[];
  onToggleCategory: (id: CategoryId) => void;
  recommended: RecommendedProduct;
  truncateText: (value: string | null | undefined, maxLength?: number) => string;
};

export function CuratedSection({
  categoriesList,
  selectedCategories,
  onToggleCategory,
  recommended,
  truncateText,
}: CuratedSectionProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileFiltersOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const selectedCategoryDetails = categoriesList.filter((category) =>
    selectedCategories.includes(category.id),
  );
  const visibleCategorySummary = selectedCategoryDetails.slice(0, 5);
  const hiddenCategoryCount = selectedCategoryDetails.length - visibleCategorySummary.length;

  return (
    <section className="space-y-6 rounded-3xl border border-[rgba(207,210,198,0.35)] bg-white p-6 shadow-sm">
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setMobileFiltersOpen((previous) => !previous)}
          className="flex w-full items-center justify-between rounded-2xl border border-[var(--baby-neutral-300)] bg-[var(--baby-neutral-50)] px-4 py-3 text-left text-sm font-semibold text-[var(--dreambaby-text)] shadow-sm"
          aria-expanded={mobileFiltersOpen}
          aria-controls="curated-mobile-filters"
        >
          <span>Filter categories</span>
          <span className="flex items-center gap-2 text-xs font-medium text-[var(--dreambaby-muted)]">
            {selectedCategories.length} selected
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              fill="none"
              className={`size-4 transition-transform ${mobileFiltersOpen ? "rotate-180" : ""}`}
            >
              <path
                d="M6 8l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>

        <div className="mt-3 flex flex-wrap gap-2">
          {visibleCategorySummary.length > 0 ? (
            visibleCategorySummary.map((category) => (
              <span
                key={category.id}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--baby-neutral-300)] bg-white px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-[var(--dreambaby-muted)]"
              >
                <span aria-hidden>•</span>
                {category.label}
              </span>
            ))
          ) : (
            <span className="text-xs text-[var(--dreambaby-muted)]">
              No categories selected yet.
            </span>
          )}
          {hiddenCategoryCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--baby-neutral-300)] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--dreambaby-text)]">
              +{hiddenCategoryCount}
              <span className="text-[var(--dreambaby-muted)]">more</span>
            </span>
          ) : null}
        </div>

        {mobileFiltersOpen ? (
          <ul
            id="curated-mobile-filters"
            className="mt-3 space-y-2 rounded-2xl border border-[var(--baby-neutral-300)] bg-white p-4 text-sm text-[var(--dreambaby-text)] shadow-sm"
          >
            {categoriesList.map((category) => {
              const isActive = selectedCategories.includes(category.id);
              return (
                <li key={category.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-md border border-[var(--baby-neutral-200)] bg-[var(--baby-neutral-50)] px-3 py-2 transition hover:border-[var(--baby-primary-200)]">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={() => onToggleCategory(category.id)}
                      className="size-4 rounded border-[var(--baby-neutral-300)] text-[var(--baby-primary-500)] focus:ring-[var(--baby-primary-300)]"
                    />
                    <span className="text-sm text-[var(--dreambaby-text)]">{category.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="hidden md:block">
          <div className="space-y-4 rounded-2xl border border-[var(--baby-neutral-300)] bg-[var(--baby-neutral-50)] p-5">
            <h2 className="text-base font-semibold text-[var(--dreambaby-text)]">Categories</h2>
            <ul className="space-y-2 text-sm text-[var(--dreambaby-text)]">
              {categoriesList.map((category) => {
                const isActive = selectedCategories.includes(category.id);
                return (
                  <li key={category.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-md border border-[var(--baby-neutral-300)] bg-white px-3 py-2 shadow-sm transition hover:border-[var(--baby-primary-200)]">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => onToggleCategory(category.id)}
                        className="size-4 rounded border-[var(--baby-neutral-300)] text-[var(--baby-primary-500)] focus:ring-[var(--baby-primary-300)]"
                      />
                      <span>{category.label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          {recommended.length === 0 ? (
            <p className="rounded-xl border border-[var(--baby-neutral-300)] bg-[var(--baby-neutral-50)] px-4 py-6 text-center text-sm text-[var(--dreambaby-muted)]">
              Adjust your categories to see recommendations.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {recommended.map((item) => (
                <article
                  key={item.product.id}
                  className="flex flex-col gap-3 rounded-xl border border-[rgba(207,210,198,0.35)] bg-white p-4 shadow-sm"
                >
                  {item.product.imageUrl && (
                    <Image
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      width={320}
                      height={200}
                      className="h-36 w-full rounded-lg object-cover"
                      unoptimized
                    />
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--dreambaby-text)]">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-[var(--dreambaby-muted)]">
                        {item.product.category} · ${" "}
                        {item.product.price.toFixed(0)}
                      </p>
                    </div>
                    {item.product.rating > 0 && (
                      <span className="text-xs font-semibold text-[var(--baby-primary-500)]">
                        {item.product.rating.toFixed(1)} ★
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--dreambaby-muted)]">
                    {truncateText(item.product.reviewSummary, 160)}
                  </p>
                  <p className="text-xs text-[var(--dreambaby-text)]">
                    {truncateText(item.rationale, 140)}
                  </p>
                  {item.product.affiliateUrl && (
                    <a
                      href={item.product.affiliateUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-[var(--baby-primary-500)] hover:text-[var(--baby-primary-600)]"
                    >
                      View product ↗
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const CalendarView = dynamic(() => import("@/components/CalendarView"), { ssr: false });

type CalendarSectionProps = {
  milestones: Milestone[];
  activeMilestoneId: MilestoneId;
  onSelectMilestone: (id: MilestoneId) => void;
  referenceDate: Date;
};

export function CalendarSection({ milestones, activeMilestoneId, onSelectMilestone, referenceDate }: CalendarSectionProps) {
  return (
    <section className="rounded-3xl border border-[rgba(207,210,198,0.35)] bg-white p-4 shadow-sm">
      <CalendarView
        milestones={milestones}
        activeMilestoneId={activeMilestoneId}
        onSelectMilestone={onSelectMilestone}
        referenceDate={referenceDate}
      />
    </section>
  );
}

type ProfileSectionProps = {
  profile: PreferenceProfile;
  setProfile: Dispatch<SetStateAction<PreferenceProfile>>;
  babyProfile: typeof defaultBabyProfile;
  setBabyProfile: Dispatch<SetStateAction<typeof defaultBabyProfile>>;
  onSaveProfile: () => Promise<void> | void;
  isSaving: boolean;
  saveMessage: string | null;
};

export function ProfileSection({
  profile,
  setProfile,
  babyProfile,
  setBabyProfile,
  onSaveProfile,
  isSaving,
  saveMessage,
}: ProfileSectionProps) {
  const [showHousehold, setShowHousehold] = useState(false);
  const selectFieldClassName =
    "w-full appearance-none rounded-2xl border border-[var(--baby-neutral-300)] bg-[var(--baby-neutral-50)] px-3 py-2 pr-10 text-sm text-[var(--dreambaby-text)] shadow-sm transition focus:border-[var(--baby-primary-300)] focus:outline-none focus:ring-2 focus:ring-[var(--baby-primary-100)]";

  const handleProfileChange = <K extends keyof PreferenceProfile>(key: K, value: PreferenceProfile[K]) => {
    setProfile((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleBabyChange = <K extends keyof typeof defaultBabyProfile>(key: K, value: (typeof defaultBabyProfile)[K]) => {
    setBabyProfile((current) => ({
      ...current,
      [key]: value,
    }));
  };

  return (
    <section className="space-y-8 rounded-3xl border border-[rgba(207,210,198,0.35)] bg-white p-6 shadow-sm">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold text-[var(--dreambaby-text)]">Family profile</h2>
        <p className="text-sm text-[var(--dreambaby-muted)]">
          Update your preferences so recommendations stay aligned with budget, style, and household rhythms.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-[var(--dreambaby-text)]">
          <span className="font-medium">Preferred budget</span>
          <div className="relative">
            <select
              value={profile.budget}
              onChange={(event) => handleProfileChange("budget", event.target.value as PreferenceProfile["budget"])}
              className={selectFieldClassName}
            >
              <option value="essentials">Essentials — under $120/mo</option>
              <option value="balanced">Balanced — mix of essentials and upgrades</option>
              <option value="premium">Premium — room for splurges</option>
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--dreambaby-muted)]">
              <svg
                aria-hidden
                viewBox="0 0 20 20"
                fill="none"
                className="size-4"
              >
                <path
                  d="M5 8l5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
        </label>

        <label className="flex flex-col gap-2 text-sm text-[var(--dreambaby-text)]">
          <span className="font-medium">Baby gender</span>
          <div className="relative">
            <select
              value={profile.babyGender}
              onChange={(event) => handleProfileChange("babyGender", event.target.value as PreferenceProfile["babyGender"])}
              className={selectFieldClassName}
            >
              <option value="surprise">Surprise</option>
              <option value="girl">Girl</option>
              <option value="boy">Boy</option>
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--dreambaby-muted)]">
              <svg
                aria-hidden
                viewBox="0 0 20 20"
                fill="none"
                className="size-4"
              >
                <path
                  d="M5 8l5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
        </label>

        <label className="flex flex-col gap-2 text-sm text-[var(--dreambaby-text)]">
          <span className="font-medium">Due date</span>
          <input
            type="date"
            value={profile.dueDate || ""}
            onChange={(event) => handleProfileChange("dueDate", event.target.value)}
            className="rounded-md border border-[var(--baby-neutral-300)] px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-[var(--dreambaby-text)]">
          <span className="font-medium">Location</span>
          <input
            type="text"
            placeholder="City, region, or climate notes"
            value={profile.location || ""}
            onChange={(event) => handleProfileChange("location", event.target.value)}
            className="rounded-md border border-[var(--baby-neutral-300)] px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-[var(--dreambaby-text)]">
          <span className="font-medium">Baby name (optional)</span>
          <input
            type="text"
            placeholder="Add the chosen name"
            value={babyProfile.name || ""}
            onChange={(event) => handleBabyChange("name", event.target.value)}
            className="rounded-md border border-[var(--baby-neutral-300)] px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-[var(--dreambaby-text)]">
          <span className="font-medium">Nickname or bump name</span>
          <input
            type="text"
            placeholder="e.g., Peanut, Little One"
            value={babyProfile.nickname || ""}
            onChange={(event) => handleBabyChange("nickname", event.target.value)}
            className="rounded-md border border-[var(--baby-neutral-300)] px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-[var(--dreambaby-text)]">
          <span className="font-medium">Color palette</span>
          <div className="relative">
            <select
              value={profile.colorPalette}
              onChange={(event) =>
                handleProfileChange("colorPalette", event.target.value as PreferenceProfile["colorPalette"])
              }
              className={selectFieldClassName}
            >
              <option value="neutral">Neutral</option>
              <option value="pastel">Pastel</option>
              <option value="bold">Bold</option>
              <option value="warm">Warm</option>
              <option value="cool">Cool</option>
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--dreambaby-muted)]">
              <svg
                aria-hidden
                viewBox="0 0 20 20"
                fill="none"
                className="size-4"
              >
                <path
                  d="M5 8l5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
        </label>

        <label className="flex flex-col gap-2 text-sm text-[var(--dreambaby-text)]">
          <span className="font-medium">Material focus</span>
          <div className="relative">
            <select
              value={profile.materialFocus}
              onChange={(event) =>
                handleProfileChange("materialFocus", event.target.value as PreferenceProfile["materialFocus"])
              }
              className={selectFieldClassName}
            >
              <option value="organic">Organic</option>
              <option value="performance">Performance</option>
              <option value="recycled">Recycled</option>
              <option value="classic">Classic</option>
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--dreambaby-muted)]">
              <svg
                aria-hidden
                viewBox="0 0 20 20"
                fill="none"
                className="size-4"
              >
                <path
                  d="M5 8l5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
        </label>

        <label className="flex items-center gap-2 text-sm text-[var(--dreambaby-text)]">
          <input
            type="checkbox"
            checked={profile.ecoPriority}
            onChange={(event) => handleProfileChange("ecoPriority", event.target.checked)}
            className="size-4 rounded border-[var(--baby-neutral-300)] text-[var(--baby-primary-500)] focus:ring-[var(--baby-primary-300)]"
          />
          <span>Prioritize eco-friendly picks</span>
        </label>
      </div>

      <button
        type="button"
        onClick={() => setShowHousehold((current) => !current)}
        className="text-sm font-semibold text-[var(--baby-primary-500)] hover:text-[var(--baby-primary-600)]"
      >
        {showHousehold ? "Hide" : "Show"} household & caregiver fields
      </button>

      {showHousehold && (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-[var(--dreambaby-text)]">
            <span className="font-medium">Primary hospital</span>
            <input
              type="text"
              value={babyProfile.hospital}
              onChange={(event) => handleBabyChange("hospital", event.target.value)}
              className="rounded-md border border-[var(--baby-neutral-300)] px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-[var(--dreambaby-text)]">
            <span className="font-medium">Provider</span>
            <input
              type="text"
              value={babyProfile.provider}
              onChange={(event) => handleBabyChange("provider", event.target.value)}
              className="rounded-md border border-[var(--baby-neutral-300)] px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-[var(--dreambaby-text)]">
            <span className="font-medium">Household setup</span>
            <input
              type="text"
              value={babyProfile.householdSetup}
              onChange={(event) => handleBabyChange("householdSetup", event.target.value)}
              className="rounded-md border border-[var(--baby-neutral-300)] px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-[var(--dreambaby-text)]">
            <span className="font-medium">Care network</span>
            <input
              type="text"
              value={babyProfile.careNetwork}
              onChange={(event) => handleBabyChange("careNetwork", event.target.value)}
              className="rounded-md border border-[var(--baby-neutral-300)] px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-[var(--dreambaby-text)] md:col-span-2">
            <span className="font-medium">Medical notes</span>
            <textarea
              rows={3}
              value={babyProfile.medicalNotes}
              onChange={(event) => handleBabyChange("medicalNotes", event.target.value)}
              className="rounded-md border border-[var(--baby-neutral-300)] px-3 py-2"
            />
          </label>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onSaveProfile()}
          className="inline-flex items-center justify-center rounded-full bg-[var(--baby-primary-500)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--baby-primary-600)] disabled:opacity-60"
          disabled={isSaving}
        >
          {isSaving ? "Saving…" : "Save profile"}
        </button>
        {saveMessage && <span className="text-sm text-[var(--dreambaby-muted)]">{saveMessage}</span>}
      </div>
    </section>
  );
}

type PlaceholderProps = {
  message: string;
};

export function LoadingState({ message }: PlaceholderProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--baby-neutral-50)]">
      <div className="space-y-3 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[var(--baby-primary-200)] border-b-[var(--baby-primary-500)]" />
        <p className="text-sm text-[var(--dreambaby-muted)]">{message}</p>
      </div>
    </div>
  );
}

export function SignInPrompt() {
  const { isLoaded, isSignedIn } = useSafeUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--baby-neutral-50)] px-6">
      <div className="max-w-md rounded-3xl bg-white p-10 text-center shadow-xl shadow-[rgba(107,142,156,0.15)]">
        <span className="theme-pill theme-pill--primary">Nestlings Planner</span>
        <h1 className="mt-4 text-3xl font-semibold text-[var(--dreambaby-text)]">Monthly essentials, made simple</h1>
        <p className="mt-2 text-sm text-[var(--dreambaby-muted)]">
          Sign in to access your dashboard, recommendations, and timeline guidance. No account yet? Start onboarding to answer a few quick questions first.
        </p>
        <div className="mt-8 space-y-3">
          {!isSignedIn && (
            <Link
              href="/onboarding"
              className="inline-flex w-full items-center justify-center rounded-full border border-[var(--baby-primary-200)] bg-[var(--baby-primary-50)] px-6 py-3 text-sm font-semibold text-[var(--baby-primary-700)] transition hover:border-[var(--baby-primary-300)] hover:bg-[var(--baby-primary-100)]"
            >
              Start onboarding without signing in
            </Link>
          )}
          {!clerkEnabled ? (
            <button
              type="button"
              disabled
              className="w-full rounded-full bg-[var(--baby-neutral-300)] px-6 py-3 text-sm font-semibold text-white"
            >
              Sign-in unavailable in this build
            </button>
          ) : !isLoaded ? (
            <button
              type="button"
              disabled
              className="w-full rounded-full bg-[var(--baby-neutral-300)] px-6 py-3 text-sm font-semibold text-white"
            >
              Preparing sign-in…
            </button>
          ) : isSignedIn ? (
            <button
              type="button"
              disabled
              className="w-full rounded-full bg-[var(--baby-neutral-300)] px-6 py-3 text-sm font-semibold text-white"
            >
              You&apos;re already signed in
            </button>
          ) : (
            <SignInButton mode="modal">
              <button className="w-full rounded-full bg-[var(--baby-primary-500)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--baby-primary-600)]">
                Sign in to continue
              </button>
            </SignInButton>
          )}
        </div>
      </div>
    </div>
  );
}
