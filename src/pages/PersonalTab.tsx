import { useState, useRef } from 'react';
import { Edit2, Calendar, Link as LinkIcon, Camera, Linkedin } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';

export default function PersonalTab() {
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  const [bannerUrl, setBannerUrl] = useState('https://picsum.photos/seed/cover/1200/400');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setBannerUrl(url);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 overflow-y-auto"
    >
      {/* Cover Photo */}
      <div className="h-48 md:h-64 bg-gradient-to-r from-primary-900 to-primary-800 relative group">
        <img 
          src={bannerUrl} 
          alt="Cover" 
          className="w-full h-full object-cover opacity-50 mix-blend-overlay"
          referrerPolicy="no-referrer"
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="absolute bottom-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm border border-white/10"
          title="Change Banner"
        >
          <Camera className="w-5 h-5" />
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleBannerChange} 
          accept="image/*" 
          className="hidden" 
        />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative -mt-16">
        {/* Profile Header */}
        <div className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 rounded-3xl p-6 shadow-xl mb-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end">
            <div className="relative">
              <img 
                src="https://picsum.photos/seed/avatar/150/150" 
                alt="Profile" 
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-neutral-900 object-cover bg-neutral-800 shadow-lg"
                referrerPolicy="no-referrer"
              />
              <button className="absolute bottom-2 right-2 p-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors shadow-md">
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 pb-2">
              <h1 className="text-2xl font-bold text-white">Alex Chen</h1>
              <p className="text-primary-400 font-medium">Computer Science, Class of '27</p>
            </div>

            <button className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors pb-2">
              Edit Profile
            </button>
          </div>

          <div className="mt-6 text-neutral-300 text-sm max-w-2xl leading-relaxed">
            Passionate about web development and AI. President of the Coding Club. 
            Always looking for hackathon teammates! 🚀
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-neutral-500">
            <div className="flex items-center gap-1.5">
              <Linkedin className="w-4 h-4" /> linkedin.com/in/alexchen
            </div>
            <div className="flex items-center gap-1.5">
              <LinkIcon className="w-4 h-4" /> github.com/alexchen
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" /> Joined Sept 2023
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-800 mb-6 relative">
          <button 
            onClick={() => setActiveTab('posts')}
            className={clsx(
              "px-6 py-3 font-medium text-sm transition-colors relative",
              activeTab === 'posts' ? "text-primary-400" : "text-neutral-500 hover:text-neutral-300"
            )}
          >
            My Posts
            {activeTab === 'posts' && (
              <motion.div 
                layoutId="personalTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
              />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('saved')}
            className={clsx(
              "px-6 py-3 font-medium text-sm transition-colors relative",
              activeTab === 'saved' ? "text-primary-400" : "text-neutral-500 hover:text-neutral-300"
            )}
          >
            Saved
            {activeTab === 'saved' && (
              <motion.div 
                layoutId="personalTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
              />
            )}
          </button>
        </div>

        {/* Posts List */}
        <div className="space-y-4 pb-8">
          {activeTab === 'posts' ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700 transition-colors"
            >
              <div className="text-xs text-neutral-500 mb-2">Posted 2 days ago</div>
              <p className="text-neutral-200 text-sm leading-relaxed">
                Looking for a study group for MATH201! The upcoming midterm looks tough. 
                Anyone want to meet at the library on Thursday?
              </p>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700 transition-colors"
            >
              <div className="text-xs text-neutral-500 mb-2">Saved 1 week ago • By Prof. Smith</div>
              <p className="text-neutral-200 text-sm leading-relaxed">
                Reminder: The deadline for the final project proposal has been extended to Friday.
                Please make sure to submit your topics via the portal.
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
