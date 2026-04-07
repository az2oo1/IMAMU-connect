import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProfilePopoverProps {
  children: React.ReactNode;
  key?: React.Key;
  username?: string;
  user?: {
    name: string;
    handle: string;
    avatar: string;
    banner?: string;
    bio: string;
    isFollowing?: boolean;
  };
}

export default function ProfilePopover({ children, username, user: initialUser }: ProfilePopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [fetchedUser, setFetchedUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(initialUser?.isFollowing || false);
  const [position, setPosition] = useState<'bottom' | 'top'>('bottom');
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const displayUser = fetchedUser ? {
    name: fetchedUser.name || fetchedUser.username,
    handle: fetchedUser.username,
    avatar: fetchedUser.avatarUrl || `https://picsum.photos/seed/${fetchedUser.id}/150/150`,
    banner: fetchedUser.bannerUrl || `https://picsum.photos/seed/${fetchedUser.id}_banner/400/200`,
    bio: fetchedUser.bio || 'No bio added yet.',
  } : initialUser;

  useEffect(() => {
    if (isOpen && username && !fetchedUser && !loading) {
      setLoading(true);
      fetch(`/api/users/${username}`)
        .then(res => res.json())
        .then(data => {
          if (data.user) setFetchedUser(data.user);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, username, fetchedUser, loading]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node) && 
          triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    function handleScroll() {
      if (isOpen) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      let newPos: 'bottom' | 'top' = 'bottom';

      if (spaceBelow < 300 && spaceAbove > spaceBelow) {
        newPos = 'top';
      } else {
        newPos = 'bottom';
      }

      setPosition(newPos);
      
      // Calculate horizontal position to keep it on screen
      const popoverWidth = 288; // w-72 = 18rem = 288px
      let left = rect.left;
      
      // If it goes off the right edge, align it to the right edge of the screen with some padding
      if (left + popoverWidth > window.innerWidth - 16) {
        left = window.innerWidth - popoverWidth - 16;
      }
      // If it goes off the left edge (unlikely but possible), align to left edge
      if (left < 16) {
        left = 16;
      }

      setCoords({
        top: newPos === 'bottom' ? rect.bottom + 8 : rect.top - 8,
        left: left
      });
    }
  }, [isOpen]);

  return (
    <>
      <span ref={triggerRef} onClick={() => setIsOpen(!isOpen)} className="cursor-pointer inline-block">
        {children}
      </span>

      {createPortal(
        <AnimatePresence>
          {isOpen && displayUser && (
            <motion.div
              ref={popoverRef}
              initial={{ opacity: 0, y: position === 'top' ? 10 : -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: position === 'top' ? 10 : -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'fixed',
                top: coords.top,
                left: coords.left,
                transform: `${position === 'top' ? 'translateY(-100%)' : ''}`,
                zIndex: 99999
              }}
              className="w-72 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden"
            >
            {/* Banner */}
            <div 
              className="h-20 bg-neutral-800 w-full"
              style={{
                backgroundImage: `url(${displayUser.banner || 'https://picsum.photos/seed/banner/400/200'})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
            
            <div className="px-4 pb-4">
              {/* Profile Pic & Follow Button */}
              <div className="flex justify-between items-end -mt-8 mb-3">
                <img 
                  src={displayUser.avatar} 
                  alt={displayUser.name} 
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
                <h4 className="font-bold text-white text-lg leading-tight">{displayUser.name}</h4>
                <p className="text-neutral-500 text-sm mb-3">@{displayUser.handle}</p>
                <p className="text-neutral-300 text-sm mb-4 line-clamp-3">
                  {loading ? 'Loading...' : displayUser.bio}
                </p>
              </div>

              {/* View Profile Button */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  navigate(`/profile/${displayUser.handle}`);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-colors text-sm font-medium"
              >
                <User className="w-4 h-4" />
                View Profile
              </button>
            </div>
          </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
