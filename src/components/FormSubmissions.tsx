import React, { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, BarChart, Eye, Check, X, Filter, Download, ChevronDown } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import ProfilePopover from './ProfilePopover';
import OptimizedImage from './OptimizedImage';

export default function FormSubmissions({ formId }: { formId: string }) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [form, setForm] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [answerFilters, setAnswerFilters] = useState<Record<string, string[]>>({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'responses' | 'analytics'>('responses');
  
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);

  const choiceOptions = useMemo(() => {
    if (!form || !form.pages) return [];
    const options: { id: string, label: string, fieldId: string, value: string }[] = [];
    form.pages.forEach((p: any) => {
      p.fields.forEach((f: any) => {
        if ((f.type === 'SINGLE_CHOICE' || f.type === 'MULTIPLE_CHOICE') && f.options) {
          let parsedOptions = [];
          try {
             parsedOptions = typeof f.options === 'string' ? JSON.parse(f.options) : (Array.isArray(f.options) ? f.options : []);
          } catch(e) {}
          
          if (Array.isArray(parsedOptions)) {
            parsedOptions.forEach((opt: string) => {
              options.push({ 
                id: `${f.id}::${opt}`, 
                label: `${f.question}: ${opt}`,
                fieldId: f.id,
                value: opt
              });
            });
          }
        }
      });
    });
    return options;
  }, [form]);

  const fetchData = async () => {
    try {
      // Fetch both submissions and form scheme for the specific questions
      const res = await fetch(`/api/forms/${formId}/submissions`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const formRes = await fetch(`/api/forms/${formId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!res.ok || !formRes.ok) throw new Error('Failed to fetch data');
      const data = await res.json();
      const formData = await formRes.json();
      
      setSubmissions(data.submissions);
      setForm(formData.form);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [formId]);

  const updateStatus = async (submissionId: string, status: string) => {
    try {
      const res = await fetch(`/api/submissions/${submissionId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredSubmissions = submissions.filter(sub => {
    if (filterStatus !== 'ALL' && sub.status !== filterStatus) return false;
    
    // Check multiple choice filters
    for (const [fieldId, selectedValues] of Object.entries(answerFilters) as [string, string[]][]) {
      if (selectedValues.length === 0) continue;
      
      const fieldAns = sub.answers?.find((a:any) => a.fieldId === fieldId);
      if (!fieldAns) return false; // if no answer is provided and we are filtering on it
      
      let val = fieldAns.value;
      let parsed: string[] = [];
      if (Array.isArray(val)) {
        parsed = val;
      } else if (typeof val === 'string' && val.startsWith('[')) {
        try { parsed = JSON.parse(val); } catch(e){ parsed = [val]; }
      } else {
        parsed = [val];
      }
      
      // Match AT LEAST ONE selected value (OR logic within the same field)
      if (!selectedValues.some(sv => parsed.includes(sv))) {
        return false;
      }
    }

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      let foundInAnswers = false;
      if (sub.answers) {
        for (const answer of sub.answers) {
            let val = answer.value;
            if (Array.isArray(val)) { val = val.join(', '); }
            else if (typeof val === 'string' && val.startsWith('[')) {
                try { val = JSON.parse(val).join(', '); } catch(e){}
            }
            if (typeof val === 'string' && val.toLowerCase().includes(searchLower)) {
                foundInAnswers = true;
                break;
            }
        }
      }

      if (!sub.user?.name?.toLowerCase().includes(searchLower) && 
          !sub.user?.username?.toLowerCase().includes(searchLower) &&
          !foundInAnswers) {
        return false;
      }
    }
    return true;
  });

  const getQuestionContent = (fieldId: string) => {
    if (!form) return fieldId;
    for (const page of form.pages) {
      for (const field of page.fields) {
        if (field.id === fieldId) return field.question;
      }
    }
    return fieldId;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <h2 className="text-2xl font-bold text-white mb-0">{form?.title}</h2>
        <div className="flex bg-neutral-900 border border-neutral-800 rounded-xl p-1 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('responses')}
            className={clsx(
              "flex-1 px-6 py-2 rounded-lg text-sm font-bold transition-colors",
              activeTab === 'responses' ? "bg-primary-600 text-white" : "text-neutral-400 hover:text-white"
            )}
          >
            Responses ({filteredSubmissions.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={clsx(
              "flex-1 px-6 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 justify-center",
              activeTab === 'analytics' ? "bg-primary-600 text-white" : "text-neutral-400 hover:text-white"
            )}
          >
            <BarChart className="w-4 h-4" />
            Analytics
          </button>
        </div>
      </div>

      {activeTab === 'responses' ? (
        <div className="flex flex-col lg:flex-row gap-8 lg:items-start">
          <div className="flex-1 space-y-6 overflow-hidden">
            <div className="relative w-full max-w-md">
              <Search className="w-5 h-5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name or answers..." 
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-primary-500 text-sm shadow-sm"
              />
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[800px] text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-950/50">
                <th className="px-6 py-5 text-sm font-medium text-neutral-400 whitespace-nowrap">Applicant</th>
                <th className="px-6 py-5 text-sm font-medium text-neutral-400 whitespace-nowrap">Submitted At</th>
                <th className="px-6 py-5 text-sm font-medium text-neutral-400 whitespace-nowrap">Status</th>
                <th className="px-6 py-5 text-sm font-medium text-neutral-400 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.length > 0 ? (
                filteredSubmissions.map((sub) => (
                  <tr key={sub.id} className="border-b border-neutral-800 hover:bg-neutral-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <ProfilePopover username={sub.user?.username} user={sub.user as any}>
                        <div className="flex items-center gap-3 cursor-pointer">
                          <div className="w-10 h-10 rounded-full bg-neutral-800 overflow-hidden shrink-0">
                            {sub.user?.avatarUrl ? (
                              <OptimizedImage src={sub.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-neutral-500">
                                {sub.user?.username?.charAt(0)?.toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white hover:underline">{sub.user?.name || sub.user?.username || 'Guest'}</div>
                            <div className="text-xs text-neutral-500">@{sub.user?.username}</div>
                          </div>
                        </div>
                      </ProfilePopover>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-400 whitespace-nowrap">
                      {new Date(sub.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "px-3 py-1 text-xs font-bold rounded-lg uppercase",
                        sub.status === 'APPROVED' ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                        sub.status === 'REJECTED' ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                        sub.status === 'WAITLISTED' ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
                        "bg-neutral-800 text-neutral-300"
                      )}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setSelectedSubmission(sub)}
                          className="p-2 text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                          title="View Responses"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <div className="w-px h-6 bg-neutral-800 mx-2" />
                        <button 
                          onClick={() => updateStatus(sub.id, 'APPROVED')}
                          className="p-2 text-green-500 hover:text-green-400 bg-green-500/10 hover:bg-green-500/20 rounded-lg transition-colors"
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => updateStatus(sub.id, 'REJECTED')}
                          className="p-2 text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-neutral-500">
                    No submissions found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
          </div>

          <div className="w-full lg:w-80 shrink-0 lg:sticky lg:top-8 max-h-[calc(100vh-4rem)] overflow-y-auto scrollbar-hide">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-8">
              <div>
                <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4">Status</h3>
                <div className="flex flex-wrap gap-2">
                  {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'WAITLISTED'].map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={clsx(
                      "px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap flex-shrink-0 border",
                      filterStatus === s 
                        ? s === 'APPROVED' ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                        : s === 'REJECTED' ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                        : s === 'WAITLISTED' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                        : 'bg-neutral-800 text-white border-white/10'
                        : "text-neutral-400 border-transparent hover:text-neutral-200 hover:bg-neutral-800/50"
                    )}
                  >
                    {s}
                  </button>
                  ))}
                </div>
              </div>
              
              {choiceOptions.length > 0 && (
              <div>
                 <div className="flex justify-between items-center mb-4 border-t border-neutral-800/50 pt-6">
                    <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Answers</h3>
                    {Object.values(answerFilters).flat().length > 0 && (
                      <button onClick={() => setAnswerFilters({})} className="text-xs text-primary-500 hover:text-primary-400 transition-colors font-medium">Clear All</button>
                    )}
                 </div>
                 <div className="space-y-6">
                    {(form?.pages || []).flatMap((p: any) => p.fields || []).filter((f: any) => (f.type === 'SINGLE_CHOICE' || f.type === 'MULTIPLE_CHOICE') && f.options).map((field: any) => {
                         let opts = [];
                         try { opts = typeof field.options === 'string' ? JSON.parse(field.options) : (Array.isArray(field.options) ? field.options : []); } catch(e){}
                         if (!Array.isArray(opts) || opts.length === 0) return null;
                         const selected = answerFilters[field.id] || [];
                         return (
                           <div key={field.id} className="space-y-3">
                             <h4 className="text-sm font-medium text-white px-1 leading-snug">{field.question}</h4>
                             <div className="space-y-1">
                               {opts.map(opt => (
                                 <label key={opt} className="flex items-start gap-3 cursor-pointer group p-1.5 hover:bg-neutral-800/50 rounded-lg transition-colors">
                                   <div className={clsx(
                                     "w-4 h-4 mt-0.5 rounded border flex shrink-0 items-center justify-center transition-colors",
                                     selected.includes(opt) ? "bg-primary-500 border-primary-500" : "bg-neutral-950 border-neutral-700 group-hover:border-neutral-500"
                                   )}>
                                     {selected.includes(opt) && <Check className="w-3 h-3 text-white" />}
                                   </div>
                                   <span className="text-sm text-neutral-400 group-hover:text-neutral-200 transition-colors">{opt}</span>
                                   <input 
                                     type="checkbox" 
                                     className="hidden"
                                     checked={selected.includes(opt)}
                                     onChange={(e) => {
                                       setAnswerFilters(prev => {
                                         const prevSel = prev[field.id] || [];
                                         if (e.target.checked) return { ...prev, [field.id]: [...prevSel, opt] };
                                         else return { ...prev, [field.id]: prevSel.filter(x => x !== opt) };
                                       })
                                     }}
                                   />
                                 </label>
                               ))}
                             </div>
                           </div>
                         );
                    })}
                 </div>
              </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 shadow-xl mb-6">
            <h3 className="text-xl font-bold text-white mb-6 border-b border-neutral-800/50 pb-4">Form Settings</h3>
            <div className="flex flex-col gap-4">
               <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">Status</label>
                  <div className="relative w-full max-w-sm">
                    <select
                      value={form?.status || 'DRAFT'}
                      onChange={async (e) => {
                        const newStatus = e.target.value;
                        setForm({ ...form, status: newStatus });
                        await fetch(`/api/forms/${form?.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                          body: JSON.stringify({ status: newStatus })
                        });
                      }}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-all appearance-none"
                    >
                      <option value="DRAFT">Draft (Not visible)</option>
                      <option value="OPEN">Open (Accepting Responses)</option>
                      <option value="CLOSED">Closed (Visible but not accepting)</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 pointer-events-none" />
                  </div>
               </div>
               
               <label className="flex items-center gap-3 cursor-pointer group mt-2">
                  <input 
                    type="checkbox"
                    className="w-5 h-5 rounded border-neutral-700 bg-neutral-900 text-primary-500 focus:ring-primary-500 transition-colors"
                    checked={form?.allowMultipleSubmissions ?? true}
                    onChange={async (e) => {
                      const val = e.target.checked;
                      setForm({ ...form, allowMultipleSubmissions: val });
                      await fetch(`/api/forms/${form?.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                        body: JSON.stringify({ allowMultipleSubmissions: val })
                      });
                    }}
                  />
                  <span className="text-neutral-300 group-hover:text-white transition-colors text-sm font-medium">Allow multiple submissions per user</span>
               </label>

               <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox"
                    className="w-5 h-5 rounded border-neutral-700 bg-neutral-900 text-primary-500 focus:ring-primary-500 transition-colors"
                    checked={form?.allowResponseEdits ?? true}
                    onChange={async (e) => {
                      const val = e.target.checked;
                      setForm({ ...form, allowResponseEdits: val });
                      await fetch(`/api/forms/${form?.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                        body: JSON.stringify({ allowResponseEdits: val })
                      });
                    }}
                  />
                  <span className="text-neutral-300 group-hover:text-white transition-colors text-sm font-medium">Allow users to edit their submitted responses</span>
               </label>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-2xl font-black text-white">Responses Analytics</h3>
            {submissions.length === 0 ? (
              <div className="text-center text-neutral-500 py-12 bg-neutral-900 border border-neutral-800 rounded-xl">No responses to analyze yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                {(form?.pages || []).flatMap((p: any) => p.fields || []).map((field: any) => {
                  if (field.type === 'SHORT_TEXT' || field.type === 'LONG_TEXT' || field.type === 'FILE_UPLOAD') {
                    return null; // Don't chart text/files easily
                  }
                  
                  // Helper to get answers for this field
                  const fieldAnswers = submissions.map(sub => {
                    const ans = sub.answers?.find((a: any) => a.fieldId === field.id);
                    return ans ? ans.value : null;
                  }).filter(Boolean);

                  if (fieldAnswers.length === 0) return null;

                  if (field.type === 'SINGLE_CHOICE' || field.type === 'MULTIPLE_CHOICE') {
                    const counts: Record<string, number> = {};
                    fieldAnswers.forEach(ans => {
                      try {
                        let parsed = ans;
                        if (typeof ans === 'string' && ans.startsWith('[')) {
                           parsed = JSON.parse(ans);
                        }
                        if (Array.isArray(parsed)) {
                          parsed.forEach(v => counts[v] = (counts[v] || 0) + 1);
                        } else {
                          counts[parsed] = (counts[parsed] || 0) + 1;
                        }
                      } catch(e) {
                         counts[ans] = (counts[ans] || 0) + 1;
                      }
                    });
                    
                    const chartData = Object.entries(counts).sort((a,b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
                    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

                    return (
                      <div key={field.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl flex flex-col">
                        <div className="mb-6 shrink-0">
                          <h4 className="font-bold text-lg text-white mb-1">{field.question}</h4>
                          <div className="text-sm text-neutral-500">{fieldAnswers.length} responses</div>
                        </div>
                        <div className="h-[350px] w-full min-w-0 mx-auto flex-1 flex items-center justify-center relative pb-8">
                           <ResponsiveContainer width="100%" height="100%" className="focus:outline-none flex-1">
                              <PieChart style={{ outline: 'none' }}>
                                <Pie
                                  data={chartData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius="50%"
                                  outerRadius="75%"
                                  paddingAngle={5}
                                  dataKey="value"
                                  style={{ outline: 'none' }}
                                  label={({ cx, cy, midAngle, innerRadius, outerRadius, value, percent, index }) => {
                                    const RADIAN = Math.PI / 180;
                                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5 + 20;
                                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                    return (
                                      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12" fontWeight="bold">
                                        {`${(percent * 100).toFixed(0)}%`}
                                      </text>
                                    );
                                  }}
                                  labelLine={false}
                                >
                                  {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{ outline: 'none' }} />
                                  ))}
                                </Pie>
                                <RechartsTooltip 
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      const data = payload[0].payload;
                                      const total = chartData.reduce((sum, item) => sum + item.value, 0);
                                      const percent = ((data.value / total) * 100).toFixed(0);
                                      return (
                                        <div className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl shadow-xl">
                                          <p className="font-medium text-white mb-1">{data.name}</p>
                                          <p className="text-neutral-400 text-sm">
                                            {data.value} response{data.value !== 1 ? 's' : ''} <span className="text-primary-400 font-bold ml-1">({percent}%)</span>
                                          </p>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '20px' }} />
                              </PieChart>
                           </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  }

                  if (field.type === 'SLIDER') {
                    const sum = fieldAnswers.reduce((acc, curr) => acc + parseInt(curr), 0);
                    const mean = fieldAnswers.length > 0 ? sum / fieldAnswers.length : 0;
                    
                    return (
                      <div key={field.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl flex flex-col justify-center">
                        <div className="mb-6">
                           <h4 className="font-bold text-lg text-white mb-1">{field.question}</h4>
                           <div className="text-sm text-neutral-500">{fieldAnswers.length} responses</div>
                        </div>
                        
                        <div className="flex flex-col gap-3 max-w-lg mx-auto w-full pt-4 pb-8">
                           <div className="flex justify-between items-end mb-2">
                             <div className="text-neutral-400 font-medium">Arithmetic Mean</div>
                             <div className="text-4xl font-black text-primary-400">{mean.toFixed(1)}</div>
                           </div>
                           <div className="h-4 bg-neutral-800 rounded-full w-full overflow-hidden relative shadow-inner">
                             <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-1000" style={{ width: `${mean}%` }} />
                           </div>
                           <div className="flex justify-between text-sm font-bold text-neutral-500 mt-2">
                             <span>😔 0</span>
                             <span>😊 100</span>
                           </div>
                        </div>
                      </div>
                    );
                  }
                  
                  return null;
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submission Details Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative shadow-2xl">
            <button 
              onClick={() => setSelectedSubmission(null)}
              className="absolute top-6 right-6 p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Submission Details</h2>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neutral-800 overflow-hidden shrink-0">
                  {selectedSubmission.user?.avatarUrl ? (
                    <OptimizedImage src={selectedSubmission.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-neutral-500">
                      {selectedSubmission.user?.username?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-bold text-white">{selectedSubmission.user?.name || selectedSubmission.user?.username || 'Guest'}</div>
                  <div className="text-sm text-neutral-500">@{selectedSubmission.user?.username} &bull; {new Date(selectedSubmission.createdAt).toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {selectedSubmission.answers.map((answer: any) => {
                const isArray = Array.isArray(answer.value) || (typeof answer.value === 'string' && answer.value.startsWith('['));
                let displayValue = answer.value;
                if (typeof answer.value === 'string' && answer.value.startsWith('[')) {
                  try {
                    displayValue = JSON.parse(answer.value).join(', ');
                  } catch(e) {}
                } else if (Array.isArray(answer.value)) {
                  displayValue = answer.value.join(', ');
                }

                return (
                  <div key={answer.id} className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
                    <p className="text-sm font-bold text-neutral-400 mb-2">{getQuestionContent(answer.fieldId)}</p>
                    <div className="text-white whitespace-pre-wrap">
                      {displayValue?.toString().startsWith('http') ? (
                        <a href={displayValue} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary-400 hover:text-primary-300 font-medium">
                          <Download className="w-4 h-4" /> View Uploaded File
                        </a>
                      ) : (
                        displayValue || <span className="text-neutral-600 italic">No answer provided</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 pt-6 border-t border-neutral-800 flex gap-4 justify-end">
               <button 
                  onClick={() => { updateStatus(selectedSubmission.id, 'WAITLISTED'); setSelectedSubmission(null); }}
                  className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-colors"
                >
                  Waitlist
                </button>
               <button 
                  onClick={() => { updateStatus(selectedSubmission.id, 'REJECTED'); setSelectedSubmission(null); }}
                  className="px-6 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-xl transition-colors"
                >
                  Reject
                </button>
                <button 
                  onClick={() => { updateStatus(selectedSubmission.id, 'APPROVED'); setSelectedSubmission(null); }}
                  className="px-6 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 font-bold rounded-xl transition-colors"
                >
                  Approve
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
