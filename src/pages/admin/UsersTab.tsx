import React, { useState, useEffect } from 'react';
import { Search, Edit2, Ban, CheckCircle2, User as UserIcon } from 'lucide-react';
import EditUserModal from './EditUserModal';
import AdminUserProfileModal from './AdminUserProfileModal';

export default function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to update role', error);
    }
  };

  const handleBanToggle = async (userId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ isBanned: !currentStatus })
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to update ban status', error);
    }
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.studentEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.googleEmail?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">User Management</h2>
        <p className="text-neutral-400">Manage users, roles, and permissions across the platform.</p>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-neutral-800 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input 
              type="text"
              placeholder="Search users by name, username, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-950/50">
                <th className="p-4 text-sm font-medium text-neutral-400">User</th>
                <th className="p-4 text-sm font-medium text-neutral-400">Role</th>
                <th className="p-4 text-sm font-medium text-neutral-400">Status</th>
                <th className="p-4 text-sm font-medium text-neutral-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-neutral-500">Loading users...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-neutral-500">No users found.</td>
                </tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-neutral-800 hover:bg-neutral-800/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-white">{user.username.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-medium text-white">{user.name || user.username}</p>
                        <p className="text-xs text-neutral-500">@{user.username} • {user.studentEmail || user.googleEmail || 'No email'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <select 
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        user.role === 'ADMIN' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        user.role === 'NEWS_WRITER' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        'bg-neutral-800 text-neutral-300 border border-neutral-700'
                      }`}
                    >
                      <option value="USER" className="bg-neutral-900 text-white">USER</option>
                      <option value="NEWS_WRITER" className="bg-neutral-900 text-white">NEWS_WRITER</option>
                      <option value="ADMIN" className="bg-neutral-900 text-white">ADMIN</option>
                    </select>
                  </td>
                  <td className="p-4">
                    {user.isBanned ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400">
                        <Ban className="w-3.5 h-3.5" /> Banned
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                        <div className="w-2 h-2 rounded-full bg-emerald-400"></div> Active
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setViewingProfileId(user.id)}
                        className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-lg transition-colors"
                        title="View Profile"
                      >
                        <UserIcon className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => setEditingUserId(user.id)}
                        className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                        title="Edit User"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleBanToggle(user.id, user.isBanned)}
                        className={`p-2 rounded-lg transition-colors ${
                          user.isBanned 
                            ? 'text-emerald-400 hover:bg-emerald-400/10' 
                            : 'text-red-400 hover:bg-red-400/10'
                        }`}
                        title={user.isBanned ? "Unban User" : "Ban User"}
                      >
                        {user.isBanned ? <CheckCircle2 className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <EditUserModal 
        isOpen={!!editingUserId}
        onClose={() => setEditingUserId(null)}
        userId={editingUserId || ''}
        onUserUpdated={fetchUsers}
      />

      {viewingProfileId && (
        <AdminUserProfileModal
          userId={viewingProfileId}
          onClose={() => setViewingProfileId(null)}
        />
      )}
    </div>
  );
}
