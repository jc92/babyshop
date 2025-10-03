"use client";

import dynamic from "next/dynamic";
import { Navigation } from "@/components/Navigation";
import { DeferredRender } from "@/components/DeferredRender";
import {
  CuratedSection,
  LoadingState,
  SignInPrompt,
} from "@/components/dashboard/sections";
import { categories } from "@/data/catalog";
import { useDashboardData } from "@/hooks/useDashboardData";

const AiAdvisorChat = dynamic(() => import("@/components/AiAdvisorChat"), {
  ssr: false,
  loading: () => null,
});

export default function CuratedPage() {
  const {
    isLoaded,
    isSignedIn,
    selectedCategories,
    handleToggleCategory,
    recommended,
    truncateText,
  } = useDashboardData();

  if (!isLoaded) {
    return <LoadingState message="Loading curated recommendations…" />;
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
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--dreambaby-text)]">Curated picks</h1>
            <p className="max-w-2xl text-sm text-[var(--dreambaby-muted)]">
              Explore agent-ranked gear tuned to your preferences. Toggle categories to see the mix shift before you commit to a shipment.
            </p>
          </div>
          <div className="rounded-full border border-[var(--baby-neutral-300)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--baby-secondary-500)]">
            {selectedCategories.length} selected categories
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-14 px-6 py-14">
        <CuratedSection
          categoriesList={categories}
          selectedCategories={selectedCategories}
          onToggleCategory={handleToggleCategory}
          recommended={recommended}
          truncateText={truncateText}
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
