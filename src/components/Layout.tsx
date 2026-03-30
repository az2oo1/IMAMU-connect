import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Map, BookOpen, Compass, Users, User, Settings, LogOut, X, Check, Newspaper, Shield } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTheme } from '../ThemeContext';
import { useUser } from '../contexts/UserContext';
import { motion, AnimatePresence } from 'motion/react';
import AuthModal from './AuthModal';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { theme, setTheme } = useTheme();
  const { isPrivateProfile, setIsPrivateProfile } = useUser();

  const themes = [
    { id: 'indigo', name: 'Indigo', color: 'bg-indigo-500' },
    { id: 'emerald', name: 'Emerald', color: 'bg-emerald-500' },
    { id: 'rose', name: 'Rose', color: 'bg-rose-500' },
    { id: 'amber', name: 'Amber', color: 'bg-amber-500' },
    { id: 'violet', name: 'Violet', color: 'bg-violet-500' },
  ] as const;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={onClose} 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-neutral-800">
              <h2 className="text-lg font-semibold text-neutral-100">Settings</h2>
              <button onClick={onClose} className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-neutral-400 mb-3 uppercase tracking-wider">Appearance</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-neutral-200 mb-2 block">Accent Color</label>
                    <div className="flex gap-3">
                      {themes.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id)}
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110",
                            t.color,
                            theme === t.id ? "ring-2 ring-offset-2 ring-offset-neutral-900 ring-white" : ""
                          )}
                          title={t.name}
                        >
                          {theme === t.id && <Check className="w-5 h-5 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-neutral-400 mb-3 uppercase tracking-wider">Privacy</h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-800 cursor-pointer hover:border-neutral-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-neutral-400" />
                      <div>
                        <span className="text-sm text-neutral-200 block">Private Profile</span>
                        <span className="text-xs text-neutral-500">Only approved followers can see your posts</span>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 accent-primary-500" 
                      checked={isPrivateProfile}
                      onChange={(e) => setIsPrivateProfile(e.target.checked)}
                    />
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-neutral-400 mb-3 uppercase tracking-wider">Preferences</h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-800 cursor-pointer hover:border-neutral-700 transition-colors">
                    <span className="text-sm text-neutral-200">Push Notifications</span>
                    <input type="checkbox" className="w-4 h-4 accent-primary-500" defaultChecked />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-800 cursor-pointer hover:border-neutral-700 transition-colors">
                    <span className="text-sm text-neutral-200">Email Updates</span>
                    <input type="checkbox" className="w-4 h-4 accent-primary-500" />
                  </label>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default function Layout() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useUser();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navItems = [
    { to: '/news', icon: Newspaper, label: 'News' },
    { to: '/map', icon: Map, label: 'Map' },
    { to: '/academics', icon: BookOpen, label: 'Academics' },
    { to: '/explore', icon: Compass, label: 'Explore' },
    { to: '/groups', icon: Users, label: 'Groups' },
  ];

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-neutral-50 overflow-hidden font-sans selection:bg-primary-500/30">
      
      {/* Top Header (Desktop & Mobile) */}
      <header className="bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-800/50 z-40 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Map className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400">CampusHub</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => cn(
                  "relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "text-primary-400" 
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
                )}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="nav-active-indicator"
                        className="absolute inset-0 bg-primary-500/10 rounded-lg"
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Profile Dropdown or Login Button */}
          <div className="relative" ref={dropdownRef}>
            {isAuthenticated ? (
              <>
                <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 hover:bg-neutral-900 p-1.5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                >
                  <img 
                    src="https://picsum.photos/seed/avatar/100/100" 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full border border-neutral-800 object-cover"
                    referrerPolicy="no-referrer"
                  />
                </button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden z-50"
                    >
                      <div className="p-3 border-b border-neutral-800 bg-neutral-900/50">
                        <p className="text-sm font-medium text-white">Student Name</p>
                        <p className="text-xs text-neutral-400">student@imamu.edu.sa</p>
                      </div>
                      <div className="p-1">
                        <button 
                          onClick={() => {
                            navigate('/personal');
                            setIsProfileOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                        >
                          <User className="w-4 h-4" />
                          Profile
                        </button>
                        <button 
                          onClick={() => {
                            setIsSettingsOpen(true);
                            setIsProfileOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          Settings
                        </button>
                      </div>
                      <div className="p-1 border-t border-neutral-800">
                        <button 
                          onClick={() => {
                            logout();
                            setIsProfileOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <button 
                onClick={() => setIsAuthModalOpen(true)}
                className="bg-primary-600 hover:bg-primary-500 text-white font-medium px-4 py-2 rounded-xl transition-colors text-sm"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden bg-neutral-950/80 backdrop-blur-xl border-t border-neutral-800/50 pb-safe z-40">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                "relative flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                isActive ? "text-primary-400" : "text-neutral-500 hover:text-neutral-300"
              )}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="mobile-nav-active-indicator"
                      className="absolute inset-x-2 inset-y-1 bg-primary-500/10 rounded-xl"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex flex-col items-center gap-1">
                    <item.icon className="w-5 h-5" />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </span>
                </>
              )}
            </NavLink>
          ))}
          <NavLink
              to="/personal"
              className={({ isActive }) => cn(
                "relative flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                isActive ? "text-primary-400" : "text-neutral-500 hover:text-neutral-300"
              )}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="mobile-nav-active-indicator"
                      className="absolute inset-x-2 inset-y-1 bg-primary-500/10 rounded-xl"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex flex-col items-center gap-1">
                    <User className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Profile</span>
                  </span>
                </>
              )}
          </NavLink>
        </div>
      </nav>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
