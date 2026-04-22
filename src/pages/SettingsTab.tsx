import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Check, ChevronUp, ChevronDown } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { useUser } from '../contexts/UserContext';
import { cn } from '../components/Layout';

export default function SettingsTab() {
  const { hue, setHue, colorPreset, setColorPreset, navOrder, setNavOrder, hiddenNavItems, setHiddenNavItems } = useTheme();
  const { isPrivateProfile, setIsPrivateProfile, user, updateProfile } = useUser();
  const [showGoogleConnect, setShowGoogleConnect] = useState(false);
  const [showGoogleDisconnect, setShowGoogleDisconnect] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('');

  const ALL_NAV_ITEMS = [
    { id: '/news', label: 'News' },
    { id: '/clubs', label: 'Clubs' },
    { id: '/map', label: 'Map' },
    { id: '/academics', label: 'Academics' },
    { id: '/explore', label: 'Explore' },
    { id: '/groups', label: 'Groups' },
    { id: '/calendar', label: 'Calendar' },
  ];

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...navOrder];
    if (direction === 'up' && index > 0) {
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
    }
    setNavOrder(newOrder);
  };

  const toggleNavItem = (id: string) => {
    if ((hiddenNavItems || []).includes(id)) {
      setHiddenNavItems((hiddenNavItems || []).filter(item => item !== id));
    } else {
      setHiddenNavItems([...(hiddenNavItems || []), id]);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 h-full overflow-y-auto custom-scrollbar p-4 sm:p-8 pb-24"
    >
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-neutral-400">Manage your account preferences and appearance.</p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-8">
          
          {/* Appearance */}
          <div>
            <h3 className="text-sm font-medium text-neutral-400 mb-4 uppercase tracking-wider">Appearance</h3>
            <div className="space-y-6">
              <div>
                <label className="text-sm text-neutral-200 mb-3 block">Suggested Colors</label>
                <div className="flex flex-wrap gap-3 mb-6">
                  {[
                    { id: 'white', name: 'White', bg: 'bg-neutral-200' },
                    { id: 'gray', name: 'Gray', bg: 'bg-neutral-500' },
                    { id: 'blue', name: 'Blue', bg: 'bg-blue-500' },
                    { id: 'emerald', name: 'Emerald', bg: 'bg-emerald-500' },
                    { id: 'custom', name: 'Custom', bg: 'bg-gradient-to-r from-red-500 via-green-500 to-blue-500' },
                  ].map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => setColorPreset(preset.id)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all",
                        colorPreset === preset.id ? "ring-2 ring-white ring-offset-2 ring-offset-neutral-900" : "opacity-70 hover:opacity-100 bg-neutral-800"
                      )}
                    >
                      <div className={cn("w-4 h-4 rounded-full", preset.bg)} />
                      <span className="text-white">{preset.name}</span>
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {colorPreset === 'custom' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <label className="text-sm text-neutral-200 mb-3 block pt-2">Custom Hue</label>
                      <div className="flex items-center gap-4">
                        <input 
                          type="range" 
                          min="0" 
                          max="360" 
                          value={hue} 
                          onChange={(e) => setHue(parseInt(e.target.value))}
                          className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, 
                              hsl(0, 80%, 50%), hsl(60, 80%, 50%), hsl(120, 80%, 50%), 
                              hsl(180, 80%, 50%), hsl(240, 80%, 50%), hsl(300, 80%, 50%), hsl(360, 80%, 50%))`
                          }}
                        />
                        <div 
                          className="w-10 h-10 rounded-full border-2 border-white shadow-lg flex-shrink-0"
                          style={{ backgroundColor: `hsl(${hue}, 80%, 50%)` }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <hr className="border-neutral-800" />

          {/* Navigation Bar */}
          <div>
            <h3 className="text-sm font-medium text-neutral-400 mb-4 uppercase tracking-wider">Navigation Bar</h3>
            <p className="text-xs text-neutral-500 mb-4">Reorder tabs and choose which ones appear in the top bar. Unchecked items move to the "More" menu.</p>
            <div className="space-y-2">
              {(navOrder || []).map((id, index) => {
                const item = ALL_NAV_ITEMS.find(i => i.id === id);
                if (!item) return null;
                const isHidden = (hiddenNavItems || []).includes(id);
                
                return (
                  <div key={id} className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1">
                        <button 
                          onClick={() => moveItem(index, 'up')} 
                          disabled={index === 0}
                          className="text-neutral-500 hover:text-white disabled:opacity-30 transition-colors"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => moveItem(index, 'down')} 
                          disabled={index === navOrder.length - 1}
                          className="text-neutral-500 hover:text-white disabled:opacity-30 transition-colors"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="text-sm text-neutral-200">{item.label}</span>
                    </div>
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 accent-primary-500" 
                      checked={!isHidden}
                      onChange={() => toggleNavItem(id)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <hr className="border-neutral-800" />

          {/* Account Connections */}
          <div>
            <h3 className="text-sm font-medium text-neutral-400 mb-4 uppercase tracking-wider">Account Connections</h3>
            <div className="space-y-4">
              <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-neutral-200">IMAMU Student Email</span>
                </div>
                <input 
                  type="email" 
                  placeholder="student@sm.imamu.edu.sa"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-500 transition-colors"
                  defaultValue={user?.studentEmail || ''}
                  onBlur={(e) => {
                    if (e.target.value !== user?.studentEmail) {
                      updateProfile({ studentEmail: e.target.value });
                    }
                  }}
                />
              </div>
              <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-neutral-200">Google Account</span>
                </div>
                
                {user?.googleEmail ? (
                  <div className="flex items-center justify-between bg-neutral-800 p-3 rounded-lg border border-neutral-700">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Connected</p>
                        <p className="text-xs text-neutral-400">{user.googleEmail}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowGoogleDisconnect(true)}
                      className="px-3 py-1.5 bg-neutral-700 hover:bg-red-500/20 text-neutral-200 hover:text-red-400 text-sm font-medium rounded-md transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setShowGoogleConnect(true)}
                    className="w-full flex items-center justify-center gap-2 bg-white hover:bg-neutral-200 text-neutral-900 px-4 py-3 rounded-lg font-medium transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Connect with Google
                  </button>
                )}
              </div>
            </div>
          </div>

          <hr className="border-neutral-800" />

          {/* Privacy */}
          <div>
            <h3 className="text-sm font-medium text-neutral-400 mb-4 uppercase tracking-wider">Privacy</h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-neutral-950 rounded-xl border border-neutral-800 cursor-pointer hover:border-neutral-700 transition-colors">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-neutral-400" />
                  <div>
                    <span className="text-sm text-neutral-200 block">Private Profile</span>
                    <span className="text-xs text-neutral-500">Only approved followers can see your posts</span>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  className="w-5 h-5 accent-primary-500" 
                  checked={isPrivateProfile}
                  onChange={(e) => setIsPrivateProfile(e.target.checked)}
                />
              </label>
            </div>
          </div>

          <hr className="border-neutral-800" />

          {/* Preferences */}
          <div>
            <h3 className="text-sm font-medium text-neutral-400 mb-4 uppercase tracking-wider">Preferences</h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-neutral-950 rounded-xl border border-neutral-800 cursor-pointer hover:border-neutral-700 transition-colors">
                <span className="text-sm text-neutral-200">Push Notifications</span>
                <input type="checkbox" className="w-5 h-5 accent-primary-500" defaultChecked />
              </label>
              <label className="flex items-center justify-between p-4 bg-neutral-950 rounded-xl border border-neutral-800 cursor-pointer hover:border-neutral-700 transition-colors">
                <span className="text-sm text-neutral-200">Email Updates</span>
                <input type="checkbox" className="w-5 h-5 accent-primary-500" />
              </label>
            </div>
          </div>

        </div>
      </div>

      {/* Google Connect Modal */}
      <AnimatePresence>
        {showGoogleConnect && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setShowGoogleConnect(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6"
            >
              <h3 className="text-xl font-bold text-white mb-2">Connect Google Account</h3>
              <p className="text-sm text-neutral-400 mb-4">Enter your Google email to simulate connecting your account.</p>
              <input 
                type="email" 
                value={googleEmailInput} 
                onChange={e => setGoogleEmailInput(e.target.value)} 
                placeholder="your.email@gmail.com"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 mb-4"
              />
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowGoogleConnect(false)} 
                  className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (googleEmailInput) {
                      updateProfile({ googleEmail: googleEmailInput });
                      setShowGoogleConnect(false);
                      setGoogleEmailInput('');
                    }
                  }} 
                  className="px-4 py-2 bg-white text-neutral-900 text-sm font-bold rounded-lg hover:bg-neutral-200 transition-colors"
                >
                  Connect
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Google Disconnect Modal */}
      <AnimatePresence>
        {showGoogleDisconnect && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setShowGoogleDisconnect(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6"
            >
              <h3 className="text-xl font-bold text-white mb-2">Disconnect Account</h3>
              <p className="text-sm text-neutral-400 mb-6">Are you sure you want to disconnect your Google account? You will no longer be able to log in using Google.</p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowGoogleDisconnect(false)} 
                  className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    updateProfile({ googleEmail: '' });
                    setShowGoogleDisconnect(false);
                  }} 
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
