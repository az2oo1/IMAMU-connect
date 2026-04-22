import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, Share2, Bookmark, User, ChevronLeft, ChevronRight } from 'lucide-react';
import FormattedText from './FormattedText';
import ProfilePopover from './ProfilePopover';
import OptimizedImage from './OptimizedImage';

interface NewsItem {
  id: number;
  title: string;
  category: string;
  date: string;
  readTime: string;
  image: string;
  images?: string[];
  excerpt: string;
  featured?: boolean;
  author?: string;
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
    if (article) {
      // Initialize saved state from localStorage
      const savedArticles = JSON.parse(localStorage.getItem('savedArticles') || '[]');
      setIsSaved(savedArticles.includes(article.id));
    }
  }, [article]);

  if (!article) return null;

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/news?articleId=${article.id}`;
    if (navigator.share) {
      navigator.share({
        title: article.title,
        url: shareUrl
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    }
  };

  const handleSave = () => {
    const savedArticles = JSON.parse(localStorage.getItem('savedArticles') || '[]');
    let newSaved;
    if (isSaved) {
      newSaved = savedArticles.filter((id: number) => id !== article.id);
    } else {
      newSaved = [...savedArticles, article.id];
    }
    localStorage.setItem('savedArticles', JSON.stringify(newSaved));
    setIsSaved(!isSaved);
  };

  const getAuthorName = () => {
    if (!article.author) return 'University Press';
    if (typeof article.author === 'object') return (article.author as any).name || 'University Press';
    return String(article.author);
  };

  const authorName = getAuthorName();
  const authorHandle = authorName.toLowerCase().replace(/\s+/g, '');
  const authorAvatar = article.authorAvatar || (typeof article.author === 'object' ? (article.author as any).avatar : null) || `https://picsum.photos/seed/${authorName}/100/100`;

  const displayImages = article.images && article.images.length > 0 ? article.images : [article.image];

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
            <div className="w-full md:w-1/2 h-64 md:h-full relative shrink-0 group">
              <OptimizedImage 
                src={displayImages[currentImageIndex]} 
                alt={`${article.title} - Image ${currentImageIndex + 1}`} 
                variant="banner"
                className="w-full h-full object-cover transition-opacity duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent md:bg-gradient-to-r md:from-transparent md:to-neutral-950" />
              
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
                  {article.author?.isClub ? (
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
                  </div>
                </div>

                {/* Article Body */}
                <div className="prose prose-invert prose-lg max-w-none prose-p:text-neutral-300 prose-p:leading-relaxed prose-headings:text-white">
                  <div className="whitespace-pre-wrap mb-8">
                    <FormattedText text={article.content || article.excerpt || ''} />
                  </div>
                  
                  {article.images && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 my-8">
                      {(() => {
                        try {
                          const imgs = typeof article.images === 'string' ? JSON.parse(article.images) : article.images;
                          return imgs.map((img: string, i: number) => (
                            <img key={i} src={img} alt={`Gallery ${i}`} className="w-full h-48 object-cover rounded-xl border border-neutral-800" />
                          ));
                        } catch (e) {
                          return null;
                        }
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
