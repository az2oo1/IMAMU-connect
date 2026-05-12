import ConfirmModal from '../../components/ConfirmModal';
import { toast } from 'sonner';
import React, { useState, useEffect } from 'react';
import { X, Search, User, Shield, AlertTriangle, FileText, Link as LinkIcon, Users, MessageSquare, ExternalLink, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';

interface AdminUserProfileModalProps {
  userId: string;
  onClose: () => void;
  onUpdated?: () => void;
}

export default function AdminUserProfileModal({ userId, onClose, onUpdated }: AdminUserProfileModalProps) {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isBanning, setIsBanning] = useState(false);
  const [isWarning, setIsWarning] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningReason, setWarningReason] = useState('');
  const [warningDuration, setWarningDuration] = useState('forever');

  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, config: null | {title: string, message: string, onConfirm: () => void, isDestructive?: boolean}}>({ isOpen: false, config: null });

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

  const handleRemoveWarning = async (warningId: string) => {
    setConfirmModal({
      isOpen: true,
      config: {
        title: 'Remove Warning',
        message: 'Are you sure you want to remove this warning? This action cannot be undone.',
        isDestructive: true,
        onConfirm: async () => {
          setConfirmModal({ isOpen: false, config: null });
          try {
            const res = await fetch(`/api/admin/warnings/${warningId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
              toast.success('Warning removed');
              fetchProfile();
              onUpdated?.();
            } else {
               toast.error('Failed to remove warning.');
            }
          } catch(e) {
            console.error(e);
            toast.error('Failed to remove warning.');
          }
        }
      }
    });
  };

  const handleToggleBan = async () => {
    setConfirmModal({
      isOpen: true,
      config: {
        title: user.isBanned ? 'Unban User' : 'Ban User',
        message: `Are you sure you want to ${user.isBanned ? 'unban' : 'ban'} this user?`,
        isDestructive: !user.isBanned,
        onConfirm: async () => {
          setConfirmModal({ isOpen: false, config: null });
          setIsBanning(true);
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
              toast.success(user.isBanned ? 'User unbanned' : 'User banned');
              fetchProfile();
              onUpdated?.();
            } else {
              toast.error('Failed to update ban status');
            }
          } catch (e) {
            console.error('Failed to toggle ban', e);
            toast.error('Failed to update ban status');
          } finally {
            setIsBanning(false);
          }
        }
      }
    });
  };

  const handleWarnUser = async () => {
    if (!warningReason) return;
    setIsWarning(true);
    try {
       const res = await fetch(`/api/admin/users/${user.id}/warn`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           Authorization: `Bearer ${localStorage.getItem('token')}`
         },
         body: JSON.stringify({ reason: warningReason, duration: warningDuration })
       });
       
       // Also attempt to notify via chat
       await fetch(`/api/dms/start`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           Authorization: `Bearer ${localStorage.getItem('token')}`
         },
         body: JSON.stringify({ targetUserId: user.id })
       }).then(r => r.json()).then(async data => {
          if (data.group) {
              await fetch(`/api/groups/${data.group.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ content: `[SYSTEM WARNING]: ${warningReason}` })
              });
          }
       }).catch(console.error);

       if(res.ok) {
          toast.success('Warning sent to user.');
          setShowWarningModal(false);
          setWarningReason('');
          fetchProfile();
          onUpdated?.();
       } else {
         toast.error('Failed to send warning.');
       }
    } catch(e) {
       console.error(e);
       toast.error('Failed to send warning.');
    } finally {
       setIsWarning(false);
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
        toast.error('Failed to start a conversation with this user');
      }
    } catch (e) {
      console.error('Failed to start chat', e);
    }
  };

  return (
    <>
      <ConfirmModal 
        isOpen={confirmModal.isOpen} 
        title={confirmModal.config?.title || ''}
        message={confirmModal.config?.message || ''}
        isDestructive={confirmModal.config?.isDestructive}
        onConfirm={() => confirmModal.config?.onConfirm()}
        onCancel={() => setConfirmModal({ isOpen: false, config: null })}
      />
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
              src={user.avatarUrl} 
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
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg shadow-sm p-4">
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
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg shadow-sm p-4">
               <h3 className="text-sm font-bold text-neutral-300 mb-3 flex items-center gap-2">
                 <Shield className="w-4 h-4 text-red-400" /> Admin Tools
               </h3>
               
               {/* Warning Process Line */}
               {user.warnings && (
                 <div className="mb-4 p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
                   <div className="flex justify-between items-center mb-2">
                     <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Warning Level</span>
                     <span className="text-xs text-neutral-500">{user.warnings.length} / 3</span>
                   </div>
                   <div className="flex gap-2">
                     {[1, 2, 3].map((step) => {
                       const isActive = user.warnings.length >= step;
                       const isBanStep = step === 3;
                       return (
                         <div key={step} className="flex-1 h-2 rounded-full bg-neutral-800 overflow-hidden relative">
                           {isActive && (
                             <div className={clsx("absolute inset-0", isBanStep ? "bg-red-500" : "bg-yellow-500")}></div>
                           )}
                         </div>
                       );
                     })}
                   </div>
                   <p className="text-xs text-neutral-500 mt-2">
                     {user.warnings.length >= 3 ? 'User is banned (max warnings reached).' : `User has ${user.warnings.length} warnings. 3 warnings = automatic ban.`}
                   </p>
                   {user.warnings.length > 0 && (
                     <div className="mt-3 space-y-2">
                       {user.warnings.map((w: any) => (
                         <div key={w.id} className="bg-neutral-900 border border-neutral-800 rounded p-2 text-xs text-neutral-300 flex items-start gap-2 justify-between">
                           <div>
                             <p className="font-semibold">{w.reason}</p>
                             <p className="text-neutral-500 mt-0.5">
                               Issued: {new Date(w.createdAt).toLocaleDateString()}
                               {w.expiresAt && ` • Expires: ${new Date(w.expiresAt).toLocaleDateString()}`}
                             </p>
                           </div>
                           <button 
                             onClick={() => handleRemoveWarning(w.id)}
                             className="text-red-400 hover:text-red-300 hover:bg-neutral-800 p-1 rounded"
                             title="Remove Warning"
                           >
                             <X className="w-3.5 h-3.5" />
                           </button>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
               )}

               <div className="space-y-2">
                 <button 
                   onClick={handleToggleBan}
                   disabled={isBanning}
                   className={clsx(
                     "w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors border border-neutral-800 flex items-center justify-center gap-2",
                     user.isBanned ? "bg-neutral-800 text-neutral-300 hover:text-white border-neutral-700 hover:border-neutral-600 disabled:opacity-50" : "bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20 disabled:opacity-50"
                   )}
                 >
                   {isBanning && <Loader2 className="w-4 h-4 animate-spin" />}
                   {user.isBanned ? (isBanning ? 'Unbanning...' : 'Remove Account Ban') : (isBanning ? 'Banning...' : 'Suspend / Ban Account')}
                 </button>
                 <button 
                   onClick={() => setShowWarningModal(true)}
                   disabled={isWarning}
                   className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 text-sm font-medium rounded-lg transition-colors border border-yellow-500/20 disabled:opacity-50"
                 >
                   {isWarning && <Loader2 className="w-4 h-4 animate-spin" />}
                   {isWarning ? 'Sending...' : 'Send Official Warning'}
                 </button>
               </div>
            </div>

            {/* Links */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-bold text-neutral-300 mb-3 flex items-center gap-2">
                <LinkIcon className="w-4 h-4" /> Links
              </h3>
              {user.links && user.links.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {user.links?.map((link: any) => (
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
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-bold text-neutral-300 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" /> Groups & Courses
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-neutral-500 mb-2">Enrolled Courses</h4>
                  <div className="flex flex-wrap gap-2">
                    {user.enrollments?.map((e: any) => (
                      <span key={e.course?.id || Math.random()} className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-xs text-neutral-300">
                        {e.course?.code}
                      </span>
                    ))}
                    {(!user.enrollments || user.enrollments.length === 0) && <span className="text-xs text-neutral-500">None</span>}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-neutral-500 mb-2">Joined Groups</h4>
                  <div className="flex flex-wrap gap-2">
                    {user.memberOfGroups?.map((g: any) => (
                      <span key={g.id} className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-xs text-neutral-300">
                        {g.name}
                      </span>
                    ))}
                    {(!user.memberOfGroups || user.memberOfGroups.length === 0) && <span className="text-xs text-neutral-500">None</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Reports */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-bold text-neutral-300 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Reports
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">{reportsMade?.length || 0}</div>
                  <div className="text-xs text-neutral-500">Reports Made</div>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-400">{reportsReceived?.length || 0}</div>
                  <div className="text-xs text-neutral-500">Reports Received</div>
                </div>
              </div>
            </div>

            {/* Logs & Reports Authored */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg shadow-sm p-4 flex flex-col h-[300px]">
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
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg shadow-sm p-4 flex flex-col h-[400px]">
              <h3 className="text-sm font-bold text-neutral-300 mb-3 flex items-center gap-2 shrink-0">
                <FileText className="w-4 h-4" /> Activity Logs
              </h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                {user.logs && user.logs.length > 0 ? (
                  user.logs?.map((log: any) => (
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

      {/* Warning Modal Overlay */}
      <AnimatePresence>
        {showWarningModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6"
            >
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" /> Send Official Warning
              </h3>
              <p className="text-sm text-neutral-400 mb-6">
                This will send a system message to the user. After 3 warnings, the user will be automatically banned.
              </p>
              
              <div className="mb-4">
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Duration</label>
                <select
                  value={warningDuration}
                  onChange={e => setWarningDuration(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="1_week">1 Week</option>
                  <option value="1_month">1 Month</option>
                  <option value="2_months">2 Months</option>
                  <option value="3_months">3 Months</option>
                  <option value="1_year">1 Year</option>
                  <option value="forever">Forever</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Warning Reason</label>
                <textarea 
                  value={warningReason}
                  onChange={(e) => setWarningReason(e.target.value)}
                  placeholder="Explain why this user is receiving a warning..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-primary-500 min-h-[100px] resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowWarningModal(false)}
                  disabled={isWarning}
                  className="flex-1 py-2 bg-neutral-800 text-neutral-300 rounded-xl font-medium hover:bg-neutral-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleWarnUser}
                  disabled={isWarning || !warningReason}
                  className="flex-1 py-2 bg-yellow-500 text-yellow-950 font-bold rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isWarning ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Warning'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
}
