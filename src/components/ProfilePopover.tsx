import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProfilePopoverProps {
  children: React.ReactNode;
  user: {
    name: string;
    handle: string;
    avatar: string;
    banner?: string;
    bio: string;
    isFollowing?: boolean;
  };
}

export default function ProfilePopover({ children, user }: ProfilePopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(user.isFollowing || false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {children}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full left-0 mt-2 w-72 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Banner */}
            <div 
              className="h-20 bg-neutral-800 w-full"
              style={{
                backgroundImage: `url(${user.banner || 'https://picsum.photos/seed/banner/400/200'})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
            
            <div className="px-4 pb-4">
              {/* Profile Pic & Follow Button */}
              <div className="flex justify-between items-end -mt-8 mb-3">
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  className="w-16 h-16 rounded-full border-4 border-neutral-900 object-cover bg-neutral-800"
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFollowing(!isFollowing);
                  }}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    isFollowing 
                      ? 'bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700' 
                      : 'bg-white text-black hover:bg-neutral-200'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>

              {/* User Info */}
              <div>
                <h4 className="font-bold text-white text-lg leading-tight">{user.name}</h4>
                <p className="text-neutral-500 text-sm mb-3">@{user.handle}</p>
                <p className="text-neutral-300 text-sm mb-4 line-clamp-3">
                  {user.bio}
                </p>
              </div>

              {/* View Profile Button */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  navigate('/personal'); // In a real app, navigate to /profile/:handle
                }}
                className="w-full flex items-center justify-center gap-2 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-colors text-sm font-medium"
              >
                <User className="w-4 h-4" />
                View Profile
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
