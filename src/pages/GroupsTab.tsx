import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Hash, Search, Send, Users, Plus, X, Info, BellOff, LogOut, Pin, FileText, Image as ImageIcon, MessageSquare, Folder, ChevronDown, Paperclip, MoreVertical, Trash2, Reply, File, BookOpen, Clock, Camera, ShieldAlert } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getFromCache, saveToCache, CACHE_KEYS } from '../utils/persistence';
import ProfilePopover from '../components/ProfilePopover';
import { useDraggableScroll } from '../hooks/useDraggableScroll';
import FormattedText from '../components/FormattedText';
import TagInput from '../components/TagInput';

const INITIAL_JOINED = [
  { id: '1', name: 'CS101', members: 142, unread: 3, description: 'Intro to Computer Science', tags: 'Computer Science' },
  { id: '2', name: 'MATH201', members: 85, unread: 0, description: 'Calculus II', tags: 'Science' },
];

const AVAILABLE_GROUPS = [
  { id: '3', name: 'PHYS301', members: 56, description: 'Quantum Mechanics study group', tags: 'Science' },
  { id: '4', name: 'ENG102', members: 210, description: 'Modern Literature discussion', tags: 'Humanities' },
  { id: '5', name: 'Campus Life', members: 850, description: 'General campus discussions and events', tags: 'General' },
  { id: '6', name: 'Study Tips & Tricks', members: 320, description: 'Share your best study methods', tags: 'General' },
  { id: '7', name: 'Web Development', members: 128, description: 'React, Node, and more', tags: 'Computer Science' },
  { id: '8', name: 'CHEM101', members: 195, description: 'Intro to Chemistry', tags: 'Science' },
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

import { useUser } from '../contexts/UserContext';
import { useSocket } from '../contexts/SocketContext';

export default function GroupsTab() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [messageCache, setMessageCache] = useState<Record<string, any[]>>(getFromCache(CACHE_KEYS.MESSAGES + '_groups', {}));
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const prevScrollHeightRef = useRef<number | null>(null);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [activeMessageOptions, setActiveMessageOptions] = useState<{ id: string, rect: DOMRect, isMe: boolean, isDeleted: boolean, msg: any } | null>(null);
  const [joinedGroups, setJoinedGroups] = useState<any[]>(getFromCache(CACHE_KEYS.GROUPS + '_groups', []));
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [reportingMessage, setReportingMessage] = useState<any | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState('');
  const [activeGroupMembers, setActiveGroupMembers] = useState<any[]>([]);
  const [joinSearchQuery, setJoinSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Create Group State
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupTags, setNewGroupTags] = useState('');
  const [newGroupCourseId, setNewGroupCourseId] = useState('');
  const [myCourses, setMyCourses] = useState<any[]>([]);
  const [allCourses, setAllCourses] = useState<any[]>([]);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useUser();
  const { socket } = useSocket();
  const dragScroll = useDraggableScroll<HTMLDivElement>();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (socket && activeGroupId) {
      socket.emit('join_group', activeGroupId);

      const handleNewMessage = (data: { message: any }) => {
        setMessages(prev => {
          // Check if message already exists (e.g. from optimistic update)
          if (prev.some(m => m.id === data.message.id)) {
            return prev;
          }
          // Also check if we have a pending message with the same content
          const pendingIndex = prev.findIndex(m => m.isPending && m.content === data.message.content && m.authorId === data.message.authorId);
          if (pendingIndex !== -1) {
            const newMessages = [...prev];
            newMessages[pendingIndex] = data.message;
            return newMessages;
          }
          return [...prev, data.message];
        });
      };

      const handleMessageDeleted = (data: { messageId: string, deletedForAll: boolean }) => {
        setMessages(prev => prev.map(m => {
          if (m.id === data.messageId) {
            return { ...m, deletedForAll: data.deletedForAll, content: 'This message was deleted' };
          }
          return m;
        }));
      };

      socket.on('new_message', handleNewMessage);
      socket.on('message_deleted', handleMessageDeleted);

      return () => {
        socket.emit('leave_group', activeGroupId);
        socket.off('new_message', handleNewMessage);
        socket.off('message_deleted', handleMessageDeleted);
      };
    }
  }, [socket, activeGroupId]);

  useEffect(() => {
    const groupIdFromUrl = searchParams.get('id');
    if (groupIdFromUrl && joinedGroups.some(g => g.id === groupIdFromUrl)) {
      const group = joinedGroups.find(g => g.id === groupIdFromUrl);
      if (group?.isDirectMessage) {
        navigate(`/messages?id=${groupIdFromUrl}`);
      } else {
        setActiveGroupId(groupIdFromUrl);
      }
    }
  }, [searchParams, joinedGroups, navigate]);

  useEffect(() => {
    if (activeGroupId) {
      if (messageCache[activeGroupId] && !searchParams.get('messageId')) {
        setMessages(messageCache[activeGroupId]);
      } else {
        setMessages([]);
      }
      setHasMoreMessages(true);
      setNextCursor(null);
      fetchMessages(activeGroupId, true);
      fetchGroupMembers(activeGroupId);
    }
  }, [activeGroupId]);

  useEffect(() => {
    if (prevScrollHeightRef.current !== null && messagesContainerRef.current) {
      const newScrollHeight = messagesContainerRef.current.scrollHeight;
      messagesContainerRef.current.scrollTop = newScrollHeight - prevScrollHeightRef.current;
      prevScrollHeightRef.current = null;
    }
  }, [messages]);

  useEffect(() => {
    const messageId = searchParams.get('messageId');
    if (messageId) {
      const element = document.getElementById(`msg-${messageId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [searchParams, messages]);

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/groups/${groupId}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveGroupMembers(data.members);
      }
    } catch (error) {
      console.error('Failed to fetch group members', error);
    }
  };

  const fetchMessages = async (groupId: string, isInitial = false, cursor: string | null = null) => {
    if (isLoadingMessages) return;
    setIsLoadingMessages(true);
    try {
      const token = localStorage.getItem('token');
      let url = `/api/groups/${groupId}/messages?limit=100`;
      if (cursor) {
        url += `&cursor=${cursor}`;
      }
      if (isInitial) {
        const msgId = searchParams.get('messageId');
        if (msgId) {
          url += `&targetMessageId=${msgId}`;
        }
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        
        if (!isInitial && messagesContainerRef.current) {
          prevScrollHeightRef.current = messagesContainerRef.current.scrollHeight;
        }

        const msgId = searchParams.get('messageId');
        const isSameAsCache = isInitial && !msgId && messageCache[groupId] && JSON.stringify(messageCache[groupId]) === JSON.stringify(data.messages.slice(-50));

        if (isSameAsCache) {
          setNextCursor(data.nextCursor);
          setHasMoreMessages(data.hasMore);
          return;
        }

        setMessages(prev => {
          let newMessages;
          if (isInitial) {
            newMessages = data.messages;
          } else {
            newMessages = [...data.messages, ...prev];
          }
          
          if (!msgId) {
            const newCache = {
              ...messageCache,
              [groupId]: newMessages.slice(-50)
            };
            setMessageCache(newCache);
            saveToCache(CACHE_KEYS.MESSAGES + '_groups', newCache);
          }
          
          return newMessages;
        });
        
        setNextCursor(data.nextCursor);
        setHasMoreMessages(data.hasMore);
        
        if (isInitial && !searchParams.get('messageId')) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
          }, 100);
        }
      }
    } catch (error) {
      console.error('Failed to fetch messages', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem('token');
      const [groupsRes, myGroupsRes, coursesRes, allCoursesRes] = await Promise.all([
        fetch('/api/groups'),
        fetch('/api/my-groups', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/my-courses', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/courses')
      ]);
      
      if (groupsRes.ok && myGroupsRes.ok) {
        const allData = await groupsRes.json();
        const myData = await myGroupsRes.json();
        
        setJoinedGroups(myData.groups);
        saveToCache(CACHE_KEYS.GROUPS + '_groups', myData.groups);
        
        // Filter out joined groups from available
        const joinedIds = new Set(myData.groups.map((g: any) => g.id));
        setAvailableGroups(allData.groups.filter((g: any) => !joinedIds.has(g.id)));
        
        if (myData.groups.length > 0 && !activeGroupId) {
          const groupIdFromUrl = searchParams.get('id');
          if (groupIdFromUrl && myData.groups.some((g: any) => g.id === groupIdFromUrl)) {
            const group = myData.groups.find((g: any) => g.id === groupIdFromUrl);
            if (group?.isDirectMessage) {
              navigate(`/messages?id=${groupIdFromUrl}`);
            } else {
              setActiveGroupId(groupIdFromUrl);
            }
          } else {
            const nonDms = myData.groups.filter((g: any) => !g.isDirectMessage);
            if (nonDms.length > 0) {
              setActiveGroupId(nonDms[0].id);
            }
          }
        }
      }
      
      if (coursesRes.ok && allCoursesRes.ok) {
        const data = await coursesRes.json();
        const allData = await allCoursesRes.json();
        setMyCourses(data.courses);
        setAllCourses(allData.courses);
        if (data.courses.length > 0) {
          setNewGroupCourseId(data.courses[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch data - full error:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name, 'Message:', error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDesc,
          tags: newGroupTags,
          courseId: newGroupCourseId
        })
      });
      
      if (res.ok) {
        fetchGroups();
        setShowCreateModal(false);
        setNewGroupName('');
        setNewGroupDesc('');
        setNewGroupTags('');
      }
    } catch (error) {
      console.error('Failed to create group', error);
    }
  };

  useEffect(() => {
    const displayed = joinedGroups.filter(g => !g.isDirectMessage);
    if (displayed.length > 0 && !displayed.some(g => g.id === activeGroupId)) {
      setActiveGroupId(displayed[0].id);
    }
  }, [joinedGroups]);

  const displayedGroups = joinedGroups.filter(g => !g.isDirectMessage);
  const activeGroup = joinedGroups.find(g => g.id === activeGroupId) || displayedGroups[0] || null;

  const getGroupInitials = (name: string) => {
    if (!name) return '';
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    
    // Show button if we are more than 100px away from the bottom
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
    
    if (activeMessageOptions) {
      setActiveMessageOptions(null);
    }
    
    // Load more messages when scrolling near top
    if (scrollTop < 100 && hasMoreMessages && !isLoadingMessages && nextCursor) {
      fetchMessages(activeGroupId, false, nextCursor);
    }
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
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    
    // Determine if we should auto-scroll
    const wasAtBottom = scrollHeight - scrollTop - clientHeight < 150;
    
    const lastMsg = messages[messages.length - 1];
    const isMe = lastMsg && (lastMsg.authorId === user?.id || lastMsg.isMe);

    if (wasAtBottom || isMe) {
      scrollToBottom();
    }
  }, [messages, user?.id]);

  const handleEnrollCourse = async (courseId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchGroups();
        setShowJoinModal(false);
        setJoinSearchQuery('');
      }
    } catch (error) {
      console.error('Failed to enroll in course', error);
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeGroup) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/groups/${activeGroup.id}/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchGroups();
        setShowGroupInfo(false);
      }
    } catch (error) {
      console.error('Failed to leave group', error);
    }
  };

  const handleStartDM = async (memberId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/dms/start`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ targetUserId: memberId })
      });
      
      if (res.ok) {
        const data = await res.json();
        navigate(`/messages?id=${data.group.id}`);
      }
    } catch (error) {
      console.error('Failed to start DM', error);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!message.trim() && !attachment) return;
    if (!activeGroupId) return;
    
    const tempId = 'temp-' + Date.now();
    const contentToSend = message;
    const replyToIdToSend = replyingTo?.id;
    const attachmentToSend = attachment;

    const tempMessage = {
      id: tempId,
      content: contentToSend,
      createdAt: new Date().toISOString(),
      authorId: user?.id,
      author: {
        id: user?.id,
        name: user?.name || 'Me',
        username: user?.username || 'me',
        avatarUrl: user?.avatarUrl
      },
      isMe: true,
      replyToId: replyToIdToSend,
      attachmentUrl: attachmentToSend ? URL.createObjectURL(attachmentToSend) : null,
      attachmentName: attachmentToSend?.name,
      attachmentSize: attachmentToSend?.size,
      attachmentType: attachmentToSend?.type,
      isPending: true
    };

    setMessages(prev => [...prev, tempMessage]);
    setMessage('');
    setReplyingTo(null);
    setAttachment(null);
    
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('content', contentToSend);
      if (replyToIdToSend) {
        formData.append('replyToId', replyToIdToSend.toString());
      }
      if (attachmentToSend) {
        formData.append('attachment', attachmentToSend);
      }

      const res = await fetch(`/api/groups/${activeGroupId}/messages`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}` 
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => prev.map(m => m.id === tempId ? data.message : m));
      } else {
        const err = await res.json();
        console.error('Failed to send message:', err);
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, isFailed: true, isPending: false } : m));
      }
    } catch (error) {
      console.error('Network error sending message:', error);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, isFailed: true, isPending: false } : m));
    }
  };

  const handleDeleteForMe = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/groups/${activeGroupId}/messages/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMessages(messages.map(m => m.id === id ? { ...m, deletedForMe: true } : m));
        setActiveMessageOptions(null);
      }
    } catch (error) {
      console.error('Failed to delete message for me', error);
    }
  };

  const handleDeleteForAll = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/groups/${activeGroupId}/messages/${id}?deleteForAll=true`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMessages(messages.map(m => m.id === id ? { ...m, deletedForAll: true, content: 'This message was deleted.' } : m));
        setActiveMessageOptions(null);
      }
    } catch (error) {
      console.error('Failed to delete message for all', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
      e.target.value = ''; // Reset input so the same file can be selected again
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && activeGroup) {
      const file = e.target.files[0];
      // In a real app, you would upload this file to a storage service (like S3 or Firebase Storage)
      // and get back a URL. For this demo, we'll use a local object URL or a placeholder.
      const fakeUrl = URL.createObjectURL(file);
      
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/groups/${activeGroup.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ avatarUrl: fakeUrl })
        });
        
        if (res.ok) {
          fetchGroups(); // Refresh groups to get the new avatar
        }
      } catch (error) {
        console.error('Failed to update group avatar', error);
      }
    }
  };

  const availableCourses = allCourses.filter(c => !myCourses.find(mc => mc.id === c.id));

  const categories = useMemo(() => {
    const allTags = new Set<string>();
    [...availableCourses, ...myCourses].forEach(c => {
      if (c.tags) {
        c.tags.split(',').forEach((t: string) => allTags.add(t.trim()));
      }
    });
    return ['All', ...Array.from(allTags).filter(Boolean)];
  }, [availableCourses, myCourses]);

  const filteredAvailableCourses = availableCourses.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(joinSearchQuery.toLowerCase()) || 
                          c.code.toLowerCase().includes(joinSearchQuery.toLowerCase());
    
    let matchesCategory = selectedCategory === 'All';
    if (!matchesCategory && c.tags) {
      const courseTags = c.tags.split(',').map((t: string) => t.trim());
      matchesCategory = courseTags.includes(selectedCategory);
    }
    
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
          <div className="flex gap-2">
            <button 
              onClick={() => setShowJoinModal(true)}
              className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-full transition-colors"
              title="Join Course"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
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
          {displayedGroups.map((group, index) => (
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
                <div className="w-10 h-10 rounded-full bg-neutral-950 border border-neutral-800 flex items-center justify-center text-neutral-400 overflow-hidden">
                  {group.avatarUrl ? (
                    <img src={group.avatarUrl} alt={group.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-sm font-bold">{getGroupInitials(group.name)}</span>
                  )}
                </div>
                <div>
                  <div className="font-medium text-sm text-neutral-200">{group.name}</div>
                  <div className="text-xs text-neutral-500 flex items-center gap-1">
                    <Users className="w-3 h-3" /> {group._count?.members || 0} students
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
          {displayedGroups.length === 0 && (
            <div className="p-4 text-center text-neutral-500 text-sm">
              You haven't joined any groups yet. Join a course to access its groups.
            </div>
          )}
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
                <div className="w-10 h-10 rounded-full bg-neutral-950 border border-neutral-800 flex items-center justify-center text-neutral-400 md:hidden overflow-hidden">
                  {activeGroup.avatarUrl ? (
                    <img src={activeGroup.avatarUrl} alt={activeGroup.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-sm font-bold">{getGroupInitials(activeGroup.name)}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-neutral-100">{activeGroup.name}</h3>
                  <p className="text-xs text-neutral-500">{activeGroup._count?.members || 0} students</p>
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
              className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat"
              style={{ backgroundBlendMode: 'overlay', backgroundColor: 'rgba(10, 10, 10, 0.98)' }}
            >
              {isLoadingMessages && hasMoreMessages && (
                <div className="text-center py-4">
                  <div className="inline-block w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              <div className="text-center mb-6">
                <div className="inline-block bg-neutral-900 border border-neutral-800 text-neutral-400 text-xs px-3 py-1 rounded-full">
                  Welcome to the {activeGroup.name} group! This is a space for students to discuss the course.
                </div>
              </div>
              {messages.filter(m => !m.deletedForMe).map((msg, index, arr) => {
                const prevMsg = index > 0 ? arr[index - 1] : null;
                const nextMsg = index < arr.length - 1 ? arr[index + 1] : null;

                const isDeleted = msg.deletedForAll;
                const repliedMsg = msg.replyToId ? messages.find(m => m.id === msg.replyToId) : null;
                const isMe = msg.isMe !== undefined ? msg.isMe : (msg.authorId === user?.id || msg.author?.id === user?.id || msg.author?.username === user?.username || msg.author?.name === 'Me');
                
                const prevIsMe = prevMsg ? (prevMsg.isMe !== undefined ? prevMsg.isMe : (prevMsg.authorId === user?.id || prevMsg.author?.id === user?.id || prevMsg.author?.username === user?.username || prevMsg.author?.name === 'Me')) : false;
                const nextIsMe = nextMsg ? (nextMsg.isMe !== undefined ? nextMsg.isMe : (nextMsg.authorId === user?.id || nextMsg.author?.id === user?.id || nextMsg.author?.username === user?.username || nextMsg.author?.name === 'Me')) : false;

                const getTimeString = (m: any) => new Date(m.createdAt || m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const msgTimeString = getTimeString(msg);
                const prevTimeString = prevMsg ? getTimeString(prevMsg) : null;
                const nextTimeString = nextMsg ? getTimeString(nextMsg) : null;

                // A message is from the same sender if both are 'isMe', or if they have the same authorId/sender string AND they were sent at the same time (same minute)
                const isSameSenderAsPrev = prevMsg && ((isMe && prevIsMe) || (!isMe && !prevIsMe && (msg.authorId === prevMsg.authorId || msg.sender === prevMsg.sender))) && (msgTimeString === prevTimeString);
                const isSameSenderAsNext = nextMsg && ((isMe && nextIsMe) || (!isMe && !nextIsMe && (msg.authorId === nextMsg.authorId || msg.sender === nextMsg.sender))) && (msgTimeString === nextTimeString);

                const senderName = msg.author?.name || msg.author?.username || msg.sender || 'Unknown User';

                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={msg.id} 
                    className={clsx(
                      "flex flex-col group/message", 
                      isMe ? "items-end" : "items-start",
                      isSameSenderAsPrev ? "mt-0.5" : "mt-3"
                    )}
                  >
                    <div className={clsx("flex items-end gap-2 max-w-[80%]", isMe ? "flex-row-reverse" : "flex-row")}>
                      {!isMe && (
                        <div className="w-8 flex-shrink-0">
                          {!isSameSenderAsNext && (
                            <ProfilePopover
                              username={msg.author?.username || senderName.toLowerCase()}
                              user={{
                                name: senderName,
                                handle: msg.author?.username || senderName.toLowerCase(),
                                bio: 'Student at Imam Mohammad Ibn Saud Islamic University.',
                                avatar: msg.author?.avatarUrl || `https://picsum.photos/seed/${msg.authorId}/100/100`
                              }}
                            >
                              <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-500 border border-neutral-700 overflow-hidden cursor-pointer">
                                <img 
                                  src={msg.author?.avatarUrl || `https://picsum.photos/seed/${msg.authorId}/100/100`} 
                                  alt={senderName} 
                                  className="w-full h-full object-cover" 
                                  referrerPolicy="no-referrer" 
                                />
                              </div>
                            </ProfilePopover>
                          )}
                        </div>
                      )}
                      
                      <div className="flex flex-col gap-1 relative">
                        {/* Options Menu */}
                        <div className={clsx(
                          "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/message:opacity-100 transition-opacity flex items-center gap-1",
                          isMe ? "right-full mr-2" : "left-full ml-2"
                        )}>
                          <div className="relative">
                            <button 
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setActiveMessageOptions(activeMessageOptions?.id === msg.id ? null : {
                                  id: msg.id,
                                  rect,
                                  isMe,
                                  isDeleted,
                                  msg
                                });
                              }}
                              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div id={`msg-${msg.id}`} className={clsx(
                          "px-3 py-2 text-sm shadow-sm min-w-0 break-words whitespace-pre-wrap relative flex flex-col",
                          isMe 
                            ? "bg-primary-600 text-white shadow-[0_2px_10px_rgba(99,102,241,0.2)]" 
                            : "bg-neutral-800/80 backdrop-blur-sm border border-neutral-700/50 text-neutral-200 shadow-[0_2px_10px_rgba(0,0,0,0.2)]",
                          isMe
                            ? clsx(
                                "rounded-l-2xl",
                                isSameSenderAsPrev ? "rounded-tr-md" : "rounded-tr-2xl",
                                isSameSenderAsNext ? "rounded-br-md" : "rounded-br-2xl"
                              )
                            : clsx(
                                "rounded-r-2xl",
                                isSameSenderAsPrev ? "rounded-tl-md" : "rounded-tl-2xl",
                                isSameSenderAsNext ? "rounded-bl-md" : "rounded-bl-2xl"
                              ),
                          isDeleted && "italic text-neutral-400 bg-neutral-900 border border-neutral-800 shadow-none"
                        )}>
                          {!isMe && !isDeleted && !isSameSenderAsPrev && <div className="text-[11px] text-primary-400 mb-1 font-semibold">{senderName}</div>}
                          
                          {repliedMsg && !isDeleted && (
                            <div className="mb-2 p-2 rounded-lg bg-black/20 border-l-2 border-primary-400 text-xs">
                              <div className="font-semibold text-primary-300 mb-0.5">{repliedMsg.author?.name || 'Unknown'}</div>
                              <div className="truncate opacity-80">{repliedMsg.content}</div>
                            </div>
                          )}

                          {msg.attachmentUrl && !isDeleted && (
                            <div className={clsx("mb-1 rounded-xl overflow-hidden", msg.attachmentType?.startsWith('image/') ? "bg-black/20" : "bg-black/10")}>
                              {msg.attachmentType?.startsWith('image/') ? (
                                <img src={msg.attachmentUrl} alt="attachment" className="max-w-full max-h-64 object-cover" />
                              ) : (
                                <a 
                                  href={`/api/download?url=${encodeURIComponent(msg.attachmentUrl)}&filename=${encodeURIComponent(msg.attachmentName || 'file')}`}
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  download={msg.attachmentName}
                                  className="flex items-center gap-3 p-3 hover:bg-black/20 transition-colors"
                                >
                                  <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", isMe ? "bg-white/20" : "bg-primary-500/20")}>
                                    <FileText className={clsx("w-5 h-5", isMe ? "text-white" : "text-primary-300")} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">{msg.attachmentName}</div>
                                    <div className="text-[11px] opacity-70 mt-0.5 uppercase">
                                      {msg.attachmentSize ? (msg.attachmentSize / 1024).toFixed(1) + ' KB' : 'FILE'} • {msg.attachmentName?.split('.').pop() || 'UNKNOWN'}
                                    </div>
                                  </div>
                                </a>
                              )}
                            </div>
                          )}

                          <div className="flex items-end justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <FormattedText text={msg.content || msg.text} />
                            </div>
                            <div className={clsx(
                              "text-[10px] shrink-0 mb-[-2px] flex items-center gap-1", 
                              isMe ? "text-primary-200" : "text-neutral-500"
                            )}>
                              {msgTimeString}
                              {msg.isPending && <Clock className="w-3 h-3 opacity-70" />}
                              {msg.isFailed && <X className="w-3 h-3 text-red-400" />}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
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
                        <span className="text-xs font-bold text-primary-400">Replying to {replyingTo.author?.name || 'Unknown'}</span>
                        <span className="text-sm text-neutral-300 truncate">{replyingTo.content}</span>
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
                        {activeGroupMembers
                          .filter(u => (u.username || u.name || '').toLowerCase().includes(message.split('@').pop()?.toLowerCase() || ''))
                          .map(member => (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() => {
                                const parts = message.split('@');
                                parts.pop();
                                setMessage(parts.join('@') + '@' + (member.username || member.name) + ' ');
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-primary-600 hover:text-white text-neutral-200 text-sm transition-colors flex items-center gap-2"
                            >
                              <div className="w-6 h-6 rounded-full bg-neutral-700 overflow-hidden shrink-0">
                                <img 
                                  src={member.avatarUrl || `https://picsum.photos/seed/${member.id}/100/100`} 
                                  alt={member.name || member.username} 
                                  className="w-full h-full object-cover" 
                                  referrerPolicy="no-referrer" 
                                />
                              </div>
                              <span className="font-medium">{member.name || member.username}</span>
                              {member.username && <span className="text-xs opacity-70">@{member.username}</span>}
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
                <div className="w-20 h-20 mx-auto rounded-2xl bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center text-neutral-400 mb-4 shadow-inner overflow-hidden relative group">
                  {activeGroup?.avatarUrl ? (
                    <img src={activeGroup.avatarUrl} alt={activeGroup.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-2xl font-bold">{getGroupInitials(activeGroup?.name || '')}</span>
                  )}
                  {activeGroupMembers.find(m => m.id === user?.id)?.role === 'admin' && (
                    <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera className="w-6 h-6 text-white" />
                      <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                    </label>
                  )}
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
                <div className="flex gap-4 flex-wrap">
                  {messages.filter(m => m.attachmentType?.includes('pdf') || m.attachmentType?.includes('document') || m.attachmentType?.includes('text')).length > 0 && (
                    <div className="flex flex-col items-center gap-2 cursor-pointer group">
                      <div className="w-14 h-14 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center group-hover:border-primary-500 transition-colors">
                        <FileText className="w-6 h-6 text-blue-400" />
                      </div>
                      <span className="text-xs text-neutral-400">{messages.filter(m => m.attachmentType?.includes('pdf') || m.attachmentType?.includes('document') || m.attachmentType?.includes('text')).length} Docs</span>
                    </div>
                  )}
                  {messages.filter(m => m.attachmentType?.includes('image')).length > 0 && (
                    <div className="flex flex-col items-center gap-2 cursor-pointer group">
                      <div className="w-14 h-14 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center group-hover:border-primary-500 transition-colors">
                        <ImageIcon className="w-6 h-6 text-green-400" />
                      </div>
                      <span className="text-xs text-neutral-400">{messages.filter(m => m.attachmentType?.includes('image')).length} Images</span>
                    </div>
                  )}
                  {messages.filter(m => m.attachmentType?.includes('video')).length > 0 && (
                    <div className="flex flex-col items-center gap-2 cursor-pointer group">
                      <div className="w-14 h-14 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center group-hover:border-primary-500 transition-colors">
                        <File className="w-6 h-6 text-purple-400" />
                      </div>
                      <span className="text-xs text-neutral-400">{messages.filter(m => m.attachmentType?.includes('video')).length} Videos</span>
                    </div>
                  )}
                  {messages.filter(m => m.attachmentType?.includes('audio')).length > 0 && (
                    <div className="flex flex-col items-center gap-2 cursor-pointer group">
                      <div className="w-14 h-14 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center group-hover:border-primary-500 transition-colors">
                        <File className="w-6 h-6 text-yellow-400" />
                      </div>
                      <span className="text-xs text-neutral-400">{messages.filter(m => m.attachmentType?.includes('audio')).length} Audio</span>
                    </div>
                  )}
                  {messages.filter(m => m.attachmentType).length === 0 && (
                    <div className="text-xs text-neutral-500 w-full text-center py-2">No media shared yet</div>
                  )}
                </div>
              </div>

              <div className="p-4">
                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4 flex items-center justify-between">
                  <span>Members ({activeGroupMembers.length})</span>
                  <Search className="w-4 h-4" />
                </h4>
                <div className="space-y-3">
                  {activeGroupMembers.map(member => (
                    <div key={member.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ProfilePopover
                          username={member.username}
                          user={{
                            name: member.name || member.username,
                            handle: member.username,
                            bio: 'Student at Imam Mohammad Ibn Saud Islamic University.',
                            avatar: member.avatarUrl || `https://picsum.photos/seed/${member.id}/100/100`
                          }}
                        >
                          <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-500 border border-neutral-700 overflow-hidden">
                            <img 
                              src={member.avatarUrl || `https://picsum.photos/seed/${member.id}/100/100`} 
                              alt={member.name || member.username} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer" 
                            />
                          </div>
                        </ProfilePopover>
                        <span className="text-sm font-medium text-neutral-200">{member.name || member.username}</span>
                      </div>
                      {member.role === 'admin' && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded">ADMIN</span>
                          {member.id !== user?.id && (
                            <button 
                              onClick={() => handleStartDM(member.id)}
                              className="p-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-md text-neutral-300 transition-colors" 
                              title="Message Admin privately"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                          )}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowJoinModal(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900">
                <h3 className="font-bold text-lg text-white">Join Courses</h3>
                <button onClick={() => setShowJoinModal(false)} className="text-neutral-400 hover:text-white bg-neutral-800 rounded-full p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 border-b border-neutral-800 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input 
                    type="text" 
                    placeholder="Search courses by name or code..." 
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-md py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-primary-500 text-neutral-200 transition-colors"
                    value={joinSearchQuery}
                    onChange={(e) => setJoinSearchQuery(e.target.value)}
                  />
                </div>
                <div 
                  {...dragScroll}
                  className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide select-none"
                >
                  {categories.map(category => (
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
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {filteredAvailableCourses.length === 0 ? (
                  <div className="text-center text-neutral-500 py-8">No courses found matching your search.</div>
                ) : (
                  filteredAvailableCourses.map((course, index) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      key={course.id} 
                      className="p-3 hover:bg-neutral-800/50 rounded-lg flex items-center justify-between group transition-colors"
                    >
                      <div>
                        <div className="font-bold text-neutral-200">{course.code}</div>
                        <div className="text-xs text-neutral-500">{course.name}</div>
                        <div className="flex items-center gap-3 mt-1">
                          {course.tags && course.tags.split(',').map((tag: string, i: number) => (
                            <div key={i} className="text-[10px] font-medium text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-full">
                              {tag.trim()}
                            </div>
                          ))}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleEnrollCourse(course.id)}
                        className="bg-neutral-800 hover:bg-primary-600 text-white text-sm font-medium px-4 py-1.5 rounded-full transition-colors border border-neutral-700 hover:border-primary-500"
                      >
                        Join
                      </button>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report Message Modal */}
      <AnimatePresence>
        {reportingMessage && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setReportingMessage(null); setReportReason(''); }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-800">
                <h2 className="text-xl font-bold text-white">Report Message</h2>
                <p className="text-sm text-neutral-400 mt-1">Help us keep the community safe by reporting inappropriate content.</p>
              </div>

              <div className="p-6">
                <div className="bg-neutral-950 p-4 rounded-xl mb-6">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-2">Message to report</span>
                  <div className="flex items-center gap-3 mb-2">
                    <img 
                      src={reportingMessage.author?.avatarUrl || `https://picsum.photos/seed/${reportingMessage.authorId}/50/50`} 
                      className="w-6 h-6 rounded-full object-cover" 
                      alt=""
                    />
                    <span className="text-xs font-bold text-neutral-300">{reportingMessage.author?.name || 'User'}</span>
                  </div>
                  <p className="text-sm text-neutral-200 line-clamp-3 italic">"{reportingMessage.content}"</p>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Why are you reporting this message?</label>
                  <textarea 
                    autoFocus
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Provide details about the issue..."
                    className="w-full h-32 bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-sm text-neutral-200 focus:outline-none focus:border-primary-500/50 transition-all resize-none placeholder:text-neutral-700"
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['Harassment', 'Spam', 'Hate Speech', 'Inappropriate Content', 'Self-Harm'].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setReportReason(prev => prev ? `${prev}, ${tag}` : tag)}
                        className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 text-[10px] font-bold rounded-full transition-colors border border-neutral-700"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-neutral-900/50 border-t border-neutral-800 flex gap-3">
                <button 
                  disabled={isSubmittingReport}
                  onClick={() => {
                    setReportingMessage(null);
                    setReportReason('');
                  }}
                  className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  disabled={isSubmittingReport || !reportReason.trim()}
                  onClick={async () => {
                    setIsSubmittingReport(true);
                    try {
                      const token = localStorage.getItem('token');
                      const res = await fetch('/api/reports', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          reportedId: reportingMessage.authorId || reportingMessage.author?.id,
                          type: 'MESSAGE',
                          contentId: reportingMessage.id,
                          reason: reportReason
                        })
                      });

                      if (res.ok) {
                        setReportingMessage(null);
                        setReportReason('');
                        alert('Your report has been submitted. Thank you for helping keep our community safe.');
                      } else {
                        const errorText = await res.text();
                        let errorMessage = 'Failed to submit report. Please try again.';
                        try {
                           const data = JSON.parse(errorText);
                           errorMessage = data.error || errorMessage;
                        } catch (e) {
                           console.error("Non-JSON error response:", errorText);
                        }
                        alert(errorMessage);
                      }
                    } catch (error) {
                      console.error('Report error:', error);
                      alert('Failed to submit report. Please check your connection.');
                    } finally {
                      setIsSubmittingReport(false);
                    }
                  }}
                  className="flex-1 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                >
                  Submit Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Message Options Modal */}
      {activeMessageOptions && createPortal(
        <div 
          className="fixed inset-0 z-[99998]" 
          onClick={() => setActiveMessageOptions(null)}
          onContextMenu={(e) => { e.preventDefault(); setActiveMessageOptions(null); }}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              top: activeMessageOptions.rect.bottom + 8,
              left: activeMessageOptions.isMe 
                ? Math.max(16, activeMessageOptions.rect.right - 192) // 192px is w-48
                : Math.min(window.innerWidth - 192 - 16, activeMessageOptions.rect.left),
              zIndex: 99999
            }}
            className="w-48 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-1">
              <button 
                onClick={() => { setReplyingTo(activeMessageOptions.msg); setActiveMessageOptions(null); }}
                className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-neutral-300 hover:text-white text-sm rounded-lg transition-colors flex items-center gap-3"
              >
                <Reply className="w-4 h-4" /> Reply
              </button>
              <button 
                onClick={() => { 
                   setReportingMessage(activeMessageOptions.msg);
                   setActiveMessageOptions(null); 
                }}
                className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-red-400 hover:text-red-300 text-sm rounded-lg transition-colors flex items-center gap-3"
              >
                <ShieldAlert className="w-4 h-4" /> Report message
              </button>
              {activeMessageOptions.isMe && !activeMessageOptions.isDeleted && (
                <>
                  <button 
                    onClick={() => { handleDeleteForMe(activeMessageOptions.id); setActiveMessageOptions(null); }}
                    className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-neutral-300 hover:text-white text-sm rounded-lg transition-colors flex items-center gap-3"
                  >
                    <Trash2 className="w-4 h-4" /> Delete for me
                  </button>
                  <button 
                    onClick={() => { handleDeleteForAll(activeMessageOptions.id); setActiveMessageOptions(null); }}
                    className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-red-400 hover:text-red-300 text-sm rounded-lg transition-colors flex items-center gap-3 mt-1"
                  >
                    <Trash2 className="w-4 h-4" /> Delete for everyone
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </motion.div>
  );
}
