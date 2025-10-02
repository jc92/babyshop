"use client";

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';

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

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const [databaseInfo, setDatabaseInfo] = useState<DatabaseInfo | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && user) {
      fetchDatabaseInfo();
      fetchUsers();
    }
  }, [isLoaded, user]);

  const fetchDatabaseInfo = async () => {
    try {
      const response = await fetch('/api/database');
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
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
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

  if (!isLoaded) {
    return <div className="p-8">Loading...</div>;
  }

  if (!user) {
    return <div className="p-8">Please sign in to access admin panel.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Database Admin Panel</h1>
        
        {/* Database Stats */}
        {databaseInfo && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Database Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded">
                <div className="text-2xl font-bold text-blue-600">{databaseInfo.stats.total_users}</div>
                <div className="text-sm text-gray-600">Total Users</div>
              </div>
              <div className="bg-green-50 p-4 rounded">
                <div className="text-2xl font-bold text-green-600">{databaseInfo.stats.unique_users}</div>
                <div className="text-sm text-gray-600">Unique Users</div>
              </div>
              <div className="bg-purple-50 p-4 rounded">
                <div className="text-sm font-bold text-purple-600">
                  {new Date(databaseInfo.stats.first_user).toLocaleDateString()}
                </div>
                <div className="text-sm text-gray-600">First User</div>
              </div>
              <div className="bg-orange-50 p-4 rounded">
                <div className="text-sm font-bold text-orange-600">
                  {new Date(databaseInfo.stats.latest_user).toLocaleDateString()}
                </div>
                <div className="text-sm text-gray-600">Latest User</div>
              </div>
            </div>
          </div>
        )}

        {/* Database Schema */}
        {databaseInfo && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Database Schema</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Column</th>
                    <th className="text-left py-2">Type</th>
                    <th className="text-left py-2">Nullable</th>
                    <th className="text-left py-2">Default</th>
                  </tr>
                </thead>
                <tbody>
                  {databaseInfo.schema.map((column, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 font-mono text-sm">{column.column_name}</td>
                      <td className="py-2 text-sm">{column.data_type}</td>
                      <td className="py-2 text-sm">{column.is_nullable}</td>
                      <td className="py-2 text-sm font-mono">{column.column_default || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users List */}
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
                  {users.map((user, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 font-mono text-sm">{user.user_id.substring(0, 8)}...</td>
                      <td className="py-2 text-sm">{new Date(user.created_at).toLocaleDateString()}</td>
                      <td className="py-2 text-sm">{user.due_date || '-'}</td>
                      <td className="py-2 text-sm">{user.budget || '-'}</td>
                      <td className="py-2 text-sm">{user.baby_gender || '-'}</td>
                      <td className="py-2 text-sm">{user.baby_nickname || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Current User Info */}
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
