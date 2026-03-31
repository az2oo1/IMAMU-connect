import { useState } from 'react';
import { MessageSquare, Share2, MoreHorizontal, Image as ImageIcon, Heart, Bookmark, Compass, TrendingUp, Calendar, MapPin } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'motion/react';
import ProfilePopover from '../components/ProfilePopover';

import { useUser } from '../contexts/UserContext';
import AuthModal from '../components/AuthModal';

const BENTO_POSTS = [
  {
    id: 1,
    type: 'featured',
    community: 'CampusLife',
    author: 'Student Council',
    handle: 'studentcouncil',
    bio: 'The official student council of the university. We organize events and represent the student body.',
    time: '2h ago',
    title: 'Spring Festival 2026 is Here! 🎉',
    content: 'Join us at the main quad for live music, food trucks, and club signups. Don\'t miss the opening ceremony at 6 PM!',
    image: 'https://picsum.photos/seed/festival/800/800',
    likes: 1200,
    comments: 156,
  },
  {
    id: 2,
    type: 'text',
    community: 'ComputerScience',
    author: 'Sarah J.',
    handle: 'sarahcodes',
    bio: 'CS Junior | Coffee enthusiast | Building cool stuff',
    time: '5h ago',
    title: 'New Lab Computers are FAST 🚀',
    content: 'Just compiled my final project in 2 seconds. Anyone up for coffee at the student union to celebrate?',
    likes: 245,
    comments: 42,
  },
  {
    id: 3,
    type: 'event',
    community: 'CareerCenter',
    author: 'Career Services',
    handle: 'careerservices',
    bio: 'Helping students find their dream jobs and internships.',
    time: '1d ago',
    title: 'Tech Career Fair',
    date: 'Tomorrow, 10:00 AM',
    location: 'Grand Hall',
    likes: 89,
    comments: 12,
  },
  {
    id: 4,
    type: 'image',
    community: 'PhotographyClub',
    author: 'Alex M.',
    handle: 'alex_photo',
    bio: 'Capturing campus life one frame at a time.',
    time: '3h ago',
    title: 'Sunset over the library',
    image: 'https://picsum.photos/seed/library/400/400',
    likes: 532,
    comments: 28,
  },
  {
    id: 5,
    type: 'text',
    community: 'Announcements',
    author: 'Admin',
    handle: 'admin',
    bio: 'Official university announcements and updates.',
    time: '4h ago',
    title: 'Library Hours Extended',
    content: 'Starting next week, the central library will be open 24/7 for finals week preparation.',
    likes: 890,
    comments: 45,
  }
];

export default function ExploreTab() {
  const { isAuthenticated } = useUser();
  const [feedType, setFeedType] = useState<'discover' | 'trending'>('discover');
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);

  const displayedPosts = [...BENTO_POSTS].sort((a, b) => {
    if (feedType === 'trending') {
      return b.likes - a.likes;
    }
    // Discover: default order
    return a.id - b.id;
  });

  const handleInteraction = (callback: () => void) => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
    } else {
      callback();
    }
  };

  const toggleLike = (id: number) => {
    handleInteraction(() => {
      setLikedPosts(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        return newSet;
      });
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 h-full overflow-y-auto bg-neutral-950 relative"
    >
      {/* Signature Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none fixed">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] bg-primary-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-6xl mx-auto min-h-screen py-8 px-4 relative z-10">
        
        {/* Header / Toggle */}
        <div className="mb-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-500 mb-2">
              Explore Campus
            </h1>
            <p className="text-neutral-400 font-medium">Discover what's happening around you right now.</p>
          </div>
          
          <div className="flex items-center gap-1 bg-neutral-900/80 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 shadow-2xl">
            <button 
              onClick={() => setFeedType('discover')}
              className={clsx(
                "flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl transition-all duration-300",
                feedType === 'discover' 
                  ? "bg-primary-500 text-white shadow-lg shadow-primary-500/25" 
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
              )}
            >
              <Compass className="w-4 h-4" />
              Discover
            </button>
            <button 
              onClick={() => setFeedType('trending')}
              className={clsx(
                "flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl transition-all duration-300",
                feedType === 'trending' 
                  ? "bg-primary-500 text-white shadow-lg shadow-primary-500/25" 
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
              )}
            >
              <TrendingUp className="w-4 h-4" />
              Trending
            </button>
          </div>
        </div>

        {/* Feed */}
        <div className="max-w-2xl mx-auto space-y-6 pb-24">
          {displayedPosts.map((post, index) => {
            const isExpanded = expandedPostId === post.id;
            return (
            <motion.div 
              initial={{ y: 30, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ 
                delay: index * 0.1, 
                type: "spring", 
                stiffness: 200, 
                damping: 20 
              }}
              key={post.id} 
              onClick={() => setExpandedPostId(isExpanded ? null : post.id)}
              className={clsx(
                "group relative rounded-[2rem] overflow-hidden border border-white/10 bg-neutral-900/40 backdrop-blur-md shadow-2xl hover:border-primary-500/50 transition-all duration-500 flex flex-col cursor-pointer",
                post.type === 'featured' ? 'min-h-[400px]' : 'min-h-[250px]'
              )}
            >
              {/* Background Image for Featured/Image posts */}
              {(post.type === 'featured' || post.type === 'image') && post.image && (
                <>
                  <div className="absolute inset-0 bg-neutral-950">
                    <img 
                      src={post.image} 
                      alt={post.title} 
                      className="w-full h-full object-cover opacity-60 group-hover:scale-105 group-hover:opacity-80 transition-all duration-700"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />
                </>
              )}

              {/* Content Container */}
              <div className="relative z-10 flex flex-col h-full p-6 md:p-8">
                
                {/* Top Meta */}
                <div className="flex items-center justify-between mb-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-3">
                    <ProfilePopover 
                      user={{
                        name: post.author,
                        handle: post.handle,
                        bio: post.bio,
                        avatar: `https://picsum.photos/seed/${post.author}/100/100`
                      }}
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 p-[2px] shadow-lg">
                        <img 
                          src={`https://picsum.photos/seed/${post.author}/100/100`} 
                          className="w-full h-full rounded-[10px] border-2 border-neutral-900 object-cover" 
                          alt={post.author} 
                          referrerPolicy="no-referrer" 
                        />
                      </div>
                    </ProfilePopover>
                    <div>
                      <span className="block font-bold text-white text-sm tracking-tight">{post.community}</span>
                      <span className="block text-neutral-400 text-xs font-medium">{post.time}</span>
                    </div>
                  </div>
                  <button className="w-8 h-8 flex items-center justify-center rounded-full bg-black/20 text-white/70 hover:bg-black/40 hover:text-white backdrop-blur-md transition-colors">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>

                {/* Main Content */}
                <div className="mt-6">
                  {post.type === 'event' && (
                    <div className="mb-4 flex flex-col gap-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-500/20 text-primary-300 w-fit text-sm font-bold border border-primary-500/30">
                        <Calendar className="w-4 h-4" />
                        {post.date}
                      </div>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-neutral-300 w-fit text-sm font-medium border border-white/10">
                        <MapPin className="w-4 h-4" />
                        {post.location}
                      </div>
                    </div>
                  )}

                  <h2 className={clsx(
                    "font-black text-white leading-tight tracking-tight mb-3 transition-all",
                    post.type === 'featured' ? "text-3xl md:text-5xl" : "text-xl md:text-2xl"
                  )}>
                    {post.title}
                  </h2>
                  
                  {post.content && (
                    <p className={clsx(
                      "text-neutral-300 font-medium leading-relaxed transition-all",
                      post.type === 'featured' 
                        ? (isExpanded ? "" : "text-lg md:text-xl line-clamp-3") 
                        : (isExpanded ? "" : "text-sm line-clamp-4")
                    )}>
                      {post.content}
                    </p>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => toggleLike(post.id)}
                      className={clsx(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300",
                        likedPosts.has(post.id) 
                          ? "text-rose-400 bg-rose-500/20 border border-rose-500/30" 
                          : "text-neutral-300 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10"
                      )}
                    >
                      <Heart className={clsx("w-4 h-4", likedPosts.has(post.id) && "fill-current")} /> 
                      {post.likes + (likedPosts.has(post.id) ? 1 : 0)}
                    </button>
                    <button 
                      onClick={() => handleInteraction(() => {})}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-neutral-300 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all duration-300"
                    >
                      <MessageSquare className="w-4 h-4" /> {post.comments}
                    </button>
                  </div>
                  <button 
                    onClick={() => handleInteraction(() => {})}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-neutral-300 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all duration-300"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>

              </div>
            </motion.div>
          )})}
        </div>
      </div>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </motion.div>
  );
}
