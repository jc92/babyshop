"use client";

import dynamic from "next/dynamic";
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

const ProfileSection = dynamic(
  () => import("@/components/dashboard/sections").then((mod) => mod.ProfileSection),
  {
    ssr: false,
    loading: () => (
      <section className="rounded-3xl border border-[rgba(207,210,198,0.35)] bg-white p-6 text-sm text-[var(--dreambaby-muted)] shadow-sm">
        Preparing profile form…
      </section>
    ),
  },
);

export default function ProfilePage() {
  const {
    isLoaded,
    isSignedIn,
    profile,
    setProfile,
    babyProfile,
    setBabyProfile,
    handleSaveProfile,
    isSaving,
    saveMessage,
  } = useDashboardData();

  if (!isLoaded) {
    return <LoadingState message="Loading your profile…" />;
  }

  if (!isSignedIn) {
    return <SignInPrompt />;
  }

  return (
    <div className="min-h-screen bg-[var(--baby-neutral-50)] text-[var(--dreambaby-text)]">
      <Navigation />

      <header className="border-b border-[color:rgba(207,210,198,0.4)] pt-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-12">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--dreambaby-text)]">Family profile</h1>
          <p className="max-w-2xl text-sm text-[var(--dreambaby-muted)]">
            Keep your details up to date so Nestlings knows when to adjust recommendations, budgets, and eco sourcing preferences.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-14">
        <ProfileSection
          profile={profile}
          setProfile={setProfile}
          babyProfile={babyProfile}
          setBabyProfile={setBabyProfile}
          onSaveProfile={handleSaveProfile}
          isSaving={isSaving}
          saveMessage={saveMessage}
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
