import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Users } from 'lucide-react';

export default function ClubsTab() {
  const [clubs, setClubs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [newClubDesc, setNewClubDesc] = useState('');

  const fetchClubs = async () => {
    try {
      const res = await fetch('/api/admin/clubs', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClubs(data.clubs);
      }
    } catch (error) {
      console.error('Failed to fetch clubs', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/clubs', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ name: newClubName, description: newClubDesc })
      });
      if (res.ok) {
        setNewClubName('');
        setNewClubDesc('');
        setIsCreating(false);
        fetchClubs();
      }
    } catch (error) {
      console.error('Failed to create club', error);
    }
  };

  const handleDeleteClub = async (id: string) => {
    if (!confirm('Are you sure you want to delete this club?')) return;
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
  };

  const filteredClubs = clubs.filter(club => 
    club.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
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
        <div className="mb-8 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-4">Create New Club</h3>
          <form onSubmit={handleCreateClub} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Club Name</label>
              <input
                type="text"
                value={newClubName}
                onChange={(e) => setNewClubName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Description</label>
              <textarea
                value={newClubDesc}
                onChange={(e) => setNewClubDesc(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-primary-500 min-h-[100px]"
                required
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

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-neutral-800 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input 
              type="text"
              placeholder="Search clubs..."
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
                <th className="p-4 text-sm font-medium text-neutral-400">Club Name</th>
                <th className="p-4 text-sm font-medium text-neutral-400">Members</th>
                <th className="p-4 text-sm font-medium text-neutral-400">Created</th>
                <th className="p-4 text-sm font-medium text-neutral-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-neutral-500">Loading clubs...</td>
                </tr>
              ) : filteredClubs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-neutral-500">No clubs found.</td>
                </tr>
              ) : filteredClubs.map((club) => (
                <tr key={club.id} className="border-b border-neutral-800 hover:bg-neutral-800/30 transition-colors">
                  <td className="p-4">
                    <p className="font-medium text-white">{club.name}</p>
                    <p className="text-xs text-neutral-500 line-clamp-1">{club.description}</p>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 text-sm text-neutral-300">
                      <Users className="w-4 h-4 text-neutral-500" />
                      {club._count.members}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-neutral-400">
                    {new Date(club.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
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
      </div>
    </div>
  );
}
