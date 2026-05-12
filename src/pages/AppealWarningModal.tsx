import React, { useState } from 'react';
import { X, Loader2, Send } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

interface AppealWarningModalProps {
  notificationId: string;
  onClose: () => void;
}

export default function AppealWarningModal({ notificationId, onClose }: AppealWarningModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return toast.error('Please provide a reason for your appeal.');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          type: 'APPEAL',
          targetId: notificationId,
          reason: reason
        })
      });
      if (!res.ok) throw new Error('Failed to submit appeal');
      toast.success('Your appeal has been submitted to moderators.');
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden p-6"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Appeal Warning</h2>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white bg-neutral-800 rounded-full transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-neutral-400 mb-6">
          If you believe this warning was issued in error, please explain your reasoning
          and provide any context. Our moderation team will review this appeal.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="State your case..."
          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 min-h-[120px] resize-none mb-4"
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-neutral-400 hover:text-white">
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-medium disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isSubmitting ? 'Submitting...' : 'Submit Appeal'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
