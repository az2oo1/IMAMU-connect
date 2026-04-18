import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, XCircle, Clock, ChevronLeft, MessageSquare, Shield, FileText } from 'lucide-react';
import { clsx } from 'clsx';

export default function ReportDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, [id]);

  const fetchReport = async () => {
    try {
      const res = await fetch(`/api/reports/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReport(data.report);
      }
    } catch (error) {
      console.error('Failed to fetch report', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChat = async () => {
    try {
      const res = await fetch(`/api/reports/${id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        navigate(`/messages?id=${data.group.id}`);
      }
    } catch (e) {
      console.error('Failed to start chat', e);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white animate-pulse">Loading report details...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Report Not Found</h2>
        <p className="text-neutral-400 mb-6">The report you're looking for doesn't exist or you don't have permission to view it.</p>
        <button 
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-neutral-800 text-white rounded-xl hover:bg-neutral-700 transition-colors"
        >
          Go Home
        </button>
      </div>
    );
  }

  const statusColors = {
    PENDING: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
    RESOLVED: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    DISMISSED: 'text-neutral-500 bg-neutral-500/10 border-neutral-500/20',
  };

  const statusIcons = {
    PENDING: AlertTriangle,
    RESOLVED: CheckCircle2,
    DISMISSED: XCircle,
  };

  const StatusIcon = statusIcons[report.status as keyof typeof statusIcons];

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 pt-20">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-8 group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Back
        </button>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={clsx("px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5", statusColors[report.status as keyof typeof statusColors])}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {report.status}
                </span>
                <span className="text-xs text-neutral-500">Report #{report.id.slice(0, 8)}</span>
              </div>
              <h1 className="text-2xl font-bold">Reported {report.type}</h1>
              <p className="text-neutral-400 text-sm mt-1 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Submitted on {new Date(report.createdAt).toLocaleDateString()} at {new Date(report.createdAt).toLocaleTimeString()}
              </p>
            </div>
            
            {report.status === 'PENDING' && (
              <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/5 border border-yellow-500/10 rounded-xl text-yellow-500/80 text-sm">
                <Clock className="w-4 h-4" />
                Under Review
              </div>
            )}
          </div>

          <div className="p-8 space-y-8">
            {/* Reason Section */}
            <section>
              <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Your Complaint
              </h3>
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 mb-6">
                <p className="text-neutral-200 leading-relaxed italic">"{report.reason}"</p>
              </div>

              {report.contentDetails && (
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-neutral-800 bg-neutral-950/30 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Reported Content Details</span>
                    {report.type === 'MESSAGE' && (
                       <button 
                        onClick={() => navigate(`${report.contentDetails?.group?.isDirectMessage ? '/messages' : '/groups'}?id=${report.contentDetails?.groupId}&messageId=${report.contentId}`)}
                        className="text-[10px] font-bold text-primary-400 hover:text-primary-300 transition-colors uppercase tracking-widest"
                       >
                        View Context
                       </button>
                    )}
                  </div>
                  <div className="p-6">
                    {report.type === 'MESSAGE' && (
                      <div className="flex gap-4">
                        <img 
                          src={report.contentDetails.author?.avatarUrl || `https://picsum.photos/seed/${report.contentDetails.authorId}/100/100`} 
                          alt="" 
                          className="w-10 h-10 rounded-full object-cover shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="text-sm font-bold text-white mb-1">
                            {report.contentDetails.author?.name || report.contentDetails.author?.username}
                          </p>
                          <p className="text-sm text-neutral-300 bg-black/30 p-3 rounded-xl border border-neutral-800 inline-block italic">
                            "{report.contentDetails.content}"
                          </p>
                        </div>
                      </div>
                    )}
                    {report.type === 'FILE' && (
                      <div className="flex items-center gap-4 p-4 bg-black/20 rounded-xl border border-neutral-800">
                        <FileText className="w-8 h-8 text-neutral-500" />
                        <div>
                          <p className="text-sm font-bold text-white">{report.contentDetails.name}</p>
                          <p className="text-xs text-neutral-500">Academic File Report</p>
                        </div>
                      </div>
                    )}
                    {report.type === 'CLUB' && (
                      <div className="flex items-center gap-4 p-4 bg-black/20 rounded-xl border border-neutral-800">
                        <Shield className="w-8 h-8 text-primary-500" />
                        <div>
                          <p className="text-sm font-bold text-white">{report.contentDetails.name}</p>
                          <p className="text-xs text-neutral-500">Club Entity Report</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Admin Response Section */}
            {(report.status === 'RESOLVED' || report.status === 'DISMISSED') && (
              <section>
                <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary-500" /> Support Action & Response
                </h3>
                <div className="bg-neutral-950 border border-primary-500/20 rounded-xl overflow-hidden">
                  <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-primary-500/5">
                    <div className="flex items-center gap-3">
                      {report.adminNoteAuthor ? (
                        <>
                          <img 
                            src={report.adminNoteAuthor.avatarUrl || `https://picsum.photos/seed/admin/100/100`} 
                            className="w-8 h-8 rounded-full" 
                            alt=""
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <p className="text-sm font-bold text-white">{report.adminNoteAuthor.name}</p>
                            <p className="text-[10px] text-primary-400 font-bold uppercase tracking-wider">Support Agent</p>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-3 text-neutral-400">
                          <Shield className="w-8 h-8 p-1.5 bg-neutral-900 rounded-xl border border-neutral-800" />
                          <p className="text-sm font-bold">CampusHub Support Team</p>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-neutral-500 font-medium">
                      {report.resolvedAt ? new Date(report.resolvedAt).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                  <div className="p-5">
                    {report.resolutionMessage ? (
                      <p className="text-neutral-200 leading-relaxed font-medium whitespace-pre-wrap">{report.resolutionMessage}</p>
                    ) : (
                      <p className="text-neutral-500 italic">The team has reviewed your report and taken the necessary actions according to our community guidelines.</p>
                    )}
                    
                    <div className="mt-6 flex items-center gap-2 p-3 bg-neutral-900/50 border border-neutral-800 rounded-lg text-xs text-neutral-400">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <p className="font-bold text-neutral-300">Action Taken</p>
                        <p>The necessary administrative measures have been applied to the reported {report.type.toLowerCase()}.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Need More Help? */}
            <div className="pt-4 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-xs text-neutral-500">
                <MessageSquare className="w-4 h-4" />
                Still have questions? Contact support via chat.
              </div>
              <button 
                 onClick={handleStartChat}
                 className="w-full sm:w-auto px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)]"
              >
                Start Chat with Support
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
