"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { DeferredRender } from "@/components/DeferredRender";
import {
  LoadingState,
  SignInPrompt,
} from "@/components/dashboard/sections";
import { useDashboardData } from "@/hooks/useDashboardData";
import { formatDateForDisplay } from "@/lib/dateCalculations";

const AiAdvisorChat = dynamic(() => import("@/components/AiAdvisorChat"), {
  ssr: false,
  loading: () => null,
});

const MilestoneSummarySection = dynamic(
  () => import("@/components/dashboard/sections").then((mod) => mod.MilestoneSummarySection),
  {
    ssr: false,
    loading: () => (
      <section className="rounded-3xl border border-[rgba(207,210,198,0.35)] bg-white p-6 text-sm text-[var(--dreambaby-muted)] shadow-sm">
        Preparing milestone overview…
      </section>
    ),
  },
);

const CalendarSection = dynamic(
  () => import("@/components/dashboard/sections").then((mod) => mod.CalendarSection),
  {
    ssr: false,
    loading: () => (
      <section className="rounded-3xl border border-[rgba(207,210,198,0.35)] bg-white p-4 text-sm text-[var(--dreambaby-muted)] shadow-sm">
        Loading calendar…
      </section>
    ),
  },
);

const CurrentMilestoneCard = dynamic(
  () => import("@/components/dashboard/sections").then((mod) => mod.CurrentMilestoneCard),
  {
    ssr: false,
    loading: () => null,
  },
);

export default function OverviewPage() {
  const router = useRouter();
  const {
    isLoaded,
    isSignedIn,
    profile,
    babyProfile,
    activeMilestone,
    activeMilestoneProducts,
    activeMilestoneId,
    setActiveMilestoneId,
    timelineMilestones,
    productsLoading,
    budgetLabel,
    budgetDescription,
    formatCurrency,
    referenceDate,
  } = useDashboardData();

  if (!isLoaded) {
    return <LoadingState message="Loading your dashboard overview…" />;
  }

  if (!isSignedIn) {
    return <SignInPrompt />;
  }

  const orderedMilestones = timelineMilestones ?? [];
  const currentMilestoneIndex = activeMilestoneId
    ? orderedMilestones.findIndex((item) => item.id === activeMilestoneId)
    : -1;
  const previousMilestone = currentMilestoneIndex > 0 ? orderedMilestones[currentMilestoneIndex - 1] : null;
  const nextMilestone =
    currentMilestoneIndex >= 0 && currentMilestoneIndex < orderedMilestones.length - 1
      ? orderedMilestones[currentMilestoneIndex + 1]
      : null;
  const babyDisplayName = babyProfile?.nickname?.trim() || babyProfile?.name?.trim() || null;
  const formattedPlanDueDate = formatDateForDisplay(profile?.dueDate);
  const formattedBirthDate = formatDateForDisplay(babyProfile?.birthDate);
  const formattedBabyDueDate = formatDateForDisplay(babyProfile?.dueDate);
  const dueDateLabel = formattedPlanDueDate
    ? `Due ${formattedPlanDueDate}`
    : formattedBirthDate
      ? `Born ${formattedBirthDate}`
      : formattedBabyDueDate || null;
  const showCurrentMilestoneCardInHeader = Boolean(activeMilestone);

  return (
    <div className="min-h-screen bg-[var(--baby-neutral-50)] text-[var(--dreambaby-text)]">
      <Navigation />

      <main className="mx-auto w-full max-w-6xl px-6 pt-28 pb-20 space-y-14">
        <header className="rounded-3xl border border-[var(--baby-neutral-200)] bg-white/90 p-10 shadow-[0_24px_60px_rgba(111,144,153,0.12)] backdrop-blur">
          <div
            className={`grid gap-10 ${
              showCurrentMilestoneCardInHeader
                ? "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:items-start"
                : ""
            }`}
          >
            <div>
              <span className="theme-pill theme-pill--primary">Dashboard overview</span>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[var(--dreambaby-text)] sm:text-5xl">
                Stay one step ahead of every milestone
              </h1>
              <p className="mt-4 max-w-3xl text-lg text-[var(--dreambaby-muted)]">
                Review your current milestone, queued gear, and the calendar of upcoming reminders. Adjust preferences or jump to curated picks whenever you’re ready.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-[var(--dreambaby-muted)]">
                <span className="inline-flex items-center gap-2 rounded-full bg-[var(--baby-primary-100)] px-4 py-2 font-semibold text-[var(--baby-primary-600)]">
                  {profile.budget} budget plan
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[var(--baby-secondary-100)] px-4 py-2 font-semibold text-[var(--baby-secondary-500)]">
                  {timelineMilestones.length} milestones in view
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[var(--baby-neutral-100)] px-4 py-2 font-semibold text-[var(--dreambaby-muted)]">
                  {activeMilestone?.label ?? "No active milestone"}
                </span>
              </div>
            </div>

            {activeMilestone ? (
              <div className="lg:justify-self-end lg:w-full lg:max-w-[320px]">
                <CurrentMilestoneCard
                  milestone={activeMilestone}
                  products={activeMilestoneProducts ?? []}
                  budgetLabel={budgetLabel}
                  budgetDescription={budgetDescription}
                  previousMilestone={previousMilestone ?? undefined}
                  nextMilestone={nextMilestone ?? undefined}
                  onSelectMilestone={setActiveMilestoneId}
                  babyLabel={babyDisplayName ?? undefined}
                  dueDateLabel={dueDateLabel ?? undefined}
                  disableSticky
                />
              </div>
            ) : null}
          </div>
        </header>

        <MilestoneSummarySection
          milestone={activeMilestone}
          products={activeMilestoneProducts}
          productsLoading={productsLoading}
          babyProfile={babyProfile}
          profile={profile}
          formatCurrency={formatCurrency}
          budgetLabel={budgetLabel}
          budgetDescription={budgetDescription}
          onNavigateToCurated={() => router.push("/curated")}
          milestones={timelineMilestones}
          activeMilestoneId={activeMilestoneId}
          onSelectMilestone={setActiveMilestoneId}
          showRecommendations={false}
          showCurrentMilestoneCard={!showCurrentMilestoneCardInHeader}
        />

        <CalendarSection
          milestones={timelineMilestones}
          activeMilestoneId={activeMilestoneId}
          onSelectMilestone={(id) => setActiveMilestoneId(id)}
          referenceDate={referenceDate}
        />
      </main>

      <div>
        <DeferredRender
          eager
          fallback={
            <div className="mx-auto flex max-w-6xl items-center justify-center px-6 pb-12 text-sm text-[var(--dreambaby-muted)]">
              Initializing AI advisor…
            </div>
          }
        >
          <AiAdvisorChat />
        </DeferredRender>
      </div>
    </div>
  );
}
