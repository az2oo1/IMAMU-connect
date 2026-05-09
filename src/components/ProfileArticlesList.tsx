import { toast } from 'sonner';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MoreHorizontal, Archive, Trash2, Edit, Save, Share, Flag, ChevronDown } from 'lucide-react';
import OptimizedImage from './OptimizedImage';
import { stripHtmlAndMarkdown } from '../utils/textHelpers';

export default function ProfileArticlesList({ profileUserId, currentUserId }: { profileUserId: string, currentUserId?: string }) {
  const [articles, setArticles] = useState<any[]>([]);
  const [archived, setArchived] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  const navigate = useNavigate();

  const isOwner = profileUserId === currentUserId;

  const fetchArticles = async (pageNum: number, isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const res = await fetch(`/api/users/${profileUserId}/articles?page=${pageNum}&limit=5`, {
        headers: currentUserId ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (isInitial) {
          setArticles(data.articles);
          if (data.archived) setArchived(data.archived);
        } else {
          setArticles(prev => [...prev, ...data.articles]);
        }
        setHasMore(data.articles.length === 5);
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles(1, true);
    setPage(1);
    setOpenMenuId(null);
  }, [profileUserId]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchArticles(nextPage);
  };

  const toggleMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const handleAction = async (e: React.MouseEvent, action: string, articleId: string) => {
    e.stopPropagation();
    setOpenMenuId(null);
    
    if (action === 'delete') {
      if (!confirm('Are you sure you want to delete this article?')) return;
      try {
        await fetch(`/api/user/articles/${articleId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setArticles(articles.filter(a => a.id !== articleId));
        setArchived(archived.filter(a => a.id !== articleId));
      } catch (err) {}
    } else if (action === 'archive' || action === 'unarchive') {
      try {
        await fetch(`/api/user/articles/${articleId}/archive`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        // Simplest way is to refetch all
        fetchArticles(1, true);
        setPage(1);
      } catch (err) {}
    } else if (action === 'edit') {
      navigate('/compose?edit=' + articleId);
    } else if (action === 'share') {
      navigator.clipboard.writeText(`${window.location.origin}/news/${articleId}`);
      toast.success("Link copied!");
    } else if (action === 'save') {
      toast.success("Saved!");
    } else if (action === 'report') {
      navigate(`/reports/new?url=${encodeURIComponent(`/news/${articleId}`)}`);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-neutral-500 animate-pulse">Loading articles...</div>;
  }

  const renderArticle = (article: any, isArchivedItem = false) => {
    let parsedImages: string[] = [];
    if (article.images) {
      try { parsedImages = typeof article.images === 'string' ? JSON.parse(article.images) : article.images; } catch (e) {}
    }
    
    return (
      <div 
        key={article.id}
        onClick={() => navigate(`/news/${article.id}`)}
        className={`relative group flex flex-col sm:flex-row gap-5 p-4 rounded-3xl border transition-all cursor-pointer overflow-visible ${isArchivedItem ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-900/40 border-neutral-800/60 hover:bg-neutral-900/80 hover:border-primary-500/30'}`}
        style={{ zIndex: openMenuId === article.id ? 50 : 'auto' }}
      >
        <div className="w-full sm:w-40 h-40 sm:h-28 shrink-0 rounded-2xl overflow-hidden bg-neutral-800 relative z-0">
          {(article.photoUrl || article.imageUrl || parsedImages.length > 0) ? (
            <OptimizedImage 
              src={article.photoUrl || article.imageUrl || parsedImages[0]} 
              alt={article.title} 
              variant="medium"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-600 bg-neutral-900">
              No Image
            </div>
          )}
        </div>
        
        <div className="flex flex-col justify-center flex-1 min-w-0 pr-8 relative">
          <div className="flex items-center gap-2 text-[10px] sm:text-xs text-neutral-500 mb-1.5 font-medium uppercase tracking-wider">
            <span className="px-2 py-0.5 rounded-md bg-primary-500/10 text-primary-400 font-bold">{article.tag || 'Updates'}</span>
            • {new Date(article.createdAt).toLocaleDateString()}
          </div>
          <h4 className="font-bold text-lg sm:text-xl text-white mb-1.5 line-clamp-2 leading-tight group-hover:text-primary-400 transition-colors">
            {article.title}
          </h4>
          <p className="text-neutral-400 text-sm line-clamp-2 leading-snug">
            {stripHtmlAndMarkdown(article.content)}
          </p>
          
          <button 
            onClick={(e) => toggleMenu(e, article.id)}
            className="absolute top-2 right-0 p-2 text-neutral-400 hover:text-white bg-neutral-900/80 hover:bg-neutral-800 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 border border-neutral-700/50 z-10"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          
          <AnimatePresence>
            {openMenuId === article.id && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                className="absolute top-12 right-0 w-48 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl z-50 overflow-hidden"
              >
                {isOwner ? (
                  <>
                    <button onClick={(e) => handleAction(e, 'edit', article.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors text-left"><Edit className="w-4 h-4" /> Edit</button>
                    <button onClick={(e) => handleAction(e, isArchivedItem ? 'unarchive' : 'archive', article.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors text-left"><Archive className="w-4 h-4" /> {isArchivedItem ? "Unarchive" : "Archive"}</button>
                    <button onClick={(e) => handleAction(e, 'delete', article.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left"><Trash2 className="w-4 h-4" /> Delete</button>
                  </>
                ) : (
                  <>
                    <button onClick={(e) => handleAction(e, 'save', article.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors text-left"><Save className="w-4 h-4" /> Save</button>
                    <button onClick={(e) => handleAction(e, 'report', article.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left"><Flag className="w-4 h-4" /> Report</button>
                  </>
                )}
                <button onClick={(e) => handleAction(e, 'share', article.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors text-left"><Share className="w-4 h-4" /> Share</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 relative z-0">
      {isOwner && archived.length > 0 && (
        <div className="mb-0">
          <div 
            onClick={() => setShowArchived(true)}
            className="flex items-center justify-between p-4 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-2xl cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3 text-orange-400">
              <Archive className="w-5 h-5" />
              <span className="font-bold">Archived Articles ({archived.length})</span>
            </div>
            <ChevronDown className="w-5 h-5 text-orange-400 rotate-270" />
          </div>
          
          <AnimatePresence>
            {showArchived && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
                  onClick={() => setShowArchived(false)} 
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar shadow-2xl flex flex-col"
                >
                  <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-sm">
                    <h2 className="text-lg font-bold text-orange-400 flex items-center gap-2">
                       <Archive className="w-5 h-5" /> Archived Articles
                    </h2>
                    <button onClick={() => setShowArchived(false)} className="p-2 text-neutral-400 hover:text-white bg-neutral-800 rounded-full transition-colors">
                      <Archive className="w-4 h-4 opacity-0" /> {/* dummy icon for spacing or close icon */}
                      Close
                    </button>
                  </div>
                  <div className="p-4 space-y-4">
                    {archived.map(article => renderArticle(article, true))}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {articles.length === 0 ? (
        <div className="text-center py-12 text-neutral-500 bg-neutral-900/20 rounded-3xl border border-neutral-800/50 border-dashed">
          No articles published yet.
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map(article => renderArticle(article, false))}
        </div>
      )}
      
      {hasMore && articles.length > 0 && (
        <div className="pt-4 flex justify-center">
          <button 
            onClick={loadMore}
            className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-sm font-bold transition-colors"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
