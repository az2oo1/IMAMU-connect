import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Book, ExternalLink, Link as LinkIcon, BookOpen, UserPlus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FormattedText from './FormattedText';

interface CourseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  onNavigate?: () => void;
  onEnroll?: () => void;
}

export default function CourseDetailsModal({ isOpen, onClose, courseId, onNavigate, onEnroll }: CourseDetailsModalProps) {
  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && courseId) {
      fetchCourseDetails();
    }
  }, [isOpen, courseId]);

  const fetchCourseDetails = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/details`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCourse(data.course);
        setIsEnrolled(data.isEnrolled);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnroll = async () => {
    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setIsEnrolled(true);
        if (onEnroll) onEnroll();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGoToCourse = () => {
    navigate(`/academics?courseId=${courseId}`);
    if (onNavigate) {
      onNavigate();
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-neutral-800/80 hover:bg-neutral-700 text-white rounded-full z-10 transition-colors backdrop-blur-md"
        >
          <X className="w-5 h-5" />
        </button>

        {isLoading || !course ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="relative h-40 bg-neutral-800 shrink-0">
              {course.bannerUrl ? (
                <img referrerPolicy="no-referrer" src={course.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20" />
              )}
              <div className="absolute -bottom-10 left-6">
                <div className="w-20 h-20 rounded-xl bg-neutral-900 border-4 border-neutral-900 overflow-hidden shadow-xl">
                  {course.avatarUrl ? (
                    <img referrerPolicy="no-referrer" src={course.avatarUrl} alt={course.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <Book className="w-8 h-8" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-12 px-6 pb-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-bold font-mono rounded">
                      {course.code}
                    </span>
                    {course.tags && (
                      <div className="text-xs text-neutral-400">
                        {course.tags.split(',').map((t: string) => t.trim()).join(' • ')}
                      </div>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-white">{course.name}</h2>
                </div>
                <div>
                  {isEnrolled ? (
                    <button
                      onClick={handleGoToCourse}
                      className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2 shadow-lg"
                    >
                      <BookOpen className="w-4 h-4" /> Open Course
                    </button>
                  ) : (
                    <button
                      onClick={handleEnroll}
                      className="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold transition-colors flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" /> Join Course
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-8">
                {course.description && (
                  <div>
                    <h3 className="text-sm font-bold text-neutral-400 tracking-wider uppercase mb-3 px-1">Overview</h3>
                    <div className="bg-neutral-800/50 rounded-xl p-5 border border-neutral-800/50">
                      <FormattedText text={course.description} />
                    </div>
                  </div>
                )}

                {course.syllabus && (
                  <div>
                    <h3 className="text-sm font-bold text-neutral-400 tracking-wider uppercase mb-3 px-1">توصيف (Course Details)</h3>
                    <div className="bg-neutral-800/50 rounded-xl p-5 border border-neutral-800/50 text-neutral-300">
                      <FormattedText text={course.syllabus} />
                    </div>
                  </div>
                )}

                {(course.freeResourcesUrl || course.paidResourcesUrl) && (
                  <div>
                    <h3 className="text-sm font-bold text-neutral-400 tracking-wider uppercase mb-3 px-1">Resources</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {course.freeResourcesUrl && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                          <div className="flex items-center gap-2 text-blue-400 font-bold mb-2">
                            <LinkIcon className="w-4 h-4" /> Free Resources
                          </div>
                          <div className="text-sm text-neutral-300 break-words">
                            <FormattedText text={course.freeResourcesUrl} />
                          </div>
                        </div>
                      )}
                      
                      {course.paidResourcesUrl && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                          <div className="flex items-center gap-2 text-amber-400 font-bold mb-2">
                            <LinkIcon className="w-4 h-4" /> Paid Resources
                          </div>
                          <div className="text-sm text-neutral-300 break-words">
                            <FormattedText text={course.paidResourcesUrl} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
