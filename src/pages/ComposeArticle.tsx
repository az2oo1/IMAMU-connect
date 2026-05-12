import { toast } from 'sonner';
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Plus, Trash2, ImageIcon, ArrowLeft, ChevronLeft, ChevronRight, Eye, Edit2, Link as LinkIcon, Archive } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import FormattedText from '../components/FormattedText';
import TipTapEditor, { TipTapEditorRef } from '../components/TipTapEditor';
import { useRef } from 'react';
import { AnimatePresence } from 'motion/react';

export default function ComposeArticle() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const { user } = useUser();
  const [newsTitle, setNewsTitle] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsTag, setNewsTag] = useState('');
  const [newsImages, setNewsImages] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [managedClubs, setManagedClubs] = useState<any[]>([]);
  const [authorType, setAuthorType] = useState<'user' | 'club'>('user');
  const [authorClubId, setAuthorClubId] = useState<string>('');
  const [isArchived, setIsArchived] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const editorRef = useRef<TipTapEditorRef>(null);

  useEffect(() => {
    if (user && user.role !== 'NEWS_WRITER' && user.role !== 'ADMIN') {
      navigate('/news');
    }
    fetch('/api/news-tags')
      .then(res => res.json())
      .then(data => setAvailableTags(data.tags || []))
      .catch(console.error);
      
    if (user) {
      fetch('/api/user/managed-clubs', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.clubs) {
            setManagedClubs(data.clubs);
            if (data.clubs.length > 0 && authorType === 'club' && !authorClubId) {
              setAuthorClubId(data.clubs[0].id);
            }
          }
        })
        .catch(console.error);
    }
      
    if (editId) {
      fetch(`/api/news/${editId}`)
        .then(res => res.json())
        .then(data => {
          if (data.article) {
            setNewsTitle(data.article.title);
            setNewsContent(data.article.content);
            setNewsTag(data.article.tag || '');
            setIsArchived(data.article.isArchived || false);
            if (data.article.clubId) {
               setAuthorType('club');
               setAuthorClubId(data.article.clubId);
            } else {
               setAuthorType('user');
            }
            let parsedImages: string[] = [];
            if (data.article.photoUrl) parsedImages.push(data.article.photoUrl);
            if (data.article.images) {
               try {
                 const arr = typeof data.article.images === 'string' ? JSON.parse(data.article.images) : data.article.images;
                 if (Array.isArray(arr)) parsedImages = [...parsedImages, ...arr];
               } catch (e) {}
            }
            setNewsImages(Array.from(new Set(parsedImages))); // unique
          }
        })
        .catch(console.error);
    }
  }, [user, navigate, editId]);

  const handlePostNews = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editId ? `/api/user/articles/${editId}` : `/api/user/articles`;
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: newsTitle,
          content: newsContent,
          tag: newsTag || 'General',
          images: newsImages,
          photoUrl: newsImages[0] || null,
          clubId: authorType === 'club' ? authorClubId : '',
          isArchived
        })
      });
      if (!res.ok) throw new Error('Failed to save article');
      if (res.ok) {
        toast.success(editId ? 'Article updated successfully!' : 'Article published successfully!');
        navigate(authorType === 'club' ? `/clubs/${authorClubId}` : `/profile/${user?.username}`);
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    
    try {
      const urls = [];
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('type', 'user');
        formData.append('file', files[i]);
        const res = await fetch(`/api/upload?type=user`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          body: formData
        });
        const data = await res.json();
        if (data.url) urls.push(data.url);
      }
      if (urls.length) {
        setNewsImages(prev => [...prev, ...urls]);
        toast.success('Images uploaded successfully!');
      }
    } catch (err) {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const insertImage = (url: string) => {
    if (editorRef.current) {
      editorRef.current.insertText(`\n![Alt Text](${url})\n`);
    } else {
      setNewsContent(prev => prev + `\n![Alt Text](${url})\n`);
    }
  };

  const moveImage = (index: number, direction: 'left' | 'right') => {
    const newImages = [...newsImages];
    if (direction === 'left' && index > 0) {
      [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
    } else if (direction === 'right' && index < newImages.length - 1) {
      [newImages[index + 1], newImages[index]] = [newImages[index], newImages[index + 1]];
    }
    setNewsImages(newImages);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 overflow-y-auto w-full h-full p-4 sm:p-6 lg:p-8 bg-black custom-scrollbar">
      <div className="max-w-4xl mx-auto flex flex-col min-h-full bg-neutral-900/50 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-neutral-900/80 backdrop-blur-md border-b border-white/5 py-4 px-6 md:px-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
             <button onClick={() => navigate(-1)} className="p-2 sm:-ml-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-full transition-colors flex-shrink-0 focus:outline-none">
               <ArrowLeft className="w-6 h-6" />
             </button>
             <div>
               <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">{editId ? 'Edit Article' : 'Compose News'}</h2>
               <p className="text-sm text-neutral-400 font-medium">Publish to the community</p>
             </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 md:p-10 flex-1 flex flex-col gap-8">
          <form id="compose-form" onSubmit={handlePostNews} className="space-y-8 flex-1">
            {managedClubs.length > 0 && (
              <div className="space-y-4 pt-2">
                <label className="text-sm font-bold text-neutral-400 ml-1 uppercase tracking-wider">Publishing As</label>
                <div className="flex flex-col sm:flex-row gap-4">
                   <button
                     type="button"
                     onClick={() => setAuthorType('user')}
                     className={`flex flex-1 items-center gap-3 p-4 rounded-2xl border-2 transition-all ${authorType === 'user' ? 'border-primary-500 bg-primary-500/10' : 'border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800'}`}
                   >
                     <img referrerPolicy="no-referrer" src={user?.avatarUrl} alt="Me" className="w-10 h-10 rounded-full object-cover" />
                     <div className="text-left">
                       <div className="text-white font-bold">{user?.name}</div>
                       <div className="text-neutral-400 text-xs">Personal Profile</div>
                     </div>
                   </button>
                   
                   {managedClubs.length > 0 && (
                     <div className={`flex flex-[1.5] flex-col rounded-2xl border-2 transition-all ${authorType === 'club' ? 'border-primary-500 bg-primary-500/10' : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700'}`}>
                       <label className="flex items-center gap-3 p-4 flex-1 text-left cursor-pointer">
                         <input type="radio" name="authorType" value="club" checked={authorType === 'club'} onChange={() => setAuthorType('club')} className="hidden" />
                         {authorClubId && managedClubs.find(c => c.id === authorClubId)?.avatarUrl ? (
                           <img referrerPolicy="no-referrer" src={managedClubs.find(c => c.id === authorClubId)?.avatarUrl} alt="Club" className="w-10 h-10 rounded-xl object-cover" />
                         ) : (
                           <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center font-bold text-neutral-500">
                             {(managedClubs.find(c => c.id === authorClubId)?.name || 'C').substring(0, 1)}
                           </div>
                         )}
                         <div className="flex-1">
                           <div className="text-white font-bold text-sm">Post as Club</div>
                           <select
                              value={authorClubId}
                              onChange={(e) => {
                                 setAuthorClubId(e.target.value);
                                 setAuthorType('club');
                              }}
                              className="w-full bg-transparent text-neutral-400 text-xs font-medium focus:outline-none appearance-none cursor-pointer hover:text-white mt-0.5"
                           >
                              {managedClubs.map(c => (
                                 <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                           </select>
                         </div>
                       </label>
                     </div>
                   )}
                </div>
              </div>
            )}

            <div className={`grid grid-cols-1 ${authorType === 'club' ? '' : 'md:grid-cols-2'} gap-6 pt-2`}>
              <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-400 ml-1 uppercase tracking-wider">Headline</label>
                <input
                  type="text"
                  value={newsTitle}
                  onChange={(e) => setNewsTitle(e.target.value)}
                  placeholder="Catchy headline..."
                  className="w-full bg-neutral-950/50 border border-neutral-800 rounded-2xl px-5 py-4 text-white font-medium focus:outline-none focus:border-primary-500 focus:bg-neutral-950 transition-all shadow-inner"
                  required
                />
              </div>
              
              {authorType !== 'club' && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-400 ml-1 uppercase tracking-wider">Category Tag</label>
                  <div className="relative">
                    <select
                      value={newsTag}
                      onChange={(e) => setNewsTag(e.target.value)}
                      className="w-full bg-neutral-950/50 border border-neutral-800 rounded-2xl px-5 py-4 text-white font-medium focus:outline-none focus:border-primary-500 focus:bg-neutral-950 transition-all appearance-none cursor-pointer"
                      required
                    >
                      <option value="" disabled>Select a category...</option>
                      {availableTags.map(tag => (
                        <option key={tag.id} value={tag.name}>{tag.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 flex-1 flex flex-col pt-2">
              <div className="flex items-center justify-between ml-1 mb-1">
                <label className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Story Content</label>
                <div className="flex items-center gap-3">
                  <div className="flex bg-neutral-900/50 rounded-xl p-1 border border-neutral-800">
                    <button type="button" onClick={() => setIsPreview(false)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${!isPreview ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-white'}`}><Edit2 className="w-4 h-4" /> Write</button>
                    <button type="button" onClick={() => setIsPreview(true)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${isPreview ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-white'}`}><Eye className="w-4 h-4" /> Preview</button>
                  </div>
                </div>
              </div>
              
              {isPreview ? (
                 <div className="w-full flex-1 bg-neutral-950/50 border border-neutral-800 rounded-3xl p-6 md:p-8 min-h-[300px] overflow-y-auto custom-scrollbar prose prose-invert prose-lg max-w-none prose-p:text-neutral-300 prose-p:leading-relaxed prose-headings:text-white">
                   {newsContent ? <FormattedText text={newsContent} /> : <span className="text-neutral-600 italic">No content to preview...</span>}
                 </div>
              ) : (
                <div className="relative flex-1 flex flex-col">
                  <TipTapEditor
                    ref={editorRef}
                    value={newsContent}
                    onChange={setNewsContent}
                    placeholder="Write your article here... (Markdown supported)"
                    className="w-full h-full"
                  />
                </div>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <label className="text-sm font-bold text-neutral-400 ml-1 uppercase tracking-wider">Media Gallery</label>
              <div className="flex flex-wrap gap-4 p-4 bg-neutral-950/30 border border-neutral-800 border-dashed rounded-3xl">
                {newsImages.map((img, i) => (
                  <div key={i} className="relative group w-32 h-24 shrink-0 shadow-lg">
                    <img referrerPolicy="no-referrer" src={`/api/image?url=${encodeURIComponent(img)}&w=200`} alt="Gallery" className={`w-full h-full rounded-2xl object-cover border-2 pointer-events-none ${i === 0 ? 'border-primary-500' : 'border-transparent'}`} />
                    {i === 0 && <span className="absolute top-2 left-2 bg-primary-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase shadow-sm">Cover</span>}
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex gap-2 items-center justify-center rounded-2xl transition-all duration-200">
                      
                      {/* Left stack for movement */}
                      <div className="flex flex-col gap-1 items-center justify-center absolute left-1 inset-y-0 text-white">
                         {i > 0 && <button type="button" onClick={() => moveImage(i, 'left')} className="p-1 hover:text-primary-400 bg-black/40 hover:bg-black/80 rounded transition-colors"><ChevronLeft className="w-4 h-4" /></button>}
                      </div>

                      <button
                        type="button"
                        onClick={() => insertImage(img)}
                        className="p-2 text-white hover:text-primary-400 bg-neutral-900 rounded-xl hover:bg-neutral-800 transition-colors shadow-sm ml-4"
                        title="Insert into text"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewsImages(newsImages.filter((_, idx) => idx !== i))}
                        className="p-2 text-white hover:text-red-400 bg-neutral-900 rounded-xl hover:bg-neutral-800 transition-colors shadow-sm mr-4"
                        title="Remove image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      
                      {/* Right stack for movement */}
                      <div className="flex flex-col gap-1 items-center justify-center absolute right-1 inset-y-0 text-white">
                         {i < newsImages.length - 1 && <button type="button" onClick={() => moveImage(i, 'right')} className="p-1 hover:text-primary-400 bg-black/40 hover:bg-black/80 rounded transition-colors"><ChevronRight className="w-4 h-4" /></button>}
                      </div>
                    </div>
                  </div>
                ))}
                {isUploading && (
                  <div className="flex items-center justify-center w-32 h-24 bg-neutral-900/50 border border-neutral-800 rounded-2xl shrink-0">
                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => document.getElementById('galleryInput')?.click()}
                  className="flex flex-col items-center justify-center gap-2 w-32 h-24 border-2 border-neutral-800 border-dashed hover:border-primary-500 hover:bg-primary-500/5 text-neutral-500 hover:text-primary-500 rounded-2xl text-sm transition-all shrink-0 cursor-pointer"
                >
                  <Plus className="w-6 h-6" />
                  <span className="font-medium text-xs">Add Images</span>
                </button>
                <input
                  id="galleryInput"
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 md:px-10 border-t border-white/5 bg-neutral-950/30 flex flex-col sm:flex-row items-center justify-between gap-4">
           <button
             type="button"
             onClick={() => setIsArchived(!isArchived)}
             className={`px-6 py-3.5 rounded-2xl font-semibold transition-all w-full sm:w-auto flex items-center justify-center gap-2 ${isArchived ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30' : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 hover:bg-neutral-800'}`}
           >
             <Archive className="w-5 h-5" />
             {isArchived ? (editId ? 'Archived' : 'Posting as Archived') : (editId ? 'Archive Article' : 'Post as Archived')}
           </button>
           <button
             type="submit"
             form="compose-form"
             className="bg-primary-600 hover:bg-primary-500 text-white px-8 py-4 rounded-2xl font-bold transition-colors w-full sm:w-auto flex-shrink-0"
           >
             {editId ? 'Save Changes' : 'Publish Article'}
           </button>
        </div>

      </div>
    </motion.div>
  );
}
