"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useUser, SignInButton, SignOutButton } from '@clerk/nextjs';
import {
  defaultProfile,
  type BudgetTier,
  type PreferenceProfile,
} from "@/data/preferences";
import {
  categories,
  milestones,
  type CategoryId,
  type MilestoneId,
  type ProductSummary,
} from "@/data/catalog";
import { rankProducts } from "@/lib/recommendation";
const CalendarView = dynamic(() => import("@/components/CalendarView"), { ssr: false });


const defaultBabyProfile = {
  nickname: "",
  hospital: "",
  provider: "",
  householdSetup: "Apartment",
  careNetwork: "Parents only",
  medicalNotes: "",
  birthDate: "", // Empty if not yet born
};

type SectionId = "calendar" | "curated" | "profile";

export default function Home() {
  const { isSignedIn, user, isLoaded } = useUser();
  const [profile, setProfile] = useState<PreferenceProfile>(defaultProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<CategoryId[]>([
    "nursing",
    "sleeping",
    "feeding",
  ]);
  const [activeMilestoneId, setActiveMilestoneId] =
    useState<MilestoneId>("prenatal");
  const [activeSection, setActiveSection] = useState<SectionId>("calendar");
  const [babyProfile, setBabyProfile] = useState(defaultBabyProfile);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  // Calculate reference date: use birth date if baby is born, otherwise use due date
  const referenceDate = useMemo(() => {
    if (babyProfile.birthDate) {
      return new Date(babyProfile.birthDate);
    }
    return new Date(profile.dueDate);
  }, [babyProfile.birthDate, profile.dueDate]);

  // Fetch products from backend
  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products");
      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }
      const data = await response.json();
      
      // Transform backend products to match frontend format
      const transformedProducts: ProductSummary[] = data.products.map((product: any) => ({
        id: product.id,
        name: product.name,
        description: product.description || '',
        category: product.category,
        brand: product.brand || '',
        price: product.price_cents ? product.price_cents / 100 : 0,
        image: product.image_url || '',
        rating: product.rating || 0,
        milestoneIds: product.milestone_ids || [],
        tags: product.tags || [],
        ecoFriendly: product.eco_friendly || false,
        premium: product.premium || false,
        affiliateUrl: product.affiliate_url || '',
        inStock: product.in_stock !== false,
      }));
      
      setProducts(transformedProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      // Fallback to empty array if backend fails
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

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
          setProfile((current) => ({
            ...current,
            ...(data.data.plan as Partial<PreferenceProfile>),
          }));
          setBabyProfile((current) => ({
            ...current,
            ...(data.data.baby as typeof defaultBabyProfile),
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

  // Fetch products when user is signed in
  useEffect(() => {
    if (isSignedIn && user) {
      fetchProducts();
    }
  }, [isSignedIn, user]);

  const handleSaveProfile = async () => {
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
  };

  const timelineMilestones = milestones;

  const recommended = useMemo(
    () =>
      rankProducts(products, {
        ...profile,
        preferredCategories: selectedCategories,
      }),
    [profile, selectedCategories],
  );

  const budgetCopy: Record<BudgetTier, string> = {
    essentials: "Focus on core necessities under $120/mo.",
    balanced: "Balanced mix of essentials and a few premium splurges.",
    premium: "Curated premium gear with room for upgrades.",
  };

  const activeMilestone = useMemo(
    () =>
      milestones.find((milestone) => milestone.id === activeMilestoneId) ??
      milestones[0],
    [activeMilestoneId],
  );

  const activeMilestoneProducts = useMemo(() => {
    if (!activeMilestone || productsLoading) {
      return [] as ProductSummary[];
    }
    return products
      .filter((product) => product.milestoneIds.includes(activeMilestone.id))
      .sort((a, b) => b.rating - a.rating);
  }, [activeMilestone, products, productsLoading]);


  // Show loading state while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show sign-in page if not authenticated
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-3xl font-semibold text-slate-900 mb-4">BabyBloom</h1>
          <p className="text-slate-600 mb-8">
            Smart baby essentials delivered monthly, tailored to your little one&apos;s journey.
          </p>
          <SignInButton mode="modal">
            <button className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition">
              Sign In to Continue
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <header className="border-b border-slate-200 bg-white dreambaby-soft-shadow">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
              <h1 className="text-3xl font-semibold text-slate-900">BabyBloom</h1>
            <p className="text-sm text-slate-600">
              Smart baby essentials delivered monthly, tailored to your little one&apos;s journey.
            </p>
          </div>
            <div className="flex flex-col items-end gap-2">
          <div className="dreambaby-card rounded-lg px-4 py-3 text-sm">
            <p className="font-medium text-slate-900">Current plan: {profile.budget}</p>
            <p className="text-xs text-slate-500">{budgetCopy[profile.budget]}</p>
          </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1">
                  <span className="size-1 rounded-full bg-blue-500" />
                  Always-on planner
                </span>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="size-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                      {user?.firstName?.charAt(0) || user?.emailAddresses[0]?.emailAddress?.charAt(0) || 'U'}
                    </div>
                    <div className="absolute -bottom-1 -right-1 size-3 rounded-full bg-green-400 border-2 border-white"></div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-900">
                      {user?.firstName || 'User'}
                    </span>
                    <SignOutButton>
                      <button className="text-xs text-slate-500 hover:text-slate-700 transition">
                        Sign out
                      </button>
                    </SignOutButton>
                  </div>
                </div>
              </div>
          </div>
        </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {[{
              id: "calendar" as SectionId,
              label: "Calendar View",
            },
            {
              id: "curated" as SectionId,
              label: "Curated Picks",
            },
            {
              id: "profile" as SectionId,
              label: "Profile",
            }].map((section) => {
              const isActive = activeSection === section.id;
              return (
              <button
                  key={section.id}
                type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    isActive
                    ? "border-blue-500 bg-blue-500 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600"
                }`}
              >
                  {section.label}
              </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-6 py-10">
        {activeSection === "calendar" && (
          <>
            <CalendarView
              milestones={timelineMilestones}
              activeMilestoneId={activeMilestoneId}
              onSelectMilestone={(id) => setActiveMilestoneId(id)}
              referenceDate={referenceDate}
            />
            
            <section className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg/20">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Milestone insights</h2>
                  <p className="text-sm text-slate-600">
                    Dive deeper into the selected milestone with curated products, timeline notes, and agent rationale.
                  </p>
                </div>
                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-600">
                  {activeMilestone.label}
                </span>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
                    <h3 className="text-base font-semibold text-slate-900">What to expect</h3>
                    <p className="mt-2 text-sm text-slate-600">{activeMilestone.description}</p>
                    <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Time frame
                        </p>
                        <p className="mt-1 font-medium text-slate-900">
                          {activeMilestone.monthRange[0]}–{activeMilestone.monthRange[1]} months
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Upcoming delivery
                        </p>
                        <p className="mt-1 font-medium text-slate-900">
                          {activeMilestoneProducts.length} curated items queued
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-slate-900">
                        Recommended items
                      </h3>
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Sorted by rating
                      </span>
                    </div>
                    <ul className="mt-4 space-y-3">
                      {productsLoading ? (
                        <li className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-600 shadow-sm">
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                            Loading products...
                          </div>
                        </li>
                      ) : activeMilestoneProducts.length === 0 ? (
                        <li className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-600 shadow-sm">
                          <div className="text-center">No products found for this milestone</div>
                        </li>
                      ) : (
                        activeMilestoneProducts.map((product) => (
                        <li
                          key={product.id}
                          className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-600 shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-slate-900">
                              {product.name}
                            </p>
                            <span className="text-xs font-semibold text-slate-500">
                              {product.rating.toFixed(1)} ★
                            </span>
                          </div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            {product.category} · ${product.price}
                          </p>
                          <p className="mt-2 text-sm">
                            {product.reviewSummary}
                          </p>
                        </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>

                <aside className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Agent rationale
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Our curation agent weighs developmental needs, budget, safety reviews, and your aesthetic preferences when recommending items for this milestone.
                    </p>
                  </div>
                  <div className="space-y-3 text-sm text-slate-600">
                    <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3">
                      <p className="text-xs uppercase tracking-wide text-indigo-500">
                        Safety & timing checks
                      </p>
                      <p className="mt-1">Alerts you when to schedule installs or recall checks ahead of baby reaching a new stage.</p>
                    </div>
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
                      <p className="text-xs uppercase tracking-wide text-emerald-500">
                        Budget guardrails
                      </p>
                      <p className="mt-1">Balances monthly spend with upcoming major purchases like car seats or nursery furniture upgrades.</p>
                    </div>
                    <div className="rounded-lg border border-sky-100 bg-sky-50/60 p-3">
                      <p className="text-xs uppercase tracking-wide text-sky-500">
                        Style fidelity
                      </p>
                      <p className="mt-1">Keeps to your chosen palette and materials, suggesting swaps if the perfect match is out of stock.</p>
                    </div>
                  </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSection("curated");
                        const curatedSection = document.getElementById("curated");
                        curatedSection?.scrollIntoView({ behavior: "smooth" });
                      }}
                    className="inline-flex items-center justify-center rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-600 shadow-sm transition hover:border-indigo-400 hover:text-indigo-700"
                  >
                    Jump to curated picks
                    </button>
                </aside>
              </div>
            </section>
          </>
        )}

        {activeSection === "profile" && (
          <section className="space-y-6 rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-2xl shadow-indigo-100/50 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-500">
                  <span className="size-1.5 rounded-full bg-indigo-400" />
                  Profile Settings
                </span>
                <h2 className="text-2xl font-semibold text-slate-900">Manage your account</h2>
                <p className="text-sm text-slate-600">
                  Customize your preferences and baby profile information.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                  <span className="size-1 rounded-full bg-emerald-400" />
                  Adaptive curation
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                  <span className="size-1 rounded-full bg-amber-400" />
                  Budget guardrails
                </span>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
              <div className="space-y-6">
                {/* Baby Information Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                      <span className="size-1.5 rounded-full bg-blue-500" />
                      Baby Information
                    </span>
                  </div>
                  
                  <div className="grid gap-4 text-sm md:grid-cols-2">
                    <label className="flex flex-col gap-2">
                      <span className="text-slate-700">Due date</span>
                      <input
                        type="date"
                        value={profile.dueDate}
                        onChange={(event) =>
                          setProfile((current) => ({
                            ...current,
                            dueDate: event.target.value,
                          }))
                        }
                        className="rounded-md border border-slate-200 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-slate-700">Birth date (optional)</span>
                      <input
                        type="date"
                        value={babyProfile.birthDate}
                        onChange={(event) =>
                          setBabyProfile((current) => ({
                            ...current,
                            birthDate: event.target.value,
                          }))
                        }
                        className="rounded-md border border-slate-200 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                      <span className="text-xs text-slate-500">Leave empty if not yet born (uses due date)</span>
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-slate-700">Baby gender</span>
                      <select
                        value={profile.babyGender}
                        onChange={(event) =>
                          setProfile((current) => ({
                            ...current,
                            babyGender: event.target.value as PreferenceProfile["babyGender"],
                          }))
                        }
                        className="rounded-md border border-slate-200 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      >
                        <option value="surprise">We&apos;ll find out at birth</option>
                        <option value="girl">Girl</option>
                        <option value="boy">Boy</option>
                      </select>
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-slate-700">Baby nickname</span>
                      <input
                        type="text"
                        placeholder="Baby Bee"
                        value={babyProfile.nickname}
                        onChange={(event) =>
                          setBabyProfile((current) => ({
                            ...current,
                            nickname: event.target.value,
                          }))
                        }
                        className="rounded-md border border-slate-200 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-slate-700">Birth hospital</span>
                      <input
                        type="text"
                        placeholder="City Women&apos;s Hospital"
                        value={babyProfile.hospital}
                        onChange={(event) =>
                          setBabyProfile((current) => ({
                            ...current,
                            hospital: event.target.value,
                          }))
                        }
                        className="rounded-md border border-slate-200 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-slate-700">Provider / pediatrician</span>
                      <input
                        type="text"
                        placeholder="Dr. Rivera"
                        value={babyProfile.provider}
                        onChange={(event) =>
                          setBabyProfile((current) => ({
                            ...current,
                            provider: event.target.value,
                          }))
                        }
                        className="rounded-md border border-slate-200 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-slate-700">Household setup</span>
                      <select
                        value={babyProfile.householdSetup}
                        onChange={(event) =>
                          setBabyProfile((current) => ({
                            ...current,
                            householdSetup: event.target.value,
                          }))
                        }
                        className="rounded-md border border-slate-200 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      >
                        <option value="Apartment">Apartment</option>
                        <option value="Single-family home">Single-family home</option>
                        <option value="Shared housing">Shared housing</option>
                      </select>
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-slate-700">Care network</span>
                      <select
                        value={babyProfile.careNetwork}
                        onChange={(event) =>
                          setBabyProfile((current) => ({
                            ...current,
                            careNetwork: event.target.value,
                          }))
                        }
                        className="rounded-md border border-slate-200 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      >
                        <option value="Parents only">Parents only</option>
                        <option value="Parents + grandparents">Parents + grandparents</option>
                        <option value="Parents + nanny">Parents + nanny</option>
                        <option value="Other caregivers">Other caregivers</option>
                      </select>
                    </label>

                    <label className="flex flex-col gap-2 md:col-span-2">
                      <span className="text-slate-700">Medical notes</span>
                      <textarea
                        rows={3}
                        placeholder="Allergies, birth considerations, or safety concerns"
                        value={babyProfile.medicalNotes}
                        onChange={(event) =>
                          setBabyProfile((current) => ({
                            ...current,
                            medicalNotes: event.target.value,
                          }))
                        }
                        className="rounded-md border border-slate-200 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </label>
                  </div>
                </div>

                {/* Preferences Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                      <span className="size-1.5 rounded-full bg-indigo-500" />
                      Preferences
                    </span>
                  </div>
                  
                  <div className="grid gap-4 text-sm md:grid-cols-2">
                    <label className="flex flex-col gap-2">
                      <span className="text-slate-700">Monthly budget</span>
                      <select
                        value={profile.budget}
                        onChange={(event) =>
                          setProfile((current) => ({
                            ...current,
                            budget: event.target.value as PreferenceProfile["budget"],
                          }))
                        }
                        className="rounded-md border border-slate-200 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      >
                        <option value="essentials">Essentials</option>
                        <option value="balanced">Balanced</option>
                        <option value="premium">Premium</option>
                      </select>
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-slate-700">Color palette</span>
                      <select
                        value={profile.colorPalette}
                        onChange={(event) =>
                          setProfile((current) => ({
                            ...current,
                            colorPalette: event.target.value as PreferenceProfile["colorPalette"],
                          }))
                        }
                        className="rounded-md border border-slate-200 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      >
                        <option value="neutral">Cozy neutrals</option>
                        <option value="pastel">Soft pastels</option>
                        <option value="bold">Bold, modern pops</option>
                        <option value="warm">Sunset warm tones</option>
                        <option value="cool">Coastal cool tones</option>
                      </select>
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-slate-700">Material focus</span>
                      <select
                        value={profile.materialFocus}
                        onChange={(event) =>
                          setProfile((current) => ({
                            ...current,
                            materialFocus: event.target.value as PreferenceProfile["materialFocus"],
                          }))
                        }
                        className="rounded-md border border-slate-200 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      >
                        <option value="organic">Organic & natural fibers</option>
                        <option value="performance">Performance & easy clean</option>
                        <option value="recycled">Recycled & low-waste</option>
                        <option value="classic">Classic mix</option>
                      </select>
                    </label>

                    <label className="flex flex-row items-center gap-3 rounded-md border border-slate-200 px-4 py-3 shadow-sm md:col-span-2">
                      <input
                        type="checkbox"
                        checked={profile.ecoPriority}
                        onChange={(event) =>
                          setProfile((current) => ({
                            ...current,
                            ecoPriority: event.target.checked,
                          }))
                        }
                        className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          Prioritize eco-friendly picks
                        </p>
                        <p className="text-xs text-slate-500">
                          Highlight products with verified sustainable materials and packaging.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className={`rounded-full px-5 py-2 text-sm font-medium text-white shadow-sm transition ${
                      isSaving ? "bg-slate-400" : "bg-indigo-500 hover:bg-indigo-600"
                    }`}
                  >
                    {isSaving ? "Saving..." : "Save profile"}
                  </button>
                  {saveMessage && (
                    <p className="text-sm text-slate-500">{saveMessage}</p>
                  )}
                </div>
              </div>

              <aside className="space-y-4 rounded-lg border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-indigo-900">
                <h3 className="text-base font-semibold text-indigo-950">
                  Monthly subscription snapshot
                </h3>
                <p>
                  We assemble a monthly shipment covering essentials for your upcoming
                  milestone. Every box includes digital guidance, reorder reminders, and
                  affiliate-exclusive discounts.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <span className="mt-[2px] inline-flex size-2 rounded-full bg-indigo-500" />
                    <div>
                      <p className="font-medium">Dynamic curation</p>
                      <p className="text-xs text-indigo-700">
                        Agent re-evaluates reviews daily to ensure top-rated safety gear.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-[2px] inline-flex size-2 rounded-full bg-indigo-500" />
                    <div>
                      <p className="font-medium">Affordability guardrails</p>
                      <p className="text-xs text-indigo-700">
                        Bundles stay within your target monthly spend, factoring in upcoming big-ticket buys.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-[2px] inline-flex size-2 rounded-full bg-indigo-500" />
                    <div>
                      <p className="font-medium">At-a-glance timeline</p>
                      <p className="text-xs text-indigo-700">
                        Your dashboard calendar shows when each product should arrive and why it matters for that milestone.
                      </p>
                    </div>
                  </li>
                </ul>
              </aside>
            </div>
          </section>
        )}


        {activeSection === "curated" && (
          <section
            id="curated"
            className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg/20"
          >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Curated picks</h2>
              <p className="text-sm text-slate-600">
                Agent-ranked products tuned to your preferences. Swap categories to adapt the subscription mix.
              </p>
            </div>
            <div className="grid gap-2 text-sm md:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => {
                const isActive = selectedCategories.includes(category.id);
                return (
                  <label
                    key={category.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/60"
                  >
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={() =>
                        setSelectedCategories((current) =>
                          isActive
                            ? current.filter((item) => item !== category.id)
                            : [...current, category.id],
                        )
                      }
                      className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-slate-700">{category.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recommended.map((item) => (
              <article
                key={item.product.id}
                className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {item.product.brand}
                    </p>
                    <h3 className="text-base font-semibold text-slate-900">
                      {item.product.name}
                    </h3>
                  </div>
                  <span className="rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                    ${item.product.price}
                  </span>
                </div>
                <p className="text-sm text-slate-700">{item.product.reviewSummary}</p>
                <div className="text-xs text-slate-500">
                  <p className="font-semibold text-slate-600">Why it’s here</p>
                  <p>{item.rationale}</p>
                </div>
                <div className="mt-auto flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-500">
                    Milestones: {item.product.milestoneIds.map((id) => id.replace("month", "Month ")).join(", ")}
                  </span>
                  <a
                    href={item.product.affiliateUrl}
            target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-indigo-200 px-3 py-1 text-indigo-600 transition hover:bg-indigo-50"
          >
                    View offer
          </a>
        </div>
              </article>
            ))}
          </div>
        </section>
        )}
      </main>
    </div>
  );
}
