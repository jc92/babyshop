"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { SignInButton } from "@clerk/nextjs";
import { type Milestone, type MilestoneId } from "@/data/catalog";
import { MilestoneService } from "@/lib/milestones/service";
import { clerkEnabled, useSafeUser } from "@/lib/clerkClient";
import { toIsoDateString } from "@/lib/dateCalculations";
import { useAdvisorPromptRotation } from "@/hooks/useAdvisorPromptRotation";
import { MiniMarkdown } from "@/components/MiniMarkdown";

type AdvisorProfile = {
  dueDate?: string;
  babyGender?: string;
  budget?: string;
  colorPalette?: string;
  materialFocus?: string;
  ecoPriority?: boolean;
  babyNickname?: string;
  hospital?: string;
  householdSetup?: string;
  careNetwork?: string;
  medicalNotes?: string;
  birthDate?: string;
  location?: string;
};

type AdvisorSuggestion = {
  productId: string;
  name: string | null;
  brand: string | null;
  category: string | null;
  priceCents: number | null;
  rating: number | null;
  reviewCount: number | null;
  affiliateUrl?: string | null;
  ecoFriendly?: boolean | null;
  premium?: boolean | null;
  reason: string;
};

type ChatBubble = {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: AdvisorSuggestion[];
  error?: boolean;
  addProductSourceUrl?: string | null;
};

const advisorPrompts = [
  "Need help building your registry? Ask for a starter list.",
  "Curious about trimester must-haves? I can help!",
  "Looking for eco-friendly swaps? I know vetted picks.",
  "Getting baby's sleep space ready? Let's make a plan.",
] as const;

const CHAT_STORAGE_KEY = "nestlings:advisor-chat";

type PersistedChatState = {
  isOpen: boolean;
  inputValue: string;
  milestoneId: MilestoneId;
  messages: ChatBubble[];
};

function mergeClassNames(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatPrice(priceCents: number | null | undefined) {
  if (priceCents === null || priceCents === undefined) {
    return null;
  }
  return `$${(priceCents / 100).toFixed(2)}`;
}

export default function AiAdvisorChat() {
  const { isLoaded, isSignedIn } = useSafeUser();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatBubble[]>([]);
  const [profile, setProfile] = useState<AdvisorProfile | null>(null);
  const FALLBACK_MILESTONE_ID: MilestoneId = "prenatal";
  const [availableMilestones, setAvailableMilestones] = useState<Milestone[]>([]);
  const milestoneOptions = useMemo(
    () =>
      availableMilestones.map((milestone) => ({
        id: milestone.id,
        label: milestone.label,
      })),
    [availableMilestones],
  );
  const [milestoneId, setMilestoneId] = useState<MilestoneId>(FALLBACK_MILESTONE_ID);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingProductUrl, setIsCreatingProductUrl] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const { activePrompt, activePromptIndex } = useAdvisorPromptRotation(advisorPrompts, {
    isPaused: isOpen,
  });
  const storageHydratedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const module = await import("@/data/defaultMilestones");
        if (!isMounted) {
          return;
        }
        if (module?.defaultMilestones) {
          setAvailableMilestones(module.defaultMilestones);
        }
      } catch (error) {
        console.error("Failed to load fallback milestones", error);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (storageHydratedRef.current) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
      if (!raw) {
        storageHydratedRef.current = true;
        return;
      }

      const parsed = JSON.parse(raw) as Partial<PersistedChatState> | null;
      if (!parsed || typeof parsed !== "object") {
        storageHydratedRef.current = true;
        return;
      }

      if (typeof parsed.isOpen === "boolean") {
        setIsOpen(parsed.isOpen);
      }

      if (typeof parsed.inputValue === "string") {
        setInputValue(parsed.inputValue);
      }

      if (Array.isArray(parsed.messages)) {
        setMessages(parsed.messages as ChatBubble[]);
      }

      if (parsed.milestoneId) {
        setMilestoneId(parsed.milestoneId as MilestoneId);
      }
    } catch (error) {
      console.error("Failed to read advisor chat state", error);
    } finally {
      storageHydratedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!storageHydratedRef.current) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const payload: PersistedChatState = {
      isOpen,
      inputValue,
      milestoneId,
      messages,
    };

    try {
      window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error("Failed to persist advisor chat state", error);
    }
  }, [isOpen, inputValue, messages, milestoneId]);

  useEffect(() => {
    let cancelled = false;

    const loadMilestones = async () => {
      try {
        const data = await MilestoneService.list();
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setAvailableMilestones(data);
          setMilestoneId((current) => {
            if (data.some((milestone) => milestone.id === current)) {
              return current;
            }
            return data[0].id;
          });
        }
      } catch (error) {
        console.error("Error fetching milestones for advisor:", error);
      }
    };

    void loadMilestones();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isSignedIn) {
      setProfile(null);
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      setProfileLoading(true);
      try {
        const response = await fetch("/api/profile", { method: "GET" });
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const plan = data?.data?.plan ?? {};
        const baby = data?.data?.baby ?? {};
        if (!cancelled) {
          const normalizedDueDate = toIsoDateString(plan.dueDate);
          const normalizedBirthDate = toIsoDateString(baby.birthDate);
          setProfile({
            dueDate: normalizedDueDate ?? undefined,
            babyGender: plan.babyGender,
            budget: plan.budget,
            colorPalette: plan.colorPalette,
            materialFocus: plan.materialFocus,
            ecoPriority: plan.ecoPriority,
            babyNickname: baby.nickname,
            hospital: baby.hospital,
            householdSetup: baby.householdSetup,
            careNetwork: baby.careNetwork,
            medicalNotes: baby.medicalNotes,
            birthDate: normalizedBirthDate ?? undefined,
            location: plan.location,
          });
        }
      } catch {
        if (!cancelled) {
          setProfile(null);
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleToggle = () => {
    if (!isSignedIn) {
      setIsOpen(true);
      return;
    }
    setIsOpen((open) => !open);
  };

  const appendAssistantMessage = (message: ChatBubble) => {
    setMessages((current) => [...current, message]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSignedIn || isLoading) {
      return;
    }

    const trimmed = inputValue.trim();
    if (!trimmed) {
      return;
    }

    const userMessage: ChatBubble = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    const conversation = [...messages, userMessage]
      .filter((message) => !message.error)
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    const assistantId = `assistant-${Date.now()}`;

    setMessages((current) => [
      ...current,
      userMessage,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        suggestions: [],
        addProductSourceUrl: null,
      },
    ]);

    setInputValue("");
    setIsLoading(true);

    const updateAssistant = (updater: (message: ChatBubble) => ChatBubble) => {
      setMessages((current) =>
        current.map((message) => (message.id === assistantId ? updater(message) : message)),
      );
    };

    try {
      const response = await fetch("/api/ai/advisor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: conversation,
          profile: profile ?? undefined,
          milestoneId,
        }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        const errorMessage = typeof data.error === "string" ? data.error : "Advisor is unavailable right now.";
        updateAssistant(() => ({
          id: assistantId,
          role: "assistant",
          content: errorMessage,
          error: true,
        }));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const flushBuffer = (rawLine: string) => {
        const line = rawLine.trim();
        if (!line) {
          return;
        }

        try {
          const payload = JSON.parse(line) as { type?: string; value?: unknown; reply?: string };

          switch (payload.type) {
            case "token": {
              const token = typeof payload.value === "string" ? payload.value : "";
              if (!token) break;
              updateAssistant((message) => ({
                ...message,
                content: `${message.content}${token}`,
              }));
              break;
            }
            case "message": {
              const messageValue = typeof payload.value === "string" ? payload.value : "";
              updateAssistant((message) => ({
                ...message,
                content: messageValue || message.content,
              }));
              break;
            }
            case "suggestions": {
              const suggestions = Array.isArray(payload.value) ? payload.value : [];
              const typedSuggestions = suggestions.reduce<AdvisorSuggestion[]>((acc, suggestion) => {
                if (typeof suggestion !== "object" || suggestion === null) {
                  return acc;
                }

                const record = suggestion as Record<string, unknown>;
                const idCandidate = record.productId ?? record.id;
                if (typeof idCandidate !== "string" || idCandidate.length === 0) {
                  return acc;
                }

                const priceCents =
                  typeof record.priceCents === "number"
                    ? record.priceCents
                    : typeof record.price_cents === "number"
                      ? record.price_cents
                      : null;

                const rawUrl =
                  typeof record.affiliateUrl === "string"
                    ? record.affiliateUrl
                    : typeof record.url === "string"
                      ? record.url
                      : undefined;

                const affiliateUrl =
                  typeof rawUrl === "string" && rawUrl.startsWith("http")
                    ? rawUrl
                    : undefined;

                const normalized: AdvisorSuggestion = {
                  productId: idCandidate,
                  name: typeof record.name === "string" ? record.name : null,
                  brand: typeof record.brand === "string" ? record.brand : null,
                  category: typeof record.category === "string" ? record.category : null,
                  priceCents,
                  rating: typeof record.rating === "number" ? record.rating : null,
                  reviewCount:
                    typeof record.reviewCount === "number"
                      ? record.reviewCount
                      : typeof record.review_count === "number"
                        ? record.review_count
                        : null,
                  affiliateUrl,
                  ecoFriendly:
                    typeof record.ecoFriendly === "boolean"
                      ? record.ecoFriendly
                      : null,
                  premium:
                    typeof record.premium === "boolean"
                      ? record.premium
                      : null,
                  reason:
                    typeof record.reason === "string"
                      ? record.reason
                      : "",
                } satisfies AdvisorSuggestion;

                acc.push(normalized);
                return acc;
              }, []);
              const actionableSuggestions = typedSuggestions.filter((item) => {
                if (!item) {
                  return false;
                }
                const link = item.affiliateUrl;
                return typeof link === "string" && link.trim().length > 0;
              });
              const hasSingleActionable = actionableSuggestions.length === 1;
              const addProductSourceUrl = hasSingleActionable
                ? actionableSuggestions[0]?.affiliateUrl ?? null
                : null;

              updateAssistant((message) => ({
                ...message,
                suggestions: typedSuggestions,
                addProductSourceUrl,
              }));
              break;
            }
            case "error": {
              const errorText = typeof payload.value === "string" ? payload.value : "Advisor ran into an issue.";
              updateAssistant(() => ({
                id: assistantId,
                role: "assistant",
                content: errorText,
                error: true,
              }));
              break;
            }
            case "done": {
              // No action needed; handled when stream closes.
              break;
            }
            default: {
              break;
            }
          }
        } catch (error) {
          updateAssistant(() => ({
            id: assistantId,
            role: "assistant",
            content: error instanceof Error ? error.message : "Advisor response could not be parsed.",
            error: true,
          }));
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        const chunk = value ? decoder.decode(value, { stream: true }) : "";
        buffer += chunk;

        let newlineIndex = buffer.indexOf("\n");
        while (newlineIndex !== -1) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          flushBuffer(line);
          newlineIndex = buffer.indexOf("\n");
        }

        if (done) {
          if (buffer.trim()) {
            flushBuffer(buffer);
          }
          break;
        }
      }
    } catch (error) {
      updateAssistant(() => ({
        id: assistantId,
        role: "assistant",
        content: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        error: true,
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProduct = async (options?: { messageId?: string; url?: string; suggestion?: AdvisorSuggestion }) => {
    if (!isSignedIn || isCreatingProduct) {
      return;
    }

    const directUrl = options?.url?.trim();
    const messageId = options?.messageId;
    const suggestionHint = options?.suggestion;

    const targetMessage =
      messageId
        ? messages.find((message) => message.id === messageId && message.role === "assistant")
        : [...messages].reverse().find((message) => message.role === "assistant");

    const resolvedSuggestion =
      suggestionHint ??
      (targetMessage?.suggestions ?? []).find((candidate) => candidate?.affiliateUrl === directUrl) ??
      (targetMessage?.suggestions ?? []).find((candidate) => candidate?.affiliateUrl === targetMessage?.addProductSourceUrl);

    const initialUrl =
      (directUrl && directUrl.length > 0
        ? directUrl
        : targetMessage?.addProductSourceUrl ?? resolvedSuggestion?.affiliateUrl ?? "")
        .trim();

    if (initialUrl.length === 0) {
      appendAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "I need the product link in order to save it. Open the item you like and copy the full URL first.",
        error: true,
        addProductSourceUrl: null,
      });
      return;
    }

    const clearSourceUrl = () => {
      if (!targetMessage) {
        return;
      }
      setMessages((current) =>
        current.map((message) =>
          message.id === targetMessage.id ? { ...message, addProductSourceUrl: null } : message,
        ),
      );
    };

    const reportError = (message: string, link: string) => {
      appendAssistantMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: `${message}\nSource: ${link}`.trim(),
        error: true,
        addProductSourceUrl: null,
      });
      clearSourceUrl();
    };

    const attemptImport = async (candidateUrl: string, allowRepair: boolean): Promise<boolean> => {
      setIsCreatingProductUrl(candidateUrl);

      if (!/^https?:\/\//i.test(candidateUrl)) {
        reportError("That link doesn’t look like a valid URL. Try copying the full https:// address from your browser and paste it again.", candidateUrl);
        return false;
      }

      try {
        const validationResponse = await fetch("/api/utils/validate-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: candidateUrl }),
        });
        const validationData = await validationResponse.json().catch(() => ({}));

        if (!validationResponse.ok || !validationData.valid) {
          const status = validationData.status as number | undefined;
          const validationError =
            typeof validationData.error === "string" ? validationData.error : "Unable to reach that link.";

          if (
            allowRepair &&
            resolvedSuggestion &&
            (status === 404 || validationError.includes("404"))
          ) {
            const repairResponse = await fetch("/api/ai/repair-url", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                url: candidateUrl,
                suggestion: {
                  name: resolvedSuggestion.name ?? undefined,
                  brand: resolvedSuggestion.brand ?? undefined,
                  category: resolvedSuggestion.category ?? undefined,
                },
                milestoneId,
                profile,
              }),
            });

            const repairData = await repairResponse.json().catch(() => ({}));
            if (
              repairResponse.ok &&
              typeof repairData.url === "string" &&
              repairData.url.length > 0 &&
              repairData.url !== candidateUrl
            ) {
              return attemptImport(repairData.url, false);
            }
          }

          reportError(validationError, candidateUrl);
          return false;
        }

        const normalizedUrl =
          typeof validationData.finalUrl === "string" && validationData.finalUrl.length > 0
            ? validationData.finalUrl
            : candidateUrl;

        const addResponse = await fetch("/api/products/add-from-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceUrl: normalizedUrl, milestoneId }),
        });
        const addData = await addResponse.json().catch(() => ({}));

        if (!addResponse.ok) {
          const baseError = typeof addData.error === "string" ? addData.error : "Unable to add that product right now.";
          const detailSuffix =
            typeof addData.details === "string" && addData.details.trim().length > 0
              ? `\nDetails: ${addData.details.trim()}`
              : "";
          reportError(`${baseError}${detailSuffix}`.trim(), normalizedUrl);
          return false;
        }

        const product = addData.product as
          | { id?: string; name?: string; category?: string; brand?: string }
          | undefined;

        const shortUrl = normalizedUrl.length > 80 ? `${normalizedUrl.slice(0, 77)}…` : normalizedUrl;
        const confirmationMessage = product?.name
          ? `✅ Saved “${product.name}” to the catalog${product.category ? ` (${product.category})` : ""}.`
          : `Product added to the catalog from ${shortUrl}.`;

        appendAssistantMessage({
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: confirmationMessage,
          suggestions: product?.id
            ? [
                {
                  productId: product.id,
                  name: product.name ?? null,
                  brand: product.brand ?? null,
                  category: product.category ?? null,
                  priceCents: null,
                  rating: null,
                  reviewCount: null,
                  affiliateUrl: undefined,
                  ecoFriendly: null,
                  premium: null,
                  reason: "Newly added via advisor.",
                },
              ]
            : [],
          addProductSourceUrl: null,
        });
        clearSourceUrl();
        return true;
      } catch (error) {
        reportError(error instanceof Error ? error.message : "Something went wrong while adding the product.", candidateUrl);
        return false;
      }
    };

    const success = await attemptImport(initialUrl, true);
    setIsCreatingProductUrl(null);

    if (!success) {
      return;
    }
  };
  const milestoneLabel = useMemo(() => {
    return milestoneOptions.find((option) => option.id === milestoneId)?.label ?? "Milestone";
  }, [milestoneId, milestoneOptions]);

  const isCreatingProduct = isCreatingProductUrl !== null;

  if (!isLoaded) {
    return null;
  }

  return (
    <>
      <div
        className={`fixed bottom-0 right-0 top-20 z-40 flex transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
      >
        <aside className="pointer-events-auto flex h-full w-[90vw] max-w-[28rem] flex-col border-l border-[var(--baby-neutral-300)] bg-white shadow-xl sm:w-[26rem]">
          <div className="flex items-center justify-between border-b border-[var(--baby-neutral-300)] bg-[var(--baby-primary-500)] px-4 py-3 text-white">
            <div className="flex flex-col">
              <span className="text-sm font-semibold">AI Baby Advisor</span>
              {isSignedIn ? (
                <span className="text-xs text-white/85">{milestoneLabel}</span>
              ) : (
                <span className="text-xs text-white/85">Sign in to start chatting</span>
              )}
            </div>
            <button
              type="button"
              className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/30"
              onClick={() => setIsOpen(false)}
            >
              Close
            </button>
          </div>

          {isSignedIn ? (
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex items-center justify-between border-b border-[var(--baby-neutral-300)] px-4 py-2 text-xs text-[var(--dreambaby-muted)]">
                <label className="flex items-center gap-2">
                  <span className="font-medium text-[var(--dreambaby-text)]">Milestone</span>
                  <select
                    className="rounded-md border border-[var(--baby-neutral-300)] bg-white px-2 py-1 text-xs focus:border-[var(--baby-primary-300)] focus:outline-none focus:ring-1 focus:ring-[var(--baby-primary-200)]"
                    value={milestoneId}
                    onChange={(event) => setMilestoneId(event.target.value as MilestoneId)}
                  >
                    {milestoneOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                {profileLoading && <span className="text-[var(--dreambaby-muted)]">Loading…</span>}
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                {messages.length === 0 && !isLoading && (
                  <div className="rounded-lg bg-[var(--baby-neutral-100)] p-3 text-[var(--dreambaby-muted)]">
                    Ask about gear, compare options, or say what you need help with. I’ll pull products matched to your plan.
                  </div>
                )}

                {messages.map((message) => (
                  <div key={message.id} className={`mb-4 flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 ${
                        message.role === "user"
                          ? "bg-[var(--baby-primary-500)] text-white shadow-lg shadow-[rgba(111,144,153,0.22)]"
                          : message.error
                            ? "bg-red-50 text-red-700"
                            : "bg-[var(--baby-neutral-100)] text-[var(--dreambaby-text)]"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <MiniMarkdown
                          content={message.content}
                          className="space-y-2 text-[0.95rem] leading-relaxed"
                        />
                      ) : (
                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      )}

                      {message.suggestions && message.suggestions.length > 0 && (
                        <div className="mt-4 space-y-4">
                          {message.suggestions.map((suggestion) => (
                            <div
                              key={suggestion.productId}
                              className="rounded-2xl border border-[var(--baby-neutral-200)] bg-white p-4 text-left text-xs text-[var(--dreambaby-text)] shadow-[0px_18px_32px_rgba(130,152,142,0.12)]"
                            >
                              <div className="flex items-start justify-between text-[var(--dreambaby-text)]">
                                <span className="font-semibold">{suggestion.name ?? "Product"}</span>
                                {formatPrice(suggestion.priceCents) && (
                                  <span className="font-medium">{formatPrice(suggestion.priceCents)}</span>
                                )}
                              </div>
                              <div className="mt-1 flex flex-wrap gap-2 text-[var(--dreambaby-muted)]">
                                {suggestion.brand && <span>{suggestion.brand}</span>}
                                {suggestion.category && <span>• {suggestion.category}</span>}
                                {typeof suggestion.rating === "number" && (
                                  <span>• {suggestion.rating.toFixed(1)}★</span>
                                )}
                                {suggestion.ecoFriendly && <span>• Eco</span>}
                                {suggestion.premium && <span>• Premium</span>}
                              </div>
                              {suggestion.reason && (
                                <p className="mt-2 text-[var(--dreambaby-muted)]">{suggestion.reason}</p>
                              )}
                              {suggestion.affiliateUrl && (
                                <div className="mt-3 flex items-center justify-between gap-3">
                                  <a
                                    href={suggestion.affiliateUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[var(--baby-secondary-400)] hover:text-[var(--baby-secondary-500)]"
                                  >
                                    View product ↗
                                  </a>
                                  {(() => {
                                    const isSavingThisLink =
                                      isCreatingProductUrl !== null &&
                                      suggestion.affiliateUrl === isCreatingProductUrl;
                                    return (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleCreateProduct({
                                            messageId: message.id,
                                            url: suggestion.affiliateUrl ?? undefined,
                                            suggestion,
                                          })
                                        }
                                        className="inline-flex items-center justify-center gap-1 rounded-full border border-[var(--baby-primary-400)] px-3 py-1 text-[11px] font-semibold text-[var(--baby-primary-500)] transition hover:bg-[var(--baby-primary-50)] disabled:opacity-60"
                                        disabled={isCreatingProduct && !isSavingThisLink}
                                      >
                                        {isSavingThisLink ? "Saving…" : "Save"}
                                      </button>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {message.role === "assistant" && message.addProductSourceUrl && (
                        <div className="mt-3 space-y-3 rounded-md border border-[var(--baby-primary-200)] bg-[var(--baby-primary-50)] p-3 text-xs text-[var(--baby-primary-600)]">
                          <p className="leading-relaxed">Want me to save this recommendation to your catalog?</p>
                          <button
                            type="button"
                            onClick={() => handleCreateProduct({ messageId: message.id })}
                            className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--baby-primary-500)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--baby-primary-600)] disabled:cursor-not-allowed disabled:bg-[var(--baby-primary-200)]"
                            disabled={isCreatingProduct && message.addProductSourceUrl !== isCreatingProductUrl}
                          >
                            {isCreatingProduct && message.addProductSourceUrl === isCreatingProductUrl
                              ? "Saving…"
                              : "Add this to the catalog"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-lg bg-[var(--baby-secondary-100)] px-3 py-2 text-[var(--baby-secondary-500)]">Thinking…</div>
                  </div>
                )}

                <div ref={scrollAnchorRef} />
              </div>

              <form onSubmit={handleSubmit} className="border-t border-[var(--baby-neutral-300)] bg-white/75 px-4 py-3">
                <div className="flex items-end gap-2">
                  <textarea
                    className="h-20 w-full resize-none rounded-md border border-[var(--baby-neutral-300)] px-3 py-2 text-sm text-[var(--dreambaby-text)] focus:border-[var(--baby-primary-300)] focus:outline-none focus:ring-1 focus:ring-[var(--baby-primary-200)]"
                    placeholder="Ask for a stroller under $400 or compare two items..."
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                        event.preventDefault();
                        if (!isLoading) {
                          event.currentTarget.form?.requestSubmit();
                        }
                      }
                    }}
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    className="h-10 rounded-md bg-[var(--baby-primary-500)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--baby-primary-600)] disabled:cursor-not-allowed disabled:bg-[var(--baby-neutral-300)]"
                    disabled={isLoading}
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-[var(--dreambaby-text)]">
              <div className="space-y-3">
                <p>Sign in to chat with the advisor and see personalized picks.</p>
                {clerkEnabled ? (
                  !isLoaded ? (
                    <button
                      type="button"
                      disabled
                      className="w-full rounded-md bg-[var(--baby-neutral-300)] px-4 py-2 font-semibold text-white"
                    >
                      Preparing sign-in…
                    </button>
                  ) : isSignedIn ? (
                    <button
                      type="button"
                      disabled
                      className="w-full rounded-md bg-[var(--baby-neutral-300)] px-4 py-2 font-semibold text-white"
                    >
                      You&apos;re already signed in
                    </button>
                  ) : (
                    <SignInButton mode="modal">
                      <button className="w-full rounded-md bg-[var(--baby-primary-500)] px-4 py-2 font-semibold text-white transition hover:bg-[var(--baby-primary-600)]">
                        Sign in
                      </button>
                    </SignInButton>
                  )
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-md bg-[var(--baby-neutral-300)] px-4 py-2 font-semibold text-white"
                  >
                    Sign-in unavailable
                  </button>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>

      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-3">
          {activePrompt ? (
            <div key={activePromptIndex} className="relative">
              <div
                aria-live="polite"
                role="status"
                className="advisor-prompt-bubble relative pointer-events-none select-none rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[var(--dreambaby-text)] shadow-xl shadow-[rgba(111,144,153,0.22)]"
              >
                <svg
                  className="advisor-prompt-outline"
                  viewBox="0 0 140 80"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M18 4 H118 Q134 4 134 20 V42 Q134 58 118 58 H94 L118 74 90 58 H18 Q4 58 4 42 V20 Q4 4 18 4 Z"
                    pathLength="1"
                    className="advisor-prompt-outline-path"
                  />
                </svg>
                {activePrompt}
              </div>
            </div>
          ) : null}
          <div className="relative">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 animate-[pulse_4s_ease-in-out_infinite] rounded-full border border-[var(--baby-primary-200)]/70"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-20 animate-[ping_4s_ease-in-out_infinite] rounded-full bg-[var(--baby-primary-200)]/30"
            />
            <button
              type="button"
              onClick={handleToggle}
              className="flex items-center gap-3 rounded-full bg-gradient-to-r from-[var(--baby-primary-400)] via-[var(--baby-primary-500)] to-[var(--baby-secondary-400)] px-6 py-3 text-base font-semibold text-white shadow-xl shadow-[rgba(111,144,153,0.25)] transition hover:-translate-y-[2px] hover:from-[var(--baby-primary-500)] hover:to-[var(--baby-secondary-500)] advisor-callout"
              aria-label={`Ask Baby Advisor${activePrompt ? ` - ${activePrompt}` : ""}`}
            >
              <span role="img" aria-label="Chat balloon">
                💬
              </span>
              <span>Ask Baby Advisor</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
