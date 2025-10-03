"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { useSafeUser } from "@/lib/clerkClient";
import {
  clearOnboardingDraft,
  loadOnboardingDraft,
  type OnboardingDraft,
} from "@/lib/profile/onboardingDraft";

type SyncState = "idle" | "syncing" | "success" | "error";

export default function OnboardingCompletePage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useSafeUser();
  const [state, setState] = useState<SyncState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      router.replace("/onboarding");
      return;
    }

    const draft = loadOnboardingDraft();
    if (!draft || !draft.plan.dueDate) {
      router.replace("/overview");
      return;
    }

    const syncDraft = async (input: OnboardingDraft) => {
      setState("syncing");
      setError(null);

      try {
        const response = await fetch("/api/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            plan: input.plan,
            baby: input.baby,
          }),
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        clearOnboardingDraft();
        setState("success");
        router.replace("/overview");
      } catch (requestError) {
        console.error("Failed to sync onboarding draft", requestError);
        setState("error");
        setError("We couldn’t sync your onboarding details. Please try again.");
      }
    };

    void syncDraft(draft);
  }, [isLoaded, isSignedIn, router]);

  const handleRetry = () => {
    const draft = loadOnboardingDraft();
    if (!draft) {
      router.replace("/profile");
      return;
    }

    setState("syncing");
    setError(null);

    void (async () => {
      try {
        const response = await fetch("/api/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            plan: draft.plan,
            baby: draft.baby,
          }),
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        clearOnboardingDraft();
        setState("success");
        router.replace("/overview");
      } catch (requestError) {
        console.error("Failed to sync onboarding draft", requestError);
        setState("error");
        setError(
          "We still couldn’t sync your onboarding details. You can update them anytime from your profile.",
        );
      }
    })();
  };

  return (
    <div className="min-h-screen bg-[var(--baby-neutral-50)] text-[var(--dreambaby-text)]">
      <Navigation />
      <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
        <div className="rounded-3xl border border-[var(--baby-neutral-200)] bg-white px-8 py-10 shadow-sm">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--baby-primary-50)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--baby-primary-600)]">
            Syncing profile
          </span>
          <h1 className="mt-4 text-2xl font-semibold text-[var(--dreambaby-text)]">
            Finishing your setup…
          </h1>
          {(state === "syncing" || state === "idle") && (
            <p className="mt-3 text-sm text-[var(--dreambaby-muted)]">
              We’re saving your answers and loading your personalized dashboard.
            </p>
          )}
          {state === "error" && error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}

          <div className="mt-6">
            {(state === "syncing" || state === "idle") && (
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[var(--baby-primary-200)] border-b-[var(--baby-primary-500)]" />
            )}
            {state === "error" && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="w-full rounded-full bg-[var(--baby-primary-500)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--baby-primary-600)]"
                >
                  Try syncing again
                </button>
                <button
                  type="button"
                  onClick={() => router.replace("/profile")}
                  className="w-full rounded-full border border-[var(--baby-neutral-300)] px-5 py-3 text-sm font-semibold text-[var(--dreambaby-text)] transition hover:border-[var(--baby-primary-300)] hover:text-[var(--baby-primary-600)]"
                >
                  Head to my profile instead
                </button>
              </div>
            )}
            {state === "success" && (
              <p className="text-sm text-[var(--dreambaby-muted)]">
                All set! Redirecting you to your dashboard…
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
