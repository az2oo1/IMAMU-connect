import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Upload, Download, FileArchive, Search, Folder, MoreVertical, File, Plus, ChevronRight, ShieldAlert, FolderPlus, BookOpen, X, Users, FileVideo, FileImage, FileAudio, FileSpreadsheet, Presentation, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getFromCache, saveToCache, CACHE_KEYS } from '../utils/persistence';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor, DragOverlay, defaultDropAnimationSideEffects, useDroppable, pointerWithin, rectIntersection } from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import { SortableContext, rectSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ProfilePopover from '../components/ProfilePopover';
import OptimizedImage from '../components/OptimizedImage';

const PreviewImage = ({ src, alt, ext, getFileIcon }: { src: string, alt: string, ext: string, getFileIcon: any }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <img
        src={src}
        alt={alt}
        className={clsx(
          "max-w-full max-h-full object-contain transition-all duration-500",
          loaded ? "blur-0 opacity-100" : "blur-lg opacity-50 grayscale"
        )}
        onLoad={() => setLoaded(true)}
        referrerPolicy="no-referrer"
      />
      {!loaded && <div className="absolute inset-0 flex items-center justify-center">{getFileIcon(ext, "w-16 h-16 opacity-30 animate-pulse")}</div>}
    </div>
  );
};

const MOCK_FOLDERS = [
  { id: 'f1', courseId: '1', name: 'Week 1: Basics', parentId: null },
  { id: 'f2', courseId: '1', name: 'Week 2: Data Types', parentId: null },
  { id: 'f3', courseId: '1', name: 'Assignments', parentId: null },
  { id: 'f4', courseId: '1', name: 'Project 1 Resources', parentId: 'f3' }, // Nested folder
];

const MOCK_FILES = [
  { id: 1, courseId: '1', folderId: null, name: 'CS101_Syllabus_Fall.pdf', type: 'pdf', size: '2.4 MB', uploader: { name: 'Dr. Ahmed', username: 'ahmed' }, date: 'Sep 1', createdAt: '2026-09-01T10:00:00Z', status: 'APPROVED' },
  { id: 2, courseId: '1', folderId: 'f1', name: 'Lecture_1_Slides.pptx', type: 'presentation', size: '5.1 MB', uploader: { name: 'Dr. Ahmed', username: 'ahmed' }, date: 'Sep 3', createdAt: '2026-09-03T10:00:00Z', status: 'APPROVED' },
  { id: 3, courseId: '1', folderId: 'f3', name: 'Assignment_1_Starter_Code.zip', type: 'archive', size: '1.2 MB', uploader: { name: 'Dr. Ahmed', username: 'ahmed' }, date: 'Sep 10', createdAt: '2026-09-10T10:00:00Z', status: 'APPROVED' },
  { id: 4, courseId: '2', folderId: null, name: 'Midterm_Study_Guide.pdf', type: 'pdf', size: '840 KB', uploader: { name: 'Prof. Sarah', username: 'sarah' }, date: 'Oct 15', createdAt: '2026-10-15T10:00:00Z', status: 'APPROVED' },
];

function SortableFolderItem({ folder, onClick, isAdmin, activeDropdown, setActiveDropdown, draggedItem }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ 
    id: `folder-${folder.id}`,
    disabled: !isAdmin
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.3 : 1, // Change to ghost like files
    scale: isDragging ? 1.02 : 1,
  };

  const isDroppingFile = isOver && draggedItem?.type === 'file';

  return (
    <div 
      id={`folder-${folder.id}`}
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners} 
      className={clsx(
        "relative group rounded-xl transition-all", 
        isAdmin && "cursor-grab active:cursor-grabbing",
        isDroppingFile && "ring-2 ring-primary-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] bg-primary-500/5",
        isDragging && "shadow-2xl ring-2 ring-primary-500/50"
      )}
      onClick={() => {
        if (!isDragging) onClick?.();
      }}
    >
      <div 
        className={clsx(
          "w-full bg-neutral-900 border rounded-xl p-4 transition-all flex items-center gap-3 text-left",
          isDroppingFile ? "border-primary-500 bg-neutral-800" : "border-neutral-800 group-hover:border-neutral-700 group-hover:bg-neutral-800"
        )}
      >
        <Folder 
          className={clsx(
            "w-8 h-8 transition-colors",
            isDroppingFile ? "text-primary-400" : "text-primary-400 group-hover:text-primary-300"
          )} 
          fill="currentColor" 
          fillOpacity={isDroppingFile ? 0.4 : 0.2} 
        />
        <span className="font-medium text-neutral-200 truncate flex-1">{folder.name}</span>
      </div>
      <button 
        onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === `folder-${folder.id}` ? null : `folder-${folder.id}`); }}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {activeDropdown === `folder-${folder.id}` && (
        <div className="absolute right-3 top-full mt-1 w-32 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-10 overflow-hidden text-sm">
          <button className="w-full text-left px-3 py-2 hover:bg-neutral-700 text-neutral-200 transition-colors">Rename</button>
          <button className="w-full text-left px-3 py-2 hover:bg-neutral-700 text-red-400 transition-colors">Delete</button>
        </div>
      )}
    </div>
  );
}

function SortableFileItem({ file, isAdmin, activeDropdown, setActiveDropdown, setPreviewFile, setReportTarget, handleRejectFile, getFileIcon }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: `file-${file.id}`,
    disabled: !isAdmin
  });

  const style2 = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.3 : 1,
    scale: isDragging ? 1.02 : 1,
  };

  return (
    <div 
      id={`file-${file.id}`}
      ref={setNodeRef} 
      style={style2} 
      {...attributes} 
      {...listeners} 
      className={clsx(
        "rounded-xl transition-all duration-500", 
        isAdmin && "cursor-grab active:cursor-grabbing", 
        isDragging && "shadow-2xl ring-2 ring-primary-500/50"
      )}
      onClick={(e) => {
        if (!isDragging) setPreviewFile(file);
      }}
    >
      <div 
        className={clsx(
          "bg-neutral-900 border rounded-xl p-4 transition-colors group flex flex-col cursor-pointer h-full",
          "border-neutral-800 hover:border-neutral-700"
        )}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 shrink-0">
            {getFileIcon(file.name.split('.').pop() || 'pdf')}
          </div>
              <div className="relative">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdown(activeDropdown === `file-${file.id}` ? null : `file-${file.id}`);
                  }}
                  className="text-neutral-500 hover:text-neutral-300 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                {activeDropdown === `file-${file.id}` && (
                  <div className="absolute right-0 top-full mt-1 w-32 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-20 overflow-hidden text-sm" onClick={e => e.stopPropagation()}>
                    <a 
                      href={`/api/download?url=${encodeURIComponent(file.url)}&filename=${encodeURIComponent(file.name)}`} 
                      download={file.name} 
                      className="block w-full text-left px-3 py-2 hover:bg-neutral-700 text-neutral-200 transition-colors"
                    >
                      Download
                    </a>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setReportTarget({ id: file.id, type: 'FILE' });
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-neutral-700 text-yellow-500 transition-colors"
                    >
                      Report
                    </button>
                    {isAdmin && <button onClick={(e) => { e.stopPropagation(); handleRejectFile(file.id); }} className="w-full text-left px-3 py-2 hover:bg-neutral-700 text-red-400 transition-colors">Delete</button>}
                  </div>
                )}
              </div>
        </div>
        
        <h4 className="font-semibold text-neutral-200 text-sm mb-1 line-clamp-2" title={file.name}>
          {file.name}
        </h4>
        
        <div className="flex flex-col gap-1 mt-auto pt-4">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <div className="flex items-center gap-1">
              {file.isAnonymous ? (
                <span>Uploaded anonymously</span>
              ) : (
                <>
                  <span>Uploaded by</span>
                  {file.uploader ? (
                    <div className="relative z-20" onPointerDown={e => e.stopPropagation()}>
                    <ProfilePopover username={file.uploader.username}>
                      <span className="hover:underline hover:text-neutral-300 transition-colors pointer-events-auto">
                        {file.uploader.name || file.uploader.username}
                      </span>
                    </ProfilePopover>
                    </div>
                  ) : (
                    <span>Unknown</span>
                  )}
                </>
              )}
            </div>
            <span>{new Date(file.createdAt).toLocaleDateString()}</span>
          </div>
          {file.approver && (
            <div className="text-xs text-primary-500/80 flex items-center gap-1 mt-1">
              <span>Approved by</span>
              <div className="relative z-20" onPointerDown={e => e.stopPropagation()}>
              <ProfilePopover username={file.approver.username}>
                <span className="hover:underline hover:text-primary-400 transition-colors pointer-events-auto">
                  {file.approver.name || file.approver.username}
                </span>
              </ProfilePopover>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-4 pt-4 border-t border-neutral-800 flex items-center justify-between">
          <div className="text-xs text-neutral-400 flex items-center gap-1.5">
            {file.size ? formatBytes(file.size) : 'Unknown size'}
          </div>
          <a 
            draggable={false} 
            href={`/api/download?url=${encodeURIComponent(file.url)}&filename=${encodeURIComponent(file.name)}`} 
            download={file.name} 
            onClick={e => e.stopPropagation()} 
            className="text-primary-400 hover:text-primary-300 bg-primary-500/10 hover:bg-primary-500/20 p-1.5 rounded-md transition-colors relative z-10"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

function BreadcrumbDroppable({ id, children, isOver, onSelect, isActive }: any) {
  const { setNodeRef, isOver: isDroppingOver } = useDroppable({
    id: `breadcrumb-${id}`,
  });

  return (
    <button 
      ref={setNodeRef}
      onClick={onSelect}
      className={clsx(
        "font-bold transition-all px-2 py-1 rounded-md",
        (isDroppingOver || isOver) ? "bg-primary-500/20 text-primary-400 ring-2 ring-primary-500" : (isActive ? "text-neutral-100" : "text-neutral-300"),
        "hover:bg-neutral-800"
      )}
    >
      {children}
    </button>
  );
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export default function AcademicsTab() {
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const fileIdParam = searchParams.get('fileId');
  const [activeCourseId, setActiveCourseIdState] = useState(searchParams.get('courseId') || '');
  
  const parsedFolderId = searchParams.get('folderId');
  const [currentFolderId, setCurrentFolderIdState] = useState<string | null>(parsedFolderId === 'null' ? null : parsedFolderId);

  const setActiveCourseId = (id: string) => {
    setActiveCourseIdState(id);
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      if (id) p.set('courseId', id);
      else p.delete('courseId');
      return p;
    }, { replace: true });
  };

  const setCurrentFolderId = (id: string | null) => {
    setCurrentFolderIdState(id);
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      if (id) p.set('folderId', id);
      else p.delete('folderId');
      return p;
    }, { replace: true });
  };
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const navigate = useNavigate();
  
  const [myCourses, setMyCourses] = useState<any[]>(getFromCache(CACHE_KEYS.COURSES, []));
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [courseFiles, setCourseFiles] = useState<any[]>(getFromCache(`${CACHE_KEYS.FILES}_${activeCourseId}`, []));
  const [courseFolders, setCourseFolders] = useState<any[]>(getFromCache(`${CACHE_KEYS.FILES}_folders_${activeCourseId}`, []));
  const [isLoading, setIsLoading] = useState(true);

  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  
  const [reportTarget, setReportTarget] = useState<{ id: string, type: string } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // File Preview
  const [previewFile, setPreviewFile] = useState<any | null>(null);

  // Notifications
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Drag and Drop
  const [draggedItem, setDraggedItem] = useState<{ id: string, type: 'folder' | 'file' } | null>(null);
  const [dragTargetFolder, setDragTargetFolder] = useState<string | null>(null);
  const [dragTargetOrder, setDragTargetOrder] = useState<{ id: string, type: 'folder' | 'file' } | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (fileIdParam) {
      fetch(`/api/files/${fileIdParam}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.file) {
          setActiveCourseIdState(data.file.courseId);
          setCurrentFolderIdState(data.file.folderId || null);
          
          setSearchParams(prev => {
            const p = new URLSearchParams(prev);
            if (data.file.courseId) p.set('courseId', data.file.courseId);
            else p.delete('courseId');
            
            if (data.file.folderId) p.set('folderId', data.file.folderId);
            else p.delete('folderId');
            
            return p;
          }, { replace: true });

          setTimeout(() => {
            const el = document.getElementById(`file-${data.file.id}`);
            if (el) {
               el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 500);
        }
      })
      .catch(console.error);
    }
  }, [fileIdParam]);

  useEffect(() => {
    if (activeCourseId) {
      // Load from cache first
      const cachedFiles = getFromCache(`${CACHE_KEYS.FILES}_${activeCourseId}`);
      const cachedFolders = getFromCache(`${CACHE_KEYS.FILES}_folders_${activeCourseId}`);
      if (cachedFiles) setCourseFiles(cachedFiles);
      if (cachedFolders) setCourseFolders(cachedFolders);

      fetchCourseFiles(activeCourseId);
      fetchCourseFolders(activeCourseId);
    }
  }, [activeCourseId]);

  const fetchCourseFolders = async (courseId: string) => {
    if (!courseId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/courses/${courseId}/folders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const cached = getFromCache(`${CACHE_KEYS.FILES}_folders_${courseId}`);
        if (JSON.stringify(cached) !== JSON.stringify(data.folders)) {
          setCourseFolders(data.folders);
          saveToCache(`${CACHE_KEYS.FILES}_folders_${courseId}`, data.folders);
        }
      }
    } catch (error) {
      console.error('Failed to fetch folders', error);
    }
  };

  const fetchCourseFiles = async (courseId: string) => {
    if (!courseId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/courses/${courseId}/files`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const cached = getFromCache(`${CACHE_KEYS.FILES}_${courseId}`);
        if (JSON.stringify(cached) !== JSON.stringify(data.files)) {
          setCourseFiles(data.files);
          saveToCache(`${CACHE_KEYS.FILES}_${courseId}`, data.files);
        }
      }
    } catch (error) {
      console.error('Failed to fetch files', error);
    }
  };

  const handleApproveFile = async (fileId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/files/${fileId}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchCourseFiles(activeCourseId);
      }
    } catch (error) {
      console.error('Failed to approve file', error);
    }
  };

  const handleRejectFile = async (fileId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchCourseFiles(activeCourseId);
      }
    } catch (error) {
      console.error('Failed to reject file', error);
    }
  };

  const uploadFileWithProgress = (file: File, onProgress: (pct: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            resolve(res.url);
          } catch (e) {
            reject(e);
          }
        } else {
          console.error('Upload endpoint returned an error:', xhr.status, xhr.responseText);
          reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText}`));
        }
      });
      
      xhr.addEventListener('error', () => reject(new Error('Upload failed')));
      
      xhr.open('POST', `/api/upload?type=course&id=${activeCourseId}`);
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
      xhr.send(formData);
    });
  };

  const handleFileUpload = async () => {
    if (uploadFiles.length === 0 || !activeCourseId) return;
    setIsUploading(true);
    try {
      const token = localStorage.getItem('token');
      
      for (const file of uploadFiles) {
        try {
          const url = await uploadFileWithProgress(file, (progress) => {
            setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
          });
          
          const response = await fetch(`/api/courses/${activeCourseId}/files`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}` 
            },
            body: JSON.stringify({
              name: file.name,
              url,
              folderId: currentFolderId,
              isAnonymous,
              size: file.size
            })
          });
          
          if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Failed to create file record: ${response.status} ${errBody}`);
          }
          await response.json();
        } catch (e) {
          console.error(`Failed to upload ${file.name}`, e);
          throw e; // Important: throw to be caught by outer catch
        }
      }
      
      fetchCourseFiles(activeCourseId);
      
      // Delay to show confirmation on individual files
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadFiles([]);
        setUploadProgress({});
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      }, 800);
    } catch (error) {
      console.error('Upload failed', error);
      alert('Upload failed. Please check your network or try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !activeCourseId) return;
    setIsCreatingFolder(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/courses/${activeCourseId}/folders`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          name: newFolderName,
          parentId: currentFolderId
        })
      });
      
      if (res.ok) {
        fetchCourseFolders(activeCourseId);
        setShowCreateFolderModal(false);
        setNewFolderName('');
      }
    } catch (error) {
      console.error('Failed to create folder', error);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const [myRes, allRes] = await Promise.all([
        fetch('/api/my-courses', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/courses')
      ]);
      
      if (myRes.ok && allRes.ok) {
        const myData = await myRes.json();
        const allData = await allRes.json();
        setMyCourses(myData.courses);
        saveToCache(CACHE_KEYS.COURSES, myData.courses);
        setAllCourses(allData.courses);
        // Only auto-select if we don't already have an active course and we're not coming from a file link
        if (myData.courses.length > 0 && !activeCourseId && !searchParams.get('fileId')) {
          setActiveCourseId(myData.courses[0].id);
        }
      } else {
        const myErr = !myRes.ok ? await myRes.text().catch(() => 'Unknown') : 'OK';
        const allErr = !allRes.ok ? await allRes.text().catch(() => 'Unknown') : 'OK';
        console.error('Fetch error details:', { myStatus: myRes.status, myErr, allStatus: allRes.status, allErr });
      }
    } catch (error) {
      console.error('Failed to fetch courses - full error:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name, 'Message:', error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnroll = async (courseId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchCourses();
        setShowAddCourseModal(false);
      }
    } catch (error) {
      console.error('Failed to enroll', error);
    }
  };

  const handleUnenroll = async (courseId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/courses/${courseId}/unenroll`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        if (activeCourseId === courseId) {
          setActiveCourseId('');
        }
        fetchCourses();
      }
    } catch (error) {
      console.error('Failed to unenroll', error);
    }
  };

  const handleDropIntoFolder = async (fileId: string, folderId: string) => {
    if (!activeCourseId) return;
    
    // Optimistic update locally
    setCourseFiles(prev => prev.map(f => f.id === fileId ? { ...f, folderId: folderId === 'root' ? null : folderId } : f));
    
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/courses/${activeCourseId}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items: [{ id: fileId, type: 'file', folderId: folderId === 'root' ? 'null' : folderId }] })
      });
      fetchCourseFiles(activeCourseId); // Refresh to get the right state
    } catch (e) {
      console.error(e);
      fetchCourseFiles(activeCourseId); // Revert
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: any) => {
    const { active } = event;
    const idStr = String(active.id);
    const type = idStr.startsWith('folder-') ? 'folder' : 'file';
    const rawId = idStr.replace(/^(file|folder)-/, '');
    
    setDraggedItem({ id: rawId, type: type as 'folder' | 'file' });
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    const prevDraggedItem = draggedItem;
    setDraggedItem(null);

    if (!over) return;
    if (!isAdmin) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    const activeType = activeIdStr.startsWith('folder-') ? 'folder' : 'file';
    const overType = overIdStr.startsWith('folder-') ? 'folder' : 'file';

    const rawActiveId = activeIdStr.replace(/^(file|folder|breadcrumb)-/, '');
    const rawOverId = overIdStr.replace(/^(file|folder|breadcrumb)-/, '');

    // File dropped into a folder (either a folder in the list or a breadcrumb)
    if (activeType === 'file' && (overType === 'folder' || overIdStr.startsWith('breadcrumb-'))) {
      const targetFolderId = overIdStr.startsWith('breadcrumb-') ? (rawOverId === 'root' ? 'root' : rawOverId) : rawOverId;
      if (rawActiveId !== targetFolderId) {
        handleDropIntoFolder(rawActiveId, targetFolderId);
        return;
      }
    }

    // Same type reorder
    if (activeIdStr !== overIdStr && activeType === overType) {
      let items = activeType === 'folder' 
        ? [...courseFolders.filter(f => f.parentId === currentFolderId)].sort((a,b)=> (a.order||0)-(b.order||0))
        : [...courseFiles.filter(f => f.folderId === currentFolderId && f.status === 'APPROVED')].sort((a,b)=> (a.order||0)-(b.order||0));

      const oldIndex = items.findIndex(i => i.id === rawActiveId);
      const newIndex = items.findIndex(i => i.id === rawOverId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(items, oldIndex, newIndex);
        const mapped = newItems.map((item, idx) => ({ ...item, order: idx }));

        if (activeType === 'folder') {
          setCourseFolders(courseFolders.map(f => mapped.find(m => m.id === f.id) || f));
        } else {
          setCourseFiles(courseFiles.map(f => mapped.find(m => m.id === f.id) || f));
        }

        try {
          const token = localStorage.getItem('token');
          await fetch(`/api/courses/${activeCourseId}/reorder`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ 
              items: mapped.map(i => ({ 
                id: i.id, 
                type: activeType, 
                order: i.order, 
                folderId: currentFolderId 
              })) 
            })
          });
        } catch (e) {
          console.error(e);
          if (activeType === 'folder') fetchCourseFolders(activeCourseId);
          else fetchCourseFiles(activeCourseId);
        }
      }
    }
  };

  const handleReport = async () => {
    if (!reportTarget || !reportReason.trim()) return;
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
          type: reportTarget.type,
          contentId: reportTarget.id,
          reason: reportReason
        })
      });
      if (res.ok) {
        setReportTarget(null);
        setReportReason('');
      }
    } catch (error) {
      console.error('Failed to submit report', error);
    } finally {
      setIsSubmittingReport(false);
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

  const filteredAvailableCourses = availableCourses.filter(course => {
    const matchesSearch = course?.name?.toLowerCase().includes(courseSearchQuery?.toLowerCase() || '') || 
                          (course?.description && course.description.toLowerCase().includes(courseSearchQuery?.toLowerCase() || '')) ||
                          course?.code?.toLowerCase().includes(courseSearchQuery?.toLowerCase() || '');
    
    let matchesCategory = selectedCategory === 'All';
    if (!matchesCategory && course.tags) {
      const courseTags = course.tags.split(',').map((t: string) => t.trim());
      matchesCategory = courseTags.includes(selectedCategory);
    }
    
    return matchesSearch && matchesCategory;
  });

  // Use a derived state for activeCourse that searches both personal and all courses
  const activeCourse = useMemo(() => {
    const course = [...myCourses, ...allCourses].find(c => c.id === activeCourseId);
    return course;
  }, [myCourses, allCourses, activeCourseId]);

  const sidebarCourses = useMemo(() => {
    const list = [...myCourses];
    if (activeCourse && !myCourses.find(c => c.id === activeCourse.id)) {
      list.push({ ...activeCourse, isAdminView: true });
    }
    return list;
  }, [myCourses, activeCourse]);

  // Check if admin from either course record or general state (could be enhanced with UserContext)
  const isAdmin = activeCourse?.isAdmin || false; 

  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);
  
  // Filter folders and files based on current location
  const currentFolders = [...courseFolders]
    .filter(f => f.parentId === currentFolderId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  
  const filteredCourseFiles = courseFiles.filter(f => f.folderId === currentFolderId && f?.name?.toLowerCase().includes(search?.toLowerCase() || ''));
  
  const approvedFiles = [...filteredCourseFiles]
    .filter(f => f.status === 'APPROVED')
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const pendingFiles = [...filteredCourseFiles]
    .filter(f => f.status === 'PENDING')
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Get breadcrumbs
  const getBreadcrumbs = () => {
    const crumbs = [];
    let curr = currentFolderId;
    const seen = new Set();
    while (curr) {
      if (seen.has(curr)) break;
      seen.add(curr);
      const folder = courseFolders.find(f => f.id === curr);
      if (folder) {
        crumbs.unshift(folder);
        curr = folder.parentId;
      } else {
        break;
      }
    }
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  const getFileIcon = (type: string, className: string = "w-8 h-8") => {
    const ext = type.toLowerCase();
    switch(ext) {
      case 'pdf': return <FileText className={`${className} text-red-400`} />;
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'gz':
      case 'archive': return <FileArchive className={`${className} text-yellow-400`} />;
      case 'ppt':
      case 'pptx':
      case 'presentation': return <Presentation className={`${className} text-orange-400`} />;
      case 'mp4':
      case 'mov':
      case 'avi':
      case 'mkv': return <FileVideo className={`${className} text-purple-400`} />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp': return <FileImage className={`${className} text-green-400`} />;
      case 'mp3':
      case 'wav':
      case 'ogg': return <FileAudio className={`${className} text-pink-400`} />;
      case 'xls':
      case 'xlsx':
      case 'csv': return <FileSpreadsheet className={`${className} text-emerald-400`} />;
      case 'doc':
      case 'docx':
      case 'txt': return <FileText className={`${className} text-blue-400`} />;
      default: return <File className={`${className} text-neutral-400`} />;
    }
  };

    // Collision detection related to the mouse
    const customCollisionDetection = (args: any) => {
      // 1. First, check if pointer is over a folder or breadcrumb (for drop-into)
      // This is the most "mouse-based" feel for actions
      const pointerCollisions = pointerWithin(args);
      
      const folderCollision = pointerCollisions.find(c => 
        String(c.id).startsWith('folder-') || 
        String(c.id).startsWith('breadcrumb-')
      );
      
      if (folderCollision) return [folderCollision];
      
      // 2. If not over a folder/breadcrumb, use pointer collisions for reordering too
      // This ensures the drop target is strictly where the mouse is
      if (pointerCollisions.length > 0) return pointerCollisions;
      
      // 3. Last fallback
      return rectIntersection(args);
    };

    return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={customCollisionDetection} 
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex h-full overflow-hidden bg-neutral-950"
      >
        {/* Sidebar */}
        <div className="w-full md:w-72 bg-neutral-900/80 backdrop-blur-xl border-r border-neutral-800 hidden md:flex flex-col">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-neutral-100">My Courses</h2>
            <p className="text-xs text-neutral-500 mt-1">Shared resources & files</p>
          </div>
          <button 
            onClick={() => setShowAddCourseModal(true)}
            className="p-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-md transition-colors" 
            title="Join Course"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {sidebarCourses.map(course => (
            <div key={course.id} className="relative group/course">
              <button
                onClick={() => {
                  setActiveCourseIdState(course.id);
                  setCurrentFolderIdState(null);
                  setSearch('');
                  
                  setSearchParams(prev => {
                    const p = new URLSearchParams(prev);
                    p.set('courseId', course.id);
                    p.delete('folderId');
                    p.delete('fileId');
                    return p;
                  }, { replace: true });
                }}
                className={clsx(
                  "w-full text-left p-3 rounded-lg hover:bg-neutral-800 transition-colors mb-1 flex items-center justify-between",
                  activeCourseId === course.id ? "bg-neutral-800/80 border border-neutral-700" : "border border-transparent"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "p-2 rounded-md",
                    activeCourseId === course.id ? "bg-primary-500/20 text-primary-400" : "bg-neutral-800 text-neutral-400"
                  )}>
                    {(course as any).isAdminView ? <ShieldAlert className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-bold text-sm text-neutral-200 flex items-center gap-1.5 truncate">
                      {course.code}
                      {(course as any).isAdminView && <span className="text-[10px] bg-primary-500/10 text-primary-400 px-1 rounded">Admin</span>}
                    </div>
                    <div className="text-xs text-neutral-500 truncate w-32">{course.name}</div>
                  </div>
                </div>
              </button>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/course:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdown(activeDropdown === `course-${course.id}` ? null : `course-${course.id}`);
                  }}
                  className="p-1.5 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-700 rounded-md transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {activeDropdown === `course-${course.id}` && (
                  <div className="absolute right-0 top-full mt-1 w-36 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-50 overflow-hidden text-sm">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnenroll(course.id);
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-neutral-700 text-red-400 transition-colors"
                    >
                      Remove Course
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <div className="h-16 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-xl flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 text-sm">
            <BreadcrumbDroppable 
              id="root"
              onSelect={() => setCurrentFolderId(null)}
              children={activeCourse?.name}
              isActive={currentFolderId === null}
            />
            
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <div key={crumb.id} className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-neutral-600" />
                  <BreadcrumbDroppable 
                    id={crumb.id}
                    onSelect={() => setCurrentFolderId(crumb.id)}
                    children={crumb.name}
                    isActive={isLast}
                  />
                </div>
              );
            })}
          </div>

            <div className="flex items-center gap-3">
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input 
                  type="text" 
                  placeholder="Search files..." 
                  className="w-48 bg-neutral-950 border border-neutral-800 rounded-md py-1.5 pl-9 pr-4 text-sm focus:outline-none focus:border-primary-500 text-neutral-200"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              {isAdmin && (
                <button 
                  onClick={() => setShowCreateFolderModal(true)}
                  className="bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 border border-neutral-700"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">New Folder</span>
                </button>
              )}
              
              <button 
                onClick={() => setShowUploadModal(true)}
                disabled={!activeCourseId}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Upload File</span>
              </button>
            </div>
        </div>

        {/* File & Folder List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
          
          {/* Folders Section */}
          {currentFolders.length > 0 && !search && (
            <div className="mb-8">
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Folders</h3>
              <SortableContext items={currentFolders.map(f => `folder-${f.id}`)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {currentFolders.map((folder, index) => {
                  return (
                    <SortableFolderItem 
                      key={`folder-${folder.id}`} 
                      folder={folder} 
                      onClick={() => setCurrentFolderId(folder.id)} 
                      isAdmin={isAdmin} 
                      activeDropdown={activeDropdown} 
                      setActiveDropdown={setActiveDropdown}
                      draggedItem={draggedItem}
                    />
                  );
                })}
              </div>
              </SortableContext>
            </div>
          )}

          {/* Pending Approvals Section (Admins Only) */}
          {isAdmin && pendingFiles.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" /> Pending Approvals
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingFiles.map((file, index) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={file.id} 
                    id={`file-${file.id}`}
                    className={clsx(
                      "bg-neutral-900 border rounded-xl p-4 transition-colors group relative overflow-hidden",
                      "border-yellow-500/30 hover:border-yellow-500/50"
                    )}
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500/50" />
                    <div className="flex justify-between items-start mb-4 pl-2">
                      <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800">
                        {getFileIcon(file.name.split('.').pop() || 'pdf')}
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleApproveFile(file.id)}
                          className="px-3 py-1 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-md text-xs font-medium transition-colors"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleRejectFile(file.id)}
                          className="px-3 py-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-md text-xs font-medium transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                    
                    <h4 className="font-semibold text-neutral-200 text-sm mb-1 truncate pl-2" title={file.name}>
                      {file.name}
                    </h4>
                    
                    <div className="flex items-center justify-between text-xs text-neutral-500 pl-2 mt-4">
                      <div className="flex items-center gap-1">
                        {file.isAnonymous ? (
                          <span>Uploaded anonymously</span>
                        ) : (
                          <>
                            <span>Uploaded by</span>
                            {file.uploader ? (
                              <ProfilePopover username={file.uploader.username}>
                                <span className="hover:underline hover:text-neutral-300 transition-colors">
                                  {file.uploader.name || file.uploader.username}
                                </span>
                              </ProfilePopover>
                            ) : (
                              <span>Unknown</span>
                            )}
                          </>
                        )}
                      </div>
                      <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-neutral-800 flex items-center justify-between pl-2">
                      <div className="text-xs text-neutral-400 flex items-center gap-1.5">
                        {file.size ? formatBytes(file.size) : 'Unknown size'}
                      </div>
                      <a href={file.url} target="_blank" rel="noreferrer" className="text-primary-400 hover:text-primary-300 bg-primary-500/10 hover:bg-primary-500/20 p-1.5 rounded-md transition-colors">
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Files Section */}
          <div>
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Files</h3>
            {approvedFiles.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 bg-neutral-900/50 border border-neutral-800 border-dashed rounded-xl"
              >
                <File className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
                <p className="text-neutral-400 font-medium">No files found</p>
                {isAdmin && <p className="text-sm text-neutral-500 mt-1">Click 'Upload File' to add resources here.</p>}
              </motion.div>
            ) : (
              <SortableContext items={approvedFiles.map(f => `file-${f.id}`)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {approvedFiles.map((file, index) => {
                  return (
                    <SortableFileItem 
                      key={`file-${file.id}`} 
                      file={file} 
                      isAdmin={isAdmin} 
                      activeDropdown={activeDropdown} 
                      setActiveDropdown={setActiveDropdown} 
                      setPreviewFile={setPreviewFile} 
                      setReportTarget={setReportTarget} 
                      handleRejectFile={handleRejectFile}
                      getFileIcon={getFileIcon}
                    />
                  );
                })}
              </div>
              </SortableContext>
            )}
          </div>

        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
              onClick={() => setShowUploadModal(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Upload File</h2>
                <button 
                  onClick={() => setShowUploadModal(false)} 
                  className="text-neutral-400 hover:text-white transition-colors p-1"
                >
                  <ShieldAlert className="w-5 h-5 hidden" /> {/* Just for import usage if needed, but we use X usually */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Notice */}
                <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 flex gap-3 text-sm">
                  <ShieldAlert className="w-5 h-5 text-primary-400 shrink-0" />
                  <div className="text-neutral-300">
                    <p className="font-medium text-primary-400 mb-1">Privacy & Approval Notice</p>
                    <p>
                      {isAdmin 
                        ? "As an admin, your files will be uploaded and approved immediately." 
                        : "Your personal data will not be collected. Files uploaded by students require admin approval before appearing in the shared folders."}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 mb-4">
                    <h4 className="text-sm font-bold text-white mb-2">Upload Destination</h4>
                    <div className="flex items-center gap-2 text-sm text-neutral-400">
                      <BookOpen className="w-4 h-4 text-primary-400" />
                      <span className="font-medium text-neutral-200">
                        {myCourses.find(c => c.id === activeCourseId)?.name}
                      </span>
                      {currentFolderId && (
                        <>
                          <ChevronRight className="w-4 h-4" />
                          <Folder className="w-4 h-4 text-primary-400" />
                          <span className="font-medium text-neutral-200">
                            {courseFolders.find(f => f.id === currentFolderId)?.name}
                          </span>
                        </>
                      )}
                      {!currentFolderId && (
                        <>
                          <ChevronRight className="w-4 h-4" />
                          <span className="font-medium text-neutral-500">Root Folder</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-1.5">Select Files</label>
                    <label className="block border-2 border-dashed border-neutral-700 hover:border-primary-500/50 rounded-xl p-8 text-center transition-colors cursor-pointer bg-neutral-950/50">
                      <input type="file" multiple className="hidden" onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setUploadFiles(Array.from(e.target.files));
                        }
                      }} />
                      <Upload className="w-8 h-8 text-neutral-500 mx-auto mb-3" />
                      <p className="text-neutral-300 font-medium mb-1">Click to browse or drag and drop</p>
                      <p className="text-neutral-500 text-xs">PDF, PPTX, ZIP up to 50MB</p>
                    </label>
                  </div>

                  {uploadFiles.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                      {uploadFiles.map((f, i) => (
                        <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 overflow-hidden">
                              {getFileIcon(f.name.split('.').pop() || 'pdf', "w-4 h-4")}
                              <span className="text-sm text-neutral-200 truncate">{f.name}</span>
                              {uploadProgress[f.name] === 100 && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="shrink-0"
                                >
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                </motion.div>
                              )}
                            </div>
                            {!isUploading && (
                              <button 
                                onClick={() => setUploadFiles(prev => prev.filter((_, idx) => idx !== i))}
                                className="text-neutral-500 hover:text-red-400"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          {uploadProgress[f.name] !== undefined && (
                            <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className={clsx(
                                  "h-1.5 transition-all duration-300 ease-out",
                                  uploadProgress[f.name] === 100 ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-primary-500"
                                )}
                                style={{ width: `${uploadProgress[f.name]}%` }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-4 p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
                    <input 
                      type="checkbox" 
                      id="anonymous-upload" 
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-primary-500 focus:ring-primary-500 focus:ring-offset-neutral-900"
                    />
                    <label htmlFor="anonymous-upload" className="text-sm text-neutral-300 cursor-pointer select-none">
                      Upload anonymously (hide my name)
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-neutral-800 bg-neutral-950 flex justify-end gap-3">
                <button 
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFiles([]);
                    setUploadProgress({});
                  }}
                  className="px-4 py-2 rounded-lg font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleFileUpload}
                  disabled={uploadFiles.length === 0 || isUploading}
                  className="px-4 py-2 rounded-lg font-medium bg-primary-600 hover:bg-primary-500 text-white transition-colors disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : (isAdmin ? 'Upload Files' : 'Submit for Approval')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Course Modal */}
      <AnimatePresence>
        {showAddCourseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowAddCourseModal(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900">
                <h3 className="font-bold text-lg text-white">Join Courses</h3>
                <button onClick={() => setShowAddCourseModal(false)} className="text-neutral-400 hover:text-white bg-neutral-800 rounded-full p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 border-b border-neutral-800 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input 
                    type="text" 
                    placeholder="Search courses by name or code..." 
                    value={courseSearchQuery}
                    onChange={(e) => setCourseSearchQuery(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-md py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-primary-500 text-neutral-200 transition-colors"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide select-none">
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
                        onClick={() => handleEnroll(course.id)}
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

      {/* Create Folder Modal */}
      <AnimatePresence>
        {showCreateFolderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowCreateFolderModal(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900">
                <h3 className="font-bold text-lg text-white">Create Folder</h3>
                <button onClick={() => setShowCreateFolderModal(false)} className="text-neutral-400 hover:text-white bg-neutral-800 rounded-full p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6">
                <label className="block text-sm font-medium text-neutral-400 mb-2">Folder Name</label>
                <input 
                  type="text" 
                  placeholder="e.g., Week 1 Materials" 
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-md py-2 px-3 text-sm focus:outline-none focus:border-primary-500 text-neutral-200 transition-colors"
                  autoFocus
                />
              </div>

              <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex justify-end gap-3">
                <button 
                  onClick={() => setShowCreateFolderModal(false)}
                  className="px-4 py-2 rounded-lg font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim() || isCreatingFolder}
                  className="px-4 py-2 rounded-lg font-medium bg-primary-600 hover:bg-primary-500 text-white transition-colors disabled:opacity-50"
                >
                  {isCreatingFolder ? 'Creating...' : 'Create'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <AnimatePresence>
        {reportTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => {
                setReportTarget(null);
                setReportReason('');
              }}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-yellow-500" />
                  Report Content
                </h3>
                <button 
                  onClick={() => {
                    setReportTarget(null);
                    setReportReason('');
                  }} 
                  className="text-neutral-400 hover:text-white bg-neutral-800 rounded-full p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6">
                <p className="text-sm text-neutral-400 mb-4">
                  Please describe why you are reporting this content. Our moderation team will review it shortly.
                </p>
                <textarea 
                  placeholder="Reason for reporting..." 
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-md py-2 px-3 text-sm focus:outline-none focus:border-primary-500 text-neutral-200 transition-colors min-h-[100px] resize-y"
                  autoFocus
                />
              </div>

              <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex justify-end gap-3">
                <button 
                  onClick={() => {
                    setReportTarget(null);
                    setReportReason('');
                  }}
                  className="px-4 py-2 rounded-lg font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleReport}
                  disabled={!reportReason.trim() || isSubmittingReport}
                  className="px-4 py-2 rounded-lg font-medium bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50"
                >
                  {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* File Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewFile(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl h-[85vh] bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10"
            >
              <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-neutral-800 rounded-lg">
                    {getFileIcon(previewFile.name.split('.').pop() || 'pdf', "w-5 h-5")}
                  </div>
                  <h3 className="font-semibold text-neutral-100 flex-1 truncate pr-4">{previewFile.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <a 
                    href={`/api/download?url=${encodeURIComponent(previewFile.url)}&filename=${encodeURIComponent(previewFile.name)}`}
                    download={previewFile.name}
                    className="p-2 text-primary-400 hover:text-primary-300 hover:bg-neutral-800 rounded-xl transition-colors"
                    title="Download"
                  >
                    <Download className="w-5 h-5" />
                  </a>
                  <button 
                    onClick={() => setPreviewFile(null)}
                    className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 bg-black/50 relative overflow-hidden flex items-center justify-center p-4">
                {(() => {
                  const ext = (previewFile.name.split('.').pop() || '').toLowerCase();
                  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
                    return <PreviewImage src={previewFile.url} alt={previewFile.name} ext={ext} getFileIcon={getFileIcon} />;
                  } else if (['mp4', 'webm', 'mov'].includes(ext)) {
                    return <video src={previewFile.url} controls className="max-w-full max-h-full" />;
                  } else if (['pdf'].includes(ext)) {
                    return (
                      <div className="w-full h-full flex flex-col">
                        <iframe 
                          src={`${previewFile.url}#toolbar=0`} 
                          className="w-full h-full border-0 rounded-b-xl" 
                          title={previewFile.name} 
                        />
                        <div className="p-4 bg-neutral-900 border-t border-neutral-800 flex justify-center">
                           <a href={previewFile.url} target="_blank" rel="noreferrer" className="text-sm text-primary-400 hover:underline">
                             Open PDF in new tab if it doesn't load
                           </a>
                        </div>
                      </div>
                    );
                  } else if (['mp3', 'wav', 'ogg'].includes(ext)) {
                    return (
                      <div className="flex flex-col items-center justify-center gap-6 w-full max-w-md p-8 bg-neutral-900 rounded-2xl border border-neutral-800">
                        <FileAudio className="w-24 h-24 text-primary-500/50" />
                        <audio src={previewFile.url} controls className="w-full" />
                      </div>
                    );
                  } else {
                    return (
                      <div className="flex flex-col items-center justify-center gap-4 text-neutral-400">
                        {getFileIcon(ext, "w-24 h-24 text-neutral-600")}
                        <p>Preview not available for this file type.</p>
                        <a href={`/api/download?url=${encodeURIComponent(previewFile.url)}&filename=${encodeURIComponent(previewFile.name)}`} download={previewFile.name} className="mt-4 px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-colors">
                          Download File
                        </a>
                      </div>
                    );
                  }
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 bg-green-500/10 border border-green-500/20 text-green-400 px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 backdrop-blur-md"
          >
            <div className="bg-green-500/20 p-2 rounded-full">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="font-semibold text-sm">Upload Successful</p>
              <p className="text-green-500/80 text-xs">Your files have been securely uploaded.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DragOverlay dropAnimation={null} modifiers={[snapCenterToCursor]}>
        {draggedItem ? (
          draggedItem.type === 'folder' ? (
            <div className="w-[280px] h-[80px] pointer-events-none">
               {(() => {
                 const folder = courseFolders.find(f => f.id === draggedItem.id);
                 if (!folder) return null;
                 return (
                   <div className="w-full h-full scale-75 origin-center opacity-90 bg-neutral-900 border-2 border-primary-500 rounded-xl p-4 flex items-center gap-3 shadow-[0_30px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl">
                     <Folder className="w-8 h-8 text-primary-400" fill="currentColor" fillOpacity={0.2} />
                     <span className="font-medium text-neutral-200 truncate flex-1">{folder.name}</span>
                   </div>
                 );
               })()}
            </div>
          ) : (
            <div className="w-[280px] h-[160px] pointer-events-none">
              {(() => {
                const file = courseFiles.find(f => f.id === draggedItem.id);
                if (!file) return null;
                return (
                  <div className="w-full h-full scale-75 origin-center opacity-90 bg-neutral-900 border-2 border-primary-500 rounded-xl p-5 flex flex-col shadow-[0_30px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800">
                        {getFileIcon(file.name.split('.').pop() || 'pdf', "w-7 h-7")}
                      </div>
                    </div>
                    <h4 className="font-semibold text-neutral-200 text-sm mb-1 truncate">{file.name}</h4>
                    <div className="flex items-center justify-between text-[10px] text-neutral-500 mt-auto opacity-80">
                       <span className="font-medium">{file.size || 'Unknown size'}</span>
                       <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )
        ) : null}
      </DragOverlay>

      </motion.div>
    </DndContext>
  );
}
