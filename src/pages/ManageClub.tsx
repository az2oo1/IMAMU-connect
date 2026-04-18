import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Save, Plus, Trash2, Users, FileText, Settings, Image as ImageIcon, Link as LinkIcon, Shield, Upload } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import TagInput from '../components/TagInput';

export default function ManageClub() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('details');
  const [club, setClub] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Details State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [links, setLinks] = useState<string[]>([]);

  // News State
  const [newsTitle, setNewsTitle] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsImage, setNewsImage] = useState('');
  const [articles, setArticles] = useState<any[]>([]);

  // Members State
  const [members, setMembers] = useState<any[]>([]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const bannerInputRef = React.useRef<HTMLInputElement>(null);
  const newsImageInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchClubData();
  }, [id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner' | 'news') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/upload?type=club&id=${id}`, {
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
        if (type === 'news') setNewsImage(data.url);
      } else {
        throw new Error('Upload failed');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const fetchClubData = async () => {
    try {
      const res = await fetch(`/api/clubs/${id}`);
      if (!res.ok) throw new Error('Failed to fetch club');
      const data = await res.json();
      setClub(data.club);
      setName(data.club.name);
      setDescription(data.club.description);
      setTags(data.club.tags || '');
      setAvatarUrl(data.club.avatarUrl || '');
      setBannerUrl(data.club.bannerUrl || '');
      if (data.club.links) {
        setLinks(data.club.links.map((l: any) => l.url));
      }
      setArticles(data.club.articles || []);
      
      // Fetch members
      const membersRes = await fetch(`/api/clubs/${id}/members`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData.members);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`/api/clubs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name,
          description,
          tags,
          avatarUrl,
          bannerUrl,
          links: links.filter(l => l.trim() !== '')
        })
      });

      if (!res.ok) throw new Error('Failed to update club details');
      alert('Club details updated successfully!');
      fetchClubData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handlePostNews = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`/api/clubs/${id}/articles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: newsTitle,
          content: newsContent,
          photoUrl: newsImage
        })
      });

      if (!res.ok) throw new Error('Failed to post news');
      setNewsTitle('');
      setNewsContent('');
      setNewsImage('');
      alert('News posted successfully!');
      fetchClubData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteArticle = async (articleId: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    try {
      const res = await fetch(`/api/clubs/${id}/articles/${articleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to delete article');
      fetchClubData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      const res = await fetch(`/api/clubs/${id}/members/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to remove member');
      fetchClubData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleAdmin = async (userId: string, isAdmin: boolean) => {
    try {
      const res = await fetch(`/api/clubs/${id}/members/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ isAdmin })
      });
      if (!res.ok) throw new Error('Failed to update member role');
      fetchClubData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
  }

  if (!club) {
    return <div className="min-h-screen flex items-center justify-center text-white">Club not found</div>;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-neutral-900 border-r border-neutral-800 p-6 flex flex-col shrink-0">
        <button 
          onClick={() => navigate(`/clubs/${id}`)}
          className="flex items-center gap-2 text-neutral-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Club
        </button>

        <h2 className="text-xl font-bold mb-6">Manage Club</h2>

        <nav className="space-y-2">
          <button
            onClick={() => setActiveTab('details')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'details' ? 'bg-primary-500/10 text-primary-400' : 'text-neutral-400 hover:bg-white/5 hover:text-white'}`}
          >
            <Settings className="w-5 h-5" />
            Details & Links
          </button>
          <button
            onClick={() => setActiveTab('news')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'news' ? 'bg-primary-500/10 text-primary-400' : 'text-neutral-400 hover:bg-white/5 hover:text-white'}`}
          >
            <FileText className="w-5 h-5" />
            News Articles
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'members' ? 'bg-primary-500/10 text-primary-400' : 'text-neutral-400 hover:bg-white/5 hover:text-white'}`}
          >
            <Users className="w-5 h-5" />
            Members
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 md:p-12 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {activeTab === 'details' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h3 className="text-2xl font-bold mb-6">Club Details</h3>
              <form onSubmit={handleUpdateDetails} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1.5">Club Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500"
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
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500 min-h-[120px]"
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
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-neutral-300">Social Links</label>
                    <button
                      type="button"
                      onClick={() => setLinks([...links, ''])}
                      className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Add Link
                    </button>
                  </div>
                  <div className="space-y-3">
                    {links.map((link, index) => (
                      <div key={index} className="flex gap-2">
                        <div className="relative flex-1">
                          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                          <input
                            type="url"
                            value={link}
                            onChange={(e) => {
                              const newLinks = [...links];
                              newLinks[index] = e.target.value;
                              setLinks(newLinks);
                            }}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-primary-500"
                            placeholder="https://..."
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setLinks(links.filter((_, i) => i !== index))}
                          className="p-2.5 text-neutral-500 hover:text-red-400 bg-neutral-900 border border-neutral-800 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {links.length === 0 && (
                      <p className="text-sm text-neutral-500 italic">No links added yet.</p>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-6 py-2.5 rounded-xl font-bold transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {activeTab === 'news' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h3 className="text-2xl font-bold mb-6">News Articles</h3>
              
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 mb-8">
                <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary-400" /> Post New Article
                </h4>
                <form onSubmit={handlePostNews} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1.5">Title</label>
                    <input
                      type="text"
                      value={newsTitle}
                      onChange={(e) => setNewsTitle(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1.5">Content</label>
                    <textarea
                      value={newsContent}
                      onChange={(e) => setNewsContent(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500 min-h-[100px]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1.5">Image URL (Optional)</label>
                    <div className="relative">
                      <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                      <input
                        type="url"
                        value={newsImage}
                        onChange={(e) => setNewsImage(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-primary-500"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2.5 rounded-xl font-bold transition-colors"
                    >
                      Publish Article
                    </button>
                  </div>
                </form>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-bold mb-4">Published Articles</h4>
                {articles.length > 0 ? (
                  articles.map(article => (
                    <div key={article.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-start gap-4">
                      {article.photoUrl && (
                        <img src={article.photoUrl} alt="" className="w-24 h-24 rounded-xl object-cover shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-lg text-white mb-1 truncate">{article.title}</h5>
                        <p className="text-neutral-400 text-sm line-clamp-2 mb-2">{article.content}</p>
                        <span className="text-xs text-neutral-500">{new Date(article.createdAt).toLocaleDateString()}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteArticle(article.id)}
                        className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-neutral-500 bg-neutral-900/50 rounded-2xl border border-neutral-800 border-dashed">
                    No articles published yet.
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'members' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h3 className="text-2xl font-bold mb-6">Club Members</h3>
              
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                <div className="divide-y divide-neutral-800">
                  {members.map(member => (
                    <div key={member.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-neutral-800 overflow-hidden shrink-0">
                          {member.user.avatarUrl ? (
                            <img src={member.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-500 font-bold">
                              {member.user.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-white flex items-center gap-2">
                            {member.user.name}
                            {member.isAdmin && (
                              <span className="px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                <Shield className="w-3 h-3" /> Admin
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-neutral-400">@{member.user.username}</div>
                        </div>
                      </div>
                      
                      {member.user.id !== user?.id && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleAdmin(member.user.id, !member.isAdmin)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${member.isAdmin ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700' : 'bg-primary-500/10 text-primary-400 hover:bg-primary-500/20'}`}
                          >
                            {member.isAdmin ? 'Remove Admin' : 'Make Admin'}
                          </button>
                          <button
                            onClick={() => handleRemoveMember(member.user.id)}
                            className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {members.length === 0 && (
                    <div className="p-8 text-center text-neutral-500">
                      No members found.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
