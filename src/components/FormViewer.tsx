import { toast } from 'sonner';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, CheckCircle, Loader2, Upload, ChevronDown } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { clsx } from 'clsx';

export default function FormViewer({ formId, onComplete, onCancel }: { formId: string, onComplete?: () => void, onCancel?: () => void }) {
  const { user } = useUser();
  const [form, setForm] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [currentPage, setCurrentPage] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchForm();
  }, [formId]);

  const fetchForm = async () => {
    try {
      const res = await fetch(`/api/forms/${formId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to load form');
      const data = await res.json();
      setForm(data.form);
      
      // If there's an existing submission and we are allowed to edit (or if we can view it)
      if (data.existingSubmission) {
        if (!data.form.allowMultipleSubmissions) {
           if (!data.form.allowResponseEdits) {
             setError('You have already submitted this form.');
           } else {
             // Pre-fill answers from existing submission
             const initialAnswers: Record<string, any> = {};
             data.existingSubmission.answers.forEach((ans: any) => {
                try {
                   // Determine if it was stringified json
                   if (ans.value.startsWith('[') || ans.value.startsWith('{')) {
                     initialAnswers[ans.fieldId] = JSON.parse(ans.value);
                   } else {
                     initialAnswers[ans.fieldId] = ans.value;
                   }
                } catch(e) {
                   initialAnswers[ans.fieldId] = ans.value;
                }
             });
             setAnswers(initialAnswers);
             setIsEditing(true);
           }
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (fieldId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
  };

  const validateCurrentPage = () => {
    if (!form) return false;
    const page = form.pages[currentPage];
    for (const field of page.fields) {
      if (field.required) {
        const val = answers[field.id];
        if (field.type === 'MULTIPLE_CHOICE') {
          if (!val || val.length === 0) return false;
        } else {
          if (!val || String(val).trim() === '') return false;
        }
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentPage()) {
      setCurrentPage(prev => prev + 1);
    } else {
      toast("Please fill in all required fields.");
    }
  };

  const handlePrev = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleSubmit = async () => {
    if (!validateCurrentPage()) {
      toast("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedAnswers = Object.entries(answers).map(([fieldId, value]) => ({
        fieldId,
        value
      }));

      const res = await fetch(`/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ answers: formattedAnswers })
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to submit form');
      }

      setIsSuccess(true);
      if (onComplete) {
        setTimeout(onComplete, 3000);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="text-center p-8 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400">
        <p className="font-bold">{error || "Form not found"}</p>
        <button onClick={onCancel} className="mt-4 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors">Go Back</button>
      </div>
    );
  }

  if (form.status === 'CLOSED') {
    return (
      <div className="text-center p-12 bg-neutral-900 border border-neutral-800 rounded-3xl">
        <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-neutral-500" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Form Closed</h3>
        <p className="text-neutral-400 max-w-sm mx-auto mb-6">This application is no longer accepting responses.</p>
        <button onClick={onCancel} className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-colors">Return</button>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center p-12 bg-neutral-900 border border-neutral-800 rounded-3xl">
        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h3 className="text-3xl font-black text-white mb-2">Success!</h3>
        <p className="text-neutral-400 max-w-sm mx-auto mb-8">
          {isEditing ? 'Your response has been updated successfully.' : 'Your response has been submitted successfully.'}
        </p>
        {onCancel && (
          <button onClick={onCancel} className="px-8 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-colors">
            Done
          </button>
        )}
      </motion.div>
    );
  }

  const page = form.pages[currentPage];
  const progressPercent = ((currentPage + 1) / Math.max(form.pages.length, 1)) * 100;

  if (!page) {
    return (
      <div className="text-center p-8 bg-neutral-900 border border-neutral-800 rounded-3xl">
         <h3 className="text-xl font-bold text-white mb-2">Empty Form</h3>
         <p className="text-neutral-400">This form currently has no questions to answer.</p>
         <button onClick={onCancel} className="mt-4 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors">Go Back</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full relative pb-16">
      <div className="relative">
        <div className="h-1.5 w-full bg-neutral-900 absolute top-0 left-0 z-10 rounded-full overflow-hidden">
          <div className="h-full bg-primary-500 transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }} />
        </div>
        
        <div className="space-y-8 mt-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-white">{form.title}</h2>
            {form.description && <p className="text-neutral-400 font-medium">{form.description}</p>}
          </div>

          <div className="space-y-8">
            <div className="space-y-2 pb-4">
              <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-indigo-400">
                {page.title || `Page ${currentPage + 1}`}
              </h3>
              {page.description && <p className="text-neutral-400 text-sm">{page.description}</p>}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-8 pt-4"
              >
                {page.fields.map((field: any) => {
                  let options = [];
                  try { options = JSON.parse(field.options || '[]'); } catch { }

                  return (
                    <div key={field.id} className="space-y-3">
                      <label className="block text-base font-bold text-neutral-200">
                        {field.question} {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      
                      {field.type === 'SHORT_TEXT' && (
                        <input 
                          type="text"
                          value={answers[field.id] || ''}
                          onChange={(e) => handleAnswer(field.id, e.target.value)}
                          className="w-full bg-neutral-950/50 border border-neutral-800 hover:border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all placeholder:text-neutral-600"
                          placeholder="Your answer"
                        />
                      )}
                      
                      {field.type === 'LONG_TEXT' && (
                        <textarea
                          value={answers[field.id] || ''}
                          onChange={(e) => handleAnswer(field.id, e.target.value)}
                          className="w-full bg-neutral-950/50 border border-neutral-800 hover:border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all placeholder:text-neutral-600 min-h-[120px]"
                          placeholder="Your answer"
                        />
                      )}

                      {field.type === 'SINGLE_CHOICE' && (
                        <div className="relative">
                          <select
                            value={answers[field.id] || ''}
                            onChange={(e) => handleAnswer(field.id, e.target.value)}
                            className="w-full bg-neutral-950/50 border border-neutral-800 hover:border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all cursor-pointer appearance-none"
                          >
                            <option value="" disabled>Select an option...</option>
                            {options.map((opt: string) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 pointer-events-none" />
                        </div>
                      )}

                      {field.type === 'MULTIPLE_CHOICE' && (
                        <div className="space-y-3">
                          {options.map((opt: string) => {
                            const isChecked = (answers[field.id] || []).includes(opt);
                            return (
                              <label key={opt} className="flex items-start gap-3 cursor-pointer group">
                                <input 
                                  type="checkbox"
                                  className="mt-1 w-5 h-5 rounded border-neutral-700 bg-neutral-900 text-primary-500 focus:ring-primary-500 transition-colors"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const current = Array.isArray(answers[field.id]) ? [...answers[field.id]] : [];
                                    if (e.target.checked) current.push(opt);
                                    else {
                                      const idx = current.indexOf(opt);
                                      if (idx > -1) current.splice(idx, 1);
                                    }
                                    handleAnswer(field.id, current);
                                  }}
                                />
                                <span className={clsx("text-base font-medium transition-colors", isChecked ? "text-primary-400" : "text-neutral-300 group-hover:text-white")}>{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {field.type === 'FILE_UPLOAD' && (
                        <div className="p-6 bg-neutral-950/50 border-2 border-dashed border-neutral-800 hover:border-primary-500/50 rounded-2xl flex flex-col items-center justify-center transition-colors gap-3">
                          {answers[field.id] ? (
                            <div className="flex flex-col items-center flex-1 w-full text-center">
                              <CheckCircle className="w-6 h-6 text-green-500 mb-2" />
                              <span className="text-sm font-bold text-white max-w-full truncate">{answers[field.id].split('/').pop()}</span>
                              <button onClick={() => handleAnswer(field.id, null)} className="text-xs text-red-400 mt-2 hover:underline">Remove</button>
                            </div>
                          ) : (
                            <>
                              <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                                <Upload className="w-5 h-5 text-neutral-400" />
                              </div>
                              <label className="cursor-pointer text-center">
                                <span className="text-primary-400 font-bold hover:underline">Click to upload</span>
                                <span className="text-neutral-500 text-sm ml-1">or drag and drop</span>
                                <input type="file" className="hidden" onChange={async (e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    const formData = new FormData();
                                    formData.append('file', e.target.files[0]);
                                    
                                    const res = await fetch('/api/upload?type=general', {
                                      method: 'POST',
                                      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                                      body: formData
                                    });
                                    if (res.ok) {
                                      const data = await res.json();
                                      handleAnswer(field.id, data.url);
                                    } else {
                                      toast.error("File upload failed");
                                    }
                                  }
                                }} />
                              </label>
                            </>
                          )}
                        </div>
                      )}

                      {field.type === 'SLIDER' && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <span className="text-xl opacity-60">😔</span>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={answers[field.id] !== undefined ? answers[field.id] : 50}
                              onChange={(e) => handleAnswer(field.id, parseInt(e.target.value))}
                              className="flex-1 h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                              style={{
                                background: `linear-gradient(to right, #ef4444, #eab308, #22c55e)`
                              }}
                            />
                            <span className="text-xl">😊</span>
                          </div>
                          <div className="text-center text-sm font-bold text-neutral-400">
                            Current Value: {answers[field.id] !== undefined ? answers[field.id] : 50}%
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-neutral-800 pt-6">
          <div>
            {currentPage > 0 && (
              <button 
                onClick={handlePrev}
                className="flex items-center gap-2 px-6 py-2.5 text-neutral-400 hover:text-white font-bold transition-colors rounded-xl hover:bg-neutral-900"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}
          </div>

          <div className="flex gap-4">
            {onCancel && (
              <button 
                onClick={onCancel}
                className="px-6 py-2.5 text-neutral-400 hover:text-white font-bold transition-colors rounded-xl hover:bg-neutral-900"
              >
                Cancel
              </button>
            )}
            
            {currentPage < form.pages.length - 1 ? (
              <button 
                onClick={handleNext}
                className="flex items-center gap-2 px-8 py-2.5 bg-white hover:bg-neutral-200 text-neutral-950 font-black rounded-xl transition-colors"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-8 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-black rounded-xl transition-colors disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                {isSubmitting ? 'Submitting...' : isEditing ? 'Edit Response' : 'Submit Final'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
