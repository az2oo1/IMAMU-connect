import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, MessageSquare, Share2, MoreHorizontal, Send } from 'lucide-react';
import { clsx } from 'clsx';
import ProfilePopover from './ProfilePopover';
import FormattedText from './FormattedText';

interface PostModalProps {
  post: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function PostModal({ post, isOpen, onClose }: PostModalProps) {
  const [liked, setLiked] = useState(false);
  const [comment, setComment] = useState('');

  if (!post) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 top-16 z-40 flex items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl" 
            onClick={onClose} 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative bg-neutral-950 border border-neutral-800 rounded-[2rem] w-full max-w-6xl h-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col md:flex-row"
          >
            {/* Mobile Close Button */}
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 md:hidden z-50 p-2.5 bg-black/50 text-white hover:bg-black/80 rounded-full backdrop-blur-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left Side: Post Content */}
            <div className={clsx(
              "w-full h-1/2 md:h-full relative flex flex-col border-b md:border-b-0 md:border-r border-neutral-800",
              post.image ? "md:w-[60%]" : "md:w-1/2 bg-neutral-900/50"
            )}>
              {post.image ? (
                <>
                  <img 
                    src={post.image} 
                    alt={post.title} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent md:hidden" />
                </>
              ) : (
                <div className="flex-1 p-8 md:p-12 flex flex-col justify-center">
                  <h2 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight mb-6">
                    {post.title}
                  </h2>
                  {post.content && (
                    <p className="text-xl text-neutral-300 leading-relaxed font-medium">
                      {post.content}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Right Side: Comments & Details */}
            <div className={clsx(
              "w-full h-1/2 md:h-full flex flex-col bg-neutral-950",
              post.image ? "md:w-[40%]" : "md:w-1/2"
            )}>
              {/* Header */}
              <div className="p-6 border-b border-neutral-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <ProfilePopover 
                    username={post.handle}
                    user={{
                      name: post.author,
                      handle: post.handle,
                      bio: post.bio,
                      avatar: `https://picsum.photos/seed/${post.author}/100/100`
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 p-[2px] shadow-lg cursor-pointer">
                      <img 
                        src={`https://picsum.photos/seed/${post.author}/100/100`} 
                        className="w-full h-full rounded-[10px] border-2 border-neutral-900 object-cover" 
                        alt={post.author} 
                        referrerPolicy="no-referrer" 
                      />
                    </div>
                  </ProfilePopover>
                  <div>
                    <span className="block font-bold text-white text-sm tracking-tight">{post.author}</span>
                    <span className="block text-neutral-400 text-xs font-medium">@{post.handle} • {post.time}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button className="p-2 text-neutral-400 hover:text-white transition-colors">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  <button onClick={onClose} className="hidden md:flex p-2 text-neutral-400 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Content/Comments */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                {/* Post Text (if image post) */}
                {post.image && (
                  <div className="pb-6 border-b border-neutral-800/50">
                    <h2 className="text-xl font-bold text-white mb-2">{post.title}</h2>
                    <p className="text-neutral-300"><FormattedText text={post.content} /></p>
                  </div>
                )}

                {/* Mock Comments */}
                <div className="space-y-5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-800 shrink-0 overflow-hidden">
                        <img src={`https://picsum.photos/seed/user${i}/100/100`} alt="User" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="bg-neutral-900 rounded-2xl rounded-tl-none px-4 py-2.5">
                          <span className="font-bold text-white text-sm mr-2">Student {i}</span>
                          <span className="text-neutral-300 text-sm"><FormattedText text={`This is a great post! Can't wait for this. @studentcouncil`} /></span>
                        </div>
                        <div className="flex items-center gap-4 mt-1.5 ml-2 text-xs font-medium text-neutral-500">
                          <span>{i}h</span>
                          <button className="hover:text-neutral-300">Reply</button>
                          <button className="hover:text-neutral-300">Like</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions & Input */}
              <div className="p-4 border-t border-neutral-800 shrink-0 bg-neutral-950">
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setLiked(!liked)}
                      className={clsx(
                        "transition-colors",
                        liked ? "text-rose-500" : "text-neutral-400 hover:text-white"
                      )}
                    >
                      <Heart className={clsx("w-6 h-6", liked && "fill-current")} />
                    </button>
                    <button className="text-neutral-400 hover:text-white transition-colors">
                      <MessageSquare className="w-6 h-6" />
                    </button>
                    <button className="text-neutral-400 hover:text-white transition-colors">
                      <Share2 className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="text-sm font-bold text-neutral-400">
                    {post.likes + (liked ? 1 : 0)} likes
                  </div>
                </div>
                
                <div className="relative flex items-center">
                  <input 
                    type="text" 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment..." 
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-full py-3 pl-4 pr-12 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-all"
                  />
                  <button 
                    disabled={!comment.trim()}
                    className="absolute right-2 p-2 text-primary-500 disabled:text-neutral-600 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
