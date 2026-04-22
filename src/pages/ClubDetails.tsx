import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar, Clock, Settings, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import NewsArticleModal from '../components/NewsArticleModal';
import OptimizedImage from '../components/OptimizedImage';
import { getIconForUrl, getPlatformName } from '../utils/linkHelpers';
import { useUser } from '../contexts/UserContext';

export default function ClubDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const [club, setClub] = useState<any>(null);
  const [role, setRole] = useState({ isMember: false, isAdmin: false });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);

  const fetchClub = async () => {
    try {
      const res = await fetch(`/api/clubs/${id}`);
      if (res.ok) {
        const data = await res.json();
        setClub(data.club);
      }
    } catch (error) {
      console.error('Failed to fetch club', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) return;
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`/api/clubs/${id}/role`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setRole(data);
        }
      } catch (error) {
        console.error('Failed to fetch role', error);
      }
    };

    fetchClub();
    fetchRole();
  }, [id, user]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neutral-950 text-white">
        <div className="text-center text-neutral-500">Loading club details...</div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neutral-950 text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Club not found</h2>
          <button 
            onClick={() => navigate('/clubs')}
            className="px-6 py-2 bg-primary-600 rounded-xl font-bold"
          >
            Back to Clubs
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 h-full overflow-y-auto bg-neutral-950 relative"
    >
      {/* Header Image */}
      <div className="relative h-64 md:h-80 shrink-0">
        <OptimizedImage 
          src={club.bannerUrl || `https://picsum.photos/seed/${club.id}/800/400`} 
          alt={`${club.name} banner`} 
          variant="banner"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
        
        {/* Back Button */}
        <button 
          onClick={() => navigate('/clubs')}
          className="absolute top-6 left-6 z-10 p-2.5 bg-black/50 text-white hover:bg-black/80 rounded-full backdrop-blur-md transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="absolute bottom-8 left-6 right-6 max-w-6xl mx-auto flex items-end justify-between">
          <div className="flex items-end gap-6">
            <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-neutral-950 bg-neutral-900 shadow-2xl shrink-0 hidden md:block">
              {club.avatarUrl ? (
                <OptimizedImage 
                  src={club.avatarUrl} 
                  alt={`${club.name} logo`} 
                  variant="large"
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-500 font-bold text-3xl">
                  {club.name.charAt(0)}
                </div>
              )}
            </div>
            <div>
              {club.tags && (
                <span className="px-3 py-1 rounded-full bg-primary-500 text-white text-xs font-bold tracking-wider uppercase mb-3 inline-block">
                  {club.tags.split(',')[0]}
                </span>
              )}
              <h1 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight">
                {club.name}
              </h1>
              <p className="text-neutral-300 font-medium mt-2">{club._count?.members || 0} Members</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            {role.isAdmin ? (
              <button 
                onClick={() => navigate(`/clubs/${id}/manage`)}
                className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-6 py-3 rounded-xl font-bold transition-all border border-neutral-700"
              >
                <Settings className="w-5 h-5" />
                Manage Club
              </button>
            ) : (
              <>
                <button 
                  onClick={() => setIsFollowing(!isFollowing)}
                  className={clsx(
                    "px-6 py-3 rounded-xl font-bold transition-colors border",
                    isFollowing 
                      ? "bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700" 
                      : "bg-white/10 border-white/10 text-white hover:bg-white/20 backdrop-blur-md"
                  )}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
                <button className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-8 py-3 rounded-xl font-bold transition-all">
                  {role.isMember ? 'Member' : 'Apply to Join'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-12">
        {/* Mobile Logo & Join Button */}
        <div className="md:hidden flex flex-col items-center gap-6 -mt-16 relative z-10">
          <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-neutral-950 bg-neutral-900 shadow-2xl shrink-0">
            {club.avatarUrl ? (
              <img src={club.avatarUrl} alt={`${club.name} logo`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-500 font-bold text-3xl">
                {club.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="w-full flex gap-3">
            {role.isAdmin ? (
              <button 
                onClick={() => navigate(`/clubs/${id}/manage`)}
                className="flex-1 flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-6 py-3.5 rounded-xl font-bold transition-all border border-neutral-700"
              >
                <Settings className="w-5 h-5" />
                Manage
              </button>
            ) : (
              <>
                <button 
                  onClick={() => setIsFollowing(!isFollowing)}
                  className={clsx(
                    "flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold transition-colors border",
                    isFollowing 
                      ? "bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700" 
                      : "bg-white/10 border-white/10 text-white hover:bg-white/20 backdrop-blur-md"
                  )}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-6 py-3.5 rounded-xl font-bold transition-all">
                  {role.isMember ? 'Member' : 'Apply'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Left Column: Bio & Socials */}
          <div className="md:col-span-1 space-y-10">
            <div>
              <h3 className="text-xl font-bold text-white mb-4">About Us</h3>
              <p className="text-neutral-300 leading-relaxed whitespace-pre-wrap">
                {club.description}
              </p>
            </div>

            {club.links && club.links.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-white mb-4">Connect</h3>
                <div className="flex flex-col gap-3">
                  {club.links.map((link: any) => (
                    <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 text-neutral-400 hover:text-white transition-colors p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 break-all">
                      <span className="shrink-0">{getIconForUrl(link.url)}</span>
                      <span className="font-medium text-sm">{getPlatformName(link.url)}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: News */}
          <div className="md:col-span-2">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center justify-between">
              Club News
            </h3>
            
            {club.articles && club.articles.length > 0 ? (
              <div className="space-y-4">
                {club.articles.map((article: any) => {
                  let parsedImages: string[] = [];
                  if (article.images) {
                     try {
                        parsedImages = typeof article.images === 'string' ? JSON.parse(article.images) : article.images;
                     } catch (e) {}
                  }
                  
                  return (
                  <div 
                    key={article.id}
                    onClick={() => setSelectedArticle({...article, images: parsedImages})}
                    className="group flex flex-col sm:flex-row gap-6 p-5 rounded-[2rem] bg-neutral-900/50 border border-neutral-800 hover:border-primary-500/50 transition-all cursor-pointer"
                  >
                    <div className="w-full sm:w-48 h-48 sm:h-32 shrink-0 rounded-2xl overflow-hidden bg-neutral-800">
                      {(article.photoUrl || article.imageUrl || (parsedImages.length > 0)) ? (
                        <img 
                          src={`/api/image?url=${encodeURIComponent(article.photoUrl || article.imageUrl || parsedImages[0])}&w=400`} 
                          alt={article.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-600 font-bold bg-neutral-800/80">
                          {article.title.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col justify-center">
                      <div className="flex items-center gap-3 mb-3 text-xs font-medium text-neutral-500">
                        <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {new Date(article.createdAt).toLocaleDateString()}</span>
                      </div>
                      <h4 className="text-xl text-white font-bold mb-2 group-hover:text-primary-400 transition-colors line-clamp-2">
                        {article.title}
                      </h4>
                      <p className="text-neutral-400 line-clamp-2">
                        {article.content}
                      </p>
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-neutral-900/30 rounded-[2rem] border border-neutral-800 border-dashed">
                <p className="text-neutral-500 font-medium">No news published yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedArticle && (
        <NewsArticleModal 
          article={{
            ...selectedArticle,
            image: selectedArticle.photoUrl || selectedArticle.imageUrl || (selectedArticle.images && selectedArticle.images[0]) || `https://picsum.photos/seed/${selectedArticle.id}/800/600`,
            images: selectedArticle.images || [],
            date: new Date(selectedArticle.createdAt).toLocaleDateString(),
            category: club.name,
            readTime: '5 min read',
            author: { id: club.id, isClub: true, name: club.name, avatar: club.avatarUrl },
            authorAvatar: club.avatarUrl
          }} 
          isOpen={!!selectedArticle} 
          onClose={() => setSelectedArticle(null)} 
        />
      )}
    </motion.div>
  );
}
