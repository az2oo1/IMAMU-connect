import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, AlertTriangle, CheckCircle2, XCircle, FileText, User as UserIcon, Link as LinkIcon, Edit2, Copy, Inbox, Trash2, MessageSquare, FolderInput, ExternalLink, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import AdminUserProfileModal from './AdminUserProfileModal';

export default function ReportsTab() {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [activeTab, setActiveTab] = useState<'PENDING' | 'RESOLVED' | 'DISMISSED'>('PENDING');
  const navigate = useNavigate();

  const [moderationAction, setModerationAction] = useState<{
    report: any;
    actionType: string;
  } | null>(null);
  const [modalReason, setModalReason] = useState('');
  const [modalDuration, setModalDuration] = useState('7');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/reports', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports);
      }
    } catch (error) {
      console.error('Failed to fetch reports', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleUpdateStatus = async (id: string, status: string, adminNote?: string, resolutionMessage?: string): Promise<boolean> => {
    try {
      const payload: any = { status };
      if (adminNote !== undefined) payload.adminNote = adminNote;
      if (resolutionMessage !== undefined) payload.resolutionMessage = resolutionMessage;

      const res = await fetch(`/api/admin/reports/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await fetchReports();
        if (adminNote !== undefined) setEditingNoteId(null);
        return true;
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        alert(`Failed to update report: ${errorData.error || 'Unknown error'}`);
        return false;
      }
    } catch (error) {
      console.error('Failed to update report status', error);
      alert('Network error while updating report status');
      return false;
    }
  };

  const handleResolve = (report: any, nextStatus: string) => {
    setModalReason(report.resolutionMessage || '');
    setModerationAction({ report, actionType: nextStatus });
  };

  const startEditingNote = (report: any) => {
    setEditingNoteContent(report.adminNote || '');
    setEditingNoteId(report.id);
  };

  const saveAdminNote = (reportId: string, status: string) => {
    handleUpdateStatus(reportId, status, editingNoteContent);
  };

  const handleAction = async (report: any, actionType: 'DELETE_FILE' | 'DELETE_CLUB' | 'BAN_USER' | 'DELETE_MESSAGE') => {
    setModalReason('');
    setModerationAction({ report, actionType });
  };

  const handleMessageReporter = async (reportId: string) => {
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        navigate(`/messages?id=${data.group.id}`);
      } else {
        alert('Failed to start a conversation with the reporter.');
      }
    } catch (e) {
      console.error('Failed to start chat', e);
    }
  };

  const handleUserModeration = async (report: any, actionType: 'WARNING' | 'SUSPEND' | 'BAN') => {
    setModalReason(report.reason || '');
    setModalDuration('7');
    setModerationAction({ report, actionType });
  };

  const executeModeration = async () => {
    if (!moderationAction) return;
    const { report, actionType } = moderationAction;
    setIsSubmittingAction(true);

    try {
      const token = localStorage.getItem('token');
      
      // Destructive actions
      if (['DELETE_FILE', 'DELETE_CLUB', 'BAN_USER', 'WARNING', 'SUSPEND', 'BAN'].includes(actionType)) {
        let res;
        const targetUserId = report.reportedId || report.contentId;

        if (actionType === 'DELETE_FILE') {
          res = await fetch(`/api/files/${report.contentId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
        } else if (actionType === 'DELETE_CLUB') {
          res = await fetch(`/api/admin/clubs/${report.contentId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
        } else if (actionType === 'DELETE_MESSAGE') {
          // Find the group ID from context details or elsewhere if possible. 
          // If not available, we need a specific admin message delete endpoint.
          // The current endpoint /api/groups/:id/messages/:messageId works.
          // But we need the groupId. Let's assume contentId is messageId and we fetch group first if needed OR we use a generic endpoint.
          // Let's create a generic admin message delete endpoint in server.ts later if needed, 
          // but for now let's use the contentLink to find the groupId if we can.
          const groupId = report.contentLink?.split('=')[1];
          if (groupId) {
            res = await fetch(`/api/groups/${groupId}/messages/${report.contentId}?deleteForAll=true`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
            });
          }
        } else {
          // USER Moderation
          const type = actionType === 'BAN_USER' ? 'BAN' : actionType;
          res = await fetch(`/api/admin/users/${targetUserId}/action`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ 
              type, 
              reason: modalReason, 
              durationDays: actionType === 'SUSPEND' ? parseInt(modalDuration) : 0 
            })
          });
        }

        if (res && !res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.error('Action API failed', errData);
          alert(`Action failed: ${errData.error || 'Unknown error'}`);
          setIsSubmittingAction(false);
          return;
        }

        // Auto-resolve for serious actions
        if (['DELETE_FILE', 'DELETE_CLUB', 'BAN_USER', 'BAN'].includes(actionType)) {
          const updated = await handleUpdateStatus(report.id, 'RESOLVED', undefined, modalReason || `Action taken: ${actionType}`);
          if (updated) {
            setModerationAction(null);
          }
          setIsSubmittingAction(false);
          return;
        }
      }

      // Explicit status change
      if (['RESOLVED', 'DISMISSED'].includes(actionType)) {
        const updated = await handleUpdateStatus(report.id, actionType, undefined, modalReason);
        if (updated) {
          setModerationAction(null);
        }
      } else {
        setModerationAction(null);
      }
    } catch (e) {
      console.error('Moderation execution failed', e);
      alert('An unexpected error occurred during moderation.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter(report => 
      report.status === activeTab && (
        report.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [reports, activeTab, searchQuery]);

  const stats = useMemo(() => {
    return {
      PENDING: reports.filter(r => r.status === 'PENDING').length,
      RESOLVED: reports.filter(r => r.status === 'RESOLVED').length,
      DISMISSED: reports.filter(r => r.status === 'DISMISSED').length,
    };
  }, [reports]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Report Center</h2>
        <p className="text-neutral-400">Review and resolve user reports.</p>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input 
              type="text"
              placeholder="Search reports by reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            {(['PENDING', 'RESOLVED', 'DISMISSED'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  "flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors border",
                  activeTab === tab 
                    ? "bg-primary-500/10 text-primary-400 border-primary-500/20" 
                    : "bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-neutral-300"
                )}
              >
                {tab === 'PENDING' && <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />}
                {tab === 'RESOLVED' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                {tab === 'DISMISSED' && <XCircle className="w-3.5 h-3.5 text-neutral-500" />}
                {tab.charAt(0) + tab.slice(1).toLowerCase()}: {stats[tab]}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[800px] custom-scrollbar bg-neutral-950/50">
           {(isLoading && reports.length === 0) ? (
             <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
               <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mb-4" />
               <p>Loading reports...</p>
             </div>
           ) : filteredReports.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
               <Inbox className="w-12 h-12 mb-4 opacity-20" />
               <p>No reports found matching your criteria.</p>
             </div>
           ) : (
             <div className="grid gap-6">
               {filteredReports.map((report) => (
                 <div key={report.id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-lg flex flex-col">
                   <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800 bg-neutral-900/80">
                     <div className="flex items-center gap-3">
                       <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                         {report.type}
                       </span>
                       <span className="text-xs text-neutral-500 font-medium">
                         Reported on {new Date(report.createdAt).toLocaleString()}
                       </span>
                     </div>
                     <div>
                       <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold border ${
                         report.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                         report.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                         'bg-neutral-800 text-neutral-400 border-neutral-700'
                       }`}>
                         {report.status}
                       </span>
                     </div>
                   </div>
                   
                   <div className="p-5 flex flex-col md:flex-row gap-6">
                     <div className="flex-1 space-y-5">
                       {/* Target Details */}
                       <div>
                         <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2 flex items-center gap-2">Target Content</h4>
                         <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3">
                           <p className="text-sm text-neutral-200 break-words mb-2 font-medium">
                             {report.contentDetails || `ID: ${report.contentId}`}
                           </p>
                           
                           {/* Extra details for files */}
                           {report.type === 'FILE' && report.fileDetails && (
                             <div className="mb-3 space-y-1 bg-neutral-900 border border-neutral-800 p-2 rounded-md">
                               <p className="text-[11px] text-neutral-400 font-medium tracking-wide">
                                  Uploader: <button onClick={() => report.fileDetails.uploader && setViewingProfileId(report.fileDetails.uploader.id)} className={`text-neutral-200 ${report.fileDetails.uploader ? 'hover:underline hover:text-primary-400' : ''}`}>
                                    {report.fileDetails.isAnonymous ? 'Anonymous' : (report.fileDetails.uploader?.name || report.fileDetails.uploader?.username || 'Unknown')}
                                  </button>
                               </p>
                               <p className="text-[11px] text-neutral-400 font-medium tracking-wide">
                                  Approver: <button onClick={() => report.fileDetails.approver && setViewingProfileId(report.fileDetails.approver.id)} className={`text-neutral-200 ${report.fileDetails.approver ? 'hover:underline hover:text-primary-400' : ''}`}>
                                    {report.fileDetails.approver?.name || report.fileDetails.approver?.username || 'System/Unknown'}
                                  </button>
                               </p>
                               <p className="text-[11px] text-neutral-400 font-medium tracking-wide">
                                  Size: <span className="text-neutral-200">{report.fileDetails.size || 'Unknown'}</span>
                               </p>
                             </div>
                           )}

                           {report.contentLink && (
                             <a 
                               href={report.contentLink}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="inline-flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 bg-primary-500/10 hover:bg-primary-500/20 px-3 py-1.5 rounded-md transition-colors"
                             >
                               <LinkIcon className="w-3.5 h-3.5" />
                               View Reported Content
                             </a>
                           )}
                         </div>
                       </div>
                       
                       {/* Reason */}
                       <div>
                         <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-2 flex items-center gap-2">Violation Reason</h4>
                         <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                           <p className="text-sm text-neutral-200 leading-relaxed font-medium">"{report.reason}"</p>
                         </div>
                       </div>
                     </div>
                     
                     {/* Sidebar Data */}
                     <div className="w-full md:w-64 space-y-5">
                       {/* Reporter info */}
                       <div>
                         <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Filed By</h4>
                         {report.reporter ? (
                           <React.Fragment>
                           <button onClick={() => setViewingProfileId(report.reporterId)} className="w-full text-left bg-neutral-950 border border-neutral-800 rounded-lg p-3 hover:border-neutral-700 transition-colors group flex items-center gap-3">
                             {report.reporter.avatarUrl ? (
                               <img src={report.reporter.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                             ) : (
                               <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center shrink-0">
                                 <UserIcon className="w-5 h-5 text-neutral-400" />
                               </div>
                             )}
                             <div className="overflow-hidden">
                               <p className="text-sm font-medium text-neutral-200 truncate group-hover:text-primary-400 transition-colors">
                                 {report.reporter.name || report.reporter.username}
                               </p>
                               <p className="text-xs text-neutral-500 truncate">@{report.reporter.username}</p>
                             </div>
                           </button>
                           {report.reporter && (
                             <button
                               onClick={(e) => { e.stopPropagation(); handleMessageReporter(report.id); }}
                               className="mt-2 w-full flex items-center justify-center gap-2 py-1.5 bg-primary-600/10 border border-primary-500/20 hover:border-primary-500 text-primary-400 hover:text-primary-300 text-xs font-medium rounded-lg transition-colors"
                             >
                               <MessageSquare className="w-3.5 h-3.5" /> Start Support Chat
                             </button>
                           )}
                           </React.Fragment>
                         ) : (
                           <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm text-neutral-500">
                             Unknown User
                           </div>
                         )}
                       </div>

                       {/* Admin Actions */}
                       <div>
                         <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Actions</h4>
                         <div className="flex flex-col gap-2">
                           
                           {/* Quick Action Based on Type */}
                           {report.status === 'PENDING' && (
                             <div className="mb-2 pb-2 border-b border-neutral-800 space-y-2">
                               {report.type === 'FILE' && (
                                 <>
                                   <button onClick={(e) => { e.stopPropagation(); navigate(`/academics?fileId=${report.contentId}`); }} className="w-full flex items-center justify-center gap-2 py-2 bg-primary-600/10 text-primary-400 hover:bg-primary-600/20 hover:text-primary-300 border border-primary-500/20 text-sm font-medium rounded-lg transition-colors">
                                     <ExternalLink className="w-4 h-4" /> Go to File
                                   </button>
                                   <button onClick={(e) => { e.stopPropagation(); handleAction(report, 'DELETE_FILE'); }} className="w-full flex items-center justify-center gap-2 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-sm font-medium rounded-lg transition-colors">
                                     <Trash2 className="w-4 h-4" /> Delete File
                                   </button>
                                 </>
                               )}
                               {report.type === 'CLUB' && (
                                 <button onClick={(e) => { e.stopPropagation(); handleAction(report, 'DELETE_CLUB'); }} className="w-full flex items-center justify-center gap-2 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-sm font-medium rounded-lg transition-colors">
                                   <Trash2 className="w-4 h-4" /> Delete Club
                                  </button>
                               )}
                               {report.type === 'MESSAGE' && (
                                 <>
                                   <button onClick={(e) => { e.stopPropagation(); navigate(`/messages?id=${report.contentLink?.split('=')[1]}`); }} className="w-full flex items-center justify-center gap-2 py-2 bg-primary-600/10 text-primary-400 hover:bg-primary-600/20 hover:text-primary-300 border border-primary-500/20 text-sm font-medium rounded-lg transition-colors">
                                     <MessageSquare className="w-4 h-4" /> Go to Chat
                                   </button>
                                   <button onClick={(e) => { e.stopPropagation(); handleAction(report, 'DELETE_MESSAGE'); }} className="w-full flex items-center justify-center gap-2 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-sm font-medium rounded-lg transition-colors">
                                     <Trash2 className="w-4 h-4" /> Delete Message
                                   </button>
                                 </>
                               )}
                               {report.type === 'USER' && (
                                 <div className="space-y-2">
                                   <button onClick={(e) => { e.stopPropagation(); handleUserModeration(report, 'WARNING'); }} className="w-full flex items-center justify-center gap-2 py-2 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border border-yellow-500/20 text-sm font-medium rounded-lg transition-colors">
                                     <AlertTriangle className="w-4 h-4" /> Send Warning
                                   </button>
                                   <button onClick={(e) => { e.stopPropagation(); handleUserModeration(report, 'SUSPEND'); }} className="w-full flex items-center justify-center gap-2 py-2 bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border border-orange-500/20 text-sm font-medium rounded-lg transition-colors">
                                     <Clock className="w-4 h-4" /> Suspend Account
                                   </button>
                                   <button onClick={(e) => { e.stopPropagation(); handleUserModeration(report, 'BAN'); }} className="w-full flex items-center justify-center gap-2 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-sm font-medium rounded-lg transition-colors">
                                     <AlertTriangle className="w-4 h-4" /> Permanent Ban
                                   </button>
                                 </div>
                               )}
                             </div>
                           )}

                           {report.status === 'PENDING' ? (
                             <>
                               <button 
                                 onClick={(e) => { e.stopPropagation(); handleResolve(report, 'RESOLVED'); }}
                                 className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-sm font-medium rounded-lg transition-colors"
                               >
                                 <CheckCircle2 className="w-4 h-4" /> Resolve Report
                               </button>
                               <button 
                                 onClick={(e) => { e.stopPropagation(); handleResolve(report, 'DISMISSED'); }}
                                 className="w-full flex items-center justify-center gap-2 py-2 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white border border-neutral-700 text-sm font-medium rounded-lg transition-colors"
                               >
                                 <XCircle className="w-4 h-4" /> Dismiss Report
                               </button>
                             </>
                           ) : (
                             <button 
                               onClick={(e) => { e.stopPropagation(); handleUpdateStatus(report.id, 'PENDING'); }}
                               className="w-full py-2 bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700 text-sm font-medium rounded-lg transition-colors"
                             >
                               Reopen Report
                             </button>
                           )}
                         </div>
                       </div>
                     </div>
                   </div>
                   
                   {/* Admin Note Section */}
                   <div className="border-t border-neutral-800 bg-neutral-950/80 px-5 py-4 space-y-4">
                     {editingNoteId === report.id ? (
                       <div className="flex flex-col gap-3">
                         <div className="flex items-center justify-between">
                           <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Edit Internal Admin Note</h4>
                           <button onClick={() => setEditingNoteId(null)} className="text-xs text-neutral-400 hover:text-neutral-300">Cancel</button>
                         </div>
                         <textarea
                           value={editingNoteContent}
                           onChange={(e) => setEditingNoteContent(e.target.value)}
                           placeholder="Internal moderation context, private details, or actions taken..."
                           className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-sm text-neutral-200 focus:outline-none focus:border-primary-500 min-h-[100px] resize-y"
                         />
                         <button 
                           onClick={() => saveAdminNote(report.id, report.status)}
                           className="self-end px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors"
                         >
                           Save Note
                         </button>
                       </div>
                     ) : (
                       <div>
                         <div className="flex items-center justify-between mb-2">
                           <h4 className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest flex items-center gap-1.5">
                              Admin Note {report.adminNote ? '(Internal)' : ''}
                           </h4>
                           <button 
                             onClick={() => startEditingNote(report)}
                             className="text-xs text-primary-500 hover:text-primary-400 flex items-center gap-1 transition-colors"
                           >
                             <Edit2 className="w-3.5 h-3.5" /> {report.adminNote ? 'Edit Note' : 'Add Note'}
                           </button>
                         </div>
                         {report.adminNote ? (
                           <div className="flex flex-col gap-1">
                             <p className="text-sm text-neutral-400 italic">"{report.adminNote}"</p>
                             {report.adminNoteAuthor && (
                               <div className="flex items-center gap-1.5 mt-2 text-[10px] text-neutral-500 font-medium">
                                 <span>Author:</span>
                                 <div className="flex items-center gap-1">
                                   {report.adminNoteAuthor.avatarUrl ? (
                                      <img src={report.adminNoteAuthor.avatarUrl} alt="" className="w-3.5 h-3.5 rounded-full" />
                                   ) : (
                                      <div className="w-3.5 h-3.5 rounded-full bg-neutral-800 flex items-center justify-center">
                                        <UserIcon className="w-2.5 h-2.5 text-neutral-400" />
                                      </div>
                                   )}
                                   <span>{report.adminNoteAuthor.name || report.adminNoteAuthor.username}</span>
                                 </div>
                               </div>
                             )}
                           </div>
                         ) : (
                           <p className="text-sm text-neutral-600 italic">No internal notes added.</p>
                         )}
                       </div>
                     )}

                     {/* Resolution Message (User Facing) */}
                     {(report.status === 'RESOLVED' || report.status === 'DISMISSED' || report.resolutionMessage) && (
                       <div className="pt-4 border-t border-neutral-800">
                         <div className="flex items-center justify-between mb-2">
                           <h4 className="text-[10px] font-bold text-primary-500/80 uppercase tracking-widest flex items-center gap-1.5">
                              Resolution Message (Visible to Reporter)
                           </h4>
                           <button 
                             onClick={() => handleResolve(report, report.status)}
                             className="text-xs text-primary-500 hover:text-primary-400 flex items-center gap-1 transition-colors"
                           >
                             <Edit2 className="w-3.5 h-3.5" /> Edit Message
                           </button>
                         </div>
                         {report.resolutionMessage ? (
                           <p className="text-sm text-primary-100/70 border-l-2 border-primary-500/30 pl-3 py-1 bg-primary-500/5 rounded-r-lg whitespace-pre-wrap">
                             "{report.resolutionMessage}"
                           </p>
                         ) : (
                           <p className="text-sm text-neutral-600 italic">No resolution message sent yet.</p>
                         )}
                       </div>
                     )}
                   </div>
                   
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>
      
      {/* Required Profile Viewing Modal */}
      <AnimatePresence>
        {viewingProfileId && (
          <AdminUserProfileModal userId={viewingProfileId} onClose={() => setViewingProfileId(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {moderationAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="p-6">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  {moderationAction.actionType === 'RESOLVED' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                  {moderationAction.actionType === 'DISMISSED' && <XCircle className="w-5 h-5 text-neutral-500" />}
                  {['BAN', 'BAN_USER'].includes(moderationAction.actionType) && <AlertTriangle className="w-5 h-5 text-red-500" />}
                  {moderationAction.actionType === 'SUSPEND' && <Clock className="w-5 h-5 text-orange-500" />}
                  {moderationAction.actionType === 'DELETE_FILE' && <Trash2 className="w-5 h-5 text-red-500" />}
                  {moderationAction.actionType.replace('_', ' ')}
                </h3>
                
                <p className="text-sm text-neutral-400 mb-6">
                  {moderationAction.actionType === 'RESOLVED' || moderationAction.actionType === 'DISMISSED' 
                    ? "Enter a resolution message to be sent to the reporter."
                    : `Provide a reason for this moderation action against the reported content/user.`}
                </p>

                <div className="space-y-4">
                  {moderationAction.actionType === 'SUSPEND' && (
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Duration (Days)</label>
                      <input 
                        type="number"
                        min="1"
                        value={modalDuration}
                        onChange={(e) => setModalDuration(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-primary-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Reason / Message</label>
                    <textarea 
                      value={modalReason}
                      onChange={(e) => setModalReason(e.target.value)}
                      placeholder="Explain the decision..."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-primary-500 min-h-[120px] resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button 
                    onClick={() => setModerationAction(null)}
                    disabled={isSubmittingAction}
                    className="flex-1 py-2.5 bg-neutral-800 text-neutral-300 rounded-xl font-medium hover:bg-neutral-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={executeModeration}
                    disabled={isSubmittingAction}
                    className={clsx(
                      "flex-1 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
                      ['BAN', 'BAN_USER', 'DELETE_FILE', 'DELETE_CLUB'].includes(moderationAction.actionType)
                        ? "bg-red-600 text-white hover:bg-red-500"
                        : "bg-primary-600 text-white hover:bg-primary-500"
                    )}
                  >
                    {isSubmittingAction ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                    ) : (
                      "Confirm Action"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
