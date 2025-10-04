"use client";

import { useEffect, useMemo, useState } from "react";
import { clerkEnabled, useSafeUser } from "@/lib/clerkClient";
import { ProductService } from "@/lib/products/service";

interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  price_cents: number | null;
  rating: number | null;
  eco_friendly: boolean | null;
  premium: boolean | null;
  in_stock: boolean | null;
  created_at: string;
}

interface DatabaseInfo {
  existing_tables: string[];
  schema: unknown[];
  status: string;
}

const KNOWN_TABLES = [
  "users",
  "user_profiles",
  "milestones",
  "products",
  "user_product_recommendations",
  "user_product_interactions",
  "ai_categories",
  "product_ai_categories",
  "product_reviews",
];

type Tone = "default" | "success" | "warning" | "danger";

function toneClasses(tone: Tone) {
  switch (tone) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "danger":
      return "border-red-200 bg-red-50 text-red-800";
    default:
      return "border-blue-200 bg-blue-50 text-blue-800";
  }
}

function StatusBadge({ children, tone = "default" }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${toneClasses(tone)}`}
    >
      {children}
    </span>
  );
}

function StatCard({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: Tone;
}) {
  const base =
    tone === "success"
      ? "border-emerald-200 bg-white"
      : tone === "warning"
        ? "border-amber-200 bg-white"
        : tone === "danger"
          ? "border-red-200 bg-white"
          : "border-blue-200 bg-white";

  return (
    <div className={`rounded-2xl border ${base} p-5 shadow-sm transition hover:shadow-md`}> 
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
      {helper ? <p className="mt-1 text-sm text-gray-500">{helper}</p> : null}
    </div>
  );
}

function formatCurrencyFromCents(value: number | null) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);
}

function formatDate(input?: string | null) {
  if (!input) return "—";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function AdminV2Console() {
  const { user, isLoaded } = useSafeUser();
  const [databaseInfo, setDatabaseInfo] = useState<DatabaseInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationStatus, setMigrationStatus] = useState<string>("");
  const [addUrl, setAddUrl] = useState("");
  const [addMilestone, setAddMilestone] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  const existingTables = useMemo(() => new Set(databaseInfo?.existing_tables ?? []), [databaseInfo?.existing_tables]);
  const missingTables = useMemo(
    () => KNOWN_TABLES.filter((table) => !existingTables.has(table)),
    [existingTables],
  );
  const tablesReady = existingTables.size === KNOWN_TABLES.length && databaseInfo?.status === "complete";

  const productStats = useMemo(() => {
    if (products.length === 0) {
      return {
        count: 0,
        premiumCount: 0,
        ecoCount: 0,
        outOfStockCount: 0,
        averageRating: null as number | null,
        latestCreatedAt: null as string | null,
      };
    }

    let premiumCount = 0;
    let ecoCount = 0;
    let outOfStockCount = 0;
    const ratings: number[] = [];
    let latestCreatedAt: string | null = null;

    for (const product of products) {
      if (product.premium) premiumCount += 1;
      if (product.eco_friendly) ecoCount += 1;
      if (product.in_stock === false) outOfStockCount += 1;
      if (typeof product.rating === "number") ratings.push(product.rating);
      if (!latestCreatedAt || new Date(product.created_at) > new Date(latestCreatedAt)) {
        latestCreatedAt = product.created_at;
      }
    }

    const averageRating = ratings.length
      ? Number((ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(2))
      : null;

    return {
      count: products.length,
      premiumCount,
      ecoCount,
      outOfStockCount,
      averageRating,
      latestCreatedAt,
    };
  }, [products]);

  const statCards = useMemo(
    () => [
      {
        label: "Schema tables",
        value: `${existingTables.size}/${KNOWN_TABLES.length}`,
        helper:
          missingTables.length === 0
            ? "All expected tables detected."
            : `${missingTables.length} table${missingTables.length > 1 ? "s" : ""} missing`,
        tone: tablesReady ? ("success" as Tone) : existingTables.size ? ("warning" as Tone) : ("danger" as Tone),
      },
      {
        label: "Products in catalog",
        value: productStats.count.toString(),
        helper: productStats.latestCreatedAt
          ? `Latest add ${formatDate(productStats.latestCreatedAt)}`
          : "Seed the catalog to get started.",
        tone: productStats.count > 0 ? ("success" as Tone) : ("warning" as Tone),
      },
      {
        label: "Premium SKUs",
        value: productStats.premiumCount.toString(),
        helper: `${productStats.ecoCount} eco-friendly listings`,
        tone: productStats.premiumCount > 0 ? ("default" as Tone) : ("warning" as Tone),
      },
      {
        label: "Average rating",
        value: productStats.averageRating != null ? productStats.averageRating.toFixed(1) : "—",
        helper:
          productStats.count > 0
            ? `${productStats.outOfStockCount} item${productStats.outOfStockCount === 1 ? "" : "s"} out of stock`
            : "No catalog data yet",
        tone:
          productStats.averageRating != null && productStats.averageRating >= 4.2
            ? ("success" as Tone)
            : productStats.averageRating != null && productStats.averageRating < 3
              ? ("warning" as Tone)
              : ("default" as Tone),
      },
    ],
    [existingTables.size, missingTables.length, tablesReady, productStats],
  );

  useEffect(() => {
    if (isLoaded && user) {
      void fetchDatabaseInfo();
      void fetchProducts();
    }
  }, [isLoaded, user]);

  const fetchDatabaseInfo = async () => {
    try {
      const response = await fetch("/api/database/migrate");
      const data = await response.json();
      setDatabaseInfo(data);
    } catch (error) {
      console.error("Error fetching database info:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products");
      const data = await response.json();
      setProducts(data.products || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const runMigration = async () => {
    try {
      setMigrationStatus("Running migration…");
      const response = await fetch("/api/database/migrate", { method: "POST" });
      const data = await response.json();
      setMigrationStatus(data.message || "Migration completed");
      void fetchDatabaseInfo();
    } catch (error) {
      setMigrationStatus("Migration failed");
      console.error("Error running migration:", error);
    }
  };

  const seedProducts = async () => {
    try {
      setMigrationStatus("Seeding products…");
      const response = await fetch("/api/products/seed", { method: "POST" });
      const data = await response.json();
      setMigrationStatus(data.message || "Products seeded");
      void fetchProducts();
    } catch (error) {
      setMigrationStatus("Seeding failed");
      console.error("Error seeding products:", error);
    }
  };

  const clearAllData = async () => {
    if (confirm("Are you sure you want to clear all user data? This cannot be undone.")) {
      try {
        const response = await fetch("/api/users", { method: "DELETE" });
        const data = await response.json();
        alert(data.message);
      } catch (error) {
        console.error("Error clearing data:", error);
      }
    }
  };

  const handleAddProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!addUrl) {
      setAddError("Please enter a product URL");
      return;
    }

    try {
      setAddLoading(true);
      setAddError(null);
      setAddSuccess(null);

      const data = await ProductService.addProductFromUrl({
        sourceUrl: addUrl,
        milestoneId: addMilestone || undefined,
      });

      setAddSuccess(`✅ Product "${data.product?.name || "Unknown"}" successfully added to database!`);
      setAddUrl("");
      setAddMilestone("");
      void fetchProducts();

      setTimeout(() => setAddSuccess(null), 5000);
    } catch (error) {
      console.error("Error adding product:", error);
      setAddError(error instanceof Error ? error.message : "Unexpected error while adding product");
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemoveProduct = async (productId: string) => {
    const confirmRemove = confirm("Remove this product? This action cannot be undone.");
    if (!confirmRemove) return;

    try {
      const data = await ProductService.deleteProduct(productId);
      alert(data.message);
      void fetchProducts();
    } catch (error) {
      console.error("Error removing product:", error);
      alert(error instanceof Error ? error.message : "Unexpected error while removing product");
    }
  };

  if (!clerkEnabled) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold text-[var(--dreambaby-text)]">
          Admin console unavailable
        </h1>
        <p className="mt-4 text-sm text-[var(--dreambaby-muted)]">
          Clerk credentials are not configured. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` to enable the admin dashboard.
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return <div className="p-8">Loading…</div>;
  }

  if (!user) {
    return <div className="p-8">Please sign in to access admin panel.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="mx-auto max-w-6xl space-y-10 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Admin Console v2</h1>
            <p className="mt-1 text-sm text-gray-600">
              Monitor schema health, ingest catalog data, and trigger maintenance jobs in one place.
            </p>
          </div>
          {databaseInfo ? (
            <StatusBadge tone={tablesReady ? "success" : "warning"}>
              {tablesReady ? "Schema ready" : `Status: ${databaseInfo.status}`}
            </StatusBadge>
          ) : null}
        </header>

        {migrationStatus ? (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 shadow-sm">
            {migrationStatus}
          </div>
        ) : null}

        <section>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Database maintenance</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Kick off schema creation, reseed the demo catalog, or purge user data when resetting environments.
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <button
                type="button"
                onClick={runMigration}
                className="group flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50/70 px-4 py-3 text-sm font-semibold text-blue-800 transition hover:border-blue-400 hover:bg-blue-50"
              >
                <span className="flex items-center gap-2">
                  <span role="img" aria-hidden="true">⚙️</span>
                  Run migration
                </span>
                <span className="text-xs font-medium text-blue-600">schema</span>
              </button>
              <button
                type="button"
                onClick={seedProducts}
                className="group flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm font-semibold text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-50"
              >
                <span className="flex items-center gap-2">
                  <span role="img" aria-hidden="true">📦</span>
                  Seed products
                </span>
                <span className="text-xs font-medium text-emerald-600">catalog</span>
              </button>
              <button
                type="button"
                onClick={clearAllData}
                className="group flex items-center justify-between rounded-2xl border border-red-200 bg-red-50/70 px-4 py-3 text-sm font-semibold text-red-700 transition hover:border-red-400 hover:bg-red-50"
              >
                <span className="flex items-center gap-2">
                  <span role="img" aria-hidden="true">🧹</span>
                  Clear user data
                </span>
                <span className="text-xs font-medium text-red-500">danger</span>
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Schema status</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Track which reference tables have been created in the connected Postgres instance.
                </p>
              </div>
              <StatusBadge tone={tablesReady ? "success" : missingTables.length ? "warning" : "default"}>
                {tablesReady ? "Healthy" : `${missingTables.length} missing`}
              </StatusBadge>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {KNOWN_TABLES.map((table) => {
                const present = existingTables.has(table);
                return (
                  <div
                    key={table}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium capitalize ${
                      present
                        ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
                        : "border-amber-200 bg-amber-50/80 text-amber-800"
                    }`}
                  >
                    <span
                      className={`inline-flex h-2.5 w-2.5 rounded-full ${present ? "bg-emerald-500" : "bg-amber-500"}`}
                    />
                    {table.replace(/_/g, " ")}
                  </div>
                );
              })}
            </div>

            <details className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              <summary className="cursor-pointer select-none font-medium text-gray-700">
                View raw schema payload
              </summary>
              <pre className="mt-4 max-h-72 overflow-x-auto overflow-y-auto rounded bg-gray-900 p-4 text-xs text-gray-100">
                {JSON.stringify(databaseInfo?.schema ?? {}, null, 2)}
              </pre>
            </details>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Ingest product from URL</h2>
              <p className="mt-1 text-sm text-gray-600">
                Provide a supported product page URL (Amazon by default) and optionally pin a milestone tag.
              </p>
            </div>
            {addSuccess ? <StatusBadge tone="success">Product created</StatusBadge> : null}
          </div>

          <form onSubmit={handleAddProduct} className="mt-6 grid gap-4 lg:grid-cols-2" noValidate>
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700" htmlFor="product-url">
                Product URL
              </label>
              <input
                id="product-url"
                type="url"
                value={addUrl}
                onChange={(event) => setAddUrl(event.target.value)}
                className="mt-1 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                placeholder="https://www.amazon.com/..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="product-milestone">
                Milestone (optional)
              </label>
              <input
                id="product-milestone"
                type="text"
                value={addMilestone}
                onChange={(event) => setAddMilestone(event.target.value)}
                className="mt-1 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                placeholder="e.g. newborn"
              />
            </div>
            <div className="flex items-end gap-3 lg:col-span-2">
              <button
                type="submit"
                disabled={addLoading}
                className="inline-flex items-center gap-2 rounded-2xl border border-blue-500 bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-progress disabled:bg-blue-400"
              >
                {addLoading ? "Adding…" : "Add product"}
              </button>
              {addError ? <span className="text-sm text-red-600">{addError}</span> : null}
              {addSuccess ? <span className="text-sm text-emerald-600">{addSuccess}</span> : null}
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-0 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Products ({products.length})</h2>
              <p className="mt-1 text-sm text-gray-600">
                Remove catalog entries that are outdated or duplicate. Ratings and flags help spot quality gaps.
              </p>
            </div>
          </div>
          {loading ? (
            <div className="px-6 py-8 text-sm text-gray-500">Loading products…</div>
          ) : products.length === 0 ? (
            <div className="px-6 py-8 text-sm text-gray-500">
              No products found. Seed the catalog or ingest a URL to populate this table.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  <tr>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Flags</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Rating</th>
                    <th className="px-4 py-3">Added</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {products.map((product) => {
                    const priceLabel = formatCurrencyFromCents(product.price_cents);
                    const ratingLabel = typeof product.rating === "number" ? product.rating.toFixed(1) : "—";
                    const flags: Array<{ label: string; tone: Tone }> = [];
                    if (product.premium) flags.push({ label: "Premium", tone: "warning" });
                    if (product.eco_friendly) flags.push({ label: "Eco", tone: "success" });
                    if (product.in_stock === false) flags.push({ label: "OOS", tone: "danger" });

                    return (
                      <tr key={product.id} className="align-top">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="mt-1 text-xs text-gray-500">{product.brand || "—"}</div>
                        </td>
                        <td className="px-4 py-4 text-gray-700">{product.category}</td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            {flags.length === 0 ? (
                              <span className="text-xs text-gray-400">—</span>
                            ) : (
                              flags.map((flag) => (
                                <span
                                  key={`${product.id}-${flag.label}`}
                                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                    flag.tone === "success"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : flag.tone === "warning"
                                        ? "bg-amber-50 text-amber-700"
                                        : flag.tone === "danger"
                                          ? "bg-red-50 text-red-700"
                                          : "bg-blue-50 text-blue-700"
                                  }`}
                                >
                                  {flag.label}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-gray-700">{priceLabel}</td>
                        <td className="px-4 py-4 text-gray-700">{ratingLabel}</td>
                        <td className="px-4 py-4 text-gray-700">{formatDate(product.created_at)}</td>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => handleRemoveProduct(product.id)}
                            className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
