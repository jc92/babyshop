"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { SignInButton } from "@clerk/nextjs";
import { type Dispatch, type SetStateAction, useState } from "react";
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

type CurrentMilestoneCardProps = {
  milestone: Milestone;
  products: ProductSummary[];
  budgetLabel: string;
  budgetDescription: string;
  onSelectMilestone?: (id: MilestoneId) => void;
  previousMilestone?: Milestone | null;
  nextMilestone?: Milestone | null;
  babyLabel?: string | null;
  dueDateLabel?: string | null;
};

function CurrentMilestoneCard({
  milestone,
  products,
  budgetLabel,
  budgetDescription,
  onSelectMilestone,
  previousMilestone,
  nextMilestone,
  babyLabel,
  dueDateLabel,
}: CurrentMilestoneCardProps) {
  const queuedCount = products.length;
  const hasPrev = Boolean(previousMilestone && onSelectMilestone);
  const hasNext = Boolean(nextMilestone && onSelectMilestone);
  const focusAreas = Array.from(new Set(products.map((product) => product.category))).slice(0, 3);

  return (
    <section className="flex flex-col gap-5 rounded-3xl border border-[rgba(207,210,198,0.35)] bg-white p-6 shadow-sm lg:sticky lg:top-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--dreambaby-muted)]">
          Current milestone
        </p>
        <h2 className="text-xl font-semibold text-[var(--dreambaby-text)]">{milestone.label}</h2>
        <p className="text-sm text-[var(--dreambaby-muted)]">{milestone.description}</p>
        {(babyLabel || dueDateLabel) && (
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--baby-neutral-300)] bg-[var(--baby-neutral-100)] px-3 py-1 text-xs font-medium text-[var(--dreambaby-muted)]">
            <span className="inline-flex size-1.5 rounded-full bg-[var(--baby-primary-400)]" />
            {babyLabel || "Your baby"}
            {dueDateLabel && <span className="opacity-80">· {dueDateLabel}</span>}
          </div>
        )}
      </header>

      <div className="space-y-3 text-sm text-[var(--dreambaby-muted)]">
        <div className="rounded-xl border border-[var(--baby-neutral-300)] bg-[var(--baby-neutral-50)] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--dreambaby-muted)]">Timeline window</p>
          <p className="text-[var(--dreambaby-text)]">
            {milestone.monthRange[0]}–{milestone.monthRange[1]} months · {queuedCount} curated items queued
          </p>
        </div>
        <div className="rounded-xl border border-[var(--baby-neutral-300)] bg-[var(--baby-neutral-50)] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--dreambaby-muted)]">Focus areas</p>
          {focusAreas.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {focusAreas.map((area) => (
                <span
                  key={area}
                  className="rounded-full border border-[var(--baby-neutral-300)] bg-white px-3 py-1 text-xs font-semibold text-[var(--dreambaby-text)]"
                >
                  {area}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-[var(--dreambaby-text)]">Curated categories will appear as you add items from picks.</p>
          )}
        </div>
        <div className="rounded-xl border border-[var(--baby-neutral-300)] bg-[var(--baby-neutral-50)] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--dreambaby-muted)]">Plan summary</p>
          <p className="text-[var(--dreambaby-text)]">{budgetLabel}</p>
          <p className="text-xs leading-relaxed">{budgetDescription}</p>
        </div>
      </div>

      {onSelectMilestone && (
        <div className="flex items-center justify-between text-xs font-semibold text-[var(--dreambaby-muted)]">
          <button
            type="button"
            onClick={() => previousMilestone && onSelectMilestone(previousMilestone.id)}
            disabled={!hasPrev}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--baby-neutral-300)] px-3 py-1 transition hover:border-[var(--baby-primary-200)] hover:text-[var(--dreambaby-text)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← {previousMilestone ? previousMilestone.label : "Start"}
          </button>
          <button
            type="button"
            onClick={() => nextMilestone && onSelectMilestone(nextMilestone.id)}
            disabled={!hasNext}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--baby-neutral-300)] px-3 py-1 transition hover:border-[var(--baby-primary-200)] hover:text-[var(--dreambaby-text)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {nextMilestone ? nextMilestone.label : "Complete"} →
          </button>
        </div>
      )}
    </section>
  );
}
type MilestoneSummarySectionProps = {
  milestone: Milestone;
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

  const focusSections = [
    { title: "Baby focus", items: milestone.babyFocus },
    { title: "Caregiver focus", items: milestone.caregiverFocus },
    { title: "Home setup", items: milestone.environmentFocus },
    { title: "Health checklist", items: milestone.healthChecklist },
    { title: "Planning tips", items: milestone.planningTips },
  ];

  const hasFocusContent = Boolean(
    (milestone.summary && milestone.summary.trim().length > 0) ||
      focusSections.some((section) => (section.items?.length ?? 0) > 0),
  );

  if (!showRecommendations) {
    return (
      <section className="space-y-8">
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
        />

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
    <section className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
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
      />

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

        {hasFocusContent && (
          <div className="space-y-4 rounded-2xl border border-[var(--baby-neutral-300)] bg-[var(--baby-neutral-50)] p-5">
            {milestone.summary && (
              <p className="text-sm text-[var(--dreambaby-text)]">{milestone.summary}</p>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {focusSections.map((section) => {
                if (!section.items || section.items.length === 0) {
                  return null;
                }

                return (
                  <div key={section.title} className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--dreambaby-muted)]">
                      {section.title}
                    </h4>
                    <ul className="space-y-2 text-sm text-[var(--dreambaby-text)]">
                      {section.items.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-1 inline-block size-1.5 flex-shrink-0 rounded-full bg-[var(--baby-primary-300)]" />
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
  return (
    <section className="space-y-6 rounded-3xl border border-[rgba(207,210,198,0.35)] bg-white p-6 shadow-sm">
      <div className="grid gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
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
          <select
            value={profile.budget}
            onChange={(event) => handleProfileChange("budget", event.target.value as PreferenceProfile["budget"])}
            className="rounded-md border border-[var(--baby-neutral-300)] px-3 py-2"
          >
            <option value="essentials">Essentials — under $120/mo</option>
            <option value="balanced">Balanced — mix of essentials and upgrades</option>
            <option value="premium">Premium — room for splurges</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-[var(--dreambaby-text)]">
          <span className="font-medium">Baby gender</span>
          <select
            value={profile.babyGender}
            onChange={(event) => handleProfileChange("babyGender", event.target.value as PreferenceProfile["babyGender"])}
            className="rounded-md border border-[var(--baby-neutral-300)] px-3 py-2"
          >
            <option value="surprise">Surprise</option>
            <option value="girl">Girl</option>
            <option value="boy">Boy</option>
          </select>
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
          <select
            value={profile.colorPalette}
            onChange={(event) =>
              handleProfileChange("colorPalette", event.target.value as PreferenceProfile["colorPalette"])
            }
            className="rounded-md border border-[var(--baby-neutral-300)] px-3 py-2"
          >
            <option value="neutral">Neutral</option>
            <option value="pastel">Pastel</option>
            <option value="bold">Bold</option>
            <option value="warm">Warm</option>
            <option value="cool">Cool</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-[var(--dreambaby-text)]">
          <span className="font-medium">Material focus</span>
          <select
            value={profile.materialFocus}
            onChange={(event) =>
              handleProfileChange("materialFocus", event.target.value as PreferenceProfile["materialFocus"])
            }
            className="rounded-md border border-[var(--baby-neutral-300)] px-3 py-2"
          >
            <option value="organic">Organic</option>
            <option value="performance">Performance</option>
            <option value="recycled">Recycled</option>
            <option value="classic">Classic</option>
          </select>
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
