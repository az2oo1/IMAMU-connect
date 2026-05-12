import { TableSkeleton } from '../../components/TableSkeleton';
import React, { useState, useEffect } from 'react';
import { Search, Edit2, Ban, CheckCircle2, User as UserIcon, Filter } from 'lucide-react';
import EditUserModal from './EditUserModal';
import AdminUserProfileModal from './AdminUserProfileModal';
import ConfirmModal from '../../components/ConfirmModal';

export default function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const LIMIT = 20;
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, config: null | {title: string, message: string, onConfirm: () => void, isDestructive?: boolean}}>({ isOpen: false, config: null });

  const fetchUsers = async (reset = false) => {
    try {
      setIsLoading(true);
      const currentPage = reset ? 1 : page;
      const res = await fetch(`/api/admin/users?page=${currentPage}&limit=${LIMIT}&search=${encodeURIComponent(searchQuery)}&role=${roleFilter}&status=${statusFilter}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (reset) {
          setUsers(data.users);
        } else {
          setUsers(prev => [...prev, ...data.users]);
        }
        
        if (data.totalPages && currentPage < data.totalPages) {
          setHasMore(true);
        } else {
          setHasMore(false);
        }
        if (data.total !== undefined) {
          setTotalItems(data.total);
        }
        if (reset) setPage(1);
      }
    } catch (error) {
      console.error('Failed to fetch', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(true);
  }, [roleFilter, statusFilter]);
  
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLoadMore = () => {
    setPage(p => p + 1);
  };

  useEffect(() => {
    if (page > 1) {
      fetchUsers(false);
    }
  }, [page]);

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
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      }
    } catch (error) {
      console.error('Failed to update role', error);
    }
  };

  const handleBanToggle = async (userId: string, currentStatus: boolean) => {
    setConfirmModal({
      isOpen: true,
      config: {
        title: currentStatus ? 'Unban User' : 'Ban User',
        message: `Are you sure you want to ${currentStatus ? 'unban' : 'ban'} this user?`,
        isDestructive: !currentStatus,
        onConfirm: async () => {
          setConfirmModal({ isOpen: false, config: null });
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
              setUsers(users.map(u => u.id === userId ? { ...u, isBanned: !currentStatus } : u));
            }
          } catch (error) {
            console.error('Failed to update ban status', error);
          }
        }
      }
    });
  };

  
  return (
    <div className="p-8 max-w-7xl mx-auto pb-24">
      <ConfirmModal 
        isOpen={confirmModal.isOpen} 
        title={confirmModal.config?.title || ''}
        message={confirmModal.config?.message || ''}
        isDestructive={confirmModal.config?.isDestructive}
        onConfirm={() => confirmModal.config?.onConfirm()}
        onCancel={() => setConfirmModal({ isOpen: false, config: null })}
      />
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">User Management</h2>
          <p className="text-neutral-400">Manage users, roles, and permissions across the platform. ({totalItems} total)</p>
        </div>
      </div>

      <div className="border border-neutral-800 bg-neutral-950/40 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-neutral-800 flex flex-col md:flex-row items-center gap-4 bg-neutral-900/20">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input 
              type="text"
              placeholder="Search users by name, username, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-900/50 border border-neutral-800 rounded-lg shadow-sm text-white focus:outline-none focus:border-primary-500 transition-colors"
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-neutral-900/50 border border-neutral-800 rounded-lg px-3 py-1 text-sm text-neutral-300">
              <Filter className="w-4 h-4 text-neutral-500" />
              Role: 
              <select className="bg-transparent border-none focus:ring-0 text-white p-1.5 font-medium min-w-[100px] outline-none" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                <option value="ALL">All Roles</option>
                <option value="USER">User</option>
                <option value="NEWS_WRITER">News Writer</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="flex items-center gap-2 bg-neutral-900/50 border border-neutral-800 rounded-lg px-3 py-1 text-sm text-neutral-300">
              <Filter className="w-4 h-4 text-neutral-500" />
              Status: 
              <select className="bg-transparent border-none focus:ring-0 text-white p-1.5 font-medium min-w-[100px] outline-none" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="BANNED">Banned</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/40 text-xs uppercase tracking-wider text-neutral-500">
                <th className="p-4 text-sm font-medium text-neutral-400">User</th>
                <th className="p-4 text-sm font-medium text-neutral-400">Role</th>
                <th className="p-4 text-sm font-medium text-neutral-400">Status</th>
                <th className="p-4 text-sm font-medium text-neutral-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && page === 1 ? (
                <TableSkeleton />
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-neutral-500">No users found.</td>
                </tr>
              ) : users.map((user) => (
                <tr key={user.id} className="border-b border-neutral-800 hover:bg-neutral-800/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center shrink-0">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-white">{user.username.charAt(0).toUpperCase()}</span>
                        )}
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
          {isLoading && <TableSkeleton />}
        </div>
        
        {hasMore && !isLoading && (
          <div className="p-4 border-t border-neutral-800 flex justify-center bg-neutral-900/10">
            <button
               onClick={handleLoadMore}
               className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full text-sm font-medium transition-colors border border-neutral-700"
            >
               Load More Users
            </button>
          </div>
        )}
      </div>

      <EditUserModal 
        isOpen={!!editingUserId}
        onClose={() => setEditingUserId(null)}
        userId={editingUserId || ''}
        onUserUpdated={() => fetchUsers(true)}
      />

      {viewingProfileId && (
        <AdminUserProfileModal
          userId={viewingProfileId}
          onClose={() => setViewingProfileId(null)}
          onUpdated={() => fetchUsers(true)}
        />
      )}
    </div>
  );
}
