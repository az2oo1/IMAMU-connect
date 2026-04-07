import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Map, BookOpen, Compass, Users, User, Settings, LogOut, X, Check, Newspaper, Shield, Tent, ChevronDown, MoreHorizontal, Calendar, Bookmark, Bell } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTheme } from '../ThemeContext';
import { useUser } from '../contexts/UserContext';
import { motion, AnimatePresence } from 'motion/react';
import AuthModal from './AuthModal';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Layout() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useUser();
  const { navOrder, hiddenNavItems } = useTheme();

  const [notifications, setNotifications] = useState<any[]>([]);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.notifications) {
          setNotifications(data.notifications);
        }
      })
      .catch(console.error);
    }
  }, [isAuthenticated]);

  const handleOpenNotifications = () => {
    const willOpen = !isNotificationsOpen;
    setIsNotificationsOpen(willOpen);
    
    if (willOpen && unreadCount > 0) {
      fetch('/api/notifications/read', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }).then(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }).catch(console.error);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const ALL_NAV_ITEMS = [
    { to: '/news', icon: Newspaper, label: 'News' },
    { to: '/clubs', icon: Tent, label: 'Clubs' },
    { to: '/map', icon: Map, label: 'Map' },
    { to: '/academics', icon: BookOpen, label: 'Academics' },
    { to: '/explore', icon: Compass, label: 'Explore' },
    { to: '/groups', icon: Users, label: 'Groups' },
    { to: '/calendar', icon: Calendar, label: 'Calendar' },
  ];

  const sortedNavItems = [...ALL_NAV_ITEMS].sort((a, b) => {
    const indexA = navOrder.indexOf(a.to);
    const indexB = navOrder.indexOf(b.to);
    return (indexA !== -1 ? indexA : 99) - (indexB !== -1 ? indexB : 99);
  });

  const visibleItems = sortedNavItems.filter(item => !hiddenNavItems.includes(item.to));
  const moreItems = sortedNavItems.filter(item => hiddenNavItems.includes(item.to));

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
          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <div className="relative" ref={notificationsRef}>
                <button 
                  onClick={handleOpenNotifications}
                  className="relative p-2 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-full transition-colors focus:outline-none"
                >
                  <Bell className="w-5 h-5" />
                  {/* Unread badge indicator */}
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-neutral-950"></span>
                  )}
                </button>

                <AnimatePresence>
                  {isNotificationsOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-80 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col"
                    >
                      <div className="p-3 border-b border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white">Notifications</h3>
                      </div>
                      <div className="max-h-80 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-neutral-500 text-sm">
                            No notifications yet.
                          </div>
                        ) : (
                          notifications.slice(0, 5).map(notification => (
                            <div 
                              key={notification.id} 
                              onClick={() => {
                                setIsNotificationsOpen(false);
                                if (notification.link) {
                                  navigate(notification.link);
                                }
                              }}
                              className="p-3 hover:bg-neutral-800 rounded-lg cursor-pointer transition-colors"
                            >
                              <p className="text-sm text-neutral-200">{notification.content}</p>
                              <p className="text-xs text-neutral-500 mt-1">
                                {new Date(notification.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="p-2 border-t border-neutral-800">
                        <button 
                          onClick={() => {
                            navigate('/notifications');
                            setIsNotificationsOpen(false);
                          }}
                          className="w-full py-2 text-sm text-primary-400 hover:text-primary-300 font-medium text-center transition-colors"
                        >
                          View all notifications
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="relative" ref={dropdownRef}>
            {isAuthenticated ? (
              <>
                <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 hover:bg-neutral-900 p-1.5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                >
                  <img 
                    src={user?.avatarUrl || `https://picsum.photos/seed/${user?.id || 'default'}/100/100`} 
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
                        <p className="text-sm font-medium text-white">{user?.name || user?.username || 'Student'}</p>
                        <p className="text-xs text-neutral-400 truncate">{user?.studentEmail || `@${user?.username}`}</p>
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
                            navigate('/saved');
                            setIsProfileOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                        >
                          <Bookmark className="w-4 h-4" />
                          Saved
                        </button>
                        <button 
                          onClick={() => {
                            navigate('/settings');
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

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
