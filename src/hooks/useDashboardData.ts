"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSafeUser } from "@/lib/clerkClient";
import {
  defaultProfile,
  type BudgetTier,
  type PreferenceProfile,
} from "@/data/preferences";
import {
  defaultMilestones,
  type CategoryId,
  type MilestoneId,
  type ProductSummary,
  type Milestone,
} from "@/data/catalog";
import { ProductService } from "@/lib/products/service";
import { rankProducts } from "@/lib/recommendation";
import { MilestoneService } from "@/lib/milestones/service";
import { toIsoDateString } from "@/lib/dateCalculations";

export const defaultBabyProfile = {
  name: "",
  nickname: "",
  hospital: "",
  provider: "",
  householdSetup: "Apartment",
  careNetwork: "Parents only",
  medicalNotes: "",
  birthDate: "",
  dueDate: "",
  parentOneName: "",
  parentTwoName: "",
};

const budgetCopy: Record<BudgetTier, string> = {
  essentials: "Focus on core necessities under $120/mo.",
  balanced: "Balanced mix of essentials and a few premium splurges.",
  premium: "Curated premium gear with room for upgrades.",
};

export function useDashboardData() {
  const { isSignedIn, user, isLoaded } = useSafeUser();
  const [profile, setProfile] = useState<PreferenceProfile>(defaultProfile);
  const [babyProfile, setBabyProfile] = useState(defaultBabyProfile);
  const [selectedCategories, setSelectedCategories] = useState<CategoryId[]>([
    "nursing",
    "sleeping",
    "feeding",
  ]);
  const fallbackMilestoneId = (defaultMilestones[0]?.id ?? "prenatal") as MilestoneId;
  const [timelineMilestones, setTimelineMilestones] = useState<Milestone[]>(defaultMilestones);
  const [milestonesLoading, setMilestonesLoading] = useState(true);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [activeMilestoneId, setActiveMilestoneId] = useState<MilestoneId>(fallbackMilestoneId);

  const fetchProducts = useCallback(async () => {
    try {
      const productsData = await ProductService.listSummaries();
      setProducts(productsData);
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadMilestones = async () => {
      try {
        const data = await MilestoneService.list();
        if (!isMounted) {
          return;
        }

        if (Array.isArray(data) && data.length > 0) {
          setTimelineMilestones(data);
          setActiveMilestoneId((current) => {
            if (data.some((milestone) => milestone.id === current)) {
              return current;
            }
            return data[0].id;
          });
        }
      } catch (error) {
        console.error("Error fetching milestones:", error);
      } finally {
        if (isMounted) {
          setMilestonesLoading(false);
        }
      }
    };

    void loadMilestones();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const response = await fetch("/api/profile", {
          method: "GET",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }

        const data = await response.json();
        if (isMounted && data?.data) {
          const inboundPlan = (data.data.plan ?? {}) as Partial<PreferenceProfile>;
          const inboundBaby = (data.data.baby ?? {}) as Partial<typeof defaultBabyProfile>;

          setProfile((current) => ({
            ...current,
            ...inboundPlan,
            dueDate: toIsoDateString(inboundPlan.dueDate) ?? current.dueDate,
          }));

          setBabyProfile((current) => ({
            ...current,
            ...inboundBaby,
            birthDate: toIsoDateString(inboundBaby.birthDate) ?? current.birthDate,
          }));
        }
      } catch (error) {
        console.error(error);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isSignedIn && user) {
      fetchProducts();
    }
  }, [isSignedIn, user, fetchProducts]);

  const handleToggleCategory = useCallback((categoryId: CategoryId) => {
    setSelectedCategories((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    );
  }, []);

  const formatCurrency = useCallback((value?: number | null) => {
    if (value === null || value === undefined) {
      return "—";
    }
    return `$${value.toFixed(0)}`;
  }, []);

  const truncateText = useCallback((value: string | null | undefined, maxLength = 140) => {
    if (!value) {
      return "";
    }
    if (value.length <= maxLength) {
      return value;
    }
    return `${value.slice(0, maxLength).trimEnd()}…`;
  }, []);

  const handleSaveProfile = useCallback(async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: {
            dueDate: profile.dueDate,
            babyGender: profile.babyGender,
            budget: profile.budget,
            colorPalette: profile.colorPalette,
            materialFocus: profile.materialFocus,
            ecoPriority: profile.ecoPriority,
            location: profile.location,
          },
          baby: babyProfile,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save profile");
      }

      setSaveMessage("Profile saved");
    } catch (error) {
      console.error(error);
      setSaveMessage("Unable to save profile right now");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  }, [babyProfile, profile]);

  const referenceDate = useMemo(() => {
    if (babyProfile.birthDate) {
      return new Date(babyProfile.birthDate);
    }
    return new Date(profile.dueDate);
  }, [babyProfile.birthDate, profile.dueDate]);

  const recommended = useMemo(
    () =>
      rankProducts(products, {
        ...profile,
        preferredCategories: selectedCategories,
      }),
    [products, profile, selectedCategories],
  );

  const budgetLabel = useMemo(
    () => profile.budget.charAt(0).toUpperCase() + profile.budget.slice(1),
    [profile.budget],
  );

  const budgetDescription = budgetCopy[profile.budget];

  const activeMilestone = useMemo(() => {
    const source = timelineMilestones.length > 0 ? timelineMilestones : defaultMilestones;
    return (
      source.find((milestone) => milestone.id === activeMilestoneId) ??
      source[0]
    );
  }, [activeMilestoneId, timelineMilestones]);

  const activeMilestoneProducts = useMemo(() => {
    if (!activeMilestone || productsLoading) {
      return [] as ProductSummary[];
    }
    return products
      .filter((product) => product.milestoneIds.includes(activeMilestone.id))
      .sort((a, b) => b.rating - a.rating);
  }, [activeMilestone, products, productsLoading]);

  return {
    isLoaded,
    isSignedIn,
    user,
    profile,
    setProfile,
    babyProfile,
    setBabyProfile,
    selectedCategories,
    handleToggleCategory,
    products,
    productsLoading,
    milestonesLoading,
    isSaving,
    saveMessage,
    handleSaveProfile,
    activeMilestoneId,
    setActiveMilestoneId,
    activeMilestone,
    activeMilestoneProducts,
    timelineMilestones,
    recommended,
    budgetLabel,
    budgetDescription,
    referenceDate,
    formatCurrency,
    truncateText,
  };
}

export type UseDashboardDataReturn = ReturnType<typeof useDashboardData>;
export type RecommendedProduct = ReturnType<typeof rankProducts>;
