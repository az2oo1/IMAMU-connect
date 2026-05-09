import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, CheckSquare } from 'lucide-react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pollData: any) => void;
}

export default function CreatePollModal({ isOpen, onClose, onSubmit }: CreatePollModalProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState([{ id: '1', text: '' }, { id: '2', text: '' }]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [hideVoters, setHideVoters] = useState(false);

  const handleAddOption = () => {
    if (options.length >= 10) return;
    setOptions([...options, { id: Date.now().toString(), text: '' }]);
  };

  const handleRemoveOption = (id: string) => {
    if (options.length <= 2) return;
    setOptions(options.filter(o => o.id !== id));
  };

  const handleOptionChange = (id: string, text: string) => {
    setOptions(options.map(o => o.id === id ? { ...o, text } : o));
  };

  const handleSubmit = () => {
    if (!question.trim()) return;
    const validOptions = options.filter(o => o.text.trim());
    if (validOptions.length < 2) return;

    onSubmit({
      question: question.trim(),
      allowMultiple,
      hideVoters,
      options: validOptions.map(o => ({
        id: o.id,
        text: o.text.trim(),
        votes: []
      }))
    });

    // Reset
    setQuestion('');
    setOptions([{ id: '1', text: '' }, { id: '2', text: '' }]);
    setAllowMultiple(false);
    setHideVoters(false);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl w-full max-w-md relative z-10 flex flex-col max-h-[90vh]"
      >
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary-400" />
            Create Poll
          </h2>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white transition-colors rounded-full hover:bg-neutral-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Question</label>
            <input
              type="text"
              placeholder="Ask a question..."
              value={question}
              onChange={e => setQuestion(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-primary-500 transition-colors"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-400 mb-1">Options</label>
            {options.map((option, index) => (
              <div key={option.id} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Option ${index + 1}`}
                  value={option.text}
                  onChange={e => handleOptionChange(option.id, e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-primary-500 transition-colors"
                />
                {options.length > 2 && (
                  <button 
                    onClick={() => handleRemoveOption(option.id)}
                    className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            
            {options.length < 10 && (
              <button 
                onClick={handleAddOption}
                className="w-full mt-2 py-2 border border-dashed border-neutral-700 rounded-xl text-neutral-400 hover:text-white hover:border-neutral-500 hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" /> Add Option
              </button>
            )}
          </div>

          <div className="pt-4 border-t border-neutral-800 space-y-3">
            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <div className="text-white font-medium group-hover:text-primary-300 transition-colors">Multiple Answers</div>
                <div className="text-xs text-neutral-500">Allow users to select more than one option</div>
              </div>
              <div className={clsx("w-10 h-5 rounded-full relative transition-colors", allowMultiple ? "bg-primary-600" : "bg-neutral-700")}>
                <div className={clsx("absolute top-1 w-3 h-3 rounded-full bg-white transition-all", allowMultiple ? "left-6" : "left-1")} />
              </div>
              <input type="checkbox" className="hidden" checked={allowMultiple} onChange={e => setAllowMultiple(e.target.checked)} />
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <div className="text-white font-medium group-hover:text-primary-300 transition-colors">Hide Voters</div>
                <div className="text-xs text-neutral-500">Keep votes anonymous</div>
              </div>
              <div className={clsx("w-10 h-5 rounded-full relative transition-colors", hideVoters ? "bg-primary-600" : "bg-neutral-700")}>
                <div className={clsx("absolute top-1 w-3 h-3 rounded-full bg-white transition-all", hideVoters ? "left-6" : "left-1")} />
              </div>
              <input type="checkbox" className="hidden" checked={hideVoters} onChange={e => setHideVoters(e.target.checked)} />
            </label>
          </div>
        </div>

        <div className="p-4 border-t border-neutral-800 flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 font-medium text-neutral-300 hover:text-white rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={!question.trim() || options.filter(o => o.text.trim()).length < 2}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-bold rounded-xl transition-all shadow-lg"
          >
            Send Poll
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
