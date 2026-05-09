import { toast } from 'sonner';
import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, Settings, Save, AlertCircle, ChevronDown } from 'lucide-react';
import { Reorder } from 'motion/react';
import { clsx } from 'clsx';
import { useUser } from '../contexts/UserContext';

export default function FormBuilder({ entityType, entityId, onSave, initialForm }: { entityType?: string, entityId?: string, onSave?: () => void, initialForm?: any }) {
  const [title, setTitle] = useState(initialForm?.title || '');
  const [description, setDescription] = useState(initialForm?.description || '');
  const [status, setStatus] = useState(initialForm?.status || 'DRAFT');
  
  const [pages, setPages] = useState(initialForm?.pages || [{
    id: 'page-1',
    title: 'Page 1',
    description: '',
    fields: [
      { id: 'field-1', type: 'SHORT_TEXT', question: 'What is your name?', required: true, options: [] }
    ]
  }]);

  const [allowMultipleSubmissions, setAllowMultipleSubmissions] = useState(initialForm?.allowMultipleSubmissions ?? true);
  const [allowResponseEdits, setAllowResponseEdits] = useState(initialForm?.allowResponseEdits ?? true);

  const [isSaving, setIsSaving] = useState(false);

  const addPage = () => {
    setPages([...pages, {
      id: `page-${Date.now()}`,
      title: `Page ${pages.length + 1}`,
      description: '',
      fields: []
    }]);
  };

  const removePage = (pageId: string) => {
    if (pages.length === 1) return;
    setPages(pages.filter(p => p.id !== pageId));
  };

  const addField = (pageId: string) => {
    setPages(pages.map(page => {
      if (page.id === pageId) {
        return {
          ...page,
          fields: [...page.fields, {
            id: `field-${Date.now()}`,
            type: 'SHORT_TEXT',
            question: 'New Question',
            required: false,
            options: []
          }]
        };
      }
      return page;
    }));
  };

  const updateField = (pageId: string, fieldId: string, updates: any) => {
    setPages(pages.map(page => {
      if (page.id === pageId) {
        return {
          ...page,
          fields: page.fields.map(field => field.id === fieldId ? { ...field, ...updates } : field)
        };
      }
      return page;
    }));
  };

  const removeField = (pageId: string, fieldId: string) => {
    setPages(pages.map(page => {
      if (page.id === pageId) {
        return {
          ...page,
          fields: page.fields.filter(f => f.id !== fieldId)
        };
      }
      return page;
    }));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Form title is required");
      return;
    }
    
    setIsSaving(true);
    try {
      const url = initialForm ? `/api/forms/${initialForm.id}` : '/api/forms';
      const method = initialForm ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title,
          description,
          entityType: entityType || initialForm?.entityType,
          entityId: entityId || initialForm?.entityId,
          status,
          allowMultipleSubmissions,
          allowResponseEdits,
          pages
        })
      });
      
      if (!res.ok) throw new Error("Failed to save form");
      if (onSave) onSave();
      
      setTitle('');
      setDescription('');
      setPages([{
        id: 'page-1',
        title: 'Page 1',
        description: '',
        fields: []
      }]);
    } catch (err) {
      console.error(err);
      toast.error("Error saving form.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <div className="space-y-8">
        <h2 className="text-3xl font-black text-white">{initialForm ? 'Edit Form' : 'Create New Application/Form'}</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-neutral-400 mb-2">Form Title *</label>
            <input 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all font-medium text-lg placeholder:text-neutral-600"
              placeholder="e.g., Spring 2026 Club Application"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Description (Optional)</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all placeholder:text-neutral-600 min-h-[100px]"
              placeholder="Explain what this form is for..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Status</label>
            <div className="relative">
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all appearance-none"
              >
                <option value="DRAFT">Draft (Not visible)</option>
                <option value="OPEN">Open (Accepting Responses)</option>
                <option value="CLOSED">Closed (Visible but not accepting)</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 pointer-events-none" />
            </div>
          </div>
          
          <div className="flex flex-col gap-3 p-4 bg-neutral-950 border border-neutral-800 rounded-xl">
            <h3 className="font-medium text-white mb-1">Form Settings</h3>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox"
                className="w-5 h-5 rounded border-neutral-700 bg-neutral-900 text-primary-500 focus:ring-primary-500 transition-colors"
                checked={allowMultipleSubmissions}
                onChange={(e) => setAllowMultipleSubmissions(e.target.checked)}
              />
              <span className="text-neutral-300 group-hover:text-white transition-colors">Allow multiple submissions per user</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox"
                className="w-5 h-5 rounded border-neutral-700 bg-neutral-900 text-primary-500 focus:ring-primary-500 transition-colors"
                checked={allowResponseEdits}
                onChange={(e) => setAllowResponseEdits(e.target.checked)}
              />
              <span className="text-neutral-300 group-hover:text-white transition-colors">Allow users to edit their submitted responses</span>
            </label>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {pages.map((page, pIndex) => (
          <div key={page.id} className="space-y-6 pt-12 border-t border-neutral-800">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-4">
                <input 
                  value={page?.title || ''}
                  onChange={e => {
                    const newPages = [...pages];
                    newPages[pIndex].title = e.target.value;
                    setPages(newPages);
                  }}
                  className="bg-transparent border-b border-transparent hover:border-neutral-700 focus:border-primary-500 text-2xl font-bold text-white focus:outline-none w-full transition-colors pb-2"
                  placeholder={`Page ${pIndex + 1} Title`}
                />
                <input 
                  value={page.description}
                  onChange={e => {
                    const newPages = [...pages];
                    newPages[pIndex].description = e.target.value;
                    setPages(newPages);
                  }}
                  className="bg-transparent border-b border-transparent hover:border-neutral-700 focus:border-primary-500 text-base text-neutral-400 focus:outline-none w-full transition-colors pb-1"
                  placeholder="Page description (optional)"
                />
              </div>
              
              <button 
                onClick={() => removePage(page.id)}
                disabled={pages.length === 1}
                className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 pt-8">
              <Reorder.Group axis="y" values={page.fields} onReorder={(newFields) => {
                const newPages = [...pages];
                newPages[pIndex].fields = newFields;
                setPages(newPages);
              }} className="space-y-4">
                {page.fields.map((field) => (
                    <Reorder.Item key={field.id} value={field} className="py-6 border-b border-neutral-800/50 flex gap-4 first:pt-4 last:border-0 relative">
                    <div className="mt-2 text-neutral-600 cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start gap-4 flex-col sm:flex-row">
                        <input 
                          value={field.question}
                          onChange={e => updateField(page.id, field.id, { question: e.target.value })}
                          className="flex-1 w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                          placeholder="Question Title"
                        />
                        <div className="relative w-full sm:w-auto">
                          <select
                            value={field.type}
                            onChange={e => updateField(page.id, field.id, { type: e.target.value })}
                            className="bg-neutral-900 border border-neutral-800 rounded-lg pl-3 pr-8 py-2 text-white focus:outline-none focus:border-primary-500 w-full sm:w-auto appearance-none"
                          >
                            <option value="SHORT_TEXT">Short Answer</option>
                            <option value="LONG_TEXT">Paragraph</option>
                            <option value="SINGLE_CHOICE">Dropdown Options</option>
                            <option value="MULTIPLE_CHOICE">Checkboxes (Multiple)</option>
                            <option value="FILE_UPLOAD">File Upload</option>
                            <option value="SLIDER">Happiness Slider</option>
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                        </div>
                      </div>

                      {(field.type === 'SINGLE_CHOICE' || field.type === 'MULTIPLE_CHOICE') && (
                        <div className="space-y-2 pl-4 border-l-2 border-neutral-800">
                          {field.options?.map((opt, oIndex) => (
                            <div key={oIndex} className="flex items-center gap-2">
                              {field.type === 'SINGLE_CHOICE' ? (
                                <span className="text-xs font-bold text-neutral-500 w-4 text-center">{oIndex + 1}.</span>
                              ) : (
                                <div className="w-4 h-4 border border-neutral-600 rounded-sm flex-shrink-0" />
                              )}
                              <input 
                                value={opt}
                                onChange={e => {
                                  const newOpts = [...(field.options || [])];
                                  newOpts[oIndex] = e.target.value;
                                  updateField(page.id, field.id, { options: newOpts });
                                }}
                                className="flex-1 bg-transparent border-b border-transparent hover:border-neutral-700 focus:border-primary-500 text-sm text-neutral-300 focus:outline-none pb-1"
                                placeholder={`Option ${oIndex + 1}`}
                              />
                              <button 
                                onClick={() => {
                                  const newOpts = (field.options || []).filter((_, i) => i !== oIndex);
                                  updateField(page.id, field.id, { options: newOpts });
                                }}
                                className="p-1 text-neutral-500 hover:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button 
                            onClick={() => updateField(page.id, field.id, { options: [...(field.options || []), `Option ${(field.options?.length || 0) + 1}`] })}
                            className="text-sm text-primary-400 hover:text-primary-300 font-medium flex items-center gap-1.5"
                          >
                            <Plus className="w-4 h-4" /> Add Option
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-4 border-l border-neutral-800 pl-4 justify-between">
                      <button 
                        onClick={() => removeField(page.id, field.id)}
                        className="p-2 text-neutral-500 hover:bg-neutral-800 hover:text-red-400 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-400 hover:text-neutral-300">
                        <input 
                          type="checkbox" 
                          checked={field.required}
                          onChange={e => updateField(page.id, field.id, { required: e.target.checked })}
                          className="w-4 h-4 rounded text-primary-500 focus:ring-primary-500 bg-neutral-900 border-neutral-700"
                        />
                        Required
                      </label>
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>

              <button 
                onClick={() => addField(page.id)}
                className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-neutral-800 hover:border-primary-500/50 hover:bg-primary-500/5 rounded-xl text-neutral-400 hover:text-primary-400 transition-all font-medium"
              >
                <Plus className="w-5 h-5" />
                Add Field
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between sticky bottom-6 bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 p-4 rounded-2xl shadow-2xl z-40">
        <button 
          onClick={addPage}
          className="flex items-center gap-2 px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Page
        </button>

        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {isSaving ? 'Saving...' : 'Save Form'}
        </button>
      </div>
    </div>
  );
}
