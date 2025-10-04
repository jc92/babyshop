"use client";

import { useEffect, useState } from "react";
import { clerkEnabled, useSafeUser } from "@/lib/clerkClient";

interface DatabaseStats {
  total_users: number;
  unique_users: number;
  first_user: string;
  latest_user: string;
}

interface User {
  user_id: string;
  created_at: string;
  updated_at: string;
  due_date?: string;
  budget?: string;
  baby_gender?: string;
  baby_nickname?: string;
  hospital?: string;
}

interface DatabaseColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface DatabaseInfo {
  schema: DatabaseColumn[];
  stats: DatabaseStats;
  sample_data: unknown[];
  current_user: string;
}

export function AdminConsole() {
  const { user, isLoaded } = useSafeUser();
  const [databaseInfo, setDatabaseInfo] = useState<DatabaseInfo | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && user) {
      void fetchDatabaseInfo();
      void fetchUsers();
    }
  }, [isLoaded, user]);

  const fetchDatabaseInfo = async () => {
    try {
      const response = await fetch("/api/database");
      const data = await response.json();
      setDatabaseInfo(data);
    } catch (error) {
      console.error("Error fetching database info:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      const data = await response.json();
      setUsers(data.users || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const clearAllData = async () => {
    if (confirm("Are you sure you want to clear all user data? This cannot be undone.")) {
      try {
        const response = await fetch("/api/users", { method: "DELETE" });
        const data = await response.json();
        alert(data.message);
        void fetchUsers();
      } catch (error) {
        console.error("Error clearing data:", error);
      }
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">Database Admin Panel</h1>

        {databaseInfo && (
          <div className="mb-8 rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">Database Statistics</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded bg-blue-50 p-4">
                <div className="text-2xl font-bold text-blue-600">{databaseInfo.stats.total_users}</div>
                <div className="text-sm text-gray-600">Total Users</div>
              </div>
              <div className="rounded bg-green-50 p-4">
                <div className="text-2xl font-bold text-green-600">{databaseInfo.stats.unique_users}</div>
                <div className="text-sm text-gray-600">Unique Users</div>
              </div>
              <div className="rounded bg-purple-50 p-4">
                <div className="text-sm font-bold text-purple-600">
                  {databaseInfo.stats.first_user ? new Date(databaseInfo.stats.first_user).toLocaleDateString() : "—"}
                </div>
                <div className="text-sm text-gray-600">First User</div>
              </div>
              <div className="rounded bg-orange-50 p-4">
                <div className="text-sm font-bold text-orange-600">
                  {databaseInfo.stats.latest_user ? new Date(databaseInfo.stats.latest_user).toLocaleDateString() : "—"}
                </div>
                <div className="text-sm text-gray-600">Latest User</div>
              </div>
            </div>
          </div>
        )}

        {databaseInfo && (
          <div className="mb-8 rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">Database Schema</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left">Column</th>
                    <th className="py-2 text-left">Type</th>
                    <th className="py-2 text-left">Nullable</th>
                    <th className="py-2 text-left">Default</th>
                  </tr>
                </thead>
                <tbody>
                  {databaseInfo.schema.map((column, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 font-mono text-sm">{column.column_name}</td>
                      <td className="py-2 text-sm">{column.data_type}</td>
                      <td className="py-2 text-sm">{column.is_nullable}</td>
                      <td className="py-2 font-mono text-sm">{column.column_default || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mb-8 rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Users ({users.length})</h2>
            <button
              onClick={clearAllData}
              className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Clear All Data
            </button>
          </div>

          {loading ? (
            <div>Loading users…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left">User ID</th>
                    <th className="py-2 text-left">Created</th>
                    <th className="py-2 text-left">Due Date</th>
                    <th className="py-2 text-left">Budget</th>
                    <th className="py-2 text-left">Gender</th>
                    <th className="py-2 text-left">Nickname</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((row, index) => (
                    <tr key={`${row.user_id}-${index}`} className="border-b">
                      <td className="py-2 font-mono text-sm">{row.user_id.slice(0, 8)}…</td>
                      <td className="py-2 text-sm">{new Date(row.created_at).toLocaleDateString()}</td>
                      <td className="py-2 text-sm">{row.due_date || "-"}</td>
                      <td className="py-2 text-sm">{row.budget || "-"}</td>
                      <td className="py-2 text-sm">{row.baby_gender || "-"}</td>
                      <td className="py-2 text-sm">{row.baby_nickname || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Current User</h2>
          <div className="space-y-2">
            <div>
              <strong>ID:</strong> {user.id}
            </div>
            <div>
              <strong>Name:</strong> {user.firstName} {user.lastName}
            </div>
            <div>
              <strong>Email:</strong> {user.emailAddresses[0]?.emailAddress ?? "-"}
            </div>
            <div>
              <strong>Created:</strong> {user.createdAt?.toLocaleDateString?.() ?? "Unknown"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

