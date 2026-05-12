import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, User, Tent, FileText, File, Book, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import CourseDetailsModal from './CourseDetailsModal';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearchQuery('');
      setResults(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults(null);
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    const fetchSearch = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/global-search?q=${encodeURIComponent(searchQuery)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          signal
        });
        const data = await res.json();
        setResults(data);
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.error(e);
        }
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchSearch();

    return () => controller.abort();
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-center items-start pt-[10vh] px-4 backdrop-blur-sm bg-black/60">
      <div 
        className="absolute inset-0" 
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden shadow-black overflow-y-auto max-h-[80vh] custom-scrollbar"
      >
        <div className="sticky top-0 z-10 flex items-center bg-neutral-900 border-b border-neutral-800 px-4 py-4">
          <Search className="w-5 h-5 text-neutral-500 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search courses, clubs, files, users..."
            className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-neutral-500 text-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button onClick={onClose} className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 ml-2 border border-neutral-800 text-xs px-2 font-mono">
            ESC
          </button>
        </div>

        <div className="p-2 space-y-4">
          {!searchQuery.trim() && !results && (
            <div className="py-12 text-center text-neutral-500">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>Type to search across everything.</p>
            </div>
          )}

          {isLoading && !results && (
            <div className="py-8 space-y-4">
               {[1, 2, 3].map(i => (
                 <div key={i} className="flex px-4 gap-4 animate-pulse">
                   <div className="w-10 h-10 bg-neutral-800 rounded-xl"></div>
                   <div className="flex-1 space-y-2">
                     <div className="h-4 bg-neutral-800 rounded w-1/3"></div>
                     <div className="h-3 bg-neutral-800 rounded w-1/4"></div>
                   </div>
                 </div>
               ))}
            </div>
          )}

          {results && (
            <>
              {results.clubs?.length === 0 && results.users?.length === 0 && results.articles?.length === 0 && results.files?.length === 0 && results.courses?.length === 0 && !isLoading && (
                <div className="py-12 text-center text-neutral-500">
                  <p>No results found for "{searchQuery}"</p>
                </div>
              )}

              {results.clubs?.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-bold text-neutral-500 uppercase tracking-wider">Clubs</div>
                  {results.clubs.map((club: any) => (
                    <div 
                      key={`club-${club.id}`}
                      onClick={() => { navigate(`/clubs/${club.id}`); onClose(); }}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-xl hover:bg-neutral-800/80 transition-colors"
                    >
                      {club.avatarUrl ? (
                         <img referrerPolicy="no-referrer" src={club.avatarUrl} alt={club.name} className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                         <div className="w-8 h-8 rounded-lg bg-primary-500/10 text-primary-400 flex items-center justify-center font-bold text-sm">
                           {club.name.charAt(0)}
                         </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-white">{club.name}</div>
                        {club.tags && <div className="text-xs text-primary-400">{club.tags.split(',')[0]}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {results.users?.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-bold text-neutral-500 uppercase tracking-wider">Users</div>
                  {results.users.map((user: any) => (
                    <div 
                      key={`user-${user.id}`}
                      onClick={() => { navigate(`/profile/${user.username}`); onClose(); }}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-xl hover:bg-neutral-800/80 transition-colors"
                    >
                      {user.avatarUrl ? (
                         <img referrerPolicy="no-referrer" src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                         <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-white text-sm">
                           <User className="w-4 h-4" />
                         </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-white">{user.name}</div>
                        <div className="text-xs text-neutral-400">@{user.username}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {results.articles?.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-bold text-neutral-500 uppercase tracking-wider">News & Articles</div>
                  {results.articles.map((article: any) => (
                    <div 
                      key={`article-${article.id}`}
                      onClick={() => { navigate(`/news/article/${article.id}`); onClose(); }}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-xl hover:bg-neutral-800/80 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white truncate max-w-sm">{article.title}</div>
                        <div className="text-xs text-neutral-400">by {article.club?.name || article.author?.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {results.files?.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-bold text-neutral-500 uppercase tracking-wider">Files & Resources</div>
                  {results.files.map((file: any) => (
                    <div 
                      key={`file-${file.id}`}
                      onClick={() => { 
                         if (file.course) {
                           navigate(`/academics?courseId=${file.course.id}`);
                         }
                         onClose(); 
                      }}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-xl hover:bg-neutral-800/80 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
                        <File className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white truncate max-w-sm">{file.name}</div>
                        {file.course && <div className="text-xs text-neutral-400">{file.course.code} - {file.course.name}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {results.courses?.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-bold text-neutral-500 uppercase tracking-wider">Courses</div>
                  {results.courses.map((course: any) => (
                    <div 
                      key={`course-${course.id}`}
                      onClick={() => { setSelectedCourseId(course.id); }}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-xl hover:bg-neutral-800/80 transition-colors"
                    >
                      {course.avatarUrl ? (
                         <img referrerPolicy="no-referrer" src={course.avatarUrl} alt={course.name} className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                         <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm">
                           <Book className="w-4 h-4" />
                         </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-white max-w-sm"><span className="text-indigo-400 font-mono text-xs mr-2 px-1.5 py-0.5 bg-indigo-500/10 rounded">{course.code}</span>{course.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>

      <CourseDetailsModal 
        isOpen={!!selectedCourseId}
        courseId={selectedCourseId || ''}
        onClose={() => {
          setSelectedCourseId(null);
        }}
        onNavigate={() => {
          setSelectedCourseId(null);
          onClose();
        }}
      />
    </div>
  );
}
