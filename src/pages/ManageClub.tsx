import { toast } from 'sonner';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Save, Plus, Trash2, Users, FileText, Settings, Image as ImageIcon, Link as LinkIcon, Shield, Upload, LayoutDashboard, Eye, Edit, ChevronRight, Network, MoreVertical, Search, UserPlus, Loader2 } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import TagInput from '../components/TagInput';
import TipTapEditor, { TipTapEditorRef } from '../components/TipTapEditor';
import ClubHierarchy from '../components/ClubHierarchy';
import OptimizedImage from '../components/OptimizedImage';
import FormBuilder from '../components/FormBuilder';
import FormSubmissions from '../components/FormSubmissions';
import ImageUploadInput from '../components/ImageUploadInput';
import ConfirmModal from '../components/ConfirmModal';

export default function ManageClub() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('overview');
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
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  // News State
  const [newsTitle, setNewsTitle] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsImages, setNewsImages] = useState<string[]>([]);
  const [newsTag, setNewsTag] = useState('');
  const [articles, setArticles] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const newsEditorRef = useRef<TipTapEditorRef>(null);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  // Layout
  const [maxDepth, setMaxDepth] = useState<number>(3);
  
  // Drag and Drop
  const [draggedImgIdx, setDraggedImgIdx] = useState<number | null>(null);

  
  // Roles State
  const [editingRole, setEditingRole] = useState<any>(null);
  const [roleName, setRoleName] = useState('');
  const [rolePerms, setRolePerms] = useState<string[]>([]);
  const PERMISSIONS = [
    { id: 'manage_settings', label: 'Manage Settings' },
    { id: 'manage_news', label: 'Manage Articles' },
    { id: 'manage_members', label: 'Manage Members' },
    { id: 'manage_forms', label: 'Manage Forms' }
  ];

  // Edit Modal State
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTag, setEditTag] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const editEditorRef = useRef<TipTapEditorRef>(null);
  
  // Members State
  const [members, setMembers] = useState<any[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteSearchQuery, setInviteSearchQuery] = useState('');
  const [inviteSearchResults, setInviteSearchResults] = useState<any[]>([]);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [selectedMemberForInfo, setSelectedMemberForInfo] = useState<any>(null);
  
  // History State
  const [imageHistory, setImageHistory] = useState<any[]>([]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const bannerInputRef = React.useRef<HTMLInputElement>(null);
  const newsImageInputRef = React.useRef<HTMLInputElement>(null);

  // Forms State
  const [forms, setForms] = useState<any[]>([]);
  const [viewingFormId, setViewingFormId] = useState<string | null>(null);
  const [isCreatingForm, setIsCreatingForm] = useState(false);
  const [editingForm, setEditingForm] = useState<any>(null);

  useEffect(() => {
    fetchClubData();
    fetchImageHistory();
    fetchTags();
    fetchForms();
  }, [id]);

  const fetchForms = async () => {
    try {
      const res = await fetch(`/api/forms?entityType=club&entityId=${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setForms(data.forms);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/news-tags');
      const data = await res.json();
      setAvailableTags(data.tags);
    } catch (err) {
      console.error(err);
    }
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
      const uploadPromises = Array.from(files as FileList).map(async (file: File) => {
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
      toast.error(typeof err === 'string' ? err : 'Upload failed');
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
      const res = await fetch(`/api/clubs/${id}?manage=true`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
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

  const handleSearchUsersToInvite = async (query: string) => {
    if (!query.trim()) {
      setInviteSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInviteSearchResults(data.users);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleInviteUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/clubs/${id}/members`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        toast.success('User invited successfully!');
        fetchClubData();
        setShowInviteModal(false);
        setInviteSearchQuery('');
        setInviteSearchResults([]);
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Failed to invite user');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error inviting user');
    }
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSavingDetails(true);
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
      toast.success('Club details updated successfully!');
      fetchClubData();
    } catch (err: any) {
      toast.error(err.message);
      setError(err.message);
    } finally {
      setIsSavingDetails(false);
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
      if (newsEditorRef.current) newsEditorRef.current.setContent('');
      setNewsImages([]);
      setNewsTag('');
      toast.success(`News posted successfully!`);
      fetchClubData();
    } catch (err: any) {
      toast.error(err.message);
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
      toast.error(err.message);
    }
  };

  const handleEditArticle = (article: any) => {
    setEditTitle(article.title);
    setEditContent(article.content);
    setEditImages(article.images && typeof article.images === 'string' ? JSON.parse(article.images) : (article.images || []));
    setEditTag(article.tag || '');
    setEditingArticle(article);
  };

  useEffect(() => {
    // Ensuring the editor parses and displays the markdown when editing modal opens
    if (editingArticle && editEditorRef.current) {
      editEditorRef.current.setContent(editingArticle.content || '');
    }
  }, [editingArticle]);

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
    setConfirmModal({
      isOpen: true,
      config: {
        title: 'Delete Article',
        message: 'Are you sure you want to delete this article?',
        isDestructive: true,
        onConfirm: async () => {
          setConfirmModal({ isOpen: false, config: null });
          try {
            const res = await fetch(`/api/clubs/${id}/articles/${articleId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (!res.ok) throw new Error('Failed to delete article');
            toast.success('Article deleted successfully');
            fetchClubData();
          } catch (err: any) {
            toast.error(err.message);
            setError(err.message);
          }
        }
      }
    });
  };

  const handleRemoveMember = async (userId: string) => {
    setConfirmModal({
      isOpen: true,
      config: {
        title: 'Remove Member',
        message: 'Are you sure you want to remove this member?',
        isDestructive: true,
        onConfirm: async () => {
          setConfirmModal({ isOpen: false, config: null });
          try {
            const res = await fetch(`/api/clubs/${id}/members/${userId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (!res.ok) throw new Error('Failed to remove member');
            toast.success('Member removed successfully');
            fetchClubData();
          } catch (err: any) {
            toast.error(err.message);
            setError(err.message);
          }
        }
      }
    });
  };

  const handleSaveRole = async () => {
    try {
      const url = editingRole ? `/api/clubs/${id}/roles/${editingRole.id}` : `/api/clubs/${id}/roles`;
      const method = editingRole ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name: roleName, permissions: rolePerms })
      });
      if (!res.ok) throw new Error('Failed to save role');
      toast.success(editingRole ? 'Role updated successfully' : 'Role created successfully');
      setEditingRole(null);
      setRoleName('');
      setRolePerms([]);
      fetchClubData();
    } catch (err: any) {
      toast.error(err.message);
      setError(err.message);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    setConfirmModal({
      isOpen: true,
      config: {
        title: 'Delete Role',
        message: 'Are you sure you want to delete this role?',
        isDestructive: true,
        onConfirm: async () => {
          setConfirmModal({ isOpen: false, config: null });
          try {
            const res = await fetch(`/api/clubs/${id}/roles/${roleId}`, {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
              }
            });
            if (!res.ok) throw new Error('Failed to delete role');
            fetchClubData();
          } catch (err: any) {
            setError(err.message);
          }
        }
      }
    });
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
    <div className="flex-1 w-full h-full flex flex-col bg-neutral-950 text-white overflow-hidden relative z-10">
      {/* Main Content */}
      <div className="flex-1 p-6 md:p-12 overflow-y-auto min-w-0">
        <div className="max-w-4xl mx-auto">
          {/* Header Action */}
          <div className="mb-8 flex items-center justify-between">
            {activeTab === 'overview' ? (
              <button 
                onClick={() => navigate(`/clubs/${id}`)}
                className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to Club
              </button>
            ) : (
              <button 
                onClick={() => setActiveTab('overview')}
                className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </button>
            )}
          </div>

          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div>
                <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400 mb-2">
                  Welcome to Dashboard
                </h3>
                <p className="text-neutral-400 text-lg">Manage {club.name} and track your community</p>
              </div>

              {/* Stats Bento Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                  <Users className="w-8 h-8 text-primary-400 mb-4" />
                  <p className="text-4xl font-black text-white mb-1">{club._count?.members || 0}</p>
                  <p className="text-neutral-400 font-medium">Total Members</p>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                  <FileText className="w-8 h-8 text-purple-400 mb-4" />
                  <p className="text-4xl font-black text-white mb-1">{articles.length || 0}</p>
                  <p className="text-neutral-400 font-medium">News Articles</p>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                  <Eye className="w-8 h-8 text-blue-400 mb-4" />
                  <p className="text-4xl font-black text-white mb-1">{club.pageViews || 0}</p>
                  <p className="text-neutral-400 font-medium">Genuine Page Views</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h4 className="text-xl font-bold text-white mb-4">Quick Actions</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  <button 
                    onClick={() => setActiveTab('articles')}
                    className="flex flex-col items-center justify-center p-6 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-primary-500/50 hover:bg-neutral-800 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary-500/10 text-primary-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <FileText className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-white">Articles</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('compose-article')}
                    className="flex flex-col items-center justify-center p-6 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-primary-500/50 hover:bg-neutral-800 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary-500/10 text-primary-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Edit className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-white">Compose</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('forms')}
                    className="flex flex-col items-center justify-center p-6 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-primary-500/50 hover:bg-neutral-800 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <FileText className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-white">Forms</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('details')}
                    className="flex flex-col items-center justify-center p-6 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-primary-500/50 hover:bg-neutral-800 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-full bg-white/5 text-neutral-300 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Settings className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-white">Details</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('members')}
                    className="flex flex-col items-center justify-center p-6 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-primary-500/50 hover:bg-neutral-800 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-full bg-white/5 text-neutral-300 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Users className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-white">Members</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('roles')}
                    className="flex flex-col items-center justify-center p-6 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-primary-500/50 hover:bg-neutral-800 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Shield className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-white">Roles</span>
                  </button>
                </div>
              </div>

              {/* Recent Activity Mini-Feed */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                 <div className="flex justify-between items-center mb-6">
                   <h4 className="text-xl font-bold text-white">Recent Articles</h4>
                   <button onClick={() => setActiveTab('articles')} className="text-sm font-bold text-primary-400 hover:text-primary-300 flex items-center">
                     View All <ChevronRight className="w-4 h-4 ml-1" />
                   </button>
                 </div>
                 <div className="space-y-4">
                   {articles.slice(0, 3).map((article: any) => (
                     <div key={article.id} className="flex items-center justify-between p-4 bg-neutral-950 rounded-xl border border-neutral-800/50 hover:border-neutral-700 transition-colors">
                       <div className="flex flex-col">
                         <span className="text-white font-bold mb-1 truncate max-w-[200px] sm:max-w-xs">{article?.title || 'Untitled'}</span>
                         <span className="text-xs text-neutral-500">{article?.createdAt ? new Date(article.createdAt).toLocaleDateString() : ''}</span>
                       </div>
                       <span className="px-3 py-1 bg-white/5 text-neutral-300 text-xs font-bold rounded-lg uppercase">{article.tag || 'Update'}</span>
                     </div>
                   ))}
                   {articles.length === 0 && (
                     <div className="text-center py-8 text-neutral-500">No articles posted yet.</div>
                   )}
                 </div>
              </div>
            </motion.div>
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
                      placeholder="Add tag (e.g. Sports)"
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
                    <ImageUploadInput
                      label="Avatar Image"
                      value={avatarUrl}
                      onChange={setAvatarUrl}
                      type="avatar"
                      uploadUrl={`/api/upload?type=club&id=${club.id}`}
                    />
                    {imageHistory.filter(h => h.type === 'AVATAR').length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mt-3">
                        {imageHistory.filter(h => h.type === 'AVATAR').map(h => (
                          <img referrerPolicy="no-referrer"
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
                    <ImageUploadInput
                      label="Banner Image"
                      value={bannerUrl}
                      onChange={setBannerUrl}
                      type="banner"
                      uploadUrl={`/api/upload?type=club&id=${club.id}`}
                    />
                    {imageHistory.filter(h => h.type === 'BANNER').length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mt-3">
                        {imageHistory.filter(h => h.type === 'BANNER').map(h => (
                          <img referrerPolicy="no-referrer"
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
                    disabled={isSavingDetails}
                    className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-6 py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50"
                  >
                    {isSavingDetails ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isSavingDetails ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {activeTab === 'compose-article' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h3 className="text-2xl font-bold mb-6">Compose New Article</h3>
              
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 mb-8">
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
                    </div>
                    <TipTapEditor
                      ref={newsEditorRef}
                      value={newsContent}
                      onChange={setNewsContent}
                      className="w-full"
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
                            <img referrerPolicy="no-referrer" src={`/api/image?url=${encodeURIComponent(img)}&w=200`} draggable={false} alt="Gallery" className={`w-24 h-16 rounded-xl object-cover border-2 pointer-events-none ${i === 0 ? 'border-primary-500' : 'border-transparent'}`} />
                            {i === 0 && <span className="absolute top-1 left-1 bg-primary-500 text-white text-[9px] font-bold px-1.5 rounded uppercase shadow">Cover</span>}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex gap-2 items-center justify-center rounded-xl transition-opacity">
                              <button
                                type="button"
                                onClick={() => {
                                  if (newsEditorRef.current) {
                                    newsEditorRef.current.insertText(`\n![Alt Text](${img})\n`);
                                  } else {
                                    setNewsContent(prev => prev + `\n![Alt Text](${img})\n`);
                                  }
                                }}
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
                              <div className="bg-primary-500 h-full transition-all duration-300" style={{ width: `${Math.max(...(Object.values(uploadProgress) as number[]))}%` }} />
                            </div>
                            <div className="text-[10px] text-neutral-500 text-right">{Math.max(...(Object.values(uploadProgress) as number[]))}%</div>
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
            </motion.div>
          )}

          {activeTab === 'articles' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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
                              {article?.title || 'Untitled'}
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

          {activeTab === 'forms' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Applications & Forms</h3>
                  <p className="text-neutral-400">Manage member applications, event registrations, and feedback forms.</p>
                </div>
                {!isCreatingForm && !viewingFormId && !editingForm && (
                  <button 
                    onClick={() => setIsCreatingForm(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl transition-all hover:scale-105"
                  >
                    <Plus className="w-5 h-5" />
                    Create New Form
                  </button>
                )}
              </div>

              {isCreatingForm || editingForm ? (
                <div>
                  <button 
                    onClick={() => { setIsCreatingForm(false); setEditingForm(null); }}
                    className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-6"
                  >
                    <ArrowLeft className="w-4 h-4" /> Cancel {editingForm ? 'Editing' : 'Creation'}
                  </button>
                  <FormBuilder 
                    entityType="club" 
                    entityId={id as string} 
                    initialForm={editingForm}
                    onSave={() => {
                      setIsCreatingForm(false);
                      setEditingForm(null);
                      fetchForms();
                    }} 
                  />
                </div>
              ) : viewingFormId ? (
                <div>
                  <button 
                    onClick={() => setViewingFormId(null)}
                    className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-6"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Forms
                  </button>
                  <FormSubmissions formId={viewingFormId} />
                </div>
              ) : (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
                  {forms.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-neutral-800 bg-neutral-950/50">
                            <th className="p-4 text-sm font-medium text-neutral-400">Title</th>
                            <th className="p-4 text-sm font-medium text-neutral-400">Status</th>
                            <th className="p-4 text-sm font-medium text-neutral-400">Responses</th>
                            <th className="p-4 text-sm font-medium text-neutral-400">Created At</th>
                            <th className="p-4 text-sm font-medium text-neutral-400 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {forms.map(form => (
                            <tr key={form.id} className="border-b border-neutral-800 hover:bg-neutral-800/30 transition-colors">
                              <td className="p-4">
                                <div className="font-bold text-white">{form?.title || 'Untitled Form'}</div>
                                <div className="text-xs text-neutral-500 max-w-xs truncate">{form?.description || ''}</div>
                              </td>
                              <td className="p-4">
                                <span className={`px-3 py-1 text-xs font-bold rounded-lg uppercase ${
                                  form.status === 'OPEN' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                                  form.status === 'CLOSED' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                                  'bg-neutral-800 text-neutral-400'
                                }`}>
                                  {form.status}
                                </span>
                              </td>
                              <td className="p-4 font-bold text-neutral-300">
                                {form._count?.submissions || 0}
                              </td>
                              <td className="p-4 text-sm text-neutral-400 whitespace-nowrap">
                                {new Date(form.createdAt).toLocaleDateString()}
                              </td>
                              <td className="p-4 text-right flex justify-end gap-2">
                                <button
                                  onClick={() => setViewingFormId(form.id)}
                                  className="px-4 py-2 text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
                                >
                                  View Submissions
                                </button>
                                <button
                                  onClick={() => setEditingForm(form)}
                                  className="px-4 py-2 text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
                                >
                                  Edit Form
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-12 text-center">
                      <FileText className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                      <h4 className="text-lg font-bold text-white mb-2">No forms created yet</h4>
                      <p className="text-neutral-500 max-w-sm mx-auto">Create applications, registration forms, or surveys to collect info from your club members or the public.</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          
          {activeTab === 'roles' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex justify-between items-center bg-neutral-900 border border-neutral-800 p-6 rounded-2xl">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Club Roles</h3>
                  <p className="text-neutral-400">Create custom roles and assign them specific permissions.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  {(!club?.roles || club.roles.length === 0) && (
                    <div className="text-center py-12 bg-neutral-900 rounded-2xl border border-neutral-800">
                      <p className="text-neutral-500">No custom roles created yet.</p>
                    </div>
                  )}
                  {club?.roles?.map((role: any) => (
                    <div key={role.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-neutral-700 transition-colors">
                      <div>
                        <h4 className="text-lg font-bold text-white flex items-center gap-2">
                          {role.name}
                          <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400 text-xs font-medium border border-neutral-700/50">
                            {role.permissions?.length || 0} Permissions
                          </span>
                        </h4>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {role.permissions?.map((p: string) => (
                            <span key={p} className="px-3 py-1 rounded-lg bg-primary-500/10 text-primary-400 text-[10px] font-bold uppercase tracking-wider">
                              {p.replace('manage_', '')}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingRole(role);
                            setRoleName(role.name);
                            setRolePerms(role.permissions || []);
                          }}
                          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-bold rounded-xl transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteRole(role.id)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 h-fit sticky top-6">
                  <h4 className="text-lg font-bold text-white mb-4">
                    {editingRole ? 'Edit Role' : 'Create New Role'}
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Role Name</label>
                      <input 
                        type="text" 
                        value={roleName}
                        onChange={e => setRoleName(e.target.value)}
                        placeholder="e.g. Content Manager"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all placeholder:text-neutral-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Permissions</label>
                      <div className="space-y-2">
                        {PERMISSIONS.map(p => (
                          <label key={p.id} className="flex items-center gap-3 p-3 bg-neutral-950 border border-neutral-800 rounded-xl cursor-pointer hover:border-neutral-700 transition-colors">
                            <input 
                              type="checkbox" 
                              checked={rolePerms.includes(p.id)}
                              onChange={(e) => {
                                if (e.target.checked) setRolePerms([...rolePerms, p.id]);
                                else setRolePerms(rolePerms.filter(x => x !== p.id));
                              }}
                              className="w-4 h-4 rounded text-primary-500 focus:ring-primary-500/50 bg-neutral-900 border-neutral-700"
                            />
                            <span className="text-sm text-neutral-300 font-medium">{p.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="pt-2 flex gap-3">
                      {editingRole && (
                        <button 
                          onClick={() => { setEditingRole(null); setRoleName(''); setRolePerms([]); }}
                          className="flex-1 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-all"
                        >
                          Cancel
                        </button>
                      )}
                      <button 
                        onClick={handleSaveRole}
                        disabled={!roleName.trim()}
                        className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all"
                      >
                        {editingRole ? 'Save Changes' : 'Create Role'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}


          {activeTab === 'members' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white">Club Organization Chart</h3>
                  <div className="flex items-center gap-4 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2">
                    <label className="text-sm font-medium text-neutral-400">Chart Depth:</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="10" 
                      value={maxDepth} 
                      onChange={(e) => setMaxDepth(parseInt(e.target.value))}
                      className="w-32"
                    />
                    <span className="text-sm font-bold text-white w-4 text-center">{maxDepth}</span>
                  </div>
                </div>
                <p className="text-neutral-400 mb-6 max-w-2xl">
                  Drag and drop members to assign them underneath a manager, or click on a member to edit their organizational role, make them an admin, or remove them from the chart.
                </p>
                
                <div className="mt-4 bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
                  <ClubHierarchy clubId={id || ''} isReadOnly={false} maxDepth={maxDepth} />
                </div>
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                  <h3 className="text-2xl font-bold text-white">Members List</h3>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="w-5 h-5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search members..."
                        className="pl-10 pr-4 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-primary-500 w-full sm:w-64 transition-colors"
                        value={memberSearchQuery}
                        onChange={e => setMemberSearchQuery(e.target.value)}
                      />
                    </div>
                    <button onClick={() => setShowInviteModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-black font-bold rounded-xl hover:bg-primary-400 transition-colors">
                      <UserPlus className="w-5 h-5" /> Invite
                    </button>
                  </div>
                </div>
                
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-visible shadow-xl">
                  <div className="divide-y divide-neutral-800">
                    {members.filter(m => (m.user?.name || m.user?.username || '').toLowerCase().includes(memberSearchQuery.toLowerCase())).map(member => (
                      <div key={member.id} className="p-4 flex items-center justify-between relative">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-neutral-800 overflow-hidden shrink-0 border border-neutral-700">
                            {member.user?.avatarUrl ? (
                              <OptimizedImage src={member.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-500 font-bold">
                                {member.user?.username?.charAt(0)?.toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-2">
                              {member.user?.name || member.user?.username}
                              {member.isAdmin && (
                                <span className="px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                  <Shield className="w-3 h-3" /> Admin
                                </span>
                              )}
                              {(member.roleTitle || member.role?.name) && !member.isAdmin && (
                                <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 text-[10px] font-medium tracking-wide border border-neutral-700/50 shadow-sm">
                                  {member.roleTitle || member.role?.name}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-neutral-400">@{member.user?.username}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 relative">
                          <button
                            onClick={() => setActiveDropdownId(activeDropdownId === member.id ? null : member.id)}
                            className="p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white rounded-xl transition-colors"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          
                          <AnimatePresence>
                            {activeDropdownId === member.id && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setActiveDropdownId(null)} />
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute right-0 top-12 w-48 bg-neutral-800 border border-neutral-700 rounded-xl shadow-2xl z-50 overflow-hidden"
                                >
                                  <button
                                    onClick={() => { setSelectedMemberForInfo(member); setActiveDropdownId(null); }}
                                    className="w-full text-left px-4 py-3 hover:bg-neutral-700 text-white font-medium transition-colors border-b border-neutral-700/50 flex items-center gap-2"
                                  >
                                    <Eye className="w-4 h-4" /> Show User Info
                                  </button>
                                  {member.user?.id !== user?.id && (
                                    <>
                                      <button
                                        onClick={() => { handleToggleAdmin(member.user.id, !member.isAdmin); setActiveDropdownId(null); }}
                                        className="w-full text-left px-4 py-3 hover:bg-neutral-700 text-white font-medium transition-colors border-b border-neutral-700/50 flex items-center gap-2"
                                      >
                                        <Shield className="w-4 h-4" /> {member.isAdmin ? 'Remove Admin' : 'Make Admin'}
                                      </button>
                                      <button
                                        onClick={() => { handleRemoveMember(member.user.id); setActiveDropdownId(null); }}
                                        className="w-full text-left px-4 py-3 hover:bg-red-500/10 text-red-400 font-medium transition-colors flex items-center gap-2"
                                      >
                                        <Trash2 className="w-4 h-4" /> Remove from Club
                                      </button>
                                    </>
                                  )}
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    ))}
                    {members.filter(m => (m.user?.name || m.user?.username || '').toLowerCase().includes(memberSearchQuery.toLowerCase())).length === 0 && (
                      <div className="p-12 text-center text-neutral-500 flex flex-col items-center">
                        <Users className="w-12 h-12 mb-4 opacity-20" />
                        <p>{memberSearchQuery ? 'No members match your search.' : 'No members found.'}</p>
                      </div>
                    )}
                  </div>
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
                  <TipTapEditor
                    ref={editEditorRef}
                    value={editContent}
                    onChange={setEditContent}
                    className="w-full h-full"
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
                        <img referrerPolicy="no-referrer" src={`/api/image?url=${encodeURIComponent(img)}&w=200`} draggable={false} alt="Gallery" className={`w-24 h-16 rounded-xl object-cover border-2 pointer-events-none ${i === 0 ? 'border-primary-500' : 'border-transparent'}`} />
                        {i === 0 && <span className="absolute top-1 left-1 bg-primary-500 text-white text-[9px] font-bold px-1.5 rounded uppercase shadow">Cover</span>}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex gap-2 items-center justify-center rounded-xl transition-opacity">
                          <button
                            type="button"
                            onClick={() => {
                              if (editEditorRef.current) {
                                editEditorRef.current.insertText(`\n![Alt Text](${img})\n`);
                              } else {
                                setEditContent(prev => prev + `\n![Alt Text](${img})\n`);
                              }
                            }}
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
                          <div className="bg-primary-500 h-full transition-all duration-300" style={{ width: `${Math.max(...(Object.values(uploadProgress) as number[]))}%` }} />
                        </div>
                        <div className="text-[10px] text-neutral-500 text-right">{Math.max(...(Object.values(uploadProgress) as number[]))}%</div>
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
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl relative flex flex-col max-h-[90vh]">
            <h2 className="text-2xl font-bold text-white mb-6">Invite Members</h2>
            
            <div className="relative mb-6">
              <Search className="w-5 h-5 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search by name, username, or email..."
                className="w-full pl-12 pr-4 py-3 bg-neutral-800 border border-neutral-700/50 focus:border-primary-500 focus:outline-none rounded-2xl text-white transition-colors"
                value={inviteSearchQuery}
                onChange={(e) => {
                  setInviteSearchQuery(e.target.value);
                  handleSearchUsersToInvite(e.target.value);
                }}
              />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2">
              {inviteSearchResults.map(u => {
                const isMember = members.some(m => m.userId === u.id);
                return (
                  <div key={u.id} className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {u.avatarUrl ? (
                         <img src={u.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                         <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-neutral-300">{u.username.charAt(0).toUpperCase()}</div>
                      )}
                      <div>
                        <div className="font-bold text-white text-sm">{u.name || u.username}</div>
                        <div className="text-xs text-neutral-500">@{u.username}</div>
                      </div>
                    </div>
                    {isMember ? (
                      <span className="text-xs font-semibold text-neutral-500 bg-neutral-800 px-3 py-1.5 rounded-lg">Member</span>
                    ) : (
                      <button onClick={() => handleInviteUser(u.id)} className="px-3 py-1.5 bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 rounded-lg text-xs font-bold transition-colors">
                        Add to Club
                      </button>
                    )}
                  </div>
                );
              })}
              {inviteSearchQuery && inviteSearchResults.length === 0 && (
                <div className="text-center p-8 text-neutral-500">No users found.</div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-800 flex justify-end">
              <button 
                onClick={() => { setShowInviteModal(false); setInviteSearchQuery(''); setInviteSearchResults([]); }}
                className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedMemberForInfo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center p-4 pt-[10vh]">
          <div className="bg-neutral-900 rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl border border-neutral-800 flex flex-col h-fit">
            <div className="p-8">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-full bg-neutral-800 border-2 border-neutral-700/50 overflow-hidden shrink-0">
                  {selectedMemberForInfo.user?.avatarUrl ? (
                    <OptimizedImage src={selectedMemberForInfo.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-500 font-bold text-2xl">
                      {selectedMemberForInfo.user?.username?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 pt-2">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    {selectedMemberForInfo.user?.name || selectedMemberForInfo.user?.username}
                    {selectedMemberForInfo.isAdmin && <Shield className="w-5 h-5 text-primary-400" />}
                  </h2>
                  <p className="text-neutral-400 font-medium">@{selectedMemberForInfo.user?.username}</p>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 space-y-4">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-neutral-500 font-bold mb-2">Display Title</div>
                    <input 
                      type="text" 
                      className="w-full bg-neutral-900 border border-neutral-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all placeholder:text-neutral-600"
                      placeholder="e.g. President, Member..."
                      value={selectedMemberForInfo.roleTitle || ''}
                      onChange={async (e) => {
                        const title = e.target.value;
                        setSelectedMemberForInfo({...selectedMemberForInfo, roleTitle: title});
                        try {
                          await fetch(`/api/clubs/${id}/members/${selectedMemberForInfo.userId}/role`, {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${localStorage.getItem('token')}`
                            },
                            body: JSON.stringify({ roleTitle: title })
                          });
                          setMembers(members.map(m => m.id === selectedMemberForInfo.id ? { ...m, roleTitle: title } : m));
                        } catch (err) {}
                      }}
                    />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-neutral-500 font-bold mb-2">Permission Role</div>
                    <select
                      value={selectedMemberForInfo.roleId || ''}
                      onChange={async (e) => {
                        const roleId = e.target.value === '' ? null : e.target.value;
                        const roleObj = club?.roles?.find((r: any) => r.id === roleId);
                        setSelectedMemberForInfo({...selectedMemberForInfo, roleId, role: roleObj});
                        try {
                          await fetch(`/api/clubs/${id}/members/${selectedMemberForInfo.userId}/role`, {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${localStorage.getItem('token')}`
                            },
                            body: JSON.stringify({ roleId })
                          });
                          setMembers(members.map(m => m.id === selectedMemberForInfo.id ? { ...m, roleId, role: roleObj } : m));
                        } catch (err) {}
                      }}
                      className="w-full bg-neutral-900 border border-neutral-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                    >
                      <option value="">No Special Role</option>
                      {club?.roles?.map((r: any) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800">
                  <div className="text-xs uppercase tracking-wider text-neutral-500 font-bold mb-2">Joined</div>
                  <div className="text-white font-medium">{new Date(selectedMemberForInfo.joinedAt).toLocaleDateString()}</div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button onClick={() => setSelectedMemberForInfo(null)} className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-xl transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
