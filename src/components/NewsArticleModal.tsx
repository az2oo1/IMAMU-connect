import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, Share2, Bookmark, User, ChevronLeft } from 'lucide-react';
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
  if (!article) return null;

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
            <div className="w-full md:w-1/2 h-64 md:h-full relative shrink-0">
              <OptimizedImage 
                src={article.image} 
                alt={article.title} 
                variant="banner"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent md:bg-gradient-to-r md:from-transparent md:to-neutral-950" />
              
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
                  <ProfilePopover
                    username={(article.author || 'University Press').toLowerCase().replace(/\s+/g, '')}
                    user={{
                      name: article.author || 'University Press',
                      handle: (article.author || 'University Press').toLowerCase().replace(/\s+/g, ''),
                      bio: 'Official news and updates from the university.',
                      avatar: article.authorAvatar || `https://picsum.photos/seed/${article.author}/100/100`,
                      isFollowing: article.isFollowedAuthor
                    }}
                  >
                    <div className="flex items-center gap-3 hover:bg-neutral-900/50 p-2 -ml-2 rounded-2xl transition-colors">
                      <OptimizedImage 
                        src={article.authorAvatar || `https://picsum.photos/seed/${article.author}/100/100`} 
                        alt={article.author || ''} 
                        variant="small"
                        className="w-10 h-10 rounded-full bg-neutral-800 overflow-hidden border border-neutral-700 shrink-0" 
                      />
                      <div>
                        <div className="text-sm font-bold text-neutral-200">{article.author || 'University Press'}</div>
                        <div className="text-xs text-neutral-500">Author</div>
                      </div>
                    </div>
                  </ProfilePopover>
                  <div className="flex items-center gap-2">
                    <button className="p-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition-colors border border-neutral-800">
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button className="p-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition-colors border border-neutral-800">
                      <Bookmark className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Article Body */}
                <div className="prose prose-invert prose-lg max-w-none prose-p:text-neutral-300 prose-p:leading-relaxed prose-headings:text-white">
                  <p className="text-xl text-neutral-200 leading-relaxed font-medium mb-8">
                    <FormattedText text={article.excerpt} />
                  </p>
                  <p className="mb-6">
                    <FormattedText text="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. @studentcouncil" />
                  </p>
                  <p className="mb-6">
                    Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
                  </p>
                  
                  <blockquote className="border-l-4 border-primary-500 pl-6 my-8 italic text-neutral-200 bg-primary-500/5 py-4 pr-4 rounded-r-xl">
                    "This initiative represents a major step forward for our campus community, bringing together students and faculty in unprecedented ways."
                  </blockquote>

                  <h3 className="text-2xl font-bold mt-10 mb-4">What's Next?</h3>
                  <p className="mb-6">
                    Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
