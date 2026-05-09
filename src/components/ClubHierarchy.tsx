import { toast } from 'sonner';
import React, { useState, useEffect, useMemo } from 'react';
import { Users, User as UserIcon, MoreHorizontal, ChevronDown, ChevronUp, Shield, Trash2, GripVertical } from 'lucide-react';
import { clsx } from 'clsx';
import { Calendar, Mail, ExternalLink } from 'lucide-react';
import ProfilePopover from './ProfilePopover';
import OptimizedImage from './OptimizedImage';
import { motion, AnimatePresence } from 'motion/react';
import {
  DndContext,
  pointerWithin,
  rectIntersection,
  closestCenter,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragStartEvent,
  DragEndEvent,
  useDraggable,
  useDroppable
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface ClubMember {
  id: string;
  userId: string;
  clubId: string;
  joinedAt: string;
  isAdmin: boolean;
  roleTitle: string | null;
  managerId: string | null;
  user: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string | null;
    bio?: string | null;
    studentEmail?: string | null;
    googleEmail?: string | null;
    createdAt?: string;
    links?: Array<{ id: string; url: string; platform: string; title?: string }>;
  };
}

function UserNode({ member, isOverlay = false, isReadOnly = false, disableDrop = false }: { member: ClubMember, isOverlay?: boolean, isReadOnly?: boolean, disableDrop?: boolean }) {
  const displayName = member.user?.name || member.user?.username || 'Unknown';

  const { attributes, listeners, setNodeRef: setDraggableRef, isDragging } = useDraggable({
    id: member.id,
    data: { member },
    disabled: isReadOnly || isOverlay,
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `drop-${member.id}`,
    data: { targetMemberId: member.id },
    disabled: isReadOnly || isOverlay || disableDrop,
  });

  const style = {
    opacity: isDragging && !isOverlay ? 0.3 : 1,
  };

  return (
    <motion.div layout className="relative flex flex-col items-center" ref={setDroppableRef}>
      <div 
        ref={setDraggableRef}
        style={style}
        {...(!isReadOnly ? attributes : {})}
        {...(!isReadOnly ? listeners : {})}
        className={clsx(
          "w-36 bg-neutral-900 border rounded-xl p-2.5 shadow-lg flex flex-col items-center gap-1.5 transition-colors relative",
          !isReadOnly && "cursor-grab active:cursor-grabbing",
          isOver && !isReadOnly ? "border-primary-500 bg-primary-500/10 shadow-inner z-10" : "border-neutral-800",
          !isReadOnly && !isOver && "hover:border-neutral-700",
          isOverlay ? "rotate-2 shadow-xl border-primary-500 z-50 cursor-grabbing" : ""
        )}
      >
        {!isReadOnly && !isOverlay && (
          <div className="absolute top-2 left-2 text-neutral-600 hover:text-neutral-400 cursor-grab">
            <GripVertical className="w-4 h-4" />
          </div>
        )}
        <div className="w-10 h-10 rounded-full bg-neutral-800 overflow-hidden flex-shrink-0 border border-neutral-700">
          {member.user?.avatarUrl ? (
            <OptimizedImage src={member.user.avatarUrl} alt={displayName} variant="small" className="w-full h-full object-cover" />
          ) : (
             <UserIcon className="w-6 h-6 m-2 text-neutral-500" />
          )}
        </div>
        <div className="text-center w-full">
          <h3 className="font-medium text-sm text-white truncate px-1 flex items-center justify-center gap-1">
            {displayName}
            {member.isAdmin && <Shield className="w-3 h-3 text-primary-400" />}
          </h3>
          <p className="text-xs text-primary-400 font-medium truncate">{member.roleTitle || (member.isAdmin ? 'Role: Admin' : 'Member')}</p>
        </div>
      </div>
    </motion.div>
  );
}

function OrgTree({ 
  nodeId, 
  membersByManager, 
  membersMap, 
  onMemberClick,
  isReadOnly,
  depth = 0,
  maxDepth,
  activeMemberId
}: { 
  key?: React.Key,
  nodeId: string, 
  membersByManager: Record<string, ClubMember[]>, 
  membersMap: Record<string, ClubMember>,
  onMemberClick: (member: ClubMember) => void,
  isReadOnly?: boolean,
  depth?: number,
  maxDepth?: number,
  activeMemberId?: string | null
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const nodeMember = membersMap[nodeId];
  const children = membersByManager[nodeId] || [];

  if (!nodeMember) return null;
  
  if (maxDepth !== undefined && depth > maxDepth) return null;
  
  const hasVisibleChildren = children.length > 0 && (maxDepth === undefined || depth < maxDepth);
  const isTargetDragged = activeMemberId === nodeId;

  return (
    <motion.div layout className="flex flex-col items-center relative">
      <div className="group relative">
          <div 
             className={clsx(!isTargetDragged && !isReadOnly && "cursor-pointer")}
             onClick={() => {
               if (!isTargetDragged && !isReadOnly) {
                 onMemberClick(nodeMember);
               }
             }}
           >
             {isReadOnly ? (
               <ProfilePopover username={nodeMember.user?.username} user={nodeMember.user as any}>
                 <div><UserNode member={nodeMember} isReadOnly={isReadOnly} /></div>
               </ProfilePopover>
             ) : (
               <UserNode member={nodeMember} isReadOnly={isReadOnly} />
             )}
           </div>

         {hasVisibleChildren && depth < 2 && (
           <button 
             onClick={() => setIsExpanded(!isExpanded)}
             className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-neutral-800 border border-neutral-700 rounded-full flex items-center justify-center hover:bg-neutral-700 z-10 text-white cursor-pointer"
           >
             {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
           </button>
         )}
      </div>

      <AnimatePresence>
        {!isTargetDragged && isExpanded && hasVisibleChildren && depth < 2 && (
          <motion.div 
            key="tree-depth-less"
            initial={{ opacity: 0, scale: 0.8, y: -20, height: 0 }}
            animate={{ opacity: 1, scale: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, scale: 0.5, y: -40, height: 0 }}
            transition={{ duration: 0.4, type: 'spring', bounce: 0.2 }}
            className="origin-top"
          >
            <div className="w-px h-6 bg-neutral-700 my-1 pointer-events-none mx-auto"></div>
            <div className="flex flex-row flex-wrap justify-center gap-4 relative items-start pointer-events-auto">
              {children.length > 1 && (
                <div className="absolute top-0 left-[calc(50%/var(--num-children))] right-[calc(50%/var(--num-children))] h-px bg-neutral-700"
                     style={{ 
                       left: `calc(${100 / (children.length * 2)}%)`, 
                       right: `calc(${100 / (children.length * 2)}%)` 
                     }}
                ></div>
              )}
              
              {children.map((child) => (
                <div key={child.id} className="flex flex-col items-center relative pt-4">
                  <div className="absolute top-0 left-1/2 w-px h-4 bg-neutral-700 pointer-events-none"></div>
                  <OrgTree 
                    nodeId={child.id} 
                    membersByManager={membersByManager} 
                    membersMap={membersMap} 
                    onMemberClick={onMemberClick}
                    isReadOnly={isReadOnly}
                    depth={depth + 1}
                    maxDepth={maxDepth}
                    activeMemberId={activeMemberId}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {!isTargetDragged && isExpanded && hasVisibleChildren && depth >= 2 && (
          <motion.div 
            key="tree-depth-more"
            initial={{ opacity: 0, scale: 0.8, x: -20, height: 0 }}
            animate={{ opacity: 1, scale: 1, x: 0, height: 'auto' }}
            exit={{ opacity: 0, scale: 0.8, x: -20, height: 0 }}
            transition={{ duration: 0.4, type: 'spring', bounce: 0.2 }}
            className="flex flex-col gap-3 mt-4 w-36 origin-top-left"
          >
            {children.map((child) => (
              <ChildNode
                key={child.id}
                child={child}
                membersByManager={membersByManager}
                membersMap={membersMap}
                onMemberClick={onMemberClick}
                isReadOnly={isReadOnly}
                depth={depth}
                maxDepth={maxDepth}
                activeMemberId={activeMemberId}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ClubHierarchy({ 
  clubId, 
  isReadOnly = false, 
  initialMembers,
  maxDepth
}: { 
  clubId: string, 
  isReadOnly?: boolean, 
  initialMembers?: ClubMember[],
  maxDepth?: number
}) {
  const [members, setMembers] = useState<ClubMember[]>(initialMembers || []);
  const [isLoading, setIsLoading] = useState(!initialMembers);
  const [selectedMemberForModal, setSelectedMemberForModal] = useState<ClubMember | null>(null);
  const [activeMember, setActiveMember] = useState<ClubMember | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const fetchMembers = async () => {
    if (initialMembers) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/clubs/${clubId}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members);
      }
    } catch (error) {
      console.error('Failed to fetch members', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialMembers) fetchMembers();
  }, [clubId, initialMembers]);

  const membersMap = useMemo(() => {
    return members.reduce((acc, m) => {
      acc[m.id] = m;
      return acc;
    }, {} as Record<string, ClubMember>);
  }, [members]);

  const { membersByManager, rootMembers, unassignedMembers } = useMemo(() => {
    const byManager: Record<string, ClubMember[]> = {};
    const unassigned: ClubMember[] = [];
    const roots: ClubMember[] = [];

    members.forEach(m => {
      if (m.managerId) {
        if (!byManager[m.managerId]) byManager[m.managerId] = [];
        byManager[m.managerId].push(m);
      }
    });

    members.forEach(m => {
      if (!m.managerId) {
        if (byManager[m.id] || m.isAdmin || !!m.roleTitle) {
          roots.push(m);
        } else {
          unassigned.push(m);
        }
      }
    });

    return { membersByManager: byManager, rootMembers: roots, unassignedMembers: unassigned };
  }, [members]);

  const handleUpdateTitle = async (title: string) => {
    if (!selectedMemberForModal) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/clubs/${clubId}/members/${selectedMemberForModal.userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ roleTitle: title })
      });
      setMembers(members.map(m => m.id === selectedMemberForModal.id ? { ...m, roleTitle: title } : m));
      setSelectedMemberForModal({ ...selectedMemberForModal, roleTitle: title });
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleAdmin = async (isAdmin: boolean) => {
    if (!selectedMemberForModal) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/clubs/${clubId}/members/${selectedMemberForModal.userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isAdmin })
      });
      setMembers(members.map(m => m.id === selectedMemberForModal.id ? { ...m, isAdmin } : m));
      setSelectedMemberForModal({ ...selectedMemberForModal, isAdmin });
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMemberForModal) return;
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/clubs/${clubId}/members/${selectedMemberForModal.userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMembers(members.filter(m => m.id !== selectedMemberForModal.id));
        setSelectedMemberForModal(null);
      } else {
        toast.error('Failed to remove member');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateManager = async (managerId: string | null) => {
    if (!selectedMemberForModal) return;
    
    if (managerId) {
      let currentManager = membersMap[managerId]?.managerId;
      while (currentManager) {
        if (currentManager === selectedMemberForModal.id) {
          toast.error('Cannot create a circular management hierarchy.');
          return;
        }
        currentManager = membersMap[currentManager]?.managerId;
      }
    }

    try {
      const token = localStorage.getItem('token');
      // If managerId is null and they are being completely unassigned, optionally clear role
      // But actually, we just need to ensure the DB accepts managerId = null. 
      const res = await fetch(`/api/clubs/${clubId}/members/${selectedMemberForModal.userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ managerId, roleTitle: managerId === null && !selectedMemberForModal.isAdmin ? '' : selectedMemberForModal.roleTitle })
      });
      if (res.ok) {
        setMembers(members.map(m => m.id === selectedMemberForModal.id ? { ...m, managerId, roleTitle: managerId === null && !m.isAdmin ? '' : m.roleTitle } : m));
        setSelectedMemberForModal({ ...selectedMemberForModal, managerId, roleTitle: managerId === null && !selectedMemberForModal.isAdmin ? '' : selectedMemberForModal.roleTitle });
      } else {
        toast.error('Failed to update role hierarchy');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error updating role');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveMember(event.active.data.current?.member);
  };

  const countDescendants = (memberId: string): number => {
    let count = 0;
    const children = membersByManager[memberId] || [];
    count += children.length;
    for (const child of children) {
      count += countDescendants(child.id);
    }
    return count;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveMember(null);
    const { active, over } = event;

    if (!over) return;

    const draggableMemberId = active.id as string;
    const dropTargetId = over.id as string;
    
    let newManagerId: string | null = null;
    
    if (dropTargetId === 'unassigned-zone') {
      newManagerId = null;
    } else if (dropTargetId.startsWith('drop-')) {
      newManagerId = over.data.current?.targetMemberId;
    }

    const draggedMem = membersMap[draggableMemberId];
    if (!draggedMem) return;

    if (newManagerId === draggableMemberId) return;
    if (dropTargetId !== 'unassigned-zone' && newManagerId === draggedMem.managerId) return;

    if (newManagerId) {
      let currentManager = membersMap[newManagerId]?.managerId;
      while (currentManager) {
        if (currentManager === draggableMemberId) {
          toast.error('Cannot create a circular management hierarchy.');
          return;
        }
        currentManager = membersMap[currentManager]?.managerId;
      }
    }

    try {
      const token = localStorage.getItem('token');
      const isDroppingToUnassigned = dropTargetId === 'unassigned-zone';
      const bodyPayload = isDroppingToUnassigned 
        ? { managerId: null, roleTitle: '', isAdmin: false } 
        : { managerId: newManagerId, roleTitle: newManagerId === null && !draggedMem.isAdmin ? '' : draggedMem.roleTitle };

      const res = await fetch(`/api/clubs/${clubId}/members/${draggedMem.userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(bodyPayload)
      });
      if (res.ok) {
        setMembers(members.map(m => m.id === draggableMemberId ? { ...m, ...bodyPayload } : m));
      } else {
        toast.error('Failed to update role hierarchy');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error updating role');
    }
  };

  const { setNodeRef: setUnassignedDropRef, isOver: isOverUnassigned } = useDroppable({
    id: 'unassigned-zone',
    disabled: isReadOnly
  });

  if (isLoading) return <div className="p-8 text-neutral-400">Loading hierarchy...</div>;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col w-full">
        <div className="w-full py-4">
          <div className="flex flex-col items-center w-full pb-16">
            {rootMembers.length === 0 ? (
              <div 
                className={clsx(
                  "text-center py-16 px-12 bg-neutral-900/80 backdrop-blur-sm rounded-[2rem] border shadow-2xl transition-colors",
                  "border-neutral-800/50"
                )}
              >
                <Users className="w-16 h-16 mx-auto opacity-20 mb-6 text-white" />
                <p className="text-xl font-medium text-white">No members have been assigned roles.</p>
                {!isReadOnly && <p className="text-neutral-500 mt-2">Drag members from below to start building the chart</p>}
              </div>
            ) : (
              <div 
                className={clsx(
                  "flex flex-row gap-24 items-start min-w-[800px] p-8 rounded-[2rem] transition-colors border",
                  "border-transparent"
                )}
              >
                {rootMembers.map(root => (
                  <OrgTree 
                    key={root.id} 
                    nodeId={root.id} 
                    membersByManager={membersByManager} 
                    membersMap={membersMap} 
                    onMemberClick={setSelectedMemberForModal}
                    isReadOnly={isReadOnly}
                    depth={0}
                    maxDepth={maxDepth}
                    activeMemberId={activeMember?.id}
                  />
                ))}
              </div>
            )}
            
            {/* Unassigned Members Section */}
            {!isReadOnly && (
              <div 
                ref={setUnassignedDropRef}
                className={clsx(
                  "mt-16 pt-8 w-full border-t transition-colors duration-300 rounded-[2rem] p-8",
                  isOverUnassigned ? "bg-primary-500/10 border-primary-500 border-2 border-dashed shadow-inner" : "border-neutral-800"
                )}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-neutral-400" />
                    Unassigned Members
                  </h3>
                  <div className="text-sm font-medium text-neutral-500">Drag members here to remove from chart</div>
                </div>
                
                <div className="flex flex-wrap gap-4 min-h-[120px] justify-center">
                  {unassignedMembers.length === 0 ? (
                    <div className="w-full flex-1 flex flex-col items-center justify-center text-neutral-500 bg-neutral-900/50 rounded-2xl border-2 border-dashed border-neutral-800/80">
                      <div className="w-12 h-12 rounded-full bg-neutral-800/50 flex items-center justify-center mb-3">
                        <UserIcon className="w-6 h-6 text-neutral-600" />
                      </div>
                      <p className="font-medium text-neutral-400">No unassigned members</p>
                      <p className="text-xs mt-1 text-neutral-500">All members have roles in the chart.</p>
                    </div>
                  ) : (
                    unassignedMembers.map(member => (
                      <UnassignedMemberNode 
                        key={member.id} 
                        member={member} 
                        isReadOnly={isReadOnly} 
                        onMemberClick={setSelectedMemberForModal} 
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {false && selectedMemberForModal && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-center p-4 pt-10">
            <div className="bg-neutral-900 rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl border border-neutral-800 flex flex-col max-h-[90vh] pb-4">
              <div className="p-8 pb-6 bg-neutral-900 overflow-y-auto custom-scrollbar flex-1">
                <div className="flex flex-col gap-6">
                  <div className="flex gap-5 items-start">
                    <div className="w-24 h-24 rounded-full bg-neutral-800 overflow-hidden flex-shrink-0 border-2 border-neutral-700 shadow-xl">
                      {selectedMemberForModal.user.avatarUrl ? (
                        <OptimizedImage src={selectedMemberForModal.user.avatarUrl} alt={selectedMemberForModal.user.name} variant="small" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-neutral-800">
                          <UserIcon className="w-10 h-10 text-neutral-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 pt-2">
                      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        {selectedMemberForModal.user.name}
                        {selectedMemberForModal.isAdmin && <Shield className="w-5 h-5 text-primary-400" />}
                      </h2>
                      <p className="text-neutral-400 font-medium">@{selectedMemberForModal.user.username}</p>
                      {selectedMemberForModal.user.bio && (
                        <p className="mt-3 text-sm text-neutral-300 leading-relaxed bg-neutral-800/50 p-3 rounded-xl border border-neutral-700/50">
                          {selectedMemberForModal.user.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 flex flex-col gap-1">
                      <span className="text-neutral-500 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Joined</span>
                      <span className="text-white text-sm font-medium">
                        {new Date(selectedMemberForModal.joinedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    {(selectedMemberForModal.user.studentEmail || selectedMemberForModal.user.googleEmail) && (
                      <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 flex flex-col gap-1">
                        <span className="text-neutral-500 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email</span>
                        <span className="text-white text-sm font-medium truncate" title={selectedMemberForModal.user.studentEmail || selectedMemberForModal.user.googleEmail || ''}>
                          {selectedMemberForModal.user.studentEmail || selectedMemberForModal.user.googleEmail}
                        </span>
                      </div>
                    )}
                  </div>

                  {selectedMemberForModal.user.links && selectedMemberForModal.user.links.length > 0 && (
                    <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800">
                      <span className="text-neutral-500 text-xs font-semibold uppercase tracking-wider block mb-3">Links</span>
                      <div className="flex flex-wrap gap-2">
                        {selectedMemberForModal.user.links.map(link => (
                          <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 transition-colors rounded-lg text-sm text-neutral-300 font-medium">
                            <ExternalLink className="w-3.5 h-3.5" />
                            {link.title || link.platform || 'Link'}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800 space-y-4">
                    <div>
                      <label className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-3 block">Organizational Role</label>
                      {isReadOnly ? (
                        <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
                          <p className="text-neutral-200 font-medium">{selectedMemberForModal.roleTitle || (selectedMemberForModal.isAdmin ? 'Admin' : 'Member')}</p>
                        </div>
                      ) : (
                        <input 
                          type="text" 
                          className="w-full bg-neutral-900 border border-neutral-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all placeholder:text-neutral-600"
                          placeholder="e.g. President, Vice President..."
                          value={selectedMemberForModal.roleTitle || ''}
                          onChange={(e) => handleUpdateTitle(e.target.value)}
                        />
                      )}
                    </div>
                    
                    {!isReadOnly && (
                      <div>
                        <label className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-3 block">Reports To (Manager)</label>
                        <select
                          className="w-full bg-neutral-900 border border-neutral-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                          value={selectedMemberForModal.managerId || ''}
                          onChange={(e) => handleUpdateManager(e.target.value || null)}
                        >
                          <option value="">-- No Manager (Root / Unassigned) --</option>
                          {members.filter(m => m.id !== selectedMemberForModal.id).map(m => (
                            <option key={m.id} value={m.id}>{m.user?.name || m.user?.username}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleUpdateManager(null)}
                          className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-neutral-700 hover:border-neutral-500 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium transition-colors"
                        >
                          Unassign from Chart
                        </button>
                        <p className="text-xs text-neutral-500 mt-2">
                          Tip: You can also drag and drop members in the chart to assign managers.
                        </p>
                      </div>
                    )}
                  </div>

                  {!isReadOnly && (
                    <div className="pt-2 space-y-3">
                      <button
                        onClick={() => handleToggleAdmin(!selectedMemberForModal.isAdmin)}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-colors ${selectedMemberForModal.isAdmin ? 'bg-primary-500/10 text-primary-400 border-primary-500/30 hover:bg-primary-500/20' : 'bg-neutral-950 hover:bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-200'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl bg-opacity-20 ${selectedMemberForModal.isAdmin ? 'bg-primary-500/20 text-primary-400' : 'bg-neutral-800 text-neutral-400'}`}>
                            <Shield className="w-5 h-5" />
                          </div>
                          <div className="text-left flex flex-col gap-0.5">
                            <span className="font-semibold">{selectedMemberForModal.isAdmin ? 'Remove Admin Privileges' : 'Make Club Admin'}</span>
                            <span className="text-xs opacity-70">{selectedMemberForModal.isAdmin ? 'Demote member to standard role' : 'Grant full permissions over the club'}</span>
                          </div>
                        </div>
                      </button>
                      
                      <button 
                        onClick={handleRemoveMember}
                        className="w-full flex items-center justify-between p-4 rounded-2xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-red-500/20 text-red-500">
                            <Trash2 className="w-5 h-5" />
                          </div>
                          <div className="text-left flex flex-col gap-0.5">
                            <span className="font-semibold">Remove from Club</span>
                            <span className="text-xs opacity-70">This action cannot be undone</span>
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-5 border-t border-neutral-800 flex justify-end shrink-0 mx-2">
                <button 
                  onClick={() => setSelectedMemberForModal(null)}
                  className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-semibold transition-colors"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <DragOverlay>
        {activeMember ? (
          <div className="relative">
             {countDescendants(activeMember.id) > 0 && (
              <>
                <div className="absolute inset-0 bg-neutral-900 border border-neutral-700/50 rounded-xl transform translate-x-2 translate-y-2 opacity-50 shadow-xl pointer-events-none" />
                <div className="absolute inset-0 bg-neutral-900 border border-neutral-700/30 rounded-xl transform translate-x-4 translate-y-4 opacity-25 shadow-2xl pointer-events-none" />
              </>
            )}
            <UserNode member={activeMember} isOverlay />
            {countDescendants(activeMember.id) > 0 && (
              <div className="absolute -bottom-3 -right-3 bg-primary-500 text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg border-2 border-neutral-900 animate-in zoom-in duration-300 transform rotate-[-5deg]">
                 +{countDescendants(activeMember.id)} members
              </div>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function ChildNode({ 
  child,
  membersByManager,
  membersMap,
  onMemberClick,
  isReadOnly,
  depth,
  maxDepth,
  activeMemberId
}: { 
  key?: React.Key,
  child: ClubMember,
  membersByManager: Record<string, ClubMember[]>, 
  membersMap: Record<string, ClubMember>, 
  onMemberClick: (member: ClubMember) => void,
  isReadOnly?: boolean,
  depth: number,
  maxDepth?: number,
  activeMemberId?: string | null
}) {
  const { attributes: childAtts, listeners: childList, setNodeRef: setChildDragRef, isDragging: childDrag } = useDraggable({
    id: child.id,
    data: { member: child },
    disabled: isReadOnly
  });
  const { setNodeRef: setChildDropRef, isOver: childOver } = useDroppable({
    id: `drop-${child.id}`,
    data: { targetMemberId: child.id },
    disabled: isReadOnly,
  });

  const isTargetDragged = activeMemberId === child.id;

  return (
    <motion.div layout className="w-full relative">
        <div 
          ref={(node) => { setChildDragRef(node); setChildDropRef(node); }}
          style={{
            opacity: childDrag ? 0.3 : 1,
          }}
          {...(!isReadOnly ? childAtts : {})}
          {...(!isReadOnly ? childList : {})}
          onClick={() => {
            if (!isReadOnly) onMemberClick(child);
          }}
          className={clsx(
            "bg-neutral-900 border rounded-xl p-2 flex items-center gap-3 transition-colors duration-200 text-left",
            !isReadOnly ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
            childOver && !isReadOnly ? "border-primary-500 bg-primary-500/10 z-10" : "border-neutral-800",
            !isReadOnly && !childOver && "hover:border-neutral-700"
          )}
        >
          {isReadOnly ? (
            <ProfilePopover username={child.user?.username} user={child.user as any}>
              <div className="flex items-center gap-3 w-full">
                <div className="w-8 h-8 rounded-full bg-neutral-800 overflow-hidden flex-shrink-0 border border-neutral-700">
                  {child.user?.avatarUrl ? (
                    <OptimizedImage src={child.user.avatarUrl} alt={child.user.name || child.user.username} variant="small" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-neutral-500 text-xs">
                      {child.user?.username?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <p className="font-medium text-xs text-white truncate">{child.user?.name || child.user?.username}</p>
                  <p className="text-[10px] text-primary-400 truncate">{child.roleTitle || (child.isAdmin ? 'Role: Admin' : 'Member')}</p>
                </div>
              </div>
            </ProfilePopover>
          ) : (
            <>
              <div className="text-neutral-600 ml-1">
                <GripVertical className="w-3 h-3" />
              </div>
              <div className="w-8 h-8 rounded-full bg-neutral-800 overflow-hidden flex-shrink-0 border border-neutral-700 pointer-events-none">
                {child.user?.avatarUrl ? (
                  <OptimizedImage src={child.user.avatarUrl} alt={child.user.name || child.user.username} variant="small" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-neutral-500 text-xs">
                    {child.user?.username?.charAt(0)?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 pr-6 pointer-events-none">
                <p className="font-medium text-xs text-white truncate">{child.user?.name || child.user?.username}</p>
                <p className="text-[10px] text-primary-400 truncate">{child.roleTitle || (child.isAdmin ? 'Role: Admin' : 'Member')}</p>
              </div>
            </>
          )}
        </div>
      <AnimatePresence>
        {!isTargetDragged && membersByManager[child.id]?.length > 0 && (
           <motion.div 
              key="child-tree"
              initial={{ opacity: 0, scale: 0.8, x: -20, height: 0 }}
              animate={{ opacity: 1, scale: 1, x: 0, height: 'auto' }}
              exit={{ opacity: 0, scale: 0.8, x: -20, height: 0 }}
              transition={{ duration: 0.4, type: 'spring', bounce: 0.2 }}
              className="ml-4 pl-4 border-l-2 border-neutral-800 mt-3 pt-1 origin-top-left"
           >
             <OrgTree 
                nodeId={child.id} 
                membersByManager={membersByManager} 
                membersMap={membersMap} 
                onMemberClick={onMemberClick}
                isReadOnly={isReadOnly}
                depth={depth + 1}
                maxDepth={maxDepth}
                activeMemberId={activeMemberId}
              />
           </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function UnassignedMemberNode({ member, isReadOnly, onMemberClick }: { key?: React.Key, member: ClubMember, isReadOnly?: boolean, onMemberClick: (member: ClubMember) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: member.id,
    data: { member },
    disabled: isReadOnly,
  });
  
  const style = {
    opacity: isDragging ? 0.3 : 1,
  };
  
  return (
    <motion.div layout
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-xl p-2 flex items-center gap-3 w-36 cursor-grab active:cursor-grabbing transition-colors relative"
    >
      <div className="absolute top-2 left-2 text-neutral-500">
        <GripVertical className="w-3 h-3" />
      </div>
      <div className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-700 overflow-hidden ml-4">
        {member.user?.avatarUrl ? (
          <OptimizedImage src={member.user.avatarUrl} alt={member.user.name} variant="small" className="w-full h-full object-cover" />
        ) : (
          <UserIcon className="w-5 h-5 m-1.5 text-neutral-500" />
        )}
      </div>
      <div className="flex-1 min-w-0 pr-6">
        <p className="text-xs font-medium text-white truncate">{member.user?.name}</p>
        <p className="text-[10px] text-neutral-400 truncate">@{member.user?.username}</p>
      </div>
    </motion.div>
  );
}
