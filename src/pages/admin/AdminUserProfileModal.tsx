import React, { useState, useEffect } from 'react';
import { X, Search, User, Shield, AlertTriangle, FileText, Link as LinkIcon, Users, MessageSquare, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';

interface AdminUserProfileModalProps {
  userId: string;
  onClose: () => void;
}

export default function AdminUserProfileModal({ userId, onClose }: AdminUserProfileModalProps) {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/profile`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('Failed to fetch user profile', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="text-white">Loading profile...</div>
      </div>
    );
  }

  if (!profile || !profile.user) return null;

  const { user, reportsMade, reportsReceived } = profile;

  const handleToggleBan = async () => {
    if (!confirm(`Are you sure you want to ${user.isBanned ? 'unban' : 'ban'} this user?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ isBanned: !user.isBanned })
      });
      if (res.ok) {
        fetchProfile();
      }
    } catch (e) {
      console.error('Failed to toggle ban', e);
    }
  };

  const handleWarnUser = async () => {
    const reason = prompt('Enter reason for warning (this will be sent as a system message):');
    if (!reason) return;
    try {
       const res = await fetch(`/api/admin/users/${user.id}/warn`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           Authorization: `Bearer ${localStorage.getItem('token')}`
         },
         body: JSON.stringify({ reason })
       });
       
       // Also attempt to notify via chat if API is available
       await fetch(`/api/dms/start`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           Authorization: `Bearer ${localStorage.getItem('token')}`
         },
         body: JSON.stringify({ targetUserId: user.id })
       }).then(res => res.json()).then(async data => {
          if (data.group) {
              await fetch(`/api/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ groupId: data.group.id, content: `[SYSTEM WARNING]: ${reason}` })
              });
          }
       }).catch(console.error);

       if(res.ok) {
          alert('Warning sent to user.');
          fetchProfile();
       } else {
         alert('Failed to send warning.');
       }
    } catch(e) {
       console.error(e);
    }
  };

  const handleMessageUser = async () => {
    try {
      const res = await fetch('/api/dms/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ targetUserId: userId })
      });
      if (res.ok) {
        const data = await res.json();
        onClose();
        navigate(`/messages?id=${data.group.id}`);
      } else {
        alert('Failed to start a conversation with this user');
      }
    } catch (e) {
      console.error('Failed to start chat', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
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
        className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-900">
          <div className="flex items-center gap-4">
            <img 
              src={user.avatarUrl || `https://picsum.photos/seed/${user.id}/100/100`} 
              alt={user.name} 
              className="w-12 h-12 rounded-full border border-neutral-700"
              referrerPolicy="no-referrer"
            />
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {user.name}
                {user.role === 'ADMIN' && <Shield className="w-4 h-4 text-red-500" />}
              </h2>
              <p className="text-sm text-neutral-400">@{user.username} • {user.studentEmail || user.googleEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                onClose();
                navigate(`/profile/${user.username}`);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-medium rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Public Profile
            </button>
            <button 
              onClick={handleMessageUser}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Message
            </button>
            <button onClick={onClose} className="text-neutral-400 hover:text-white bg-neutral-800 rounded-full p-2 transition-colors ml-2">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
              <h3 className="text-sm font-bold text-neutral-300 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" /> Profile Details
              </h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-neutral-500">Bio:</span> <span className="text-neutral-300">{user.bio || 'No bio'}</span></p>
                <p><span className="text-neutral-500">Joined:</span> <span className="text-neutral-300">{new Date(user.createdAt).toLocaleDateString()}</span></p>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-neutral-800">
                  <span className="text-neutral-500">Status:</span> 
                  <span className={clsx("font-medium px-2 py-0.5 rounded text-xs", user.isBanned ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400")}>
                    {user.isBanned ? 'Banned' : 'Active'}
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Actions */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
               <h3 className="text-sm font-bold text-neutral-300 mb-3 flex items-center gap-2">
                 <Shield className="w-4 h-4 text-red-400" /> Admin Tools
               </h3>
               <div className="space-y-2">
                 <button 
                   onClick={handleToggleBan}
                   className={clsx(
                     "w-full text-left px-3 py-2 text-sm font-medium rounded-lg transition-colors border",
                     user.isBanned ? "bg-neutral-800 text-neutral-300 hover:text-white border-neutral-700 hover:border-neutral-600" : "bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20"
                   )}
                 >
                   {user.isBanned ? 'Remove Account Ban' : 'Suspend / Ban Account'}
                 </button>
                 <button 
                   onClick={handleWarnUser}
                   className="w-full text-left px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 text-sm font-medium rounded-lg transition-colors border border-yellow-500/20"
                 >
                   Send Official Warning
                 </button>
               </div>
            </div>

            {/* Links */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
              <h3 className="text-sm font-bold text-neutral-300 mb-3 flex items-center gap-2">
                <LinkIcon className="w-4 h-4" /> Links
              </h3>
              {user.links && user.links.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {user.links.map((link: any) => (
                    <li key={link.id}>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline break-all">
                        {link.url}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-neutral-500">No links added.</p>
              )}
            </div>

            {/* Groups & Courses */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
              <h3 className="text-sm font-bold text-neutral-300 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" /> Groups & Courses
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-neutral-500 mb-2">Enrolled Courses</h4>
                  <div className="flex flex-wrap gap-2">
                    {user.enrollments.map((e: any) => (
                      <span key={e.course.id} className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-xs text-neutral-300">
                        {e.course.code}
                      </span>
                    ))}
                    {user.enrollments.length === 0 && <span className="text-xs text-neutral-500">None</span>}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-neutral-500 mb-2">Joined Groups</h4>
                  <div className="flex flex-wrap gap-2">
                    {user.memberOfGroups.map((g: any) => (
                      <span key={g.id} className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-xs text-neutral-300">
                        {g.name}
                      </span>
                    ))}
                    {user.memberOfGroups.length === 0 && <span className="text-xs text-neutral-500">None</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Reports */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
              <h3 className="text-sm font-bold text-neutral-300 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Reports
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">{reportsMade.length}</div>
                  <div className="text-xs text-neutral-500">Reports Made</div>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-400">{reportsReceived.length}</div>
                  <div className="text-xs text-neutral-500">Reports Received</div>
                </div>
              </div>
            </div>

            {/* Logs & Reports Authored */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col h-[300px]">
              <h3 className="text-sm font-bold text-neutral-300 mb-3 flex items-center gap-2 shrink-0">
                <AlertTriangle className="w-4 h-4 text-yellow-500" /> Recent Reports Made
              </h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                {reportsMade && reportsMade.length > 0 ? (
                  reportsMade.map((r: any) => (
                    <div key={r.id} className="text-sm border-l-2 border-yellow-500/50 pl-3 py-1 bg-neutral-900 rounded-r-lg">
                      <p className="text-neutral-300 font-medium">Reported {r.type}</p>
                      <p className="text-neutral-500 text-xs mt-0.5">Reason: {r.reason}</p>
                      <p className="text-neutral-600 text-[10px] mt-1">{new Date(r.createdAt).toLocaleString()} <span className={clsx("ml-1 font-bold", r.status === 'PENDING' ? 'text-yellow-500' : 'text-neutral-500')}>{r.status}</span></p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-neutral-500 text-center py-4">Has not filed any reports.</p>
                )}
              </div>
            </div>

            {/* Logs */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col h-[200px]">
              <h3 className="text-sm font-bold text-neutral-300 mb-3 flex items-center gap-2 shrink-0">
                <FileText className="w-4 h-4" /> Activity Logs
              </h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                {user.logs && user.logs.length > 0 ? (
                  user.logs.map((log: any) => (
                    <div key={log.id} className="text-sm border-l-2 border-neutral-700 pl-3 py-1">
                      <p className="text-neutral-300 font-medium">{log.action}</p>
                      {log.details && <p className="text-neutral-500 text-xs mt-0.5">{log.details}</p>}
                      <p className="text-neutral-600 text-[10px] mt-1">{new Date(log.createdAt).toLocaleString()}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-neutral-500 text-center py-4">No activity logs found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
