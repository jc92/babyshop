import { describe, expect, it, beforeEach, vi } from "vitest";

import {
  clearOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
  type OnboardingDraft,
} from "@/lib/profile/onboardingDraft";

const STORAGE_KEY = "nestlings:onboarding-draft";

function buildDraft(overrides?: Partial<OnboardingDraft>): OnboardingDraft {
  return {
    savedAt: new Date("2024-01-01T00:00:00.000Z").toISOString(),
    plan: {
      dueDate: "2024-07-15",
      babyGender: "surprise",
      budget: "balanced",
      colorPalette: "neutral",
      materialFocus: "organic",
      ecoPriority: true,
      location: "Brooklyn, NY",
    },
    baby: {
      name: "Juniper",
      nickname: "Juni",
      parentOneName: "Alex",
      parentTwoName: "Taylor",
    },
    ...overrides,
  };
}

describe("onboardingDraft storage helpers", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("saves and loads a draft via localStorage", () => {
    const draft = buildDraft();

    expect(loadOnboardingDraft()).toBeNull();

    saveOnboardingDraft(draft);

    const stored = window.localStorage.getItem(STORAGE_KEY);
    expect(stored).not.toBeNull();

    const loaded = loadOnboardingDraft();
    expect(loaded).toEqual(draft);
  });

  it("returns null when stored payload is missing or malformed", () => {
    expect(loadOnboardingDraft()).toBeNull();

    window.localStorage.setItem(STORAGE_KEY, "not-json");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(loadOnboardingDraft()).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("clears any persisted draft", () => {
    saveOnboardingDraft(buildDraft());
    expect(loadOnboardingDraft()).not.toBeNull();

    clearOnboardingDraft();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(loadOnboardingDraft()).toBeNull();
  });
});
