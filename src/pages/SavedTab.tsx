import React from 'react';
import { motion } from 'motion/react';
import { Bookmark, Compass } from 'lucide-react';

export default function SavedTab() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8"
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center border border-primary-500/20">
            <Bookmark className="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Saved</h1>
            <p className="text-neutral-400">Your saved news articles and posts.</p>
          </div>
        </div>

        <div className="text-center py-20 bg-neutral-900/30 rounded-[3rem] border border-neutral-800 border-dashed">
          <div className="w-16 h-16 bg-primary-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary-500/20">
            <Compass className="w-8 h-8 text-primary-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Nothing saved yet</h3>
          <p className="text-neutral-400 max-w-md mx-auto">
            When you save news articles or posts, they will appear here for easy access.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
