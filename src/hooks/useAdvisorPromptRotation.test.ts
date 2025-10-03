import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAdvisorPromptRotation } from "./useAdvisorPromptRotation";

describe("useAdvisorPromptRotation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("returns the first prompt by default", () => {
    const prompts = ["Prompt A", "Prompt B"] as const;
    const { result } = renderHook(() =>
      useAdvisorPromptRotation(prompts, { intervalMs: 1000, isPaused: false }),
    );

    expect(result.current.activePrompt).toBe("Prompt A");
    expect(result.current.activePromptIndex).toBe(0);
    expect(result.current.hasPrompts).toBe(true);
  });

  it("cycles through prompts while not paused", () => {
    const prompts = ["Prompt A", "Prompt B", "Prompt C"] as const;
    const { result } = renderHook(({ isPaused }: { isPaused: boolean }) =>
      useAdvisorPromptRotation(prompts, { intervalMs: 500, isPaused }),
    {
      initialProps: { isPaused: false },
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.activePrompt).toBe("Prompt B");

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.activePrompt).toBe("Prompt C");

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.activePrompt).toBe("Prompt A");
  });

  it("resets to the first prompt when paused", () => {
    const prompts = ["Prompt A", "Prompt B"] as const;
    const { result, rerender } = renderHook(({ isPaused }: { isPaused: boolean }) =>
      useAdvisorPromptRotation(prompts, { intervalMs: 400, isPaused }),
    {
      initialProps: { isPaused: false },
    });

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.activePrompt).toBe("Prompt B");

    act(() => {
      rerender({ isPaused: true });
    });
    expect(result.current.activePrompt).toBe("Prompt A");
    expect(result.current.activePromptIndex).toBe(0);

    act(() => {
      rerender({ isPaused: false });
      vi.advanceTimersByTime(400);
    });
    expect(result.current.activePrompt).toBe("Prompt B");
  });

  it("handles an empty prompt list", () => {
    const { result } = renderHook(() =>
      useAdvisorPromptRotation([], { intervalMs: 250, isPaused: false }),
    );

    expect(result.current.activePrompt).toBe("");
    expect(result.current.activePromptIndex).toBe(0);
    expect(result.current.hasPrompts).toBe(false);

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(result.current.activePrompt).toBe("");
  });
});
