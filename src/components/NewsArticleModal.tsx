import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, Share2, Bookmark } from 'lucide-react';

interface NewsItem {
  id: number;
  title: string;
  category: string;
  date: string;
  readTime: string;
  image: string;
  excerpt: string;
  featured?: boolean;
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
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
            onClick={onClose} 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-4xl max-h-full overflow-y-auto shadow-2xl flex flex-col"
          >
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white hover:bg-black/80 rounded-full backdrop-blur-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="relative h-64 sm:h-80 md:h-96 shrink-0">
              <img 
                src={article.image} 
                alt={article.title} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent" />
            </div>

            <div className="p-6 sm:p-10 -mt-20 relative z-10">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="px-3 py-1 rounded-full bg-primary-500 text-white text-xs font-bold tracking-wider uppercase shadow-lg">
                  {article.category}
                </span>
                <div className="flex items-center gap-1.5 text-neutral-300 text-sm font-medium bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
                  <Calendar className="w-4 h-4" />
                  {article.date}
                </div>
                <div className="flex items-center gap-1.5 text-neutral-300 text-sm font-medium bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
                  <Clock className="w-4 h-4" />
                  {article.readTime}
                </div>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight tracking-tight mb-6">
                {article.title}
              </h1>

              <div className="flex items-center gap-4 mb-8 pb-8 border-b border-neutral-800">
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors border border-white/10">
                  <Share2 className="w-4 h-4" /> Share
                </button>
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors border border-white/10">
                  <Bookmark className="w-4 h-4" /> Save
                </button>
              </div>

              <div className="prose prose-invert prose-lg max-w-none">
                <p className="text-xl text-neutral-300 leading-relaxed font-medium mb-8">
                  {article.excerpt}
                </p>
                <p className="text-neutral-400 leading-relaxed mb-6">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
                </p>
                <p className="text-neutral-400 leading-relaxed mb-6">
                  Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
                </p>
                <h3 className="text-2xl font-bold text-white mt-10 mb-4">What's Next?</h3>
                <p className="text-neutral-400 leading-relaxed mb-6">
                  Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
