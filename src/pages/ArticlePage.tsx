import { toast } from 'sonner';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar, Clock, Share2, Bookmark, X } from 'lucide-react';
import FormattedText from '../components/FormattedText';
import OptimizedImage from '../components/OptimizedImage';
import ProfilePopover from '../components/ProfilePopover';

export default function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const headers: any = {};
        const token = localStorage.getItem('token');
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`/api/news/${id}`, { headers });
        const data = await res.json();
        
        if (data.article) {
          const found = data.article;
          let parsedImages: string[] = [];
          try {
            parsedImages = typeof found.images === 'string' ? JSON.parse(found.images) : (found.images || []);
          } catch (e) {}

          setArticle({
            ...found,
            category: found.tag || 'General',
            date: new Date(found.createdAt).toLocaleDateString(),
            readTime: '5 min read',
            image: found.photoUrl || (parsedImages.length > 0 ? parsedImages[0] : null),
            images: parsedImages,
            excerpt: found.content,
            author: found.club ? { id: found.clubId, isClub: true, name: found.club.name, avatar: found.club.avatarUrl, bio: found.club.description, username: found.club.name } : found.author,
            authorAvatar: found.club ? found.club.avatarUrl : found.author?.avatarUrl
          });
          setSelectedImage(found.photoUrl || (parsedImages.length > 0 ? parsedImages[0] : null));
          setIsSaved(found.isSaved || false);

          if (token && (found.authorId || found.clubId)) {
             const isClub = !!found.clubId;
             const targetIdForRole = isClub ? found.clubId : found.author?.username;
             if (targetIdForRole) {
               const roleRes = await fetch(`/api/${isClub ? 'clubs' : 'users'}/${targetIdForRole}`, { headers });
               if (roleRes.ok) {
                  const roleData = await roleRes.json();
                  setIsFollowing(isClub ? roleData.club.isFollowing : roleData.user.isFollowing);
               }
             }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [id]);

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/news/${id}/save`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIsSaved(data.saved);
      } else {
        toast.info("Please log in to save articles.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: article.title,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleFollow = async () => {
    if (!article || !article.author) return;
    try {
      const targetId = article.author.id;
      if (!targetId) return;
      
      const endpoint = article.author.isClub ? `/api/clubs/${targetId}/follow` : `/api/users/${targetId}/follow`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.following);
      } else {
        toast.info("Please log in to follow.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">Loading article...</div>;
  if (!article) return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">Article not found</div>;

  const authorName = typeof article.author === 'object' ? (article.author as any).name : String(article.author);
  const authorHandle = typeof article.author === 'object' && !article.author.isClub ? (article.author as any).username : authorName.toLowerCase().replace(/\s+/g, '');
  const authorAvatar = article.authorAvatar;
  
  const galleryImages = [article.image, ...(article.images || [])].filter((v, i, a) => a.indexOf(v) === i && typeof v === 'string' && v.trim() !== '');

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 h-full bg-neutral-950 text-white overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-8 bg-neutral-900 hover:bg-neutral-800 px-4 py-2 rounded-xl">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="mb-8">
          <span className="px-4 py-1.5 rounded-full bg-primary-600 text-white text-xs font-bold tracking-widest uppercase mb-4 inline-block">
            {article.category}
          </span>
          <h1 className="text-4xl md:text-5xl font-black leading-[1.1] tracking-tight mb-4">{article.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-neutral-400 text-sm font-medium">
            <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{article.date}</div>
            <div className="w-1 h-1 rounded-full bg-neutral-700" />
            <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{article.readTime}</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 mb-8">
          <div className="flex flex-1 items-center gap-4">
            {article.author?.isClub ? (
              <a href={`/clubs/${article.author.id}`} className="group flex items-center gap-4 hover:opacity-100 transition-opacity">
                <OptimizedImage src={authorAvatar} alt={authorName} variant="small" className="w-12 h-12 rounded-full object-cover shadow-sm ring-1 ring-neutral-800 group-hover:ring-neutral-700 transition-all bg-neutral-900" />
                <div>
                  <div className="font-bold text-white flex items-center gap-2 group-hover:text-primary-400 transition-colors">
                     {authorName}
                     <span className="px-2 py-0.5 rounded text-neutral-500 bg-neutral-900/50 text-[10px] uppercase font-bold tracking-wider">Club</span>
                  </div>
                  <div className="text-sm text-neutral-400">@{authorHandle}</div>
                </div>
              </a>
            ) : (
              <ProfilePopover 
                username={authorHandle}
                user={{
                  name: authorName,
                  handle: authorHandle,
                  avatar: authorAvatar,
                  bio: 'News author and contributor.',
                  id: article.author?.id
                }}
              >
                <div className="group flex items-center gap-4 cursor-pointer hover:opacity-100 transition-opacity">
                  <OptimizedImage src={authorAvatar} alt={authorName} variant="small" className="w-12 h-12 rounded-full object-cover shadow-sm ring-1 ring-neutral-800 group-hover:ring-neutral-700 transition-all bg-neutral-900" />
                  <div>
                    <div className="font-bold text-white flex items-center gap-2 group-hover:text-primary-400 transition-colors">
                       {authorName}
                       <span className="px-2 py-0.5 rounded text-neutral-500 bg-neutral-900/50 text-[10px] uppercase font-bold tracking-wider">Author</span>
                    </div>
                    <div className="text-sm text-neutral-400">@{authorHandle}</div>
                  </div>
                </div>
              </ProfilePopover>
            )}
            
            <div className="w-px h-8 bg-neutral-800/50 mx-2 hidden sm:block" />
            
            {(article.author?.id || article.author?.username) && (
              <button 
                onClick={handleFollow} 
                className={`hidden sm:block px-5 py-2 text-sm font-bold transition-colors rounded-full ${
                  isFollowing 
                    ? 'bg-neutral-900 text-white hover:bg-neutral-800' 
                    : 'bg-white text-black hover:bg-neutral-200'
                }`}
              >
                 {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
          <div className="flex gap-2 items-center">
            {(article.author?.id || article.author?.username) && (
              <button 
                onClick={handleFollow} 
                className={`sm:hidden flex-1 px-5 py-2.5 text-sm font-bold transition-colors rounded-full ${
                  isFollowing 
                    ? 'bg-neutral-900 text-white hover:bg-neutral-800' 
                    : 'bg-white text-black hover:bg-neutral-200'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
            <button 
              onClick={handleShare} 
              className="p-2.5 rounded-full bg-neutral-900/50 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors shadow-sm"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button 
              onClick={handleSave} 
              title={isSaved ? "Remove bookmark" : "Bookmark article"} 
              className={`p-2.5 rounded-full transition-colors shadow-sm ${
                isSaved 
                  ? 'bg-primary-500/10 text-primary-400 hover:bg-primary-500/20' 
                  : 'bg-neutral-900/50 text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <Bookmark className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} />
            </button>
          </div>
        </div>

        <div className="prose prose-invert max-w-none prose-p:text-neutral-200 prose-p:leading-relaxed prose-headings:text-white prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-primary-400 hover:prose-a:text-primary-300 prose-img:rounded-2xl">
          <div className="mb-0">
            <FormattedText 
              text={article.content} 
              onImageClick={(src) => {
                setSelectedImage(src);
                setViewerOpen(true);
              }}
            />
          </div>
        </div>

        {galleryImages.length > 0 && (
          <div className="mt-12 mb-10 w-full max-w-xl mx-auto">
            <div className="w-full flex justify-center mb-4">
              <button 
                onClick={() => setViewerOpen(true)}
                className="inline-flex items-center justify-center bg-transparent group relative overflow-hidden rounded-xl"
              >
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors z-10 hidden sm:flex items-center justify-center">
                   <div className="opacity-0 group-hover:opacity-100 bg-black/60 text-white px-3 py-1.5 rounded-full backdrop-blur-sm transform translate-y-4 group-hover:translate-y-0 transition-all font-medium text-sm">Click to view full size</div>
                </div>
                <OptimizedImage 
                  src={selectedImage} 
                  alt={article.title} 
                  variant="large" 
                  className="w-full h-full flex items-center justify-center !bg-transparent"
                  imageClassName="max-w-full max-h-[250px] md:max-h-[300px] w-auto h-auto object-contain rounded-xl transition-transform"
                />
              </button>
            </div>
            {galleryImages.length > 1 && (
              <div className="flex flex-wrap justify-center gap-2 w-full">
                {galleryImages.map((img: string, idx: number) => (
                  <button 
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`relative rounded-lg overflow-hidden h-14 w-14 sm:h-16 sm:w-16 border-2 transition-all shrink-0 ${
                      selectedImage === img 
                        ? 'border-primary-500 opacity-100' 
                        : 'border-transparent opacity-60 hover:opacity-100 hover:border-neutral-700'
                    }`}
                  >
                    <OptimizedImage src={img} alt="" variant="small" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Fullscreen Image Viewer Modal */}
      {viewerOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md" 
          onClick={() => setViewerOpen(false)}
        >
          <button 
            onClick={(e) => { e.stopPropagation(); setViewerOpen(false); }} 
            className="absolute top-4 right-4 text-white p-3 bg-neutral-800/50 hover:bg-neutral-700 rounded-full transition-colors z-50 backdrop-blur-sm"
            aria-label="Close viewer"
          >
            <X className="w-6 h-6" />
          </button>
          <div 
            className="w-full h-full flex items-center justify-center max-w-7xl relative" 
            onClick={(e) => e.stopPropagation()}
          >
            <OptimizedImage 
               src={selectedImage} 
               alt={article.title} 
               variant="large" 
               className="w-full h-full flex items-center justify-center !bg-transparent"
               imageClassName="max-w-full max-h-full w-auto h-auto object-contain"
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
