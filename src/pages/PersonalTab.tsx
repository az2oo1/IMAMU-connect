import React, { useState, useRef } from 'react';
import { Edit2, Calendar, Link as LinkIcon, Camera, Linkedin, Github, Compass, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { useUser } from '../contexts/UserContext';

export default function PersonalTab() {
  const { user, updateProfile } = useUser();
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  const [bannerUrl, setBannerUrl] = useState('https://picsum.photos/seed/cover/1200/400');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [editAvatarUrl, setEditAvatarUrl] = useState(user?.avatarUrl || '');
  const [editBannerUrl, setEditBannerUrl] = useState(user?.bannerUrl || '');
  const [editLinkedin, setEditLinkedin] = useState(user?.linkedinUrl || '');
  const [editGithub, setEditGithub] = useState(user?.githubUrl || '');
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ 
        name: editName, 
        bio: editBio,
        avatarUrl: editAvatarUrl,
        bannerUrl: editBannerUrl,
        linkedinUrl: editLinkedin,
        githubUrl: editGithub
      });
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Failed to update profile", error);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-400">
        Please sign in to view your profile.
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 overflow-y-auto custom-scrollbar"
    >
      {/* Cover Photo */}
      <div className="h-48 md:h-64 bg-gradient-to-r from-primary-900 to-primary-800 relative group">
        <img 
          src={user.bannerUrl || `https://picsum.photos/seed/${user.id}_banner/1200/400`} 
          alt="Cover" 
          className="w-full h-full object-cover opacity-50 mix-blend-overlay"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative -mt-16">
        {/* Profile Header */}
        <div className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 rounded-3xl p-6 shadow-xl mb-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end">
            <div className="relative">
              <img 
                src={user.avatarUrl || `https://picsum.photos/seed/${user.id}/150/150`} 
                alt="Profile" 
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-neutral-900 object-cover bg-neutral-800 shadow-lg"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <div className="flex-1 pb-2">
              <h1 className="text-2xl font-bold text-white">{user.name || user.username}</h1>
              <p className="text-primary-400 font-medium">@{user.username}</p>
            </div>

            <button 
              onClick={() => {
                setEditName(user.name || '');
                setEditBio(user.bio || '');
                setEditAvatarUrl(user.avatarUrl || '');
                setEditBannerUrl(user.bannerUrl || '');
                setEditLinkedin(user.linkedinUrl || '');
                setEditGithub(user.githubUrl || '');
                setIsEditModalOpen(true);
              }}
              className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors pb-2"
            >
              Edit Profile
            </button>
          </div>

          <div className="mt-6 text-neutral-300 text-sm max-w-2xl leading-relaxed">
            {user.bio || "No bio added yet."}
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-neutral-500">
            {user.linkedinUrl && (
              <a href={user.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-primary-400 transition-colors">
                <Linkedin className="w-4 h-4" /> LinkedIn
              </a>
            )}
            {user.githubUrl && (
              <a href={user.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-primary-400 transition-colors">
                <Github className="w-4 h-4" /> GitHub
              </a>
            )}
            {user.createdAt && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </div>
            )}
            {user.studentEmail && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> Student Email: {user.studentEmail}
              </div>
            )}
          </div>
        </div>

        {/* Coming Soon State for Posts/Saved */}
        <div className="text-center py-20 bg-neutral-900/30 rounded-[3rem] border border-neutral-800 border-dashed mb-16">
          <div className="w-16 h-16 bg-primary-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary-500/20">
            <Compass className="w-8 h-8 text-primary-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Posts & Saved</h3>
          <p className="text-neutral-400 max-w-md mx-auto">
            This feature is connected to the upcoming Explore tab. Check back soon to see your posts and saved content!
          </p>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setIsEditModalOpen(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-sm">
                <h2 className="text-lg font-semibold text-neutral-100">Edit Profile</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6">
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">Display Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">Bio</label>
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      rows={3}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">Avatar Image URL</label>
                    <input
                      type="url"
                      value={editAvatarUrl}
                      onChange={(e) => setEditAvatarUrl(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">Banner Image URL</label>
                    <input
                      type="url"
                      value={editBannerUrl}
                      onChange={(e) => setEditBannerUrl(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="https://example.com/banner.jpg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">LinkedIn URL</label>
                    <input
                      type="url"
                      value={editLinkedin}
                      onChange={(e) => setEditLinkedin(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">GitHub URL</label>
                    <input
                      type="url"
                      value={editGithub}
                      onChange={(e) => setEditGithub(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="https://github.com/username"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-primary-600 hover:bg-primary-500 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 mt-4"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
