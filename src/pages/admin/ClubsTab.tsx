import ConfirmModal from '../../components/ConfirmModal';
import { TableSkeleton } from '../../components/TableSkeleton';
import React, { useState, useEffect } from 'react';
import AdminPagination from '../../components/AdminPagination';
import { Search, Plus, Trash2, Users, Edit2 } from 'lucide-react';
import EditClubModal from './EditClubModal';
import TagInput from '../../components/TagInput';
import ImageUploadInput from '../../components/ImageUploadInput';

export default function ClubsTab() {
  const [clubs, setClubs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const LIMIT = 20;
  const [isCreating, setIsCreating] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [newClubDesc, setNewClubDesc] = useState('');
  const [newClubTags, setNewClubTags] = useState('');
  const [newClubAvatar, setNewClubAvatar] = useState('');
  const [newClubBanner, setNewClubBanner] = useState('');
  const [editingClub, setEditingClub] = useState<any>(null);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, config: null | {title: string, message: string, onConfirm: () => void, isDestructive?: boolean}}>({ isOpen: false, config: null });

  const fetchClubs = async (currentSearch = searchQuery, currentPage = page) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/clubs?page=${currentPage}&limit=${LIMIT}&search=${encodeURIComponent(currentSearch)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClubs(data.clubs);
        if (data.totalPages) {
          setTotalPages(data.totalPages);
          setTotalItems(data.total);
        }
      }
    } catch (error) {
      console.error('Failed to fetch', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClubs(searchQuery, page);
  }, [page]);
  
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) setPage(1);
      else fetchClubs();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/clubs', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ name: newClubName, description: newClubDesc, tags: newClubTags, avatarUrl: newClubAvatar, bannerUrl: newClubBanner })
      });
      if (res.ok) {
        setNewClubName('');
        setNewClubDesc('');
        setNewClubTags('');
        setNewClubAvatar('');
        setNewClubBanner('');
        setIsCreating(false);
        fetchClubs();
      }
    } catch (error) {
      console.error('Failed to create club', error);
    }
  };

  const handleDeleteClub = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      config: {
        title: 'Delete Club',
        message: 'Are you sure you want to delete this club? This action cannot be undone.',
        isDestructive: true,
        onConfirm: async () => {
          setConfirmModal({ isOpen: false, config: null });
          try {
            const res = await fetch(`/api/admin/clubs/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
              fetchClubs();
            }
          } catch (error) {
            console.error('Failed to delete club', error);
          }
        }
      }
    });
  };

  
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <ConfirmModal 
        isOpen={confirmModal.isOpen} 
        title={confirmModal.config?.title || ''}
        message={confirmModal.config?.message || ''}
        isDestructive={confirmModal.config?.isDestructive}
        onConfirm={() => confirmModal.config?.onConfirm()}
        onCancel={() => setConfirmModal({ isOpen: false, config: null })}
      />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Club Management</h2>
          <p className="text-neutral-400">Create and manage student clubs.</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-xl font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Club
        </button>
      </div>

      {isCreating && (
        <div className="mb-8 border border-neutral-800 bg-neutral-950/40 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Create New Club</h3>
          <form onSubmit={handleCreateClub} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Club Name</label>
              <input
                type="text"
                value={newClubName}
                onChange={(e) => setNewClubName(e.target.value)}
                className="w-full bg-neutral-900/50 border border-neutral-800 rounded-lg shadow-sm px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Description</label>
              <textarea
                value={newClubDesc}
                onChange={(e) => setNewClubDesc(e.target.value)}
                className="w-full bg-neutral-900/50 border border-neutral-800 rounded-lg shadow-sm px-4 py-2 text-white focus:outline-none focus:border-primary-500 min-h-[100px]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Tags</label>
              <TagInput
                tags={newClubTags}
                onChange={setNewClubTags}
                placeholder="e.g. Technology, Coding"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageUploadInput
                label="Avatar Image"
                value={newClubAvatar}
                onChange={setNewClubAvatar}
                type="avatar"
              />
              <ImageUploadInput
                label="Banner Image"
                value={newClubBanner}
                onChange={setNewClubBanner}
                type="banner"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-xl font-medium transition-colors"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="border border-neutral-800 bg-neutral-950/40 rounded-xl overflow-hidden">
        <div className="p-3 border-b border-neutral-800 flex items-center gap-3 bg-neutral-900/20">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input 
              type="text"
              placeholder="Search clubs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-900/50 border border-neutral-800 rounded-lg shadow-sm text-white focus:outline-none focus:border-primary-500 transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/40 text-xs uppercase tracking-wider text-neutral-500">
                <th className="p-4 text-sm font-medium text-neutral-400">Club Name</th>
                <th className="p-4 text-sm font-medium text-neutral-400">Members</th>
                <th className="p-4 text-sm font-medium text-neutral-400">Created</th>
                <th className="p-4 text-sm font-medium text-neutral-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableSkeleton />
              ) : clubs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-neutral-500">No clubs found.</td>
                </tr>
              ) : clubs.map((club) => (
                <tr key={club.id} className="border-b border-neutral-800 hover:bg-neutral-800/30 transition-colors">
                  <td className="p-4">
                    <p className="font-medium text-white">{club.name}</p>
                    <p className="text-xs text-neutral-500 line-clamp-1">{club.description}</p>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 text-sm text-neutral-300">
                      <Users className="w-4 h-4 text-neutral-500" />
                      {club._count?.members || 0}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-neutral-400">
                    {new Date(club.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => setEditingClub(club)}
                      className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors mr-2"
                      title="Edit Club"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteClub(club.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                      title="Delete Club"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <AdminPagination 
          currentPage={page} 
          totalPages={totalPages} 
          totalItems={totalItems} 
          itemsPerPage={LIMIT} 
          onPageChange={setPage} 
        />
  
      </div>

      {editingClub && (
        <EditClubModal
          club={editingClub}
          onClose={() => setEditingClub(null)}
          onUpdate={() => {
            setEditingClub(null);
            fetchClubs();
          }}
        />
      )}
    </div>
  );
}
