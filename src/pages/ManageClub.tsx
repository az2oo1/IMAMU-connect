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
  const [newsImages, setNewsImages] = useState<string[]>([]);
  const [newsTag, setNewsTag] = useState('');
  const [articles, setArticles] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  
  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  // Drag and Drop
  const [draggedImgIdx, setDraggedImgIdx] = useState<number | null>(null);

  // Edit Modal State
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTag, setEditTag] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  
  // Members State
  const [members, setMembers] = useState<any[]>([]);
  
  // History State
  const [imageHistory, setImageHistory] = useState<any[]>([]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const bannerInputRef = React.useRef<HTMLInputElement>(null);
  const newsImageInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchClubData();
    fetchImageHistory();
    fetchTags();
  }, [id]);

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/news-tags');
      const data = await res.json();
      setAvailableTags(data.tags);
    } catch (err) {
      console.error(err);
    }
  };

  const insertFormat = (format: string, targetId: 'newsContent' | 'editContent' = 'newsContent', explicitContent?: string) => {
    const textarea = document.getElementById(targetId) as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = targetId === 'newsContent' ? newsContent : editContent;
    const setter = targetId === 'newsContent' ? setNewsContent : setEditContent;
    const selectedText = currentVal.substring(start, end);
    let newText = '';
    
    if (format === 'bold') newText = currentVal.substring(0, start) + `**${selectedText || 'bold text'}**` + currentVal.substring(end);
    if (format === 'italic') newText = currentVal.substring(0, start) + `*${selectedText || 'italic text'}*` + currentVal.substring(end);
    if (format === 'quote') newText = currentVal.substring(0, start) + `\n> ${selectedText || 'quote'}\n` + currentVal.substring(end);
    if (format === 'mention') newText = currentVal.substring(0, start) + `@${selectedText || 'username'}` + currentVal.substring(end);
    if (format === 'image') newText = currentVal.substring(0, start) + `\n![Image](${explicitContent})\n` + currentVal.substring(end);
    
    setter(newText);
    
    // Focus back on textarea soon after
    setTimeout(() => {
      textarea.focus();
      if (format === 'image') {
        textarea.setSelectionRange(start + `\n![Image](${explicitContent})\n`.length, start + `\n![Image](${explicitContent})\n`.length);
      } else if (!selectedText) {
        const cursor = start + (format === 'quote' ? 3 : format === 'mention' ? 1 : format === 'bold' ? 2 : 1);
        textarea.setSelectionRange(cursor, cursor + (format === 'quote' ? 5 : format === 'mention' ? 8 : format === 'bold' ? 9 : 11));
      }
    }, 10);
  };

  const fetchImageHistory = async () => {
    try {
      const res = await fetch(`/api/clubs/${id}/image-history`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setImageHistory(data.history);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const uploadFileWithProgress = (file: File, url: string, onProgress: (progress: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(Math.round(percentComplete));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data.url);
          } catch (e) {
            reject('Invalid JSON response');
          }
        } else {
          reject(`Upload failed with status ${xhr.status}`);
        }
      });

      xhr.addEventListener('error', () => reject('Upload failed'));
      xhr.addEventListener('abort', () => reject('Upload aborted'));

      const formData = new FormData();
      formData.append('file', file);
      xhr.send(formData);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner' | 'news-gallery' | 'edit-gallery') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    if (type === 'news-gallery' || type === 'edit-gallery') {
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileName = file.name;
        try {
          const url = await uploadFileWithProgress(file, `/api/upload?type=club&id=${id}`, (progress) => {
            setUploadProgress(prev => ({ ...prev, [fileName]: progress }));
          });
          
          if (type === 'news-gallery') {
            setNewsImages(prev => [...prev, url]);
          } else {
            setEditImages(prev => [...prev, url]);
          }
        } catch (err) {
          console.error(`Gallery upload failed for ${fileName}`, err);
        }
      });

      await Promise.all(uploadPromises);
      setIsUploading(false);
      setUploadProgress({});
      return;
    }

    try {
      const file = files[0];
      const fileName = file.name;
      const url = await uploadFileWithProgress(file, `/api/upload?type=club&id=${id}`, (progress) => {
        setUploadProgress(prev => ({ ...prev, [fileName]: progress }));
      });
      
      if (type === 'avatar') setAvatarUrl(url);
      if (type === 'banner') setBannerUrl(url);
    } catch (err: any) {
      alert(typeof err === 'string' ? err : 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  };

  const handleDragSort = (idx: number, isEdit: boolean = false) => {
    if (draggedImgIdx === null || draggedImgIdx === idx) return;
    if (isEdit) {
      const newImgs = [...editImages];
      const [removed] = newImgs.splice(draggedImgIdx, 1);
      newImgs.splice(idx, 0, removed);
      setEditImages(newImgs);
    } else {
      const newImgs = [...newsImages];
      const [removed] = newImgs.splice(draggedImgIdx, 1);
      newImgs.splice(idx, 0, removed);
      setNewsImages(newImgs);
    }
    setDraggedImgIdx(null);
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
          photoUrl: newsImages.length > 0 ? newsImages[0] : null,
          images: newsImages,
          tag: newsTag
        })
      });

      if (!res.ok) throw new Error(`Failed to post news`);
      setNewsTitle('');
      setNewsContent('');
      setNewsImages([]);
      setNewsTag('');
      alert(`News posted successfully!`);
      fetchClubData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const submitEditArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle) return;
    try {
      const res = await fetch(`/api/clubs/${id}/articles/${editingArticle.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
          photoUrl: editImages.length > 0 ? editImages[0] : null,
          images: editImages,
          tag: editTag
        })
      });
      if (!res.ok) throw new Error('Failed to update article');
      setEditingArticle(null);
      fetchClubData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEditArticle = (article: any) => {
    setEditTitle(article.title);
    setEditContent(article.content);
    setEditImages(article.images && typeof article.images === 'string' ? JSON.parse(article.images) : (article.images || []));
    setEditTag(article.tag || '');
    setEditingArticle(article);
  };

  const handleArchiveArticle = async (articleId: string) => {
    try {
      const res = await fetch(`/api/clubs/${id}/articles/${articleId}/archive`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        fetchClubData();
      }
    } catch (err) {
      console.error('Archive failed', err);
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
    <div className="flex-1 w-full h-full flex flex-col md:flex-row bg-neutral-950 text-white overflow-hidden relative z-10">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-neutral-900 border-r border-neutral-800 p-6 flex flex-col shrink-0 overflow-y-auto">
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
      <div className="flex-1 p-6 md:p-12 overflow-y-auto min-w-0">
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
                    <div className="flex items-center gap-4 mb-2">
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
                    {imageHistory.filter(h => h.type === 'AVATAR').length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {imageHistory.filter(h => h.type === 'AVATAR').map(h => (
                          <img
                            key={h.id}
                            src={h.url}
                            className="w-8 h-8 rounded-md object-cover cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all opacity-80 hover:opacity-100"
                            onClick={() => setAvatarUrl(h.url)}
                            title="Use previous avatar"
                            alt="History"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1.5">Banner Image</label>
                    <div className="flex items-center gap-4 mb-2">
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
                    {imageHistory.filter(h => h.type === 'BANNER').length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {imageHistory.filter(h => h.type === 'BANNER').map(h => (
                          <img
                            key={h.id}
                            src={h.url}
                            className="w-14 h-8 rounded-md object-cover cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all opacity-80 hover:opacity-100"
                            onClick={() => setBannerUrl(h.url)}
                            title="Use previous banner"
                            alt="History"
                          />
                        ))}
                      </div>
                    )}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <label className="block text-sm font-medium text-neutral-300 mb-1.5">Tag</label>
                      <select
                        value={newsTag}
                        onChange={(e) => setNewsTag(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500"
                        required
                      >
                        <option value="" disabled>Select a tag</option>
                        {availableTags.map(tag => (
                          <option key={tag.id} value={tag.name}>{tag.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-medium text-neutral-300">Content</label>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => insertFormat('bold')} className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors" title="Bold"><strong className="font-serif">B</strong></button>
                        <button type="button" onClick={() => insertFormat('italic')} className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors italic" title="Italic"><em className="font-serif">I</em></button>
                        <button type="button" onClick={() => insertFormat('quote')} className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors" title="Quote">”</button>
                        <button type="button" onClick={() => insertFormat('mention')} className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors" title="Mention">@</button>
                      </div>
                    </div>
                    <textarea
                      id="newsContent"
                      value={newsContent}
                      onChange={(e) => setNewsContent(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500 min-h-[150px]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1.5">Article Images</label>
                    <p className="text-xs text-neutral-500 mb-4">Upload multiple images. Drag and drop to reorder. The first image will be used as the cover.</p>
                    <div className="flex flex-col gap-4">

                      {/* Gallery Images Upload */}
                      <div className="flex items-center gap-4 flex-wrap">
                        {newsImages.map((img, i) => (
                          <div 
                            key={i} 
                            className={`relative group cursor-move ${draggedImgIdx === i ? 'opacity-50' : ''}`}
                            draggable
                            onDragStart={(e) => {
                               // Make sure we set dataTransfer to avoid Firefox issues
                               e.dataTransfer.effectAllowed = 'move';
                               e.dataTransfer.setData('text/plain', i.toString());
                               setDraggedImgIdx(i);
                            }}
                            onDragOver={(e) => {
                               e.preventDefault();
                               e.dataTransfer.dropEffect = 'move';
                            }}
                            onDrop={(e) => {
                               e.preventDefault();
                               handleDragSort(i, false);
                            }}
                          >
                            <img src={`/api/image?url=${encodeURIComponent(img)}&w=200`} draggable={false} alt="Gallery" className={`w-24 h-16 rounded-xl object-cover border-2 pointer-events-none ${i === 0 ? 'border-primary-500' : 'border-transparent'}`} />
                            {i === 0 && <span className="absolute top-1 left-1 bg-primary-500 text-white text-[9px] font-bold px-1.5 rounded uppercase shadow">Cover</span>}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex gap-2 items-center justify-center rounded-xl transition-opacity">
                              <button
                                type="button"
                                onClick={() => insertFormat('image', 'newsContent', img)}
                                className="p-1.5 text-white hover:text-primary-400 bg-neutral-900 rounded hover:bg-neutral-800 transition-colors"
                                title="Insert into text"
                              >
                                <ImageIcon className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setNewsImages(newsImages.filter((_, idx) => idx !== i))}
                                className="p-1.5 text-white hover:text-red-400 bg-neutral-900 rounded hover:bg-neutral-800 transition-colors"
                                title="Remove image"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {isUploading && Object.keys(uploadProgress).length > 0 && (
                          <div className="flex flex-col justify-center gap-1.5 px-4 h-16 bg-neutral-900 border border-neutral-800 rounded-xl min-w-[100px]">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                              <span className="text-xs font-bold text-neutral-300">Uploading...</span>
                            </div>
                            <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-primary-500 h-full transition-all duration-300" style={{ width: `${Math.max(...Object.values(uploadProgress))}%` }} />
                            </div>
                            <div className="text-[10px] text-neutral-500 text-right">{Math.max(...Object.values(uploadProgress))}%</div>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => document.getElementById('galleryInput')?.click()}
                          className="flex items-center justify-center gap-2 px-4 border-2 border-neutral-800 border-dashed hover:border-primary-500 text-neutral-400 hover:text-primary-500 rounded-xl text-sm transition-colors h-16"
                        >
                          <Plus className="w-5 h-5" /> Add Images
                        </button>
                        <input
                          id="galleryInput"
                          type="file"
                          multiple
                          onChange={(e) => handleFileUpload(e, 'news-gallery')}
                          className="hidden"
                          accept="image/*"
                        />
                      </div>

                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      className="bg-primary-600 hover:bg-primary-500 text-white px-8 py-3 rounded-xl font-bold transition-colors w-full md:w-auto"
                    >
                      Publish Article
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl mb-12">
                <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                  <h4 className="text-lg font-bold text-white">Published Articles</h4>
                  <span className="text-sm font-medium text-neutral-500">{articles.length} articles</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-800 bg-neutral-950/50">
                        <th className="p-4 text-sm font-medium text-neutral-400">Date</th>
                        <th className="p-4 text-sm font-medium text-neutral-400">Title</th>
                        <th className="p-4 text-sm font-medium text-neutral-400">Status</th>
                        <th className="p-4 text-sm font-medium text-neutral-400 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {articles.length > 0 ? (
                        articles.map((article) => (
                          <tr key={article.id} className="border-b border-neutral-800 hover:bg-neutral-800/30 transition-colors">
                            <td className="p-4 text-sm text-neutral-400 whitespace-nowrap">
                              {new Date(article.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-4 font-medium text-white max-w-xs truncate">
                              {article.title}
                            </td>
                            <td className="p-4">
                              {article.isArchived ? (
                                <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide bg-neutral-800 text-neutral-400">Archived</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide bg-green-500/20 text-green-400">Published</span>
                              )}
                            </td>
                            <td className="p-4 text-right flex justify-end gap-2">
                              <button
                                onClick={() => handleEditArticle(article)}
                                className="px-3 py-1.5 text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleArchiveArticle(article.id)}
                                className="px-3 py-1.5 text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-yellow-400 rounded transition-colors"
                              >
                                {article.isArchived ? "Unarchive" : "Archive"}
                              </button>
                              <button
                                onClick={() => handleDeleteArticle(article.id)}
                                className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-neutral-500">
                            No articles found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
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

      {/* Edit Article Modal */}
      {editingArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60">
          <div className="bg-neutral-900 border border-neutral-800 rounded-[2rem] w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="text-xl font-bold">Edit Article</h3>
              <button onClick={() => setEditingArticle(null)} className="p-2 text-neutral-400 hover:text-white bg-neutral-800 rounded-full transition-colors">
                <Trash2 className="w-5 h-5 hidden" /> {/* Hidden for sizing, cross ideal but no icon exported */}
                Cancel
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form onSubmit={submitEditArticle} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1.5">Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1.5">Tag</label>
                    <select
                      value={editTag}
                      onChange={(e) => setEditTag(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500"
                      required
                    >
                      <option value="" disabled>Select a tag</option>
                      {availableTags.map(tag => (
                        <option key={tag.id} value={tag.name}>{tag.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">Content</label>
                  <textarea
                    id="editContent"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500 min-h-[200px]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">Images (Drag to reorder)</label>
                  <div className="flex flex-wrap gap-4 items-center">
                    {editImages.map((img, i) => (
                      <div 
                        key={i} 
                        className={`relative group cursor-move ${draggedImgIdx === i ? 'opacity-50' : ''}`}
                        draggable
                        onDragStart={(e) => {
                           e.dataTransfer.effectAllowed = 'move';
                           e.dataTransfer.setData('text/plain', i.toString());
                           setDraggedImgIdx(i);
                        }}
                        onDragOver={(e) => {
                           e.preventDefault();
                           e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(e) => {
                           e.preventDefault();
                           handleDragSort(i, true);
                        }}
                      >
                        <img src={`/api/image?url=${encodeURIComponent(img)}&w=200`} draggable={false} alt="Gallery" className={`w-24 h-16 rounded-xl object-cover border-2 pointer-events-none ${i === 0 ? 'border-primary-500' : 'border-transparent'}`} />
                        {i === 0 && <span className="absolute top-1 left-1 bg-primary-500 text-white text-[9px] font-bold px-1.5 rounded uppercase shadow">Cover</span>}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex gap-2 items-center justify-center rounded-xl transition-opacity">
                          <button
                            type="button"
                            onClick={() => insertFormat('image', 'editContent', img)}
                            className="p-1.5 text-white hover:text-primary-400 bg-neutral-900 rounded hover:bg-neutral-800 transition-colors"
                            title="Insert into text"
                          >
                            <ImageIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditImages(editImages.filter((_, idx) => idx !== i))}
                            className="p-1.5 text-white hover:text-red-400 bg-neutral-900 rounded hover:bg-neutral-800 transition-colors"
                            title="Remove image"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {isUploading && Object.keys(uploadProgress).length > 0 && (
                      <div className="flex flex-col justify-center gap-1.5 px-4 h-16 bg-neutral-900 border border-neutral-800 rounded-xl min-w-[100px]">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs font-bold text-neutral-300">Uploading...</span>
                        </div>
                        <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-primary-500 h-full transition-all duration-300" style={{ width: `${Math.max(...Object.values(uploadProgress))}%` }} />
                        </div>
                        <div className="text-[10px] text-neutral-500 text-right">{Math.max(...Object.values(uploadProgress))}%</div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => document.getElementById('editGalleryInput')?.click()}
                      className="flex items-center justify-center gap-2 px-4 border-2 border-neutral-800 border-dashed hover:border-primary-500 text-neutral-400 hover:text-primary-500 rounded-xl text-sm transition-colors h-16"
                    >
                      <Plus className="w-5 h-5" /> Add Images
                    </button>
                    <input
                      id="editGalleryInput"
                      type="file"
                      multiple
                      onChange={(e) => handleFileUpload(e, 'edit-gallery')}
                      className="hidden"
                      accept="image/*"
                    />
                  </div>
                </div>

                <div className="flex justify-end border-t border-neutral-800 pt-6">
                  <button type="submit" className="bg-primary-600 hover:bg-primary-500 text-white px-8 py-3 rounded-xl font-bold transition-colors w-full md:w-auto">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
