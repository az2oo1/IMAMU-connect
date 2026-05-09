import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Bookmark, Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NewsArticleModal from '../components/NewsArticleModal';
import OptimizedImage from '../components/OptimizedImage';
import { stripHtmlAndMarkdown } from '../utils/textHelpers';

export default function SavedTab() {
  const [savedArticles, setSavedArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSaved = async () => {
      try {
        const res = await fetch('/api/user/saved-articles', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSavedArticles(data.articles || []);
        }
      } catch (e) {
        console.error("Failed to fetch saved articles", e);
      } finally {
        setLoading(false);
      }
    };
    fetchSaved();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 h-full overflow-y-auto custom-scrollbar p-4 sm:p-8"
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center border border-primary-500/20">
            <Bookmark className="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Saved</h1>
            <p className="text-neutral-400">Your saved news articles and posts.</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-neutral-400">Loading...</div>
        ) : savedArticles.length === 0 ? (
          <div className="text-center py-20 bg-neutral-900/30 rounded-[3rem] border border-neutral-800 border-dashed">
            <div className="w-16 h-16 bg-primary-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary-500/20">
              <Compass className="w-8 h-8 text-primary-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Nothing saved yet</h3>
            <p className="text-neutral-400 max-w-md mx-auto">
              When you save news articles or posts, they will appear here for easy access.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {savedArticles.map((article: any) => {
              let parsedImages: string[] = [];
              if (article.images) {
                 try {
                   parsedImages = typeof article.images === 'string' ? JSON.parse(article.images) : article.images;
                 } catch (e) {}
              }

              const displayImage = article.photoUrl || (parsedImages.length > 0 ? parsedImages[0] : null) || `https://picsum.photos/seed/${article.id}/800/600`;
              
              const articleData = {
                ...article,
                category: article.tag || 'General',
                date: new Date(article.createdAt).toLocaleDateString(),
                readTime: '5 min read',
                image: displayImage,
                images: parsedImages,
                excerpt: article.content,
                author: article.club ? { id: article.clubId, isClub: true, name: article.club.name, avatar: article.club.avatarUrl, username: article.club.name } : (article.author || 'University Press'),
                authorAvatar: article.club?.avatarUrl || article.author?.avatarUrl,
                isSaved: true
              };

              const authorName = articleData.author?.name || articleData.author || 'Unknown';
              
              return (
                <div 
                  key={article.id}
                  onClick={() => setSelectedArticle(articleData)}
                  className="bg-neutral-900/40 border border-neutral-800/60 hover:border-primary-500/30 rounded-[2rem] overflow-hidden transition-all hover:bg-neutral-900/60 cursor-pointer group flex flex-col h-full"
                >
                  <div className="h-48 relative overflow-hidden bg-neutral-900">
                    <OptimizedImage 
                      src={displayImage} 
                      alt="" 
                      variant="medium"
                      className="w-full h-full object-cover transition-transform duration-700" 
                    />
                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className="px-3 py-1 rounded-full bg-black/60 text-white text-xs font-bold tracking-wider uppercase backdrop-blur-md border border-white/10">
                        {articleData.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-white mb-3 line-clamp-2 leading-tight group-hover:text-primary-400 transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-sm text-neutral-400 whitespace-pre-wrap line-clamp-2 mb-6 flex-1 leading-relaxed">
                      {stripHtmlAndMarkdown(articleData.content ? articleData.content : articleData.excerpt)}
                    </p>
                    <div className="flex items-center gap-3 pt-4 border-t border-neutral-800">
                       <OptimizedImage src={articleData.authorAvatar || `https://picsum.photos/seed/${authorName}/100/100`} alt="" variant="small" className="w-8 h-8 rounded-full border-2 border-neutral-800" />
                       <div className="text-sm">
                         <div className="text-white font-bold">{authorName}</div>
                         <div className="text-neutral-500">{articleData.date}</div>
                       </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedArticle && (
        <NewsArticleModal 
          article={selectedArticle} 
          isOpen={!!selectedArticle} 
          onClose={() => {
            setSelectedArticle(null);
            // Refresh to handle un-saving from modal
            const token = localStorage.getItem('token');
            if (token) {
              fetch('/api/user/saved-articles', {
                headers: { 'Authorization': `Bearer ${token}` }
              })
              .then(res => res.json())
              .then(data => setSavedArticles(data.articles || []));
            }
          }} 
        />
      )}
    </motion.div>
  );
}
