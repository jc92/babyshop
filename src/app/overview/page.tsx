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

  return (
    <div className="min-h-screen bg-[var(--baby-neutral-50)] text-[var(--dreambaby-text)]">
      <Navigation />

      <header className="border-b border-[color:rgba(207,210,198,0.4)] pt-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--dreambaby-text)]">Overview</h1>
            <p className="max-w-2xl text-sm text-[var(--dreambaby-muted)]">
              Track upcoming deliveries and developmental prompts across every milestone. Use the navigator below to jump forward or back as your plan evolves.
            </p>
          </div>
          <div className="rounded-full border border-[var(--baby-neutral-300)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--baby-primary-500)]">
            {profile.budget} plan · {timelineMilestones.length} milestones
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-14 px-6 py-14">
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
        />

        <CalendarSection
          milestones={timelineMilestones}
          activeMilestoneId={activeMilestoneId}
          onSelectMilestone={(id) => setActiveMilestoneId(id)}
          referenceDate={referenceDate}
        />
      </main>

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
  );
}
