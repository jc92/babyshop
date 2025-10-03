"use client";

import { useEffect, useState } from 'react';
import { clerkEnabled, useSafeUser } from '@/lib/clerkClient';
import { ProductService } from '@/lib/products/service';

// interface DatabaseStats {
//   total_users: number;
//   unique_users: number;
//   first_user: string;
//   latest_user: string;
// }

interface User {
  user_id: string;
  created_at: string;
  updated_at: string;
  due_date?: string;
  budget_tier?: string;
  baby_gender?: string;
  baby_nickname?: string;
  hospital?: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  price_cents: number;
  rating: number;
  eco_friendly: boolean;
  premium: boolean;
  in_stock: boolean;
  created_at: string;
}

interface DatabaseInfo {
  existing_tables: string[];
  schema: unknown[];
  status: string;
}

function AdminV2Console() {
  const { user, isLoaded } = useSafeUser();
  const [databaseInfo, setDatabaseInfo] = useState<DatabaseInfo | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationStatus, setMigrationStatus] = useState<string>('');
  const [addUrl, setAddUrl] = useState('');
  const [addMilestone, setAddMilestone] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      fetchDatabaseInfo();
      fetchUsers();
      fetchProducts();
    }
  }, [isLoaded, user]);

  const fetchDatabaseInfo = async () => {
    try {
      const response = await fetch('/api/database/migrate');
      const data = await response.json();
      setDatabaseInfo(data);
    } catch (error) {
      console.error('Error fetching database info:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      setProducts(data.products || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const runMigration = async () => {
    try {
      setMigrationStatus('Running migration...');
      const response = await fetch('/api/database/migrate', { method: 'POST' });
      const data = await response.json();
      setMigrationStatus(data.message || 'Migration completed');
      fetchDatabaseInfo();
    } catch (error) {
      setMigrationStatus('Migration failed');
      console.error('Error running migration:', error);
    }
  };

  const seedProducts = async () => {
    try {
      setMigrationStatus('Seeding products...');
      const response = await fetch('/api/products/seed', { method: 'POST' });
      const data = await response.json();
      setMigrationStatus(data.message || 'Products seeded');
      fetchProducts();
    } catch (error) {
      setMigrationStatus('Seeding failed');
      console.error('Error seeding products:', error);
    }
  };

  const clearAllData = async () => {
    if (confirm('Are you sure you want to clear all user data? This cannot be undone.')) {
      try {
        const response = await fetch('/api/users', { method: 'DELETE' });
        const data = await response.json();
        alert(data.message);
        fetchUsers();
      } catch (error) {
        console.error('Error clearing data:', error);
      }
    }
  };

  const handleAddProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!addUrl) {
      setAddError('Please enter a product URL');
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

      // Show success message with product details
      setAddSuccess(`✅ Product "${data.product?.name || 'Unknown'}" successfully added to database!`);
      setAddUrl('');
      setAddMilestone('');
      fetchProducts();
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setAddSuccess(null);
      }, 5000);
    } catch (error) {
      console.error('Error adding product:', error);
      setAddError(
        error instanceof Error
          ? error.message
          : 'Unexpected error while adding product',
      );
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemoveProduct = async (productId: string) => {
    const confirmRemove = confirm('Remove this product? This action cannot be undone.');
    if (!confirmRemove) return;

    try {
      const data = await ProductService.deleteProduct(productId);
      alert(data.message);
      fetchProducts();
    } catch (error) {
      console.error('Error removing product:', error);
      alert(
        error instanceof Error
          ? error.message
          : 'Unexpected error while removing product',
      );
    }
  };

  if (!isLoaded) {
    return <div className="p-8">Loading...</div>;
  }

  if (!user) {
    return <div className="p-8">Please sign in to access admin panel.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Database Management Panel</h1>
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Database Migration</h2>
          <div className="flex gap-4 mb-4">
            <button
              onClick={runMigration}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Run Migration
            </button>
            <button
              onClick={seedProducts}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Seed Products
            </button>
          </div>
          {migrationStatus && (
            <div className="text-sm text-gray-600 bg-gray-100 p-2 rounded">
              {migrationStatus}
            </div>
          )}
        </div>

        {databaseInfo && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Database Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded">
                <div className="text-2xl font-bold text-blue-600">{databaseInfo.existing_tables.length}</div>
                <div className="text-sm text-gray-600">Tables Created</div>
              </div>
              <div className="bg-green-50 p-4 rounded">
                <div className="text-2xl font-bold text-green-600">{users.length}</div>
                <div className="text-sm text-gray-600">Total Users</div>
              </div>
              <div className="bg-purple-50 p-4 rounded">
                <div className="text-2xl font-bold text-purple-600">{products.length}</div>
                <div className="text-sm text-gray-600">Total Products</div>
              </div>
              <div className="bg-orange-50 p-4 rounded">
                <div className="text-sm font-bold text-orange-600">{databaseInfo.status}</div>
                <div className="text-sm text-gray-600">Status</div>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Tables:</h3>
              <div className="flex flex-wrap gap-2">
                {databaseInfo.existing_tables.map((table, index) => (
                  <span key={index} className="bg-gray-100 px-2 py-1 rounded text-sm">
                    {table}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Users ({users.length})</h2>
            <button
              onClick={clearAllData}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Clear All Data
            </button>
          </div>

          {loading ? (
            <div>Loading users...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">User ID</th>
                    <th className="text-left py-2">Created</th>
                    <th className="text-left py-2">Due Date</th>
                    <th className="text-left py-2">Budget</th>
                    <th className="text-left py-2">Gender</th>
                    <th className="text-left py-2">Nickname</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.user_id} className="border-b">
                      <td className="py-2 font-mono text-sm">{user.user_id.substring(0, 8)}...</td>
                      <td className="py-2 text-sm">{new Date(user.created_at).toLocaleDateString()}</td>
                      <td className="py-2 text-sm">{user.due_date || '-'}</td>
                      <td className="py-2 text-sm">{user.budget_tier || '-'}</td>
                      <td className="py-2 text-sm">{user.baby_gender || '-'}</td>
                      <td className="py-2 text-sm">{user.baby_nickname || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Products ({products.length})</h2>
              <p className="text-sm text-gray-500">
                Add a product by pasting a URL. The AI will extract fields and draft catalog metadata.
              </p>
            </div>
            <form onSubmit={handleAddProduct} className="grid gap-3 md:grid-cols-[2fr_1fr_auto] w-full md:w-auto">
              <div className="flex flex-col">
                <label htmlFor="product-url" className="text-xs uppercase tracking-wide text-gray-500">
                  Product URL
                </label>
                <input
                  id="product-url"
                  type="url"
                  value={addUrl}
                  onChange={(event) => setAddUrl(event.target.value)}
                  placeholder="https://example.com/product"
                  className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                  disabled={addLoading}
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="product-milestone" className="text-xs uppercase tracking-wide text-gray-500">
                  Milestone (optional)
                </label>
                <input
                  id="product-milestone"
                  type="text"
                  value={addMilestone}
                  onChange={(event) => setAddMilestone(event.target.value)}
                  placeholder="e.g. month3"
                  className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={addLoading}
                />
              </div>
              <button
                type="submit"
                className="h-10 rounded bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={addLoading}
              >
                {addLoading ? 'Adding…' : 'Add via AI'}
              </button>
            </form>
          </div>
          {addError && (
            <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {addError}
            </div>
          )}
          {addSuccess && (
            <div className="mb-4 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {addSuccess}
            </div>
          )}

          {loading ? (
            <div>Loading products...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Name</th>
                    <th className="text-left py-2">Category</th>
                    <th className="text-left py-2">Brand</th>
                    <th className="text-left py-2">Price</th>
                    <th className="text-left py-2">Rating</th>
                    <th className="text-left py-2">Eco</th>
                    <th className="text-left py-2">Premium</th>
                    <th className="text-left py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b">
                      <td className="py-2 text-sm font-medium">{product.name}</td>
                      <td className="py-2 text-sm">{product.category}</td>
                      <td className="py-2 text-sm">{product.brand}</td>
                      <td className="py-2 text-sm">
                        {product.price_cents != null ? `$${(product.price_cents / 100).toFixed(2)}` : '—'}
                      </td>
                      <td className="py-2 text-sm">{product.rating ?? '-'}</td>
                      <td className="py-2 text-sm">{product.eco_friendly ? '🌱' : '—'}</td>
                      <td className="py-2 text-sm">{product.premium ? '⭐' : '—'}</td>
                      <td className="py-2 text-sm">
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(product.id)}
                          className="rounded border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Current User</h2>
          <div className="space-y-2">
            <div><strong>ID:</strong> {user.id}</div>
            <div><strong>Name:</strong> {user.firstName} {user.lastName}</div>
            <div><strong>Email:</strong> {user.emailAddresses[0]?.emailAddress}</div>
            <div><strong>Created:</strong> {user.createdAt?.toLocaleDateString() || 'Unknown'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminV2Page() {
  if (!clerkEnabled) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold text-[var(--dreambaby-text)]">Admin console unavailable</h1>
        <p className="mt-4 text-sm text-[var(--dreambaby-muted)]">
          Clerk credentials are not configured. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` to enable the admin dashboard.
        </p>
      </div>
    );
  }

  return <AdminV2Console />;
}
