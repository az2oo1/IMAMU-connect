import React, { useState, useRef, useEffect } from 'react';
import { Hash, Search, Send, Users, Plus, X, Info, BellOff, LogOut, Pin, FileText, Image as ImageIcon, MessageSquare, Folder, ChevronDown, Paperclip, MoreVertical, Trash2, Reply, File } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import ProfilePopover from '../components/ProfilePopover';
import { useDraggableScroll } from '../hooks/useDraggableScroll';
import FormattedText from '../components/FormattedText';

const CATEGORIES = ['All', 'General', 'Science', 'Computer Science', 'Humanities'];

const INITIAL_JOINED = [
  { id: '1', name: 'CS101', members: 142, unread: 3, description: 'Intro to Computer Science', category: 'Computer Science' },
  { id: '2', name: 'MATH201', members: 85, unread: 0, description: 'Calculus II', category: 'Science' },
];

const AVAILABLE_GROUPS = [
  { id: '3', name: 'PHYS301', members: 56, description: 'Quantum Mechanics study group', category: 'Science' },
  { id: '4', name: 'ENG102', members: 210, description: 'Modern Literature discussion', category: 'Humanities' },
  { id: '5', name: 'Campus Life', members: 850, description: 'General campus discussions and events', category: 'General' },
  { id: '6', name: 'Study Tips & Tricks', members: 320, description: 'Share your best study methods', category: 'General' },
  { id: '7', name: 'Web Development', members: 128, description: 'React, Node, and more', category: 'Computer Science' },
  { id: '8', name: 'CHEM101', members: 195, description: 'Intro to Chemistry', category: 'Science' },
];

type Attachment = {
  name: string;
  size: string;
  type: 'image' | 'file';
  url?: string;
};

type Message = {
  id: number;
  sender: string;
  text: string;
  time: string;
  isMe: boolean;
  replyTo?: number;
  attachment?: Attachment;
  deletedForMe?: boolean;
  deletedForAll?: boolean;
};

const MESSAGES: Message[] = [
  { id: 1, sender: 'Student_842', text: 'Did anyone understand the last lecture on pointers?', time: '10:42 AM', isMe: false },
  { id: 2, sender: 'Student_105', text: 'Yeah, it was a bit confusing. I found a good YouTube video about it though.', time: '10:45 AM', isMe: false },
  { id: 3, sender: 'Me', text: 'Could you share the link? I\'m completely lost.', time: '10:46 AM', isMe: true },
  { id: 4, sender: 'Student_105', text: 'Sure, here it is: youtube.com/watch?v=...', time: '10:47 AM', isMe: false },
];

const GROUP_MEMBERS = [
  { id: 'm1', name: 'Student_842', role: 'admin' },
  { id: 'm2', name: 'Student_105', role: 'member' },
  { id: 'm3', name: 'Student_99', role: 'member' },
  { id: 'm4', name: 'Me', role: 'member' },
];

export default function GroupsTab() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>(MESSAGES);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [activeMessageOptions, setActiveMessageOptions] = useState<number | null>(null);
  const [joinedGroups, setJoinedGroups] = useState(INITIAL_JOINED);
  const [availableGroups, setAvailableGroups] = useState(AVAILABLE_GROUPS);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState(INITIAL_JOINED[0].id);
  const [joinSearchQuery, setJoinSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const navigate = useNavigate();
  const dragScroll = useDraggableScroll<HTMLDivElement>();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeGroup = joinedGroups.find(g => g.id === activeGroupId) || joinedGroups[0];

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    // Show button if we are more than 100px away from the bottom
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  // Scroll to bottom when new message is added
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleJoin = (group: any) => {
    setJoinedGroups([...joinedGroups, { ...group, unread: 0 }]);
    setAvailableGroups(availableGroups.filter(g => g.id !== group.id));
    setActiveGroupId(group.id);
    setShowJoinModal(false);
    setJoinSearchQuery('');
  };

  const handleLeaveGroup = () => {
    if (!activeGroup) return;
    setJoinedGroups(joinedGroups.filter(g => g.id !== activeGroup.id));
    setAvailableGroups([...availableGroups, activeGroup]);
    setShowGroupInfo(false);
    setActiveGroupId(joinedGroups.find(g => g.id !== activeGroup.id)?.id || '');
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!message.trim() && !attachment) return;
    
    let newAttachment: Attachment | undefined;
    if (attachment) {
      newAttachment = {
        name: attachment.name,
        size: (attachment.size / 1024).toFixed(1) + ' KB',
        type: attachment.type.startsWith('image/') ? 'image' : 'file',
        url: URL.createObjectURL(attachment)
      };
    }

    const newMessage: Message = {
      id: Date.now(),
      sender: 'Me',
      text: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
      replyTo: replyingTo?.id,
      attachment: newAttachment
    };
    
    setMessages([...messages, newMessage]);
    setMessage('');
    setReplyingTo(null);
    setAttachment(null);
  };

  const handleDeleteForMe = (id: number) => {
    setMessages(messages.map(m => m.id === id ? { ...m, deletedForMe: true } : m));
    setActiveMessageOptions(null);
  };

  const handleDeleteForAll = (id: number) => {
    setMessages(messages.map(m => m.id === id ? { ...m, deletedForAll: true, text: 'This message was deleted.', attachment: undefined } : m));
    setActiveMessageOptions(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
    }
  };

  const filteredAvailableGroups = availableGroups.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(joinSearchQuery.toLowerCase()) || 
                          g.description.toLowerCase().includes(joinSearchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || g.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex h-full overflow-hidden bg-neutral-950"
    >
      {/* Sidebar */}
      <div className="w-full md:w-80 bg-neutral-900 border-r border-neutral-800 flex flex-col hidden md:flex">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-100">Academic Groups</h2>
          <button 
            onClick={() => setShowJoinModal(true)}
            className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-full transition-colors"
            title="Join a new group"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 border-b border-neutral-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input 
              type="text" 
              placeholder="Search your groups..." 
              className="w-full bg-neutral-950 border border-neutral-800 rounded-md py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-primary-500 text-neutral-200 transition-colors"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {joinedGroups.map((group, index) => (
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              key={group.id}
              onClick={() => setActiveGroupId(group.id)}
              className={clsx(
                "w-full text-left p-4 border-b border-neutral-800/50 hover:bg-neutral-800 transition-colors flex items-center justify-between",
                group.id === activeGroupId && "bg-neutral-800/80 border-l-2 border-l-primary-500"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neutral-950 border border-neutral-800 flex items-center justify-center text-neutral-400">
                  <Hash className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-medium text-sm text-neutral-200">{group.name}</div>
                  <div className="text-xs text-neutral-500 flex items-center gap-1">
                    <Users className="w-3 h-3" /> {group.members} students
                  </div>
                </div>
              </div>
              {group.unread > 0 && (
                <div className="bg-primary-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {group.unread}
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {activeGroup ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-neutral-800 bg-neutral-900 flex items-center justify-between px-4 md:px-6">
              <div 
                className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setShowGroupInfo(true)}
              >
                <div className="w-10 h-10 rounded-full bg-neutral-950 border border-neutral-800 flex items-center justify-center text-neutral-400 md:hidden">
                  <Hash className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-100">{activeGroup.name}</h3>
                  <p className="text-xs text-neutral-500">{activeGroup.members} students • 12 online</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-neutral-400">
                <button 
                  onClick={() => setShowGroupInfo(!showGroupInfo)}
                  className={clsx("p-2 rounded-md hover:bg-neutral-800 transition-colors", showGroupInfo && "bg-neutral-800 text-primary-400")}
                >
                  <Info className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Pinned Message */}
            <div className="bg-neutral-900/80 border-b border-neutral-800 px-4 py-2 flex items-start gap-3 text-sm">
              <Pin className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold text-primary-400 text-xs block mb-0.5">Pinned by Admin</span>
                <p className="text-neutral-300">Midterm is scheduled for Oct 20th in Room 402. Bring your student ID.</p>
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-6 relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat"
              style={{ backgroundBlendMode: 'overlay', backgroundColor: 'rgba(10, 10, 10, 0.98)' }}
            >
              <div className="text-center">
                <div className="inline-block bg-neutral-900 border border-neutral-800 text-neutral-400 text-xs px-3 py-1 rounded-full">
                  Welcome to the {activeGroup.name} group! This is a space for students to discuss the course.
                </div>
              </div>
              {messages.filter(m => !m.deletedForMe).map((msg, index) => {
                const isDeleted = msg.deletedForAll;
                const repliedMsg = msg.replyTo ? messages.find(m => m.id === msg.replyTo) : null;

                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    key={msg.id} 
                    className={clsx("flex flex-col group/message", msg.isMe ? "items-end" : "items-start")}
                  >
                    <div className={clsx("flex items-end gap-2 max-w-[80%]", msg.isMe ? "flex-row-reverse" : "flex-row")}>
                      {!msg.isMe && (
                        <ProfilePopover
                          username={msg.sender.toLowerCase()}
                          user={{
                            name: msg.sender,
                            handle: msg.sender.toLowerCase(),
                            bio: 'Computer Science student at Imam Mohammad Ibn Saud Islamic University.',
                            avatar: `https://picsum.photos/seed/${msg.sender}/100/100`
                          }}
                        >
                          <div className="w-8 h-8 rounded-full bg-neutral-800 flex-shrink-0 flex items-center justify-center text-xs font-bold text-neutral-500 border border-neutral-700 overflow-hidden">
                            <img 
                              src={`https://picsum.photos/seed/${msg.sender}/100/100`} 
                              alt={msg.sender} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer" 
                            />
                          </div>
                        </ProfilePopover>
                      )}
                      
                      <div className="flex flex-col gap-1 relative">
                        {/* Options Menu */}
                        <div className={clsx(
                          "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/message:opacity-100 transition-opacity flex items-center gap-1",
                          msg.isMe ? "right-full mr-2" : "left-full ml-2"
                        )}>
                          <div className="relative">
                            <button 
                              onClick={() => setActiveMessageOptions(activeMessageOptions === msg.id ? null : msg.id)}
                              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            
                            <AnimatePresence>
                              {activeMessageOptions === msg.id && (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                  transition={{ duration: 0.15 }}
                                  className={clsx(
                                    "absolute top-full mt-2 w-48 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden z-50",
                                    msg.isMe ? "right-0" : "left-0"
                                  )}
                                >
                                  <div className="p-1">
                                    <button 
                                      onClick={() => { setReplyingTo(msg); setActiveMessageOptions(null); }}
                                      className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-neutral-300 hover:text-white text-sm rounded-lg transition-colors flex items-center gap-3"
                                    >
                                      <Reply className="w-4 h-4" /> Reply
                                    </button>
                                    {msg.isMe && !isDeleted && (
                                      <>
                                        <button 
                                          onClick={() => handleDeleteForMe(msg.id)}
                                          className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-neutral-300 hover:text-white text-sm rounded-lg transition-colors flex items-center gap-3"
                                        >
                                          <Trash2 className="w-4 h-4" /> Delete for me
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteForAll(msg.id)}
                                          className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-red-400 hover:text-red-300 text-sm rounded-lg transition-colors flex items-center gap-3 mt-1"
                                        >
                                          <Trash2 className="w-4 h-4" /> Delete for everyone
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>

                        <div className={clsx(
                          "px-4 py-2.5 rounded-2xl text-sm shadow-sm min-w-0 break-words whitespace-pre-wrap relative",
                          msg.isMe 
                            ? "bg-primary-600 text-white rounded-br-sm shadow-[0_2px_10px_rgba(99,102,241,0.2)]" 
                            : "bg-neutral-800/80 backdrop-blur-sm border border-neutral-700/50 text-neutral-200 rounded-bl-sm shadow-[0_2px_10px_rgba(0,0,0,0.2)]",
                          isDeleted && "italic text-neutral-400 bg-neutral-900 border border-neutral-800 shadow-none"
                        )}>
                          {!msg.isMe && !isDeleted && <div className="text-[11px] text-primary-400 mb-1 font-semibold">{msg.sender}</div>}
                          
                          {repliedMsg && !isDeleted && (
                            <div className="mb-2 p-2 rounded-lg bg-black/20 border-l-2 border-primary-400 text-xs">
                              <div className="font-semibold text-primary-300 mb-0.5">{repliedMsg.sender}</div>
                              <div className="truncate opacity-80">{repliedMsg.text}</div>
                            </div>
                          )}

                          {msg.attachment && !isDeleted && (
                            <div className="mb-2 rounded-xl overflow-hidden bg-black/20">
                              {msg.attachment.type === 'image' ? (
                                <img src={msg.attachment.url} alt="attachment" className="max-w-full max-h-64 object-cover" />
                              ) : (
                                <div className="flex items-center gap-3 p-3">
                                  <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                                    <File className="w-5 h-5 text-primary-300" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-sm truncate max-w-[150px]">{msg.attachment.name}</div>
                                    <div className="text-xs opacity-70">{msg.attachment.size}</div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <FormattedText text={msg.text} />
                        </div>
                      </div>
                    </div>
                    <div className={clsx("text-[10px] text-neutral-600 mt-1", msg.isMe ? "pr-2" : "pl-10")}>{msg.time}</div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Scroll to bottom button */}
            <AnimatePresence>
              {showScrollButton && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 10 }}
                  className="absolute bottom-24 right-6 z-10"
                >
                  <button
                    onClick={scrollToBottom}
                    className="w-10 h-10 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-full shadow-lg flex items-center justify-center text-neutral-300 hover:text-white transition-colors"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

              <div className="p-4 bg-neutral-900 border-t border-neutral-800 relative flex flex-col gap-2">
                {/* Replying To Preview */}
                <AnimatePresence>
                  {replyingTo && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: 10, height: 0 }}
                      className="flex items-center justify-between bg-neutral-800/50 rounded-xl p-3 border border-neutral-700/50"
                    >
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-xs font-bold text-primary-400">Replying to {replyingTo.sender}</span>
                        <span className="text-sm text-neutral-300 truncate">{replyingTo.text}</span>
                      </div>
                      <button 
                        onClick={() => setReplyingTo(null)}
                        className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-full transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Attachment Preview */}
                <AnimatePresence>
                  {attachment && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: 10, height: 0 }}
                      className="flex items-center justify-between bg-neutral-800/50 rounded-xl p-3 border border-neutral-700/50"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-lg bg-neutral-700 flex items-center justify-center overflow-hidden shrink-0">
                          {attachment.type.startsWith('image/') ? (
                            <img src={URL.createObjectURL(attachment)} alt="preview" className="w-full h-full object-cover" />
                          ) : (
                            <File className="w-5 h-5 text-neutral-400" />
                          )}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm font-medium text-neutral-200 truncate">{attachment.name}</span>
                          <span className="text-xs text-neutral-500">{(attachment.size / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setAttachment(null)}
                        className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-full transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Mentions Dropdown */}
                <AnimatePresence>
                  {message.includes('@') && !message.split('@').pop()?.includes(' ') && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-full left-4 mb-2 w-64 bg-neutral-800 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden z-50"
                    >
                      <div className="p-2 text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-700">
                        Mention User
                      </div>
                      <div className="max-h-48 overflow-y-auto custom-scrollbar">
                        {['alexchen', 'sarahj', 'mike_dev', 'emma_w', 'studentcouncil']
                          .filter(u => u.includes(message.split('@').pop()?.toLowerCase() || ''))
                          .map(user => (
                            <button
                              key={user}
                              type="button"
                              onClick={() => {
                                const parts = message.split('@');
                                parts.pop();
                                setMessage(parts.join('@') + '@' + user + ' ');
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-primary-600 hover:text-white text-neutral-200 text-sm transition-colors flex items-center gap-2"
                            >
                              <div className="w-6 h-6 rounded-full bg-neutral-700 overflow-hidden shrink-0">
                                <img src={`https://picsum.photos/seed/${user}/100/100`} alt={user} className="w-full h-full object-cover" />
                              </div>
                              @{user}
                            </button>
                          ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form 
                  onSubmit={handleSendMessage}
                  className="flex items-end gap-2 bg-neutral-900 border border-neutral-700/50 rounded-3xl pl-2 pr-1 py-1 focus-within:border-primary-500/50 focus-within:bg-neutral-800 transition-all shadow-lg"
                >
                  <input 
                    type="file" 
                    id="file-upload" 
                    className="hidden" 
                    onChange={handleFileChange}
                  />
                  <label 
                    htmlFor="file-upload"
                    className="p-2 mb-0.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 rounded-full transition-colors shrink-0 cursor-pointer"
                    title="Attach file"
                  >
                    <Paperclip className="w-5 h-5" />
                  </label>
                  <textarea 
                    ref={textareaRef}
                    rows={1}
                    placeholder={`Message ${activeGroup.name} students...`} 
                    className="flex-1 bg-transparent border-none outline-none text-sm text-neutral-200 resize-none py-2.5 max-h-[150px] custom-scrollbar"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <button 
                    type="submit"
                    disabled={!message.trim() && !attachment}
                    className="p-2 mb-0.5 bg-primary-600 hover:bg-primary-700 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-full transition-colors shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center mb-4 border border-neutral-800">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-neutral-300 mb-2">No Groups Selected</h3>
            <p className="max-w-md">Join an academic group from the sidebar to start discussing with your classmates.</p>
            <button 
              onClick={() => setShowJoinModal(true)}
              className="mt-6 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-full transition-colors font-medium"
            >
              Find Groups
            </button>
          </div>
        )}
      </div>

      {/* Right Sidebar: Group Info */}
      <AnimatePresence initial={false}>
        {showGroupInfo && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="bg-neutral-900 flex flex-col absolute md:relative right-0 h-full z-20 shadow-2xl md:shadow-none overflow-hidden shrink-0"
          >
            <div className="w-80 h-full flex flex-col border-l border-neutral-800">
              <div className="p-4 border-b border-neutral-800 flex items-center justify-between shrink-0">
                <h2 className="text-lg font-bold text-neutral-100">Group Info</h2>
                <button onClick={() => setShowGroupInfo(false)} className="md:hidden p-1 text-neutral-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-6 text-center border-b border-neutral-800">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center text-neutral-400 mb-4 shadow-inner">
                  <Hash className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{activeGroup?.name}</h3>
                <p className="text-sm text-neutral-400">{activeGroup?.description || 'Academic Group'}</p>
              </div>

              <div className="p-4 border-b border-neutral-800 space-y-2">
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-neutral-800 transition-colors text-neutral-300"
                >
                  <div className="flex items-center gap-3">
                    <BellOff className="w-5 h-5" /> Mute Notifications
                  </div>
                  <div className={clsx("w-10 h-5 rounded-full relative transition-colors", isMuted ? "bg-primary-600" : "bg-neutral-700")}>
                    <div className={clsx("absolute top-1 w-3 h-3 rounded-full bg-white transition-all", isMuted ? "left-6" : "left-1")} />
                  </div>
                </button>
                
                <button 
                  onClick={handleLeaveGroup}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-800 transition-colors text-red-400 hover:text-red-300"
                >
                  <LogOut className="w-5 h-5" /> Leave Group
                </button>
              </div>

              <div className="p-4 border-b border-neutral-800">
                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4">Shared Media</h4>
                <button 
                  onClick={() => navigate('/academics')}
                  className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl flex items-center justify-center gap-2 transition-colors mb-4 border border-neutral-700 hover:border-neutral-600"
                >
                  <Folder className="w-4 h-4 text-primary-400" />
                  Go to Group Files
                </button>
                <div className="flex gap-4">
                  <div className="flex flex-col items-center gap-2 cursor-pointer group">
                    <div className="w-14 h-14 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center group-hover:border-primary-500 transition-colors">
                      <FileText className="w-6 h-6 text-blue-400" />
                    </div>
                    <span className="text-xs text-neutral-400">12 Docs</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 cursor-pointer group">
                    <div className="w-14 h-14 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center group-hover:border-primary-500 transition-colors">
                      <ImageIcon className="w-6 h-6 text-green-400" />
                    </div>
                    <span className="text-xs text-neutral-400">4 Images</span>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4 flex items-center justify-between">
                  <span>Members ({GROUP_MEMBERS.length})</span>
                  <Search className="w-4 h-4" />
                </h4>
                <div className="space-y-3">
                  {GROUP_MEMBERS.map(member => (
                    <div key={member.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ProfilePopover
                          username={member.name === 'Me' ? 'me' : member.name.toLowerCase().replace(/\s+/g, '')}
                          user={{
                            name: member.name,
                            handle: member.name.toLowerCase().replace(/\s+/g, ''),
                            bio: 'Student at Imam Mohammad Ibn Saud Islamic University.',
                            avatar: `https://picsum.photos/seed/${member.name}/100/100`
                          }}
                        >
                          <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-500 border border-neutral-700 overflow-hidden">
                            {member.name === 'Me' ? 'ME' : (
                              <img 
                                src={`https://picsum.photos/seed/${member.name}/100/100`} 
                                alt={member.name} 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer" 
                              />
                            )}
                          </div>
                        </ProfilePopover>
                        <span className="text-sm font-medium text-neutral-200">{member.name}</span>
                      </div>
                      {member.role === 'admin' && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded">ADMIN</span>
                          <button 
                            className="p-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-md text-neutral-300 transition-colors" 
                            title="Message Admin privately"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Join Group Modal */}
      <AnimatePresence>
        {showJoinModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900">
                <h3 className="font-bold text-lg text-white">Join Academic Groups</h3>
                <button onClick={() => setShowJoinModal(false)} className="text-neutral-400 hover:text-white bg-neutral-800 rounded-full p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 border-b border-neutral-800 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input 
                    type="text" 
                    placeholder="Search courses or groups..." 
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-md py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-primary-500 text-neutral-200 transition-colors"
                    value={joinSearchQuery}
                    onChange={(e) => setJoinSearchQuery(e.target.value)}
                  />
                </div>
                <div 
                  {...dragScroll}
                  className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide select-none"
                >
                  {CATEGORIES.map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={clsx(
                        "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
                        selectedCategory === category 
                          ? "bg-primary-600 border-primary-500 text-white" 
                          : "bg-neutral-900 border-neutral-700 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                      )}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
                {filteredAvailableGroups.length === 0 ? (
                  <div className="text-center text-neutral-500 py-8">No more groups available to join.</div>
                ) : (
                  filteredAvailableGroups.map((group, index) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      key={group.id} 
                      className="p-3 hover:bg-neutral-800/50 rounded-lg flex items-center justify-between group transition-colors"
                    >
                      <div>
                        <div className="font-bold text-neutral-200">{group.name}</div>
                        <div className="text-xs text-neutral-500">{group.description}</div>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="text-xs text-neutral-600 flex items-center gap-1">
                            <Users className="w-3 h-3" /> {group.members} students
                          </div>
                          <div className="text-[10px] font-medium text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-full">
                            {group.category}
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleJoin(group)}
                        className="bg-neutral-800 hover:bg-primary-600 text-white text-sm font-medium px-4 py-1.5 rounded-full transition-colors border border-neutral-700 hover:border-primary-500"
                      >
                        Join
                      </button>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
