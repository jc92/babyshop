"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { clerkEnabled, useSafeUser } from "@/lib/clerkClient";
import {
  clearOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
  type OnboardingDraft,
} from "@/lib/profile/onboardingDraft";

const householdOptions = [
  "Apartment",
  "Single-family home",
  "Multi-generational household",
  "Shared living",
  "Other",
];

const careNetworkOptions = [
  "Parents only",
  "Parents + grandparents",
  "Parents + nanny",
  "Parents + daycare",
  "Extended family",
  "Other",
];

type FormState = {
  babyName: string;
  babyNickname: string;
  dueDate: string;
  parentOneName: string;
  parentTwoName: string;
  hospital: string;
  provider: string;
  householdSetup: string;
  careNetwork: string;
  medicalNotes: string;
};

const initialState: FormState = {
  babyName: "",
  babyNickname: "",
  dueDate: "",
  parentOneName: "",
  parentTwoName: "",
  hospital: "",
  provider: "",
  householdSetup: "",
  careNetwork: "",
  medicalNotes: "",
};

type StepId = "basics" | "care-team" | "home";

type Step = {
  id: StepId;
  title: string;
  description: string;
};

const steps: Step[] = [
  {
    id: "basics",
    title: "Baby basics",
    description: "Share how you refer to baby and when they are arriving.",
  },
  {
    id: "care-team",
    title: "Care team",
    description: "Add the people and providers who keep baby supported.",
  },
  {
    id: "home",
    title: "Home setup",
    description: "Round out the details that shape recommendations.",
  },
];

function buildDraft(state: FormState): OnboardingDraft {
  return {
    plan: {
      dueDate: state.dueDate,
    },
    baby: {
      name: state.babyName || undefined,
      nickname: state.babyNickname || undefined,
      hospital: state.hospital || undefined,
      provider: state.provider || undefined,
      householdSetup: state.householdSetup || undefined,
      careNetwork: state.careNetwork || undefined,
      medicalNotes: state.medicalNotes || undefined,
      parentOneName: state.parentOneName || undefined,
      parentTwoName: state.parentTwoName || undefined,
    },
    savedAt: new Date().toISOString(),
  };
}

function hasRequiredFields(state: FormState) {
  return Boolean(state.dueDate && (state.babyName || state.babyNickname));
}

export default function OnboardingPage() {
  const router = useRouter();
  const { isSignedIn } = useSafeUser();
  const [form, setForm] = useState<FormState>(initialState);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);

  const currentStep = steps[currentStepIndex];
  const isFinalStep = currentStepIndex === steps.length - 1;

  useEffect(() => {
    const draft = loadOnboardingDraft();
    if (draft) {
      setForm((current) => ({
        ...current,
        babyName: draft.baby.name ?? "",
        babyNickname: draft.baby.nickname ?? "",
        dueDate: draft.plan.dueDate ?? "",
        parentOneName: draft.baby.parentOneName ?? "",
        parentTwoName: draft.baby.parentTwoName ?? "",
        hospital: draft.baby.hospital ?? "",
        provider: draft.baby.provider ?? "",
        householdSetup: draft.baby.householdSetup ?? "",
        careNetwork: draft.baby.careNetwork ?? "",
        medicalNotes: draft.baby.medicalNotes ?? "",
      }));
    }
    setHasLoadedDraft(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedDraft) {
      return;
    }

    const draft = buildDraft(form);
    saveOnboardingDraft(draft);
  }, [form, hasLoadedDraft]);

  const handleChange = (field: keyof FormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const isComplete = useMemo(() => hasRequiredFields(form), [form]);

  const canContinue = useMemo(() => {
    switch (currentStep.id) {
      case "basics":
        return hasRequiredFields(form);
      default:
        return true;
    }
  }, [currentStep.id, form]);

  const babySummary = useMemo(() => {
    const pieces = [
      form.babyName || form.babyNickname || "Baby",
      form.dueDate
        ? `Arriving ${new Date(form.dueDate).toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}`
        : null,
    ].filter(Boolean) as string[];

    return pieces.join(" · ");
  }, [form.babyName, form.babyNickname, form.dueDate]);

  const handleSignedInSubmit = async () => {
    if (!isComplete || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const draft = buildDraft(form);
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      clearOnboardingDraft();
      router.push("/overview");
    } catch (submitError) {
      console.error("Failed to save onboarding profile", submitError);
      setError("We couldn’t save your profile just yet. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrepareForSignUp = () => {
    const draft = buildDraft(form);
    saveOnboardingDraft(draft);
  };

  const handleContinue = () => {
    if (!canContinue) {
      return;
    }

    setCurrentStepIndex((index) => Math.min(index + 1, steps.length - 1));
  };

  const handleBack = () => {
    setCurrentStepIndex((index) => Math.max(index - 1, 0));
  };

  const showSummary = isFinalStep && isComplete;

  const renderStep = () => {
    switch (currentStep.id) {
      case "basics":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-[var(--dreambaby-text)]">Baby basics</h2>
              <p className="mt-2 text-sm text-[var(--dreambaby-muted)]">
                We use these details to anchor milestones and reminders. Share a name or nickname plus the due date to continue.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-[var(--dreambaby-text)]">
                Baby name
                <input
                  type="text"
                  value={form.babyName}
                  onChange={handleChange("babyName")}
                  placeholder="e.g., Harper"
                  className="rounded-lg border border-[var(--baby-neutral-300)] bg-white px-3 py-2 text-[var(--dreambaby-text)] shadow-sm focus:border-[var(--baby-primary-400)] focus:outline-none"
                />
                <span className="text-xs font-normal text-[var(--dreambaby-muted)]">
                  Leave blank if you prefer using a nickname for now.
                </span>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-[var(--dreambaby-text)]">
                Baby nickname
                <input
                  type="text"
                  value={form.babyNickname}
                  onChange={handleChange("babyNickname")}
                  placeholder="e.g., Sprout"
                  className="rounded-lg border border-[var(--baby-neutral-300)] bg-white px-3 py-2 text-[var(--dreambaby-text)] shadow-sm focus:border-[var(--baby-primary-400)] focus:outline-none"
                />
                <span className="text-xs font-normal text-[var(--dreambaby-muted)]">
                  Required if you haven’t shared a name yet.
                </span>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-[var(--dreambaby-text)] md:col-span-2">
                Due date <span className="text-[var(--baby-primary-600)]">*</span>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={handleChange("dueDate")}
                  className="rounded-lg border border-[var(--baby-neutral-300)] bg-white px-3 py-2 text-[var(--dreambaby-text)] shadow-sm focus:border-[var(--baby-primary-400)] focus:outline-none"
                />
              </label>
            </div>
          </div>
        );
      case "care-team":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-[var(--dreambaby-text)]">Care team</h2>
              <p className="mt-2 text-sm text-[var(--dreambaby-muted)]">
                Help us personalize reminders and prompts for everyone supporting baby. These fields are optional and can be updated anytime.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-[var(--dreambaby-text)]">
                Parent one name
                <input
                  type="text"
                  value={form.parentOneName}
                  onChange={handleChange("parentOneName")}
                  placeholder="e.g., Alex"
                  className="rounded-lg border border-[var(--baby-neutral-300)] bg-white px-3 py-2 text-[var(--dreambaby-text)] shadow-sm focus:border-[var(--baby-primary-400)] focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-[var(--dreambaby-text)]">
                Parent two name
                <input
                  type="text"
                  value={form.parentTwoName}
                  onChange={handleChange("parentTwoName")}
                  placeholder="e.g., Jordan"
                  className="rounded-lg border border-[var(--baby-neutral-300)] bg-white px-3 py-2 text-[var(--dreambaby-text)] shadow-sm focus:border-[var(--baby-primary-400)] focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-[var(--dreambaby-text)]">
                Primary hospital or birth location
                <input
                  type="text"
                  value={form.hospital}
                  onChange={handleChange("hospital")}
                  placeholder="e.g., Cedar Grove Medical"
                  className="rounded-lg border border-[var(--baby-neutral-300)] bg-white px-3 py-2 text-[var(--dreambaby-text)] shadow-sm focus:border-[var(--baby-primary-400)] focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-[var(--dreambaby-text)]">
                Provider or OB name
                <input
                  type="text"
                  value={form.provider}
                  onChange={handleChange("provider")}
                  placeholder="e.g., Dr. Rivera"
                  className="rounded-lg border border-[var(--baby-neutral-300)] bg-white px-3 py-2 text-[var(--dreambaby-text)] shadow-sm focus:border-[var(--baby-primary-400)] focus:outline-none"
                />
              </label>
            </div>
          </div>
        );
      case "home":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-[var(--dreambaby-text)]">Home setup</h2>
              <p className="mt-2 text-sm text-[var(--dreambaby-muted)]">
                Tailor checklists and product picks to where you live and who is helping. Everything here is optional—share what feels useful.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-[var(--dreambaby-text)]">
                Household setup
                <select
                  value={form.householdSetup}
                  onChange={handleChange("householdSetup")}
                  className="rounded-lg border border-[var(--baby-neutral-300)] bg-white px-3 py-2 text-[var(--dreambaby-text)] shadow-sm focus:border-[var(--baby-primary-400)] focus:outline-none"
                >
                  <option value="">Select one</option>
                  {householdOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-[var(--dreambaby-text)]">
                Care network
                <select
                  value={form.careNetwork}
                  onChange={handleChange("careNetwork")}
                  className="rounded-lg border border-[var(--baby-neutral-300)] bg-white px-3 py-2 text-[var(--dreambaby-text)] shadow-sm focus:border-[var(--baby-primary-400)] focus:outline-none"
                >
                  <option value="">Select one</option>
                  {careNetworkOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-[var(--dreambaby-text)] md:col-span-2">
                Notes for your agent
                <textarea
                  rows={4}
                  value={form.medicalNotes}
                  onChange={handleChange("medicalNotes")}
                  placeholder="Share allergies, birth plans, or anything else we should factor in."
                  className="rounded-lg border border-[var(--baby-neutral-300)] bg-white px-3 py-2 text-[var(--dreambaby-text)] shadow-sm focus:border-[var(--baby-primary-400)] focus:outline-none"
                />
              </label>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--baby-neutral-50)] text-[var(--dreambaby-text)]">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-12">
        <header className="space-y-3 text-center sm:text-left">
          <span className="inline-flex items-center gap-2 self-start rounded-full bg-[var(--baby-primary-50)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--baby-primary-600)]">
            Nestlings onboarding
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--dreambaby-text)]">
            Let’s personalize your plan
          </h1>
          <p className="max-w-2xl text-sm text-[var(--dreambaby-muted)]">
            A few quick questions help us tune milestone reminders, curated picks, and caregiver guidance. You can always adjust details in your profile after setup.
          </p>
        </header>

        <section className="mt-8 flex-1 rounded-3xl border border-[var(--baby-neutral-200)] bg-white shadow-sm">
          <div className="border-b border-[var(--baby-neutral-200)] bg-[var(--baby-neutral-50)]/60 px-6 py-4">
            <ol className="grid gap-4 sm:grid-cols-3">
              {steps.map((step, index) => {
                const status =
                  index === currentStepIndex ? "current" : index < currentStepIndex ? "complete" : "upcoming";
                return (
                  <li key={step.id} className="flex items-start gap-3">
                    <span
                      className={`flex size-8 items-center justify-center rounded-full border text-sm font-semibold ${
                        status === "current"
                          ? "border-[var(--baby-primary-500)] bg-[var(--baby-primary-500)] text-white"
                          : status === "complete"
                            ? "border-[var(--baby-primary-300)] bg-[var(--baby-primary-100)] text-[var(--baby-primary-700)]"
                            : "border-[var(--baby-neutral-300)] text-[var(--dreambaby-muted)]"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[var(--dreambaby-text)]">{step.title}</p>
                      <p className="mt-1 text-xs text-[var(--dreambaby-muted)]">{step.description}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="space-y-8 px-6 py-8 sm:px-8 sm:py-10">
            {renderStep()}

            {showSummary && (
              <div className="rounded-2xl border border-[var(--baby-neutral-200)] bg-[var(--baby-neutral-50)] px-5 py-4 text-sm">
                <p className="font-semibold text-[var(--dreambaby-text)]">Preview</p>
                <p className="mt-1 text-[var(--dreambaby-muted)]">
                  {babySummary}
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={currentStepIndex === 0}
                  className="inline-flex items-center rounded-full border border-[var(--baby-neutral-300)] px-4 py-2 text-sm font-semibold text-[var(--dreambaby-text)] transition hover:border-[var(--baby-primary-300)] hover:text-[var(--baby-primary-600)] disabled:cursor-not-allowed disabled:border-[var(--baby-neutral-200)] disabled:text-[var(--dreambaby-muted)]"
                >
                  Back
                </button>
                <span className="text-xs text-[var(--dreambaby-muted)]">
                  Step {currentStepIndex + 1} of {steps.length}
                </span>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                {!isFinalStep ? (
                  <button
                    type="button"
                    onClick={handleContinue}
                    disabled={!canContinue}
                    className="inline-flex items-center justify-center rounded-full bg-[var(--baby-primary-500)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--baby-primary-600)] disabled:cursor-not-allowed disabled:bg-[var(--baby-neutral-300)]"
                  >
                    Continue
                  </button>
                ) : isSignedIn ? (
                  <button
                    type="button"
                    onClick={handleSignedInSubmit}
                    disabled={!isComplete || isSubmitting}
                    className="inline-flex items-center justify-center rounded-full bg-[var(--baby-primary-500)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--baby-primary-600)] disabled:cursor-not-allowed disabled:bg-[var(--baby-neutral-300)]"
                  >
                    {isSubmitting ? "Saving…" : "Save and see my dashboard"}
                  </button>
                ) : clerkEnabled ? (
                  <SignUpButton
                    mode="modal"
                    afterSignUpUrl="/onboarding/complete"
                    afterSignInUrl="/overview"
                  >
                    <button
                      type="button"
                      onClick={handlePrepareForSignUp}
                      disabled={!isComplete}
                      className="inline-flex items-center justify-center rounded-full bg-[var(--baby-primary-500)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--baby-primary-600)] disabled:cursor-not-allowed disabled:bg-[var(--baby-neutral-300)]"
                    >
                      Create my account
                    </button>
                  </SignUpButton>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center justify-center rounded-full bg-[var(--baby-neutral-300)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm"
                  >
                    Clerk onboarding is disabled in this environment
                  </button>
                )}

                {!isSignedIn && clerkEnabled && (
                  <div className="text-center text-xs text-[var(--dreambaby-muted)] sm:text-left">
                    <span>Already have an account? </span>
                    <SignInButton mode="modal" afterSignInUrl="/overview">
                      <button
                        type="button"
                        className="font-semibold text-[var(--baby-primary-600)] underline-offset-4 hover:underline"
                      >
                        Sign in instead
                      </button>
                    </SignInButton>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
