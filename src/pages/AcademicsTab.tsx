import { useState } from 'react';
import { FileText, Upload, Download, FileArchive, Search, Folder, MoreVertical, File, Plus, ChevronRight, ShieldAlert, FolderPlus, BookOpen } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'motion/react';
import ProfilePopover from '../components/ProfilePopover';

const INITIAL_COURSES = [
  { id: '1', name: 'CS101', title: 'Intro to Computer Science' },
  { id: '2', name: 'MATH201', title: 'Linear Algebra' },
];

const MOCK_FOLDERS = [
  { id: 'f1', courseId: '1', name: 'Week 1: Basics', parentId: null },
  { id: 'f2', courseId: '1', name: 'Week 2: Data Types', parentId: null },
  { id: 'f3', courseId: '1', name: 'Assignments', parentId: null },
  { id: 'f4', courseId: '1', name: 'Project 1 Resources', parentId: 'f3' }, // Nested folder
];

const MOCK_FILES = [
  { id: 1, courseId: '1', folderId: null, name: 'CS101_Syllabus_Fall.pdf', type: 'pdf', size: '2.4 MB', uploader: 'Dr. Ahmed', date: 'Sep 1' },
  { id: 2, courseId: '1', folderId: 'f1', name: 'Lecture_1_Slides.pptx', type: 'presentation', size: '5.1 MB', uploader: 'Dr. Ahmed', date: 'Sep 3' },
  { id: 3, courseId: '1', folderId: 'f3', name: 'Assignment_1_Starter_Code.zip', type: 'archive', size: '1.2 MB', uploader: 'Dr. Ahmed', date: 'Sep 10' },
  { id: 4, courseId: '2', folderId: null, name: 'Midterm_Study_Guide.pdf', type: 'pdf', size: '840 KB', uploader: 'Prof. Sarah', date: 'Oct 15' },
];

export default function AcademicsTab() {
  const [search, setSearch] = useState('');
  const [activeCourseId, setActiveCourseId] = useState('1');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  
  // Mock admin state - in a real app, this would come from your auth/role context
  const [isAdmin, setIsAdmin] = useState(false);

  const activeCourse = INITIAL_COURSES.find(c => c.id === activeCourseId);
  
  // Filter folders and files based on current location
  const currentFolders = MOCK_FOLDERS.filter(f => f.courseId === activeCourseId && f.parentId === currentFolderId);
  const currentFiles = MOCK_FILES.filter(f => f.courseId === activeCourseId && f.folderId === currentFolderId && f.name.toLowerCase().includes(search.toLowerCase()));

  // Get breadcrumbs
  const getBreadcrumbs = () => {
    const crumbs = [];
    let curr = currentFolderId;
    while (curr) {
      const folder = MOCK_FOLDERS.find(f => f.id === curr);
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

  const getFileIcon = (type: string) => {
    switch(type) {
      case 'pdf': return <FileText className="w-8 h-8 text-red-400" />;
      case 'archive': return <FileArchive className="w-8 h-8 text-yellow-400" />;
      case 'presentation': return <File className="w-8 h-8 text-orange-400" />;
      default: return <FileText className="w-8 h-8 text-blue-400" />;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex h-full overflow-hidden bg-neutral-950"
    >
      {/* Sidebar */}
      <div className="w-full md:w-72 bg-neutral-900/80 backdrop-blur-xl border-r border-neutral-800 flex flex-col hidden md:flex">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-neutral-100">My Courses</h2>
            <p className="text-xs text-neutral-500 mt-1">Shared resources & files</p>
          </div>
          <button className="p-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-md transition-colors" title="Add Course">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        {/* Admin Toggle (For Demo Purposes) */}
        <div className="p-3 border-b border-neutral-800 bg-neutral-900/50">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={isAdmin} 
              onChange={(e) => setIsAdmin(e.target.checked)}
              className="rounded border-neutral-700 text-primary-600 focus:ring-primary-600 bg-neutral-800"
            />
            <span className="text-sm text-neutral-300 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-amber-500" /> Enable Admin View
            </span>
          </label>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {INITIAL_COURSES.map(course => (
            <button
              key={course.id}
              onClick={() => {
                setActiveCourseId(course.id);
                setCurrentFolderId(null);
                setSearch('');
              }}
              className={clsx(
                "w-full text-left p-3 rounded-lg hover:bg-neutral-800 transition-colors mb-1 flex items-center gap-3",
                activeCourseId === course.id ? "bg-neutral-800/80 border border-neutral-700" : "border border-transparent"
              )}
            >
              <div className={clsx(
                "p-2 rounded-md",
                activeCourseId === course.id ? "bg-primary-500/20 text-primary-400" : "bg-neutral-800 text-neutral-400"
              )}>
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-sm text-neutral-200">{course.name}</div>
                <div className="text-xs text-neutral-500 truncate w-40">{course.title}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <div className="h-16 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-xl flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 text-sm">
            <button 
              onClick={() => setCurrentFolderId(null)}
              className="font-bold text-neutral-100 hover:text-primary-400 transition-colors"
            >
              {activeCourse?.name}
            </button>
            
            {breadcrumbs.map(crumb => (
              <div key={crumb.id} className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-neutral-600" />
                <button 
                  onClick={() => setCurrentFolderId(crumb.id)}
                  className="font-medium text-neutral-300 hover:text-primary-400 transition-colors"
                >
                  {crumb.name}
                </button>
              </div>
            ))}
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
              <>
                <button className="bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 border border-neutral-700">
                  <FolderPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">New Folder</span>
                </button>
                <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Upload File</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* File & Folder List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          
          {/* Folders Section */}
          {currentFolders.length > 0 && !search && (
            <div className="mb-8">
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Folders</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {currentFolders.map((folder, index) => (
                  <motion.button 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={folder.id}
                    onClick={() => setCurrentFolderId(folder.id)}
                    className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 hover:border-primary-500/50 hover:bg-neutral-800 transition-all flex items-center gap-3 text-left group"
                  >
                    <Folder className="w-8 h-8 text-primary-400 group-hover:text-primary-300 transition-colors" fill="currentColor" fillOpacity={0.2} />
                    <span className="font-medium text-neutral-200 truncate">{folder.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Files Section */}
          <div>
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Files</h3>
            {currentFiles.length === 0 ? (
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentFiles.map((file, index) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 + 0.1 }}
                    key={file.id} 
                    className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 transition-colors group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800">
                        {getFileIcon(file.type)}
                      </div>
                      <button className="text-neutral-500 hover:text-neutral-300 p-1">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <h4 className="font-semibold text-neutral-200 text-sm mb-1 truncate" title={file.name}>
                      {file.name}
                    </h4>
                    
                    <div className="flex items-center justify-between text-xs text-neutral-500 mt-4">
                      <span>{file.size}</span>
                      <span>{file.date}</span>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-neutral-800 flex items-center justify-between">
                      <div className="text-xs text-neutral-400 flex items-center gap-1.5">
                        <ProfilePopover
                          user={{
                            name: file.uploader,
                            handle: file.uploader.toLowerCase().replace(/\s+/g, ''),
                            bio: 'Professor at Imam Mohammad Ibn Saud Islamic University.',
                            avatar: `https://picsum.photos/seed/${file.uploader}/100/100`
                          }}
                        >
                          <div className="w-5 h-5 rounded-full bg-neutral-800 flex items-center justify-center text-[8px] font-bold border border-neutral-700 overflow-hidden">
                            <img 
                              src={`https://picsum.photos/seed/${file.uploader}/100/100`} 
                              alt={file.uploader} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer" 
                            />
                          </div>
                        </ProfilePopover>
                        {file.uploader}
                      </div>
                      <button className="text-primary-400 hover:text-primary-300 bg-primary-500/10 hover:bg-primary-500/20 p-1.5 rounded-md transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </motion.div>
  );
}
