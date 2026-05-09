import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Compass, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import OptimizedImage from '../components/OptimizedImage';
import { useUser } from '../contexts/UserContext';
import { getIconForUrl, getPlatformName } from '../utils/linkHelpers';
import ProfileArticlesList from '../components/ProfileArticlesList';
import FollowListModal from '../components/FollowListModal';

interface PublicUser {
  id: string;
  username: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  links: { id: string; url: string }[];
  createdAt: string;
  role?: string;
  articles?: any[];
  _count?: { followers: number; following: number; clubFollowing: number };
  isFollowing?: boolean;
}

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useUser();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [isFollowModalOpen, setIsFollowModalOpen] = useState(false);
  const [followModalTab, setFollowModalTab] = useState<'followers' | 'following'>('followers');

  useEffect(() => {
    // If viewing own profile, redirect to /personal
    if (currentUser && currentUser.username === username) {
      navigate('/personal', { replace: true });
      return;
    }

    const fetchProfile = async () => {
      try {
        const headers: any = {};
        const token = localStorage.getItem('token');
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`/api/users/${username}`, { headers });
        if (!res.ok) {
          throw new Error('User not found');
        }
        const data = await res.json();
        setProfile(data.user);
        setIsFollowing(data.user.isFollowing || false);
        setFollowersCount(data.user._count?.followers || 0);
      } catch (err) {
        setError('User not found');
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchProfile();
    }
  }, [username, currentUser, navigate]);

  const handleFollow = async () => {
    if (!currentUser || !profile) return;
    try {
      const res = await fetch(`/api/users/${profile.id}/follow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.following);
        setFollowersCount(prev => data.following ? prev + 1 : prev - 1);
      }
    } catch (e) {
      console.error("Failed to follow");
    }
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-neutral-400">Loading profile...</div>;
  }

  if (error || !profile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 gap-4">
        <p>{error}</p>
        <button onClick={() => navigate(-1)} className="text-primary-500 hover:underline">Go Back</button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 h-full overflow-y-auto custom-scrollbar relative"
    >
      <button 
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm border border-white/10 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Cover Photo */}
      <div className="h-48 md:h-64 bg-neutral-900 relative group overflow-hidden">
        <OptimizedImage 
          src={profile.bannerUrl || `https://picsum.photos/seed/${profile.id}_banner/1200/400`} 
          alt="Cover" 
          variant="banner"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative -mt-16">
        {/* Profile Header */}
        <div className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 rounded-3xl p-6 shadow-xl mb-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end justify-between">
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end">
              <div className="relative">
                <OptimizedImage 
                  src={profile.avatarUrl || `https://picsum.photos/seed/${profile.id}/150/150`} 
                  alt="Profile" 
                  variant="large"
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-neutral-900 object-cover bg-neutral-800 shadow-lg"
                />
              </div>
              
              <div className="flex-1 pb-2">
                <h1 className="text-2xl font-bold text-white">{profile.name || profile.username}</h1>
                <p className="text-primary-400 font-medium">@{profile.username}</p>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <div 
                    className="text-white cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => { setFollowModalTab('followers'); setIsFollowModalOpen(true); }}
                  >
                    <span className="font-bold">{followersCount}</span> <span className="text-neutral-500">Followers</span>
                  </div>
                  <div 
                    className="text-white cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => { setFollowModalTab('following'); setIsFollowModalOpen(true); }}
                  >
                    <span className="font-bold">{(profile._count?.following || 0) + (profile._count?.clubFollowing || 0)}</span> <span className="text-neutral-500">Following</span>
                  </div>
                </div>
              </div>
            </div>
            
            {currentUser && (
               <button 
                 onClick={handleFollow}
                 className={`px-6 py-2.5 rounded-xl font-bold transition-all border ${
                   isFollowing 
                     ? 'bg-neutral-900 border-neutral-700 text-white hover:bg-neutral-800' 
                     : 'bg-primary-600 border-primary-500 text-white hover:bg-primary-500'
                 }`}
               >
                 {isFollowing ? 'Following' : 'Follow'}
               </button>
            )}
          </div>

          <div className="mt-6 text-neutral-300 text-sm max-w-2xl leading-relaxed">
            {profile.bio || "No bio added yet."}
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-neutral-500">
            {profile.links?.map((link: any) => (
              <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-primary-400 transition-colors">
                {getIconForUrl(link.url)} {getPlatformName(link.url)}
              </a>
            ))}
            {profile.createdAt && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </div>
            )}
          </div>
        </div>

        {/* Articles Section */}
        {(profile.role === 'NEWS_WRITER' || profile.role === 'ADMIN') ? (
          <div>
            <h3 className="text-xl font-bold text-white mb-6">Articles</h3>
            <ProfileArticlesList profileUserId={profile.id} currentUserId={currentUser?.id} />
          </div>
        ) : (
          <div className="text-center py-20 bg-neutral-900/30 rounded-[3rem] border border-neutral-800 border-dashed mb-16">
            <div className="w-16 h-16 bg-primary-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary-500/20">
              <Compass className="w-8 h-8 text-primary-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Posts</h3>
            <p className="text-neutral-400 max-w-md mx-auto">
              This user hasn't posted anything yet.
            </p>
          </div>
        )}
      </div>

      <FollowListModal
        isOpen={isFollowModalOpen}
        onClose={() => setIsFollowModalOpen(false)}
        username={profile.username}
        initialTab={followModalTab}
      />
    </motion.div>
  );
}
