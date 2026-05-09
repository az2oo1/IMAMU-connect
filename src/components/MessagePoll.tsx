import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { useUser } from '../contexts/UserContext';
import { Check } from 'lucide-react';

interface MessagePollProps {
  message: any;
  onVote: (optionIds: string[]) => void;
}

export default function MessagePoll({ message, onVote }: MessagePollProps) {
  const { user } = useUser();
  const [localVotes, setLocalVotes] = useState<string[]>([]);
  const [isPending, setIsPending] = useState(false);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!message.pollData || !user?.id) return;
    try {
      const poll = typeof message.pollData === 'string' ? JSON.parse(message.pollData) : message.pollData;
      const initialVotes = poll.options
        .filter((o: any) => o.votes?.includes(user.id))
        .map((o: any) => o.id);
      
      // Sync with server ONLY if we haven't started local changes
      if (!isPending) {
        setLocalVotes(initialVotes);
      }
    } catch (e) {
      // Ignore
    }
  }, [message.pollData, user?.id, isPending]);

  if (!message.pollData) return null;
  
  let poll: any;
  try {
    poll = typeof message.pollData === 'string' ? JSON.parse(message.pollData) : message.pollData;
  } catch (e) {
    return null;
  }

  const handleOptionClick = (optionId: string) => {
    setIsPending(true);
    let newVotes = [...localVotes];
    if (poll.allowMultiple) {
      if (newVotes.includes(optionId)) {
        newVotes = newVotes.filter(id => id !== optionId);
      } else {
        newVotes.push(optionId);
      }
    } else {
      newVotes = [optionId];
    }
    setLocalVotes(newVotes);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        await onVote(newVotes);
      } finally {
        setIsPending(false);
      }
    }, 1000);
  };

  // Derive optimistic poll state so percentage bars animate immediately
  let derivedPoll = poll;
  if (isPending && user?.id) {
    derivedPoll = {
      ...poll,
      options: poll.options.map((opt: any) => {
        const originallyVoted = opt.votes?.includes(user?.id);
        const currentlyVoted = localVotes.includes(opt.id);
        
        let newVotes = [...(opt.votes || [])];
        if (!originallyVoted && currentlyVoted) {
          newVotes.push(user.id);
        } else if (originallyVoted && !currentlyVoted) {
          newVotes = newVotes.filter((id: string) => id !== user.id);
        }
        return { ...opt, votes: newVotes };
      })
    };
  }

  const totalVotes = derivedPoll.options.reduce((acc: number, o: any) => acc + (o.votes?.length || 0), 0);
  const canSeeVoters = !derivedPoll.hideVoters || user?.role === 'ADMIN';

  return (
    <div className="w-full flex flex-col my-1">
      <div className="flex items-start gap-2 mb-2 px-1">
        <span className="font-medium text-base leading-snug">{derivedPoll.question}</span>
      </div>
      <div className="flex flex-col gap-1.5 cursor-pointer">
        {derivedPoll.options.map((option: any) => {
          const voteCount = option.votes?.length || 0;
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const hasVoted = localVotes.includes(option.id);
          
          return (
            <button
              key={option.id}
              onClick={() => handleOptionClick(option.id)}
              className={clsx(
                "w-full text-left relative overflow-hidden rounded-lg transition-colors group",
                hasVoted ? "bg-black/20 dark:bg-white/20" : "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10"
              )}
            >
              <div 
                className={clsx(
                  "absolute inset-y-0 left-0 transition-all duration-500 ease-out",
                  hasVoted ? "bg-black/20 dark:bg-white/20" : "bg-black/10 dark:bg-white/10"
                )} 
                style={{ width: `${percentage}%` }}
              />
              <div className="relative p-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-5 shrink-0 flex items-center justify-center">
                    <div className={clsx(
                      "w-4 h-4 rounded-full border flex items-center justify-center transition-colors relative",
                      hasVoted ? "border-transparent bg-primary-500 text-white" : "border-black/30 dark:border-white/30"
                    )}>
                      <Check
                        strokeWidth={4} 
                        className={clsx(
                          "w-2.5 h-2.5 transition-all duration-300 absolute text-white", 
                          hasVoted ? "scale-100 opacity-100" : "scale-0 opacity-0"
                        )} 
                      />
                    </div>
                  </div>
                  <span className={clsx("text-sm break-words transition-opacity", hasVoted ? "opacity-100 font-normal" : "opacity-90 font-normal")}>
                    {option.text}
                  </span>
                </div>
                {canSeeVoters ? (
                  <div className="flex flex-col items-end justify-center shrink-0 w-16 whitespace-nowrap">
                    <span className="text-xs font-medium opacity-80">{percentage}%</span>
                    <span className="text-[10px] opacity-60 leading-none mt-0.5">{voteCount} vote{voteCount !== 1 && 's'}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-end justify-center shrink-0 w-16 whitespace-nowrap">
                    <span className="text-xs font-medium opacity-60 italic">Hidden</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <div className="text-[11px] opacity-70 flex justify-between mt-3 pt-2 border-t border-black/10 dark:border-white/10">
        <span>{canSeeVoters ? `${totalVotes} total vote${totalVotes !== 1 ? 's' : ''}` : 'Votes are hidden'}</span>
        {derivedPoll.allowMultiple && <span>Multiple choice</span>}
      </div>
    </div>
  );
}
