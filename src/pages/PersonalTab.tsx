import React, { useState, useRef } from 'react';
import { Edit2, Calendar, Camera, Compass, X, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import OptimizedImage from '../components/OptimizedImage';
import { useUser } from '../contexts/UserContext';
import { getIconForUrl, getPlatformName } from '../utils/linkHelpers';

export default function PersonalTab() {
  const { user, updateProfile, uploadImage } = useUser();
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [editLinks, setEditLinks] = useState<string[]>(user?.links?.map(l => l.url) || []);
  const [saving, setSaving] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ 
        name: editName, 
        bio: editBio,
        links: editLinks.filter(l => l.trim() !== '')
      });
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Failed to update profile", error);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadImage(file, type);
      setUploadMessage(`${type === 'avatar' ? 'Profile picture' : 'Banner'} uploaded successfully!`);
      setTimeout(() => setUploadMessage(null), 3000);
    } catch (error) {
      console.error(`Failed to upload ${type}`, error);
      setUploadMessage(`Failed to upload ${type}.`);
      setTimeout(() => setUploadMessage(null), 3000);
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
      className="flex-1 overflow-y-auto custom-scrollbar relative"
    >
      <AnimatePresence>
        {uploadMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-neutral-800 text-white px-4 py-2 rounded-lg shadow-lg border border-neutral-700"
          >
            {uploadMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cover Photo */}
      <div className="h-48 md:h-64 bg-neutral-900 relative group cursor-pointer overflow-hidden" onClick={() => bannerInputRef.current?.click()}>
        <OptimizedImage 
          src={user.bannerUrl || `https://picsum.photos/seed/${user.id}_banner/1200/400`} 
          alt="Cover" 
          variant="banner"
          className="w-full h-full object-cover transition-opacity group-hover:opacity-75"
        />
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-black/50 p-2 rounded-full backdrop-blur-sm">
            <Edit2 className="w-4 h-4 text-white" />
          </div>
        </div>
        <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'banner')} />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative -mt-16">
        {/* Profile Header */}
        <div className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 rounded-3xl p-6 shadow-xl mb-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end">
            <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
              <OptimizedImage 
                src={user.avatarUrl || `https://picsum.photos/seed/${user.id}/150/150`} 
                alt="Profile" 
                variant="large"
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-neutral-900 object-cover bg-neutral-800 shadow-lg transition-opacity group-hover:opacity-50"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-black/50 p-2 rounded-full backdrop-blur-sm">
                  <Edit2 className="w-5 h-5 text-white" />
                </div>
              </div>
              <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} />
            </div>
            
            <div className="flex-1 pb-2">
              <h1 className="text-2xl font-bold text-white">{user.name || user.username}</h1>
              <p className="text-primary-400 font-medium">@{user.username}</p>
            </div>

            <button 
              onClick={() => {
                setEditName(user.name || '');
                setEditBio(user.bio || '');
                setEditLinks(user.links?.map(l => l.url) || []);
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
            {user.links?.map((link) => (
              <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-primary-400 transition-colors">
                {getIconForUrl(link.url)} {getPlatformName(link.url)}
              </a>
            ))}
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
            {user.googleEmail && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> Google Email: {user.googleEmail}
              </div>
            )}
          </div>
        </div>

        <div className="flex border-b border-neutral-800 mb-8">
          <button
            onClick={() => setActiveTab('posts')}
            className={clsx(
              "flex-1 py-4 text-sm font-medium transition-colors border-b-2",
              activeTab === 'posts' ? "border-primary-500 text-primary-400" : "border-transparent text-neutral-500 hover:text-neutral-300"
            )}
          >
            Posts
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={clsx(
              "flex-1 py-4 text-sm font-medium transition-colors border-b-2",
              activeTab === 'saved' ? "border-primary-500 text-primary-400" : "border-transparent text-neutral-500 hover:text-neutral-300"
            )}
          >
            Saved
          </button>
        </div>

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
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-neutral-300">Social Links</label>
                      <button 
                        type="button" 
                        onClick={() => setEditLinks([...editLinks, ''])}
                        className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Link
                      </button>
                    </div>
                    <div className="space-y-2">
                      {editLinks.map((link, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="url"
                            value={link}
                            onChange={(e) => {
                              const newLinks = [...editLinks];
                              newLinks[index] = e.target.value;
                              setEditLinks(newLinks);
                            }}
                            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="https://..."
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              const newLinks = [...editLinks];
                              newLinks.splice(index, 1);
                              setEditLinks(newLinks);
                            }}
                            className="p-2.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded-xl transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                      {editLinks.length === 0 && (
                        <p className="text-sm text-neutral-500 italic">No links added. Click "Add Link" to add your social profiles.</p>
                      )}
                    </div>
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
