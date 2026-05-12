import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Check, X as XIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import OptimizedImage from './OptimizedImage';
import { useUser } from '../contexts/UserContext';
import { toast } from 'sonner';

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  initialTab?: 'followers' | 'following' | 'requests';
}

export default function FollowListModal({ isOpen, onClose, username, initialTab = 'followers' }: FollowListModalProps) {
  const [activeTab, setActiveTab] = useState<'followers' | 'following' | 'requests'>(initialTab);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user: currentUser } = useUser();

  const isOwnProfile = currentUser && currentUser.username === username;
  const showRequestsTab = isOwnProfile;

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!isOpen || !username) return;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`/api/users/${username}/${activeTab}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setUsers(data[activeTab] || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen, username, activeTab]);

  const handleAcceptRequest = async (e: React.MouseEvent, targetId: string) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/users/${targetId}/accept-follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== targetId));
        toast.success("Request accepted");
      }
    } catch (e) {
      toast.error("Failed to accept");
    }
  };

  const handleRejectRequest = async (e: React.MouseEvent, targetId: string) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/users/${targetId}/reject-follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== targetId));
        toast.success("Request rejected");
      }
    } catch (e) {
      toast.error("Failed to reject");
    }
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm bg-[#1a1a1a] border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-800 shrink-0">
              <div className="w-8" /> {/* Spacer for centering */}
              <h2 className="text-lg font-bold text-white capitalize">{username}</h2>
              <button 
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-neutral-800 shrink-0 relative">
              <button
                onClick={() => setActiveTab('followers')}
                className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'followers' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
              >
                Followers
              </button>
              <button
                onClick={() => setActiveTab('following')}
                className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'following' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
              >
                Following
              </button>
              {showRequestsTab && (
                <button
                  onClick={() => setActiveTab('requests')}
                  className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'requests' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                  Requests
                </button>
              )}
              
              {/* Active Tab Indicator */}
              <div 
                className="absolute bottom-0 h-0.5 bg-white transition-all duration-300 ease-out"
                style={{
                  width: showRequestsTab ? '33.333%' : '50%',
                  left: activeTab === 'followers' ? '0%' : activeTab === 'following' ? (showRequestsTab ? '33.333%' : '50%') : '66.666%'
                }}
              />
            </div>

            {/* Search */}
            <div className="p-3 border-b border-neutral-800 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700 transition-colors"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 min-h-[300px]">
              {loading ? (
                <div className="flex justify-center items-center h-full text-neutral-500">
                  <div className="w-6 h-6 border-2 border-neutral-600 border-t-white rounded-full animate-spin" />
                </div>
              ) : filteredUsers.length > 0 ? (
                <div className="space-y-1">
                  {filteredUsers.map((user) => (
                    <Link
                      key={user.id}
                      to={user.isClub ? `/clubs/${user.id}` : `/user/${user.username}`}
                      onClick={onClose}
                      className="flex items-center gap-3 p-2 hover:bg-neutral-900/50 rounded-xl transition-colors group"
                    >
                      <OptimizedImage
                        src={user.avatarUrl}
                        alt={user.name || user.username}
                        variant="small"
                        className="w-12 h-12 rounded-full object-cover bg-neutral-900 shrink-0 border border-neutral-800 group-hover:border-neutral-700 transition-colors"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-neutral-200 text-sm truncate">{user.username}</span>
                          {user.isClub && (
                            <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-400">CLUB</span>
                          )}
                        </div>
                        {user.name && user.name !== user.username && (
                          <div className="text-neutral-500 text-sm truncate">{user.name}</div>
                        )}
                      </div>
                      {activeTab === 'requests' && (
                        <div className="flex items-center gap-2 pr-1">
                          <button
                            onClick={(e) => handleAcceptRequest(e, user.id)}
                            className="p-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-full transition-colors"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleRejectRequest(e, user.id)}
                            className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-full transition-colors"
                          >
                            <XIcon className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-2">
                  <p>No users found.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
