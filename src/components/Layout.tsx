import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Map, BookOpen, Compass, Users, User, Settings, LogOut, X, Check, Newspaper, Shield, Tent, ChevronDown, MoreHorizontal, Calendar } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTheme } from '../ThemeContext';
import { useUser } from '../contexts/UserContext';
import { motion, AnimatePresence } from 'motion/react';
import AuthModal from './AuthModal';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function SettingsModal({ isOpen, onClose, hiddenNavItems, setHiddenNavItems }: { isOpen: boolean; onClose: () => void; hiddenNavItems: string[]; setHiddenNavItems: (items: string[]) => void }) {
  const { theme, setTheme, radius, setRadius, font, setFont } = useTheme();
  const { isPrivateProfile, setIsPrivateProfile } = useUser();

  const themes = [
    { id: 'red', name: 'Red', color: 'bg-red-500' },
    { id: 'orange', name: 'Orange', color: 'bg-orange-500' },
    { id: 'amber', name: 'Amber', color: 'bg-amber-500' },
    { id: 'yellow', name: 'Yellow', color: 'bg-yellow-500' },
    { id: 'lime', name: 'Lime', color: 'bg-lime-500' },
    { id: 'green', name: 'Green', color: 'bg-green-500' },
    { id: 'emerald', name: 'Emerald', color: 'bg-emerald-500' },
    { id: 'teal', name: 'Teal', color: 'bg-teal-500' },
    { id: 'cyan', name: 'Cyan', color: 'bg-cyan-500' },
    { id: 'blue', name: 'Blue', color: 'bg-blue-500' },
    { id: 'indigo', name: 'Indigo', color: 'bg-indigo-500' },
    { id: 'violet', name: 'Violet', color: 'bg-violet-500' },
    { id: 'purple', name: 'Purple', color: 'bg-purple-500' },
    { id: 'fuchsia', name: 'Fuchsia', color: 'bg-fuchsia-500' },
    { id: 'pink', name: 'Pink', color: 'bg-pink-500' },
    { id: 'rose', name: 'Rose', color: 'bg-rose-500' },
  ] as const;

  const radii = [
    { id: 'none', name: 'Square', class: 'rounded-none' },
    { id: 'sm', name: 'Small', class: 'rounded-sm' },
    { id: 'md', name: 'Medium', class: 'rounded-md' },
    { id: 'lg', name: 'Large', class: 'rounded-lg' },
    { id: 'xl', name: 'Extra Large', class: 'rounded-xl' },
  ] as const;

  const fonts = [
    { id: 'inter', name: 'Inter', class: 'font-inter' },
    { id: 'roboto', name: 'Roboto', class: 'font-roboto' },
    { id: 'poppins', name: 'Poppins', class: 'font-poppins' },
    { id: 'playfair', name: 'Playfair', class: 'font-playfair' },
    { id: 'mono', name: 'Mono', class: 'font-mono' },
  ] as const;

  const allNavItems = [
    { id: '/news', label: 'News' },
    { id: '/clubs', label: 'Clubs' },
    { id: '/map', label: 'Map' },
    { id: '/academics', label: 'Academics' },
    { id: '/explore', label: 'Explore' },
    { id: '/groups', label: 'Groups' },
    { id: '/calendar', label: 'Calendar' },
  ];

  const toggleNavItem = (id: string) => {
    if (hiddenNavItems.includes(id)) {
      setHiddenNavItems(hiddenNavItems.filter(item => item !== id));
    } else {
      setHiddenNavItems([...hiddenNavItems, id]);
    }
  };

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
            className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-neutral-800 sticky top-0 bg-neutral-900/90 backdrop-blur-sm z-10">
              <h2 className="text-lg font-semibold text-neutral-100">Settings</h2>
              <button onClick={onClose} className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              <div>
                <h3 className="text-sm font-medium text-neutral-400 mb-3 uppercase tracking-wider">Appearance</h3>
                <div className="space-y-6">
                  <div>
                    <label className="text-sm text-neutral-200 mb-2 block">Accent Color</label>
                    <div className="flex flex-wrap gap-3">
                      {themes.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id)}
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110",
                            t.color,
                            theme === t.id ? "ring-2 ring-offset-2 ring-offset-neutral-900 ring-white" : ""
                          )}
                          title={t.name}
                        >
                          {theme === t.id && <Check className="w-4 h-4 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-neutral-200 mb-2 block">Border Radius</label>
                    <div className="flex flex-wrap gap-3">
                      {radii.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => setRadius(r.id as any)}
                          className={cn(
                            "px-4 py-2 bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 transition-colors hover:bg-neutral-700",
                            r.class,
                            radius === r.id ? "ring-2 ring-primary-500 border-transparent" : ""
                          )}
                          title={r.name}
                        >
                          {r.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-neutral-200 mb-2 block">App Font</label>
                    <div className="flex flex-wrap gap-3">
                      {fonts.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setFont(f.id as any)}
                          className={cn(
                            "px-4 py-2 bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 transition-colors hover:bg-neutral-700 rounded-lg",
                            f.class,
                            font === f.id ? "ring-2 ring-primary-500 border-transparent" : ""
                          )}
                          title={f.name}
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-neutral-400 mb-3 uppercase tracking-wider">Navigation Bar</h3>
                <p className="text-xs text-neutral-500 mb-3">Choose which tabs appear directly in the top bar. Unchecked items will be moved to the "More" menu.</p>
                <div className="space-y-2">
                  {allNavItems.map(item => (
                    <label key={item.id} className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-800 cursor-pointer hover:border-neutral-700 transition-colors">
                      <span className="text-sm text-neutral-200">{item.label}</span>
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 accent-primary-500" 
                        checked={!hiddenNavItems.includes(item.id)}
                        onChange={() => toggleNavItem(item.id)}
                      />
                    </label>
                  ))}
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
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [hiddenNavItems, setHiddenNavItems] = useState<string[]>(() => {
    const saved = localStorage.getItem('hiddenNavItems_v2');
    return saved ? JSON.parse(saved) : ['/map', '/explore', '/calendar'];
  });
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useUser();

  useEffect(() => {
    localStorage.setItem('hiddenNavItems_v2', JSON.stringify(hiddenNavItems));
  }, [hiddenNavItems]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navItems = [
    { to: '/news', icon: Newspaper, label: 'News' },
    { to: '/clubs', icon: Tent, label: 'Clubs' },
    { to: '/map', icon: Map, label: 'Map' },
    { to: '/academics', icon: BookOpen, label: 'Academics' },
    { to: '/explore', icon: Compass, label: 'Explore' },
    { to: '/groups', icon: Users, label: 'Groups' },
    { to: '/calendar', icon: Calendar, label: 'Calendar' },
  ];

  const visibleItems = navItems.filter(item => !hiddenNavItems.includes(item.to));
  const moreItems = navItems.filter(item => hiddenNavItems.includes(item.to));

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
            {visibleItems.map((item) => (
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

            {moreItems.length > 0 && (
              <div className="relative" ref={moreDropdownRef}>
                <button
                  onClick={() => setIsMoreOpen(!isMoreOpen)}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isMoreOpen ? "text-primary-400 bg-neutral-900" : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
                  )}
                >
                  <MoreHorizontal className="w-4 h-4" />
                  More
                  <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isMoreOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {isMoreOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-48 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden z-50"
                    >
                      <div className="p-1">
                        {moreItems.map((item) => (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setIsMoreOpen(false)}
                            className={({ isActive }) => cn(
                              "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors",
                              isActive 
                                ? "text-primary-400 bg-primary-500/10" 
                                : "text-neutral-300 hover:text-white hover:bg-neutral-800"
                            )}
                          >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                          </NavLink>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
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
                    src={user?.photoURL || `https://picsum.photos/seed/${user?.uid || 'default'}/100/100`} 
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
                        <p className="text-sm font-medium text-white">{user?.displayName || 'Student'}</p>
                        <p className="text-xs text-neutral-400 truncate">{user?.email || 'student@imamu.edu.sa'}</p>
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
      <nav className="md:hidden bg-neutral-950/80 backdrop-blur-xl border-t border-neutral-800/50 pb-safe z-40 relative">
        <div className="flex items-center justify-around h-16 px-2 relative">
          {visibleItems.map((item) => (
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

          {moreItems.length > 0 && (
            <button
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className={cn(
                "relative flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                isMoreOpen ? "text-primary-400" : "text-neutral-500 hover:text-neutral-300"
              )}
            >
              <span className="relative z-10 flex flex-col items-center gap-1">
                <MoreHorizontal className="w-5 h-5" />
                <span className="text-[10px] font-medium">More</span>
              </span>
            </button>
          )}

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

        {/* Mobile More Dropdown (opens upwards) */}
        <AnimatePresence>
          {isMoreOpen && moreItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-full left-0 right-0 mb-2 mx-4 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden z-50 md:hidden"
            >
              <div className="p-2 grid grid-cols-2 gap-2">
                {moreItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMoreOpen(false)}
                    className={({ isActive }) => cn(
                      "flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-colors",
                      isActive 
                        ? "text-primary-400 bg-primary-500/10" 
                        : "text-neutral-300 bg-neutral-800/50 hover:bg-neutral-800"
                    )}
                  >
                    <item.icon className="w-6 h-6" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        hiddenNavItems={hiddenNavItems}
        setHiddenNavItems={setHiddenNavItems}
      />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
