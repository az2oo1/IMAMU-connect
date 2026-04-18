import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Plus, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import TagInput from '../../components/TagInput';

interface EditClubModalProps {
  club: any;
  onClose: () => void;
  onUpdate: () => void;
}

export default function EditClubModal({ club, onClose, onUpdate }: EditClubModalProps) {
  const [name, setName] = useState(club.name);
  const [description, setDescription] = useState(club.description);
  const [avatarUrl, setAvatarUrl] = useState(club.avatarUrl || '');
  const [bannerUrl, setBannerUrl] = useState(club.bannerUrl || '');
  const [tags, setTags] = useState(club.tags || '');
  const [links, setLinks] = useState<string[]>([]);
  const [adminId, setAdminId] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (club.links) {
      setLinks(club.links.map((l: any) => l.url));
    }
    fetchUsers();
    fetchClubAdmin();
    fetchClubArticles();
  }, [club]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/upload?type=club&id=${club.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (type === 'avatar') setAvatarUrl(data.url);
        if (type === 'banner') setBannerUrl(data.url);
      } else {
        throw new Error('Upload failed');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const fetchClubArticles = async () => {
    try {
      const res = await fetch(`/api/admin/clubs/${club.id}/articles`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles);
      }
    } catch (err) {
      console.error('Failed to fetch club articles', err);
    }
  };

  const handleDeleteArticle = async (articleId: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    try {
      const res = await fetch(`/api/admin/news/${articleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        fetchClubArticles();
      }
    } catch (err) {
      console.error('Failed to delete article', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const fetchClubAdmin = async () => {
    try {
      const res = await fetch(`/api/admin/clubs/${club.id}/members`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        const admin = data.members.find((m: any) => m.isAdmin);
        if (admin) {
          setAdminId(admin.userId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch club admin', err);
    }
  };

  const handleAddLink = () => setLinks([...links, '']);
  const handleUpdateLink = (index: number, value: string) => {
    const newLinks = [...links];
    newLinks[index] = value;
    setLinks(newLinks);
  };
  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/clubs/${club.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name,
          description,
          avatarUrl,
          bannerUrl,
          tags,
          links: links.filter(l => l.trim() !== ''),
          adminId
        })
      });

      if (!res.ok) throw new Error('Failed to update club');
      onUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-neutral-800 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-white">Edit Club: {club.name}</h2>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <form id="edit-club-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Club Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Tags</label>
                <TagInput
                  tags={tags}
                  onChange={setTags}
                  placeholder="e.g. Technology, Coding"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500 min-h-[100px]"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Avatar Image</label>
                <div className="flex items-center gap-4">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-neutral-500" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm transition-colors"
                  >
                    <Upload className="w-4 h-4" /> Upload
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handleFileUpload(e, 'avatar')}
                    className="hidden"
                    accept="image/*"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Banner Image</label>
                <div className="flex items-center gap-4">
                  {bannerUrl ? (
                    <img src={bannerUrl} alt="Banner" className="w-20 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-20 h-12 rounded-xl bg-neutral-800 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-neutral-500" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm transition-colors"
                  >
                    <Upload className="w-4 h-4" /> Upload
                  </button>
                  <input
                    type="file"
                    ref={bannerInputRef}
                    onChange={(e) => handleFileUpload(e, 'banner')}
                    className="hidden"
                    accept="image/*"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Club Admin</label>
              <select
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500"
              >
                <option value="">Select an admin...</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.username} ({user.studentEmail || user.googleEmail || user.username})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-neutral-300">Club Links</label>
                <button
                  type="button"
                  onClick={handleAddLink}
                  className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add Link
                </button>
              </div>
              <div className="space-y-3">
                {links.map((link, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="url"
                      value={link}
                      onChange={(e) => handleUpdateLink(index, e.target.value)}
                      className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                      placeholder="https://..."
                      required
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveLink(index)}
                      className="p-2 text-red-400 hover:bg-red-400/10 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                {links.length === 0 && (
                  <p className="text-sm text-neutral-500 text-center py-2">No links added yet.</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-3">Club News Articles</label>
              <div className="space-y-3">
                {articles.map((article) => (
                  <div key={article.id} className="flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-xl p-3">
                    <div>
                      <p className="text-white font-medium text-sm">{article.title}</p>
                      <p className="text-xs text-neutral-500">{new Date(article.createdAt).toLocaleDateString()}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteArticle(article.id)}
                      className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {articles.length === 0 && (
                  <p className="text-sm text-neutral-500 text-center py-4 bg-neutral-950 border border-neutral-800 rounded-xl">No articles posted by this club.</p>
                )}
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-neutral-800 flex justify-end gap-3 shrink-0 bg-neutral-900">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-neutral-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-club-form"
            disabled={isLoading}
            className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-6 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
