import React from 'react';
import { motion } from 'motion/react';
import { Calendar as CalendarIcon } from 'lucide-react';

export default function CalendarTab() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 h-full flex flex-col items-center justify-center p-6 bg-neutral-950 relative overflow-hidden"
    >
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="text-center bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 rounded-[3rem] p-12 max-w-lg w-full shadow-2xl relative z-10">
        <div className="w-24 h-24 bg-primary-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-primary-500/20 shadow-inner">
          <CalendarIcon className="w-12 h-12 text-primary-400" />
        </div>
        
        <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Calendar</h2>
        <p className="text-neutral-400 text-lg mb-8 leading-relaxed">
          Keep track of your classes, club meetings, and campus events all in one place.
        </p>
        
        <div className="inline-flex items-center gap-2 bg-neutral-800/50 border border-neutral-700 text-neutral-300 px-6 py-3 rounded-full text-sm font-medium">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500"></span>
          </span>
          Coming Soon
        </div>
      </div>
    </motion.div>
  );
}
