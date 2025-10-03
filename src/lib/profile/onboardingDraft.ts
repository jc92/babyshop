export type OnboardingDraftPlan = {
  dueDate: string;
  babyGender?: string;
  budget?: string;
  colorPalette?: string;
  materialFocus?: string;
  ecoPriority?: boolean;
  location?: string;
};

export type OnboardingDraftBaby = {
  name?: string;
  nickname?: string;
  hospital?: string;
  provider?: string;
  householdSetup?: string;
  careNetwork?: string;
  medicalNotes?: string;
  parentOneName?: string;
  parentTwoName?: string;
};

export type OnboardingDraft = {
  plan: OnboardingDraftPlan;
  baby: OnboardingDraftBaby;
  savedAt: string;
};

const STORAGE_KEY = "nestlings:onboarding-draft";

export function loadOnboardingDraft(): OnboardingDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as OnboardingDraft | null;
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch (error) {
    console.error("Failed to read onboarding draft", error);
  }

  return null;
}

export function saveOnboardingDraft(draft: OnboardingDraft) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch (error) {
    console.error("Failed to persist onboarding draft", error);
  }
}

export function clearOnboardingDraft() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}
