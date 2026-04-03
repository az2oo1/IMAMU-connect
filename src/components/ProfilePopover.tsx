import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProfilePopoverProps {
  children: React.ReactNode;
  key?: React.Key;
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
  const [position, setPosition] = useState<'bottom' | 'top'>('bottom');
  const [hPosition, setHPosition] = useState<'left' | 'right'>('left');
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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
    window.addEventListener("scroll", handleScroll, true); // Use capture phase to catch all scrolls
    
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
      const spaceRight = window.innerWidth - rect.left;
      
      let newPos: 'bottom' | 'top' = 'bottom';
      let newHPos: 'left' | 'right' = 'left';

      // Vertical positioning
      if (spaceBelow < 300 && spaceAbove > spaceBelow) {
        newPos = 'top';
      } else {
        newPos = 'bottom';
      }

      // Horizontal positioning (popover is w-72 which is 288px)
      if (spaceRight < 300) {
        newHPos = 'right';
      } else {
        newHPos = 'left';
      }

      setPosition(newPos);
      setHPosition(newHPos);
      
      // Calculate fixed coordinates
      setCoords({
        top: newPos === 'bottom' ? rect.bottom + 8 : rect.top - 8,
        left: newHPos === 'left' ? rect.left : rect.right
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
          {isOpen && (
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
                transform: `${position === 'top' ? 'translateY(-100%)' : ''} ${hPosition === 'right' ? 'translateX(-100%)' : ''}`,
                zIndex: 99999
              }}
              className="w-72 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden"
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
                  navigate(`/profile/${user.handle}`);
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
