import { toast } from 'sonner';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, Share2, Bookmark, User, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import FormattedText from './FormattedText';
import ProfilePopover from './ProfilePopover';
import OptimizedImage from './OptimizedImage';

interface NewsItem {
  id: number | string;
  title: string;
  category: string;
  date: string;
  readTime: string;
  image: string;
  images?: string[] | string;
  excerpt: string;
  content?: string;
  featured?: boolean;
  isSaved?: boolean;
  author?: string | { id?: string; isClub?: boolean; name?: string; avatar?: string; username?: string };
  authorAvatar?: string;
  isFollowedAuthor?: boolean;
}

interface NewsArticleModalProps {
  article: NewsItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function NewsArticleModal({ article, isOpen, onClose }: NewsArticleModalProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (article && isOpen) {
      if (article.isSaved !== undefined) {
        setIsSaved(article.isSaved);
      } else {
        const token = localStorage.getItem('token');
        if (token) {
          fetch(`/api/news/${article.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          .then(res => res.json())
          .then(data => {
            if (data.article) setIsSaved(data.article.isSaved);
          })
          .catch(console.error);
        }
      }
    }
  }, [article, isOpen]);

  if (!article) return null;

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/news/${article.id}`;
    if (navigator.share) {
      navigator.share({
        title: article.title,
        url: shareUrl
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/news/${article.id}/save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setIsSaved(data.saved);
        if (article) article.isSaved = data.saved;
      } else {
        toast.error('Please log in to save articles.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getAuthorName = () => {
    if (!article.author) return 'University Press';
    if (typeof article.author === 'object') return (article.author as any).name || 'University Press';
    return String(article.author);
  };

  const authorName = getAuthorName();
  const rawAuthorHandle = typeof article.author === 'object' && !(article.author as any)?.isClub ? (article.author as any)?.username : null;
  const authorHandle = rawAuthorHandle || authorName.toLowerCase().replace(/\s+/g, '');
  const authorAvatar = article.authorAvatar || (typeof article.author === 'object' ? (article.author as any).avatar || (article.author as any).avatarUrl : null);

  let displayImages = [];
  try {
    const rawImages = typeof article.images === 'string' ? JSON.parse(article.images) : (article.images || []);
    displayImages = rawImages.length > 0 
      ? rawImages 
      : article.image 
        ? [article.image] 
        : [];
  } catch(e) {
    displayImages = article.image ? [article.image] : [];
  }

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % displayImages.length);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 top-16 z-40 flex items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl" 
            onClick={onClose} 
          />
          <motion.div 
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative bg-neutral-950 border border-neutral-800 rounded-[2rem] w-full max-w-7xl h-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col md:flex-row"
          >
            {/* Close Button - Mobile Absolute, Desktop Relative */}
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 md:hidden z-50 p-2.5 bg-black/50 text-white hover:bg-black/80 rounded-full backdrop-blur-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left Side: Image Hero (Spans full width on mobile, half on desktop) */}
            <div className="w-full md:w-1/2 h-64 md:h-full relative shrink-0 group border-b md:border-b-0 md:border-r border-neutral-800/60 bg-neutral-900/50">
              <OptimizedImage 
                src={displayImages[currentImageIndex]} 
                alt={`${article.title} - Image ${currentImageIndex + 1}`} 
                variant="banner"
                className="w-full h-full object-cover transition-opacity duration-300"
              />
              
              {displayImages.length > 1 && (
                <>
                  <button 
                    onClick={handlePrevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-primary-600 transition-colors opacity-0 group-hover:opacity-100 backdrop-blur"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={handleNextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-primary-600 transition-colors opacity-0 group-hover:opacity-100 backdrop-blur"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {displayImages.map((_, idx) => (
                      <div key={idx} className={`w-1.5 h-1.5 rounded-full ${idx === currentImageIndex ? 'bg-primary-500 w-3' : 'bg-white/50'} transition-all`} />
                    ))}
                  </div>
                </>
              )}

              {/* Category Badge over image */}
              <div className="absolute top-6 left-6">
                <span className="px-4 py-1.5 rounded-full bg-primary-600 text-white text-xs font-bold tracking-widest uppercase shadow-lg backdrop-blur-md">
                  {article.category}
                </span>
              </div>
            </div>

            {/* Right Side: Article Content */}
            <div className="w-full md:w-1/2 h-full overflow-y-auto custom-scrollbar bg-neutral-950 relative flex flex-col">
              {/* Desktop Close Button */}
              <div className="hidden md:flex justify-end p-6 sticky top-0 bg-gradient-to-b from-neutral-950 to-transparent z-20 pointer-events-none">
                <button 
                  onClick={onClose} 
                  className="p-2.5 bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition-colors pointer-events-auto border border-neutral-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 pb-12 md:px-12 md:pb-20 md:pt-8 flex-1">
                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-4 mb-6 text-neutral-400 text-sm font-medium">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {article.date}
                  </div>
                  <div className="w-1 h-1 rounded-full bg-neutral-700" />
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {article.readTime}
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-[1.1] tracking-tight mb-8">
                  {article.title}
                </h1>

                {/* Author & Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 py-6 border-y border-neutral-800/60 mb-8">
                  {typeof article.author === 'object' && article.author?.isClub ? (
                    <Link to={`/clubs/${article.author.id}`} onClick={onClose} className="hover:opacity-80 transition-opacity">
                      <div className="flex items-center gap-3 hover:bg-neutral-900/50 p-2 -ml-2 rounded-2xl transition-colors cursor-pointer">
                        <OptimizedImage 
                          src={authorAvatar} 
                          alt={authorName} 
                          variant="small"
                          className="w-10 h-10 rounded-full bg-neutral-800 overflow-hidden border border-neutral-700 shrink-0 object-cover" 
                        />
                        <div>
                          <div className="text-sm font-bold text-neutral-200">{authorName}</div>
                          <div className="text-xs text-neutral-500">Club</div>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <ProfilePopover
                      username={authorHandle}
                      user={{
                        name: authorName,
                        handle: authorHandle,
                        bio: 'Official news and updates from the university.',
                        avatar: authorAvatar,
                        isFollowing: article.isFollowedAuthor
                      }}
                    >
                      <div className="flex items-center gap-3 hover:bg-neutral-900/50 p-2 -ml-2 rounded-2xl transition-colors">
                        <OptimizedImage 
                          src={authorAvatar} 
                          alt={authorName} 
                          variant="small"
                          className="w-10 h-10 rounded-full bg-neutral-800 overflow-hidden border border-neutral-700 shrink-0" 
                        />
                        <div>
                          <div className="text-sm font-bold text-neutral-200">{authorName}</div>
                          <div className="text-xs text-neutral-500">Author</div>
                        </div>
                      </div>
                    </ProfilePopover>
                  )}
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleShare}
                      className="p-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition-colors border border-neutral-800"
                      title="Share link"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={handleSave}
                      className={`p-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 transition-colors border border-neutral-800 ${isSaved ? 'text-primary-400 border-primary-500/50' : 'text-neutral-300'}`}
                      title={isSaved ? "Remove bookmark" : "Bookmark article"}
                    >
                      <Bookmark className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} />
                    </button>
                    <Link
                      to={`/news/${article.id}`}
                      onClick={onClose}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-sm transition-all ml-2"
                    >
                      Read Full Page
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {/* Article Body */}
                <div className="prose prose-invert prose-lg max-w-none prose-p:text-neutral-300 prose-p:leading-relaxed prose-headings:text-white">
                  <div className="mb-8">
                    <FormattedText text={article.content || article.excerpt || ''} />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
