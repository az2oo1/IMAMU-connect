import React, { useState, useEffect } from 'react';
import { X, Search, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';
import AdminUserProfileModal from './AdminUserProfileModal';

interface CourseUsersModalProps {
  courseId: string;
  courseName: string;
  onClose: () => void;
}

export default function CourseUsersModal({ courseId, courseName, onClose }: CourseUsersModalProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`/api/admin/courses/${courseId}/users`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users);
        }
      } catch (error) {
        console.error('Failed to fetch course users', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, [courseId]);

  const filteredUsers = users.filter(user => 
    user?.name?.toLowerCase().includes(searchQuery?.toLowerCase() || '') ||
    user?.username?.toLowerCase().includes(searchQuery?.toLowerCase() || '') ||
    user?.studentEmail?.toLowerCase().includes(searchQuery?.toLowerCase() || '')
  );

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        >
          <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900">
            <div>
              <h3 className="font-bold text-lg text-white">Enrolled Users</h3>
              <p className="text-xs text-neutral-400">{courseName}</p>
            </div>
            <button onClick={onClose} className="text-neutral-400 hover:text-white bg-neutral-800 rounded-full p-1.5 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 border-b border-neutral-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input 
                type="text" 
                placeholder="Search users by name, username, or email..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary-500 text-neutral-200 transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            {isLoading ? (
              <div className="text-center text-neutral-500 py-8">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center text-neutral-500 py-8">No users found.</div>
            ) : (
              <div className="space-y-1">
                {filteredUsers.map(user => (
                  <div 
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className="flex items-center justify-between p-3 hover:bg-neutral-800 rounded-xl cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={user.avatarUrl || `https://picsum.photos/seed/${user.id}/100/100`} 
                        alt={user.name} 
                        className="w-10 h-10 rounded-full border border-neutral-700"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="font-medium text-neutral-200 group-hover:text-white transition-colors">{user.name}</div>
                        <div className="text-xs text-neutral-500">@{user.username}</div>
                      </div>
                    </div>
                    <div className="text-xs text-neutral-400 bg-neutral-950 px-2 py-1 rounded-md border border-neutral-800">
                      View Profile
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {selectedUserId && (
        <AdminUserProfileModal 
          userId={selectedUserId} 
          onClose={() => setSelectedUserId(null)} 
        />
      )}
    </>
  );
}
