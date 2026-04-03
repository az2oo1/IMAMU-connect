import { motion } from 'motion/react';
import { Compass, Sparkles } from 'lucide-react';

export default function ExploreTab() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 h-full flex items-center justify-center bg-neutral-950 relative overflow-hidden"
    >
      {/* Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 text-center px-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 200 }}
          className="bg-neutral-900/50 backdrop-blur-xl border border-white/10 p-12 rounded-[3rem] shadow-2xl max-w-lg mx-auto"
        >
          <div className="w-20 h-20 bg-primary-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary-500/30">
            <Compass className="w-10 h-10 text-primary-400" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white mb-4">
            Explore
          </h1>
          <p className="text-neutral-400 text-lg mb-8">
            We're building a new way to discover campus life, trending posts, and events.
          </p>
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary-500/10 text-primary-400 font-bold border border-primary-500/20">
            <Sparkles className="w-5 h-5" />
            Coming Soon
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
