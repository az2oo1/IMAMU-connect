import { toast } from 'sonner';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, User as UserIcon, Building2, MoreHorizontal, FileText, FileSignature, 
  ChevronDown, ChevronUp, AlertCircle, Network
} from 'lucide-react';
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  DragOverlay,
  useDraggable,
  useDroppable,
  closestCenter,
  defaultDropAnimationSideEffects,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { clsx } from 'clsx';
import AdminUserProfileModal from './AdminUserProfileModal'; // We can use this to show info

interface User {
  id: string;
  username: string;
  name: string | null;
  studentEmail: string | null;
  googleEmail: string | null;
  role: string;
  managerId: string | null;
  avatarUrl: string | null;
  orgTitle: string | null;
}

function UserNode({ user, isOverlay = false }: { key?: React.Key, user: User, isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging } = useDraggable({
    id: user.id,
    data: { user },
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `drop-${user.id}`,
    data: { targetUserId: user.id },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
  };

  const displayName = user.name || user.username;
  const displayEmail = user.studentEmail || user.googleEmail;

  return (
    <div 
      className="relative flex flex-col items-center"
      ref={setDroppableRef}
    >
      <div 
        ref={setDraggableRef} 
        style={style} 
        {...listeners} 
        {...attributes}
        className={clsx(
         "w-48 bg-neutral-900 border border-neutral-800 rounded-xl p-3 shadow-lg cursor-grab active:cursor-grabbing flex flex-col items-center gap-2 transition-colors",
          isOver ? "border-primary-500 bg-primary-500/10" : "border-neutral-800 hover:border-neutral-700",
          isOverlay ? "rotate-2 scale-105 shadow-xl border-primary-500 z-50" : ""
        )}
      >
        <div className="w-10 h-10 rounded-full bg-neutral-800 overflow-hidden flex-shrink-0 border border-neutral-700">
          {user.avatarUrl ? (
            <img referrerPolicy="no-referrer" src={user.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
             <UserIcon className="w-6 h-6 m-2 text-neutral-500" />
          )}
        </div>
        <div className="text-center w-full">
          <h3 className="font-medium text-sm text-white truncate px-1">{displayName}</h3>
          <p className="text-xs text-primary-400 font-medium truncate">{user.orgTitle || user.role}</p>
        </div>
      </div>
    </div>
  );
}

// Recursive component to render tree
function OrgTree({ 
  nodeId, 
  usersByManager, 
  usersMap, 
  onUserClick 
}: { 
  key?: React.Key,
  nodeId: string, 
  usersByManager: Record<string, User[]>, 
  usersMap: Record<string, User>,
  onUserClick: (user: User) => void
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const nodeUser = usersMap[nodeId];
  const children = usersByManager[nodeId] || [];

  if (!nodeUser) return null;

  return (
    <div className="flex flex-col items-center relative">
      <div className="group relative">
         <UserNode user={nodeUser} />
         {/* Action Button overlay */}
         <button 
           onClick={() => onUserClick(nodeUser)}
           className="absolute top-2 right-2 w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-neutral-700 z-10"
         >
           <MoreHorizontal className="w-3 h-3 text-neutral-300" />
         </button>

         {children.length > 0 && (
           <button 
             onClick={() => setIsExpanded(!isExpanded)}
             className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-neutral-800 border border-neutral-700 rounded-full flex items-center justify-center hover:bg-neutral-700 z-10"
           >
             {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
           </button>
         )}
      </div>

      {isExpanded && children.length > 0 && (
        <>
          <div className="w-px h-6 bg-neutral-700 my-1"></div>
          <div className="flex flex-row gap-8 relative items-start">
            {/* Horizontal connecting line */}
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
                <div className="absolute top-0 left-1/2 w-px h-4 bg-neutral-700"></div>
                <OrgTree 
                  nodeId={child.id} 
                  usersByManager={usersByManager} 
                  usersMap={usersMap} 
                  onUserClick={onUserClick}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function RolesTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [selectedUserForModal, setSelectedUserForModal] = useState<User | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const usersMap = useMemo(() => {
    return users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {} as Record<string, User>);
  }, [users]);

  const { usersByManager, rootUsers, unassignedUsers } = useMemo(() => {
    const byManager: Record<string, User[]> = {};
    const unassigned: User[] = [];
    const roots: User[] = [];

    // Assuming we identify root owner as someone with role ADMIN and no manager, or just whoever has no manager but has subordinates
    // To make it flexible: anyone with managerId=null 
    users.forEach(user => {
      if (user.managerId) {
        if (!byManager[user.managerId]) byManager[user.managerId] = [];
        byManager[user.managerId].push(user);
      }
    });

    users.forEach(user => {
      if (!user.managerId) {
        // If they have subordinates, or they are the only ADMIN, they are roots.
        // Otherwise they are unassigned.
        if (byManager[user.id] || user.role === 'ADMIN') {
          roots.push(user);
        } else {
          unassigned.push(user);
        }
      }
    });

    return { usersByManager: byManager, rootUsers: roots, unassignedUsers: unassigned };
  }, [users]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveUser(event.active.data.current?.user);
  };

  const handleDragOver = (event: DragOverEvent) => {};

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveUser(null);
    const { active, over } = event;

    if (!over) return;

    const draggableUserId = active.id as string;
    const dropTargetId = over.id as string; // 'drop-userId' or 'unassigned-zone'
    
    let newManagerId: string | null = null;
    
    if (dropTargetId === 'unassigned-zone') {
      newManagerId = null;
    } else if (dropTargetId.startsWith('drop-')) {
      newManagerId = over.data.current?.targetUserId;
    }

    if (newManagerId === draggableUserId) {
        // Cannot be own manager
        return;
    }

    // Check for circular dependency
    if (newManagerId) {
      let currentManager = usersMap[newManagerId]?.managerId;
      while (currentManager) {
        if (currentManager === draggableUserId) {
          toast.error('Cannot create a circular management hierarchy.');
          return;
        }
        currentManager = usersMap[currentManager]?.managerId;
      }
    }

    // Call API
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/users/${draggableUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ managerId: newManagerId })
      });
      if (res.ok) {
        setUsers(users.map(u => u.id === draggableUserId ? { ...u, managerId: newManagerId } : u));
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
  });

  if (isLoading) return <div className="p-8 text-neutral-400">Loading hierarchy...</div>;

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="mb-6 flex items-center gap-3">
        <Network className="w-8 h-8 text-primary-500" />
        <div>
          <h1 className="text-2xl font-bold text-white">Roles & Hierarchy</h1>
          <p className="text-neutral-400 mt-1">Manage the organizational structure by dragging and dropping members.</p>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* Main Tree Canvas */}
        <div className="flex-1 overflow-auto custom-scrollbar border border-neutral-800 rounded-2xl bg-neutral-900/30 p-8 min-h-[400px]">
          <div className="min-w-max flex flex-col items-center">
            {rootUsers.length === 0 ? (
              <div className="text-center py-20 text-neutral-500">
                <Network className="w-12 h-12 mx-auto opacity-20 mb-4" />
                <p>No hierarchy roots found.</p>
                <p className="text-sm">Drag a user from the unassigned pool onto another to start building.</p>
              </div>
            ) : (
              <div className="flex flex-row gap-16 items-start">
                {rootUsers.map(root => (
                  <OrgTree 
                    key={root.id} 
                    nodeId={root.id} 
                    usersByManager={usersByManager} 
                    usersMap={usersMap} 
                    onUserClick={setSelectedUserForModal}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Unassigned Pool */}
        <div className="mt-8 border-t border-neutral-800 pt-6">
          <h2 className="text-lg font-medium text-white mb-4">Unassigned Members</h2>
          <div 
            ref={setUnassignedDropRef}
            className={clsx(
              "p-6 border-2 border-dashed rounded-xl flex flex-wrap gap-4 min-h-[120px] transition-colors",
              isOverUnassigned ? "border-primary-500/50 bg-primary-500/5" : "border-neutral-800 bg-neutral-900/20",
              unassignedUsers.length === 0 ? "items-center justify-center" : ""
            )}
          >
             {unassignedUsers.length === 0 && !isOverUnassigned && (
                <p className="text-neutral-500 text-sm">Everyone is assigned to the hierarchy.</p>
             )}
             {isOverUnassigned && unassignedUsers.length === 0 && (
                <p className="text-primary-400 text-sm">Drop here to unassign.</p>
             )}
             {unassignedUsers.map(user => (
               <UserNode key={user.id} user={user} />
             ))}
          </div>
        </div>

        <DragOverlay>
          {activeUser ? <UserNode user={activeUser} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {/* User Info / HR Modal */}
      {selectedUserForModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-neutral-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-neutral-800">
            <div className="p-6">
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-full bg-neutral-800 overflow-hidden flex-shrink-0 border border-neutral-700">
                  {selectedUserForModal.avatarUrl ? (
                    <img referrerPolicy="no-referrer" src={selectedUserForModal.avatarUrl} alt={selectedUserForModal.name || ''} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-8 h-8 m-4 text-neutral-500" />
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white">{selectedUserForModal.name || selectedUserForModal.username}</h2>
                  <p className="text-neutral-400">{selectedUserForModal.studentEmail || selectedUserForModal.googleEmail || 'No email provided'}</p>
                  
                  <div className="mt-3">
                    <label className="text-xs text-neutral-500 mb-1 block">Organizational Title (e.g. رئيس, نائب رئيس, عضو)</label>
                    <input 
                      type="text" 
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary-500"
                      placeholder="Title in Hierarchy..."
                      value={selectedUserForModal.orgTitle || ''}
                      onChange={async (e) => {
                        const newTitle = e.target.value;
                        setSelectedUserForModal({ ...selectedUserForModal, orgTitle: newTitle });
                        setUsers(users.map(u => u.id === selectedUserForModal.id ? { ...u, orgTitle: newTitle } : u));
                        
                        try {
                          const token = localStorage.getItem('token');
                          await fetch(`/api/admin/users/${selectedUserForModal.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ orgTitle: newTitle })
                          });
                        } catch (err) {
                          console.error('Failed to update title');
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <button className="w-full flex items-center justify-between p-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 text-left transition-colors border border-transparent hover:border-neutral-700">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-400" />
                    <span className="text-neutral-200 font-medium">Show Application Form</span>
                  </div>
                </button>
                
                <button className="w-full flex items-center justify-between p-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 text-left transition-colors border border-transparent hover:border-neutral-700">
                  <div className="flex items-center gap-3">
                    <FileSignature className="w-5 h-5 text-yellow-400" />
                    <span className="text-neutral-200 font-medium">Add HR Note</span>
                  </div>
                </button>
                
                <button className="w-full flex items-center justify-between p-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 text-left transition-colors border border-transparent hover:border-neutral-700">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <span className="text-neutral-200 font-medium">Manage Disciplinary Actions</span>
                  </div>
                </button>
              </div>
            </div>
            <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex justify-end">
              <button 
                onClick={() => setSelectedUserForModal(null)}
                className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
