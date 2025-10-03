"use client";

import { useEffect, useMemo, useState } from "react";

export const ADVISOR_PROMPT_ROTATION_INTERVAL_MS = 7000;

type UseAdvisorPromptRotationOptions = {
  /** pause rotation when true */
  isPaused?: boolean;
  /** override rotation cadence, defaults to 7s */
  intervalMs?: number;
};

export function useAdvisorPromptRotation(
  prompts: readonly string[],
  options?: UseAdvisorPromptRotationOptions,
) {
  const { isPaused = false, intervalMs = ADVISOR_PROMPT_ROTATION_INTERVAL_MS } = options ?? {};
  const normalizedPrompts = useMemo(
    () => prompts.filter((prompt) => typeof prompt === "string" && prompt.trim().length > 0),
    [prompts],
  );
  const promptCount = normalizedPrompts.length;
  const [activePromptIndex, setActivePromptIndex] = useState(0);

  useEffect(() => {
    if (promptCount === 0) {
      setActivePromptIndex(0);
      return;
    }

    setActivePromptIndex((current) => {
      if (current < promptCount) {
        return current;
      }

      return 0;
    });
  }, [promptCount]);

  useEffect(() => {
    if (isPaused) {
      setActivePromptIndex(0);
      return;
    }

    if (promptCount <= 1 || intervalMs <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActivePromptIndex((current) => {
        if (promptCount <= 0) {
          return 0;
        }

        return (current + 1) % promptCount;
      });
    }, intervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isPaused, intervalMs, promptCount]);

  const activePrompt = normalizedPrompts[activePromptIndex] ?? normalizedPrompts[0] ?? "";

  return {
    activePrompt,
    activePromptIndex,
    promptCount,
    hasPrompts: promptCount > 0,
  } as const;
}
